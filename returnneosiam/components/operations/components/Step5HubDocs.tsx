import React from 'react';
import { Truck, FileText, Search, X } from 'lucide-react';
import { useData } from '../../../DataContext';
import { ReturnRecord, DispositionAction } from '../../../types';
import Swal from 'sweetalert2';

// This component now delegates the document logic to the parent via props or context if available.
// However, since useOperationsLogic is the main controller, we should emit an event or used a shared context.
// For this Refactor, since Step5 is a child of Operations.tsx which USES useOperationsLogic, 
// we need to pass the handler down or expose it.
// Assuming Operations passes 'onPrintDocs' prop or similar.
// BUT, based on the file structure, Step5HubDocs is used in Operations.tsx.
// Let's check Operations.tsx to see if we can pass the handleDocModal.

// Wait, the user wants "Preview PDF & Save" status.
// Currently handlePrintClick does a simple window.confirm and update.
// We need to open the DocumentPreviewModal.

interface Step5HubDocsProps {
    onPrintDocs: (status: DispositionAction, list: ReturnRecord[]) => void;
}

export const Step5HubDocs: React.FC<Step5HubDocsProps> = ({ onPrintDocs }) => {
    const { items } = useData();
    const [selectedItem, setSelectedItem] = React.useState<ReturnRecord | null>(null);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [selectedDisposition, setSelectedDisposition] = React.useState<DispositionAction | 'All'>('All');

    // Filter Items: Status 'NCR_QCCompleted' or 'QCCompleted'
    const processedItems = React.useMemo(() => {
        return items.filter(item => item.status === 'NCR_QCCompleted' || item.status === 'QCCompleted');
    }, [items]);

    // Safe items with search filter
    const safeItems = React.useMemo(() => {
        return processedItems.map(i => ({
            ...i,
            disposition: i.disposition || 'InternalUse' as DispositionAction
        })).filter(i => {
            const q = searchQuery.toLowerCase().trim();
            if (!q) return true;
            return (
                (i.refNo?.toLowerCase().includes(q)) ||
                (i.ncrNumber?.toLowerCase().includes(q)) ||
                (i.documentNo?.toLowerCase().includes(q)) ||
                (i.collectionOrderId?.toLowerCase().includes(q)) ||
                (i.productName?.toLowerCase().includes(q)) ||
                (i.productCode?.toLowerCase().includes(q))
            );
        });
    }, [processedItems, searchQuery]);

    // Filter by disposition
    const filteredItems = React.useMemo(() => {
        if (selectedDisposition === 'All') return safeItems;
        return safeItems.filter(i => i.disposition === selectedDisposition);
    }, [safeItems, selectedDisposition]);

    const handleSplitClick = () => {
        Swal.fire({
            icon: 'info',
            title: 'ฟีเจอร์ยังไม่เปิดใช้งาน',
            text: 'การแยกรายการ (Split) ในขั้นตอนนี้กำลังพัฒนา',
            confirmButtonText: 'รับทราบ'
        });
    };

    // Helper: Get disposition badge color
    const getDispositionColor = (disposition: DispositionAction) => {
        switch (disposition) {
            case 'RTV': return 'bg-amber-500';
            case 'Restock': return 'bg-green-500';
            case 'Claim': return 'bg-blue-500';
            case 'InternalUse': return 'bg-purple-500';
            case 'Recycle': return 'bg-red-500';
            default: return 'bg-slate-500';
        }
    };

    // Helper: Get disposition label
    const getDispositionLabel = (disposition: DispositionAction) => {
        switch (disposition) {
            case 'RTV': return 'ส่งคืน (RTV)';
            case 'Restock': return 'ขาย (Restock)';
            case 'Claim': return 'เคลม (Claim)';
            case 'InternalUse': return 'ใช้ภายใน';
            case 'Recycle': return 'ทำลาย/รีไซเคิล';
            default: return disposition;
        }
    };

    // Helper: Identify NCR items
    const isNCR = (i: ReturnRecord) => i.ncrNumber || i.id.startsWith('NCR');

    // Helper: Identify Collection items
    const isCollection = (i: ReturnRecord) => (
        !isNCR(i) && (
            i.refNo?.startsWith('R-') || i.refNo?.startsWith('COL-') || i.refNo?.startsWith('RT-') ||
            i.neoRefNo?.startsWith('R-') || i.neoRefNo?.startsWith('COL-')
        )
    );

    // Disposition counts
    const dispositionCounts = React.useMemo(() => {
        const counts: Record<string, number> = { All: safeItems.length };
        ['RTV', 'Restock', 'Claim', 'InternalUse', 'Recycle'].forEach(d => {
            counts[d] = safeItems.filter(i => i.disposition === d).length;
        });
        return counts;
    }, [safeItems]);

    return (
        <div className="h-full flex flex-col md:flex-row">
            {/* Left Sidebar - Item List */}
            <div className="w-full md:w-80 max-h-[50vh] md:max-h-full border-b md:border-b-0 md:border-r border-slate-700 bg-slate-800 flex flex-col">
                <div className="p-4 border-b border-slate-700 font-bold text-slate-200 flex justify-between items-center">
                    <span className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-400" />
                        รายการเอกสาร ({safeItems.length})
                    </span>
                </div>

                {/* Search */}
                <div className="p-3 border-b border-slate-700 bg-slate-700/50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="ค้นหาเลขบิล / NCR / สินค้า..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                                title="ล้างการค้นหา"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Disposition Filter */}
                <div className="p-2 border-b border-slate-700 flex gap-1 overflow-x-auto bg-slate-800">
                    {(['All', 'RTV', 'Restock', 'Claim', 'InternalUse', 'Recycle'] as const).map(disp => (
                        <button
                            key={disp}
                            onClick={() => setSelectedDisposition(disp)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                                selectedDisposition === disp
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600'
                            }`}
                        >
                            {disp === 'All' ? 'ทั้งหมด' : getDispositionLabel(disp as DispositionAction)}
                            <span className="ml-1 opacity-70">({dispositionCounts[disp] || 0})</span>
                        </button>
                    ))}
                </div>

                {/* Items List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-900">
                    {filteredItems.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 text-sm">
                            <div className="flex flex-col items-center">
                                <FileText className="w-10 h-10 mb-2 opacity-30" />
                                <span>{searchQuery ? 'ไม่พบรายการ' : 'ไม่มีรายการเอกสาร'}</span>
                            </div>
                        </div>
                    ) : (
                        filteredItems.map(item => {
                            const isSelected = selectedItem?.id === item.id;
                            const itemIsNCR = isNCR(item);
                            const itemIsCollection = isCollection(item);
                            
                            return (
                                <div
                                    key={item.id}
                                    onClick={() => setSelectedItem(item)}
                                    className={`bg-slate-800 rounded-lg border transition-all overflow-hidden cursor-pointer shadow-sm ${
                                        isSelected
                                            ? 'border-indigo-500 ring-2 ring-indigo-900/50'
                                            : 'border-slate-700 hover:border-indigo-500/50'
                                    }`}
                                >
                                    <div className={`p-3 ${isSelected ? 'bg-indigo-900/20' : ''}`}>
                                        <div className="flex items-start gap-2 mb-2">
                                            <span className={`w-2 h-2 rounded-full mt-1.5 ${getDispositionColor(item.disposition || 'InternalUse')}`} />
                                            {itemIsNCR ? (
                                                <span className="text-[10px] font-bold bg-blue-900/50 text-blue-300 px-1.5 py-0.5 rounded border border-blue-700/50">NCR</span>
                                            ) : itemIsCollection ? (
                                                <span className="text-[10px] font-bold bg-teal-900/50 text-teal-300 px-1.5 py-0.5 rounded border border-teal-700/50">COL</span>
                                            ) : (
                                                <span className="text-[10px] font-bold bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded border border-slate-600">RTV</span>
                                            )}
                                            <span className="text-[10px] text-slate-400 font-mono">{item.ncrNumber || item.refNo || item.id}</span>
                                        </div>
                                        
                                        <div className="text-sm font-medium text-slate-200 truncate mb-1 pl-4">
                                            {item.productName}
                                        </div>
                                        
                                        <div className="flex justify-between items-center text-xs text-slate-400 pl-4">
                                            <span>{item.quantity} {item.unit}</span>
                                            <span className="font-medium text-slate-300">{item.branch}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Right Panel - Document Detail & Actions */}
            <div className="flex-1 overflow-y-auto bg-slate-900 p-4 md:p-8">
                {selectedItem ? (
                    <div className="max-w-3xl mx-auto space-y-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-indigo-600 rounded-xl shadow-lg">
                                <FileText className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-100">จัดการเอกสาร</h2>
                                <p className="text-sm text-slate-400">Document Management</p>
                            </div>
                        </div>

                        {/* Item Detail Card */}
                        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm space-y-4">
                            {/* Header Info */}
                            <div className="flex items-center gap-3 pb-4 border-b border-slate-700">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${getDispositionColor(selectedItem.disposition || 'InternalUse')}`}>
                                    {getDispositionLabel(selectedItem.disposition || 'InternalUse')}
                                </span>
                                {isNCR(selectedItem) && (
                                    <span className="text-xs font-bold bg-blue-900/50 text-blue-300 px-2 py-1 rounded border border-blue-700/50">NCR</span>
                                )}
                                {isCollection(selectedItem) && (
                                    <span className="text-xs font-bold bg-teal-900/50 text-teal-300 px-2 py-1 rounded border border-teal-700/50">Collection</span>
                                )}
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <span className="text-slate-400 text-xs block mb-1">เลขที่อ้างอิง</span>
                                    <span className="font-mono font-bold text-slate-200">{selectedItem.refNo || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 text-xs block mb-1">NCR Number</span>
                                    <span className="font-mono font-bold text-blue-400">{selectedItem.ncrNumber || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 text-xs block mb-1">สาขา</span>
                                    <span className="font-bold text-slate-200">{selectedItem.branch}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 text-xs block mb-1">วันที่</span>
                                    <span className="font-bold text-slate-200">{selectedItem.date}</span>
                                </div>
                            </div>

                            {/* Product Info */}
                            <div className="space-y-3 pt-4 border-t border-slate-700">
                                <h3 className="font-bold text-slate-100 text-lg">{selectedItem.productName}</h3>
                                <div className="flex flex-wrap gap-2">
                                    <span className="bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded font-mono border border-slate-600">{selectedItem.productCode}</span>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-4 pt-2">
                                    <div className="bg-slate-700/50 p-3 rounded-lg text-center border border-slate-700">
                                        <span className="text-slate-400 text-xs block mb-1">จำนวน</span>
                                        <span className="font-bold text-lg text-indigo-400">{selectedItem.quantity}</span>
                                        <span className="text-xs text-slate-400 ml-1">{selectedItem.unit}</span>
                                    </div>
                                    <div className="bg-slate-700/50 p-3 rounded-lg text-center border border-slate-700">
                                        <span className="text-slate-400 text-xs block mb-1">ราคาหน้าบิล</span>
                                        <span className="font-bold text-slate-200">{selectedItem.priceBill?.toLocaleString() || '-'}</span>
                                    </div>
                                    <div className="bg-slate-700/50 p-3 rounded-lg text-center border border-slate-700">
                                        <span className="text-slate-400 text-xs block mb-1">ราคาขาย</span>
                                        <span className="font-bold text-slate-200">{selectedItem.priceSell?.toLocaleString() || '-'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-3 pt-4">
                            <button
                                onClick={() => onPrintDocs(selectedItem.disposition || 'InternalUse', [selectedItem])}
                                className="flex-1 min-w-[200px] px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all"
                            >
                                <FileText className="w-5 h-5" /> พิมพ์เอกสาร
                            </button>
                            <button
                                onClick={handleSplitClick}
                                className="px-6 py-3 bg-slate-700 border border-slate-600 hover:bg-slate-600 text-slate-200 rounded-xl font-bold shadow-sm flex items-center gap-2 transition-all"
                            >
                                <Truck className="w-5 h-5" /> แยกรายการ
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <FileText className="w-16 h-16 mb-4 opacity-30" />
                        <p className="text-lg text-slate-300">เลือกรายการจากรายการด้านซ้าย</p>
                        <p className="text-sm text-slate-500 mt-2">เพื่อดูรายละเอียดและจัดการเอกสาร</p>
                    </div>
                )}
            </div>
        </div>
    );
};

