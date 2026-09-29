import { createContext } from "react";

export type ToastTone = "success" | "error";

export interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

export interface ToastContextValue {
  showToast: (message: string, tone?: ToastTone) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);
