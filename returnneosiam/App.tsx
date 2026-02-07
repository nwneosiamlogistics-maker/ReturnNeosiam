import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Operations from './components/Operations';
import NCRSystem from './components/NCRSystem';
import NCRReport from './components/NCRReport';
import COLReport from './components/COLReport';
import Inventory from './components/Inventory';
import CollectionSystem from './components/CollectionSystem';
import LoginPage from './components/LoginPage';
import LoginModal from './components/LoginModal';
import Settings from './components/Settings';
import HomeView from './components/HomeView';

import { AppView, ReturnRecord } from './types';
import { Bell, Menu } from 'lucide-react';
import { DataProvider } from './DataContext';
import { AuthProvider, useAuth } from './AuthContext';
import { getRoleDisplayName } from './utils/permissions';

const MainApp: React.FC = () => {
  const { user, login } = useAuth();
  const [currentView, setCurrentView] = useState<AppView>(AppView.HOME);
  const [transferData, setTransferData] = useState<Partial<ReturnRecord> | null>(null);
  const [operationsInitialStep, setOperationsInitialStep] = useState<number | undefined>(undefined);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Force-on-Mount: Reset to HOME on initial load
  useEffect(() => {
    setCurrentView(AppView.HOME);
  }, []);

  // ===== PRIORITY GATEKEEPING =====
  // Layer 1: HOME view - Always accessible (before login check)
  if (currentView === AppView.HOME) {
    return (
      <>
        <HomeView 
          user={user} 
          onShowLogin={() => setShowLoginModal(true)}
          onNavigate={(view) => setCurrentView(view as AppView)}
        />
        {showLoginModal && (
          <LoginModal 
            onLoginSuccess={(userData) => {
              login(userData);
              setShowLoginModal(false);
            }}
            onClose={() => setShowLoginModal(false)}
          />
        )}
      </>
    );
  }

  // Layer 2: Login check - Required for all other views
  if (!user) {
    return <LoginPage onLoginSuccess={login} />;
  }

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
            initialStep={operationsInitialStep}
          />
        );
      case AppView.NCR:
        return <NCRSystem />;
      case AppView.NCR_REPORT:
        return <NCRReport onTransfer={handleNCRTransfer} />;
      case AppView.COL_REPORT:
        return <COLReport />;
      case AppView.INVENTORY:
        return <Inventory />;
      case AppView.COLLECTION:
        return <CollectionSystem onNavigate={(view, step) => {
          setCurrentView(view);
          if (step) setOperationsInitialStep(step);
        }} />;
      case AppView.SETTINGS:
        return <Settings />;

      default:
        return <Dashboard />;
    }
  };

  const getHeaderTitle = () => {
    switch (currentView) {
      case AppView.DASHBOARD: return 'ภาพรวม (Dashboard)';
      case AppView.OPERATIONS: return 'ศูนย์ปฏิบัติการ (Operations Hub)';
      case AppView.NCR: return 'ระบบแจ้งปัญหา (NCR System)';
      case AppView.NCR_REPORT: return 'รายงาน NCR';
      case AppView.COL_REPORT: return 'รายงาน COL';
      case AppView.INVENTORY: return 'คลังสินค้า (Inventory)';
      case AppView.COLLECTION: return 'งานรับสินค้า (Collection)';
      case AppView.SETTINGS: return 'การตั้งค่าระบบ (Settings)';
      default: return 'Neosiam Return';
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 print:h-auto print:overflow-visible print:block relative">
      <Sidebar
        currentView={currentView}
        onChangeView={setCurrentView}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
      />

      <div className="flex-1 flex flex-col min-w-0 print:h-auto print:overflow-visible w-full">
        {/* Optimized Glassmorphism Header */}
        <header className="glass-navbar h-16 flex items-center justify-between px-4 md:px-8 z-10 print:hidden shrink-0">
          <div className="flex items-center gap-3">
            {/* Sidebar Toggle Button - Shows on all screens */}
            <button
              onClick={() => {
                // Mobile: open overlay sidebar, Desktop: toggle collapse
                if (window.innerWidth < 1024) {
                  setIsSidebarOpen(true);
                } else {
                  setIsSidebarCollapsed(!isSidebarCollapsed);
                }
              }}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all active:scale-95 shadow-md"
              aria-label={isSidebarCollapsed ? "แสดงเมนู" : "ซ่อนเมนู"}
              title={isSidebarCollapsed ? "แสดงเมนูด้านข้าง (คลิกเพื่อเปิด)" : "ซ่อนเมนูด้านข้าง (คลิกเพื่อปิด)"}
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg md:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 truncate max-w-[200px] md:max-w-none">
              {getHeaderTitle()}
            </h1>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-slate-500 hover:bg-slate-200/50 rounded-full transition-all active:scale-95 group"
                aria-label="การแจ้งเตือน"
                title="การแจ้งเตือน"
              >
                <Bell className="w-5 h-5 group-hover:text-indigo-600 transition-colors" />
                <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
              </button>

              {/* Notification Dropdown with ternary rendering */}
              {showNotifications ? (
                <div className="absolute right-0 mt-3 w-85 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-slide-up origin-top-right ring-1 ring-black/5">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
                    <h3 className="font-bold text-slate-800">การแจ้งเตือน</h3>
                    <button className="text-xs text-indigo-600 font-semibold hover:text-indigo-700 transition-colors">อ่านทั้งหมด</button>
                  </div>
                  <div className="max-h-[350px] overflow-y-auto">
                    {[
                      { id: 1, title: 'NCR ใหม่', desc: 'มีรายงาน NCR #NCR-2024-001 เข้ามาใหม่', time: '10 นาทีที่แล้ว', type: 'alert' },
                      { id: 2, title: 'อนุมัติคำขอ', desc: 'คำขอคืนสินค้า #REQ-998 รอการอนุมัติ', time: '1 ชม. ที่แล้ว', type: 'info' },
                      { id: 3, title: 'สินค้าเข้า Hub', desc: 'รถขนส่งทะเบียน 71-0139 เข้าถึงศูนย์แล้ว', time: '2 ชม. ที่แล้ว', type: 'success' },
                    ].map((item) => (
                      <div key={item.id} className="p-4 border-b border-slate-50 hover:bg-indigo-50/30 transition-all cursor-pointer flex gap-3 items-start group">
                        <div className={`w-2.5 h-2.5 mt-1.5 rounded-full flex-shrink-0 shadow-sm ${item.type === 'alert' ? 'bg-red-500' : item.type === 'success' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">{item.title}</p>
                          <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{item.desc}</p>
                          <p className="text-[10px] text-slate-400 mt-2 font-medium flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span> {item.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 text-center border-t border-slate-100 bg-slate-50/50">
                    <button className="text-xs text-slate-500 hover:text-slate-800 font-bold transition-colors">ดูประวัติทั้งหมด</button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-3 pl-3 md:pl-4 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-800 leading-none">{user.displayName}</p>
                <p className="text-[10px] sm:text-xs text-slate-500 mt-1 font-medium">{getRoleDisplayName(user.role)}</p>
              </div>
              <div className="relative group cursor-pointer">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-300"></div>
                <img
                  src={user.photoURL || 'https://img2.pic.in.th/pic/logo-neo.png'}
                  alt="User Avatar"
                  className="relative w-8 h-8 md:w-10 md:h-10 rounded-full object-cover bg-white p-0.5 border border-slate-200 shadow-sm transition-transform active:scale-95"
                />
              </div>
            </div>
          </div>
        </header>

        <main id="main-content" className="flex-1 overflow-auto print:overflow-visible print:h-auto w-full relative bg-slate-50/50 p-0 md:p-1" role="main" aria-label="เนื้อหาหลัก">
          <div className="h-full w-full animate-slide-up">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <DataProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </DataProvider>
  );
}

export default App;