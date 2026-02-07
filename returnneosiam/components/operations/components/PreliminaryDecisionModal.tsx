import React, { useState } from 'react';
import { Truck } from 'lucide-react';
import { RETURN_ROUTES } from '../../../constants';

interface PreliminaryDecisionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (decision: string, route?: string, settlementData?: { isFieldSettled?: boolean; amount?: number; evidence?: string; name?: string; position?: string; }) => void;
}

export const PreliminaryDecisionModal: React.FC<PreliminaryDecisionModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const [selectedRoute, setSelectedRoute] = useState<string>('');
    const [otherRoute, setOtherRoute] = useState<string>('');
    const [validationError, setValidationError] = useState<string>('');
    const [isFieldSettled, setIsFieldSettled] = useState(false);
    const [fieldAmount, setFieldAmount] = useState<number>(0);
    const [fieldEvidence, setFieldEvidence] = useState('');
    const [fieldName, setFieldName] = useState('');
    const [fieldPosition, setFieldPosition] = useState('');

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (!isFieldSettled && !selectedRoute) {
            setValidationError('กรุณาระบุเส้นทางส่งคืน');
            return;
        }
        if (!isFieldSettled && selectedRoute === 'Other' && !otherRoute) {
            setValidationError('กรุณาระบุเส้นทางอื่นๆ');
            return;
        }

        const finalRoute = selectedRoute === 'Other' ? otherRoute : selectedRoute;

        // Pass everything back
        // Pass everything back
        onConfirm('Return', finalRoute, {
            isFieldSettled,
            amount: fieldAmount,
            evidence: fieldEvidence,
            name: fieldName,
            position: fieldPosition
        });

        // Reset state
        setSelectedRoute('');
        setOtherRoute('');
        setValidationError('');
        setIsFieldSettled(false);
        setFieldAmount(0);
        setFieldEvidence('');
        setFieldName('');
        setFieldPosition('');
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white shadow-xl w-full max-w-2xl rounded-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-blue-50 flex-shrink-0">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Truck className="w-6 h-6 text-indigo-600" /> ระบุเส้นทางส่งคืน (Return Route)
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">กรุณาเลือกเส้นทางสำหรับการส่งคืนสินค้า</p>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    {validationError && (
                        <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm font-bold border border-red-100 mb-2">
                            {validationError}
                        </div>
                    )}

                    {/* FIELD SETTLEMENT OPTION */}
                    <div className={`p-4 rounded-xl border-2 transition-all ${isFieldSettled ? 'bg-amber-50 border-amber-500 shadow-md' : 'bg-slate-50 border-slate-200'}`}>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isFieldSettled}
                                onChange={(e) => setIsFieldSettled(e.target.checked)}
                                className="w-5 h-5 accent-amber-600"
                            />
                            <span className={`text-lg font-bold ${isFieldSettled ? 'text-amber-800' : 'text-slate-600'}`}>
                                💰 จบงานหน้างาน / ชดเชยเงิน (Field Settlement)
                            </span>
                        </label>
                        <p className="text-xs text-slate-500 ml-8 mt-1">ติ๊กช่องนี้หากสินค้าถูกชดเชยเงินเรียบร้อยแล้ว และไม่ต้องส่งคืน Hub</p>

                        {isFieldSettled && (
                            <div className="mt-4 ml-8 grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-amber-900 leading-none">จำนวนเงินที่ชดเชย (บ.)</label>
                                    <input
                                        type="number"
                                        value={fieldAmount || ''}
                                        onChange={(e) => setFieldAmount(Number(e.target.value))}
                                        className="w-full p-3 border border-amber-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-amber-500 bg-white text-black"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-amber-900 leading-none">หลักฐานการรับเงิน (Ref.)</label>
                                    <input
                                        type="text"
                                        value={fieldEvidence}
                                        onChange={(e) => setFieldEvidence(e.target.value)}
                                        className="w-full p-3 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 bg-white text-black"
                                        placeholder="เช่น ลายเซ็น / รูปถ่าย"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-amber-900 leading-none">ชื่อ-นามสกุล ผู้รับผิดชอบ</label>
                                    <input
                                        type="text"
                                        value={fieldName}
                                        onChange={(e) => setFieldName(e.target.value)}
                                        className="w-full p-3 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 bg-white text-black"
                                        placeholder="ชื่อ-นามสกุล"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-amber-900 leading-none">ตำแหน่ง</label>
                                    <input
                                        type="text"
                                        value={fieldPosition}
                                        onChange={(e) => setFieldPosition(e.target.value)}
                                        className="w-full p-3 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 bg-white text-black"
                                        placeholder="เช่น พนักงานขับรถ / พนักงานขาย"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {!isFieldSettled && (
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <label className="block text-sm font-bold text-slate-700 mb-3">เลือกเส้นทางส่งคืน (Select Route) <span className="text-red-500">*</span></label>
                            <div className="space-y-2">
                                {RETURN_ROUTES.map(route => (
                                    <label key={route} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 hover:border-indigo-300 cursor-pointer transition-all hover:shadow-sm">
                                        <input
                                            type="radio"
                                            name="route"
                                            value={route}
                                            checked={selectedRoute === route}
                                            onChange={(e) => { setSelectedRoute(e.target.value); setValidationError(''); }}
                                            className="w-4 h-4 text-indigo-600"
                                        />
                                        <span className="font-medium text-black">{route}</span>
                                    </label>
                                ))}
                                <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 hover:border-indigo-300 cursor-pointer transition-all hover:shadow-sm">
                                    <input
                                        type="radio"
                                        name="route"
                                        value="Other"
                                        checked={selectedRoute === 'Other'}
                                        onChange={(e) => { setSelectedRoute(e.target.value); setValidationError(''); }}
                                        className="w-4 h-4 text-indigo-600"
                                    />
                                    <span className="font-medium text-black">อื่นๆ (Other)</span>
                                </label>
                                {selectedRoute === 'Other' && (
                                    <input
                                        type="text"
                                        value={otherRoute}
                                        onChange={(e) => setOtherRoute(e.target.value)}
                                        className="w-full p-3 mt-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-black"
                                        placeholder="ระบุเส้นทาง..."
                                        autoFocus
                                    />
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center gap-3 flex-shrink-0">
                    <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-bold hover:bg-slate-100 transition-colors">ยกเลิก (Cancel)</button>
                    <button onClick={handleConfirm} className={`px-8 py-2.5 rounded-xl text-white font-bold shadow-lg transition-all flex items-center gap-2 ${isFieldSettled ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'}`}>
                        ยืนยัน (Confirm)
                    </button>
                </div>
            </div>
        </div>
    );
};
