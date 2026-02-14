
import React from 'react';
import { FileText, Inbox, MapPin, User, CheckCircle } from 'lucide-react';
import { ReturnRecord } from '../../../types';
import { DispositionBadge } from './DispositionBadge';

interface Step5CompleteProps {
    documentedItems: ReturnRecord[];
    completedItems: ReturnRecord[];
    handleCompleteJob: (id: string) => void;
}

export const Step6Closure: React.FC<Step5CompleteProps> = ({ documentedItems, completedItems, handleCompleteJob }) => {
    return (
        <div className="h-full flex flex-col p-3 md:p-6 animate-fade-in overflow-hidden">
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <FileText className="w-6 h-6 text-purple-600" /> รายการรอปิดงาน (Pending Completion / Direct Return)
            </h3>

            {/* Pending Items Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col mb-6" style={{ maxHeight: '60%' }}>
                <div className="p-4 bg-purple-50 border-b border-purple-100 flex justify-between items-center">
                    <span className="font-bold text-purple-800">รายการที่ต้องดำเนินการ ({documentedItems.length})</span>
                </div>

                <div className="overflow-auto flex-1">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 shadow-sm z-10">
                            <tr>
                                <th className="p-3 border-b text-center w-24">Action</th>
                                <th className="p-3 border-b">ID</th>
                                <th className="p-3 border-b">สาขา</th>
                                <th className="p-3 border-b">สินค้า</th>
                                <th className="p-3 border-b text-center">จำนวน</th>
                                <th className="p-3 border-b">วันที่แจ้ง</th>
                                <th className="p-3 border-b">NCR No.</th>
                                <th className="p-3 border-b">Neo Doc</th>
                                <th className="p-3 border-b">ลูกค้า</th>
                                <th className="p-3 border-b">ผู้พบปัญหา</th>
                                <th className="p-3 border-b">ปลายทาง</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {documentedItems.length === 0 ? (
                                <tr>
                                    <td colSpan={11} className="p-8 text-center text-slate-400">ไม่มีรายการที่รอปิดงาน</td>
                                </tr>
                            ) : (
                                documentedItems.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-2 text-center">
                                            <button
                                                onClick={() => handleCompleteJob(item.id)}
                                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-bold shadow-sm inline-flex items-center gap-1 transition-all active:scale-95"
                                            >
                                                <CheckCircle className="w-3 h-3" /> ปิดงาน
                                            </button>
                                        </td>
                                        <td className="p-3 font-mono text-xs text-slate-500">{item.id}</td>
                                        <td className="p-3">
                                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" /> {item.branch}</span>
                                        </td>
                                        <td className="p-3">
                                            <div className="font-bold text-slate-700">{item.productName}</div>
                                            <div className="text-xs text-slate-500">{item.productCode}</div>
                                        </td>
                                        <td className="p-3 text-center font-bold text-slate-600">
                                            {item.quantity} {item.unit}
                                        </td>
                                        <td className="p-3 text-xs text-slate-500">{item.dateRequested}</td>
                                        <td className="p-3 text-xs">{item.ncrNumber || '-'}</td>
                                        <td className="p-3 text-xs">{item.neoRefNo || '-'}</td>
                                        <td className="p-3 text-xs">{item.customerName}</td>
                                        <td className="p-3 text-xs">{item.founder || '-'}</td>
                                        <td className="p-3 text-xs">
                                            <span className="px-2 py-1 rounded-full bg-slate-100 border border-slate-200">
                                                {item.destinationCustomer || item.dispositionRoute || '-'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Completed Items Section (Bottom) */}
            <div className="flex-1 overflow-hidden flex flex-col">
                <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" /> รายการที่จบงานแล้ว (Completed)
                </h3>
                <div className="bg-white rounded-xl border border-slate-200 flex-1 overflow-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 sticky top-0">
                            <tr>
                                <th className="p-3 w-20">ID</th>
                                <th className="p-3">สินค้า</th>
                                <th className="p-3">สาขา</th>
                                <th className="p-3">วันที่ปิดงาน</th>
                                <th className="p-3">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {completedItems.slice(0, 20).map(item => (
                                <tr key={item.id} className="hover:bg-slate-50 opacity-75">
                                    <td className="p-3 text-xs font-mono">{item.id}</td>
                                    <td className="p-3">
                                        <div className="font-medium text-slate-700">{item.productName}</div>
                                    </td>
                                    <td className="p-3 text-xs">{item.branch}</td>
                                    <td className="p-3 text-xs">{item.dateCompleted}</td>
                                    <td className="p-3 text-xs"><DispositionBadge disposition={item.disposition} /></td>
                                </tr>
                            ))}
                            {completedItems.length === 0 && (
                                <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">ยังไม่มีรายการที่จบงาน</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
