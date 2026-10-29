'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Loader2, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ---------- buttons ---------- */
type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
const BTN: Record<BtnVariant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 border border-brand-600',
  secondary: 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 border border-rose-600',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 border border-transparent',
};
export function Btn({
  variant = 'secondary', size = 'md', busy, className, children, ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md'; busy?: boolean }) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || busy}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors cursor-pointer',
        'disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
        size === 'sm' ? 'h-8 px-3 text-xs' : 'h-10 px-4 text-sm', BTN[variant], className,
      )}
    >
      {busy && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

/* ---------- layout ---------- */
export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {description && <p className="text-sm text-slate-600 mt-1 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('bg-white border border-slate-200 rounded-xl', className)}>{children}</div>;
}
export function CardHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
      <Loader2 className="w-4 h-4 animate-spin" /> {label}
    </div>
  );
}
export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="py-14 text-center text-sm text-slate-500">{children}</div>;
}
export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-3 border border-rose-200 bg-rose-50 text-rose-800 rounded-lg px-4 py-3 text-sm">
      <XCircle className="w-4 h-4 shrink-0" />
      <span className="flex-1">{message}</span>
      {onRetry && <button onClick={onRetry} className="font-semibold underline cursor-pointer">Retry</button>}
    </div>
  );
}

/* ---------- pills ---------- */
const TONES: Record<string, string> = {
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rose: 'bg-rose-50 text-rose-700 border-rose-200',
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
  blue: 'bg-brand-50 text-brand-700 border-brand-200',
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
};
export function Pill({ tone = 'slate', children }: { tone?: keyof typeof TONES; children: React.ReactNode }) {
  return <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md border whitespace-nowrap', TONES[tone])}>{children}</span>;
}
export const UserStatusPill = ({ status }: { status: string }) =>
  status === 'ACTIVE' ? <Pill tone="green">Active</Pill> : <Pill tone="rose">Disabled</Pill>;
export const RolePill = ({ role }: { role: string }) =>
  <Pill tone={role === 'COMPANY' ? 'blue' : 'slate'}>{role === 'COMPANY' ? 'Company' : role === 'SEEKER' ? 'Job seeker' : role}</Pill>;
export function JobStatusPill({ status }: { status: string }) {
  const tone = status === 'ACTIVE' ? 'green' : status === 'HIDDEN' ? 'rose' : status === 'CLOSED' ? 'amber' : 'slate';
  const label = status === 'HIDDEN' ? 'Hidden' : status.charAt(0) + status.slice(1).toLowerCase();
  return <Pill tone={tone}>{label}</Pill>;
}

/* ---------- table ---------- */
export const th = 'text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 bg-slate-50 border-b border-slate-200 whitespace-nowrap';
export const td = 'px-4 py-3 text-sm text-slate-700 border-b border-slate-100 align-middle';

export function Pagination({ page, totalPages, total, onPage }: { page: number; totalPages: number; total: number; onPage: (p: number) => void }) {
  if (total === 0) return null;
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 text-xs text-slate-600">
      <span>{total} result{total === 1 ? '' : 's'} · page {page} of {totalPages}</span>
      <div className="flex gap-1">
        <Btn size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></Btn>
        <Btn size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight className="w-4 h-4" /></Btn>
      </div>
    </div>
  );
}

/* ---------- form fields ---------- */
export const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 ' +
  'focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 disabled:bg-slate-50 disabled:text-slate-500';

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</span>
      {children}
      {hint && !error && <span className="block text-xs text-slate-500 mt-1">{hint}</span>}
      {error && <span className="block text-xs text-rose-600 mt-1">{error}</span>}
    </label>
  );
}
export function TextInput({ label, hint, ...p }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return <Field label={label} hint={hint}><input {...p} className={cn(inputCls, p.className)} /></Field>;
}
export function TextArea({ label, hint, rows = 3, ...p }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string }) {
  return <Field label={label} hint={hint}><textarea rows={rows} {...p} className={cn(inputCls, 'resize-y', p.className)} /></Field>;
}
export function Select({ label, children, ...p }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return <Field label={label}><select {...p} className={cn(inputCls, p.className)}>{children}</select></Field>;
}

