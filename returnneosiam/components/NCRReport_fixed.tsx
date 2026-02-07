import React, { useState } from 'react';
import { useData } from '../DataContext';
import { NCRRecord } from '../types';
import {
    FileText,
    Printer, Edit, Trash2, X,
    Eye
} from 'lucide-react';
import { formatDate } from '../utils/dateUtils';

const NCRReportFixed: React.FC = () => {
    const { ncrReports, deleteNCRReport } = useData();

    const [showPrintModal, setShowPrintModal] = useState(false);
    const [printItem] = useState<NCRRecord | null>(null);

    return (
        <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <FileText className="w-8 h-8 text-blue-600" />
                    NCR Report (Fixed)
                </h1>
                <div className="flex gap-2 font-bold no-print">
                    <button onClick={() => window.print()} className="bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm shadow-sm hover:bg-slate-700" title="Print this report">
                        <Printer className="w-4 h-4" /> Print
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                        <tr>
                            <th className="px-4 py-3">NCR No</th>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Founder</th>
                            <th className="px-4 py-3">Problem Source</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {ncrReports.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">No NCR reports found</td>
                            </tr>
                        ) : (
                            ncrReports.map((report) => (
                                <tr key={report.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 font-bold text-blue-600 font-mono">{report.ncrNo || report.id}</td>
                                    <td className="px-4 py-3 text-slate-600">{formatDate(report.date)}</td>
                                    <td className="px-4 py-3 text-slate-700">{report.founder}</td>
                                    <td className="px-4 py-3 text-slate-700">{report.item?.problemSource || '-'}</td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button className="p-1 text-slate-400 hover:text-blue-600 transition-colors" title="View"><Eye className="w-4 h-4" /></button>
                                            <button className="p-1 text-slate-400 hover:text-amber-600 transition-colors" title="Edit"><Edit className="w-4 h-4" /></button>
                                            <button onClick={() => deleteNCRReport(report.id)} className="p-1 text-slate-400 hover:text-red-600 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {showPrintModal && printItem && (
                <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
                    {/* Print Preview component would go here */}
                    <div className="bg-white p-6 rounded-xl relative max-w-4xl w-full">
                        <button onClick={() => setShowPrintModal(false)} className="absolute top-4 right-4" title="Close print preview"><X className="w-6 h-6" /></button>
                        <h2 className="text-xl font-bold mb-4">Print Preview</h2>
                        <div className="max-h-[70vh] overflow-auto">
                            <pre className="text-xs">{JSON.stringify(printItem, null, 2)}</pre>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NCRReportFixed;
