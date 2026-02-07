import React, { useState } from 'react';
import {
    Truck, CheckCircle2, Boxes, FileText,
    User, X, Lock, Menu
} from 'lucide-react';
import Swal from 'sweetalert2';
import { useData } from '../DataContext';
import { useOperationsLogic } from './operations/hooks/useOperationsLogic';
import { Step1LogisticsRequest } from './operations/components/Step1LogisticsRequest';
import { Step2JobAccept } from './operations/components/Step2JobAccept';
import { Step3BranchReceive } from './operations/components/Step3BranchReceive';
import { Step4Consolidation } from './operations/components/Step4Consolidation';
import { AppView } from '../types';

// --- MAIN COMPONENT ---

// Simple Error Boundary Component
interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
    public state: ErrorBoundaryState;
    public props: { children: React.ReactNode };

    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.props = props;
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 text-center text-red-600 bg-red-50 h-screen flex flex-col items-center justify-center">
                    <h1 className="text-2xl font-bold mb-4">ขออภัย เกิดข้อผิดพลาดในระบบ (System Error)</h1>
                    <p className="mb-4">กรุณาแจ้งผู้ดูแลระบบพร้อมรายละเอียดด้านล่าง:</p>
                    <pre className="bg-white p-4 rounded shadow text-left text-sm font-mono overflow-auto max-w-2xl border border-red-200">
                        {this.state.error?.toString()}
                    </pre>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                        รีโหลดหน้าจอ (Reload)
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

interface CollectionSystemProps {
    onNavigate?: (view: AppView, step?: number) => void;
}

