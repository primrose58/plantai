import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const ToastContext = createContext();

export function useToast() {
    return useContext(ToastContext);
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info', duration = 4000) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);

        setTimeout(() => {
            removeToast(id);
        }, duration);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ addToast, removeToast }}>
            {children}
            <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`
                            pointer-events-auto
                            flex items-center gap-3 px-4 py-2.5 rounded-2xl shadow-sm backdrop-blur-xl border
                            transform transition-all duration-500 animate-slide-in hover:scale-102
                            ${toast.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-800 dark:text-green-300' : ''}
                            ${toast.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-800 dark:text-red-300' : ''}
                            ${toast.type === 'info' ? 'bg-white/80 border-white/40 dark:bg-gray-800/80 dark:border-gray-700 text-gray-800 dark:text-gray-200' : ''}
                            min-w-[200px] max-w-xs
                        `}
                    >
                        {/* Minimalist: No icon for chat messages (info), subtle dot for status */}
                        {toast.type === 'success' && <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"></div>}
                        {toast.type === 'error' && <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></div>}
                        {toast.type === 'info' && <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center shrink-0 text-xs font-bold text-green-600">AI</div>}

                        <p className="text-sm font-medium leading-tight flex-1 tracking-tight font-sans">
                            {toast.message}
                        </p>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
