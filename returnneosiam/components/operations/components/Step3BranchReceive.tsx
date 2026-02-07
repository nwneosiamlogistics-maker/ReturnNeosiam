import React from 'react';
import { Activity, Box, CheckSquare, Calendar, RotateCcw, Layers, PlusSquare, MinusSquare } from 'lucide-react';
// import { createPortal } from 'react-dom'; (Removed)
import Swal from 'sweetalert2';
import { useData } from '../../../DataContext';
import { ReturnRecord } from '../../../types';
import { BRANCH_LIST } from '../../../constants';

interface Step3BranchReceiveProps {
    onComplete?: () => void;
}

export const Step3BranchReceive: React.FC<Step3BranchReceiveProps> = ({ onComplete }) => {
    const { items, updateReturnRecord } = useData();
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    // Filter State
    const [selectedBranchFilter, setSelectedBranchFilter] = React.useState<string>('');

    // Selection & Grouping State
    const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
    const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set());

    // Modal State
    // Modal State removed


    // Filter Items: Status 'JobAccepted' or 'COL_JobAccepted'
    const acceptedItems = React.useMemo(() => {
        return items.filter(item => {
            // 1. Check Status
            const isStatusMatch = item.status === 'COL_JobAccepted' || item.status === 'JobAccepted';
            if (!isStatusMatch) return false;

            // 2. Explicitly INCLUDE 'LOGISTICS' type
            const isLogistics = item.documentType === 'LOGISTICS';
            // 3. Exclude actual NCR items if not Logistics
            if (!isLogistics && (item.documentType === 'NCR' || !!item.ncrNumber)) return false;

            // 4. Branch Filter
            if (selectedBranchFilter && item.branch !== selectedBranchFilter) {
                return false;
            }

            return true;
        });
    }, [items, selectedBranchFilter]);

    // Grouping Logic: Group by Document ID (R Number)
    const groupedItems = React.useMemo(() => {
        const groups: Record<string, ReturnRecord[]> = {};

        acceptedItems.forEach(item => {
            const rawKey = item.documentNo ? item.documentNo.trim() : `_NO_DOC_${item.id}`;
            const key = rawKey.toLowerCase();

            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
        });

        // Convert to array and sort by Date of the first item
        return Object.entries(groups).map(([key, groupItems]) => ({
            key,
            items: groupItems,
            rep: groupItems[0]
        })).sort((a, b) => {
            const dateA = new Date(a.rep.date || 0).getTime();
            const dateB = new Date(b.rep.date || 0).getTime();
            return dateB - dateA;
        });
    }, [acceptedItems]);


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

    const handleReceiveSelected = async () => {
        if (selectedIds.length === 0) return;
        if (isSubmitting) return;

        const defaultDate = new Date().toISOString().split('T')[0];
        const selectedItems = items.filter(i => selectedIds.includes(i.id));

        // Generate Rows HTML
        const rowsHtml = selectedItems.map(item => `
            <tr data-id="${item.id}" class="item-row">
                <td style="padding: 5px;"><input type="text" class="swal2-input product-name" style="margin:0; width:100%; font-size:0.9em;" value="${item.productName || ''}" placeholder="ชื่อสินค้า"></td>
                <td style="padding: 5px;"><input type="number" class="swal2-input product-qty" style="margin:0; width:80px; font-size:0.9em;" value="${item.quantity}" min="0"></td>
                <td style="padding: 5px;"><input type="text" class="swal2-input product-unit" style="margin:0; width:60px; font-size:0.9em;" value="${item.unit || ''}" placeholder="หน่วย"></td>
                <td style="padding: 5px; text-align:center;">-</td>
            </tr>
        `).join('');

        const { value: formValues } = await Swal.fire({
            title: `บันทึกรับสินค้า (${selectedIds.length} รายการ)`,
            width: '800px',
            html: `
                <div style="text-align: left; font-size: 0.9rem; color: #334155;">
                     <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                        <div>
                            <label style="display:block; font-weight:bold; margin-bottom:4px;">วันที่รับจริง <span style="color:red">*</span></label>
                            <input id="swal-date" type="date" class="swal2-input" style="margin:0; width:100%; box-sizing:border-box;" value="${defaultDate}">
                        </div>
                        <div>
                            <label style="display:block; font-weight:bold; margin-bottom:4px;">ชื่อคนขับ <span style="color:red">*</span></label>
                            <input id="swal-driver" type="text" class="swal2-input" style="margin:0; width:100%; box-sizing:border-box;" placeholder="ระบุชื่อ...">
                        </div>
                        <div>
                            <label style="display:block; font-weight:bold; margin-bottom:4px;">ทะเบียนรถ <span style="color:red">*</span></label>
                            <input id="swal-plate" type="text" class="swal2-input" style="margin:0; width:100%; box-sizing:border-box;" placeholder="ระบุทะเบียน...">
                        </div>
                    </div>

                    <div style="max-height: 300px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
                        <table style="width:100%; border-collapse: collapse;">
                            <thead style="background: #f1f5f9; position: sticky; top: 0;">
                                <tr>
                                    <th style="padding: 8px; text-align: left; font-size: 0.85rem;">ชื่อสินค้า (Product)</th>
                                    <th style="padding: 8px; text-align: left; font-size: 0.85rem; width: 80px;">Qty</th>
                                    <th style="padding: 8px; text-align: left; font-size: 0.85rem; width: 60px;">Unit</th>
                                    <th style="padding: 8px; width: 40px;"></th>
                                </tr>
                            </thead>
                            <tbody id="swal-items-body">
                                ${rowsHtml}
                            </tbody>
                        </table>
                    </div>
                    <button type="button" id="btn-add-row" style="margin-top: 10px; width: 100%; padding: 8px; border: 1px dashed #cbd5e1; background: #f8fafc; color: #475569; font-weight: bold; cursor: pointer; border-radius: 6px;">+ เพิ่มสินค้า (Add Product)</button>
                </div>
            `,
            didOpen: () => {
                const addBtn = document.getElementById('btn-add-row');
                const tbody = document.getElementById('swal-items-body');

                if (addBtn && tbody) {
                    addBtn.addEventListener('click', () => {
                        const newRow = document.createElement('tr');
                        newRow.classList.add('item-row');
                        newRow.setAttribute('data-new', 'true');
                        newRow.innerHTML = `
                             <td style="padding: 5px;"><input type="text" class="swal2-input product-name" style="margin:0; width:100%; font-size:0.9em;" placeholder="ระบุชื่อสินค้า"></td>
                            <td style="padding: 5px;"><input type="number" class="swal2-input product-qty" style="margin:0; width:80px; font-size:0.9em;" value="1" min="0"></td>
                            <td style="padding: 5px;"><input type="text" class="swal2-input product-unit" style="margin:0; width:60px; font-size:0.9em;" placeholder="หน่วย"></td>
                            <td style="padding: 5px; text-align:center;"><button type="button" class="btn-remove-row" style="color: red; border: none; background: none; cursor: pointer;">X</button></td>
                        `;
                        tbody.appendChild(newRow);

                        // Scroll to bottom
                        const container = tbody.parentElement?.parentElement;
                        if (container) container.scrollTop = container.scrollHeight;

                        // Add listener for remove button
                        newRow.querySelector('.btn-remove-row')?.addEventListener('click', () => {
                            newRow.remove();
                        });
                    });
                }
            },
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'ยืนยัน (Confirm)',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#4f46e5',
            preConfirm: () => {
                const dateEl = document.getElementById('swal-date') as HTMLInputElement;
                const driverEl = document.getElementById('swal-driver') as HTMLInputElement;
                const plateEl = document.getElementById('swal-plate') as HTMLInputElement;

                if (!dateEl.value || !driverEl.value || !plateEl.value) {
                    Swal.showValidationMessage('กรุณากรอกวันที่, ชื่อคนขับ และทะเบียนรถ');
                    return false;
                }

                // Gather Items
                const rows = document.querySelectorAll('.item-row');
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const itemsData: any[] = [];
                let isValid = true;

                rows.forEach((row: Element) => {
                    const id = row.getAttribute('data-id');
                    const isNew = row.getAttribute('data-new') === 'true';
                    const name = (row.querySelector('.product-name') as HTMLInputElement).value;
                    const qty = Number((row.querySelector('.product-qty') as HTMLInputElement).value);
                    const unit = (row.querySelector('.product-unit') as HTMLInputElement).value;

                    if (!name) {
                        isValid = false;
                        return;
                    }

                    itemsData.push({
                        id,
                        isNew,
                        productName: name,
                        quantity: qty,
                        unit
                    });
                });

                if (!isValid) {
                    Swal.showValidationMessage('กรุณาระบุชื่อสินค้าให้ครบถ้วน');
                    return false;
                }

                return {
                    date: dateEl.value,
                    driver: driverEl.value,
                    plate: plateEl.value,
                    items: itemsData
                };
            }
        });

        if (formValues) {
            setIsSubmitting(true);
            try {
                // transport info
                const transportInfo = {
                    driverName: formValues.driver,
                    plateNumber: formValues.plate,
                    transportCompany: 'Company'
                };

                // 1. Update Existing Items
                for (const itemData of formValues.items) {
                    if (!itemData.isNew && itemData.id) {
                        await updateReturnRecord(itemData.id, {
                            status: 'COL_BranchReceived',
                            dateReceived: formValues.date,
                            dateBranchReceived: formValues.date,
                            quantity: itemData.quantity,
                            unit: itemData.unit,
                            productName: itemData.productName,
                            transportInfo
                        });
                    } else if (itemData.isNew) {
                        // 2. Create New Item
                        // Inherit metadata from first selected item
                        const template = selectedItems[0];
                        if (!template && selectedItems.length === 0) {
                            // Should not happen as we check length > 0
                            // But if add button used without selection? (Button is hidden if no selection)
                            return;
                        }

                        const newId = `EXTRA_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

                        const newRecord: ReturnRecord = {
                            ...template,
                            id: newId,
                            status: 'COL_BranchReceived',
                            dateReceived: formValues.date,
                            dateBranchReceived: formValues.date,
                            productCode: itemData.productName,
                            productName: itemData.productName,
                            quantity: itemData.quantity,
                            unit: itemData.unit,
                            transportInfo,
                            documentNo: template.documentNo,
                            invoiceNo: template.invoiceNo,
                            tmNo: template.tmNo,
                            collectionOrderId: template.collectionOrderId,
                            branch: template.branch
                        };

                        await updateReturnRecord(newId, newRecord);
                    }
                }

                await Swal.fire({
                    icon: 'success',
                    title: 'รับสินค้าเรียบร้อย',
                    text: `บันทึกข้อมูลรับสินค้า ${formValues.items.length} รายการ`,
                    timer: 1500,
                    showConfirmButton: false
                });

                setSelectedIds([]);
                if (onComplete) {
                    onComplete();
                }
            } catch (error) {
                console.error("Error receiving items:", error);
                Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถบันทึกข้อมูลได้' });
            } finally {
                setIsSubmitting(false);
            }
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
                await updateReturnRecord(id, { status: 'Requested' });
                await Swal.fire({
                    icon: 'success',
                    title: 'ย้อนกลับเรียบร้อย',
                    text: 'รายการจะไปปรากฏใน Step 2',
                    timer: 2000,
                    showConfirmButton: false
                });
            } catch (error) {
                console.error("Undo error:", error);
                Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถย้อนกลับได้', 'error');
            } finally {
                setIsSubmitting(false);
            }
        } else if (password) {
            Swal.fire('รหัสผ่านไม่ถูกต้อง', '', 'error');
        }
    };

    return (
        <div className="h-full flex flex-col p-6 animate-fade-in relative">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Activity className="w-6 h-6 text-indigo-500" /> 3. รับสินค้า (Branch Physical Receive)
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
                        <button
                            onClick={handleReceiveSelected}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition-all flex items-center gap-2"
                        >
                            <CheckSquare className="w-5 h-5" /> ยืนยันรับของ ({selectedIds.length})
                        </button>
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
                                            <Box className="w-8 h-8 opacity-20" />
                                            <span>ไม่มีรายการที่ต้องรับสินค้า</span>
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
                                        <tr key={gKey} className={`hover:bg-slate-700/50 transition-colors text-xs align-top ${allSelected ? 'bg-indigo-900/20' : ''}`}>
                                            {/* Checkbox */}
                                            <td className="p-3 text-center border-r border-slate-700 bg-slate-800/30">
                                                <input
                                                    type="checkbox"
                                                    checked={allSelected}
                                                    aria-label={`เลือกรายการทั้งหมดในกลุ่ม ${rep.documentNo || gKey}`}
                                                    title={`เลือกรายการทั้งหมดในกลุ่ม ${rep.documentNo || gKey}`}
                                                    ref={input => { if (input) input.indeterminate = someSelected && !allSelected; }}
                                                    onChange={() => handleToggleSelectGroup(gItems)}
                                                    className="accent-indigo-600 w-4 h-4 cursor-pointer"
                                                />
                                            </td>

                                            {/* Date */}
                                            <td className="p-3 border-r border-slate-700 font-medium text-slate-200">
                                                {rep.date ? new Date(rep.date).toLocaleDateString('th-TH') : '-'}
                                            </td>

                                            {/* Branch */}
                                            <td className="p-3 border-r border-slate-700">
                                                <div className="font-bold text-slate-200">{rep.branch}</div>
                                            </td>

                                            {/* Source Customer */}
                                            <td className="p-3 border-r border-slate-700 text-slate-400 truncate max-w-[150px]" title={rep.customerName}>
                                                {rep.customerName || '-'}
                                            </td>

                                            {/* Destination Customer */}
                                            <td className="p-3 border-r border-slate-700 text-slate-400 truncate max-w-[150px]" title={rep.destinationCustomer}>
                                                {rep.destinationCustomer || '-'}
                                            </td>

                                            {/* Invoice */}
                                            <td className="p-3 border-r border-slate-700 text-slate-400">
                                                {rep.invoiceNo || '-'}
                                            </td>

                                            {/* R No */}
                                            <td className="p-3 border-r border-slate-700">
                                                <span className="font-bold text-blue-400 dashed-underline cursor-help" title={rep.documentNo}>
                                                    {rep.documentNo || '-'}
                                                </span>
                                                {gItems.length > 1 && (
                                                    <div className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-300 text-[9px] font-bold">
                                                        <Layers className="w-3 h-3" /> {gItems.length} Items
                                                    </div>
                                                )}
                                            </td>

                                            {/* Control Date */}
                                            <td className="p-3 border-r border-slate-700 text-slate-400">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3 text-slate-500" />
                                                    {rep.controlDate ? new Date(rep.controlDate).toLocaleDateString('th-TH') : '-'}
                                                </div>
                                            </td>

                                            {/* TM No */}
                                            <td className="p-3 border-r border-slate-700 font-mono text-slate-400">
                                                {rep.tmNo || '-'}
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

                                            {/* Product Column */}
                                            <td className="p-3 border-r border-slate-700 relative">
                                                <div className="flex flex-col gap-2">
                                                    {/* Primary Item */}
                                                    <div className="flex justify-between items-start group">
                                                        <div className="flex flex-col gap-0.5">
                                                            <div className="font-bold text-slate-200 text-xs">{gItems[0].productCode || ''}</div>
                                                            <div className="text-slate-400 text-[11px] leading-tight">{gItems[0].productName || '-'}</div>
                                                            <div className="text-slate-400 text-[10px] font-medium bg-slate-700 w-fit px-1.5 py-0.5 rounded mt-0.5">
                                                                Qty: <span className="text-slate-100 font-bold">{gItems[0].quantity} {gItems[0].unit}</span>
                                                            </div>
                                                        </div>

                                                        {/* Undo Action */}
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleUndo(gItems[0].id); }}
                                                            className="text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
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
                                                                ${expanded ? 'bg-slate-700 text-slate-300 border-slate-600' : 'bg-indigo-900/30 text-indigo-400 border-indigo-700/50 hover:bg-indigo-900/50'}`}
                                                        >
                                                            {expanded ? <MinusSquare className="w-3 h-3" /> : <PlusSquare className="w-3 h-3" />}
                                                            {expanded ? 'ย่อรายการ (Collapse)' : `ดูอีก ${gItems.length - 1} รายการ (+)`}
                                                        </button>
                                                    )}

                                                    {/* Expanded Items */}
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
                                                                        onClick={(e) => { e.stopPropagation(); handleUndo(subItem.id); }}
                                                                        className="text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
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

            {/* Modal */}

        </div>
    );
};
