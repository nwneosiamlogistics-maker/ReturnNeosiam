import { db } from '../firebase';
import { ref, get, update } from 'firebase/database';
import { isBase64Image, uploadBase64ToStorage, isFirebaseUrl, migrateFirebaseToNAS } from './imageUpload';

export interface MigrationProgress {
  totalRecords: number;
  processedRecords: number;
  totalBase64Found: number;
  migratedImages: number;
  failedImages: number;
  skippedRecords: number;
  currentRecord: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  log: string[];
}

type ProgressCallback = (progress: MigrationProgress) => void;

/**
 * Migrate all Base64 images in return_records and ncr_reports to Firebase Storage.
 * - Reads each record's images[] array
 * - If an image starts with "data:image/" (Base64), uploads it to Storage
 * - Replaces the Base64 string with the Storage URL
 * - Updates the record in DB
 * - Skips images that are already URLs
 */
export const migrateBase64Images = async (onProgress: ProgressCallback): Promise<MigrationProgress> => {
  const progress: MigrationProgress = {
    totalRecords: 0,
    processedRecords: 0,
    totalBase64Found: 0,
    migratedImages: 0,
    failedImages: 0,
    skippedRecords: 0,
    currentRecord: '',
    status: 'running',
    log: ['🚀 เริ่มต้น Migration...'],
  };

  const addLog = (msg: string) => {
    progress.log.push(msg);
    onProgress({ ...progress });
  };

  try {
    // ====== STEP 1: Scan return_records ======
    addLog('📦 กำลังสแกน return_records...');
    const returnSnap = await get(ref(db, 'return_records'));
    const returnData = returnSnap.val() as Record<string, Record<string, unknown>> | null;

    // ====== STEP 2: Scan ncr_reports ======
    addLog('📋 กำลังสแกน ncr_reports...');
    const ncrSnap = await get(ref(db, 'ncr_reports'));
    const ncrData = ncrSnap.val() as Record<string, Record<string, unknown>> | null;

    // Collect all records that have base64 images
    const recordsToMigrate: { path: string; key: string; images: string[] }[] = [];

    if (returnData) {
      for (const [key, record] of Object.entries(returnData)) {
        const images = record.images as string[] | undefined;
        if (images && Array.isArray(images) && images.some(isBase64Image)) {
          recordsToMigrate.push({ path: 'return_records', key, images });
        }
      }
    }

    if (ncrData) {
      for (const [key, record] of Object.entries(ncrData)) {
        const images = record.images as string[] | undefined;
        if (images && Array.isArray(images) && images.some(isBase64Image)) {
          recordsToMigrate.push({ path: 'ncr_reports', key, images });
        }
      }
    }

    const totalReturnRecords = returnData ? Object.keys(returnData).length : 0;
    const totalNCRRecords = ncrData ? Object.keys(ncrData).length : 0;
    progress.totalRecords = recordsToMigrate.length;
    progress.skippedRecords = (totalReturnRecords + totalNCRRecords) - recordsToMigrate.length;

    // Count total base64 images
    for (const rec of recordsToMigrate) {
      progress.totalBase64Found += rec.images.filter(isBase64Image).length;
    }

    addLog(`📊 พบทั้งหมด ${totalReturnRecords + totalNCRRecords} records`);
    addLog(`🖼️ พบ ${progress.totalRecords} records ที่มีรูป Base64 (${progress.totalBase64Found} รูป)`);
    addLog(`⏭️ ข้าม ${progress.skippedRecords} records ที่ไม่มี Base64`);

    if (progress.totalBase64Found === 0) {
      addLog('✅ ไม่พบรูป Base64 — ไม่ต้อง migrate');
      progress.status = 'completed';
      onProgress({ ...progress });
      return progress;
    }

    addLog('');
    addLog('🔄 เริ่มย้ายรูปภาพ...');

    // ====== STEP 3: Migrate each record ======
    for (const rec of recordsToMigrate) {
      progress.currentRecord = `${rec.path}/${rec.key}`;
      progress.processedRecords++;
      onProgress({ ...progress });

      const newImages: string[] = [];
      let hasChanges = false;

      for (let i = 0; i < rec.images.length; i++) {
        const img = rec.images[i];

        if (isBase64Image(img)) {
          try {
            const folder = rec.path === 'return_records' ? 'migrated-returns' : 'migrated-ncr';
            const url = await uploadBase64ToStorage(img, folder);
            newImages.push(url);
            progress.migratedImages++;
            hasChanges = true;
          } catch (err) {
            console.error(`Failed to migrate image ${i} in ${rec.path}/${rec.key}:`, err);
            // ⚠️ เก็บ Base64 เดิมไว้ถ้า upload ล้มเหลว — ข้อมูลไม่หาย
            newImages.push(img);
            progress.failedImages++;
          }
        } else {
          // Already a URL — keep as-is
          newImages.push(img);
        }
      }

      // Only update DB if we actually migrated something
      if (hasChanges) {
        await update(ref(db, `${rec.path}/${rec.key}`), { images: newImages });
        addLog(`✅ ${rec.path}/${rec.key} — ย้ายสำเร็จ`);
      }

      onProgress({ ...progress });
    }

    addLog('');
    addLog(`🎉 Migration เสร็จสิ้น!`);
    addLog(`   ✅ ย้ายสำเร็จ: ${progress.migratedImages} รูป`);
    if (progress.failedImages > 0) {
      addLog(`   ⚠️ ล้มเหลว: ${progress.failedImages} รูป (เก็บ Base64 เดิมไว้)`);
    }
    addLog(`   📉 ลด DB size ได้ประมาณ ${Math.round(progress.migratedImages * 0.8)} MB`);

    progress.status = 'completed';
    onProgress({ ...progress });
    return progress;

  } catch (error) {
    addLog(`❌ Error: ${(error as Error).message}`);
    progress.status = 'error';
    onProgress({ ...progress });
    return progress;
  }
};

