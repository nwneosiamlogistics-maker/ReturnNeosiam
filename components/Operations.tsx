
import React, { useState, useEffect } from 'react';
import { useData } from '../DataContext';
import { BRANCH_LIST, RETURN_ROUTES } from '../constants';
import { ReturnRecord, ItemCondition, DispositionAction } from '../types';
import { Scan, Box, Truck, RotateCcw, Trash2, Home, CheckCircle, ArrowRight, ClipboardList, PlusCircle, Save, Clock, Search, AlertCircle, XCircle, Edit3, ShieldCheck, User, Phone, Briefcase, Building2, Printer, FileText, X, PenTool, CheckSquare, Square, AlertTriangle, HelpCircle, Settings, Wrench, Package, Filter, LayoutGrid, FileInput, Check } from 'lucide-react';

const PROBLEM_TYPES = ['ชำรุด', 'สูญหาย', 'สินค้าสลับ', 'สินค้าไม่ตรง INV.'];
const ROOT_CAUSES = ['บรรจุภัณฑ์', 'การขนส่ง', 'ปฏิบัติงาน', 'สิ่งแวดล้อม'];

interface OperationsProps {
  initialData?: Partial<ReturnRecord> | null;
  onClearInitialData?: () => void;
}

const Operations: React.FC<OperationsProps> = ({ initialData, onClearInitialData }) => {
  const { items, addReturnRecord, updateReturnRecord } = useData();
  
  // New 5-Step Workflow
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [isCustomBranch, setIsCustomBranch] = useState(false);
  
  // QC State
  const [qcSelectedItem, setQcSelectedItem] = useState<ReturnRecord | null>(null);
  const [customInputType, setCustomInputType] = useState<'Good' | 'Bad' | null>(null); 
  
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

  // Document Selection State (New)
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [selectionStatus, setSelectionStatus] = useState<DispositionAction | null>(null);
  const [selectionItems, setSelectionItems] = useState<ReturnRecord[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  // Document Editable Configuration
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

  // Manual Intake Form State
  const initialFormState: Partial<ReturnRecord> = {
    branch: 'พิษณุโลก',
    date: new Date().toISOString().split('T')[0],
    quantity: 1,
    unit: 'ชิ้น',
    priceBill: 0,
    priceSell: 0,
    status: 'Requested',
    disposition: 'Pending',
    condition: 'Unknown',
    productCode: '',
    expiryDate: '',
    notes: '',
    problemType: '',
    rootCause: '',
    ncrNumber: '',
    actionReject: false,
    actionRejectQty: 0,
    actionRejectSort: false,
    actionRejectSortQty: 0,
    actionRework: false,
    actionReworkQty: 0,
    actionReworkMethod: '',
    actionSpecialAcceptance: false,
    actionSpecialAcceptanceQty: 0,
    actionSpecialAcceptanceReason: '',
    actionScrap: false,
    actionScrapQty: 0,
    actionScrapReplace: false,
    actionScrapReplaceQty: 0
  };
  const [formData, setFormData] = useState<Partial<ReturnRecord>>(initialFormState);
  const [customProblemType, setCustomProblemType] = useState('');
  const [customRootCause, setCustomRootCause] = useState('');

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
        setQcSelectedItem({...qcSelectedItem, condition: ''});
    } else {
        setCustomInputType(null);
        setQcSelectedItem({...qcSelectedItem, condition});
    }
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalProblemType = formData.problemType === 'Other' ? customProblemType : formData.problemType;
    const finalRootCause = formData.rootCause === 'Other' ? customRootCause : formData.rootCause;

    const newItem: ReturnRecord = {
      ...formData as ReturnRecord,
      id: `RT-${new Date().getFullYear()}-${Math.floor(Math.random() * 100000)}`,
      amount: (formData.quantity || 0) * (formData.priceBill || 0),
      reason: formData.notes || 'แจ้งคืนสินค้า',
      status: 'Requested',
      dateRequested: formData.date,
      disposition: 'Pending',
      condition: 'Unknown',
      productName: formData.productName || 'Unknown Product',
      productCode: formData.productCode || 'N/A',
      customerName: formData.customerName || 'Unknown Customer',
      category: 'General',
      problemType: finalProblemType,
      rootCause: finalRootCause,
      ncrNumber: formData.ncrNumber
    };
    
    const success = await addReturnRecord(newItem);
    
    if (success) {
        alert(`บันทึกคำขอคืนเรียบร้อย! รหัส: ${newItem.id} \nรายการจะไปรอที่ขั้นตอน "รับสินค้าเข้า"`);
        setFormData(initialFormState); 
        setCustomProblemType('');
        setCustomRootCause('');
        setIsCustomBranch(false);
    } else {
        alert(`บันทึกไม่สำเร็จ! กรุณาตรวจสอบสิทธิ์การใช้งาน (Permission Denied)`);
        // Do not clear form on failure
    }
  };

  const handleIntakeReceive = async (id: string) => {
      const today = new Date().toISOString().split('T')[0];
      await updateReturnRecord(id, { status: 'Received', dateReceived: today });
  };

  const handleQCSubmit = async () => {
    if (!qcSelectedItem || !selectedDisposition) return;
    if (!qcSelectedItem.condition || qcSelectedItem.condition === 'Unknown') {
        alert("กรุณาระบุสภาพสินค้า");
        return;
    }

    const today = new Date().toISOString().split('T')[0];

    const success = await updateReturnRecord(qcSelectedItem.id, {
          condition: qcSelectedItem.condition, 
          disposition: selectedDisposition, 
          status: 'Graded', 
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
        alert('บันทึกผลการตรวจสอบคุณภาพเรียบร้อย (Ready for Documentation)');
    } else {
        alert('บันทึกผล QC ไม่สำเร็จ (Permission Denied)');
    }
  };

  const handlePrintClick = (status: DispositionAction, list: ReturnRecord[]) => {
      if (list.length === 0) {
          alert('ไม่พบรายการสินค้าในสถานะนี้');
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
          alert("กรุณาเลือกรายการสินค้าอย่างน้อย 1 รายการ");
          return;
      }
      const details = getISODetails(selectionStatus);
      setDocConfig(prev => ({ ...prev, titleTH: details.th, titleEN: details.en }));
      setDocData({ type: selectionStatus, items: selectedList });
      setIncludeVat(true);
      setShowSelectionModal(false); 
      setShowDocModal(true);
      setIsDocEditable(false);
  };

  const handleConfirmDocGeneration = async () => {
      if (!docData) return;
      const today = new Date().toISOString().split('T')[0];
      
      let successCount = 0;
      // Update all items
      for (const item of docData.items) {
          const success = await updateReturnRecord(item.id, { status: 'Documented', dateDocumented: today });
          if (success) successCount++;
      }

      if (successCount > 0) {
          alert(`สร้างเอกสารและบันทึกสถานะเรียบร้อย ${successCount} รายการ\nรายการถูกส่งไปยังขั้นตอน "ปิดงาน/ตรวจสอบผล"`);
          setShowDocModal(false);
      } else {
          alert('บันทึกสถานะไม่สำเร็จ (Permission Denied)');
      }
  };

  const handleCompleteJob = async (id: string) => {
      const today = new Date().toISOString().split('T')[0];
      await updateReturnRecord(id, { status: 'Completed', dateCompleted: today });
  };

  const toggleSelection = (id: string) => {
      const newSet = new Set(selectedItemIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedItemIds(newSet);
  };

  // Same Helper Functions
  const getISODetails = (type: DispositionAction) => {
      switch(type) {
          case 'RTV': return { code: 'FM-LOG-05', rev: '00', th: 'ใบส่งคืนสินค้า', en: 'GOODS RETURN NOTE' };
          case 'Restock': return { code: 'FM-SAL-02', rev: '00', th: 'แบบขออนุมัติจำหน่ายสินค้าสภาพดี', en: 'SALES DISPOSAL APPROVAL FORM' };
          case 'Claim': return { code: 'FM-CLM-01', rev: '00', th: 'ใบนำส่งสินค้าเคลมประกัน', en: 'INSURANCE CLAIM DELIVERY NOTE' };
          case 'InternalUse': return { code: 'FM-ADM-09', rev: '00', th: 'ใบเบิกสินค้าใช้ภายใน', en: 'INTERNAL REQUISITION FORM' };
          case 'Recycle': return { code: 'FM-AST-04', rev: '00', th: 'แบบขออนุมัติตัดจำหน่าย/ทำลายทรัพย์สิน', en: 'ASSET WRITE-OFF / SCRAP AUTHORIZATION FORM' };
          default: return { code: 'FM-GEN-00', rev: '00', th: 'เอกสารจัดการสินค้าคืน', en: 'RETURN MANAGEMENT DOCUMENT' };
      }
  };

  const calculateTotal = (items: ReturnRecord[], hasVat: boolean) => {
      const subtotal = items.reduce((acc, item) => acc + ((item.priceBill || 0) * item.quantity), 0);
      const vat = hasVat ? subtotal * 0.07 : 0;
      const net = subtotal + vat;
      return { subtotal, vat, net };
  };

  // Filter Items from Context
  const requestedItems = items.filter(i => i.status === 'Requested');
  const receivedItems = items.filter(i => i.status === 'Received');
  const gradedItems = items.filter(i => i.status === 'Graded'); 
  const documentedItems = items.filter(i => i.status === 'Documented');
  const completedItems = items.filter(i => i.status === 'Completed');

  const conditionLabels: Record<string, string> = {
    'New': 'สภาพดี (Good)',
    'BoxDamage': 'กล่องบุบ (Box Dmg)',
    'WetBox': 'ลังเปียก (Wet Box)',
    'LabelDefect': 'ฉลากลอก (Label)',
    'Expired': 'หมดอายุ (Expired)',
    'Damaged': 'ชำรุด/ซาก (Damaged)',
    'Defective': 'เสีย (Defective)'
  };

  const dispositionLabels: Record<string, string> = {
    'RTV': 'ส่งคืน (Return)',
    'Restock': 'ขาย (Sell)',
    'Recycle': 'ทิ้ง (Scrap)',
    'InternalUse': 'ใช้ภายใน (Internal)',
    'Claim': 'เคลมประกัน (Claim)'
  };

  const KanbanColumn = ({ title, status, icon: Icon, color }: { title: string, status: DispositionAction, icon: any, color: string }) => {
    const list = items.filter(i => i.disposition === status && i.status === 'Graded');
    return (
      <div className="flex-1 min-w-[280px] bg-slate-50 rounded-xl flex flex-col h-full border border-slate-200">
        <div className={`p-3 border-b border-slate-200 ${color} bg-opacity-10 rounded-t-xl flex items-center justify-between`}>
          <div className="flex items-center gap-2 font-bold text-slate-700">
             <Icon className={`w-4 h-4 ${color.replace('bg-', 'text-')}`} />
             {title}
          </div>
          <div className="flex items-center gap-2">
            <button 
                onClick={() => handlePrintClick(status, list)}
                className="p-1.5 hover:bg-white rounded-lg transition-colors text-slate-500 hover:text-slate-800"
                title="ออกเอกสาร (Generate Doc)"
            >
                <Printer className="w-4 h-4" />
            </button>
            <span className="bg-white px-2 py-0.5 rounded-full text-xs font-bold shadow-sm">{list.length}</span>
          </div>
        </div>
        <div className="p-2 space-y-2 overflow-y-auto flex-1">
           {list.map(item => (
             <div key={item.id} className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-1">
                   <span className="text-xs font-mono text-slate-400">{item.id}</span>
                   <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">รอเอกสาร</span>
                </div>
                <div className="text-xs text-blue-600 mb-0.5">{item.branch}</div>
                <h4 className="text-sm font-semibold text-slate-800 truncate">{item.productName}</h4>
                <div className="flex justify-between items-center mt-2">
                   <p className="text-xs text-slate-500 truncate max-w-[120px]">{item.condition}</p>
                   <span className="text-xs font-mono text-slate-400">{item.quantity} {item.unit}</span>
                </div>
                <div className="mt-1 pt-1 border-t border-slate-50 flex justify-end">
                    <span className="text-[10px] text-slate-400">QC: {item.dateGraded}</span>
                </div>
             </div>
           ))}
           {list.length === 0 && (
               <div className="text-center p-4 text-slate-400 text-xs italic">ไม่มีรายการรอออกเอกสาร</div>
           )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white relative">
      <div className="border-b border-slate-200 px-6 pt-4 bg-white shadow-sm z-10">
        <div className="flex gap-2 overflow-x-auto pb-0">
           <button onClick={() => setActiveStep(1)} className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap px-4 ${activeStep === 1 ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${activeStep === 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>1</span> แจ้งคืน (Key-in)
          </button>
          <button onClick={() => setActiveStep(2)} className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap px-4 ${activeStep === 2 ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${activeStep === 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>2</span> รับสินค้าเข้า (Intake) {requestedItems.length > 0 && <span className="bg-amber-500 text-white text-[10px] px-1.5 rounded-full">{requestedItems.length}</span>}
          </button>
          <button onClick={() => setActiveStep(3)} className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap px-4 ${activeStep === 3 ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${activeStep === 3 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>3</span> ตรวจสอบคุณภาพ (QC) {receivedItems.length > 0 && <span className="bg-amber-500 text-white text-[10px] px-1.5 rounded-full">{receivedItems.length}</span>}
          </button>
          <button onClick={() => setActiveStep(4)} className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap px-4 ${activeStep === 4 ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${activeStep === 4 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>4</span> ออกเอกสาร (Docs) {gradedItems.length > 0 && <span className="bg-amber-500 text-white text-[10px] px-1.5 rounded-full">{gradedItems.length}</span>}
          </button>
          <button onClick={() => setActiveStep(5)} className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap px-4 ${activeStep === 5 ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${activeStep === 5 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>5</span> ปิดงาน/รับคืนเรียบร้อย {documentedItems.length > 0 && <span className="bg-amber-500 text-white text-[10px] px-1.5 rounded-full">{documentedItems.length}</span>}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-slate-50/50">
        {/* STEP 1 */}
        {activeStep === 1 && (
          <div className="h-full overflow-auto p-6">
             <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
                 <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><FileInput className="w-6 h-6" /></div>
                    <div><h3 className="text-xl font-bold text-slate-800">1. แจ้งคืนสินค้า (Return Request)</h3><p className="text-sm text-slate-500">สำหรับสาขา: กรอกข้อมูลสินค้าที่ต้องการส่งคืนเพื่อสร้างคำขอเข้าระบบ</p></div>
                    {initialData?.ncrNumber && <div className="ml-auto bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold border border-orange-200">Auto-filled from NCR: {initialData.ncrNumber}</div>}
                 </div>
                 <form onSubmit={handleRequestSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">สาขาต้นทาง</label>
                            <select required value={isCustomBranch ? 'Other' : formData.branch} onChange={e => { const val = e.target.value; if (val === 'Other') { setIsCustomBranch(true); setFormData({...formData, branch: ''}); } else { setIsCustomBranch(false); setFormData({...formData, branch: val}); } }} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm">
                                {BRANCH_LIST.map(b => <option key={b} value={b}>{b}</option>)}
                                <option value="Other">อื่นๆ</option>
                            </select>
                            {isCustomBranch && <input type="text" placeholder="ระบุชื่อสาขา..." value={formData.branch} onChange={e => setFormData({...formData, branch: e.target.value})} className="w-full mt-2 p-2 border rounded-lg text-sm" />}
                        </div>
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">วันที่แจ้ง</label><input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" /></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">เลขที่เอกสารอ้างอิง</label><input type="text" required value={formData.refNo} onChange={e => setFormData({...formData,refNo: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" /></div>
                        <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">ชื่อลูกค้า</label><input type="text" required value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" /></div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                        <h4 className="text-sm font-bold text-slate-600 flex items-center gap-2"><Box className="w-4 h-4" /> ข้อมูลสินค้า</h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div><label className="text-xs text-slate-500 block mb-1">รหัสสินค้า</label><input type="text" required value={formData.productCode} onChange={e => setFormData({...formData, productCode: e.target.value})} className="w-full p-2 border rounded text-sm" /></div>
                            <div className="md:col-span-3"><label className="text-xs text-slate-500 block mb-1">ชื่อสินค้า</label><input type="text" required value={formData.productName} onChange={e => setFormData({...formData, productName: e.target.value})} className="w-full p-2 border rounded text-sm" /></div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                             <div><label className="text-xs text-slate-500 block mb-1">จำนวน</label><input type="number" required value={formData.quantity} onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})} className="w-full p-2 border rounded text-sm" /></div>
                             <div><label className="text-xs text-slate-500 block mb-1">หน่วย</label><input type="text" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full p-2 border rounded text-sm" /></div>
                             <div><label className="text-xs text-slate-500 block mb-1">วันหมดอายุ</label><input type="date" value={formData.expiryDate} onChange={e => setFormData({...formData, expiryDate: e.target.value})} className="w-full p-2 border rounded text-sm" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div><label className="text-xs text-slate-500 block mb-1">ราคาหน้าบิล</label><input type="number" value={formData.priceBill} onChange={e => setFormData({...formData, priceBill: parseFloat(e.target.value)})} className="w-full p-2 border rounded text-sm" /></div>
                             <div><label className="text-xs text-slate-500 block mb-1">ราคาขาย</label><input type="number" value={formData.priceSell} onChange={e => setFormData({...formData, priceSell: parseFloat(e.target.value)})} className="w-full p-2 border rounded text-sm" /></div>
                        </div>
                    </div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">หมายเหตุ/สาเหตุการคืน</label><textarea rows={2} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" placeholder="ระบุสาเหตุ..."></textarea></div>
                    <div className="flex justify-end pt-4 border-t border-slate-100">
                        <button type="submit" className="px-6 py-2.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md flex items-center gap-2"><Save className="w-4 h-4" /> ยืนยันคำขอคืน (Submit Request)</button>
                    </div>
                 </form>
             </div>
          </div>
        )}

        {/* STEP 2 */}
        {activeStep === 2 && (
          <div className="h-full overflow-auto p-6">
             <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex justify-between items-center"><h2 className="text-2xl font-bold text-slate-800">2. รับสินค้าเข้า (Intake)</h2><span className="text-slate-500 text-sm">รายการที่สาขาแจ้งเข้ามา รอการตรวจรับจริง</span></div>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold"><tr><th className="px-4 py-3">วันที่แจ้ง</th><th className="px-4 py-3">สาขา</th><th className="px-4 py-3">อ้างอิง/สินค้า</th><th className="px-4 py-3 text-right">จำนวน</th><th className="px-4 py-3 text-center">สถานะ</th><th className="px-4 py-3 text-center">Action</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {requestedItems.length === 0 ? (
                                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">ไม่มีรายการรอนำเข้า</td></tr>
                            ) : (
                                requestedItems.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 text-sm">{item.dateRequested || item.date}</td>
                                        <td className="px-4 py-3 text-sm">{item.branch}</td>
                                        <td className="px-4 py-3 text-sm"><div className="font-bold text-slate-800">{item.productName}</div><div className="text-xs text-slate-500">Ref: {item.refNo}</div></td>
                                        <td className="px-4 py-3 text-sm text-right font-mono">{item.quantity} {item.unit}</td>
                                        <td className="px-4 py-3 text-center"><span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs">Requested</span></td>
                                        <td className="px-4 py-3 text-center"><button onClick={() => handleIntakeReceive(item.id)} className="px-3 py-1.5 bg-green-600 text-white rounded shadow-sm hover:bg-green-700 text-xs font-bold flex items-center gap-1 mx-auto"><CheckCircle className="w-3 h-3" /> รับสินค้า (Receive)</button></td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
             </div>
          </div>
        )}

        {/* STEP 3, 4, 5 are same structure but using dynamic items and async handlers */}
        {activeStep === 3 && (
            <div className="h-full flex flex-col md:flex-row p-6 gap-6">
                <div className="w-full md:w-1/3 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center"><h3 className="font-bold text-slate-800 flex items-center gap-2"><Clock className="w-4 h-4 text-amber-500" /> รอตรวจสอบ (Received)</h3><span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-bold">{receivedItems.length}</span></div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {receivedItems.map(item => (
                            <div key={item.id} onClick={() => selectQCItem(item)} className={`p-3 rounded-xl border cursor-pointer transition-all ${qcSelectedItem?.id === item.id ? 'bg-blue-50 border-blue-500' : 'bg-white border-slate-200 hover:border-blue-300'}`}>
                                <div className="flex justify-between items-start mb-1"><span className="text-xs font-mono text-slate-500">{item.refNo}</span><span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 rounded">{item.branch}</span></div><h4 className="font-bold text-slate-800 text-sm mb-1">{item.productName}</h4><div className="text-xs text-slate-500">{item.quantity} {item.unit}</div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                    {qcSelectedItem ? (
                        <div className="flex-1 flex flex-col h-full">
                           <div className="p-6 border-b border-slate-100 bg-slate-50"><h2 className="text-2xl font-bold text-slate-800">{qcSelectedItem.productName}</h2><p className="text-sm text-slate-600">Ref: {qcSelectedItem.refNo} | Qty: {qcSelectedItem.quantity} {qcSelectedItem.unit}</p></div>
                           <div className="p-8 flex-1 overflow-auto">
                               <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <h4 className="font-bold text-slate-500 uppercase text-xs">1. ประเมินสภาพ (Grading)</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {['New', 'BoxDamage', 'WetBox', 'LabelDefect'].map(c => <button key={c} onClick={() => handleConditionSelect(c as ItemCondition)} className={`px-3 py-2 border rounded text-xs ${qcSelectedItem.condition === c ? 'bg-green-600 text-white' : 'bg-white'}`}>{conditionLabels[c] || c}</button>)}
                                            {['Expired', 'Damaged'].map(c => <button key={c} onClick={() => handleConditionSelect(c as ItemCondition)} className={`px-3 py-2 border rounded text-xs ${qcSelectedItem.condition === c ? 'bg-red-600 text-white' : 'bg-white'}`}>{conditionLabels[c] || c}</button>)}
                                            <button onClick={() => handleConditionSelect('Other', 'Good')} className={`px-3 py-2 border rounded text-xs ${customInputType === 'Good' ? 'bg-blue-600 text-white' : 'bg-white'}`}>อื่นๆ (ดี)</button><button onClick={() => handleConditionSelect('Other', 'Bad')} className={`px-3 py-2 border rounded text-xs ${customInputType === 'Bad' ? 'bg-red-600 text-white' : 'bg-white'}`}>อื่นๆ (เสีย)</button>
                                        </div>
                                         {customInputType && <input type="text" placeholder="ระบุสภาพสินค้า..." className="w-full p-2 border rounded text-sm mt-2" value={qcSelectedItem.condition || ''} onChange={(e) => setQcSelectedItem({...qcSelectedItem, condition: e.target.value})} />}
                                    </div>
                                    <div className="space-y-4">
                                        <h4 className="font-bold text-slate-500 uppercase text-xs">2. ตัดสินใจ (Disposition)</h4>
                                        <div className="grid grid-cols-2 gap-2">{['RTV', 'Restock', 'Recycle', 'InternalUse', 'Claim'].map(d => (<button key={d} onClick={() => setSelectedDisposition(d as DispositionAction)} className={`px-3 py-2 border rounded text-xs ${selectedDisposition === d ? 'bg-blue-600 text-white' : 'bg-white'}`}>{dispositionLabels[d] || d}</button>))}</div>
                                        {selectedDisposition === 'RTV' && <div className="mt-2 space-y-2"><label className="text-xs block mb-1">เลือกเส้นทาง:</label><select className="w-full border p-1 rounded text-sm" value={isCustomRoute ? 'Other' : dispositionDetails.route} onChange={e => { if(e.target.value === 'Other') { setIsCustomRoute(true); setDispositionDetails({...dispositionDetails, route: ''}); } else { setIsCustomRoute(false); setDispositionDetails({...dispositionDetails, route: e.target.value}); } }}><option value="">-- Select --</option>{RETURN_ROUTES.map(r => <option key={r} value={r}>{r}</option>)}<option value="Other">อื่นๆ</option></select>{isCustomRoute && <input type="text" placeholder="ระบุเส้นทาง..." className="w-full border p-1 rounded text-sm" value={dispositionDetails.route} onChange={e => setDispositionDetails({...dispositionDetails, route: e.target.value})} />}</div>}
                                        {selectedDisposition === 'Restock' && <div className="mt-2 space-y-2 p-3 bg-slate-50 rounded border"><input type="text" placeholder="ชื่อผู้ซื้อ" className="w-full border p-1 rounded text-sm" value={dispositionDetails.sellerName} onChange={e => setDispositionDetails({...dispositionDetails, sellerName: e.target.value})} /><input type="text" placeholder="เบอร์โทรศัพท์" className="w-full border p-1 rounded text-sm" value={dispositionDetails.contactPhone} onChange={e => setDispositionDetails({...dispositionDetails, contactPhone: e.target.value})} /></div>}
                                        {selectedDisposition === 'InternalUse' && <div className="mt-2 space-y-2 p-3 bg-slate-50 rounded border"><input type="text" placeholder="ระบุหน่วยงาน/ผู้เบิก" className="w-full border p-1 rounded text-sm" value={dispositionDetails.internalUseDetail} onChange={e => setDispositionDetails({...dispositionDetails, internalUseDetail: e.target.value})} /></div>}
                                        {selectedDisposition === 'Claim' && <div className="mt-2 space-y-2 p-3 bg-slate-50 rounded border"><input type="text" placeholder="บริษัทประกัน" className="w-full border p-1 rounded text-sm" value={dispositionDetails.claimCompany} onChange={e => setDispositionDetails({...dispositionDetails, claimCompany: e.target.value})} /><input type="text" placeholder="ผู้ประสานงาน" className="w-full border p-1 rounded text-sm" value={dispositionDetails.claimCoordinator} onChange={e => setDispositionDetails({...dispositionDetails, claimCoordinator: e.target.value})} /></div>}
                                    </div>
                               </div>
                               <button onClick={handleQCSubmit} disabled={!selectedDisposition || !qcSelectedItem.condition} className="mt-8 w-full py-3 bg-blue-600 text-white font-bold rounded-lg disabled:opacity-50">บันทึกผลการตรวจสอบ</button>
                           </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-400">เลือกรายการด้านซ้ายเพื่อเริ่มงาน</div>
                    )}
                </div>
            </div>
        )}

        {activeStep === 4 && (
             <div className="h-full overflow-x-auto pb-2 p-6">
                <div className="flex h-full gap-4 min-w-[1500px]">
                   <KanbanColumn title="ส่งคืน (Return)" status="RTV" icon={Truck} color="bg-amber-500" />
                   <KanbanColumn title="ขาย (Sell/Restock)" status="Restock" icon={RotateCcw} color="bg-green-500" />
                   <KanbanColumn title="เคลมประกัน (Claim)" status="Claim" icon={ShieldCheck} color="bg-blue-500" />
                   <KanbanColumn title="ใช้ภายใน (Internal)" status="InternalUse" icon={Home} color="bg-purple-500" />
                   <KanbanColumn title="ทิ้ง/ทำลาย (Scrap)" status="Recycle" icon={Trash2} color="bg-red-500" />
                </div>
             </div>
        )}

        {activeStep === 5 && (
            <div className="h-full overflow-auto p-6">
                 <div className="max-w-6xl mx-auto space-y-6">
                     <h2 className="text-2xl font-bold text-slate-800">5. ปิดงาน/ตรวจสอบผล (Completion)</h2>
                     <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold"><tr><th className="px-4 py-3">วันที่เอกสาร</th><th className="px-4 py-3">สินค้า</th><th className="px-4 py-3 text-center">Disposition</th><th className="px-4 py-3">รายละเอียดปลายทาง</th><th className="px-4 py-3 text-center">สถานะปัจจุบัน</th><th className="px-4 py-3 text-center">Action</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">
                                {documentedItems.length === 0 ? (<tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">ไม่มีรายการรอปิดงาน</td></tr>) : (documentedItems.map(item => (<tr key={item.id} className="hover:bg-slate-50"><td className="px-4 py-3 text-sm">{item.dateDocumented || '-'} <br/><span className="text-xs text-slate-400">{item.branch}</span></td><td className="px-4 py-3 text-sm font-bold text-slate-800">{item.productName}</td><td className="px-4 py-3 text-center"><span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-bold">{item.disposition}</span></td><td className="px-4 py-3 text-sm text-slate-600">{item.disposition === 'RTV' && item.dispositionRoute}{item.disposition === 'Restock' && `Buyer: ${item.sellerName}`}{item.disposition === 'Claim' && item.claimCompany}</td><td className="px-4 py-3 text-center"><span className="text-blue-600 font-bold text-xs bg-blue-50 px-2 py-1 rounded">Documented</span></td><td className="px-4 py-3 text-center"><button onClick={() => handleCompleteJob(item.id)} className="px-3 py-1.5 bg-slate-800 text-white rounded shadow-sm hover:bg-slate-900 text-xs font-bold">ยืนยันจบงาน (Close)</button></td></tr>)))}
                            </tbody>
                        </table>
                     </div>
                     <div className="mt-8"><h3 className="font-bold text-slate-700 mb-2">ประวัติงานที่ปิดแล้ว (Completed History)</h3><div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden opacity-80"><table className="w-full text-left text-sm text-slate-500"><thead className="border-b border-slate-200"><tr><th className="px-4 py-2">Ref</th><th className="px-4 py-2">Product</th><th className="px-4 py-2">Date Completed</th><th className="px-4 py-2 text-center">Disposition</th><th className="px-4 py-2 text-center">Status</th></tr></thead><tbody>{completedItems.slice(0, 5).map(item => (<tr key={item.id}><td className="px-4 py-2">{item.refNo}</td><td className="px-4 py-2">{item.productName}</td><td className="px-4 py-2">{item.dateCompleted || '-'}</td><td className="px-4 py-2 text-center">{item.disposition}</td><td className="px-4 py-2 text-center text-green-600 font-bold">Completed</td></tr>))}</tbody></table></div></div>
                 </div>
            </div>
        )}

        {/* Reusing Modal Logic - Code omitted for brevity but logic remains identical, just rendering `showSelectionModal` and `showDocModal` blocks as before */}
        {showSelectionModal && selectionStatus && (
            <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl flex flex-col max-h-[80vh]">
                    <div className="p-4 border-b flex justify-between"><h3 className="font-bold">เลือกรายการสินค้า ({selectionStatus})</h3><button onClick={() => setShowSelectionModal(false)}><X className="w-5 h-5" /></button></div>
                    <div className="flex-1 overflow-auto p-4">
                        <table className="w-full text-sm"><thead><tr className="text-left bg-slate-50"><th className="p-2">Select</th><th className="p-2">Product</th><th className="p-2">Branch</th></tr></thead><tbody>{selectionItems.map(item => (<tr key={item.id} className="border-b"><td className="p-2"><input type="checkbox" checked={selectedItemIds.has(item.id)} onChange={() => toggleSelection(item.id)} /></td><td className="p-2">{item.productName}<div className="text-xs text-slate-400">{item.id}</div></td><td className="p-2">{item.branch}</td></tr>))}</tbody></table>
                    </div>
                    <div className="p-4 border-t flex justify-end gap-2"><button onClick={() => setShowSelectionModal(false)} className="px-4 py-2 border rounded">Cancel</button><button onClick={handleGenerateDoc} className="px-4 py-2 bg-blue-600 text-white rounded font-bold">สร้างเอกสาร</button></div>
                </div>
            </div>
        )}

        {showDocModal && docData && (
             <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-5xl h-[95vh] rounded-xl flex flex-col shadow-2xl overflow-hidden">
                    <div className="bg-slate-800 text-white p-4 flex justify-between items-center">
                        <div className="flex items-center gap-3"><FileText className="w-5 h-5" /><h3 className="font-bold">ISO Document Generator</h3></div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setIsDocEditable(!isDocEditable)} className={`px-3 py-1.5 rounded text-sm flex items-center gap-2 ${isDocEditable ? 'bg-yellow-500 text-white' : 'bg-slate-700 text-slate-300'}`}><Edit3 className="w-3 h-3" /> {isDocEditable ? 'Finish Editing' : 'Edit Mode'}</button>
                            <label className="flex items-center gap-2 text-sm text-slate-300 px-2 cursor-pointer"><input type="checkbox" checked={includeVat} onChange={e => setIncludeVat(e.target.checked)} /> คิด VAT 7%</label>
                             <button onClick={handleConfirmDocGeneration} className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-sm font-bold flex items-center gap-2 text-white"><Check className="w-4 h-4" /> ยืนยันเอกสาร</button>
                             <button onClick={() => setShowDocModal(false)} className="p-2 text-slate-300 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto bg-slate-100 p-8 flex justify-center">
                        <div className="bg-white shadow-lg w-[210mm] min-h-[297mm] p-[10mm] text-slate-900 relative">
                             <table className="w-full border-collapse border border-black mb-4">
                                <tbody>
                                    <tr>
                                        <td className="border border-black p-2 w-[150px] text-center align-middle"><img src="https://img2.pic.in.th/pic/logo-neo.png" alt="Company Logo" className="w-24 mx-auto" /></td>
                                        <td className="border border-black p-2 align-middle">
                                            {isDocEditable ? (
                                                <div className="flex flex-col gap-1"><input className="font-bold text-sm w-full border border-blue-200 p-1" value={docConfig.companyNameTH} onChange={e => setDocConfig({...docConfig, companyNameTH: e.target.value})} /><input className="text-xs w-full border border-blue-200 p-1" value={docConfig.companyNameEN} onChange={e => setDocConfig({...docConfig, companyNameEN: e.target.value})} /><input className="text-[10px] w-full border border-blue-200 p-1" value={docConfig.address} onChange={e => setDocConfig({...docConfig, address: e.target.value})} /><input className="text-[10px] w-full border border-blue-200 p-1" value={docConfig.contact} onChange={e => setDocConfig({...docConfig, contact: e.target.value})} /></div>
                                            ) : (
                                                <div><h3 className="font-bold text-sm">{docConfig.companyNameTH}</h3><h4 className="text-xs">{docConfig.companyNameEN}</h4><p className="text-[10px]">{docConfig.address}</p><p className="text-[10px]">{docConfig.contact}</p></div>
                                            )}
                                        </td>
                                        <td className="border border-black p-2 w-[150px] align-middle">
                                            <div className="text-xs"><div className="flex justify-between border-b border-black border-dotted pb-1 mb-1"><span className="font-bold">Doc No:</span> <span>{getISODetails(docData.type).code}</span></div><div className="flex justify-between border-b border-black border-dotted pb-1 mb-1"><span className="font-bold">Rev No:</span> <span>{getISODetails(docData.type).rev}</span></div><div className="flex justify-between"><span className="font-bold">Date:</span> <span>{new Date().toISOString().split('T')[0]}</span></div></div>
                                        </td>
                                    </tr>
                                </tbody>
                             </table>
                             <div className="text-center mb-6">
                                 {isDocEditable ? (<><input className="text-center font-bold text-xl uppercase w-full border border-blue-200 p-1 mb-1" value={docConfig.titleTH} onChange={e => setDocConfig({...docConfig, titleTH: e.target.value})} /><input className="text-center font-bold text-sm uppercase w-full border border-blue-200 p-1" value={docConfig.titleEN} onChange={e => setDocConfig({...docConfig, titleEN: e.target.value})} /></>) : (<><h1 className="font-bold text-xl uppercase">{docConfig.titleTH}</h1><h2 className="font-bold text-sm uppercase text-slate-500">{docConfig.titleEN}</h2></>)}
                             </div>
                             <div className="flex border border-black mb-4">
                                <div className="w-1/2 p-2 border-r border-black"><h4 className="font-bold text-xs underline mb-2">ผู้ส่ง / ผู้ขออนุมัติ (Sender / Requestor)</h4><p className="text-xs mb-1"><span className="font-bold w-20 inline-block">หน่วยงาน:</span> แผนกคืนสินค้า</p><p className="text-xs mb-1"><span className="font-bold w-20 inline-block">วันที่บันทึก:</span> {new Date().toISOString().split('T')[0]}</p></div>
                                <div className="w-1/2 p-2"><h4 className="font-bold text-xs underline mb-2">ผู้รับ / ปลายทาง (Receiver / Destination)</h4><p className="text-xs mb-1"><span className="font-bold w-20 inline-block">ปลายทาง:</span> {docData.type === 'Restock' ? 'คลังสินค้า (Stock)' : docData.type === 'RTV' ? 'ผู้ผลิต/Supplier' : docData.type === 'Claim' ? 'บริษัทประกัน' : '-'}</p>{docData.type === 'Restock' && (<><p className="text-xs mb-1"><span className="font-bold w-20 inline-block">ชื่อผู้ซื้อ:</span> {docData.items[0]?.sellerName || '-'}</p><p className="text-xs mb-1"><span className="font-bold w-20 inline-block">เบอร์โทร:</span> {docData.items[0]?.contactPhone || '-'}</p></>)}</div>
                             </div>
                             <table className="w-full border-collapse border border-black text-sm mb-4">
                                 <thead><tr className="bg-slate-100 font-bold text-center text-xs"><th className="border border-black p-1 w-10">ลำดับ</th><th className="border border-black p-1">รายการสินค้า / รายละเอียด</th><th className="border border-black p-1 w-20">จำนวน</th><th className="border border-black p-1 w-20">หน่วย</th><th className="border border-black p-1 w-24">ราคา/หน่วย</th><th className="border border-black p-1 w-24">จำนวนเงิน</th></tr></thead>
                                 <tbody>{docData.items.map((item, idx) => (<tr key={idx} className="text-xs"><td className="border border-black p-1 text-center">{idx + 1}</td><td className="border border-black p-1"><div className="font-bold">{item.productName}</div><div className="text-[10px] text-slate-500">Ref: {item.refNo} | Branch: {item.branch}</div></td><td className="border border-black p-1 text-center">{item.quantity}</td><td className="border border-black p-1 text-center">{item.unit}</td><td className="border border-black p-1 text-right">{(item.priceBill || 0).toLocaleString()}</td><td className="border border-black p-1 text-right">{((item.priceBill || 0) * item.quantity).toLocaleString()}</td></tr>))}</tbody>
                                 <tfoot><tr className="bg-slate-100 font-bold"><td colSpan={4} className="border border-black p-2 text-center">({ThaiBahtText(calculateTotal(docData.items, includeVat).net)})</td><td className="border border-black p-2 text-right">รวมเป็นเงิน<br/>ภาษี (7%)<br/>ยอดสุทธิ</td><td className="border border-black p-2 text-right">{calculateTotal(docData.items, includeVat).subtotal.toLocaleString()}<br/>{calculateTotal(docData.items, includeVat).vat.toLocaleString()}<br/><span className="underline">{calculateTotal(docData.items, includeVat).net.toLocaleString()}</span></td></tr></tfoot>
                             </table>
                             <div className="mb-8"><h4 className="font-bold text-xs mb-1">หมายเหตุ (Remarks):</h4>{isDocEditable ? <textarea className="w-full border border-blue-200 p-1 text-xs" rows={3} value={docConfig.remarks} onChange={e => setDocConfig({...docConfig, remarks: e.target.value})} /> : <pre className="text-xs font-sans whitespace-pre-wrap">{docConfig.remarks}</pre>}</div>
                             <div className="flex justify-between items-end gap-4 text-center mt-auto"><div className="flex-1">{isDocEditable ? <input className="w-full border border-blue-200 text-center text-xs mb-1" value={docConfig.signatory1} onChange={e => setDocConfig({...docConfig, signatory1: e.target.value})} /> : <p className="font-bold text-xs mb-8">{docConfig.signatory1}</p>}<div className="border-b border-black w-3/4 mx-auto mb-2"></div><p className="text-[10px]">วันที่ ......../......../............</p></div><div className="flex-1">{isDocEditable ? <input className="w-full border border-blue-200 text-center text-xs mb-1" value={docConfig.signatory2} onChange={e => setDocConfig({...docConfig, signatory2: e.target.value})} /> : <p className="font-bold text-xs mb-8">{docConfig.signatory2}</p>}<div className="border-b border-black w-3/4 mx-auto mb-2"></div><p className="text-[10px]">วันที่ ......../......../............</p></div><div className="flex-1">{isDocEditable ? <input className="w-full border border-blue-200 text-center text-xs mb-1" value={docConfig.signatory3} onChange={e => setDocConfig({...docConfig, signatory3: e.target.value})} /> : <p className="font-bold text-xs mb-8">{docConfig.signatory3}</p>}<div className="border-b border-black w-3/4 mx-auto mb-2"></div><p className="text-[10px]">วันที่ ......../......../............</p></div></div>
                             <div className="absolute bottom-4 left-10 text-[10px] text-slate-400">ISO 9001:2015 Controlled Document</div>
                        </div>
                    </div>
                </div>
             </div>
        )}
      </div>
    </div>
  );
};

export function ThaiBahtText(amount: number): string {
  if (amount == null || isNaN(amount)) return "-";
  const num = amount.toFixed(2);
  const [bahtStr, satangStr] = num.split(".");
  const baht = parseInt(bahtStr);
  const satang = parseInt(satangStr);
  if (baht === 0 && satang === 0) return "ศูนย์บาทถ้วน";
  const numTexts = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
  const unitTexts = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];
  const convert = (nStr: string): string => {
    let text = "";
    const len = nStr.length;
    for (let i = 0; i < len; i++) {
      const digit = parseInt(nStr[i]);
      const pos = len - i - 1;
      if (digit === 0) continue;
      if (pos === 1 && digit === 2) { text += "ยี่"; } else if (pos === 1 && digit === 1) { text += ""; } else if (pos === 0 && digit === 1 && len > 1) { text += "เอ็ด"; } else { text += numTexts[digit]; }
      if (pos === 1) { text += "สิบ"; } else { text += unitTexts[pos]; }
    }
    return text;
  };
  let result = "";
  if (baht > 0) {
    if (bahtStr.length > 6) { const millions = bahtStr.substring(0, bahtStr.length - 6); const remainder = bahtStr.substring(bahtStr.length - 6); result += convert(millions) + "ล้าน" + convert(remainder); } else { result += convert(bahtStr); }
    result += "บาท";
  }
  if (satang > 0) { result += convert(satangStr) + "สตางค์"; } else { result += "ถ้วน"; }
  return result;
}

export default Operations;
