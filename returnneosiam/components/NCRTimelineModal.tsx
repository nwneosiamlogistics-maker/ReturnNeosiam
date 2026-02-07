
import React from 'react';
import { FileText, Truck, MapPin, CheckSquare, CircleCheck, X, Clock, Calendar, ClipboardList, Box, ArrowRight } from 'lucide-react';
import { NCRRecord, ReturnRecord } from '../types';
import { formatDate } from '../utils/dateUtils';

interface NCRTimelineModalProps {
    isOpen: boolean;
    onClose: () => void;
    report: NCRRecord | null;
    correspondingReturn?: ReturnRecord;
}

const NCRTimelineModal: React.FC<NCRTimelineModalProps> = ({ isOpen, onClose, report, correspondingReturn }) => {
    if (!isOpen || !report) return null;

    const itemData = report.item || (report as any); // Fallback for data structure variants

    const calculateDuration = (startDate?: string, endDate?: string) => {
        if (!startDate || !endDate) return null;
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const steps = [
        { id: 1, label: 'สร้างใบงาน (Request)', status: 'รออนุมัติ', date: correspondingReturn?.dateRequested || report.date, icon: FileText, colorKey: 'blue', description: 'ลูกค้าแจ้งปัญหา/ขอคืนสินค้า' },
        { id: 2, label: 'ขนส่ง (In Transit)', status: 'ระหว่างทาง', date: correspondingReturn?.dateInTransit, icon: Truck, colorKey: 'purple', description: 'สินค้าอยู่ระหว่างทางไป Hub' },
        { id: 3, label: 'ถึง Hub (Received)', status: 'ถึง Hub', date: correspondingReturn?.dateHubReceived || correspondingReturn?.dateReceived, icon: MapPin, colorKey: 'pink', description: 'สินค้าถึงศูนย์กระจายสินค้า' },
        { id: 4, label: 'คลัง/เอกสาร (QC/Docs)', status: 'ตรวจสอบ', date: correspondingReturn?.dateGraded || correspondingReturn?.dateDocumented, icon: FileText, colorKey: 'yellow', description: 'ตรวจสอบเอกสาร/คลังรับเข้า' },
        { id: 5, label: 'ปิดงาน (Done)', status: 'สำเร็จ', date: correspondingReturn?.dateCompleted, icon: CircleCheck, colorKey: 'green', description: 'กระบวนการเสร็จสิ้นสมบูรณ์' },
    ];

    // Calculate Total Duration
    const completedSteps = steps.filter(s => s.date);
    const startDate = completedSteps.length > 0 ? completedSteps[0].date : null;
    const endDate = completedSteps.length > 0 ? completedSteps[completedSteps.length - 1].date : null;
    const totalDuration = calculateDuration(startDate, endDate);

    const isCanceled = report.status === 'Canceled';

    const styleMap: Record<string, any> = {
        blue: { bg: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-600', badgeBg: 'bg-blue-50', badgeText: 'text-blue-700' },
        orange: { bg: 'bg-orange-100', border: 'border-orange-500', text: 'text-orange-600', badgeBg: 'bg-orange-50', badgeText: 'text-orange-700' },
        indigo: { bg: 'bg-indigo-100', border: 'border-indigo-500', text: 'text-indigo-600', badgeBg: 'bg-indigo-50', badgeText: 'text-indigo-700' },
        yellow: { bg: 'bg-yellow-100', border: 'border-yellow-500', text: 'text-yellow-600', badgeBg: 'bg-yellow-50', badgeText: 'text-yellow-700' },
        purple: { bg: 'bg-purple-100', border: 'border-purple-500', text: 'text-purple-600', badgeBg: 'bg-purple-50', badgeText: 'text-purple-700' },
        pink: { bg: 'bg-pink-100', border: 'border-pink-500', text: 'text-pink-600', badgeBg: 'bg-pink-50', badgeText: 'text-pink-700' },
        green: { bg: 'bg-green-100', border: 'border-green-500', text: 'text-green-600', badgeBg: 'bg-green-50', badgeText: 'text-green-700' },
        red: { bg: 'bg-red-100', border: 'border-red-500', text: 'text-red-600', badgeBg: 'bg-red-50', badgeText: 'text-red-700' },
        gray: { bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-400', badgeBg: 'bg-slate-100', badgeText: 'text-slate-500' },
    };

    const firstPendingIndex = steps.findIndex(s => !s.date);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] ${isCanceled ? 'border-4 border-red-500' : ''}`}>
                {/* Header */}
                <div className={`border-b p-6 flex justify-between items-start ${isCanceled ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                {isCanceled ? <X className="w-8 h-8 text-red-600" /> : <Calendar className="w-6 h-6 text-blue-600" />}
                                Timeline การดำเนินการ
                            </h2>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${isCanceled ? 'bg-red-100 text-red-700 border-red-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                                {isCanceled ? 'รายการถูกยกเลิก (CANCELED)' : `NCR No: ${report.ncrNo || report.id}`}
                            </span>
                            {totalDuration !== null && (
                                <div className="flex items-center gap-1 ml-4 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                                    <Clock className="w-4 h-4 text-indigo-600" />
                                    <span className="text-xs font-bold text-indigo-700">รวมทั้งหมด: {totalDuration} วัน</span>
                                </div>
                            )}
                        </div>
                        <p className="text-slate-500 text-sm">ติดตามสถานะและประวัติการดำเนินงานของสินค้าคืน (Status Tracking Infographic)</p>
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <div className="text-xs text-slate-500 mb-1">สินค้า (Product)</div>
                            <div className="font-bold text-slate-800 text-sm">{itemData.productName}</div>
                            <div className="text-xs text-slate-400 mt-1">{itemData.productCode}</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <div className="text-xs text-slate-500 mb-1">ร้านค้า (Customer)</div>
                            <div className="font-bold text-slate-800 text-sm">{itemData.customerName}</div>
                            <div className="text-xs text-slate-400 mt-1">{itemData.branch}</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <div className="text-xs text-slate-500 mb-1">ปัญหา (Issue)</div>
                            <div className="font-bold text-red-600 text-sm">{report.problemDetail}</div>
                            <div className="text-xs text-slate-400 mt-1">Source: {itemData.problemSource}</div>
                        </div>
                    </div>

                    {/* Timeline Infographic */}
                    <div className="relative pt-10 pb-6 px-4">
                        {/* Connecting Line */}
                        <div className="hidden md:block absolute top-[85px] left-10 right-10 h-1.5 bg-slate-200 rounded-full"></div>

                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
                            {steps.map((step, index) => {
                                let styles = styleMap[step.colorKey];
                                let isActive = !!step.date;
                                const prevStep = steps[index - 1];
                                const durationDetails = (isActive && prevStep?.date) ? calculateDuration(prevStep.date, step.date) : null;

                                // Handle Canceled State
                                let label = step.label;
                                let status = step.status;
                                let Icon = step.icon;

                                if (isCanceled) {
                                    if (!step.date) {
                                        // This step was effectively canceled/skipped
                                        if (index === firstPendingIndex) {
                                            // This is WHERE it stopped -> Show Canceled Status
                                            styles = styleMap['red'];
                                            isActive = true; // Show as "Active" (Red Highlight) to indicate stoppage
                                            status = 'ยกเลิก';
                                            Icon = X;
                                        } else if (index > firstPendingIndex) {
                                            // Future steps -> Ghost
                                            styles = styleMap['gray'];
                                        }
                                    }
                                }

                                return (
                                    <div key={step.id} className="flex flex-col items-center relative z-10 group">

                                        {/* Duration Badge (Desktop) */}
                                        {durationDetails !== null && (
                                            <div className="hidden md:flex absolute -left-[50%] top-[-30px] w-full justify-center">
                                                <div className="text-[10px] font-bold text-slate-500 bg-white px-2 py-1 rounded-full border border-slate-200 shadow-sm whitespace-nowrap">
                                                    {durationDetails} วัน <span className="text-slate-300 mx-1">→</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Icon Circle */}
                                        <div className={`w-16 h-16 rounded-full flex items-center justify-center border-4 shadow-lg transition-transform duration-300 mb-4 bg-white
                      ${isActive
                                                ? `${styles.border} ${styles.text} scale-110 group-hover:scale-115`
                                                : 'border-slate-200 text-slate-300'
                                            }
                    `}>
                                            <Icon className="w-7 h-7" />
                                        </div>

                                        {/* Card Body */}
                                        <div className={`w-full bg-white rounded-xl border p-3 shadow-sm text-center min-h-[140px] flex flex-col transition-all duration-300
                      ${isActive ? 'border-blue-100 shadow-md transform hover:-translate-y-1' : 'border-slate-100 opacity-70'}
                    `}>
                                            <div className={`font-bold text-sm mb-1 ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>{label}</div>

                                            <div className="flex-grow flex items-center justify-center my-2">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold
                          ${isActive ? `${styles.badgeBg} ${styles.badgeText}` : 'bg-slate-100 text-slate-400'}
                        `}>
                                                    {status}
                                                </span>
                                            </div>

                                            {/* Date */}
                                            <div className="border-t border-slate-50 pt-2 mt-auto">
                                                {step.date ? (
                                                    <div className="text-xs font-bold text-slate-600 flex items-center justify-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {formatDate(step.date)}
                                                    </div>
                                                ) : isCanceled && index === firstPendingIndex ? (
                                                    <div className="text-xs font-bold text-red-500 flex items-center justify-center gap-1">
                                                        <X className="w-3 h-3" />
                                                        CANCELED
                                                    </div>
                                                ) : (
                                                    <div className="text-[10px] text-slate-300 italic">Pending</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="mt-8 text-center text-xs text-slate-400 bg-blue-50/50 p-2 rounded-lg border border-blue-50 mx-auto max-w-2xl">
                        💡 <strong>Infographic Info:</strong> เส้นทางของสินค้าจากลูกค้ากลับสู่คลังสินค้า (Return Journey) แสดงระยะเวลาที่ใช้ในแต่ละขั้นตอน
                    </div>

                </div>
            </div>
        </div>
    );
};

export default NCRTimelineModal;
