"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CheckCircle2, XCircle, Info } from "lucide-react";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContextType {
  toast: (message: string, type?: "success" | "error" | "info") => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const TOAST_STYLES: Record<Toast["type"], { bg: string; icon: typeof CheckCircle2 }> = {
  success: { bg: "var(--success)", icon: CheckCircle2 },
  error: { bg: "var(--error)", icon: XCircle },
  info: { bg: "var(--info)", icon: Info },
};

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: "success" | "error" | "info" = "success") => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast container */}
      <div className="fixed top-4 right-4 z-100 space-y-2 pointer-events-none max-w-90">
        {toasts.map((t) => {
          const { bg, icon: Icon } = TOAST_STYLES[t.type];
          return (
            <div
              key={t.id}
              className="pointer-events-auto animate-fade-in-up flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg"
              style={{ backgroundColor: bg }}
            >
              <Icon className="w-4.5 h-4.5 shrink-0" />
              {t.message}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
