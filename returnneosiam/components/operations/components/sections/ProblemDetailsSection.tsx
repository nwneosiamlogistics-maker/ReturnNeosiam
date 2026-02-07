import React from 'react';
import { AlertTriangle, ImageIcon, Trash2 } from 'lucide-react';
import { ReturnRecord } from '../../../../types';
import { BRANCH_LIST } from '../../../../constants';

const WAREHOUSE_CAUSES = ['เช็คเกอร์', 'พนักงานลงสินค้า', 'อื่นๆ'];

interface ProblemDetailsSectionProps {
    formData: Partial<ReturnRecord>;
    updateField: (field: keyof ReturnRecord, value: Partial<ReturnRecord>[keyof ReturnRecord]) => void;
    handleCheckboxToggle: (field: keyof ReturnRecord, resetFields?: (keyof ReturnRecord)[]) => void;
    handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleRemoveImage: (index: number) => void;
}

export const ProblemDetailsSection: React.FC<ProblemDetailsSectionProps> = ({
    formData,
    updateField,
    handleCheckboxToggle,
    handleImageUpload,
    handleRemoveImage
}) => {
    return (
        <div className="border-2 border-slate-600 rounded-xl overflow-hidden">
            <div className="bg-slate-700 px-4 py-2 border-b border-slate-600 font-bold text-slate-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" /> รายละเอียดของปัญหาที่พบ (ผู้พบปัญหา)
            </div>
            <div className="p-4 bg-slate-800 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="border-r border-slate-700 pr-4">
                    <div className="flex flex-col items-center justify-center text-slate-200 min-h-[200px] border-2 border-dashed border-slate-600 rounded-lg hover:bg-slate-700/50 transition-colors relative">
                        <input type="file" aria-label="อัพโหลดรูปภาพ" title="อัพโหลดรูปภาพ" multiple accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                        <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
                        <span className="text-sm font-bold">คลิกเพื่ออัพโหลดรูปภาพ</span>
                        <span className="text-xs text-slate-400 mt-1">หรือลากไฟล์มาวางที่นี่</span>
                    </div>
                    {formData.images && formData.images.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mt-4">
                            {formData.images.map((img, idx) => (
                                <div key={idx} className="relative group aspect-square bg-slate-700 rounded overflow-hidden border border-slate-600">
                                    <img src={img} alt="Preview" className="w-full h-full object-cover" />
                                    <button onClick={() => handleRemoveImage(idx)} aria-label="ลบรูปภาพ" title="ลบรูปภาพ" type="button" className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="md:col-span-2">
                    <div className="mb-4 bg-slate-700/50 p-3 rounded border border-slate-600">
                        <div className="mb-3 font-bold text-slate-200 text-sm border-b border-slate-600 pb-2">วิเคราะห์ปัญหาเกิดจาก (Problem Source) <span className="text-red-400">*</span></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-3 gap-x-2 text-sm text-slate-200">
                            {/* Standard Options */}
                            {[
                                { value: 'Customer', label: 'ลูกค้าต้นทาง (Source Customer)' },
                                { value: 'DestinationCustomer', label: 'ลูกค้าปลายทาง (Destination Customer)' },
                                { value: 'Accounting', label: 'บัญชี (Accounting)' },
                                { value: 'Keying', label: 'พนักงานคีย์ข้อมูลผิด (Keying)' },
                                { value: 'Sales', label: 'ฝ่ายขาย (Sales)' },
                                { value: 'Production', label: 'ฝ่ายผลิต/โรงงาน (Production)' },
                                { value: 'Procurement', label: 'ฝ่ายจัดซื้อ (Procurement)' }
                            ].map((option) => (
                                <label key={option.value} className="flex items-center gap-2 cursor-pointer hover:text-blue-400 transition-colors">
                                    <input
                                        type="radio"
                                        name="problemAnalysis"
                                        required
                                        checked={formData.problemAnalysis === option.value}
                                        onChange={() => updateField('problemAnalysis', option.value)}
                                        className="w-4 h-4 text-blue-500 focus:ring-blue-500"
                                    />
                                    {option.label}
                                </label>
                            ))}

                            {/* Warehouse Option & Sub-options */}
                            <div className="col-span-1 md:col-span-2 lg:col-span-3">
                                <label className="flex items-center gap-2 cursor-pointer hover:text-blue-400 transition-colors mb-2">
                                    <input type="radio" name="problemAnalysis" checked={formData.problemAnalysis === 'Warehouse'} onChange={() => updateField('problemAnalysis', 'Warehouse')} className="w-4 h-4 text-blue-500 focus:ring-blue-500" />
                                    ภายในคลังสินค้า (Warehouse)
                                </label>
                                {formData.problemAnalysis === 'Warehouse' && (
                                    <div className="ml-6 p-3 bg-slate-700/50 border border-slate-600 rounded grid grid-cols-1 md:grid-cols-2 gap-3 animate-fade-in">
                                        <div>
                                            <label className="text-xs font-bold text-slate-200 mb-1 block">เลือกสาขา/หน่วยงาน</label>
                                            <select aria-label="เลือกสาขา" title="เลือกสาขา" className="w-full border border-slate-600 rounded p-1.5 text-sm text-slate-200 bg-slate-800" value={formData.problemAnalysisSub || ''} onChange={e => updateField('problemAnalysisSub', e.target.value)}>
                                                <option value="">-- เลือกสาขา --</option>
                                                {BRANCH_LIST.map(b => <option key={b} value={b}>{b}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-200 mb-1 block">ระบุสาเหตุ (Cause)</label>
                                            <div className="flex flex-wrap gap-2 text-sm mt-1">
                                                {WAREHOUSE_CAUSES.map(c => (
                                                    <label key={c} className="flex items-center gap-1 cursor-pointer text-slate-200"><input type="radio" name="whCause" checked={formData.problemAnalysisCause === c} onChange={() => updateField('problemAnalysisCause', c)} />{c}</label>
                                                ))}
                                            </div>
                                            {formData.problemAnalysisCause === 'อื่นๆ' && <input type="text" aria-label="ระบุสาเหตุอื่นๆ" title="ระบุสาเหตุอื่นๆ" className="border-b border-slate-500 outline-none text-sm w-full mt-1 text-slate-200 bg-transparent placeholder-slate-500" placeholder="ระบุ..." value={formData.problemAnalysisDetail || ''} onChange={e => updateField('problemAnalysisDetail', e.target.value)} />}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Transport Option & Sub-options */}
                            <div className="col-span-1 md:col-span-2 lg:col-span-3">
                                <label className="flex items-center gap-2 cursor-pointer hover:text-blue-400 transition-colors mb-2">
                                    <input type="radio" name="problemAnalysis" checked={formData.problemAnalysis === 'Transport'} onChange={() => updateField('problemAnalysis', 'Transport')} className="w-4 h-4 text-blue-500 focus:ring-blue-500" />
                                    ระหว่างขนส่ง (Transport)
                                </label>
                                {formData.problemAnalysis === 'Transport' && (
                                    <div className="ml-6 p-3 bg-slate-700/50 border border-slate-600 rounded animate-fade-in">
                                        <label className="text-xs font-bold text-slate-200 mb-1 block">ประเภทการขนส่ง</label>
                                        <div className="flex gap-4 mb-2">
                                            <label className="flex items-center gap-1 cursor-pointer text-slate-200"><input type="radio" name="transType" checked={formData.problemAnalysisSub === 'CompanyDriver'} onChange={() => updateField('problemAnalysisSub', 'CompanyDriver')} /> พนักงานขับรถบริษัท</label>
                                            <label className="flex items-center gap-1 cursor-pointer text-slate-200"><input type="radio" name="transType" checked={formData.problemAnalysisSub === 'JointTransport'} onChange={() => updateField('problemAnalysisSub', 'JointTransport')} /> รถขนส่งร่วม</label>
                                            <label className="flex items-center gap-1 cursor-pointer text-slate-200"><input type="radio" name="transType" checked={formData.problemAnalysisSub === 'Other'} onChange={() => updateField('problemAnalysisSub', 'Other')} /> อื่นๆ</label>
                                        </div>
                                        {formData.problemAnalysisSub === 'Other' && <input type="text" aria-label="ระบุรายละเอียดขนส่งอื่นๆ" title="ระบุรายละเอียดขนส่งอื่นๆ" className="border-b border-slate-500 outline-none text-sm w-full text-slate-200 bg-transparent placeholder-slate-500" placeholder="ระบุรายละเอียด..." value={formData.problemAnalysisDetail || ''} onChange={e => updateField('problemAnalysisDetail', e.target.value)} />}
                                    </div>
                                )}
                            </div>

                            {/* Other Option */}
                            <div className="col-span-1 md:col-span-2 lg:col-span-3">
                                <div className="flex items-center gap-2">
                                    <label className="flex items-center gap-2 cursor-pointer hover:text-blue-400 transition-colors text-slate-200">
                                        <input type="radio" name="problemAnalysis" checked={formData.problemAnalysis === 'Other'} onChange={() => updateField('problemAnalysis', 'Other')} className="w-4 h-4 text-blue-500 focus:ring-blue-500" />
                                        อื่นๆ (Other)
                                    </label>
                                    {formData.problemAnalysis === 'Other' && (
                                        <input type="text" aria-label="ระบุปัญหาอื่นๆ" title="ระบุปัญหาอื่นๆ" className="border-b border-dotted border-slate-500 bg-transparent outline-none flex-1 text-slate-200 ml-2 placeholder-slate-500" placeholder="ระบุ..." value={formData.problemAnalysisDetail || ''} onChange={e => updateField('problemAnalysisDetail', e.target.value)} />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="mb-2 font-bold underline text-slate-200 text-sm">พบปัญหาที่กระบวนการ <span className="text-red-400">*</span></div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4 text-slate-200 text-sm">
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-700/50 p-1 rounded">
                            <input type="checkbox" checked={formData.problemDamaged} onChange={() => handleCheckboxToggle('problemDamaged')} /> ชำรุด
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-700/50 p-1 rounded">
                            <input type="checkbox" checked={formData.problemDamagedInBox} onChange={() => handleCheckboxToggle('problemDamagedInBox')} /> ชำรุดในกล่อง
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-700/50 p-1 rounded">
                            <input type="checkbox" checked={formData.problemLost} onChange={() => handleCheckboxToggle('problemLost')} /> สูญหาย
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-700/50 p-1 rounded">
                            <input type="checkbox" checked={formData.problemMixed} onChange={() => handleCheckboxToggle('problemMixed')} /> สินค้าสลับ
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-700/50 p-1 rounded">
                            <input type="checkbox" checked={formData.problemWrongInv} onChange={() => handleCheckboxToggle('problemWrongInv')} /> สินค้าไม่ตรง INV.
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-700/50 p-1 rounded">
                            <input type="checkbox" checked={formData.problemLate} onChange={() => handleCheckboxToggle('problemLate')} /> ส่งช้า
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-700/50 p-1 rounded">
                            <input type="checkbox" checked={formData.problemDuplicate} onChange={() => handleCheckboxToggle('problemDuplicate')} /> ส่งซ้ำ
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-700/50 p-1 rounded">
                            <input type="checkbox" checked={formData.problemWrong} onChange={() => handleCheckboxToggle('problemWrong')} /> ส่งผิด
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-700/50 p-1 rounded">
                            <input type="checkbox" checked={formData.problemIncomplete} onChange={() => handleCheckboxToggle('problemIncomplete')} /> ส่งของไม่ครบ
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-700/50 p-1 rounded">
                            <input type="checkbox" checked={formData.problemOver} onChange={() => handleCheckboxToggle('problemOver')} /> ส่งของเกิน
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-700/50 p-1 rounded">
                            <input type="checkbox" checked={formData.problemWrongInfo} onChange={() => handleCheckboxToggle('problemWrongInfo')} /> ข้อมูลผิด
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-700/50 p-1 rounded">
                            <input type="checkbox" checked={formData.problemShortExpiry} onChange={() => handleCheckboxToggle('problemShortExpiry')} /> สินค้าอายุสั้น
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-700/50 p-1 rounded">
                            <input type="checkbox" checked={formData.problemTransportDamage} onChange={() => handleCheckboxToggle('problemTransportDamage')} /> สินค้าเสียหายบนรถขนส่ง
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-700/50 p-1 rounded">
                            <input type="checkbox" checked={formData.problemAccident} onChange={() => handleCheckboxToggle('problemAccident')} /> อุบัติเหตุ
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-700/50 p-1 rounded">
                            <input type="checkbox" checked={formData.problemPOExpired} onChange={() => handleCheckboxToggle('problemPOExpired')} /> PO. หมดอายุ
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-700/50 p-1 rounded">
                            <input type="checkbox" checked={formData.problemNoBarcode} onChange={() => handleCheckboxToggle('problemNoBarcode')} /> บาร์โค๊ตไม่ขึ้น
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-700/50 p-1 rounded">
                            <input type="checkbox" checked={formData.problemNotOrdered} onChange={() => handleCheckboxToggle('problemNotOrdered')} /> ไม่ได้สั่งสินค้า
                        </label>
                        <div className="flex items-center gap-2 p-1 col-span-2">
                            <input type="checkbox" aria-label="อื่นๆ" title="อื่นๆ" checked={formData.problemOther} onChange={() => handleCheckboxToggle('problemOther')} />
                            <span>อื่นๆ</span>
                            <input type="text" aria-label="ระบุปัญหาอื่นๆ" title="ระบุปัญหาอื่นๆ" className="border-b border-dotted border-slate-500 bg-transparent outline-none flex-1 text-slate-200 placeholder-slate-500" value={formData.problemOtherText || ''} onChange={e => updateField('problemOtherText', e.target.value)} />
                        </div>
                    </div>
                    <div className="mb-4">
                        <label className="flex items-center gap-3 p-3 bg-amber-900/20 border border-amber-700/50 rounded-xl cursor-pointer hover:bg-amber-900/30 transition-all border-dashed">
                            <input
                                type="checkbox"
                                checked={formData.isRecordOnly || false}
                                onChange={() => handleCheckboxToggle('isRecordOnly')}
                                className="w-5 h-5 text-amber-500 focus:ring-amber-500 rounded border-amber-600"
                            />
                            <div className="flex flex-col">
                                <span className="font-bold text-amber-300 text-sm">บันทึกข้อมูลเพื่อเป็นสถิติเท่านั้น (Record Only)</span>
                                <span className="text-[10px] text-amber-400/70 leading-tight">กรณีความผิดพลาดด้านกระบวนการ/บริการ โดยไม่มีการส่งคืนสินค้าจริง (เช่น ส่งสินค้าล่าช้า)</span>
                            </div>
                        </label>
                    </div>

                    <div>
                        <label className="font-bold underline text-sm text-slate-200">รายละเอียด:</label>
                        <textarea aria-label="รายละเอียดปัญหา" title="รายละเอียดปัญหา" value={formData.problemDetail || ''} onChange={e => updateField('problemDetail', e.target.value)} className="w-full mt-1 p-2 bg-slate-700 border border-slate-600 rounded text-sm min-h-[80px] text-slate-200 placeholder-slate-500" placeholder="รายละเอียดเพิ่มเติม..."></textarea>
                    </div>
                </div>
            </div>
        </div>
    );
};
