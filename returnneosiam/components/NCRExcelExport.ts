import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { NCRItem } from '../types';

// Define Interface for FormData (Partial based on usage)
export interface NCRFormData {
    toDept: string;
    date: string;
    branch: string;
    copyTo: string;
    founder: string;
    poNo: string;

    // Problem Checkboxes
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
    problemSource: string;
    problemAnalysisDetail: string;

    // Action Checkboxes & Values
    actionReject: boolean; actionRejectQty: number;
    actionRejectSort: boolean; actionRejectSortQty: number;
    actionRework: boolean; actionReworkQty: number; actionReworkMethod: string;
    actionSpecialAcceptance: boolean; actionSpecialAcceptanceQty: number; actionSpecialAcceptanceReason: string;
    actionScrap: boolean; actionScrapQty: number;
    actionReplace: boolean; actionReplaceQty: number;

    dueDate: string;
    approver: string;
    approverPosition: string;
    approverDate: string;

    // Root Cause
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

    // Images
    images?: string[];
}

export const exportNCRToExcel = async (formData: NCRFormData, ncrItems: NCRItem[], ncrNos: string) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('NCR Report', {
        pageSetup: {
            paperSize: 9, // A4
            orientation: 'portrait',
            fitToPage: true,
            margins: {
                left: 0.4, right: 0.4, top: 0.4, bottom: 0.4,
                header: 0.3, footer: 0.3
            }
        }
    });

    // --- GRID SYSTEM ---
    // Use 24 columns for flexible layout mapping (approx 3-4 width each)
    worksheet.columns = Array(24).fill({ width: 3.5 });

    // --- STYLES ---
    const borderNone: Partial<ExcelJS.Borders> = {};
    const borderAll: Partial<ExcelJS.Borders> = {
        top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
    };

    const fontBold16: Partial<ExcelJS.Font> = { name: 'TH Sarabun New', size: 16, bold: true };
    const fontBold14: Partial<ExcelJS.Font> = { name: 'TH Sarabun New', size: 14, bold: true };
    const fontNormal12: Partial<ExcelJS.Font> = { name: 'TH Sarabun New', size: 12 };
    const fontBold12: Partial<ExcelJS.Font> = { name: 'TH Sarabun New', size: 12, bold: true };
    const alignCenter: Partial<ExcelJS.Alignment> = { vertical: 'middle', horizontal: 'center' };
    const alignLeft: Partial<ExcelJS.Alignment> = { vertical: 'middle', horizontal: 'left', wrapText: true };

    const chk = (v: boolean) => v ? '☑' : '☐';

    // --- HELPER: Merge & Set ---
    const setCell = (row: number, c1: number, c2: number, val: string | number | boolean, font = fontNormal12, align: Partial<ExcelJS.Alignment> = alignLeft, border = borderNone) => {
        worksheet.mergeCells(row, c1, row, c2);
        const cell = worksheet.getCell(row, c1);
        cell.value = val;
        cell.font = font;
        cell.alignment = align;
        cell.border = border;
        return cell;
    };

    let r = 1;

    // --- HEADER ---
    // Logo Area (A1:D5)
    worksheet.mergeCells(r, 1, r + 4, 4);
    try {
        const logoUrl = '/logo.png';
        const response = await fetch(logoUrl);
        const buffer = await response.arrayBuffer();
        const logoId = workbook.addImage({ buffer, extension: 'png' });
        worksheet.addImage(logoId, {
            tl: { col: 0, row: 0 },
            br: { col: 4, row: 5 }
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    } catch {
        const c = worksheet.getCell(r, 1);
        c.value = 'NEO'; c.alignment = alignCenter; c.font = fontBold16;
    }

    // Company Text
    setCell(r, 5, 24, 'บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด', { name: 'TH Sarabun New', size: 18, bold: true }, { vertical: 'bottom', horizontal: 'left' });
    r++;
    setCell(r, 5, 24, 'NEOSIAM LOGISTICS & TRANSPORT CO., LTD.', fontBold12, { vertical: 'top', horizontal: 'left' });
    r++;
    setCell(r, 5, 24, '159/9-10 หมู่ 7 ต.บางม่วง อ.เมืองนครสวรรค์ จ.นครสวรรค์ 60000', fontNormal12, { vertical: 'top', horizontal: 'left' });
    r++;
    setCell(r, 5, 24, 'Tax ID: 0105552087673 | Tel: 056-275-841', fontNormal12, { vertical: 'top', horizontal: 'left' });
    r++;
    r++; // Space

    // Title
    setCell(r, 1, 24, 'ใบแจ้งปัญหาระบบ (NCR) / ใบแจ้งปัญหารับสินค้าคืน', { name: 'TH Sarabun New', size: 20, bold: true }, alignCenter, { bottom: { style: 'medium' }, top: { style: 'medium' } });
    r++;
    r++;

    // --- INFO BLOCK ---
    const infoBorder: Partial<ExcelJS.Borders> = { bottom: { style: 'dotted' } };

    // Row 1
    setCell(r, 1, 3, 'ถึงหน่วยงาน:', fontBold12, alignLeft);
    setCell(r, 4, 10, formData.toDept, fontNormal12, alignLeft, infoBorder);
    setCell(r, 12, 13, 'วันที่:', fontBold12, alignLeft);
    setCell(r, 14, 18, formData.date, fontNormal12, alignCenter, infoBorder);
    setCell(r, 20, 21, 'สำเนา:', fontBold12, alignLeft);
    setCell(r, 22, 24, formData.copyTo, fontNormal12, alignLeft, infoBorder);
    r += 2;

    // Row 2
    setCell(r, 1, 3, 'เลขที่ NCR:', fontBold12, alignLeft);
    setCell(r, 4, 10, ncrNos || 'N/A', fontBold12, alignLeft, infoBorder);
    setCell(r, 12, 13, 'ผู้พบปัญหา:', fontBold12, alignLeft);
    setCell(r, 14, 18, formData.founder, fontNormal12, alignLeft, infoBorder);
    setCell(r, 20, 21, 'Ref/PO:', fontBold12, alignLeft);
    setCell(r, 22, 24, formData.poNo, fontNormal12, alignLeft, infoBorder);
    r += 2;

    // --- ITEM TABLE ---
    setCell(r, 1, 24, 'รายการสินค้าที่พบปัญหา (Non-Conforming Items)', fontBold14, alignLeft);
    r++;

    // Table Header
    const head = (c1: number, c2: number, txt: string) => {
        const cell = setCell(r, c1, c2, txt, fontBold12, alignCenter, borderAll);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } };
    };
    head(1, 3, 'สาขา');
    head(4, 7, 'Ref / Neo Ref');
    head(8, 14, 'สินค้า / ลูกค้า');
    head(15, 16, 'จำนวน');
    head(17, 18, 'หน่วย');
    head(19, 21, 'ราคา/Exp');
    head(22, 24, 'วิเคราะห์');
    r++;

    // Items
    if (ncrItems.length > 0) {
        ncrItems.forEach(item => {
            const rowH = 25; // fixed height approx
            worksheet.getRow(r).height = rowH;

            // Access lotNo safely with intersection type
            const itemWithLot = item as NCRItem & { lotNo?: string };
            const lotNo = itemWithLot.lotNo ? ` Lot: ${itemWithLot.lotNo}` : '';

            setCell(r, 1, 3, item.branch || '', fontNormal12, alignLeft, borderAll);
            setCell(r, 4, 7, `${item.refNo || '-'}\n${item.neoRefNo || '-'}`, fontNormal12, alignLeft, borderAll);
            setCell(r, 8, 14, `[${item.productCode}] ${item.productName}${lotNo}\n${item.customerName || ''}`, fontNormal12, alignLeft, borderAll);
            setCell(r, 15, 16, item.quantity, fontNormal12, alignCenter, borderAll);
            setCell(r, 17, 18, item.unit, fontNormal12, alignCenter, borderAll);
            setCell(r, 19, 21, `${item.pricePerUnit}\n${item.expiryDate || '-'}`, fontNormal12, alignCenter, borderAll);
            setCell(r, 22, 24, `${item.problemSource || '-'}`, fontNormal12, alignLeft, borderAll);
            r++;
        });
    } else {
        setCell(r, 1, 24, 'ไม่มีรายการสินค้า', fontNormal12, alignCenter, borderAll);
        r++;
    }
    r++;

    // --- PROBLEM ANALYSIS & CHECKLIST ---
    // Section Header
    setCell(r, 1, 8, 'รูปภาพ (Images)', fontBold12, { vertical: 'middle', horizontal: 'center' }, borderAll);
    setCell(r, 9, 24, 'วิเคราะห์ปัญหาเกิดจาก (Problem Source)', fontBold12, { vertical: 'middle', horizontal: 'left', indent: 1 }, borderAll);
    r++;

    // Content Row
    // Left: Images (show URLs as clickable links)
    worksheet.mergeCells(r, 1, r + 5, 8);
    const imgBox = worksheet.getCell(r, 1);
    if (formData.images && formData.images.length > 0) {
        imgBox.value = formData.images.map((url, i) => `รูปที่ ${i + 1}: ${url}`).join('\n');
        imgBox.alignment = { vertical: 'top', horizontal: 'left', wrapText: true, indent: 1 };
        imgBox.font = { ...fontNormal12, color: { argb: 'FF0563C1' }, underline: true };
    } else {
        imgBox.value = '(ไม่มีรูปภาพ)';
        imgBox.alignment = alignCenter;
        imgBox.font = { ...fontNormal12, color: { argb: 'FF999999' } };
    }
    imgBox.border = borderAll;

    // Right: Problem Source Analysis
    // We map common analysis fields
    const analysisRow = (txt: string, checked: boolean) => `${chk(checked)} ${txt}`;

    setCell(r, 9, 16, analysisRow('ลูกค้า (Customer)', formData.problemSource === 'Customer'), fontNormal12, alignLeft);
    setCell(r, 17, 24, analysisRow('คีย์ข้อมูล (Keying)', formData.problemSource === 'Keying'), fontNormal12, alignLeft);
    worksheet.getCell(r, 24).border = { right: { style: 'thin' } }; // Fix border
    r++;

    setCell(r, 9, 16, analysisRow('บัญชี (Accounting)', formData.problemSource === 'Accounting'), fontNormal12, alignLeft);
    setCell(r, 17, 24, analysisRow('ปลายทาง (Destination)', formData.problemSource === 'DestinationCustomer'), fontNormal12, alignLeft);
    worksheet.getCell(r, 24).border = { right: { style: 'thin' } };
    r++;

    setCell(r, 9, 24, analysisRow('คลังสินค้า (Warehouse)', formData.problemSource === 'Warehouse'), fontNormal12, alignLeft, { right: { style: 'thin' } });
    r++;
    setCell(r, 9, 24, analysisRow('ขนส่ง (Transport)', formData.problemSource === 'Transport'), fontNormal12, alignLeft, { right: { style: 'thin' } });
    r++;
    setCell(r, 9, 24, `${analysisRow('อื่นๆ (Other)', formData.problemSource === 'Other')} : ${formData.problemAnalysisDetail || ''}`, fontNormal12, alignLeft, { right: { style: 'thin' } });
    r++;

    // Bottom border for analysis box
    worksheet.mergeCells(r, 9, r, 24);
    const bRow = worksheet.getCell(r, 9);
    bRow.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    r++;

    // --- CHECKLIST & ACTIONS ---
    // Header
    setCell(r, 1, 12, 'พบปัญหาที่กระบวนการ', fontBold12, alignCenter, borderAll);
    setCell(r, 13, 24, 'การดำเนินการ', fontBold12, alignCenter, borderAll);
    r++;

    // Helper for columns
    const chkRow = (c1Name: string, c1Val: boolean, c2Name: string, c2Val: boolean, actName: string, actVal: boolean, actQty: number | string, actDetail?: string) => {
        setCell(r, 1, 6, `${chk(c1Val)} ${c1Name}`, fontNormal12, alignLeft);
        setCell(r, 7, 12, `${chk(c2Val)} ${c2Name}`, fontNormal12, alignLeft, { right: { style: 'thin' } });

        // Right Col (Action)
        const actTxt = `${chk(actVal)} ${actName} ${actQty ? `(จำนวน: ${actQty})` : ''} ${actDetail ? `[${actDetail}]` : ''}`;
        setCell(r, 13, 24, actTxt, fontNormal12, alignLeft, { right: { style: 'thin' } });
        r++;
    };

    chkRow('ชำรุด', formData.problemDamaged, 'ชำรุดในกล่อง', formData.problemDamagedInBox, 'ส่งคืน (Reject)', formData.actionReject, formData.actionRejectQty);
    chkRow('สูญหาย', formData.problemLost, 'สินค้าสลับ', formData.problemMixed, 'คัดแยกคืน', formData.actionRejectSort, formData.actionRejectSortQty);
    chkRow('ผิด INV', formData.problemWrongInv, 'ส่งช้า', formData.problemLate, 'แก้ไข (Rework)', formData.actionRework, formData.actionReworkQty, formData.actionReworkMethod);
    chkRow('ส่งซ้ำ', formData.problemDuplicate, 'ส่งผิด', formData.problemWrong, 'ยอมรับพิเศษ', formData.actionSpecialAcceptance, formData.actionSpecialAcceptanceQty, formData.actionSpecialAcceptanceReason);
    chkRow('ส่งไม่ครบ', formData.problemIncomplete, 'ส่งเกิน', formData.problemOver, 'ทำลาย (Scrap)', formData.actionScrap, formData.actionScrapQty);
    chkRow('ข้อมูลผิด', formData.problemWrongInfo, 'อายุสั้น', formData.problemShortExpiry, 'เปลี่ยนใหม่', formData.actionReplace, formData.actionReplaceQty);
    chkRow('เสียหายบนรถ', formData.problemTransportDamage, 'อุบัติเหตุ', formData.problemAccident, '', false, '', '');

    // Other problem
    setCell(r, 1, 12, `${chk(formData.problemOther)} อื่นๆ: ${formData.problemOtherText || ''}`, fontNormal12, alignLeft, { right: { style: 'thin' }, bottom: { style: 'thin' } });

    // Due Date (Action side)
    setCell(r, 13, 24, `กำหนดเสร็จ: ${formData.dueDate || ''}`, fontNormal12, alignLeft, { right: { style: 'thin' }, bottom: { style: 'thin' } });
    r++;
    r++; // Space

    // --- ROOT CAUSE ---
    setCell(r, 1, 24, 'สาเหตุและการป้องกัน (Root Cause & Prevention)', fontBold12, alignLeft, borderAll);
    r++;
    setCell(r, 1, 4, 'สาเหตุ:', fontBold12, alignLeft, { left: { style: 'thin' }, bottom: { style: 'thin' } });
    setCell(r, 5, 24, `${chk(formData.causePackaging)} Packaging  ${chk(formData.causeTransport)} Transport  ${chk(formData.causeOperation)} Operation  ${chk(formData.causeEnv)} Environment`, fontNormal12, alignLeft, { right: { style: 'thin' }, bottom: { style: 'thin' } });
    r++;
    setCell(r, 1, 4, 'รายละเอียด:', fontBold12, alignLeft, { left: { style: 'thin' } });
    setCell(r, 5, 24, formData.causeDetail || '-', fontNormal12, alignLeft, { right: { style: 'thin' } });
    r++;
    setCell(r, 1, 4, 'ป้องกัน:', fontBold12, alignLeft, { left: { style: 'thin' }, bottom: { style: 'thin' } });
    setCell(r, 5, 24, formData.preventionDetail || '-', fontNormal12, alignLeft, { right: { style: 'thin' }, bottom: { style: 'thin' } });
    r++;
    r++;

    // --- CLOSING ---
    setCell(r, 1, 24, 'การปิด NCR (Closing)', fontBold12, alignCenter, borderAll);
    r++;
    setCell(r, 1, 24, `${chk(formData.qaAccept)} ยอมรับ (Accept)    ${chk(formData.qaReject)} ไม่ยอมรับ (Reject) : ${formData.qaReason || ''}`, fontNormal12, alignLeft, borderAll);
    r++;
    r++;

    // --- SIGNATURES ---
    const signBox = (c1: number, c2: number, label: string, name: string) => {
        setCell(r, c1, c2, '_______________________', fontNormal12, alignCenter);
        setCell(r + 1, c1, c2, `(${name || '.......................'})`, fontNormal12, alignCenter);
        setCell(r + 2, c1, c2, label, fontBold12, alignCenter);
    };

    signBox(3, 8, 'ผู้พบปัญหา', formData.founder);
    signBox(10, 15, 'ผู้รับผิดชอบ', formData.responsiblePerson);
    signBox(17, 22, 'ผู้อนุมัติ', formData.approver);
    r += 4;

    // Output
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `NCR_Form_${ncrNos}_${new Date().toISOString().split('T')[0]}.xlsx`);
};
