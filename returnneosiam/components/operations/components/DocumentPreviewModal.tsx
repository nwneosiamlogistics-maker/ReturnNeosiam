import React, { useState } from 'react';
import { FileText, Edit3, Printer, CheckCircle, X, FileSpreadsheet } from 'lucide-react';
import { ThaiBahtText, getISODetails, calculateTotal } from '../utils';
import Swal from 'sweetalert2';

interface DocumentPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    docData: any;
    docConfig: any;
    setDocConfig: (config: any) => void;
    isDocEditable: boolean;
    setIsDocEditable: (val: boolean) => void;
    includeVat: boolean;
    setIncludeVat: (val: boolean) => void;
    vatRate: number;
    setVatRate: (val: number) => void;
    includeDiscount: boolean;
    setIncludeDiscount: (val: boolean) => void;
    discountRate: number;
    setDiscountRate: (val: number) => void;
    handleConfirmDocGeneration: () => void;
    onUpdateItem: (id: string, updates: any) => void;
    isSubmitting?: boolean;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
    isOpen, onClose, docData, docConfig, setDocConfig,
    isDocEditable, setIsDocEditable,
    includeVat, setIncludeVat, vatRate, setVatRate,
    includeDiscount, setIncludeDiscount, discountRate, setDiscountRate,
    handleConfirmDocGeneration,
    onUpdateItem,
    isSubmitting = false
}) => {
    const [editingPrices, setEditingPrices] = useState<Record<string, number>>({});
    const [editingDiscounts, setEditingDiscounts] = useState<Record<string, number>>({});

    if (!isOpen || !docData) return null;

    const effectiveItems = docData.items.map((item: any) => {
        let newPrice = item.pricePerUnit;
        if (editingPrices[item.id] !== undefined) {
            newPrice = editingPrices[item.id];
        }

        let itemDiscount = item.discountPercent || 0;
        // If "Include Discount" is unchecked, effectively 0 discount for processing calculation, 
        // BUT if it IS checked, we use the value.
        // Wait, if users uncheck the box, it should probably clear discounts? 
        // For now, let's say if box is checked, we use the discount.
        if (includeDiscount) {
            if (editingDiscounts[item.id] !== undefined) {
                itemDiscount = editingDiscounts[item.id];
            } else if (item.discountPercent === undefined && discountRate > 0) {
                // Fallback to global rate if not set explicitly per item yet
                itemDiscount = discountRate;
            }
        } else {
            itemDiscount = 0;
        }

        return {
            ...item,
            pricePerUnit: newPrice,
            priceBill: newPrice * (item.quantity || 1),
            discountPercent: itemDiscount // Pass down for display/calc
        };
    });

    // Custom Calculation for Item-Level Discount
    const calculateCustomTotal = (items: any[], hasVat: boolean, vatRate: number) => {
        let subtotal = 0;
        let totalDiscount = 0;

        items.forEach(item => {
            const amount = item.priceBill || 0;
            const discount = amount * ((item.discountPercent || 0) / 100);
            subtotal += amount;
            totalDiscount += discount;
        });

        const afterDiscount = subtotal - totalDiscount;
        const vat = hasVat ? afterDiscount * (vatRate / 100) : 0;
        const net = afterDiscount + vat;

        return { subtotal, discount: totalDiscount, afterDiscount, vat, net };
    };

    const totals = calculateCustomTotal(effectiveItems, includeVat, vatRate);

    const handleExportExcel = () => {
        const title = docConfig.titleTH || getISODetails(docData.type).th;
        const company = docConfig.companyNameTH;
        const details = getISODetails(docData.type);

        let html = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta charset="UTF-8">
                <!--[if gte mso 9]>
                <xml>
                    <x:ExcelWorkbook>
                        <x:ExcelWorksheets>
                            <x:ExcelWorksheet>
                                <x:Name>${title}</x:Name>
                                <x:WorksheetOptions>
                                    <x:DisplayGridlines/>
                                </x:WorksheetOptions>
                            </x:ExcelWorksheet>
                        </x:ExcelWorksheets>
                    </x:ExcelWorkbook>
                </xml>
                <![endif]-->
                <style>
                    th { font-weight: bold; background-color: #f0f0f0; border: 1px solid #000; padding: 5px; }
                    td { border: 1px solid #000; padding: 5px; }
                    .num { text-align: right; }
                    .center { text-align: center; }
                </style>
            </head>
            <body>
                <h2>${company}</h2>
                <h3>${title}</h3>
                <p>Document No: ${details.code} (${details.rev})</p>
                <p>Date: ${new Date().toLocaleDateString('th-TH')}</p>
                
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>รหัสสินค้า</th>
                            <th>รายการสินค้า</th>
                            <th>จำนวน</th>
                            <th>หน่วย</th>
                            <th>ราคา/หน่วย</th>
                            <th>รวมเงิน</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${docData.items.map((item: any, i: number) => `
                            <tr>
                                <td class="center">${i + 1}</td>
                                <td style="mso-number-format:'\@'">${item.productCode}</td>
                                <td>${item.productName}</td>
                                <td class="center">${item.quantity}</td>
                                <td class="center">${item.unit}</td>
                                <td class="num">${(item.priceBill || 0).toFixed(2)}</td>
                                <td class="num">${((item.priceBill || 0) * item.quantity).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                        <tr>
                            <td colspan="6" class="num" style="font-weight:bold;">รวมเป็นเงิน (Subtotal)</td>
                            <td class="num" style="font-weight:bold;">${totals.subtotal.toFixed(2)}</td>
                        </tr>
                        ${includeDiscount ? `
                        <tr>
                            <td colspan="6" class="num">ส่วนลด (Discount ${discountRate}%)</td>
                            <td class="num" style="color:red;">-${totals.discount.toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td colspan="6" class="num" style="font-weight:bold;">ยอดหลังหักส่วนลด (After Discount)</td>
                            <td class="num" style="font-weight:bold;">${totals.afterDiscount.toFixed(2)}</td>
                        </tr>
                        ` : ''}
                        ${includeVat ? `
                        <tr>
                            <td colspan="6" class="num">ภาษีมูลค่าเพิ่ม (VAT ${vatRate}%)</td>
                            <td class="num">${totals.vat.toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td colspan="6" class="num" style="font-weight:bold;">ยอดสุทธิ (Net Total)</td>
                            <td class="num" style="font-weight:bold;">${totals.net.toFixed(2)}</td>
                        </tr>
                        ` : ''}
                    </tbody>
                </table>
            </body>
            </html>
        `;

        const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${details.code}_${new Date().toISOString().split('T')[0]}.xls`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex flex-col animate-fade-in text-slate-900 overflow-hidden">
            {/* Toolbar */}
            <div className="bg-slate-800 text-white p-4 flex justify-between items-center shadow-md print:hidden w-full z-10">
                <h3 className="font-bold text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-400" /> ตัวอย่างเอกสาร (Print Preview)
                </h3>
                <div className="flex items-center gap-3">
                    {/* Discount Controls */}
                    <div className="flex items-center gap-2 bg-slate-700 rounded-lg px-2 py-1 border border-slate-600">
                        <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                            <input type="checkbox" checked={includeDiscount} onChange={e => setIncludeDiscount(e.target.checked)} className="rounded text-blue-500 focus:ring-blue-500 bg-slate-600 border-slate-500" />
                            <span className={includeDiscount ? 'text-white' : 'text-slate-400'}>ส่วนลด</span>
                        </label>
                        {includeDiscount && (
                            <div className="flex items-center gap-1 border-l border-slate-600 pl-2">
                                <span className="text-[10px] text-slate-400 mr-1">All:</span>
                                <input
                                    type="number"
                                    aria-label="ส่วนลดเปอร์เซ็นต์"
                                    title="ส่วนลดเปอร์เซ็นต์"
                                    value={discountRate}
                                    onChange={e => {
                                        const val = Number(e.target.value);
                                        setDiscountRate(val);
                                        // Update all items in view to this rate if they don't have custom? 
                                        // Or just batch update everything? User expects bulk edit probably.
                                        const newDiscounts: Record<string, number> = {};
                                        effectiveItems.forEach((item: any) => {
                                            newDiscounts[item.id] = val;
                                        });
                                        setEditingDiscounts(prev => ({ ...prev, ...newDiscounts }));
                                    }}
                                    className="w-12 bg-slate-800 border border-slate-500 rounded px-1 text-center text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none"
                                    min="0" max="100"
                                />
                                <span className="text-xs text-slate-400">%</span>
                            </div>
                        )}
                    </div>

                    {/* VAT Controls */}
                    <div className="flex items-center gap-2 bg-slate-700 rounded-lg px-2 py-1 border border-slate-600">
                        <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                            <input type="checkbox" checked={includeVat} onChange={e => setIncludeVat(e.target.checked)} className="rounded text-blue-500 focus:ring-blue-500 bg-slate-600 border-slate-500" />
                            <span className={includeVat ? 'text-white' : 'text-slate-400'}>คิด VAT</span>
                        </label>
                        {includeVat && (
                            <div className="flex items-center gap-1 border-l border-slate-600 pl-2">
                                <input
                                    type="number"
                                    aria-label="อัตราภาษีมูลค่าเพิ่ม"
                                    title="อัตราภาษีมูลค่าเพิ่ม"
                                    value={vatRate}
                                    onChange={e => setVatRate(Number(e.target.value))}
                                    className="w-12 bg-slate-800 border border-slate-500 rounded px-1 text-center text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none"
                                    min="0" max="100"
                                />
                                <span className="text-xs text-slate-400">%</span>
                            </div>
                        )}
                    </div>

                    <div className="h-6 w-px bg-slate-600 mx-2"></div>

                    <button onClick={() => setIsDocEditable(!isDocEditable)} className={`px-3 py-1.5 text-xs font-bold rounded-lg border flex items-center gap-1 transition-all ${isDocEditable ? 'bg-amber-500 border-amber-500 text-white' : 'bg-transparent border-slate-600 text-slate-300 hover:border-slate-400'}`}>
                        <Edit3 className="w-3 h-3" /> {isDocEditable ? 'Editing Mode' : 'Edit Header'}
                    </button>

                    <button onClick={handleExportExcel} className="px-3 py-2 bg-green-700 text-white rounded-lg hover:bg-green-600 font-bold text-sm flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4" /> Excel
                    </button>

                    <button onClick={() => window.print()} className="px-4 py-2 bg-white text-slate-900 rounded-lg hover:bg-slate-100 font-bold text-sm flex items-center gap-2">
                        <Printer className="w-4 h-4" /> พิมพ์
                    </button>

                    <button
                        disabled={isSubmitting}
                        onClick={async () => {
                            const result = await Swal.fire({
                                title: 'ยืนยันการบันทึก',
                                text: 'ยืนยันการบันทึกข้อมูลและสร้างเอกสาร? (Confirm Save & Generate Document)',
                                icon: 'question',
                                showCancelButton: true,
                                confirmButtonText: 'ยืนยัน (Confirm)',
                                cancelButtonText: 'ยกเลิก (Cancel)'
                            });

                            if (result.isConfirmed) {
                                handleConfirmDocGeneration();
                            }
                        }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-wait">
                        {isSubmitting ? (
                            <>⏳ กำลังบันทึก...</>
                        ) : (
                            <><CheckCircle className="w-4 h-4" /> บันทึก</>
                        )}
                    </button>

                    <button onClick={onClose} aria-label="Close" title="ปิด" className="ml-2 p-2 hover:bg-slate-700 rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Document Content */}
            <div className="flex-1 overflow-auto bg-slate-100 p-8 print:p-0 print:bg-white print:overflow-visible">
                <div className="bg-white shadow-lg mx-auto max-w-[210mm] min-h-[297mm] p-[15mm] print:shadow-none print:w-full print:max-w-none print:p-0 relative">

                    {/* Header */}
                    <div className="flex border-b-2 border-slate-800 pb-4 mb-6">
                        <div className="w-[100px] h-[100px] flex items-center justify-center mr-6">
                            <img src="/logo.png" alt="Neo Siam Logo" className="max-w-full max-h-full object-contain" />
                        </div>
                        <div className="flex-1">
                            {isDocEditable ? (
                                <div className="space-y-1">
                                    <input aria-label="ชื่อบริษัท (TH)" title="ชื่อบริษัท (TH)" value={docConfig.companyNameTH} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDocConfig({ ...docConfig, companyNameTH: e.target.value })} className="w-full text-lg font-bold border rounded px-1" />
                                    <input aria-label="ชื่อบริษัท (EN)" title="ชื่อบริษัท (EN)" value={docConfig.companyNameEN} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDocConfig({ ...docConfig, companyNameEN: e.target.value })} className="w-full text-sm border rounded px-1" />
                                    <input aria-label="ที่อยู่" title="ที่อยู่" value={docConfig.address} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDocConfig({ ...docConfig, address: e.target.value })} className="w-full text-xs text-slate-600 border rounded px-1" />
                                    <input aria-label="ข้อมูลติดต่อ" title="ข้อมูลติดต่อ" value={docConfig.contact} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDocConfig({ ...docConfig, contact: e.target.value })} className="w-full text-xs text-slate-600 border rounded px-1" />
                                </div>
                            ) : (
                                <>
                                    <h1 className="text-xl font-bold text-slate-800">{docConfig.companyNameTH}</h1>
                                    <h2 className="text-sm font-bold text-slate-600">{docConfig.companyNameEN}</h2>
                                    <p className="text-xs text-slate-500 mt-1">{docConfig.address}</p>
                                    <p className="text-xs text-slate-500">{docConfig.contact}</p>
                                </>
                            )}
                        </div>
                        <div className="text-right">
                            <div className="border inline-block px-4 py-2 rounded text-center mb-2">
                                <div className="text-[10px] text-slate-500">Document No.</div>
                                <div className="font-bold font-mono text-lg">{getISODetails(docData.type).code}</div>
                            </div>
                            <div className="text-xs text-slate-500">Date: {new Date().toLocaleDateString('th-TH')}</div>
                        </div>
                    </div>

                    {/* Title */}
                    <div className="text-center mb-8">
                        {isDocEditable ? (
                            <input aria-label="ชื่อเอกสาร (TH)" title="ชื่อเอกสาร (TH)" value={docConfig.titleTH} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDocConfig({ ...docConfig, titleTH: e.target.value })} className="text-CENTER text-2xl font-bold border rounded px-2 w-full mb-1" />
                        ) : (
                            <h2 className="text-2xl font-bold uppercase border-b border-black inline-block px-8 pb-1">{docConfig.titleTH || getISODetails(docData.type).th}</h2>
                        )}
                        <p className="text-sm text-slate-500 mt-1 uppercase tracking-wide">{docConfig.titleEN || getISODetails(docData.type).en}</p>
                    </div>

                    {/* Info Block */}
                    <div className="mb-6 text-sm">
                        <div className="p-4 border rounded-lg print:border-none print:p-0">
                            <div className="grid grid-cols-1 gap-4 leading-loose">
                                <div className="flex items-end border-b border-dotted border-slate-400 pb-1">
                                    <span className="font-bold w-[60px]">เรียน:</span>
                                    <span className="flex-1 px-2 text-slate-800"></span>
                                </div>
                                <div className="flex items-end border-b border-dotted border-slate-400 pb-1">
                                    <span className="font-bold w-[60px]">ผ่าน:</span>
                                    <span className="flex-1 px-2 text-slate-800"></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <table className="w-full border-collapse border border-slate-800 text-sm mb-6">
                        <thead>
                            <tr className="bg-slate-100 print:bg-slate-200 text-center">
                                <th className="border border-slate-800 p-2 w-10">#</th>
                                <th className="border border-slate-800 p-2 w-[120px]">รหัสสินค้า</th>
                                <th className="border border-slate-800 p-2">รายการสินค้า</th>
                                <th className="border border-slate-800 p-2 w-[80px]">จำนวน</th>
                                <th className="border border-slate-800 p-2 w-[60px]">หน่วย</th>
                                <th className="border border-slate-800 p-2 w-[100px]">สภาพ</th>
                                <th className="border border-slate-800 p-2 w-[100px]">ราคา/หน่วย</th>
                                {includeDiscount && <th className="border border-slate-800 p-2 w-[80px]">ส่วนลด %</th>}
                                <th className="border border-slate-800 p-2 w-[100px]">รวมเงิน</th>
                            </tr>
                        </thead>
                        <tbody>
                            {effectiveItems.map((item: any, idx: number) => {
                                const itemTotal = (item.priceBill || 0);
                                const itemDiscount = itemTotal * ((item.discountPercent || 0) / 100);
                                // const itemNet = itemTotal - itemDiscount;

                                return (
                                    <tr key={idx}>
                                        <td className="border border-slate-800 p-2 text-center">{idx + 1}</td>
                                        <td className="border border-slate-800 p-2">{item.productCode}</td>
                                        <td className="border border-slate-800 p-2">
                                            <div>{item.productName}</div>
                                            <div className="text-[10px] text-slate-500">Ref: {item.refNo}</div>
                                        </td>
                                        <td className="border border-slate-800 p-2 text-center font-bold">{item.quantity}</td>
                                        <td className="border border-slate-800 p-2 text-center">{item.unit}</td>
                                        <td className="border border-slate-800 p-2 text-center text-xs">{item.condition}</td>
                                        <td className="border border-slate-800 p-2 text-right">
                                            {isDocEditable ? (
                                                <input
                                                    type="number"
                                                    aria-label="ราคาต่อหน่วย"
                                                    title="ราคาต่อหน่วย"
                                                    className="w-full text-right bg-transparent border-b border-dashed border-gray-300 focus:border-blue-500 outline-none text-sm font-bold print:border-none"
                                                    value={item.pricePerUnit ?? ((item.priceBill || 0) / (item.quantity || 1))}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value);
                                                        setEditingPrices(prev => ({ ...prev, [item.id]: isNaN(val) ? 0 : val }));
                                                    }}
                                                    onBlur={(e) => {
                                                        const val = parseFloat(e.target.value);
                                                        onUpdateItem(item.id, {
                                                            pricePerUnit: val,
                                                            priceBill: val * (item.quantity || 1)
                                                        });
                                                    }}
                                                />
                                            ) : (
                                                (item.pricePerUnit ?? ((item.priceBill || 0) / (item.quantity || 1))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                            )}
                                        </td>
                                        {includeDiscount && (
                                            <td className="border border-slate-800 p-2 text-right">
                                                {isDocEditable ? (
                                                    <div className="flex items-center justify-end gap-1">
                                                        <input
                                                            type="number"
                                                            aria-label="ส่วนลด %"
                                                            className="w-12 text-right bg-transparent border-b border-dashed border-gray-300 focus:border-blue-500 outline-none text-sm font-bold print:border-none"
                                                            value={item.discountPercent || 0}
                                                            onChange={(e) => {
                                                                const val = parseFloat(e.target.value);
                                                                setEditingDiscounts(prev => ({ ...prev, [item.id]: isNaN(val) ? 0 : val }));
                                                            }}
                                                            onBlur={(e) => {
                                                                const val = parseFloat(e.target.value);
                                                                onUpdateItem(item.id, { discountPercent: val });
                                                            }}
                                                        />
                                                        <span className="text-[10px] text-slate-500">%</span>
                                                    </div>
                                                ) : (
                                                    <span>{(item.discountPercent || 0)}%</span>
                                                )}
                                            </td>
                                        )}
                                        <td className="border border-slate-800 p-2 text-right">{(item.priceBill || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    </tr>
                                );
                            })}
                            {/* Summary Rows */}
                            <tr className="font-bold bg-slate-50 print:bg-transparent">
                                <td colSpan={includeDiscount ? 7 : 6} rowSpan={includeDiscount ? (includeVat ? 5 : 3) : (includeVat ? 3 : 1)} className="border border-slate-800 p-4 text-center align-middle text-lg italic bg-slate-50 text-slate-600 print:hidden">
                                    ({ThaiBahtText(totals.net)})
                                </td>
                                <td colSpan={includeDiscount ? 7 : 6} rowSpan={includeDiscount ? (includeVat ? 5 : 3) : (includeVat ? 3 : 1)} className="border border-slate-800 p-4 text-center align-middle text-lg italic bg-slate-50 text-slate-600 hidden print:table-cell">
                                    ({ThaiBahtText(totals.net)})
                                </td>
                                <td className="border border-slate-800 p-2 text-right">รวมเป็นเงิน</td>
                                <td className="border border-slate-800 p-2 text-right">{totals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>

                            {includeDiscount && (
                                <>
                                    <tr className="font-bold bg-slate-50 print:bg-transparent">
                                        <td className="border border-slate-800 p-2 text-right text-red-600">ส่วนลดรวม (Discount Total)</td>
                                        <td className="border border-slate-800 p-2 text-right text-red-600">-{totals.discount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    </tr>
                                    <tr className="font-bold bg-slate-50 print:bg-transparent">
                                        <td className="border border-slate-800 p-2 text-right">ยอดหลังหักส่วนลด</td>
                                        <td className="border border-slate-800 p-2 text-right">{totals.afterDiscount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    </tr>
                                </>
                            )}

                            {includeVat && (
                                <>
                                    <tr className="font-bold bg-slate-50 print:bg-transparent">
                                        <td className="border border-slate-800 p-2 text-right">VAT {vatRate}%</td>
                                        <td className="border border-slate-800 p-2 text-right">{totals.vat.toLocaleString([], { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    </tr>
                                    <tr className="font-bold bg-slate-100 print:bg-slate-200">
                                        <td className="border border-slate-800 p-2 text-right text-black">ยอดสุทธิ</td>
                                        <td className="border border-slate-800 p-2 text-right text-black">{totals.net.toLocaleString([], { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    </tr>
                                </>
                            )}
                        </tbody>
                    </table>

                    {/* Remarks */}
                    <div className="mb-8 p-4 border border-slate-300 rounded print:border-black">
                        <span className="font-bold underline text-sm">หมายเหตุ:</span>
                        {isDocEditable ? (
                            <textarea aria-label="หมายเหตุ" title="หมายเหตุ" value={docConfig.remarks} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDocConfig({ ...docConfig, remarks: e.target.value })} className="w-full mt-1 p-1 border rounded" rows={2} />
                        ) : (
                            <p className="text-sm mt-1 indent-4">{docConfig.remarks}</p>
                        )}
                    </div>

                    {/* Signatures */}
                    <div className="grid grid-cols-3 gap-8 mt-12 print:break-inside-avoid">
                        <div className="text-center">
                            <div className="border-b border-black border-dotted h-8 w-3/4 mx-auto mb-2"></div>
                            <div className="text-sm font-bold">{docConfig.signatory1}</div>
                            <div className="text-xs text-slate-500">วันที่ ...../...../..........</div>
                        </div>
                        <div className="text-center">
                            <div className="border-b border-black border-dotted h-8 w-3/4 mx-auto mb-2"></div>
                            <div className="text-sm font-bold">{docConfig.signatory2}</div>
                            <div className="text-xs text-slate-500">วันที่ ...../...../..........</div>
                        </div>
                        <div className="text-center">
                            <div className="border-b border-black border-dotted h-8 w-3/4 mx-auto mb-2"></div>
                            <div className="text-sm font-bold">{docConfig.signatory3}</div>
                            <div className="text-xs text-slate-500">วันที่ ...../...../..........</div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
