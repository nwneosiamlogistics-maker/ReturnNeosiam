import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../DataContext';
import {
  Search, Download, RotateCcw, Calendar, Truck,
  Printer, Edit, Trash2, X, Save, PlusSquare, MinusSquare, Layers
} from 'lucide-react';
import { ReturnRecord, ReturnStatus } from '../types';
import { formatDate } from '../utils/dateUtils';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import Swal from 'sweetalert2';
import COLTimelineModal from './COLTimelineModal';
import { COLPrintPreview } from './COLPrintPreview';

interface COLReportProps {
  onTransfer?: (data: Partial<ReturnRecord>) => void;
}

const COLReport: React.FC<COLReportProps> = () => {
  const { items, updateReturnRecord, deleteReturnRecord, getNextCollectionNumber } = useData();

  // Filters State
  const [filters, setFilters] = useState({
    query: '',
    status: 'All',
    startDate: '',
    endDate: ''
  });

  // State for Modals
  const [editItem, setEditItem] = useState<ReturnRecord | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Timeline Modal State
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [timelineItem, setTimelineItem] = useState<ReturnRecord | null>(null);

  // Print Modal State
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printItem, setPrintItem] = useState<ReturnRecord | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Grouping State
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Filter Logic: Select only Collection items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // 1. MUST be a Collection Item
      if (item.documentType === 'NCR' || (item.ncrNumber && item.documentType !== 'LOGISTICS')) {
        return false;
      }

      // 2. Apply Date Filters
      if (filters.startDate && item.date < filters.startDate) return false;
      if (filters.endDate && item.date > filters.endDate) return false;

      // 3. Apply Status Filter
      if (filters.status !== 'All' && item.status !== filters.status) return false;

      // 4. Apply Text Search
      const queryLower = filters.query.toLowerCase();
      if (queryLower) {
        const searchableText = `
          ${item.id}
          ${item.branch}
          ${item.invoiceNo || ''}
          ${item.documentNo || ''}
          ${item.tmNo || ''}
          ${item.customerName || ''}
          ${item.productCode || ''}
          ${item.productName || ''}
          ${item.destinationCustomer || ''}
          ${item.notes || ''}
          ${item.collectionOrderId || ''}
        `.toLowerCase();

        if (!searchableText.includes(queryLower)) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [items, filters]);

  // Grouping Logic: Group by Document No (R Number)
  const groupedItems = useMemo(() => {
    const groups: Record<string, ReturnRecord[]> = {};

    filteredItems.forEach(item => {
      // Key: Use Document No if available, else ID (Single Item Treat)
      const rawKey = item.documentNo ? item.documentNo.trim() : `_NO_DOC_${item.id}`;
      const key = rawKey.toLowerCase();

      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });

    // Convert to array and use the first item as representative for sorting/display
    return Object.entries(groups).map(([key, groupItems]) => ({
      key,
      items: groupItems,
      rep: groupItems[0]
    })).sort((a, b) => new Date(b.rep.date).getTime() - new Date(a.rep.date).getTime());
  }, [filteredItems]);

  // Pagination Logic (Based on GROUPS now)
  const totalPages = Math.ceil(groupedItems.length / itemsPerPage);
  const paginatedGroups = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return groupedItems.slice(startIndex, startIndex + itemsPerPage);
  }, [groupedItems, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, itemsPerPage]);

  const handleToggleExpand = (groupKey: string) => {
    const newSet = new Set(expandedGroups);
    if (newSet.has(groupKey)) newSet.delete(groupKey);
    else newSet.add(groupKey);
    setExpandedGroups(newSet);
  };

  // Actions
  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('COL Report');

    worksheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Branch', key: 'branch', width: 15 },
      { header: 'Invoice No', key: 'invoiceNo', width: 15 },
      { header: 'Control Date', key: 'controlDate', width: 15 },
      { header: 'Doc No (R)', key: 'documentNo', width: 15 },
      { header: 'TM No', key: 'tmNo', width: 15 },
      { header: 'COL No', key: 'collectionOrderId', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Product Code', key: 'productCode', width: 15 },
      { header: 'Product Name', key: 'productName', width: 30 },
      { header: 'Quantity', key: 'quantity', width: 10 },
      { header: 'Unit', key: 'unit', width: 10 },
      { header: 'Destination', key: 'destination', width: 20 },
      { header: 'Notes', key: 'notes', width: 30 },
    ];

    filteredItems.forEach(item => {
      worksheet.addRow({
        date: formatDate(item.date),
        branch: item.branch,
        invoiceNo: item.invoiceNo || '-',
        controlDate: item.controlDate || '-',
        documentNo: item.documentNo || '-',
        tmNo: item.tmNo || '-',
        collectionOrderId: item.collectionOrderId || '-',
        status: item.status,
        productCode: item.productCode === 'N/A' ? '' : item.productCode,
        productName: item.productName === 'N/A' ? '' : item.productName,
        quantity: item.quantity,
        unit: item.unit || '',
        destination: item.destinationCustomer || '-',
        notes: item.notes || '-'
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `COL_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleRowExportExcel = async (item: ReturnRecord) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('COL Item');

    // Add Header Info
    worksheet.mergeCells('A1:E1');
    worksheet.getCell('A1').value = 'ใบรับคืนสินค้า / Collection Receipt';
    worksheet.getCell('A1').font = { size: 16, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    worksheet.getCell('A3').value = 'วันที่ / Date:';
    worksheet.getCell('B3').value = formatDate(item.date);
    worksheet.getCell('D3').value = 'เลขที่ / Doc No:';
    worksheet.getCell('E3').value = item.documentNo || item.id;

    worksheet.getCell('A4').value = 'สาขา / Branch:';
    worksheet.getCell('B4').value = item.branch;

    // Table Header
    worksheet.getRow(6).values = ['รหัสสินค้า', 'รายการสินค้า', 'จำนวน', 'หน่วย', 'หมายเหตุ'];
    worksheet.getRow(6).font = { bold: true };

    // Data
    worksheet.getRow(7).values = [
      item.productCode === 'N/A' ? '' : item.productCode,
      item.productName === 'N/A' ? '' : item.productName,
      item.quantity,
      item.unit,
      item.notes || '-'
    ];

    // Adjust column widths
    worksheet.getColumn(1).width = 15;
    worksheet.getColumn(2).width = 30;
    worksheet.getColumn(3).width = 10;
    worksheet.getColumn(4).width = 10;
    worksheet.getColumn(5).width = 20;

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `COL_Item_${item.id}.xlsx`);
  };

  const handlePrint = (item: ReturnRecord) => {
    setPrintItem(item);
    setShowPrintModal(true);
  };

  const handleEdit = async (item: ReturnRecord) => {
    // Password protection for Edit
    const { value: password } = await Swal.fire({
      title: 'ยืนยันรหัสผ่านแก้ไข',
      input: 'password',
      inputLabel: 'กรุณากรอกรหัสผ่านเพื่อแก้ไขข้อมูล',
      inputPlaceholder: 'Enter password',
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
      showCancelButton: true,
      inputAttributes: {
        autocapitalize: 'off',
        autocorrect: 'off'
      }
    });

    if (password === '1234') {
      setEditItem({ ...item });
      setIsEditModalOpen(true);
    } else if (password) {
      Swal.fire('รหัสผ่านไม่ถูกต้อง', 'กรุณาลองใหม่อีกครั้ง', 'error');
    }
  };

  const handleDelete = async (targetItem: ReturnRecord) => {
    // Robust Search: Find ALL items related to this Document
    // 1. Match by DocumentNo
    // 2. Match by RefNo (sometimes used interchangeably)
    // 3. Normalized comparison (trim, lower)
    const targetDoc = (targetItem.documentNo || '').trim().toLowerCase();
    const targetRef = (targetItem.refNo || '').trim().toLowerCase();

    // Safety: Don't bulk delete if no identifier
    if (!targetDoc && !targetRef) {
      await performSingleDelete(targetItem.id);
      return;
    }

    const relatedItems = items.filter(i => {
      const iDoc = (i.documentNo || '').trim().toLowerCase();
      const iRef = (i.refNo || '').trim().toLowerCase();
      // Match Logic: Any match on Doc or Ref
      const matchDoc = targetDoc && (iDoc === targetDoc || iRef === targetDoc);
      const matchRef = targetRef && (iDoc === targetRef || iRef === targetRef);
      return matchDoc || matchRef;
    });

    const isGroup = relatedItems.length > 1;

    if (isGroup) {
      // Generate Summary of what will be deleted
      const statusCounts: Record<string, number> = {};
      relatedItems.forEach(i => { statusCounts[i.status || 'Unknown'] = (statusCounts[i.status || 'Unknown'] || 0) + 1; });
      const statusSummary = Object.entries(statusCounts).map(([s, c]) => `${s}: ${c}`).join(', ');

      const result = await Swal.fire({
        title: 'ลบข้อมูลทั้งระบบ (System Clean)',
        html: `
                พบข้อมูลที่เกี่ยวข้องกับเอกสาร <b>${targetItem.documentNo || targetItem.refNo}</b> จำนวน <b>${relatedItems.length}</b> รายการ
                <br/><div class="text-xs text-slate-500 mt-2 mb-2 bg-slate-100 p-2 rounded text-left">
                   <b>Status Breakdown:</b><br/>
                   ${statusSummary}
                </div>
                <br/>
                <span class="text-red-500 font-bold">⚠️ การลบนี้จะกำจัดข้อมูลทั้งหมด (รวมถึงรายการที่ซ่อนอยู่)</span>
                <br/><span class="text-xs">เพื่อให้คุณสามารถนำเข้าไฟล์ใหม่ได้โดยไม่ติดปัญหาตกค้าง</span>
            `,
        icon: 'warning',
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: `ยืนยันลบทั้งหมด (${relatedItems.length})`,
        denyButtonText: `ลบเฉพาะรายการนี้ (1)`,
        confirmButtonColor: '#d33',
        denyButtonColor: '#f59e0b',
      });

      if (result.isConfirmed) {
        // Delete All
        const { value: password } = await Swal.fire({
          title: 'ยืนยันรหัสผ่าน (Admin)',
          input: 'password',
          inputPlaceholder: 'Password',
          showCancelButton: true,
          inputAttributes: {
            autocapitalize: 'off',
            autocorrect: 'off'
          }
        });

        if (password === '888') {
          let successCount = 0;
          await Promise.all(relatedItems.map(async (i) => {
            const success = await deleteReturnRecord(i.id);
            if (success) successCount++;
          }));
          Swal.fire('ล้างข้อมูลสำเร็จ', `ลบรายการจำนวน ${successCount} รายการเรียบร้อยแล้ว`, 'success');
        } else if (password) {
          Swal.fire('รหัสผ่านผิด', '', 'error');
        }
      } else if (result.isDenied) {
        await performSingleDelete(targetItem.id);
      }
    } else {
      // Standard Single Delete
      await performSingleDelete(targetItem.id);
    }
  };

  const performSingleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'ลบรายการ?',
      text: "คุณต้องการลบรายการนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'ลบรายการ',
      cancelButtonText: 'ยกเลิก'
    });

    if (result.isConfirmed) {
      const { value: password } = await Swal.fire({
        title: 'ยืนยันรหัสผ่าน',
        input: 'password',
        inputLabel: 'Password',
        inputPlaceholder: 'Enter password',
        inputAttributes: {
          autocapitalize: 'off',
          autocorrect: 'off'
        }
      });

      if (password === '1234') {
        const success = await deleteReturnRecord(id);
        if (success) {
          Swal.fire('ลบสำเร็จ', 'รายการถูกลบออกจากระบบแล้ว', 'success');
        } else {
          Swal.fire('ลบไม่สำเร็จ', 'เกิดข้อผิดพลาดในการลบรายการ', 'error');
        }
      } else if (password) {
        Swal.fire('รหัสผ่านไม่ถูกต้อง', 'กรุณาลองใหม่อีกครั้ง', 'error');
      }
    }
  };

  const saveEdit = async () => {
    if (editItem) {
      await updateReturnRecord(editItem.id, editItem);
      setIsEditModalOpen(false);
      setEditItem(null);
      Swal.fire('บันทึกสำเร็จ', 'แก้ไขข้อมูลเรียบร้อยแล้ว', 'success');
    }
  };

  const handleOpenTimeline = (item: ReturnRecord) => {
    setTimelineItem(item);
    setShowTimelineModal(true);
  };

  return (
    <div className="h-full flex flex-col gap-4 p-2 md:p-4 font-inter text-slate-800 bg-slate-50/50">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/90 backdrop-blur-xl p-5 rounded-2xl border border-slate-200/60 shadow-lg print:hidden animate-fade-in-down">
        <div>
          <h2 className="text-2xl font-black bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-xl shadow-sm border border-blue-100">
              <Truck className="w-6 h-6 text-blue-600" />
            </div>
            Collection Report Center
          </h2>
          <p className="text-xs font-medium text-slate-400 mt-1 pl-1">Inbound Logistics & Collection Tracking</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
            <input
              type="text"
              placeholder="Search (Inv, Doc, COL)..."
              value={filters.query}
              onChange={e => setFilters({ ...filters, query: e.target.value })}
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/60 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent w-full md:w-64 transition-all hover:bg-white shadow-sm"
            />
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/60 rounded-xl p-1 shadow-sm">
            <input
              type="date"
              value={filters.startDate}
              onChange={e => setFilters({ ...filters, startDate: e.target.value })}
              className="bg-transparent text-xs font-bold p-1 outline-none w-28 text-slate-600 cursor-pointer hover:text-indigo-600 transition-colors"
              aria-label="Start Date"
              title="Start Date"
            />
            <span className="text-slate-300">|</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={e => setFilters({ ...filters, endDate: e.target.value })}
              className="bg-transparent text-xs font-bold p-1 outline-none w-28 text-slate-600 cursor-pointer hover:text-indigo-600 transition-colors"
              aria-label="End Date"
              title="End Date"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={e => setFilters({ ...filters, status: e.target.value })}
            className="bg-white border border-slate-200 rounded-lg text-xs font-bold px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-sm cursor-pointer hover:border-indigo-300 transition-colors max-w-[180px]"
            aria-label="Filter by Status"
            title="Filter by Status"
          >
            <option value="All">All Status</option>
            <option value="Requested">Requested</option>
            <option value="COL_JobAccepted">Job Accepted</option>
            <option value="COL_BranchReceived">Branch Received</option>
            <option value="COL_Consolidated">Consolidated</option>
            <option value="COL_InTransit">In Transit</option>
            <option value="COL_HubReceived">Hub Received</option>
            <option value="Completed">Completed</option>
          </select>

          {/* Actions */}
          <div className="flex gap-2 ml-2 border-l border-slate-200 pl-4">
            <button
              onClick={handleExportExcel}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold p-2 rounded-lg transition-all shadow-md shadow-emerald-200 hover:shadow-lg active:scale-95 flex items-center gap-2"
              title="Export All to Excel"
            >
              <Download className="w-4 h-4" />
              <span className="hidden md:inline text-xs">Export</span>
            </button>
            <button
              onClick={() => setFilters({ query: '', status: 'All', startDate: '', endDate: '' })}
              className="bg-white hover:bg-slate-50 text-slate-500 font-bold p-2 rounded-lg border border-slate-200 transition-all shadow-sm hover:shadow-md active:scale-95"
              title="Clear Filters"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-slate-200/60 shadow-xl overflow-hidden flex-1 flex flex-col print:hidden">
        <div className="overflow-auto flex-1 relative table-scroll-container">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead className="bg-slate-50/90 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-20 shadow-sm text-xs uppercase text-slate-500 font-bold tracking-wider">
              <tr>
                <th className="px-3 py-3 border-r border-slate-200/60 max-w-[50px] text-center sticky left-0 z-20 bg-slate-50/95">#</th>
                <th className="px-3 py-3 border-r border-slate-200/60 min-w-[100px]">Date</th>
                <th className="px-3 py-3 border-r border-slate-200/60 min-w-[100px]">Branch</th>
                <th className="px-3 py-3 border-r border-slate-200/60 min-w-[120px]">Invoice</th>
                <th className="px-3 py-3 border-r border-slate-200/60 min-w-[120px]">Return Doc (R)</th>
                <th className="px-3 py-3 border-r border-slate-200/60 min-w-[120px]">Control Date</th>
                <th className="px-3 py-3 border-r border-slate-200/60 min-w-[120px]">TM No</th>
                <th className="px-3 py-3 border-r border-slate-200/60 min-w-[150px]">COL No</th>
                <th className="px-3 py-3 border-r border-slate-200/60 min-w-[200px]">Product Info</th>
                <th className="px-3 py-3 text-center min-w-[100px]">Status</th>
                <th className="px-3 py-3 text-center min-w-[100px] sticky right-0 z-20 bg-slate-50/95 border-l border-slate-200/60">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white/50">
              {paginatedGroups.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-12 text-center text-slate-400 italic">
                    <div className="flex flex-col items-center justify-center opacity-50">
                      <Truck className="w-12 h-12 mb-2 text-slate-300" />
                      <span>No Collection records found matching your criteria</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedGroups.map((group, index) => {
                  const { rep, items: groupItems, key: groupKey } = group;
                  const expanded = expandedGroups.has(groupKey);

                  return (
                    <tr key={groupKey} className="hover:bg-indigo-50/40 transition-colors duration-200 text-xs text-slate-700 align-top group">
                      {/* Index */}
                      <td className="px-3 py-3 border-r border-slate-100/80 text-center text-slate-400 relative sticky left-0 z-10 bg-white/95 group-hover:bg-indigo-50/40">
                        <button
                          onClick={() => handleOpenTimeline(rep)}
                          className="absolute left-1 top-2.5 p-1 rounded-full hover:bg-blue-100 text-blue-400 hover:text-blue-600 transition-colors shadow-sm"
                          title="Timeline View"
                        >
                          <Search className="w-3 h-3" />
                        </button>
                        <span className="ml-3 font-mono">{(currentPage - 1) * itemsPerPage + index + 1}</span>
                      </td>

                      {/* Date */}
                      <td className="px-3 py-3 border-r border-slate-100/80 align-top">
                        <div className="font-medium text-slate-600 font-mono">{formatDate(rep.date)}</div>
                      </td>

                      {/* Branch */}
                      <td className="px-3 py-3 border-r border-slate-100/80 align-top">
                        <div className="font-bold text-slate-700 bg-slate-100/50 px-1.5 py-0.5 rounded border border-slate-200 inline-block">
                          {rep.branch}
                        </div>
                      </td>

                      {/* Invoice */}
                      <td className="px-3 py-3 border-r border-slate-100/80 align-top">
                        {rep.invoiceNo ? <span className="font-mono text-slate-600 hover:text-slate-900">{rep.invoiceNo}</span> : <span className="text-slate-300">-</span>}
                      </td>

                      {/* Doc No (R) */}
                      <td className="px-3 py-3 border-r border-slate-100/80 align-top">
                        {rep.documentNo ? (
                          <div className="flex flex-col gap-1">
                            <span className="font-bold text-blue-600 font-mono text-[11px] hover:underline cursor-pointer decoration-dashed decoration-blue-300">{rep.documentNo}</span>
                            {groupItems.length > 1 && (
                              <span className="inline-flex items-center gap-1 w-fit bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full text-[9px] font-bold border border-blue-100">
                                <Layers className="w-2.5 h-2.5" /> {groupItems.length} items
                              </span>
                            )}
                          </div>
                        ) : <span className="text-slate-300">-</span>}
                      </td>

                      {/* Control Date */}
                      <td className="px-3 py-3 border-r border-slate-100/80 align-top">
                        {rep.controlDate ? (
                          <div className="flex items-center gap-1 text-slate-500">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span className="font-mono text-[11px]">{formatDate(rep.controlDate)}</span>
                          </div>
                        ) : <span className="text-slate-300">-</span>}
                      </td>

                      {/* TM No */}
                      <td className="px-3 py-3 border-r border-slate-100/80 align-top">
                        {rep.tmNo ? <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold border border-amber-100">{rep.tmNo}</span> : <span className="text-slate-300">-</span>}
                      </td>

                      {/* COL No */}
                      <td className="px-3 py-3 border-r border-slate-100/80 align-top">
                        {rep.collectionOrderId ? <span className="font-mono text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded text-[10px] border border-indigo-100">{rep.collectionOrderId}</span> : <span className="text-slate-300">-</span>}
                      </td>

                      {/* Product (Collapsible) */}
                      <td className="px-3 py-3 border-r border-slate-100/80 align-top">
                        <div className="flex flex-col gap-2">
                          {/* First Item */}
                          <div className="group/item">
                            <div className="flex items-center gap-1 mb-0.5">
                              <span className="font-black text-slate-700 font-mono text-[10px]">{groupItems[0].productCode === 'N/A' ? '' : groupItems[0].productCode}</span>
                            </div>
                            <div className="text-slate-600 leading-snug line-clamp-2" title={groupItems[0].productName}>{groupItems[0].productName === 'N/A' ? '' : groupItems[0].productName}</div>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[9px] font-bold border border-slate-200">
                                qty: {groupItems[0].quantity} {groupItems[0].unit}
                              </span>
                            </div>
                          </div>

                          {/* Expand Button */}
                          {groupItems.length > 1 && (
                            <button
                              onClick={() => handleToggleExpand(groupKey)}
                              className={`flex items-center justify-center gap-1 w-full py-1 rounded-lg text-[10px] font-bold border transition-all mt-1
                                        ${expanded
                                  ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                                  : 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100 hover:shadow-sm'}`}
                            >
                              {expanded ? <MinusSquare className="w-3 h-3" /> : <PlusSquare className="w-3 h-3" />}
                              {expanded ? 'Collapse' : `View ${groupItems.length - 1} more`}
                            </button>
                          )}

                          {/* Expanded List */}
                          {expanded && groupItems.length > 1 && (
                            <div className="flex flex-col gap-3 pt-3 border-t border-slate-100 mt-1 animate-slide-down">
                              {groupItems.slice(1).map((subItem) => (
                                <div key={subItem.id} className="pl-3 border-l-2 border-indigo-200 group/sub relative">
                                  <div className="font-bold text-slate-700 text-[10px] font-mono">{subItem.productCode === 'N/A' ? '' : subItem.productCode}</div>
                                  <div className="text-slate-600 text-[10px] leading-tight mb-0.5">{subItem.productName === 'N/A' ? '' : subItem.productName}</div>
                                  <div className="text-[9px] text-slate-500 font-medium">Qty: <b>{subItem.quantity} {subItem.unit}</b></div>

                                  {/* Mini Actions for Sub-Items */}
                                  <div className="flex gap-1 mt-1 opacity-0 group-hover/sub:opacity-100 transition-opacity absolute right-0 top-0">
                                    <button onClick={() => handleEdit(subItem)} className="p-1 bg-white text-amber-500 rounded border border-slate-200 hover:border-amber-300 shadow-sm" title="Edit">
                                      <Edit className="w-2.5 h-2.5" />
                                    </button>
                                    <button onClick={() => handleDelete(subItem)} className="p-1 bg-white text-red-500 rounded border border-slate-200 hover:border-red-300 shadow-sm" title="Delete">
                                      <Trash2 className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3 text-center align-top">
                        <span className={`
                          inline-flex px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wide border shadow-sm
                          ${rep.status === 'Requested' ? 'bg-slate-100 text-slate-500 border-slate-200' : ''}
                          ${rep.status === 'COL_JobAccepted' || rep.status === 'JobAccepted' ? 'bg-blue-50 text-blue-600 border-blue-100' : ''}
                          ${rep.status === 'COL_BranchReceived' || rep.status === 'BranchReceived' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : ''}
                          ${rep.status === 'COL_Consolidated' || rep.status === 'Consolidated' ? 'bg-orange-50 text-orange-600 border-orange-100' : ''}
                          ${rep.status === 'COL_InTransit' || rep.status === 'InTransit' || rep.status === 'COL_HubReceived' ? 'bg-purple-50 text-purple-600 border-purple-100' : ''}
                          ${rep.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : ''}
                          ${rep.status === 'Canceled' ? 'bg-red-50 text-red-600 border-red-100 line-through' : ''}
                        `}>
                          {rep.status}
                        </span>
                      </td>

                      {/* Actions (Main Row - First Item) */}
                      <td className="px-3 py-3 align-top text-center sticky right-0 z-20 bg-white/95 border-l border-slate-100/80 group-hover:bg-indigo-50/40">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handlePrint(rep)}
                            className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-indigo-600 transition-all shadow-sm border border-transparent hover:border-slate-200 hover:shadow-md"
                            title="Print"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleEdit(rep)}
                            className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-amber-500 transition-all shadow-sm border border-transparent hover:border-slate-200 hover:shadow-md"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRowExportExcel(rep)}
                            className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-emerald-600 transition-all shadow-sm border border-transparent hover:border-slate-200 hover:shadow-md"
                            title="Export Excel"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(rep)}
                            className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-rose-500 transition-all shadow-sm border border-transparent hover:border-slate-200 hover:shadow-md"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 border-t border-slate-200/60 bg-slate-50/50 backdrop-blur-sm flex flex-col md:flex-row justify-between items-center gap-4 text-sm print:hidden">
          <div className="flex items-center gap-2 text-slate-600">
            <span className="font-semibold text-xs">Rows per page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-bold shadow-sm"
              aria-label="Items per page"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-xs text-slate-500 font-medium ml-2">
              Displaying {paginatedGroups.length} of {filteredItems.length} Products ({groupedItems.length} Groups)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-xs font-bold text-slate-600 transition-colors"
            >
              Previous
            </button>
            <div className="px-3 py-1 bg-slate-100 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 min-w-[3rem] text-center">
              {currentPage} / {totalPages || 1}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-xs font-bold text-slate-600 transition-colors"
            >
              Next
            </button>
          </div>
        </div>

      </div>

      {/* Edit Modal */}
      {/* Edit Modal */}
      {isEditModalOpen && editItem && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-up border border-white/20">
            <div className="bg-slate-900/95 px-6 py-4 flex justify-between items-center border-b border-slate-700/50">
              <h3 className="text-white font-black text-lg flex items-center gap-3">
                <div className="p-1.5 bg-amber-500/20 rounded-lg border border-amber-500/30">
                  <Edit className="w-5 h-5 text-amber-500" />
                </div>
                <span className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Edit Record</span>
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors hover:bg-white/10 p-2 rounded-full"
                aria-label="Close"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-1">
                  <label htmlFor="edit-date" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Date</label>
                  <input
                    id="edit-date"
                    type="date"
                    value={editItem.date}
                    onChange={e => setEditItem({ ...editItem, date: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all font-semibold text-slate-700"
                  />
                </div>
                <div className="col-span-1">
                  <label htmlFor="edit-branch" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Branch</label>
                  <input
                    id="edit-branch"
                    type="text"
                    value={editItem.branch}
                    onChange={e => setEditItem({ ...editItem, branch: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all font-semibold text-slate-700"
                  />
                </div>

                <div className="col-span-1">
                  <label htmlFor="edit-invoice" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Invoice No</label>
                  <input
                    id="edit-invoice"
                    type="text"
                    value={editItem.invoiceNo || ''}
                    onChange={e => setEditItem({ ...editItem, invoiceNo: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all font-mono text-sm"
                  />
                </div>
                <div className="col-span-1">
                  <label htmlFor="edit-docno" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Doc No (R)</label>
                  <input
                    id="edit-docno"
                    type="text"
                    value={editItem.documentNo || ''}
                    onChange={e => setEditItem({ ...editItem, documentNo: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all font-mono text-sm font-bold text-blue-600"
                  />
                </div>
                <div className="col-span-1">
                  <label htmlFor="edit-colno" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">COL No</label>
                  <div className="flex gap-2">
                    <input
                      id="edit-colno"
                      type="text"
                      value={editItem.collectionOrderId || ''}
                      onChange={e => setEditItem({ ...editItem, collectionOrderId: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all font-mono text-sm font-bold text-indigo-600"
                      placeholder="COL-xxxx-xxx"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        const newColNo = await getNextCollectionNumber();
                        setEditItem({ ...editItem, collectionOrderId: newColNo });
                      }}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-xs font-bold whitespace-nowrap transition-all shadow-md shadow-indigo-200 hover:shadow-lg active:scale-95"
                      title="Generate Auto Number"
                    >
                      Auto
                    </button>
                  </div>
                </div>

                <div className="col-span-1">
                  <label htmlFor="edit-tmno" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">TM No</label>
                  <input
                    id="edit-tmno"
                    type="text"
                    value={editItem.tmNo || ''}
                    onChange={e => setEditItem({ ...editItem, tmNo: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all font-mono text-sm"
                  />
                </div>
                <div className="col-span-1">
                  <label htmlFor="edit-controldate" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Control Date</label>
                  <input
                    id="edit-controldate"
                    type="date"
                    value={editItem.controlDate || ''}
                    onChange={e => setEditItem({ ...editItem, controlDate: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>

                <div className="col-span-2">
                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-300 text-xs font-bold uppercase tracking-widest">Product Information</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                  </div>
                </div>

                <div className="col-span-1">
                  <label htmlFor="edit-productcode" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Product Code</label>
                  <input
                    id="edit-productcode"
                    type="text"
                    value={editItem.productCode}
                    onChange={e => setEditItem({ ...editItem, productCode: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all font-mono text-sm font-bold"
                  />
                </div>
                <div className="col-span-1">
                  <label htmlFor="edit-productname" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Product Name</label>
                  <input
                    id="edit-productname"
                    type="text"
                    value={editItem.productName}
                    onChange={e => setEditItem({ ...editItem, productName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>

                <div className="col-span-1">
                  <label htmlFor="edit-quantity" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Quantity</label>
                  <input
                    id="edit-quantity"
                    type="number"
                    value={editItem.quantity}
                    onChange={e => setEditItem({ ...editItem, quantity: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700"
                  />
                </div>
                <div className="col-span-1">
                  <label htmlFor="edit-unit" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Unit</label>
                  <input
                    id="edit-unit"
                    type="text"
                    value={editItem.unit}
                    onChange={e => setEditItem({ ...editItem, unit: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>

                <div className="col-span-2">
                  <label htmlFor="edit-notes" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Notes</label>
                  <textarea
                    id="edit-notes"
                    rows={3}
                    value={editItem.notes || ''}
                    onChange={e => setEditItem({ ...editItem, notes: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none resize-none transition-all"
                    placeholder="Additional comments..."
                  />
                </div>

                <div className="col-span-2">
                  <label htmlFor="edit-status" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
                  <div className="relative">
                    <select
                      id="edit-status"
                      value={editItem.status}
                      onChange={(e) => setEditItem({ ...editItem, status: e.target.value as ReturnStatus })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none appearance-none font-bold text-slate-700 cursor-pointer"
                    >
                      <option value="Requested">Requested (รอรับงาน)</option>
                      <option value="COL_JobAccepted">Job Accepted (รับงานแล้ว)</option>
                      <option value="COL_BranchReceived">Branch Received (รับสินค้าเข้าสาขา)</option>
                      <option value="COL_Consolidated">Consolidated (รวมสินค้า)</option>
                      <option value="COL_InTransit">In Transit (ระหว่างขนส่ง)</option>
                      <option value="COL_HubReceived">Hub Received (ถึง Hub)</option>
                      <option value="Completed">Completed (จบงาน)</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <Truck className="w-4 h-4" />
                    </div>
                  </div>
                </div>

              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/80 backdrop-blur-sm flex justify-end gap-3 sticky bottom-0 z-10">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-indigo-500/30 transition-all flex items-center gap-2 active:scale-95"
              >
                <Save className="w-5 h-5" /> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timeline Modal */}
      {showTimelineModal && (
        <COLTimelineModal
          isOpen={showTimelineModal}
          onClose={() => setShowTimelineModal(false)}
          item={timelineItem}
        />
      )}

      {/* Print Preview Modal */}
      {showPrintModal && printItem && (
        <COLPrintPreview
          item={printItem}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {/* CSS Styles */}
      <style>{`
        .table-scroll-container {
          max-height: calc(100vh - 220px);
        }
      `}</style>
    </div>
  );
};

export default COLReport;