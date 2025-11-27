
import React, { useState, useEffect } from 'react';
import { useData, NCRRecord, NCRItem } from '../DataContext';
import { FileText, AlertTriangle, ArrowRight, CheckCircle, Clock, MapPin, DollarSign, Package, User, Printer, X, Save, Eye, Edit, Lock, Trash2 } from 'lucide-react';
import { ReturnRecord } from '../types';

interface NCRReportProps {
  onTransfer: (data: Partial<ReturnRecord>) => void;
}

const NCRReport: React.FC<NCRReportProps> = ({ onTransfer }) => {
  const { ncrReports, updateNCRReport, deleteNCRReport } = useData();
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printItem, setPrintItem] = useState<NCRRecord | null>(null);
  
  // State for Viewing/Editing Original NCR Form
  const [showNCRFormModal, setShowNCRFormModal] = useState(false);
  const [ncrFormItem, setNcrFormItem] = useState<NCRRecord | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Password Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [pendingEditItem, setPendingEditItem] = useState<NCRRecord | null>(null);

  const handleCreateReturn = (ncr: NCRRecord) => {
    // FIX: Make backward-compatible
    const itemData = ncr.item || (ncr as any);

    const returnData: Partial<ReturnRecord> = {
      ncrNumber: ncr.ncrNo || ncr.id,
      branch: itemData.branch,
      date: ncr.date,
      productName: itemData.productName,
      productCode: itemData.productCode,
      customerName: itemData.customerName,
      quantity: itemData.quantity,
      unit: itemData.unit,
      refNo: itemData.refNo,
      reason: `จาก NCR: ${ncr.problemDetail} (${itemData.problemSource})`,
      problemType: ncr.problemDetail,
      rootCause: itemData.problemSource,
      actionReject: ncr.actionReject,
      actionRejectSort: ncr.actionRejectSort,
      actionScrap: ncr.actionScrap
    };
    onTransfer(returnData);
  };

  const handleOpenPrint = (item: NCRRecord) => {
      setPrintItem(item);
      setShowPrintModal(true);
  };

  const handleViewNCRForm = (item: NCRRecord) => {
      setNcrFormItem({ ...item }); // Clone object to avoid direct mutation
      setIsEditMode(false);
      setShowNCRFormModal(true);
  };

  const handleEditClick = (item: NCRRecord) => {
      setPendingEditItem(item);
      setPasswordInput('');
      setShowPasswordModal(true);
  };

  const handleDeleteClick = async (id: string) => {
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการ NCR นี้? (This action cannot be undone)')) {
      const success = await deleteNCRReport(id);
      if (success) {
        alert('ลบรายการ NCR สำเร็จ');
      } else {
        alert('การลบล้มเหลว กรุณาตรวจสอบสิทธิ์การใช้งาน');
      }
    }
  };

  const handleVerifyPassword = () => {
      if (passwordInput === '1234') {
          if (pendingEditItem) {
              setNcrFormItem({ ...pendingEditItem });
              setIsEditMode(true);
              setShowNCRFormModal(true);
          }
          setShowPasswordModal(false);
      } else {
          alert('รหัสผ่านไม่ถูกต้อง');
      }
  };

  const handleSaveChanges = async () => {
      if (!ncrFormItem) return;
      
      const success = await updateNCRReport(ncrFormItem.id, ncrFormItem);
      if(success){
        alert('บันทึกการแก้ไขเรียบร้อย');
        setShowNCRFormModal(false);
        setIsEditMode(false);
      } else {
        alert('เกิดข้อผิดพลาดในการบันทึก');
      }
  };

  const handlePrint = () => {
      window.print();
  };

  // Helper to handle input changes in the modal
  const handleInputChange = (field: keyof NCRRecord, value: any) => {
      if (ncrFormItem) {
          setNcrFormItem({ ...ncrFormItem, [field]: value });
      }
  };

  // FIX: Handle updates for both nested and flat structures.
  const handleItemInputChange = (field: keyof NCRItem, value: any) => {
    if (ncrFormItem) {
        if (ncrFormItem.item) {
             setNcrFormItem({ 
                ...ncrFormItem, 
                item: { ...ncrFormItem.item, [field]: value }
            });
        } else {
            // Fallback for old flat structure
            setNcrFormItem({ ...ncrFormItem, [field]: value });
        }
    }
  };
  
  const getProblemStrings = (record: NCRRecord | null) => {
      if (!record) return [];
      const problems = [];
      if (record.problemDamaged) problems.push("ชำรุด");
      if (record.problemLost) problems.push("สูญหาย");
      if (record.problemMixed) problems.push("สินค้าสลับ");
      if (record.problemWrongInv) problems.push("สินค้าไม่ตรง INV.");
      if (record.problemLate) problems.push("ส่งช้า");
      if (record.problemDuplicate) problems.push("ส่งซ้ำ");
      if (record.problemWrong) problems.push("ส่งผิด");
      if (record.problemIncomplete) problems.push("ส่งของไม่ครบ");
      if (record.problemOver) problems.push("ส่งของเกิน");
      if (record.problemWrongInfo) problems.push("ข้อมูลผิด");
      if (record.problemShortExpiry) problems.push("สินค้าอายุสั้น");
      if (record.problemTransportDamage) problems.push("สินค้าเสียหายบนรถขนส่ง");
      if (record.problemAccident) problems.push("อุบัติเหตุ");
      if (record.problemOther && record.problemOtherText) problems.push(`อื่นๆ: ${record.problemOtherText}`);
      return problems;
  }

  return (
    <div className="p-6 h-full flex flex-col space-y-6 print:p-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">รายงาน NCR (NCR Report)</h2>
           <p className="text-slate-500 text-sm">ติดตามสถานะ NCR และส่งเรื่องคืนสินค้าอัตโนมัติ</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col print:hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold">
                <tr>
                <th className="px-4 py-3 bg-slate-50 sticky left-0 z-10 border-r">วันที่ / เลขที่ NCR</th>
                <th className="px-4 py-3">สินค้า (Product)</th>
                <th className="px-4 py-3">ชื่อลูกค้า (Customer)</th>
                <th className="px-4 py-3">ข้อมูลอ้างอิง (Refs)</th>
                <th className="px-4 py-3">ต้นทาง / ปลายทาง</th>
                <th className="px-4 py-3">วิเคราะห์ปัญหา (Source)</th>
                <th className="px-4 py-3 text-right">ค่าใช้จ่าย (Cost)</th>
                <th className="px-4 py-3 text-center">การดำเนินการ</th>
                <th className="px-4 py-3 text-center bg-slate-50 sticky right-0 z-10 border-l">จัดการ</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
                {ncrReports.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400 italic">ไม่พบรายการ NCR</td></tr>
                ) : (
                    ncrReports.map((report) => {
                    // FIX: Create a helper const to handle both data structures
                    const itemData = report.item || (report as any);

                    return (
                    <tr key={report.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 sticky left-0 bg-white hover:bg-slate-50 border-r">
                            <button 
                                onClick={() => handleViewNCRForm(report)}
                                className="font-bold text-blue-600 hover:text-blue-800 hover:underline text-left flex items-center gap-1"
                                title="ดูใบแจ้งปัญหาระบบ (View NCR Form)"
                            >
                                {report.ncrNo || report.id} <Eye className="w-3 h-3" />
                            </button>
                            <div className="text-xs text-slate-500">{report.date}</div>
                            <div className="mt-1">
                                {report.status === 'Closed' ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded border border-green-100"><CheckCircle className="w-3 h-3" /> Closed</span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-500 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100"><Clock className="w-3 h-3" /> {report.status || 'Open'}</span>
                                )}
                            </div>
                        </td>
                        <td className="px-4 py-3">
                            <div className="font-bold text-blue-600 flex items-center gap-2">
                                <Package className="w-4 h-4" /> {itemData.productCode}
                            </div>
                            <div className="text-slate-700">{itemData.productName}</div>
                            <div className="text-xs text-slate-500">Qty: {itemData.quantity} {itemData.unit}</div>
                        </td>
                        <td className="px-4 py-3">
                            <div className="flex items-center gap-2 font-medium text-slate-700">
                                <User className="w-4 h-4 text-slate-400" /> {itemData.customerName || '-'}
                            </div>
                        </td>
                        <td className="px-4 py-3">
                            <div className="text-xs text-slate-500">Ref: <span className="font-mono text-slate-700">{itemData.refNo}</span></div>
                            <div className="text-xs text-slate-500">Neo: <span className="font-mono text-slate-700">{itemData.neoRefNo}</span></div>
                        </td>
                        <td className="px-4 py-3">
                            <div className="flex items-center gap-1 text-xs text-slate-600">
                                <span className="font-bold w-8">From:</span> {itemData.branch}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-slate-600 mt-1">
                                <span className="font-bold w-8">To:</span> <span className="truncate max-w-[150px]" title={itemData.destinationCustomer}>{itemData.destinationCustomer || '-'}</span>
                            </div>
                        </td>
                        <td className="px-4 py-3 max-w-[250px] whitespace-normal">
                            <div className="text-xs font-bold text-slate-700 mb-0.5">{report.problemDetail}</div>
                            <div className="text-[10px] text-slate-500 bg-slate-100 p-1 rounded border border-slate-200">
                                Source: {itemData.problemSource}
                            </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                            {itemData.hasCost ? (
                                <div className="flex flex-col items-end">
                                    <span className="text-red-600 font-bold flex items-center gap-1">
                                        <DollarSign className="w-3 h-3" /> {itemData.costAmount?.toLocaleString()}
                                    </span>
                                    <span className="text-[10px] text-slate-400">{itemData.costResponsible}</span>
                                </div>
                            ) : (
                                <span className="text-slate-300 text-xs">-</span>
                            )}
                        </td>
                        <td className="px-4 py-3 text-center">
                        {report.actionReject ? (
                            <span className="inline-block px-2 py-1 rounded bg-red-100 text-red-700 text-[10px] font-bold border border-red-200">Reject</span>
                        ) : report.actionRejectSort ? (
                            <span className="inline-block px-2 py-1 rounded bg-amber-100 text-amber-700 text-[10px] font-bold border border-amber-200">Sort/Return</span>
                        ) : report.actionScrap ? (
                            <span className="inline-block px-2 py-1 rounded bg-slate-200 text-slate-700 text-[10px] font-bold border border-slate-300">Scrap</span>
                        ) : (
                            <span className="text-slate-400 text-xs">-</span>
                        )}
                        </td>
                        <td className="px-4 py-3 text-center bg-white sticky right-0 border-l">
                            <div className="flex items-center justify-center gap-2">
                                <button onClick={() => handleOpenPrint(report)} className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors" title="พิมพ์ใบส่งคืน (Print Return Note)">
                                    <Printer className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleEditClick(report)} className="p-1.5 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors" title="แก้ไข (Edit)">
                                    <Edit className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDeleteClick(report.id)} className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors" title="ลบ (Delete)">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                {(report.actionReject || report.actionScrap || report.actionRejectSort) && (
                                    <button onClick={() => handleCreateReturn(report)} className="inline-flex items-center gap-1 bg-orange-500 hover:bg-orange-600 text-white px-2 py-1.5 rounded shadow-sm transition-all transform hover:scale-105 text-[10px] font-bold" title="สร้างคำขอคืนสินค้าอัตโนมัติ">
                                    ส่งคืน <ArrowRight className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        </td>
                    </tr>
                    )
                })}
            </tbody>
            </table>
        </div>
      </div>

      {/* PASSWORD MODAL */}
      {showPasswordModal && (
          <div className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm animate-fade-in">
                  <div className="flex items-center gap-3 mb-4 text-slate-800">
                      <div className="bg-amber-100 p-2 rounded-full"><Lock className="w-6 h-6 text-amber-600" /></div>
                      <h3 className="text-lg font-bold">ยืนยันสิทธิ์การแก้ไข</h3>
                  </div>
                  <p className="text-sm text-slate-500 mb-4">กรุณาระบุรหัสผ่านเพื่อแก้ไขข้อมูล NCR</p>
                  <input 
                    type="password" 
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-center tracking-widest text-lg font-bold mb-6 focus:ring-2 focus:ring-blue-500 outline-none" 
                    placeholder="Enter Password" 
                    autoFocus
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword()}
                  />
                  <div className="flex gap-3">
                      <button onClick={() => setShowPasswordModal(false)} className="flex-1 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">ยกเลิก</button>
                      <button onClick={handleVerifyPassword} className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-sm">ยืนยัน</button>
                  </div>
              </div>
          </div>
      )}

      {/* PRINT MODAL (Return Note) */}
      {showPrintModal && printItem && (() => {
        // FIX: Make backward-compatible
        const itemData = printItem.item || (printItem as any);
        return (
            <div className="fixed inset-0 z-[100] bg-black/70 overflow-y-auto flex items-start justify-center p-4 backdrop-blur-sm print:bg-white print:p-0 print:overflow-visible print:fixed print:inset-0 print:z-[9999]">
                <div className="bg-white w-[210mm] min-h-[297mm] shadow-2xl flex flex-col my-8 shrink-0 print:m-0 print:w-full print:h-full print:shadow-none relative">
                    <div className="bg-slate-800 text-white p-4 flex justify-between items-center print:hidden rounded-t-lg">
                        <h3 className="font-bold flex items-center gap-2"><Printer className="w-5 h-5" /> สร้างใบส่งคืนสินค้า (Return Note)</h3>
                        <div className="flex gap-2"><button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2 font-bold text-sm"><Printer className="w-4 h-4" /> Print / Save PDF</button><button onClick={() => setShowPrintModal(false)} className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded"><X className="w-5 h-5" /></button></div>
                    </div>
                    <div className="p-[15mm] text-slate-900 h-full relative flex-1">
                        <div className="flex border-2 border-black mb-6">
                                <div className="w-[30%] border-r-2 border-black p-4 flex items-center justify-center"><img src="https://img2.pic.in.th/pic/logo-neo.png" alt="Neo Logistics" className="w-full h-auto object-contain max-h-20" /></div>
                                <div className="w-[70%] p-4 pl-6 flex flex-col justify-center"><h2 className="text-lg font-bold text-slate-900 leading-none mb-2">บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด</h2><h3 className="text-xs font-bold text-slate-700 mb-2">NEOSIAM LOGISTICS & TRANSPORT CO., LTD.</h3><p className="text-xs text-slate-600 mb-1">159/9-10 หมู่ 7 ต.บางม่วง อ.เมืองนครสวรรค์ จ.นครสวรรค์ 60000</p><div className="text-xs text-slate-600 flex gap-4"><span>Tax ID: 0105552087673</span><span>Tel: 056-275-841</span></div></div>
                            </div>
                        <h1 className="text-xl font-bold text-center border-2 border-black py-2 mb-6 bg-slate-50 print:bg-transparent uppercase">ใบส่งคืนสินค้า (RETURN NOTE)</h1>
                        <div className="flex border border-black mb-6 text-sm">
                            <div className="w-1/2 border-r border-black p-4 space-y-2"><div className="flex"><span className="font-bold w-24">วันที่ (Date):</span><span>{printItem.date}</span></div><div className="flex"><span className="font-bold w-24">อ้างอิง (Ref):</span><span>{itemData.refNo}</span></div><div className="flex"><span className="font-bold w-24">NCR No:</span><span>{printItem.ncrNo || printItem.id}</span></div></div>
                            <div className="w-1/2 p-4 space-y-2"><div className="flex"><span className="font-bold w-32">ต้นทาง (From):</span><span>{itemData.branch}</span></div><div className="flex"><span className="font-bold w-32">ลูกค้า (Customer):</span><span>{itemData.customerName}</span></div><div className="flex"><span className="font-bold w-32">ปลายทาง (To):</span><span>{itemData.destinationCustomer || '-'}</span></div></div>
                        </div>
                        <table className="w-full border-collapse border border-black text-sm mb-6">
                            <thead><tr className="bg-slate-100 print:bg-transparent"><th className="border border-black p-2 w-12 text-center">ลำดับ</th><th className="border border-black p-2 w-32">รหัสสินค้า</th><th className="border border-black p-2">รายการสินค้า</th><th className="border border-black p-2 w-20 text-center">จำนวน</th><th className="border border-black p-2 w-20 text-center">หน่วย</th><th className="border border-black p-2 w-1/3">หมายเหตุ / ปัญหาที่พบ</th></tr></thead>
                            <tbody><tr><td className="border border-black p-2 text-center align-top h-20">1</td><td className="border border-black p-2 align-top">{itemData.productCode}</td><td className="border border-black p-2 align-top">{itemData.productName}</td><td className="border border-black p-2 text-center align-top">{itemData.quantity}</td><td className="border border-black p-2 text-center align-top">{itemData.unit}</td><td className="border border-black p-2 align-top"><p>{printItem.problemDetail}</p><p className="text-xs text-slate-500 mt-1">Source: {itemData.problemSource}</p>{printItem.actionReject ? <span className="text-xs font-bold">[Reject]</span> : null}{printItem.actionRejectSort ? <span className="text-xs font-bold">[Sort]</span> : null}{printItem.actionScrap ? <span className="text-xs font-bold">[Scrap]</span> : null}</td></tr>{[...Array(5)].map((_, i) => (<tr key={i}><td className="border border-black p-2 text-center h-8"></td><td className="border border-black p-2"></td><td className="border border-black p-2"></td><td className="border border-black p-2"></td><td className="border border-black p-2"></td><td className="border border-black p-2"></td></tr>))}</tbody>
                        </table>
                        <div className="mb-10 text-sm"><p className="font-bold mb-1">หมายเหตุ (Remarks):</p><div className="border-b border-dotted border-black h-6 w-full mb-1"></div><div className="border-b border-dotted border-black h-6 w-full"></div></div>
                        <div className="flex justify-between items-end text-center mt-auto"><div className="w-[30%]"><div className="border-b border-black mb-2 h-8"></div><p className="font-bold text-sm">ผู้ส่งคืน (Sender)</p><p className="text-xs">วันที่ ......../......../............</p></div><div className="w-[30%]"><div className="border-b border-black mb-2 h-8"></div><p className="font-bold text-sm">ผู้ขนส่ง (Transporter)</p><p className="text-xs">วันที่ ......../......../............</p></div><div className="w-[30%]"><div className="border-b border-black mb-2 h-8"></div><p className="font-bold text-sm">ผู้รับสินค้า (Receiver)</p><p className="text-xs">วันที่ ......../......../............</p></div></div>
                        <div className="absolute bottom-4 left-10 text-[10px] text-slate-400 print:bottom-4">FM-LOG-00 Rev.00</div>
                    </div>
                </div>
            </div>
        )
      })()}

      {/* VIEW/EDIT NCR FORM MODAL */}
      {showNCRFormModal && ncrFormItem && (() => {
        // FIX: Make backward-compatible
        const itemData = ncrFormItem.item || (ncrFormItem as any);
        return (
            <div className="fixed inset-0 z-[100] bg-black/70 overflow-y-auto flex items-start justify-center p-4 backdrop-blur-sm print:bg-white print:p-0 print:overflow-visible print:fixed print:inset-0 print:z-[9999]">
                <div className="bg-white w-full max-w-5xl shadow-2xl flex flex-col my-8 shrink-0 print:m-0 print:w-full print:h-full print:shadow-none relative">
                    <div className={`p-4 text-white flex justify-between items-center print:hidden rounded-t-lg ${isEditMode ? 'bg-amber-600' : 'bg-slate-800'}`}>
                        <h3 className="font-bold flex items-center gap-2">
                            {isEditMode ? <Edit className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                            {isEditMode ? 'แก้ไขข้อมูล NCR (Edit Mode)' : 'ใบแจ้งปัญหาระบบ (NCR System Form)'}
                        </h3>
                        <div className="flex gap-2">
                            {isEditMode && (
                                <button onClick={handleSaveChanges} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2 font-bold text-sm shadow-md border border-green-500">
                                    <Save className="w-4 h-4" /> บันทึกการแก้ไข
                                </button>
                            )}
                            <button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2 font-bold text-sm"><Printer className="w-4 h-4" /> Print Form</button>
                            <button onClick={() => setShowNCRFormModal(false)} className="bg-white/20 hover:bg-white/30 text-white p-2 rounded"><X className="w-5 h-5" /></button>
                        </div>
                    </div>
                    <div className="p-8 print:p-0 text-slate-900 overflow-auto bg-white">
                        <div className="max-w-[210mm] mx-auto print:max-w-none print:w-full">
                            {/* FORM HEADER */}
                            <div className="flex border-2 border-black mb-6">
                                <div className="w-[30%] border-r-2 border-black p-4 flex items-center justify-center"><img src="https://img2.pic.in.th/pic/logo-neo.png" alt="Neo Logistics" className="w-full h-auto object-contain max-h-24" /></div>
                                <div className="w-[70%] p-4 pl-6 flex flex-col justify-center"><h2 className="text-xl font-bold text-slate-900 leading-none mb-2">บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด</h2><h3 className="text-sm font-bold text-slate-700 mb-3">NEOSIAM LOGISTICS & TRANSPORT CO., LTD.</h3><p className="text-sm text-slate-600 mb-1">159/9-10 หมู่ 7 ต.บางม่วง อ.เมืองนครสวรรค์ จ.นครสวรรค์ 60000</p><div className="text-sm text-slate-600 flex gap-4"><span>Tax ID: 0105552087673</span><span className="text-slate-400">|</span><span>Tel: 056-275-841</span></div></div>
                            </div>
                            <h1 className="text-xl font-bold text-center border-2 border-black py-2 mb-6 bg-white text-slate-900 print:bg-transparent">ใบแจ้งปัญหาระบบ (NCR) / ใบแจ้งปัญหารับสินค้าคืน</h1>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm mb-8">
                                <div className="flex items-center gap-2"><label className="font-bold w-24 text-slate-800">ถึงหน่วยงาน:</label><span className="flex-1 border-b border-dotted border-slate-400 px-1 text-slate-700">แผนกควบคุมคุณภาพ</span></div>
                                <div className="flex items-center gap-2"><label className="font-bold w-24 text-slate-800">วันที่:</label><span className="flex-1 border-b border-dotted border-slate-400 px-1 text-slate-700">{ncrFormItem.date}</span></div>
                                <div className="flex items-center gap-2"><label className="font-bold w-24 text-slate-800">สำเนา:</label><span className="flex-1 border-b border-dotted border-slate-400 px-1 text-slate-700"></span></div>
                                <div className="flex items-center gap-2"><label className="font-bold w-24 text-slate-800">เลขที่ NCR:</label><span className="flex-1 border-b border-dotted border-slate-400 px-1 font-mono text-red-600 font-bold print:text-black">{ncrFormItem.ncrNo || ncrFormItem.id}</span></div>
                                <div className="flex items-center gap-2"><label className="font-bold w-24 text-slate-800">ผู้พบปัญหา:</label><span className="flex-1 border-b border-dotted border-slate-400 px-1 text-slate-700"></span></div>
                                <div className="flex items-center gap-2"><label className="font-bold w-32 text-slate-800">เลขที่ใบสั่งซื้อ/ผลิต:</label><span className="flex-1 border-b border-dotted border-slate-400 px-1 text-slate-700">{itemData.refNo}</span></div>
                            </div>

                            {/* ITEM LIST */}
                            <div className="mb-6">
                                <h3 className="font-bold text-slate-900 underline mb-2">รายการสินค้าที่พบปัญหา (Non-Conforming Items)</h3>
                                <div className="border-2 border-black bg-white">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-slate-100 print:bg-transparent border-b border-black font-bold"><tr><th className="p-2 border-r border-black">สาขาต้นทาง</th><th className="p-2 border-r border-black">Ref/Neo Ref</th><th className="p-2 border-r border-black">สินค้า/ลูกค้า</th><th className="p-2 border-r border-black text-center">จำนวน</th><th className="p-2 border-r border-black">วิเคราะห์ปัญหา/ค่าใช้จ่าย</th></tr></thead>
                                        <tbody className="divide-y divide-black">
                                            <tr>
                                                <td className="p-2 border-r border-black align-top">{itemData.branch}</td>
                                                <td className="p-2 border-r border-black align-top"><div>Ref: {itemData.refNo}</div><div className="text-slate-500">Neo: {itemData.neoRefNo}</div></td>
                                                <td className="p-2 border-r border-black align-top"><div className="font-bold">{itemData.productCode}</div><div className="text-slate-600 font-medium">{itemData.productName}</div><div className="text-slate-500">{itemData.customerName}</div>{itemData.destinationCustomer && (<div className="text-xs text-blue-600 mt-1">ปลายทาง: {itemData.destinationCustomer}</div>)}</td>
                                                <td className="p-2 border-r border-black text-center align-top">{itemData.quantity} {itemData.unit}</td>
                                                <td className="p-2 border-r border-black align-top"><div className="font-medium">{itemData.problemSource}</div>{itemData.hasCost && (<div className="text-red-600 font-bold mt-1">Cost: {itemData.costAmount?.toLocaleString()} บ.<div className="text-xs text-slate-500 font-normal">({itemData.costResponsible})</div></div>)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* SECTION 1: PROBLEM */}
                            <table className="w-full border-2 border-black mb-6"><thead><tr className="border-b-2 border-black bg-slate-50 print:bg-transparent"><th className="border-r-2 border-black w-1/3 py-2 text-slate-900">รูปภาพ / เอกสาร</th><th className="py-2 text-slate-900">รายละเอียดของปัญหาที่พบ (ผู้พบปัญหา)</th></tr></thead><tbody><tr><td className="border-r-2 border-black p-4 text-center align-middle h-64 relative bg-white"><div className="flex flex-col items-center justify-center text-red-500 opacity-50 print:opacity-100 print:text-black"><h2 className="text-3xl font-bold mb-2">รูปภาพ / เอกสาร</h2><h2 className="text-3xl font-bold">ตามแนบ</h2></div></td><td className="p-4 align-top text-sm bg-white">
                                <div className="mb-2 font-bold underline text-slate-900">พบปัญหาที่กระบวนการ</div>
                                {isEditMode ? (
                                    <div className="grid grid-cols-2 gap-2 mb-4 text-slate-700">
                                        <label className="flex items-center gap-2 cursor-pointer p-1"><input type="checkbox" checked={ncrFormItem.problemDamaged} onChange={e => handleInputChange('problemDamaged', e.target.checked)} /> ชำรุด</label>
                                        <label className="flex items-center gap-2 cursor-pointer p-1"><input type="checkbox" checked={ncrFormItem.problemLost} onChange={e => handleInputChange('problemLost', e.target.checked)} /> สูญหาย</label>
                                        <label className="flex items-center gap-2 cursor-pointer p-1"><input type="checkbox" checked={ncrFormItem.problemMixed} onChange={e => handleInputChange('problemMixed', e.target.checked)} /> สินค้าสลับ</label>
                                        <label className="flex items-center gap-2 cursor-pointer p-1"><input type="checkbox" checked={ncrFormItem.problemWrongInv} onChange={e => handleInputChange('problemWrongInv', e.target.checked)} /> สินค้าไม่ตรง INV.</label>
                                        <label className="flex items-center gap-2 cursor-pointer p-1"><input type="checkbox" checked={ncrFormItem.problemLate} onChange={e => handleInputChange('problemLate', e.target.checked)} /> ส่งช้า</label>
                                        <label className="flex items-center gap-2 cursor-pointer p-1"><input type="checkbox" checked={ncrFormItem.problemDuplicate} onChange={e => handleInputChange('problemDuplicate', e.target.checked)} /> ส่งซ้ำ</label>
                                        <label className="flex items-center gap-2 cursor-pointer p-1"><input type="checkbox" checked={ncrFormItem.problemWrong} onChange={e => handleInputChange('problemWrong', e.target.checked)} /> ส่งผิด</label>
                                        <label className="flex items-center gap-2 cursor-pointer p-1"><input type="checkbox" checked={ncrFormItem.problemIncomplete} onChange={e => handleInputChange('problemIncomplete', e.target.checked)} /> ส่งของไม่ครบ</label>
                                        <label className="flex items-center gap-2 cursor-pointer p-1"><input type="checkbox" checked={ncrFormItem.problemOver} onChange={e => handleInputChange('problemOver', e.target.checked)} /> ส่งของเกิน</label>
                                        <label className="flex items-center gap-2 cursor-pointer p-1"><input type="checkbox" checked={ncrFormItem.problemWrongInfo} onChange={e => handleInputChange('problemWrongInfo', e.target.checked)} /> ข้อมูลผิด</label>
                                        <label className="flex items-center gap-2 cursor-pointer p-1"><input type="checkbox" checked={ncrFormItem.problemShortExpiry} onChange={e => handleInputChange('problemShortExpiry', e.target.checked)} /> สินค้าอายุสั้น</label>
                                        <label className="flex items-center gap-2 cursor-pointer p-1"><input type="checkbox" checked={ncrFormItem.problemTransportDamage} onChange={e => handleInputChange('problemTransportDamage', e.target.checked)} /> สินค้าเสียหายบนรถขนส่ง</label>
                                        <label className="flex items-center gap-2 cursor-pointer p-1"><input type="checkbox" checked={ncrFormItem.problemAccident} onChange={e => handleInputChange('problemAccident', e.target.checked)} /> อุบัติเหตุ</label>
                                        <div className="flex items-center gap-2 p-1 col-span-2"><input type="checkbox" checked={ncrFormItem.problemOther} onChange={e => handleInputChange('problemOther', e.target.checked)} /> <span>อื่นๆ</span><input type="text" className="border-b border-dotted border-slate-400 bg-transparent outline-none w-full text-slate-700" value={ncrFormItem.problemOtherText} onChange={e => handleInputChange('problemOtherText', e.target.value)} /></div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-4 text-slate-700 text-xs">
                                        {getProblemStrings(ncrFormItem).map(p => (
                                            <span key={p} className="bg-slate-100 px-2 py-1 rounded border border-slate-200">{p}</span>
                                        ))}
                                        {getProblemStrings(ncrFormItem).length === 0 && <span className="text-slate-400 italic">ไม่มีการระบุประเภทปัญหา</span>}
                                    </div>
                                )}
                                <div className="font-bold underline mb-1 text-slate-900">รายละเอียด:</div>
                                {isEditMode ? (
                                    <textarea className="w-full h-32 border border-blue-300 bg-blue-50 p-2 text-sm text-slate-700 outline-none rounded" value={ncrFormItem.problemDetail} onChange={(e) => handleInputChange('problemDetail', e.target.value)} />
                                ) : (
                                    <div className="w-full h-32 border border-slate-200 bg-slate-50 p-2 text-sm text-slate-700 print:border-none print:bg-transparent">{ncrFormItem.problemDetail}</div>
                                )}
                                </td></tr></tbody></table>

                            {/* SECTION 2: ACTION */}
                            <table className="w-full border-2 border-black mb-6 text-sm bg-white">
                                <thead><tr className="bg-slate-50 print:bg-transparent border-b-2 border-black"><th colSpan={2} className="py-2 text-center font-bold text-slate-900">การดำเนินการ</th></tr></thead>
                                <tbody className="divide-y divide-black border-b-2 border-black">
                                    <tr>
                                        <td className={`p-2 border-r border-black w-1/2 ${isEditMode && ncrFormItem.actionReject ? 'bg-amber-50' : ''}`}>
                                            <div className="flex items-center gap-2">
                                                <input type="checkbox" checked={ncrFormItem.actionReject} onChange={(e) => isEditMode && handleInputChange('actionReject', e.target.checked)} disabled={!isEditMode} /> 
                                                <span className="font-bold">ส่งคืน (Reject)</span>
                                                <span className="ml-auto text-slate-600">จำนวน: {ncrFormItem.actionReject ? itemData.quantity : ''}</span>
                                            </div>
                                        </td>
                                        <td className={`p-2 w-1/2 ${isEditMode && ncrFormItem.actionRejectSort ? 'bg-amber-50' : ''}`}>
                                            <div className="flex items-center gap-2">
                                                <input type="checkbox" checked={ncrFormItem.actionRejectSort} onChange={(e) => isEditMode && handleInputChange('actionRejectSort', e.target.checked)} disabled={!isEditMode} /> 
                                                <span className="font-bold">คัดแยกของเสียเพื่อส่งคืน</span>
                                                <span className="ml-auto text-slate-600">จำนวน: {ncrFormItem.actionRejectSort ? itemData.quantity : ''}</span>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="p-2 border-r border-black"><div className="flex items-center gap-2"><input type="checkbox" disabled /> <span className="font-bold">แก้ไข (Rework)</span><span className="ml-auto text-slate-600">จำนวน:</span></div></td>
                                        <td className="p-2"><div className="flex items-center gap-2"><span className="font-bold">วิธีการแก้ไข</span><span className="border-b border-dotted border-black flex-1"></span></div></td>
                                    </tr>
                                    <tr>
                                        <td className="p-2 border-r border-black"><div className="flex items-center gap-2"><input type="checkbox" disabled /> <span className="font-bold">ยอมรับกรณีพิเศษ</span><span className="ml-auto text-slate-600">จำนวน:</span></div></td>
                                        <td className="p-2"><div className="flex items-center gap-2"><span className="font-bold">เหตุผลในการยอมรับ</span><span className="border-b border-dotted border-black flex-1"></span></div></td>
                                    </tr>
                                    <tr>
                                        <td className={`p-2 border-r border-black ${isEditMode && ncrFormItem.actionScrap ? 'bg-amber-50' : ''}`}>
                                            <div className="flex items-center gap-2">
                                                <input type="checkbox" checked={ncrFormItem.actionScrap} onChange={(e) => isEditMode && handleInputChange('actionScrap', e.target.checked)} disabled={!isEditMode} /> 
                                                <span className="font-bold">ทำลาย (Scrap)</span>
                                                <span className="ml-auto text-slate-600">จำนวน: {ncrFormItem.actionScrap ? itemData.quantity : ''}</span>
                                            </div>
                                        </td>
                                        <td className="p-2"><div className="flex items-center gap-2"><input type="checkbox" disabled /> <span className="font-bold">เปลี่ยนสินค้าใหม่</span><span className="ml-auto text-slate-600">จำนวน:</span></div></td>
                                    </tr>
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan={2} className="p-3 bg-white print:bg-transparent">
                                            <div className="flex justify-between items-center gap-4 text-sm">
                                                <div className="flex items-center gap-2"><span>กำหนดแล้วเสร็จ</span><span className="border-b border-dotted border-black w-24"></span></div>
                                                <div className="flex items-center gap-2"><span>ผู้อนุมัติ</span><span className="border-b border-dotted border-black w-32"></span></div>
                                                <div className="flex items-center gap-2"><span>ตำแหน่ง</span><span className="border-b border-dotted border-black w-24"></span></div>
                                                <div className="flex items-center gap-2"><span>วันที่</span><span className="border-b border-dotted border-black w-24"></span></div>
                                            </div>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>

                            {/* SECTION 3: ROOT CAUSE */}
                            <table className="w-full border-2 border-black mb-6 text-sm bg-white">
                                <thead><tr className="bg-slate-50 print:bg-transparent border-b-2 border-black"><th colSpan={2} className="py-2 text-center font-bold text-slate-900">สาเหตุ-การป้องกัน (ผู้รับผิดชอบปัญหา)</th></tr></thead>
                                <tbody>
                                    <tr>
                                        <td className="w-1/4 border-r-2 border-black align-top p-0">
                                            <div className="border-b border-black p-2 font-bold text-center bg-slate-50 print:bg-transparent">สาเหตุเกิดจาก</div>
                                            <div className="p-4 space-y-3">
                                                <label className="flex items-center gap-2"><input type="checkbox" disabled /> บรรจุภัณฑ์</label>
                                                <label className="flex items-center gap-2"><input type="checkbox" disabled /> การขนส่ง</label>
                                                <label className="flex items-center gap-2"><input type="checkbox" disabled /> ปฏิบัติงาน</label>
                                                <label className="flex items-center gap-2"><input type="checkbox" disabled /> สิ่งแวดล้อม</label>
                                            </div>
                                        </td>
                                        <td className="align-top p-0">
                                            <div className="h-24 border-b border-black p-2 flex flex-col">
                                                <div className="font-bold mb-1">รายละเอียดสาเหตุ :</div>
                                                {isEditMode ? (
                                                    <input className="w-full border-b border-blue-300 bg-blue-50 outline-none text-slate-700" value={itemData.problemSource} onChange={(e) => handleItemInputChange('problemSource', e.target.value)} />
                                                ) : (
                                                    <div className="text-slate-700">{itemData.problemSource}</div>
                                                )}
                                            </div>
                                            <div className="h-24 p-2 flex flex-col">
                                                <div className="font-bold underline mb-1">แนวทางป้องกัน :</div>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr className="border-t-2 border-black">
                                        <td colSpan={2} className="p-3 bg-white print:bg-transparent">
                                            <div className="flex justify-between items-center gap-4 text-sm">
                                                <div className="flex items-center gap-2"><span>กำหนดการป้องกันแล้วเสร็จ</span><span className="border-b border-dotted border-black w-24"></span></div>
                                                <div className="flex items-center gap-2"><span>ผู้รับผิดชอบ</span><span className="border-b border-dotted border-black w-32"></span></div>
                                                <div className="flex items-center gap-2"><span>ตำแหน่ง</span><span className="border-b border-dotted border-black w-24"></span></div>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* SECTION 4: CLOSING */}
                            <table className="w-full border-2 border-black text-sm bg-white">
                                <thead><tr className="bg-slate-50 print:bg-transparent border-b-2 border-black"><th colSpan={2} className="py-2 text-center font-bold text-slate-900">การตรวจติดตามและการปิด NCR</th></tr></thead>
                                <tbody>
                                    <tr className="border-b-2 border-black">
                                        <td colSpan={2} className="p-4">
                                            <div className="flex items-center gap-8">
                                                <label className={`flex items-center gap-2 ${isEditMode ? 'cursor-pointer' : ''}`}>
                                                    <input type="checkbox" checked={ncrFormItem.status === 'Closed'} onChange={(e) => isEditMode && handleInputChange('status', e.target.checked ? 'Closed' : 'Open')} disabled={!isEditMode} /> 
                                                    ยอมรับแนวทางการป้องกัน (Close NCR)
                                                </label>
                                                <label className="flex items-center gap-2"><input type="checkbox" disabled /> ไม่ยอมรับแนวทางการป้องกัน</label>
                                                <span className="flex-1 border-b border-dotted border-black text-slate-700"></span>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="w-1/2 border-r-2 border-black p-4 text-center align-bottom h-32">
                                            <div className="font-bold mb-8">ผู้ตรวจติดตาม</div>
                                            <div className="border-b border-dotted border-black w-3/4 mx-auto mb-2"></div>
                                            <div className="text-slate-500 text-xs">แผนกประกันคุณภาพ</div>
                                        </td>
                                        <td className="w-1/2 p-4 text-center align-bottom h-32">
                                            <div className="font-bold mb-8">ผู้อนุมัติปิดการตรวจติดตาม</div>
                                            <div className="border-b border-dotted border-black w-3/4 mx-auto mb-2"></div>
                                            <div className="text-slate-500 text-xs">กรรมการผู้จัดการ</div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <div className="text-right text-xs mt-4 font-mono text-slate-400">FM-OP01-06 Rev.00</div>
                        </div>
                    </div>
                </div>
            </div>
        )
      })()}
    </div>
  );
};

export default NCRReport;