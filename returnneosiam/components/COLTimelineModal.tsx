import React from 'react';
import { FileText, Truck, MapPin, CheckSquare, CircleCheck, X, Clock, Calendar, Store, ArrowRight, Package, Box } from 'lucide-react';
import { ReturnRecord } from '../types';
import { formatDate } from '../utils/dateUtils';

interface COLTimelineModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: ReturnRecord | null;
}

const COLTimelineModal: React.FC<COLTimelineModalProps> = ({ isOpen, onClose, item }) => {
    if (!isOpen || !item) return null;

    // Helper to calculate duration days between two dates
    const calculateDuration = (startDate?: string, endDate?: string) => {
        if (!startDate || !endDate) return null;
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    // Determine current step index based on status
    // Determine current step index based on status AND data presence (Smart Detection)
    const getStatusIndex = (item: ReturnRecord) => {
        let index = 0;
        const status = (item.status || '') as string;

        // 1. Base Status Check
        switch (status) {
            case 'Completed': index = 7; break;
            case 'COL_Documented':
            case 'DocsCompleted':
            case 'ReturnToSupplier':
            case 'DirectReturn': index = 6; break;
            case 'COL_HubReceived':
            case 'HubReceived':
            case 'ReceivedAtHub':
            case 'NCR_HubReceived': index = 5; break;
            case 'COL_InTransit':
            case 'InTransit':
            case 'InTransitToHub':
            case 'NCR_InTransit': index = 4; break;
            case 'COL_Consolidated':
            case 'Consolidated': index = 3; break;
            case 'COL_BranchReceived':
            case 'BranchReceived':
            case 'NCR_BranchReceived': index = 2; break;
            case 'COL_JobAccepted': // JobAccepted
            case 'JobAccepted':
            case 'NCR_JobAccepted': index = 1; break;
            default: index = 0; break;
        }

        // 2. Data Heuristics (Boost index if data indicates progress despite status)
        // This fixes "Lagging Status" issues where data exists but status wasn't updated
        if (item.dateCompleted) index = Math.max(index, 7);
        else if (item.dateDocumented) index = Math.max(index, 6);
        else if (item.dateHubReceived) index = Math.max(index, 5);
        else if (item.dateInTransit) index = Math.max(index, 4);
        else if (item.dateConsolidated) index = Math.max(index, 3);
        else if (item.dateBranchReceived || item.dateReceived) index = Math.max(index, 2);
        else if (item.dateJobAccepted) index = Math.max(index, 1);

        // 3. Special Indicators
        // If COL ID exists, it implies the item has been processed/consolidated at least
        if (item.collectionOrderId) index = Math.max(index, 3); // Assume Consolidation level

        return index;
    };

    const currentIndex = getStatusIndex(item);

    // Fallback date for legacy data
    const fallbackDate = item.date || item.dateRequested || new Date().toISOString().split('T')[0];

    const steps = [
        {
            id: 1,
            label: 'สร้างใบงาน (Request)',
            status: currentIndex === 0 ? 'รอรับงาน' : 'เสร็จสิ้น',
            date: item.date || item.dateRequested || fallbackDate,
            icon: FileText,
            colorKey: 'blue',
            description: 'สร้างใบสั่งงานรับสินค้ากลับ'
        },
        {
            id: 2,
            label: 'รับงาน (Job Accept)',
            status: currentIndex === 1 ? 'กำลังดำเนินการ' : (currentIndex > 1 ? 'เสร็จสิ้น' : 'รอดำเนินการ'),
            date: currentIndex >= 1 ? (item.dateJobAccepted || fallbackDate) : undefined,
            icon: Truck,
            colorKey: 'orange',
            description: 'รถเข้ารับงาน/กำหนดรถรับสินค้า'
        },
        {
            id: 3,
            label: 'รับเข้าสาขา (Rx)',
            status: currentIndex === 2 ? 'สินค้าถึงสาขา' : (currentIndex > 2 ? 'เสร็จสิ้น' : 'รอดำเนินการ'),
            date: currentIndex >= 2 ? (item.dateBranchReceived || item.dateReceived || fallbackDate) : undefined,
            icon: Store,
            colorKey: 'indigo',
            description: 'สินค้าถึงสาขาต้นทาง/พักสินค้า'
        },
        {
            id: 4,
            label: 'รวมสินค้า (Consol)',
            status: currentIndex === 3 ? 'รอขนส่ง' : (currentIndex > 3 ? 'เสร็จสิ้น' : 'รอดำเนินการ'),
            date: currentIndex >= 3 ? (item.dateConsolidated || fallbackDate) : undefined,
            icon: Box,
            colorKey: 'yellow',
            description: 'รวมสินค้าขึ้นรถขนส่งไปยัง Hub'
        },
        {
            id: 5,
            label: 'ขนส่ง (In Transit)',
            status: currentIndex === 4 ? 'กำลังขนส่ง' : (currentIndex > 4 ? 'เสร็จสิ้น' : 'รอดำเนินการ'),
            date: currentIndex >= 4 ? (item.dateInTransit || fallbackDate) : undefined,
            icon: Truck,
            colorKey: 'purple',
            description: 'สินค้าอยู่ระหว่างทางไป Hub'
        },
        {
            id: 6,
            label: 'ถึง Hub (Received)',
            status: currentIndex === 5 ? 'สินค้าถึง Hub' : (currentIndex > 5 ? 'เสร็จสิ้น' : 'รอดำเนินการ'),
            date: currentIndex >= 5 ? (item.dateHubReceived || fallbackDate) : undefined,
            icon: MapPin,
            colorKey: 'green',
            description: 'สินค้าถึงศูนย์กระจายสินค้า'
        },
        {
            id: 7,
            label: 'คลัง/เอกสาร',
            status: currentIndex === 6 ? 'รอปิดงาน' : (currentIndex > 6 ? 'ผ่านการตรวจสอบ' : 'รอดำเนินการ'),
            date: currentIndex >= 6 ? (item.dateDocumented || fallbackDate) : undefined,
            icon: FileText,
            colorKey: 'blue',
            description: 'ตรวจสอบเอกสาร/คลังรับเข้า'
        },
        {
            id: 8,
            label: 'ปิดงาน (Done)',
            status: currentIndex === 7 ? 'สำเร็จ' : 'รอดำเนินการ',
            date: currentIndex >= 7 ? (item.dateCompleted || fallbackDate) : undefined,
            icon: CircleCheck,
            colorKey: 'green',
            description: 'กระบวนการเสร็จสิ้นสมบูรณ์'
        },
    ];

    const isCanceled = item.status === 'Cancelled' || item.status === 'Rejected';

    // Define explicit type for styleMap to avoid indexing errors
    type StyleProps = {
        bg: string;
        border: string;
        text: string;
        badgeBg: string;
        badgeText: string;
    };

    const styleMap: Record<string, StyleProps> = {
        blue: { bg: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-600', badgeBg: 'bg-blue-50', badgeText: 'text-blue-700' },
        orange: { bg: 'bg-orange-100', border: 'border-orange-500', text: 'text-orange-600', badgeBg: 'bg-orange-50', badgeText: 'text-orange-700' },
        indigo: { bg: 'bg-indigo-100', border: 'border-indigo-500', text: 'text-indigo-600', badgeBg: 'bg-indigo-50', badgeText: 'text-indigo-700' },
        yellow: { bg: 'bg-yellow-100', border: 'border-yellow-500', text: 'text-yellow-600', badgeBg: 'bg-yellow-50', badgeText: 'text-yellow-700' },
        purple: { bg: 'bg-purple-100', border: 'border-purple-500', text: 'text-purple-600', badgeBg: 'bg-purple-50', badgeText: 'text-purple-700' },
        green: { bg: 'bg-green-100', border: 'border-green-500', text: 'text-green-600', badgeBg: 'bg-green-50', badgeText: 'text-green-700' },
        red: { bg: 'bg-red-100', border: 'border-red-500', text: 'text-red-600', badgeBg: 'bg-red-50', badgeText: 'text-red-700' },
        gray: { bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-400', badgeBg: 'bg-slate-100', badgeText: 'text-slate-500' },
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] ${isCanceled ? 'border-4 border-red-500' : ''}`}>
                {/* Header */}
                <div className={`border-b p-6 flex justify-between items-start ${isCanceled ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                {isCanceled ? <X className="w-8 h-8 text-red-600" /> : <Calendar className="w-6 h-6 text-blue-600" />}
                                Timeline การรับสินค้า (Collection Journey)
                            </h2>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${isCanceled ? 'bg-red-100 text-red-700 border-red-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                                {isCanceled ? 'ยกเลิก (CANCELED)' : `Doc No: ${item.documentNo || item.id}`}
                            </span>
                        </div>
                        <p className="text-slate-500 text-sm">ติดตามสถานะและประวัติการขนส่งสินค้า (Status Tracking Infographic)</p>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        title="ปิด"
                        className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto bg-slate-50/30">

                    {/* Header Info Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
                        {/* Card 1: Documents (Invoice & R) */}
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center gap-1">
                            <div className="text-[10px] uppercase text-slate-400 font-bold flex items-center gap-1">
                                <FileText className="w-3 h-3" /> เอกสาร (Documents)
                            </div>
                            <div className="flex justify-between items-end border-b border-slate-50 pb-1">
                                <span className="text-xs text-slate-600">Invoice:</span>
                                <span className="font-bold text-slate-800 text-sm">{item.invoiceNo || '-'}</span>
                            </div>
                            <div className="flex justify-between items-end pt-1">
                                <span className="text-xs text-slate-600">R No:</span>
                                <span className="font-bold text-blue-600 text-sm font-mono">{item.documentNo || item.id}</span>
                            </div>
                        </div>

                        {/* Card 2: Transport Control (TM & Control Date) */}
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center gap-1">
                            <div className="text-[10px] uppercase text-slate-400 font-bold flex items-center gap-1">
                                <Truck className="w-3 h-3" /> ควบคุมขนส่ง (Control)
                            </div>
                            <div className="flex justify-between items-end border-b border-slate-50 pb-1">
                                <span className="text-xs text-slate-600">TM No:</span>
                                <span className="font-bold text-slate-800 text-sm">{item.tmNo || '-'}</span>
                            </div>
                            <div className="flex justify-between items-end pt-1">
                                <span className="text-xs text-slate-600">วันที่คุม:</span>
                                <span className="font-bold text-slate-800 text-sm">{item.controlDate ? formatDate(item.controlDate) : '-'}</span>
                            </div>
                        </div>

                        {/* Card 3: Branch & Product */}
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center gap-1">
                            <div className="text-[10px] uppercase text-slate-400 font-bold flex items-center gap-1">
                                <Store className="w-3 h-3" /> สาขา & สินค้า (Info)
                            </div>
                            <div className="flex justify-between items-end border-b border-slate-50 pb-1">
                                <span className="text-xs text-slate-600">สาขา:</span>
                                <span className="font-bold text-slate-800 text-sm">{item.branch}</span>
                            </div>
                            <div className="flex justify-between items-end pt-1">
                                <span className="text-xs text-slate-600 truncate max-w-[50px]">สินค้า:</span>
                                <span className="font-bold text-slate-700 text-xs truncate max-w-[120px]" title={item.productName}>
                                    {(item.productCode === 'N/A' || !item.productCode) ? (item.productName === 'N/A' ? '-' : item.productName) : item.productCode}
                                </span>
                            </div>
                            <div className="flex justify-between items-end pt-1 border-t border-slate-50 mt-1">
                                <span className="text-xs text-slate-600">จำนวน:</span>
                                <span className="font-bold text-slate-800 text-xs">
                                    {item.quantity} {item.unit}
                                </span>
                            </div>
                        </div>

                        {/* Card 4: COL & Dest */}
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center gap-1">
                            <div className="text-[10px] uppercase text-slate-400 font-bold flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> ปลายทาง (Dest & COL)
                            </div>
                            <div className="flex justify-between items-end border-b border-slate-50 pb-1">
                                <span className="text-xs text-slate-600">COL ID:</span>
                                <span className="font-bold text-indigo-600 text-sm">{item.collectionOrderId || '-'}</span>
                            </div>
                            <div className="flex justify-between items-end pt-1">
                                <span className="text-xs text-slate-600">To:</span>
                                <span className="font-bold text-slate-800 text-xs truncate max-w-[120px]" title={item.destinationCustomer || '-'}>{item.destinationCustomer || '-'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Timeline Infographic */}
                    <div className="relative pt-10 pb-6 px-4">
                        {/* Connecting Line */}
                        <div className="hidden md:block absolute top-[85px] left-10 right-10 h-1.5 bg-slate-200 rounded-full"></div>

                        <div className="grid grid-cols-1 md:grid-cols-8 gap-4 relative">
                            {steps.map((step, index) => {
                                let styles = styleMap[step.colorKey];
                                let isActive = index <= currentIndex;

                                if (isCanceled) {
                                    styles = styleMap['gray'];
                                } else if (!isActive) {
                                    styles = styleMap['gray'];
                                }

                                return (
                                    <div key={step.id} className="flex flex-col items-center relative z-10 group">

                                        {/* Icon Circle */}
                                        <div className={`w-14 h-14 rounded-full flex items-center justify-center border-4 shadow-lg transition-transform duration-300 mb-4 bg-white
                                          ${isActive
                                                ? `${styles.border} ${styles.text} scale-110 group-hover:scale-115`
                                                : 'border-slate-200 text-slate-300'
                                            }
                                        `}>
                                            <step.icon className="w-6 h-6" />
                                        </div>

                                        {/* Card Body */}
                                        <div className={`w-full bg-white rounded-xl border p-2 shadow-sm text-center min-h-[120px] flex flex-col transition-all duration-300
                                          ${isActive ? 'border-blue-100 shadow-md transform hover:-translate-y-1' : 'border-slate-100 opacity-70'}
                                        `}>
                                            <div className={`font-bold text-xs mb-1 ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>{step.label}</div>

                                            <div className="flex-grow flex items-center justify-center my-1">
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold
                                                  ${isActive ? `${styles.badgeBg} ${styles.badgeText}` : 'bg-slate-100 text-slate-400'}
                                                `}>
                                                    {step.status}
                                                </span>
                                            </div>

                                            <div className="px-1 mb-1 hidden md:block">
                                                <p className="text-[9px] text-slate-400 leading-tight">{step.description}</p>
                                            </div>

                                            {/* Date */}
                                            <div className="border-t border-slate-50 pt-1 mt-auto">
                                                {isActive && step.date ? (
                                                    <div className="text-[10px] font-bold text-slate-600 flex items-center justify-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {formatDate(step.date)}
                                                    </div>
                                                ) : (
                                                    <div className="text-[9px] text-slate-300 italic">Pending</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="mt-8 text-center text-xs text-slate-400 bg-blue-50/50 p-2 rounded-lg border border-blue-50 mx-auto max-w-2xl">
                        💡 <strong>Journey Info:</strong> เส้นทางของสินค้าจากสาขาเข้าสู่กระบวนการรับคืน (Collection Lifecycle)
                    </div>

                </div>
            </div>
        </div>
    );
};

export default COLTimelineModal;
