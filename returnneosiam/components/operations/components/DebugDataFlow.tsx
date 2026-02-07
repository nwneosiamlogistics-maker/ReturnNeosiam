import React from 'react';
import { useData } from '../../../DataContext';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';

/**
 * Debug Component: Data Flow Inspector
 * ตรวจสอบการไหลของข้อมูลระหว่าง Step 4 (QC) และ Step 5 (Docs)
 */
export const DebugDataFlow: React.FC = () => {
    const { items } = useData();

    // Step 4: Items waiting for QC
    const step4Items = items.filter(item => {
        const isReceived = item.status === 'NCR_HubReceived' || item.status === 'ReceivedAtHub';
        const isNCR = item.documentType === 'NCR' || !!item.ncrNumber || item.status === 'NCR_HubReceived';
        return isReceived && isNCR;
    });

    // Step 5: Items that passed QC
    const step5Items = items.filter(item =>
        item.status === 'NCR_QCCompleted' || item.status === 'QCCompleted'
    );

    // All NCR items
    const allNCRItems = items.filter(item =>
        item.documentType === 'NCR' || !!item.ncrNumber || item.id.startsWith('NCR')
    );

    // Items with missing disposition
    const itemsWithoutDisposition = step5Items.filter(item => !item.disposition);

    return (
        <div className="fixed bottom-4 right-4 bg-white border-2 border-blue-500 rounded-xl shadow-2xl p-6 max-w-md z-50">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200">
                <AlertCircle className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-800">🔍 Data Flow Inspector</h3>
            </div>

            <div className="space-y-4">
                {/* Step 4 Status */}
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-amber-800">Step 4: QC Queue</span>
                        <span className="text-xl font-bold text-amber-600">{step4Items.length}</span>
                    </div>
                    <div className="text-xs text-amber-600">
                        รายการรอตรวจสอบคุณภาพ
                    </div>
                    {step4Items.length > 0 && (
                        <div className="mt-2 text-xs text-slate-600 bg-white p-2 rounded">
                            <div className="font-bold mb-1">รายการล่าสุด:</div>
                            {step4Items.slice(0, 3).map(item => (
                                <div key={item.id} className="truncate">
                                    • {item.productName} ({item.status})
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Step 5 Status */}
                <div className={`p-3 rounded-lg border ${step5Items.length > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-bold ${step5Items.length > 0 ? 'text-green-800' : 'text-red-800'}`}>
                            Step 5: Docs Queue
                        </span>
                        <div className="flex items-center gap-2">
                            {step5Items.length > 0 ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                                <XCircle className="w-4 h-4 text-red-600" />
                            )}
                            <span className={`text-xl font-bold ${step5Items.length > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {step5Items.length}
                            </span>
                        </div>
                    </div>
                    <div className={`text-xs ${step5Items.length > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        รายการที่ผ่าน QC แล้ว
                    </div>
                    {step5Items.length > 0 && (
                        <div className="mt-2 text-xs text-slate-600 bg-white p-2 rounded">
                            <div className="font-bold mb-1">รายการล่าสุด:</div>
                            {step5Items.slice(0, 3).map(item => (
                                <div key={item.id} className="space-y-1">
                                    <div className="truncate">
                                        • {item.productName}
                                    </div>
                                    <div className="text-[10px] text-slate-400 pl-3">
                                        Status: {item.status} | Disposition: {item.disposition || '❌ ไม่มี'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Missing Disposition Warning */}
                {itemsWithoutDisposition.length > 0 && (
                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                        <div className="flex items-center gap-2 mb-1">
                            <AlertCircle className="w-4 h-4 text-orange-600" />
                            <span className="text-sm font-bold text-orange-800">ข้อมูลไม่สมบูรณ์</span>
                        </div>
                        <div className="text-xs text-orange-600">
                            พบ {itemsWithoutDisposition.length} รายการที่ไม่มี Disposition
                        </div>
                    </div>
                )}

                {/* Summary */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                    <div className="font-bold text-slate-700 mb-2">สรุป NCR Items</div>
                    <div className="space-y-1 text-slate-600">
                        <div>• ทั้งหมด: {allNCRItems.length} รายการ</div>
                        <div>• รอ QC: {step4Items.length} รายการ</div>
                        <div>• ผ่าน QC: {step5Items.length} รายการ</div>
                    </div>
                </div>

                {/* Diagnosis */}
                {step5Items.length === 0 && step4Items.length === 0 && (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <div className="text-xs text-blue-800 font-bold mb-1">💡 คำแนะนำ</div>
                        <div className="text-xs text-blue-600">
                            ไม่พบข้อมูลในทั้ง Step 4 และ Step 5<br />
                            กรุณาตรวจสอบ:<br />
                            1. มีการสร้าง NCR แล้วหรือไม่?<br />
                            2. NCR ผ่าน Step 2 (Logistics) แล้วหรือไม่?<br />
                            3. NCR ผ่าน Step 3 (Receive) แล้วหรือไม่?
                        </div>
                    </div>
                )}

                {step5Items.length === 0 && step4Items.length > 0 && (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <div className="text-xs text-blue-800 font-bold mb-1">💡 คำแนะนำ</div>
                        <div className="text-xs text-blue-600">
                            มีรายการรอตรวจสอบใน Step 4<br />
                            กรุณาไปที่ Step 4 เพื่อทำการตรวจสอบคุณภาพ (QC)
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
