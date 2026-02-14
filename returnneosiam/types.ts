
export type UserRole =
  | 'ADMIN'           // ผู้ดูแลระบบ - Full Access
  | 'NCR_OPERATOR'    // พนักงาน NCR - บันทึกข้อมูล NCR
  | 'COL_OPERATOR'    // พนักงาน Collection - บันทึกข้อมูล COL
  | 'REQUEST_ENTRY'   // พนักงานคีย์ใบสั่งงาน - สร้าง COL Request เท่านั้น
  | 'QC_OPERATOR'     // พนักงาน QC - ตรวจสอบคุณภาพและออกเอกสาร
  | 'CLOSURE_OPERATOR' // พนักงานปิดงาน - ปิดงานให้เสร็จสมบูรณ์
  | 'VIEWER';         // ผู้ดูข้อมูล - Read-Only

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoURL?: string;
}

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
  pricePerUnit?: number;
  priceBill: number;
  priceSell?: number;
  expiryDate: string;
  hasCost: boolean;
  costAmount?: number;
  costResponsible: string;
  problemSource: string;
  preliminaryDecision?: string | null;
  preliminaryRoute?: string;
  isFieldSettled?: boolean;
  fieldSettlementAmount?: number;
  fieldSettlementEvidence?: string;
  fieldSettlementName?: string;
  fieldSettlementPosition?: string;
  isRecordOnly?: boolean; // New: For performance/process logging only (e.g. late delivery)

  // New: Matching ReturnRecord/NCRRecord flags for per-item tracking
  problemDamaged?: boolean;
  problemDamagedInBox?: boolean;
  problemLost?: boolean;
  problemMixed?: boolean;
  problemWrongInv?: boolean;
  problemLate?: boolean;
  problemDuplicate?: boolean;
  problemWrong?: boolean;
  problemIncomplete?: boolean;
  problemOver?: boolean;
  problemWrongInfo?: boolean;
  problemShortExpiry?: boolean;
  problemTransportDamage?: boolean;

  // Added for compatibility with legacy data
  founder?: string;
  problemAnalysisDetail?: string;
  problemAccident?: boolean;
  problemPOExpired?: boolean;
  problemNoBarcode?: boolean;
  problemNotOrdered?: boolean;
  problemOther?: boolean;
  problemOtherText?: string;
  problemDetail?: string;

  actionReject?: boolean;
  actionRejectQty?: number;
  actionRejectSort?: boolean;
  actionRejectSortQty?: number;
  actionRework?: boolean;
  actionReworkQty?: number;
  actionReworkMethod?: string;
  actionSpecialAcceptance?: boolean;
  actionSpecialAcceptanceQty?: number;
  actionSpecialAcceptanceReason?: string;
  actionScrap?: boolean;
  actionScrapQty?: number;
  actionReplace?: boolean;
  actionReplaceQty?: number;

  // Root Cause Specifics
  causePackaging?: boolean;
  causeTransport?: boolean;
  causeOperation?: boolean;
  causeEnv?: boolean;
  causeDetail?: string;
  preventionDetail?: string;
  preventionDueDate?: string;
  lotNo?: string;
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
  problemDamagedInBox: boolean;
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
  problemPOExpired: boolean;
  problemNoBarcode: boolean;
  problemNotOrdered: boolean;
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
  actionSpecialAcceptance: boolean;
  actionSpecialAcceptanceQty: number;
  actionSpecialAcceptanceReason: string;
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
  isRecordOnly?: boolean;

  status: 'Open' | 'Closed' | 'Canceled' | 'Settled_OnField'; // Add 'Canceled' for soft delete, 'Settled_OnField' for bypass
  images?: string[];
}

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

export interface TransportInfo {
  driverName?: string;
  plateNumber?: string;
  transportCompany?: string;
  destination?: string;
}

export enum AppView {
  HOME = 'HOME',
  DASHBOARD = 'DASHBOARD',
  OPERATIONS = 'OPERATIONS',
  NCR = 'NCR',
  NCR_REPORT = 'NCR_REPORT',
  INVENTORY = 'INVENTORY',
  COLLECTION = 'COLLECTION',
  COL_REPORT = 'COL_REPORT',
  OKR = 'OKR',
  SETTINGS = 'SETTINGS'
}

export type CollectionStatus = 'PENDING' | 'ASSIGNED' | 'COLLECTED' | 'CONSOLIDATED' | 'FAILED';

// --- REFRACTORED PER USER REQUEST (STEP 271) ---

// 1. Commercial Document (RMA)
export interface ReturnRequest {
  id: string; // e.g., "RMA-001" - matches documentNo (R No.) ideally

  // User Requested Fields
  branch: string; // Dropdown
  invoiceNo: string;
  controlDate: string; // วันที่ใบคุมรถ
  documentNo: string; // เลขที่เอกสาร (เลข R)
  customerName: string;
  customerCode: string; // รหัสลูกค้า
  customerAddress: string;
  province: string;
  tmNo: string; // เลขที่ใบคุม (TM NO)
  notes?: string; // หมายเหตุ

