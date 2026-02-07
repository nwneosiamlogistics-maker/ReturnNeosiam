import React, { useState, useRef, useEffect } from 'react';
import { LogIn, Eye, EyeOff, AlertCircle, Lock, X, ChevronDown } from 'lucide-react';
import { mockLogin, MOCK_USERS } from '../data/mockUsers';
import { User as UserType } from '../types';
import { getRoleDisplayName, getRoleColor } from '../utils/permissions';

interface LoginModalProps {
  onLoginSuccess: (user: UserType) => void;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess, onClose }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectUser = (user: UserType) => {
    setSelectedUser(user);
    setPassword('');
    setShowUserDropdown(false);
    setTimeout(() => {
      const passwordInput = document.querySelector<HTMLInputElement>('#modal-password-input');
      passwordInput?.focus();
    }, 100);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    await new Promise(resolve => setTimeout(resolve, 500));

    const user = mockLogin(selectedUser?.email || '', password);

    if (user) {
      onLoginSuccess(user);
    } else {
      setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md" onClick={onClose}>
      <div 
        className="relative w-full max-w-lg min-h-[520px] bg-slate-900 rounded-3xl shadow-2xl border border-white/10 overflow-hidden animate-slide-up flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors z-10"
          aria-label="ปิด"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="p-6 pb-0 text-center">
          <div className="relative inline-flex mb-4">
            <div className="absolute -inset-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl blur opacity-40"></div>
            <div className="relative w-16 h-16 bg-white rounded-xl shadow-xl flex items-center justify-center p-2">
              <img src="https://img2.pic.in.th/pic/logo-neo.png" alt="Neo Logo" className="w-full h-full object-contain" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-white">เข้าสู่ระบบ</h2>
          <p className="text-sm text-slate-400 mt-1">Neosiam Return System</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="p-6 space-y-6 flex-1 flex flex-col justify-center">
          {/* User Dropdown */}
          <div ref={dropdownRef}>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">เลือกผู้ใช้งาน</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="w-full bg-white/5 border border-white/10 text-white pl-4 pr-12 py-4 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-left flex items-center gap-3"
              >
                {selectedUser ? (
                  <>
                    <img
                      src={selectedUser.photoURL || 'https://ui-avatars.com/api/?name=User'}
                      alt={selectedUser.displayName}
                      className="w-8 h-8 rounded-lg border border-white/10"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{selectedUser.displayName}</p>
                      <p className={`text-[10px] font-bold ${getRoleColor(selectedUser.role)}`}>
                        {getRoleDisplayName(selectedUser.role)}
                      </p>
                    </div>
                  </>
                ) : (
                  <span className="text-slate-500">เลือกผู้ใช้งาน...</span>
                )}
              </button>
              <ChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} />
              
              {/* Dropdown Menu */}
              {showUserDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-white/10 rounded-xl shadow-2xl z-50 max-h-[280px] overflow-y-auto">
                  {MOCK_USERS.map((user) => (
                    <button
                      key={user.uid}
                      type="button"
                      onClick={() => handleSelectUser(user)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
                    >
                      <img
                        src={user.photoURL || 'https://ui-avatars.com/api/?name=User'}
                        alt={user.displayName}
                        className="w-10 h-10 rounded-lg border border-white/10"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{user.displayName}</p>
                        <p className={`text-[10px] font-bold ${getRoleColor(user.role)}`}>
                          {getRoleDisplayName(user.role)}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                      </div>
                      {selectedUser?.uid === user.uid && (
                        <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">รหัสผ่าน</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                id="modal-password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-white/5 border border-white/10 text-white pl-12 pr-12 py-4 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-4 rounded-xl font-bold hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>กำลังตรวจสอบ...</span>
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                <span>เข้าสู่ระบบ</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;
