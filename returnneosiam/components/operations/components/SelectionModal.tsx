
import React from 'react';
import { Printer, X, FileText } from 'lucide-react';
import { ReturnRecord, DispositionAction } from '../../../types';
import { DispositionBadge } from './DispositionBadge';

interface SelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectionItems: ReturnRecord[];
    selectionStatus: DispositionAction | null;
    selectedItemIds: Set<string>;
    toggleSelection: (id: string) => void;
    handleGenerateDoc: () => void;
    onSplit: (item: ReturnRecord) => void;
}

export const SelectionModal: React.FC<SelectionModalProps> = ({
    isOpen, onClose, selectionItems, selectionStatus, selectedItemIds, toggleSelection, handleGenerateDoc, onSplit
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
            <div className="bg-white shadow-xl w-full h-full flex flex-col">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <Printer className="w-5 h-5 text-blue-600" /> เลือกรายการสินค้าเพื่อออกเอกสาร
                    </h3>
                    <button onClick={onClose} aria-label="Close" title="ปิด" className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
                </div>
                <div className="p-4 overflow-y-auto flex-1">
                    <div className="mb-4 flex justify-between items-center bg-blue-50 p-3 rounded-lg border border-blue-100">
                        {/* <span className="text-sm font-bold text-blue-700">{getDispositionBadge(selectionStatus || undefined)}</span> */}
                        <DispositionBadge disposition={selectionStatus || undefined} />
                        <span className="text-xs text-blue-600">เลือก {selectedItemIds.size} รายการ</span>
                    </div>
                    <div className="space-y-2">
                        {selectionItems.map(item => (
                            <div key={item.id} className={`flex items-start gap-3 p-3 rounded-lg border hover:bg-slate-50 transition-all ${selectedItemIds.has(item.id) ? 'border-blue-500 bg-blue-50/30' : 'border-slate-200'}`}>
                                <div className="pt-1">
                                    <input type="checkbox" aria-label={`เลือก ${item.productName}`} title={`เลือก ${item.productName}`} checked={selectedItemIds.has(item.id)} onChange={() => toggleSelection(item.id)} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer" />
                                </div>
                                <div className="flex-1 cursor-pointer" onClick={() => toggleSelection(item.id)}>
                                    <div className="flex justify-between">
                                        <span className="font-bold text-slate-800 text-sm">{item.productName}</span>
                                        <span className="text-xs font-mono text-slate-400">{item.id}</span>
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1 flex gap-2">
                                        <span>{item.branch}</span>
                                        <span>•</span>
                                        <span>{item.customerName}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-bold text-sm text-slate-700">{item.quantity} {item.unit}</span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSplit(item);
                                        }}
                                        className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                                        title="แยกรายการ (Split Item)"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-git-fork"><circle cx="12" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><circle cx="18" cy="6" r="3" /><path d="M6 9v1a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9" /><path d="M12 12v3" /></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                    <button onClick={onClose} className="px-4 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg font-bold text-sm">ยกเลิก</button>
                    <button onClick={handleGenerateDoc} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 shadow-sm flex items-center gap-2">
                        <FileText className="w-4 h-4" /> สร้างเอกสาร (Generate)
                    </button>
                </div>
            </div>
        </div>
    );
};
