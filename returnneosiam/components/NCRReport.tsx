import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../DataContext';
import { FileText, ArrowRight, CircleCheck, Clock, DollarSign, Package, Printer, X, Eye, Edit, Lock, Trash2, Search, Download, CircleX, RotateCcw, Image as ImageIcon, Save } from 'lucide-react';
import { ReturnRecord, NCRRecord, NCRItem } from '../types';
import { LineAutocomplete } from './LineAutocomplete';
import { exportNCRToExcel } from './NCRExcelExport';
import { NCRPrintPreview } from './NCRPrintPreview';
import { formatDate } from '../utils/dateUtils';
import NCRTimelineModal from './NCRTimelineModal'; // Import new modal

interface NCRReportProps {
  onTransfer: (data: Partial<ReturnRecord>) => void;
}

const NCRReport: React.FC<NCRReportProps> = ({ onTransfer }) => {
  const { ncrReports, items, updateNCRReport, deleteNCRReport } = useData();
  // Refreshed imports
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printItem, setPrintItem] = useState<NCRRecord | null>(null);

  const [showNCRFormModal, setShowNCRFormModal] = useState(false);
  const [ncrFormItem, setNcrFormItem] = useState<NCRRecord | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [pendingEditItem, setPendingEditItem] = useState<NCRRecord | null>(null);

  const [showDeletePasswordModal, setShowDeletePasswordModal] = useState(false);
  const [pendingDeleteItemId, setPendingDeleteItemId] = useState<string | null>(null);

  // Auto-scroll to top when modal opens
  useEffect(() => {
    if (showNCRFormModal) {
      // Small timeout to ensure DOM is ready
      setTimeout(() => {
        const overlay = document.getElementById('ncr-modal-overlay');
        if (overlay) {
          overlay.scrollTop = 0;
        }
      }, 10);
    }
  }, [showNCRFormModal]);

  // New Filters State with Date Range
  const [filters, setFilters] = useState({
    query: '',
    action: 'All',
    returnStatus: 'All',
    hasCost: false,
    startDate: '',
    endDate: ''
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Timeline Modal State
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [timelineReport, setTimelineReport] = useState<NCRRecord | null>(null);

  const handleOpenTimeline = (report: NCRRecord) => {
    setTimelineReport(report);
    setShowTimelineModal(true);
  };

  const uniqueFounders = useMemo(() => {
    const founders = new Set<string>();
    ncrReports.forEach(r => {
      if (r.founder) founders.add(r.founder);
      if (r.item && r.item.founder) founders.add(r.item.founder);
    });
    items.forEach(i => {
      if (i.founder) founders.add(i.founder);
    });
    return Array.from(founders).sort();
  }, [ncrReports, items]);

  const filteredNcrReports = useMemo(() => {
    // Only use authentic NCR Reports
    const allReports = [...ncrReports];

    return allReports.filter(report => {
      const itemData = report.item || (report as unknown as NCRItem);
      const correspondingReturn = items.find(item => item.ncrNumber === report.ncrNo);

      if (filters.startDate && report.date < filters.startDate) return false;
      if (filters.endDate && report.date > filters.endDate) return false;

      const queryLower = filters.query.toLowerCase();
      if (queryLower &&
        !report.ncrNo?.toLowerCase().includes(queryLower) &&
        !itemData.customerName?.toLowerCase().includes(queryLower) &&
        !itemData.productName?.toLowerCase().includes(queryLower) &&
        !itemData.productCode?.toLowerCase().includes(queryLower) &&
        !itemData.branch?.toLowerCase().includes(queryLower) &&
        !itemData.destinationCustomer?.toLowerCase().includes(queryLower) &&
        !report.problemDetail?.toLowerCase().includes(queryLower) &&
        !itemData.problemSource?.toLowerCase().includes(queryLower)
      ) {
        return false;
      }

      if (filters.action !== 'All') {
        if (filters.action === 'Reject' && !report.actionReject && !report.actionRejectSort) return false;
        if (filters.action === 'Scrap' && !report.actionScrap) return false;
      }

      if (filters.returnStatus !== 'All') {
        if (filters.returnStatus === 'NotReturned' && correspondingReturn) return false;
        if (filters.returnStatus !== 'NotReturned' && (!correspondingReturn || correspondingReturn.status !== filters.returnStatus)) {
          return false;
        }
      }

      if (filters.hasCost && !itemData.hasCost) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      const idA = a.ncrNo || a.id;
      const idB = b.ncrNo || b.id;
      return idB.localeCompare(idA);
    });
  }, [ncrReports, items, filters]);

  const handleExportExcel = () => {
    const headers = [
      "NCR No", "Date", "Status", "Product Code", "Product Name", "Customer",
      "From Branch", "To Destination", "Quantity", "Unit",
      "Problem Detail", "Problem Source",
      "Has Cost", "Cost Amount", "Cost Responsible",
      "Action", "Return Status"
    ];

    const htmlTable = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>NCR Report</x:Name>
                  <x:WorksheetOptions>
                    <x:DisplayGridlines/>
                  </x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <style>
            th { font-weight: bold; background-color: #f0f0f0; border: 1px solid #000; padding: 5px; }
            td { border: 1px solid #000; padding: 5px; vertical-align: top; }
          </style>
        </head>
        <body>
          <table>
            <thead>
              <tr>
                ${headers.map(h => `<th>${h}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${filteredNcrReports.map(report => {
      const itemData = report.item || (report as unknown as NCRItem);
      const returnRecord = items.find(item => item.ncrNumber === report.ncrNo);
      const action = report.actionReject || report.actionRejectSort ? 'Reject' : report.actionScrap ? 'Scrap' : 'N/A';

      return `<tr>
                  <td>${report.ncrNo || ''}</td>
                  <td>${formatDate(report.date)}</td>
                  <td>${report.status || ''}</td>
                  <td style="mso-number-format:'@'">${itemData.productCode || ''}</td>
                  <td>${itemData.productName || ''}</td>
                  <td>${itemData.customerName || ''}</td>
                  <td>${itemData.branch || ''}</td>
                  <td>${itemData.destinationCustomer || ''}</td>
                  <td style="text-align:center;">${itemData.quantity || 0}</td>
                  <td style="text-align:center;">${itemData.unit || ''}</td>
                  <td>${report.problemDetail || ''}</td>
                  <td>${itemData.problemSource || ''}</td>
                  <td style="text-align:center;">${itemData.hasCost ? 'Yes' : 'No'}</td>
                  <td style="text-align:right;">${itemData.costAmount || 0}</td>
                  <td>${itemData.costResponsible || ''}</td>
                  <td>${action}</td>
                  <td>${returnRecord?.status || 'Not Returned'}</td>
                </tr>`;
    }).join('')}
            </tbody>
          </table>
        </body>
        </html>
      `;

    const blob = new Blob([htmlTable], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ncr_report_${new Date().toISOString().split('T')[0]}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRowExportExcel = (report: NCRRecord) => {
    const targetNcrNo = report.ncrNo;
    const sameFormRecords = ncrReports.filter(r => r.ncrNo === targetNcrNo);

    if (sameFormRecords.length === 0) {
      alert("ไม่พบข้อมูลรายการสินค้าสำหรับ NCR นี้");
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = sameFormRecords.map(r => r.item || (r as any) as NCRItem);
    const formData = {
      ...report,
      branch: (report.item || {}).branch || '',
      problemSource: (report.item || {}).problemSource || '',
      problemAnalysisDetail: (report as unknown as NCRItem).problemAnalysisDetail || ''
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    exportNCRToExcel(formData as any, items, targetNcrNo);
  };

  // Pagination Logic
  const groupedReports = useMemo(() => {
    const groups: Record<string, NCRRecord[]> = {};
    filteredNcrReports.forEach(report => {
      const gId = report.ncrNo || report.id;
      if (!groups[gId]) groups[gId] = [];
      groups[gId].push(report);
    });
    return Object.values(groups);
  }, [filteredNcrReports]);

  const totalPages = Math.ceil(groupedReports.length / itemsPerPage);
  const paginatedGroups = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return groupedReports.slice(startIndex, startIndex + itemsPerPage);
  }, [groupedReports, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, itemsPerPage]);

  // Handlers
  const handleViewNCRForm = (report: NCRRecord) => {
    setNcrFormItem(report);
    setIsEditMode(false);
    setShowNCRFormModal(true);
  };

  const handleEditClick = (report: NCRRecord) => {
    setPendingEditItem(report);
    setPasswordInput('');
    setShowPasswordModal(true);
  };

  const handleVerifyPassword = () => {
    if (passwordInput === '1234' || passwordInput === '888') {
      setNcrFormItem(pendingEditItem);
      setIsEditMode(true);
      setShowNCRFormModal(true);
      setShowPasswordModal(false);
    } else {
      alert("รหัสผ่านไม่ถูกต้อง");
    }
  };

  const handleDeleteClick = (id: string) => {
    setPendingDeleteItemId(id);
    setPasswordInput('');
    setShowDeletePasswordModal(true);
  };

  const handleVerifyPasswordAndDelete = async () => {
    if ((passwordInput === '1234' || passwordInput === '888') && pendingDeleteItemId) {
      await deleteNCRReport(pendingDeleteItemId);
      setShowDeletePasswordModal(false);
      setPendingDeleteItemId(null);
    } else {
      alert("รหัสผ่านไม่ถูกต้อง");
    }
  };

  const handleInputChange = (field: string, value: string | number | boolean) => {
    if (!ncrFormItem) return;
    setNcrFormItem({ ...ncrFormItem, [field]: value });
  };

  const handleItemInputChange = (field: string, value: string | number | boolean) => {
    if (!ncrFormItem) return;
    setNcrFormItem({
      ...ncrFormItem,
      item: {
        ...((ncrFormItem.item || {}) as NCRItem),
        [field]: value
      }
    });
  };

  const handleProblemSelection = (field: keyof NCRRecord) => {
    if (!ncrFormItem) return;
    setNcrFormItem(prev => {
      if (!prev) return null;
      return { ...prev, [field]: !prev[field] };
    });
  };

  const handleCauseSelection = (field: keyof NCRRecord) => {
    if (!ncrFormItem) return;
    setNcrFormItem(prev => {
      if (!prev) return null;
      return { ...prev, [field]: !prev[field] };
    });
  };

  const handleSaveChanges = async () => {
    if (!ncrFormItem) return;
    if (confirm("คุณต้องการบันทึกการแก้ไขนี้ลงในระบบหรือไม่?")) {
      const success = await updateNCRReport(ncrFormItem.id, ncrFormItem);
      if (success) {
        setShowNCRFormModal(false);
        setIsEditMode(false);
      }
    }
  };

  const handleOpenPrint = (report: NCRRecord) => {
    setPrintItem(report);
    setShowPrintModal(true);
  };

  const handleCreateReturn = (report: NCRRecord) => {
    const itemData = report.item || (report as unknown as NCRItem);

    const newReturn: Partial<ReturnRecord> = {
      documentNo: report.ncrNo,
      documentType: 'NCR',
      status: 'Requested',
      date: new Date().toISOString().split('T')[0],
      productCode: itemData.productCode,
      productName: itemData.productName,
      quantity: itemData.quantity,
      unit: itemData.unit,
      customerName: itemData.customerName,
      branch: itemData.branch,
      ncrNumber: report.ncrNo,
      reason: report.problemDetail,
      notes: itemData.problemSource,
      founder: report.founder || itemData.founder,
      destinationCustomer: itemData.destinationCustomer,
      // Map actions to ReturnRecord boolean flags instead of non-existent returnType
      actionReject: report.actionReject,
      actionScrap: report.actionScrap,
      actionRejectSort: report.actionRejectSort
    };

    onTransfer(newReturn);
  };

  return (
    <div className="h-full flex flex-col gap-4 p-2 md:p-4 font-inter text-slate-800 bg-slate-50/50">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/90 backdrop-blur-xl p-5 rounded-2xl border border-slate-200/60 shadow-lg print:hidden animate-fade-in-down">
        <div>
          <h2 className="text-2xl font-black bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-xl shadow-sm border border-blue-100">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            NCR Report Center
          </h2>
          <p className="text-xs font-medium text-slate-400 mt-1 pl-1">Non-Conformance Report & Quality Management</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
            <input
              type="text"
              placeholder="Search Reports..."
              value={filters.query}
              onChange={e => setFilters({ ...filters, query: e.target.value })}
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/60 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent w-full md:w-64 transition-all hover:bg-white shadow-sm"
            />
          </div>

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
          <select
            value={filters.action}
            onChange={e => setFilters({ ...filters, action: e.target.value })}
            className="bg-white border border-slate-200 rounded-lg text-xs font-bold px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-sm cursor-pointer hover:border-indigo-300 transition-colors"
            aria-label="Filter by Action"
            title="Filter by Action"
          >
            <option value="All">All Actions</option>
            <option value="Reject">Reject</option>
            <option value="Scrap">Scrap</option>
          </select>
          <select
            value={filters.returnStatus}
            onChange={e => setFilters({ ...filters, returnStatus: e.target.value })}
            className="bg-white border border-slate-200 rounded-lg text-xs font-bold px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-sm cursor-pointer hover:border-indigo-300 transition-colors"
            aria-label="Filter by Return Status"
            title="Filter by Return Status"
          >
            <option value="All">All Returns</option>
            <option value="NotReturned">Pending Return</option>
            <option value="Requested">Requested</option>
            <option value="ReceivedAtHub">Received at Hub</option>
            <option value="Completed">Completed</option>
          </select>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-600 px-3 py-2 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 shadow-sm transition-colors select-none">
            <input type="checkbox" checked={filters.hasCost} onChange={e => setFilters({ ...filters, hasCost: e.target.checked })} className="accent-rose-500" />
            Has Cost
          </label>

          <div className="flex gap-2 ml-2 border-l border-slate-200 pl-4">
            <button
              onClick={handleExportExcel}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold p-2 rounded-lg transition-all shadow-md shadow-emerald-200 hover:shadow-lg active:scale-95"
              title="Export Excel"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => setFilters({ query: '', action: 'All', returnStatus: 'All', hasCost: false, startDate: '', endDate: '' })} // Removed docType: 'All' as it's not in the state type
              className="bg-white hover:bg-slate-50 text-slate-500 font-bold p-2 rounded-lg border border-slate-200 transition-all shadow-sm hover:shadow-md active:scale-95"
              title="Reset Filters"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-slate-200/60 shadow-xl overflow-hidden flex-1 flex flex-col print:hidden">
        <div className="overflow-auto flex-1 relative ncr-table-container">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/90 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-20 shadow-sm text-xs uppercase text-slate-500 font-bold tracking-wider">
              <tr className="whitespace-nowrap">
                <th className="px-3 py-3 sticky left-0 z-20 bg-slate-50/95 border-r border-slate-200/60 w-10 text-center text-[10px]">#</th>
                <th className="px-3 py-3 sticky left-10 z-20 bg-slate-50/95 border-r border-slate-200/60 w-[110px] text-[10px]">Date / No.</th>
                <th className="px-3 py-3 min-w-[150px] text-[10px]">Product / Desc</th>
                <th className="px-3 py-3 min-w-[120px] text-[10px]">Customer</th>
                <th className="px-3 py-3 max-w-[80px] text-[10px]">Founder</th>
                <th className="px-3 py-3 max-w-[120px] text-[10px]">Route (F/T)</th>
                <th className="px-3 py-3 text-[10px]">Problem</th>
                <th className="px-3 py-3 text-right text-[10px]">Cost</th>
                <th className="px-3 py-3 text-center text-[10px]">Action</th>
                <th className="px-3 py-3 text-center text-[10px]">Sync Status</th>
                <th className="px-3 py-3 text-center sticky right-0 z-20 bg-slate-50/95 border-l border-slate-200/60 w-[120px] text-[10px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white/50">
              {paginatedGroups.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-12 text-center text-slate-400 italic">
                    <div className="flex flex-col items-center justify-center opacity-50">
                      <FileText className="w-12 h-12 mb-2 text-slate-300" />
                      <span>No NCR records found matching your criteria</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedGroups.map((group) => {
                  const report = group[0];
                  const itemData = report.item || (report as unknown as NCRItem);
                  // Ensure productName has a fallback
                  if (!itemData.productName) itemData.productName = 'Unknown Product';
                  const correspondingReturn = items.find(item => item.ncrNumber === report.ncrNo);
                  const isCanceled = report.status === 'Canceled';

                  return (
                    <React.Fragment key={report.ncrNo || report.id}>
                      <tr className={`hover:bg-indigo-50/40 transition-colors duration-200 group ${isCanceled ? 'opacity-60 bg-slate-50' : ''}`}>
                        <td className={`px-2 py-3 sticky left-0 border-r border-slate-100 text-center z-10 ${isCanceled ? 'bg-slate-50' : 'bg-white group-hover:bg-indigo-50/40'}`}>
                          <button
                            onClick={() => handleOpenTimeline(report)}
                            className="p-1.5 rounded-full hover:bg-blue-100 text-blue-400 hover:text-blue-600 transition-colors shadow-sm hover:shadow-md"
                            title="View Timeline"
                          >
                            <Search className="w-3.5 h-3.5" />
                          </button>
                        </td>
                        <td className={`px-3 py-3 sticky left-10 border-r border-slate-100 z-10 align-top ${isCanceled ? 'bg-slate-50' : 'bg-white group-hover:bg-indigo-50/40'}`}>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${isCanceled ? 'bg-slate-200 text-slate-500' : 'bg-indigo-100 text-indigo-700'}`}>NCR</span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono font-medium">{formatDate(report.date)}</div>
                            <div
                              onClick={() => handleViewNCRForm(report)}
                              className={`font-bold text-[11px] truncate cursor-pointer hover:underline decoration-dashed decoration-blue-300 underline-offset-2 ${isCanceled ? 'text-slate-500 line-through' : 'text-blue-600'}`}
                              title={report.ncrNo || report.id}
                            >
                              {report.ncrNo || report.id}
                            </div>
                            <div className="mt-0.5">
                              {isCanceled ? (
                                <span className="inline-flex items-center gap-0.5 text-[9px] text-slate-500 font-bold px-1.5 py-0.5"><CircleX className="w-2.5 h-2.5" /> CANCELLED</span>
                              ) : report.status === 'Closed' ? (
                                <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-600 font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-100"><CircleCheck className="w-2.5 h-2.5" /> Closed</span>
                              ) : (
                                <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${correspondingReturn ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                  <Clock className="w-2.5 h-2.5" /> {report.status === 'Open' ? (correspondingReturn ? correspondingReturn.status : 'Open') : report.status}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 min-w-[180px] align-top">
                          <div className="flex flex-col gap-2">
                            {group.map((r, idx) => {
                              const rItem = r.item || (r as unknown as NCRItem);
                              return (
                                <div key={r.id || idx} className={`relative flex flex-col gap-0.5 ${idx > 0 ? 'pt-2 border-t border-slate-100/80 mr-4' : ''}`}>
                                  <div className="flex items-center gap-1.5">
                                    <Package className={`w-3.5 h-3.5 ${isCanceled ? 'text-slate-400' : 'text-indigo-500'} flex-shrink-0`} />
                                    <span className={`font-bold text-[11px] font-mono ${isCanceled ? 'text-slate-500' : 'text-slate-700'}`}>{rItem.productCode}</span>
                                  </div>
                                  <div className={`text-[11px] leading-snug pl-5 ${isCanceled ? 'text-slate-400' : 'text-slate-600'}`} title={rItem.productName}>
                                    {rItem.productName}
                                  </div>
                                  <div className="text-[10px] text-slate-400 pl-5 font-mono">
                                    Qty: <span className={`font-bold ${isCanceled ? 'text-slate-500' : 'text-slate-700'}`}>{rItem.quantity} {rItem.unit}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-3 py-3 max-w-[120px] align-top">
                          <div className={`font-bold text-[11px] leading-tight ${isCanceled ? 'text-slate-400' : 'text-slate-700'} line-clamp-2`} title={itemData.customerName}>
                            {itemData.customerName || '-'}
                          </div>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <div className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-bold border border-slate-200 truncate max-w-[80px]" title={report.founder}>
                            {report.founder || '-'}
                          </div>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <div className="flex flex-col gap-1 text-[10px]">
                            <div className="flex items-center gap-1 w-full overflow-hidden" title={`From: ${itemData.branch}`}>
                              <span className="w-4 h-4 rounded bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-[8px] border border-rose-100 shadow-sm flex-shrink-0">F</span>
                              <span className="truncate text-slate-600 font-medium">{itemData.branch}</span>
                            </div>
                            <div className="flex items-center gap-1 w-full overflow-hidden" title={`To: ${itemData.destinationCustomer}`}>
                              <span className="w-4 h-4 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-[8px] border border-emerald-100 shadow-sm flex-shrink-0">T</span>
                              <span className="truncate text-slate-600 font-medium">{itemData.destinationCustomer || '-'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 max-w-[150px] align-top">
                          <div className={`bg-slate-50 rounded-lg p-2 border border-slate-100 ${isCanceled ? 'opacity-50' : ''}`}>
                            <div className="text-[10px] font-semibold text-slate-800 leading-snug mb-1 line-clamp-2" title={report.problemDetail}>{report.problemDetail}</div>
                            <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded border font-bold ${itemData.problemSource ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                              {itemData.problemSource || 'No Source'}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right align-top">
                          {group.some(r => (r.item || r).hasCost) ? (
                            <div className="flex flex-col items-end">
                              <span className={`font-bold font-mono text-sm flex items-center gap-0.5 ${isCanceled ? 'text-slate-400' : 'text-rose-600'}`}>
                                <DollarSign className="w-3 h-3" />
                                {group.reduce((sum, r) => sum + ((r.item || r).costAmount || 0), 0).toLocaleString()}
                              </span>
                              <span className="text-[9px] text-slate-400 font-medium">{group.length} items</span>
                            </div>
                          ) : (
                            <div className="w-full text-center"><span className="text-slate-300 text-lg">-</span></div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center align-top">
                          {report.actionReject || report.actionRejectSort ? (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wide border shadow-sm ${isCanceled ? 'bg-slate-100 text-slate-400' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>Reject</span>
                          ) : report.actionScrap ? (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wide border shadow-sm ${isCanceled ? 'bg-slate-100 text-slate-400' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>Scrap</span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center align-top">
                          {correspondingReturn ? (
                            <div className={`flex flex-col items-center gap-1 p-1 rounded-lg ${correspondingReturn.status === 'Completed' ? 'bg-emerald-50/50' : 'bg-slate-50'}`}>
                              <div className={`w-2 h-2 rounded-full ${correspondingReturn.status === 'Completed' ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'}`}></div>
                              <span className={`font-bold text-[9px] truncate max-w-[70px] ${correspondingReturn.status === 'Completed' ? 'text-emerald-700' : 'text-slate-600'}`}>
                                {correspondingReturn.status}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-300 text-[10px]">Not Linked</span>
                          )}
                        </td>
                        <td className={`px-2 py-3 text-center sticky right-0 z-10 align-top border-l border-slate-100 ${isCanceled ? 'bg-slate-50 shadow-none' : 'bg-white shadow-[linear-gradient(to_right,rgba(0,0,0,0),rgba(0,0,0,0.05))] group-hover:bg-indigo-50/40'}`}>
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => handleRowExportExcel(report)} disabled={isCanceled} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-white rounded-lg transition-all shadow-sm border border-transparent hover:border-slate-200 disabled:opacity-30" title="Export Excel">
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleOpenPrint(report)} disabled={isCanceled} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all shadow-sm border border-transparent hover:border-slate-200 disabled:opacity-30" title="Print">
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleEditClick(report)} disabled={isCanceled} className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-white rounded-lg transition-all shadow-sm border border-transparent hover:border-slate-200 disabled:opacity-30" title="Edit">
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteClick(report.id)} disabled={isCanceled} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-white rounded-lg transition-all shadow-sm border border-transparent hover:border-slate-200 disabled:opacity-30" title="Delete">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Action Trigger Button */}
                            {!isCanceled && !correspondingReturn && (report.actionReject || report.actionScrap || report.actionRejectSort) && (
                              <button onClick={() => handleCreateReturn(report)} className="ml-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white p-1.5 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:scale-105" title="Create Return">
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {correspondingReturn && (
                              <span className="ml-1 w-6 h-6 flex items-center justify-center bg-emerald-100 text-emerald-600 rounded-full border border-emerald-200" title="Synced">
                                <CircleCheck className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
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
              aria-label="Rows per page"
              title="Rows per page"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-xs text-slate-500 font-medium ml-2">Displaying {paginatedGroups.length} of {filteredNcrReports.length} records</span>
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
      {/* Modals */}
      {/* Print Modal */}
      {
        showPrintModal && printItem && (
          <NCRPrintPreview
            item={printItem}
            onUpdate={setPrintItem}
            onClose={() => setShowPrintModal(false)}
            onSave={async () => {
              if (confirm("คุณต้องการบันทึกการแก้ไขนี้ลงในระบบหรือไม่?")) {
                await updateNCRReport(printItem.id, printItem);
                alert("บันทึกข้อมูลเรียบร้อย");
              }
            }}
          />
        )
      }

      {/* NCR Form Modal (Edit Mode) */}
      {
        showNCRFormModal && ncrFormItem && (
          <div id="ncr-modal-overlay" className="fixed inset-0 bg-black/50 flex items-start justify-center p-4 pt-10 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl my-8">
              <div className="p-4 border-b flex justify-between items-center bg-slate-50 sticky top-0 rounded-t-lg z-10">
                <h3 className="font-bold flex items-center gap-2 text-lg">
                  {isEditMode ? <Edit className="w-5 h-5 text-amber-500" /> : <Eye className="w-5 h-5 text-blue-500" />}
                  {isEditMode ? 'แก้ไขข้อมูล NCR' : 'ดูรายละเอียด NCR'}
                </h3>
                <button onClick={() => setShowNCRFormModal(false)} className="text-slate-500 hover:text-slate-700" aria-label="ปิด" title="ปิด">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Read Only Header Info - REPLACED WITH EDITABLE HEADER */}
                <div className="bg-white shadow-xl border border-slate-200 relative p-8 min-w-[800px]">
                  {/* HEADER */}
                  <div className="flex border-2 border-black mb-6">
                    <div className="w-[30%] border-r-2 border-black p-4 flex items-center justify-center"><img src="https://img2.pic.in.th/pic/logo-neo.png" alt="Neo Logistics" className="w-full h-auto object-contain max-h-24" /></div>
                    <div className="w-[70%] p-4 flex flex-col justify-center pl-6"><h2 className="text-xl font-bold text-slate-900 leading-none mb-2">บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด</h2><h3 className="text-sm font-bold text-slate-700 mb-3">NEOSIAM LOGISTICS & TRANSPORT CO., LTD.</h3><p className="text-sm text-slate-600 mb-1">159/9-10 หมู่ 7 ต.บางม่วง อ.เมืองนครสวรรค์ จ.นครสวรรค์ 60000</p><div className="text-sm text-slate-600 flex gap-4"><span>Tax ID: 0105552087673</span><span className="text-slate-400">|</span><span>Tel: 056-275-841</span></div></div>
                  </div>
                  <h1 className="text-xl font-bold text-center border-2 border-black py-2 mb-6 bg-white text-slate-900">ใบแจ้งปัญหาระบบ (NCR) / ใบแจ้งปัญหารับสินค้าคืน</h1>

                  {/* INFO GRID */}
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm mb-8">
                    <div className="flex items-center gap-2"><label className="font-bold w-24 text-slate-800">ถึงหน่วยงาน:</label><input type="text" disabled={!isEditMode} aria-label="ถึงหน่วยงาน" title="ถึงหน่วยงาน" className="flex-1 border-b border-dotted border-slate-400 bg-transparent outline-none px-1 text-slate-700" value={ncrFormItem.toDept || ''} onChange={e => handleInputChange('toDept', e.target.value)} /></div>
                    <div className="flex items-center gap-2"><label className="font-bold w-24 text-slate-800">วันที่:</label><input type="date" disabled={!isEditMode} aria-label="วันที่" title="วันที่" className="flex-1 border-b border-dotted border-slate-400 bg-transparent outline-none px-1 text-slate-700" value={ncrFormItem.date} onChange={e => handleInputChange('date', e.target.value)} /></div>
                    <div className="flex items-center gap-2"><label className="font-bold w-24 text-slate-800">สำเนา:</label><input type="text" disabled={!isEditMode} aria-label="สำเนา" title="สำเนา" className="flex-1 border-b border-dotted border-slate-400 bg-transparent outline-none px-1 text-slate-700" value={ncrFormItem.copyTo || ''} onChange={e => handleInputChange('copyTo', e.target.value)} /></div>
                    <div className="flex items-center gap-2">
                      <label className="font-bold w-24 text-slate-800">เลขที่ NCR: <span className="text-red-500">*</span></label>
                      <div className="flex-1 border-b border-dotted border-slate-400 bg-slate-100 outline-none px-2 py-1 font-mono text-slate-500 font-bold rounded-sm text-center">
                        {ncrFormItem.ncrNo || ncrFormItem.id?.split('-')[0] || 'N/A'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2"><label className="font-bold w-24 text-slate-800">ผู้พบปัญหา: <span className="text-red-500">*</span></label><LineAutocomplete disabled={!isEditMode} className="w-full border-b border-dotted border-slate-400 bg-transparent outline-none px-1 text-slate-700" value={ncrFormItem.founder || ''} onChange={val => handleInputChange('founder', val)} options={uniqueFounders} /></div>
                    <div className="flex items-center gap-2"><label className="font-bold w-32 text-slate-800">เลขที่ใบสั่งซื้อ/ผลิต:</label><input type="text" disabled={!isEditMode} aria-label="เลขที่ใบสั่งซื้อ/ผลิต" title="เลขที่ใบสั่งซื้อ/ผลิต" className="flex-1 border-b border-dotted border-slate-400 bg-transparent outline-none px-1 text-slate-700" value={ncrFormItem.poNo || ''} onChange={e => handleInputChange('poNo', e.target.value)} /></div>
                  </div>

                  {/* ITEM LIST */}
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-2"><h3 className="font-bold text-slate-900 underline">รายการสินค้าที่พบปัญหา (Non-Conforming Items) <span className="text-red-500">*</span></h3></div>
                    <div className="border-2 border-black bg-white">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 border-b border-black font-bold"><tr><th className="p-2 border-r border-black">สาขาต้นทาง</th><th className="p-2 border-r border-black">Ref/Neo Ref</th><th className="p-2 border-r border-black">สินค้า/ลูกค้า</th><th className="p-2 border-r border-black text-center">จำนวน</th><th className="p-2 border-r border-black text-right">ราคา/วันหมดอายุ</th><th className="p-2 border-r border-black">วิเคราะห์ปัญหา/ค่าใช้จ่าย</th></tr></thead>
                        <tbody className="divide-y divide-black">
                          <tr>
                            <td className="p-2 border-r border-black align-top">
                              <input type="text" disabled={!isEditMode} aria-label="สาขาต้นทาง" title="สาขาต้นทาง" className="w-full bg-transparent border-b border-dotted border-slate-300" value={(ncrFormItem.item || (ncrFormItem as unknown as NCRItem)).branch || ''} onChange={e => handleItemInputChange('branch', e.target.value)} />
                            </td>
                            <td className="p-2 border-r border-black align-top">
                              <div className="flex items-center gap-1"><span>Ref:</span><input type="text" disabled={!isEditMode} aria-label="Ref No" title="Ref No" className="flex-1 bg-transparent border-b border-dotted border-slate-300 w-20" value={(ncrFormItem.item || (ncrFormItem as unknown as NCRItem)).refNo || ''} onChange={e => handleItemInputChange('refNo', e.target.value)} /></div>
                              <div className="flex items-center gap-1 mt-1 text-slate-500"><span>Neo:</span><input type="text" disabled={!isEditMode} aria-label="Neo Ref No" title="Neo Ref No" className="flex-1 bg-transparent border-b border-dotted border-slate-300 w-20" value={(ncrFormItem.item || (ncrFormItem as unknown as NCRItem)).neoRefNo || ''} onChange={e => handleItemInputChange('neoRefNo', e.target.value)} /></div>
                            </td>
                            <td className="p-2 border-r border-black align-top">
                              <input type="text" disabled={!isEditMode} aria-label="รหัสสินค้า" title="รหัสสินค้า" className="w-full font-bold bg-transparent border-b border-dotted border-slate-300 mb-1" value={(ncrFormItem.item || (ncrFormItem as unknown as NCRItem)).productCode || ''} onChange={e => handleItemInputChange('productCode', e.target.value)} />
                              <input type="text" disabled={!isEditMode} aria-label="ชื่อสินค้า" title="ชื่อสินค้า" className="w-full text-slate-600 font-medium bg-transparent border-b border-dotted border-slate-300 mb-1" value={(ncrFormItem.item || (ncrFormItem as unknown as NCRItem)).productName || ''} onChange={e => handleItemInputChange('productName', e.target.value)} />
                              <input type="text" disabled={!isEditMode} aria-label="ชื่อลูกค้า" title="ชื่อลูกค้า" className="w-full text-slate-500 bg-transparent border-b border-dotted border-slate-300" value={(ncrFormItem.item || (ncrFormItem as unknown as NCRItem)).customerName || ''} onChange={e => handleItemInputChange('customerName', e.target.value)} />
                              <div className="mt-1 flex items-center gap-1 text-xs text-blue-600"><span>ปลายทาง:</span><input type="text" disabled={!isEditMode} aria-label="ปลายทาง" title="ปลายทาง" className="flex-1 bg-transparent border-b border-dotted border-blue-200" value={(ncrFormItem.item || (ncrFormItem as unknown as NCRItem)).destinationCustomer || ''} onChange={e => handleItemInputChange('destinationCustomer', e.target.value)} /></div>
                            </td>
                            <td className="p-2 border-r border-black text-center align-top">
                              <div className="flex items-center justify-center gap-1">
                                <input type="number" disabled={!isEditMode} aria-label="จำนวน" title="จำนวน" className="w-12 text-center bg-transparent border-b border-dotted border-slate-300" value={(ncrFormItem.item || (ncrFormItem as unknown as NCRItem)).quantity || 0} onChange={e => handleItemInputChange('quantity', Number(e.target.value))} />
                                <input type="text" disabled={!isEditMode} aria-label="หน่วย" title="หน่วย" className="w-8 text-center bg-transparent border-b border-dotted border-slate-300" value={(ncrFormItem.item || (ncrFormItem as unknown as NCRItem)).unit || ''} onChange={e => handleItemInputChange('unit', e.target.value)} />
                              </div>
                            </td>
                            <td className="p-2 border-r border-black text-right align-top">
                              <div><input type="number" step="0.01" disabled={!isEditMode} aria-label="ราคา" title="ราคา" className="w-20 text-right bg-transparent border-b border-dotted border-slate-300" value={(ncrFormItem.item || (ncrFormItem as unknown as NCRItem)).priceBill || 0} onChange={e => handleItemInputChange('priceBill', Number(e.target.value))} onBlur={e => handleItemInputChange('priceBill', parseFloat(parseFloat(e.target.value).toFixed(2)))} /> บ.</div>
                              <div className="text-red-500 mt-1 flex items-center justify-end gap-1"><span>Exp:</span><input type="date" disabled={!isEditMode} aria-label="วันหมดอายุ" title="วันหมดอายุ" className="w-24 bg-transparent border-none text-right text-xs" value={(ncrFormItem.item || (ncrFormItem as unknown as NCRItem)).expiryDate || ''} onChange={e => handleItemInputChange('expiryDate', e.target.value)} /></div>
                            </td>
                            <td className="p-2 border-r border-black align-top">
                              <textarea disabled={!isEditMode} aria-label="วิเคราะห์ปัญหาโปรดระบุสาเหตุ" title="วิเคราะห์ปัญหาโปรดระบุสาเหตุ" className="w-full h-12 text-xs resize-none bg-transparent border-b border-dotted border-slate-300" value={(ncrFormItem.item || (ncrFormItem as unknown as NCRItem)).problemSource || ''} onChange={e => handleItemInputChange('problemSource', e.target.value)} placeholder="ระบุสาเหตุ..."></textarea>
                              <div className="mt-1">
                                <label className="flex items-center gap-1 text-red-600 font-bold cursor-pointer"><input type="checkbox" disabled={!isEditMode} checked={(ncrFormItem.item || (ncrFormItem as unknown as NCRItem)).hasCost} onChange={e => handleItemInputChange('hasCost', e.target.checked)} /> Has Cost</label>
                                {(ncrFormItem.item || (ncrFormItem as unknown as NCRItem)).hasCost && (
                                  <div className="pl-4 mt-1">
                                    <div className="flex items-center gap-1"><span className="text-red-600 font-bold">Cost:</span><input type="number" step="0.01" disabled={!isEditMode} aria-label="ค่าใช้จ่าย" title="ค่าใช้จ่าย" className="w-20 bg-transparent border-b border-dotted border-red-300 text-red-600 font-bold" value={(ncrFormItem.item || (ncrFormItem as unknown as NCRItem)).costAmount || 0} onChange={e => handleItemInputChange('costAmount', Number(e.target.value))} onBlur={e => handleItemInputChange('costAmount', parseFloat(parseFloat(e.target.value).toFixed(2)))} /> บ.</div>
                                    <div className="flex items-center gap-1 text-slate-500"><span className="text-xs">รับผิดชอบ:</span><input type="text" disabled={!isEditMode} aria-label="ผู้รับผิดชอบค่าใช้จ่าย" title="ผู้รับผิดชอบค่าใช้จ่าย" className="w-20 bg-transparent border-b border-dotted border-slate-300 text-xs" value={(ncrFormItem.item || (ncrFormItem as unknown as NCRItem)).costResponsible || ''} onChange={e => handleItemInputChange('costResponsible', e.target.value)} /></div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* SECTION 1: PROBLEM */}
                  <table className="w-full border-2 border-black mb-6"><thead><tr className="border-b-2 border-black bg-slate-50"><th className="border-r-2 border-black w-1/3 py-2 text-slate-900">รูปภาพ / เอกสาร</th><th className="py-2 text-slate-900">รายละเอียดของปัญหาที่พบ (ผู้พบปัญหา)</th></tr></thead><tbody><tr><td className="border-r-2 border-black p-4 text-center align-middle h-64 relative bg-white"><div className="flex flex-col items-center justify-center text-red-500 opacity-50"><h2 className="text-3xl font-bold mb-2">รูปภาพ / เอกสาร</h2><h2 className="text-3xl font-bold">ตามแนบ</h2><ImageIcon className="w-16 h-16 mt-4" /></div></td><td className="p-4 align-top text-sm bg-white"><div className="mb-2 font-bold underline text-slate-900">พบปัญหาที่กระบวนการ <span className="text-red-500">*</span></div><div className="grid grid-cols-2 gap-2 mb-4 text-slate-700">
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" disabled={!isEditMode} checked={ncrFormItem.problemDamaged} onChange={() => handleProblemSelection('problemDamaged')} /> ชำรุด</label>
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" disabled={!isEditMode} checked={ncrFormItem.problemDamagedInBox} onChange={() => handleProblemSelection('problemDamagedInBox')} /> ชำรุดในกล่อง</label>
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" disabled={!isEditMode} checked={ncrFormItem.problemLost} onChange={() => handleProblemSelection('problemLost')} /> สูญหาย</label>
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" disabled={!isEditMode} checked={ncrFormItem.problemMixed} onChange={() => handleProblemSelection('problemMixed')} /> สินค้าสลับ</label>
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" disabled={!isEditMode} checked={ncrFormItem.problemWrongInv} onChange={() => handleProblemSelection('problemWrongInv')} /> สินค้าไม่ตรง INV.</label>

                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" disabled={!isEditMode} checked={ncrFormItem.problemLate} onChange={() => handleProblemSelection('problemLate')} /> ส่งช้า</label>
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" disabled={!isEditMode} checked={ncrFormItem.problemDuplicate} onChange={() => handleProblemSelection('problemDuplicate')} /> ส่งซ้ำ</label>
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" disabled={!isEditMode} checked={ncrFormItem.problemWrong} onChange={() => handleProblemSelection('problemWrong')} /> ส่งผิด</label>
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" disabled={!isEditMode} checked={ncrFormItem.problemIncomplete} onChange={() => handleProblemSelection('problemIncomplete')} /> ส่งของไม่ครบ</label>
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" disabled={!isEditMode} checked={ncrFormItem.problemOver} onChange={() => handleProblemSelection('problemOver')} /> ส่งของเกิน</label>
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" disabled={!isEditMode} checked={ncrFormItem.problemWrongInfo} onChange={() => handleProblemSelection('problemWrongInfo')} /> ข้อมูลผิด</label>
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" disabled={!isEditMode} checked={ncrFormItem.problemShortExpiry} onChange={() => handleProblemSelection('problemShortExpiry')} /> สินค้าอายุสั้น</label>
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" disabled={!isEditMode} checked={ncrFormItem.problemTransportDamage} onChange={() => handleProblemSelection('problemTransportDamage')} /> สินค้าเสียหายบนรถขนส่ง</label>
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" disabled={!isEditMode} checked={ncrFormItem.problemAccident} onChange={() => handleProblemSelection('problemAccident')} /> อุบัติเหตุ</label>
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" disabled={!isEditMode} checked={ncrFormItem.problemPOExpired} onChange={() => handleProblemSelection('problemPOExpired')} /> PO. หมดอายุ</label>
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" disabled={!isEditMode} checked={ncrFormItem.problemNoBarcode} onChange={() => handleProblemSelection('problemNoBarcode')} /> บาร์โค๊ตไม่ขึ้น</label>
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" disabled={!isEditMode} checked={ncrFormItem.problemNotOrdered} onChange={() => handleProblemSelection('problemNotOrdered')} /> ไม่ได้สั่งสินค้า</label>

                    <div className="flex items-center gap-2 p-1 col-span-2"><input type="checkbox" disabled={!isEditMode} aria-label="อื่นๆ" title="อื่นๆ" checked={ncrFormItem.problemOther} onChange={() => handleProblemSelection('problemOther')} /> <span>อื่นๆ</span><input type="text" disabled={!isEditMode} aria-label="ระบุปัญหาอื่นๆ" title="ระบุปัญหาอื่นๆ" className="border-b border-dotted border-slate-400 bg-transparent outline-none w-full text-slate-700" value={ncrFormItem.problemOtherText || ''} onChange={e => handleInputChange('problemOtherText', e.target.value)} /></div>
                  </div><div className="font-bold underline mb-1 text-slate-900">รายละเอียด:</div><textarea disabled={!isEditMode} aria-label="รายละเอียดปัญหา" title="รายละเอียดปัญหา" className="w-full h-32 border border-slate-200 bg-slate-50 p-2 text-sm resize-none focus:ring-1 focus:ring-blue-500 outline-none text-slate-700" value={ncrFormItem.problemDetail} onChange={e => handleInputChange('problemDetail', e.target.value)}></textarea></td></tr></tbody></table>

                  {/* SECTION 2: ACTION (GRID LAYOUT) */}
                  <table className="w-full border-2 border-black mb-6 text-sm bg-white">
                    <thead><tr className="bg-slate-50 border-b-2 border-black"><th colSpan={2} className="py-2 text-center font-bold text-slate-900">การดำเนินการ</th></tr></thead>
                    <tbody className="divide-y divide-black border-b-2 border-black">
                      <tr>
                        <td className="p-2 border-r border-black w-1/2"><div className="flex items-center gap-2"><input type="checkbox" disabled={!isEditMode} title="ส่งคืน (Reject)" checked={ncrFormItem.actionReject} onChange={e => handleInputChange('actionReject', e.target.checked)} /> <span className="font-bold">ส่งคืน (Reject)</span><span className="ml-auto text-slate-600">จำนวน:</span><input type="number" disabled={!isEditMode} aria-label="จำนวนส่งคืน" title="จำนวนส่งคืน" className="w-20 border-b border-dotted border-black text-center bg-transparent outline-none" value={ncrFormItem.actionRejectQty || ''} onChange={e => handleInputChange('actionRejectQty', parseInt(e.target.value) || 0)} /></div></td>
                        <td className="p-2 w-1/2"><div className="flex items-center gap-2"><input type="checkbox" disabled={!isEditMode} title="คัดแยกของเสีย" checked={ncrFormItem.actionRejectSort} onChange={e => handleInputChange('actionRejectSort', e.target.checked)} /> <span className="font-bold">คัดแยกของเสียเพื่อส่งคืน</span><span className="ml-auto text-slate-600">จำนวน:</span><input type="number" disabled={!isEditMode} aria-label="จำนวนคัดแยก" title="จำนวนคัดแยก" className="w-20 border-b border-dotted border-black text-center bg-transparent outline-none" value={ncrFormItem.actionRejectSortQty || ''} onChange={e => handleInputChange('actionRejectSortQty', parseInt(e.target.value) || 0)} /></div></td>
                      </tr>
                      <tr>
                        <td className="p-2 border-r border-black"><div className="flex items-center gap-2"><input type="checkbox" disabled={!isEditMode} title="แก้ไข (Rework)" checked={ncrFormItem.actionRework} onChange={e => handleInputChange('actionRework', e.target.checked)} /> <span className="font-bold">แก้ไข (Rework)</span><span className="ml-auto text-slate-600">จำนวน:</span><input type="number" disabled={!isEditMode} aria-label="จำนวนแก้ไข" title="จำนวนแก้ไข" className="w-20 border-b border-dotted border-black text-center bg-transparent outline-none" value={ncrFormItem.actionReworkQty || ''} onChange={e => handleInputChange('actionReworkQty', parseInt(e.target.value) || 0)} /></div></td>
                        <td className="p-2"><div className="flex items-center gap-2"><span className="font-bold">วิธีการแก้ไข</span><input type="text" disabled={!isEditMode} aria-label="วิธีการแก้ไข" title="วิธีการแก้ไข" className="flex-1 border-b border-dotted border-black bg-transparent outline-none" value={ncrFormItem.actionReworkMethod || ''} onChange={e => handleInputChange('actionReworkMethod', e.target.value)} /></div></td>
                      </tr>
                      <tr>
                        <td className="p-2 border-r border-black"><div className="flex items-center gap-2"><input type="checkbox" disabled={!isEditMode} title="ยอมรับกรณีพิเศษ" checked={ncrFormItem.actionSpecialAcceptance} onChange={e => handleInputChange('actionSpecialAcceptance', e.target.checked)} /> <span className="font-bold">ยอมรับกรณีพิเศษ</span><span className="ml-auto text-slate-600">จำนวน:</span><input type="number" disabled={!isEditMode} aria-label="จำนวนยอมรับ" title="จำนวนยอมรับ" className="w-20 border-b border-dotted border-black text-center bg-transparent outline-none" value={ncrFormItem.actionSpecialAcceptanceQty || ''} onChange={e => handleInputChange('actionSpecialAcceptanceQty', parseInt(e.target.value) || 0)} /></div></td>
                        <td className="p-2"><div className="flex items-center gap-2"><span className="font-bold">เหตุผลในการยอมรับ</span><input type="text" disabled={!isEditMode} aria-label="เหตุผลในการยอมรับ" title="เหตุผลในการยอมรับ" className="flex-1 border-b border-dotted border-black bg-transparent outline-none" value={ncrFormItem.actionSpecialAcceptanceReason || ''} onChange={e => handleInputChange('actionSpecialAcceptanceReason', e.target.value)} /></div></td>
                      </tr>
                      <tr>
                        <td className="p-2 border-r border-black"><div className="flex items-center gap-2"><input type="checkbox" disabled={!isEditMode} title="ทำลาย (Scrap)" checked={ncrFormItem.actionScrap} onChange={e => handleInputChange('actionScrap', e.target.checked)} /> <span className="font-bold">ทำลาย (Scrap)</span><span className="ml-auto text-slate-600">จำนวน:</span><input type="number" disabled={!isEditMode} aria-label="จำนวนทำลาย" title="จำนวนทำลาย" className="w-20 border-b border-dotted border-black text-center bg-transparent outline-none" value={ncrFormItem.actionScrapQty || ''} onChange={e => handleInputChange('actionScrapQty', parseInt(e.target.value) || 0)} /></div></td>
                        <td className="p-2"><div className="flex items-center gap-2"><input type="checkbox" disabled={!isEditMode} title="เปลี่ยนสินค้าใหม่" checked={ncrFormItem.actionReplace} onChange={e => handleInputChange('actionReplace', e.target.checked)} /> <span className="font-bold">เปลี่ยนสินค้าใหม่</span><span className="ml-auto text-slate-600">จำนวน:</span><input type="number" disabled={!isEditMode} aria-label="จำนวนเปลี่ยน" title="จำนวนเปลี่ยน" className="w-20 border-b border-dotted border-black text-center bg-transparent outline-none" value={ncrFormItem.actionReplaceQty || ''} onChange={e => handleInputChange('actionReplaceQty', parseInt(e.target.value) || 0)} /></div></td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={2} className="p-3 bg-white">
                          <div className="flex justify-between items-center gap-4 text-sm">
                            <div className="flex items-center gap-2"><span>กำหนดแล้วเสร็จ</span><input type="date" disabled={!isEditMode} aria-label="กำหนดแล้วเสร็จ" title="กำหนดแล้วเสร็จ" className="border-b border-dotted border-black bg-transparent text-slate-700 outline-none" value={ncrFormItem.dueDate || ''} onChange={e => handleInputChange('dueDate', e.target.value)} /></div>
                            <div className="flex items-center gap-2"><span>ผู้อนุมัติ</span><input type="text" disabled={!isEditMode} aria-label="ผู้อนุมัติ" title="ผู้อนุมัติ" className="w-32 border-b border-dotted border-black bg-transparent text-slate-700 text-center outline-none" value={ncrFormItem.approver || ''} onChange={e => handleInputChange('approver', e.target.value)} /></div>
                            <div className="flex items-center gap-2"><span>ตำแหน่ง</span><input type="text" disabled={!isEditMode} aria-label="ตำแหน่ง" title="ตำแหน่ง" className="w-24 border-b border-dotted border-black bg-transparent text-slate-700 text-center outline-none" value={ncrFormItem.approverPosition || ''} onChange={e => handleInputChange('approverPosition', e.target.value)} /></div>
                            <div className="flex items-center gap-2"><span>วันที่</span><input type="date" disabled={!isEditMode} aria-label="วันที่อนุมัติ" title="วันที่อนุมัติ" className="border-b border-dotted border-black bg-transparent text-slate-700 outline-none" value={ncrFormItem.approverDate || ''} onChange={e => handleInputChange('approverDate', e.target.value)} /></div>
                          </div>
                        </td>
                      </tr>
                    </tfoot>
                  </table>

                  {/* SECTION 3: ROOT CAUSE & PREVENTION */}
                  <table className="w-full border-2 border-black mb-6 text-sm bg-white">
                    <thead><tr className="bg-slate-50 border-b-2 border-black"><th colSpan={2} className="py-2 text-center font-bold text-slate-900">สาเหตุ-การป้องกัน (ผู้รับผิดชอบปัญหา)</th></tr></thead>
                    <tbody>
                      <tr>
                        <td className="w-1/4 border-r-2 border-black align-top p-0">
                          <div className="border-b border-black p-2 font-bold text-center bg-slate-50">สาเหตุเกิดจาก</div>
                          <div className="p-4 space-y-3">
                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" disabled={!isEditMode} checked={ncrFormItem.causePackaging} onChange={() => handleCauseSelection('causePackaging')} /> บรรจุภัณฑ์</label>
                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" disabled={!isEditMode} checked={ncrFormItem.causeTransport} onChange={() => handleCauseSelection('causeTransport')} /> การขนส่ง</label>
                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" disabled={!isEditMode} checked={ncrFormItem.causeOperation} onChange={() => handleCauseSelection('causeOperation')} /> ปฏิบัติงาน</label>
                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" disabled={!isEditMode} checked={ncrFormItem.causeEnv} onChange={() => handleCauseSelection('causeEnv')} /> สิ่งแวดล้อม</label>
                          </div>
                        </td>
                        <td className="align-top p-0">
                          <div className="h-24 border-b border-black p-2 flex flex-col">
                            <div className="font-bold mb-1">รายละเอียดสาเหตุ :</div>
                            <textarea disabled={!isEditMode} aria-label="รายละเอียดสาเหตุ" title="รายละเอียดสาเหตุ" className="flex-1 w-full bg-transparent outline-none resize-none text-slate-700" value={ncrFormItem.causeDetail || ''} onChange={e => handleInputChange('causeDetail', e.target.value)}></textarea>
                          </div>
                          <div className="h-24 p-2 flex flex-col">
                            <div className="font-bold underline mb-1">แนวทางป้องกัน :</div>
                            <textarea disabled={!isEditMode} aria-label="แนวทางป้องกัน" title="แนวทางป้องกัน" className="flex-1 w-full bg-transparent outline-none resize-none text-slate-700" value={ncrFormItem.preventionDetail || ''} onChange={e => handleInputChange('preventionDetail', e.target.value)}></textarea>
                          </div>
                        </td>
                      </tr>
                      <tr className="border-t-2 border-black">
                        <td colSpan={2} className="p-3 bg-white">
                          <div className="flex justify-between items-center gap-4 text-sm">
                            <div className="flex items-center gap-2"><span>กำหนดการป้องกันแล้วเสร็จ</span><input type="date" disabled={!isEditMode} aria-label="กำหนดการป้องกันแล้วเสร็จ" title="กำหนดการป้องกันแล้วเสร็จ" className="border-b border-dotted border-black bg-transparent text-slate-700 outline-none" value={ncrFormItem.preventionDueDate || ''} onChange={e => handleInputChange('preventionDueDate', e.target.value)} /></div>
                            <div className="flex items-center gap-2"><span>ผู้รับผิดชอบ</span><input type="text" disabled={!isEditMode} aria-label="ผู้รับผิดชอบ" title="ผู้รับผิดชอบ" className="w-32 border-b border-dotted border-black bg-transparent text-slate-700 text-center outline-none" value={ncrFormItem.responsiblePerson || ''} onChange={e => handleInputChange('responsiblePerson', e.target.value)} /></div>
                            <div className="flex items-center gap-2"><span>ตำแหน่ง</span><input type="text" disabled={!isEditMode} aria-label="ตำแหน่งผู้รับผิดชอบ" title="ตำแหน่งผู้รับผิดชอบ" className="w-24 border-b border-dotted border-black bg-transparent text-slate-700 text-center outline-none" value={ncrFormItem.responsiblePosition || ''} onChange={e => handleInputChange('responsiblePosition', e.target.value)} /></div>
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
                    <thead><tr className="bg-slate-50 border-b-2 border-black"><th colSpan={2} className="py-2 text-center font-bold text-slate-900">การตรวจติดตามและการปิด NCR</th></tr></thead>
                    <tbody>
                      <tr className="border-b-2 border-black">
                        <td colSpan={2} className="p-4">
                          <div className="flex items-center gap-8">
                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" disabled={!isEditMode} title="ยอมรับ" checked={ncrFormItem.qaAccept} onChange={e => handleInputChange('qaAccept', e.target.checked)} /> ยอมรับแนวทางการป้องกัน</label>
                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" disabled={!isEditMode} title="ไม่ยอมรับ" checked={ncrFormItem.qaReject} onChange={e => handleInputChange('qaReject', e.target.checked)} /> ไม่ยอมรับแนวทางการป้องกัน</label>
                            <input type="text" disabled={!isEditMode} aria-label="เหตุผลไม่ยอมรับ" title="เหตุผลไม่ยอมรับ" className="flex-1 border-b border-dotted border-black bg-transparent outline-none text-slate-700" placeholder="ระบุเหตุผล (ถ้ามี)" value={ncrFormItem.qaReason || ''} onChange={e => handleInputChange('qaReason', e.target.value)} />
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

              <div className="p-4 border-t bg-slate-50 flex justify-end gap-2 sticky bottom-0 rounded-b-lg">
                <button onClick={() => ncrFormItem && handleRowExportExcel(ncrFormItem)} className="px-4 py-2 text-green-600 hover:bg-green-50 border border-green-200 rounded font-bold flex items-center gap-2 mr-auto">
                  <Download className="w-4 h-4" /> Export Excel
                </button>
                <button onClick={() => setShowNCRFormModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded">ปิด</button>
                {isEditMode && (
                  <button onClick={handleSaveChanges} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 font-bold shadow-sm">
                    <Save className="w-4 h-4" /> บันทึกการแก้ไข
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      }

      <NCRTimelineModal
        isOpen={showTimelineModal}
        onClose={() => setShowTimelineModal(false)}
        report={timelineReport}
        correspondingReturn={items.find(i => i.ncrNumber === timelineReport?.ncrNo)}
      />

      {/* Password Modal for Edit */}
      {
        showPasswordModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 text-center">
              <Lock className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold mb-2">ยืนยันสิทธิ์การแก้ไข</h3>
              <p className="text-slate-500 text-sm mb-4">กรุณากรอกรหัสผ่านเพื่อแก้ไขข้อมูล NCR</p>
              <input
                type="password"
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                placeholder="รหัสผ่าน (1234)"
                className="w-full border rounded p-2 text-center text-lg tracking-widest mb-4"
                autoFocus
              />
              <div className="flex gap-2 justify-center">
                <button onClick={() => setShowPasswordModal(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded">ยกเลิก</button>
                <button onClick={handleVerifyPassword} className="px-6 py-2 bg-amber-500 text-white rounded font-bold hover:bg-amber-600">ยืนยัน</button>
              </div>
            </div>
          </div>
        )
      }

      {/* Password Modal for Delete */}
      {
        showDeletePasswordModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 text-center">
              <Trash2 className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold mb-2 text-red-600">ยืนยันการยกเลิก NCR</h3>
              <p className="text-slate-500 text-sm mb-4">การกระทำนี้ไม่สามารถเรียกคืนได้<br />กรุณากรอกรหัสผ่านเพื่อยืนยัน</p>
              <input
                type="password"
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                placeholder="รหัสผ่าน (1234)"
                className="w-full border rounded p-2 text-center text-lg tracking-widest mb-4 border-red-200 focus:ring-red-500"
                autoFocus
              />
              <div className="flex gap-2 justify-center">
                <button onClick={() => setShowDeletePasswordModal(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded">ยกเลิก</button>
                <button onClick={handleVerifyPasswordAndDelete} className="px-6 py-2 bg-red-600 text-white rounded font-bold hover:bg-red-700">ยืนยันลบ</button>
              </div>
            </div>
          </div>
        )
      }

      {/* CSS Styles */}
      <style>{`
        .ncr-table-container {
          max-height: calc(100vh - 300px);
        }
      `}</style>
    </div>
  );
};

export default NCRReport;