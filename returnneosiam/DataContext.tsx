
import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from './firebase';
import { ref, onValue, set, update, remove, runTransaction } from 'firebase/database';
import { ReturnRecord, NCRRecord, SystemConfig } from './types';
import { setNASConfig } from './utils/imageUpload';
import Swal from 'sweetalert2';

// Types moved to types.ts



interface DataContextType {
  items: ReturnRecord[];
  ncrReports: NCRRecord[];
  loading: boolean;
  dataRangeDays: number;
  setDataRangeDays: (days: number) => void;
  addReturnRecord: (item: ReturnRecord) => Promise<boolean>;
  updateReturnRecord: (id: string, data: Partial<ReturnRecord>) => Promise<boolean>;
  deleteReturnRecord: (id: string) => Promise<boolean>;
  addNCRReport: (item: NCRRecord) => Promise<boolean>;
  updateNCRReport: (id: string, data: Partial<NCRRecord>) => Promise<boolean>;
  deleteNCRReport: (id: string) => Promise<boolean>; // This will now be a "cancel" operation
  systemConfig: SystemConfig;
  updateSystemConfig: (config: Partial<SystemConfig>) => Promise<boolean>;
  getNextNCRNumber: () => Promise<string>;
  rollbackNCRNumber: () => Promise<void>;
  getNextReturnNumber: () => Promise<string>;
  getNextCollectionNumber: () => Promise<string>;
  rollbackCollectionNumber: () => Promise<void>;
  runDataIntegrityCheck: () => Promise<number>;
  repairMissingReturnRecords: () => Promise<number>;
}

const DataContext = createContext<DataContextType>({
  items: [],
  ncrReports: [],
  loading: true,
  dataRangeDays: 30,
  setDataRangeDays: () => {},
  addReturnRecord: async () => false,
  updateReturnRecord: async () => false,
  deleteReturnRecord: async () => false,
  addNCRReport: async () => false,
  updateNCRReport: async () => false,
  deleteNCRReport: async () => false,
  systemConfig: {},
  updateSystemConfig: async () => false,
  getNextNCRNumber: async () => 'NCR-ERROR-0000',
  rollbackNCRNumber: async () => {},
  getNextReturnNumber: async () => 'RT-ERROR-0000',
  getNextCollectionNumber: async () => 'COL-ERROR-0000',
  rollbackCollectionNumber: async () => {},
  runDataIntegrityCheck: async () => 0,
  repairMissingReturnRecords: async () => 0,
});

