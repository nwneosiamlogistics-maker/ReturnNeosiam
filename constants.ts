
import { ProcessStep, ReturnRecord, BranchName } from './types';
import { NCRRecord } from './DataContext';

export const RETURN_PROCESS_STEPS: ProcessStep[] = [
  {
    id: 1,
    title: "ตรวจสอบสินค้าเข้า (Incoming Inspection)",
    description: "ตรวจสอบความถูกต้องของสินค้า จำนวน สภาพ และความสอดคล้องกับเอกสารก่อนนำเข้าสู่กระบวนการคัดแยก",
    role: "เจ้าหน้าที่ตรวจสอบสินค้า",
    duties: "ตรวจสอบสินค้า บันทึกข้อมูล รับรองความถูกต้อง"
  },
  {
    id: 2,
    title: "คัดแยกสินค้าเบื้องต้น (Initial Sorting)",
    description: "คัดแยกสินค้าเบื้องต้นจากพื้นที่ที่รับผิดชอบ",
    role: "เจ้าหน้าที่กระจายสินค้า / เจ้าหน้าที่คลัง",
    duties: "แยกสินค้า จัดเรียงตามพื้นที่ จัดลำดับความเร่งด่วน",
    isBranchParent: true,
    branches: ["พิษณุโลก", "กำแพงเพชร", "แม่สอด", "เชียงใหม่", "EKP ลำปาง"]
  },
  {
    id: 3,
    title: "จัดทำเอกสารการคืน (Documentation)",
    description: "จัดเตรียมเอกสารประกอบการคืน เช่น ใบส่งคืน รายการสินค้า ข้อมูลปลายทาง",
    role: "เช็คเกอร์ / เจ้าหน้าที่เอกสาร",
    duties: "ออกแบบฟอร์มเอกสาร ตรวจสอบข้อมูลคู่เอกสาร"
  },
  {
    id: 4,
    title: "คัดแยกสินค้าในโกดัง (Warehouse Sorting)",
    description: "คัดแยกสินค้าอย่างละเอียด พร้อมตรวจสอบเอกสารให้ตรงกันเพื่อเตรียมเข้าสู่ขั้นตอนแจ้งผล",
    role: "เจ้าหน้าที่โกดังคัดแยก",
    duties: "ตรวจสอบเอกสารคู่สินค้า จัดระเบียบสินค้า ตามเส้นทางคืน"
  },
  {
    id: 5,
    title: "แจ้งผลการคัดแยก (Notification)",
    description: "รายงานผลการตรวจสอบและคัดแยก พร้อมสรุปจำนวนสินค้าและเส้นทางที่จะส่งคืน",
    role: "เจ้าหน้าที่ประสานงาน",
    duties: "สรุปผล ตรวจสอบความถูกต้อง แจ้งข้อมูลแก่แผนกขนส่ง"
  },
  {
    id: 6,
    title: "แยกสินค้าตามสาย (Route Separation)",
    description: "แยกสินค้าโดยอ้างอิงเส้นทางที่รับผิดชอบ พร้อมจัดชุดเอกสารครบถ้วน",
    role: "ทีมจัดการสินค้าตามสาย",
    duties: "ตรวจสอบจำนวนสินค้า สอบทานเอกสาร จัดเตรียมก่อนส่งมอบ",
    isBranchParent: true,
    branches: ["สาย 3", "ชิโน", "นีโอคอปอเรท"]
  },
  {
    id: 7,
    title: "ปฏิบัติการ: สาย 3",
    description: "รับสินค้าและเอกสารชุดที่เตรียมไว้ พร้อมเตรียมส่งไปยังปลายทางที่กำหนด",
    role: "เจ้าหน้าที่สาย 3",
    duties: "รับของ ตรวจสอบรายการ โหลดสินค้า"
  },
  {
    id: 8,
    title: "ปฏิบัติการ: ชิโน",
    description: "ดูแลการนำส่งสินค้าจุดปลายทางตามเส้นทางชิโน พร้อมตรวจความถูกต้องก่อนออกเดินทาง",
    role: "เจ้าหน้าที่สายชิโน",
    duties: "ตรวจเอกสาร ออกเดินทางตามแผน"
  },
  {
    id: 9,
    title: "ปฏิบัติการ: นีโอคอปอเรท",
    description: "นำส่งสินค้าตามพื้นที่ในเส้นทางนีโอคอปอเรท โดยยึดตามเอกสารชุดคืนสินค้า",
    role: "เจ้าหน้าที่สายนีโอคอปอเรท",
    duties: "ตรวจสอบสินค้า บันทึกความเคลื่อนไหวสินค้า"
  }
];

