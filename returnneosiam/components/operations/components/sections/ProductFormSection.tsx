import React from 'react';
import { DollarSign } from 'lucide-react';
import { AutocompleteInput } from '../AutocompleteInput';
import { ReturnRecord } from '../../../../types';

interface ProductFormSectionProps {
    formData: Partial<ReturnRecord>;
    updateField: (field: keyof ReturnRecord, value: ReturnRecord[keyof ReturnRecord]) => void;
    uniqueProductCodes: string[];
    uniqueProductNames: string[];
}

export const ProductFormSection: React.FC<ProductFormSectionProps> = ({
    formData,
    updateField,
    uniqueProductCodes,
    uniqueProductNames
}) => {
    return (
        <>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <label className="block text-sm font-bold text-slate-300 mb-1">เลขที่บิล / เอกสารอ้างอิง (Ref No.) <span className="text-red-400">*</span></label>
                    <input
                        type="text"
                        aria-label="เลขที่บิล / เอกสารอ้างอิง"
                        title="เลขที่บิล / เอกสารอ้างอิง"
                        required
                        value={formData.refNo || ''}
                        onChange={e => updateField('refNo', e.target.value)}
                        className="w-full p-2.5 bg-slate-700 border border-slate-600 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono text-slate-200 placeholder-slate-500"
                        placeholder="ระบุเลขที่บิล..."
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-300 mb-1">Neo Ref No. (Optional)</label>
                    <input
                        type="text"
                        aria-label="Neo Ref No."
                        title="Neo Ref No."
                        value={formData.neoRefNo || ''}
                        onChange={e => updateField('neoRefNo', e.target.value)}
                        className="w-full p-2.5 bg-slate-700 border border-slate-600 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono text-slate-200 placeholder-slate-500"
                        placeholder="เลขที่ Neo..."
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-300 mb-1">รหัสสินค้า (Product Code)</label>
                    <AutocompleteInput
                        label=""
                        value={formData.productCode || ''}
                        onChange={(val) => updateField('productCode', val)}
                        options={uniqueProductCodes}
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-300 mb-1">ชื่อสินค้า (Product Name)</label>
                <AutocompleteInput
                    label=""
                    value={formData.productName || ''}
                    onChange={(val) => updateField('productName', val)}
                    options={uniqueProductNames}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                    <label className="block text-sm font-bold text-slate-300 mb-1">จำนวน <span className="text-red-400">*</span></label>
                    <input
                        type="number"
                        aria-label="จำนวน"
                        title="จำนวน"
                        required
                        min="1"
                        value={formData.quantity || ''}
                        onChange={e => {
                            const qty = parseFloat(e.target.value) || 0;
                            updateField('quantity', qty);
                            const price = formData.pricePerUnit || 0;
                            updateField('priceBill', qty * price);
                        }}
                        className="w-full p-2.5 bg-slate-700 border border-slate-600 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-blue-400 text-center"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-300 mb-1">หน่วย</label>
                    <input
                        type="text"
                        aria-label="หน่วย"
                        title="หน่วย"
                        value={formData.unit || 'ชิ้น'}
                        onChange={e => updateField('unit', e.target.value)}
                        className="w-full p-2.5 bg-slate-700 border border-slate-600 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all text-center text-slate-200"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-blue-400 mb-1">ราคา/หน่วย (Price/Unit)</label>
                    <div className="relative">
                        <input
                            type="number"
                            aria-label="ราคาต่อหน่วย"
                            title="ราคาต่อหน่วย"
                            step="0.01"
                            value={formData.pricePerUnit || ''}
                            onChange={e => {
                                const price = parseFloat(e.target.value) || 0;
                                updateField('pricePerUnit', price);
                                const qty = formData.quantity || 0;
                                updateField('priceBill', qty * price);
                            }}
                            className="w-full p-2.5 pl-9 bg-slate-700 border border-blue-600/50 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-blue-400"
                            placeholder="0.00"
                        />
                        <DollarSign className="w-4 h-4 text-blue-400 absolute left-3 top-3" />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-300 mb-1">วันหมดอายุ</label>
                    <input
                        type="date"
                        aria-label="วันหมดอายุ"
                        title="วันหมดอายุ"
                        value={formData.expiryDate || ''}
                        onChange={e => updateField('expiryDate', e.target.value)}
                        className="w-full p-2.5 bg-slate-700 border border-slate-600 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-200"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-bold text-slate-300 mb-1">ราคาหน้าบิลรวม (Total Price Bill)</label>
                    <div className="relative">
                        <input
                            type="number"
                            aria-label="ราคาหน้าบิลรวม"
                            title="ราคาหน้าบิลรวม"
                            step="0.01"
                            value={formData.priceBill || 0}
                            readOnly
                            className="w-full p-2.5 pl-9 bg-slate-800 border border-slate-600 rounded text-sm outline-none font-bold text-slate-200"
                            placeholder="Auto-calculated"
                        />
                        <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-300 mb-1">ราคาขาย (Price Sell)</label>
                    <div className="relative">
                        <input
                            type="number"
                            aria-label="ราคาขาย"
                            title="ราคาขาย"
                            step="0.01"
                            value={formData.priceSell || ''}
                            onChange={e => updateField('priceSell', parseFloat(e.target.value))}
                            onBlur={e => updateField('priceSell', parseFloat(parseFloat(e.target.value).toFixed(2)))}
                            className="w-full p-2.5 pl-9 bg-slate-700 border border-slate-600 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-200 placeholder-slate-500"
                            placeholder="0.00"
                        />
                        <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                </div>
            </div>
        </>
    );
};
