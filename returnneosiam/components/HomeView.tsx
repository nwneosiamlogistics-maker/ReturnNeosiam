import React, { useEffect, useState } from 'react';
import { User } from '../types';
import { 
  Warehouse, TrendingUp, Truck, CheckCircle, 
  Lock, LogIn, BarChart3, Package, Activity,
  ArrowRight, Sparkles
} from 'lucide-react';

interface HomeViewProps {
  user: User | null;
  onShowLogin: () => void;
  onNavigate: (view: string) => void;
}

const HomeView: React.FC<HomeViewProps> = ({ user, onShowLogin, onNavigate }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const isGuest = !user;

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const stats = [
    { 
      label: 'Jobs Today', 
      value: isGuest ? null : '24', 
      icon: Truck, 
      color: 'from-blue-500 to-indigo-600' 
    },
    { 
      label: 'Movement', 
      value: isGuest ? null : '156', 
      icon: Activity, 
      color: 'from-emerald-500 to-teal-600' 
    },
    { 
      label: 'Success Rate', 
      value: isGuest ? null : '98.5%', 
      icon: TrendingUp, 
      color: 'from-amber-500 to-orange-600' 
    },
    { 
      label: 'Pending', 
      value: isGuest ? null : '12', 
      icon: Package, 
      color: 'from-purple-500 to-pink-600' 
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Background Image with Overlay */}
      <div 
        className={`absolute inset-0 bg-cover bg-center transition-transform duration-[2000ms] ease-out ${isLoaded ? 'scale-100' : 'scale-110'}`}
        style={{ 
          backgroundImage: 'url(https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2070)',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-indigo-900/80"></div>
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="p-4 md:p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
              <Warehouse className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">Neosiam</h1>
              <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest">Return System</p>
            </div>
          </div>

          {/* Profile / Login Button */}
          <button
            onClick={isGuest ? onShowLogin : () => onNavigate('DASHBOARD')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${
              isGuest 
                ? 'bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 text-white' 
                : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg hover:shadow-xl'
            }`}
          >
            {isGuest ? (
              <>
                <Lock className="w-4 h-4" />
                <span className="text-sm font-bold">Sign In</span>
              </>
            ) : (
              <>
                <img 
                  src={user.photoURL || 'https://ui-avatars.com/api/?name=User'} 
                  alt={user.displayName}
                  className="w-6 h-6 rounded-full"
                />
                <span className="text-sm font-bold hidden sm:inline">{user.displayName}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 md:py-16">
          {/* Hero Text */}
          <div className={`text-center mb-12 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 mb-6">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-bold text-white/80">Logistics Intelligence Platform</span>
            </div>
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-black text-white mb-4 tracking-tight">
              Return <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Management</span>
            </h2>
            <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto">
              ระบบจัดการสินค้าคืน NCR และ Collection อัจฉริยะ
            </p>
          </div>

          {/* Stats Grid */}
          <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl transition-all duration-1000 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className="relative group"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl blur-xl" 
                  style={{ background: `linear-gradient(135deg, ${stat.color.split(' ')[0].replace('from-', '')} 0%, ${stat.color.split(' ')[1].replace('to-', '')} 100%)` }}
                />
                <div className="relative bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:border-white/40 transition-all duration-300 hover:-translate-y-1">
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${stat.color} mb-4`}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-3xl md:text-4xl font-black text-white mb-1">
                    {stat.value ? (
                      stat.value
                    ) : (
                      <div className="flex items-center gap-2">
                        <Lock className="w-6 h-6 text-white/40" />
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-white/60 font-medium">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className={`flex flex-col sm:flex-row gap-4 mt-12 transition-all duration-1000 delay-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {isGuest ? (
              <button
                onClick={onShowLogin}
                className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:shadow-indigo-500/30 transition-all duration-300 hover:-translate-y-1"
              >
                <LogIn className="w-5 h-5" />
                เข้าสู่ระบบเพื่อเริ่มต้นใช้งาน
              </button>
            ) : (
              <>
                <button
                  onClick={() => onNavigate('DASHBOARD')}
                  className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:shadow-indigo-500/30 transition-all duration-300 hover:-translate-y-1"
                >
                  <BarChart3 className="w-5 h-5" />
                  เข้าสู่ Dashboard
                </button>
                <button
                  onClick={() => onNavigate('NCR')}
                  className="flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-2xl font-bold hover:bg-white/20 transition-all duration-300"
                >
                  <CheckCircle className="w-5 h-5" />
                  ระบบแจ้งปัญหา (NCR System)
                </button>
              </>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="p-4 text-center">
          <p className="text-sm text-white/40">
            © 2024 Neosiam Logistics & Transport Co., Ltd.
          </p>
        </footer>
      </div>

      {/* Custom Styles */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.2; }
          50% { transform: translateY(-20px) translateX(10px); opacity: 0.5; }
        }
        .animate-float { animation: float ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default HomeView;
