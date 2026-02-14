import React, { useState, useMemo } from 'react';
import { Truck, Inbox, MapPin, CheckCircle, Undo as IconUndo, Search, X } from 'lucide-react';
import { useData } from '../../../DataContext';
import { ReturnRecord } from '../../../types';
import Swal from 'sweetalert2';

export const Step3HubReceive: React.FC = () => {
    const { items, updateReturnRecord } = useData();
    const [selectedItem, setSelectedItem] = useState<ReturnRecord | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterBranch, setFilterBranch] = useState<string>('');

    // Filter Items: Status 'NCR_InTransit' or 'PickupScheduled'
    const requestedItems = useMemo(() => {
        return items.filter(item => item.status === 'NCR_InTransit' || item.status === 'PickupScheduled');
    }, [items]);

    // Unique branches for filter
    const branches = useMemo(() => {
        const unique = new Set(requestedItems.map(item => item.branch).filter(Boolean));
        return Array.from(unique).sort();
    }, [requestedItems]);

    // Filtered items with search
    const filteredItems = useMemo(() => {
        return requestedItems.filter(item => {
            const matchBranch = !filterBranch || item.branch === filterBranch;
            const matchSearch = !searchQuery.trim() || 
                (item.productName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (item.productCode?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (item.ncrNumber?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (item.customerName?.toLowerCase().includes(searchQuery.toLowerCase()));
            return matchBranch && matchSearch;
        });
    }, [requestedItems, filterBranch, searchQuery]);

    // Sort by date
    const sortedItems = useMemo(() => {
        return [...filteredItems].sort((a, b) => {
            const idA = a.ncrNumber || a.id || '';
            const idB = b.ncrNumber || b.id || '';
            return idB.localeCompare(idA);
        });
    }, [filteredItems]);

    const handleIntakeReceive = async (item: ReturnRecord) => {
        const result = await Swal.fire({
            title: 'ยืนยันการรับของ',
            text: `ยืนยันรับเข้า "${item.productName}" เข้าสู่ Hub?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'ยืนยัน',
            cancelButtonText: 'ยกเลิก'
        });

        if (result.isConfirmed) {
            await updateReturnRecord(item.id, {
                status: 'NCR_HubReceived'
            });

            // Clear selection if this was the selected item
            if (selectedItem?.id === item.id) {
                setSelectedItem(null);
            }

            await Swal.fire({
                icon: 'success',
                title: 'รับของเรียบร้อย',
                timer: 1500,
                showConfirmButton: false
            });
        }
    };

    const handleUndo = async (item: ReturnRecord) => {
        const { value: password } = await Swal.fire({
            title: 'ยืนยันการส่งกลับ (Undo)',
            text: 'กรุณาใส่รหัสผ่านเพื่อส่งรายการกลับไป Step 2',
            input: 'password',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ตกลง',
            cancelButtonText: 'ยกเลิก',
            inputPlaceholder: 'รหัสผ่าน'
        });

        if (password === '1234') {
            await updateReturnRecord(item.id, {
                status: 'COL_JobAccepted'
            });

            // Clear selection if this was the selected item
            if (selectedItem?.id === item.id) {
                setSelectedItem(null);
            }

            await Swal.fire({
                icon: 'success',
                title: 'ส่งกลับ Step 2 เรียบร้อย',
                timer: 1500,
                showConfirmButton: false
            });
        } else if (password) {
            Swal.fire('รหัสผ่านไม่ถูกต้อง', '', 'error');
        }
    };

    // Get decision badge color
    const getDecisionColor = (decision: string) => {
        switch (decision) {
            case 'Return': return 'bg-blue-600 border-blue-700';
            case 'Sell': return 'bg-green-600 border-green-700';
            case 'Scrap': return 'bg-red-600 border-red-700';
            case 'Internal': return 'bg-amber-500 border-amber-600';
            case 'Claim': return 'bg-orange-500 border-orange-600';
            default: return 'bg-slate-500 border-slate-600';
        }
    };

    const getDecisionLabel = (decision: string) => {
        switch (decision) {
            case 'Return': return '🚚 คืนสินค้า';
            case 'Sell': return '💵 ขาย';
            case 'Scrap': return '🗑️ ทำลาย';
            case 'Internal': return '🏠 ใช้ภายใน';
            case 'Claim': return '📄 เคลม';
            default: return decision;
        }
    };

    return (
        <div className="h-full flex flex-col md:flex-row">
            {/* Left Sidebar - Item List */}
            <div className="w-full md:w-80 max-h-[50vh] md:max-h-full border-b md:border-b-0 md:border-r border-slate-700 bg-slate-800 flex flex-col">
                <div className="p-4 border-b border-slate-700 font-bold text-slate-200 flex justify-between items-center">
                    <span>รายการรอรับ ({requestedItems.length})</span>
                    <Truck className="w-4 h-4 text-amber-400" />
                </div>

                {/* Search */}
                <div className="p-2 border-b border-slate-700 bg-slate-700/50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                        <input
                            type="text"
                            placeholder="ค้นหาสินค้า..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-700 border border-slate-600 rounded text-slate-200 placeholder-slate-400 focus:ring-1 focus:ring-amber-400 outline-none"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                                title="ล้างการค้นหา"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Branch Filter */}
                <div className="p-2 border-b border-slate-700">
                    <select
                        value={filterBranch}
                        onChange={e => setFilterBranch(e.target.value)}
                        className="w-full text-xs p-2 border border-slate-600 rounded-lg bg-slate-700 text-slate-200 outline-none focus:ring-2 focus:ring-amber-500"
                        title="กรองตามสาขา"
                    >
                        <option value="">ทุกสาขา</option>
                        {branches.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                </div>

                {/* Items List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {sortedItems.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 text-xs italic">
                            <div className="flex flex-col items-center">
                                <Inbox className="w-8 h-8 mb-2 opacity-50" />
                                <span>{searchQuery || filterBranch ? 'ไม่พบรายการ' : 'ไม่มีรายการรอรับ'}</span>
                            </div>
                        </div>
                    ) : (
                        sortedItems.map(item => {
                            const isSelected = selectedItem?.id === item.id;
                            const isNCR = item.id.startsWith('NCR') || item.ncrNumber;
                            
                            return (
                                <div
                                    key={item.id}
                                    onClick={() => setSelectedItem(item)}
                                    className={`bg-slate-700 rounded-lg border transition-all overflow-hidden cursor-pointer ${
                                        isSelected
                                            ? 'border-amber-500 shadow-md ring-1 ring-amber-900/50'
                                            : 'border-slate-600 hover:border-slate-500'
                                    }`}
                                >
                                    <div className={`p-3 ${isSelected ? 'bg-amber-900/20' : ''}`}>
                                        <div className="flex items-start gap-2 mb-2">
                                            {isNCR ? (
                                                <span className="inline-flex items-center gap-1 bg-blue-900/50 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded">
                                                    NCR
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 bg-purple-900/50 text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded">
                                                    COL
                                                </span>
                                            )}
                                            <span className="text-[10px] text-slate-400 font-mono">{item.ncrNumber || item.refNo || item.id}</span>
                                        </div>
                                        
                                        <div className="text-sm font-medium text-slate-100 truncate mb-1">
                                            {item.productName}
                                        </div>
                                        
                                        <div className="flex justify-between items-center text-xs text-slate-400">
                                            <span>{item.quantity} {item.unit}</span>
                                            <span className="flex items-center gap-1">
                                                <MapPin size={10} /> {item.branch}
                                            </span>
                                        </div>

                                        {item.preliminaryDecision && (
                                            <div className={`mt-2 px-2 py-1 rounded text-[10px] font-bold text-center text-white ${getDecisionColor(item.preliminaryDecision)}`}>
                                                {getDecisionLabel(item.preliminaryDecision)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Right Panel - Detail View */}
            <div className="flex-1 overflow-y-auto bg-slate-900 p-4 md:p-8">
                {selectedItem ? (
                    <div className="max-w-3xl mx-auto space-y-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-amber-600 rounded-xl shadow-lg">
                                <Truck className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-100">รับสินค้าเข้า Hub</h2>
                                <p className="text-sm text-slate-300">ตรวจสอบและรับสินค้าเข้าศูนย์กระจาย</p>
                            </div>
                        </div>

                        {/* Item Detail Card */}
                        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm space-y-4">
                            {/* Header Info */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4 border-b border-slate-700">
                                <div>
                                    <span className="text-slate-400 text-xs block mb-1">สาขาต้นทาง</span>
                                    <span className="font-bold text-slate-200 flex items-center gap-1">
                                        <MapPin className="w-3 h-3 text-slate-500" /> {selectedItem.branch}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 text-xs block mb-1">วันที่แจ้ง</span>
                                    <span className="font-bold text-slate-200">{selectedItem.dateRequested || selectedItem.date}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 text-xs block mb-1">COL No</span>
                                    <span className="font-mono font-bold text-blue-400">{selectedItem.colNumber || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 text-xs block mb-1">เลขที่ NCR</span>
                                    <span className="font-mono font-bold text-slate-200">{selectedItem.ncrNumber || '-'}</span>
                                </div>
                            </div>

                            {/* Product Info */}
                            <div className="space-y-3">
                                <div className="flex flex-wrap gap-2">
                                    <span className="bg-blue-900/50 text-blue-300 text-xs px-2 py-1 rounded font-mono">{selectedItem.refNo}</span>
                                    {selectedItem.documentNo && (
                                        <span className="bg-emerald-900/50 text-emerald-300 text-xs px-2 py-1 rounded font-mono">{selectedItem.documentNo}</span>
                                    )}
                                    <span className="text-slate-300 font-mono text-sm">{selectedItem.productCode}</span>
                                </div>
                                
                                <h3 className="font-bold text-slate-100 text-lg">{selectedItem.productName}</h3>

                                {selectedItem.preliminaryDecision && (
                                    <div className={`px-4 py-2 rounded-lg text-white font-bold text-center ${getDecisionColor(selectedItem.preliminaryDecision)}`}>
                                        {getDecisionLabel(selectedItem.preliminaryDecision)}
                                        {selectedItem.preliminaryRoute && (
                                            <span className="ml-2 text-xs opacity-80">({selectedItem.preliminaryRoute})</span>
                                        )}
                                    </div>
                                )}

                                <div className="grid grid-cols-3 gap-4 pt-4">
                                    <div className="bg-slate-700/50 p-3 rounded-lg text-center">
                                        <span className="text-slate-400 text-xs block mb-1">จำนวน</span>
                                        <span className="font-bold text-lg text-blue-400">{selectedItem.quantity}</span>
                                        <span className="text-xs text-slate-400 ml-1">{selectedItem.unit}</span>
                                    </div>
                                    <div className="bg-slate-700/50 p-3 rounded-lg text-center">
                                        <span className="text-slate-400 text-xs block mb-1">ราคาหน้าบิล</span>
                                        <span className="font-bold text-slate-200">{selectedItem.priceBill?.toLocaleString() || '-'}</span>
                                    </div>
                                    <div className="bg-slate-700/50 p-3 rounded-lg text-center">
                                        <span className="text-slate-400 text-xs block mb-1">ราคาขาย</span>
                                        <span className="font-bold text-slate-200">{selectedItem.priceSell?.toLocaleString() || '-'}</span>
                                    </div>
                                </div>

                                {selectedItem.expiryDate && (
                                    <div className="text-red-400 text-sm font-bold bg-red-900/30 px-3 py-2 rounded border border-red-700/50">
                                        ⚠️ วันหมดอายุ: {selectedItem.expiryDate}
                                    </div>
                                )}

                                {selectedItem.reason && (
                                    <div className="text-slate-400 text-sm italic">
                                        เหตุผล: {selectedItem.reason}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-3 pt-4">
                            <button
                                onClick={() => handleUndo(selectedItem)}
                                className="px-6 py-3 bg-slate-700 hover:bg-red-900/30 text-slate-300 hover:text-red-400 rounded-xl font-bold shadow-sm flex items-center gap-2 transition-colors border border-slate-600 hover:border-red-700/50"
                            >
                                <IconUndo className="w-5 h-5" /> ส่งกลับ Step 2
                            </button>
                            <button
                                onClick={() => handleIntakeReceive(selectedItem)}
                                className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all"
                            >
                                <CheckCircle className="w-5 h-5" /> รับของเข้า Hub
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <Inbox className="w-16 h-16 mb-4 opacity-30" />
                        <p className="text-lg">เลือกรายการจากรายการด้านซ้ายเพื่อดำเนินการ</p>
                        <p className="text-sm text-slate-500 mt-2">หรือใช้ช่องค้นหาเพื่อค้นหารายการเฉพาะ</p>
                    </div>
                )}
            </div>
        </div>
    );
};

