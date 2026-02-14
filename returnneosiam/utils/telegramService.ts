
import { ReturnRecord, NCRRecord } from '../types';

/**
 * Telegram Bot Service
 * Handles sending notifications to Telegram groups/chats
 */

// NOTE: In a production environment, these should be handled via a secure backend or Firebase Functions.
// For this implementation, we use direct fetch calls as per the project's strategy to keep it serverless/free-tier.

export interface TelegramConfig {
    botToken: string;
    chatId: string;
    enabled: boolean;
}

export const sendTelegramMessage = async (token: string, chatId: string, message: string) => {
    if (!token || !chatId) return false;

    try {
        const url = `https://api.telegram.org/bot${token}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML',
            }),
        });

        return response.ok;
    } catch (error) {
        console.error('Error sending Telegram message:', error);
        return false;
    }
};

/**
 * Formats a notification message for a new Return Request
 */
export const formatReturnRequestMessage = (record: ReturnRecord) => {
    return `
📦 <b>มีรายการขอคืนสินค้าใหม่ (Step 1)</b>
----------------------------------
<b>เลขที่เอกสาร:</b> ${record.documentNo || record.refNo || '-'}
<b>สาขา:</b> ${record.branch}
<b>ลูกค้า:</b> ${record.customerName}
<b>สินค้า:</b> ${record.productName}
<b>จำนวน:</b> ${record.quantity} ${record.unit}
<b>ผู้แจ้ง:</b> ${record.founder || '-'}
<b>สาเหตุ:</b> ${record.reason || '-'}
----------------------------------
📅 <i>${new Date().toLocaleString('th-TH')}</i>
  `.trim();
};

/**
 * Formats a notification message for a new NCR
 */
export const formatNCRMessage = (record: NCRRecord) => {
    const item = record.item;
    return `
⚠️ <b>มีแจ้งปัญหา NCR ใหม่! [NCR]</b>
----------------------------------
<b>เลขที่ NCR:</b> ${record.ncrNo}
<b>สินค้า:</b> ${item.productName}
<b>จำนวน:</b> ${item.quantity} ${item.unit}
<b>สาขา:</b> ${item.branch}
<b>ลูกค้า:</b> ${item.customerName}
<b>ผู้พบปัญหา:</b> ${record.founder}
<b>รายละเอียด:</b> ${record.problemDetail || '-'}
----------------------------------
📅 <i>${new Date().toLocaleString('th-TH')}</i>
  `.trim();
};

/**
 * Formats damage summary section for Telegram messages
 */
export const formatDamageSummary = (record: ReturnRecord): string => {
    const lines: string[] = [];

    const productValue = record.pricePerUnit && record.quantity
        ? (record.pricePerUnit * record.quantity).toLocaleString('th-TH')
        : null;
    const billValue = record.priceBill ? record.priceBill.toLocaleString('th-TH') : null;

    lines.push(`\n📊 <b>สรุปความเสียหาย</b>`);
    lines.push(`<b>สินค้า :</b> ${record.productName || '-'}`);
    lines.push(`<b>จำนวน :</b> ${record.quantity} ${record.unit}`);
    if (record.pricePerUnit) lines.push(`<b>ราคา/หน่วย :</b> ${record.pricePerUnit.toLocaleString('th-TH')} บาท`);
    if (productValue) lines.push(`<b>มูลค่ารวม :</b> ${productValue} บาท`);
    if (billValue) lines.push(`<b>ราคาหน้าบิล :</b> ${billValue} บาท`);

    if (record.condition && record.condition !== 'Unknown') {
        const condMap: Record<string, string> = {
            'New': 'ใหม่', 'Good': 'ดี', 'Fair': 'พอใช้', 'Bad': 'เสียหาย',
            'Damaged': 'ชำรุด', 'Expired': 'หมดอายุ', 'Defective': 'มีตำหนิ'
        };
        lines.push(`<b>สภาพสินค้า :</b> ${condMap[record.condition] || record.condition}`);
    }
    if (record.disposition && record.disposition !== 'Pending') {
        const dispMap: Record<string, string> = {
            'Restock': 'คืนสต๊อก', 'RTV': 'ส่งคืนผู้ขาย (RTV)',
            'Recycle': 'ทำลาย/รีไซเคิล', 'Claim': 'เคลม',
            'InternalUse': 'ใช้ภายใน', 'Sell': 'ขาย'
        };
        lines.push(`<b>การจัดการ :</b> ${dispMap[record.disposition] || record.disposition}`);
    }
    if (record.dispositionRoute) lines.push(`<b>เส้นทาง :</b> ${record.dispositionRoute}`);

    const actions: string[] = [];
    if (record.actionReject) actions.push(`ส่งคืน ${record.actionRejectQty || ''} ${record.unit}`);
    if (record.actionRejectSort) actions.push(`คัดแยกส่งคืน ${record.actionRejectSortQty || ''} ${record.unit}`);
    if (record.actionRework) actions.push(`แก้ไข ${record.actionReworkQty || ''} ${record.unit}${record.actionReworkMethod ? ` (${record.actionReworkMethod})` : ''}`);
    if (record.actionSpecialAcceptance) actions.push(`ยอมรับกรณีพิเศษ ${record.actionSpecialAcceptanceQty || ''} ${record.unit}${record.actionSpecialAcceptanceReason ? ` (${record.actionSpecialAcceptanceReason})` : ''}`);
    if (record.actionScrap) actions.push(`ทำลาย ${record.actionScrapQty || ''} ${record.unit}`);
    if (record.actionReplace) actions.push(`เปลี่ยนใหม่ ${record.actionReplaceQty || ''} ${record.unit}`);
    if (actions.length > 0) lines.push(`<b>การดำเนินการ :</b> ${actions.join(', ')}`);

    const causes: string[] = [];
    if (record.causePackaging) causes.push('บรรจุภัณฑ์');
    if (record.causeTransport) causes.push('ขนส่ง');
    if (record.causeOperation) causes.push('ปฏิบัติการ');
    if (record.causeEnv) causes.push('สภาพแวดล้อม');
    if (causes.length > 0) lines.push(`<b>สาเหตุหลัก :</b> ${causes.join(', ')}`);
    if (record.causeDetail) lines.push(`<b>รายละเอียดสาเหตุ :</b> ${record.causeDetail}`);
    if (record.preventionDetail) lines.push(`<b>การป้องกัน :</b> ${record.preventionDetail}`);

    if (record.hasCost && record.costAmount) {
        lines.push(`<b>💰 ค่าเสียหาย :</b> ${record.costAmount.toLocaleString('th-TH')} บาท (${record.costResponsible || '-'})`);
    }
    if (record.isFieldSettled && record.fieldSettlementAmount) {
        lines.push(`<b>💰 ชดเชยหน้างาน :</b> ${record.fieldSettlementAmount.toLocaleString('th-TH')} บาท`);
    }

    return lines.join('\n');
};

/**
 * Formats a notification message for status updates (Trans-shipment, Hub Receive, Closure)
 */
export const formatStatusUpdateMessage = (label: string, record: ReturnRecord, count?: number, transportInfo?: Partial<ReturnRecord> & { destination?: string, received?: boolean, closed?: boolean, plateNumber?: string, driverName?: string }) => {
    const isNCR = record.documentType === 'NCR' || !!record.ncrNumber;


    // Format customer string
    const customerInfo = `${record.customerName || '-'} / ${record.destinationCustomer || '-'}`;

    // Process/Problem Info
    const problemProcess = [
        record.problemDamaged && 'ชำรุด', record.problemDamagedInBox && 'ชำรุดในกล่อง', record.problemLost && 'สูญหาย',
        record.problemMixed && 'สินค้าสลับ', record.problemWrongInv && 'สินค้าไม่ตรง INV', record.problemLate && 'ส่งช้า',
        record.problemDuplicate && 'ส่งซ้ำ', record.problemWrong && 'ส่งผิด', record.problemIncomplete && 'ส่งของไม่ครบ',
        record.problemOver && 'ส่งของเกิน', record.problemWrongInfo && 'ข้อมูลผิด', record.problemShortExpiry && 'สินค้าอายุสั้น',
        record.problemTransportDamage && 'สินค้าเสียหายบนรถ', record.problemAccident && 'อุบัติเหตุ', record.problemPOExpired && 'PO. หมดอายุ',
        record.problemNoBarcode && 'บาร์โค๊ตไม่ขึ้น', record.problemNotOrdered && 'ไม่ได้สั่งสินค้า', record.problemOther && `อื่นๆ (${record.problemOtherText})`
    ].filter(Boolean).join(', ') || '-';

    const costInfo = record.hasCost
        ? `ใช่ (${record.costAmount} บาท, ผู้รับผิดชอบ: ${record.costResponsible})`
        : 'ไม่ระบุ';

    const fieldSettlementInfo = record.isFieldSettled
        ? `จบงานหน้างาน (ชดเชย: ${record.fieldSettlementAmount} บ. โดย: ${record.fieldSettlementName} [${record.fieldSettlementPosition}])`
        : 'ไม่มี';

    // Logistics specific part
    let logisticsContext = '';
    if (transportInfo) {
        if (transportInfo.plateNumber || transportInfo.transportPlate) {
            const plate = transportInfo.transportPlate || transportInfo.plateNumber || '-';
            const driver = transportInfo.transportDriver || transportInfo.driverName || '-';
            logisticsContext = `📍 ต้นทาง: ${record.branch}\n🏁 ปลายทาง: ${transportInfo.destination || '-'}\n🚛 ทะเบียน: ${plate}\n👤 คนขับ: ${driver}\n`;
        } else if (transportInfo.received) {
            logisticsContext = `📍 ต้นทาง: ${record.branch}\n📝 สถานะ: รับเข้าคลังเรียบร้อย\n`;
        } else if (transportInfo.closed) {
            logisticsContext = `📍 สาขา: ${record.branch}\n📦 รายการ: ${record.productName}\n🔢 จำนวน: ${record.quantity} ${record.unit}\n📄 เลขที่: ${record.documentNo || record.refNo || '-'}\n`;
        }
    }

    return `
<b>${label} [${isNCR ? (record.ncrNumber || 'NCR') : (record.documentNo || 'COL')}]</b>
${logisticsContext}----------------------------------
<b>เพิ่มเติม ${isNCR ? 'NCR' : 'COL'} :</b> ${isNCR ? (record.ncrNumber || '-') : (record.documentNo || '-')}
<b>วันที่ :</b> ${record.date || record.dateRequested || '-'}
<b>สาขา :</b> ${record.branch || '-'}
<b>ผู้พบปัญหา (Founder) :</b> ${record.founder || '-'}
<b>ลูกค้า / ลูกค้าปลายทาง :</b> ${customerInfo}
<b>Neo Ref No. :</b> ${record.neoRefNo || '-'}
<b>เลขที่บิล / Ref No. :</b> ${record.refNo || '-'}
<b>เลขที่เอกสาร (เลข R) :</b> ${isNCR ? '-' : (record.documentNo || '-')}
<b>รายละเอียดของปัญหา :</b> ${record.problemDetail || record.reason || '-'}
<b>จำนวนสินค้า :</b> ${record.quantity} ${record.unit} ${count && count > 1 ? `(รวม ${count} รายการ)` : ''}
<b>วิเคราะห์ปัญหาเกิดจาก :</b> ${record.problemSource || '-'}
<b>พบปัญหาที่กระบวนการ :</b> ${problemProcess}
<b>การติดตามค่าใช้จ่าย :</b> ${costInfo}
<b>Field Settlement :</b> ${fieldSettlementInfo}
${formatDamageSummary(record)}
----------------------------------
📅 <i>Updated: ${new Date().toLocaleString('th-TH')}</i>
  `.trim();
};
