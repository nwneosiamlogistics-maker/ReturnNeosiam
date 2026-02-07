import React from 'react';
import { Calendar, MapPin } from 'lucide-react';
import { BRANCH_LIST } from '../../../../constants';
import { ReturnRecord } from '../../../../types';

interface HeaderSectionProps {
    formData: Partial<ReturnRecord>;
    updateField: (field: keyof ReturnRecord, value: any) => void;
    isCustomBranch: boolean;
    setIsCustomBranch: (val: boolean) => void;
}

export const HeaderSection: React.FC<HeaderSectionProps> = ({
    formData,
    updateField,
    isCustomBranch,
    setIsCustomBranch
}) => {
    return (
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <label className="block text-sm font-bold text-slate-300 mb-1">ถึงหน่วยงาน (To Dept)</label>
                    <input
                        type="text"
                        aria-label="ถึงหน่วยงาน"
                        title="ถึงหน่วยงาน"
                        value={formData.toDept || 'แผนกควบคุมคุณภาพ'}
                        onChange={e => updateField('toDept', e.target.value)}
                        className="w-full p-2.5 bg-slate-700 border border-slate-600 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-200 shadow-sm placeholder-slate-500"
                        placeholder="ระบุหน่วยงาน..."
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-300 mb-1">วันที่แจ้งคืน <span className="text-red-400">*</span></label>
                    <div className="relative">
                        <input
                            type="date"
                            aria-label="วันที่แจ้งคืน"
                            title="วันที่แจ้งคืน"
                            required
                            value={formData.date}
                            onChange={e => updateField('date', e.target.value)}
                            className="w-full p-2.5 pl-10 bg-slate-700 border border-slate-600 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-200 shadow-sm"
                        />
                        <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-300 mb-1">สำเนา (Copy To)</label>
                    <input
                        type="text"
                        aria-label="สำเนาถึง"
                        title="สำเนาถึง"
                        value={formData.copyTo || ''}
                        onChange={e => updateField('copyTo', e.target.value)}
                        className="w-full p-2.5 bg-slate-700 border border-slate-600 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-200 shadow-sm placeholder-slate-500"
                        placeholder="ระบุผู้รับสำเนา..."
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-bold text-slate-300 mb-1">สาขาที่ส่งคืน <span className="text-red-400">*</span></label>
                    {isCustomBranch ? (
                        <div className="flex gap-2 animate-fade-in relative">
                            <input
                                type="text"
                                aria-label="ระบุสาขาเอง"
                                title="ระบุสาขาเอง"
                                required
                                value={formData.branch}
                                onChange={e => updateField('branch', e.target.value)}
                                className="w-full p-2.5 pl-10 bg-slate-700 border border-slate-600 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-slate-200 placeholder-slate-500"
                                placeholder="ระบุชื่อสาขา..."
                                autoFocus
                            />
                            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                            <button type="button" onClick={() => setIsCustomBranch(false)} className="text-xs text-blue-400 hover:underline absolute right-3 top-3 bg-slate-700 px-2">เลือกจากรายการ</button>
                        </div>
                    ) : (
                        <div className="relative">
                            <select
                                aria-label="เลือกสาขา"
                                title="เลือกสาขา"
                                required
                                value={formData.branch}
                                onChange={e => {
                                    if (e.target.value === 'Other') setIsCustomBranch(true);
                                    else updateField('branch', e.target.value);
                                }}
                                className="w-full p-2.5 pl-10 bg-slate-700 border border-slate-600 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-200 shadow-sm appearance-none"
                            >
                                <option value="" disabled>-- เลือกสาขา --</option>
                                {BRANCH_LIST.map(b => <option key={b} value={b}>{b}</option>)}
                                <option value="Other">+ ระบุเอง...</option>
                            </select>
                            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        </div>
                    )}
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-300 mb-1">เลขที่ใบสั่งซื้อ/ผลิต (PO No.)</label>
                    <input
                        type="text"
                        aria-label="เลขที่ใบสั่งซื้อ"
                        title="เลขที่ใบสั่งซื้อ"
                        value={formData.poNo || ''}
                        onChange={e => updateField('poNo', e.target.value)}
                        className="w-full p-2.5 bg-slate-700 border border-slate-600 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-200 shadow-sm placeholder-slate-500"
                        placeholder="ระบุเลขที่ PO..."
                    />
                </div>
            </div>
        </div>
    );
};
