<?php
/**
 * Neosiam Return — NAS Image Upload API
 * วางไฟล์นี้บน Synology Web Station: /web/api/upload.php
 *
 * ⚠️ Synology Nginx ดักจับ HTTP status ที่ไม่ใช่ 200
 *    → ห้ามใช้ http_response_code() — ใส่ error ใน JSON body แทน
 * ⚠️ PHP user (http) เขียน /volume1/ ไม่ได้
 *    → เขียนไป /tmp/nas-uploads/ แล้ว rsync (root) ไป Synology Drive
 */

// ===== CONFIG — แก้ตรงนี้สำหรับโปรเจคใหม่ =====
$API_KEY = 'NAS_UPLOAD_KEY_sansan856';
$UPLOAD_DIR = '/tmp/nas-uploads-ncr';
$BASE_URL = 'https://neosiam.dscloud.biz/ncr-api/serve.php?file=';
$MAX_FILE_SIZE = 10 * 1024 * 1024;               // 10MB
$ALLOWED_TYPES = array('image/webp', 'image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'image/jpg');

// ===== CORS — ต้องมีเสมอ =====
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-API-Key');
header('Content-Type: application/json; charset=utf-8');

// Preflight — ห้ามใส่ http_response_code (default 200)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

// ===== AUTH =====
$apiKey = isset($_SERVER['HTTP_X_API_KEY']) ? $_SERVER['HTTP_X_API_KEY'] : '';
if ($apiKey !== $API_KEY) {
    // ⚠️ ห้ามใช้ http_response_code(401) — Nginx จะดักจับ
    echo json_encode(array('success' => false, 'error' => 'Unauthorized'));
    exit;
}

// ===== VALIDATE =====
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(array('success' => false, 'error' => 'Method not allowed'));
    exit;
}

// ===== RECEIVE FILE =====
if (!isset($_FILES['file'])) {
    echo json_encode(array('success' => false, 'error' => 'No file uploaded'));
    exit;
}

$file = $_FILES['file'];

if ($file['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(array('success' => false, 'error' => 'Upload error', 'code' => $file['error']));
    exit;
}

if ($file['size'] > $MAX_FILE_SIZE) {
    echo json_encode(array('success' => false, 'error' => 'File too large', 'maxSize' => '10MB'));
    exit;
}

// MIME type check (robust for Synology DSM/libmagic)
$mimeType = '';
if (function_exists('finfo_open')) {
    // Suppress warnings on some DSM builds
    $finfo = @finfo_open(FILEINFO_MIME_TYPE);
    if ($finfo) {
        $detected = @finfo_file($finfo, $file['tmp_name']);
        @finfo_close($finfo);
        $mimeType = $detected !== false ? $detected : '';
    }
}

// Fallback to client-declared type if finfo is empty/unknown
if (empty($mimeType) || $mimeType === 'application/octet-stream' || $mimeType === 'text/plain') {
    $mimeType = isset($file['type']) ? $file['type'] : '';
}

if (!in_array($mimeType, $ALLOWED_TYPES)) {
    echo json_encode(array(
        'success' => false,
        'error' => 'File type not allowed',
        'detected_type' => $mimeType,
        'frontend_type' => isset($file['type']) ? $file['type'] : null,
        'filename' => isset($file['name']) ? $file['name'] : null
    ));
    exit;
}

// ===== SAVE FILE =====
$subPath = isset($_POST['path']) ? $_POST['path'] : '';
$subPath = preg_replace('/[^a-zA-Z0-9_\-\/\.]/', '_', $subPath);

if (empty($subPath)) {
    $extMap = array(
        'image/webp' => 'webp', 'image/jpeg' => 'jpg', 'image/png' => 'png',
        'image/gif' => 'gif', 'application/pdf' => 'pdf'
    );
    $ext = isset($extMap[$mimeType]) ? $extMap[$mimeType] : 'bin';
    $subPath = 'misc/' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
}

$fullPath = $UPLOAD_DIR . '/' . $subPath;
$dir = dirname($fullPath);

if (!is_dir($dir)) {
    mkdir($dir, 0755, true);
}

if (!move_uploaded_file($file['tmp_name'], $fullPath)) {
    echo json_encode(array('success' => false, 'error' => 'Failed to save file'));
    exit;
}

chmod($fullPath, 0644);

// ===== RESPONSE =====
echo json_encode(array(
    'success' => true,
    'url' => $BASE_URL . $subPath,
    'path' => $subPath,
    'size' => $file['size'],
    'type' => $mimeType
));
