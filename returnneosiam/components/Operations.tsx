import React, { useState } from 'react';
import {
  Menu, Truck, Activity,
  FileText, LayoutGrid, CheckCircle, ShieldCheck,
  ClipboardList, FileInput
} from 'lucide-react';
import { useOperationsLogic } from './operations/hooks/useOperationsLogic';
import { Step1LogisticsRequest } from './operations/components/Step1LogisticsRequest';
import { Step2JobAccept } from './operations/components/Step2JobAccept';
import { Step3BranchReceive } from './operations/components/Step3BranchReceive';
import { Step4Consolidation } from './operations/components/Step4Consolidation';
import { Step4HubQC } from './operations/components/Step4HubQC';
import { Step2NCRLogistics } from './operations/components/Step2NCRLogistics';
import { Step6HubReceive } from './operations/components/Step6HubReceive';
import { Step7Docs } from './operations/components/Step7Docs';
import { Step8Closure } from './operations/components/Step8Closure';
import { StepCompleted } from './operations/components/StepCompleted';
import { ReturnRecord } from '../types';
import { SelectionModal } from './operations/components/SelectionModal';
import { DocumentPreviewModal } from './operations/components/DocumentPreviewModal';
import { Step4SplitModal } from './operations/components/Step4SplitModal';

interface OperationsProps {
  initialData?: Partial<ReturnRecord> | null;
  onClearInitialData?: () => void;
  initialStep?: number;
}

