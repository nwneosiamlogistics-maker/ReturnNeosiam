/**
 * Synology NAS Upload Utility — PHP API approach
 * Flow: Browser → POST + API Key → NAS upload.php → /tmp/nas-uploads/
 * ตาม NAS-UPLOAD-GUIDE.md
 */

import { NASConfig } from '../types';

export interface NASUploadResult {
  success: boolean;
  url?: string;
  filename?: string;
  path?: string;
  error?: string;
}

/**
 * Upload a single file to NAS via PHP API
 * POST FormData with X-API-Key header
 */
export const uploadToNAS = async (
  config: NASConfig,
  file: Blob | File,
  options: { docNo?: string; category?: string; filename?: string } = {}
): Promise<NASUploadResult> => {
  if (!config.enabled || !config.apiUrl || !config.apiKey) {
    return { success: false, error: 'NAS not configured' };
  }

  try {
    // Build sub-path: category/docNo/filename
    const category = options.category || 'ncr-images';
    const subFolder = options.docNo ? `${category}/${options.docNo}` : `${category}/${new Date().toISOString().slice(0, 7)}`;
    const filename = options.filename || `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.webp`;
    const path = `${subFolder}/${filename}`;

    const formData = new FormData();
    formData.append('file', file, filename);
    formData.append('path', path);

    const response = await fetch(config.apiUrl, {
      method: 'POST',
      headers: { 'X-API-Key': config.apiKey },
      body: formData,
    });

    // ⚠️ ห้ามเช็ค response.ok — เพราะ NAS server return 200 เสมอ (Nginx ดักจับ non-200)
    const text = await response.text();
    console.log('[NAS Upload] Response status:', response.status);

    let result;
    try {
      result = JSON.parse(text);
    } catch {
      throw new Error(`NAS upload: invalid JSON response: ${text.substring(0, 200)}`);
    }

    if (!result.success) {
      return { success: false, error: result.error || JSON.stringify(result) };
    }

    return {
      success: true,
      url: result.url,
      filename,
      path: result.path || path,
    };
  } catch (err) {
    console.error('[NAS Upload] Error:', err);
    return { success: false, error: (err as Error).message };
  }
};

/**
 * Test connection to NAS PHP API
 * ส่ง POST เปล่า (ไม่มีไฟล์) — ถ้า API Key ถูกต้องจะได้ "No file uploaded"
 */
export const testNASConnection = async (config: NASConfig): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!config.apiUrl || !config.apiKey) {
      return { success: false, error: 'กรุณากรอก API URL และ API Key' };
    }

    const formData = new FormData();
    // ส่งไม่มีไฟล์ — เพื่อทดสอบว่า API Key ถูกต้อง

    const response = await fetch(config.apiUrl, {
      method: 'POST',
      headers: { 'X-API-Key': config.apiKey },
      body: formData,
    });

    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch {
      return { success: false, error: `NAS ตอบ HTML แทน JSON — ตรวจ URL: ${text.substring(0, 100)}` };
    }

    // ถ้าได้ "No file uploaded" = API Key ถูกต้อง, เชื่อมต่อได้
    if (result.error === 'No file uploaded') {
      return { success: true };
    }

    // ถ้าได้ "Unauthorized" = API Key ผิด
    if (result.error === 'Unauthorized') {
      return { success: false, error: 'API Key ไม่ถูกต้อง' };
    }

    // อื่นๆ
    return { success: false, error: result.error || 'Unknown response' };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
};
