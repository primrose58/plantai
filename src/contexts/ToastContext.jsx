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
                            flex items-center gap-3 px-5 py-3 rounded-2xl shadow-lg backdrop-blur-md border
                            transform transition-all duration-500 animate-slide-in hover:scale-102
                            ${toast.type === 'success' ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800 dark:bg-emerald-900/40 dark:border-emerald-700/50 dark:text-emerald-100' : ''}
                            ${toast.type === 'error' ? 'bg-rose-50/90 border-rose-200 text-rose-800 dark:bg-rose-900/40 dark:border-rose-700/50 dark:text-rose-100' : ''}
                            ${toast.type === 'info' ? 'bg-indigo-50/90 border-indigo-200 text-indigo-800 dark:bg-indigo-900/40 dark:border-indigo-700/50 dark:text-indigo-100' : ''}
                            ${toast.type === 'warning' ? 'bg-amber-50/90 border-amber-200 text-amber-800 dark:bg-amber-900/40 dark:border-amber-700/50 dark:text-amber-100' : ''}
                            min-w-[300px] max-w-sm
                        `}
                    >
                        {/* Improved Icons */}
                        {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />}
                        {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />}
                        {(toast.type === 'info' || toast.type === 'warning') && <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />}

                        <p className="text-sm font-medium leading-tight flex-1 tracking-tight font-sans">
                            {toast.message}
                        </p>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
