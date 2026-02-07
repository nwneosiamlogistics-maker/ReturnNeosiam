
import React, { useState, useEffect } from 'react';
import { useData } from '../../../DataContext';
import { ReturnRecord, ItemCondition, DispositionAction, TransportInfo } from '../../../types';
import { getISODetails, RESPONSIBLE_MAPPING } from '../utils';
import { sendTelegramMessage, formatStatusUpdateMessage } from '../../../utils/telegramService';
import Swal from 'sweetalert2';

export const useOperationsLogic = (initialData?: Partial<ReturnRecord> | null, onClearInitialData?: () => void) => {
    const { items, addReturnRecord, updateReturnRecord, addNCRReport, getNextNCRNumber, getNextReturnNumber, systemConfig, ncrReports } = useData();

    // Workflow State
    const [activeStep, setActiveStep] = useState<number>(2);
    const [isCustomBranch, setIsCustomBranch] = useState(false);

    // QC State
    const [qcSelectedItem, setQcSelectedItem] = useState<ReturnRecord | null>(null);
    const [customInputType, setCustomInputType] = useState<'Good' | 'Bad' | null>(null);

    // Split Logic State
    const [showSplitMode, setShowSplitMode] = useState(false);
    const [splitQty, setSplitQty] = useState(0);
    const [splitCondition, setSplitCondition] = useState<ItemCondition>('Damaged');

    // Unit Breakdown State
    const [isBreakdownUnit, setIsBreakdownUnit] = useState(false);
    const [conversionRate, setConversionRate] = useState(1);
    const [newUnitName, setNewUnitName] = useState('');
    const [splitDisposition, setSplitDisposition] = useState<DispositionAction | null>(null);

    // Disposition Temp State
    const [selectedDisposition, setSelectedDisposition] = useState<DispositionAction | null>(null);
    const [dispositionDetails, setDispositionDetails] = useState({
        route: '',
        sellerName: '',
        contactPhone: '',
        internalUseDetail: '',
        claimCompany: '',
        claimCoordinator: '',
        claimPhone: ''
    });
    const [isCustomRoute, setIsCustomRoute] = useState(false);

    // Document Generator State
    const [showDocModal, setShowDocModal] = useState(false);
    const [docData, setDocData] = useState<{ type: DispositionAction, items: ReturnRecord[] } | null>(null);
    const [includeVat, setIncludeVat] = useState(true);
    const [vatRate, setVatRate] = useState(7);
    const [includeDiscount, setIncludeDiscount] = useState(false);
    const [discountRate, setDiscountRate] = useState(0);
    const [isDocEditable, setIsDocEditable] = useState(false);
    const [docConfig, setDocConfig] = useState({
        companyNameTH: 'บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด',
        companyNameEN: 'NEOSIAM LOGISTICS & TRANSPORT CO., LTD.',
        address: '159/9-10 หมู่ 7 ต.บางม่วง อ.เมืองนครสวรรค์ จ.นครสวรรค์ 60000',
        contact: 'Tel: 056-275-841 Email: info_nw@neosiamlogistics.com',
        titleTH: '',
        titleEN: '',
        remarks: '1. กรุณาตรวจสอบความถูกต้องของสินค้าภายใน 7 วัน',
        signatory1: 'ผู้จัดทำ (Prepared By)',
        signatory2: 'ผู้ตรวจสอบ (Checked By)',
        signatory3: 'ผู้อนุมัติ (Approved By)'
    });

    // Document Selection State
    const [showSelectionModal, setShowSelectionModal] = useState(false);
    const [selectionStatus, setSelectionStatus] = useState<DispositionAction | null>(null);
    const [selectionItems, setSelectionItems] = useState<ReturnRecord[]>([]);
    const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Step 4 Split State
    const [docSelectedItem, setDocSelectedItem] = useState<ReturnRecord | null>(null);
    const [showStep4SplitModal, setShowStep4SplitModal] = useState(false);

    // Pending State for Logistics (Step 2)
    const [pendingLogisticsTx, setPendingLogisticsTx] = useState<{
        ids: string[];
        updatePayload: Partial<ReturnRecord>;
    } | null>(null);

    // Document Submitting State
    const [isSubmittingDoc, setIsSubmittingDoc] = useState(false);

    // Manual Intake Form State
    const initialFormState: Partial<ReturnRecord> = {
        branch: 'พิษณุโลก',
        date: new Date().toISOString().split('T')[0],
        quantity: 1,
        unit: 'ชิ้น',
        pricePerUnit: 0,
        priceBill: 0,
        priceSell: 0,
        status: 'Draft',
        disposition: 'Pending',
        condition: 'Unknown',
        documentType: 'NCR', // Default to NCR for Step1
        productCode: '',
        productName: '',
        expiryDate: '',
        notes: '',
        ncrNumber: '',
        refNo: '',
        neoRefNo: '',
        customerName: '',
        destinationCustomer: '',
        problemDamaged: false, problemDamagedInBox: false, problemLost: false, problemMixed: false,
        problemWrongInv: false, problemLate: false, problemDuplicate: false, problemWrong: false,
        problemIncomplete: false, problemOver: false, problemWrongInfo: false, problemShortExpiry: false,
        problemTransportDamage: false, problemAccident: false,
        problemPOExpired: false, problemNoBarcode: false, problemNotOrdered: false,
        problemOther: false,
        problemOtherText: '', problemDetail: '',
        actionReject: false, actionRejectQty: 0, actionRejectSort: false, actionRejectSortQty: 0,
        actionRework: false, actionReworkQty: 0, actionReworkMethod: '',
        actionSpecialAcceptance: false, actionSpecialAcceptanceQty: 0, actionSpecialAcceptanceReason: '',
        actionScrap: false, actionScrapQty: 0,
        actionReplace: false,
        actionReplaceQty: 0,
        causePackaging: false, causeTransport: false, causeOperation: false, causeEnv: false,
        causeDetail: '', preventionDetail: '',

        images: [],
        hasCost: false, costAmount: 0, costResponsible: '', problemSource: '',
        problemAnalysis: undefined, problemAnalysisSub: '', problemAnalysisCause: '', problemAnalysisDetail: '',

        preliminaryDecision: undefined, preliminaryRoute: '',
        isFieldSettled: false,
        fieldSettlementAmount: 0,
        fieldSettlementEvidence: '',
        fieldSettlementName: '',
        fieldSettlementPosition: ''
    };
    const [formData, setFormData] = useState<Partial<ReturnRecord>>(initialFormState);
    const [requestItems, setRequestItems] = useState<Partial<ReturnRecord>[]>([]);
    const [customProblemType, setCustomProblemType] = useState('');
    const [customRootCause, setCustomRootCause] = useState('');

    // Derived Data (filtered items) - 8 Step Workflow

    // Step 2 Input: Requested (Exclude NCR)
    const step2Items = items.filter(i => i.status === 'Requested' && i.documentType !== 'NCR');
    const ncrStep2Items = items.filter(i => {
        // Condition 1: NCR Items
        const isNCR = i.documentType === 'NCR' || !!i.ncrNumber;
        if (isNCR) {
            return i.status === 'Requested' || i.status === 'COL_JobAccepted';
        }

        // Condition 2: COL Items (must come from Branch Consolidation)
        // Check for 'COL_Consolidated' OR 'JobAccepted' if bypassing branch receive? 
        // Flow: Step 4 Inbound (COL_Consolidated) -> Step 2 Hub
        if (i.status === 'COL_Consolidated') return true;

        return false;
    });

    // Step 3 Input: JobAccepted
    const step3Items = items.filter(i => i.status === 'JobAccepted');

    // Step 4 Input: BranchReceived
    const step4Items = items.filter(i => i.status === 'BranchReceived');

    // Step 5 Input: ReadyForLogistics
    const step5Items = items.filter(i => i.status === 'ReadyForLogistics');

    // Step 6 Input: InTransitToHub
    const step6Items = items.filter(i => i.status === 'InTransitToHub' || i.status === 'NCR_InTransit' || i.status === 'COL_InTransit');

    // Step 7 Input: HubReceived (Docs)
    // Exclude DirectReturn from here as requested
    // Step 7 Input: HubReceived (Docs)
    const step7Items = items.filter(i => {
        // Check for verification (If NCR Report is Canceled, hide it)
        if (i.ncrNumber) {
            const linkedReport = ncrReports.find(r => r.ncrNo === i.ncrNumber);
            if (linkedReport && linkedReport.status === 'Canceled') {
                return false;
            }
        }

        const isNCR = i.documentType === 'NCR' || !!i.ncrNumber || i.status.startsWith('NCR_');
        const isCollection = !isNCR;

        if (isCollection) {
            return (
                i.status === 'COL_HubReceived' ||
                i.status === 'ReceivedAtHub' ||
                i.status === 'HubReceived' ||
                i.status === 'QCCompleted'
            );
        }
        if (isNCR) {
            return (
                i.status === 'NCR_QCPassed' ||
                i.status === 'NCR_QCCompleted' ||
                i.status === 'QCPassed' ||
                i.status === 'QCCompleted' ||
                i.status === 'Settled_OnField'
            );
        }
        return false;
    });

    // Step 8 Input: DocsCompleted (Closure / Pending Completion)
    // Includes DirectReturn items here
    const step8Items = items.filter(i =>
        i.status === 'DocsCompleted' ||
        i.status === 'ReturnToSupplier' ||
        i.status === 'DirectReturn'
    );

    // Completed History
    const completedItems = items.filter(i => i.status === 'Completed');

    // Aliases for Props Compatibility
    const logisticItems = step5Items;

    const hubReceiveItems = step6Items;
    const hubDocItems = step7Items;
    const closureItems = step8Items;

    // Legacy mapping
    const requestedItems = step2Items;
    const receivedItems = step6Items;
    const gradedItems = []; // QC Removed
    const docItems = step7Items;

    // Autocomplete Data
    const uniqueCustomers = React.useMemo(() => {
        const dbValues = items.map(i => i.customerName).filter(Boolean);
        const localValues = requestItems.map(i => i.customerName).filter(Boolean);
        return Array.from(new Set([...dbValues, ...localValues])).sort();
    }, [items, requestItems]);

    const uniqueDestinations = React.useMemo(() => {
        const dbValues = items.map(i => i.destinationCustomer).filter(Boolean);
        const localValues = requestItems.map(i => i.destinationCustomer).filter(Boolean);
        return Array.from(new Set([...dbValues, ...localValues])).sort();
    }, [items, requestItems]);

    const uniqueFounders = React.useMemo(() => {
        const dbValues = items.map(i => i.founder).filter(Boolean);
        const localValues = requestItems.map(i => i.founder).filter(Boolean);
        return Array.from(new Set([...dbValues, ...localValues])).sort();
    }, [items, requestItems]);

    const uniqueProductCodes = React.useMemo(() => {
        const dbValues = items.map(i => i.productCode).filter(Boolean);
        const localValues = requestItems.map(i => i.productCode).filter(Boolean);
        return Array.from(new Set([...dbValues, ...localValues])).sort();
    }, [items, requestItems]);

    const uniqueProductNames = React.useMemo(() => {
        const dbValues = items.map(i => i.productName).filter(Boolean);
        const localValues = requestItems.map(i => i.productName).filter(Boolean);
        return Array.from(new Set([...dbValues, ...localValues])).sort();
    }, [items, requestItems]);

    useEffect(() => {
        if (initialData) {
            setActiveStep(1);
            setFormData(prev => ({
                ...prev,
                ...initialData,
                date: initialData.date || prev.date,
                branch: initialData.branch || prev.branch,
            }));
            if (onClearInitialData) onClearInitialData();
        }
    }, [initialData, onClearInitialData]);

    const handleDispositionDetailChange = (key: keyof typeof dispositionDetails, value: string) => {
        setDispositionDetails(prev => ({ ...prev, [key]: value }));
    };

    // Auto-map responsible person based on problem source
    useEffect(() => {
        if (formData.hasCost && formData.problemSource) {
            const responsible = RESPONSIBLE_MAPPING[formData.problemSource];
            if (responsible) {
                setFormData(prev => ({ ...prev, costResponsible: responsible }));
            }
        }
    }, [formData.problemSource, formData.hasCost]);

    const selectQCItem = (item: ReturnRecord) => {
        setQcSelectedItem(item);
        setCustomInputType(null);
        setSelectedDisposition(null);
        setDispositionDetails({
            route: '', sellerName: '', contactPhone: '', internalUseDetail: '',
            claimCompany: '', claimCoordinator: '', claimPhone: ''
        });
        setIsCustomRoute(false);
    };

    const handleConditionSelect = (condition: ItemCondition, type?: 'Good' | 'Bad') => {
        if (!qcSelectedItem) return;
        if (condition === 'Other') {
            setCustomInputType(type || null);
            setQcSelectedItem({ ...qcSelectedItem, condition: '' });
        } else {
            setCustomInputType(null);
            setQcSelectedItem({ ...qcSelectedItem, condition });
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            files.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setFormData(prev => ({
                        ...prev,
                        images: [...(prev.images || []), reader.result as string]
                    }));
                };
                reader.readAsDataURL(file as Blob);
            });
        }
    };

    const handleRemoveImage = (index: number) => {
        setFormData(prev => ({
            ...prev,
            images: (prev.images || []).filter((_, i) => i !== index)
        }));
    };

    const handleAddItem = (e: React.FormEvent | null, overrideData?: Partial<ReturnRecord>) => {
        if (e) e.preventDefault();
        const dataToUse = overrideData || formData;
        // Validation removed for Collection Step as per request
        // if (!dataToUse.productName || !dataToUse.productCode || !dataToUse.founder || !dataToUse.problemAnalysis) {
        //     alert("กรุณาระบุชื่อสินค้า, รหัสสินค้า, ผู้พบปัญหา (Founder) และสาเหตุ (Problem Source)");
        //     return;
        // }
        const newItem = { ...dataToUse };

        setRequestItems(prev => [...prev, newItem]);
        setFormData(prev => ({
            ...initialFormState,
            founder: prev.founder, // Preserve founder for next item
            branch: prev.branch,
            date: prev.date,
            customerName: prev.customerName,
            destinationCustomer: prev.destinationCustomer,
            neoRefNo: prev.neoRefNo,
            refNo: prev.refNo,
            documentNo: prev.documentNo, // Preserve R No
            invoiceNo: prev.invoiceNo,   // Preserve Invoice
            tmNo: prev.tmNo,             // Preserve TM
            controlDate: prev.controlDate, // Preserve Control Date
            documentType: prev.documentType, // Preserve Doc Type
            problemAnalysis: prev.problemAnalysis // Keep Problem Source for batch entry
        }));
        setCustomProblemType('');
        setCustomRootCause('');
    };

    const handleRemoveItem = (index: number) => {
        setRequestItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleRequestSubmit = async (manualItems?: Partial<ReturnRecord>[]) => {
        const itemsToProcess = manualItems && manualItems.length > 0 ? manualItems : [...requestItems];
        if (itemsToProcess.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'ไม่พบรายการสินค้า',
                text: 'กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการก่อนยืนยัน',
                confirmButtonColor: '#3085d6',
            });
            return;
        }

        // Validate required fields for DataContext
        const invalidItems = itemsToProcess.filter(item => !item.customerName?.trim() || !item.productCode?.trim());
        if (invalidItems.length > 0) {
            Swal.fire({
                icon: 'warning',
                title: 'ข้อมูลไม่ครบถ้วน',
                text: `รายการที่ ${itemsToProcess.indexOf(invalidItems[0]) + 1}: กรุณากรอกชื่อลูกค้า (Customer) และรหัสสินค้า (Product Code)`,
                confirmButtonColor: '#3085d6',
            });
            return;
        }

        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            let successCount = 0;

            // --- BATCH IDENTIFIER GENERATION ---
            // All items in Step1 are NCR - generate ONE shared NCR number per batch
            let sharedNcrNumber = '';

            const needsNcr = itemsToProcess.some(i => !i.ncrNumber);

            if (needsNcr) sharedNcrNumber = await getNextNCRNumber();
            // ------------------------------------

            for (const item of itemsToProcess) {
                // All items get NCR Number (Step1 is NCR only)
                const finalNcrNumber = item.ncrNumber || sharedNcrNumber;

                const runningId = await getNextReturnNumber();
                const record: ReturnRecord = {
                    ...item as ReturnRecord,
                    id: runningId,
                    refNo: item.refNo || '-',
                    // NCR only - no collection order
                    collectionOrderId: '',
                    amount: (item.quantity || 0) * (item.priceBill || 0),
                    reason: item.problemDetail || item.notes || 'แจ้งคืนสินค้า',
                    status: item.isFieldSettled ? 'Settled_OnField' : (item.isRecordOnly ? 'Completed' : 'Requested'),
                    dateRequested: item.date || new Date().toISOString().split('T')[0],
                    dateCompleted: item.isRecordOnly ? new Date().toISOString().split('T')[0] : undefined,
                    disposition: item.isFieldSettled ? 'RTV' : (item.isRecordOnly ? 'InternalUse' : 'Pending'), // InternalUse for record only
                    condition: item.isRecordOnly ? 'New' : 'Unknown',
                    productName: item.productName || 'Unknown Product',
                    productCode: item.productCode || 'N/A',
                    customerName: item.customerName || 'Unknown Customer',
                    category: 'General',
                    ncrNumber: finalNcrNumber,
                };

                // Sanitize record to remove undefined values for Firebase
                const sanitizedRecord = JSON.parse(JSON.stringify(record));

                const success = await addReturnRecord(sanitizedRecord);

                if (success) {
                    // Always create NCR Report for both document types
                    const ncrRecord = {
                            id: finalNcrNumber + '-' + record.id,
                            ncrNo: finalNcrNumber,
                            date: record.dateRequested,
                            toDept: 'แผนกควบคุมคุณภาพ',
                            founder: record.founder || 'Operations Hub',
                            poNo: '', copyTo: '',
                            problemDamaged: record.problemDamaged,
                            problemDamagedInBox: record.problemDamagedInBox,
                            problemLost: record.problemLost,
                            problemMixed: record.problemMixed,
                            problemWrongInv: record.problemWrongInv,
                            problemLate: record.problemLate,
                            problemDuplicate: record.problemDuplicate,
                            problemWrong: record.problemWrong,
                            problemIncomplete: record.problemIncomplete,
                            problemOver: record.problemOver,
                            problemWrongInfo: record.problemWrongInfo,
                            problemShortExpiry: record.problemShortExpiry,
                            problemTransportDamage: record.problemTransportDamage,
                            problemAccident: record.problemAccident,
                            problemPOExpired: record.problemPOExpired,
                            problemNoBarcode: record.problemNoBarcode,
                            problemNotOrdered: record.problemNotOrdered,
                            problemOther: record.problemOther,
                            problemOtherText: record.problemOtherText,
                            problemDetail: record.problemDetail || record.reason || '',
                            problemAnalysis: record.problemAnalysis,
                            problemAnalysisSub: record.problemAnalysisSub,
                            problemAnalysisCause: record.problemAnalysisCause,
                            problemAnalysisDetail: record.problemAnalysisDetail,
                            item: {
                                id: record.id,
                                branch: record.branch,
                                refNo: record.refNo,
                                neoRefNo: record.neoRefNo,
                                productCode: record.productCode,
                                productName: record.productName,
                                customerName: record.customerName,
                                destinationCustomer: record.destinationCustomer,
                                quantity: record.quantity,
                                unit: record.unit || 'PCS',
                                priceBill: record.priceBill,
                                pricePerUnit: record.pricePerUnit || 0,
                                expiryDate: record.expiryDate,
                                hasCost: record.hasCost,
                                costAmount: record.costAmount,
                                costResponsible: record.costResponsible,
                                problemSource: record.problemSource || record.problemAnalysis || '-',
                                isFieldSettled: record.isFieldSettled,
                                fieldSettlementAmount: record.fieldSettlementAmount,
                                fieldSettlementEvidence: record.fieldSettlementEvidence,
                                fieldSettlementName: record.fieldSettlementName,
                                fieldSettlementPosition: record.fieldSettlementPosition
                            },
                            actionReject: record.actionReject,
                            actionRejectQty: record.actionRejectQty,
                            actionRejectSort: record.actionRejectSort,
                            actionRejectSortQty: record.actionRejectSortQty,
                            actionRework: record.actionRework,
                            actionReworkQty: record.actionReworkQty,
                            actionReworkMethod: record.actionReworkMethod,
                            actionSpecialAcceptance: record.actionSpecialAcceptance,
                            actionSpecialAcceptanceQty: record.actionSpecialAcceptanceQty,
                            actionSpecialAcceptanceReason: record.actionSpecialAcceptanceReason,
                            actionScrap: record.actionScrap,
                            actionScrapQty: record.actionScrapQty,
                            actionReplace: record.actionReplace,
                            actionReplaceQty: record.actionReplaceQty,
                            causePackaging: record.causePackaging,
                            causeTransport: record.causeTransport,
                            causeOperation: record.causeOperation,
                            causeEnv: record.causeEnv,
                            causeDetail: record.causeDetail,
                            preventionDetail: record.preventionDetail,
                            preventionDueDate: '', responsiblePerson: '', responsiblePosition: '',
                            qaAccept: record.isRecordOnly || false, qaReject: false, qaReason: record.isRecordOnly ? 'บันทึกเป็นสถิติเท่านั้น' : '',
                            dueDate: '', approver: '', approverPosition: '', approverDate: '',
                            status: record.isRecordOnly ? 'Closed' : 'Open'
                        };

                        // Sanitize NCR Record as well
                    const sanitizedNCR = JSON.parse(JSON.stringify(ncrRecord));
                    await addNCRReport(sanitizedNCR);
                    successCount++;
                }
            }

            if (successCount > 0) {
                await Swal.fire({
                    icon: 'success',
                    title: 'บันทึกสำเร็จ',
                    text: `บันทึกรายการเรียบร้อย! ระบบจะนำคุณไปยังขั้นตอนถัดไป`,
                    timer: 2000,
                    showConfirmButton: false
                });

                setFormData(initialFormState);
                setRequestItems([]);
                setCustomProblemType('');
                setCustomRootCause('');
                setIsCustomBranch(false);
                setIsCustomBranch(false);
                setActiveStep(2);

                if (systemConfig.telegram?.enabled && systemConfig.telegram.chatId) {
                    const isNCR = itemsToProcess.some(i => i.documentType === 'NCR' || !!i.ncrNumber);

                    // Common Data (Take from first item or formData)
                    const firstItem = itemsToProcess[0];
                    const msgDate = new Date().toLocaleString('th-TH');
                    const branch = firstItem.branch || '-';
                    const founder = firstItem.founder || '-';
                    const customerName = firstItem.customerName || '-';
                    const destCustomer = firstItem.destinationCustomer || '-';
                    const neoRef = firstItem.neoRefNo || '-';
                    const refNo = firstItem.refNo || '-';
                    const docNo = isNCR ? (firstItem.ncrNumber || 'NCR-NEW') : (firstItem.collectionOrderId || 'COL-NEW');
                    const problemDetail = firstItem.problemDetail || firstItem.reason || '-';
                    const qty = itemsToProcess.reduce((acc, i) => acc + (i.quantity || 0), 0);
                    const problemSource = firstItem.problemSource || firstItem.problemAnalysis || '-';

                    // Process Checkboxes (using first item as representative for batch)
                    const item = firstItem;
                    const problemProcess = [
                        item.problemDamaged && 'ชำรุด', item.problemDamagedInBox && 'ชำรุดในกล่อง', item.problemLost && 'สูญหาย',
                        item.problemMixed && 'สินค้าสลับ', item.problemWrongInv && 'สินค้าไม่ตรง INV', item.problemLate && 'ส่งช้า',
                        item.problemDuplicate && 'ส่งซ้ำ', item.problemWrong && 'ส่งผิด', item.problemIncomplete && 'ส่งของไม่ครบ',
                        item.problemOver && 'ส่งของเกิน', item.problemWrongInfo && 'ข้อมูลผิด', item.problemShortExpiry && 'สินค้าอายุสั้น',
                        item.problemTransportDamage && 'สินค้าเสียหายบนรถ', item.problemAccident && 'อุบัติเหตุ', item.problemPOExpired && 'PO. หมดอายุ',
                        item.problemNoBarcode && 'บาร์โค๊ตไม่ขึ้น', item.problemNotOrdered && 'ไม่ได้สั่งสินค้า', item.problemOther && `อื่นๆ (${item.problemOtherText})`
                    ].filter(Boolean).join(', ');

                    const costInfo = item.hasCost
                        ? `ใช่ (Amount: ${item.costAmount} บาท, Resp: ${item.costResponsible})`
                        : 'ไม่ระบุ';

                    const fieldSettlementInfo = item.isFieldSettled
                        ? `จบงานหน้างาน (จ่าย: ${item.fieldSettlementAmount} บาท, ผู้รับผิดชอบ: ${item.fieldSettlementName} - ${item.fieldSettlementPosition})`
                        : 'ไม่มี';


                    const headerTitle = isNCR ? '🚨 NCR Report (New)' : '📦 Collection Report (New)';

                    const detailedMessage = `<b>${headerTitle} [${docNo}]</b>
----------------------------------
<b>วันที่ :</b> ${msgDate}
<b>สาขา :</b> ${branch}
<b>ผู้พบปัญหา (Founder) :</b> ${founder}
<b>ลูกค้า / ลูกค้าปลายทาง :</b> ${customerName} / ${destCustomer}
<b>Neo Ref No. :</b> ${neoRef}
<b>เลขที่บิล / Ref No. :</b> ${refNo}
<b>เลขที่เอกสาร (เลข R) :</b> ${isNCR ? '-' : docNo}
<b>รายละเอียดของปัญหา :</b> ${problemDetail}
<b>จำนวนสินค้า :</b> ${qty} ${firstItem.unit || 'ชิ้น'} ${itemsToProcess.length > 1 ? `(รวม ${itemsToProcess.length} รายการ)` : ''}
<b>วิเคราะห์ปัญหาเกิดจาก :</b> ${problemSource}
<b>พบปัญหาที่กระบวนการ :</b> ${problemProcess || '-'}
${item.isRecordOnly ? '<b>🔹 บันทึกข้อมูลเพื่อเป็นสถิติเท่านั้น (Record Only)</b>\n' : ''}<b>การติดตามค่าใช้จ่าย :</b> ${costInfo}
<b>Field Settlement :</b> ${fieldSettlementInfo}
----------------------------------
🔗 <i>Status: ${item.isRecordOnly ? 'Closed/Completed' : 'Requested'}</i>`;

                    await sendTelegramMessage(systemConfig.telegram.botToken, systemConfig.telegram.chatId, detailedMessage);
                }
            }
        } catch (error) {
            console.error("Submission error:", error);
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่',
                confirmButtonColor: '#d33'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // STEP 2: Handle Logistics Branching (DEBUGGED & ROBUST)
    const handleLogisticsSubmit = async (selectedIds: string[], routeType: 'Hub' | 'Direct', transportInfo: TransportInfo) => {
        try {
            console.log(`[Logistics] HandleSubmit Called. IDs: ${selectedIds.length}, Route: ${routeType}`);

            if (!selectedIds || selectedIds.length === 0) {
                Swal.fire({
                    icon: 'warning',
                    title: 'ไม่พบรายการที่เลือก',
                    text: 'กรุณาเลือกรายการอย่างน้อย 1 รายการ',
                });
                return;
            }

            const destination = transportInfo.destination || (routeType === 'Hub' ? 'Hub (Nakhon Sawan)' : 'Unknown');

            // Clean transport info
            const cleanDriver = transportInfo.transportCompany === 'รถบริษัท' ? transportInfo.driverName : '-';
            const cleanPlate = transportInfo.transportCompany === 'รถบริษัท' ? transportInfo.plateNumber : '-';
            const cleanCompany = transportInfo.transportCompany === 'รถบริษัท' ? 'รถบริษัท' : transportInfo.transportCompany;

            const transportNote = `[Transport] Driver: ${cleanDriver}, Plate: ${cleanPlate}, Company: ${cleanCompany} | Dest: ${destination}`;

            // Construct Payload
            const updatePayload: Partial<ReturnRecord> = routeType === 'Hub'
                ? {
                    status: 'NCR_InTransit',
                    notes: transportNote,
                    dispositionRoute: destination,
                    dateInTransit: new Date().toISOString(),
                    transportPlate: cleanPlate,
                    transportDriver: cleanDriver,
                    transportCompany: cleanCompany,
                    disposition: null
                }
                : {
                    status: 'DirectReturn',
                    notes: transportNote,
                    dispositionRoute: destination,
                    disposition: 'RTV',
                    destinationCustomer: destination,
                    dateInTransit: new Date().toISOString(),
                    transportPlate: cleanPlate,
                    transportDriver: cleanDriver,
                    transportCompany: cleanCompany
                };

            // Force finding items from current state
            const selectedItems = items.filter(i => selectedIds.includes(String(i.id)));

            if (!selectedItems || selectedItems.length === 0) {
                console.error("Critical Error: Items not found for IDs:", selectedIds);
                Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    text: `ไม่พบข้อมูลสินค้าที่เลือกในระบบ\nSelected: ${selectedIds.join(', ')}`,
                });
                return;
            }

            // Set Pending State & Open Doc Modal for Confirmation

            // Set Pending State & Open Doc Modal for Confirmation
            setPendingLogisticsTx({
                ids: selectedIds,
                updatePayload
            });

            // Setup Doc Generator (Return Note / RTV Template)
            const docTitleTH = routeType === 'Hub' ? 'ใบนำส่งสินค้าเข้า Hub (Transfer Note)' : 'ใบส่งคืนสินค้า (Return Note)';
            const docTitleEN = routeType === 'Hub' ? 'TRANSFER NOTE' : 'RETURN NOTE';
            setDocConfig(prev => ({ ...prev, titleTH: docTitleTH, titleEN: docTitleEN }));

            // Critical: Ensure docData is set before Modal opens
            // 'RTV' is used as a generic template for Internal Transfer as well (using same layout)
            const docDataPayload = { type: 'RTV' as DispositionAction, items: selectedItems };
            setDocData(docDataPayload);

            setIncludeVat(true);
            setIncludeDiscount(false);
            setDiscountRate(0);
            setIsDocEditable(false);

            // Force Modal Open immediately
            console.log("Opening Document Modal for Logistics...");
            setShowDocModal(true);

        } catch (error) {
            console.error("HandleLogisticsSubmit Error:", error);
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาดในระบบ',
                text: String(error),
            });
        }
    };

    const handleIntakeReceive = async (id: string) => {
        const item = items.find(i => i.id === id);
        if (!item) return;

        const today = new Date().toISOString().split('T')[0];

        // Check for Collection Item (COL/RMA ID)
        const isCollectionItem = (
            item.refNo?.startsWith('R-') || item.refNo?.startsWith('COL-') || item.refNo?.startsWith('RT-') ||
            item.neoRefNo?.startsWith('R-') || item.neoRefNo?.startsWith('COL-')
        );

        if (isCollectionItem) {
            await updateReturnRecord(id, {
                status: 'Graded',
                dateReceived: today,
                dateGraded: today,
                disposition: 'RTV',
                condition: 'Good',
                notes: (item.notes || '') + ' [Auto-Pass QC: Collection Item]'
            });

            // TELEGRAM NOTIFICATION: Received at Hub (COL)
            if (systemConfig.telegram?.enabled && systemConfig.telegram.chatId) {
                const message = formatStatusUpdateMessage('📍 รับสินค้าเข้า HUB', item, 1, { received: true });
                sendTelegramMessage(systemConfig.telegram.botToken, systemConfig.telegram.chatId, message);
            }

            await Swal.fire({
                icon: 'success',
                title: 'รับสินค้าเรียบร้อย!',
                text: 'รายการ Collection ข้ามขั้นตอน QC ไปยังเอกสารส่งคืน',
                timer: 2000,
                showConfirmButton: false
            });
        } else {
            // Standard Flow -> Go to QC
            await updateReturnRecord(id, { status: 'ReceivedAtHub', dateReceived: today });

            // TELEGRAM NOTIFICATION: Received at Hub (NCR)
            if (systemConfig.telegram?.enabled && systemConfig.telegram.chatId) {
                const message = formatStatusUpdateMessage('📍 รับสินค้าเข้า HUB', item, 1, { received: true });
                sendTelegramMessage(systemConfig.telegram.botToken, systemConfig.telegram.chatId, message);
            }
        }
    };

    const handleQCSubmit = async () => {
        if (!qcSelectedItem || !selectedDisposition) return;
        if (!qcSelectedItem.condition || qcSelectedItem.condition === 'Unknown') {
            Swal.fire('กรุณาระบุสภาพสินค้า', '', 'warning');
            return;
        }
        const today = new Date().toISOString().split('T')[0];
        const success = await updateReturnRecord(qcSelectedItem.id, {
            condition: qcSelectedItem.condition,
            disposition: selectedDisposition,
            status: 'QCPassed',
            dateGraded: today,
            dispositionRoute: dispositionDetails.route,
            sellerName: dispositionDetails.sellerName,
            contactPhone: dispositionDetails.contactPhone,
            internalUseDetail: dispositionDetails.internalUseDetail,
            claimCompany: dispositionDetails.claimCompany,
            claimCoordinator: dispositionDetails.claimCoordinator,
            claimPhone: dispositionDetails.claimPhone
        });

        if (success) {
            setQcSelectedItem(null);
            setSelectedDisposition(null);
            setCustomInputType(null);
            setIsCustomRoute(false);
            Swal.fire({
                icon: 'success',
                title: 'บันทึกผล QC เรียบร้อย',
                text: 'Ready for Docs',
                timer: 1500,
                showConfirmButton: false
            });
        }
    };

    const handleSplitSubmit = async () => {
        const currentQty = qcSelectedItem?.quantity || 0;
        const totalAvailable = isBreakdownUnit ? (currentQty * conversionRate) : currentQty;

        if (!Number.isInteger(splitQty)) {
            Swal.fire('กรุณาระบุจำนวนเป็นจำนวนเต็ม', '', 'warning');
            return;
        }

        if (!qcSelectedItem || splitQty <= 0 || splitQty >= totalAvailable) {
            Swal.fire('จำนวนไม่ถูกต้อง', `จำนวนที่แยกต้องมากกว่า 0 และน้อยกว่าจำนวนทั้งหมด (${totalAvailable})`, 'warning');
            return;
        }
        if (!qcSelectedItem.condition || qcSelectedItem.condition === 'Unknown') {
            Swal.fire('กรุณาระบุสภาพสินค้าหลัก', '', 'warning');
            return;
        }
        if (!selectedDisposition) {
            Swal.fire('กรุณาเลือกการตัดสินใจ (Disposition)', '', 'warning');
            return;
        }

        const currentPriceBill = qcSelectedItem.priceBill || 0;
        const pricePerUnit = qcSelectedItem.pricePerUnit || (currentPriceBill / (qcSelectedItem.quantity || 1));

        let unitPriceForCalc = pricePerUnit;
        if (isBreakdownUnit && conversionRate > 1) {
            unitPriceForCalc = pricePerUnit / conversionRate;
        }

        const finalUnit = isBreakdownUnit ? (newUnitName || 'Sub-unit') : qcSelectedItem.unit;

        const mainQty = totalAvailable - splitQty;
        const mainBill = mainQty * unitPriceForCalc;
        const splitBill = splitQty * unitPriceForCalc;

        const currentPriceSell = qcSelectedItem.priceSell || 0;
        const priceSellPerUnit = currentPriceSell / (qcSelectedItem.quantity || 1);
        const unitSellPriceForCalc = (isBreakdownUnit && conversionRate > 1) ? (priceSellPerUnit / conversionRate) : priceSellPerUnit;
        const mainSell = mainQty * unitSellPriceForCalc;
        const splitSell = splitQty * unitSellPriceForCalc;

        const today = new Date().toISOString().split('T')[0];

        const updateMainSuccess = await updateReturnRecord(qcSelectedItem.id, {
            quantity: mainQty,
            unit: finalUnit,
            priceBill: mainBill,
            pricePerUnit: unitPriceForCalc,
            priceSell: mainSell,
            condition: qcSelectedItem.condition,
            disposition: selectedDisposition,
            status: 'QCPassed',
            dateGraded: today,
            dispositionRoute: dispositionDetails.route,
            sellerName: dispositionDetails.sellerName,
            contactPhone: dispositionDetails.contactPhone,
            internalUseDetail: dispositionDetails.internalUseDetail,
            claimCompany: dispositionDetails.claimCompany,
            claimCoordinator: dispositionDetails.claimCoordinator,
            claimPhone: dispositionDetails.claimPhone
        });

        const splitId = `${qcSelectedItem.id}-S${Math.floor(Math.random() * 100)}`;
        const splitStatus = splitDisposition ? 'QCPassed' : 'ReceivedAtHub';

        const splitItem: ReturnRecord = {
            ...qcSelectedItem,
            id: splitId,
            quantity: splitQty,
            unit: finalUnit,
            priceBill: splitBill,
            pricePerUnit: unitPriceForCalc,
            priceSell: splitSell,
            condition: splitCondition,
            status: splitStatus,
            refNo: `${qcSelectedItem.refNo} (Split)`,
            dateReceived: today,
        };

        if (splitDisposition) {
            splitItem.disposition = splitDisposition;
            splitItem.dateGraded = today;
        } else {
            splitItem.disposition = undefined;
            splitItem.dateGraded = undefined;
        }

        const createSplitSuccess = await addReturnRecord(splitItem);

        if (updateMainSuccess && createSplitSuccess) {
            setQcSelectedItem(null);
            setSelectedDisposition(null);
            setCustomInputType(null);
            setIsCustomRoute(false);
            setShowSplitMode(false);
            setSplitQty(0);
            setIsBreakdownUnit(false);
            setConversionRate(1);
            setNewUnitName('');
            setSplitDisposition(null);
            Swal.fire({
                icon: 'success',
                title: 'ดำเนินการแยกรายการเรียบร้อย',
                timer: 1500,
                showConfirmButton: false
            });
        } else {
            Swal.fire('เกิดข้อผิดพลาดในการแยกรายการ', '', 'error');
        }
    };

    const toggleSplitMode = () => {
        if (!showSplitMode) {
            setSplitQty(0);
            setSplitDisposition(null);
            setSplitCondition('New');
            setIsBreakdownUnit(false);
            setConversionRate(1);
            setNewUnitName('');
        }
        setShowSplitMode(!showSplitMode);
    };

    const handlePrintClick = (status: DispositionAction, list: ReturnRecord[]) => {
        if (!list || list.length === 0) {
            Swal.fire('ไม่พบรายการสินค้าในสถานะนี้', '', 'info');
            return;
        }
        setSelectionStatus(status);
        setSelectionItems(list);
        setSelectedItemIds(new Set(list.map(i => i.id)));
        setShowSelectionModal(true);
    };

    const handleGenerateDoc = () => {
        if (!selectionStatus) return;
        const selectedList = selectionItems.filter(item => selectedItemIds.has(item.id));
        if (selectedList.length === 0) {
            Swal.fire('กรุณาเลือกรายการสินค้าอย่างน้อย 1 รายการก่อนสร้างเอกสาร', '', 'warning');
            return;
        }
        const details = getISODetails(selectionStatus);
        setDocConfig(prev => ({ ...prev, titleTH: details.th, titleEN: details.en }));
        setDocData({ type: selectionStatus, items: selectedList });
        setIncludeVat(true);
        const isRestock = selectionStatus === 'Restock';
        setIncludeDiscount(isRestock);
        setDiscountRate(isRestock ? 30 : 0);
        setShowSelectionModal(false);
        setShowDocModal(true);
        setIsDocEditable(false);
    };

    const handleConfirmDocGeneration = async () => {
        if (!docData) return;
        if (isSubmittingDoc) return;
        setIsSubmittingDoc(true);

        const today = new Date().toISOString().split('T')[0];

        try {
            // Logistics Pending Check
            if (pendingLogisticsTx) {
                let successCount = 0;
                const affectedItems = items.filter(i => pendingLogisticsTx.ids.includes(i.id));

                for (const id of pendingLogisticsTx.ids) {
                    const success = await updateReturnRecord(id, {
                        ...pendingLogisticsTx.updatePayload
                    });
                    if (success) successCount++;
                }

                if (successCount > 0) {
                    // Send Notification
                    if (systemConfig.telegram?.enabled && systemConfig.telegram.chatId && affectedItems.length > 0) {
                        const isDirect = pendingLogisticsTx.updatePayload.status === 'DirectReturn';
                        const typeLabel = isDirect ? '🚛 ส่งคืนตรง (Direct Return)' : '🚚 ส่งเข้า HUB (นครสวรรค์)';
                        const head = affectedItems[0];

                        const message = formatStatusUpdateMessage(typeLabel, head, affectedItems.length, {
                            plateNumber: pendingLogisticsTx.updatePayload.transportPlate,
                            driverName: pendingLogisticsTx.updatePayload.transportDriver,
                            destination: pendingLogisticsTx.updatePayload.dispositionRoute
                        });
                        sendTelegramMessage(systemConfig.telegram.botToken, systemConfig.telegram.chatId, message);
                    }

                    Swal.fire({
                        icon: 'success',
                        title: 'ดำเนินการสำเร็จ',
                        text: `สร้างเอกสารและบันทึกรายการเรียบร้อย! (${successCount} รายการ)`,
                        timer: 2000,
                        showConfirmButton: false
                    });
                    setShowDocModal(false);
                    setPendingLogisticsTx(null);
                } else {
                    Swal.fire('ไม่สามารถบันทึกรายการได้ (Update Failed)', 'กรุณาลองใหม่อีกครั้ง หรือตรวจสอบ Console', 'error');
                }
                return;
            }

            // Standard Hub Doc Generation
            let successCount = 0;
            for (const item of docData.items) {
                // Determine correct status based on document type
                const isNCR = item.documentType === 'NCR' || !!item.ncrNumber || item.status.startsWith('NCR_');
                const targetStatus = isNCR ? 'NCR_Documented' : 'COL_Documented';

                const success = await updateReturnRecord(item.id, {
                    status: targetStatus,
                    dateDocumented: today
                });
                if (success) successCount++;
            }

            if (successCount > 0) {
                Swal.fire({
                    icon: 'success',
                    title: 'สร้างเอกสารเรียบร้อย',
                    text: `${successCount} รายการ -> ไปที่ขั้นตอน "ปิดงาน"`,
                    timer: 2000,
                    showConfirmButton: false
                });
                setShowDocModal(false);
            }
        } catch (error) {
            console.error("Document Generation Error:", error);
            Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถสร้างเอกสารได้ กรุณาลองใหม่', 'error');
        } finally {
            setIsSubmittingDoc(false);
        }
    };

    const handleUpdateDocItem = async (id: string, updates: Partial<ReturnRecord>) => {
        await updateReturnRecord(id, updates);
        setDocData(prev => {
            if (!prev) return null;
            return {
                ...prev,
                items: prev.items.map(item => item.id === id ? { ...item, ...updates } : item)
            };
        });
    };



    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedItemIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedItemIds(newSet);
    };

    return {
        state: {
            activeStep, isCustomBranch, qcSelectedItem, customInputType,
            showSplitMode, splitQty, splitCondition, isBreakdownUnit, conversionRate, newUnitName, splitDisposition,
            selectedDisposition, dispositionDetails, isCustomRoute,
            showDocModal, docData, includeVat, vatRate, includeDiscount, discountRate, isDocEditable, docConfig,
            showSelectionModal, selectionStatus, selectionItems, selectedItemIds,
            formData, requestItems, customProblemType, customRootCause,
            docSelectedItem, showStep4SplitModal,
            isSubmittingDoc
        },
        derived: {
            uniqueCustomers, uniqueDestinations, uniqueFounders, uniqueProductCodes, uniqueProductNames,
            step2Items, step3Items, step4Items, step5Items, step6Items, step7Items, step8Items,
            ncrStep2Items,
            completedItems,
            logisticItems, hubReceiveItems, hubDocItems, closureItems,
            requestedItems, receivedItems, gradedItems, docItems, processedItems: step7Items
        },
        actions: {
            setActiveStep, setIsCustomBranch, setFormData, setRequestItems,
            handleImageUpload, handleRemoveImage, handleAddItem, handleRemoveItem, handleRequestSubmit,

            handleLogisticsSubmit,

            handleIntakeReceive, selectQCItem, handleConditionSelect, setQcSelectedItem, setCustomInputType,
            setSelectedDisposition, setIsCustomRoute, handleDispositionDetailChange, handleQCSubmit,
            setShowSplitMode, setIsBreakdownUnit, setConversionRate, setNewUnitName, setSplitQty, setSplitCondition, setSplitDisposition, handleSplitSubmit,
            toggleSplitMode,
            handlePrintClick, toggleSelection, setShowSelectionModal,
            handleGenerateDoc, setIncludeVat, setVatRate, setIncludeDiscount, setDiscountRate, setIsDocEditable, setDocConfig, setShowDocModal,
            handleConfirmDocGeneration, handleUpdateDocItem,

            // Step 4 Split Actions
            setDocSelectedItem, setShowStep4SplitModal,
            handleDocItemClick: (item: ReturnRecord) => {
                setDocSelectedItem(item);
                setShowStep4SplitModal(true);
            },
            handleStep4SplitSubmit: async (_splitQty: number, _newDisposition: DispositionAction) => {
                void _splitQty;
                void _newDisposition;
                if (!docSelectedItem) return;
                // Removed unused variables


                // Add split logic logic if needed, previously was empty in some contexts but let's keep it safe
                Swal.fire('Split functionality pending', 'This feature is pending implementation for Step 4 direct usage.', 'info');
            }
        }
    };
};
