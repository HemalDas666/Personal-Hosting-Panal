import React, { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, AlertTriangle, Info } from "lucide-react";

interface Toast {
  id: number;
  type: "success" | "error" | "warning" | "info";
  message: string;
}

const ToastContext = createContext<any>(null);

let toastId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: Toast["type"], message: string) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const icons = {
    success: <Check size={18} className="text-emerald-400" />,
    error: <X size={18} className="text-red-400" />,
    warning: <AlertTriangle size={18} className="text-amber-400" />,
    info: <Info size={18} className="text-cyan-400" />,
  };

  const borders = {
    success: "border-emerald-500/30 bg-emerald-500/10",
    error: "border-red-500/30 bg-red-500/10",
    warning: "border-amber-500/30 bg-amber-500/10",
    info: "border-cyan-500/30 bg-cyan-500/10",
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 max-w-sm">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.95 }}
              className={`flex items-start gap-3 p-4 rounded-xl backdrop-blur-xl border ${borders[toast.type]} shadow-2xl`}
            >
              <div className="shrink-0 mt-0.5">{icons[toast.type]}</div>
              <p className="text-sm text-zinc-200 flex-1">{toast.message}</p>
              <button onClick={() => removeToast(toast.id)} className="shrink-0 text-zinc-500 hover:text-white transition-colors">
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
