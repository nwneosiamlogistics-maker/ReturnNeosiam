import React from 'react';
import { FileText, Save, FileSpreadsheet } from 'lucide-react';
import Swal from 'sweetalert2';
import { ReturnRecord } from '../../../types';
import { BRANCH_LIST } from '../../../constants';
import { importExcelWithSwal } from './ExcelImportModal';
// Logistics Request Form
// Optimized for Inbound Collection System
// Features: Branch Selection, Header Info, Simplified Item Entry

/*
LOGISTICS STEP 1:
- Branch *
- Invoice No
- Control Date (Date)
- Doc No (R) -> refNo?
- TM No
- Customer Code, Name *
- Province, Address
- Notes
- Phone

Then Item List?
"ระบุรายละเอียดสินค้า หรือหมายเหตุอื่นๆ..." suggest a simple text area OR item list?
The "Add Item" flow is standard.
*/

interface Step1LogisticsRequestProps {
    formData: Partial<ReturnRecord>;
    requestItems: Partial<ReturnRecord>[];


    // Actions
    setFormData: React.Dispatch<React.SetStateAction<Partial<ReturnRecord>>>;
    handleRequestSubmit: (manualItems?: Partial<ReturnRecord>[]) => void;

    // Dropdown Data
    uniqueCustomers?: string[];
    uniqueDestinations?: string[];
    existingItems?: ReturnRecord[];
}

