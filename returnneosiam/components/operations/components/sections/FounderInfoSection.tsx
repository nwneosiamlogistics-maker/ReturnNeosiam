import React from 'react';
import { User } from 'lucide-react';
import { AutocompleteInput } from '../AutocompleteInput';
import { ReturnRecord } from '../../../../types';

interface FounderInfoSectionProps {
    formData: Partial<ReturnRecord>;
    updateField: (field: keyof ReturnRecord, value: any) => void;
    uniqueCustomers: string[];
    uniqueDestinations: string[];
    uniqueFounders: string[];
}

// DEPRECATED or NCR ONLY?
// Actually, I will Create a NEW component for Logistics Request Step 1.
// keeping this file as is for now, I will not modify it in this tool call.
// I will just return without changes here and switch to write_to_file for new component.
export const FounderInfoSection: React.FC<FounderInfoSectionProps> = ({
    formData,
    updateField,
    uniqueCustomers,
    uniqueDestinations,
    uniqueFounders
}) => {
    return (
        <div className="border border-slate-700 rounded-xl p-6 bg-slate-800 shadow-sm relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-400 rounded-tl-xl rounded-bl-xl"></div>
            <h4 className="flex items-center gap-2 font-bold text-slate-200 mb-4 border-b border-slate-700 pb-2">
                <User className="w-5 h-5 text-blue-400" /> ข้อมูลเบื้องต้น (Header Info)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-bold text-slate-300 mb-1">ผู้พบปัญหา (Founder)</label>
                    <AutocompleteInput
                        label=""
                        value={formData.founder || ''}
                        onChange={(val) => updateField('founder', val)}
                        options={uniqueFounders}
                        placeholder="ระบุชื่อผู้แจ้ง..."
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-300 mb-1">ลูกค้า (Customer Name)</label>
                    <AutocompleteInput
                        label=""
                        value={formData.customerName || ''}
                        onChange={(val) => updateField('customerName', val)}
                        options={uniqueCustomers}
                        placeholder="ค้นหาชื่อลูกค้า..."
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-300 mb-1">สถานที่ส่ง (Destination / Site) </label>
                    <AutocompleteInput
                        label=""
                        value={formData.destinationCustomer || ''}
                        onChange={(val) => updateField('destinationCustomer', val)}
                        options={uniqueDestinations}
                        placeholder="ระบุสถานที่ส่ง..."
                    />
                </div>
            </div>
        </div>
    );
};