const CollectionSystem: React.FC<CollectionSystemProps> = ({ onNavigate }) => {
    // Hooks
    const { items } = useData();
    const { state, derived, actions } = useOperationsLogic();

    // Local state for Navigation
    const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Auth Modal State (Local)
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authPassword, setAuthPassword] = useState('');

    const handleAuthSubmit = () => {
        if (authPassword !== '1234') {
            Swal.fire({
                icon: 'error',
                title: 'รหัสผ่านไม่ถูกต้อง',
                text: 'กรุณาลองใหม่อีกครั้ง',
                confirmButtonColor: '#ef4444'
            });
            return;
        }
        setShowAuthModal(false);
        setAuthPassword('');
    };

    if (!state || !derived || !actions) {
        return <div className="p-6 text-center">Loading System...</div>;
    }

    return (
        <ErrorBoundary>
            <div className="flex h-screen bg-slate-50 overflow-hidden">
                {/* Mobile Backdrop */}
                <div
                    className={`fixed inset-0 bg-black/50 z-30 transition-opacity duration-300 lg:hidden ${sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                    onClick={() => setSidebarOpen(false)}
                />
                {/* Sidebar */}
                <div className={`fixed inset-y-0 left-0 w-64 bg-slate-900 text-white flex flex-col shadow-xl z-40 transform transition-transform duration-300 lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="p-4 md:p-6 border-b border-slate-800 flex items-center justify-between">
                        <div>
                            <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                                ระบบรับสินค้า
                            </h1>
                            <p className="text-xs text-slate-400 mt-1">Inbound Collection System</p>
                        </div>
                        <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors" aria-label="ปิดเมนู">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                        {[
                            { id: 1, label: '1. สร้างใบงาน (Create)', icon: FileText },
                            { id: 2, label: '2. รับงาน (Job Accept)', icon: CheckCircle2 },
                            { id: 3, label: '3. รับสินค้า (Branch Rx)', icon: Truck },
                            { id: 4, label: '4. รวมสินค้า (Consolidate)', icon: Boxes },
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => { setCurrentStep(item.id as 1 | 2 | 3 | 4); setSidebarOpen(false); }}
                                className={`w-full flex items-center justify-between p-3 rounded-lg text-sm font-medium transition-all duration-200
                                    ${currentStep === item.id
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50 translate-x-1'
                                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <item.icon className={`w-5 h-5 ${currentStep === item.id ? 'text-white' : 'text-slate-500'}`} />
                                    <span>{item.label}</span>
                                </div>
                                {currentStep === item.id && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                            </button>
                        ))}
                    </nav>

                    <div className="p-4 border-t border-slate-800 space-y-2">
                        {/* Back to Dashboard Button */}
                        {onNavigate && (
                            <button
                                onClick={() => onNavigate(AppView.DASHBOARD)}
                                className="w-full bg-slate-800 hover:bg-slate-700 text-white rounded-lg p-3 transition-all flex items-center justify-center gap-2 font-medium text-sm"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                กลับหน้าหลัก
                            </button>
                        )}

                        <div className="bg-slate-800 rounded-lg p-3">
                            <div className="text-xs text-slate-400 mb-1">สถานะระบบ</div>
                            <div className="flex items-center gap-2 text-green-400 text-sm font-bold">
                                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                Online
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                    <header className="bg-white border-b border-slate-200 h-16 flex items-center px-3 md:px-6 justify-between shadow-sm z-10">
                        <div className="flex items-center gap-2 md:gap-4">
                            {/* Mobile Menu Toggle */}
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="lg:hidden p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all"
                                aria-label="เปิดเมนู"
                            >
                                <Menu className="w-5 h-5" />
                            </button>
                            {/* Back Button for Step 2, 3, 4 */}
                            {currentStep > 1 && (
                                <button
                                    onClick={() => setCurrentStep((currentStep - 1) as 1 | 2 | 3 | 4)}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all font-medium text-sm"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    ย้อนกลับ
                                </button>
                            )}
                            <h2 className="text-sm md:text-lg font-bold text-slate-800 flex items-center gap-2 truncate">
                                {currentStep === 1 && <><FileText className="w-5 h-5 text-blue-600" /> สร้างใบสั่งงานรับกลับ (Create Return Request)</>}
                                {currentStep === 2 && <><CheckCircle2 className="w-5 h-5 text-blue-600" /> รับงานเข้าสาขา (Job Acceptance)</>}
                                {currentStep === 3 && <><Truck className="w-5 h-5 text-blue-600" /> รับสินค้าจริง (Physical Receive)</>}
                                {currentStep === 4 && <><Boxes className="w-5 h-5 text-blue-600" /> รวมสินค้า (Consolidation)</>}
                            </h2>
                        </div>
                        <div className="flex items-center gap-2 md:gap-4">
                            <div className="text-right hidden sm:block">
                                <div className="text-sm font-bold text-slate-800">Data Entry Officer</div>
                            </div>
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 border border-blue-200 flex items-center justify-center">
                                <User className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                            </div>
                        </div>
                    </header>

                    <main className="flex-1 overflow-auto bg-slate-50 p-3 md:p-6 relative">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none" />

                        {currentStep === 1 && (
                            <Step1LogisticsRequest
                                formData={state.formData}
                                requestItems={state.requestItems}
                                isCustomBranch={state.isCustomBranch}
                                uniqueCustomers={derived.uniqueCustomers}
                                uniqueDestinations={derived.uniqueDestinations}
                                uniqueProductCodes={derived.uniqueProductCodes}
                                uniqueProductNames={derived.uniqueProductNames}
                                existingItems={items}
                                setFormData={actions.setFormData}
                                setIsCustomBranch={actions.setIsCustomBranch}
                                setRequestItems={actions.setRequestItems}
                                handleAddItem={actions.handleAddItem}
                                handleRemoveItem={actions.handleRemoveItem}
                                handleRequestSubmit={actions.handleRequestSubmit}
                            />
                        )}
                        {currentStep === 2 && (
                            <div className="h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <Step2JobAccept onComplete={() => setCurrentStep(3)} />
                            </div>
                        )}
                        {currentStep === 3 && (
                            <div className="h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <Step3BranchReceive onComplete={() => setCurrentStep(4)} />
                            </div>
                        )}
                        {currentStep === 4 && (
                            <div className="h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <Step4Consolidation onComplete={() => {
                                    if (onNavigate) {
                                        onNavigate(AppView.OPERATIONS, 2);
                                    } else {
                                        Swal.fire({
                                            icon: 'info',
                                            title: 'Navigation Info',
                                            text: 'Navigation not configured',
                                            timer: 1500,
                                            showConfirmButton: false
                                        });
                                    }
                                }} />
                            </div>
                        )}

                    </main>
                </div>

                {showAuthModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                            <div className="bg-slate-900 p-4 flex items-center justify-between">
                                <h3 className="font-bold text-white flex items-center gap-2">
                                    <Lock className="w-4 h-4 text-amber-400" /> ยืนยันสิทธิ์ (Authentication)
                                </h3>
                                <button
                                    onClick={() => setShowAuthModal(false)}
                                    className="text-slate-400 hover:text-white transition"
                                    aria-label="ปิด"
                                    title="ปิด"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6">
                                <input
                                    type="password"
                                    autoFocus
                                    className="w-full p-3 border border-slate-300 rounded-lg text-center text-2xl tracking-widest font-mono mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="PASSCODE"
                                    value={authPassword}
                                    onChange={e => setAuthPassword(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAuthSubmit()}
                                />
                                <button onClick={handleAuthSubmit} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition shadow-lg shadow-slate-900/20">
                                    ยืนยัน (Confirm)
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ErrorBoundary>
    );
};



export default CollectionSystem;
