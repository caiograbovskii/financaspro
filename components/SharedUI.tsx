import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info, DollarSign, Wallet, PiggyBank } from 'lucide-react';

// --- TOAST SYSTEM ---

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

interface ToastContextType {
    showToast: (message: string, type: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    type?: 'danger' | 'warning' | 'info';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ isOpen, title, message, onConfirm, onCancel, type = 'danger' }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onCancel}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 transform scale-100 animate-fade-in-up border border-slate-100" onClick={e => e.stopPropagation()}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${type === 'danger' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                    <AlertTriangle size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
                <p className="text-slate-500 mb-6 text-sm leading-relaxed">{message}</p>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition">
                        Cancelar
                    </button>
                    <button onClick={onConfirm} className={`flex-1 px-4 py-2.5 text-white font-bold rounded-xl transition shadow-lg ${type === 'danger' ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-200' : 'bg-amber-500 hover:bg-amber-600 shadow-amber-200'}`}>
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = (message: string, type: ToastType, duration = 3000) => {
        const id = Date.now().toString();
        setToasts(prev => [...prev, { id, message, type, duration }]);
    };

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
                {toasts.map(toast => (
                    <div key={toast.id} className="pointer-events-auto animate-fade-in-up">
                        <ToastItem toast={toast} onClose={() => removeToast(toast.id)} />
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within a ToastProvider');
    return context;
};

const ToastItem: React.FC<{ toast: Toast, onClose: () => void }> = ({ toast, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, toast.duration);
        return () => clearTimeout(timer);
    }, [toast, onClose]);

    const bg = toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
        toast.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
            toast.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                'bg-blue-50 border-blue-200 text-blue-800';

    const icon = toast.type === 'success' ? <CheckCircle size={20} className="text-emerald-500" /> :
        toast.type === 'error' ? <AlertCircle size={20} className="text-rose-500" /> :
            toast.type === 'warning' ? <AlertTriangle size={20} className="text-amber-500" /> :
                <Info size={20} className="text-blue-500" />;

    return (
        <div className={`p-4 rounded-xl shadow-lg border flex items-center gap-3 min-w-[300px] backdrop-blur-sm ${bg} transition-all`}>
            {icon}
            <span className="text-sm font-bold flex-1">{toast.message}</span>
            <button onClick={onClose} className="opacity-50 hover:opacity-100"><X size={16} /></button>
        </div>
    );
};

// --- CELEBRATION COMPONENT (MONEY RAIN) ---

export const Celebration: React.FC<{ active: boolean, onComplete: () => void }> = ({ active, onComplete }) => {
    if (!active) return null;

    useEffect(() => {
        const timer = setTimeout(onComplete, 3500); // 3.5s duração
        return () => clearTimeout(timer);
    }, [active, onComplete]);

    // Create random particles
    const particles = Array(50).fill(0).map((_, i) => ({
        id: i,
        left: Math.random() * 100 + '%',
        delay: Math.random() * 2 + 's',
        duration: 1.5 + Math.random() * 2 + 's',
        Icon: [DollarSign, Wallet, PiggyBank][Math.floor(Math.random() * 3)],
        color: ['#10b981', '#f59e0b', '#3b82f6'][Math.floor(Math.random() * 3)],
        size: 16 + Math.random() * 24
    }));

    return (
        <div className="fixed inset-0 z-[10000] pointer-events-none flex items-center justify-center overflow-hidden bg-black/5">
            {/* Central Big Icon */}
            <div className="animate-bounce-in-out absolute">
                <div className="bg-emerald-500 text-white p-8 rounded-full shadow-2xl shadow-emerald-500/50">
                    <DollarSign size={64} strokeWidth={3} />
                </div>
            </div>

            {/* Raining Money */}
            {particles.map(p => (
                <div
                    key={p.id}
                    className="absolute animate-rain opacity-0"
                    style={{
                        left: p.left,
                        top: '-50px',
                        animationDelay: p.delay,
                        animationDuration: p.duration,
                        color: p.color
                    }}
                >
                    <p.Icon size={p.size} strokeWidth={2.5} />
                </div>
            ))}

            <style>{`
             @keyframes rain {
                 0% { transform: translateY(-100px) rotate(0deg); opacity: 0; }
                 10% { opacity: 1; }
                 100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
             }
             @keyframes bounce-in-out {
                 0% { transform: scale(0); opacity: 0; }
                 50% { transform: scale(1.2); opacity: 1; }
                 80% { transform: scale(0.9); }
                 100% { transform: scale(1.5); opacity: 0; }
             }
             .animate-rain { animation: rain linear forwards; }
             .animate-bounce-in-out { animation: bounce-in-out 3s ease-out forwards; }
           `}</style>
        </div>
    );
};
