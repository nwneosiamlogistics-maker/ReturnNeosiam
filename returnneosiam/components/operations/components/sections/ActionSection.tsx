// No changes needed
import React from 'react';
import { Wrench } from 'lucide-react';
import { ReturnRecord } from '../../../../types';

interface ActionSectionProps {
    formData: Partial<ReturnRecord>;
    updateField: (field: keyof ReturnRecord, value: ReturnRecord[keyof ReturnRecord]) => void;
    handleCheckboxToggle: (field: keyof ReturnRecord, resetFields?: (keyof ReturnRecord)[]) => void;
}

export const ActionSection: React.FC<ActionSectionProps> = ({
    formData,
    updateField,
    handleCheckboxToggle
}) => {

    // รายชื่อฟิลด์ Action ทั้งหมด (เพื่อเอาไว้ reset ตัวอื่นเวลาเลือกตัวหนึ่ง)
    const ALL_ACTIONS: (keyof ReturnRecord)[] = [
        'actionReject', 'actionRejectSort', 'actionRework',
        'actionSpecialAcceptance', 'actionScrap', 'actionReplace'
    ];

    const onToggle = (field: keyof ReturnRecord) => {
        // กรองเอาเฉพาะ field อื่นๆ ที่ไม่ใช่ตัวเอง เพื่อสั่ง reset
        const others = ALL_ACTIONS.filter(f => f !== field);
        handleCheckboxToggle(field, others);
    };

    return (
        <div className="border-2 border-slate-600 rounded-xl overflow-hidden mt-6">
            <div className="bg-slate-700 px-4 py-2 border-b border-slate-600 font-bold text-slate-300 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-blue-400" /> การดำเนินการ
            </div>
            <div className="p-4 bg-slate-800 space-y-3 text-sm">

                {/* กลุ่ม Reject */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-slate-700 pb-3">
                    <div className="flex items-center gap-3">
                        <input type="checkbox" aria-label="ส่งคืน (Reject)" title="ส่งคืน (Reject)" checked={formData.actionReject} onChange={() => onToggle('actionReject')} className="w-4 h-4" />
                        <span className="font-bold w-32 text-slate-200">ส่งคืน (Reject)</span>
                        <div className="flex items-center gap-2"><span className="text-xs text-slate-400">จำนวน:</span><input type="number" aria-label="จำนวนส่งคืน" title="จำนวนส่งคืน" value={formData.actionRejectQty} onChange={e => updateField('actionRejectQty', Number(e.target.value))} className="w-20 border border-slate-600 rounded px-2 py-1 bg-slate-700 text-slate-200" /></div>
                    </div>
                    <div className="flex items-center gap-3">
                        <input type="checkbox" aria-label="คัดแยกของเสีย" title="คัดแยกของเสีย" checked={formData.actionRejectSort} onChange={() => onToggle('actionRejectSort')} className="w-4 h-4" />
                        <span className="font-bold w-40 text-slate-200">คัดแยกของเสียเพื่อส่งคืน</span>
                        <div className="flex items-center gap-2"><span className="text-xs text-slate-400">จำนวน:</span><input type="number" aria-label="จำนวนคัดแยก" title="จำนวนคัดแยก" value={formData.actionRejectSortQty} onChange={e => updateField('actionRejectSortQty', Number(e.target.value))} className="w-20 border border-slate-600 rounded px-2 py-1 bg-slate-700 text-slate-200" /></div>
                    </div>
                </div>

                {/* กลุ่ม Rework */}
                <div className="grid grid-cols-1 gap-4 border-b border-slate-700 pb-3">
                    <div className="flex items-start gap-3">
                        <input type="checkbox" aria-label="แก้ไข (Rework)" title="แก้ไข (Rework)" checked={formData.actionRework} onChange={() => onToggle('actionRework')} className="w-4 h-4 mt-1" />
                        <div className="flex-1">
                            <div className="flex items-center gap-4 mb-2">
                                <span className="font-bold w-32 text-slate-200">แก้ไข (Rework)</span>
                                <div className="flex items-center gap-2"><span className="text-xs text-slate-400">จำนวน:</span><input type="number" aria-label="จำนวนแก้ไข" title="จำนวนแก้ไข" value={formData.actionReworkQty} onChange={e => updateField('actionReworkQty', Number(e.target.value))} className="w-20 border border-slate-600 rounded px-2 py-1 bg-slate-700 text-slate-200" /></div>
                            </div>
                            <div className="flex items-center gap-2"><span className="text-xs font-bold text-slate-400">วิธีการแก้ไข:</span><input type="text" aria-label="วิธีการแก้ไข" title="วิธีการแก้ไข" value={formData.actionReworkMethod} onChange={e => updateField('actionReworkMethod', e.target.value)} className="flex-1 border-b border-dotted border-slate-500 outline-none px-1 bg-slate-800 text-slate-200" /></div>
                        </div>
                    </div>
                </div>

                {/* Accept Special */}
                <div className="grid grid-cols-1 gap-4 border-b border-slate-700 pb-3">
                    <div className="flex items-start gap-3">
                        <input type="checkbox" aria-label="ยอมรับกรณีพิเศษ" title="ยอมรับกรณีพิเศษ" checked={formData.actionSpecialAcceptance} onChange={() => onToggle('actionSpecialAcceptance')} className="w-4 h-4 mt-1" />
                        <div className="flex-1">
                            <div className="flex items-center gap-4 mb-2">
                                <span className="font-bold w-32 text-slate-200">ยอมรับกรณีพิเศษ</span>
                                <div className="flex items-center gap-2"><span className="text-xs text-slate-400">จำนวน:</span><input type="number" aria-label="จำนวนยอมรับพิเศษ" title="จำนวนยอมรับพิเศษ" value={formData.actionSpecialAcceptanceQty} onChange={e => updateField('actionSpecialAcceptanceQty', Number(e.target.value))} className="w-20 border border-slate-600 rounded px-2 py-1 bg-slate-700 text-slate-200" /></div>
                            </div>
                            <div className="flex items-center gap-2"><span className="text-xs font-bold text-slate-400">เหตุผลในการยอมรับ:</span><input type="text" aria-label="เหตุผลในการยอมรับ" title="เหตุผลในการยอมรับ" value={formData.actionSpecialAcceptanceReason} onChange={e => updateField('actionSpecialAcceptanceReason', e.target.value)} className="flex-1 border-b border-dotted border-slate-500 outline-none px-1 bg-slate-800 text-slate-200" /></div>
                        </div>
                    </div>
                </div>

                {/* Scrap & ScrapReplace */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                        <input type="checkbox" aria-label="ทำลาย (Scrap)" title="ทำลาย (Scrap)" checked={formData.actionScrap} onChange={() => onToggle('actionScrap')} className="w-4 h-4" />
                        <span className="font-bold w-32 text-slate-200">ทำลาย (Scrap)</span>
                        <div className="flex items-center gap-2"><span className="text-xs text-slate-400">จำนวน:</span><input type="number" aria-label="จำนวนทำลาย" title="จำนวนทำลาย" value={formData.actionScrapQty} onChange={e => updateField('actionScrapQty', Number(e.target.value))} className="w-20 border border-slate-600 rounded px-2 py-1 bg-slate-700 text-slate-200" /></div>
                    </div>
                    <div className="flex items-center gap-3">
                        <input type="checkbox" aria-label="เปลี่ยนสินค้าใหม่" title="เปลี่ยนสินค้าใหม่" checked={formData.actionReplace} onChange={() => onToggle('actionReplace')} className="w-4 h-4" />
                        <span className="font-bold w-32 text-slate-200">เปลี่ยนสินค้าใหม่</span>
                        <div className="flex items-center gap-2"><span className="text-xs text-slate-400">จำนวน:</span><input type="number" aria-label="จำนวนเปลี่ยนใหม่" title="จำนวนเปลี่ยนใหม่" value={formData.actionReplaceQty} onChange={e => updateField('actionReplaceQty', Number(e.target.value))} className="w-20 border border-slate-600 rounded px-2 py-1 bg-slate-700 text-slate-200" /></div>
                    </div>
                </div>
            </div>
        </div>
    );
};
