import React from 'react';
import { ReturnRecord } from '../types';
import { X, Printer } from 'lucide-react';
import { formatDate } from '../utils/dateUtils';

interface COLPrintPreviewProps {
    item: ReturnRecord;
    onClose: () => void;
}

export const COLPrintPreview: React.FC<COLPrintPreviewProps> = ({ item, onClose }) => {
    const handlePrint = () => {
        window.print();
    };

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
                    className="bg-white shadow-2xl mx-auto print:shadow-none print:mx-0 relative flex flex-col print-content-root a4-paper-container"
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
                        ใบรับคืนสินค้า (Collection Note)
                    </h1>

                    {/* Info Section */}
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm mb-6">
                        <div className="flex items-center gap-2">
                            <span className="font-bold w-24 text-slate-800">เลขที่เอกสาร:</span>
                            <div className="flex-1 border-b border-dotted border-black px-1 font-bold">{item.documentNo || item.id}</div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold w-20 text-slate-800">วันที่:</span>
                            <div className="flex-1 border-b border-dotted border-black px-1">{formatDate(item.date)}</div>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="font-bold w-24 text-slate-800">สาขา:</span>
                            <div className="flex-1 border-b border-dotted border-black px-1">{item.branch}</div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold w-20 text-slate-800">Invoice No:</span>
                            <div className="flex-1 border-b border-dotted border-black px-1">{item.invoiceNo || '-'}</div>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="font-bold w-24 text-slate-800">ลูกค้า:</span>
                            <div className="flex-1 border-b border-dotted border-black px-1">{item.customerName || '-'}</div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold w-20 text-slate-800">TM No:</span>
                            <div className="flex-1 border-b border-dotted border-black px-1">{item.tmNo || '-'}</div>
                        </div>

                        <div className="flex items-center gap-2 col-span-2">
                            <span className="font-bold w-24 text-slate-800">หมายเหตุ:</span>
                            <div className="flex-1 border-b border-dotted border-black px-1">{item.notes || '-'}</div>
                        </div>
                    </div>

                    {/* Main Table Content */}
                    <div className="mb-4 flex-1">
                        <table className="w-full border-collapse border border-black text-sm">
                            <thead className="print:table-header-group">
                                <tr className="bg-slate-100 print:bg-transparent">
                                    <th className="border border-black p-2 w-[15%] text-left">รหัสสินค้า</th>
                                    <th className="border border-black p-2 w-[40%] text-left">รายการสินค้า</th>
                                    <th className="border border-black p-2 w-[15%] text-center">จำนวน</th>
                                    <th className="border border-black p-2 w-[10%] text-center">หน่วย</th>
                                    <th className="border border-black p-2 w-[20%] text-left">หมายเหตุ</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="print:break-inside-avoid">
                                    <td className="border border-black p-2 valign-top text-xs font-bold">
                                        {item.productCode === 'N/A' ? '' : item.productCode}
                                    </td>
                                    <td className="border border-black p-2 valign-top text-xs">
                                        <div className="font-bold">{item.productName === 'N/A' ? '' : item.productName}</div>
                                        {item.destinationCustomer && (
                                            <div className="text-slate-500 text-[10px]">ปลายทาง: {item.destinationCustomer}</div>
                                        )}
                                    </td>
                                    <td className="border border-black p-2 text-center valign-top font-bold">
                                        {item.quantity}
                                    </td>
                                    <td className="border border-black p-2 text-center valign-top text-xs">
                                        {item.unit}
                                    </td>
                                    <td className="border border-black p-2 valign-top text-xs">
                                        {item.notes || '-'}
                                    </td>
                                </tr>
                                {/* Rows filler to make it look like a full page if needed, or just let it adjust naturally */}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer Signatures */}
                    <div className="mt-8 border-t-2 border-black pt-4 print:break-inside-avoid page-break-avoid">
                        <div className="flex justify-between mt-8 text-xs text-center px-8 pb-4">
                            <div className="flex flex-col gap-2 w-40">
                                <div className="border-b border-black h-8"></div>
                                <span>ผู้ส่งสินค้า / สาขา</span>
                                <div className="font-bold">(..........................)</div>
                                <div>วันที่: ..........................</div>
                            </div>
                            <div className="flex flex-col gap-2 w-40">
                                <div className="border-b border-black h-8"></div>
                                <span>พนักงานขับรถ / ขนส่ง</span>
                                <div className="font-bold">(..........................)</div>
                                <div>วันที่: ..........................</div>
                            </div>
                            <div className="flex flex-col gap-2 w-40">
                                <div className="border-b border-black h-8"></div>
                                <span>ผู้รับสินค้า / คลังสินค้า</span>
                                <div className="font-bold">(..........................)</div>
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

        .a4-paper-container {
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
