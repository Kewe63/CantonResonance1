/**
 * Canton Ticket Platform — Toast Notification System
 */
import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Toast {
  id: string;
  icon: string;
  title: string;
  description: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface ToastContextType {
  showToast: (icon: string, title: string, description: string, type?: Toast['type']) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (icon: string, title: string, description: string, type: Toast['type'] = 'success') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => [...prev.slice(-2), { id, icon, title, description, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[999] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.9 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className={`pointer-events-auto glass-card px-5 py-4 flex items-start gap-3 max-w-sm shadow-2xl border-l-4 ${
                toast.type === 'success'
                  ? 'border-l-accent'
                  : toast.type === 'error'
                  ? 'border-l-red-500'
                  : toast.type === 'warning'
                  ? 'border-l-amber-500'
                  : 'border-l-accent-purple'
              }`}
            >
              <span className="text-xl shrink-0 mt-0.5">{toast.icon}</span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-text-main leading-tight">{toast.title}</p>
                <p className="text-[11px] text-text-muted mt-0.5 font-mono leading-relaxed truncate">
                  {toast.description}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
