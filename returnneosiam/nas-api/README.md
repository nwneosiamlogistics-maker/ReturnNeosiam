# Neosiam NCR — NAS API (Synology Web Station)

## วิธีติดตั้ง

### 1. เปิด Web Station บน Synology DSM
- เข้า DSM → Package Center → ติดตั้ง **Web Station** + **PHP 7.4+**
- ตั้งค่า Virtual Host หรือใช้ default web folder

### 2. คัดลอกไฟล์ PHP ไปวางบน NAS
วางไฟล์ใน `/volume1/web/ncr-api/`:

```
/volume1/web/ncr-api/
├── upload.php
└── serve.php
```

### 3. แก้ Config ในไฟล์ PHP
เปิดทั้ง `upload.php` และ `serve.php` แก้ไข:

```php
$API_KEY = 'neosiam-nas-2026-secret';  // เปลี่ยนเป็น key ของคุณเอง
$UPLOAD_BASE = '/volume1/team-folders/Operation/NCR Return Management'; // path จริงบน NAS
$NAS_BASE_URL = 'https://neosiam.quickconnect.to'; // URL ของ NAS (upload.php เท่านั้น)
```

### 4. ตรวจสอบ permission
```bash
# ให้ web user (http/www-data) มีสิทธิ์เขียนโฟลเดอร์
chmod 755 /volume1/web/ncr-api/
chmod 755 /volume1/team-folders/Operation/NCR\ Return\ Management/
```

### 5. ตั้งค่าในหน้า Settings ของเว็บแอป
- เข้า Settings → Synology NAS Storage
- ใส่ NAS API URL: `https://neosiam.quickconnect.to/ncr-api`
- ใส่ API Key: (key ที่ตั้งในข้อ 3)
- เปิดใช้งาน → บันทึก

### 6. (Optional) Synology Drive Sync
ไฟล์ที่อัปโหลดจะเข้าไปอยู่ในโฟลเดอร์ `NCR Return Management` โดยตรง
ถ้าเปิด Synology Drive แล้ว ไฟล์จะ sync อัตโนมัติ

## API Endpoints

### POST /ncr-api/upload.php
อัปโหลดรูปภาพ

**Headers:**
- `X-API-Key: <your-api-key>`

**Body (multipart/form-data):**
- `file` — ไฟล์รูปภาพ
- `docNo` — เลขเอกสาร (เช่น NCR-2026-0139)
- `category` — ประเภท (ncr, col, analysis)

**Response:**
```json
{
  "success": true,
  "filename": "20260213_112354_a1b2c3d4.webp",
  "path": "ncr/NCR-2026-0139/20260213_112354_a1b2c3d4.webp",
  "url": "https://neosiam.quickconnect.to/ncr-api/serve.php?path=ncr%2FNCR-2026-0139%2F20260213.webp",
  "size": 102400,
  "type": "image/webp"
}
```

### GET /ncr-api/serve.php?path=...
แสดงรูปภาพ — ใช้เป็น `<img src="...">` ได้เลย

## โครงสร้างไฟล์บน NAS

```
NCR Return Management/
├── ncr/
│   ├── NCR-2026-0139/
│   │   ├── 20260213_112354_a1b2c3d4.webp
│   │   └── 20260213_112355_e5f6g7h8.webp
│   └── NCR-2026-0140/
│       └── ...
├── col/
│   └── COL-2026-0050/
│       └── ...
└── analysis/
    └── 2026-02/
        └── ...
```
