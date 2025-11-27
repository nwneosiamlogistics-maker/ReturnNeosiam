
export interface ProcessStep {
  id: number;
  title: string;
  description: string;
  role: string;
  duties: string;
  branches?: string[]; // For step 2 (regions) and step 6 (routes)
  isBranchParent?: boolean;
}

export interface ReturnStat {
  name: string;
  value: number;
  color: string;
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  SEARCH = 'SEARCH',
  OPERATIONS = 'OPERATIONS',
  NCR = 'NCR',
  NCR_REPORT = 'NCR_REPORT'
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

// Updated Status Flow: Requested -> Received -> Graded -> Documented -> Completed
export type ReturnStatus = 'Pending' | 'Requested' | 'Received' | 'Approved' | 'Graded' | 'Documented' | 'Completed' | 'Rejected';

// Operational Types
// Expanded to include specific imperfections under 'Good' category
export type ItemCondition = 
  | 'New' 
  | 'OpenBox' 
  | 'Damaged' 
  | 'Defective' 
  | 'Expired'     // หมดอายุ
  | 'Unknown' 
  | 'BoxDamage'   // มีตำหนิ/บุบ
  | 'WetBox'      // ลังเปียก
  | 'LabelDefect' // ฉลากลอก
  | string;       // Custom/Other

export type DispositionAction = 'Restock' | 'RTV' | 'InternalUse' | 'Recycle' | 'Claim' | 'Pending';
export type BranchName = 'พิษณุโลก' | 'กำแพงเพชร' | 'แม่สอด' | 'เชียงใหม่' | 'EKP ลำปาง' | 'นครสวรรค์';

export interface ReturnRecord {
  id: string; // Used as Return ID or Barcode
  refNo: string; // เลขที่อ้างอิง
  branch: BranchName | string; // สาขาต้นทาง
  customerName: string; // Or Dealer Name
  productCode: string; // รหัสสินค้า
  productName: string; // รายการสินค้า
  category: string;
  date: string; // ISO Date string YYYY-MM-DD (General/Initial Date)
  amount: number; // Qty * Price (Total Value)
  
  // Status Timestamps (Timeline)
  dateRequested?: string;   // 1. แจ้งคืนสินค้า
  dateReceived?: string;    // 2. รับสินค้าเข้า
  dateGraded?: string;      // 3. ตรวจสอบคุณภาพ
  dateDocumented?: string;  // 4. ออกเอกสาร
  dateCompleted?: string;   // 5. ปิดงาน

  // New Intake Fields
  quantity: number; // จำนวน
  unit: string; // หน่วย
  priceBill: number; // ราคาหน้าบิล
  priceSell: number; // ราคาขาย
  expiryDate?: string; // วันหมดอายุ
  
  status: ReturnStatus;
  reason: string;
  // Extended fields for Operations
  condition?: ItemCondition;
  disposition?: DispositionAction;
  notes?: string; // หมายเหตุ

  // Problem Details (Intake)
  problemType?: string; // พบปัญหาที่กระบวนการ
  rootCause?: string;   // สาเหตุเกิดจาก
  ncrNumber?: string;   // เลขที่ NCR

  // Initial Actions (Intake) - การดำเนินการ
  actionReject?: boolean;         // ส่งคืน (Reject)
  actionRejectQty?: number;
  actionRejectSort?: boolean;     // คัดแยกของเสียเพื่อส่งคืน
  actionRejectSortQty?: number;
  
  actionRework?: boolean;         // แก้ไข (Rework)
  actionReworkQty?: number;
  actionReworkMethod?: string;    // วิธีการแก้ไข
  
  actionSpecialAcceptance?: boolean;      // ยอมรับกรณีพิเศษ
  actionSpecialAcceptanceQty?: number;
  actionSpecialAcceptanceReason?: string; // เหตุผลในการยอมรับ
  
  actionScrap?: boolean;          // ทำลาย (Scrap)
  actionScrapQty?: number;
  actionScrapReplace?: boolean;   // เปลี่ยนสินค้าใหม่
  actionScrapReplaceQty?: number;

  // Disposition Details
  dispositionRoute?: string; // For RTV: สาย 3, Sino, Neo
  sellerName?: string;       // For Sell/Restock
  contactPhone?: string;     // For Sell/Restock
  internalUseDetail?: string; // For InternalUse: Department/Person
  
  // Claim Details
  claimCompany?: string;      // ชื่อบริษัทประกัน
  claimCoordinator?: string;  // ผู้ประสานงาน
  claimPhone?: string;        // เบอร์โทรศัพท์ (เคลม)
}

export interface SearchFilters {
  startDate: string;
  endDate: string;
  status: ReturnStatus | 'All';
  category: string;
  query: string;
}
