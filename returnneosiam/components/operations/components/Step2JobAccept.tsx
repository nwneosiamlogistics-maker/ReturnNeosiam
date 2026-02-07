import React from 'react';
import { ClipboardList, Truck, X, Calendar, Trash2, PlusSquare, MinusSquare, Layers } from 'lucide-react';
import Swal from 'sweetalert2';
import { useData } from '../../../DataContext';
import { ReturnRecord, CollectionOrder } from '../../../types';
import { db } from '../../../firebase';
import { ref, set } from 'firebase/database';
import { BRANCH_LIST } from '../../../constants';

interface Step2JobAcceptProps {
    onComplete?: () => void;
}

export const Step2JobAccept: React.FC<Step2JobAcceptProps> = ({ onComplete }) => {
    const { items, updateReturnRecord, deleteReturnRecord, getNextCollectionNumber } = useData();

    const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [selectedBranchFilter, setSelectedBranchFilter] = React.useState<string>('');


    // Enhanced Grouping State
    const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set());

    // Filter Items: Status 'Requested'
    const requestedItems = React.useMemo(() => {
        return items.filter(item => {
            if (item.status !== 'Requested') return false;
            // Explicitly include LOGISTICS documents
            if (item.documentType === 'LOGISTICS') {
                // Keep going
            }
            // Exclude if it looks like an NCR (has NCR number or NCR type) and NOT logistics
            else if (item.documentType === 'NCR' || !!item.ncrNumber) return false;

            // Filter by Branch if selected
            if (selectedBranchFilter && item.branch !== selectedBranchFilter) {
                return false;
            }

            return true;
        });
    }, [items, selectedBranchFilter]);

    // Grouping Logic: Group by Document ID (R Number)
    const groupedItems = React.useMemo(() => {
        const groups: Record<string, ReturnRecord[]> = {};

        requestedItems.forEach(item => {
            // Key: Use Document No if available, else ID (Single Item Treat)
            // Normalize Key: Remove spaces, lowercase
            const rawKey = item.documentNo ? item.documentNo.trim() : `_NO_DOC_${item.id}`;
            const key = rawKey.toLowerCase();

            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
        });

        // Convert to array and sort by Date of the first item
        return Object.entries(groups).map(([key, groupItems]) => ({
            key,
            items: groupItems,
            // Representative item for header info (Date, Branch, DocNo, TM)
            rep: groupItems[0]
        })).sort((a, b) => {
            const dateA = new Date(a.rep.date || 0).getTime();
            const dateB = new Date(b.rep.date || 0).getTime();
            return dateB - dateA;
        });
    }, [requestedItems]);


    const handleToggleExpand = (groupKey: string) => {
        const newSet = new Set(expandedGroups);
        if (newSet.has(groupKey)) newSet.delete(groupKey);
        else newSet.add(groupKey);
        setExpandedGroups(newSet);
    };

    // Updated Selection: Selects ALL items in the group
    const handleToggleSelectGroup = (groupItems: ReturnRecord[]) => {
        const groupIds = groupItems.map(i => i.id);
        const allSelected = groupIds.every(id => selectedIds.includes(id));

        if (allSelected) {
            // Deselect All
            setSelectedIds(prev => prev.filter(id => !groupIds.includes(id)));
        } else {
            // Select All (Union)
            setSelectedIds(prev => Array.from(new Set([...prev, ...groupIds])));
        }
    };

    // Bulk Update for Group (Maintain Consistency)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleUpdateGroup = async (groupItems: ReturnRecord[], field: keyof ReturnRecord, value: any) => {
        // Optimistic UI update handled by Firebase listener, but we trigger updates for all
        for (const item of groupItems) {
            await updateReturnRecord(item.id, { [field]: value });
        }
    };

    const handleCreateJob = async () => {
        if (selectedIds.length === 0) return;
        if (isSubmitting) return;

        // Validation: 1 COL No must have only 1 Document No (R)
        const selectedItems = items.filter(i => selectedIds.includes(i.id));
        const uniqueInfos = Array.from(new Set(
            selectedItems.map(i => (i.documentNo || '').trim())
        )).filter(Boolean);

        if (uniqueInfos.length > 1) {
            await Swal.fire({
                icon: 'warning',
                title: 'ไม่สามารถสร้างงานได้',
                html: `กฎเหล็ก: <b>1 COL (ใบงาน) ใช้ได้กับ 1 เลขเอกสาร (R) เท่านั้น</b><br/><br/>(คุณเลือกรายการมาจาก ${uniqueInfos.length} เลขที่เอกสาร: ${uniqueInfos.join(', ')})<br/>กรุณาเลือกเฉพาะรายการของเลข R เดียวกัน`,
                confirmButtonText: 'เข้าใจแล้ว'
            });
            return;
        }

        const { value: date } = await Swal.fire({
            title: 'สร้างงานรับสินค้า (Create Job)',
            html: `
                <div style="text-align:left;">
                    <label style="display:block; font-weight:bold; margin-bottom:5px;">วันที่รับสินค้า (Date)</label>
                    <input id="swal-job-date" type="date" class="swal2-input" style="margin:0; width:100%;" value="${new Date().toISOString().split('T')[0]}">
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'ยืนยัน (Confirm)',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#2563eb',
            preConfirm: () => {
                const dateVal = (document.getElementById('swal-job-date') as HTMLInputElement).value;
                if (!dateVal) {
                    Swal.showValidationMessage('กรุณาระบุวันที่');
                }
                return dateVal;
            }
        });

        if (date) {
            setIsSubmitting(true);
            try {
                const newColId = await getNextCollectionNumber();

                const newOrder: CollectionOrder = {
                    id: newColId,
                    driverId: 'Unspecified',
                    vehiclePlate: 'Unspecified',
                    linkedRmaIds: selectedIds,
                    pickupLocation: {
                        name: 'Multiple Customers',
                        address: 'Multiple Addresses',
                        contactName: '-',
                        contactPhone: '-'
                    },
                    pickupDate: date,
                    packageSummary: { totalBoxes: 1, description: 'Batch Collection' },
                    status: 'ASSIGNED',
                    createdDate: new Date().toISOString()
                };

                // 1. Create Order in Firebase
                await set(ref(db, `collection_orders/${newColId}`), newOrder);

                // 2. Update Items
                for (const id of selectedIds) {
                    await updateReturnRecord(id, {
                        status: 'COL_JobAccepted',
                        collectionOrderId: newColId,
                        dateJobAccepted: new Date().toISOString()
                    });
                }

                await Swal.fire({
                    icon: 'success',
                    title: 'สร้างงานสำเร็จ',
                    text: `สร้างงานรับสินค้าเรียบร้อยแล้ว: ${newColId}`,
                    timer: 2000,
                    showConfirmButton: false
                });

                setSelectedIds([]);
                if (onComplete) {
                    onComplete();
                }
            } catch (error) {
                console.error('Error creating job:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    text: 'ไม่สามารถสร้างงานได้ กรุณาลองใหม่',
                    confirmButtonColor: '#d33'
                });
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const handleDeleteItem = async (id: string) => {
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
            const confirmResult = await Swal.fire({
                title: 'ยืนยันการลบรายการ?',
                text: "การกระทำนี้จะลบรายการนี้ถาวร คุณต้องสร้างใหม่ในขั้นตอนที่ 1",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                confirmButtonText: 'ลบรายการ (Delete)'
            });

            if (confirmResult.isConfirmed) {
                setIsSubmitting(true);
                try {
                    await deleteReturnRecord(id);
                    await Swal.fire({ icon: 'success', title: 'ลบเรียบร้อย', timer: 1500, showConfirmButton: false });
                } catch (error) {
                    console.error('Delete error:', error);
                    Swal.fire('Error', 'ไม่สามารถลบได้', 'error');
                } finally {
                    setIsSubmitting(false);
                }
            }
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (isSubmitting) return;

        const { value: password } = await Swal.fire({
            title: 'ใส่รหัสผ่านเพื่อลบรายการที่เลือก',
            input: 'password',
            inputLabel: `รหัสผ่าน (Password) - ลบ ${selectedIds.length} รายการ`,
            inputPlaceholder: 'ใส่รหัสผ่าน...',
            showCancelButton: true,
            confirmButtonText: 'ยืนยัน',
            cancelButtonText: 'ยกเลิก'
        });

        if (password === '1234') {
            const confirmResult = await Swal.fire({
                title: `ยืนยันการลบ ${selectedIds.length} รายการ?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                confirmButtonText: 'ยืนยันลบ (Delete All)'
            });

            if (confirmResult.isConfirmed) {
                setIsSubmitting(true);
                try {
                    let successCount = 0;
                    for (const id of selectedIds) {
                        const success = await deleteReturnRecord(id);
                        if (success) successCount++;
                    }
                    await Swal.fire({ icon: 'success', title: `ลบสำเร็จ ${successCount} รายการ`, timer: 2000, showConfirmButton: false });
                    setSelectedIds([]);
                } catch (error) {
                    console.error('Delete error:', error);
                    Swal.fire('Error', 'ลบไม่สำเร็จบางรายการ', 'error');
                } finally {
                    setIsSubmitting(false);
                }
            }
        }
    };

    return (
        <div className="h-full flex flex-col p-6 animate-fade-in relative">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <ClipboardList className="w-6 h-6 text-blue-500" /> 2. รับงาน (Receive Job)
                </h3>

                <div className="flex items-center gap-3">
                    <select
                        value={selectedBranchFilter}
                        onChange={(e) => setSelectedBranchFilter(e.target.value)}
                        className="p-2 border border-slate-600 rounded-lg text-sm text-slate-200 font-medium outline-none focus:ring-2 focus:ring-blue-500 bg-slate-700 shadow-sm"
                        aria-label="กรองข้อมูลตามสาขา"
                        title="กรองข้อมูลตามสาขา"
                    >
                        <option value="">ทั้งหมด (All Branches)</option>
                        {BRANCH_LIST.map(b => (
                            <option key={b} value={b}>{b}</option>
                        ))}
                    </select>

                    {selectedIds.length > 0 && (
                        <div className="flex gap-2">
                            <button
                                onClick={handleBulkDelete}
                                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition-all flex items-center gap-2"
                            >
                                <Trash2 className="w-5 h-5" /> ลบรายการที่เลือก ({selectedIds.length})
                            </button>
                            <button
                                onClick={handleCreateJob}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition-all flex items-center gap-2"
                            >
                                <Truck className="w-5 h-5" /> สร้างงานรับสินค้า ({selectedIds.length})
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-slate-800 rounded-xl shadow-sm border border-slate-700 overflow-hidden flex-1 flex flex-col">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-slate-700 text-slate-300 font-bold sticky top-0 shadow-sm z-10 text-xs uppercase">
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
                                            <ClipboardList className="w-8 h-8 opacity-20" />
                                            <span>ไม่มีรายการใหม่ที่ต้องการการรับงาน</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                groupedItems.map((group) => {
                                    const { rep, items: gItems, key: gKey } = group;
                                    const expanded = expandedGroups.has(gKey);

                                    // Check State: Are ALL items in group selected?
                                    const allSelected = gItems.every(i => selectedIds.includes(i.id));
                                    const someSelected = gItems.some(i => selectedIds.includes(i.id));

                                    return (
                                        <tr key={gKey} className={`hover:bg-slate-700/50 transition-colors text-xs align-top ${allSelected ? 'bg-blue-900/20' : ''}`}>
                                            {/* # Checkbox for Group */}
                                            <td className="p-3 text-center border-r border-slate-700 bg-slate-800/30">
                                                <input
                                                    type="checkbox"
                                                    checked={allSelected}
                                                    aria-label={`เลือกรายการทั้งหมดในกลุ่ม ${rep.documentNo || gKey}`}
                                                    title={`เลือกรายการทั้งหมดในกลุ่ม ${rep.documentNo || gKey}`}
                                                    ref={input => { if (input) input.indeterminate = someSelected && !allSelected; }}
                                                    onChange={() => handleToggleSelectGroup(gItems)}
                                                    className="accent-blue-600 w-4 h-4 cursor-pointer"
                                                />
                                            </td>

                                            {/* Date */}
                                            <td className="p-3 border-r border-slate-700 font-medium text-slate-200">
                                                {rep.date ? new Date(rep.date).toLocaleDateString('th-TH') : '-'}
                                            </td>

                                            {/* Branch (Editable - Updates All in Group) */}
                                            <td className="p-3 border-r border-slate-700">
                                                <select
                                                    onChange={(e) => handleUpdateGroup(gItems, 'branch', e.target.value)}
                                                    value={rep.branch || ''}
                                                    aria-label="เลือกสาขา"
                                                    title="เลือกสาขา"
                                                    className="w-full bg-transparent border-none p-0 font-bold text-slate-200 focus:ring-0 text-xs cursor-pointer truncate"
                                                >
                                                    <option value="" disabled>เลือกสาขา</option>
                                                    {BRANCH_LIST.map((branch) => (
                                                        <option key={branch} value={branch}>{branch}</option>
                                                    ))}
                                                </select>
                                                {gItems.length > 1 && <div className="text-[9px] text-slate-400 mt-1">*อัพเดท {gItems.length} รายการ</div>}
                                            </td>

                                            {/* Source Customer */}
                                            <td className="p-3 border-r border-slate-700 text-slate-400 truncate max-w-[150px]" title={rep.customerName}>
                                                {rep.customerName || '-'}
                                            </td>

                                            {/* Destination Customer */}
                                            <td className="p-3 border-r border-slate-700 text-slate-400 truncate max-w-[150px]" title={rep.destinationCustomer}>
                                                {rep.destinationCustomer || '-'}
                                            </td>

                                            {/* Invoice (Editable) */}
                                            <td className="p-3 border-r border-slate-700 text-slate-400">
                                                <input
                                                    type="text"
                                                    disabled={true} // Usually Invoice comes from import
                                                    value={rep.invoiceNo || '-'}
                                                    aria-label="เลขที่ Invoice"
                                                    title="เลขที่ Invoice"
                                                    placeholder="Invoice NO"
                                                    // If editable needed, use handleUpdateGroup
                                                    className="w-full bg-transparent border-none p-0 text-xs truncate text-slate-400"
                                                />
                                            </td>

                                            {/* R No */}
                                            <td className="p-3 border-r border-slate-700">
                                                <input
                                                    type="text"
                                                    value={rep.documentNo || ''}
                                                    onChange={(e) => handleUpdateGroup(gItems, 'documentNo', e.target.value)}
                                                    className="w-full bg-transparent border-b border-dashed border-slate-500 focus:border-blue-400 outline-none text-blue-400 font-bold px-1 py-0.5"
                                                    placeholder="R..."
                                                    aria-label="เลขที่เอกสาร R"
                                                    title="เลขที่เอกสาร R"
                                                />
                                                {gItems.length > 1 && (
                                                    <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-300 text-[9px] font-bold">
                                                        <Layers className="w-3 h-3" /> {gItems.length} Items
                                                    </span>
                                                )}
                                            </td>

                                            {/* Control Date */}
                                            <td className="p-3 border-r border-slate-700 text-slate-400">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3 text-slate-500" />
                                                    {rep.controlDate ? new Date(rep.controlDate).toLocaleDateString('th-TH') : '-'}
                                                </div>
                                            </td>

                                            {/* TM No (Editable) */}
                                            <td className="p-3 border-r border-slate-700">
                                                <input
                                                    type="text"
                                                    value={rep.tmNo || ''}
                                                    onChange={(e) => handleUpdateGroup(gItems, 'tmNo', e.target.value)}
                                                    className="w-full bg-transparent border-b border-dashed border-slate-500 focus:border-blue-400 outline-none text-slate-300 font-mono px-1 py-0.5"
                                                    placeholder="TM..."
                                                    aria-label="เลขที่ใบคุม TM"
                                                    title="เลขที่ใบคุม TM"
                                                />
                                            </td>

                                            {/* COL No */}
                                            <td className="p-3 border-r border-slate-700">
                                                {rep.collectionOrderId ? (
                                                    <span className="bg-indigo-900/50 text-indigo-300 px-2 py-0.5 rounded text-[10px] font-mono border border-indigo-700/50 block w-fit">
                                                        {rep.collectionOrderId}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-500">-</span>
                                                )}
                                            </td>

                                            {/* Product Column (Expandable) */}
                                            <td className="p-3 border-r border-slate-700 relative">
                                                <div className="flex flex-col gap-2">
                                                    {/* Primary Item (Always Visible) */}
                                                    <div className="flex justify-between items-start group">
                                                        <div className="flex flex-col gap-0.5">
                                                            <div className="font-bold text-slate-200 text-xs">{gItems[0].productCode || ''}</div>
                                                            <div className="text-slate-400 text-[11px] leading-tight">{gItems[0].productName || '-'}</div>
                                                            <div className="text-slate-400 text-[10px] font-medium bg-slate-700 w-fit px-1.5 py-0.5 rounded mt-0.5">
                                                                Qty: <span className="text-slate-100 font-bold">{gItems[0].quantity} {gItems[0].unit}</span>
                                                            </div>
                                                        </div>

                                                        {/* Delete Single Item Action */}
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteItem(gItems[0].id); }}
                                                            className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            title="ลบรายการนี้"
                                                            aria-label="ลบรายการนี้"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>

                                                    {/* Expand Toggle Button */}
                                                    {gItems.length > 1 && (
                                                        <button
                                                            onClick={() => handleToggleExpand(gKey)}
                                                            className={`flex items-center justify-center gap-1 w-full py-1.5 rounded text-[11px] font-bold border transition-all
                                                                ${expanded
                                                                    ? 'bg-slate-700 text-slate-300 border-slate-600'
                                                                    : 'bg-indigo-900/30 text-indigo-400 border-indigo-700/50 hover:bg-indigo-900/50'}`}
                                                            aria-label={expanded ? "ย่อรายการ" : "ขยายดูรายการเพิ่มเติม"}
                                                            title={expanded ? "ย่อรายการ" : "ขยายดูรายการเพิ่มเติม"}
                                                        >
                                                            {expanded ? <MinusSquare className="w-3 h-3" /> : <PlusSquare className="w-3 h-3" />}
                                                            {expanded ? 'ย่อรายการ (Collapse)' : `ดูอีก ${gItems.length - 1} รายการ (+)`}
                                                        </button>
                                                    )}

                                                    {/* Expanded Items List */}
                                                    {expanded && gItems.length > 1 && (
                                                        <div className="flex flex-col gap-2 pt-2 border-t border-slate-700 mt-1 animate-slide-down">
                                                            {gItems.slice(1).map((subItem) => (
                                                                <div key={subItem.id} className="flex justify-between items-start pl-2 border-l-2 border-indigo-500/50 group">
                                                                    <div className="flex flex-col gap-0.5">
                                                                        <div className="font-bold text-slate-300 text-xs">{subItem.productCode || ''}</div>
                                                                        <div className="text-slate-400 text-[11px]">{subItem.productName || '-'}</div>
                                                                        <div className="text-[10px] text-slate-500">
                                                                            Qty: <b>{subItem.quantity} {subItem.unit}</b>
                                                                        </div>
                                                                    </div>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleDeleteItem(subItem.id); }}
                                                                        className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                        title="ลบรายการนี้"
                                                                        aria-label="ลบรายการนี้"
                                                                    >
                                                                        <X className="w-3 h-3" />
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

            {/* Modal */}

        </div>
    );
};
