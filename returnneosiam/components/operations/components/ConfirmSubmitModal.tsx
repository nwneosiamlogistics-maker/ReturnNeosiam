import React from 'react';
import { Save } from 'lucide-react';

interface ConfirmSubmitModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    itemCount: number;
}

export const ConfirmSubmitModal: React.FC<ConfirmSubmitModalProps> = ({ isOpen, onClose, onConfirm, itemCount }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Save className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">ยืนยันการบันทึกข้อมูล</h3>
                    <p className="text-slate-500 mb-6">
                        คุณต้องการยืนยันการบันทึกคำขอคืนสินค้าจำนวน <span className="font-bold text-slate-800">{itemCount}</span> รายการ ใช่หรือไม่?
                        <br />
                        <span className="text-xs text-slate-400">รายการที่บันทึกแล้วจะไม่สามารถแก้ไขได้ในขั้นตอนนี้</span>
                    </p>

                    <div className="flex gap-3 justify-center">
                        <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors w-full">
                            ยกเลิก
                        </button>
                        <button onClick={onConfirm} className="px-5 py-2.5 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 shadow-lg shadow-green-200 transition-all w-full">
                            ยืนยัน
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