export const useData = () => useContext(DataContext);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<ReturnRecord[]>([]);
  const [ncrReports, setNcrReports] = useState<NCRRecord[]>([]);
  const [systemConfig, setSystemConfig] = useState<SystemConfig>({
    telegram: {
      botToken: '8523483845:AAH63mYzb4xDe7kTWs3NMQLdX1RYWRzn8L0',
      chatId: '-1002744751386',
      enabled: true
    }
  });
  const [loading, setLoading] = useState(true);
  const [dataRangeDays, setDataRangeDays] = useState(30);

  useEffect(() => {
    console.log("🔄 Connecting to Realtime Database...");

    // Subscribe to Return Records
    const returnRef = ref(db, 'return_records');
    const unsubReturn = onValue(returnRef, (snapshot) => {
      const data = snapshot.val();
      // FIX: Add robust filtering to prevent crashes from malformed data
      const loadedItems = data
        ? (Object.values(data) as unknown[])
          .map((item: { date?: string; productName?: string;[key: string]: unknown }) => ({
            ...item,
            // Fix for Missing Date: Fallback to today if missing
            date: (item.date as string) || new Date().toISOString().split('T')[0],
            // Fix for Missing Product Name: Default value
            productName: (item.productName as string) || "ไม่พบข้อมูลสินค้า"
          }))
          .filter((item): item is ReturnRecord => {
            // 1. Basic Object Check
            if (!item || typeof item !== 'object') return false;

            // 2. Strict Type Checking for crucial fields required by Operations UI
            // removed 'productName' from strict check as we defaulted it above
            const requiredStrings = ['id', 'date', 'status', 'branch', 'customerName', 'productCode'];
            for (const field of requiredStrings) {
              if (typeof (item as Record<string, unknown>)[field] !== 'string') {
                console.warn(`🛡️ Data Hardening: Filtering out invalid ReturnRecord (missing/bad ${field})`, item);
                return false;
              }
            }

            // 3. Numeric Fields Check & Auto-fix
            if (typeof (item as Record<string, unknown>).quantity !== 'number') {
              // Attempt to parse string to number
              if (typeof (item as Record<string, unknown>).quantity === 'string' && !isNaN(parseFloat((item as Record<string, unknown>).quantity as string))) {
                (item as unknown as { quantity: number | string }).quantity = parseFloat((item as Record<string, unknown>).quantity as string);
              } else {
                console.warn(`🛡️ Data Hardening: Filtering out invalid ReturnRecord (bad quantity)`, item);
                return false;
              }
            }

            return true; // All checks passed
          })
        : [];

      setItems(loadedItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setLoading(false);
      console.log(`✅ RTDB Connected: Loaded ${loadedItems.length} valid Return Records`);
    }, (error) => {
      console.warn("⚠️ RTDB Permission/Connection Error (Returns).", error.message);
      setItems([]);
      setLoading(false);
    });

    // Subscribe to NCR Reports
    const ncrRef = ref(db, 'ncr_reports');
    const unsubNCR = onValue(ncrRef, (snapshot) => {
      const data = snapshot.val();
      const rawEntries = data ? Object.entries(data) : [];
      const rawCount = rawEntries.length;

      const loadedReports = data
        ? (rawEntries as [string, Record<string, unknown>][])
          .map(([key, value]) => {
            if (!value || typeof value !== 'object') return null;
            const report = {
              ...value,
              id: (typeof value.id === 'string' && value.id) ? value.id : key
            };
            const fullReport = report as Record<string, unknown>;
            return {
              ...fullReport,
              date: (typeof fullReport.date === 'string' ? fullReport.date : undefined) || new Date().toISOString().split('T')[0],
              status: (typeof fullReport.status === 'string' ? fullReport.status : undefined) || 'Open'
            };
          })
          .filter((report): report is NCRRecord => {
            if (!report) return false;
            const r = report as Record<string, unknown>;
            if (!r || typeof r !== 'object') return false;
            if (typeof r.id !== 'string') return false;
            if (typeof r.date !== 'string' || typeof r.status !== 'string') return false;
            return true;
          })
        : [];

      setNcrReports(loadedReports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      const filteredOut = rawCount - loadedReports.length;
      console.log(`✅ RTDB: NCR raw=${rawCount}, valid=${loadedReports.length}, filtered_out=${filteredOut}`);
    }, (error) => {
      console.warn("⚠️ RTDB Permission/Connection Error (NCR).", error.message);
      setNcrReports([]);
    });

    // Subscribe to System Config
    const configRef = ref(db, 'system_config');
    const unsubConfig = onValue(configRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSystemConfig(prev => ({
          ...prev,
          ...data,
          telegram: {
            ...prev.telegram,
            ...(data.telegram || {})
          },
          nas: {
            ...prev.nas,
            ...(data.nas || {})
          }
        }));
        // Sync NAS config to imageUpload utility
        if (data.nas) setNASConfig(data.nas);
      }
    });

    return () => {
      unsubReturn();
      unsubNCR();
      unsubConfig();
    };
  }, []);

  const addReturnRecord = async (item: ReturnRecord): Promise<boolean> => {
    // IRON RULE: Unique Document Number (R No) Logic
    // 1. "R 1 number can have products > 1": Allowed Same R + Diff Product.
    // 2. "Forbidden if Step 2+": If R exists in Step 2 onwards, cannot add new items to it.
    // BYPASS: NCR-created records skip duplicate check (NCR System handles its own dedup)

    const isFromNCR = item.documentType === 'NCR' || !!item.ncrNumber;

    const docNo = (item.documentNo || item.refNo || '').trim();
    const productKey = (item.productCode || item.productName || '').trim();

    if (docNo && !isFromNCR) {
      const targetDocLower = docNo.toLowerCase();
      const targetProdLower = productKey.toLowerCase();

      // Find all existing records with this R No
      // EXCLUSION: Do not apply lock rule if docNo is the generic placeholder "-"
      const existingWithSameR = (targetDocLower === '-' || targetDocLower === '')
        ? []
        : items.filter(existing => {
          const existingDoc = (existing.documentNo || existing.refNo || '').trim().toLowerCase();
          return existingDoc === targetDocLower;
        });

      if (existingWithSameR.length > 0) {
        // Rule A: Check if any existing item is already processed (Step 2+)
        // Statuses that are considered "Step 1" (Safe to add more): 'Draft', 'Requested'
        const isAlreadyProcessing = existingWithSameR.some(i =>
          i.status !== 'Draft' && i.status !== 'Requested'
        );

        if (isAlreadyProcessing) {
          const msg = `ไม่สามารถบันทึกได้: เลขที่เอกสาร "${docNo}" กำลังดำเนินการอยู่ในระบบ (Step 2+) หรือจบงานแล้ว (ห้ามใช้ซ้ำ)`;
          console.warn("🚫 " + msg);
          Swal.fire({
            icon: 'error',
            title: 'บันทึกไม่สำเร็จ',
            html: `
              <div class="text-left">
                 <p class="font-bold text-red-600 mb-2">เอกสาร ${docNo} ถูกล็อค (In Process)</p>
                 <p class="text-sm text-slate-600">เอกสารนี้เข้าสู่กระบวนการรับคืนแล้ว (Step 2 ขึ้นไป) ไม่สามารถเพิ่มสินค้าหรือแก้ไขได้</p>
              </div>
            `,
            confirmButtonText: 'รับทราบ',
            confirmButtonColor: '#334155'
          });
          return false;
        }

        // Rule B: Check for Exact Duplicate (Same R + Same Product)
        const isExactDuplicate = existingWithSameR.some(i => {
          const existingProd = (i.productCode || i.productName || '').trim().toLowerCase();
          return existingProd === targetProdLower;
        });

        if (isExactDuplicate) {
          const msg = `ไม่สามารถบันทึกได้: พบรายการซ้ำ (เลขเอกสาร "${docNo}" + สินค้า "${productKey}")`;
          console.warn("🚫 " + msg);
          Swal.fire({
            icon: 'warning',
            title: 'รายการซ้ำ (Duplicate)',
            html: `
              <div class="text-left">
                 <p class="font-bold text-amber-600 mb-2">เอกสาร ${docNo} มีสินค้านี้อยู่แล้ว</p>
                 <div class="bg-amber-50 p-2 rounded border border-amber-200 text-xs text-amber-800 mb-2 font-mono">
                    Product: ${productKey || 'Unknown'}
                 </div>
                 <p class="text-sm text-slate-600">ระบบไม่อนุญาตให้สร้างรายการสินค้าเดิมซ้ำในเอกสารเดียวกัน</p>
              </div>
            `,
            confirmButtonText: 'ตกลง',
            confirmButtonColor: '#d97706' // Amber
          });
          return false;
        }
      }
    }

    try {
      console.log(`📝 Writing ReturnRecord: ${item.id} (ncr: ${item.ncrNumber || 'N/A'})`);
      await set(ref(db, 'return_records/' + item.id), stripUndefinedDeep(item));
      console.log(`✅ ReturnRecord saved: ${item.id}`);
      return true;
    } catch (error: unknown) {
      if ((error as { code: string }).code === 'PERMISSION_DENIED') {
        console.error("⚠️ Write Permission Denied: Cannot save return record.");
        alert("Access Denied: Check Firebase Realtime Database Rules.");
      } else {
        console.error(`❌ ReturnRecord save FAILED (ID: ${item.id}):`, error);
        alert("Failed to save record.");
      }
      return false;
    }
  };

  const updateReturnRecord = async (id: string, data: Partial<ReturnRecord>): Promise<boolean> => {
    // IRON RULE: Unique Document Number Check on Update
    const docNo = (data.documentNo || data.refNo || '').trim();

    if (docNo) {
      const targetDocLower = docNo.toLowerCase();

      // Product Info Resolver (using Data or Fallback to Self)
      const selfItem = items.find(i => i.id === id);
      const productKey = (data.productCode || data.productName || selfItem?.productCode || selfItem?.productName || '').trim();
      const targetProdLower = productKey.toLowerCase();

      // Find conflicts with OTHER items (excluding self)
      const existingWithSameR = items.filter(existing => {
        if (existing.id === id) return false; // Skip self
        const existingDoc = (existing.documentNo || existing.refNo || '').trim().toLowerCase();
        return existingDoc === targetDocLower;
      });

      if (existingWithSameR.length > 0) {
        // Rule A: Check if any existing item is processed (Step 2+)
        const isAlreadyProcessing = existingWithSameR.some(i =>
          i.status !== 'Draft' && i.status !== 'Requested'
        );

        if (isAlreadyProcessing) {
          const msg = `ไม่สามารถบันทึกได้: เลขที่เอกสาร "${docNo}" ถูกใช้งานและดำเนินการไปแล้ว (Step 2+) (ห้ามใช้ซ้ำ)`;
          console.warn("🚫 " + msg);
          alert(msg);
          return false;
        }

        // Rule B: Check for Exact Duplicate (Same R + Same Product)
        const isExactDuplicate = existingWithSameR.some(i => {
          const existingProd = (i.productCode || i.productName || '').trim().toLowerCase();
          return existingProd === targetProdLower;
        });

        if (isExactDuplicate) {
          const msg = `ไม่สามารถบันทึกได้: พบรายการซ้ำ (เลขเอกสาร "${docNo}" + สินค้า "${productKey}")`;
          console.warn("🚫 " + msg);
          alert(msg);
          return false;
        }
      }
    }

    try {
      await update(ref(db, 'return_records/' + id), stripUndefinedDeep(data));
      return true;
    } catch (error: unknown) {
      if ((error as { code: string }).code === 'PERMISSION_DENIED') {
        console.warn("⚠️ Update Permission Denied.");
        alert("Access Denied: Cannot update record.");
      } else {
        console.error("Error updating return record:", error);
        alert("Failed to update record.");
      }
      return false;
    }
  };

  const deleteReturnRecord = async (id: string): Promise<boolean> => {
    try {
      await remove(ref(db, 'return_records/' + id));
      return true;
    } catch (error: unknown) {
      if ((error as { code: string }).code === 'PERMISSION_DENIED') {
        console.warn("⚠️ Delete Permission Denied.");
        alert("Access Denied: Cannot delete this return record.");
      } else {
        console.error("Error deleting return record:", error);
        alert("Failed to delete this return record.");
      }
      return false;
    }
  };

  
  function stripUndefinedDeep<T>(input: T): T {
    if (Array.isArray(input)) {
      const mapped = (input as unknown[])
        .map((v) => stripUndefinedDeep(v as unknown))
        .filter((v) => v !== undefined);
      return mapped as unknown as T;
    }
    if (input && typeof input === 'object') {
      const out: Record<string, unknown> = {};
      Object.entries(input as Record<string, unknown>).forEach(([k, v]) => {
        if (v === undefined) return;
        const sv = stripUndefinedDeep(v as unknown);
        if (sv !== undefined) out[k] = sv;
      });
      return out as unknown as T;
    }
    return input;
  }

  const addNCRReport = async (item: NCRRecord): Promise<boolean> => {
    // 🛡️ Guard: Critical ID check
    if (!item.id) {
      console.error("❌ CRITICAL: Attempted to add NCR without ID.", item);
      alert("System Error: NCR ID is missing. Cannot save data. Please contact support.");
      return false;
    }

    // 🛡️ Guard: Online check
    if (!navigator.onLine) {
      console.error("❌ OFFLINE: Cannot save NCR report while offline.");
      return false;
    }

    try {
      console.log(`📝 Writing NCR: ${item.id} (ncrNo: ${item.ncrNo})`);
      await set(ref(db, 'ncr_reports/' + item.id), stripUndefinedDeep(item));
      console.log(`✅ NCR saved successfully: ${item.id}`);
      return true;
    } catch (error: unknown) {
      const errCode = (error as { code?: string }).code;
      const errMsg = (error as { message?: string }).message;

      if (errCode === 'PERMISSION_DENIED') {
        console.error("⚠️ Write Permission Denied: Cannot save NCR report.");
        alert("Access Denied: ไม่มีสิทธิ์บันทึกข้อมูล กรุณาติดต่อผู้ดูแลระบบ");
        return false;
      }

      console.error(`❌ NCR save FAILED (ID: ${item.id}):`, errMsg || error);
      return false;
    }
  };

  const updateNCRReport = async (id: string, data: Partial<NCRRecord>): Promise<boolean> => {
    // 🛡️ Guard: Critical ID check
    if (!id) {
      console.error("❌ CRTICAL: Attempted to update NCR without ID provided.");
      alert("System Error: Update ID is missing.");
      return false;
    }
    try {
      // 1. Get the current (old) record before update to find linked items
      const oldNCR = ncrReports.find(r => r.id === id);
      const oldNcrNo = oldNCR?.ncrNo;
      const oldItemData = oldNCR?.item || (oldNCR as unknown as Record<string, unknown>);
      const oldProductCode = oldItemData?.productCode;

      // 2. Perform the update on ncr_reports
      await update(ref(db, 'ncr_reports/' + id), data);

      // 3. SYNC to ReturnRecord (Operations Hub)
      // We need to find the linked return record(s) and update them.
      // We match by ncrNumber and productCode of the old record.
      if (oldNcrNo && oldProductCode) {
        const linkedReturns = items.filter(i =>
          i.ncrNumber === oldNcrNo &&
          i.productCode === oldProductCode
        );

        if (linkedReturns.length > 0) {
          const fullNCR = { ...oldNCR, ...data } as NCRRecord;
          const newItemData = (fullNCR.item || fullNCR) as unknown as Partial<ReturnRecord>;

          // Prepare synchronized data for ReturnRecord
          const syncData: Partial<ReturnRecord> = {
            date: fullNCR.date,
            dateRequested: fullNCR.date,
            productName: newItemData.productName,
            productCode: newItemData.productCode,
            quantity: newItemData.quantity,
            unit: newItemData.unit,
            customerName: newItemData.customerName,
            destinationCustomer: newItemData.destinationCustomer,
            branch: newItemData.branch,
            founder: fullNCR.founder,
            amount: newItemData.priceBill || 0,
            priceBill: newItemData.priceBill || 0,
            pricePerUnit: newItemData.pricePerUnit || 0,
            neoRefNo: newItemData.neoRefNo || '-',
            ncrNumber: fullNCR.ncrNo, // Sync NCR Number change

            // Problem Flags
            problemDamaged: fullNCR.problemDamaged,
            problemDamagedInBox: fullNCR.problemDamagedInBox,
            problemLost: fullNCR.problemLost,
            problemMixed: fullNCR.problemMixed,
            problemWrongInv: fullNCR.problemWrongInv,
            problemLate: fullNCR.problemLate,
            problemDuplicate: fullNCR.problemDuplicate,
            problemWrong: fullNCR.problemWrong,
            problemIncomplete: fullNCR.problemIncomplete,
            problemOver: fullNCR.problemOver,
            problemWrongInfo: fullNCR.problemWrongInfo,
            problemShortExpiry: fullNCR.problemShortExpiry,
            problemTransportDamage: fullNCR.problemTransportDamage,
            problemAccident: fullNCR.problemAccident,
            problemPOExpired: fullNCR.problemPOExpired,
            problemNoBarcode: fullNCR.problemNoBarcode,
            problemNotOrdered: fullNCR.problemNotOrdered,
            problemOther: fullNCR.problemOther,
            problemOtherText: fullNCR.problemOtherText,
            problemDetail: fullNCR.problemDetail,

            // Root Cause & Cost
            rootCause: newItemData.problemSource,
            problemSource: newItemData.problemSource,
            hasCost: newItemData.hasCost,
            costAmount: newItemData.costAmount,
            costResponsible: newItemData.costResponsible,

            // Header Info
            toDept: fullNCR.toDept,
            copyTo: fullNCR.copyTo,
            poNo: fullNCR.poNo,
          };

          // Update all matching return records
          for (const ret of linkedReturns) {
            await update(ref(db, 'return_records/' + ret.id), syncData);
          }
          console.log(`✅ Synced NCR ${fullNCR.ncrNo} update to ${linkedReturns.length} Return Records`);
        }
      }

      return true;
    } catch (error: unknown) {
      if ((error as { code: string }).code === 'PERMISSION_DENIED') {
        console.warn("⚠️ Update Permission Denied.");
        alert("Access Denied: Cannot update NCR report.");
      } else {
        console.error("Error updating NCR report:", error);
        alert("Failed to update NCR report.");
      }
      return false;
    }
  };

  const deleteNCRReport = async (id: string): Promise<boolean> => {
    try {
      // 1. Get the current record before "deleting" (canceling)
      const oldNCR = ncrReports.find(r => r.id === id);

      // 2. Perform soft delete (Cancel)
      await update(ref(db, 'ncr_reports/' + id), { status: 'Canceled' });

      // 3. SYNC to ReturnRecord - Also cancel the linked items in Hub
      if (oldNCR && oldNCR.ncrNo) {
        const oldItemData = oldNCR.item || (oldNCR as unknown as Record<string, unknown>);
        const linkedReturns = items.filter(i =>
          i.ncrNumber === oldNCR.ncrNo &&
          i.productCode === oldItemData.productCode
        );

        for (const ret of linkedReturns) {
          // You might want to update status to 'Canceled' or some specific status
          // Operations Hub filters out 'Canceled' anyway in some views
          await update(ref(db, 'return_records/' + ret.id), { status: 'Canceled' });
        }
        if (linkedReturns.length > 0) {
          console.log(`🚫 Canceled ${linkedReturns.length} linked Return Records in Hub`);
        }
      }

      return true;
    } catch (error: unknown) {
      if ((error as { code: string }).code === 'PERMISSION_DENIED') {
        console.warn("⚠️ Cancel Permission Denied.");
        alert("Access Denied: Cannot cancel NCR report.");
      } else {
        console.error("Error canceling NCR report:", error);
        alert("Failed to cancel NCR report.");
      }
      return false;
    }
  };

  const getNextNCRNumber = async (): Promise<string> => {
    const counterRef = ref(db, 'counters/ncr_counter');
    const currentYear = new Date().getFullYear();

    try {
      const { committed, snapshot } = await runTransaction(counterRef, (currentData) => {
        if (currentData === null) {
          return { year: currentYear, lastNumber: 1 };
        }
        if (currentData.year === currentYear) {
          currentData.lastNumber++;
        } else {
          currentData.year = currentYear;
          currentData.lastNumber = 1;
        }
        return currentData;
      });

      if (committed) {
        const data = snapshot.val();
        const paddedNumber = String(data.lastNumber).padStart(4, '0');
        return `NCR-${data.year}-${paddedNumber}`;
      } else {
        throw new Error("Failed to get next NCR number, transaction aborted.");
      }
    } catch (error) {
      console.error("Error getting next NCR number:", error);
      return `NCR-${currentYear}-ERR${Math.floor(Math.random() * 100)}`;
    }
  };

  const rollbackNCRNumber = async (): Promise<void> => {
    const counterRef = ref(db, 'counters/ncr_counter');
    try {
      await runTransaction(counterRef, (currentData) => {
        if (currentData && currentData.lastNumber > 0) {
          currentData.lastNumber--;
        }
        return currentData;
      });
      console.log('✅ NCR counter rolled back successfully.');
    } catch (error) {
      console.error('❌ Failed to rollback NCR counter:', error);
    }
  };

  const getNextReturnNumber = async (): Promise<string> => {
    const counterRef = ref(db, 'counters/return_counter');
    const currentYear = new Date().getFullYear();

    try {
      const { committed, snapshot } = await runTransaction(counterRef, (currentData) => {
        if (currentData === null) {
          return { year: currentYear, lastNumber: 1 };
        }
        if (currentData.year === currentYear) {
          currentData.lastNumber++;
        } else {
          currentData.year = currentYear;
          currentData.lastNumber = 1;
        }
        return currentData;
      });

      if (committed) {
        const data = snapshot.val();
        const paddedNumber = String(data.lastNumber).padStart(4, '0'); // 4 digits to match user request (0001)
        return `RT-${data.year}-${paddedNumber}`;
      } else {
        throw new Error("Failed to get next Return number, transaction aborted.");
      }
    } catch (error) {
      console.error("Error getting next Return number:", error);
      return `RT-${currentYear}-ERR${Math.floor(Math.random() * 100)}`;
    }
  };

  const rollbackCollectionNumber = async (): Promise<void> => {
    const counterRef = ref(db, 'counters/collection_counter');
    try {
      await runTransaction(counterRef, (currentData) => {
        if (currentData && currentData.lastNumber > 0) {
          currentData.lastNumber--;
        }
        return currentData;
      });
      console.log('✅ Collection counter rolled back successfully.');
    } catch (error) {
      console.error('❌ Failed to rollback Collection counter:', error);
    }
  };

  const getNextCollectionNumber = async (): Promise<string> => {
    const counterRef = ref(db, 'counters/collection_counter');
    const currentYear = new Date().getFullYear();

    try {
      const { committed, snapshot } = await runTransaction(counterRef, (currentData) => {
        const currentMonth = new Date().getMonth() + 1;
        if (currentData === null) {
          return { year: currentYear, month: currentMonth, lastNumber: 1 };
        }
        // Reset if Year OR Month changes
        if (currentData.year === currentYear && currentData.month === currentMonth) {
          currentData.lastNumber++;
        } else {
          currentData.year = currentYear;
          currentData.month = currentMonth;
          currentData.lastNumber = 1;
        }
        return currentData;
      });

      if (committed) {
        const data = snapshot.val();
        const monthStr = String(data.month).padStart(2, '0');
        const paddedNumber = String(data.lastNumber).padStart(4, '0');
        return `COL-${data.year}${monthStr}-${paddedNumber}`;
      } else {
        throw new Error("Failed to get next Collection number, transaction aborted.");
      }
    } catch (error) {
      console.error("Error getting next Collection number:", error);
      return `COL-${currentYear}-ERR${Math.floor(Math.random() * 100)}`;
    }
  };

  const runDataIntegrityCheck = async (): Promise<number> => {
    console.log("🔄 Starting Data Integrity Check...");
    // Force a fresh read of the latest state effectively by using the current 'items' and 'ncrReports' from closure
    // However, in a closure, 'items' might be stale if not careful. 
    // Since 'items' is in the dependency array of DataProvider (re-render), the function recreated has latest scope?
    // Actually, DataProvider component function runs on every render.

    // Better logic: Filter current items
    const orphans = items.filter(item => {
      // Logic: Identify items that claim to be NCRs but have no valid active parent
      if (!item.ncrNumber && !item.id.startsWith('NCR')) return false;

      // Normalize ID to check
      let ncrNoToCheck = item.ncrNumber;
      if (!ncrNoToCheck && item.id.startsWith('NCR')) {
        // Sometimes ID is the NCR No itself or composite
        // If ID is "NCR-2025-0001-1", parent is "NCR-2025-0001" ? 
        // Usually ID is just copied from NCR No for the first item?
        // Let's assume strict matching: ID or ncrNumber must match an existing NCR Report's No or ID
        ncrNoToCheck = item.id;
      }

      if (!ncrNoToCheck) return false;
      ncrNoToCheck = ncrNoToCheck.trim();

      // Find parent NCR
      // We check both ncrNo field and id field of NCR reports for robust matching
      // Also handle potential composite IDs in ReturnRecord if they were created with suffix?
      // Assuming 1:1 map or direct ncrNo reference for now based on previous code.
      const linkedNCR = ncrReports.find(n => n.ncrNo === ncrNoToCheck || n.id === ncrNoToCheck);

      // It is an orphan if:
      // 1. No linked NCR found (Deleted parent)
      // 2. Linked NCR status is 'Canceled' (Soft deleted parent)
      return !linkedNCR || linkedNCR.status === 'Canceled';
    });

    if (orphans.length === 0) {
      console.log("✅ System Integrity Verified: No orphans found.");
      return 0;
    }

    console.warn(`⚠️ Found ${orphans.length} orphaned records. Cleaning up...`, orphans);

    let deletedCount = 0;
    for (const orphan of orphans) {
      try {
        await remove(ref(db, `return_records/${orphan.id}`));
        deletedCount++;
      } catch (e) {
        console.error(`❌ Failed to delete orphan ${orphan.id}`, e);
      }
    }

    console.log(`🧹 Cleanup Complete. Removed ${deletedCount} records.`);
    return deletedCount;
  };

  const repairMissingReturnRecords = async (): Promise<number> => {
    console.log("🔧 Starting NCR → ReturnRecord Repair...");

    const existingNcrNumbers = new Set(items.map(i => i.ncrNumber).filter(Boolean));
    const activeNCRs = ncrReports.filter(n =>
      n.status !== 'Canceled' &&
      n.ncrNo &&
      !existingNcrNumbers.has(n.ncrNo)
    );

    // For each missing NCR, gather ALL items under that ncrNo
    const groupedByNcrNo: Record<string, NCRRecord[]> = {};
    activeNCRs.forEach(n => {
      const key = n.ncrNo!;
      if (!groupedByNcrNo[key]) groupedByNcrNo[key] = [];
      groupedByNcrNo[key].push(n);
    });

    if (Object.keys(groupedByNcrNo).length === 0) {
      console.log("✅ No missing ReturnRecords found.");
      return 0;
    }

    console.log(`🔧 Found ${activeNCRs.length} NCR items across ${Object.keys(groupedByNcrNo).length} NCR numbers needing repair.`);

    let repairedCount = 0;
    for (const [ncrNo, ncrItems] of Object.entries(groupedByNcrNo)) {
      for (const ncr of ncrItems) {
        const ncrAny = ncr as unknown as Record<string, unknown>;
        const itemData = (ncr.item ? (ncr.item as unknown as Record<string, unknown>) : ncrAny);
        const isSettled = !!ncrAny.isFieldSettled;
        const isRecordOnly = !!ncr.isRecordOnly;

        const rtId = `RT-${new Date().getFullYear()}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const returnRecord: ReturnRecord = {
          id: rtId,
          refNo: (itemData.refNo as string) || (ncrAny.poNo as string) || '-',
          date: ncr.date || new Date().toISOString().split('T')[0],
          dateRequested: ncr.date || new Date().toISOString().split('T')[0],
          productName: (itemData.productName as string) || 'Unknown',
          productCode: (itemData.productCode as string) || 'N/A',
          quantity: (itemData.quantity as number) || 1,
          unit: (itemData.unit as string) || 'Unit',
          customerName: (itemData.customerName as string) || 'Unknown',
          destinationCustomer: (itemData.destinationCustomer as string) || '',
          branch: (itemData.branch as string) || 'Head Office',
          category: 'General',
          ncrNumber: ncrNo,
          documentType: 'NCR',
          founder: ncr.founder || '',
          status: isSettled ? 'Settled_OnField' : (isRecordOnly ? 'Completed' : 'Requested'),
          isRecordOnly: isRecordOnly,
          disposition: isRecordOnly ? 'InternalUse' : 'Pending',
          condition: isRecordOnly ? 'New' : 'Unknown',
          isFieldSettled: isSettled,
          preliminaryRoute: (ncrAny.preliminaryRoute as string) || 'Other',
          reason: `NCR: ${ncr.problemDetail || '-'}`,
          amount: (itemData.priceBill as number) || 0,
          priceBill: (itemData.priceBill as number) || 0,
          pricePerUnit: (itemData.pricePerUnit as number) || 0,
          priceSell: (itemData.priceSell as number) || 0,
          neoRefNo: (itemData.neoRefNo as string) || '-',
          problemSource: ((ncrAny.problemSource as string) || 'Customer') as ReturnRecord['problemSource'],
          problemAnalysis: ((ncrAny.problemAnalysis as string) || 'Customer') as ReturnRecord['problemAnalysis'],
          problemDetail: ncr.problemDetail || '',
          hasCost: !!ncrAny.hasCost,
          costAmount: (ncrAny.costAmount as number) || 0,
          costResponsible: (ncrAny.costResponsible as string) || '',
          rootCause: (ncrAny.problemSource as string) || 'NCR',
          problemDamaged: ncr.problemDamaged,
          problemIncomplete: ncr.problemIncomplete,
          problemOver: ncr.problemOver,
          problemMixed: ncr.problemMixed,
          problemWrong: ncr.problemWrong,
          problemWrongInv: ncr.problemWrongInv,
          problemWrongInfo: ncr.problemWrongInfo,
          problemLate: ncr.problemLate,
          problemDuplicate: ncr.problemDuplicate,
          problemShortExpiry: ncr.problemShortExpiry,
          problemTransportDamage: ncr.problemTransportDamage,
          problemDamagedInBox: ncr.problemDamagedInBox,
          problemLost: ncr.problemLost,
          problemAccident: ncr.problemAccident,
          problemPOExpired: ncr.problemPOExpired,
          problemNoBarcode: ncr.problemNoBarcode,
          problemNotOrdered: ncr.problemNotOrdered,
          problemOther: ncr.problemOther,
          problemOtherText: ncr.problemOtherText,
        };

        try {
          await set(ref(db, 'return_records/' + rtId), returnRecord);
          repairedCount++;
          console.log(`  ✅ Repaired: ${ncrNo} → ${rtId}`);
        } catch (e) {
          console.error(`  ❌ Failed to repair ${ncrNo}:`, e);
        }
      }
    }

    console.log(`🔧 Repair Complete: ${repairedCount} ReturnRecords created.`);
    return repairedCount;
  };

  const updateSystemConfig = async (config: Partial<SystemConfig>): Promise<boolean> => {
    try {
      await update(ref(db, 'system_config'), config);
      return true;
    } catch (error) {
      console.error("Error updating system config:", error);
      return false;
    }
  };

  return (
    <DataContext.Provider value={{
      items, ncrReports, loading, dataRangeDays, setDataRangeDays, systemConfig, addReturnRecord, updateReturnRecord, deleteReturnRecord,
      addNCRReport, updateNCRReport, deleteNCRReport, getNextNCRNumber, rollbackNCRNumber, getNextReturnNumber, getNextCollectionNumber, rollbackCollectionNumber,
      runDataIntegrityCheck, repairMissingReturnRecords, updateSystemConfig
    }}>
      {children}
    </DataContext.Provider>
  );
};