/* ---------- modal ---------- */
export function Modal({ open, title, onClose, children, footer, wide }: {
  open: boolean; title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className={cn('relative bg-white rounded-xl shadow-xl w-full max-h-[90vh] flex flex-col', wide ? 'max-w-2xl' : 'max-w-md')}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="p-1 rounded-md text-slate-500 hover:bg-slate-100 cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 overflow-y-auto space-y-4">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

/**
 * Asks for a reason (required, 10-500 chars) before a sensitive action.
 * The reason is sent to the affected user by email and recorded in the audit log.
 */
export function ReasonDialog({
  open, title, description, confirmLabel, danger, notice, confirmText, onClose, onConfirm,
}: {
  open: boolean; title: string; description: React.ReactNode; confirmLabel: string; danger?: boolean; notice?: string;
  /** If set, the admin must type this exact text (e.g. the account email) to enable the button. */
  confirmText?: string;
  onClose: () => void; onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setReason(''); setTyped(''); setError(''); setBusy(false); } }, [open]);
  const valid = reason.trim().length >= 10 && (!confirmText || typed.trim().toLowerCase() === confirmText.toLowerCase());
  async function submit() {
    setBusy(true); setError('');
    try { await onConfirm(reason.trim()); } catch (e) { setError((e as { message?: string })?.message || 'Action failed'); setBusy(false); }
  }
  return (
    <Modal
      open={open} title={title} onClose={() => !busy && onClose()}
      footer={<>
        <Btn onClick={onClose} disabled={busy}>Cancel</Btn>
        <Btn variant={danger ? 'danger' : 'primary'} onClick={submit} busy={busy} disabled={!valid}>{confirmLabel}</Btn>
      </>}
    >
      <div className="text-sm text-slate-600">{description}</div>
      <Field label="Reason (required)" hint={notice ?? 'This reason is emailed to the user and saved in the audit log.'}>
        <textarea
          value={reason} onChange={(e) => setReason(e.target.value)} rows={4} maxLength={500} autoFocus
          placeholder="Explain clearly why this action is being taken…" className={cn(inputCls, 'resize-none')}
        />
        <span className="block text-right text-xs text-slate-400 mt-1">{reason.trim().length}/500 {reason.trim().length < 10 && '· at least 10 characters'}</span>
      </Field>
      {confirmText && (
        <Field label={`Type ${confirmText} to confirm`}>
          <input value={typed} onChange={(e) => setTyped(e.target.value)} className={inputCls} autoComplete="off" />
        </Field>
      )}
      {error && <p className="text-sm text-rose-600 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" />{error}</p>}
    </Modal>
  );
}

/* ---------- toasts ---------- */
interface Toast { id: number; kind: 'ok' | 'error'; text: string }
const ToastCtx = createContext<(kind: Toast['kind'], text: string) => void>(() => undefined);
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const n = useRef(0);
  const push = useCallback((kind: Toast['kind'], text: string) => {
    const id = ++n.current;
    setItems((p) => [...p, { id, kind, text }]);
    setTimeout(() => setItems((p) => p.filter((t) => t.id !== id)), kind === 'error' ? 7000 : 4000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] space-y-2 w-[22rem] max-w-[calc(100vw-2rem)]" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={cn('flex items-start gap-2 rounded-lg border px-4 py-3 text-sm shadow-lg bg-white',
            t.kind === 'ok' ? 'border-emerald-200 text-emerald-800' : 'border-rose-200 text-rose-800')}>
            {t.kind === 'ok' ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <XCircle className="w-4 h-4 mt-0.5 shrink-0" />}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- debounced value ---------- */
export function useDebounced<T>(value: T, ms = 350): T {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}
