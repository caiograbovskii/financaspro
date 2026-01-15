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
