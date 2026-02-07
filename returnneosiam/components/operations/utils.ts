
import { DispositionAction, ReturnRecord } from '../../types';

export const ThaiBahtText = (amount: number): string => {
    if (isNaN(amount) || amount === 0) return 'ศูนย์บาทถ้วน';
    const units = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
    const positions = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];

    // ใช้ Math.abs เพื่อจัดการเครื่องหมาย
    const absAmount = Math.abs(amount);
    const integerPart = Math.floor(absAmount).toString();
    const decimalPart = Math.round((absAmount * 100) % 100).toString().padStart(2, '0');

    let result = "";

    const convertGroup = (group: string) => {
        let groupResult = "";
        for (let i = 0; i < group.length; i++) {
            let digit = parseInt(group.charAt(i));
            let pos = group.length - i - 1;

            if (digit !== 0) {
                if (pos === 1 && digit === 2) groupResult += "ยี่";
                else if (pos === 1 && digit === 1) { /* Skip "หนึ่ง" ที่ตำแหน่งสิบ */ }
                else if (pos === 0 && digit === 1 && group.length > 1) groupResult += "เอ็ด";
                else groupResult += units[digit];

                groupResult += positions[pos];
            }
        }
        return groupResult;
    };

    // การแปลงส่วนจำนวนเต็ม
    if (parseInt(integerPart) > 0) {
        let currentNumber = parseInt(integerPart);
        let tempResult = "";
        let millionGroup = 0;

        while (currentNumber > 0) {
            const group = (currentNumber % 1000000).toString();
            const groupText = convertGroup(group);

            if (groupText) {
                tempResult = groupText + (millionGroup > 0 ? "ล้าน" : "") + tempResult;
            }
            currentNumber = Math.floor(currentNumber / 1000000);
            millionGroup++;
        }
        result = tempResult;
    } else {
        result = "ศูนย์";
    }

    result += "บาท";

    const decimalNum = parseInt(decimalPart);
    if (decimalNum === 0) {
        result += "ถ้วน";
    } else {
        let decimalResult = "";
        let tenth = parseInt(decimalPart.charAt(0));
        let unit = parseInt(decimalPart.charAt(1));

        if (tenth > 0) {
            if (tenth === 2) decimalResult += "ยี่";
            else if (tenth === 1) { /* Skip "หนึ่ง" ที่ตำแหน่งสิบ */ }
            else decimalResult += units[tenth];
            decimalResult += "สิบ";
        }

        if (unit > 0) {
            if (unit === 1 && tenth !== 1) decimalResult += "เอ็ด";
            else if (unit > 1) decimalResult += units[unit];
        }

        result += decimalResult + "สตางค์";
    }

    return (amount < 0 ? "ลบ" : "") + result;
};

export const getISODetails = (type: DispositionAction) => {
    switch (type) {
        case 'RTV': return { code: 'FM-LOG-05', rev: '00', th: 'ใบส่งคืนสินค้า', en: 'GOODS RETURN NOTE' };
        case 'Restock': return { code: 'FM-SAL-02', rev: '00', th: 'แบบขออนุมัติจำหน่ายสินค้าสภาพดี', en: 'SALES DISPOSAL APPROVAL FORM' };
        case 'Claim': return { code: 'FM-CLM-01', rev: '00', th: 'ใบนำส่งสินค้าเคลมประกัน', en: 'INSURANCE CLAIM DELIVERY NOTE' };
        case 'InternalUse': return { code: 'FM-ADM-09', rev: '00', th: 'ใบเบิกสินค้าใช้ภายใน', en: 'INTERNAL REQUISITION FORM' };
        case 'Recycle': return { code: 'FM-AST-04', rev: '00', th: 'แบบขออนุมัติตัดจำหน่าย/ทำลายทรัพย์สิน', en: 'ASSET WRITE-OFF / SCRAP AUTHORIZATION FORM' };
        default: return { code: 'FM-GEN-00', rev: '00', th: 'เอกสารจัดการสินค้าคืน', en: 'RETURN MANAGEMENT DOCUMENT' };
    }
};

export const conditionLabels: Record<string, string> = {
    'New': 'สภาพดี (Good)',
    'BoxDamage': 'กล่องบุบ (Box Dmg)',
    'WetBox': 'ลังเปียก (Wet Box)',
    'LabelDefect': 'ฉลากลอก (Label)',
    'Expired': 'หมดอายุ (Expired)',
    'Damaged': 'ชำรุด/ซาก (Damaged)',
    'Defective': 'เสีย (Defective)'
};

