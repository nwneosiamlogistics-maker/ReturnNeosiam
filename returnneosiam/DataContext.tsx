
import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from './firebase';
import { ref, onValue, set, update, remove, runTransaction } from 'firebase/database';
import { ReturnRecord, NCRRecord, SystemConfig } from './types';
import Swal from 'sweetalert2';

// Types moved to types.ts



interface DataContextType {
  items: ReturnRecord[];
  ncrReports: NCRRecord[];
  loading: boolean;
  addReturnRecord: (item: ReturnRecord) => Promise<boolean>;
  updateReturnRecord: (id: string, data: Partial<ReturnRecord>) => Promise<boolean>;
  deleteReturnRecord: (id: string) => Promise<boolean>;
  addNCRReport: (item: NCRRecord) => Promise<boolean>;
  updateNCRReport: (id: string, data: Partial<NCRRecord>) => Promise<boolean>;
  deleteNCRReport: (id: string) => Promise<boolean>; // This will now be a "cancel" operation
  systemConfig: SystemConfig;
  updateSystemConfig: (config: Partial<SystemConfig>) => Promise<boolean>;
  getNextNCRNumber: () => Promise<string>;
  getNextReturnNumber: () => Promise<string>;
  getNextCollectionNumber: () => Promise<string>;
  runDataIntegrityCheck: () => Promise<number>;
}

const DataContext = createContext<DataContextType>({
  items: [],
  ncrReports: [],
  loading: true,
  addReturnRecord: async () => false,
  updateReturnRecord: async () => false,
  deleteReturnRecord: async () => false,
  addNCRReport: async () => false,
  updateNCRReport: async () => false,
  deleteNCRReport: async () => false,
  systemConfig: {},
  updateSystemConfig: async () => false,
  getNextNCRNumber: async () => 'NCR-ERROR-0000',
  getNextReturnNumber: async () => 'RT-ERROR-0000',
  getNextCollectionNumber: async () => 'COL-ERROR-0000',
  runDataIntegrityCheck: async () => 0,
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
      // FIX: Add robust filtering for NCR reports as well
      const loadedReports = data
        ? (Object.entries(data) as [string, Record<string, unknown>][])
          .map(([key, value]) => {
            // 1. Ensure object structure
            if (!value || typeof value !== 'object') return null;

            // 2. Ensure ID exists (use Firebase Key if internal ID is missing)
            const report = {
              ...value,
              id: (typeof value.id === 'string' && value.id) ? value.id : key
            };

            // 3. Apply Robust Defaults for other fields
            const fullReport = report as Record<string, unknown>;
            return {
              ...fullReport,
              date: (typeof fullReport.date === 'string' ? fullReport.date : undefined) || new Date().toISOString().split('T')[0],
              status: (typeof fullReport.status === 'string' ? fullReport.status : undefined) || 'Open'
            };
          })
          .filter((report): report is NCRRecord => {
            if (!report) return false; // Filter out nulls from non-object values
            const r = report as Record<string, unknown>;

            // DEBUG: Check for specific missing NCR
            if (r.ncrNo === 'NCR-2025-0163' || r.id === 'NCR-2025-0163') {
              console.log("🔍 Checking NCR-2025-0163 in DataContext filter:", r);
            }

            if (!r || typeof r !== 'object') return false;

            // Header checks - ID is MUST
            if (typeof r.id !== 'string') {
              console.warn("🛡️ Data Hardening: Filtering out invalid NCR (missing id).", report);
              return false;
            }

            // Date and Status are now defaulted above, so just check type safety
            if (typeof r.date !== 'string' || typeof r.status !== 'string') {
              // Should not happen due to defaults, but catch-all
              console.warn("🛡️ Data Hardening: NCR date/status invalid type.", report);
              return false;
            }

            // Item checks (handle both nested and potential flat structures for backward compat)
            const itemData = (r.item as Record<string, unknown>) || r;
            if (!itemData || typeof itemData !== 'object') {
              console.warn("🛡️ Data Hardening: Invalid NCR Item structure.", report);
              return false;
            }

            // Relaxed check: Log warning but allow if product name is missing/invalid type
            if (typeof itemData.productName !== 'string') {
              console.warn("⚠️ Data Warning: NCR report missing valid productName.", report);
              // Do not return false; attempt to display it anyway
            }

            return true;
          })
        : [];

      setNcrReports(loadedReports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      console.log(`✅ RTDB Connected: Loaded ${loadedReports.length} valid NCR Reports`);
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
          }
        }));
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

    const docNo = (item.documentNo || item.refNo || '').trim();
    const productKey = (item.productCode || item.productName || '').trim();

    if (docNo) {
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
      await set(ref(db, 'return_records/' + item.id), item);
      return true;
    } catch (error: unknown) {
      if ((error as { code: string }).code === 'PERMISSION_DENIED') {
        console.warn("⚠️ Write Permission Denied: Cannot save return record.");
        alert("Access Denied: Check Firebase Realtime Database Rules. Developer tip: Set rules to 'allow read, write: if true;' for testing.");
      } else {
        console.error("Error adding return record:", error);
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
      await update(ref(db, 'return_records/' + id), data);
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

  const addNCRReport = async (item: NCRRecord): Promise<boolean> => {
    // 🛡️ Guard: Critical ID check
    if (!item.id) {
      console.error("❌ CRTICAL: Attempted to add NCR without ID.", item);
      alert("System Error: NCR ID is missing. Cannot save data. Please contact support.");
      return false;
    }

    try {
      await set(ref(db, 'ncr_reports/' + item.id), item);
      return true;
    } catch (error: unknown) {
      if ((error as { code: string }).code === 'PERMISSION_DENIED') {
        console.warn("⚠️ Write Permission Denied: Cannot save NCR report.");
        alert("Access Denied: Check Firebase Realtime Database Rules. Developer tip: Set rules to 'allow read, write: if true;' for testing.");
      } else {
        console.error("Error adding NCR report:", error);
        alert(`Failed to save NCR report (ID: ${item.id}). Check console for details.`);
      }
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
      items, ncrReports, loading, systemConfig, addReturnRecord, updateReturnRecord, deleteReturnRecord,
      addNCRReport, updateNCRReport, deleteNCRReport, getNextNCRNumber, getNextReturnNumber, getNextCollectionNumber,
      runDataIntegrityCheck, updateSystemConfig
    }}>
      {children}
    </DataContext.Provider>
  );
};