export const CATEGORIES = ['Food & Beverage', 'Household', 'Personal Care', 'Pet Food', 'Stationery'];

export const BRANCH_LIST: BranchName[] = ['พิษณุโลก', 'กำแพงเพชร', 'แม่สอด', 'เชียงใหม่', 'EKP ลำปาง', 'นครสวรรค์'];

export const RETURN_ROUTES = ['สาย 3', 'Sino Pacific Trading', 'NEO CORPORATE'];

// Helper to generate some dates
const today = new Date();
const getDate = (offset: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() - offset);
  return d.toISOString().split('T')[0];
};

export const MOCK_RETURN_HISTORY: ReturnRecord[] = [
  // Step 1: Requested
  { 
    id: 'RT-2024-001', 
    refNo: 'INV-PHS-001', branch: 'พิษณุโลก', customerName: 'ร้านป้าสมร มินิมาร์ท', 
    productCode: 'SN-LAY-50', productName: 'เลย์ รสมันฝรั่งแท้ 50g', category: 'Food & Beverage', 
    date: getDate(0), dateRequested: getDate(0),
    quantity: 24, unit: 'ห่อ', priceBill: 20, priceSell: 25, amount: 480,
    status: 'Requested', reason: 'ถุงรั่วลมออก', condition: 'Unknown', disposition: 'Pending'
  },
  // Step 2: Received
  { 
    id: 'RT-2024-002', 
    refNo: 'INV-KPP-089', branch: 'กำแพงเพชร', customerName: 'บจก. สยามเทรดดิ้ง', 
    productCode: 'DET-BRZ-1000', productName: 'ผงซักฟอก บรีส เอกเซล 1kg', category: 'Household', 
    date: getDate(1), dateRequested: getDate(2), dateReceived: getDate(1),
    quantity: 12, unit: 'ถุง', priceBill: 120, priceSell: 159, amount: 1440,
    status: 'Received', reason: 'บรรจุภัณฑ์ขาด เสียหายจากการขนส่ง', condition: 'Unknown', disposition: 'Pending'
  },
  // Step 3: Graded -> Restock
  { 
    id: 'RT-2024-003', 
    refNo: 'INV-MS-112', branch: 'แม่สอด', customerName: 'ร้านโชห่วย เจ๊เกียว', 
    productCode: 'COF-NES-200', productName: 'เนสกาแฟ เบลนด์ 200g', category: 'Food & Beverage', 
    date: getDate(1), dateRequested: getDate(3), dateReceived: getDate(2), dateGraded: getDate(1),
    quantity: 6, unit: 'ขวด', priceBill: 150, priceSell: 199, amount: 900,
    status: 'Graded', reason: 'ลูกค้าสั่งผิดขนาด (สภาพปกติ)', condition: 'New', disposition: 'Restock', sellerName: 'สมศักดิ์ ขายดี', contactPhone: '081-111-2222'
  },
  // Step 3: Graded -> Scrap (Expired)
  { 
    id: 'RT-2024-004', 
    refNo: 'INV-CNX-555', branch: 'เชียงใหม่', customerName: 'มินิบิ๊กซี สาขา 2', 
    productCode: 'MILK-DUTCH-1L', productName: 'นมสด ดัชมิลล์ 1L', category: 'Food & Beverage', 
    date: getDate(2), dateRequested: getDate(4), dateReceived: getDate(3), dateGraded: getDate(2),
    quantity: 10, unit: 'กล่อง', priceBill: 40, priceSell: 45, amount: 400,
    status: 'Graded', reason: 'สินค้าหมดอายุ', condition: 'Expired', disposition: 'Recycle'
  },
  // Step 4: Documented -> RTV
  { 
    id: 'RT-2024-005', 
    refNo: 'INV-EKP-001', branch: 'EKP ลำปาง', customerName: 'ลำปาง ค้าส่ง', 
    productCode: 'SHP-HS-450', productName: 'แชมพู เฮดแอนด์โชวเดอร์ 450ml', category: 'Personal Care', 
    date: getDate(3), dateRequested: getDate(6), dateReceived: getDate(5), dateGraded: getDate(4), dateDocumented: getDate(3),
    quantity: 48, unit: 'ขวด', priceBill: 120, priceSell: 169, amount: 5760,
    status: 'Documented', reason: 'หัวปั๊มแตกเสียหายจากการขนส่ง', condition: 'Defective', disposition: 'RTV', dispositionRoute: 'สาย 3'
  },
  // Step 5: Completed -> Restock
  { 
    id: 'RT-2024-006', 
    refNo: 'INV-PHS-022', branch: 'พิษณุโลก', customerName: 'ร้านลุงหวัง', 
    productCode: 'DRK-COKE-325', productName: 'โค้ก สูตรไม่มีน้ำตาล 325ml', category: 'Food & Beverage', 
    date: getDate(4), dateRequested: getDate(8), dateReceived: getDate(7), dateGraded: getDate(6), dateDocumented: getDate(5), dateCompleted: getDate(4),
    quantity: 240, unit: 'กระป๋อง', priceBill: 12, priceSell: 15, amount: 2880,
    status: 'Completed', reason: 'กระป๋องบุบเล็กน้อย (ขายเหมา)', condition: 'BoxDamage', disposition: 'Restock', sellerName: 'ร้านของถูก 20 บาท', contactPhone: '081-999-8888'
  },
  // Step 5: Completed -> Restock (Wet Box)
  { 
    id: 'RT-2024-007', 
    refNo: 'INV-MS-099', branch: 'แม่สอด', customerName: 'หจก. ทรัพย์ทวี', 
    productCode: 'NDL-MAMA-PK', productName: 'มาม่า หมูสับ (แพ็ค 10)', category: 'Food & Beverage', 
    date: getDate(5), dateRequested: getDate(7), dateReceived: getDate(6), dateGraded: getDate(6), dateDocumented: getDate(5), dateCompleted: getDate(5),
    quantity: 20, unit: 'แพ็ค', priceBill: 50, priceSell: 60, amount: 1000,
    status: 'Completed', reason: 'กล่องลังเปียกฝน สินค้าภายในปกติ', condition: 'WetBox', disposition: 'Restock', sellerName: 'ตลาดนัดแม่สอด', contactPhone: '081-777-6666'
  },
  // Step 2: Received
  { 
    id: 'RT-2024-008', 
    refNo: 'INV-CNX-777', branch: 'เชียงใหม่', customerName: 'ร้านสะดวกซื้อ 24ชม.', 
    productCode: 'DISH-SUN-500', productName: 'น้ำยาล้างจาน ซันไลต์ 500ml', category: 'Household', 
    date: getDate(6), dateRequested: getDate(6), dateReceived: getDate(6),
    quantity: 6, unit: 'ถุงเติม', priceBill: 25, priceSell: 30, amount: 150,
    status: 'Received', reason: 'ถุงรั่วซึมจากการกดทับ', condition: 'Unknown', disposition: 'Pending'
  }
];