/**
 * Migrate all Firebase Storage URLs → NAS
 * - Scans return_records and ncr_reports
 * - Downloads images from Firebase Storage
 * - Uploads to NAS via upload.php
 * - Updates DB records with NAS serve.php URLs
 */
export const migrateFirebaseImagesToNAS = async (onProgress: ProgressCallback): Promise<MigrationProgress> => {
  const progress: MigrationProgress = {
    totalRecords: 0,
    processedRecords: 0,
    totalBase64Found: 0, // reused as "totalFirebaseFound"
    migratedImages: 0,
    failedImages: 0,
    skippedRecords: 0,
    currentRecord: '',
    status: 'running',
    log: ['🚀 เริ่ม Firebase → NAS Migration...'],
  };

  const addLog = (msg: string) => {
    progress.log.push(msg);
    onProgress({ ...progress });
  };

  try {
    addLog('📦 กำลังสแกน return_records...');
    const returnSnap = await get(ref(db, 'return_records'));
    const returnData = returnSnap.val() as Record<string, Record<string, unknown>> | null;

    addLog('📋 กำลังสแกน ncr_reports...');
    const ncrSnap = await get(ref(db, 'ncr_reports'));
    const ncrData = ncrSnap.val() as Record<string, Record<string, unknown>> | null;

    const recordsToMigrate: { path: string; key: string; images: string[] }[] = [];

    if (returnData) {
      for (const [key, record] of Object.entries(returnData)) {
        const images = record.images as string[] | undefined;
        if (images && Array.isArray(images) && images.some(isFirebaseUrl)) {
          recordsToMigrate.push({ path: 'return_records', key, images });
        }
      }
    }

    if (ncrData) {
      for (const [key, record] of Object.entries(ncrData)) {
        const images = record.images as string[] | undefined;
        if (images && Array.isArray(images) && images.some(isFirebaseUrl)) {
          recordsToMigrate.push({ path: 'ncr_reports', key, images });
        }
      }
    }

    const totalReturnRecords = returnData ? Object.keys(returnData).length : 0;
    const totalNCRRecords = ncrData ? Object.keys(ncrData).length : 0;
    progress.totalRecords = recordsToMigrate.length;
    progress.skippedRecords = (totalReturnRecords + totalNCRRecords) - recordsToMigrate.length;

    for (const rec of recordsToMigrate) {
      progress.totalBase64Found += rec.images.filter(isFirebaseUrl).length;
    }

    addLog(`📊 พบทั้งหมด ${totalReturnRecords + totalNCRRecords} records`);
    addLog(`🖼️ พบ ${progress.totalRecords} records ที่มีรูป Firebase (${progress.totalBase64Found} รูป)`);

    if (progress.totalBase64Found === 0) {
      addLog('✅ ไม่พบรูป Firebase — ไม่ต้อง migrate');
      progress.status = 'completed';
      onProgress({ ...progress });
      return progress;
    }

    addLog('');
    addLog('🔄 เริ่มย้ายรูปจาก Firebase → NAS...');

    for (const rec of recordsToMigrate) {
      progress.currentRecord = `${rec.path}/${rec.key}`;
      progress.processedRecords++;
      onProgress({ ...progress });

      const newImages: string[] = [];
      let hasChanges = false;

      for (let i = 0; i < rec.images.length; i++) {
        const img = rec.images[i];

        if (isFirebaseUrl(img)) {
          try {
            const folder = rec.path === 'return_records' ? 'migrated-returns' : 'migrated-ncr';
            const nasUrl = await migrateFirebaseToNAS(img, `${folder}/${rec.key}/img_${i}.webp`);
            if (nasUrl) {
              newImages.push(nasUrl);
              progress.migratedImages++;
              hasChanges = true;
            } else {
              newImages.push(img); // Keep Firebase URL if migration failed
              progress.failedImages++;
            }
          } catch (err) {
            console.error(`Failed to migrate image ${i} in ${rec.path}/${rec.key}:`, err);
            newImages.push(img);
            progress.failedImages++;
          }
        } else {
          newImages.push(img); // Already NAS URL or other — keep as-is
        }
      }

      if (hasChanges) {
        await update(ref(db, `${rec.path}/${rec.key}`), { images: newImages });
        addLog(`✅ ${rec.path}/${rec.key} — ย้ายสำเร็จ`);
      }

      onProgress({ ...progress });
    }

    addLog('');
    addLog(`🎉 Firebase → NAS Migration เสร็จสิ้น!`);
    addLog(`   ✅ ย้ายสำเร็จ: ${progress.migratedImages} รูป`);
    if (progress.failedImages > 0) {
      addLog(`   ⚠️ ล้มเหลว: ${progress.failedImages} รูป (เก็บ Firebase URL เดิมไว้)`);
    }

    progress.status = 'completed';
    onProgress({ ...progress });
    return progress;

  } catch (error) {
    addLog(`❌ Error: ${(error as Error).message}`);
    progress.status = 'error';
    onProgress({ ...progress });
    return progress;
  }
};

