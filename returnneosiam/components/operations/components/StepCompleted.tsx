import React, { useMemo, useState } from 'react';
import { CheckCircle, Search, Calendar, MapPin, FileCheck, XCircle, X } from 'lucide-react';
import { useData } from '../../../DataContext';
import { ReturnRecord } from '../../../types';
import { DispositionBadge } from './DispositionBadge';

export const StepCompleted: React.FC = () => {
    const { items, ncrReports } = useData();
    const [selectedItem, setSelectedItem] = useState<ReturnRecord | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Filter Completed Items (Completed or DirectReturn)
    const completedItems = useMemo(() => {
        return items.filter(item => {
            // Check for verification (If NCR Report is Canceled, hide it) -> Only for NCR
            if (item.ncrNumber) {
                const linkedReport = ncrReports.find(r => r.ncrNo === item.ncrNumber);
                if (linkedReport && linkedReport.status === 'Canceled') {
                    return false;
                }
            }

            return (item.status === 'Completed' || item.status === 'DirectReturn') &&
                (item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.productCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.refNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.documentNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.collectionOrderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.ncrNumber?.toLowerCase().includes(searchTerm.toLowerCase()));
        }).sort((a, b) => {
            // Sort by dateCompleted descending, then fallback to date
            const dateA = a.dateCompleted || a.dateInTransit || a.date;
            const dateB = b.dateCompleted || b.dateInTransit || b.date;
            return new Date(dateB).getTime() - new Date(dateA).getTime();
        });
    }, [items, searchTerm, ncrReports]);

    const stats = useMemo(() => {
        return {
            total: completedItems.length,
            direct: completedItems.filter(i => i.status === 'DirectReturn').length,
            processed: completedItems.filter(i => i.status === 'Completed').length
        };
    }, [completedItems]);

    return (
        <div className="h-full flex">
            {/* Left Sidebar - Item List */}
            <div className="w-80 border-r border-slate-700 bg-slate-800 flex flex-col">
                <div className="p-4 border-b border-slate-700">
                    <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        รายการจบงาน
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">Completed Items</p>
                </div>

                {/* Stats Summary */}
                <div className="p-3 border-b border-slate-700 bg-slate-800 grid grid-cols-3 gap-2">
                    <div className="bg-slate-700 p-2 rounded-lg border border-slate-600 text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">ทั้งหมด</p>
                        <p className="text-lg font-bold text-slate-200">{stats.total}</p>
                    </div>
                    <div className="bg-slate-700 p-2 rounded-lg border border-green-600/50 text-center">
                        <p className="text-[10px] font-bold text-green-400 uppercase">ผ่าน Hub</p>
                        <p className="text-lg font-bold text-green-400">{stats.processed}</p>
                    </div>
                    <div className="bg-slate-700 p-2 rounded-lg border border-orange-600/50 text-center">
                        <p className="text-[10px] font-bold text-orange-400 uppercase">ส่งตรง</p>
                        <p className="text-lg font-bold text-orange-400">{stats.direct}</p>
                    </div>
                </div>

                {/* Search */}
                <div className="p-3 border-b border-slate-700 bg-slate-700/50">
                    <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="เลขบิล / NCR / R / COL / สินค้า..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-9 pr-8 py-2 w-full bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-green-500 outline-none transition-all"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                                title="ล้างการค้นหา"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Items List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-900">
                    {completedItems.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 text-sm">
                            <div className="flex flex-col items-center">
                                <XCircle className="w-10 h-10 mb-2 opacity-30" />
                                <span>{searchTerm ? 'ไม่พบรายการ' : 'ไม่มีรายการจบงาน'}</span>
                            </div>
                        </div>
                    ) : (
                        completedItems.map(item => {
                            const isSelected = selectedItem?.id === item.id;
                            const isDirect = item.status === 'DirectReturn';
                            
                            return (
                                <div
                                    key={item.id}
                                    onClick={() => setSelectedItem(item)}
                                    className={`bg-slate-800 rounded-lg border transition-all overflow-hidden cursor-pointer shadow-sm ${
                                        isSelected
                                            ? 'border-green-500 ring-2 ring-green-900/50'
                                            : 'border-slate-700 hover:border-green-500/50'
                                    }`}
                                >
                                    <div className={`p-3 ${isSelected ? 'bg-green-900/20' : ''}`}>
                                        <div className="flex items-start gap-2 mb-2">
                                            {isDirect ? (
                                                <span className="inline-flex items-center gap-1 bg-orange-900/50 text-orange-300 text-[10px] font-bold px-2 py-0.5 rounded border border-orange-700/50">
                                                    <MapPin className="w-3 h-3" /> Direct
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 bg-green-900/50 text-green-300 text-[10px] font-bold px-2 py-0.5 rounded border border-green-700/50">
                                                    <CheckCircle className="w-3 h-3" /> Completed
                                                </span>
                                            )}
                                        </div>
                                        
                                        <div className="text-sm font-medium text-slate-100 truncate mb-1">
                                            {item.productName}
                                        </div>
                                        
                                        <div className="flex justify-between items-center text-xs text-slate-400">
                                            <span>{item.quantity} {item.unit}</span>
                                            <span className="text-slate-300">{item.branch}</span>
                                        </div>
                                        
                                        <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-500">
                                            <Calendar className="w-3 h-3" />
                                            {item.dateCompleted ? new Date(item.dateCompleted).toLocaleDateString() : (item.dateInTransit ? new Date(item.dateInTransit).toLocaleDateString() : '-')}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer Stats */}
                <div className="p-3 border-t border-slate-700 bg-slate-800">
                    <div className="text-xs text-slate-400 text-center">
                        รายการทั้งหมด: <span className="font-bold text-slate-200">{completedItems.length}</span> รายการ
                    </div>
                </div>
            </div>

            {/* Right Panel - Detail View */}
            <div className="flex-1 overflow-y-auto bg-slate-900 p-8">
                {selectedItem ? (
                    <div className="max-w-3xl mx-auto space-y-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-green-600 rounded-xl shadow-lg">
                                <FileCheck className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-100">รายละเอียดรายการจบงาน</h2>
                                <p className="text-sm text-slate-400">Completed Item Details</p>
                            </div>
                            {selectedItem.status === 'DirectReturn' ? (
                                <span className="ml-auto inline-flex items-center gap-1 bg-orange-900/50 text-orange-300 px-3 py-1 rounded-full text-sm font-bold border border-orange-700/50">
                                    <MapPin className="w-4 h-4" /> Direct Return
                                </span>
                            ) : (
                                <span className="ml-auto inline-flex items-center gap-1 bg-green-900/50 text-green-300 px-3 py-1 rounded-full text-sm font-bold border border-green-700/50">
                                    <CheckCircle className="w-4 h-4" /> Completed
                                </span>
                            )}
                        </div>

                        {/* Item Detail Card */}
                        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm space-y-4">
                            {/* IDs Section */}
                            <div className="flex flex-wrap gap-2 pb-4 border-b border-slate-700">
                                {selectedItem.documentNo && (
                                    <span className="text-xs font-bold bg-emerald-900/50 text-emerald-300 px-2 py-1 rounded border border-emerald-700/50">R No. {selectedItem.documentNo}</span>
                                )}
                                {selectedItem.refNo && selectedItem.refNo !== '-' && (
                                    <span className="text-xs font-bold bg-blue-900/50 text-blue-300 px-2 py-1 rounded border border-blue-700/50">Ref {selectedItem.refNo}</span>
                                )}
                                {selectedItem.ncrNumber && (
                                    <span className="text-xs font-bold bg-red-900/50 text-red-300 px-2 py-1 rounded border border-red-700/50">NCR {selectedItem.ncrNumber}</span>
                                )}
                                {selectedItem.collectionOrderId && (
                                    <span className="text-xs font-bold bg-purple-900/50 text-purple-300 px-2 py-1 rounded border border-purple-700/50">COL {selectedItem.collectionOrderId}</span>
                                )}
                            </div>

                            {/* Product Info */}
                            <div className="space-y-3">
                                <h3 className="font-bold text-slate-100 text-lg">{selectedItem.productName}</h3>
                                <div className="text-sm text-slate-400">{selectedItem.productCode}</div>
                                
                                <div className="grid grid-cols-4 gap-4 pt-4">
                                    <div className="bg-slate-700/50 p-3 rounded-lg text-center border border-slate-700">
                                        <span className="text-slate-400 text-xs block mb-1">จำนวน</span>
                                        <span className="font-bold text-lg text-green-400">{selectedItem.quantity}</span>
                                        <span className="text-xs text-slate-400 ml-1">{selectedItem.unit}</span>
                                    </div>
                                    <div className="bg-slate-700/50 p-3 rounded-lg text-center border border-slate-700">
                                        <span className="text-slate-400 text-xs block mb-1">สาขา</span>
                                        <span className="font-bold text-slate-200">{selectedItem.branch}</span>
                                    </div>
                                    <div className="bg-slate-700/50 p-3 rounded-lg text-center border border-slate-700">
                                        <span className="text-slate-400 text-xs block mb-1">วันที่จบงาน</span>
                                        <span className="font-bold text-slate-200">
                                            {selectedItem.dateCompleted ? new Date(selectedItem.dateCompleted).toLocaleDateString() : (selectedItem.dateInTransit ? new Date(selectedItem.dateInTransit).toLocaleDateString() : '-')}
                                        </span>
                                    </div>
                                    <div className="bg-slate-700/50 p-3 rounded-lg text-center border border-slate-700">
                                        <span className="text-slate-400 text-xs block mb-1">การตัดสินใจ</span>
                                        {selectedItem.status === 'Completed' ? (
                                            <DispositionBadge disposition={selectedItem.disposition} />
                                        ) : (
                                            <span className="text-xs text-slate-500">-</span>
                                        )}
                                    </div>
                                </div>

                                {selectedItem.customerName && (
                                    <div className="pt-4 border-t border-slate-700">
                                        <span className="text-slate-400 text-xs block mb-1">ลูกค้า</span>
                                        <span className="font-medium text-slate-200">{selectedItem.customerName}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <FileCheck className="w-16 h-16 mb-4 opacity-30" />
                        <p className="text-lg text-slate-300">เลือกรายการจากรายการด้านซ้าย</p>
                        <p className="text-sm text-slate-500 mt-2">เพื่อดูรายละเอียดรายการที่จบงานแล้ว</p>
                    </div>
                )}
            </div>
        </div>
    );
};
