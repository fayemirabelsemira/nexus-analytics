import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, Info, XCircle } from 'lucide-react';
import Modal from '../components/Modal';
import { btnDanger, btnPrimary, btnSecondary } from '../components/ui';

type ToastKind = 'success' | 'error' | 'info';
interface Toast { id: number; kind: ToastKind; text: string }
interface ConfirmOptions { title: string; message: string; confirmLabel?: string; danger?: boolean }

interface FeedbackValue {
  toast: (kind: ToastKind, text: string) => void;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackValue | undefined>(undefined);

const ICON = { success: CheckCircle2, error: XCircle, info: Info } as const;
const TONE = {
  success: 'border-green-300 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100',
  error: 'border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100',
  info: 'border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100',
} as const;

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pending, setPending] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const nextId = useRef(1);

  const toast = useCallback((kind: ToastKind, text: string) => {
    const id = nextId.current++;
    setToasts((t) => [...t.slice(-3), { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 7000 : 4000);
  }, []);

  const confirm = useCallback((opts: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ ...opts, resolve })), []);
  const settle = (v: boolean) => {
    pending?.resolve(v);
    setPending(null);
  };

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2" role="status" aria-live="polite">
        {toasts.map((t) => {
          const Icon = ICON[t.kind];
          return (
            <div key={t.id} className={`pointer-events-auto flex items-start gap-2 rounded-lg border p-3 text-sm shadow-lg ${TONE[t.kind]}`}>
              <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{t.text}</span>
            </div>
          );
        })}
      </div>
      {pending && (
        <Modal title={pending.title} onClose={() => settle(false)} size="sm">
          <p className="text-sm text-gray-600 dark:text-gray-300">{pending.message}</p>
          <div className="mt-6 flex justify-end gap-3">
            <button className={btnSecondary} onClick={() => settle(false)}>Cancel</button>
            <button className={pending.danger ? btnDanger : btnPrimary} onClick={() => settle(true)}>{pending.confirmLabel ?? 'Confirm'}</button>
          </div>
        </Modal>
      )}
    </FeedbackContext.Provider>
  );
}

export function useFeedback(): FeedbackValue {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback must be used inside <FeedbackProvider>');
  return ctx;
}
