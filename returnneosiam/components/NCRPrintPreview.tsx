import React from 'react';
import { NCRRecord } from '../types';
import { X, Printer, Save } from 'lucide-react';

interface NCRPrintPreviewProps {
    item: NCRRecord;
    onUpdate: (item: NCRRecord) => void;
    onClose: () => void;
    onSave: () => Promise<void>;
}

export const NCRPrintPreview: React.FC<NCRPrintPreviewProps> = ({ item, onUpdate, onClose, onSave }) => {
    const handlePrint = () => {
        window.print();
    };

    const getProblemStrings = (record: NCRRecord) => {
        if (!record) return [];
        const problems = [];
        if (record.problemDamaged) problems.push("ชำรุด");
        if (record.problemDamagedInBox) problems.push("ชำรุดในกล่อง");
        if (record.problemLost) problems.push("สูญหาย");
        if (record.problemMixed) problems.push("สินค้าสลับ");
        if (record.problemWrongInv) problems.push("สินค้าไม่ตรง INV.");
        if (record.problemLate) problems.push("ส่งช้า");
        if (record.problemDuplicate) problems.push("ส่งซ้ำ");
        if (record.problemWrong) problems.push("ส่งผิด");
        if (record.problemIncomplete) problems.push("ส่งของไม่ครบ");
        if (record.problemOver) problems.push("ส่งของเกิน");
        if (record.problemWrongInfo) problems.push("ข้อมูลผิด");
        if (record.problemShortExpiry) problems.push("สินค้าอายุสั้น");
        if (record.problemTransportDamage) problems.push("สินค้าเสียหายบนรถขนส่ง");
        if (record.problemAccident) problems.push("อุบัติเหตุ");
        if (record.problemPOExpired) problems.push("PO. หมดอายุ");
        if (record.problemNoBarcode) problems.push("ไม่ได้สั่งสินค้า");
        if (record.problemNotOrdered) problems.push("บาร์โค้ดไม่ขึ้น");
        if (record.problemOther) problems.push(`อื่นๆ: ${record.problemOtherText || '-'}`);
        return problems;
    };

    const itemData = item.item || (item as any);

    return (
        <div className="fixed inset-0 bg-slate-900/50 flex flex-col items-center justify-start z-[9999] overflow-y-auto no-scrollbar print:static print:bg-white print:overflow-visible print:p-0 print:block">

            {/* Toolbar - Hidden on Print */}
            <div className="sticky top-0 w-full bg-white border-b border-slate-200 shadow-sm p-4 flex justify-between items-center z-50 print:hidden shrink-0">
                <div className="flex items-center gap-3">
                    <Printer className="w-5 h-5 text-slate-600" />
                    <h2 className="font-bold text-slate-800">Print Preview (A4 Mode)</h2>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={onSave}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-bold text-sm transition-colors border border-blue-200"
                    >
                        <Save className="w-4 h-4" /> บันทึกการแก้ไข
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-bold text-sm transition-colors shadow-sm"
                    >
                        <Printer className="w-4 h-4" /> สั่งพิมพ์
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                        aria-label="ปิด"
                        title="ปิด"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* A4 Paper Container - Visual Feedback */}
            <div className="my-8 print:m-0 print:w-full">
                <div
                    className="bg-white shadow-2xl mx-auto print:shadow-none print:mx-0 relative flex flex-col print-content-root ncr-a4-container"
                >
                    {/* Header */}
                    <div className="flex border-2 border-black mb-4">
                        <div className="w-[30%] border-r-2 border-black p-2 flex items-center justify-center">
                            <img src="https://img2.pic.in.th/pic/logo-neo.png" alt="Neo Logistics" className="w-full h-auto object-contain max-h-20" />
                        </div>
                        <div className="w-[70%] p-2 flex flex-col justify-center pl-4">
                            <h2 className="text-lg font-bold text-slate-900 leading-none mb-1">บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด</h2>
                            <h3 className="text-xs font-bold text-slate-700 mb-2">NEOSIAM LOGISTICS & TRANSPORT CO., LTD.</h3>
                            <p className="text-xs text-slate-600 mb-0.5">159/9-10 หมู่ 7 ต.บางม่วง อ.เมืองนครสวรรค์ จ.นครสวรรค์ 60000</p>
                            <div className="text-xs text-slate-600 flex gap-4"><span>Tax ID: 0105552087673</span><span>|</span><span>Tel: 056-275-841</span></div>
                        </div>
                    </div>

                    <h1 className="text-lg font-bold text-center border-2 border-black py-1.5 mb-4 bg-white text-slate-900 print:bg-transparent uppercase tracking-wide">
                        ใบแจ้งปัญหาระบบ (NCR) / ใบแจ้งปัญหารับสินค้าคืน
                    </h1>

                    {/* Info Section */}
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm mb-6">
                        <div className="flex items-center gap-2">
                            <label htmlFor="ncr-todept" className="font-bold w-24 text-slate-800">ถึงหน่วยงาน:</label>
                            <input
                                id="ncr-todept"
                                type="text"
                                value={item.toDept || 'แผนกควบคุมคุณภาพ'}
                                onChange={(e) => onUpdate({ ...item, toDept: e.target.value })}
                                className="flex-1 border-b border-dotted border-black px-1 focus:outline-none bg-transparent"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label htmlFor="ncr-date" className="font-bold w-20 text-slate-800">วันที่:</label>
                            <input
                                id="ncr-date"
                                type="text"
                                value={item.date}
                                onChange={(e) => onUpdate({ ...item, date: e.target.value })}
                                className="flex-1 border-b border-dotted border-black px-1 focus:outline-none bg-transparent"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label htmlFor="ncr-copyto" className="font-bold w-24 text-slate-800">สำเนา:</label>
                            <input
                                id="ncr-copyto"
                                type="text"
                                value={item.copyTo || ''}
                                onChange={(e) => onUpdate({ ...item, copyTo: e.target.value })}
                                className="flex-1 border-b border-dotted border-black px-1 focus:outline-none bg-transparent"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold w-20 text-slate-800">เลขที่ NCR:</span>
                            <div className="flex-1 border-b border-dotted border-black px-1 font-bold">{item.ncrNo || item.id?.split('-')[0] || '-'}</div>
                        </div>
                        <div className="flex items-center gap-2">
                            <label htmlFor="ncr-founder" className="font-bold w-24 text-slate-800">ผู้พบปัญหา:</label>
                            <input
                                id="ncr-founder"
                                type="text"
                                value={item.founder || ''}
                                onChange={(e) => onUpdate({ ...item, founder: e.target.value })}
                                className="flex-1 border-b border-dotted border-black px-1 focus:outline-none bg-transparent"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label htmlFor="ncr-pono" className="font-bold w-20 text-slate-800">เลขที่สั่งซื้อ:</label>
                            <input
                                id="ncr-pono"
                                type="text"
                                value={item.poNo || ''}
                                onChange={(e) => onUpdate({ ...item, poNo: e.target.value })}
                                className="flex-1 border-b border-dotted border-black px-1 focus:outline-none bg-transparent"
                            />
                        </div>
                    </div>

                    {/* Main Table Content - Supports Multi-Page Flow via CSS */}
                    <div className="mb-4">
                        <h3 className="font-bold text-sm mb-2 underline decoration-2 decoration-black">รายการสินค้าที่พบปัญหา (Non-Conforming Items)</h3>
                        <table className="w-full border-collapse border border-black text-sm">
                            <thead className="print:table-header-group">
                                <tr className="bg-slate-100 print:bg-transparent">
                                    <th className="border border-black p-2 w-[15%] text-left">สาขาต้นทาง</th>
                                    <th className="border border-black p-2 w-[20%] text-left">Ref / Neo Ref</th>
                                    <th className="border border-black p-2 w-[25%] text-left">สินค้า/ลูกค้า</th>
                                    <th className="border border-black p-2 w-[10%] text-center">จำนวน</th>
                                    <th className="border border-black p-2 w-[15%] text-right">ราคา/วันหมดอายุ</th>
                                    <th className="border border-black p-2 w-[15%] text-left">วิเคราะห์/ค่าใช้จ่าย</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="print:break-inside-avoid">
                                    <td className="border border-black p-2 valign-top text-xs">
                                        {itemData.branch}
                                    </td>
                                    <td className="border border-black p-2 valign-top text-xs">
                                        <div><span className="font-bold">Ref:</span> {itemData.refNo || '-'}</div>
                                        <div><span className="font-bold">Neo:</span> {itemData.neoRefNo || '-'}</div>
                                    </td>
                                    <td className="border border-black p-2 valign-top text-xs">
                                        <div className="font-bold">{itemData.productCode}</div>
                                        <div className="mb-1">{itemData.productName}</div>
                                        <div className="text-slate-500 italic">{itemData.customerName}</div>
                                        <div className="text-slate-500 text-[10px]">ปลายทาง: {itemData.destinationCustomer || '-'}</div>
                                    </td>
                                    <td className="border border-black p-2 text-center valign-top font-bold">
                                        {itemData.quantity} {itemData.unit}
                                    </td>
                                    <td className="border border-black p-2 text-right valign-top text-xs">
                                        <div className="mb-1">{itemData.priceBill?.toLocaleString()} บ.</div>
                                        <div className="text-red-500">Exp: {itemData.expiryDate || '-'}</div>
                                    </td>
                                    <td className="border border-black p-2 valign-top text-xs">
                                        <div className="font-bold underline">{itemData.problemSource}</div>
                                        {itemData.hasCost && (
                                            <div className="mt-1">
                                                <div className="text-red-600 font-bold">Cost: {itemData.costAmount?.toLocaleString()} บ.</div>
                                                <div className="text-[10px]">({itemData.costResponsible})</div>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                                {/* Note: In a real multi-item scenario, we would map over items here. 
                    Since current NCR structure seems to be 1 NCR = 1 Main Item + Details, we display one main row.
                    However, the 'Problem Details' section below might grow. */}
                            </tbody>
                        </table>
                    </div>

                    {/* Problem Details & Signature - Block that should try to stay together or break cleanly */}
                    <div className="border border-black flex flex-col flex-1 min-h-0 print:break-inside-avoid">
                        {/* Header for this section */}
                        <div className="bg-slate-50 border-b border-black p-2 flex justify-between font-bold text-sm print:bg-transparent">
                            <div className="w-1/2 text-center">รูปภาพ / เอกสาร</div>
                            <div className="w-1/2 text-center border-l border-black">รายละเอียดของปัญหาที่พบ (ผู้พบปัญหา)</div>
                        </div>

                        <div className="flex flex-1 min-h-[300px]">
                            {/* Left Column: Images */}
                            <div className="w-1/2 p-2 border-r border-black flex flex-col items-center justify-start">
                                {item.images && item.images.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-1 w-full">
                                        {item.images.map((img, idx) => (
                                            <img key={idx} src={img} alt={`NCR ${idx + 1}`} className="w-full aspect-square object-cover rounded border border-slate-200" loading="lazy" />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center text-slate-300 mt-8">
                                        <p className="text-sm">ไม่มีรูปภาพ</p>
                                    </div>
                                )}
                            </div>

                            {/* Right Column: Checkboxes and Details */}
                            <div className="w-1/2 p-4 flex flex-col gap-3">
                                <div className="text-xs font-bold underline mb-2">พบปัญหาที่กระบวนการ</div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    {getProblemStrings(item).length > 0 ? (
                                        getProblemStrings(item).map((s, idx) => (
                                            <div key={idx} className="flex items-center gap-2">
                                                <div className="w-3 h-3 border border-black bg-black flex items-center justify-center">
                                                    <span className="text-white text-[10px] pb-1">✓</span>
                                                </div>
                                                <span>{s}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="col-span-2 text-slate-400 italic">ไม่ระบุปัญหา</div>
                                    )}
                                </div>

                                <div className="mt-4 flex flex-col flex-1">
                                    <label htmlFor="ncr-detail" className="text-xs font-bold mb-1">รายละเอียด:</label>
                                    <textarea
                                        id="ncr-detail"
                                        value={item.problemDetail}
                                        onChange={(e) => onUpdate({ ...item, problemDetail: e.target.value })}
                                        className="w-full flex-1 border border-dotted border-black p-2 text-xs resize-none min-h-[100px] outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Signatures - Critical: break-inside-avoid to keep signatures together */}
                    <div className="mt-4 border-t-2 border-black pt-4 print:break-inside-avoid page-break-avoid">
                        <div className="grid grid-cols-2 gap-8 text-sm">

                            {/* Left: Operations Actions */}
                            <div className="border border-black p-4">
                                <h4 className="font-bold underline mb-3 text-center">การดำเนินการ</h4>
                                <div className="space-y-2 text-xs">
                                    <label className="flex items-center gap-2">
                                        <input type="checkbox" checked={item.actionReject || item.actionRejectSort} readOnly />
                                        <span>ส่งคืน (Reject) / คัดแยก (Sort)</span>
                                        {item.actionRejectSortQty && <span className="ml-auto underline">จำนวน: {item.actionRejectSortQty}</span>}
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input type="checkbox" checked={item.actionScrap} readOnly />
                                        <span>ทำลาย (Scrap)</span>
                                        {item.actionScrapQty && <span className="ml-auto underline">จำนวน: {item.actionScrapQty}</span>}
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input type="checkbox" checked={item.actionSpecialAcceptance} readOnly />
                                        <span>ยอมรับกรณีพิเศษ</span>
                                    </label>
                                </div>
                            </div>

                            {/* Right: RCA & Prevention */}
                            <div className="border border-black p-4">
                                <h4 className="font-bold underline mb-3 text-center">สาเหตุ & การป้องกัน</h4>
                                <div className="space-y-2 text-xs">
                                    <div className="flex gap-4 mb-2">
                                        <label className="flex items-center gap-1"><input type="checkbox" checked={item.causePackaging} readOnly /> Packaging</label>
                                        <label className="flex items-center gap-1"><input type="checkbox" checked={item.causeTransport} readOnly /> Transport</label>
                                        <label className="flex items-center gap-1"><input type="checkbox" checked={item.causeOperation} readOnly /> Operation</label>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="font-bold">สาเหตุ:</span>
                                        <div className="border-b border-dotted border-black min-h-[20px]">{item.causeDetail || '-'}</div>
                                    </div>
                                    <div className="flex flex-col gap-1 mt-2">
                                        <span className="font-bold">การป้องกัน:</span>
                                        <div className="border-b border-dotted border-black min-h-[20px]">{item.preventionDetail || '-'}</div>
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* Signatures */}
                        <div className="flex justify-between mt-8 text-xs text-center px-8 pb-4">
                            <div className="flex flex-col gap-2 w-40">
                                <div className="border-b border-black h-8"></div>
                                <span>ผู้แจ้งปัญหา</span>
                                <div className="font-bold">({item.founder || '..........................'})</div>
                                <div>วันที่: {item.date}</div>
                            </div>
                            <div className="flex flex-col gap-2 w-40">
                                <div className="border-b border-black h-8"></div>
                                <span>ผู้รับทราบ / ดำเนินการ</span>
                                <div className="font-bold">({item.responsiblePerson || '..........................'})</div>
                                <div>วันที่: ..........................</div>
                            </div>
                            <div className="flex flex-col gap-2 w-40">
                                <div className="border-b border-black h-8"></div>
                                <span>ผู้อนุมัติ (Manager)</span>
                                <div className="font-bold">({item.approver || '..........................'})</div>
                                <div>วันที่: ..........................</div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Print Styles Injection */}
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap');
        
        .print-content-root {
          font-family: 'Sarabun', 'TH Sarabun New', sans-serif;
        }

        .ncr-a4-container {
          width: 210mm;
          min-height: 297mm;
          padding: 10mm 15mm;
        }

        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body {
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-content-root {
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:table-header-group {
            display: table-header-group !important;
          }
          .print\\:break-inside-avoid {
             page-break-inside: avoid !important;
             break-inside: avoid !important;
          }
        }
      `}</style>
        </div>
    );
};
