<?php
/**
 * Neosiam Return — NAS Image Serve API
 * วางไฟล์นี้บน Synology Web Station: /web/api/serve.php
 *
 * ค้นหาไฟล์จากหลาย directory — Synology Drive ก่อน, fallback /tmp
 */

// ค้นหาไฟล์จากหลาย directory
$UPLOAD_DIRS = array(
    '/volume1/Operation/paweewat/NCR Return Management',
    '/tmp/nas-uploads-ncr',
    '/tmp/nas-uploads'
);

header('Access-Control-Allow-Origin: *');

$filePath = isset($_GET['file']) ? $_GET['file'] : '';
$filePath = trim($filePath);

if (empty($filePath)) {
    http_response_code(400);
    echo 'Missing file parameter';
    exit;
}

// Security: block path traversal attempts
if (strpos($filePath, '..') !== false) {
    http_response_code(403);
    echo 'Invalid path';
    exit;
}

// ค้นหาไฟล์ + security check (ป้องกัน path traversal)
$realFile = false;
foreach ($UPLOAD_DIRS as $dir) {
    $candidate = rtrim($dir, '/') . '/' . ltrim($filePath, '/');
    if (file_exists($candidate) && is_file($candidate)) {
        $realFile = $candidate;
        break;
    }
}

if ($realFile === false) {
    http_response_code(404);
    echo "File not found. Please check Synology 'open_basedir' and 'http' group permissions.";
    exit;
}

// MIME type detection: finfo first, fallback to extension mapping
$mime = 'application/octet-stream';
if (function_exists('finfo_open')) {
    $finfo = @finfo_open(FILEINFO_MIME_TYPE);
    if ($finfo) {
        $detected = @finfo_file($finfo, $realFile);
        @finfo_close($finfo);
        if ($detected && $detected !== 'application/octet-stream') {
            $mime = $detected;
        }
    }
}
if ($mime === 'application/octet-stream') {
    $ext = strtolower(pathinfo($realFile, PATHINFO_EXTENSION));
    $mimeMap = array(
        'webp' => 'image/webp', 'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg',
        'png' => 'image/png', 'gif' => 'image/gif', 'pdf' => 'application/pdf'
    );
    $mime = isset($mimeMap[$ext]) ? $mimeMap[$ext] : 'application/octet-stream';
}

// ส่งไฟล์พร้อม cache 30 วัน
header('Content-Type: ' . $mime);
header('Content-Length: ' . filesize($realFile));
header('Cache-Control: public, max-age=2592000');
header('ETag: "' . md5_file($realFile) . '"');

readfile($realFile);
exit;