  // Essential Logistics Info (retained/adapted)
  contactPerson: string;
  contactPhone: string;
  itemsSummary: string; // e.g., "Mouse x10, Keyboard x5" - kept as it's useful context

  status: 'APPROVED_FOR_PICKUP' | 'PICKUP_SCHEDULED' | 'RECEIVED_AT_HQ';
}

// 2. Logistics Document (Collection Order)
export interface CollectionOrder {
  id: string; // e.g., "COL-202512-001"
  driverId: string;

  // Linkage: Reference to RMAs
  linkedRmaIds: string[];

  // Driver Attributes
  pickupLocation: {
    name: string;
    address: string;
    lat?: number;
    lng?: number;
    contactName: string;
    contactPhone: string;
  };
  pickupDate: string;

  // Logistics Manifest
  packageSummary: {
    totalBoxes: number;
    description: string;
  };

  status: CollectionStatus;
  vehiclePlate?: string;
  failureReason?: string;

  // Proof
  proofOfCollection?: {
    signatureUrl?: string;
    photoUrls?: string[];
    timestamp?: string;
  };

  createdDate: string;
}

// 3. Consolidation Document
export interface ShipmentManifest {
  id: string; // "SHP-2025-99"
  collectionOrderIds: string[];
  transportMethod: 'INTERNAL_FLEET' | '3PL_COURIER';
  carrierName: string;
  trackingNumber: string;
  status: 'IN_TRANSIT' | 'ARRIVED_HQ';
  createdDate: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

// Updated Status Flow for 6-Step Workflow
export type ReturnStatus =
  | 'Draft'             // Step 1: Created
  | 'Requested'         // Step 1: Output

  // NCR Flow (New Unified)
  | 'NCR_InTransit'      // NCR Step 2 Output (was PickupScheduled)
  | 'NCR_HubReceived'    // NCR Step 3 Output (was ReceivedAtHub)
  | 'NCR_QCCompleted'    // NCR Step 4 Output (was QCCompleted)
  | 'NCR_Documented'     // NCR Step 5 Output (was Documented)

  // Collection Flow (New Unified)
  | 'COL_JobAccepted'    // Col Step 2 Output (was JobAccepted)
  | 'COL_BranchReceived' // Col Step 3 Output (was BranchReceived)
  | 'COL_Consolidated'   // Col Step 4 Output (was ReadyForLogistics)
  | 'COL_InTransit'      // Col Step 5 Output (was InTransitToHub)
  | 'COL_HubReceived'    // Col Step 6 Output (was HubReceived)
  | 'COL_Documented'     // Col Step 7 Output (was DocsCompleted)

  // Common Final States
  | 'Settled_OnField'   // จบงานหน้างาน (Driver paid, no return)
  | 'Completed'         // Step 8: Closed
  | 'ReturnToSupplier'
  | 'DirectReturn'

  // Legacy / Mapped
  | 'JobAccepted'
  | 'BranchReceived'
  | 'ReadyForLogistics'
  | 'InTransitToHub'
  | 'HubReceived'
  | 'DocsCompleted'
  | 'PickupScheduled'
  | 'PickedUp'
  | 'InTransitHub'
  | 'ReceivedAtHub'
  | 'QCPassed'
  | 'QCFailed'
  | 'QCCompleted'
  | 'Documented'
  | 'Received'
  | 'Graded'
  | 'Approved'
  | 'Rejected'
  | 'Pending';


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
export type BranchName = 'พิษณุโลก' | 'กำแพงเพชร' | 'แม่สอด' | 'เชียงใหม่' | 'EKP ลำปาง' | 'นครสวรรค์' | 'สาย 3' | 'คลอง 13' | 'ซีโน่' | 'ประดู่';

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
  images?: string[]; // Array of image URLs or Base64 strings
  parentId?: string; // ID of the parent item if this was split

  // New: Preliminary Decision (Step 1)
  preliminaryDecision?: 'Return' | 'Sell' | 'Scrap' | 'Internal' | 'Claim' | null;
  preliminaryRoute?: string; // e.g., "สาย 3", "Sino", "NEO", "อื่นๆ"

  // NEW: Fields for detailed tracking
  neoRefNo?: string; // เลขที่เอกสาร Neo Siam
  founder?: string; // ผู้พบปัญหา (New validation)
  destinationCustomer?: string; // สถานที่ส่ง (ลูกค้าปลายทาง)

  // NCR Specific Header Fields
  toDept?: string; // ถึงหน่วยงาน
  copyTo?: string; // สำเนา
  poNo?: string;   // เลขที่ใบสั่งซื้อ/ผลิต
  ncrNumber?: string; // เลขที่ NCR
  documentType?: 'NCR' | 'LOGISTICS'; // แยกประเภทเอกสาร


  // Cost Tracking
  hasCost?: boolean;
  costAmount?: number;
  costResponsible?: string;
  problemSource?: string; // Source of problem for automated responsibility mapping

  // Problem Analysis
  problemAnalysis?: 'Customer' | 'DestinationCustomer' | 'Accounting' | 'Keying' | 'Warehouse' | 'Transport' | 'Other';
  problemAnalysisSub?: string;
  problemAnalysisCause?: string;
  problemAnalysisDetail?: string;

