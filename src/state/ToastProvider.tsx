import { useCallback, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { HiCheckCircle, HiExclamationCircle, HiX } from "react-icons/hi";
import { ToastContext, type Toast, type ToastOptions } from "./toastContext";

const DISMISS_AFTER_MS = 4000;
// Give people time to reach an Undo button.
const DISMISS_WITH_ACTION_MS = 8000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((all) => all.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, options: ToastOptions | ToastOptions["tone"] = {}) => {
      const { tone = "success", action } =
        typeof options === "string" ? { tone: options } : options;
      const id = nextId.current++;
      setToasts((all) => [...all, { id, tone, message, action }]);
      window.setTimeout(
        () => dismiss(id),
        action ? DISMISS_WITH_ACTION_MS : DISMISS_AFTER_MS,
      );
    },
    [dismiss],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-20 z-50 flex flex-col items-center gap-2 md:inset-x-auto md:right-6 md:bottom-6 md:items-end"
      >
        {toasts.map((toast) => {
          const Icon =
            toast.tone === "success" ? HiCheckCircle : HiExclamationCircle;
          return (
            <div
              key={toast.id}
              role={toast.tone === "error" ? "alert" : "status"}
              className={`pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-lg px-4 py-3 text-sm shadow-lg ${
                toast.tone === "success"
                  ? "bg-brand text-on-brand"
                  : "bg-expense text-on-expense"
              }`}
            >
              <Icon aria-hidden size={20} className="shrink-0" />
              <p className="flex-1">{toast.message}</p>
              {toast.action && (
                <button
                  type="button"
                  onClick={() => {
                    toast.action?.onClick();
                    dismiss(toast.id);
                  }}
                  className="rounded px-2 py-1 font-semibold uppercase underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-current"
                >
                  {toast.action.label}
                </button>
              )}
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="rounded p-1 hover:bg-current/15 focus-visible:outline-2 focus-visible:outline-current"
                aria-label="Dismiss notification"
              >
                <HiX aria-hidden size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
