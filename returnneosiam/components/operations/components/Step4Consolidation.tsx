import React from 'react';
import { LayoutGrid, PackageCheck, Calendar, RotateCcw, Share2, X, Layers, PlusSquare, MinusSquare } from 'lucide-react';
import { createPortal } from 'react-dom';
import Swal from 'sweetalert2';
import { useData } from '../../../DataContext';
import { ReturnRecord, TransportInfo } from '../../../types';
import { RETURN_ROUTES, BRANCH_LIST } from '../../../constants';
import { sendTelegramMessage } from '../../../utils/telegramService';

interface Step4ConsolidationProps {
    onComplete?: () => void;
}

export const Step4Consolidation: React.FC<Step4ConsolidationProps> = ({ onComplete }) => {
    const { items, updateReturnRecord, getNextCollectionNumber, systemConfig } = useData();
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [consolidationDate, setConsolidationDate] = React.useState(new Date().toISOString().split('T')[0]);

    // Filter State
    const [selectedBranchFilter, setSelectedBranchFilter] = React.useState<string>('');

    // Selection & Grouping State
    const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
    const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set());

    // Modal State
    const [isDecisionModalOpen, setIsDecisionModalOpen] = React.useState(false);
    const [targetConsolidateIds, setTargetConsolidateIds] = React.useState<string[]>([]);
    const [tempRoute, setTempRoute] = React.useState<string>('');

    // Transport Info State (Hidden but kept for compatibility)
    const [transportInfo] = React.useState<TransportInfo>({
        driverName: '',
        plateNumber: '',
        transportCompany: 'รถบริษัท'
    });

    // Filter Items
    const receivedItems = React.useMemo(() => {
        return items.filter(item => {
            const isStatusMatch = item.status === 'BranchReceived' || item.status === 'COL_BranchReceived';
            if (!isStatusMatch) return false;

            if (selectedBranchFilter && item.branch !== selectedBranchFilter) {
                return false;
            }
            return true;
        });
    }, [items, selectedBranchFilter]);

    // Grouping Logic: Group by Document ID (R Number)
    const groupedItems = React.useMemo(() => {
        const groups: Record<string, ReturnRecord[]> = {};

        receivedItems.forEach(item => {
            const rawKey = item.documentNo ? item.documentNo.trim() : `_NO_DOC_${item.id}`;
            const key = rawKey.toLowerCase();
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
        });

        return Object.entries(groups).map(([key, groupItems]) => ({
            key,
            items: groupItems,
            rep: groupItems[0]
        })).sort((a, b) => new Date(b.rep.date).getTime() - new Date(a.rep.date).getTime());
    }, [receivedItems]);

    const handleToggleExpand = (groupKey: string) => {
        const newSet = new Set(expandedGroups);
        if (newSet.has(groupKey)) newSet.delete(groupKey);
        else newSet.add(groupKey);
        setExpandedGroups(newSet);
    };

    const handleToggleSelectGroup = (groupItems: ReturnRecord[]) => {
        const groupIds = groupItems.map(i => i.id);
        const allSelected = groupIds.every(id => selectedIds.includes(id));

        if (allSelected) {
            setSelectedIds(prev => prev.filter(id => !groupIds.includes(id)));
        } else {
            setSelectedIds(prev => Array.from(new Set([...prev, ...groupIds])));
        }
    };

    const handleConsolidateSelected = async () => {
        if (selectedIds.length === 0) return;
        if (isSubmitting) return;

        setTargetConsolidateIds(selectedIds);
        setTempRoute('');
        setIsDecisionModalOpen(true);
    };

    const confirmConsolidation = async () => {
        if (!tempRoute || tempRoute === 'Other') {
            await Swal.fire({ icon: 'warning', title: 'กรุณาระบุเส้นทาง', text: 'สำหรับการคืนสินค้า กรุณาระบุเส้นทางส่งคืน' });
            return;
        }

        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            // Generate COL number for this consolidation batch
            const colNumber = await getNextCollectionNumber();

            // Get the actual items for Telegram message
            const consolidatedItems = items.filter(i => targetConsolidateIds.includes(i.id));

            for (const id of targetConsolidateIds) {
                await updateReturnRecord(id, {
                    status: 'COL_Consolidated',
                    collectionOrderId: colNumber,
                    dateConsolidated: consolidationDate,
                    preliminaryDecision: 'Return',
                    preliminaryRoute: tempRoute,
                    transportInfo: transportInfo
                });
            }

            // Send Telegram notification
            if (systemConfig.telegram?.enabled && systemConfig.telegram.chatId) {
                const firstItem = consolidatedItems[0];
                const msgDate = new Date().toLocaleString('th-TH');
                const branch = firstItem?.branch || '-';
                const customerName = firstItem?.customerName || '-';
                const destCustomer = firstItem?.destinationCustomer || '-';

                const uniqueRNumbers = Array.from(new Set(consolidatedItems.map(i => i.documentNo).filter(Boolean)));
                const rNumberDisplay = uniqueRNumbers.length > 0
                    ? uniqueRNumbers.slice(0, 5).join(', ') + (uniqueRNumbers.length > 5 ? ` (+${uniqueRNumbers.length - 5})` : '')
                    : '-';

                const qty = consolidatedItems.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);
                const unit = firstItem?.unit || 'PCS';

                const itemsSummary = consolidatedItems.slice(0, 10).map((it, idx) =>
                    `${idx + 1}. ${it.productName || '-'} x${Number(it.quantity) || 0} ${it.unit || 'PCS'}`
                ).join('\n') + (consolidatedItems.length > 10 ? `\n... และอีก ${consolidatedItems.length - 10} รายการ` : '');

                const telegramMsg = `<b>📦 Collection Report (Consolidated) [${colNumber}]</b>
----------------------------------
<b>วันที่รวมสินค้า :</b> ${consolidationDate}
<b>วันที่แจ้ง :</b> ${msgDate}
<b>สาขา :</b> ${branch}
<b>ลูกค้า / ลูกค้าปลายทาง :</b> ${customerName} / ${destCustomer}
<b>เลข COL :</b> ${colNumber}
<b>เลขที่เอกสาร (เลข R) :</b> ${rNumberDisplay}
<b>เส้นทาง :</b> ${tempRoute}
<b>จำนวนรายการ :</b> ${consolidatedItems.length} รายการ (รวม ${qty} ${unit})

📋 <b>รายการคืนสินค้า</b>
${itemsSummary}
----------------------------------
🔗 <i>Status: COL_Consolidated</i>`;

                await sendTelegramMessage(systemConfig.telegram.botToken, systemConfig.telegram.chatId, telegramMsg);
            }

            await Swal.fire({
                icon: 'success',
                title: 'สำเร็จ',
                text: `รวมสินค้าเรียบร้อย! เลข COL: ${colNumber}`,
                timer: 2000,
                showConfirmButton: false
            });

            setIsDecisionModalOpen(false);
            setTargetConsolidateIds([]);
            setSelectedIds([]);
            setTempRoute('');

            if (onComplete) {
                onComplete();
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUndo = async (id: string) => {
        if (isSubmitting) return;

        const { value: password } = await Swal.fire({
            title: 'ใส่รหัสผ่านเพื่อแก้ไข (Undo)',
            input: 'password',
            inputLabel: 'รหัสผ่าน (Password)',
            inputPlaceholder: 'ใส่รหัสผ่าน...',
            showCancelButton: true,
            confirmButtonText: 'ยืนยัน',
            cancelButtonText: 'ยกเลิก'
        });

        if (password === '1234') {
            setIsSubmitting(true);
            try {
                await updateReturnRecord(id, { status: 'COL_JobAccepted' });
                await Swal.fire({
                    icon: 'success',
                    title: 'ย้อนกลับเรียบร้อย',
                    text: 'รายการจะไปปรากฏใน Step 3',
                    timer: 2000,
                    showConfirmButton: false
                });
            } catch {
                Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถย้อนกลับได้', 'error');
            } finally {
                setIsSubmitting(false);
            }
        } else if (password) {
            Swal.fire('รหัสผ่านไม่ถูกต้อง', '', 'error');
        }
    };

    return (
        <div className="h-full flex flex-col p-3 md:p-6 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <LayoutGrid className="w-6 h-6 text-slate-600" /> 4. รวมสินค้า (Branch Consolidation)
                </h3>
                <div className="flex items-center gap-2">
                    <select
                        value={selectedBranchFilter}
                        onChange={(e) => setSelectedBranchFilter(e.target.value)}
                        className="p-2 border border-slate-300 rounded-lg text-sm text-slate-700 font-medium outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm mr-2"
                        aria-label="กรองข้อมูลตามสาขา"
                        title="กรองข้อมูลตามสาขา"
                    >
                        <option value="">ทั้งหมด (All Branches)</option>
                        {BRANCH_LIST.map(b => (
                            <option key={b} value={b}>{b}</option>
                        ))}
                    </select>

                    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm mr-2">
                        <span className="text-sm font-bold text-slate-600">วันที่รวม:</span>
                        <input
                            type="date"
                            value={consolidationDate}
                            onChange={(e) => setConsolidationDate(e.target.value)}
                            className="outline-none text-slate-700 font-medium text-sm"
                            aria-label="วันที่รวมสินค้า"
                            title="วันที่รวมสินค้า"
                        />
                    </div>

                    {selectedIds.length > 0 && (
                        <button
                            onClick={handleConsolidateSelected}
                            disabled={isSubmitting}
                            className="bg-slate-800 hover:bg-black text-white px-4 py-2 rounded-lg font-bold shadow-sm transition-all disabled:opacity-50 disabled:cursor-wait flex items-center gap-2"
                        >
                            <PackageCheck className="w-5 h-5" /> รวมสินค้าที่เลือก ({selectedIds.length})
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 shadow-sm z-10 text-xs uppercase">
                            <tr>
                                <th className="p-3 border-b text-center w-12">#</th>
                                <th className="p-3 border-b min-w-[100px]">วันที่ (DATE)</th>
                                <th className="p-3 border-b min-w-[120px]">สาขา (BRANCH)</th>
                                <th className="p-3 border-b min-w-[150px]">ลูกค้าต้นทาง</th>
                                <th className="p-3 border-b min-w-[150px]">ลูกค้าปลายทาง</th>
                                <th className="p-3 border-b min-w-[100px]">เลข INVOICE</th>
                                <th className="p-3 border-b min-w-[130px]">เลขที่เอกสาร (R)</th>
                                <th className="p-3 border-b min-w-[120px]">วันที่ใบคุมรถ</th>
                                <th className="p-3 border-b min-w-[120px]">เลขที่ใบคุม (TM)</th>
                                <th className="p-3 border-b min-w-[120px]">เลขที่ COL (COL NO)</th>
                                <th className="p-3 border-b min-w-[300px]">สินค้า (PRODUCT) - EXPAND (+)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {groupedItems.length === 0 ? (
                                <tr>
                                    <td colSpan={11} className="p-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <PackageCheck className="w-8 h-8 opacity-20" />
                                            <span>ไม่มีรายการที่ต้องรวมสินค้า</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                groupedItems.map((group) => {
                                    const { rep, items: gItems, key: gKey } = group;
                                    const expanded = expandedGroups.has(gKey);
                                    const allSelected = gItems.every(i => selectedIds.includes(i.id));
                                    const someSelected = gItems.some(i => selectedIds.includes(i.id));

                                    return (
                                        <tr key={gKey} className={`hover:bg-slate-50 transition-colors text-xs align-top ${allSelected ? 'bg-indigo-50/30' : ''}`}>
                                            {/* Checkbox */}
                                            <td className="p-3 text-center border-r border-slate-100 bg-slate-50/30">
                                                <input
                                                    type="checkbox"
                                                    checked={allSelected}
                                                    ref={input => { if (input) input.indeterminate = someSelected && !allSelected; }}
                                                    onChange={() => handleToggleSelectGroup(gItems)}
                                                    className="accent-slate-800 w-4 h-4 cursor-pointer"
                                                    aria-label={`เลือกรายการทั้งหมดในกลุ่ม ${rep.documentNo || gKey}`}
                                                    title={`เลือกรายการทั้งหมดในกลุ่ม ${rep.documentNo || gKey}`}
                                                />
                                            </td>

                                            {/* Date */}
                                            <td className="p-3 border-r border-slate-100 font-medium text-slate-700">
                                                {rep.date ? new Date(rep.date).toLocaleDateString('th-TH') : '-'}
                                            </td>

                                            {/* Branch */}
                                            <td className="p-3 border-r border-slate-100">
                                                <div className="font-bold text-slate-700">{rep.branch}</div>
                                            </td>

                                            {/* Source Customer */}
                                            <td className="p-3 border-r border-slate-100 text-slate-600 truncate max-w-[150px]" title={rep.customerName}>
                                                {rep.customerName || '-'}
                                            </td>

                                            {/* Destination Customer */}
                                            <td className="p-3 border-r border-slate-100 text-slate-600 truncate max-w-[150px]" title={rep.destinationCustomer}>
                                                {rep.destinationCustomer || '-'}
                                            </td>

                                            {/* Invoice */}
                                            <td className="p-3 border-r border-slate-100 text-slate-500">
                                                {rep.invoiceNo || '-'}
                                            </td>

                                            {/* R No */}
                                            <td className="p-3 border-r border-slate-100">
                                                <span className="font-bold text-blue-600 dashed-underline cursor-help" title={rep.documentNo}>
                                                    {rep.documentNo || '-'}
                                                </span>
                                                {gItems.length > 1 && (
                                                    <div className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px] font-bold">
                                                        <Layers className="w-3 h-3" /> {gItems.length} Items
                                                    </div>
                                                )}
                                            </td>

                                            {/* Control Date */}
                                            <td className="p-3 border-r border-slate-100 text-slate-600">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3 text-slate-400" />
                                                    {rep.controlDate ? new Date(rep.controlDate).toLocaleDateString('th-TH') : '-'}
                                                </div>
                                            </td>

                                            {/* TM No */}
                                            <td className="p-3 border-r border-slate-100 font-mono text-slate-600">
                                                {rep.tmNo || '-'}
                                            </td>

                                            {/* COL No */}
                                            <td className="p-3 border-r border-slate-100">
                                                {rep.collectionOrderId ? (
                                                    <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-mono border border-indigo-100 block w-fit">
                                                        {rep.collectionOrderId}
                                                    </span>
                                                ) : '-'}
                                            </td>

                                            {/* Product Column */}
                                            <td className="p-3 border-r border-slate-100 relative">
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex justify-between items-start group">
                                                        <div className="flex flex-col gap-0.5">
                                                            <div className="font-bold text-slate-800 text-xs">{gItems[0].productCode || ''}</div>
                                                            <div className="text-slate-600 text-[11px] leading-tight">{gItems[0].productName || '-'}</div>
                                                            <div className="text-slate-500 text-[10px] font-medium bg-slate-100 w-fit px-1.5 py-0.5 rounded mt-0.5">
                                                                Qty: <span className="text-slate-900 font-bold">{gItems[0].quantity} {gItems[0].unit}</span>
                                                            </div>
                                                        </div>

                                                        {/* Undo Action */}
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleUndo(gItems[0].id); }}
                                                            className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            title="ย้อนกลับ (Undo)"
                                                        >
                                                            <RotateCcw className="w-3 h-3" />
                                                        </button>
                                                    </div>

                                                    {/* Expand Toggle */}
                                                    {gItems.length > 1 && (
                                                        <button
                                                            onClick={() => handleToggleExpand(gKey)}
                                                            className={`flex items-center justify-center gap-1 w-full py-1.5 rounded text-[11px] font-bold border transition-all
                                                                ${expanded ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-slate-100'}`}
                                                        >
                                                            {expanded ? <MinusSquare className="w-3 h-3" /> : <PlusSquare className="w-3 h-3" />}
                                                            {expanded ? 'ย่อรายการ (Collapse)' : `ดูอีก ${gItems.length - 1} รายการ (+)`}
                                                        </button>
                                                    )}

                                                    {/* Expanded Items */}
                                                    {expanded && gItems.length > 1 && (
                                                        <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 mt-1 animate-slide-down">
                                                            {gItems.slice(1).map((subItem) => (
                                                                <div key={subItem.id} className="flex justify-between items-start pl-2 border-l-2 border-indigo-200 group">
                                                                    <div className="flex flex-col gap-0.5">
                                                                        <div className="font-bold text-slate-700 text-xs">{subItem.productCode || ''}</div>
                                                                        <div className="text-slate-500 text-[11px]">{subItem.productName || '-'}</div>
                                                                        <div className="text-[10px] text-slate-400">
                                                                            Qty: <b>{subItem.quantity} {subItem.unit}</b>
                                                                        </div>
                                                                    </div>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleUndo(subItem.id); }}
                                                                        className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                        title="ย้อนกลับ (Undo)"
                                                                    >
                                                                        <RotateCcw className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Decision Modal */}
            {isDecisionModalOpen && createPortal(
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-up">
                        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <Share2 className="w-6 h-6 text-indigo-600" />
                                    เพิ่มการตัดสินใจเบื้องต้น ({targetConsolidateIds.length} รายการ)
                                </h3>
                                <button onClick={() => setIsDecisionModalOpen(false)} className="text-slate-400 hover:text-slate-600" aria-label="ปิด" title="ปิด"><X className="w-6 h-6" /></button>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="space-y-4">
                                <label className="block text-sm font-bold text-slate-800 mb-2">ระบุเส้นทางส่งคืน (Return Route)</label>
                                <div className="border rounded-xl overflow-hidden bg-indigo-50/30">
                                    <div className="p-4">
                                        <div className="p-3 bg-white rounded border border-indigo-100 text-sm">
                                            <div className="flex flex-wrap gap-2">
                                                {RETURN_ROUTES.map(route => (
                                                    <label key={route} className={`px-3 py-1 rounded border cursor-pointer transition-all ${tempRoute === route ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold' : 'bg-slate-50 hover:bg-indigo-50/50'}`}>
                                                        <input type="radio" name="tempRoute" value={route} checked={tempRoute === route} onChange={(e) => setTempRoute(e.target.value)} className="hidden" />
                                                        {route}
                                                    </label>
                                                ))}
                                                <label className={`px-3 py-1 rounded border cursor-pointer transition-all ${tempRoute === 'Other' || (tempRoute && !RETURN_ROUTES.includes(tempRoute)) ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold' : 'bg-slate-50 hover:bg-indigo-50/50'}`}>
                                                    <input type="radio" name="tempRoute" value="Other" checked={tempRoute === 'Other' || (tempRoute && !RETURN_ROUTES.includes(tempRoute))} onChange={() => setTempRoute('Other')} className="hidden" />
                                                    อื่นๆ (Other)
                                                </label>
                                            </div>
                                            {(tempRoute === 'Other' || (tempRoute && !RETURN_ROUTES.includes(tempRoute))) && (
                                                <input type="text" value={tempRoute === 'Other' ? '' : tempRoute} onChange={(e) => setTempRoute(e.target.value)} className="w-full mt-2 p-2 border rounded text-sm focus:ring-2 focus:ring-indigo-500" placeholder="ระบุเส้นทาง..." autoFocus />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                            <button onClick={() => setIsDecisionModalOpen(false)} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-lg transition-colors">ยกเลิก</button>
                            <button onClick={confirmConsolidation} disabled={isSubmitting} className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-md transition-all disabled:opacity-50 disabled:cursor-wait">
                                {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก (Save)'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