  // Status Timestamps (Timeline)
  dateRequested?: string;   // 1. แจ้งคืนสินค้า (Request)
  dateJobAccepted?: string; // 2. รับงาน (Job Accept)
  dateBranchReceived?: string; // 3. รับเข้าสาขา (Branch Receive)
  dateConsolidated?: string; // 4. รวมสินค้า (Consolidation)
  dateInTransit?: string;   // 5. ขนส่ง (Logistics)
  dateHubReceived?: string;    // 6. ถึง Hub (Hub Receive)
  dateReceived?: string;    // (Legacy/Generic Receive)
  dateGraded?: string;      // 7. ตรวจสอบคุณภาพ (QC)
  dateDocumented?: string;  // 8. ออกเอกสาร (Warehouse/Docs)
  dateCompleted?: string;   // 9. ปิดงาน (Done)

  // New Intake Fields (NCR Specific)
  quantity: number; // จำนวน
  unit: string; // หน่วย
  pricePerUnit?: number; // ราคา/หน่วย
  priceBill?: number; // ราคาหน้าบิลรวม
  priceSell?: number; // ราคาขาย
  discountPercent?: number; // ส่วนลด (%)
  expiryDate?: string; // วันหมดอายุ (mm/dd/yyyy)

  status: ReturnStatus;
  reason: string;
  condition?: ItemCondition;
  disposition?: DispositionAction;
  notes?: string;

  // Problem Analysis (Source)
  // problemSource is already defined above as string


  // Problem Process (Checkboxes)
  problemDamaged?: boolean; // ชำรุด
  problemDamagedInBox?: boolean; // ชำรุดในกล่อง
  problemLost?: boolean; // สูญหาย
  problemMixed?: boolean; // สินค้าสลับ
  problemWrongInv?: boolean; // สินค้าไม่ตรง INV
  problemLate?: boolean; // ส่งช้า
  problemDuplicate?: boolean; // ส่งซ้ำ
  problemWrong?: boolean; // ส่งผิด
  problemIncomplete?: boolean; // ส่งของไม่ครบ
  problemOver?: boolean; // ส่งของเกิน
  problemWrongInfo?: boolean; // ข้อมูลผิด
  problemShortExpiry?: boolean; // สินค้าอายุสั้น
  problemTransportDamage?: boolean; // สินค้าเสียหายบนรถขนส่ง
  problemAccident?: boolean; // อุบัติเหตุ
  problemPOExpired?: boolean; // PO. หมดอายุ
  problemNoBarcode?: boolean; // บาร์โค๊ตไม่ขึ้น
  problemNotOrdered?: boolean; // ไม่ได้สั่งสินค้า
  problemOther?: boolean; // อื่นๆ
  problemOtherText?: string;

  problemDetail?: string; // รายละเอียดเพิ่มเติม

  // Actions
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
  actionReplace?: boolean;        // เปลี่ยนสินค้าใหม่
  actionReplaceQty?: number;

  // Root Cause
  causePackaging?: boolean;
  causeTransport?: boolean;
  causeOperation?: boolean;
  causeEnv?: boolean;
  causeDetail?: string;
  preventionDetail?: string;
  preventionDueDate?: string;
  responsiblePerson?: string;
  responsiblePosition?: string;
  dueDate?: string;
  approver?: string;
  approverPosition?: string;
  approverDate?: string;

  // Logistics
  collectionOrderId?: string; // Links to CollectionOrder

  // User requested fields for Step 1 Form
  invoiceNo?: string;       // เลข Invoice
  tmNo?: string;            // เลขที่ใบคุม (TM NO)
  controlDate?: string;     // วันที่ใบคุมรถ
  customerCode?: string;    // รหัสลูกค้า
  province?: string;        // จังหวัด
  customerAddress?: string; // ที่อยู่
  documentNo?: string;      // เลขที่เอกสาร (เลข R)
  contactPhone?: string;    // เบอร์โทรศัพท์ (ติดต่อ)
  sellerName?: string;      // ชื่อผู้ขาย (ร้านค้า/ตัวแทน)

  // Transport Info (Step 2 NCR)
  transportPlate?: string;
  transportDriver?: string;
  transportCompany?: string;

  // Re-applying to ensure update
  rootCause?: string;
  dispositionRoute?: string;

  // Field Settlement (Bypass Logistics)
  isFieldSettled?: boolean;
  fieldSettlementAmount?: number;
  fieldSettlementEvidence?: string; // URL/Base64
  fieldSettlementName?: string;
  fieldSettlementPosition?: string;
  isRecordOnly?: boolean;
}

export interface SearchFilters {
  startDate: string;
  endDate: string;
  status: ReturnStatus | 'All';
  category: string;
  query: string;
}

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
}

export interface NASConfig {
  apiUrl: string;       // e.g. https://neosiam.dscloud.biz/api/upload.php
  apiKey: string;       // API Key for authentication
  enabled: boolean;
}

export interface SystemConfig {
  telegram?: TelegramConfig;
  nas?: NASConfig;
}
