import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { uploadToNAS } from './nasUpload';
import { NASConfig } from '../types';

// NAS config cache — จะถูก set จาก DataContext เมื่อ systemConfig โหลดเสร็จ
let _nasConfig: NASConfig | null = null;
let _currentDocNo: string = '';
let _currentCategory: string = 'general';

export const setNASConfig = (config: NASConfig | undefined) => {
  _nasConfig = config || null;
};

export const setNASUploadContext = (docNo: string, category: string) => {
  _currentDocNo = docNo;
  _currentCategory = category;
};

/**
 * Compress image file/blob before upload to reduce bandwidth
 * Target: ~200KB-ish per image (WebP, 800px width, quality 0.6)
 */
const compressImage = (file: File | Blob, maxWidth = 800, quality = 0.6): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      let { width, height } = img;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to compress image'));
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Upload a single image — NAS primary, Firebase fallback
 * Returns the image URL (NAS serve.php URL or Firebase URL)
 */
export const uploadImageToStorage = async (
  file: File,
  folder: string = 'ncr-images'
): Promise<string> => {
  const compressed = await compressImage(file);
  const filename = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.webp`;

  // Strategy: NAS first → if fails, fallback to Firebase
  if (_nasConfig?.enabled && _nasConfig.apiUrl && _nasConfig.apiKey) {
    try {
      const nasResult = await uploadToNAS(_nasConfig, compressed, {
        docNo: _currentDocNo,
        category: _currentCategory || folder,
        filename,
      });

      if (nasResult.success && nasResult.url) {
        console.log('[Upload] ✅ NAS primary:', nasResult.url);
        // Background: backup to Firebase (fire-and-forget)
        const fbFilename = `${folder}/${filename}`;
        const storageRef = ref(storage, fbFilename);
        uploadBytes(storageRef, compressed, { contentType: 'image/webp' })
          .then(() => console.log('[Upload] Firebase backup done'))
          .catch(err => console.warn('[Upload] Firebase backup failed:', err));
        return nasResult.url;
      }

      console.warn('[Upload] NAS failed:', nasResult.error, '→ fallback to Firebase');
    } catch (err) {
      console.warn('[Upload] NAS error:', err, '→ fallback to Firebase');
    }
  }

  // Fallback: Firebase
  const fbFilename = `${folder}/${filename}`;
  const storageRef = ref(storage, fbFilename);
  await uploadBytes(storageRef, compressed, { contentType: 'image/webp' });
  const firebaseUrl = await getDownloadURL(storageRef);
  console.log('[Upload] Firebase (fallback):', firebaseUrl);
  return firebaseUrl;
};

/**
 * Upload multiple image files
 * Returns array of URLs (NAS or Firebase)
 */
export const uploadImagesToStorage = async (
  files: File[],
  folder: string = 'ncr-images'
): Promise<string[]> => {
  const urls: string[] = [];
  for (const file of files) {
    const url = await uploadImageToStorage(file, folder);
    urls.push(url);
  }
  return urls;
};

/**
 * Check if a string is a base64 data URL (legacy format)
 */
export const isBase64Image = (str: string): boolean => {
  return str.startsWith('data:image/');
};

/**
 * Convert a base64 data URL to a Blob
 */
const base64ToBlob = (base64: string): Blob => {
  const parts = base64.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const byteString = atob(parts[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mime });
};

/**
 * Upload a base64 image string (for migration)
 * Returns the URL
 */
export const uploadBase64ToStorage = async (
  base64: string,
  folder: string = 'migrated-images'
): Promise<string> => {
  const blob = base64ToBlob(base64);
  const compressed = await compressImage(blob);
  const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
  const storageRef = ref(storage, filename);
  await uploadBytes(storageRef, compressed, { contentType: 'image/webp' });
  return getDownloadURL(storageRef);
};

/**
 * Check if URL is a Firebase Storage URL
 */
export const isFirebaseUrl = (url: string): boolean => {
  return url.includes('firebasestorage.googleapis.com') || url.includes('storage.googleapis.com');
};

/**
 * Migrate a single Firebase URL → NAS
 * Uses Vercel proxy (server-side) to bypass CORS
 * Flow: Browser → /api/nas-proxy (migrate) → Firebase download → NAS upload
 */
export const migrateFirebaseToNAS = async (
  firebaseUrl: string,
  path: string
): Promise<string | null> => {
  if (!_nasConfig?.enabled || !_nasConfig.apiUrl || !_nasConfig.apiKey) {
    console.error('[Migration] NAS not configured');
    return null;
  }

  try {
    console.log('[Migration] Via proxy:', firebaseUrl.slice(0, 80));

    const res = await fetch('/api/nas-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'migrate',
        firebaseUrl,
        nasUrl: _nasConfig.apiUrl,
        apiKey: _nasConfig.apiKey,
        path,
      }),
    });

    const data = await res.json();

    if (!data.success) {
      console.error('[Migration] Proxy failed:', data.error);
      return null;
    }

    console.log('[Migration] ✅ Migrated:', data.url);
    return data.url || null;
  } catch (err) {
    console.error('[Migration] Failed:', firebaseUrl.slice(0, 80), err);
    return null;
  }
};
