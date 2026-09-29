import { createContext } from "react";

export type ToastTone = "success" | "error";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  tone?: ToastTone;
  action?: ToastAction;
}

export interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
  action?: ToastAction;
}

export interface ToastContextValue {
  showToast: (message: string, options?: ToastOptions | ToastTone) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);
