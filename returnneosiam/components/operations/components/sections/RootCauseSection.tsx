import React from 'react';
import { Search } from 'lucide-react';
import { ReturnRecord } from '../../../../types';

interface RootCauseSectionProps {
    formData: Partial<ReturnRecord>;
    updateField: (field: keyof ReturnRecord, value: any) => void;
    handleCheckboxToggle: (field: keyof ReturnRecord, resetFields?: (keyof ReturnRecord)[]) => void;
}

export const RootCauseSection: React.FC<RootCauseSectionProps> = ({
    formData,
    updateField,
    handleCheckboxToggle
}) => {

    // กลุ่ม Cause ที่ต้องเลือกได้แค่อย่างเดียว (Optional: ถ้าต้องการให้เลือกได้หลายอย่างก็ไม่ต้องส่ง resetFields)
    // ตรงนี้ผมสมมติว่าเลือกได้หลายอย่างตาม UI เดิม แต่ถ้าต้องการให้เลือกแค่อย่างเดียวให้ uncomment code ด้านล่าง
    // const CAUSES: (keyof ReturnRecord)[] = ['causePackaging', 'causeTransport', 'causeOperation', 'causeEnv'];
    const onToggle = (field: keyof ReturnRecord) => {
        // const others = CAUSES.filter(f => f !== field);
        handleCheckboxToggle(field, []); // ส่ง [] คือไม่ reset ตัวอื่น (Multiple Select) หรือถ้ายากให้ Single Select ก็ส่ง others
    };

    return (
        <div className="border-2 border-slate-600 rounded-xl overflow-hidden mt-6">
            <div className="bg-slate-700 px-4 py-2 border-b border-slate-600 font-bold text-slate-300 flex items-center gap-2">
                <Search className="w-4 h-4 text-purple-400" /> สาเหตุ-การป้องกัน (ผู้รับผิดชอบปัญหา)
            </div>
            <div className="p-4 bg-slate-800 text-sm">
                <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold underline text-slate-300">สาเหตุเกิดจาก:</span>
                    <label className="flex items-center gap-1 cursor-pointer ml-4 text-slate-200"><input type="checkbox" checked={formData.causePackaging} onChange={() => onToggle('causePackaging')} /> บรรจุภัณฑ์</label>
                    <label className="flex items-center gap-1 cursor-pointer ml-4 text-slate-200"><input type="checkbox" checked={formData.causeTransport} onChange={() => onToggle('causeTransport')} /> การขนส่ง</label>
                    <label className="flex items-center gap-1 cursor-pointer ml-4 text-slate-200"><input type="checkbox" checked={formData.causeOperation} onChange={() => onToggle('causeOperation')} /> ปฏิบัติงาน</label>
                    <label className="flex items-center gap-1 cursor-pointer ml-4 text-slate-200"><input type="checkbox" checked={formData.causeEnv} onChange={() => onToggle('causeEnv')} /> สิ่งแวดล้อม</label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div>
                        <label className="font-bold text-slate-200 block mb-1">รายละเอียดสาเหตุ:</label>
                        <textarea value={formData.causeDetail || ''} onChange={e => updateField('causeDetail', e.target.value)} className="w-full p-2 bg-slate-700 border border-slate-600 rounded min-h-[60px] text-slate-200 placeholder-slate-500" placeholder="ระบุสาเหตุ..."></textarea>
                    </div>
                    <div>
                        <label className="font-bold text-slate-200 block mb-1">แนวทางป้องกัน:</label>
                        <textarea value={formData.preventionDetail || ''} onChange={e => updateField('preventionDetail', e.target.value)} className="w-full p-2 bg-slate-700 border border-slate-600 rounded min-h-[60px] text-slate-200 placeholder-slate-500" placeholder="ระบุแนวทางป้องกัน..."></textarea>
                    </div>
                </div>
            </div>
        </div>
    );
};
