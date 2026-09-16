// ToastProvider.tsx

"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Loader2,
  X,
} from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info" | "loading";

type Toast = {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
};

type ToastContextType = {
  toast: (message: string, type?: ToastType, duration?: number) => string;
  success: (message: string, duration?: number) => string;
  error: (message: string, duration?: number) => string;
  warning: (message: string, duration?: number) => string;
  info: (message: string, duration?: number) => string;
  loading: (message: string) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
};

const ToastContext = createContext<ToastContextType | null>(null);
const MAX_TOASTS = 4;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback(
    (
      message: string,
      type: ToastType = "success",
      duration = 4000
    ) => {
      const id = crypto.randomUUID();

      setToasts((current) => {
        const duplicate = current.some(
          (item) => item.message === message && item.type === type
        );

        if (duplicate) return current;

        return [...current, { id, message, type, duration }].slice(
          -MAX_TOASTS
        );
      });

      if (type !== "loading") {
        window.setTimeout(() => dismiss(id), duration);
      }

      return id;
    },
    [dismiss]
  );

  const success = useCallback(
    (message: string, duration = 4000) =>
      toast(message, "success", duration),
    [toast]
  );

  const error = useCallback(
    (message: string, duration = 4000) =>
      toast(message, "error", duration),
    [toast]
  );

  const warning = useCallback(
    (message: string, duration = 4000) =>
      toast(message, "warning", duration),
    [toast]
  );

  const info = useCallback(
    (message: string, duration = 4000) =>
      toast(message, "info", duration),
    [toast]
  );

  const loading = useCallback(
    (message: string) => toast(message, "loading", 0),
    [toast]
  );

  const dismissAll = useCallback(() => setToasts([]), []);

  const value = useMemo(
    () => ({
      toast,
      success,
      error,
      warning,
      info,
      loading,
      dismiss,
      dismissAll,
    }),
    [
      toast,
      success,
      error,
      warning,
      info,
      loading,
      dismiss,
      dismissAll,
    ]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return context;
}

function ToastContainer({
  toasts,
  dismiss,
}: {
  toasts: Toast[];
  dismiss: (id: string) => void;
}) {
  return (
    <div
      className="fixed top-5 right-5 z-[9999] flex w-[calc(100%-2.5rem)] max-w-sm flex-col gap-3"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} dismiss={dismiss} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  dismiss,
}: {
  toast: Toast;
  dismiss: (id: string) => void;
}) {
  const config = {
    success: {
      icon: CheckCircle,
      color: "text-emerald-400",
      progress: "bg-emerald-400",
    },
    error: {
      icon: XCircle,
      color: "text-red-400",
      progress: "bg-red-400",
    },
    warning: {
      icon: AlertTriangle,
      color: "text-amber-400",
      progress: "bg-amber-400",
    },
    info: {
      icon: Info,
      color: "text-blue-400",
      progress: "bg-blue-400",
    },
    loading: {
      icon: Loader2,
      color: "text-violet-400",
      progress: "bg-violet-400",
    },
  }[toast.type];

  const Icon = config.icon;

  return (
    <div
      role={toast.type === "error" ? "alert" : "status"}
      className="toast-enter pointer-events-auto relative flex items-center gap-3 overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 px-5 py-3.5 text-white shadow-xl shadow-black/20 backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-700 hover:shadow-2xl"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-800">
        <Icon
          size={18}
          className={`${config.color} ${
            toast.type === "loading" ? "animate-spin" : ""
          }`}
        />
      </div>

      <span className="flex-1 text-sm font-medium leading-5 text-gray-100">
        {toast.message}
      </span>

      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-all duration-200 hover:bg-gray-800 hover:text-white hover:rotate-90 active:scale-90"
        aria-label="Close notification"
      >
        <X size={16} />
      </button>

      {toast.type !== "loading" && (
        <div className="absolute bottom-0 left-0 h-[2px] w-full bg-gray-800">
          <div
            className={`toast-progress h-full ${config.progress}`}
            style={{
              animationDuration: `${toast.duration ?? 4000}ms`,
            }}
          />
        </div>
      )}
    </div>
  );
}
