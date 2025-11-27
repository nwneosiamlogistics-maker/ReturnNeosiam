
import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ReturnSearch from './components/ReturnSearch';
import Operations from './components/Operations';
import NCRSystem from './components/NCRSystem';
import NCRReport from './components/NCRReport';
import { AppView, ReturnRecord } from './types';
import { Bell, Search } from 'lucide-react';
import { DataProvider } from './DataContext';

const MainApp: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [transferData, setTransferData] = useState<Partial<ReturnRecord> | null>(null);

  const handleNCRTransfer = (data: Partial<ReturnRecord>) => {
    setTransferData(data);
    setCurrentView(AppView.OPERATIONS);
  };

  const renderContent = () => {
    switch (currentView) {
      case AppView.DASHBOARD:
        return <Dashboard />;
      case AppView.OPERATIONS:
        return (
          <Operations 
            initialData={transferData} 
            onClearInitialData={() => setTransferData(null)} 
          />
        );
      case AppView.NCR:
        return <NCRSystem />;
      case AppView.NCR_REPORT:
        return <NCRReport onTransfer={handleNCRTransfer} />;
      case AppView.SEARCH:
        return <ReturnSearch />;
      default:
        return <Dashboard />;
    }
  };

  const getHeaderTitle = () => {
    switch (currentView) {
      case AppView.DASHBOARD: return 'ภาพรวมระบบ (System Overview)';
      case AppView.OPERATIONS: return 'ศูนย์ปฏิบัติการคืนสินค้า (Return Operations Hub)';
      case AppView.NCR: return 'ระบบแจ้งปัญหาคุณภาพ (NCR System)';
      case AppView.NCR_REPORT: return 'รายงาน NCR (NCR Report)';
      case AppView.SEARCH: return 'ประวัติการคืน (Return History)';
      default: return 'ReturnNeosiam Pro';
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 print:h-auto print:overflow-visible print:block">
      <Sidebar currentView={currentView} onChangeView={setCurrentView} />
      
      <div className="flex-1 flex flex-col min-w-0 print:h-auto print:overflow-visible">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8 shadow-sm z-10 print:hidden">
          <h2 className="text-xl font-semibold text-slate-800">
            {getHeaderTitle()}
          </h2>
          
          <div className="flex items-center gap-4">
             {currentView !== AppView.SEARCH && (
               <div className="relative hidden md:block">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="ค้นหาด่วน..." 
                    onFocus={() => setCurrentView(AppView.SEARCH)}
                    className="pl-9 pr-4 py-2 bg-slate-100 rounded-full text-sm border-none focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all w-64"
                  />
               </div>
             )}
             <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
               <Bell className="w-5 h-5" />
               <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
             </button>
             <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
               <div className="text-right hidden md:block">
                 <p className="text-sm font-bold text-slate-800">แผนกควบคุมคุณภาพ</p>
                 <p className="text-xs text-slate-500">และคืนสินค้า</p>
               </div>
               <img 
                 src="https://img2.pic.in.th/pic/logo-neo.png" 
                 alt="User Logo" 
                 className="w-9 h-9 rounded-full object-contain bg-white p-1 border border-slate-200" 
               />
             </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto print:overflow-visible print:h-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <DataProvider>
      <MainApp />
    </DataProvider>
  );
}

export default App;
