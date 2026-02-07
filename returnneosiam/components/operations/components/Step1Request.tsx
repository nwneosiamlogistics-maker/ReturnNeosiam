import React, { useState } from 'react';
import { Inbox, MapPin, CheckCircle, PlusCircle, Trash2, X, Search, Package, FileText, Edit3, Save } from 'lucide-react';
import { ReturnRecord } from '../../../types';
import { PreliminaryDecisionModal } from './PreliminaryDecisionModal';
import Swal from 'sweetalert2';

// Sub-components for NCR Form
import { HeaderSection } from './sections/HeaderSection';
import { FounderInfoSection } from './sections/FounderInfoSection';
import { ProductFormSection } from './sections/ProductFormSection';
import { ProblemDetailsSection } from './sections/ProblemDetailsSection';
import { ActionSection } from './sections/ActionSection';
import { RootCauseSection } from './sections/RootCauseSection';
import { CostSection } from './sections/CostSection';

interface Step1RequestProps {
    formData: Partial<ReturnRecord>;
    requestItems: Partial<ReturnRecord>[];
    isCustomBranch: boolean;
    uniqueCustomers: string[];
    uniqueDestinations: string[];
    uniqueFounders: string[];
    uniqueProductCodes: string[];
    uniqueProductNames: string[];
    initialData?: Partial<ReturnRecord> | null;
    setFormData: React.Dispatch<React.SetStateAction<Partial<ReturnRecord>>>;
    setIsCustomBranch: (val: boolean) => void;
    setRequestItems: React.Dispatch<React.SetStateAction<Partial<ReturnRecord>[]>>;
    handleAddItem: (e: React.FormEvent | null, overrideData?: Partial<ReturnRecord>) => void;
    handleRemoveItem: (index: number) => void;
    handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleRemoveImage: (index: number) => void;
    handleRequestSubmit: () => void;
}

