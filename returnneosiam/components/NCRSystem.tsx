
import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../DataContext';
import { ReturnRecord, NCRRecord, NCRItem } from '../types';
import { sendTelegramMessage } from '../utils/telegramService';
import { Save, Printer, Image as ImageIcon, AlertTriangle, Plus, Trash2, X, Loader, CheckCircle, XCircle, HelpCircle, Download, Lock, Truck, Package, Search, User } from 'lucide-react';
import Swal from 'sweetalert2';
import { BRANCH_LIST, RETURN_ROUTES } from '../constants';
import { RESPONSIBLE_MAPPING } from './operations/utils';
import { LineAutocomplete } from './LineAutocomplete';
import { exportNCRToExcel } from './NCRExcelExport';

// --- Constants ---


export default function NCRSystem() {
    const { addNCRReport, getNextNCRNumber, addReturnRecord, ncrReports, systemConfig, items } = useData();

    // --- State: Main Form Data ---
    // Note: We keep global problem/action flags in formData for backward compatibility or summary views,
    // but the PRIMARY source of truth for Operations Hub sync will be the individual items.
    const initialFormData = {
        toDept: 'แผนกควบคุมคุณภาพ', date: new Date().toISOString().split('T')[0], copyTo: '',
        founder: '', poNo: '', branch: '', // Added branch to global form if needed
        // Global Flags (Now Primary Input)
        problemDamaged: false, problemDamagedInBox: false, problemLost: false, problemMixed: false, problemWrongInv: false, problemLate: false, problemDuplicate: false, problemWrong: false, problemIncomplete: false, problemOver: false, problemWrongInfo: false, problemShortExpiry: false, problemTransportDamage: false, problemAccident: false, problemPOExpired: false, problemNoBarcode: false, problemNotOrdered: false, problemOther: false, problemOtherText: '', problemDetail: '',
        actionReject: false, actionRejectQty: 0, actionRejectSort: false, actionRejectSortQty: 0, actionRework: false, actionReworkQty: 0, actionReworkMethod: '', actionSpecialAcceptance: false, actionSpecialAcceptanceQty: 0, actionSpecialAcceptanceReason: '', actionScrap: false, actionScrapQty: 0, actionReplace: false, actionReplaceQty: 0,

        // Problem Analysis (Moved from Item Modal)
        problemAnalysis: 'Customer', problemSource: 'Customer', problemAnalysisSub: '', problemAnalysisCause: '', problemAnalysisDetail: '',
        images: [] as string[],

        // Logistics, Cost & Field Settlement (Moved from Item Modal)
        preliminaryRoute: 'Other', preliminaryRouteOther: '',
        hasCost: false, costAmount: 0, costResponsible: '',
        isFieldSettled: false, fieldSettlementAmount: 0, fieldSettlementEvidence: '', fieldSettlementName: '', fieldSettlementPosition: '',

        causePackaging: false, causeTransport: false, causeOperation: false, causeEnv: false, causeDetail: '', preventionDetail: '', preventionDueDate: '',
        dueDate: '', approver: '', approverPosition: '', approverDate: '', responsiblePerson: '', responsiblePosition: '',
        qaAccept: false, qaReject: false, qaReason: '',
        isRecordOnly: false
    };

    const [formData, setFormData] = useState(initialFormData);

    // --- State: Items & Modal ---
    const [ncrItems, setNcrItems] = useState<NCRItem[]>([]);
    const [showItemModal, setShowItemModal] = useState(false);

    // Expanded newItem state to match ReturnRecord structure perfectly
    const [newItem, setNewItem] = useState<Partial<NCRItem> & { preliminaryRouteOther?: string }>({
        branch: '', refNo: '', neoRefNo: '', productCode: '', productName: '',
        customerName: '', destinationCustomer: '', quantity: 0, unit: '',
        pricePerUnit: 0, priceBill: 0, priceSell: 0, expiryDate: '', hasCost: false,
        costAmount: 0, costResponsible: '', problemSource: '',
        preliminaryDecision: 'Return', preliminaryRoute: '',
        isFieldSettled: false, fieldSettlementAmount: 0,
        fieldSettlementEvidence: '', fieldSettlementName: '', fieldSettlementPosition: '',

        // Problem Analysis (Deep Dive)
        problemAnalysis: 'Customer', // Default
        problemAnalysisSub: '',
        problemAnalysisCause: '',
        problemAnalysisDetail: '',
        images: [], // For item-specific images

        // Problem Flags (Item Specific)
        problemDamaged: false, problemDamagedInBox: false, problemLost: false, problemMixed: false, problemWrongInv: false,
        problemLate: false, problemDuplicate: false, problemWrong: false, problemIncomplete: false, problemOver: false,
        problemWrongInfo: false, problemShortExpiry: false, problemTransportDamage: false, problemAccident: false,
        problemPOExpired: false, problemNoBarcode: false, problemNotOrdered: false, problemOther: false, problemOtherText: '',
        problemDetail: '',
        // Action Flags (Item Specific)
        actionReject: false, actionRejectQty: 0, actionRejectSort: false, actionRejectSortQty: 0,
        actionRework: false, actionReworkQty: 0, actionReworkMethod: '',
        actionSpecialAcceptance: false, actionSpecialAcceptanceQty: 0, actionSpecialAcceptanceReason: '',
        actionScrap: false, actionScrapQty: 0, actionReplace: false, actionReplaceQty: 0,
        // Cause (Item Specific - Optional, but good for completeness)
        causePackaging: false, causeTransport: false, causeOperation: false, causeEnv: false,
        causeDetail: '', preventionDetail: '', preventionDueDate: ''
    });

    // --- State: UI Control ---
    const [isSaving, setIsSaving] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showResultModal, setShowResultModal] = useState(false);
    const [saveResult, setSaveResult] = useState<{ success: boolean; message: string; ncrNo?: string } | null>(null);
    const [isPrinting, setIsPrinting] = useState(false);
    const [generatedNCRNumber, setGeneratedNCRNumber] = useState('');

    // --- State: Auth ---
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authAction, setAuthAction] = useState<'EDIT' | 'DELETE' | null>(null);
    const [authTargetId, setAuthTargetId] = useState<string | null>(null);
    const [authPassword, setAuthPassword] = useState('');

    // --- Derived State ---
    const uniqueFounders = useMemo(() => {
        const founders = new Set(ncrReports.map(r => r.founder).filter(Boolean));
        return Array.from(founders).sort();
    }, [ncrReports]);

    // --- Effects ---
    useEffect(() => {
        if (showItemModal) {
            // Reset complex selection states when opening modal
            // (Selection states removed as they were unused)
        }
    }, [showItemModal]);

    // Auto-map responsible person based on problem source dropdown
    useEffect(() => {
        if (newItem.hasCost && newItem.problemSource) {
            const responsible = RESPONSIBLE_MAPPING[newItem.problemSource as keyof typeof RESPONSIBLE_MAPPING];
            if (responsible) {
                setNewItem(prev => ({ ...prev, costResponsible: responsible }));
            }
        }
    }, [newItem.hasCost, newItem.problemSource]);

    // --- Handlers ---

    // 1. Auth Handling
    const handleAuthSubmit = () => {
        if (authPassword !== '1234') {
            Swal.fire({ icon: 'error', title: 'รหัสผ่านไม่ถูกต้อง', timer: 1500, showConfirmButton: false });
            return;
        }
        if (authAction === 'DELETE' && authTargetId) {
            setNcrItems(ncrItems.filter(i => i.id !== authTargetId));
        } else if (authAction === 'EDIT' && authTargetId) {
            const item = ncrItems.find(i => i.id === authTargetId);
            if (item) {
                setNewItem(item);
                const remaining = ncrItems.filter(i => i.id !== authTargetId);
                setNcrItems(remaining);
                setShowItemModal(true);
            }
        }
        setShowAuthModal(false); setAuthPassword(''); setAuthAction(null); setAuthTargetId(null);
    };

    const confirmDelete = (id: string) => { setAuthAction('DELETE'); setAuthTargetId(id); setShowAuthModal(true); };

    // --- Handlers for Problem/Action Selection (Main Form) ---
    const handleProblemSelection = (field: keyof ReturnRecord) => {
        setFormData(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const handleActionSelection = (field: keyof ReturnRecord) => {
        setFormData(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            const readers = files.map(file => {
                return new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(file as Blob);
                });
            });
            Promise.all(readers).then(base64Images => {
                setFormData(prev => ({ ...prev, images: [...(prev.images || []), ...base64Images] }));
            });
        }
    };

    const handleRemoveImage = (index: number) => {
        setFormData(prev => ({ ...prev, images: (prev.images || []).filter((_, i) => i !== index) }));
    };

    // 4. Item Logic
    const handleProductSearch = (query: string) => {
        setNewItem(prev => ({ ...prev, productCode: query }));
        if (!query) return;
        const found = items.find(i => (i.productCode || '').toLowerCase() === query.toLowerCase() || (i.barcode || '').toLowerCase() === query.toLowerCase());
        if (found) {
            setNewItem(prev => ({
                ...prev,
                productName: found.productName,
                unit: found.unit || prev.unit,
                pricePerUnit: found.pricePerUnit || prev.pricePerUnit,
                customerName: found.customerName || prev.customerName
            }));
        }
    };

    const handleAddItem = (closeModal: boolean = true) => {
        if (!newItem.productCode || !newItem.branch) {
            Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบถ้วน', text: 'ระบุรหัสสินค้า และสาขา' });
            return;
        }

        const item: NCRItem = {
            ...newItem as NCRItem,
            id: Date.now().toString(),
            quantity: Number(newItem.quantity) || 0,
            pricePerUnit: Number(newItem.pricePerUnit) || 0,
            priceBill: Number(newItem.priceBill) || 0,
            priceSell: Number(newItem.priceSell) || 0,
            costAmount: Number(newItem.costAmount) || 0,
            problemDetail: newItem.problemDetail || '',
            problemOtherText: newItem.problemOtherText || '',
            actionReworkMethod: newItem.actionReworkMethod || '',
            actionSpecialAcceptanceReason: newItem.actionSpecialAcceptanceReason || '',
            preliminaryDecision: newItem.isFieldSettled ? 'FieldSettlement' : 'Return',
            preliminaryRoute: newItem.preliminaryRoute === 'Other' ? (newItem.preliminaryRouteOther || 'Other') : newItem.preliminaryRoute
        };

        setNcrItems([...ncrItems, item]);

        // Reset
        setNewItem({
            branch: '', refNo: '', neoRefNo: '', productCode: '', productName: '',
            customerName: '', destinationCustomer: '', quantity: 0, unit: '',
            pricePerUnit: 0, priceBill: 0, priceSell: 0, expiryDate: '', hasCost: false,
            costAmount: 0, costResponsible: '', problemSource: '',
            preliminaryDecision: 'Return', preliminaryRoute: '',
            isFieldSettled: false, fieldSettlementAmount: 0, fieldSettlementEvidence: '', fieldSettlementName: '', fieldSettlementPosition: '',
            problemDamaged: false, problemDamagedInBox: false, problemLost: false, problemMixed: false, problemWrongInv: false,
            problemLate: false, problemDuplicate: false, problemWrong: false, problemIncomplete: false,
            problemOver: false, problemWrongInfo: false, problemShortExpiry: false, problemTransportDamage: false,
            problemAccident: false, problemPOExpired: false, problemNoBarcode: false, problemNotOrdered: false, problemOther: false, problemOtherText: '',
            problemDetail: '',
            actionReject: false, actionRejectQty: 0, actionRejectSort: false, actionRejectSortQty: 0,
            actionRework: false, actionReworkQty: 0, actionReworkMethod: '',
            actionSpecialAcceptance: false, actionSpecialAcceptanceQty: 0, actionSpecialAcceptanceReason: '',
            actionScrap: false, actionScrapQty: 0, actionReplace: false, actionReplaceQty: 0,
            causePackaging: false, causeTransport: false, causeOperation: false, causeEnv: false,
            causeDetail: '', preventionDetail: '', preventionDueDate: ''
        });
        if (closeModal) setShowItemModal(false);
    };

    // 5. Validation & Save
    const validateForm = () => {
        const errors: string[] = [];
        // --- VALIDATION DISABLED (Allow sending Telegram even if incomplete) ---
        // if (!formData.founder.trim()) errors.push("ผู้พบปัญหา");
        // if (ncrItems.length === 0) errors.push("รายการสินค้า (กรุณากดปุ่ม '+ เพิ่มรายการ')");
        // const isCauseChecked = formData.causePackaging || formData.causeTransport || formData.causeOperation || formData.causeEnv;
        // if (!isCauseChecked) errors.push("สาเหตุเกิดจาก (กรุณาเลือกอย่างน้อย 1 หัวข้อ)");
        return errors;
    };

    const executeSave = async () => {
        setShowConfirmModal(false);
        setIsSaving(true);

        const newNcrNo = await getNextNCRNumber();
        if (newNcrNo.includes('ERR')) {
            setSaveResult({ success: false, message: "สร้างเลขที่ NCR ไม่สำเร็จ" });
            setShowResultModal(true); setIsSaving(false); return;
        }

        let successCount = 0;
        for (const item of ncrItems) {
            const record: NCRRecord = {
                ...formData,
                id: `${newNcrNo}-${item.id}`,
                ncrNo: newNcrNo,
                item: item,
                status: item.isFieldSettled ? 'Settled_OnField' : (formData.isRecordOnly || formData.qaAccept ? 'Closed' : 'Open'),
                qaAccept: formData.isRecordOnly || formData.qaAccept,
                qaReason: formData.isRecordOnly ? 'บันทึกเป็นสถิติเท่านั้น' : formData.qaReason,
                isRecordOnly: formData.isRecordOnly
            };

            const success = await addNCRReport(record);
            if (success) {
                // SYNC TO OPERATIONS HUB (ReturnRecord)
                const returnRecord: ReturnRecord = {
                    id: `RT-${new Date().getFullYear()}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                    refNo: item.refNo || formData.poNo || '-',
                    date: formData.date,
                    dateRequested: formData.date,
                    productName: item.productName || 'Unknown',
                    productCode: item.productCode || 'N/A',
                    quantity: item.quantity,
                    unit: item.unit || 'Unit',
                    customerName: item.customerName || 'Unknown',
                    destinationCustomer: item.destinationCustomer || '',
                    branch: item.branch || 'Head Office',
                    category: 'General',
                    ncrNumber: newNcrNo,
                    documentType: 'NCR',
                    founder: formData.founder,
                    status: formData.isFieldSettled ? 'Settled_OnField' : (formData.isRecordOnly ? 'Completed' : 'Requested'),
                    isRecordOnly: formData.isRecordOnly,
                    dateCompleted: formData.isRecordOnly ? new Date().toISOString().split('T')[0] : undefined,
                    disposition: formData.isRecordOnly ? 'InternalUse' : 'Pending',
                    condition: formData.isRecordOnly ? 'New' : 'Unknown',
                    isFieldSettled: formData.isFieldSettled,
                    fieldSettlementAmount: formData.fieldSettlementAmount,
                    fieldSettlementEvidence: formData.fieldSettlementEvidence,
                    fieldSettlementName: formData.fieldSettlementName,
                    fieldSettlementPosition: formData.fieldSettlementPosition,
                    preliminaryRoute: formData.preliminaryRoute === 'Other' && formData.preliminaryRouteOther ? `Other: ${formData.preliminaryRouteOther}` : (formData.preliminaryRoute || 'Other'),
                    reason: `NCR: ${formData.problemDetail || '-'}`,
                    amount: item.priceBill || 0,
                    priceBill: item.priceBill || 0,
                    pricePerUnit: item.pricePerUnit || 0,
                    priceSell: item.priceSell || 0,
                    neoRefNo: item.neoRefNo || '-',

                    // Flags
                    problemDamaged: formData.problemDamaged,
                    problemDamagedInBox: formData.problemDamagedInBox,
                    problemLost: formData.problemLost,
                    problemMixed: formData.problemMixed,
                    problemWrongInv: formData.problemWrongInv,
                    problemLate: formData.problemLate,
                    problemDuplicate: formData.problemDuplicate,
                    problemWrong: formData.problemWrong,
                    problemIncomplete: formData.problemIncomplete,
                    problemOver: formData.problemOver,
                    problemWrongInfo: formData.problemWrongInfo,
                    problemShortExpiry: formData.problemShortExpiry,
                    problemTransportDamage: formData.problemTransportDamage,
                    problemAccident: formData.problemAccident,
                    problemPOExpired: formData.problemPOExpired,
                    problemNoBarcode: formData.problemNoBarcode,
                    problemNotOrdered: formData.problemNotOrdered,
                    problemOther: formData.problemOther,
                    problemOtherText: formData.problemOtherText,
                    problemDetail: formData.problemDetail,

                    // Actions
                    actionReject: formData.actionReject,
                    actionRejectQty: formData.actionRejectQty,
                    actionRejectSort: formData.actionRejectSort,
                    actionRejectSortQty: formData.actionRejectSortQty,
                    actionRework: formData.actionRework,
                    actionReworkQty: formData.actionReworkQty,
                    actionReworkMethod: formData.actionReworkMethod,
                    actionSpecialAcceptance: formData.actionSpecialAcceptance,
                    actionSpecialAcceptanceQty: formData.actionSpecialAcceptanceQty,
                    actionSpecialAcceptanceReason: formData.actionSpecialAcceptanceReason,
                    actionScrap: formData.actionScrap,
                    actionScrapQty: formData.actionScrapQty,
                    actionReplace: formData.actionReplace,
                    actionReplaceQty: formData.actionReplaceQty,

                    // Cost & Source & Analysis
                    rootCause: formData.problemSource || 'NCR',
                    problemSource: formData.problemSource || 'Customer',
                    problemAnalysis: formData.problemAnalysis || 'Customer',
                    problemAnalysisSub: formData.problemAnalysisSub,
                    problemAnalysisCause: formData.problemAnalysisCause,
                    problemAnalysisDetail: formData.problemAnalysisDetail,
                    images: formData.images,

                    hasCost: formData.hasCost,
                    costAmount: formData.costAmount,
                    costResponsible: formData.costResponsible,

                    // Details
                    causePackaging: formData.causePackaging,
                    causeTransport: formData.causeTransport,
                    causeOperation: formData.causeOperation,
                    causeEnv: formData.causeEnv,
                    causeDetail: formData.causeDetail,
                    preventionDetail: formData.preventionDetail,
                    preventionDueDate: formData.preventionDueDate,
                    responsiblePerson: formData.responsiblePerson,
                    responsiblePosition: formData.responsiblePosition,
                    dueDate: formData.dueDate,
                    approver: formData.approver,
                    approverPosition: formData.approverPosition,
                    approverDate: formData.approverDate
                };

                await addReturnRecord(returnRecord);
                successCount++;
            }
        }

        setIsSaving(false);
        if (successCount === ncrItems.length) {
            setGeneratedNCRNumber(newNcrNo);
            setSaveResult({ success: true, message: "บันทึกข้อมูลสำเร็จ", ncrNo: newNcrNo });
            setShowResultModal(true);
            if (isPrinting) setTimeout(() => window.print(), 500);

            // TELEGRAM NOTIFICATION
            if (systemConfig.telegram?.enabled && systemConfig.telegram.chatId) {
                const msgDate = new Date().toLocaleString('th-TH');
                const founder = formData.founder || '-';
                const branch = formData.branch || ncrItems[0]?.branch || '-';
                const customerName = ncrItems[0]?.customerName || '-';
                const destCustomer = ncrItems[0]?.destinationCustomer || '-';
                const neoRef = ncrItems[0]?.neoRefNo || '-';
                const refNo = ncrItems[0]?.refNo || '-';
                const docNo = newNcrNo;
                const problemDetail = formData.problemDetail || '-';
                const qty = ncrItems.reduce((acc, item) => acc + (item.quantity || 0), 0);
                const problemSource = formData.problemSource || '-';

                const problemProcess = [
                    formData.problemDamaged && 'ชำรุด', formData.problemDamagedInBox && 'ชำรุดในกล่อง', formData.problemLost && 'สูญหาย',
                    formData.problemMixed && 'สินค้าสลับ', formData.problemWrongInv && 'สินค้าไม่ตรง INV', formData.problemLate && 'ส่งช้า',
                    formData.problemDuplicate && 'ส่งซ้ำ', formData.problemWrong && 'ส่งผิด', formData.problemIncomplete && 'ส่งของไม่ครบ',
                    formData.problemOver && 'ส่งของเกิน', formData.problemWrongInfo && 'ข้อมูลผิด', formData.problemShortExpiry && 'สินค้าอายุสั้น',
                    formData.problemTransportDamage && 'สินค้าเสียหายบนรถ', formData.problemAccident && 'อุบัติเหตุ', formData.problemPOExpired && 'PO. หมดอายุ',
                    formData.problemNoBarcode && 'บาร์โค๊ตไม่ขึ้น', formData.problemNotOrdered && 'ไม่ได้สั่งสินค้า', formData.problemOther && `อื่นๆ (${formData.problemOtherText})`
                ].filter(Boolean).join(', ');

                const costInfo = formData.hasCost
                    ? `ใช่ (Amount: ${formData.costAmount} บาท, Resp: ${formData.costResponsible})`
                    : 'ไม่ระบุ';

                const fieldSettlementInfo = formData.isFieldSettled
                    ? `จบงานหน้างาน (จ่าย: ${formData.fieldSettlementAmount} บาท, ผู้รับผิดชอบ: ${formData.fieldSettlementName} - ${formData.fieldSettlementPosition})`
                    : 'ไม่มี';

                const detailedMessage = `🚨 <b>NCR Report (New) [NCR]</b>
----------------------------------
<b>วันที่ :</b> ${msgDate}
<b>สาขา :</b> ${branch}
<b>ผู้พบปัญหา (Founder) :</b> ${founder}
<b>ลูกค้า / ลูกค้าปลายทาง :</b> ${customerName} / ${destCustomer}
<b>Neo Ref No. :</b> ${neoRef}
<b>เลขที่บิล / Ref No. :</b> ${refNo}
<b>เลขที่เอกสาร (เลข R) :</b> ${docNo}
<b>รายละเอียดของปัญหา :</b> ${problemDetail}
<b>จำนวนสินค้า :</b> ${qty} ${ncrItems[0]?.unit || 'ชิ้น'} ${ncrItems.length > 1 ? `(รวม ${ncrItems.length} รายการ)` : ''}
<b>วิเคราะห์ปัญหาเกิดจาก :</b> ${problemSource}
<b>พบปัญหาที่กระบวนการ :</b> ${problemProcess || '-'}
${formData.isRecordOnly ? '<b>🔹 บันทึกข้อมูลเพื่อเป็นสถิติเท่านั้น (Fast Track)</b>\n' : ''}<b>การติดตามค่าใช้จ่าย :</b> ${costInfo}
<b>Field Settlement :</b> ${fieldSettlementInfo}
----------------------------------
🔗 <i>Status: ${formData.isRecordOnly ? 'Closed/Completed' : 'Open'}</i>`;

                await sendTelegramMessage(
                    systemConfig.telegram.botToken,
                    systemConfig.telegram.chatId,
                    detailedMessage
                );
            }
        } else {
            setSaveResult({ success: false, message: "บันทึกข้อมูลล้มเหลวบางส่วน" });
            setShowResultModal(true);
        }
    };

    const handlePrint = () => {
        const err = validateForm();
        if (err.length > 0) { Swal.fire({ icon: 'warning', html: err.join('<br>') }); return; }
        window.print();
    };

    const handleSaveRecord = () => {
        const err = validateForm();
        if (err.length > 0) { Swal.fire({ icon: 'warning', html: err.join('<br>') }); return; }
        setIsPrinting(false); setShowConfirmModal(true);
    };

    return (
        <div className="p-3 md:p-8 h-full overflow-auto bg-white flex flex-col items-center print:p-0 print:m-0 print:bg-white print:h-auto print:overflow-visible print:block">
            {/* Styles for print/screen - Mobile Responsive */}
            <style>{`
                @media screen { 
                    .a4-paper { width: 100%; max-width: 210mm; min-height: auto; margin: 0 auto; background: white; padding: 4mm; } 
                }
                @media screen and (min-width: 768px) {
                    .a4-paper { padding: 10mm; }
                }
                @media screen and (min-width: 1024px) {
                    .a4-paper { padding: 20mm; min-height: 297mm; }
                }
                @media print { 
                    @page { margin: 10mm; size: A4; } 
                    .a4-paper { width: 100%; margin: 0; padding: 0; box-shadow: none; border: none; }
                    .no-print { display: none !important; }
                    .print-border { border: 1px solid #000 !important; }
                    .print-border-2 { border: 2px solid #000 !important; }
                    .avoid-break { break-inside: avoid; page-break-inside: avoid; }
                    input, textarea, select { border: none !important; background: transparent !important; padding: 0 !important; }
                    input[type="checkbox"] { border: 1px solid #000 !important; }
                }
                .input-line { border-bottom: 1px dotted #999; width: 100%; color: #000; }
            `}</style>

            {/* Top Actions - Mobile Responsive */}
            <div className="w-full max-w-5xl flex flex-wrap justify-center md:justify-end gap-2 mb-6 print:hidden px-2">
                <button onClick={() => exportNCRToExcel(formData, ncrItems, generatedNCRNumber || ncrItems[0]?.id?.split('-')[0] || "Draft")} className="bg-green-600 text-white px-3 py-2 rounded-lg flex items-center gap-1.5 text-xs md:text-sm font-bold shadow-sm hover:bg-green-700 min-h-[44px]" title="Export Excel"><Download className="w-4 h-4" /> <span className="hidden sm:inline">Export</span> Excel</button>
                <button onClick={handlePrint} className="bg-slate-800 text-white px-3 py-2 rounded-lg flex items-center gap-1.5 text-xs md:text-sm font-bold shadow-sm hover:bg-slate-700 min-h-[44px]" title="Print Form"><Printer className="w-4 h-4" /> Print</button>
                <button onClick={handleSaveRecord} disabled={isSaving} className="bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-1.5 text-xs md:text-sm font-bold shadow-sm hover:bg-blue-700 disabled:opacity-50 min-h-[44px]" title="Save Record"><Save className="w-4 h-4" /> Save</button>
            </div>

            {/* A4 Paper Form */}
            <div className="a4-paper text-sm">

                {/* Header */}
                <div className="flex border-2 border-black mb-4 print-border-2 avoid-break">
                    <div className="w-[30%] border-r-2 border-black print-border p-4 flex items-center justify-center"><img src="https://img2.pic.in.th/pic/logo-neo.png" alt="Neo" className="max-h-20" /></div>
                    <div className="w-[70%] p-4 pl-6 flex flex-col justify-center">
                        <h2 className="text-lg font-bold">บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด</h2>
                        <h3 className="text-xs font-bold text-slate-700">NEOSIAM LOGISTICS & TRANSPORT CO., LTD.</h3>
                        <p className="text-xs text-slate-600 mt-1">Tax ID: 0105552087673 | Tel: 056-275-841</p>
                    </div>
                </div>

                <h1 className="text-lg font-bold text-center border-2 border-black py-2 mb-4 bg-slate-200 print:bg-transparent print-border-2">ใบแจ้งปัญหาระบบ (NCR) / ใบแจ้งปัญหารับสินค้าคืน</h1>

                {/* Form Header Info - Mobile Responsive */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 mb-6 avoid-break">
                    <div className="flex items-end gap-2">
                        <label className="font-bold w-24 shrink-0">ถึงหน่วยงาน:</label>
                        <input type="text" className="input-line" value={formData.toDept} onChange={e => setFormData({ ...formData, toDept: e.target.value })} title="หน่วยงาน" />
                    </div>
                    <div className="flex items-end gap-2">
                        <label className="font-bold w-24 shrink-0">เลขที่ NCR:</label>
                        <div className="input-line bg-slate-100 px-2 font-mono font-bold text-center">{generatedNCRNumber || ncrItems[0]?.id?.split('-')[0] || "Auto-Generated"}</div>
                    </div>
                    <div className="flex items-end gap-2">
                        <label className="font-bold w-24 shrink-0">วันที่:</label>
                        <input type="date" className="input-line" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} title="วันที่" />
                    </div>
                    <div className="flex items-end gap-2">
                        <label className="font-bold w-24 shrink-0">ผู้พบปัญหา:</label>
                        <div className="w-full border-b border-dotted border-slate-400">
                            <LineAutocomplete className="w-full" value={formData.founder} onChange={val => setFormData({ ...formData, founder: val })} options={uniqueFounders} placeholder="ระบุผู้พบปัญหา..." />
                        </div>
                    </div>
                    <div className="flex items-end gap-2">
                        <label className="font-bold w-24 shrink-0">สำเนา:</label>
                        <input type="text" className="input-line" value={formData.copyTo} onChange={e => setFormData({ ...formData, copyTo: e.target.value })} title="สำเนาถึง" />
                    </div>
                    <div className="flex items-end gap-2">
                        <label className="font-bold w-24 shrink-0 whitespace-nowrap">เลขที่ PO/ผลิต:</label>
                        <input type="text" className="input-line" value={formData.poNo} onChange={e => setFormData({ ...formData, poNo: e.target.value })} title="เลขที่ใบสั่งซื้อ" />
                    </div>
                </div>

                {/* Section 1: Non-Conforming Items */}
                <div className="border-2 border-black mb-4 print-border-2">
                    <div className="bg-slate-200 print:bg-transparent border-b-2 border-black p-2 font-bold flex justify-between items-center print-border">
                        <span>1. รายการสินค้าที่พบปัญหา (Non-Conforming Items) *</span>
                    </div>
                    {/* Inline Item Entry Form (No Print) */}
                    <div className="bg-slate-100 p-3 mb-2 border-b border-black text-xs no-print">
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-12 gap-2 mb-2">
                            <div className="col-span-2 md:col-span-2">
                                <label className="block font-bold mb-1">รหัสสินค้า</label>
                                <input type="text" className="w-full p-2 md:p-1 border rounded min-h-[44px] md:min-h-0" value={newItem.productCode} onChange={e => setNewItem({ ...newItem, productCode: e.target.value })} placeholder="Code" title="Product Code" />
                            </div>
                            <div className="col-span-2 sm:col-span-4 md:col-span-4">
                                <label className="block font-bold mb-1">ชื่อสินค้า</label>
                                <input type="text" className="w-full p-2 md:p-1 border rounded min-h-[44px] md:min-h-0" value={newItem.productName} onChange={e => setNewItem({ ...newItem, productName: e.target.value })} placeholder="Name" title="Product Name" />
                            </div>
                            <div className="col-span-1 sm:col-span-2 md:col-span-3">
                                <label className="block font-bold mb-1">ลูกค้า</label>
                                <input type="text" className="w-full p-2 md:p-1 border rounded min-h-[44px] md:min-h-0" value={newItem.customerName} onChange={e => setNewItem({ ...newItem, customerName: e.target.value })} placeholder="Customer" title="Customer Name" />
                            </div>
                            <div className="col-span-1 sm:col-span-2 md:col-span-3">
                                <label className="block font-bold mb-1">สาขา</label>
                                <select className="w-full p-2 md:p-1 border rounded min-h-[44px] md:min-h-0" value={newItem.branch} onChange={e => setNewItem({ ...newItem, branch: e.target.value })} title="สาขา">
                                    <option value="">-- เลือกสาขา --</option>
                                    {BRANCH_LIST.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-12 gap-2 mb-2">
                            <div className="col-span-2 md:col-span-2">
                                <label className="block font-bold mb-1">Ref No.</label>
                                <input type="text" className="w-full p-2 md:p-1 border rounded min-h-[44px] md:min-h-0" value={newItem.refNo} onChange={e => setNewItem({ ...newItem, refNo: e.target.value })} placeholder="เลขที่บิล..." title="เลขที่บิล / เอกสารอ้างอิง (Ref No.)" />
                            </div>
                            <div className="col-span-1 md:col-span-2">
                                <label className="block font-bold mb-1">Neo Ref.</label>
                                <input type="text" className="w-full p-2 md:p-1 border rounded min-h-[44px] md:min-h-0" value={newItem.neoRefNo} onChange={e => setNewItem({ ...newItem, neoRefNo: e.target.value })} placeholder="Neo Ref" title="Neo Ref" />
                            </div>
                            <div className="col-span-1 md:col-span-2">
                                <label className="block font-bold mb-1">Lot No.</label>
                                <input type="text" className="w-full p-2 md:p-1 border rounded min-h-[44px] md:min-h-0" value={newItem.lotNo} onChange={e => setNewItem({ ...newItem, lotNo: e.target.value })} placeholder="Lot" title="Lot No" />
                            </div>
                            <div className="col-span-1 md:col-span-2">
                                <label className="block font-bold mb-1">วันหมดอายุ</label>
                                <input type="text" className="w-full p-2 md:p-1 border rounded min-h-[44px] md:min-h-0" value={newItem.expiryDate} onChange={e => setNewItem({ ...newItem, expiryDate: e.target.value })} placeholder="DD/MM/YYYY" title="วันหมดอายุ" />
                            </div>
                            <div className="col-span-1 md:col-span-1">
                                <label className="block font-bold mb-1">จำนวน</label>
                                <input type="number" className="w-full p-2 md:p-1 border rounded font-bold text-blue-600 min-h-[44px] md:min-h-0" value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) })} title="จำนวน" placeholder="0" />
                            </div>
                            <div className="col-span-1 md:col-span-1">
                                <label className="block font-bold mb-1">หน่วย</label>
                                <input type="text" className="w-full p-2 md:p-1 border rounded min-h-[44px] md:min-h-0" value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })} placeholder="Unit" title="หน่วย" />
                            </div>
                            <div className="col-span-1 md:col-span-1">
                                <label className="block font-bold mb-1">ราคา/หน่วย</label>
                                <input type="number" className="w-full p-2 md:p-1 border rounded min-h-[44px] md:min-h-0" value={newItem.pricePerUnit} onChange={e => setNewItem({ ...newItem, pricePerUnit: parseFloat(e.target.value) })} title="ราคาต่อหน่วย" placeholder="0.00" />
                            </div>
                            <div className="col-span-2 sm:col-span-1 md:col-span-1 flex items-end">
                                <button onClick={() => handleAddItem(false)} className="w-full bg-blue-600 text-white p-2 md:p-1 rounded font-bold hover:bg-blue-700 flex justify-center items-center shadow-sm min-h-[44px] md:min-h-0" title="เพิ่ม"><Plus className="w-4 h-4" /></button>
                            </div>
                        </div>
                    </div>
                    {/* Premium Glass Table */}
                    <div className="rounded-2xl overflow-x-auto border border-slate-200 shadow-sm mb-6">
                        <table className="w-full text-xs min-w-[700px]">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-200 text-left">
                                    <th className="p-3 font-bold text-slate-600">No.</th>
                                    <th className="p-3 font-bold text-slate-600">สาขา (Branch)</th>
                                    <th className="p-3 font-bold text-slate-600">อ้างอิง (Ref)</th>
                                    <th className="p-3 font-bold text-slate-600">สินค้า (Product)</th>
                                    <th className="p-3 font-bold text-center text-slate-600">จำนวน (Qty)</th>
                                    <th className="p-3 font-bold text-right text-slate-600 w-24">ราคา (Price)</th>
                                    <th className="p-3 font-bold text-slate-600 w-1/4">ปัญหา (Issue)</th>
                                    <th className="p-3 w-10 text-center no-print"><Trash2 className="w-4 h-4 mx-auto text-slate-400" /></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {ncrItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-8 text-center text-slate-400 italic bg-slate-50/30">
                                            <div className="flex flex-col items-center gap-2">
                                                <Package className="w-8 h-8 opacity-20" />
                                                <span>ยังไม่มีรายการสินค้า (กดปุ่ม &apos;+ เพิ่มรายการ&apos; ด้านบน)</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    ncrItems.map((item, idx) => (
                                        <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-indigo-50/30 transition-colors group">
                                            <td className="p-3 text-center text-slate-500 font-medium">{idx + 1}</td>
                                            <td className="p-3">
                                                <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 font-bold text-[10px] uppercase tracking-wider border border-slate-200">
                                                    {item.branch}
                                                </span>
                                            </td>
                                            <td className="p-3">
                                                <div className="font-bold text-slate-700">{item.refNo || '-'}</div>
                                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{item.neoRefNo}</div>
                                            </td>
                                            <td className="p-3">
                                                <div className="font-bold text-indigo-900">{item.productCode}</div>
                                                <div className="text-slate-600 truncate max-w-[180px]" title={item.productName}>{item.productName}</div>
                                                <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                                                    <User className="w-3 h-3" /> {item.customerName}
                                                </div>
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className="font-bold text-slate-800 text-sm bg-slate-100 px-2 py-1 rounded-full">{item.quantity}</span>
                                                <span className="text-[10px] text-slate-500 ml-1">{item.unit}</span>
                                            </td>
                                            <td className="p-3 text-right">
                                                <div className="font-mono font-medium text-slate-700">{item.pricePerUnit?.toFixed(2)}</div>
                                                {item.expiryDate && (
                                                    <div className="text-[10px] inline-flex items-center gap-1 text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded mt-1 border border-amber-100">
                                                        Exp: {item.expiryDate}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-3">
                                                <div className="flex flex-wrap gap-1">
                                                    {[
                                                        item.problemDamaged && 'ชำรุด', item.problemDamagedInBox && 'ชำรุดในกล่อง', item.problemLost && 'สูญหาย', item.problemMixed && 'ปะปน',
                                                        item.problemWrongInv && 'ผิด INV', item.problemLate && 'ส่งช้า', item.problemDuplicate && 'ส่งซ้ำ', item.problemWrong && 'ส่งผิด',
                                                        item.problemIncomplete && 'ไม่ครบ', item.problemOver && 'เกิน', item.problemWrongInfo && 'ข้อมูลผิด', item.problemShortExpiry && 'อายุสั้น',
                                                        item.problemTransportDamage && 'ขนส่งทำเสียหาย', item.problemAccident && 'อุบัติเหตุ', item.problemPOExpired && 'PO หมด',
                                                        item.problemNoBarcode && 'No Barcode', item.problemNotOrdered && 'ไม่ได้สั่ง', item.problemOther && 'อื่นๆ'
                                                    ].filter(Boolean).map((tag, i) => (
                                                        <span key={i} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-600 border border-red-100">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                                {item.hasCost && (
                                                    <div className="mt-1.5 flex items-center gap-1 text-[10px] text-red-600 font-bold bg-red-50 px-2 py-1 rounded w-fit border border-red-100">
                                                        <AlertTriangle className="w-3 h-3" /> Cost: {item.costAmount?.toLocaleString()}฿
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-3 text-center no-print">
                                                <button
                                                    onClick={() => confirmDelete(item.id)}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                    title="ลบรายการ"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Problem Details & Attachments */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
                        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 print:border-black print:p-2">
                            <div className="font-bold mb-3 flex items-center gap-2 text-slate-700">
                                <ImageIcon className="w-4 h-4 text-indigo-600" /> รูปภาพ / เอกสารประกอบ
                            </div>
                            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-indigo-200 rounded-xl bg-white hover:bg-indigo-50/30 transition-colors group cursor-pointer no-print relative">
                                <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" title="Upload Images" />
                                <div className="p-3 bg-indigo-50 text-indigo-500 rounded-full mb-2 group-hover:scale-110 transition-transform">
                                    <Download className="w-5 h-5 rotate-180" />
                                </div>
                                <span className="text-xs font-bold text-indigo-600">คลิกเพื่ออัพโหลดรูปภาพ</span>
                                <span className="text-[10px] text-slate-400 mt-1">หรือลากไฟล์มาวางที่นี่</span>
                            </div>
                            {/* Print Only Placeholder */}
                            <div className="hidden print:block text-center text-slate-400 text-xs py-10 border border-slate-300 rounded bg-white">
                                [พื้นที่สำหรับแนบรูปภาพ]
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" disabled checked={false} title="ตามแนบ (As attached)" /> <span className="text-xs">ตามแนบ</span>
                            </div>
                        </div>
                        <div className="border-2 border-black p-2 min-h-[100px] print-border-2 relative">
                            <div className="font-bold mb-2">รายละเอียดของปัญหาที่พบ (ผู้พบปัญหา)</div>
                            <textarea className="w-full h-20 text-xs resize-none outline-none border-0 bg-transparent" placeholder="รายละเอียด..." value={formData.problemDetail} onChange={e => setFormData({ ...formData, problemDetail: e.target.value })} title="รายละเอียดปัญหา"></textarea>

                            {/* Fast Track Section - Integrated directly in the form area for high visibility */}
                            <div className="mt-2 no-print">
                                <label className="flex items-center gap-3 p-2 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer hover:bg-amber-100 transition-all border-dashed">
                                    <input
                                        type="checkbox"
                                        checked={formData.isRecordOnly || false}
                                        onChange={() => setFormData({ ...formData, isRecordOnly: !formData.isRecordOnly })}
                                        className="w-4 h-4 text-amber-600 focus:ring-amber-500 rounded border-amber-300"
                                    />
                                    <div className="flex flex-col">
                                        <span className="font-bold text-amber-800 text-[11px]">เปิดใช้งานระบบ &quot;Fast Track&quot; (Record Only)</span>
                                        <span className="text-[9px] text-amber-600 leading-tight">สำหรับปัญหาที่ไม่มีการคืนสินค้าจริง (เช่น ส่งช้า) จบงานทันทีเมื่อบันทึก</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 1.5: Problem Analysis & Details (New Global Section) */}
                <div className="border-2 border-black mb-4 flex flex-col md:flex-row print-border-2 avoid-break">
                    <div className="w-full md:w-1/3 border-b-2 md:border-b-0 md:border-r-2 border-black p-2 print-border">
                        <div className="font-bold mb-2 bg-slate-200 -mx-2 -mt-2 p-2 border-b-2 border-black print:bg-transparent print-border flex items-center gap-2">
                            <ImageIcon className="w-4 h-4" /> รูปภาพ (Images)
                        </div>
                        <div className="flex flex-col items-center justify-center text-slate-400 min-h-[120px] border-2 border-dashed border-slate-300 rounded hover:bg-slate-50 relative print:hidden">
                            <input type="file" title="อัพโหลดรูป" multiple accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                            <span className="text-xs font-bold">+ อัพโหลดรูปภาพ</span>
                        </div>
                        {formData.images && formData.images.length > 0 && (
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                {formData.images.map((img, idx) => (
                                    <div key={idx} className="relative group aspect-square bg-slate-100 rounded overflow-hidden border border-slate-200">
                                        <img src={img} alt="Preview" className="w-full h-full object-cover" />
                                        <button onClick={() => handleRemoveImage(idx)} type="button" className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl hover:bg-red-600 print:hidden" title="ลบ"><X className="w-3 h-3" /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="w-full md:w-2/3 p-2">
                        <div className="font-bold mb-2 bg-slate-200 -mx-2 -mt-2 p-2 border-b-2 border-black print:bg-transparent print-border flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" /> วิเคราะห์ปัญหาเกิดจาก (Problem Source) *
                        </div>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                {['Customer', 'DestinationCustomer', 'Accounting', 'Keying'].map(opt => (
                                    <label key={opt} className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1 rounded">
                                        <input type="radio" name="problemAnalysis" checked={formData.problemAnalysis === opt} onChange={() => setFormData({ ...formData, problemAnalysis: opt as ReturnRecord['problemAnalysis'], problemSource: opt })} className="w-4 h-4" title={opt} />
                                        {opt}
                                    </label>
                                ))}
                                <div className="col-span-2">
                                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1 rounded">
                                        <input type="radio" name="problemAnalysis" checked={formData.problemAnalysis === 'Warehouse'} onChange={() => setFormData({ ...formData, problemAnalysis: 'Warehouse', problemSource: 'Warehouse' })} className="w-4 h-4" title="Warehouse" />
                                        ภายในคลังสินค้า (Warehouse)
                                    </label>
                                    {formData.problemAnalysis === 'Warehouse' && (
                                        <div className="ml-6 mt-1 p-2 bg-slate-50 border rounded grid grid-cols-2 gap-2">
                                            <select className="border rounded p-1" value={formData.branch} onChange={e => setFormData({ ...formData, branch: e.target.value })} title="สาขา"><option value="">-- สาขา --</option>{['พิษณุโลก', 'กำแพงเพชร', 'แม่สอด', 'เชียงใหม่', 'EKP ลำปาง', 'นครสวรรค์', 'สาย 3', 'คลอง 13', 'ซีโน่', 'ประดู่'].map(b => <option key={b} value={b}>{b}</option>)}</select>
                                            <div className="flex flex-wrap gap-2">
                                                {['เช็คเกอร์', 'พนักงานลงสินค้า', 'อื่นๆ'].map(c => <label key={c} className="flex gap-1"><input type="radio" name="whCause" checked={formData.problemAnalysisCause === c} onChange={() => setFormData({ ...formData, problemAnalysisCause: c })} title={c} /> {c}</label>)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="col-span-2">
                                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1 rounded">
                                        <input type="radio" name="problemAnalysis" checked={formData.problemAnalysis === 'Transport'} onChange={() => setFormData({ ...formData, problemAnalysis: 'Transport', problemSource: 'Transport' })} className="w-4 h-4" title="Transport" />
                                        ระหว่างขนส่ง (Transport)
                                    </label>
                                    {formData.problemAnalysis === 'Transport' && (
                                        <div className="ml-6 mt-1 p-2 bg-slate-50 border rounded flex gap-4">
                                            {['CompanyDriver', 'JointTransport', 'Other'].map(t => <label key={t} className="flex gap-1"><input type="radio" name="transType" checked={formData.problemAnalysisSub === t} onChange={() => setFormData({ ...formData, problemAnalysisSub: t })} title={t} /> {t}</label>)}
                                        </div>
                                    )}
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1 rounded col-span-2">
                                    <input type="radio" name="problemAnalysis" checked={formData.problemAnalysis === 'Other'} onChange={() => setFormData({ ...formData, problemAnalysis: 'Other', problemSource: 'Other' })} className="w-4 h-4" title="Other" />
                                    อื่นๆ (Other)
                                </label>
                                {formData.problemAnalysis === 'Other' && (
                                    <input type="text" className="col-span-2 w-full p-2 ml-6 border border-slate-300 rounded text-xs" placeholder="ระบุรายละเอียด..." value={formData.problemAnalysisDetail || ''} onChange={e => setFormData({ ...formData, problemAnalysisDetail: e.target.value })} title="ระบุรายละเอียด" />
                                )}
                            </div>
                            <textarea className="w-full p-2 border rounded text-xs bg-slate-50" rows={2} placeholder="รายละเอียดปัญหาเพิ่มเติม..." value={formData.problemDetail} onChange={e => setFormData({ ...formData, problemDetail: e.target.value })} title="รายละเอียดปัญหา"></textarea>
                        </div>
                    </div>
                </div>

                {/* Section 2: Problem Checklist & Actions (Optimized Layout) */}
                <div className="border-2 border-black mb-4 flex flex-col md:flex-row items-stretch print-border-2 avoid-break">

                    {/* Left: Problems Checklist */}
                    <div className="w-full md:w-1/2 border-b-2 md:border-b-0 md:border-r-2 border-black p-0 flex flex-col print-border">
                        <div className="font-bold p-2 border-b-2 border-black print:bg-transparent print-border">
                            พบปัญหาที่กระบวนการ *
                        </div>
                        <div className="p-2 grid grid-cols-2 gap-y-1 text-xs flex-1">
                            {/* ... รายการ Checkbox เดิม ... */}
                            <label className="flex gap-2 items-center cursor-pointer hover:bg-slate-50 rounded px-1"><input type="checkbox" checked={formData.problemDamaged} onChange={() => handleProblemSelection('problemDamaged')} title="ชำรุด" /> ชำรุด</label>
                            <label className="flex gap-2 items-center cursor-pointer hover:bg-slate-50 rounded px-1"><input type="checkbox" checked={formData.problemDamagedInBox} onChange={() => handleProblemSelection('problemDamagedInBox')} title="ชำรุดในกล่อง" /> ชำรุดในกล่อง</label>
                            <label className="flex gap-2 items-center cursor-pointer hover:bg-slate-50 rounded px-1"><input type="checkbox" checked={formData.problemLost} onChange={() => handleProblemSelection('problemLost')} title="สูญหาย" /> สูญหาย</label>
                            <label className="flex gap-2 items-center cursor-pointer hover:bg-slate-50 rounded px-1"><input type="checkbox" checked={formData.problemMixed} onChange={() => handleProblemSelection('problemMixed')} title="สินค้าสลับ" /> สินค้าสลับ</label>
                            <label className="flex gap-2 items-center cursor-pointer hover:bg-slate-50 rounded px-1"><input type="checkbox" checked={formData.problemWrongInv} onChange={() => handleProblemSelection('problemWrongInv')} title="สินค้าไม่ตรง INV." /> สินค้าไม่ตรง INV.</label>
                            <label className="flex gap-2 items-center cursor-pointer hover:bg-slate-50 rounded px-1"><input type="checkbox" checked={formData.problemLate} onChange={() => handleProblemSelection('problemLate')} title="ส่งช้า" /> ส่งช้า</label>
                            <label className="flex gap-2 items-center cursor-pointer hover:bg-slate-50 rounded px-1"><input type="checkbox" checked={formData.problemDuplicate} onChange={() => handleProblemSelection('problemDuplicate')} title="ส่งซ้ำ" /> ส่งซ้ำ</label>
                            <label className="flex gap-2 items-center cursor-pointer hover:bg-slate-50 rounded px-1"><input type="checkbox" checked={formData.problemWrong} onChange={() => handleProblemSelection('problemWrong')} title="ส่งผิด" /> ส่งผิด</label>
                            <label className="flex gap-2 items-center cursor-pointer hover:bg-slate-50 rounded px-1"><input type="checkbox" checked={formData.problemIncomplete} onChange={() => handleProblemSelection('problemIncomplete')} title="ส่งของไม่ครบ" /> ส่งของไม่ครบ</label>
                            <label className="flex gap-2 items-center cursor-pointer hover:bg-slate-50 rounded px-1"><input type="checkbox" checked={formData.problemOver} onChange={() => handleProblemSelection('problemOver')} title="ส่งของเกิน" /> ส่งของเกิน</label>
                            <label className="flex gap-2 items-center cursor-pointer hover:bg-slate-50 rounded px-1"><input type="checkbox" checked={formData.problemWrongInfo} onChange={() => handleProblemSelection('problemWrongInfo')} title="ข้อมูลผิด" /> ข้อมูลผิด</label>
                            <label className="flex gap-2 items-center cursor-pointer hover:bg-slate-50 rounded px-1"><input type="checkbox" checked={formData.problemShortExpiry} onChange={() => handleProblemSelection('problemShortExpiry')} title="สินค้าอายุสั้น" /> สินค้าอายุสั้น</label>
                            <label className="flex gap-2 items-center cursor-pointer hover:bg-slate-50 rounded px-1"><input type="checkbox" checked={formData.problemTransportDamage} onChange={() => handleProblemSelection('problemTransportDamage')} title="สินค้าเสียหายบนรถ" /> สินค้าเสียหายบนรถ</label>
                            <label className="flex gap-2 items-center cursor-pointer hover:bg-slate-50 rounded px-1"><input type="checkbox" checked={formData.problemAccident} onChange={() => handleProblemSelection('problemAccident')} title="อุบัติเหตุ" /> อุบัติเหตุ</label>
                            <label className="flex gap-2 items-center cursor-pointer hover:bg-slate-50 rounded px-1"><input type="checkbox" checked={formData.problemPOExpired} onChange={() => handleProblemSelection('problemPOExpired')} title="PO. หมดอายุ" /> PO. หมดอายุ</label>
                            <label className="flex gap-2 items-center cursor-pointer hover:bg-slate-50 rounded px-1"><input type="checkbox" checked={formData.problemNoBarcode} onChange={() => handleProblemSelection('problemNoBarcode')} title="บาร์โค๊ตไม่ขึ้น" /> บาร์โค๊ตไม่ขึ้น</label>
                            <label className="flex gap-2 items-center cursor-pointer hover:bg-slate-50 rounded px-1"><input type="checkbox" checked={formData.problemNotOrdered} onChange={() => handleProblemSelection('problemNotOrdered')} title="ไม่ได้สั่งสินค้า" /> ไม่ได้สั่งสินค้า</label>

                            <div className="col-span-2 flex items-center gap-2 mt-1 px-1">
                                <label className="flex gap-2 whitespace-nowrap cursor-pointer"><input type="checkbox" checked={formData.problemOther} onChange={() => handleProblemSelection('problemOther')} /> อื่นๆ</label>
                                <input type="text" className="input-line text-xs flex-1" placeholder="ระบุปัญหาอื่นๆ" value={formData.problemOtherText} onChange={e => setFormData({ ...formData, problemOtherText: e.target.value })} title="ระบุปัญหาอื่นๆ" />
                            </div>
                        </div>
                    </div>

                    {/* Right: Actions (Clean White Layout & Aligned Inputs) */}
                    <div className="w-full md:w-1/2 p-0 flex flex-col">
                        <div className="font-bold p-2 border-b-2 border-black print:bg-transparent print-border">
                            การดำเนินการ
                        </div>
                        <div className="text-xs space-y-2 p-2 flex-1">
                            {/* Row 1: Reject */}
                            <div className="flex items-center justify-between gap-2 hover:bg-slate-50 rounded px-1">
                                <label className="flex items-center gap-2 cursor-pointer flex-1">
                                    <input type="checkbox" checked={formData.actionReject} onChange={() => handleActionSelection('actionReject')} />
                                    <span className="font-bold text-black">ส่งคืน (Reject)</span>
                                </label>
                                <div className="flex items-center gap-2">
                                    <span className="text-black text-[10px]">จำนวน:</span>
                                    <input type="number" className="input-line w-16 text-center font-bold" value={formData.actionRejectQty || ''} onChange={e => setFormData({ ...formData, actionRejectQty: Number(e.target.value) })} title="จำนวนส่งคืน" />
                                </div>
                            </div>

                            {/* Row 2: Sort */}
                            <div className="flex items-center justify-between gap-2 hover:bg-slate-50 rounded px-1">
                                <label className="flex items-center gap-2 cursor-pointer flex-1">
                                    <input type="checkbox" checked={formData.actionRejectSort} onChange={() => handleActionSelection('actionRejectSort')} />
                                    <span className="font-bold text-black">คัดแยกของเสียคืน</span>
                                </label>
                                <div className="flex items-center gap-2">
                                    <span className="text-black text-[10px]">จำนวน:</span>
                                    <input type="number" className="input-line w-16 text-center font-bold" value={formData.actionRejectSortQty || ''} onChange={e => setFormData({ ...formData, actionRejectSortQty: Number(e.target.value) })} title="จำนวนคัดแยก" />
                                </div>
                            </div>

                            {/* Row 3: Rework */}
                            <div className="flex flex-col gap-1 hover:bg-slate-50 rounded px-1 py-1">
                                <div className="flex items-center justify-between gap-2">
                                    <label className="flex items-center gap-2 cursor-pointer flex-1">
                                        <input type="checkbox" checked={formData.actionRework} onChange={() => handleActionSelection('actionRework')} />
                                        <span className="font-bold text-black">แก้ไข (Rework)</span>
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-black text-[10px]">จำนวน:</span>
                                        <input type="number" className="input-line w-16 text-center font-bold" value={formData.actionReworkQty || ''} onChange={e => setFormData({ ...formData, actionReworkQty: Number(e.target.value) })} title="จำนวนแก้ไข" />
                                    </div>
                                </div>
                                {formData.actionRework && (
                                    <div className="pl-6 flex items-center gap-2 animate-fade-in">
                                        <span className="whitespace-nowrap text-[10px] text-black">วิธีแก้:</span>
                                        <input type="text" className="input-line flex-1" value={formData.actionReworkMethod} onChange={e => setFormData({ ...formData, actionReworkMethod: e.target.value })} placeholder="ระบุวิธีการ..." title="วิธีแก้ไข" />
                                    </div>
                                )}
                            </div>

                            {/* Row 4: Special Acceptance */}
                            <div className="flex flex-col gap-1 hover:bg-slate-50 rounded px-1 py-1">
                                <div className="flex items-center justify-between gap-2">
                                    <label className="flex items-center gap-2 cursor-pointer flex-1">
                                        <input type="checkbox" checked={formData.actionSpecialAcceptance} onChange={() => handleActionSelection('actionSpecialAcceptance')} />
                                        <span className="font-bold text-black">ยอมรับกรณีพิเศษ</span>
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-black text-[10px]">จำนวน:</span>
                                        <input type="number" className="input-line w-16 text-center font-bold" value={formData.actionSpecialAcceptanceQty || ''} onChange={e => setFormData({ ...formData, actionSpecialAcceptanceQty: Number(e.target.value) })} title="จำนวนยอมรับพิเศษ" />
                                    </div>
                                </div>
                                {formData.actionSpecialAcceptance && (
                                    <div className="pl-6 flex items-center gap-2 animate-fade-in">
                                        <span className="whitespace-nowrap text-[10px] text-black">เหตุผล:</span>
                                        <input type="text" className="input-line flex-1" value={formData.actionSpecialAcceptanceReason} onChange={e => setFormData({ ...formData, actionSpecialAcceptanceReason: e.target.value })} placeholder="ระบุเหตุผล..." title="เหตุผล" />
                                    </div>
                                )}
                            </div>

                            {/* Row 5: Scrap */}
                            <div className="flex items-center justify-between gap-2 hover:bg-slate-50 rounded px-1">
                                <label className="flex items-center gap-2 cursor-pointer flex-1">
                                    <input type="checkbox" checked={formData.actionScrap} onChange={() => handleActionSelection('actionScrap')} />
                                    <span className="font-bold text-black">ทำลาย (Scrap)</span>
                                </label>
                                <div className="flex items-center gap-2">
                                    <span className="text-black text-[10px]">จำนวน:</span>
                                    <input type="number" className="input-line w-16 text-center font-bold" value={formData.actionScrapQty || ''} onChange={e => setFormData({ ...formData, actionScrapQty: Number(e.target.value) })} title="จำนวนทำลาย" />
                                </div>
                            </div>

                            {/* Row 6: Replace */}
                            <div className="flex items-center justify-between gap-2 hover:bg-slate-50 rounded px-1">
                                <label className="flex items-center gap-2 cursor-pointer flex-1">
                                    <input type="checkbox" checked={formData.actionReplace} onChange={() => handleActionSelection('actionReplace')} />
                                    <span className="font-bold text-black">เปลี่ยนสินค้าใหม่</span>
                                </label>
                                <div className="flex items-center gap-2">
                                    <span className="text-black text-[10px]">จำนวน:</span>
                                    <input type="number" className="input-line w-16 text-center font-bold" value={formData.actionReplaceQty || ''} onChange={e => setFormData({ ...formData, actionReplaceQty: Number(e.target.value) })} title="จำนวนเปลี่ยนสินค้าใหม่" />
                                </div>
                            </div>

                            {/* Due Date */}
                            <div className="flex items-end gap-2 mt-4 pt-2 border-t border-dotted border-slate-300">
                                <span className="font-bold text-black">กำหนดแล้วเสร็จ:</span>
                                <input type="date" className="input-line w-32 text-center" value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} title="กำหนดแล้วเสร็จ" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 3: Logistics & Cost (Moved from Items) */}
                <div className="border-2 border-black mb-4 flex flex-col md:flex-row print-border-2 avoid-break">
                    {/* Left: Route Selection */}
                    <div className="w-full md:w-1/3 border-b-2 md:border-b-0 md:border-r-2 border-black p-2 print-border">
                        <div className="font-bold mb-2 bg-slate-200 -mx-2 -mt-2 p-2 border-b-2 border-black print:bg-transparent print-border flex items-center gap-2">
                            <Truck className="w-4 h-4" /> เลือกเส้นทางส่งคืน (Select Route) *
                        </div>
                        <div className="space-y-1 text-xs">
                            {RETURN_ROUTES.map(r => (
                                <label key={r} className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1 rounded">
                                    <input type="radio" name="globalRoute" className="w-4 h-4" checked={formData.preliminaryRoute === r} onChange={() => setFormData({ ...formData, preliminaryRoute: r })} title={r} />
                                    <span>{r}</span>
                                </label>
                            ))}
                            <div className="space-y-1">
                                <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1 rounded">
                                    <input type="radio" name="globalRoute" className="w-4 h-4" checked={formData.preliminaryRoute === 'Other'} onChange={() => setFormData({ ...formData, preliminaryRoute: 'Other' })} title="อื่นๆ" />
                                    <span>อื่นๆ (Other)</span>
                                </label>
                                {formData.preliminaryRoute === 'Other' && (
                                    <input type="text" className="w-full p-1 ml-6 border border-slate-300 rounded outline-none" placeholder="โปรดระบุ..." value={formData.preliminaryRouteOther} onChange={e => setFormData({ ...formData, preliminaryRoute: 'Other', preliminaryRouteOther: e.target.value })} title="ระบุเส้นทางอื่นๆ" />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Middle: Cost Tracking */}
                    <div className="w-full md:w-1/3 border-b-2 md:border-b-0 md:border-r-2 border-black p-2 print-border">
                        <div className="font-bold mb-2 bg-amber-50 -mx-2 -mt-2 p-2 border-b-2 border-black print:bg-transparent print-border flex items-center gap-2 text-amber-800">
                            <AlertTriangle className="w-4 h-4" /> การติดตามค่าใช้จ่าย (Cost Tracking)
                        </div>
                        <div className="space-y-2 text-xs">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={formData.hasCost} onChange={e => setFormData({ ...formData, hasCost: e.target.checked })} className="w-4 h-4 accent-amber-600" title="Has Cost" />
                                <span className="font-bold text-amber-600 flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> มีค่าใช้จ่าย (Has Cost)</span>
                            </label>
                            {formData.hasCost && (
                                <div className="space-y-2 pl-4 animate-fade-in">
                                    <div>
                                        <label className="block font-bold mb-1 text-slate-700">สาเหตุความเสียหาย (Problem Source)</label>
                                        <select
                                            className="w-full input-line bg-white text-slate-700 font-medium p-1 border-b border-amber-300 focus:border-amber-500 outline-none"
                                            value={formData.problemSource || ''}
                                            onChange={e => {
                                                const newSource = e.target.value;
                                                const mappedResponsible = RESPONSIBLE_MAPPING[newSource] || '';
                                                setFormData({ ...formData, problemSource: newSource, costResponsible: mappedResponsible });
                                            }}
                                            title="Problem Source"
                                        >
                                            <option value="">-- ระบุสาเหตุ --</option>
                                            {Object.keys(RESPONSIBLE_MAPPING).map(source => (
                                                <option key={source} value={source}>{source}</option>
                                            ))}
                                            <option value="Other">อื่นๆ (Other)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block font-bold mb-1 text-slate-700">ค่าใช้จ่าย (บาท)</label>
                                        <input type="number" className="w-full input-line border-amber-300 focus:border-amber-500" value={formData.costAmount} onChange={e => setFormData({ ...formData, costAmount: Number(e.target.value) })} title="Cost Amount" placeholder="0.00" />
                                    </div>
                                    <div>
                                        <label className="block font-bold mb-1 text-slate-700">ผู้รับผิดชอบ (Responsible)</label>
                                        <input type="text" className="w-full input-line border-amber-300 focus:border-amber-500" placeholder="ระบุผู้รับผิดชอบ" value={formData.costResponsible} onChange={e => setFormData({ ...formData, costResponsible: e.target.value })} title="Responsible" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Field Settlement */}
                    <div className="w-full md:w-1/3 p-2">
                        <div className="font-bold mb-2 bg-green-100 -mx-2 -mt-2 p-2 border-b-2 border-black print:bg-transparent print-border flex items-center gap-2 text-green-800">
                            <CheckCircle className="w-4 h-4" /> จบงานหน้างาน (Field Settlement)
                        </div>
                        <div className="space-y-2 text-xs">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={formData.isFieldSettled} onChange={e => setFormData({ ...formData, isFieldSettled: e.target.checked })} className="w-4 h-4" title="Field Settlement" />
                                <span className="font-bold text-green-700">ชดเชยเงิน (Settlement)</span>
                            </label>
                            {formData.isFieldSettled && (
                                <div className="space-y-2 pl-4">
                                    <div>
                                        <label className="block font-bold mb-1">จำนวนเงิน</label>
                                        <input type="number" className="w-full input-line border-green-300" value={formData.fieldSettlementAmount} onChange={e => setFormData({ ...formData, fieldSettlementAmount: Number(e.target.value) })} title="Amount" />
                                    </div>
                                    <div>
                                        <label className="block font-bold mb-1">ชื่อพนักงาน</label>
                                        <input type="text" className="w-full input-line border-green-300" value={formData.fieldSettlementName} onChange={e => setFormData({ ...formData, fieldSettlementName: e.target.value })} title="Name" />
                                    </div>
                                    <div>
                                        <label className="block font-bold mb-1">หลักฐานโอนเงิน</label>
                                        <input type="text" className="w-full input-line border-green-300" placeholder="Note/URL" value={formData.fieldSettlementEvidence} onChange={e => setFormData({ ...formData, fieldSettlementEvidence: e.target.value })} title="Evidence" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                {/* Section 4: Cause & Prevention */}
                <div className="border-2 border-black mb-4 print-border-2 avoid-break">
                    <div className="bg-slate-200 print:bg-transparent border-b-2 border-black p-2 font-bold print-border">สาเหตุ-การป้องกัน (ผู้รับผิดชอบปัญหา)</div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border-b md:border-b-0 md:border-r border-black pb-4 md:pb-0 md:pr-4">
                            <div className="font-bold mb-2 text-xs text-black">สาเหตุเกิดจาก *</div>
                            <div className="flex flex-wrap gap-4 text-xs mb-3">
                                <label className="flex gap-2 text-black"><input type="checkbox" checked={formData.causePackaging} onChange={() => setFormData({ ...formData, causePackaging: !formData.causePackaging })} title="บรรจุภัณฑ์" /> บรรจุภัณฑ์</label>
                                <label className="flex gap-2 text-black"><input type="checkbox" checked={formData.causeTransport} onChange={() => setFormData({ ...formData, causeTransport: !formData.causeTransport })} title="การขนส่ง" /> การขนส่ง</label>
                                <label className="flex gap-2 text-black"><input type="checkbox" checked={formData.causeOperation} onChange={() => setFormData({ ...formData, causeOperation: !formData.causeOperation })} title="ปฏิบัติงาน" /> ปฏิบัติงาน</label>
                                <label className="flex gap-2 text-black"><input type="checkbox" checked={formData.causeEnv} onChange={() => setFormData({ ...formData, causeEnv: !formData.causeEnv })} title="สิ่งแวดล้อม" /> สิ่งแวดล้อม</label>
                            </div>
                            <div className="text-xs">
                                <div className="font-bold mb-1 text-black">รายละเอียดสาเหตุ :</div>
                                <textarea className="w-full h-16 resize-none input-line bg-transparent text-black" value={formData.causeDetail} onChange={e => setFormData({ ...formData, causeDetail: e.target.value })} title="รายละเอียดสาเหตุ" placeholder="ระบุรายละเอียดสาเหตุ..."></textarea>
                            </div>
                        </div>
                        <div>
                            <div className="text-xs h-full flex flex-col">
                                <div className="font-bold mb-1 text-black">แนวทางป้องกัน :</div>
                                <textarea className="w-full flex-1 resize-none input-line bg-transparent mb-2 text-black" value={formData.preventionDetail} onChange={e => setFormData({ ...formData, preventionDetail: e.target.value })} title="แนวทางป้องกัน" placeholder="ระบุแนวทางป้องกัน..."></textarea>
                                <div className="flex items-end gap-2">
                                    <span className="font-bold">กำหนดการป้องกันแล้วเสร็จ</span>
                                    <input type="date" className="input-line w-32" value={formData.preventionDueDate} onChange={e => setFormData({ ...formData, preventionDueDate: e.target.value })} title="กำหนดป้องกันแล้วเสร็จ" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Signatures Row */}
                <div className="flex flex-col md:flex-row border-2 border-black md:h-32 mb-4 print-border-2 avoid-break">
                    <div className="w-full md:w-1/4 border-b-2 md:border-b-0 md:border-r-2 border-black p-2 flex flex-col justify-between items-center print-border">
                        <div className="text-xs font-bold text-center w-full">ผู้อนุมัติ (Approver)</div>
                        <div className="text-center w-full mt-auto">
                            <input type="text" className="input-line text-center mb-1 bg-transparent" placeholder="(ลงชื่อ)" value={formData.approver} onChange={e => setFormData({ ...formData, approver: e.target.value })} title="ลงชื่อผู้อนุมัติ" />
                            <input type="text" className="input-line text-center text-xs mb-1 bg-transparent" placeholder="ตำแหน่ง" value={formData.approverPosition} onChange={e => setFormData({ ...formData, approverPosition: e.target.value })} title="ตำแหน่ง" />
                            <div className="flex justify-center items-center gap-1 text-[10px]">
                                <span>วันที่</span>
                                <input type="date" className="input-line w-24 text-center bg-transparent" value={formData.approverDate} onChange={e => setFormData({ ...formData, approverDate: e.target.value })} title="วันที่อนุมัติ" />
                            </div>
                        </div>
                    </div>
                    <div className="w-full md:w-1/4 border-b-2 md:border-b-0 md:border-r-2 border-black p-2 flex flex-col justify-between items-center print-border">
                        <div className="text-xs font-bold text-center w-full">ผู้รับผิดชอบ (Responsible)</div>
                        <div className="text-center w-full mt-auto">
                            <input type="text" className="input-line text-center mb-1 bg-transparent" placeholder="(ลงชื่อ)" value={formData.responsiblePerson} onChange={e => setFormData({ ...formData, responsiblePerson: e.target.value })} title="ลงชื่อผู้รับผิดชอบ" />
                            <input type="text" className="input-line text-center text-xs mb-1 bg-transparent" placeholder="ตำแหน่ง" value={formData.responsiblePosition} onChange={e => setFormData({ ...formData, responsiblePosition: e.target.value })} title="ตำแหน่ง" />
                            <div className="flex justify-center items-center gap-1 text-[10px]">
                                <span>วันที่</span>
                                <input type="date" className="input-line w-24 text-center bg-transparent" value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} title="วันที่รับผิดชอบ" />
                            </div>
                        </div>
                    </div>
                    <div className="w-full md:w-2/4 p-2 text-[10px] italic flex items-center justify-center text-center">
                        หมายเหตุ : เมื่อทาง Supplier/Out source หรือหน่วยงานผู้รับผิดชอบปัญหา ได้รับเอกสารใบ NCR กรุณาระบุสาเหตุ-การป้องกัน และตอบกลับมายังแผนกประกันคุณภาพ ภายใน 1 สัปดาห์
                    </div>
                </div>

                {/* Tracking & Closure */}
                <div className="border-2 border-black mb-4 print-border-2 avoid-break">
                    <div className="bg-slate-200 print:bg-transparent border-b-2 border-black p-2 font-bold text-center print-border">การตรวจติดตามและการปิด NCR</div>
                    <div className="flex flex-col md:flex-row md:h-32 md:divide-x-2 divide-black">
                        <div className="w-full md:w-1/3 p-2 flex flex-col justify-center border-b-2 md:border-b-0 border-black">
                            <label className="flex gap-2 items-center mb-2 cursor-pointer"><input type="checkbox" checked={formData.qaAccept} onChange={() => setFormData({ ...formData, qaAccept: true, qaReject: false })} title="ยอมรับ" className="w-4 h-4" /> ยอมรับแนวทางการป้องกัน</label>
                            <label className="flex gap-2 items-center mb-2 cursor-pointer"><input type="checkbox" checked={formData.qaReject} onChange={() => setFormData({ ...formData, qaAccept: false, qaReject: true })} title="ไม่ยอมรับ" className="w-4 h-4" /> ไม่ยอมรับแนวทางการป้องกัน</label>
                            <input type="text" className="input-line text-xs bg-transparent" placeholder="ระบุเหตุผล (ถ้ามี)" value={formData.qaReason} onChange={e => setFormData({ ...formData, qaReason: e.target.value })} title="เหตุผล" />
                        </div>
                        <div className="w-full md:w-1/3 p-2 flex flex-col justify-between items-center border-b-2 md:border-b-0 border-black">
                            <div className="text-xs font-bold text-center w-full">ผู้ตรวจติดตาม</div>
                            <div className="text-center w-full mt-auto">
                                <div className="border-b border-dotted border-black w-3/4 mx-auto mb-1 h-6"></div>
                                <div className="text-xs font-bold">แผนกประกันคุณภาพ</div>
                                <div className="text-[10px]">วันที่ ...../...../..........</div>
                            </div>
                        </div>
                        <div className="w-full md:w-1/3 p-2 flex flex-col justify-between items-center">
                            <div className="text-xs font-bold text-center w-full">ผู้อนุมัติปิดการตรวจติดตาม</div>
                            <div className="text-center w-full mt-auto">
                                <div className="border-b border-dotted border-black w-3/4 mx-auto mb-1 h-6"></div>
                                <div className="text-xs font-bold">กรรมการผู้จัดการ</div>
                                <div className="text-[10px]">วันที่ ...../...../..........</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ITEM MODAL */}
                {
                    showItemModal && (
                        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-fade-in-up">
                                <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                                    <h3 className="font-bold text-lg"><Package className="inline-block w-5 h-5 mr-2 text-blue-600" /> เพิ่มรายการสินค้า (Add Item)</h3>
                                    <button onClick={() => setShowItemModal(false)} className="p-1 hover:bg-slate-100 rounded-full" title="Close"><X className="w-6 h-6 text-slate-500" /></button>
                                </div>
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block font-bold mb-1">ค้นหาสินค้า / บาร์โค้ด</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                className="input-field flex-1"
                                                placeholder="ยิงบาร์โค้ด หรือ พิมพ์ชื่อสินค้า..."
                                                value={newItem.productCode}
                                                onChange={e => handleProductSearch(e.target.value)}
                                                autoFocus
                                                title="รห้สสินค้า / บาร์โค้ด"
                                            />
                                            <button className="btn-secondary" title="Search"><Search className="w-4 h-4" /></button>
                                        </div>
                                    </div>

                                    {/* Basic Item Details */}
                                    <div>
                                        <label className="block font-bold mb-1">ชื่อสินค้า</label>
                                        <input type="text" className="input-field bg-slate-50" value={newItem.productName} readOnly title="ชื่อสินค้า" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block font-bold mb-1">จำนวน</label>
                                            <input type="number" className="input-field text-center font-bold text-blue-600" value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: Number(e.target.value) })} title="Quantity" placeholder="0" />
                                        </div>
                                        <div>
                                            <label className="block font-bold mb-1">หน่วย</label>
                                            <input type="text" className="input-field text-center" value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })} title="Unit" placeholder="Unit" />
                                        </div>
                                    </div>

                                    <div className="col-span-2 pt-4 border-t flex justify-end gap-3">
                                        <button onClick={() => setShowItemModal(false)} className="btn-secondary" title="ยกเลิก">ยกเลิก</button>
                                        <button onClick={handleAddItem} className="btn-primary" title="บันทึกรายการ">บันทึกรายการ</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Confirmation Modals */}
                {
                    showConfirmModal && (
                        <div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4">
                            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm text-center">
                                <HelpCircle className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                                <h3 className="text-lg font-bold mb-2">ยืนยันการบันทึก</h3>
                                <p className="text-sm text-slate-500 mb-6">ต้องการบันทึกข้อมูลเข้าระบบหรือไม่?</p>
                                <div className="flex gap-3">
                                    <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-2 border rounded-lg hover:bg-slate-50" title="ยกเลิก">ยกเลิก</button>
                                    <button onClick={executeSave} disabled={isSaving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex justify-center items-center gap-2" title="ยืนยัน">
                                        {isSaving && <Loader className="w-4 h-4 animate-spin" />} ยืนยัน
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {
                    showResultModal && saveResult && (
                        <div className="fixed inset-0 z-[90] bg-black/60 flex items-center justify-center p-4">
                            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm text-center">
                                {saveResult.success ? <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" /> : <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />}
                                <h3 className="text-lg font-bold mb-2">{saveResult.success ? 'สำเร็จ!' : 'ผิดพลาด'}</h3>
                                <p className="text-sm text-slate-500 mb-4 whitespace-pre-line">{saveResult.message}</p>
                                <button onClick={() => { setShowResultModal(false); if (saveResult.success) { setNcrItems([]); setFormData(initialFormData); setGeneratedNCRNumber(''); } }} className="w-full py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700" title="ตกลง">ตกลง</button>
                            </div>
                        </div>
                    )
                }

                {
                    showAuthModal && (
                        <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-xs text-center animate-fade-in-up">
                                <Lock className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                                <h3 className="font-bold text-lg mb-4">Admin Authentication</h3>
                                <input type="password" autoFocus className="w-full p-2 text-center text-xl border rounded mb-4 tracking-widest" placeholder="Password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAuthSubmit()} title="Password" />
                                <div className="flex gap-2">
                                    <button onClick={() => setShowAuthModal(false)} className="flex-1 py-2 border rounded hover:bg-slate-50" title="Cancel">Cancel</button>
                                    <button onClick={handleAuthSubmit} className="flex-1 py-2 bg-slate-800 text-white rounded hover:bg-slate-900" title="Confirm">Confirm</button>
                                </div>
                            </div>
                        </div>
                    )
                }

            </div>
        </div>
    );
}