export const Operations: React.FC<OperationsProps> = ({ initialData, onClearInitialData, initialStep }) => {
  const { state, actions, derived } = useOperationsLogic(initialData, onClearInitialData);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  React.useEffect(() => {
    if (initialStep) {
      actions.setActiveStep(initialStep);
    }
  }, [initialStep]);

  // New Menu Structure mapping to the Flowchart
  const MENU_ITEMS = [
    // --- ORANGE FLOW (Inbound Logistics / COL) ---
    { id: 1, label: '1. ใบสั่งงานรับกลับ (Import Excel)', icon: FileInput, count: undefined, color: 'text-orange-500', group: 'Inbound Logistics (COL)' },
    { id: 12, label: '2. รับงาน (Receive Job)', icon: ClipboardList, count: derived.step2Items.length || undefined, color: 'text-orange-500', group: 'Inbound Logistics (COL)' },
    { id: 13, label: '3. รับสินค้า (Physical Receive)', icon: Activity, count: derived.step3Items.length || undefined, color: 'text-orange-500', group: 'Inbound Logistics (COL)' },
    { id: 14, label: '4. รวมสินค้า (Branch Consolidation)', icon: LayoutGrid, count: derived.step4Items.length || undefined, color: 'text-orange-500', group: 'Inbound Logistics (COL)' },


    // --- BLUE FLOW (NCR System) ---
    { id: 2, label: '2. รวบรวมและระบุขนส่ง (Consolidation & Logistics)', icon: Truck, count: derived.ncrStep2Items?.length || undefined, color: 'text-indigo-600', group: 'NCR Hub' },
    { id: 3, label: '3. รับสินค้าเข้า Hub (Received at Hub)', icon: LayoutGrid, count: derived.step6Items.length || undefined, color: 'text-indigo-600', group: 'NCR Hub' },
    { id: 4, label: '4. ตรวจสอบคุณภาพ (QC)', icon: ShieldCheck, count: undefined, color: 'text-indigo-600', group: 'NCR Hub' },
    { id: 5, label: '5. ส่งเอกสารคืน (Docs)', icon: FileText, count: derived.step7Items.length || undefined, color: 'text-indigo-600', group: 'NCR Hub' },
    { id: 6, label: '6. รายการรอปิดงาน (Pending Completion)', icon: Activity, count: derived.step8Items.length || undefined, color: 'text-indigo-600', group: 'NCR Hub' },
    { id: 7, label: '7. รายการที่จบงานแล้ว (Completed)', icon: CheckCircle, count: undefined, color: 'text-green-600', group: 'NCR Hub' },
  ];

  const renderContent = () => {
    switch (state.activeStep) {
      // --- Orange Flow Step 1: Import Excel / Create Return Request ---
      case 1:
        return (
          <Step1LogisticsRequest
            formData={state.formData}
            requestItems={state.requestItems}
            setFormData={actions.setFormData}
            handleRequestSubmit={actions.handleRequestSubmit}
            uniqueCustomers={derived.uniqueCustomers}
            uniqueDestinations={derived.uniqueDestinations}
            existingItems={derived.requestedItems}
          />
        );

      // --- Orange Flow Steps ---
      case 12: return <Step2JobAccept />;
      case 13: return <Step3BranchReceive />;
      case 14: return <Step4Consolidation />;

      // --- Blue Operations (Hub) Steps ---
      case 2:
        // Logic: NCR Items Consolidation & Decision (Direct Return vs Hub)
        return <Step2NCRLogistics onConfirm={actions.handleLogisticsSubmit} />;

      case 3:
        // Hub Receive (Old Step 6)
        return <Step6HubReceive />;

      case 4:
        return <Step4HubQC />;

      case 5:
        // Docs (Old Step 7, now Step 5 in UI flow)
        return <Step7Docs onPrintDocs={actions.handlePrintClick} />;

      case 6:
        // Closure (Old Step 8)
        return <Step8Closure />;

      case 7:
        // Completed View
        return <StepCompleted />;

      default:
        return <div className="p-8 text-center text-slate-400">อยู่ระหว่างปรับปรุง (Step Coming Soon)</div>;
    }
  };

  return (
    <div className="flex bg-[#0f172a] h-screen overflow-hidden font-sans text-slate-200">
      {/* Mobile Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-30 transition-opacity duration-300 lg:hidden ${sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setSidebarOpen(false)}
      />
      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 w-72 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 shadow-2xl z-40 overflow-hidden
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:static lg:translate-x-0 ${!sidebarOpen ? 'lg:-translate-x-full' : 'lg:translate-x-0'}
        `}
      >
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-sm">
          {sidebarOpen && (
            <div className="font-extrabold text-xl text-white tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-900/50 ring-1 ring-white/10">
                <LayoutGrid className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black uppercase tracking-wider text-white">Operations</span>
                <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Hub Center</span>
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
            aria-label={sidebarOpen ? "ซ่อนเมนู" : "แสดงเมนู"}
            title={sidebarOpen ? "ซ่อนเมนูด้านข้าง" : "แสดงเมนูด้านข้าง"}
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-6 scrollbar-thin scrollbar-thumb-slate-700">
          {['Inbound Logistics (COL)', 'NCR Hub'].map((group) => {
            const items = MENU_ITEMS.filter(i => i.group === group);
            if (items.length === 0) return null;
            return (
              <div key={group}>
                {sidebarOpen && <div className="px-4 mb-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">{group}</div>}
                <div className="space-y-1">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => actions.setActiveStep(item.id)}
                      className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative overflow-hidden
                          ${state.activeStep === item.id
                          ? (group === 'Inbound Logistics (COL)'
                            ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-lg shadow-orange-900/40 translate-x-1'
                            : 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-900/40 translate-x-1')
                          : 'text-white/90 hover:bg-white/5 hover:text-white'
                        }`}
                    >
                      {/* Active Indicator */}
                      {state.activeStep === item.id && (
                        <div className="absolute inset-y-0 left-0 w-1 bg-white rounded-r-full"></div>
                      )}

                      <div className={`relative z-10 p-1.5 rounded-lg transition-all duration-200 ${state.activeStep === item.id ? 'text-white' : 'text-slate-500 group-hover:text-indigo-400'}`}>
                        <item.icon className="w-5 h-5" />
                      </div>

                      {sidebarOpen && (
                        <div className="relative z-10 flex-1 text-left flex items-center justify-between">
                          <span className="text-sm font-bold tracking-tight text-white">{item.label}</span>
                          {item.count && (
                            <span className={`text-[10px] min-w-[20px] h-5 flex items-center justify-center rounded-full font-bold px-1.5
                                ${state.activeStep === item.id ? 'bg-white text-indigo-600 shadow-sm' : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-white'}`}>
                              {item.count}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Hover shine effect */}
                      <div className="absolute inset-0 bg-white/5 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12 pointer-events-none"></div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="p-6 border-t border-slate-800 bg-slate-900/50">
          {sidebarOpen ? (
            <div className="text-center">
              <div className="text-xs font-bold text-slate-300">Neosiam Logistics</div>
              <div className="text-[10px] text-slate-500 font-mono mt-1">v3.0.0-PRO</div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            </div>
          )}
        </div>
      </aside>

      {/* Floating Toggle Button - Desktop only (top-left) */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-4 left-4 z-50 p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-900/50 transition-all duration-300 hover:scale-105 active:scale-95 hidden lg:block"
          aria-label="แสดงเมนู"
          title="แสดงเมนูด้านข้าง"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Mobile Toggle - Bottom FAB on small screens only */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed bottom-6 left-6 z-50 p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-2xl shadow-indigo-900/50 transition-all lg:hidden active:scale-95"
          aria-label="เปิดเมนู"
        >
          <Menu className="w-6 h-6" />
        </button>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#0f172a] relative">
        {/* Background Gradients */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2"></div>
        </div>

        <div className="flex-1 overflow-hidden p-2 sm:p-4 lg:p-8 relative z-10">
          <div className="h-full bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            {renderContent()}
          </div>
        </div>
      </main>

      {/* Modals */}
      {state.showSelectionModal && (
        <SelectionModal
          isOpen={state.showSelectionModal}
          onClose={() => actions.setShowSelectionModal(false)}
          selectionItems={state.selectionItems}
          selectedItemIds={state.selectedItemIds}
          toggleSelection={actions.toggleSelection}
          handleGenerateDoc={actions.handleGenerateDoc}
          selectionStatus={state.selectionStatus}
          onSplit={actions.handleDocItemClick}
        />
      )}

      {state.showDocModal && state.docData && (
        <DocumentPreviewModal
          isOpen={state.showDocModal}
          onClose={() => actions.setShowDocModal(false)}
          docData={state.docData}
          docConfig={state.docConfig}
          setDocConfig={actions.setDocConfig}
          includeVat={state.includeVat}
          vatRate={state.vatRate}
          includeDiscount={state.includeDiscount}
          discountRate={state.discountRate}
          isDocEditable={state.isDocEditable}
          setIncludeVat={actions.setIncludeVat}
          setVatRate={actions.setVatRate}
          setIncludeDiscount={actions.setIncludeDiscount}
          setDiscountRate={actions.setDiscountRate}
          setIsDocEditable={actions.setIsDocEditable}
          handleConfirmDocGeneration={actions.handleConfirmDocGeneration}
          onUpdateItem={actions.handleUpdateDocItem}
          isSubmitting={state.isSubmittingDoc}
        />
      )}

      {state.showStep4SplitModal && state.docSelectedItem && (
        <Step4SplitModal
          isOpen={state.showStep4SplitModal}
          onClose={() => actions.setShowStep4SplitModal(false)}
          item={state.docSelectedItem}
          onConfirm={actions.handleStep4SplitSubmit}
        />
      )}
    </div>
  );
};

export default Operations;