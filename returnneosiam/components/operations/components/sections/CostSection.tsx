import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { ReturnRecord } from '../../../../types';
import { RESPONSIBLE_MAPPING } from '../../utils';

interface CostSectionProps {
    formData: Partial<ReturnRecord>;
    updateField: (field: keyof ReturnRecord, value: ReturnRecord[keyof ReturnRecord]) => void;
}

export const CostSection: React.FC<CostSectionProps> = ({ formData, updateField }) => {
    return (
        <div className="border-2 border-slate-600 rounded-xl overflow-hidden mt-6">
            <div className="bg-slate-700 px-4 py-2 border-b border-slate-600 font-bold text-slate-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" /> การติดตามค่าใช้จ่าย (Cost Tracking)
            </div>
            <div className="p-4 bg-slate-800">
                <label className="flex items-center gap-2 mb-4 cursor-pointer">
                    <input
                        type="checkbox"
                        aria-label="มีค่าใช้จ่าย"
                        title="มีค่าใช้จ่าย"
                        checked={formData.hasCost || false}
                        onChange={e => updateField('hasCost', e.target.checked)}
                        className="w-5 h-5 text-red-600 rounded focus:ring-red-500 border-slate-600"
                    />
                    <span className="font-bold text-red-400">⚠ มีค่าใช้จ่าย (Has Cost)</span>
                </label>

                {/* Field Settlement Section (New) */}
                <div className={`mb-4 p-4 rounded-lg border flex flex-col gap-3 transition-colors ${formData.isFieldSettled ? 'bg-amber-900/20 border-amber-700/50 shadow-sm' : 'bg-slate-700/50 border-slate-600'}`}>
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={formData.isFieldSettled || false}
                            onChange={(e) => {
                                const checked = e.target.checked;
                                updateField('isFieldSettled', checked);
                                if (checked) {
                                    updateField('preliminaryRoute', 'จบงานหน้างาน');
                                }
                            }}
                            className="w-5 h-5 text-amber-500 rounded focus:ring-amber-500"
                        />
                        <span className={`text-sm font-bold transition-colors ${formData.isFieldSettled ? 'text-amber-300' : 'text-slate-200 group-hover:text-amber-400'}`}>
                            จบงานหน้างาน / พนักงานชดเชยเงิน (Field Settlement)
                        </span>
                    </label>

                    {formData.isFieldSettled && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in pl-8 border-l-2 border-amber-600/50 ml-2.5">
                            <div>
                                <label className="block text-xs font-bold text-amber-300 mb-1 uppercase tracking-wider">จำนวนเงินที่ชดเชย (Amount)</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        aria-label="จำนวนเงินชดเชย"
                                        title="จำนวนเงินชดเชย"
                                        className="w-full p-2 text-sm border border-amber-600/50 rounded focus:ring-2 focus:ring-amber-500 bg-slate-700 font-bold text-amber-400 shadow-sm"
                                        value={formData.fieldSettlementAmount || ''}
                                        onChange={e => updateField('fieldSettlementAmount', parseFloat(e.target.value) || 0)}
                                        placeholder="0.00"
                                    />
                                    <span className="text-sm font-bold text-amber-300">บาท</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-amber-300 mb-1 uppercase tracking-wider">หลักฐานการรับเงิน (Evidence Ref)</label>
                                <input
                                    type="text"
                                    aria-label="หลักฐานการรับเงิน"
                                    title="หลักฐานการรับเงิน"
                                    className="w-full p-2 text-sm border border-amber-600/50 rounded focus:ring-2 focus:ring-amber-500 bg-slate-700 placeholder-slate-500 text-slate-200"
                                    value={formData.fieldSettlementEvidence || ''}
                                    onChange={e => updateField('fieldSettlementEvidence', e.target.value)}
                                    placeholder="เลขที่บิล / รายละเอียด..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-amber-300 mb-1 uppercase tracking-wider">ชื่อ-นามสกุล ผู้รับผิดชอบ</label>
                                <input
                                    type="text"
                                    aria-label="ชื่อผู้รับผิดชอบ"
                                    title="ชื่อผู้รับผิดชอบ"
                                    className="w-full p-2 text-sm border border-amber-600/50 rounded focus:ring-2 focus:ring-amber-500 bg-slate-700 placeholder-slate-500 text-slate-200"
                                    value={formData.fieldSettlementName || ''}
                                    onChange={e => updateField('fieldSettlementName', e.target.value)}
                                    placeholder="ชื่อ-นามสกุล"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-amber-300 mb-1 uppercase tracking-wider">ตำแหน่ง</label>
                                <input
                                    type="text"
                                    aria-label="ตำแหน่ง"
                                    title="ตำแหน่ง"
                                    className="w-full p-2 text-sm border border-amber-600/50 rounded focus:ring-2 focus:ring-amber-500 bg-slate-700 placeholder-slate-500 text-slate-200"
                                    value={formData.fieldSettlementPosition || ''}
                                    onChange={e => updateField('fieldSettlementPosition', e.target.value)}
                                    placeholder="เช่น พนักงานขับรถ / พนักงานขาย"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {formData.hasCost && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in bg-red-900/20 p-4 rounded-lg border border-red-700/50">
                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-1">สาเหตุความเสียหาย (Problem Source)</label>
                            <select
                                aria-label="สาเหตุความเสียหาย"
                                title="สาเหตุความเสียหาย"
                                value={formData.problemSource || ''}
                                onChange={e => updateField('problemSource', e.target.value)}
                                className="w-full p-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-200 bg-slate-700"
                            >
                                <option value="">-- ระบุสาเหตุ --</option>
                                {Object.keys(RESPONSIBLE_MAPPING).map(source => (
                                    <option key={source} value={source}>{source}</option>
                                ))}
                                <option value="Other">อื่นๆ (Other)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-1">ค่าใช้จ่าย (บาท)</label>
                            <input
                                type="number"
                                aria-label="จำนวนเงินค่าใช้จ่าย"
                                title="จำนวนเงินค่าใช้จ่าย"
                                step="0.01"
                                value={formData.costAmount || ''}
                                onChange={e => updateField('costAmount', Number(e.target.value))}
                                onBlur={e => updateField('costAmount', parseFloat(parseFloat(e.target.value).toFixed(2)))}
                                className="w-full p-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-200 bg-slate-700 placeholder-slate-500"
                                placeholder="0.00"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-300 mb-1">ผู้รับผิดชอบ (Responsible)</label>
                            <input
                                type="text"
                                aria-label="ผู้รับผิดชอบ"
                                title="ผู้รับผิดชอบ"
                                value={formData.costResponsible || ''}
                                onChange={e => updateField('costResponsible', e.target.value)}
                                className="w-full p-2 border border-slate-600 rounded-lg bg-slate-700 text-slate-200 font-bold placeholder-slate-500"
                                placeholder="ระบบจะระบุให้อัตโนมัติ หรือกรอกเอง"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