export const Step1Request: React.FC<Step1RequestProps> = ({
    formData, requestItems, isCustomBranch,
    uniqueCustomers, uniqueDestinations, uniqueFounders, uniqueProductCodes, uniqueProductNames,
    setFormData, setIsCustomBranch, setRequestItems,
    handleAddItem, handleRemoveItem, handleImageUpload, handleRemoveImage, handleRequestSubmit
}) => {
    const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showDecisionModal, setShowDecisionModal] = useState(false);
    const [pendingItemData, setPendingItemData] = useState<Partial<ReturnRecord> | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const filteredItems = React.useMemo(() => {
        if (!searchQuery.trim()) return requestItems;
        const q = searchQuery.toLowerCase();
        return requestItems.filter(item =>
            (item.productName?.toLowerCase().includes(q)) ||
            (item.productCode?.toLowerCase().includes(q)) ||
            (item.customerName?.toLowerCase().includes(q)) ||
            (item.refNo?.toLowerCase().includes(q))
        );
    }, [requestItems, searchQuery]);

    const selectItem = (index: number) => {
        setSelectedItemIndex(index);
        const item = requestItems[index];
        setFormData(prev => ({ ...prev, ...item }));
    };

    const startNewItem = () => {
        setSelectedItemIndex(null);
        setFormData({
            date: formData.date,
            branch: formData.branch,
            founder: formData.founder,
            documentType: 'NCR'
        });
    };

    const handleDeleteItem = async (index: number) => {
        const result = await Swal.fire({
            title: 'ยืนยันการลบ',
            text: 'คุณต้องการลบรายการนี้ใช่หรือไม่?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ลบ',
            cancelButtonText: 'ยกเลิก'
        });

        if (result.isConfirmed) {
            handleRemoveItem(index);
            if (selectedItemIndex === index) {
                setSelectedItemIndex(null);
            } else if (selectedItemIndex !== null && selectedItemIndex > index) {
                setSelectedItemIndex(selectedItemIndex - 1);
            }
            Swal.fire({
                icon: 'success',
                title: 'ลบรายการแล้ว',
                timer: 1000,
                showConfirmButton: false
            });
        }
    };

    const updateField = (field: keyof ReturnRecord, value: ReturnRecord[keyof ReturnRecord]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleCheckboxToggle = (field: keyof ReturnRecord, resetFields: (keyof ReturnRecord)[] = []) => {
        setFormData(prev => {
            const isChecked = prev[field] as boolean;
            const newState: Partial<ReturnRecord> = { [field]: !isChecked };
            if (!isChecked && resetFields.length > 0) {
                resetFields.forEach(f => (newState as Record<string, unknown>)[f] = false);
            }
            return { ...prev, ...newState };
        });
    };

    const validateItem = (): boolean => {
        if (!formData.quantity || formData.quantity <= 0) {
            Swal.fire({
                icon: 'warning',
                title: 'ข้อมูลไม่ถูกต้อง',
                text: 'กรุณาระบุจำนวนสินค้าให้ถูกต้อง (> 0)'
            });
            return false;
        }

        if (!formData.productName && !formData.productCode) {
            Swal.fire({
                icon: 'warning',
                title: 'ข้อมูลไม่ถูกต้อง',
                text: 'กรุณาระบุสินค้า'
            });
            return false;
        }

        const hasProblem = formData.problemDamaged || formData.problemDamagedInBox || formData.problemLost || formData.problemMixed ||
            formData.problemWrongInv || formData.problemLate || formData.problemDuplicate || formData.problemWrong ||
            formData.problemIncomplete || formData.problemOver || formData.problemWrongInfo || formData.problemShortExpiry ||
            formData.problemTransportDamage || formData.problemAccident || formData.problemPOExpired || formData.problemNoBarcode ||
            formData.problemNotOrdered || formData.problemOther;

        if (!hasProblem) {
            Swal.fire({
                icon: 'warning',
                title: 'ข้อมูลไม่ครบถ้วน',
                text: 'กรุณาเลือกปัญหาที่พบอย่างน้อย 1 รายการ'
            });
            return false;
        }

        if (!formData.problemAnalysis) {
            Swal.fire({
                icon: 'warning',
                title: 'ข้อมูลไม่ครบถ้วน',
                text: 'กรุณาระบุแหล่งที่มาของปัญหา (Problem Source)'
            });
            return false;
        }

        return true;
    };

    const onAddItemClick = () => {
        if (!validateItem()) return;
        setPendingItemData(formData);
        setShowDecisionModal(true);
    };

    const handleDecisionConfirm = (decision: string, route?: string, settlementData?: {
        isFieldSettled?: boolean;
        amount?: number;
        evidence?: string;
        name?: string;
        position?: string;
    }) => {
        if (pendingItemData) {
            const itemWithDecision = {
                ...pendingItemData,
                preliminaryDecision: decision as 'Return' | 'Sell' | 'Scrap' | 'Internal' | 'Claim',
                preliminaryRoute: route || '',
                isFieldSettled: settlementData?.isFieldSettled || false,
                fieldSettlementAmount: settlementData?.amount || 0,
                fieldSettlementEvidence: settlementData?.evidence || '',
                fieldSettlementName: settlementData?.name || '',
                fieldSettlementPosition: settlementData?.position || ''
            };

            if (selectedItemIndex !== null) {
                setRequestItems(prev => {
                    const newList = [...prev];
                    newList[selectedItemIndex] = itemWithDecision;
                    return newList;
                });
                Swal.fire({
                    icon: 'success',
                    title: 'อัปเดตรายการแล้ว',
                    timer: 1000,
                    showConfirmButton: false
                });
            } else {
                handleAddItem(null, itemWithDecision);
            }
            setPendingItemData(null);
            setShowDecisionModal(false);
            startNewItem();
        }
    };

    const handleSaveChanges = () => {
        if (!validateItem()) return;
        setPendingItemData(formData);
        setShowDecisionModal(true);
    };

    const onSubmitAll = async () => {
        if (requestItems.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'ไม่มีรายการสินค้า',
                text: 'กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ'
            });
            return;
        }

        const result = await Swal.fire({
            title: 'ยืนยันการบันทึก',
            text: `บันทึก NCR ทั้งหมด ${requestItems.length} รายการ?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'บันทึก',
            cancelButtonText: 'ยกเลิก'
        });

        if (result.isConfirmed) {
            setIsSubmitting(true);
            try {
                handleRequestSubmit();
                setIsSubmitting(false);
                setSelectedItemIndex(null);
                setFormData({ documentType: 'NCR' });
            } catch {
                setIsSubmitting(false);
            }
        }
    };

    return (
        <div className="h-full flex">
            <PreliminaryDecisionModal
                isOpen={showDecisionModal}
                onClose={() => setShowDecisionModal(false)}
                onConfirm={handleDecisionConfirm}
            />

            {/* Left Sidebar */}
            <div className="w-80 border-r border-slate-700 bg-slate-800 flex flex-col">
                <div className="p-4 border-b border-slate-700 font-bold text-slate-200 flex justify-between items-center">
                    <span>รายการสินค้า ({requestItems.length})</span>
                    <FileText className="w-4 h-4 text-indigo-400" />
                </div>

                <div className="p-2 border-b border-slate-700 bg-slate-700/50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                        <input
                            type="text"
                            placeholder="ค้นหาสินค้า..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-700 border border-slate-600 rounded text-slate-200 placeholder-slate-400 focus:ring-1 focus:ring-indigo-400 outline-none"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                                title="ล้างการค้นหา"
                                aria-label="ล้างการค้นหา"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="p-2 border-b border-slate-700">
                    <button
                        onClick={startNewItem}
                        className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                            selectedItemIndex === null
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600'
                        }`}
                    >
                        <PlusCircle className="w-4 h-4" /> เพิ่มรายการใหม่
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {filteredItems.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 text-xs italic">
                            {requestItems.length === 0 ? (
                                <div className="flex flex-col items-center">
                                    <Inbox className="w-8 h-8 mb-2 opacity-50" />
                                    <span>ยังไม่มีรายการสินค้า</span>
                                </div>
                            ) : 'ไม่พบรายการที่ค้นหา'}
                        </div>
                    ) : (
                        filteredItems.map((item) => {
                            const originalIndex = requestItems.indexOf(item);
                            const isSelected = selectedItemIndex === originalIndex;
                            return (
                                <div
                                    key={originalIndex}
                                    className={`bg-slate-700 rounded-lg border transition-all overflow-hidden ${
                                        isSelected
                                            ? 'border-indigo-500 shadow-md ring-1 ring-indigo-900/50'
                                            : 'border-slate-600 hover:border-slate-500'
                                    }`}
                                >
                                    <div
                                        onClick={() => selectItem(originalIndex)}
                                        className={`p-3 cursor-pointer transition-colors ${
                                            isSelected ? 'bg-indigo-900/30' : 'hover:bg-slate-600'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-xs font-bold text-slate-200 truncate max-w-[70%]">
                                                {item.productCode || 'ไม่ระบุรหัส'}
                                            </span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteItem(originalIndex);
                                                }}
                                                className="text-slate-400 hover:text-red-400 p-1 rounded"
                                                title="ลบรายการ"
                                                aria-label="ลบรายการ"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                        <div className="text-sm font-medium text-slate-100 truncate mb-1">
                                            {item.productName || 'ไม่ระบุชื่อสินค้า'}
                                        </div>
                                        <div className="flex justify-between items-center text-xs text-slate-400">
                                            <span>{item.quantity} {item.unit}</span>
                                            {item.preliminaryDecision && (
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                                    item.preliminaryDecision === 'Return' ? 'bg-blue-900/50 text-blue-300' :
                                                    item.preliminaryDecision === 'Sell' ? 'bg-green-900/50 text-green-300' :
                                                    item.preliminaryDecision === 'Scrap' ? 'bg-red-900/50 text-red-300' :
                                                    item.preliminaryDecision === 'Internal' ? 'bg-amber-900/50 text-amber-300' :
                                                    'bg-orange-900/50 text-orange-300'
                                                }`}>
                                                    {item.preliminaryDecision === 'Return' ? 'คืน' :
                                                     item.preliminaryDecision === 'Sell' ? 'ขาย' :
                                                     item.preliminaryDecision === 'Scrap' ? 'ทำลาย' :
                                                     item.preliminaryDecision === 'Internal' ? 'ใช้ใน' : 'เคลม'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="p-3 border-t border-slate-700 bg-slate-800">
                    <div className="flex justify-between items-center text-xs text-slate-400">
                        <span>รวม {requestItems.length} รายการ</span>
                        {requestItems.length > 0 && (
                            <button
                                onClick={onSubmitAll}
                                disabled={isSubmitting}
                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-colors disabled:opacity-50"
                            >
                                <Save className="w-3 h-3" />
                                {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก NCR'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Panel */}
            <div className="flex-1 overflow-y-auto bg-slate-900 p-8">
                {selectedItemIndex === null ? (
                    <div className="max-w-4xl mx-auto space-y-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-indigo-600 rounded-xl shadow-lg">
                                <PlusCircle className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-100">เพิ่มรายการสินค้าใหม่</h2>
                                <p className="text-sm text-slate-400">กรอกข้อมูลสินค้าที่พบปัญหา</p>
                            </div>
                        </div>

                        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-indigo-400" /> ข้อมูลเอกสาร
                            </h3>
                            <HeaderSection
                                formData={formData}
                                updateField={updateField}
                                isCustomBranch={isCustomBranch}
                                setIsCustomBranch={setIsCustomBranch}
                            />
                        </div>

                        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-blue-400" /> ข้อมูลผู้แจ้ง
                            </h3>
                            <FounderInfoSection
                                formData={formData}
                                updateField={updateField}
                                uniqueCustomers={uniqueCustomers}
                                uniqueDestinations={uniqueDestinations}
                                uniqueFounders={uniqueFounders}
                            />
                        </div>

                        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                                <Package className="w-4 h-4 text-amber-400" /> ข้อมูลสินค้าและปัญหา
                            </h3>
                            <ProductFormSection
                                formData={formData}
                                updateField={updateField}
                                uniqueProductCodes={uniqueProductCodes}
                                uniqueProductNames={uniqueProductNames}
                            />
                            <div className="mt-6 pt-6 border-t border-slate-700">
                                <ProblemDetailsSection
                                    formData={formData}
                                    updateField={updateField}
                                    handleCheckboxToggle={handleCheckboxToggle}
                                    handleImageUpload={handleImageUpload}
                                    handleRemoveImage={handleRemoveImage}
                                />
                            </div>
                        </div>

                        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-400" /> การดำเนินการและค่าใช้จ่าย
                            </h3>
                            <ActionSection
                                formData={formData}
                                updateField={updateField}
                                handleCheckboxToggle={handleCheckboxToggle}
                            />
                            <div className="mt-6 pt-6 border-t border-slate-700">
                                <RootCauseSection
                                    formData={formData}
                                    updateField={updateField}
                                    handleCheckboxToggle={handleCheckboxToggle}
                                />
                            </div>
                            <div className="mt-6 pt-6 border-t border-slate-700">
                                <CostSection
                                    formData={formData}
                                    updateField={updateField}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button
                                onClick={onAddItemClick}
                                className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg flex items-center gap-2 transition-all"
                            >
                                <PlusCircle className="w-5 h-5" />
                                เพิ่มรายการ (ระบุเส้นทาง)
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="max-w-4xl mx-auto space-y-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-amber-600 rounded-xl shadow-lg">
                                    <Edit3 className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-100">แก้ไขรายการสินค้า</h2>
                                    <p className="text-sm text-slate-400">แก้ไขข้อมูลสินค้ารายการที่ {selectedItemIndex + 1}</p>
                                </div>
                            </div>
                            <button
                                onClick={startNewItem}
                                className="text-slate-400 hover:text-slate-200 flex items-center gap-1 text-sm"
                            >
                                <X className="w-4 h-4" /> ยกเลิก
                            </button>
                        </div>

                        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-indigo-400" /> ข้อมูลเอกสาร
                            </h3>
                            <HeaderSection
                                formData={formData}
                                updateField={updateField}
                                isCustomBranch={isCustomBranch}
                                setIsCustomBranch={setIsCustomBranch}
                            />
                        </div>

                        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-blue-400" /> ข้อมูลผู้แจ้ง
                            </h3>
                            <FounderInfoSection
                                formData={formData}
                                updateField={updateField}
                                uniqueCustomers={uniqueCustomers}
                                uniqueDestinations={uniqueDestinations}
                                uniqueFounders={uniqueFounders}
                            />
                        </div>

                        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                                <Package className="w-4 h-4 text-amber-400" /> ข้อมูลสินค้าและปัญหา
                            </h3>
                            <ProductFormSection
                                formData={formData}
                                updateField={updateField}
                                uniqueProductCodes={uniqueProductCodes}
                                uniqueProductNames={uniqueProductNames}
                            />
                            <div className="mt-6 pt-6 border-t border-slate-700">
                                <ProblemDetailsSection
                                    formData={formData}
                                    updateField={updateField}
                                    handleCheckboxToggle={handleCheckboxToggle}
                                    handleImageUpload={handleImageUpload}
                                    handleRemoveImage={handleRemoveImage}
                                />
                            </div>
                        </div>

                        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-400" /> การดำเนินการและค่าใช้จ่าย
                            </h3>
                            <ActionSection
                                formData={formData}
                                updateField={updateField}
                                handleCheckboxToggle={handleCheckboxToggle}
                            />
                            <div className="mt-6 pt-6 border-t border-slate-700">
                                <RootCauseSection
                                    formData={formData}
                                    updateField={updateField}
                                    handleCheckboxToggle={handleCheckboxToggle}
                                />
                            </div>
                            <div className="mt-6 pt-6 border-t border-slate-700">
                                <CostSection
                                    formData={formData}
                                    updateField={updateField}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <button
                                onClick={startNewItem}
                                className="px-6 py-3 bg-slate-700 text-slate-300 rounded-xl font-bold hover:bg-slate-600 transition-all"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleSaveChanges}
                                className="px-8 py-3 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 shadow-lg flex items-center gap-2 transition-all"
                            >
                                <Save className="w-5 h-5" />
                                บันทึกการแก้ไข
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