export const dispositionLabels: Record<string, string> = {
    'RTV': 'ส่งคืน (Return)',
    'Restock': 'ขาย (Sell)',
    'Recycle': 'ทิ้ง (Scrap)',
    'InternalUse': 'ใช้ภายใน (Internal)',
    'Claim': 'เคลมประกัน (Claim)'
};

export const RESPONSIBLE_MAPPING: Record<string, string> = {
    'สินค้าเปียกบนรถ': 'เคลมคนรถ',
    'สินค้าเปียกจากคลัง': 'เคลม สาขา',
    'สินค้าเสียหายจากการโหลดปลายทาง': 'เคลมแรงงานปลายทาง',
    'สินค้าเสียหายจากจัดเรียงไม่ดี': 'เคลมแรงงานต้นทาง',
    'สินค้าสูญหายบนรถ': 'เคลมคนรถ',
    'สินค้าสูญหายที่คลัง': 'เคลม สาขา',
    'สินค้าสลับรุ่นจากต้นทาง': 'เคลม เช็คเกอร์ ต้นทาง',
    'สินค้าสลับรุ่นจากปลายทาง': 'เคลม เช็คเกอร์ ปลายทาง',
    'สินค้าเสียหายจากการขนส่ง': 'เคลมคนรถ',
    'สินค้าเสียหายจากสัตว์กัด': 'เคลม สาขา',
    'สินค้าเสียหายจากมูลนก': 'เคลม สาขา',
    'สินค้าเสียหายจากแมลง': 'เคลม สาขา'
};

export const calculateTotal = (items: ReturnRecord[], hasVat: boolean, vatRate: number = 7, discountRate: number = 0) => {
    const subtotal = items.reduce((acc, item) => acc + (item.priceBill || 0), 0);
    const discount = subtotal * (discountRate / 100);
    const afterDiscount = subtotal - discount;
    const vat = hasVat ? afterDiscount * (vatRate / 100) : 0;
    const net = afterDiscount + vat;
    return { subtotal, discount, afterDiscount, vat, net };
};

export const isNCRItem = (item: Partial<ReturnRecord>): boolean => {
    return item.documentType === 'NCR' ||
        !!item.ncrNumber ||
        (item.id !== undefined && item.id.startsWith('NCR-')) || false;
};

export const isCollectionItem = (item: Partial<ReturnRecord>): boolean => {
    return item.documentType === 'LOGISTICS' ||
        (!isNCRItem(item) && (
            (item.refNo !== undefined && item.refNo.startsWith('COL-')) ||
            (item.refNo !== undefined && item.refNo.startsWith('R-'))
        )) || false;
};

export const validateReturnRecord = (item: Partial<ReturnRecord>): string[] => {
    const errors: string[] = [];
    if (!item.productName) errors.push('ชื่อสินค้า (Product Name) ว่างเปล่า');
    if (!item.quantity || item.quantity <= 0) errors.push('จำนวน (Quantity) ไม่ถูกต้อง');
    if (!item.branch) errors.push('สาขา (Branch) ว่างเปล่า');
    return errors;
};

// Unified Status Transition Logic
export const VALID_TRANSITIONS: Record<string, string[]> = {
    // NCR Flow
    'Requested': ['NCR_InTransit', 'PickupScheduled', 'JobAccepted', 'COL_JobAccepted'], // Shared start?
    'NCR_InTransit': ['NCR_HubReceived', 'DirectReturn'],
    'NCR_HubReceived': ['NCR_QCCompleted'],
    'NCR_QCCompleted': ['NCR_Documented'],
    'NCR_Documented': ['Completed'],

    // Collection Flow
    'COL_JobAccepted': ['COL_BranchReceived'],
    'COL_BranchReceived': ['COL_Consolidated'],
    'COL_Consolidated': ['COL_InTransit', 'DirectReturn'],
    'COL_InTransit': ['COL_HubReceived'],
    'COL_HubReceived': ['COL_Documented'],
    'COL_Documented': ['Completed'],

    // Direct Returns
    'DirectReturn': ['Completed'],
    'ReturnToSupplier': ['Completed'],

    // Legacy / Fallback
    'JobAccepted': ['BranchReceived'],
    'BranchReceived': ['ReadyForLogistics'],
    'ReadyForLogistics': ['InTransitToHub', 'ReturnToSupplier'],
    'InTransitToHub': ['HubReceived'],
    'HubReceived': ['DocsCompleted'],
    'DocsCompleted': ['Completed']
};

export const canTransition = (current: string, next: string): boolean => {
    const allowed = VALID_TRANSITIONS[current];
    return allowed ? allowed.includes(next) : false; // verification mode
};
