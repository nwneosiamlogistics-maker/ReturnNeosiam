import React, { useState } from 'react';
import { LogIn, Eye, EyeOff, AlertCircle, User, Lock } from 'lucide-react';
import { mockLogin, MOCK_USERS } from '../data/mockUsers';
import { User as UserType } from '../types';
import { getRoleDisplayName, getRoleColor } from '../utils/permissions';

interface LoginPageProps {
    onLoginSuccess: (user: UserType) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 500));

        const user = mockLogin(email, password);

        if (user) {
            onLoginSuccess(user);
        } else {
            setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
            setIsLoading(false);
        }
    };

    const handleQuickLogin = (user: UserType) => {
        // กรอกแค่ Email เท่านั้น ไม่กรอก Password
        // ให้ User ใส่ Password เอง
        setEmail(user.email);
        setPassword(''); // Clear password field
        // Focus ที่ช่อง password
        setTimeout(() => {
            const passwordInput = document.querySelector<HTMLInputElement>('input[type="password"]');
            passwordInput?.focus();
        }, 100);
    };

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
            {/* Ultra-Premium Animated Background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse delay-700"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-purple-600/10 rounded-full blur-[150px] animate-pulse delay-1000"></div>

                {/* Grid Overlay */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 contrast-150 brightness-100"></div>
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]"></div>
            </div>

            <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-8 relative z-10 animate-slide-up">
                {/* Left Side - Premium Login Form */}
                <div className="flex-1 glass-card border-white/5 bg-white/5 backdrop-blur-2xl rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden group transition-all duration-500 hover:border-white/10">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-white/10 transition-colors"></div>

                    {/* Logo & Title */}
                    <div className="text-center mb-10">
                        <div className="relative inline-flex mb-6 group/logo">
                            <div className="absolute -inset-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-40 group-hover/logo:opacity-100 transition duration-500 animate-pulse-subtle"></div>
                            <div className="relative w-24 h-24 bg-white rounded-2xl shadow-2xl flex items-center justify-center p-3 transform transition-transform group-hover/logo:scale-105 duration-500">
                                <img
                                    src="https://img2.pic.in.th/pic/logo-neo.png"
                                    alt="Neo Logo"
                                    className="w-full h-full object-contain"
                                />
                            </div>
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight mb-2 font-inter uppercase">
                            Neosiam <span className="text-indigo-500">Return</span>
                        </h1>
                        <p className="text-slate-400 text-sm font-medium tracking-wide">
                            INTELLIGENT OPERATIONS INFRASTRUCTURE
                        </p>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">
                                    Identity / Identity
                                </label>
                                <div className="relative group/input">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <User className="w-5 h-5 text-slate-500 group-focus-within/input:text-indigo-500 transition-colors" />
                                    </div>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="user@neosiam.com"
                                        required
                                        className="w-full bg-white/5 border border-white/10 text-white pl-12 pr-4 py-4 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none font-medium placeholder-slate-600"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">
                                    Access Key / Password
                                </label>
                                <div className="relative group/input">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="w-5 h-5 text-slate-500 group-focus-within/input:text-indigo-500 transition-colors" />
                                    </div>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        className="w-full bg-white/5 border border-white/10 text-white pl-12 pr-14 py-4 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none font-medium placeholder-slate-600"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors p-1"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {error ? (
                            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-sm animate-shake">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <span className="font-semibold">{error}</span>
                            </div>
                        ) : null}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full relative group/btn overflow-hidden rounded-2xl py-4 transition-all duration-300 active:scale-95 disabled:opacity-50"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 bg-[length:200%_100%] animate-shimmer group-hover/btn:scale-105 transition-transform"></div>
                            <div className="relative flex items-center justify-center gap-3 text-white font-black uppercase tracking-widest text-sm">
                                {isLoading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Verifying...</span>
                                    </>
                                ) : (
                                    <>
                                        <LogIn className="w-5 h-5" />
                                        <span>Authorized Access</span>
                                    </>
                                )}
                            </div>
                        </button>
                    </form>
                </div>

                {/* Right Side - Quick Login HUD */}
                <div className="flex-1 flex flex-col gap-6">
                    <div className="glass-card bg-white/5 border-white/5 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-2xl h-full flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white flex items-center gap-3">
                                <div className="p-2 bg-indigo-500/20 rounded-lg">
                                    <User className="w-5 h-5 text-indigo-400" />
                                </div>
                                Intelligence Hub
                            </h2>
                            <span className="text-[10px] font-black bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full tracking-widest uppercase">Quick Access</span>
                        </div>

                        <div className="space-y-3 overflow-y-auto max-h-[440px] pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                            {MOCK_USERS.map((user) => (
                                <button
                                    key={user.uid}
                                    onClick={() => handleQuickLogin(user)}
                                    className="w-full text-left p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all group/user relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/5 to-indigo-500/0 -translate-x-full group-hover/user:translate-x-full transition-transform duration-700"></div>
                                    <div className="flex items-center gap-4 relative z-10">
                                        <img
                                            src={user.photoURL || 'https://ui-avatars.com/api/?name=User'}
                                            alt={user.displayName}
                                            className="w-12 h-12 rounded-2xl border border-white/10 group-hover/user:scale-105 transition-transform shadow-lg"
                                        />
                                        <div className="flex-1">
                                            <div className="font-bold text-slate-200 group-hover/user:text-white transition-colors flex items-center gap-2">
                                                {user.displayName}
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                                            </div>
                                            <div className="text-[10px] text-slate-500 font-medium group-hover/user:text-slate-400 transition-colors uppercase tracking-tight">
                                                {user.email}
                                            </div>
                                        </div>
                                        <div className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-tighter ring-1 ring-inset ${getRoleColor(user.role).replace('text-', 'bg-').replace('text-', 'ring-')} bg-opacity-10 ${getRoleColor(user.role)}`}>
                                            {getRoleDisplayName(user.role)}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className="mt-auto pt-6">
                            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex gap-3 items-start">
                                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-[10px] font-bold text-amber-500/80 uppercase tracking-widest mb-1">System Notice</p>
                                    <p className="text-xs text-slate-400 leading-relaxed font-medium">
                                        Quick Login fills credentials automatically for internal testing. Password verification is required for high-level access.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes shimmer {
                    from { background-position: 0% 0%; }
                    to { background-position: 200% 0%; }
                }
                .animate-shimmer {
                    animation: shimmer 3s infinite linear;
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-4px); }
                    75% { transform: translateX(4px); }
                }
                .animate-shake {
                    animation: shake 0.5s ease-in-out;
                }
            `}</style>
        </div>
    );
};

export default LoginPage;
