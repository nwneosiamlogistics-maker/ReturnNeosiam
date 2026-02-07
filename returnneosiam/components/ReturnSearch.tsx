
import React, { useState, useMemo } from 'react';
import { useData } from '../DataContext';
import { BRANCH_LIST } from '../constants';
import { SearchFilters, ReturnStatus, ReturnRecord, DispositionAction } from '../types';
import { Search, AlertCircle, CheckCircle, Clock, XCircle, MapPin, Eye, FileText, Truck, RotateCcw, Trash2, Home, ShieldCheck, AlertTriangle, User, Phone, Building2, Package, Activity, Download, ChevronLeft, ChevronRight, Lock, Edit } from 'lucide-react';

interface ExtendedSearchFilters extends SearchFilters {
  branch: string;
  disposition: DispositionAction | 'All';
}

const ReturnSearch: React.FC = () => {
  const { items, deleteReturnRecord, updateReturnRecord } = useData();
  const [filters, setFilters] = useState<ExtendedSearchFilters>({
    startDate: '',
    endDate: '',
    status: 'All',
    category: 'All',
    query: '',
    branch: 'All',
    disposition: 'All'
  });

  const [selectedItem, setSelectedItem] = useState<ReturnRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // State for Modals
  const [showDeletePasswordModal, setShowDeletePasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [pendingDeleteItem, setPendingDeleteItem] = useState<ReturnRecord | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ReturnRecord | null>(null);

  const filteredData = useMemo(() => {
    return items.filter(item => {
      if (filters.status !== 'All' && item.status !== filters.status) return false;
      if (filters.disposition !== 'All' && item.disposition !== filters.disposition) return false;
      if (filters.branch !== 'All' && item.branch !== filters.branch) return false;
      if (filters.startDate && item.date < filters.startDate) return false;
      if (filters.endDate && item.date > filters.endDate) return false;

      const q = filters.query.toLowerCase();
      if (q &&
        !item.customerName?.toLowerCase().includes(q) &&
        !item.productName?.toLowerCase().includes(q) &&
        !item.productCode?.toLowerCase().includes(q) &&
        !item.id?.toLowerCase().includes(q) &&
        !item.refNo?.toLowerCase().includes(q) &&
        !item.ncrNumber?.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [filters, items]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [filters, itemsPerPage]);

  const handleDeleteClick = (item: ReturnRecord) => {
    setPendingDeleteItem(item);
    setPasswordInput('');
    setShowDeletePasswordModal(true);
  };

  const handleVerifyPasswordAndDelete = async () => {
    if (passwordInput === '888') {
      if (pendingDeleteItem) {
        const success = await deleteReturnRecord(pendingDeleteItem.id);
        if (success) {
          alert(`ลบรายการ ${pendingDeleteItem.id} สำเร็จ`);
        } else {
          alert('การลบล้มเหลว กรุณาตรวจสอบสิทธิ์');
        }
      }
      setShowDeletePasswordModal(false);
    } else {
      alert('รหัสผ่านไม่ถูกต้อง');
    }
  };

  const handleEditClick = (item: ReturnRecord) => {
    setEditingItem({ ...item }); // Create a copy for editing
    setPasswordInput('');
    setShowEditModal(true);
  };

  const handleVerifyPasswordAndEdit = () => {
    if (passwordInput === '888') {
      setShowEditModal(false); // Close password modal
      // The editingItem is already set, so the edit modal will open.
    } else {
      alert('รหัสผ่านไม่ถูกต้อง');
    }
  };

  const handleSaveEdit = async () => {
    if (editingItem) {
      const success = await updateReturnRecord(editingItem.id, editingItem);
      if (success) {
        alert('บันทึกการแก้ไขสำเร็จ');
        setEditingItem(null); // Close edit modal
        if (selectedItem?.id === editingItem.id) {
          setSelectedItem(editingItem); // Update detail view if it was open
        }
      } else {
        alert('บันทึกการแก้ไขล้มเหลว');
      }
    }
  };


  const handleExportCSV = () => {
    const headers = ["Date", "Branch", "Ref No", "NCR No", "Product Code", "Product Name", "Customer", "Qty", "Unit", "Price Bill", "Total Amount", "Status", "Condition", "Disposition", "Disposition Detail"];
    const rows = filteredData.map(item => [
      item.date, item.branch, item.refNo, item.ncrNumber || '-', item.productCode, `"${item.productName.replace(/"/g, '""')}"`, `"${item.customerName.replace(/"/g, '""')}"`, item.quantity, item.unit, item.priceBill, item.amount, item.status, item.condition || '-', item.disposition || '-',
      item.disposition === 'RTV' ? item.dispositionRoute : item.disposition === 'Restock' ? item.sellerName : item.disposition === 'InternalUse' ? item.internalUseDetail : item.disposition === 'Claim' ? item.claimCompany : '-'
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `return_data_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: ReturnStatus) => {
    switch (status) {
      case 'Approved':
      case 'Completed': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 border border-green-200"><CheckCircle className="w-3 h-3" /> จบงาน</span>;
      case 'Rejected': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200"><XCircle className="w-3 h-3" /> ยกเลิก</span>;
      case 'Documented': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200"><FileText className="w-3 h-3" /> ออกเอกสารแล้ว</span>;
      default: return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200"><Clock className="w-3 h-3" /> รอตรวจสอบ</span>;
    }
  };

  const getDispositionBadge = (disp?: DispositionAction) => {
    if (!disp || disp === 'Pending') return <span className="text-slate-400">-</span>;
    const config = {
      'RTV': { color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Truck, label: 'ส่งคืน (Return)' },
      'Restock': { color: 'bg-green-50 text-green-700 border-green-200', icon: RotateCcw, label: 'ขาย (Sell)' },
      'Recycle': { color: 'bg-red-50 text-red-700 border-red-200', icon: Trash2, label: 'ทิ้ง (Scrap)' },
      'InternalUse': { color: 'bg-purple-50 text-purple-700 border-purple-200', icon: Home, label: 'ใช้ภายใน' },
      'Claim': { color: 'bg-blue-50 text-blue-700 border-blue-200', icon: ShieldCheck, label: 'เคลมประกัน' }
    }[disp];
    if (!config) return <span>{disp}</span>;
    const Icon = config.icon;
    return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${config.color}`}><Icon className="w-3 h-3" /> {config.label}</span>;
  };

  const TimelineItem = ({ title, date, icon: Icon, active, last }: { title: string, date?: string, icon: React.ElementType, active: boolean, last?: boolean }) => (
    <div className="flex flex-col items-center relative flex-1">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 z-10 ${active ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}><Icon className="w-4 h-4" /></div>
      {!last && (<div className={`absolute top-4 left-1/2 w-full h-0.5 -translate-y-1/2 ${active && date ? 'bg-blue-600' : 'bg-slate-200'}`}></div>)}
      <span className={`text-xs font-bold ${active ? 'text-slate-800' : 'text-slate-400'}`}>{title}</span>
      <span className="text-[10px] text-slate-500 mt-0.5">{date || '-'}</span>
    </div>
  );

  return (
    <div className="p-6 h-full flex flex-col space-y-6 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"><div><h2 className="text-2xl font-bold text-slate-800">ค้นหาและประวัติ (Search & History)</h2><p className="text-slate-500 text-sm">ตรวจสอบสถานะ ติดตาม NCR และดูรายละเอียดการจัดการสินค้าคืน</p></div><div className="flex gap-2"><button onClick={handleExportCSV} className="flex items-center gap-2 text-sm font-bold bg-green-600 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-green-700 transition-colors"><Download className="w-4 h-4" /> Export Excel</button><div className="text-slate-500 text-sm font-medium bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm">พบข้อมูล {filteredData.length} รายการ</div></div></div>

      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2"><label className="text-xs font-bold text-slate-500 mb-1 block">ค้นหา (Search)</label><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" /><input type="text" placeholder="ค้นหา Ref, NCR, สินค้า, ลูกค้า..." title="ค้นหา" value={filters.query} onChange={(e) => setFilters({ ...filters, query: e.target.value })} className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" /></div></div>
          <div><label className="text-xs font-bold text-slate-500 mb-1 block">สาขาต้นทาง (Branch)</label><div className="relative"><select title="สาขาต้นทาง" value={filters.branch} onChange={(e) => setFilters({ ...filters, branch: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none"><option value="All">ทุกสาขา</option>{BRANCH_LIST.map(b => <option key={b} value={b}>{b}</option>)}</select></div></div>
          <div><label className="text-xs font-bold text-slate-500 mb-1 block">การตัดสินใจ (Disposition)</label><div className="relative"><select title="การตัดสินใจ" value={filters.disposition} onChange={(e) => setFilters({ ...filters, disposition: e.target.value as DispositionAction | 'All' })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none"><option value="All">ทั้งหมด</option><option value="Restock">ขาย (Restock)</option><option value="RTV">ส่งคืน (RTV)</option><option value="Claim">เคลมประกัน (Claim)</option><option value="InternalUse">ใช้ภายใน (Internal)</option><option value="Recycle">ทิ้ง (Scrap)</option><option value="Pending">รอดำเนินการ</option></select></div></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs font-bold text-slate-500 mb-1 block">วันที่เริ่มต้น</label><input type="date" title="วันที่เริ่มต้น" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none" /></div>
            <div><label className="text-xs font-bold text-slate-500 mb-1 block">วันที่สิ้นสุด</label><input type="date" title="วันที่สิ้นสุด" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="overflow-auto relative flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
              <tr><th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase bg-slate-50">วันที่ / สาขา</th><th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase bg-slate-50">อ้างอิง (Ref / NCR)</th><th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase bg-slate-50">สินค้า</th><th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase bg-slate-50">ลูกค้า</th><th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-center bg-slate-50">สภาพ (QC)</th><th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-center bg-slate-50">การจัดการ</th><th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right bg-slate-50">มูลค่า (Bill)</th><th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-center bg-slate-50">เมนู</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.length > 0 ? (
                paginatedData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-600"><div className="font-medium text-slate-800">{item.date}</div><div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" /> {item.branch}</div></td>
                    <td className="px-4 py-3 text-sm"><div className="font-medium text-blue-600">{item.refNo}</div><div className="text-xs text-slate-400 font-mono">{item.id}</div>{item.ncrNumber && (<div className="text-[10px] text-red-600 font-bold bg-red-50 px-1 rounded inline-block mt-1 border border-red-100">NCR: {item.ncrNumber}</div>)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600"><div className="font-medium text-slate-800 truncate max-w-[200px]" title={item.productName}>{item.productName}</div><div className="text-xs text-slate-500">{item.productCode}</div></td>
                    <td className="px-4 py-3 text-sm text-slate-600 truncate max-w-[150px]">{item.customerName}</td>
                    <td className="px-4 py-3 text-center">{item.condition && item.condition !== 'Unknown' ? (<span className={`text-[10px] px-2 py-0.5 rounded-full border ${['New', 'BoxDamage', 'WetBox', 'LabelDefect'].includes(item.condition) ? 'bg-green-50 text-green-700 border-green-200' : item.condition === 'Damaged' || item.condition === 'Defective' || item.condition === 'Expired' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>{item.condition === 'New' ? 'สภาพดี' : item.condition === 'BoxDamage' ? 'มีตำหนิ/บุบ' : item.condition === 'Expired' ? 'หมดอายุ' : item.condition}</span>) : <span className="text-slate-300 text-xs">-</span>}</td>
                    <td className="px-4 py-3 text-center">{getDispositionBadge(item.disposition)}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 text-right font-mono">{(item.priceBill * item.quantity).toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setSelectedItem(item)} className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1.5 rounded-lg transition-colors" title="ดูรายละเอียด"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => handleEditClick(item)} className="text-amber-500 hover:text-amber-700 hover:bg-amber-50 p-1.5 rounded-lg transition-colors" title="แก้ไข"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteClick(item)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors" title="ลบ"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-400 bg-slate-50/30"><div className="flex flex-col items-center gap-3"><AlertCircle className="w-10 h-10 text-slate-300" /><p>ไม่พบข้อมูลที่ตรงกับเงื่อนไข</p></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-slate-50 border-t border-slate-200 p-3 flex justify-between items-center">
          <div className="flex items-center gap-2 text-sm text-slate-600"><span>แสดง</span><select title="จำนวนรายการต่อหน้า" value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} className="border border-slate-300 rounded p-1 bg-white outline-none focus:ring-1 focus:ring-blue-500"><option value={20}>20</option><option value={50}>50</option><option value={100}>100</option></select><span>รายการต่อหน้า</span></div>
          <div className="flex items-center gap-2"><span className="text-xs text-slate-500 mr-2">หน้า {currentPage} จาก {totalPages || 1}</span><button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} title="หน้าก่อนหน้า" className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronLeft className="w-4 h-4" /></button><button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0} title="หน้าถัดไป" className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronRight className="w-4 h-4" /></button></div>
        </div>
      </div>

      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fade-in">
            <div className="bg-slate-800 text-white p-5 flex justify-between items-start"><div><div className="flex items-center gap-3 mb-1"><span className="bg-blue-500 text-xs px-2 py-0.5 rounded font-mono font-bold">{selectedItem.id}</span>{getStatusBadge(selectedItem.status)}</div><h3 className="text-xl font-bold">{selectedItem.productName}</h3><p className="text-sm text-slate-300">Ref: {selectedItem.refNo}</p></div><button onClick={() => setSelectedItem(null)} title="ปิด" className="text-slate-400 hover:text-white transition-colors"><XCircle className="w-8 h-8" /></button></div>
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mb-6">
                <h4 className="font-bold text-slate-700 text-xs uppercase mb-4 tracking-wider border-b pb-2">ไทม์ไลน์สถานะ (Status Timeline)</h4>
                <div className="flex justify-between items-start px-4"><TimelineItem title="แจ้งคืน" date={selectedItem.dateRequested || selectedItem.date} icon={FileText} active={true} /><TimelineItem title="รับเข้า" date={selectedItem.dateReceived} icon={Package} active={!!selectedItem.dateReceived} /><TimelineItem title="QC" date={selectedItem.dateGraded} icon={Activity} active={!!selectedItem.dateGraded} /><TimelineItem title="ออกเอกสาร" date={selectedItem.dateDocumented} icon={FileText} active={!!selectedItem.dateDocumented} /><TimelineItem title="ปิดงาน" date={selectedItem.dateCompleted} icon={CheckCircle} active={!!selectedItem.dateCompleted} last={true} /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4"><h4 className="font-bold text-slate-700 flex items-center gap-2 border-b border-slate-100 pb-2"><FileText className="w-4 h-4 text-blue-500" /> ข้อมูลทั่วไป (General Info)</h4><div className="grid grid-cols-2 gap-4 text-sm"><div><p className="text-slate-500 text-xs">สาขาต้นทาง</p><p className="font-medium text-slate-800">{selectedItem.branch}</p></div><div><p className="text-slate-500 text-xs">วันที่รับเรื่อง</p><p className="font-medium text-slate-800">{selectedItem.date}</p></div><div className="col-span-2"><p className="text-slate-500 text-xs">ลูกค้า</p><p className="font-medium text-slate-800">{selectedItem.customerName}</p></div></div></div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4"><h4 className="font-bold text-slate-700 flex items-center gap-2 border-b border-slate-100 pb-2"><Package className="w-4 h-4 text-purple-500" /> ข้อมูลสินค้า (Product & Value)</h4><div className="grid grid-cols-2 gap-4 text-sm"><div><p className="text-slate-500 text-xs">รหัสสินค้า</p><p className="font-mono text-slate-800">{selectedItem.productCode || '-'}</p></div><div><p className="text-slate-500 text-xs">จำนวน</p><p className="font-bold text-slate-800">{selectedItem.quantity} {selectedItem.unit}</p></div><div><p className="text-slate-500 text-xs">ราคาหน้าบิล</p><p className="font-mono text-slate-800">฿{(selectedItem.priceBill || 0).toLocaleString()}</p></div><div><p className="text-slate-500 text-xs">ราคาขาย</p><p className="font-mono text-slate-800">฿{(selectedItem.priceSell || 0).toLocaleString()}</p></div><div className="col-span-2"><p className="text-slate-500 text-xs">วันหมดอายุ</p><p className={`font-medium ${selectedItem.expiryDate ? 'text-red-600' : 'text-slate-400'}`}>{selectedItem.expiryDate || 'ไม่ระบุ'}</p></div></div></div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4"><h4 className="font-bold text-slate-700 flex items-center gap-2 border-b border-slate-100 pb-2"><AlertTriangle className="w-4 h-4 text-red-500" /> ปัญหาและการรับเข้า (Intake Analysis)</h4>
                  <div className="space-y-3 text-sm">
                    {selectedItem.ncrNumber && (<div className="bg-red-50 border border-red-100 p-2 rounded text-red-700 font-bold text-center">เลขที่ NCR: {selectedItem.ncrNumber}</div>)}
                    <div className="grid grid-cols-2 gap-4">
                      <div><p className="text-slate-500 text-xs">ปัญหาที่พบ</p><p className="font-medium text-slate-800">{selectedItem.problemType || '-'}</p></div>
                      <div><p className="text-slate-500 text-xs">สาเหตุ</p><p className="font-medium text-slate-800">{selectedItem.rootCause || '-'}</p></div>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs mb-2 font-bold uppercase">การดำเนินการเบื้องต้น (Initial Actions)</p>
                      <div className="space-y-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
                        {selectedItem.actionReject && (<p><span className="font-bold w-32 inline-block">ส่งคืน (Reject):</span> {selectedItem.actionRejectQty} units</p>)}
                        {selectedItem.actionRejectSort && (<p><span className="font-bold w-32 inline-block">คัดแยกเพื่อส่งคืน:</span> {selectedItem.actionRejectSortQty} units</p>)}
                        {selectedItem.actionRework && (<p><span className="font-bold w-32 inline-block">แก้ไข (Rework):</span> {selectedItem.actionReworkQty} units - <i className="text-slate-500">&quot;{selectedItem.actionReworkMethod}&quot;</i></p>)}
                        {selectedItem.actionSpecialAcceptance && (<p><span className="font-bold w-32 inline-block">ยอมรับกรณีพิเศษ:</span> {selectedItem.actionSpecialAcceptanceQty} units - <i className="text-slate-500">&quot;{selectedItem.actionSpecialAcceptanceReason}&quot;</i></p>)}
                        {selectedItem.actionScrap && (<p><span className="font-bold w-32 inline-block">ทำลาย (Scrap):</span> {selectedItem.actionScrapQty} units</p>)}
                        {selectedItem.actionReplace && (<p><span className="font-bold w-32 inline-block">เปลี่ยนสินค้าใหม่:</span> {selectedItem.actionReplaceQty} units</p>)}
                        {!selectedItem.actionReject && !selectedItem.actionRework && !selectedItem.actionScrap && !selectedItem.actionSpecialAcceptance && <p className="text-slate-400 italic">ไม่มีการดำเนินการเบื้องต้นที่บันทึกไว้</p>}
                      </div>
                    </div>
                    <div><p className="text-slate-500 text-xs">หมายเหตุรับเข้า</p><p className="text-slate-700 italic">{selectedItem.reason}</p></div>
                  </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4"><h4 className="font-bold text-slate-700 flex items-center gap-2 border-b border-slate-100 pb-2"><Activity className="w-4 h-4 text-green-500" /> ผลการตรวจสอบและจัดการ (Result)</h4><div className="grid grid-cols-2 gap-4 mb-4"><div className="bg-slate-50 p-3 rounded-lg text-center"><p className="text-xs text-slate-500 mb-1">สภาพสินค้า (Condition)</p><div className="font-bold text-slate-800">{selectedItem.condition === 'New' ? 'สภาพดี' : selectedItem.condition === 'BoxDamage' ? 'มีตำหนิ/บุบ' : selectedItem.condition === 'Expired' ? 'หมดอายุ' : selectedItem.condition || 'รอตรวจสอบ'}</div></div><div className="bg-slate-50 p-3 rounded-lg text-center"><p className="text-xs text-slate-500 mb-1">การตัดสินใจ (Disposition)</p><div className="flex justify-center">{getDispositionBadge(selectedItem.disposition)}</div></div></div><div className="text-sm border-t border-slate-100 pt-3"><p className="text-xs text-slate-500 mb-2 font-bold uppercase">รายละเอียดเพิ่มเติม (Details)</p>{selectedItem.disposition === 'RTV' && (<div className="flex items-center gap-2 text-amber-700"><Truck className="w-4 h-4" /> <span>ปลายทาง: <b>{selectedItem.dispositionRoute || '-'}</b></span></div>)}{selectedItem.disposition === 'Restock' && (<div className="space-y-1 text-green-700"><div className="flex items-center gap-2"><User className="w-4 h-4" /> ผู้ซื้อ: <b>{selectedItem.sellerName || '-'}</b></div><div className="flex items-center gap-2"><Phone className="w-4 h-4" /> โทร: {selectedItem.contactPhone || '-'}</div></div>)}{selectedItem.disposition === 'Claim' && (<div className="space-y-1 text-blue-700"><div className="flex items-center gap-2"><Building2 className="w-4 h-4" /> บ.ประกัน: <b>{selectedItem.claimCompany || '-'}</b></div><div className="flex items-center gap-2"><User className="w-4 h-4" /> ผู้ติดต่อ: {selectedItem.claimCoordinator || '-'}</div></div>)}{selectedItem.disposition === 'InternalUse' && (<div className="flex items-center gap-2 text-purple-700"><Home className="w-4 h-4" /> <span>หน่วยงาน: <b>{selectedItem.internalUseDetail || '-'}</b></span></div>)}{!selectedItem.disposition || selectedItem.disposition === 'Pending' ? (<p className="text-slate-400 italic">ยังไม่มีการดำเนินการ</p>) : null}</div></div>
              </div>
            </div>
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end"><button onClick={() => setSelectedItem(null)} className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 font-medium">ปิดหน้าต่าง</button></div>
          </div>
        </div>
      )}

      {/* DELETE PASSWORD MODAL */}
      {showDeletePasswordModal && (
        <div className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm animate-fade-in">
            <div className="flex items-center gap-3 mb-4 text-slate-800">
              <div className="bg-red-100 p-2 rounded-full"><Lock className="w-6 h-6 text-red-600" /></div>
              <h3 className="text-lg font-bold">ยืนยันการลบข้อมูล</h3>
            </div>
            <p className="text-sm text-slate-500 mb-4">กรุณาระบุรหัสผ่านเพื่อยืนยันการลบข้อมูล <span className="font-bold text-red-600">{pendingDeleteItem?.id}</span></p>
            <input
              type="password"
              title="Password"
              className="w-full border border-slate-300 rounded-lg p-2.5 text-center tracking-widest text-lg font-bold mb-6 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Enter Password"
              autoFocus
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVerifyPasswordAndDelete()}
            />
            <div className="flex gap-3">
              <button onClick={() => setShowDeletePasswordModal(false)} className="flex-1 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">ยกเลิก</button>
              <button onClick={handleVerifyPasswordAndDelete} className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 shadow-sm">ยืนยันการลบ</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PASSWORD MODAL */}
      {showEditModal && !editingItem && (
        <div className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm animate-fade-in">
            <h3 className="text-lg font-bold mb-4">Password for Edit</h3>
            <input
              type="password"
              title="Password for Edit"
              placeholder="Enter Password"
              className="w-full border p-2 rounded mb-4"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVerifyPasswordAndEdit()}
            />
            <div className="flex gap-2">
              <button onClick={() => setShowEditModal(false)} className="flex-1 py-2 border rounded">Cancel</button>
              <button onClick={handleVerifyPasswordAndEdit} className="flex-1 py-2 bg-blue-600 text-white rounded">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
            <h3 className="p-4 font-bold border-b">Edit Record: {editingItem.id}</h3>
            <div className="p-4 overflow-auto space-y-3">
              <div><label className="text-xs">Branch</label><input type="text" title="Branch" placeholder="Branch" value={editingItem.branch} onChange={e => setEditingItem({ ...editingItem, branch: e.target.value })} className="w-full border p-1 rounded" /></div>
              <div><label className="text-xs">Customer Name</label><input type="text" title="Customer Name" placeholder="Customer Name" value={editingItem.customerName} onChange={e => setEditingItem({ ...editingItem, customerName: e.target.value })} className="w-full border p-1 rounded" /></div>
              <div><label className="text-xs">Product Name</label><input type="text" title="Product Name" placeholder="Product Name" value={editingItem.productName} onChange={e => setEditingItem({ ...editingItem, productName: e.target.value })} className="w-full border p-1 rounded" /></div>
              <div><label className="text-xs">Quantity</label><input type="number" title="Quantity" placeholder="Quantity" value={editingItem.quantity} onChange={e => setEditingItem({ ...editingItem, quantity: parseInt(e.target.value) })} className="w-full border p-1 rounded" /></div>
              <div><label className="text-xs">Price (Bill)</label><input type="number" title="Price (Bill)" placeholder="Price (Bill)" value={editingItem.priceBill} onChange={e => setEditingItem({ ...editingItem, priceBill: parseFloat(e.target.value) })} className="w-full border p-1 rounded" /></div>
              <div><label className="text-xs">Date</label><input type="date" title="Date" value={editingItem.date} onChange={e => setEditingItem({ ...editingItem, date: e.target.value })} className="w-full border p-1 rounded" /></div>
              <div><label className="text-xs">Notes</label><textarea title="Notes" placeholder="Notes" value={editingItem.notes} onChange={e => setEditingItem({ ...editingItem, notes: e.target.value })} className="w-full border p-1 rounded" /></div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button onClick={() => setEditingItem(null)} className="px-4 py-2 border rounded">Cancel</button>
              <button onClick={handleSaveEdit} className="px-4 py-2 bg-blue-600 text-white rounded">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReturnSearch;