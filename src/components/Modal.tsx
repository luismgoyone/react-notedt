import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { HiX } from "react-icons/hi";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Native <dialog> modal: focus trapping, Esc and inert background come from
 * the browser. Renders as a bottom sheet on small screens.
 */
export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-x-0 top-auto bottom-0 m-0 max-h-[92dvh] w-full max-w-none flex-col overflow-hidden rounded-t-2xl bg-white p-0 text-ink shadow-xl open:flex sm:inset-0 sm:m-auto sm:max-h-[85dvh] sm:max-w-lg sm:rounded-xl"
    >
      {open && (
        <>
          <header className="flex items-center justify-between border-b border-line px-5 py-3">
            <h2
              id={titleId}
              className="text-base font-semibold tracking-wide uppercase"
            >
              {title}
            </h2>
            <button
              type="button"
              className="icon-btn -mr-2"
              onClick={onClose}
              aria-label="Close"
            >
              <HiX aria-hidden size={20} />
            </button>
          </header>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && (
            <footer className="flex justify-end gap-3 border-t border-line px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {footer}
            </footer>
          )}
        </>
      )}
    </dialog>
  );
}
