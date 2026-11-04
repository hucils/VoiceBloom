import { createContext, use, useCallback, useRef, useState, type ReactNode } from 'react';

type ShowToast = (message: string) => void;

const ToastContext = createContext<ShowToast>(() => {});

/** Brief, polite confirmations ("Saved", "Deleted") announced to screen readers too. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Array<{ id: number; message: string }>>([]);
  const nextId = useRef(0);

  const show = useCallback<ShowToast>((message) => {
    const id = ++nextId.current;
    setToasts((current) => [...current.slice(-2), { id, message }]);
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 3600);
  }, []);

  return (
    <ToastContext value={show}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4 lg:bottom-8"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="animate-fade-up rounded-full bg-ink px-4 py-2 text-sm font-medium text-canvas shadow-lifted"
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext>
  );
}

export function useToast(): ShowToast {
  return use(ToastContext);
}
