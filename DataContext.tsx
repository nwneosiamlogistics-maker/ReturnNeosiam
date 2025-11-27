import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from './firebase';
import { ref, onValue, set, update, remove, runTransaction } from 'firebase/database';
import { ReturnRecord } from './types';

// Interface for NCR Item (the product list inside an NCR)
export interface NCRItem {
  id: string;
  branch: string;
  refNo: string;
  neoRefNo: string;
  productCode: string;
  productName: string;
  customerName: string;
  destinationCustomer: string;
  quantity: number;
  unit: string;
  priceBill: number;
  expiryDate: string;
  hasCost: boolean;
  costAmount?: number;
  costResponsible: string;
  problemSource: string;
}

// EXPANDED Interface for the main NCR Record
// This now includes all fields from the NCRSystem form state
export interface NCRRecord {
  id: string; // Composite key: ncrNo-itemId
  ncrNo: string;

  // Header fields
  toDept: string;
  date: string;
  copyTo: string;
  founder: string;
  poNo: string;

  // Item details (denormalized for reporting)
  item: NCRItem;

  // Problem details
  problemDamaged: boolean;
  problemLost: boolean;
  problemMixed: boolean;
  problemWrongInv: boolean;
  problemLate: boolean;
  problemDuplicate: boolean;
  problemWrong: boolean;
  problemIncomplete: boolean;
  problemOver: boolean;
  problemWrongInfo: boolean;
  problemShortExpiry: boolean;
  problemTransportDamage: boolean;
  problemAccident: boolean;
  problemOther: boolean;
  problemOtherText: string;
  problemDetail: string;

  // Action details
  actionReject: boolean;
  actionRejectQty: number;
  actionRejectSort: boolean;
  actionRejectSortQty: number;
  actionRework: boolean;
  actionReworkQty: number;
  actionReworkMethod: string;
  actionSpecialAccept: boolean;
  actionSpecialAcceptQty: number;
  actionSpecialAcceptReason: string;
  actionScrap: boolean;
  actionScrapQty: number;
  actionReplace: boolean;
  actionReplaceQty: number;
  dueDate: string;
  approver: string;
  approverPosition: string;
  approverDate: string;

  // Cause & Prevention
  causePackaging: boolean;
  causeTransport: boolean;
  causeOperation: boolean;
  causeEnv: boolean;
  causeDetail: string;
  preventionDetail: string;
  preventionDueDate: string;
  responsiblePerson: string;
  responsiblePosition: string;
  
  // Closing
  qaAccept: boolean;
  qaReject: boolean;
  qaReason: string;

  status: 'Open' | 'Closed'; // Simplified status for report
}


interface DataContextType {
  items: ReturnRecord[];
  ncrReports: NCRRecord[];
  loading: boolean;
  addReturnRecord: (item: ReturnRecord) => Promise<boolean>;
  updateReturnRecord: (id: string, data: Partial<ReturnRecord>) => Promise<boolean>;
  addNCRReport: (item: NCRRecord) => Promise<boolean>;
  updateNCRReport: (id: string, data: Partial<NCRRecord>) => Promise<boolean>;
  deleteNCRReport: (id: string) => Promise<boolean>;
  getNextNCRNumber: () => Promise<string>;
}

const DataContext = createContext<DataContextType>({
  items: [],
  ncrReports: [],
  loading: true,
  addReturnRecord: async () => false,
  updateReturnRecord: async () => false,
  addNCRReport: async () => false,
  updateNCRReport: async () => false,
  deleteNCRReport: async () => false,
  getNextNCRNumber: async () => 'NCR-ERROR-0000',
});

