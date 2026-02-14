
import React from 'react';
import { RotateCcw, ShieldCheck, Home, Trash2, FileText, AlertOctagon } from 'lucide-react';
import { useData } from '../../../DataContext';
import { ReturnRecord, DispositionAction } from '../../../types';
import { KanbanColumn } from './KanbanColumn';
import Swal from 'sweetalert2';

interface Step7DocsProps {
    onPrintDocs?: (status: DispositionAction, list: ReturnRecord[]) => void;
}

export const Step7Docs: React.FC<Step7DocsProps> = ({ onPrintDocs }) => {
    const { items, updateReturnRecord, ncrReports } = useData();
    const [activeTab, setActiveTab] = React.useState<'NCR' | 'COLLECTION'>('NCR');

    // Filter Items:
    // We want items that have passed QC or are ready for documentation.
    // In strict NCR flow: 'NCR_QCCompleted' (from Step4HubQC)
    // In legacy/Collection flow: 'HubReceived' (if QC skipped) or 'QCCompleted'
    const processedItems = React.useMemo(() => {
        return items.filter(item => {
            // Check for verification (If NCR Report is Canceled, hide it)
            if (item.ncrNumber) {
                const linkedReport = ncrReports.find(r => r.ncrNo === item.ncrNumber);
                if (linkedReport && linkedReport.status === 'Canceled') {
                    return false;
                }
            }

            const isNCR = item.documentType === 'NCR' || !!item.ncrNumber || item.status.startsWith('NCR_');
            const isCollection = !isNCR;

            // 1. COL Flow: Skip QC -> Ready for Docs if received
            if (isCollection) {
                return (
                    item.status === 'COL_HubReceived' ||
                    item.status === 'ReceivedAtHub' ||
                    item.status === 'HubReceived' ||
                    item.status === 'QCCompleted' // Backwards compatibility
                );
            }

            // 2. NCR Flow: Must pass QC
            // FIXED: Changed from 'NCR_QCPassed' to 'NCR_QCCompleted' to match Step4HubQC output
            if (isNCR) {
                return (
                    item.status === 'NCR_QCCompleted' ||  // ✅ Current status from Step4HubQC
                    item.status === 'QCCompleted' ||         // ✅ Legacy compatibility
                    item.status === 'Settled_OnField'      // ✅ Bypass Logistics for Field Settlement
                );
            }

            return false;
        });
    }, [items, ncrReports]);


    const handlePrintClick = async (status: DispositionAction, list: ReturnRecord[]) => {
        if (onPrintDocs) {
            onPrintDocs(status, list);
        } else {
            console.error("onPrintDocs prop missing");
        }
    };

    const handleSplitClick = () => {
        Swal.fire({
            icon: 'info',
            title: 'ฟีเจอร์ยังไม่เปิดใช้งาน (Under Construction)',
            text: 'การแยกรายการ (Split) ในขั้นตอนนี้กำลังพัฒนา',
            confirmButtonText: 'รับทราบ'
        });
    };

    // Undo / Reverse Function
    const handleUndo = async (item: ReturnRecord) => {
        // Determine previous status based on current flow
        const isNCR = item.documentType === 'NCR' || !!item.ncrNumber || item.status.startsWith('NCR_');

        let targetStatus = '';
        let confirmText = '';

        if (isNCR) {
            // NCR: Back to QC Queue (Step 4)
            targetStatus = 'NCR_HubReceived';
            confirmText = 'ย้อนกลับไป "รอตรวจสอบคุณภาพ (QC)"';
        } else {
            // Collection: Back to Hub Receive Queue (Step 6 input)
            // Current Status is COL_HubReceived (Output of Step 6)
            // So we send it back to "InTransit" (Input of Step 6)
            targetStatus = 'COL_InTransit';
            confirmText = 'ย้อนกลับไป "รับสินค้าเข้า Hub"';
        }

        // Legacy handling
        if (item.status === 'QCCompleted') targetStatus = 'ReceivedAtHub'; // Back to QC input
        if (item.status === 'HubReceived') targetStatus = 'InTransitToHub'; // Back to Hub input

        const result = await Swal.fire({
            title: 'ยืนยันการย้อนกลับ (Undo)',
            text: `ต้องการ${confirmText} ใช่หรือไม่?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ใช่, ย้อนกลับ',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#f59e0b'
        });

        if (result.isConfirmed) {
            try {
                await updateReturnRecord(item.id, {
                    status: targetStatus
                });

                await Swal.fire({
                    icon: 'success',
                    title: 'เรียบร้อย',
                    text: 'ส่งรายการกลับเรียบร้อยแล้ว',
                    timer: 1500,
                    showConfirmButton: false
                });
            } catch (error) {
                console.error("Undo Error:", error);
                Swal.fire('Error', 'Failed to undo action', 'error');
            }
        }
    };

    // Helper: Identify NCR items
    const isNCRItem = (i: ReturnRecord) => i.ncrNumber || i.id.startsWith('NCR') || i.documentType === 'NCR';

    // Helper: Identify Collection items (strictly not NCR)
    const isCollectionItem = (i: ReturnRecord) => !isNCRItem(i);

    // Split items into main groups
    const ncrItems = React.useMemo(() => processedItems.filter(isNCRItem), [processedItems]);
    const colItems = React.useMemo(() => processedItems.filter(isCollectionItem), [processedItems]);

    // Current Display List based on Tab
    const currentItems = activeTab === 'NCR' ? ncrItems : colItems;

    // Map to safe items (default disposition)
    const safeItems = currentItems.map(i => ({
        ...i,
        disposition: i.disposition || 'RTV' // Default to RTV if missing
    }));

    // Filter by Disposition for Kanban
    const itemsRTV = safeItems.filter(i => i.disposition === 'RTV');
    const itemsRestock = safeItems.filter(i => i.disposition === 'Restock');
    const itemsClaim = safeItems.filter(i => i.disposition === 'Claim');
    const itemsInternal = safeItems.filter(i => i.disposition === 'InternalUse');
    const itemsScrap = safeItems.filter(i => i.disposition === 'Recycle' || (i.disposition as string) === 'Scrap');

    return (
        <div className="h-full flex flex-col p-3 md:p-4">
            {/* Tabs */}
            <div className="flex gap-4 mb-4 border-b border-slate-200 pb-2">
                <button
                    onClick={() => setActiveTab('NCR')}
                    className={`px-6 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${activeTab === 'NCR'
                        ? 'bg-amber-100 text-amber-700 border border-amber-200 shadow-sm'
                        : 'bg-white text-slate-500 hover:bg-slate-50'
                        }`}
                >
                    <AlertOctagon className="w-5 h-5" />
                    รายการ NCR ({ncrItems.length})
                </button>
                <button
                    onClick={() => setActiveTab('COLLECTION')}
                    className={`px-6 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${activeTab === 'COLLECTION'
                        ? 'bg-teal-100 text-teal-700 border border-teal-200 shadow-sm'
                        : 'bg-white text-slate-500 hover:bg-slate-50'
                        }`}
                >
                    <FileText className="w-5 h-5" />
                    รายการ Collection ({colItems.length})
                </button>
            </div>

            {/* Kanban Board */}
            <div className="flex-1 overflow-x-auto flex gap-4">
                <KanbanColumn
                    title={activeTab === 'NCR' ? "สินค้าส่งคืน NCR (RTV)" : "สินค้าส่งคืน Collection (RTV)"}
                    status="RTV"
                    icon={activeTab === 'NCR' ? AlertOctagon : FileText}
                    color={activeTab === 'NCR' ? "bg-amber-600" : "bg-teal-600"}
                    items={itemsRTV}
                    onPrintClick={handlePrintClick}
                    onSplitClick={handleSplitClick}
                    onUndoClick={handleUndo}
                    overrideFilter={true}
                />

                {activeTab === 'NCR' && (
                    <>
                        <KanbanColumn title="สินค้าสำหรับขาย (Restock)" status="Restock" icon={RotateCcw} color="bg-green-500" items={itemsRestock} onPrintClick={handlePrintClick} onSplitClick={handleSplitClick} onUndoClick={handleUndo} />
                        <KanbanColumn title="สินค้าสำหรับเคลม (Claim)" status="Claim" icon={ShieldCheck} color="bg-blue-500" items={itemsClaim} onPrintClick={handlePrintClick} onSplitClick={handleSplitClick} onUndoClick={handleUndo} />
                        <KanbanColumn title="สินค้าใช้ภายใน (Internal)" status="InternalUse" icon={Home} color="bg-purple-500" items={itemsInternal} onPrintClick={handlePrintClick} onSplitClick={handleSplitClick} onUndoClick={handleUndo} />
                        <KanbanColumn title="สินค้าสำหรับทำลาย (Scrap)" status="Recycle" icon={Trash2} color="bg-red-500" items={itemsScrap} onPrintClick={handlePrintClick} onSplitClick={handleSplitClick} onUndoClick={handleUndo} />
                    </>
                )}
            </div>
        </div>
    );
};