/**
 * Check if URL is a NAS serve.php URL without file extension
 */
const isNasUrlWithoutExt = (url: string): boolean => {
  if (!url.includes('serve.php?file=')) return false;
  const filePath = url.split('serve.php?file=')[1];
  if (!filePath) return false;
  const filename = filePath.split('/').pop() || '';
  return !filename.includes('.');
};

/**
 * Fix NAS image filenames: re-upload with .webp extension
 * Downloads from NAS serve.php → re-uploads with .webp via proxy
 */
export const fixNasImageExtensions = async (
  nasConfig: { apiUrl: string; apiKey: string },
  onProgress: ProgressCallback
): Promise<MigrationProgress> => {
  const progress: MigrationProgress = {
    totalRecords: 0, processedRecords: 0, totalBase64Found: 0,
    migratedImages: 0, failedImages: 0, skippedRecords: 0,
    currentRecord: '', status: 'running',
    log: ['🔧 เริ่มแก้ไขนามสกุลไฟล์ NAS...'],
  };

  const addLog = (msg: string) => {
    progress.log.push(msg);
    onProgress({ ...progress });
  };

  try {
    addLog('📦 กำลังสแกน...');
    const returnSnap = await get(ref(db, 'return_records'));
    const returnData = returnSnap.val() as Record<string, Record<string, unknown>> | null;
    const ncrSnap = await get(ref(db, 'ncr_reports'));
    const ncrData = ncrSnap.val() as Record<string, Record<string, unknown>> | null;

    const recordsToFix: { path: string; key: string; images: string[] }[] = [];

    if (returnData) {
      for (const [key, record] of Object.entries(returnData)) {
        const images = record.images as string[] | undefined;
        if (images && Array.isArray(images) && images.some(isNasUrlWithoutExt)) {
          recordsToFix.push({ path: 'return_records', key, images });
        }
      }
    }
    if (ncrData) {
      for (const [key, record] of Object.entries(ncrData)) {
        const images = record.images as string[] | undefined;
        if (images && Array.isArray(images) && images.some(isNasUrlWithoutExt)) {
          recordsToFix.push({ path: 'ncr_reports', key, images });
        }
      }
    }

    progress.totalRecords = recordsToFix.length;
    for (const rec of recordsToFix) {
      progress.totalBase64Found += rec.images.filter(isNasUrlWithoutExt).length;
    }

    addLog(`🖼️ พบ ${progress.totalBase64Found} รูปที่ไม่มีนามสกุล`);

    if (progress.totalBase64Found === 0) {
      addLog('✅ ไม่พบรูปที่ต้องแก้');
      progress.status = 'completed';
      onProgress({ ...progress });
      return progress;
    }

    addLog('🔄 เริ่มแก้ไข...');

    for (const rec of recordsToFix) {
      progress.currentRecord = `${rec.path}/${rec.key}`;
      progress.processedRecords++;

      const newImages: string[] = [];
      let hasChanges = false;

      for (let i = 0; i < rec.images.length; i++) {
        const img = rec.images[i];

        if (isNasUrlWithoutExt(img)) {
          try {
            const newPath = img.split('serve.php?file=')[1] + '.webp';
            const res = await fetch('/api/nas-proxy', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'migrate',
                firebaseUrl: img,
                nasUrl: nasConfig.apiUrl,
                apiKey: nasConfig.apiKey,
                path: newPath,
              }),
            });
            const data = await res.json();
            if (data.success && data.url) {
              newImages.push(data.url);
              progress.migratedImages++;
              hasChanges = true;
            } else {
              newImages.push(img);
              progress.failedImages++;
            }
          } catch {
            newImages.push(img);
            progress.failedImages++;
          }
        } else {
          newImages.push(img);
        }
      }

      if (hasChanges) {
        await update(ref(db, `${rec.path}/${rec.key}`), { images: newImages });
        addLog(`✅ ${rec.path}/${rec.key} — แก้ไขสำเร็จ`);
      }
      onProgress({ ...progress });
    }

    addLog(`🎉 แก้ไขเสร็จ! สำเร็จ: ${progress.migratedImages} รูป`);
    if (progress.failedImages > 0) addLog(`⚠️ ล้มเหลว: ${progress.failedImages} รูป`);

    progress.status = 'completed';
    onProgress({ ...progress });
    return progress;
  } catch (error) {
    addLog(`❌ Error: ${(error as Error).message}`);
    progress.status = 'error';
    onProgress({ ...progress });
    return progress;
  }
};
