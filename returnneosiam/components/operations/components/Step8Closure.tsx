
import React, { useState } from 'react';
import { FileText, MapPin, CheckCircle, RotateCcw, PlusSquare, MinusSquare, X, Search } from 'lucide-react';
import { useData } from '../../../DataContext';
import { DispositionBadge } from './DispositionBadge';
import { ReturnRecord } from '../../../types';
import { sendTelegramMessage, formatStatusUpdateMessage } from '../../../utils/telegramService';
import Swal from 'sweetalert2';

type FilterMode = 'ALL' | 'NCR' | 'COL';

export const Step8Closure: React.FC = () => {
    const { items, updateReturnRecord, ncrReports, systemConfig } = useData();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // UI State
    const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [filterMode, setFilterMode] = useState<FilterMode>('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    // Filter Items: Status 'DocsCompleted', 'COL_Documented', 'NCR_Documented', 'DirectReturn', 'ReturnToSupplier'
    // AND apply NCR/COL Filter + Search
    const documentedItems = React.useMemo(() => {
        return items.filter(item => {
            // Check for verification (If NCR Report is Canceled, hide it) -> Only for NCR
            if (item.ncrNumber) {
                const linkedReport = ncrReports.find(r => r.ncrNo === item.ncrNumber);
                if (linkedReport && linkedReport.status === 'Canceled') {
                    return false;
                }
            }

            // 1. Basic Status Check
            const isReadyForClosure = (
                item.status === 'DocsCompleted' ||
                item.status === 'COL_Documented' ||
                item.status === 'NCR_Documented' ||
                item.status === 'DirectReturn' ||
                item.status === 'ReturnToSupplier'
            );

            if (!isReadyForClosure) return false;

            // 2. Filter Mode Check
            const isNCR = item.documentType === 'NCR' || !!item.ncrNumber || (item.id && item.id.startsWith('NCR'));
            if (filterMode === 'NCR' && !isNCR) return false;
            if (filterMode === 'COL' && isNCR) return false;

            // 3. Search Filter
            const q = searchQuery.toLowerCase().trim();
            if (q) {
                const matchesSearch =
                    (item.refNo?.toLowerCase().includes(q)) ||
                    (item.ncrNumber?.toLowerCase().includes(q)) ||
                    (item.documentNo?.toLowerCase().includes(q)) ||
                    (item.collectionOrderId?.toLowerCase().includes(q)) ||
                    (item.productName?.toLowerCase().includes(q)) ||
                    (item.productCode?.toLowerCase().includes(q));
                if (!matchesSearch) return false;
            }

            return true;
        });
    }, [items, filterMode, ncrReports, searchQuery]);

    // Grouping Logic
    const groupedItems = React.useMemo(() => {
        const groups: Record<string, ReturnRecord[]> = {};

        documentedItems.forEach(item => {
            // Priority: DocNo -> COL -> NCR -> ID
            const normalize = (str?: string) => str ? str.trim().replace(/\s+/g, '').toLowerCase() : '';

            const doc = normalize(item.documentNo);
            const col = normalize(item.collectionOrderId);
            const ncr = normalize(item.ncrNumber);

            // Determine Group Key
            const key = doc || col || ncr || item.id;

            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
        });

        // Convert to array and sort by latest date of representative
        return Object.entries(groups).map(([key, groupItems]) => ({
            key,
            items: groupItems,
            rep: groupItems[0]
        })).sort((a, b) => (b.rep.dateRequested || '').localeCompare(a.rep.dateRequested || ''));
    }, [documentedItems]);

    // Completed Items
    const completedItems = React.useMemo(() => {
        return items.filter(item => item.status === 'Completed').sort((a, b) => {
            return (new Date(b.dateCompleted || '').getTime() - new Date(a.dateCompleted || '').getTime());
        });
    }, [items]);

    const handleCompleteJob = async (id: string) => {
        if (isSubmitting) return;

        const result = await Swal.fire({
            title: 'ยืนยันปิดงาน',
            text: 'ยืนยันปิดงานรายการนี้ (Complete Job)?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'ยืนยัน',
            cancelButtonText: 'ยกเลิก'
        });

        if (result.isConfirmed) {
            setIsSubmitting(true);
            try {
                await updateReturnRecord(id, {
                    status: 'Completed',
                    dateCompleted: new Date().toISOString().split('T')[0]
                });

                // TELEGRAM NOTIFICATION: Job Completed

                if (systemConfig.telegram?.enabled && systemConfig.telegram.chatId) {
                    const item = items.find(i => i.id === id);
                    if (item) {
                        const message = formatStatusUpdateMessage('✅ ปิดงานสมบูรณ์', item, 1, { closed: true });
                        sendTelegramMessage(systemConfig.telegram.botToken, systemConfig.telegram.chatId, message);
                    }
                }

                await Swal.fire({
                    icon: 'success',
                    title: 'ปิดงานเรียบร้อย',
                    timer: 1500,
                    showConfirmButton: false
                });
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const handleUndo = async (item: ReturnRecord) => {
        if (isSubmitting) return;

        // 1. Password Protection
        const { value: password } = await Swal.fire({
            title: 'ย้อนกลับสถานะ (Undo)',
            text: 'กรอกรหัสผ่านเพื่อย้อนกลับไปขั้นตอน "เอกสาร (Docs)"',
            input: 'password',
            inputPlaceholder: 'กรอกรหัสผ่าน...',
            showCancelButton: true,
            confirmButtonText: 'ยืนยัน',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#f59e0b', // Amber for Warning/Undo
            inputAttributes: {
                autocapitalize: 'off',
                autocorrect: 'off'
            }
        });

        if (!password) return;

        if (password !== '1234') {
            await Swal.fire('รหัสผ่านไม่ถูกต้อง', 'กรุณาลองใหม่อีกครั้ง', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            // 2. Determine Previous Status
            let targetStatus = 'ReceivedAtHub'; // Default Safe
            const isNCR = item.documentType === 'NCR' || item.ncrNumber || (item.id && item.id.startsWith('NCR'));

            if (isNCR) {
                targetStatus = 'QCPassed';
            } else {
                targetStatus = 'ReceivedAtHub';
            }

            // 3. Execute Update
            await updateReturnRecord(item.id, {
                status: targetStatus,
            });

            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true
            });

            Toast.fire({
                icon: 'success',
                title: `ย้อนกลับรายการ ${item.id} เรียบร้อย`
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleExpand = (key: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    // Helper to render a single row
    const renderRow = (item: ReturnRecord, isSubItem: boolean = false, hasChildren: boolean = false, isExpanded: boolean = false, groupKey: string = '') => {
        const isNCR = item.documentType === 'NCR' || !!item.ncrNumber || (item.id && item.id.startsWith('NCR'));

        return (
            <tr key={item.id} className={`transition-colors border-b border-slate-700/50 last:border-0 align-top text-xs text-slate-200 
                ${isNCR ? 'bg-amber-900/20 hover:bg-amber-900/30' : 'bg-teal-900/20 hover:bg-teal-900/30'}
                ${isSubItem ? 'bg-opacity-30' : ''}
            `}>
                <td className={`px-3 py-2 border-r border-slate-700/50 text-center align-top ${isSubItem ? 'pl-8 bg-slate-800/50' : ''}`}>
                    <div className="flex items-center justify-center gap-1">
                        <button
                            onClick={() => handleCompleteJob(item.id)}
                            disabled={isSubmitting}
                            aria-label="ปิดงาน (Complete)"
                            className="bg-green-600 hover:bg-green-700 text-white px-2 py-1.5 rounded text-xs font-bold shadow-sm flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-wait"
                            title="ปิดงาน (Complete)"
                        >
                            {isSubmitting ? '...' : <><CheckCircle className="w-3 h-3" /> ปิดงาน</>}
                        </button>
                        <button
                            onClick={() => handleUndo(item)}
                            disabled={isSubmitting}
                            aria-label="ย้อนกลับ (Undo to Docs)"
                            className="bg-amber-100 hover:bg-amber-200 text-amber-700 px-2 py-1.5 rounded text-xs font-bold shadow-sm flex items-center gap-1 transition-all active:scale-95 border border-amber-300 disabled:opacity-50 disabled:cursor-wait"
                            title="ย้อนกลับ (Undo to Docs)"
                        >
                            <RotateCcw className="w-3 h-3" />
                        </button>
                    </div>
                </td>
                <td className="px-3 py-2 border-r align-top">
                    <span className="font-bold flex items-center gap-1 text-slate-200"><MapPin className="w-3 h-3 text-slate-400" /> {item.branch}</span>
                </td>
                <td className="px-3 py-2 border-r align-top">
                    <div className="flex items-start gap-2">
                        {/* Expand Button Logic */}
                        {!isSubItem && hasChildren && (
                            <button
                                onClick={() => toggleExpand(groupKey)}
                                className="mt-0.5 text-blue-600 hover:text-blue-800 transition-colors"
                                title={isExpanded ? "ซ่อนรายการย่อย" : "แสดงรายการย่อย"}
                            >
                                {isExpanded ? <MinusSquare className="w-4 h-4" /> : <PlusSquare className="w-4 h-4" />}
                            </button>
                        )}

                        <div className="flex-1 min-w-0">
                            <div className="font-bold text-slate-100 text-sm flex items-center gap-2">
                                {item.productCode}
                                {hasChildren && !isSubItem && (
                                    <span className="text-[10px] bg-blue-900/50 text-blue-200 px-1.5 rounded-full whitespace-nowrap">
                                        +{(groupedItems.find(g => g.key === groupKey)?.items.length || 1) - 1} รายการ
                                    </span>
                                )}
                            </div>
                            <div className="text-slate-300 text-xs leading-relaxed mt-1" title={item.productName}>{item.productName}</div>
                        </div>
                    </div>
                </td>
                <td className="px-3 py-2 border-r border-slate-700/50 text-center font-bold text-slate-200">
                    {item.quantity} {item.unit}
                </td>
                <td className="px-3 py-2 border-r border-slate-700/50 text-slate-300">{item.dateRequested}</td>
                <td className="px-3 py-2 border-r border-slate-700/50 text-slate-200">{item.ncrNumber || '-'}</td>
                <td className="px-3 py-2 border-r border-slate-700/50 text-indigo-300 font-bold">{item.collectionOrderId || '-'}</td>
                <td className="px-3 py-2 border-r border-slate-700/50 text-slate-200">{item.neoRefNo || '-'}</td>
                <td className="px-3 py-2 border-r border-slate-700/50 font-mono text-blue-300 font-bold">
                    {item.documentNo || item.refNo || '-'}
                </td>
                <td className="px-3 py-2 border-r border-slate-700/50 font-mono text-slate-300">{item.tmNo || '-'}</td>
                <td className="px-3 py-2 border-r border-slate-700/50 font-mono text-slate-300">{item.invoiceNo || '-'}</td>
                <td className="px-3 py-2 border-r border-slate-700/50 text-slate-200">{item.customerName}</td>
                <td className="px-3 py-2 border-r border-slate-700/50 text-slate-300">{item.founder || '-'}</td>
                <td className="px-3 py-2 align-top">
                    <span className="px-2 py-1 rounded-full bg-slate-700/50 border border-slate-600 text-slate-200 block text-center">
                        {item.destinationCustomer || item.dispositionRoute || '-'}
                    </span>
                </td>
            </tr>
        );
    };

    return (
        <div className="h-full flex flex-col p-6 animate-fade-in overflow-hidden">
            <h3 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-2">
                <FileText className="w-6 h-6 text-green-500" /> 6. รายการรอปิดงาน (Pending Completion)
            </h3>

            {/* Tab Navigation */}
            <div className="flex items-center gap-2 mb-4">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                        activeTab === 'pending'
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                >
                    รายการที่ต้องดำเนินการ ({documentedItems.length})
                </button>
                <button
                    onClick={() => setActiveTab('completed')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                        activeTab === 'completed'
                            ? 'bg-green-600 text-white shadow-sm'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                >
                    รายการที่จบงานแล้ว ({completedItems.length})
                </button>
            </div>

            {/* Pending Items Table */}
            {activeTab === 'pending' && (
            <div className="bg-slate-800 rounded-xl shadow-sm border border-slate-700 overflow-hidden flex flex-col flex-1">
                <div className="p-4 bg-purple-900/30 border-b border-purple-700/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <span className="font-bold text-purple-200">รายการที่ต้องดำเนินการ ({documentedItems.length})</span>

                        {/* Filter Toggle */}
                        <div className="flex bg-slate-700 rounded-lg p-1 border border-slate-600 shadow-sm">
                            {(['ALL', 'NCR', 'COL'] as const).map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => setFilterMode(mode)}
                                    className={`px-3 py-1 rounded text-xs font-bold transition-all ${filterMode === mode
                                        ? 'bg-purple-600 text-white shadow-sm'
                                        : 'text-slate-300 hover:bg-slate-600'
                                        }`}
                                >
                                    {mode === 'ALL' ? 'ทั้งหมด' : mode}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="ค้นหาเลขบิล / NCR / สินค้า / R..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-8 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                aria-label="ล้างการค้นหา"
                                title="ล้างการค้นหา"
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="overflow-auto flex-1">
                    <table className="w-full text-sm text-left table-auto">
                        <thead className="bg-slate-700 border-b border-slate-600 sticky top-0 z-10 shadow-sm text-xs uppercase text-slate-300 font-bold">
                            <tr>
                                <th className="px-2 py-3 border-r border-slate-600 text-center w-[90px]">Action</th>
                                <th className="px-2 py-3 border-r border-slate-600 w-[100px]">สาขา</th>
                                <th className="px-2 py-3 border-r border-slate-600 w-[280px]">สินค้า</th>
                                <th className="px-2 py-3 border-r border-slate-600 text-center w-[70px]">จำนวน</th>
                                <th className="px-2 py-3 border-r border-slate-600 w-[90px]">วันที่แจ้ง</th>
                                <th className="px-2 py-3 border-r border-slate-600 w-[110px]">รายการ NCR</th>
                                <th className="px-2 py-3 border-r border-slate-600 w-[110px]">เลขที่ COL</th>
                                <th className="px-2 py-3 border-r border-slate-600 w-[110px]">Neo Doc</th>
                                <th className="px-2 py-3 border-r border-slate-600 w-[120px]">เลขที่เอกสาร (R) / Ref No.</th>
                                <th className="px-2 py-3 border-r border-slate-600 w-[100px]">เลขที่ใบคุม (TM)</th>
                                <th className="px-2 py-3 border-r border-slate-600 w-[100px]">เลข Invoice</th>
                                <th className="px-2 py-3 border-r border-slate-600 w-[140px]">ลูกค้า</th>
                                <th className="px-2 py-3 border-r border-slate-600 w-[100px]">ผู้พบปัญหา</th>
                                <th className="px-2 py-3 w-[120px]">ปลายทาง</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {groupedItems.length === 0 ? (
                                <tr>
                                    <td colSpan={14} className="p-8 text-center text-slate-400">ไม่มีรายการที่รอปิดงาน</td>
                                </tr>
                            ) : (
                                groupedItems.map(group => {
                                    const hasMultiple = group.items.length > 1;
                                    const isExpanded = expandedGroups.has(group.key);

                                    return (
                                        <React.Fragment key={group.key}>
                                            {/* Main Row */}
                                            {renderRow(group.rep, false, hasMultiple, isExpanded, group.key)}

                                            {/* Sub Rows */}
                                            {hasMultiple && isExpanded && group.items.slice(1).map(subItem =>
                                                renderRow(subItem, true)
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            )}

            {/* Completed Items Table */}
            {activeTab === 'completed' && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 flex-1 overflow-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-700 border-b border-slate-600 sticky top-0 z-10 shadow-sm text-xs uppercase text-slate-300 font-bold">
                            <tr>
                                <th className="px-3 py-3 border-r border-slate-600 min-w-[120px]">สาขา</th>
                                <th className="px-3 py-3 border-r border-slate-600 min-w-[200px]">สินค้า</th>
                                <th className="px-3 py-3 border-r border-slate-600 text-center min-w-[80px]">จำนวน</th>
                                <th className="px-3 py-3 border-r border-slate-600 min-w-[100px]">วันที่ปิดงาน</th>
                                <th className="px-3 py-3 border-r border-slate-600 min-w-[100px]">NCR No.</th>
                                <th className="px-3 py-3 border-r border-slate-600 min-w-[100px]">COL No.</th>
                                <th className="px-3 py-3 border-r border-slate-600 min-w-[100px]">Neo Doc</th>
                                <th className="px-3 py-3 border-r border-slate-600 min-w-[100px]">เลขที่เอกสาร (R / Ref)</th>
                                <th className="px-3 py-3 border-r border-slate-600 min-w-[100px]">เลขที่ใบคุม (TM)</th>
                                <th className="px-3 py-3 border-r border-slate-600 min-w-[100px]">เลข Invoice</th>
                                <th className="px-3 py-3 border-r border-slate-600 min-w-[150px]">ลูกค้า</th>
                                <th className="px-3 py-3 min-w-[100px]">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {completedItems.slice(0, 20).map(item => (
                                <tr key={item.id} className="hover:bg-slate-700/50 transition-colors opacity-75 align-top text-xs text-slate-200">
                                    <td className="px-3 py-2 border-r border-slate-600">
                                        <span className="flex items-center gap-1 text-slate-200"><MapPin className="w-3 h-3 text-slate-400" /> {item.branch}</span>
                                    </td>
                                    <td className="px-3 py-2 border-r border-slate-600">
                                        <div className="font-bold text-slate-100">{item.productCode}</div>
                                        <div className="text-slate-400" title={item.productName}>{item.productName}</div>
                                    </td>
                                    <td className="px-3 py-2 border-r border-slate-600 text-center font-bold text-slate-300">
                                        {item.quantity} {item.unit}
                                    </td>
                                    <td className="px-3 py-2 border-r border-slate-600 text-slate-300">{item.dateCompleted}</td>
                                    <td className="px-3 py-2 border-r border-slate-600 text-slate-300">{item.ncrNumber || '-'}</td>
                                    <td className="px-3 py-2 border-r border-slate-600 text-indigo-300 font-bold">{item.collectionOrderId || '-'}</td>
                                    <td className="px-3 py-2 border-r border-slate-600 text-slate-300">{item.neoRefNo || '-'}</td>
                                    <td className="px-3 py-2 border-r border-slate-600 font-mono text-blue-300 font-bold">
                                        {item.documentNo || (item.refNo && item.refNo !== '-' ? item.refNo : '-') || '-'}
                                    </td>
                                    <td className="px-3 py-2 border-r border-slate-600 font-mono text-slate-300">{item.tmNo || '-'}</td>
                                    <td className="px-3 py-2 border-r border-slate-600 font-mono text-slate-300">{item.invoiceNo || '-'}</td>
                                    <td className="px-3 py-2 border-r border-slate-600 text-slate-300">{item.customerName}</td>
                                    <td className="px-3 py-2"><DispositionBadge disposition={item.disposition} /></td>
                                </tr>
                            ))}
                            {completedItems.length === 0 && (
                                <tr><td colSpan={12} className="p-8 text-center text-slate-400 italic">ยังไม่มีรายการที่จบงาน</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
