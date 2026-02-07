import React, { useEffect, useRef } from 'react';
import { LayoutDashboard, LogOut, ScanBarcode, AlertOctagon, FileBarChart, Wifi, LayoutGrid, BarChart, Truck, X, Settings } from 'lucide-react';
import { AppView } from '../types';
import { ref, set } from 'firebase/database';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { getRoleDisplayName, getRoleColor, canAccessView } from '../utils/permissions';
import Swal from 'sweetalert2';

interface SidebarProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, isOpen = false, onClose, isCollapsed = false }) => {
  const { user, logout } = useAuth();
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && sidebarRef.current && !sidebarRef.current.contains(event.target as Node) && window.innerWidth < 1024) {
        onClose?.();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const menuItems = [
    { id: AppView.DASHBOARD, label: 'ภาพรวม (Dashboard)', icon: LayoutDashboard },
    { id: AppView.OPERATIONS, label: 'ปฏิบัติการ (Operations)', icon: ScanBarcode },
    { id: AppView.NCR, label: 'NCR (สินค้าตีกลับ)', icon: AlertOctagon },
    { id: AppView.NCR_REPORT, label: 'รายงาน NCR', icon: FileBarChart },
    { id: AppView.INVENTORY, label: 'คลังสินค้า (Inventory)', icon: LayoutGrid },
    { id: AppView.COLLECTION, label: 'งานรับสินค้า (Collection Tasks)', icon: Truck },
    { id: AppView.COL_REPORT, label: 'รายงาน COL', icon: BarChart },
    { id: AppView.SETTINGS, label: 'ตั้งค่าระบบ', icon: Settings },
  ];

  const visibleMenuItems = menuItems.filter(item => canAccessView(user?.role, item.id));

  const handleTestConnection = async () => {
    try {
      const testRef = ref(db, 'connection_test');
      await set(testRef, {
        status: 'online',
        timestamp: new Date().toISOString(),
        message: 'System is connected to Realtime Database'
      });
      alert("✅ เชื่อมต่อ Realtime Database สำเร็จ! (Connection Successful)\nข้อมูลถูกบันทึกไปยัง path: /connection_test");
    } catch (error: unknown) {
      alert(`❌ เชื่อมต่อล้มเหลว (Failed): ${(error as Error).message}\nกรุณาตรวจสอบ Config หรือ Security Rules`);
    }
  };



  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'ต้องการออกจากระบบ?',
      text: "คุณต้องทำการเข้าสู่ระบบใหม่เพื่อใช้งาน",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'ใช่, ออกจากระบบ',
      cancelButtonText: 'ยกเลิก',
      background: '#fff',
      customClass: {
        popup: 'rounded-2xl shadow-xl border border-slate-100'
      }
    });

    if (result.isConfirmed) {
      await logout();
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 lg:hidden ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        aria-hidden="true"
      />

      {/* Optimized Sidebar Container */}
      <div
        ref={sidebarRef}
        className={`fixed inset-y-0 left-0 w-72 bg-slate-900 border-r border-slate-800 text-white shadow-2xl transform transition-all duration-300 ease-in-out z-50 flex flex-col h-full print:hidden
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          ${isCollapsed ? 'lg:-translate-x-full' : 'lg:translate-x-0 lg:static lg:shadow-none'}
        `}
      >
        <div className="p-8 flex items-center justify-between border-b border-slate-800/50">
          <div className="flex items-center gap-4 group cursor-pointer">
            <div className="relative">
              <div className="absolute -inset-1 bg-white/20 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
              <img
                src="https://img2.pic.in.th/pic/logo-neo.png"
                alt="Neo Logistics"
                className="relative w-11 h-11 object-contain bg-white rounded-xl p-1.5 shadow-lg transform group-hover:rotate-6 transition-transform"
              />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Neosiam</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Return System</p>
            </div>
          </div>
          {/* Close Button Mobile */}
          <button
            onClick={onClose}
            className="lg:hidden p-2 text-slate-500 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            aria-label="ปิดเมนู"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* User Info with Glass look */}
        {user ? (
          <div className="mx-4 my-6 p-4 rounded-3xl bg-white/5 border border-white/10 shadow-inner group">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute -inset-0.5 bg-indigo-500 rounded-full blur opacity-0 group-hover:opacity-30 transition duration-500"></div>
                <img
                  src={user.photoURL || 'https://ui-avatars.com/api/?name=User'}
                  alt={user.displayName}
                  className="relative w-12 h-12 rounded-full border-2 border-slate-700 shadow-md transform group-hover:scale-105 transition-transform"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate mb-1">{user.displayName}</p>
                <div className={`px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 ${getRoleColor(user.role)} bg-opacity-10 ring-1 ring-inset ring-white/10`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${getRoleColor(user.role).replace('text-', 'bg-')}`}></div>
                  <span className="text-[10px] font-bold tracking-wide uppercase">{getRoleDisplayName(user.role)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
          <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Main Menu</p>
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onChangeView(item.id);
                  onClose?.();
                }}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-[13px] font-bold transition-all duration-300 transform active:scale-[0.98] group
                  ${isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-xl shadow-indigo-900/40 relative overflow-hidden'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }
                `}
              >
                {isActive ? (
                  <div className="absolute inset-0 bg-white opacity-10 animate-pulse"></div>
                ) : null}
                <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'}`} strokeWidth={isActive ? 2.5 : 2} />
                <span className="truncate">{item.label}</span>
                {isActive ? (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]"></div>
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="p-6 border-t border-slate-800/50 space-y-3 mt-auto">
          <button
            onClick={handleTestConnection}
            className="flex items-center gap-4 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/5 px-4 py-3.5 w-full text-xs font-bold rounded-2xl transition-all border border-transparent hover:border-emerald-500/20 group"
          >
            <Wifi className="w-5 h-5 group-hover:animate-pulse" />
            <span className="truncate tracking-wide uppercase">ทดสอบเชื่อมต่อ DB</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-4 text-slate-400 hover:text-rose-400 hover:bg-rose-500/5 px-4 py-3.5 w-full text-xs font-bold transition-all rounded-2xl border border-transparent hover:border-rose-500/20 group"
          >
            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="truncate tracking-wide uppercase">ออกจากระบบ</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;