import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel Serverless API Route — Proxy to Synology File Station API
 * Resolves QuickConnect URL → actual NAS URL via Synology relay
 * Flow: Browser → this proxy → Synology relay → NAS
 */

// Cache resolved NAS URL (per cold start)
let _resolvedUrl: string | null = null;
let _resolvedExpiry: number = 0;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { action } = req.body;

    if (action === 'login') {
      return await handleLogin(req, res);
    } else if (action === 'upload') {
      return await handleUpload(req, res);
    } else if (action === 'debug_qc') {
      return await handleDebugQC(req, res);
    } else if (action === 'migrate') {
      return await handleMigrate(req, res);
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (err) {
    console.error('[NAS Proxy] Error:', err);
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/**
 * Extract QuickConnect ID and region from URL
 * e.g. "https://neosiam.sg3.quickconnect.to" → { id: "neosiam", region: "sg3" }
 */
function extractQuickConnectInfo(url: string): { id: string; region: string | null } | null {
  try {
    const hostname = new URL(url).hostname; // neosiam.sg3.quickconnect.to
    if (!hostname.includes('quickconnect.to')) return null;
    const parts = hostname.split('.');
    // Format: {id}.{region}.quickconnect.to  OR  {id}.quickconnect.to
    if (parts.length >= 4) {
      return { id: parts[0], region: parts[1] }; // neosiam, sg3
    }
    return { id: parts[0], region: null };
  } catch {
    return null;
  }
}

/**
 * Resolve QuickConnect URL to actual NAS address
 * Tries: DDNS → External IP → Relay tunnel
 */
async function resolveNasUrl(inputUrl: string): Promise<string> {
  const qcInfo = extractQuickConnectInfo(inputUrl);
  if (!qcInfo) return inputUrl; // Not a QuickConnect URL, use as-is

  if (_resolvedUrl && Date.now() < _resolvedExpiry) return _resolvedUrl;

  const { id: qcId, region } = qcInfo;
  console.log(`[QC Resolve] ID: ${qcId}, Region: ${region}`);

  // Try servers in order: regional first (since user's URL has region), then global
  const servers = [
    region ? `${region}.quickconnect.to` : null,
    'global.quickconnect.to',
  ].filter(Boolean) as string[];

  let info: any = null;

  for (const server of servers) {
    try {
      console.log(`[QC Resolve] Querying ${server}...`);
      const infoRes = await fetch(`https://${server}/Serv.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: 1,
          command: 'get_server_info',
          stop_when_error: false,
          stop_when_success: false,
          id: qcId,
        }),
        signal: AbortSignal.timeout(10000),
      });
      const data = await infoRes.json();
      console.log(`[QC Resolve] ${server} response:`, JSON.stringify(data).slice(0, 500));

      if (data.errno === 0) {
        info = data;
        break;
      }
    } catch (e) {
      console.log(`[QC Resolve] ❌ ${server}: ${(e as Error).message}`);
    }
  }

  if (!info) {
    throw new Error('QuickConnect resolve failed — ไม่พบ NAS จาก QuickConnect ID');
  }

  const ddns = info.server?.ddns;
  const extIp = info.server?.external?.ip;
  const httpsPort = info.service?.https_port || 5001;
  const httpPort = info.service?.port || 5000;
  const serverID = info.server?.serverID;

  // Step 2: Try direct connections
  const candidates = [
    ddns ? `https://${ddns}:${httpsPort}` : null,
    extIp ? `https://${extIp}:${httpsPort}` : null,
    ddns ? `http://${ddns}:${httpPort}` : null,
    extIp ? `http://${extIp}:${httpPort}` : null,
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      console.log(`[QC Resolve] Trying: ${candidate}`);
      const testRes = await fetch(`${candidate}/webapi/query.cgi?api=SYNO.API.Info&version=1&method=query&query=SYNO.API.Auth`, {
        signal: AbortSignal.timeout(5000),
      });
      if (testRes.ok) {
        const testData = await testRes.json();
        if (testData.success) {
          console.log(`[QC Resolve] ✅ Direct: ${candidate}`);
          _resolvedUrl = candidate;
          _resolvedExpiry = Date.now() + 10 * 60 * 1000;
          return candidate;
        }
      }
    } catch (e) {
      console.log(`[QC Resolve] ❌ ${candidate}: ${(e as Error).message}`);
    }
  }

  // Step 3: Request relay tunnel
  if (serverID) {
    console.log('[QC Resolve] Requesting relay tunnel...');
    const relayServers = [
      region ? `${region}.quickconnect.to` : null,
      'global.quickconnect.to',
    ].filter(Boolean) as string[];

    for (const relayHost of relayServers) {
      try {
        const tunnelRes = await fetch(`https://${relayHost}/Serv.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            version: 1,
            command: 'request_tunnel',
            id: qcId,
            serverID,
          }),
          signal: AbortSignal.timeout(10000),
        });
        const tunnelData = await tunnelRes.json();
        console.log(`[QC Resolve] Tunnel from ${relayHost}:`, JSON.stringify(tunnelData).slice(0, 500));

        const relayIp = tunnelData.service?.relay_ip;
        const relayPort = tunnelData.service?.relay_port;

        if (relayIp && relayPort) {
          const relayUrl = `http://${relayIp}:${relayPort}`;
          console.log(`[QC Resolve] ✅ Relay: ${relayUrl}`);
          _resolvedUrl = relayUrl;
          _resolvedExpiry = Date.now() + 5 * 60 * 1000;
          return relayUrl;
        }
      } catch (e) {
        console.log(`[QC Resolve] ❌ Tunnel ${relayHost}: ${(e as Error).message}`);
      }
    }
  }

  throw new Error('Could not resolve QuickConnect — ลองใช้ DDNS URL (http://neosiam.dscloud.biz:5000) แทน');
}

async function handleLogin(req: VercelRequest, res: VercelResponse) {
  const { nasUrl, account, passwd } = req.body;

  if (!nasUrl || !account || !passwd) {
    return res.status(400).json({ success: false, error: 'Missing nasUrl, account, or passwd' });
  }

  const resolvedUrl = await resolveNasUrl(nasUrl);

  const url = `${resolvedUrl}/webapi/auth.cgi?` + new URLSearchParams({
    api: 'SYNO.API.Auth',
    version: '3',
    method: 'login',
    account,
    passwd,
    session: 'FileStation',
    format: 'sid',
  });

  const response = await fetch(url);
  const text = await response.text();

  // Check if response is JSON
  try {
    const data = JSON.parse(text);
    // Return resolved URL so client can use it for uploads
    return res.status(200).json({ ...data, _resolvedUrl: resolvedUrl });
  } catch {
    return res.status(502).json({ success: false, error: `NAS returned non-JSON response: ${text.slice(0, 200)}` });
  }
}

async function handleUpload(req: VercelRequest, res: VercelResponse) {
  const { nasUrl, sid, destPath, filename, fileBase64, fileType } = req.body;

  if (!nasUrl || !sid || !destPath || !fileBase64) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  const resolvedUrl = await resolveNasUrl(nasUrl);
  const buffer = Buffer.from(fileBase64, 'base64');

  const boundary = '----NeosiamNASProxy' + Date.now();
  const CRLF = '\r\n';

  const fields: Record<string, string> = {
    api: 'SYNO.FileStation.Upload',
    version: '2',
    method: 'upload',
    path: destPath,
    create_parents: 'true',
    overwrite: 'true',
    _sid: sid,
  };

  let bodyStr = '';
  for (const [key, value] of Object.entries(fields)) {
    bodyStr += `--${boundary}${CRLF}`;
    bodyStr += `Content-Disposition: form-data; name="${key}"${CRLF}${CRLF}`;
    bodyStr += `${value}${CRLF}`;
  }

  const filePartHeader =
    `--${boundary}${CRLF}` +
    `Content-Disposition: form-data; name="file"; filename="${filename || 'image.webp'}"${CRLF}` +
    `Content-Type: ${fileType || 'image/webp'}${CRLF}${CRLF}`;

  const filePartFooter = `${CRLF}--${boundary}--${CRLF}`;

  const headerBuf = Buffer.from(bodyStr + filePartHeader, 'utf-8');
  const footerBuf = Buffer.from(filePartFooter, 'utf-8');
  const fullBody = Buffer.concat([headerBuf, buffer, footerBuf]);

  const response = await fetch(`${resolvedUrl}/webapi/entry.cgi`, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': String(fullBody.length),
    },
    body: fullBody,
  });

  const text = await response.text();
  try {
    const data = JSON.parse(text);
    return res.status(200).json(data);
  } catch {
    return res.status(502).json({ success: false, error: `NAS returned non-JSON: ${text.slice(0, 200)}` });
  }
}

/**
 * Debug: Query QuickConnect servers and return raw responses
 */
async function handleDebugQC(req: VercelRequest, res: VercelResponse) {
  const { nasUrl } = req.body;
  const qcInfo = extractQuickConnectInfo(nasUrl || '');
  
  if (!qcInfo) {
    return res.status(400).json({ error: 'Not a QuickConnect URL', nasUrl });
  }

  const { id: qcId, region } = qcInfo;
  const results: Record<string, unknown> = { qcId, region };

  // Try multiple server endpoints
  const servers = [
    region ? `${region}.quickconnect.to` : null,
    'global.quickconnect.to',
    region ? `${qcId}.${region}.quickconnect.to` : null,
  ].filter(Boolean) as string[];

  for (const server of servers) {
    try {
      const r = await fetch(`https://${server}/Serv.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: 1,
          command: 'get_server_info',
          stop_when_error: false,
          stop_when_success: false,
          id: qcId,
        }),
        signal: AbortSignal.timeout(10000),
      });
      const text = await r.text();
      try {
        results[server] = JSON.parse(text);
      } catch {
        results[server] = { raw: text.slice(0, 500) };
      }
    } catch (e) {
      results[server] = { error: (e as Error).message };
    }
  }

  // Also try pingpong / get_site_info
  try {
    const pingRes = await fetch('https://global.quickconnect.to/Serv.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version: 1,
        command: 'get_site_info',
        id: qcId,
      }),
      signal: AbortSignal.timeout(10000),
    });
    results['global_get_site_info'] = await pingRes.json();
  } catch (e) {
    results['global_get_site_info'] = { error: (e as Error).message };
  }

  return res.status(200).json(results);
}

/**
 * Migrate: Download from Firebase (server-side, no CORS) → Upload to NAS
 */
async function handleMigrate(req: VercelRequest, res: VercelResponse) {
  const { firebaseUrl, nasUrl, apiKey, path } = req.body;

  if (!firebaseUrl || !nasUrl || !apiKey) {
    return res.status(400).json({ success: false, error: 'Missing firebaseUrl, nasUrl, or apiKey' });
  }

  try {
    // Step 1: Download from Firebase (server-side — no CORS)
    console.log('[Migrate] Downloading:', firebaseUrl.slice(0, 80));
    const downloadRes = await fetch(firebaseUrl, {
      signal: AbortSignal.timeout(30000),
    });

    if (!downloadRes.ok) {
      return res.status(502).json({
        success: false,
        error: `Firebase download failed: HTTP ${downloadRes.status}`,
      });
    }

    const contentType = downloadRes.headers.get('content-type') || 'image/webp';
    const arrayBuffer = await downloadRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log('[Migrate] Downloaded:', buffer.length, 'bytes');

    // Step 2: Upload to NAS via upload.php (as multipart/form-data)
    const filename = path || `migrated_${Date.now()}.webp`;
    const boundary = '----MigrateBoundary' + Date.now();

    const bodyParts: Buffer[] = [];

    // File part
    bodyParts.push(Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${filename.split('/').pop()}"\r\n` +
      `Content-Type: ${contentType}\r\n\r\n`
    ));
    bodyParts.push(buffer);
    bodyParts.push(Buffer.from('\r\n'));

    // Path part
    bodyParts.push(Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="path"\r\n\r\n` +
      `${filename}\r\n`
    ));

    // End boundary
    bodyParts.push(Buffer.from(`--${boundary}--\r\n`));

    const fullBody = Buffer.concat(bodyParts);

    console.log('[Migrate] Uploading to NAS:', nasUrl);
    const uploadRes = await fetch(nasUrl, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'X-API-Key': apiKey,
      },
      body: fullBody,
      signal: AbortSignal.timeout(30000),
    });

    const uploadText = await uploadRes.text();
    let uploadResult;
    try {
      uploadResult = JSON.parse(uploadText);
    } catch {
      return res.status(502).json({
        success: false,
        error: `NAS returned non-JSON: ${uploadText.slice(0, 200)}`,
      });
    }

    console.log('[Migrate] NAS response:', JSON.stringify(uploadResult).slice(0, 200));
    return res.status(200).json(uploadResult);

  } catch (err) {
    console.error('[Migrate] Error:', err);
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
}
