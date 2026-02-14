import React, { useState, useEffect } from 'react';
import { X, Save, ClipboardList, Truck, DollarSign, Trash2, AlertTriangle, Search, Wrench, ImageIcon } from 'lucide-react';
import { ReturnRecord } from '../../../types';
import { BRANCH_LIST, RETURN_ROUTES } from '../../../constants';
import { RESPONSIBLE_MAPPING } from '../utils';
import Swal from 'sweetalert2';
import { uploadImagesToStorage, setNASUploadContext } from '../../../utils/imageUpload';

interface ItemAnalysisModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: Partial<ReturnRecord>;
    onSave: (updatedItem: Partial<ReturnRecord>) => void;
}

export const ItemAnalysisModal: React.FC<ItemAnalysisModalProps> = ({ isOpen, onClose, item, onSave }) => {
    const [formData, setFormData] = useState<Partial<ReturnRecord>>({});
    const [activeTab, setActiveTab] = useState<'problem' | 'analysis' | 'action' | 'cost'>('problem');

    // Preliminary Decision State (managed separately for logic, syncs with formData)
    const [preliminaryRoute, setPreliminaryRoute] = useState<string>('');
    const [preliminaryOtherRoute, setPreliminaryOtherRoute] = useState<string>('');

    useEffect(() => {
        if (isOpen && item) {
            setFormData({ ...item });
            setPreliminaryRoute(item.preliminaryRoute || '');
            // Logic for 'Other' route
            if (item.preliminaryRoute && !RETURN_ROUTES.includes(item.preliminaryRoute) && item.preliminaryRoute !== 'Other') {
                setPreliminaryRoute('Other');
                setPreliminaryOtherRoute(item.preliminaryRoute);
            } else if (item.preliminaryRoute === 'Other') {
                setPreliminaryOtherRoute('');
            }
        }
    }, [isOpen, item]);

    const handleCauseSelection = (field: keyof ReturnRecord) => {
        setFormData(prev => {
            const isCurrentlyChecked = prev[field] as boolean;
            const newValue = !isCurrentlyChecked;
            if (newValue) {
                return { ...prev, causePackaging: false, causeTransport: false, causeOperation: false, causeEnv: false, [field]: true };
            } else {
                return { ...prev, [field]: false };
            }
        });
    };

    const handleProblemSelection = (field: keyof ReturnRecord) => {
        setFormData(prev => {
            const isCurrentlyChecked = prev[field] as boolean;
            const newValue = !isCurrentlyChecked;
            if (newValue) {
                return {
                    ...prev,
                    problemDamaged: false,
                    problemDamagedInBox: false,
                    problemLost: false,
                    problemMixed: false,
                    problemWrongInv: false,
                    problemLate: false,
                    problemDuplicate: false,
                    problemWrong: false,
                    problemIncomplete: false,
                    problemOver: false,
                    problemWrongInfo: false,
                    problemShortExpiry: false,
                    problemTransportDamage: false,
                    problemAccident: false,
                    problemPOExpired: false,
                    problemNoBarcode: false,
                    problemNotOrdered: false,
                    problemOther: false,
                    [field]: true
                };
            } else {
                return { ...prev, [field]: false };
            }
        });
    };

    const handleActionSelection = (field: keyof ReturnRecord) => {
        setFormData(prev => {
            const isCurrentlyChecked = prev[field] as boolean;
            const newValue = !isCurrentlyChecked;
            if (newValue) {
                return {
                    ...prev,
                    actionReject: false,
                    actionRejectSort: false,
                    actionRework: false,
                    actionSpecialAcceptance: false,
                    actionScrap: false,
                    actionReplace: false,
                    [field]: true
                };
            } else {
                return { ...prev, [field]: false };
            }
        });
    };

    const [uploadingImages, setUploadingImages] = useState(false);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files) as File[];
            setUploadingImages(true);
            try {
                setNASUploadContext(item.ncrNumber || item.returnNo || '', 'analysis');
                const urls = await uploadImagesToStorage(files, 'analysis-images');
                setFormData(prev => ({
                    ...prev,
                    images: [...(prev.images || []), ...urls]
                }));
            } catch (error) {
                console.error('Image upload failed:', error);
                Swal.fire('อัปโหลดรูปไม่สำเร็จ', 'กรุณาลองใหม่อีกครั้ง', 'error');
            } finally {
                setUploadingImages(false);
            }
        }
    };

    const handleRemoveImage = (index: number) => {
        setFormData(prev => ({
            ...prev,
            images: (prev.images || []).filter((_, i) => i !== index)
        }));
    };


    const handleSave = () => {
        // Validation - Only validate if fields are filled or if user is trying to "complete" analysis
        // For now, we allow partial saves, BUT we should alert if critical analysis is missing IF they are marking it as done?
        // The table shows "Incomplete" until everything is there? 
        // Or we stick to the validation we grabbed earlier:

        if (!formData.problemAnalysis) {
            Swal.fire({
                icon: 'warning',
                title: 'ข้อมูลไม่ครบถ้วน',
                text: 'กรุณาระบุที่มาของปัญหา (Problem Analysis)'
            });
            return;
        }

        // ตรวจสอบเส้นทางส่งคืน (บังคับกรอก)
        if (!preliminaryRoute) {
            Swal.fire({
                icon: 'warning',
                title: 'ข้อมูลไม่ครบถ้วน',
                text: 'กรุณาระบุเส้นทางส่งคืน'
            });
            return;
        }

        if (preliminaryRoute === 'Other' && !preliminaryOtherRoute) {
            Swal.fire({
                icon: 'warning',
                title: 'ข้อมูลไม่ครบถ้วน',
                text: 'กรุณาระบุเส้นทางอื่นๆ'
            });
            return;
        }

        const finalRoute = preliminaryRoute === 'Other' ? preliminaryOtherRoute : preliminaryRoute;

        onSave({
            ...formData,
            preliminaryDecision: 'Return', // Auto-set to Return
            preliminaryRoute: finalRoute
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
            <div className="bg-white w-full h-full shadow-2xl flex flex-col animate-scale-in">
                <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">รายละเอียดสินค้า & การวิเคราะห์</h3>
                        <p className="text-xs text-slate-500">{item.productCode} - {item.productName}</p>
                    </div>
                    <button onClick={onClose} aria-label="Close" title="ปิด" className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* TABS */}
                <div className="flex border-b border-slate-200 bg-white sticky top-0 z-10">
                    <button onClick={() => setActiveTab('problem')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'problem' ? 'border-red-500 text-red-600 bg-red-50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>
                        <AlertTriangle className="w-4 h-4" /> ปัญหาที่พบ
                    </button>
                    <button onClick={() => setActiveTab('analysis')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'analysis' ? 'border-indigo-500 text-indigo-600 bg-indigo-50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>
                        <Search className="w-4 h-4" /> วิเคราะห์ & ตัดสินใจ
                    </button>
                    <button onClick={() => setActiveTab('action')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'action' ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>
                        <Wrench className="w-4 h-4" /> การดำเนินการ
                    </button>
                    <button onClick={() => setActiveTab('cost')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'cost' ? 'border-amber-500 text-amber-600 bg-amber-50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>
                        <DollarSign className="w-4 h-4" /> ค่าใช้จ่าย
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">

                    {/* PROBLEM TAB */}
                    {activeTab === 'problem' && (
                        <div className="space-y-6 animate-fade-in">
                            {/* PROBLEM DETAILS SECTION */}
                            <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
                                <div className="bg-red-50 px-4 py-2 border-b border-red-100 font-bold text-red-700 flex items-center gap-2 text-sm">
                                    <AlertTriangle className="w-4 h-4" /> รายละเอียดของปัญหาที่พบ (ผู้พบปัญหา)
                                </div>
                                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="border-r border-slate-100 pr-4">
                                        <div className="flex flex-col items-center justify-center text-slate-400 min-h-[150px] border-2 border-dashed border-slate-300 rounded-lg hover:bg-slate-50 transition-colors relative">
                                            {!uploadingImages && <input type="file" aria-label="อัพโหลดรูปภาพ" title="อัพโหลดรูปภาพ" multiple accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />}
                                            {uploadingImages ? <div className="animate-spin w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full mb-2"></div> : <ImageIcon className="w-8 h-8 mb-2 opacity-50" />}
                                            <span className="text-xs font-bold">{uploadingImages ? 'กำลังอัปโหลด...' : 'อัพโหลดรูปภาพ'}</span>
                                        </div>
                                        {formData.images && formData.images.length > 0 && (
                                            <div className="grid grid-cols-3 gap-2 mt-4">
                                                {formData.images.map((img, idx) => (
                                                    <div key={idx} className="relative group aspect-square bg-slate-100 rounded overflow-hidden border border-slate-200">
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
                                        <div className="mb-2 font-bold underline text-slate-800 text-sm">พบปัญหาที่กระบวนการ <span className="text-red-500">*</span></div>
                                        <div className="grid grid-cols-2 gap-2 mb-4 text-slate-700 text-sm">
                                            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" checked={formData.problemDamaged} onChange={() => handleProblemSelection('problemDamaged')} /> ชำรุด</label>
                                            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" checked={formData.problemDamagedInBox} onChange={() => handleProblemSelection('problemDamagedInBox')} /> ชำรุดในกล่อง</label>
                                            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" checked={formData.problemLost} onChange={() => handleProblemSelection('problemLost')} /> สูญหาย</label>
                                            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" checked={formData.problemMixed} onChange={() => handleProblemSelection('problemMixed')} /> สินค้าสลับ</label>
                                            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" checked={formData.problemWrongInv} onChange={() => handleProblemSelection('problemWrongInv')} /> สินค้าไม่ตรง INV.</label>
                                            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" checked={formData.problemLate} onChange={() => handleProblemSelection('problemLate')} /> ส่งช้า</label>
                                            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" checked={formData.problemDuplicate} onChange={() => handleProblemSelection('problemDuplicate')} /> ส่งซ้ำ</label>
                                            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" checked={formData.problemWrong} onChange={() => handleProblemSelection('problemWrong')} /> ส่งผิด</label>
                                            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" checked={formData.problemIncomplete} onChange={() => handleProblemSelection('problemIncomplete')} /> ส่งของไม่ครบ</label>
                                            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" checked={formData.problemOver} onChange={() => handleProblemSelection('problemOver')} /> ส่งของเกิน</label>
                                            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" checked={formData.problemWrongInfo} onChange={() => handleProblemSelection('problemWrongInfo')} /> ข้อมูลผิด</label>
                                            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" checked={formData.problemShortExpiry} onChange={() => handleProblemSelection('problemShortExpiry')} /> สินค้าอายุสั้น</label>
                                            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" checked={formData.problemTransportDamage} onChange={() => handleProblemSelection('problemTransportDamage')} /> สินค้าเสียหายบนรถขนส่ง</label>
                                            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" checked={formData.problemAccident} onChange={() => handleProblemSelection('problemAccident')} /> อุบัติเหตุ</label>
                                            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" checked={formData.problemPOExpired} onChange={() => handleProblemSelection('problemPOExpired')} /> PO. หมดอายุ</label>
                                            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" checked={formData.problemNoBarcode} onChange={() => handleProblemSelection('problemNoBarcode')} /> บาร์โค๊ตไม่ขึ้น</label>
                                            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" checked={formData.problemNotOrdered} onChange={() => handleProblemSelection('problemNotOrdered')} /> ไม่ได้สั่งสินค้า</label>
                                            <div className="flex items-center gap-2 p-1 col-span-2"><input type="checkbox" aria-label="ปัญหาอื่นๆ" title="ปัญหาอื่นๆ" checked={formData.problemOther} onChange={() => handleProblemSelection('problemOther')} /> <span>อื่นๆ</span><input type="text" aria-label="ระบุปัญหาอื่นๆ" title="ระบุปัญหาอื่นๆ" className="border-b border-dotted border-slate-400 bg-transparent outline-none flex-1 text-slate-700" value={formData.problemOtherText || ''} onChange={e => setFormData({ ...formData, problemOtherText: e.target.value })} /></div>
                                        </div>
                                        <div>
                                            <label className="font-bold underline text-sm text-slate-800">รายละเอียด:</label>
                                            <textarea aria-label="รายละเอียดปัญหา" title="รายละเอียดปัญหา" value={formData.problemDetail || ''} onChange={e => setFormData({ ...formData, problemDetail: e.target.value })} className="w-full mt-1 p-2 bg-slate-50 border rounded text-sm min-h-[80px]" placeholder="รายละเอียดเพิ่มเติม..."></textarea>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ANALYSIS TAB */}
                    {activeTab === 'analysis' && (
                        <div className="space-y-6 animate-fade-in">
                            {/* PROBLEM ANALYSIS SECTION */}
                            <div className="border rounded-xl overflow-hidden shadow-sm">
                                <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 font-bold text-slate-700 flex items-center gap-2 text-sm">
                                    <ClipboardList className="w-4 h-4 text-indigo-500" /> วิเคราะห์ปัญหาเกิดจาก (Problem Analysis)
                                </div>
                                <div className="p-4 bg-white space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded border border-transparent hover:border-slate-200">
                                            <input type="radio" name="problemAnalysis" checked={formData.problemAnalysis === 'Customer'} onChange={() => setFormData({ ...formData, problemAnalysis: 'Customer' })} className="w-4 h-4 text-indigo-600" /> <span className="text-sm font-bold text-slate-700">ลูกค้าต้นทาง</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded border border-transparent hover:border-slate-200">
                                            <input type="radio" name="problemAnalysis" checked={formData.problemAnalysis === 'DestinationCustomer'} onChange={() => setFormData({ ...formData, problemAnalysis: 'DestinationCustomer' })} className="w-4 h-4 text-indigo-600" /> <span className="text-sm font-bold text-slate-700">ลูกค้าปลายทาง</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded border border-transparent hover:border-slate-200">
                                            <input type="radio" name="problemAnalysis" checked={formData.problemAnalysis === 'Accounting'} onChange={() => setFormData({ ...formData, problemAnalysis: 'Accounting' })} className="w-4 h-4 text-indigo-600" /> <span className="text-sm font-bold text-slate-700">บัญชี</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded border border-transparent hover:border-slate-200">
                                            <input type="radio" name="problemAnalysis" checked={formData.problemAnalysis === 'Keying'} onChange={() => setFormData({ ...formData, problemAnalysis: 'Keying' })} className="w-4 h-4 text-indigo-600" /> <span className="text-sm font-bold text-slate-700">คีย์ผิด</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded border border-transparent hover:border-slate-200">
                                            <input type="radio" name="problemAnalysis" checked={formData.problemAnalysis === 'Warehouse'} onChange={() => setFormData({ ...formData, problemAnalysis: 'Warehouse' })} className="w-4 h-4 text-indigo-600" /> <span className="text-sm font-bold text-slate-700">คลังสินค้า</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded border border-transparent hover:border-slate-200">
                                            <input type="radio" name="problemAnalysis" checked={formData.problemAnalysis === 'Transport'} onChange={() => setFormData({ ...formData, problemAnalysis: 'Transport' })} className="w-4 h-4 text-indigo-600" /> <span className="text-sm font-bold text-slate-700">ขนส่ง</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded border border-transparent hover:border-slate-200">
                                            <input type="radio" name="problemAnalysis" checked={formData.problemAnalysis === 'Other'} onChange={() => setFormData({ ...formData, problemAnalysis: 'Other' })} className="w-4 h-4 text-indigo-600" /> <span className="text-sm font-bold text-slate-700">อื่นๆ</span>
                                        </label>
                                    </div>

                                    {/* Warehouse Sub-Options */}
                                    {formData.problemAnalysis === 'Warehouse' && (
                                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block font-bold mb-1">สาขา/หน่วยงาน</label>
                                                    <select aria-label="เลือกสาขา" title="เลือกสาขา" value={formData.problemAnalysisSub || ''} onChange={e => setFormData({ ...formData, problemAnalysisSub: e.target.value })} className="w-full p-2 border rounded">
                                                        <option value="">-- เลือก --</option>
                                                        {BRANCH_LIST.map(b => <option key={b} value={b}>{b}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block font-bold mb-1">สาเหตุ</label>
                                                    <div className="flex gap-2 mt-1">
                                                        <label className="flex items-center gap-1"><input type="radio" name="whCause" checked={formData.problemAnalysisCause === 'Checker'} onChange={() => setFormData({ ...formData, problemAnalysisCause: 'Checker' })} /> เช็คเกอร์</label>
                                                        <label className="flex items-center gap-1"><input type="radio" name="whCause" checked={formData.problemAnalysisCause === 'Unloader'} onChange={() => setFormData({ ...formData, problemAnalysisCause: 'Unloader' })} /> ลงสินค้า</label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {/* Transport Sub-Options */}
                                    {formData.problemAnalysis === 'Transport' && (
                                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm">
                                            <label className="block font-bold mb-1">ประเภทการขนส่ง</label>
                                            <div className="flex gap-3">
                                                <label className="flex items-center gap-1"><input type="radio" name="transType" checked={formData.problemAnalysisSub === 'CompanyDriver'} onChange={() => setFormData({ ...formData, problemAnalysisSub: 'CompanyDriver' })} /> รถบริษัท</label>
                                                <label className="flex items-center gap-1"><input type="radio" name="transType" checked={formData.problemAnalysisSub === 'JointTransport'} onChange={() => setFormData({ ...formData, problemAnalysisSub: 'JointTransport' })} /> รถร่วม</label>
                                                <label className="flex items-center gap-1"><input type="radio" name="transType" checked={formData.problemAnalysisSub === 'Other'} onChange={() => setFormData({ ...formData, problemAnalysisSub: 'Other' })} /> อื่นๆ</label>
                                            </div>
                                        </div>
                                    )}
                                    {/* Other Sub-Options */}
                                    {formData.problemAnalysis === 'Other' && (
                                        <input type="text" aria-label="รายละเอียดเพิ่มเติม" title="รายละเอียดเพิ่มเติม" value={formData.problemAnalysisDetail || ''} onChange={e => setFormData({ ...formData, problemAnalysisDetail: e.target.value })} className="w-full p-2 border rounded text-sm" placeholder="ระบุรายละเอียด..." />
                                    )}
                                </div>
                            </div>

                            {/* PRELIMINARY DECISION SECTION - Return Only */}
                            <div className="border rounded-xl overflow-hidden bg-indigo-50/30">
                                <div className="bg-indigo-100 px-4 py-2 border-b border-indigo-200 font-bold text-indigo-800 flex items-center gap-2 text-sm">
                                    <Truck className="w-4 h-4" /> ระบุเส้นทางส่งคืน (Return Route)
                                </div>
                                <div className="p-4">
                                    <p className="text-xs text-slate-500 mb-3">กรุณาเลือกเส้นทางสำหรับการส่งคืนสินค้า</p>

                                    <div className="p-3 bg-white rounded border border-indigo-100 text-sm">
                                        <label className="block font-bold mb-2">เลือกเส้นทางส่งคืน <span className="text-red-500">*</span></label>
                                        <div className="flex flex-wrap gap-2">
                                            {RETURN_ROUTES.map(route => (
                                                <label key={route} className={`px-3 py-1 rounded border cursor-pointer transition-all ${preliminaryRoute === route ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold' : 'bg-slate-50 hover:bg-indigo-50/50'}`}>
                                                    <input type="radio" name="route" value={route} checked={preliminaryRoute === route} onChange={(e) => { setPreliminaryRoute(e.target.value); }} className="hidden" />
                                                    {route}
                                                </label>
                                            ))}
                                            <label className={`px-3 py-1 rounded border cursor-pointer transition-all ${preliminaryRoute === 'Other' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold' : 'bg-slate-50 hover:bg-indigo-50/50'}`}>
                                                <input type="radio" name="route" value="Other" checked={preliminaryRoute === 'Other'} onChange={(e) => { setPreliminaryRoute(e.target.value); }} className="hidden" />
                                                อื่นๆ (Other)
                                            </label>
                                        </div>
                                        {preliminaryRoute === 'Other' && (
                                            <input type="text" aria-label="ระบุเส้นทางอื่นๆ" title="ระบุเส้นทางอื่นๆ" value={preliminaryOtherRoute} onChange={(e) => setPreliminaryOtherRoute(e.target.value)} className="w-full mt-2 p-2 border rounded text-sm focus:ring-2 focus:ring-indigo-500" placeholder="ระบุเส้นทาง..." />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ACTION TAB */}
                    {activeTab === 'action' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
                                <div className="bg-blue-50 px-4 py-2 border-b border-blue-100 font-bold text-blue-700 flex items-center gap-2 text-sm">
                                    <Wrench className="w-4 h-4" /> การดำเนินการ
                                </div>
                                <div className="p-4 bg-white space-y-3 text-sm">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-slate-100 pb-3">
                                        <div className="flex items-center gap-3">
                                            <input type="checkbox" aria-label="ส่งคืน (Reject)" title="ส่งคืน (Reject)" checked={formData.actionReject} onChange={() => handleActionSelection('actionReject')} className="w-4 h-4" />
                                            <span className="font-bold w-32">ส่งคืน (Reject)</span>
                                            <div className="flex items-center gap-2"><span className="text-xs text-slate-500">จำนวน:</span><input type="number" aria-label="จำนวนส่งคืน" title="จำนวนส่งคืน" value={formData.actionRejectQty} onChange={e => setFormData({ ...formData, actionRejectQty: Number(e.target.value) })} className="w-20 border rounded px-2 py-1" /></div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <input type="checkbox" aria-label="คัดแยกของเสีย" title="คัดแยกของเสีย" checked={formData.actionRejectSort} onChange={() => handleActionSelection('actionRejectSort')} className="w-4 h-4" />
                                            <span className="font-bold w-40">คัดแยกของเสียเพื่อส่งคืน</span>
                                            <div className="flex items-center gap-2"><span className="text-xs text-slate-500">จำนวน:</span><input type="number" aria-label="จำนวนคัดแยก" title="จำนวนคัดแยก" value={formData.actionRejectSortQty} onChange={e => setFormData({ ...formData, actionRejectSortQty: Number(e.target.value) })} className="w-20 border rounded px-2 py-1" /></div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 border-b border-slate-100 pb-3">
                                        <div className="flex items-start gap-3">
                                            <input type="checkbox" aria-label="แก้ไข (Rework)" title="แก้ไข (Rework)" checked={formData.actionRework} onChange={() => handleActionSelection('actionRework')} className="w-4 h-4 mt-1" />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-4 mb-2">
                                                    <span className="font-bold w-32">แก้ไข (Rework)</span>
                                                    <div className="flex items-center gap-2"><span className="text-xs text-slate-500">จำนวน:</span><input type="number" aria-label="จำนวนแก้ไข" title="จำนวนแก้ไข" value={formData.actionReworkQty} onChange={e => setFormData({ ...formData, actionReworkQty: Number(e.target.value) })} className="w-20 border rounded px-2 py-1" /></div>
                                                </div>
                                                <div className="flex items-center gap-2"><span className="text-xs font-bold text-slate-600">วิธีการแก้ไข:</span><input type="text" aria-label="วิธีการแก้ไข" title="วิธีการแก้ไข" value={formData.actionReworkMethod} onChange={e => setFormData({ ...formData, actionReworkMethod: e.target.value })} className="flex-1 border-b border-dotted border-slate-400 outline-none px-1" /></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 border-b border-slate-100 pb-3">
                                        <div className="flex items-start gap-3">
                                            <input type="checkbox" aria-label="ยอมรับกรณีพิเศษ" title="ยอมรับกรณีพิเศษ" checked={formData.actionSpecialAcceptance} onChange={() => handleActionSelection('actionSpecialAcceptance')} className="w-4 h-4 mt-1" />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-4 mb-2">
                                                    <span className="font-bold w-32">ยอมรับกรณีพิเศษ</span>
                                                    <div className="flex items-center gap-2"><span className="text-xs text-slate-500">จำนวน:</span><input type="number" aria-label="จำนวนยอมรับพิเศษ" title="จำนวนยอมรับพิเศษ" value={formData.actionSpecialAcceptanceQty} onChange={e => setFormData({ ...formData, actionSpecialAcceptanceQty: Number(e.target.value) })} className="w-20 border rounded px-2 py-1" /></div>
                                                </div>
                                                <div className="flex items-center gap-2"><span className="text-xs font-bold text-slate-600">เหตุผลในการยอมรับ:</span><input type="text" aria-label="เหตุผลในการยอมรับ" title="เหตุผลในการยอมรับ" value={formData.actionSpecialAcceptanceReason} onChange={e => setFormData({ ...formData, actionSpecialAcceptanceReason: e.target.value })} className="flex-1 border-b border-dotted border-slate-400 outline-none px-1" /></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex items-center gap-3">
                                            <input type="checkbox" aria-label="ทำลาย (Scrap)" title="ทำลาย (Scrap)" checked={formData.actionScrap} onChange={() => handleActionSelection('actionScrap')} className="w-4 h-4" />
                                            <span className="font-bold w-32">ทำลาย (Scrap)</span>
                                            <div className="flex items-center gap-2"><span className="text-xs text-slate-500">จำนวน:</span><input type="number" aria-label="จำนวนทำลาย" title="จำนวนทำลาย" value={formData.actionScrapQty} onChange={e => setFormData({ ...formData, actionScrapQty: Number(e.target.value) })} className="w-20 border rounded px-2 py-1" /></div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <input type="checkbox" aria-label="เปลี่ยนสินค้าใหม่" title="เปลี่ยนสินค้าใหม่" checked={formData.actionReplace} onChange={() => handleActionSelection('actionReplace')} className="w-4 h-4" />
                                            <span className="font-bold w-32">เปลี่ยนสินค้าใหม่</span>
                                            <div className="flex items-center gap-2"><span className="text-xs text-slate-500">จำนวน:</span><input type="number" aria-label="จำนวนเปลี่ยนใหม่" title="จำนวนเปลี่ยนใหม่" value={formData.actionReplaceQty} onChange={e => setFormData({ ...formData, actionReplaceQty: Number(e.target.value) })} className="w-20 border rounded px-2 py-1" /></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ROOT CAUSE SECTION */}
                            <div className="border rounded-xl overflow-hidden bg-white shadow-sm mt-6">
                                <div className="bg-purple-50 px-4 py-2 border-b border-purple-100 font-bold text-purple-700 flex items-center gap-2 text-sm">
                                    <Search className="w-4 h-4" /> สาเหตุ-การป้องกัน (ผู้รับผิดชอบปัญหา)
                                </div>
                                <div className="p-4 bg-white text-sm">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="font-bold underline text-slate-800">สาเหตุเกิดจาก:</span>
                                        <label className="flex items-center gap-1 cursor-pointer ml-4"><input type="checkbox" checked={formData.causePackaging} onChange={() => handleCauseSelection('causePackaging')} /> บรรจุภัณฑ์</label>
                                        <label className="flex items-center gap-1 cursor-pointer ml-4"><input type="checkbox" checked={formData.causeTransport} onChange={() => handleCauseSelection('causeTransport')} /> การขนส่ง</label>
                                        <label className="flex items-center gap-1 cursor-pointer ml-4"><input type="checkbox" checked={formData.causeOperation} onChange={() => handleCauseSelection('causeOperation')} /> ปฏิบัติงาน</label>
                                        <label className="flex items-center gap-1 cursor-pointer ml-4"><input type="checkbox" checked={formData.causeEnv} onChange={() => handleCauseSelection('causeEnv')} /> สิ่งแวดล้อม</label>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                        <div>
                                            <label className="font-bold text-slate-700 block mb-1">รายละเอียดสาเหตุ:</label>
                                            <textarea aria-label="รายละเอียดสาเหตุ" title="รายละเอียดสาเหตุ" value={formData.causeDetail || ''} onChange={e => setFormData({ ...formData, causeDetail: e.target.value })} className="w-full p-2 bg-slate-50 border rounded min-h-[60px]" placeholder="ระบุสาเหตุ..."></textarea>
                                        </div>
                                        <div>
                                            <label className="font-bold text-slate-700 block mb-1">แนวทางป้องกัน:</label>
                                            <textarea aria-label="แนวทางป้องกัน" title="แนวทางป้องกัน" value={formData.preventionDetail || ''} onChange={e => setFormData({ ...formData, preventionDetail: e.target.value })} className="w-full p-2 bg-slate-50 border rounded min-h-[60px]" placeholder="ระบุแนวทางป้องกัน..."></textarea>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* COST TAB */}
                    {activeTab === 'cost' && (
                        <div className="animate-fade-in">
                            <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
                                <div className="bg-amber-50 px-4 py-2 border-b border-amber-100 font-bold text-amber-700 flex items-center gap-2">
                                    <DollarSign className="w-4 h-4" /> การติดตามค่าใช้จ่าย (Cost Tracking)
                                </div>
                                <div className="p-4 bg-white">
                                    <label className="flex items-center gap-2 mb-4 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.hasCost || false}
                                            onChange={e => setFormData({ ...formData, hasCost: e.target.checked })}
                                            className="w-5 h-5 text-amber-600 rounded focus:ring-amber-500 border-slate-300"
                                        />
                                        <span className="font-bold text-amber-600">มีค่าใช้จ่าย (Has Cost)</span>
                                    </label>

                                    {/* Field Settlement (New for Consistency) */}
                                    <div className={`mb-4 p-4 rounded-lg border flex flex-col gap-3 transition-colors ${formData.isFieldSettled ? 'bg-amber-50 border-amber-200 shadow-sm' : 'bg-slate-50 border-slate-200'}`}>
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={formData.isFieldSettled || false}
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    setFormData({
                                                        ...formData,
                                                        isFieldSettled: checked,
                                                        preliminaryRoute: checked ? 'จบงานหน้างาน' : formData.preliminaryRoute
                                                    });
                                                    if (checked) setPreliminaryRoute('จบงานหน้างาน');
                                                }}
                                                className="w-5 h-5 text-amber-600 rounded focus:ring-amber-500"
                                            />
                                            <span className={`text-sm font-bold transition-colors ${formData.isFieldSettled ? 'text-amber-800' : 'text-slate-600 group-hover:text-amber-700'}`}>
                                                จบงานหน้างาน / พนักงานชดเชยเงิน (Field Settlement)
                                            </span>
                                        </label>

                                        {formData.isFieldSettled && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in pl-8 border-l-2 border-amber-200 ml-2.5">
                                                <div>
                                                    <label className="block text-xs font-bold text-amber-900 mb-1">จำนวนเงินที่ชดเชย (Amount)</label>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            aria-label="จำนวนเงินชดเชย"
                                                            title="จำนวนเงินชดเชย"
                                                            className="w-full p-2 text-sm border border-amber-300 rounded focus:ring-2 focus:ring-amber-500 bg-white"
                                                            value={formData.fieldSettlementAmount || ''}
                                                            onChange={e => setFormData({ ...formData, fieldSettlementAmount: parseFloat(e.target.value) || 0 })}
                                                            placeholder="0.00"
                                                        />
                                                        <span className="text-sm font-bold text-amber-800">บาท</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-amber-900 mb-1">หลักฐานการรับเงิน (Evidence Ref)</label>
                                                    <input
                                                        type="text"
                                                        aria-label="หลักฐานการรับเงิน"
                                                        title="หลักฐานการรับเงิน"
                                                        className="w-full p-2 text-sm border border-amber-300 rounded focus:ring-2 focus:ring-amber-500 bg-white"
                                                        value={formData.fieldSettlementEvidence || ''}
                                                        onChange={e => setFormData({ ...formData, fieldSettlementEvidence: e.target.value })}
                                                        placeholder="เลขที่บิล / รายละเอียด..."
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-amber-900 mb-1">ชื่อ-นามสกุล ผู้รับผิดชอบ</label>
                                                    <input
                                                        type="text"
                                                        aria-label="ชื่อผู้รับผิดชอบ"
                                                        title="ชื่อผู้รับผิดชอบ"
                                                        className="w-full p-2 text-sm border border-amber-300 rounded focus:ring-2 focus:ring-amber-500 bg-white"
                                                        value={formData.fieldSettlementName || ''}
                                                        onChange={e => setFormData({ ...formData, fieldSettlementName: e.target.value })}
                                                        placeholder="ชื่อ-นามสกุล"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-amber-900 mb-1">ตำแหน่ง</label>
                                                    <input
                                                        type="text"
                                                        aria-label="ตำแหน่ง"
                                                        title="ตำแหน่ง"
                                                        className="w-full p-2 text-sm border border-amber-300 rounded focus:ring-2 focus:ring-amber-500 bg-white"
                                                        value={formData.fieldSettlementPosition || ''}
                                                        onChange={e => setFormData({ ...formData, fieldSettlementPosition: e.target.value })}
                                                        placeholder="เช่น พนักงานขับรถ / พนักงานขาย"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {formData.hasCost && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in bg-amber-50 p-4 rounded-lg border border-amber-100">
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-1">สาเหตุความเสียหาย (Problem Source)</label>
                                                <select
                                                    aria-label="สาเหตุความเสียหาย"
                                                    title="สาเหตุความเสียหาย"
                                                    value={formData.problemSource || ''}
                                                    onChange={e => setFormData({ ...formData, problemSource: e.target.value })}
                                                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                >
                                                    <option value="">-- ระบุสาเหตุ --</option>
                                                    {Object.keys(RESPONSIBLE_MAPPING).map(source => (
                                                        <option key={source} value={source}>{source}</option>
                                                    ))}
                                                    <option value="Other">อื่นๆ (Other)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-1">ค่าใช้จ่าย (บาท)</label>
                                                <input
                                                    type="number"
                                                    aria-label="จำนวนเงินค่าใช้จ่าย"
                                                    title="จำนวนเงินค่าใช้จ่าย"
                                                    step="0.01"
                                                    value={formData.costAmount || ''}
                                                    onChange={e => setFormData({ ...formData, costAmount: Number(e.target.value) })}
                                                    onBlur={e => setFormData({ ...formData, costAmount: parseFloat(parseFloat(e.target.value).toFixed(2)) })}
                                                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-bold text-slate-700 mb-1">ผู้รับผิดชอบ (Responsible)</label>
                                                <input
                                                    type="text"
                                                    aria-label="ผู้รับผิดชอบ"
                                                    title="ผู้รับผิดชอบ"
                                                    value={formData.costResponsible || ''}
                                                    onChange={e => setFormData({ ...formData, costResponsible: e.target.value })}
                                                    className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-800 font-bold"
                                                    placeholder="ระบบจะระบุให้อัตโนมัติ หรือกรอกเอง"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg">ยกเลิก</button>
                    <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 flex items-center gap-2 shadow-sm">
                        <Save className="w-4 h-4" /> บันทึกการวิเคราะห์
                    </button>
                </div>
            </div>
        </div>
    );
};