export const useData = () => useContext(DataContext);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<ReturnRecord[]>([]);
  const [ncrReports, setNcrReports] = useState<NCRRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("🔄 Connecting to Realtime Database...");

    // Subscribe to Return Records
    const returnRef = ref(db, 'return_records');
    const unsubReturn = onValue(returnRef, (snapshot) => {
      const data = snapshot.val();
      const loadedItems = data ? Object.values(data) as ReturnRecord[] : [];
      setItems(loadedItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setLoading(false);
      console.log(`✅ RTDB Connected: Loaded ${loadedItems.length} Return Records`);
    }, (error) => {
      console.warn("⚠️ RTDB Permission/Connection Error (Returns):", error.message);
      setLoading(false);
    });

    // Subscribe to NCR Reports
    const ncrRef = ref(db, 'ncr_reports');
    const unsubNCR = onValue(ncrRef, (snapshot) => {
      const data = snapshot.val();
      const loadedReports = data ? Object.values(data) as NCRRecord[] : [];
      setNcrReports(loadedReports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      console.log(`✅ RTDB Connected: Loaded ${loadedReports.length} NCR Reports`);
    }, (error) => {
      console.warn("⚠️ RTDB Permission/Connection Error (NCR):", error.message);
    });

    return () => {
      unsubReturn();
      unsubNCR();
    };
  }, []);

  const addReturnRecord = async (item: ReturnRecord): Promise<boolean> => {
    try {
      await set(ref(db, 'return_records/' + item.id), item);
      return true;
    } catch (error: any) {
      if (error.code === 'PERMISSION_DENIED') {
          console.warn("⚠️ Write Permission Denied: Cannot save return record.");
          alert("Access Denied: Check Firebase Realtime Database Rules.");
      } else {
          console.error("Error adding return record:", error);
          alert("Failed to save record.");
      }
      return false;
    }
  };

  const updateReturnRecord = async (id: string, data: Partial<ReturnRecord>): Promise<boolean> => {
    try {
      await update(ref(db, 'return_records/' + id), data);
      return true;
    } catch (error: any) {
      if (error.code === 'PERMISSION_DENIED') {
          console.warn("⚠️ Update Permission Denied.");
          alert("Access Denied: Cannot update record.");
      } else {
          console.error("Error updating return record:", error);
          alert("Failed to update record.");
      }
      return false;
    }
  };

  const addNCRReport = async (item: NCRRecord): Promise<boolean> => {
    try {
      await set(ref(db, 'ncr_reports/' + item.id), item);
      return true;
    } catch (error: any) {
      if (error.code === 'PERMISSION_DENIED') {
          console.warn("⚠️ Write Permission Denied: Cannot save NCR report.");
          alert("Access Denied: Check Firebase Realtime Database Rules.");
      } else {
          console.error("Error adding NCR report:", error);
          alert("Failed to save NCR report.");
      }
      return false;
    }
  };

  const updateNCRReport = async (id: string, data: Partial<NCRRecord>): Promise<boolean> => {
    try {
      await update(ref(db, 'ncr_reports/' + id), data);
      return true;
    } catch (error: any) {
      if (error.code === 'PERMISSION_DENIED') {
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
      await remove(ref(db, 'ncr_reports/' + id));
      return true;
    } catch (error: any) {
      if (error.code === 'PERMISSION_DENIED') {
        console.warn("⚠️ Delete Permission Denied.");
        alert("Access Denied: Cannot delete NCR report.");
      } else {
        console.error("Error deleting NCR report:", error);
        alert("Failed to delete NCR report.");
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
                // If counter doesn't exist, create it.
                return { year: currentYear, lastNumber: 1 };
            }

            if (currentData.year === currentYear) {
                // Same year, increment number.
                currentData.lastNumber++;
            } else {
                // New year, reset number.
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
            // Transaction aborted, throw error
            throw new Error("Failed to get next NCR number, transaction aborted.");
        }
    } catch (error) {
        console.error("Error getting next NCR number:", error);
        // Fallback to a less reliable method if transaction fails, to avoid blocking user.
        return `NCR-${currentYear}-ERR${Math.floor(Math.random() * 100)}`;
    }
};

  return (
    <DataContext.Provider value={{ items, ncrReports, loading, addReturnRecord, updateReturnRecord, addNCRReport, updateNCRReport, deleteNCRReport, getNextNCRNumber }}>
      {children}
    </DataContext.Provider>
  );
};
