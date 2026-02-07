import React, { useState, useMemo } from 'react';
import { Truck, MapPin, Printer, ArrowRight, Package, Box, Layers, Search, X, CheckCircle, Inbox } from 'lucide-react';
import { useData } from '../../../DataContext';
import Swal from 'sweetalert2';

interface Step2LogisticsProps {
    // items: ReturnRecord[]; // Removed as we use global state
    onConfirm: (selectedIds: string[], routeType: 'Hub' | 'Direct', transportInfo: { driverName: string; plateNumber: string; transportCompany: string; destination?: string }) => void;
}

export const Step2Logistics: React.FC<Step2LogisticsProps> = ({ onConfirm }) => {
    const { items, updateReturnRecord } = useData();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBranch, setSelectedBranch] = useState<string>('All');
    
    // Transport Info
    const [transportInfo, setTransportInfo] = useState({
        driverName: '',
        plateNumber: '',
        transportCompany: 'รถบริษัท'
    });
    const [routeType, setRouteType] = useState<'Hub' | 'Direct'>('Hub');
    const [directDestination, setDirectDestination] = useState<string>('');
    const [customDestination, setCustomDestination] = useState<string>('');

    // Filter Logic: Global Items -> Status 'Requested'
    const logisticsItems = useMemo(() => {
        return items.filter(i => i.status === 'Requested');
    }, [items]);

    const uniqueBranches = useMemo(() => 
        Array.from(new Set(logisticsItems.map(i => i.branch))).filter(Boolean), 
        [logisticsItems]
    );

    // Filter and Search
    const filteredItems = useMemo(() => {
        let result = logisticsItems;
        
        // Branch filter
        if (selectedBranch !== 'All') {
            result = result.filter(item => item.branch === selectedBranch);
        }
        
        // Search filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(item =>
                (item.productName?.toLowerCase().includes(q)) ||
                (item.productCode?.toLowerCase().includes(q)) ||
                (item.ncrNumber?.toLowerCase().includes(q)) ||
                (item.refNo?.toLowerCase().includes(q)) ||
                (item.branch?.toLowerCase().includes(q))
            );
        }
        
        return result;
    }, [logisticsItems, selectedBranch, searchQuery]);

    const handleToggle = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === filteredItems.length && filteredItems.length > 0) {
            // If all filtered items are selected, deselect them
            const newSet = new Set(selectedIds);
            filteredItems.forEach(i => newSet.delete(i.id));
            setSelectedIds(newSet);
        } else {
            // Select all filtered items
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
            ? 'ยืนยันการเปลี่ยนสถานะเป็น "รอรถรับ" (PickupScheduled) และบันทึกข้อมูลรถ?'
            : `ยืนยันการส่งคืนตรงผู้ผลิต (Direct Return) ไปยัง "${finalDestination}"?`;

        const finalConfirm = await Swal.fire({
            title: 'ยืนยันการบันทึก',
            text: confirmMsg,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ยืนยัน',
            cancelButtonText: 'ยกเลิก'
        });

        if (finalConfirm.isConfirmed) {
            // Update Records Directly
            const driverDetails = `Driver: ${transportInfo.driverName}, Plate: ${transportInfo.plateNumber}, Transport: ${transportInfo.transportCompany}`;

            try {
                for (const id of Array.from(selectedIds)) {
                    if (routeType === 'Hub') {
                        await updateReturnRecord(id, {
                            status: 'PickupScheduled',
                            // Store driver info in notes or relevant field
                            notes: `[Logistics] ${driverDetails}`,
                            // problemDetail: `${driverDetails}` 
                        });
                    } else {
                        // Direct Return Logic (Might default to Completed or Documented?)
                        // User asked for "DriverAssigned", usually leading to Hub. Direct might just skip?
                        // For Direct, let's assume it goes to 'Documented' or remains 'Requested' but with notes?
                        // Adhering to User Request: "Update... to 'DriverAssigned' (or 'CollectionScheduled')"
                        // Assuming this is for Hub route mainly. for Direct, maybe 'ReturnToSupplier'?
                        // Let's stick to user request for status update.
                        await updateReturnRecord(id, {
                            status: 'ReturnToSupplier', // Direct return usually skips Hub logic
                            disposition: 'RTV',
                            destinationCustomer: finalDestination,
                            notes: `[Direct Logistics] ${driverDetails}`
                        });
                    }
                }

                // Call onConfirm to notify parent (maybe to clear selection or show success msg)
                onConfirm(Array.from(selectedIds), routeType, { ...transportInfo, destination: finalDestination });

                await Swal.fire({
                    icon: 'success',
                    title: 'เรียบร้อย',
                    text: 'บันทึกข้อมูลการขนส่งเรียบร้อย',
                    timer: 1500,
                    showConfirmButton: false
                });

                // Clear selection
                setSelectedIds(new Set());
            } catch (error) {
                console.error('Logistics Error:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    text: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล'
                });
            }
        }
    };

    // Helper to check if all filtered items are selected
    const isAllFilteredSelected = filteredItems.length > 0 && filteredItems.every(i => selectedIds.has(i.id));

    return (
        <div className="h-full flex">
            {/* Left Sidebar - Item List */}
            <div className="w-80 border-r border-slate-700 bg-slate-800 flex flex-col">
                <div className="p-4 border-b border-slate-700 font-bold text-slate-200 flex justify-between items-center">
                    <span>รายการสินค้า ({selectedIds.size}/{logisticsItems.length})</span>
                    <Truck className="w-4 h-4 text-blue-400" />
                </div>

                {/* Search */}
                <div className="p-2 border-b border-slate-700 bg-slate-700/50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                        <input
                            type="text"
                            placeholder="ค้นหาสินค้า..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-700 border border-slate-600 rounded text-slate-200 placeholder-slate-400 focus:ring-1 focus:ring-blue-400 outline-none"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                                title="ล้างการค้นหา"
                                aria-label="ล้างการค้นหา"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Branch Filter */}
                <div className="p-2 border-b border-slate-700">
                    <select
                        value={selectedBranch}
                        onChange={e => setSelectedBranch(e.target.value)}
                        className="w-full text-xs p-2 border border-slate-600 rounded-lg bg-slate-700 text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                        title="กรองตามสาขา"
                    >
                        <option value="All">ทุกสาขา (All Branches)</option>
                        {uniqueBranches.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                </div>

                {/* Select All Button */}
                <div className="p-2 border-b border-slate-700">
                    <button
                        onClick={handleSelectAll}
                        className="w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600"
                    >
                        {isAllFilteredSelected ? (
                            <><X className="w-4 h-4" /> ยกเลิกเลือกทั้งหมด</>
                        ) : (
                            <><CheckCircle className="w-4 h-4" /> เลือกทั้งหมด ({filteredItems.length})</>
                        )}
                    </button>
                </div>

                {/* Items List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {filteredItems.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 text-xs italic">
                            <div className="flex flex-col items-center">
                                <Inbox className="w-8 h-8 mb-2 opacity-50" />
                                <span>{searchQuery || selectedBranch !== 'All' ? 'ไม่พบรายการที่ค้นหา' : 'ไม่มีรายการสินค้าที่รอจัดส่ง'}</span>
                            </div>
                        </div>
                    ) : (
                        filteredItems.map(item => {
                            const isSelected = selectedIds.has(item.id);
                            const isNCR = item.id.startsWith('NCR') || item.ncrNumber;
                            const displayID = isNCR ? (item.ncrNumber || item.id) : (item.refNo || item.id);
                            
                            return (
                                <div
                                    key={item.id}
                                    onClick={() => handleToggle(item.id)}
                                    className={`bg-slate-700 rounded-lg border transition-all overflow-hidden cursor-pointer ${
                                        isSelected
                                            ? 'border-blue-500 shadow-md ring-1 ring-blue-900/50'
                                            : 'border-slate-600 hover:border-slate-500'
                                    }`}
                                >
                                    <div className={`p-3 transition-colors ${isSelected ? 'bg-blue-900/30' : ''}`}>
                                        <div className="flex items-start gap-2 mb-2">
                                            {/* Checkbox */}
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                                                isSelected ? 'bg-blue-500 border-blue-500' : 'bg-slate-600 border-slate-500'
                                            }`}>
                                                {isSelected && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                            </div>
                                            
                                            {/* Badge */}
                                            {isNCR ? (
                                                <span className="inline-flex items-center gap-1 bg-blue-900/50 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-700/50">
                                                    <Package size={10} /> NCR
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 bg-purple-900/50 text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded border border-purple-700/50">
                                                    <Layers size={10} /> COL
                                                </span>
                                            )}
                                            <span className="text-[10px] text-slate-400 font-mono">{displayID}</span>
                                        </div>
                                        
                                        <div className="text-sm font-medium text-slate-100 truncate mb-1 pl-7">
                                            {item.productName}
                                        </div>
                                        
                                        <div className="flex justify-between items-center text-xs text-slate-400 pl-7">
                                            <span>{item.quantity} {item.unit}</span>
                                            <span className="flex items-center gap-1">
                                                <MapPin size={10} /> {item.branch}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer Stats */}
                <div className="p-3 border-t border-slate-700 bg-slate-800">
                    <div className="text-xs text-slate-400 text-center">
                        เลือก {selectedIds.size} จาก {logisticsItems.length} รายการ
                    </div>
                </div>
            </div>

            {/* Right Panel - Transport Form */}
            <div className="flex-1 overflow-y-auto bg-slate-900 p-8">
                <div className="max-w-2xl mx-auto space-y-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-blue-600 rounded-xl shadow-lg">
                            <Truck className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-100">รวบรวมและระบุขนส่ง</h2>
                            <p className="text-sm text-slate-400">Consolidation & Logistics</p>
                        </div>
                    </div>

                    {/* Transport Info */}
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                            <Box className="w-4 h-4 text-blue-400" /> ข้อมูลการขนส่ง
                        </h3>
                        
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-400 mb-1">ทะเบียนรถ</label>
                                    <input
                                        type="text"
                                        value={transportInfo.plateNumber}
                                        onChange={e => setTransportInfo({ ...transportInfo, plateNumber: e.target.value })}
                                        className="w-full p-2 border border-slate-600 rounded focus:ring-2 focus:ring-blue-500 bg-slate-700 text-slate-200 placeholder-slate-500"
                                        placeholder="เช่น 1กข-1234"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-400 mb-1">พนักงานขับรถ</label>
                                    <input
                                        type="text"
                                        value={transportInfo.driverName}
                                        onChange={e => setTransportInfo({ ...transportInfo, driverName: e.target.value })}
                                        className="w-full p-2 border border-slate-600 rounded focus:ring-2 focus:ring-blue-500 bg-slate-700 text-slate-200 placeholder-slate-500"
                                        placeholder="ชื่อ-นามสกุล"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-400 mb-2">บริษัทขนส่ง</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="transportType"
                                            checked={transportInfo.transportCompany === 'รถบริษัท'}
                                            onChange={() => setTransportInfo({ ...transportInfo, transportCompany: 'รถบริษัท' })}
                                            className="text-blue-400 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-slate-300">รถบริษัท</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="transportType"
                                            checked={transportInfo.transportCompany !== 'รถบริษัท'}
                                            onChange={() => setTransportInfo({ ...transportInfo, transportCompany: '' })}
                                            className="text-blue-400 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-slate-300">รถขนส่งร่วม</span>
                                    </label>
                                </div>
                                {transportInfo.transportCompany !== 'รถบริษัท' && (
                                    <input
                                        type="text"
                                        value={transportInfo.transportCompany === 'รถบริษัท' ? '' : transportInfo.transportCompany}
                                        onChange={e => setTransportInfo({ ...transportInfo, transportCompany: e.target.value })}
                                        className="w-full mt-2 p-2 border border-slate-600 rounded focus:ring-2 focus:ring-blue-500 bg-slate-700 text-slate-200 placeholder-slate-500"
                                        placeholder="ระบุชื่อบริษัทขนส่ง..."
                                        autoFocus
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Route Selection */}
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-green-400" /> เส้นทางส่งคืน (Route)
                        </h3>
                        
                        <div className="space-y-3">
                            <label className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                                routeType === 'Hub' 
                                    ? 'bg-blue-900/30 border-blue-500 shadow-sm' 
                                    : 'border-slate-600 hover:bg-slate-700/50'
                            }`}>
                                <input 
                                    type="radio" 
                                    name="route" 
                                    checked={routeType === 'Hub'} 
                                    onChange={() => setRouteType('Hub')} 
                                    className="mt-1" 
                                />
                                <div>
                                    <div className="font-bold text-slate-200">ส่งเข้า Hub (นครสวรรค์)</div>
                                    <div className="text-xs text-slate-400">ตรวจสอบคุณภาพ (QC) และรวมของ</div>
                                </div>
                            </label>
                            
                            <label className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                                routeType === 'Direct' 
                                    ? 'bg-green-900/30 border-green-500 shadow-sm' 
                                    : 'border-slate-600 hover:bg-slate-700/50'
                            }`}>
                                <input 
                                    type="radio" 
                                    name="route" 
                                    checked={routeType === 'Direct'} 
                                    onChange={() => setRouteType('Direct')} 
                                    className="mt-1" 
                                />
                                <div>
                                    <div className="font-bold text-slate-200">ส่งตรง (Direct Return)</div>
                                    <div className="text-xs text-slate-400">ไม่ผ่าน QC, ออกใบส่งของทันที</div>
                                </div>
                            </label>

                            {/* Direct Route Options */}
                            {routeType === 'Direct' && (
                                <div className="ml-8 p-4 bg-green-900/20 rounded-lg border border-green-700/50 space-y-2">
                                    <div className="text-xs font-bold text-green-400 mb-2">ระบุปลายทาง:</div>
                                    {['สาย 3', 'ซีโน', 'นีโอคอเปอเรท'].map(dest => (
                                        <label key={dest} className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
                                            <input 
                                                type="radio" 
                                                name="directDest" 
                                                value={dest} 
                                                checked={directDestination === dest} 
                                                onChange={e => setDirectDestination(e.target.value)} 
                                            />
                                            {dest}
                                        </label>
                                    ))}
                                    <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
                                        <input 
                                            type="radio" 
                                            name="directDest" 
                                            value="Other" 
                                            checked={directDestination === 'Other'} 
                                            onChange={e => setDirectDestination(e.target.value)} 
                                        />
                                        อื่นๆ (ระบุ)
                                    </label>
                                    {directDestination === 'Other' && (
                                        <input
                                            type="text"
                                            value={customDestination}
                                            onChange={e => setCustomDestination(e.target.value)}
                                            placeholder="ระบุปลายทาง..."
                                            className="w-full mt-1 p-2 text-sm border border-green-600/50 rounded focus:outline-none focus:border-green-500 bg-slate-700 text-slate-200 placeholder-slate-500"
                                            autoFocus
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end pt-4">
                        <button
                            onClick={confirmSelection}
                            disabled={selectedIds.size === 0}
                            className={`px-8 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all ${
                                selectedIds.size === 0
                                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                    : routeType === 'Hub'
                                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                                        : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                        >
                            {routeType === 'Hub' ? (
                                <>บันทึกและส่งเข้า Hub <ArrowRight className="w-5 h-5" /></>
                            ) : (
                                <>สร้างใบส่งของ (Direct) <Printer className="w-5 h-5" /></>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
