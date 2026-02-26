# UAT: NAS-only Upload – Summary & Quick Guide

## บทสรุปผลการทดสอบ (UAT Summary)
- เป้าหมาย: ให้อัปโหลด/เสิร์ฟรูปภาพได้จาก NAS เท่านั้น (ไม่มี fallback ไป Firebase)
- ผลลัพธ์:
  - ผ่าน: บันทึก NCR พร้อมรูปสำเร็จ โดย URL รูปเป็น `serve.php` 100%
  - ผ่าน: จำลองคีย์ผิด/ NAS ล้มเหลว → อัปโหลดล้มเหลว แอป “บล็อกการบันทึก” และ rollback เลข NCR สำเร็จ
- หลักฐานสำคัญ:
  - Network → `upload.php`
    - คีย์ถูก: `{"success":true,"url":"https://neosiam.dscloud.biz/ncr-api/serve.php?file=..."}`
    - คีย์ผิด: `{"success":false,"error":"Unauthorized"}`
  - เปิด `serve.php?file=...` แล้วแสดงรูปได้ (HTTP 200)

---

## ค่าที่ต้องใช้ (Production Values)
- NAS Upload API: `https://neosiam.dscloud.biz/ncr-api/upload.php`
- NAS Serve base: `https://neosiam.dscloud.biz/ncr-api/serve.php?file=`
- API Key: `NAS_UPLOAD_KEY_sansan856`

> หมายเหตุ: จัดเก็บ/สื่อสาร API Key เฉพาะกับผู้มีสิทธิ์เท่านั้น

---

## ตั้งค่าฝั่ง Synology DSM (ครั้งเดียว)
- Web Station → PHP Settings → `open_basedir`
  - ต่อท้าย (ห้ามลบของเดิม):
    - `:/tmp/nas-uploads-ncr:/volume1/Operation/paweewat/NCR Return Management`
- File Station → โฟลเดอร์งาน
  - `NCR Return Management`: ให้กลุ่ม `http` มีสิทธิ์ Read (Apply to sub-folders & files)
  - โฟลเดอร์ชั่วคราว `/tmp/nas-uploads-ncr`: ให้ `http` เขียนได้ (ติดขัดให้ 0777 ชั่วคราวเพื่อทดสอบ)
- ตำแหน่งสคริปต์บน NAS: `/web/ncr-api/upload.php`, `/web/ncr-api/serve.php`

---

## ตั้งค่าฝั่งแอป (Settings → Synology NAS Storage)
1) เปิดใช้งาน NAS Storage
2) กรอกค่า:
   - API URL: `https://neosiam.dscloud.biz/ncr-api/upload.php`
   - API Key: `NAS_UPLOAD_KEY_sansan856`
3) กด “ทดสอบการเชื่อมต่อ” (คาดหวัง: `{"success":false,"error":"No file uploaded"}`)
4) กด “บันทึกการตั้งค่า” → เปิด DevTools → Network → ติ๊ก “Disable cache” → `Ctrl+F5`

---

## ขั้นตอน UAT

### Step 2: บันทึก NCR พร้อมรูป (ต้องสำเร็จ)
- แนบรูป 1–2 รูป → กดบันทึก
- Network → `upload.php` (แถวที่เป็น POST/Fetch ไม่ใช่ preflight)
  - Headers ต้องมี `X-API-Key: NAS_UPLOAD_KEY_sansan856`
  - Response เป็น `success:true` และมี `url` ชี้ไปที่ `serve.php`
- คลิก `url` เพื่อตรวจรูปแสดงผลได้ (200)

### Step 3: จำลอง NAS ล้มเหลว/คีย์ผิด (ต้อง “บล็อก” การบันทึก)
- เปลี่ยน API Key เป็นค่าไม่ถูก เช่น `WRONG_KEY_TEST` → Save → Hard reload
- แนบรูป → กดบันทึก
- Network → `upload.php` (POST/Fetch)
  - Headers: `X-API-Key: WRONG_KEY_TEST`
  - Response: `success:false` (Unauthorized)
- แอปต้อง “ไม่บันทึก NCR” และ “เลข NCR ไม่ถูกกิน” (มีข้อความแจ้งเตือน/rollback สำเร็จ)
- เมื่อยืนยันผลแล้ว เปลี่ยนคีย์กลับเป็นจริง → Save → Hard reload → ทดสอบบันทึกอีกครั้ง ต้องสำเร็จ

---

