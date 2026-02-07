import React, { useState, useEffect } from 'react';
import { GitFork, X, ArrowRight } from 'lucide-react';
import { ReturnRecord, DispositionAction } from '../../../types';
import { dispositionLabels } from '../utils';

interface Step4SplitModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: ReturnRecord | null;
    onConfirm: (splitQty: number, newDisposition: DispositionAction, isBreakdown: boolean, rate: number, newUnit: string, mainDisposition: DispositionAction) => void;
}

export const Step4SplitModal: React.FC<Step4SplitModalProps> = ({ isOpen, onClose, item, onConfirm }) => {
    const [splitQty, setSplitQty] = useState<number>(0);
    const [newDisposition, setNewDisposition] = useState<DispositionAction | 'SAME'>('SAME');
    const [isBreakdown, setIsBreakdown] = useState(false);
    const [conversionRate, setConversionRate] = useState<number>(1);
    const [newUnitName, setNewUnitName] = useState<string>('');
    const [mainDisposition, setMainDisposition] = useState<DispositionAction | null>(null);

    useEffect(() => {
        if (isOpen && item) {
            setSplitQty(0);
            setNewDisposition('SAME');
            setIsBreakdown(false);
            setConversionRate(1);
            setNewUnitName('');
            setMainDisposition(item.disposition || null);
        }
    }, [isOpen, item]);

    if (!isOpen || !item) return null;

    const totalAvailable = isBreakdown ? (item.quantity * conversionRate) : item.quantity;
    const currentUnit = isBreakdown ? (newUnitName || 'Unit') : item.unit;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const finalSplitDisposition = newDisposition === 'SAME' ? item.disposition! : newDisposition;
        const finalMainDisposition = mainDisposition || item.disposition!;

        onConfirm(splitQty, finalSplitDisposition, isBreakdown, conversionRate, newUnitName, finalMainDisposition);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white shadow-xl w-full h-full flex flex-col animate-fade-in">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <GitFork className="w-5 h-5 text-blue-600" /> แยกรายการ (Split Item)
                    </h3>
                    <button aria-label="ปิด (Close)" title="ปิด (Close)" onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
                    {/* Item Info */}
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <div className="text-sm font-bold text-slate-700 mb-1">{item.productName}</div>
                        <div className="flex justify-between text-xs text-slate-500">
                            <span>ID: {item.id}</span>
                        </div>


                        <div className="mt-2 text-2xl font-bold text-blue-700">
                            {item.quantity} <span className="text-sm font-normal text-slate-500">{item.unit}</span>
                        </div>
                        {isBreakdown && (
                            <div className="mt-1 text-xs text-amber-600 font-bold">
                                ➔ เปลี่ยนเป็น: {totalAvailable} {currentUnit}
                            </div>
                        )}

                        <div className="mt-3 pt-3 border-t border-blue-200">
                            <label className="block text-xs font-bold text-blue-800 mb-1">การตัดสินใจสำหรับรายการหลัก (Main Disposition)</label>
                            <select
                                aria-label="การตัดสินใจสำหรับรายการหลัก"
                                title="การตัดสินใจสำหรับรายการหลัก"
                                value={mainDisposition || ''}
                                onChange={e => setMainDisposition(e.target.value as DispositionAction)}
                                className="w-full p-2 border border-blue-300 rounded text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none text-blue-900"
                            >
                                {Object.entries(dispositionLabels).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Breakdown Option */}
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                aria-label="แตกหน่วยย่อย"
                                title="แตกหน่วยย่อย"
                                checked={isBreakdown}
                                onChange={e => setIsBreakdown(e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm font-bold text-slate-700">แตกหน่วยย่อย (Unit Breakdown)</span>
                        </label>

                        {isBreakdown && (
                            <div className="mt-3 grid grid-cols-2 gap-3 pl-6 animate-fade-in">
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">อัตราส่วน (ต่อ 1 หน่วยหลัก)</label>
                                    <input
                                        type="number"
                                        aria-label="อัตราส่วน"
                                        title="อัตราส่วน"
                                        min="1"
                                        value={conversionRate}
                                        onChange={e => setConversionRate(parseInt(e.target.value) || 1)}
                                        className="w-full p-2 border border-slate-300 rounded text-sm"
                                        placeholder="เช่น 12"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">หน่วยย่อยใหม่</label>
                                    <input
                                        type="text"
                                        aria-label="หน่วยย่อยใหม่"
                                        title="หน่วยย่อยใหม่"
                                        value={newUnitName}
                                        onChange={e => setNewUnitName(e.target.value)}
                                        className="w-full p-2 border border-slate-300 rounded text-sm"
                                        placeholder="เช่น ชิ้น, ห่อ"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Split Form */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">
                                จำนวนที่ต้องการแยก ({currentUnit})
                            </label>
                            <input
                                type="number"
                                aria-label="จำนวนที่ต้องการแยก"
                                title="จำนวนที่ต้องการแยก"
                                min="1"
                                max={totalAvailable - 1} // Must leave at least 1
                                value={splitQty === 0 ? '' : splitQty}
                                onChange={e => setSplitQty(parseInt(e.target.value) || 0)}
                                className="w-full p-3 border border-slate-300 rounded-lg text-lg font-bold text-center focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="0"
                                autoFocus
                            />
                            <div className="flex justify-between text-xs text-slate-400 mt-1">
                                <span>รายการหลักจะเหลือ: {totalAvailable - splitQty} {currentUnit}</span>
                                <span>รายการใหม่: {splitQty} {currentUnit}</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">การตัดสินใจสำหรับรายการที่แยก (New Disposition)</label>
                            <select
                                aria-label="การตัดสินใจสำหรับรายการที่แยก"
                                title="การตัดสินใจสำหรับรายการที่แยก"
                                value={newDisposition}
                                onChange={e => setNewDisposition(e.target.value as DispositionAction | 'SAME')}
                                className="w-full p-3 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="SAME">เหมือนรายการเดิม (Keep {dispositionLabels[item.disposition!]})</option>
                                <option disabled>──────────</option>
                                {Object.entries(dispositionLabels).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button type="button" aria-label="ยกเลิก" title="ยกเลิก" onClick={onClose} className="flex-1 py-3 px-4 rounded-lg border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors">
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            aria-label="ยืนยันการแยก"
                            title="ยืนยันการแยก"
                            disabled={splitQty <= 0 || splitQty >= totalAvailable}
                            className="flex-1 py-3 px-4 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            ยืนยันการแยก <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
