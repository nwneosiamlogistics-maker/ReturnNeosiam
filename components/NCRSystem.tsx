import React, { useState, useEffect } from 'react';
import { useData, NCRRecord, NCRItem } from '../DataContext';
import { Save, Printer, Image as ImageIcon, AlertTriangle, Plus, Trash2, X } from 'lucide-react';

const WAREHOUSE_BRANCHES = ['สาย 3', 'นครสวรรค์', 'กำแพงเพชร', 'แม่สอด', 'พิษณุโลก', 'เชียงใหม่', 'EKP ลำปาง', 'คลอง13', 'ประดู่'];
const WAREHOUSE_CAUSES = ['เช็คเกอร์', 'พนักงานลงสินค้า', 'อื่นๆ'];
const REPORTING_BRANCHES = ['สาย 3', 'นครสวรรค์', 'กำแพงเพชร', 'แม่สอด', 'พิษณุโลก', 'เชียงใหม่', 'EKP ลำปาง', 'คลอง13', 'ประดู่'];

const NCRSystem: React.FC = () => {
  const { addNCRReport, getNextNCRNumber } = useData();
  
  const initialFormData = {
    toDept: 'แผนกควบคุมคุณภาพ', date: new Date().toISOString().split('T')[0], copyTo: '',
    founder: 'สมชาย ใจดี', poNo: '',
    problemDamaged: false, problemLost: false, problemMixed: false, problemWrongInv: false, problemLate: false, problemDuplicate: false, problemWrong: false, problemIncomplete: false, problemOver: false, problemWrongInfo: false, problemShortExpiry: false, problemTransportDamage: false, problemAccident: false, problemOther: false, problemOtherText: '', problemDetail: '',
    actionReject: false, actionRejectQty: 0, actionRejectSort: false, actionRejectSortQty: 0, actionRework: false, actionReworkQty: 0, actionReworkMethod: '', actionSpecialAccept: false, actionSpecialAcceptQty: 0, actionSpecialAcceptReason: '', actionScrap: false, actionScrapQty: 0, actionReplace: false, actionReplaceQty: 0,
    causePackaging: false, causeTransport: false, causeOperation: false, causeEnv: false, causeDetail: '', preventionDetail: '', preventionDueDate: '',
    dueDate: '', approver: '', approverPosition: '', approverDate: '', responsiblePerson: '', responsiblePosition: '',
    qaAccept: false, qaReject: false, qaReason: ''
  };

  const [formData, setFormData] = useState(initialFormData);

  const [ncrItems, setNcrItems] = useState<NCRItem[]>([]);
  const [showItemModal, setShowItemModal] = useState(false);
  const [newItem, setNewItem] = useState<Partial<NCRItem>>({ branch: '', refNo: '', neoRefNo: '', productCode: '', productName: '', customerName: '', destinationCustomer: '', quantity: 0, unit: '', priceBill: 0, expiryDate: '', hasCost: false, costAmount: 0, costResponsible: '', problemSource: '' });
  const [isCustomReportBranch, setIsCustomReportBranch] = useState(false);
  const [sourceSelection, setSourceSelection] = useState({ category: '', whBranch: '', whCause: '', whOtherText: '', transType: '', transName: '', transPlate: '', transVehicleType: '', transAffiliation: '', transCompany: '', otherText: '' });

  useEffect(() => {
    if (showItemModal) {
      setSourceSelection({ category: '', whBranch: '', whCause: '', whOtherText: '', transType: '', transName: '', transPlate: '', transVehicleType: '', transAffiliation: '', transCompany: '', otherText: '' });
      setIsCustomReportBranch(false);
    }
  }, [showItemModal]);

  const handleAddItem = () => {
      if (!newItem.productCode || !newItem.branch) { alert("กรุณาระบุรหัสสินค้าและสาขา"); return; }
      let formattedSource = '';
      const s = sourceSelection;
      if (s.category === 'Customer') formattedSource = 'ลูกค้า'; 
      else if (s.category === 'Accounting') formattedSource = 'บัญชี'; 
      else if (s.category === 'Keying') formattedSource = 'พนักงานคีย์ข้อมูลผิด'; 
      else if (s.category === 'Warehouse') { 
          formattedSource = `ภายในคลังสินค้า (${s.whBranch || '-'}) - สาเหตุ: ${s.whCause}${s.whCause === 'อื่นๆ' ? ' ' + s.whOtherText : ''}`; 
      } else if (s.category === 'Transport') { 
          const type = s.transType === 'Company' ? 'พนักงานขับรถบริษัท' : 'รถขนส่งร่วม'; 
          const details = [
              s.transName ? `ชื่อ: ${s.transName}` : '', 
              s.transPlate ? `ทะเบียน: ${s.transPlate}` : '', 
              s.transVehicleType ? `ประเภท: ${s.transVehicleType}` : '', 
              s.transAffiliation ? `สังกัด: ${s.transAffiliation}` : '', 
              s.transType === 'Joint' && s.transCompany ? `บ.: ${s.transCompany}` : ''
          ].filter(Boolean).join(', '); 
          formattedSource = `ระหว่างขนส่ง (${type}) - ${details}`; 
      } else if (s.category === 'Other') { 
          formattedSource = `อื่นๆ: ${s.otherText}`; 
      }

      const item: NCRItem = { ...newItem as NCRItem, id: Date.now().toString(), destinationCustomer: newItem.destinationCustomer || '', quantity: Number(newItem.quantity) || 0, priceBill: Number(newItem.priceBill) || 0, costAmount: Number(newItem.costAmount) || 0, problemSource: formattedSource || newItem.problemSource || '-' };
      setNcrItems([...ncrItems, item]);
      setNewItem({ branch: '', refNo: '', neoRefNo: '', productCode: '', productName: '', customerName: '', destinationCustomer: '', quantity: 0, unit: '', priceBill: 0, expiryDate: '', hasCost: false, costAmount: 0, costResponsible: '', problemSource: '' });
      setShowItemModal(false);
  };

  const handleDeleteItem = (id: string) => { setNcrItems(ncrItems.filter(i => i.id !== id)); };
  const handlePrint = () => { window.print(); };

  const handleSaveRecord = async () => {
      // 1. Validation Logic
      const errors = [];
      if (!formData.founder.trim()) errors.push("ผู้พบปัญหา");
      
      const isProblemChecked = 
        formData.problemDamaged || formData.problemLost || formData.problemMixed || formData.problemWrongInv ||
        formData.problemLate || formData.problemDuplicate || formData.problemWrong || formData.problemIncomplete ||
        formData.problemOver || formData.problemWrongInfo || formData.problemShortExpiry || formData.problemTransportDamage ||
        formData.problemAccident || (formData.problemOther && formData.problemOtherText.trim());

      if (!isProblemChecked && !formData.problemDetail.trim()) {
          errors.push("ระบุปัญหาที่พบ (ติ๊กเลือกหัวข้อ หรือ กรอกรายละเอียด)");
      }

      if (ncrItems.length === 0) {
          errors.push("รายการสินค้า (กรุณากดปุ่ม '+ เพิ่มรายการ' สีน้ำเงิน)");
      }

      if (errors.length > 0) {
          alert("กรุณากรอกข้อมูลต่อไปนี้ให้ครบถ้วนก่อนบันทึก:\n\n" + errors.map(e => "- " + e).join("\n"));
          return;
      }
      
      // 2. Save Logic
      const newNcrNo = await getNextNCRNumber();
      if (newNcrNo.includes('ERR')) {
          alert("ไม่สามารถสร้างเลขที่ NCR อัตโนมัติได้ กรุณาลองใหม่อีกครั้ง");
          return;
      }

      let successCount = 0;

      // Save each item in the list as a separate NCR Record
      for (const item of ncrItems) {
          const record: NCRRecord = {
              ...formData,
              id: `${newNcrNo}-${item.id}`, // Composite unique ID
              ncrNo: newNcrNo,
              item: item, // Embed the full item object
              status: formData.qaAccept ? 'Closed' : 'Open',
          };
          
          const success = await addNCRReport(record);
          if (success) {
              successCount++;
          } else {
              break; 
          }
      }

      if (successCount === ncrItems.length) {
          alert(`บันทึกข้อมูล NCR เลขที่ ${newNcrNo} เข้าระบบเรียบร้อย (Saved Successfully)`);
          setNcrItems([]);
          setFormData(initialFormData);
      } else {
          alert(`บันทึกข้อมูลไม่สำเร็จ! กรุณาตรวจสอบการเชื่อมต่อหรือสิทธิ์การใช้งาน\n(สำเร็จ: ${successCount}, ล้มเหลว: ${ncrItems.length - successCount})`);
      }
  };

  return (
    <div className="p-8 h-full overflow-auto bg-slate-100 flex flex-col items-center print:p-0 print:m-0 print:bg-white print:h-auto print:overflow-visible print:block">
      <div className="w-full max-w-5xl flex justify-end gap-2 mb-6 print:hidden">
            <button onClick={handlePrint} className="bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-sm hover:bg-slate-700 transition-colors"><Printer className="w-4 h-4" /> Print Form / Save as PDF</button>
            <button onClick={handleSaveRecord} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-sm hover:bg-blue-700 transition-colors"><Save className="w-4 h-4" /> Save Record</button>
      </div>
      <div className="w-full max-w-5xl bg-white shadow-xl border border-slate-200 min-h-[1100px] relative print:shadow-none print:border-none print:w-full print:max-w-none p-10">
        {/* HEADER */}
        <div className="flex border-2 border-black mb-6">
            <div className="w-[30%] border-r-2 border-black p-4 flex items-center justify-center"><img src="https://img2.pic.in.th/pic/logo-neo.png" alt="Neo Logistics" className="w-full h-auto object-contain max-h-24" /></div>
            <div className="w-[70%] p-4 flex flex-col justify-center pl-6"><h2 className="text-xl font-bold text-slate-900 leading-none mb-2">บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด</h2><h3 className="text-sm font-bold text-slate-700 mb-3">NEOSIAM LOGISTICS & TRANSPORT CO., LTD.</h3><p className="text-sm text-slate-600 mb-1">159/9-10 หมู่ 7 ต.บางม่วง อ.เมืองนครสวรรค์ จ.นครสวรรค์ 60000</p><div className="text-sm text-slate-600 flex gap-4"><span>Tax ID: 0105552087673</span><span className="text-slate-400">|</span><span>Tel: 056-275-841</span></div></div>
        </div>
        <h1 className="text-xl font-bold text-center border-2 border-black py-2 mb-6 bg-white text-slate-900 print:bg-transparent">ใบแจ้งปัญหาระบบ (NCR) / ใบแจ้งปัญหารับสินค้าคืน</h1>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm mb-8">
            <div className="flex items-center gap-2"><label className="font-bold w-24 text-slate-800">ถึงหน่วยงาน:</label><input type="text" className="flex-1 border-b border-dotted border-slate-400 bg-transparent outline-none px-1 text-slate-700 print:border-none" value={formData.toDept} onChange={e => setFormData({...formData, toDept: e.target.value})} /></div>
            <div className="flex items-center gap-2"><label className="font-bold w-24 text-slate-800">วันที่:</label><input type="date" className="flex-1 border-b border-dotted border-slate-400 bg-transparent outline-none px-1 text-slate-700 print:border-none" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} /></div>
            <div className="flex items-center gap-2"><label className="font-bold w-24 text-slate-800">สำเนา:</label><input type="text" className="flex-1 border-b border-dotted border-slate-400 bg-transparent outline-none px-1 text-slate-700 print:border-none" value={formData.copyTo} onChange={e => setFormData({...formData, copyTo: e.target.value})} /></div>
            <div className="flex items-center gap-2">
                <label className="font-bold w-24 text-slate-800">เลขที่ NCR: <span className="text-red-500">*</span></label>
                <div className="flex-1 border-b border-dotted border-slate-400 bg-slate-100 outline-none px-2 py-1 font-mono text-slate-500 font-bold rounded-sm text-center">
                    จะถูกสร้างอัตโนมัติเมื่อบันทึก
                </div>
            </div>
            <div className="flex items-center gap-2"><label className="font-bold w-24 text-slate-800">ผู้พบปัญหา: <span className="text-red-500">*</span></label><input type="text" className="flex-1 border-b border-dotted border-slate-400 bg-transparent outline-none px-1 text-slate-700 print:border-none" value={formData.founder} onChange={e => setFormData({...formData, founder: e.target.value})} /></div>
            <div className="flex items-center gap-2"><label className="font-bold w-32 text-slate-800">เลขที่ใบสั่งซื้อ/ผลิต:</label><input type="text" className="flex-1 border-b border-dotted border-slate-400 bg-transparent outline-none px-1 text-slate-700 print:border-none" value={formData.poNo} onChange={e => setFormData({...formData, poNo: e.target.value})} /></div>
        </div>

        {/* ITEM LIST */}
        <div className="mb-6">
            <div className="flex justify-between items-center mb-2"><h3 className="font-bold text-slate-900 underline">รายการสินค้าที่พบปัญหา (Non-Conforming Items) <span className="text-red-500">*</span></h3><button onClick={() => setShowItemModal(true)} className="print:hidden text-xs bg-blue-600 text-white px-2 py-1 rounded flex items-center gap-1 hover:bg-blue-700"><Plus className="w-3 h-3" /> เพิ่มรายการ</button></div>
            <div className="border-2 border-black bg-white">
                <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 print:bg-transparent border-b border-black font-bold"><tr><th className="p-2 border-r border-black">สาขาต้นทาง</th><th className="p-2 border-r border-black">Ref/Neo Ref</th><th className="p-2 border-r border-black">สินค้า/ลูกค้า</th><th className="p-2 border-r border-black text-center">จำนวน</th><th className="p-2 border-r border-black text-right">ราคา/วันหมดอายุ</th><th className="p-2 border-r border-black">วิเคราะห์ปัญหา/ค่าใช้จ่าย</th><th className="p-2 text-center print:hidden w-10">ลบ</th></tr></thead>
                    <tbody className="divide-y divide-black">
                        {ncrItems.length === 0 ? (<tr><td colSpan={7} className="p-4 text-center text-slate-400 italic">ยังไม่มีรายการสินค้า (กดปุ่ม '+ เพิ่มรายการ')</td></tr>) : (ncrItems.map(item => (<tr key={item.id}><td className="p-2 border-r border-black align-top"><div>{item.branch}</div></td><td className="p-2 border-r border-black align-top"><div>Ref: {item.refNo}</div><div className="text-slate-500">Neo: {item.neoRefNo}</div></td><td className="p-2 border-r border-black align-top"><div className="font-bold">{item.productCode}</div><div className="text-slate-600 font-medium">{item.productName}</div><div className="text-slate-500">{item.customerName}</div>{item.destinationCustomer && (<div className="text-xs text-blue-600 mt-1">ปลายทาง: {item.destinationCustomer}</div>)}</td><td className="p-2 border-r border-black text-center align-top">{item.quantity} {item.unit}</td><td className="p-2 border-r border-black text-right align-top"><div>{item.priceBill.toLocaleString()} บ.</div><div className="text-red-500">Exp: {item.expiryDate}</div></td><td className="p-2 border-r border-black align-top"><div className="font-medium">{item.problemSource}</div>{item.hasCost && (<div className="text-red-600 font-bold mt-1">Cost: {item.costAmount?.toLocaleString()} บ.<div className="text-xs text-slate-500 font-normal">({item.costResponsible})</div></div>)}</td><td className="p-2 text-center align-top print:hidden"><button onClick={() => handleDeleteItem(item.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button></td></tr>)))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* SECTION 1: PROBLEM */}
        <table className="w-full border-2 border-black mb-6"><thead><tr className="border-b-2 border-black bg-slate-50 print:bg-transparent"><th className="border-r-2 border-black w-1/3 py-2 text-slate-900">รูปภาพ / เอกสาร</th><th className="py-2 text-slate-900">รายละเอียดของปัญหาที่พบ (ผู้พบปัญหา)</th></tr></thead><tbody><tr><td className="border-r-2 border-black p-4 text-center align-middle h-64 relative bg-white"><div className="flex flex-col items-center justify-center text-red-500 opacity-50 print:opacity-100 print:text-black"><h2 className="text-3xl font-bold mb-2">รูปภาพ / เอกสาร</h2><h2 className="text-3xl font-bold">ตามแนบ</h2><ImageIcon className="w-16 h-16 mt-4 print:hidden" /></div><input type="file" className="absolute inset-0 opacity-0 cursor-pointer print:hidden" title="Upload Image" /></td><td className="p-4 align-top text-sm bg-white"><div className="mb-2 font-bold underline text-slate-900">พบปัญหาที่กระบวนการ <span className="text-red-500">*</span></div><div className="grid grid-cols-2 gap-2 mb-4 text-slate-700">
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" checked={formData.problemDamaged} onChange={e => setFormData({...formData, problemDamaged: e.target.checked})} /> ชำรุด</label>
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" checked={formData.problemLost} onChange={e => setFormData({...formData, problemLost: e.target.checked})} /> สูญหาย</label>
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" checked={formData.problemMixed} onChange={e => setFormData({...formData, problemMixed: e.target.checked})} /> สินค้าสลับ</label>
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" checked={formData.problemWrongInv} onChange={e => setFormData({...formData, problemWrongInv: e.target.checked})} /> สินค้าไม่ตรง INV.</label>
                            
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" checked={formData.problemLate} onChange={e => setFormData({...formData, problemLate: e.target.checked})} /> ส่งช้า</label>
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" checked={formData.problemDuplicate} onChange={e => setFormData({...formData, problemDuplicate: e.target.checked})} /> ส่งซ้ำ</label>
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" checked={formData.problemWrong} onChange={e => setFormData({...formData, problemWrong: e.target.checked})} /> ส่งผิด</label>
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" checked={formData.problemIncomplete} onChange={e => setFormData({...formData, problemIncomplete: e.target.checked})} /> ส่งของไม่ครบ</label>
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" checked={formData.problemOver} onChange={e => setFormData({...formData, problemOver: e.target.checked})} /> ส่งของเกิน</label>
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" checked={formData.problemWrongInfo} onChange={e => setFormData({...formData, problemWrongInfo: e.target.checked})} /> ข้อมูลผิด</label>
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" checked={formData.problemShortExpiry} onChange={e => setFormData({...formData, problemShortExpiry: e.target.checked})} /> สินค้าอายุสั้น</label>
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" checked={formData.problemTransportDamage} onChange={e => setFormData({...formData, problemTransportDamage: e.target.checked})} /> สินค้าเสียหายบนรถขนส่ง</label>
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" checked={formData.problemAccident} onChange={e => setFormData({...formData, problemAccident: e.target.checked})} /> อุบัติเหตุ</label>

                            <div className="flex items-center gap-2 p-1 col-span-2"><input type="checkbox" checked={formData.problemOther} onChange={e => setFormData({...formData, problemOther: e.target.checked})} /> <span>อื่นๆ</span><input type="text" className="border-b border-dotted border-slate-400 bg-transparent outline-none w-full text-slate-700 print:border-none" value={formData.problemOtherText} onChange={e => setFormData({...formData, problemOtherText: e.target.value})} /></div>
                        </div><div className="font-bold underline mb-1 text-slate-900">รายละเอียด:</div><textarea className="w-full h-32 border border-slate-200 bg-slate-50 p-2 text-sm resize-none focus:ring-1 focus:ring-blue-500 outline-none text-slate-700 print:border-none" value={formData.problemDetail} onChange={e => setFormData({...formData, problemDetail: e.target.value})}></textarea></td></tr></tbody></table>

        {/* SECTION 2: ACTION (GRID LAYOUT) */}
        <table className="w-full border-2 border-black mb-6 text-sm bg-white">
            <thead><tr className="bg-slate-50 print:bg-transparent border-b-2 border-black"><th colSpan={2} className="py-2 text-center font-bold text-slate-900">การดำเนินการ</th></tr></thead>
            <tbody className="divide-y divide-black border-b-2 border-black">
                <tr>
                    <td className="p-2 border-r border-black w-1/2"><div className="flex items-center gap-2"><input type="checkbox" checked={formData.actionReject} onChange={e => setFormData({...formData, actionReject: e.target.checked})} /> <span className="font-bold">ส่งคืน (Reject)</span><span className="ml-auto text-slate-600">จำนวน:</span><input type="number" className="w-20 border-b border-dotted border-black text-center bg-transparent print:border-none outline-none" value={formData.actionRejectQty} onChange={e => setFormData({...formData, actionRejectQty: parseInt(e.target.value)})} /></div></td>
                    <td className="p-2 w-1/2"><div className="flex items-center gap-2"><input type="checkbox" checked={formData.actionRejectSort} onChange={e => setFormData({...formData, actionRejectSort: e.target.checked})} /> <span className="font-bold">คัดแยกของเสียเพื่อส่งคืน</span><span className="ml-auto text-slate-600">จำนวน:</span><input type="number" className="w-20 border-b border-dotted border-black text-center bg-transparent print:border-none outline-none" value={formData.actionRejectSortQty} onChange={e => setFormData({...formData, actionRejectSortQty: parseInt(e.target.value)})} /></div></td>
                </tr>
                <tr>
                    <td className="p-2 border-r border-black"><div className="flex items-center gap-2"><input type="checkbox" checked={formData.actionRework} onChange={e => setFormData({...formData, actionRework: e.target.checked})} /> <span className="font-bold">แก้ไข (Rework)</span><span className="ml-auto text-slate-600">จำนวน:</span><input type="number" className="w-20 border-b border-dotted border-black text-center bg-transparent print:border-none outline-none" value={formData.actionReworkQty} onChange={e => setFormData({...formData, actionReworkQty: parseInt(e.target.value)})} /></div></td>
                    <td className="p-2"><div className="flex items-center gap-2"><span className="font-bold">วิธีการแก้ไข</span><input type="text" className="flex-1 border-b border-dotted border-black bg-transparent print:border-none outline-none" value={formData.actionReworkMethod} onChange={e => setFormData({...formData, actionReworkMethod: e.target.value})} /></div></td>
                </tr>
                <tr>
                    <td className="p-2 border-r border-black"><div className="flex items-center gap-2"><input type="checkbox" checked={formData.actionSpecialAccept} onChange={e => setFormData({...formData, actionSpecialAccept: e.target.checked})} /> <span className="font-bold">ยอมรับกรณีพิเศษ</span><span className="ml-auto text-slate-600">จำนวน:</span><input type="number" className="w-20 border-b border-dotted border-black text-center bg-transparent print:border-none outline-none" value={formData.actionSpecialAcceptQty} onChange={e => setFormData({...formData, actionSpecialAcceptQty: parseInt(e.target.value)})} /></div></td>
                    <td className="p-2"><div className="flex items-center gap-2"><span className="font-bold">เหตุผลในการยอมรับ</span><input type="text" className="flex-1 border-b border-dotted border-black bg-transparent print:border-none outline-none" value={formData.actionSpecialAcceptReason} onChange={e => setFormData({...formData, actionSpecialAcceptReason: e.target.value})} /></div></td>
                </tr>
                <tr>
                    <td className="p-2 border-r border-black"><div className="flex items-center gap-2"><input type="checkbox" checked={formData.actionScrap} onChange={e => setFormData({...formData, actionScrap: e.target.checked})} /> <span className="font-bold">ทำลาย (Scrap)</span><span className="ml-auto text-slate-600">จำนวน:</span><input type="number" className="w-20 border-b border-dotted border-black text-center bg-transparent print:border-none outline-none" value={formData.actionScrapQty} onChange={e => setFormData({...formData, actionScrapQty: parseInt(e.target.value)})} /></div></td>
                    <td className="p-2"><div className="flex items-center gap-2"><input type="checkbox" checked={formData.actionReplace} onChange={e => setFormData({...formData, actionReplace: e.target.checked})} /> <span className="font-bold">เปลี่ยนสินค้าใหม่</span><span className="ml-auto text-slate-600">จำนวน:</span><input type="number" className="w-20 border-b border-dotted border-black text-center bg-transparent print:border-none outline-none" value={formData.actionReplaceQty} onChange={e => setFormData({...formData, actionReplaceQty: parseInt(e.target.value)})} /></div></td>
                </tr>
            </tbody>
            <tfoot>
                <tr>
                    <td colSpan={2} className="p-3 bg-white print:bg-transparent">
                        <div className="flex justify-between items-center gap-4 text-sm">
                            <div className="flex items-center gap-2"><span>กำหนดแล้วเสร็จ</span><input type="date" className="border-b border-dotted border-black bg-transparent print:border-none text-slate-700 outline-none" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} /></div>
                            <div className="flex items-center gap-2"><span>ผู้อนุมัติ</span><input type="text" className="w-32 border-b border-dotted border-black bg-transparent print:border-none text-slate-700 text-center outline-none" value={formData.approver} onChange={e => setFormData({...formData, approver: e.target.value})} /></div>
                            <div className="flex items-center gap-2"><span>ตำแหน่ง</span><input type="text" className="w-24 border-b border-dotted border-black bg-transparent print:border-none text-slate-700 text-center outline-none" value={formData.approverPosition} onChange={e => setFormData({...formData, approverPosition: e.target.value})} /></div>
                            <div className="flex items-center gap-2"><span>วันที่</span><input type="date" className="border-b border-dotted border-black bg-transparent print:border-none text-slate-700 outline-none" value={formData.approverDate} onChange={e => setFormData({...formData, approverDate: e.target.value})} /></div>
                        </div>
                    </td>
                </tr>
            </tfoot>
        </table>

        {/* SECTION 3: ROOT CAUSE & PREVENTION */}
        <table className="w-full border-2 border-black mb-6 text-sm bg-white">
            <thead><tr className="bg-slate-50 print:bg-transparent border-b-2 border-black"><th colSpan={2} className="py-2 text-center font-bold text-slate-900">สาเหตุ-การป้องกัน (ผู้รับผิดชอบปัญหา)</th></tr></thead>
            <tbody>
                <tr>
                    <td className="w-1/4 border-r-2 border-black align-top p-0">
                        <div className="border-b border-black p-2 font-bold text-center bg-slate-50 print:bg-transparent">สาเหตุเกิดจาก</div>
                        <div className="p-4 space-y-3">
                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.causePackaging} onChange={e => setFormData({...formData, causePackaging: e.target.checked})} /> บรรจุภัณฑ์</label>
                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.causeTransport} onChange={e => setFormData({...formData, causeTransport: e.target.checked})} /> การขนส่ง</label>
                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.causeOperation} onChange={e => setFormData({...formData, causeOperation: e.target.checked})} /> ปฏิบัติงาน</label>
                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.causeEnv} onChange={e => setFormData({...formData, causeEnv: e.target.checked})} /> สิ่งแวดล้อม</label>
                        </div>
                    </td>
                    <td className="align-top p-0">
                        <div className="h-24 border-b border-black p-2 flex flex-col">
                            <div className="font-bold mb-1">รายละเอียดสาเหตุ :</div>
                            <textarea className="flex-1 w-full bg-transparent outline-none resize-none text-slate-700" value={formData.causeDetail} onChange={e => setFormData({...formData, causeDetail: e.target.value})}></textarea>
                        </div>
                        <div className="h-24 p-2 flex flex-col">
                            <div className="font-bold underline mb-1">แนวทางป้องกัน :</div>
                            <textarea className="flex-1 w-full bg-transparent outline-none resize-none text-slate-700" value={formData.preventionDetail} onChange={e => setFormData({...formData, preventionDetail: e.target.value})}></textarea>
                        </div>
                    </td>
                </tr>
                <tr className="border-t-2 border-black">
                    <td colSpan={2} className="p-3 bg-white print:bg-transparent">
                        <div className="flex justify-between items-center gap-4 text-sm">
                            <div className="flex items-center gap-2"><span>กำหนดการป้องกันแล้วเสร็จ</span><input type="date" className="border-b border-dotted border-black bg-transparent print:border-none text-slate-700 outline-none" value={formData.preventionDueDate} onChange={e => setFormData({...formData, preventionDueDate: e.target.value})} /></div>
                            <div className="flex items-center gap-2"><span>ผู้รับผิดชอบ</span><input type="text" className="w-32 border-b border-dotted border-black bg-transparent print:border-none text-slate-700 text-center outline-none" value={formData.responsiblePerson} onChange={e => setFormData({...formData, responsiblePerson: e.target.value})} /></div>
                            <div className="flex items-center gap-2"><span>ตำแหน่ง</span><input type="text" className="w-24 border-b border-dotted border-black bg-transparent print:border-none text-slate-700 text-center outline-none" value={formData.responsiblePosition} onChange={e => setFormData({...formData, responsiblePosition: e.target.value})} /></div>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>

        {/* NOTE */}
        <div className="border-2 border-black p-2 mb-6 text-xs bg-white">
            <span className="font-bold">หมายเหตุ :</span> เมื่อทาง Supplier/Out source หรือหน่วยงานผู้รับผิดชอบปัญหา ได้รับเอกสารใบ NCR กรุณาระบุสาเหตุ-การป้องกัน และตอบกลับมายังแผนกประกันคุณภาพ ภายใน 1 สัปดาห์
        </div>

        {/* SECTION 4: CLOSING */}
        <table className="w-full border-2 border-black text-sm bg-white">
            <thead><tr className="bg-slate-50 print:bg-transparent border-b-2 border-black"><th colSpan={2} className="py-2 text-center font-bold text-slate-900">การตรวจติดตามและการปิด NCR</th></tr></thead>
            <tbody>
                <tr className="border-b-2 border-black">
                    <td colSpan={2} className="p-4">
                        <div className="flex items-center gap-8">
                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.qaAccept} onChange={e => setFormData({...formData, qaAccept: e.target.checked, qaReject: false})} /> ยอมรับแนวทางการป้องกัน</label>
                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.qaReject} onChange={e => setFormData({...formData, qaReject: e.target.checked, qaAccept: false})} /> ไม่ยอมรับแนวทางการป้องกัน</label>
                            <input type="text" className="flex-1 border-b border-dotted border-black bg-transparent outline-none text-slate-700" placeholder="ระบุเหตุผล (ถ้ามี)" value={formData.qaReason} onChange={e => setFormData({...formData, qaReason: e.target.value})} />
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

        {/* FOOTER */}
        <div className="text-right text-xs mt-4 font-mono text-slate-400">FM-OP01-06 Rev.00</div>
      </div>

      {/* MODAL - Add Item */}
      {showItemModal && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="p-4 bg-slate-800 text-white flex justify-between items-center shrink-0"><h3 className="font-bold">เพิ่มรายการสินค้า (Add Item)</h3><button onClick={() => setShowItemModal(false)}><X className="w-5 h-5" /></button></div>
                  <div className="p-6 overflow-y-auto space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2">
                              <label className="block text-xs font-bold text-slate-500 mb-2">สาขา (แจ้งปัญหา) *</label>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm bg-slate-50 p-3 rounded border border-slate-200">{REPORTING_BRANCHES.map(branch => (<label key={branch} className="flex items-center gap-1 cursor-pointer"><input type="radio" name="reportingBranch" checked={newItem.branch === branch} onChange={() => { setNewItem({...newItem, branch: branch}); setIsCustomReportBranch(false); }} />{branch}</label>))}<label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="reportingBranch" checked={isCustomReportBranch} onChange={() => { setNewItem({...newItem, branch: ''}); setIsCustomReportBranch(true); }} />อื่นๆ (พิมพ์ข้อความ)</label></div>
                              {isCustomReportBranch && (<input type="text" className="w-full border border-slate-300 rounded p-2 text-sm mt-2 focus:ring-1 focus:ring-blue-500" placeholder="ระบุสาขา..." value={newItem.branch} onChange={e => setNewItem({...newItem, branch: e.target.value})} />)}
                          </div>
                          <div><label className="block text-xs font-bold text-slate-500 mb-1">รหัสสินค้า *</label><input type="text" className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-1 focus:ring-blue-500" value={newItem.productCode} onChange={e => setNewItem({...newItem, productCode: e.target.value})} /></div>
                          <div><label className="block text-xs font-bold text-slate-500 mb-1">ชื่อสินค้า</label><input type="text" className="w-full border border-slate-300 rounded p-2 text-sm" value={newItem.productName} onChange={e => setNewItem({...newItem, productName: e.target.value})} /></div>
                          <div><label className="block text-xs font-bold text-slate-500 mb-1">ชื่อลูกค้า</label><input type="text" className="w-full border border-slate-300 rounded p-2 text-sm" value={newItem.customerName} onChange={e => setNewItem({...newItem, customerName: e.target.value})} /></div>
                          <div><label className="block text-xs font-bold text-slate-500 mb-1">สถานที่ส่ง (ลูกค้าปลายทาง)</label><input type="text" className="w-full border border-slate-300 rounded p-2 text-sm" value={newItem.destinationCustomer} onChange={e => setNewItem({...newItem, destinationCustomer: e.target.value})} /></div>
                          <div><label className="block text-xs font-bold text-slate-500 mb-1">เลขที่เอกสารอ้างอิง</label><input type="text" className="w-full border border-slate-300 rounded p-2 text-sm" value={newItem.refNo} onChange={e => setNewItem({...newItem, refNo: e.target.value})} /></div>
                          <div><label className="block text-xs font-bold text-slate-500 mb-1">เลขที่เอกสาร Neo Siam</label><input type="text" className="w-full border border-slate-300 rounded p-2 text-sm" value={newItem.neoRefNo} onChange={e => setNewItem({...newItem, neoRefNo: e.target.value})} /></div>
                          <div className="grid grid-cols-3 gap-2 col-span-2">
                              <div><label className="block text-xs font-bold text-slate-500 mb-1">จำนวน</label><input type="number" className="w-full border border-slate-300 rounded p-2 text-sm" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: e.target.value})} /></div>
                              <div><label className="block text-xs font-bold text-slate-500 mb-1">หน่วย</label><input type="text" className="w-full border border-slate-300 rounded p-2 text-sm" value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})} /></div>
                              <div><label className="block text-xs font-bold text-slate-500 mb-1">วันหมดอายุ</label><input type="date" className="w-full border border-slate-300 rounded p-2 text-sm" value={newItem.expiryDate} onChange={e => setNewItem({...newItem, expiryDate: e.target.value})} /></div>
                          </div>
                          <div><label className="block text-xs font-bold text-slate-500 mb-1">ราคาหน้าบิล</label><input type="number" className="w-full border border-slate-300 rounded p-2 text-sm" value={newItem.priceBill} onChange={e => setNewItem({...newItem, priceBill: e.target.value})} /></div>
                          <div className="flex items-center pt-6"><label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-red-600"><input type="checkbox" checked={newItem.hasCost} onChange={e => setNewItem({...newItem, hasCost: e.target.checked})} /> มีค่าใช้จ่าย (Has Cost)</label></div>
                          {newItem.hasCost && (
                              <>
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">ค่าใช้จ่าย (บาท)</label><input type="number" className="w-full border border-red-300 bg-red-50 rounded p-2 text-sm" value={newItem.costAmount} onChange={e => setNewItem({...newItem, costAmount: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">ผู้รับผิดชอบค่าใช้จ่าย</label><input type="text" className="w-full border border-red-300 bg-red-50 rounded p-2 text-sm" value={newItem.costResponsible} onChange={e => setNewItem({...newItem, costResponsible: e.target.value})} /></div>
                              </>
                          )}
                      </div>
                      
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                          <label className="block text-sm font-bold text-slate-700 mb-3 border-b border-slate-200 pb-1">วิเคราะห์ปัญหาเกิดจาก</label>
                          <div className="flex flex-wrap gap-4 mb-4 text-sm">
                              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="sourceCat" checked={sourceSelection.category === 'Customer'} onChange={() => setSourceSelection({...sourceSelection, category: 'Customer'})} /> ลูกค้า (Customer)</label>
                              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="sourceCat" checked={sourceSelection.category === 'Accounting'} onChange={() => setSourceSelection({...sourceSelection, category: 'Accounting'})} /> บัญชี (Accounting)</label>
                              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="sourceCat" checked={sourceSelection.category === 'Keying'} onChange={() => setSourceSelection({...sourceSelection, category: 'Keying'})} /> พนักงานคีย์ข้อมูลผิด (Keying)</label>
                              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="sourceCat" checked={sourceSelection.category === 'Warehouse'} onChange={() => setSourceSelection({...sourceSelection, category: 'Warehouse'})} /> ภายในคลังสินค้า (Warehouse)</label>
                              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="sourceCat" checked={sourceSelection.category === 'Transport'} onChange={() => setSourceSelection({...sourceSelection, category: 'Transport'})} /> ระหว่างขนส่ง (Transport)</label>
                              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="sourceCat" checked={sourceSelection.category === 'Other'} onChange={() => setSourceSelection({...sourceSelection, category: 'Other'})} /> อื่นๆ (Other)</label>
                          </div>
                          <div className="pl-2 space-y-3">
                              {sourceSelection.category === 'Warehouse' && (
                                  <div className="space-y-3 animate-fade-in">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                          <div>
                                              <label className="text-xs font-bold text-slate-500 mb-1 block">เลือกสาขา/หน่วยงาน</label>
                                              <select className="w-full border rounded p-1.5 text-sm" value={sourceSelection.whBranch} onChange={e => setSourceSelection({...sourceSelection, whBranch: e.target.value})}>
                                                  <option value="">-- เลือกสาขา --</option>
                                                  {WAREHOUSE_BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                                              </select>
                                          </div>
                                          <div>
                                              <label className="text-xs font-bold text-slate-500 mb-1 block">ระบุสาเหตุ (Cause)</label>
                                              <div className="flex flex-wrap gap-2 text-sm mt-1">
                                                  {WAREHOUSE_CAUSES.map(c => (
                                                      <label key={c} className="flex items-center gap-1 cursor-pointer"><input type="radio" name="whCause" checked={sourceSelection.whCause === c} onChange={() => setSourceSelection({...sourceSelection, whCause: c})} />{c}</label>
                                                  ))}
                                              </div>
                                              {sourceSelection.whCause === 'อื่นๆ' && <input type="text" className="border-b border-slate-400 outline-none text-sm w-full mt-1" placeholder="ระบุ..." value={sourceSelection.whOtherText} onChange={e => setSourceSelection({...sourceSelection, whOtherText: e.target.value})} />}
                                          </div>
                                      </div>
                                  </div>
                              )}
                              {sourceSelection.category === 'Transport' && (
                                  <div className="space-y-3 animate-fade-in bg-white p-3 rounded border border-slate-200">
                                      <div className="flex gap-4 mb-2 text-sm font-bold text-slate-700">
                                          <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="transType" checked={sourceSelection.transType === 'Company'} onChange={() => setSourceSelection({...sourceSelection, transType: 'Company'})} /> พนักงานขับรถบริษัท</label>
                                          <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="transType" checked={sourceSelection.transType === 'Joint'} onChange={() => setSourceSelection({...sourceSelection, transType: 'Joint'})} /> รถขนส่งร่วม</label>
                                      </div>
                                      {sourceSelection.transType && (
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                              <input type="text" placeholder="ชื่อพนักงาน/คนขับ" className="border p-1.5 rounded text-sm" value={sourceSelection.transName} onChange={e => setSourceSelection({...sourceSelection, transName: e.target.value})} />
                                              <input type="text" placeholder="ทะเบียนรถ" className="border p-1.5 rounded text-sm" value={sourceSelection.transPlate} onChange={e => setSourceSelection({...sourceSelection, transPlate: e.target.value})} />
                                              <input type="text" placeholder="ประเภทรถ" className="border p-1.5 rounded text-sm" value={sourceSelection.transVehicleType} onChange={e => setSourceSelection({...sourceSelection, transVehicleType: e.target.value})} />
                                              <input type="text" placeholder="สังกัด (สาขา/หน่วยงาน)" className="border p-1.5 rounded text-sm" value={sourceSelection.transAffiliation} onChange={e => setSourceSelection({...sourceSelection, transAffiliation: e.target.value})} />
                                              {sourceSelection.transType === 'Joint' && (
                                                  <input type="text" placeholder="บริษัท (Company)" className="border p-1.5 rounded text-sm md:col-span-2" value={sourceSelection.transCompany} onChange={e => setSourceSelection({...sourceSelection, transCompany: e.target.value})} />
                                              )}
                                          </div>
                                      )}
                                  </div>
                              )}
                              {sourceSelection.category === 'Other' && (
                                  <div className="animate-fade-in">
                                      <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm" placeholder="ระบุรายละเอียดอื่นๆ..." value={sourceSelection.otherText} onChange={e => setSourceSelection({...sourceSelection, otherText: e.target.value})} />
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>
                  <div className="p-4 border-t flex justify-end gap-2 bg-slate-50 shrink-0"><button onClick={() => setShowItemModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">ยกเลิก</button><button onClick={handleAddItem} className="px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700">บันทึกรายการ</button></div>
              </div>
          </div>
      )}
    </div>
  );
};

export default NCRSystem;