## การเก็บหลักฐาน (Evidence)
- ภาพหน้าจอ “สำเร็จ! บันทึกข้อมูลสำเร็จ”
- แท็บ Network ของ `upload.php` (Headers + Response) สำหรับเคสคีย์ถูกและคีย์ผิด
- ภาพแสดงผลรูปจาก `serve.php`

---

## Troubleshooting (แก้ปัญหาเร็ว)
- Unauthorized
  - ตรวจ API Key ใน Settings ให้ถูกต้อง
  - Save + Hard reload (Disable cache + `Ctrl+F5`)
  - Network → `upload.php` ต้องมี Header `X-API-Key`

- 404 จาก `serve.php`
  - ตรวจค่าพารามิเตอร์ `file` ว่าถูกต้อง
  - ตรวจ `open_basedir` ครอบคลุม path ที่ใช้ และสิทธิ์โฟลเดอร์ `http`

- File type not allowed
  - ดู Response JSON ของ `upload.php` (detected/frontend MIME)
  - ใช้ไฟล์ `jpg/jpeg/png/webp` หรือบันทึกใหม่จากแอป

- บันทึกไม่สำเร็จ (ไม่เกี่ยวกับ NAS)
  - เปิด Console หา `❌ ReturnRecord save FAILED ...`
  - ตรวจว่าฟิลด์บังคับครบ และไม่มีค่าที่เป็น `undefined` ในข้อมูล (ระบบล้างค่า `undefined` แล้ว หากยังพบให้ส่ง log ให้ทีมช่วยตรวจ)

---

## สคริปต์ทดสอบ

### PowerShell: ทดสอบคีย์ผิด (คาดหวัง Unauthorized)
```powershell
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$api = "https://neosiam.dscloud.biz/ncr-api/upload.php"
$apiKey = "WRONG_KEY_TEST"
Add-Type -AssemblyName System.Net.Http

function Invoke-NasUploadTest($filePath, $contentType, $remotePath) {
  $client = New-Object System.Net.Http.HttpClient
  $client.DefaultRequestHeaders.Add('X-API-Key', $apiKey)
  $content = New-Object System.Net.Http.MultipartFormDataContent
  $fs = [IO.File]::OpenRead($filePath)
  $sc = New-Object System.Net.Http.StreamContent($fs)
  $sc.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse($contentType)
  $content.Add($sc, 'file', [IO.Path]::GetFileName($filePath))
  $content.Add((New-Object System.Net.Http.StringContent($remotePath)), 'path')
  $res = $client.PostAsync($api, $content).Result
  $status = [int]$res.StatusCode
  $txt = $res.Content.ReadAsStringAsync().Result
  "Upload Status: $status" | Write-Host
  "Response: $txt" | Write-Host
  $fs.Dispose(); $sc.Dispose(); $content.Dispose(); $client.Dispose()
}

$pngB64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAnsB+JpXvSkAAAAASUVORK5CYII="
$pngPath = Join-Path $env:TEMP ("nas-wrong-key-" + (Get-Date -Format yyyyMMddHHmmss) + ".png")
[IO.File]::WriteAllBytes($pngPath, [Convert]::FromBase64String($pngB64))
$date = Get-Date -Format yyyyMMdd
$remotePath = ("ncr-images/UAT-STEP3/" + $date + "/wrong-key-test.png")
Invoke-NasUploadTest -filePath $pngPath -contentType 'image/png' -remotePath $remotePath
Remove-Item $pngPath -Force
```

### Browser Console: ทดสอบอัปโหลดไฟล์เล็ก (คีย์ถูก)
```js
(async () => {
  const b64='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAnsB+JpXvSkAAAAASUVORK5CYII=';
  const blob = await (await fetch(b64)).blob();
  const fd = new FormData();
  const d = new Date().toISOString().slice(0,10).replace(/-/g,'');
  fd.append('file', new File([blob], 'test.png', { type: 'image/png' }));
  fd.append('path', `ncr-images/WEB-CONSOLE-TEST/${d}/test.png`);
  const r = await fetch('https://neosiam.dscloud.biz/ncr-api/upload.php', {
    method:'POST', headers:{'X-API-Key':'NAS_UPLOAD_KEY_sansan856'}, body:fd
  });
  console.log('Status', r.status); console.log(await r.text());
})();
```

---

## นโยบายสำคัญ
- โหมด NAS-only: ถ้าอัปโหลดไป NAS ไม่สำเร็จ → “ยกเลิกการบันทึก” และ “rollback เลข” ทันที
- ฐานข้อมูลต้องเก็บ URL รูปที่เป็น `serve.php` เท่านั้น
- ห้ามมีการ fallback ไป Firebase Storage ในการอัปโหลดรูป
