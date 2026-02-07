
import React, { useState, useMemo } from 'react';
import { Truck, MapPin, Printer, ArrowRight, Package, Box, Calendar, Layers } from 'lucide-react';
import { useData } from '../../../DataContext';
import { ReturnRecord } from '../../../types';
import Swal from 'sweetalert2';

interface Step5LogisticsProps {
    onConfirm: (selectedIds: string[], routeType: 'Hub' | 'Direct', transportInfo: any) => void;
}

export const Step5Logistics: React.FC<Step5LogisticsProps> = ({ onConfirm }) => {
    const { items, updateReturnRecord } = useData();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [transportInfo, setTransportInfo] = useState({
        driverName: '',
        plateNumber: '',
        transportCompany: 'รถบริษัท'
    });
    const [routeType, setRouteType] = useState<'Hub' | 'Direct'>('Hub');

    const [directDestination, setDirectDestination] = useState<string>('');
    const [customDestination, setCustomDestination] = useState<string>('');
    const [selectedBranch, setSelectedBranch] = useState<string>('All');

    // Filter Logic: Global Items -> Status 'ReadyForLogistics' or 'COL_Consolidated'
    const logisticsItems = useMemo(() => {
        return items.filter(i => i.status === 'ReadyForLogistics' || i.status === 'COL_Consolidated');
    }, [items]);

    const uniqueBranches = useMemo(() => Array.from(new Set(logisticsItems.map(i => i.branch))).filter(Boolean), [logisticsItems]);

    const filteredItems = useMemo(() => logisticsItems.filter(item =>
        selectedBranch === 'All' || item.branch === selectedBranch
    ), [logisticsItems, selectedBranch]);

    const handleToggle = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === filteredItems.length && filteredItems.length > 0) {
            const newSet = new Set(selectedIds);
            filteredItems.forEach(i => newSet.delete(i.id));
            setSelectedIds(newSet);
        } else {
            const newSet = new Set(selectedIds);
            filteredItems.forEach(i => newSet.add(i.id));
            setSelectedIds(newSet);
        }
    };

    const confirmSelection = async () => {
        if (selectedIds.size === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'ไม่ได้เลือกรายการ',
                text: 'กรุณาเลือกรายการสินค้าอย่างน้อย 1 รายการ'
            });
            return;
        }
        if (!transportInfo.driverName || !transportInfo.plateNumber) {
            const confirmResult = await Swal.fire({
                title: 'ข้อมูลไม่ครบถ้วน',
                text: 'คุณยังไม่ได้ระบุชื่อพนักงานขับรถหรือทะเบียนรถ ต้องการดำเนินการต่อหรือไม่?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'ดำเนินการต่อ',
                cancelButtonText: 'ยกเลิก'
            });

            if (!confirmResult.isConfirmed) {
                return;
            }
        }

        let finalDestination = '';
        if (routeType === 'Direct') {
            if (!directDestination) {
                Swal.fire({
                    icon: 'warning',
                    title: 'ข้อมูลไม่ครบถ้วน',
                    text: 'กรุณาระบุปลายทางสำหรับการส่งตรง (Direct Return)'
                });
                return;
            }
            if (directDestination === 'Other' && !customDestination) {
                Swal.fire({
                    icon: 'warning',
                    title: 'ข้อมูลไม่ครบถ้วน',
                    text: 'กรุณาระบุชื่อปลายทาง (อื่นๆ)'
                });
                return;
            }
            finalDestination = directDestination === 'Other' ? customDestination : directDestination;
        }

        const confirmMsg = routeType === 'Hub'
            ? 'ยืนยันการส่งเข้า Hub (รวบรวมและระบุขนส่ง)?'
            : `ยืนยันการส่งคืนตรงผู้ผลิต (Direct Return) ไปยัง "${finalDestination}"?`;

        const finalConfirm = await Swal.fire({
            title: 'ยืนยันการส่งของ',
            text: confirmMsg,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ยืนยัน',
            cancelButtonText: 'ยกเลิก'
        });

        if (finalConfirm.isConfirmed) {
            const driverDetails = `Driver: ${transportInfo.driverName}, Plate: ${transportInfo.plateNumber}, Transport: ${transportInfo.transportCompany}`;

            try {
                for (const id of Array.from(selectedIds)) {
                    if (routeType === 'Hub') {
                        await updateReturnRecord(id, {
                            status: 'COL_InTransit',
                            dateInTransit: new Date().toISOString().split('T')[0],
                            notes: `[Logistics] ${driverDetails}`
                        });
                    } else {
                        // Direct Return
                        await updateReturnRecord(id, {
                            status: 'DirectReturn',
                            disposition: 'RTV',
                            dateInTransit: new Date().toISOString().split('T')[0],
                            destinationCustomer: finalDestination,
                            notes: `[Direct Logistics] ${driverDetails}`
                        });
                    }
                }

                // Notify parent to handle additional logic (like PDF generation for Direct)
                onConfirm(Array.from(selectedIds), routeType, { ...transportInfo, destination: finalDestination });
                setSelectedIds(new Set());

                await Swal.fire({
                    icon: 'success',
                    title: 'เรียบร้อย',
                    text: 'บันทึกข้อมูลการขนส่งเรียบร้อย',
                    timer: 1500,
                    showConfirmButton: false
                });

            } catch (error) {
                console.error('Logistics Error:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    text: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลการขนส่ง'
                });
            }
        }
    };

    const isAllFilteredSelected = filteredItems.length > 0 && filteredItems.every(i => selectedIds.has(i.id));

    return (
        <div className="h-full flex flex-col p-6 animate-fade-in overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Truck className="w-6 h-6 text-orange-600" /> 5. ขนส่ง (Logistics)
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Transport Info Form */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 lg:col-span-1">
                    <h4 className="font-bold text-slate-700 mb-4 border-b border-slate-100 pb-2">ข้อมูลการขนส่ง</h4>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-1">ทะเบียนรถ</label>
                            <input
                                type="text"
                                aria-label="ทะเบียนรถ"
                                title="ทะเบียนรถ"
                                value={transportInfo.plateNumber}
                                onChange={e => setTransportInfo({ ...transportInfo, plateNumber: e.target.value })}
                                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 bg-slate-50"
                                placeholder="เช่น 1กข-1234"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-1">พนักงานขับรถ</label>
                            <input
                                type="text"
                                aria-label="ชื่อพนักงานขับรถ"
                                title="ชื่อพนักงานขับรถ"
                                value={transportInfo.driverName}
                                onChange={e => setTransportInfo({ ...transportInfo, driverName: e.target.value })}
                                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 bg-slate-50"
                                placeholder="ชื่อ-นามสกุล"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-1">บริษัทขนส่ง</label>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" aria-label="รถบริษัท" title="รถบริษัท" name="transportType" checked={transportInfo.transportCompany === 'รถบริษัท'} onChange={() => setTransportInfo({ ...transportInfo, transportCompany: 'รถบริษัท' })} className="text-blue-600 focus:ring-blue-500" />
                                    <span className="text-sm">รถบริษัท</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" aria-label="รถขนส่งร่วม (3PL)" title="รถขนส่งร่วม (3PL)" name="transportType" checked={transportInfo.transportCompany !== 'รถบริษัท'} onChange={() => setTransportInfo({ ...transportInfo, transportCompany: '' })} className="text-blue-600 focus:ring-blue-500" />
                                    <span className="text-sm">รถขนส่งร่วม (3PL)</span>
                                </label>
                            </div>
                            {transportInfo.transportCompany !== 'รถบริษัท' && (
                                <input type="text" aria-label="ระบุชื่อบริษัทขนส่ง" title="ระบุชื่อบริษัทขนส่ง" value={transportInfo.transportCompany === 'รถบริษัท' ? '' : transportInfo.transportCompany} onChange={e => setTransportInfo({ ...transportInfo, transportCompany: e.target.value })} className="w-full mt-2 p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 bg-slate-50" placeholder="ระบุชื่อบริษัทขนส่ง..." />
                            )}
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100">
                        <h4 className="font-bold text-slate-700 mb-3 block">ปลายทาง (Destination)</h4>
                        <div className="space-y-3">
                            <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${routeType === 'Hub' ? 'bg-orange-50 border-orange-500 shadow-sm' : 'border-slate-200 hover:bg-slate-50'}`}>
                                <input type="radio" aria-label="Hub นครสวรรค์" title="Hub นครสวรรค์" name="route" checked={routeType === 'Hub'} onChange={() => setRouteType('Hub')} className="mt-1" />
                                <div>
                                    <div className="font-bold text-slate-800">Hub นครสวรรค์</div>
                                    <div className="text-xs text-slate-500">ส่งเข้า Hub หลัก</div>
                                </div>
                            </label>
                            <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${routeType === 'Direct' ? 'bg-green-50 border-green-500 shadow-sm' : 'border-slate-200 hover:bg-slate-50'}`}>
                                <input type="radio" aria-label="ส่งตรง (Direct Return)" title="ส่งตรง (Direct Return)" name="route" checked={routeType === 'Direct'} onChange={() => setRouteType('Direct')} className="mt-1" />
                                <div>
                                    <div className="font-bold text-slate-800">ส่งตรง (Direct Return)</div>
                                    <div className="text-xs text-slate-500">ส่งคืนผู้ผลิตโดยตรง</div>
                                </div>
                            </label>

                            {routeType === 'Direct' && (
                                <div className="ml-8 p-3 bg-green-50/50 rounded-lg border border-green-100 space-y-2">
                                    <div className="text-xs font-bold text-green-800 mb-1">ระบุปลายทาง:</div>
                                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                                        <input type="radio" aria-label="สาย 3" title="สาย 3" name="directDest" value="สาย 3" checked={directDestination === 'สาย 3'} onChange={e => setDirectDestination(e.target.value)} /> สาย 3
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                                        <input type="radio" aria-label="ซีโน" title="ซีโน" name="directDest" value="ซีโน" checked={directDestination === 'ซีโน'} onChange={e => setDirectDestination(e.target.value)} /> ซีโน
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                                        <input type="radio" aria-label="อื่นๆ" title="อื่นๆ" name="directDest" value="Other" checked={directDestination === 'Other'} onChange={e => setDirectDestination(e.target.value)} /> อื่นๆ
                                    </label>
                                    {directDestination === 'Other' && (
                                        <input type="text" aria-label="ระบุปลายทาง" title="ระบุปลายทาง" value={customDestination} onChange={e => setCustomDestination(e.target.value)} placeholder="ระบุปลายทาง..." className="w-full mt-1 p-1.5 text-xs border border-green-300 rounded" />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={confirmSelection}
                        aria-label={routeType === 'Hub' ? "ส่งของ (Ship to Hub)" : "ส่งของ (Direct Ship)"}
                        title={routeType === 'Hub' ? "ส่งของ (Ship to Hub)" : "ส่งของ (Direct Ship)"}
                        className={`w-full mt-6 py-3 rounded-lg font-bold text-white shadow-md flex items-center justify-center gap-2 transition-all ${routeType === 'Hub' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'}`}
                    >
                        {routeType === 'Hub' ? <>ส่งของ (Ship to Hub) <Truck className="w-4 h-4" /></> : <>ส่งของ (Direct Ship) <Printer className="w-4 h-4" /></>}
                    </button>
                </div>

                {/* List */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 lg:col-span-2 flex flex-col overflow-hidden max-h-[600px]">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center flex-wrap gap-2">
                        <div>
                            <h4 className="font-bold text-slate-700">รายการรอกระจายสินค้า ({filteredItems.length})</h4>
                            <div className="text-sm text-slate-500">เลือก {selectedIds.size} รายการ</div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={handleSelectAll} aria-label={isAllFilteredSelected ? "ยกเลิกเลือกทั้งหมด" : "เลือกทั้งหมด"} title={isAllFilteredSelected ? "ยกเลิกเลือกทั้งหมด" : "เลือกทั้งหมด"} className="text-xs px-3 py-1.5 bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-600 font-medium">
                                {isAllFilteredSelected ? 'ยกเลิกเลือกทั้งหมด' : 'เลือกทั้งหมด'}
                            </button>
                            <select aria-label="กรองสาขา" title="กรองสาขา" value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)} className="text-xs p-1.5 border rounded-lg bg-white outline-none">
                                <option value="All">ทุกสาขา</option>
                                {uniqueBranches.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
                        {filteredItems.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                                <Package className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                                <p>ไม่มีสินค้ารอขนส่ง</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredItems.map(item => {
                                    const isSelected = selectedIds.has(item.id);
                                    return (
                                        <div key={item.id} onClick={() => handleToggle(item.id)} className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${isSelected ? 'bg-orange-50 border-orange-400 ring-1 ring-orange-200' : 'bg-white border-slate-200 hover:border-orange-300'}`}>
                                            <div className="pt-1">
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-orange-500 border-orange-500' : 'bg-white border-slate-300'}`}>
                                                    {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between">
                                                    <h4 className="font-bold text-slate-800 text-sm">{item.productName}</h4>
                                                    <span className="text-xs font-mono text-slate-500">{item.id}</span>
                                                </div>
                                                <div className="text-xs text-slate-500 mt-1 flex gap-4">
                                                    <span>สาขา: {item.branch}</span>
                                                    <span>จำนวน: <b>{item.quantity} {item.unit}</b></span>
                                                    <span>แจ้งเมื่อ: {item.dateRequested || item.date}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
