import React, { useState, useMemo } from 'react';
import { useData } from '../DataContext';
import { DispositionAction, ReturnRecord } from '../types';
import { Box, RotateCcw, ShieldCheck, Home, Trash2, CircleArrowUp, CircleArrowDown, History, Search, Download, Truck, LucideIcon, AlertCircle } from 'lucide-react';
import { formatDate } from '../utils/dateUtils';

interface StockAggregate {
  stats: {
    totalIn: number;
    totalOut: number;
    onHand: number;
  };
}

interface LedgerEntry extends ReturnRecord {
  movementType: 'IN' | 'OUT';
  movementDate?: string;
}

const Inventory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'Ledger' | 'Unprocessed' | DispositionAction>('Ledger');
  const { items, loading } = useData();

  const [filters, setFilters] = useState({
    query: '',
    startDate: '',
    endDate: '',
    movementType: 'All',
  });

  const inventoryData = useMemo(() => {
    const fullLedger: LedgerEntry[] = [];

    items.forEach(item => {
      // Determine effective IN Date
      // Priority: 1. Grading Date (Standard Flow)
      // 2. If no grading date but has disposition (Direct/Skip), use Receipt Date
      // 3. Fallback to Documented Date if checked out but no IN date found (Safety)
      let effectiveInDate = item.dateGraded;
      if (!effectiveInDate && item.disposition) {
        effectiveInDate = item.date;
      }
      if (!effectiveInDate && (item.dateDocumented || item.dateCompleted)) {
        effectiveInDate = item.dateDocumented || item.dateCompleted;
      }

      // Add IN Entry
      if (effectiveInDate) {
        fullLedger.push({
          ...item,
          movementType: 'IN',
          movementDate: effectiveInDate,
        });

        // Add OUT Entry (Only if IN exists to prevent negative balance)
        if (item.dateDocumented || item.dateCompleted) {
          fullLedger.push({
            ...item,
            movementType: 'OUT',
            movementDate: item.dateDocumented || item.dateCompleted,
          });
        }
      }
    });

    // Multi-level sort: 1. By date (desc), 2. By type ('IN' before 'OUT')
    fullLedger.sort((a, b) => {
      const dateA = a.movementDate || '0';
      const dateB = b.movementDate || '0';

      // Primary sort: Date descending
      const dateComparison = dateB.localeCompare(dateA);
      if (dateComparison !== 0) {
        return dateComparison;
      }

      // Secondary sort: If dates are the same, 'IN' comes before 'OUT'
      if (a.movementType === 'IN' && b.movementType === 'OUT') {
        return -1; // a (IN) comes first
      }
      if (a.movementType === 'OUT' && b.movementType === 'IN') {
        return 1; // b (IN) comes first
      }

      return 0; // Same date and type
    });

    const calculateStats = (disposition: DispositionAction): StockAggregate['stats'] => {
      const relevantEntries = fullLedger.filter(entry => entry.disposition === disposition);

      const totalIn = relevantEntries
        .filter(e => e.movementType === 'IN')
        .reduce((sum, e) => sum + e.quantity, 0);

      const totalOut = relevantEntries
        .filter(e => e.movementType === 'OUT')
        .reduce((sum, e) => sum + e.quantity, 0);

      return {
        totalIn,
        totalOut,
        onHand: totalIn - totalOut,
      };
    };

    // Calculate stats for unprocessed items (no disposition or 'Pending')
    const calculateUnprocessedStats = (): StockAggregate['stats'] => {
      const relevantEntries = fullLedger.filter(entry => !entry.disposition || entry.disposition === 'Pending');

      const totalIn = relevantEntries
        .filter(e => e.movementType === 'IN')
        .reduce((sum, e) => sum + e.quantity, 0);

      const totalOut = relevantEntries
        .filter(e => e.movementType === 'OUT')
        .reduce((sum, e) => sum + e.quantity, 0);

      return {
        totalIn,
        totalOut,
        onHand: totalIn - totalOut,
      };
    };

    return {
      fullLedger,
      sellableStock: { stats: calculateStats('Restock') },
      rtvStock: { stats: calculateStats('RTV') },
      claimStock: { stats: calculateStats('Claim') },
      internalStock: { stats: calculateStats('InternalUse') },
      scrapStock: { stats: calculateStats('Recycle') },
      unprocessedStock: { stats: calculateUnprocessedStats() },
    };
  }, [items]);

  const filteredLedgerList = useMemo(() => {
    const baseList = activeTab === 'Ledger'
      ? inventoryData.fullLedger
      : activeTab === 'Unprocessed'
        ? inventoryData.fullLedger.filter(item => !item.disposition || item.disposition === 'Pending')
        : inventoryData.fullLedger.filter(item => item.disposition === activeTab);

    return baseList.filter(item => {
      const queryLower = filters.query.toLowerCase();
      if (queryLower &&
        !item.productName?.toLowerCase().includes(queryLower) &&
        !item.productCode?.toLowerCase().includes(queryLower) &&
        !item.customerName?.toLowerCase().includes(queryLower) &&
        !String(item.branch)?.toLowerCase().includes(queryLower)
      ) {
        return false;
      }

      if (filters.startDate && (item.movementDate || '0') < filters.startDate) {
        return false;
      }

      if (filters.endDate && (item.movementDate || '0') > filters.endDate) {
        return false;
      }

      if (filters.movementType !== 'All' && item.movementType !== filters.movementType) {
        return false;
      }

      return true;
    });
  }, [activeTab, inventoryData.fullLedger, filters]);

  const handleExportExcel = () => {
    const headers = [
      "MovementDate", "MovementType", "Branch", "Customer",
      "ProductCode", "ProductName", "RefNo", "NeoRefNo",
      "Quantity", "Unit", "PriceBill", "ExpiryDate", "Disposition"
    ];

    const rows = filteredLedgerList.map(item => [
      item.movementDate || '',
      item.movementType,
      `"${String(item.branch).replace(/"/g, '""')}"`,
      `"${item.customerName.replace(/"/g, '""')}"`,
      item.productCode,
      `"${item.productName.replace(/"/g, '""')}"`,
      item.refNo,
      item.neoRefNo || '',
      item.quantity,
      item.unit,
      item.priceBill,
      item.expiryDate || '',
      item.disposition || ''
    ].join(','));

    const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory_report_${activeTab}_${formatDate(new Date())?.replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const tabs = [
    { id: 'Ledger', label: '1. ประวัติทั้งหมด (Full Ledger)', icon: History, stats: null },
    { id: 'Unprocessed', label: '0. สินค้าที่ยังไม่ได้จัดการ (Unprocessed)', icon: AlertCircle, stats: inventoryData.unprocessedStock.stats },
    { id: 'Restock', label: '2. สินค้าสำหรับขาย (Sellable)', icon: RotateCcw, stats: inventoryData.sellableStock.stats },
    { id: 'RTV', label: '3. สินค้าสำหรับคืน (RTV)', icon: Truck, stats: inventoryData.rtvStock.stats },
    { id: 'Claim', label: '4. สินค้าสำหรับเคลม (Claim)', icon: ShieldCheck, stats: inventoryData.claimStock.stats },
    { id: 'InternalUse', label: '5. สินค้าใช้ภายใน (Internal)', icon: Home, stats: inventoryData.internalStock.stats },
    { id: 'Recycle', label: '6. สินค้าสำหรับทำลาย (Scrap)', icon: Trash2, stats: inventoryData.scrapStock.stats },
  ];

  // Pagination Logic
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filters, activeTab]);

  const totalPages = Math.ceil(filteredLedgerList.length / itemsPerPage);
  const paginatedLedgerList = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLedgerList.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLedgerList, currentPage, itemsPerPage]);

  const currentTab = tabs.find(t => t.id === activeTab);

  return (
    <div className="p-2 md:p-6 h-full flex flex-col space-y-4 md:space-y-6 bg-slate-50/50">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/90 backdrop-blur-xl p-6 rounded-2xl border border-slate-200/60 shadow-lg animate-fade-in-down">
        <div>
          <h2 className="text-3xl font-black bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 bg-clip-text text-transparent tracking-tight">
            คลังสินค้า (Inventory)
          </h2>
          <p className="text-xs font-medium text-slate-400 mt-1 flex items-center gap-2">
            <Box className="w-3.5 h-3.5 text-indigo-500" />
            Stock Ledger & Movement Tracking System
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="group bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-200 hover:shadow-emerald-300 active:scale-95 flex items-center gap-2"
          >
            <Download className="w-4 h-4 group-hover:animate-bounce" />
            <span className="text-sm">Export Excel</span>
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-sm">
        <nav className="flex space-x-2 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'Ledger' | 'Unprocessed' | DispositionAction)}
                className={`whitespace-nowrap px-4 py-2.5 rounded-lg font-bold text-xs flex items-center gap-2 transition-all duration-200 border
                  ${isActive
                    ? 'bg-slate-900 text-white shadow-md border-slate-900'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-transparent'
                  }
                `}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-600'}`} />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {activeTab !== 'Ledger' && currentTab?.stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up">
          <StatCard title="Total Inbound" value={currentTab.stats.totalIn} color="text-emerald-500" icon={CircleArrowUp} />
          <StatCard title="Total Outbound" value={currentTab.stats.totalOut} color="text-rose-500" icon={CircleArrowDown} />
          <StatCard title="Current On-Hand" value={currentTab.stats.onHand} color="text-white" isHighlight icon={Box} />
        </div>
      )}

      <div className="bg-white/90 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col md:flex-row gap-4 items-center animate-fade-in">
        <div className="relative group flex-grow max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <input
            type="text"
            placeholder="ค้นหา (ชื่อสินค้า, รหัส, สาขา)..."
            value={filters.query}
            onChange={e => setFilters({ ...filters, query: e.target.value })}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200/60 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/60 rounded-xl p-1 shadow-sm">
            <input
              type="date"
              value={filters.startDate}
              onChange={e => setFilters({ ...filters, startDate: e.target.value })}
              className="bg-transparent text-xs font-bold p-1 outline-none w-28 text-slate-600 cursor-pointer hover:text-indigo-600 transition-colors"
              aria-label="วันที่เริ่มต้น"
              title="วันที่เริ่มต้น"
            />
            <span className="text-slate-300">|</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={e => setFilters({ ...filters, endDate: e.target.value })}
              className="bg-transparent text-xs font-bold p-1 outline-none w-28 text-slate-600 cursor-pointer hover:text-indigo-600 transition-colors"
              aria-label="วันที่สิ้นสุด"
              title="วันที่สิ้นสุด"
            />
          </div>

          <select
            value={filters.movementType}
            onChange={e => setFilters({ ...filters, movementType: e.target.value })}
            className="bg-white border border-slate-200/60 rounded-xl text-xs font-bold px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-sm hover:border-indigo-300 transition-colors"
            aria-label="ประเภทการเคลื่อนไหว"
            title="ประเภทการเคลื่อนไหว"
          >
            <option value="All">IN/OUT ทั้งหมด</option>
            <option value="IN">รับเข้า (IN)</option>
            <option value="OUT">จ่ายออก (OUT)</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex-1 flex flex-col min-h-[400px]">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-800 sticky top-0 z-20 text-[10px] uppercase text-white font-black tracking-widest">
              <tr>
                <th className="px-4 py-3">Date / Type</th>
                <th className="px-4 py-3">Location / Customer</th>
                <th className="px-4 py-3">Product Info</th>
                <th className="px-4 py-3">Doc No. / NCR</th>
                <th className="px-4 py-3 text-right">Quantity</th>
                <th className="px-4 py-3 text-right">Value (฿)</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loading ? (
                <tr><td colSpan={7} className="p-24 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-3 animate-pulse">
                    <History className="w-8 h-8 text-indigo-300 animate-spin-slow" />
                    <span className="text-sm font-bold tracking-widest uppercase">Loading Inventory History...</span>
                  </div>
                </td></tr>
              ) : paginatedLedgerList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-24 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <Box className="w-16 h-16 mb-4 opacity-20" />
                      <span className="text-sm font-bold uppercase tracking-widest">No matching records found</span>
                      <p className="text-xs text-slate-500 mt-1 font-medium italic">Try adjusting your search or date filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedLedgerList.map((item, index) => (
                  <tr key={index} className="group hover:bg-slate-50/80 transition-all duration-150">
                    <td className="px-6 py-4 border-l-4 border-transparent group-hover:border-indigo-500">
                      <div className="flex items-center gap-4">
                        <div className={`p-2.5 rounded-xl shadow-sm ${item.movementType === 'IN' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                          {item.movementType === 'IN' ? <CircleArrowUp className="w-5 h-5" /> : <CircleArrowDown className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="font-black text-slate-800 text-xs tracking-tight">{formatDate(item.movementDate)}</div>
                          <div className={`text-[10px] font-black uppercase tracking-widest mt-0.5 ${item.movementType === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {item.movementType === 'IN' ? 'Inbound' : 'Outbound'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 text-xs line-clamp-1" title={item.customerName}>{item.customerName}</div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-1 font-semibold uppercase tracking-wider">
                        <Home className="w-3 h-3 text-slate-400" /> {item.branch}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-indigo-900 text-xs line-clamp-1" title={item.productName}>{item.productName}</div>
                      <div className="text-[10px] text-slate-400 font-mono font-bold mt-1 tracking-wider">{item.productCode}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        {item.ncrNumber ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black bg-slate-900 text-indigo-300 border border-indigo-500/30 w-fit uppercase tracking-tighter">
                            {item.ncrNumber}
                          </span>
                        ) : null}
                        <span className="text-[10px] text-slate-400 font-mono truncate max-w-[120px] font-bold">REF: {item.refNo}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-black text-sm tracking-tighter ${item.movementType === 'IN' ? 'text-emerald-600' : 'text-slate-800'}`}>
                        {item.movementType === 'IN' ? '+' : '-'}{item.quantity.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1.5 font-bold uppercase tracking-widest">{item.unit}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-xs font-black text-slate-800 tracking-tight">฿{(item.priceBill || 0).toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm ${item.disposition === 'Restock' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        item.disposition === 'RTV' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                          item.disposition === 'Recycle' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                            'bg-slate-50 text-slate-600 border-slate-100'
                        }`}>
                        {item.disposition || 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4 text-sm print:hidden">
          <div className="flex items-center gap-2 text-slate-600">
            <span>แสดง</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="bg-white border border-slate-300 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500 font-bold"
              aria-label="จำนวนรายการต่อหน้า"
              title="จำนวนรายการต่อหน้า"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>รายการต่อหน้า (จากทั้งหมด {filteredLedgerList.length} รายการ)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:shadow-sm hover:border-slate-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              ก่อนหน้า
            </button>
            <div className="flex items-center gap-1">
              <span className="font-bold text-slate-800">หน้า {currentPage}</span>
              <span className="text-slate-500">จาก {totalPages || 1}</span>
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:shadow-sm hover:border-slate-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              ถัดไป
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, color, isHighlight = false, icon: Icon }: { title: string; value: number; color: string; isHighlight?: boolean; icon?: LucideIcon }) => (
  <div className={`relative overflow-hidden p-6 rounded-2xl transition-all duration-500 group
    ${isHighlight
      ? 'bg-slate-900 text-white shadow-2xl shadow-indigo-900/40 border border-white/10'
      : 'bg-white/90 backdrop-blur-md border border-slate-200/60 shadow-sm hover:shadow-xl hover:-translate-y-1'
    }`}>
    <div className={`absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.07] group-hover:scale-110 transition-all duration-700`}>
      {Icon && <Icon className="w-32 h-32" />}
    </div>
    <div className="relative z-10">
      <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-2 ${isHighlight ? 'text-indigo-400' : 'text-slate-400'}`}>
        {title}
      </p>
      <div className="flex items-baseline gap-2">
        <span className={`text-4xl font-black tracking-tighter ${isHighlight ? 'text-white' : color}`}>
          {value.toLocaleString()}
        </span>
        <span className={`text-[10px] font-black uppercase tracking-widest ${isHighlight ? 'text-indigo-400/60' : 'text-slate-400'}`}>Units</span>
      </div>
    </div>
    {isHighlight && (
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50"></div>
    )}
  </div>
);

export default Inventory;