// CORRECTED MOCK DATA STRUCTURE
export const MOCK_NCR_HISTORY: NCRRecord[] = [
  {
    id: 'NCR-2024-001-item1',
    ncrNo: 'NCR-2024-001',
    date: getDate(1),
    status: 'Open',
    toDept: 'แผนกควบคุมคุณภาพ',
    copyTo: 'คลังสินค้า',
    founder: 'สมชาย ใจดี',
    poNo: 'PO-CNX-111',
    item: {
      id: 'item-1',
      branch: 'เชียงใหม่',
      productName: 'ขนมปัง ฟาร์มเฮ้าส์',
      productCode: 'BRD-FH-001',
      customerName: 'มินิบิ๊กซี สาขา 2',
      quantity: 50,
      unit: 'แถว',
      refNo: 'INV-CNX-003',
      neoRefNo: '',
      destinationCustomer: 'เซเว่น สาขาตลาดต้นพยอม',
      problemSource: 'คลังสินค้า (WH)',
      hasCost: true,
      costAmount: 500,
      costResponsible: 'คลังสินค้า',
      priceBill: 10,
      expiryDate: '2024-12-01',
    },
    problemDetail: 'สินค้าอายุสั้นกว่ากำหนด',
    problemShortExpiry: true,
    actionScrap: true,
    actionScrapQty: 50,
    // Add default values for other fields to prevent errors
    problemDamaged: false, problemLost: false, problemMixed: false, problemWrongInv: false, problemLate: false, problemDuplicate: false, problemWrong: false, problemIncomplete: false, problemOver: false, problemWrongInfo: false, problemTransportDamage: false, problemAccident: false, problemOther: false, problemOtherText: '',
    actionReject: false, actionRejectQty: 0, actionRejectSort: false, actionRejectSortQty: 0, actionRework: false, actionReworkQty: 0, actionReworkMethod: '', actionSpecialAccept: false, actionSpecialAcceptQty: 0, actionSpecialAcceptReason: '', actionReplace: false, actionReplaceQty: 0,
    dueDate: '', approver: '', approverPosition: '', approverDate: '',
    causePackaging: false, causeTransport: false, causeOperation: true, causeEnv: false, causeDetail: 'จัดเก็บผิดพลาด', preventionDetail: 'อบรมพนักงาน', preventionDueDate: '', responsiblePerson: '', responsiblePosition: '',
    qaAccept: false, qaReject: false, qaReason: ''
  },
  {
    id: 'NCR-2024-002-item1',
    ncrNo: 'NCR-2024-002',
    date: getDate(2),
    status: 'Closed',
    toDept: 'แผนกควบคุมคุณภาพ',
    copyTo: 'ขนส่ง',
    founder: 'สมศรี มีสุข',
    poNo: 'PO-PHS-222',
    item: {
      id: 'item-2',
      branch: 'พิษณุโลก',
      productName: 'น้ำดื่ม นีโอ',
      productCode: 'WTR-NEO-600',
      customerName: 'ร้านป้าแจ่ม',
      quantity: 10,
      unit: 'แพ็ค',
      refNo: 'INV-PHS-005',
      neoRefNo: '',
      destinationCustomer: '',
      problemSource: 'ระหว่างขนส่ง - พนักงานขับรถบริษัท (นายดำ, 1กข-1234)',
      hasCost: false,
      costAmount: 0,
      costResponsible: '',
      priceBill: 35,
      expiryDate: '',
    },
    problemDetail: 'ขวดบุบเสียหายจากการขนส่ง',
    problemTransportDamage: true,
    actionReject: true,
    actionRejectQty: 10,
    // Add default values for other fields
    problemDamaged: false, problemLost: false, problemMixed: false, problemWrongInv: false, problemLate: false, problemDuplicate: false, problemWrong: false, problemIncomplete: false, problemOver: false, problemWrongInfo: false, problemShortExpiry: false, problemAccident: false, problemOther: false, problemOtherText: '',
    actionScrap: false, actionScrapQty: 0, actionRejectSort: false, actionRejectSortQty: 0, actionRework: false, actionReworkQty: 0, actionReworkMethod: '', actionSpecialAccept: false, actionSpecialAcceptQty: 0, actionSpecialAcceptReason: '', actionReplace: false, actionReplaceQty: 0,
    dueDate: '', approver: 'ผู้จัดการ', approverPosition: 'MD', approverDate: getDate(1),
    causePackaging: false, causeTransport: true, causeOperation: false, causeEnv: false, causeDetail: 'พนักงานขับรถไม่ระมัดระวัง', preventionDetail: 'ตักเตือนและอบรม', preventionDueDate: '', responsiblePerson: 'ฝ่ายบุคคล', responsiblePosition: 'HR',
    qaAccept: true, qaReject: false, qaReason: ''
  }
];