export const Step1LogisticsRequest: React.FC<Step1LogisticsRequestProps> = ({
    formData, requestItems,
    setFormData,
    handleRequestSubmit,
    uniqueCustomers = [], uniqueDestinations = [], existingItems = []
}) => {

    // Ensure Document Type is LOGISTICS
    React.useEffect(() => {
        setFormData(prev => ({ ...prev, documentType: 'LOGISTICS' }));
    }, [setFormData]);

    const updateField = (field: keyof ReturnRecord, value: ReturnRecord[keyof ReturnRecord]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleImportClick = async () => {
        try {
            const importedItems = await importExcelWithSwal(existingItems);
            if (importedItems && importedItems.length > 0) {
                // Submit items to the system
                handleRequestSubmit(importedItems);
            }
        } catch (error) {
            console.error("Import/Submit Error:", error);
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถบันทึกข้อมูลจากการ Import ได้ กรุณาลองใหม่อีกครั้ง'
            });
        }
    };

    return (
        <div className="h-full overflow-auto p-6 bg-slate-50">

            <div className="max-w-4xl mx-auto space-y-6">

                {/* Header Card */}
                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shadow-inner">
                                <FileText className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">1. ใบสั่งงานรับกลับ (Create Return Request)</h3>
                                <p className="text-sm text-slate-500">กรอกข้อมูลสำหรับใบงานรับกลับ (เฉพาะ Header)</p>
                            </div>
                        </div>
                        <button
                            onClick={handleImportClick}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 font-bold transition-colors text-sm"
                        >
                            <FileSpreadsheet className="w-4 h-4" /> Import Excel
                        </button>
                    </div>

                    <div className="space-y-6">
                        {/* 1. Branch */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">
                                สาขาที่รับสินค้ากลับ (Branch) <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <select
                                    aria-label="เลือกสาขา"
                                    title="เลือกสาขา"
                                    required
                                    value={formData.branch || ''}
                                    onChange={e => updateField('branch', e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all duration-200 hover:border-blue-300 hover:shadow-sm"
                                >
                                    <option value="" disabled>-- เลือกสาขา --</option>
                                    <option value="พิษณุโลก">พิษณุโลก</option>
                                    {(BRANCH_LIST && Array.isArray(BRANCH_LIST) ? BRANCH_LIST : ['กำแพงเพชร', 'แม่สอด', 'เชียงใหม่', 'EKP ลำปาง', 'นครสวรรค์', 'สาย 3', 'คลอง 13', 'ซีโน่', 'ประดู่']).filter(b => b !== 'พิษณุโลก').map(b => <option key={b} value={b}>{b}</option>)}
                                    <option value="Other">อื่นๆ (Other)</option>
                                </select>
                            </div>
                        </div>

                        {/* 2. Invoice | Control Date */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">เลข Invoice</label>
                                <input
                                    type="text"
                                    aria-label="เลข Invoice"
                                    title="เลข Invoice"
                                    value={formData.invoiceNo || ''}
                                    onChange={e => updateField('invoiceNo', e.target.value)}
                                    placeholder="INV-xxxx"
                                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all duration-200 hover:border-blue-300 hover:shadow-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">
                                    วันที่ใบคุมรถ (Control Date)
                                </label>
                                <input
                                    type="date"
                                    aria-label="วันที่ใบคุมรถ"
                                    title="วันที่ใบคุมรถ"
                                    value={formData.controlDate || formData.date || ''}
                                    onChange={e => {
                                        updateField('controlDate', e.target.value);
                                        updateField('date', e.target.value);
                                    }}
                                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all duration-200 hover:border-blue-300 hover:shadow-sm"
                                />
                            </div>
                        </div>

                        {/* 3. Doc No (R) | TM No */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">เลขที่เอกสาร (เลข R)</label>
                                <input
                                    type="text"
                                    aria-label="เลขที่เอกสาร"
                                    title="เลขที่เอกสาร"
                                    value={formData.documentNo || formData.refNo || ''}
                                    onChange={e => {
                                        updateField('documentNo', e.target.value);
                                        updateField('refNo', e.target.value);
                                    }}
                                    placeholder="R-xxxx"
                                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all duration-200 hover:border-blue-300 hover:shadow-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">เลขที่ใบคุม (TM NO)</label>
                                <input
                                    type="text"
                                    aria-label="เลขที่ใบคุม (TM NO)"
                                    title="เลขที่ใบคุม (TM NO)"
                                    value={formData.tmNo || ''}
                                    onChange={e => updateField('tmNo', e.target.value)}
                                    placeholder="TM-xxxx"
                                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all duration-200 hover:border-blue-300 hover:shadow-sm"
                                />
                            </div>
                        </div>

                        {/* 4. Customer Info */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">รหัสลูกค้า</label>
                                <input
                                    type="text"
                                    aria-label="รหัสลูกค้า"
                                    title="รหัสลูกค้า"
                                    value={formData.customerCode || ''}
                                    onChange={e => updateField('customerCode', e.target.value)}
                                    placeholder="CUS-xxxx"
                                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all duration-200 hover:border-blue-300 hover:shadow-sm"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-slate-700 mb-1">
                                    ลูกค้าต้นทาง (Source Customer) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    aria-label="ลูกค้าต้นทาง"
                                    title="ลูกค้าต้นทาง"
                                    required
                                    value={formData.customerName || ''}
                                    onChange={e => updateField('customerName', e.target.value)}
                                    placeholder="ระบุชื่อลูกค้าต้นทาง..."
                                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all duration-200 hover:border-blue-300 hover:shadow-sm"
                                    list="customer-list"
                                />
                                <datalist id="customer-list">
                                    {uniqueCustomers.map(c => <option key={c} value={c} />)}
                                </datalist>
                            </div>
                        </div>

                        {/* 5. Destination & Province */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">
                                    ลูกค้าปลายทาง (Destination Customer)
                                </label>
                                <input
                                    type="text"
                                    aria-label="ลูกค้าปลายทาง"
                                    title="ลูกค้าปลายทาง"
                                    value={formData.destinationCustomer || ''}
                                    onChange={e => updateField('destinationCustomer', e.target.value)}
                                    placeholder="ระบุลูกค้าปลายทาง..."
                                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all duration-200 hover:border-blue-300 hover:shadow-sm"
                                    list="destination-list"
                                />
                                <datalist id="destination-list">
                                    {uniqueDestinations.map(d => <option key={d} value={d} />)}
                                </datalist>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">จังหวัด (Province)</label>
                                <input
                                    type="text"
                                    aria-label="จังหวัด"
                                    title="จังหวัด"
                                    value={formData.province || ''}
                                    onChange={e => updateField('province', e.target.value)}
                                    placeholder="ระบุจังหวัด..."
                                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all duration-200 hover:border-blue-300 hover:shadow-sm"
                                />
                            </div>
                        </div>

                        {/* 6. Address */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">ที่อยู่ (Address)</label>
                            <textarea
                                rows={2}
                                aria-label="ที่อยู่ลูกค้า"
                                title="ที่อยู่ลูกค้า"
                                value={formData.customerAddress || ''}
                                onChange={e => updateField('customerAddress', e.target.value)}
                                placeholder="ที่อยู่ลูกค้า..."
                                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none transition-all duration-200 hover:border-blue-300 hover:shadow-sm"
                            ></textarea>
                        </div>

                        {/* 6.5 Quantity & Unit */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">จำนวน (Quantity)</label>
                                <input
                                    type="number"
                                    aria-label="จำนวน"
                                    title="จำนวน"
                                    min="1"
                                    value={formData.quantity || ''}
                                    onChange={e => updateField('quantity', parseFloat(e.target.value))}
                                    placeholder="ระบุจำนวน..."
                                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold text-blue-600 transition-all duration-200 hover:border-blue-300 hover:shadow-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">หน่วย (Unit)</label>
                                <input
                                    type="text"
                                    aria-label="หน่วย"
                                    title="หน่วย"
                                    value={formData.unit || ''}
                                    onChange={e => updateField('unit', e.target.value)}
                                    placeholder="เช่น กล่อง, พาเลท, ชิ้น..."
                                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all duration-200 hover:border-blue-300 hover:shadow-sm"
                                />
                            </div>
                        </div>

                        {/* 7. Notes & Phone */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">หมายเหตุ (Notes)</label>
                            <textarea
                                rows={3}
                                aria-label="หมายเหตุ"
                                title="หมายเหตุ"
                                value={formData.notes || ''}
                                onChange={e => updateField('notes', e.target.value)}
                                placeholder="ระบุรายละเอียดสินค้า หรือหมายเหตุอื่นๆ..."
                                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all duration-200 hover:border-blue-300 hover:shadow-sm"
                            ></textarea>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button
                                type="button"
                                onClick={() => {
                                    // 1. Validate Mandatory Fields
                                    const missingFields = [];
                                    if (!formData.branch) missingFields.push('สาขา (Branch)');
                                    // if (!formData.controlDate && !formData.date) missingFields.push('วันที่ใบคุมรถ (Control Date)');
                                    if (!formData.customerName) missingFields.push('ลูกค้าต้นทาง (Source Customer)');

                                    if (missingFields.length > 0) {
                                        Swal.fire({
                                            icon: 'warning',
                                            title: 'กรุณากรอกข้อมูลให้ครบถ้วน',
                                            text: `ขาดข้อมูล: ${missingFields.join(', ')}`,
                                            confirmButtonColor: '#f59e0b'
                                        });
                                        return;
                                    }

                                    // 2. Check for Duplicates
                                    // IRON RULE: Global Uniqueness for Document Number (R No) - CASE INSENSITIVE
                                    const rawTargetDocNo = (formData.documentNo || formData.refNo || '').trim();
                                    if (rawTargetDocNo) {
                                        const targetDocLower = rawTargetDocNo.toLowerCase();
                                        const rNoDuplicate = existingItems.some(item => {
                                            if (item.id === formData.id) return false; // Exclude self
                                            const itemDocLower = (item.documentNo || '').trim().toLowerCase();
                                            const itemRefLower = (item.refNo || '').trim().toLowerCase();
                                            return itemDocLower === targetDocLower || itemRefLower === targetDocLower;
                                        });

                                        if (rNoDuplicate) {
                                            Swal.fire({
                                                icon: 'error',
                                                title: 'ผิดกฎเหล็ก! (Duplicate R No)',
                                                html: `เลขที่เอกสาร <b>${rawTargetDocNo}</b> มีอยู่ในระบบแล้ว<br/>ไม่สามารถสร้างเลขซ้ำได้ (กฎเหล็ก: ห้ามซ้ำ)`,
                                                confirmButtonColor: '#ef4444'
                                            });
                                            return;
                                        }
                                    }

                                    // Check Invoice Duplicate (Per Branch)
                                    if (formData.invoiceNo) {
                                        const invoiceDuplicate = existingItems.some(item =>
                                            item.id !== formData.id && // Exclude self if editing
                                            item.branch === formData.branch &&
                                            item.invoiceNo === formData.invoiceNo
                                        );

                                        if (invoiceDuplicate) {
                                            Swal.fire({
                                                icon: 'error',
                                                title: 'พบเลขอินวอยซ์ซ้ำ',
                                                text: `เลข Invoice: ${formData.invoiceNo} มีอยู่ในระบบแล้วสำหรับสาขา ${formData.branch}`,
                                                confirmButtonColor: '#ef4444'
                                            });
                                            return;
                                        }
                                    }

                                    // 3. Allow Submission
                                    if (requestItems.length === 0) {
                                        const dummyItem = {
                                            ...formData,
                                            productName: 'General Request',
                                            quantity: formData.quantity || 1,
                                            unit: formData.unit || 'Lot'
                                        };
                                        handleRequestSubmit([dummyItem]);
                                    } else {
                                        handleRequestSubmit();
                                    }
                                }}
                                className="px-8 py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all flex items-center gap-2"
                            >
                                <Save className="w-5 h-5" /> บันทึกใบงานรับกลับ (Create Request)
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div >
    );
};
