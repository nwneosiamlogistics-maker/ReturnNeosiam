
import React from 'react';
import { Truck, RotateCcw, Trash2, Home, ShieldCheck, AlertTriangle } from 'lucide-react';
import { DispositionAction } from '../../../types';

interface DispositionBadgeProps {
    disposition?: DispositionAction | string;
}

export const DispositionBadge: React.FC<DispositionBadgeProps> = ({ disposition }) => {
    if (!disposition || disposition === 'Pending') return <span className="text-slate-400">-</span>;

    const config: any = {
        'RTV': { color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Truck, label: 'ส่งคืน (Return)' },
        'Restock': { color: 'bg-green-50 text-green-700 border-green-200', icon: RotateCcw, label: 'ขาย (Sell)' },
        'Recycle': { color: 'bg-red-50 text-red-700 border-red-200', icon: Trash2, label: 'ทิ้ง (Scrap)' },
        'InternalUse': { color: 'bg-purple-50 text-purple-700 border-purple-200', icon: Home, label: 'ใช้ภายใน' },
        'Claim': { color: 'bg-blue-50 text-blue-700 border-blue-200', icon: ShieldCheck, label: 'เคลมประกัน' }
    }[disposition];

    if (!config) return <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] border border-slate-200 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> ไม่ทราบค่า</span>;

    const Icon = config.icon;
    return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${config.color}`}><Icon className="w-3 h-3" /> {config.label}</span>;
};
