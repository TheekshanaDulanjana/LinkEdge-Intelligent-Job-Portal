'use client';

import { ReactNode, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, X, AlertCircle } from 'lucide-react';
import { cx, Pill } from './primitives';
export { cx };

/* The public footer is hidden inside the company workspace. */
export function useHideFooter() {
  useEffect(() => {
    const footer = document.querySelector('footer') as HTMLElement | null;
    if (footer) footer.style.display = 'none';
    return () => { if (footer) footer.style.display = ''; };
  }, []);
}

/* ---------- shared form control classes ---------- */
export const inputCls =
  'h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-800 placeholder:text-slate-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-[#0F9DE4]/25 focus:border-[#0F9DE4] disabled:bg-slate-50 disabled:text-slate-400 transition-colors';
export const selectCls = inputCls + ' pr-8 cursor-pointer';
export const textareaCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-800 placeholder:text-slate-400 resize-none ' +
  'focus:outline-none focus:ring-2 focus:ring-[#0F9DE4]/25 focus:border-[#0F9DE4] transition-colors';

export const btnPrimary =
  'inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg bg-[#0025B8] text-white text-xs font-semibold shadow-sm ' +
  'hover:bg-[#001f9c] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer';
export const btnSecondary =
  'inline-flex items-center justify-center gap-2 h-9 px-3.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-semibold ' +
  'hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer';
export const btnDanger =
  'inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg bg-rose-600 text-white text-xs font-semibold shadow-sm ' +
  'hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer';
export const iconBtn =
  'w-8 h-8 inline-flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer';

/* ---------- Page header ---------- */
export function PageHead({
  eyebrow, title, description, actions, breadcrumb,
}: {
  eyebrow?: string; title: string; description?: string; actions?: ReactNode; breadcrumb?: ReactNode;
}) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
      <div className="min-w-0">
        {breadcrumb}
        {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{eyebrow}</p>}
        <h1 className="text-[22px] font-semibold text-slate-900 leading-tight mt-0.5 truncate">{title}</h1>
        {description && <p className="text-xs text-slate-500 mt-1 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

/* ---------- Segmented control ---------- */
export function Segmented<T extends string>({
  value, onChange, options, size = 'md',
}: {
  value: T; onChange: (v: T) => void; options: Array<{ value: T; label: ReactNode; count?: number }>; size?: 'sm' | 'md';
}) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
      {options.map(o => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={cx('font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap',
            size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs',
            value === o.value ? 'bg-[#0025B8] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800')}>
          {o.label}
          {o.count !== undefined && <span className={cx('ml-1.5 tabular-nums', value === o.value ? 'opacity-80' : 'opacity-50')}>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ---------- Avatar ---------- */
export function Avatar({ name, src, size = 32 }: { name?: string | null; src?: string | null; size?: number }) {
  const initials = (name ?? '?').trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || '?';
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name ?? ''} width={size} height={size} className="rounded-lg object-cover shrink-0" style={{ width: size, height: size }} />;
  }
  return (
    <span className="rounded-lg bg-gradient-to-br from-[#0025B8] to-[#0F9DE4] text-white font-semibold flex items-center justify-center shrink-0"
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.36) }}>
      {initials}
    </span>
  );
}

/* ---------- Status vocab shared by all pages ---------- */
export const STAGE_META: Record<string, { label: string; color: string; tone: 'slate' | 'blue' | 'violet' | 'sky' | 'rose' | 'green' }> = {
  PENDING:     { label: 'Pending',     color: '#94a3b8', tone: 'slate' },
  REVIEWING:   { label: 'Under review', color: '#0025B8', tone: 'blue' },
  SHORTLISTED: { label: 'Shortlisted', color: '#7c3aed', tone: 'violet' },
  INTERVIEW:   { label: 'Interview',   color: '#0F9DE4', tone: 'sky' },
  HIRED:       { label: 'Hired',       color: '#059669', tone: 'green' },
  REJECTED:    { label: 'Rejected',    color: '#e11d48', tone: 'rose' },
};

export function StagePill({ status }: { status: string }) {
  const m = STAGE_META[status];
  return <Pill tone={m?.tone ?? 'slate'}>{m?.label ?? status}</Pill>;
}

export function JobStatusPill({ status }: { status: string }) {
  const tone = status === 'ACTIVE' ? 'green' : status === 'CLOSED' ? 'rose' : status === 'DRAFT' ? 'amber' : 'slate';
  return <Pill tone={tone}>{status.charAt(0) + status.slice(1).toLowerCase()}</Pill>;
}

/* ---------- Pagination ---------- */
export function Pagination({
  page, totalPages, total, pageSize, onPage,
}: { page: number; totalPages: number; total: number; pageSize: number; onPage: (p: number) => void }) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-slate-100 bg-slate-50/50 rounded-b-xl">
      <p className="text-[11px] text-slate-500 tabular-nums">Showing <b className="text-slate-800">{from}–{to}</b> of <b className="text-slate-800">{total}</b></p>
      <div className="flex items-center gap-1">
        <button disabled={page <= 1} onClick={() => onPage(page - 1)} className={cx(iconBtn, 'border border-slate-200 bg-white disabled:opacity-40')} aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
        <span className="text-[11px] font-semibold text-slate-600 px-2 tabular-nums">{page} / {Math.max(totalPages, 1)}</span>
        <button disabled={page >= totalPages} onClick={() => onPage(page + 1)} className={cx(iconBtn, 'border border-slate-200 bg-white disabled:opacity-40')} aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

/* ---------- Modal / Drawer / Confirm ---------- */
export function Modal({
  open, onClose, title, subtitle, children, footer, width = 'max-w-lg',
}: {
  open: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode; footer?: ReactNode; width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.div role="dialog" aria-modal="true" onMouseDown={e => e.stopPropagation()}
            initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }}
            className={cx('w-full bg-white rounded-xl border border-slate-200 shadow-2xl max-h-[90vh] flex flex-col', width)}>
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
                {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
              </div>
              <button onClick={onClose} className={iconBtn} aria-label="Close"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-5 py-4 overflow-y-auto">{children}</div>
            {footer && <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 rounded-b-xl flex justify-end gap-2">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ConfirmDialog({
  open, title, message, confirmLabel = 'Confirm', busy, onConfirm, onCancel,
}: {
  open: boolean; title: string; message: ReactNode; confirmLabel?: string; busy?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title} width="max-w-md"
      footer={<>
        <button onClick={onCancel} disabled={busy} className={btnSecondary}>Cancel</button>
        <button onClick={onConfirm} disabled={busy} className={btnDanger}>{busy ? 'Working…' : confirmLabel}</button>
      </>}>
      <div className="flex gap-3">
        <span className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0"><AlertTriangle className="w-4 h-4" /></span>
        <div className="text-[13px] text-slate-600 leading-relaxed">{message}</div>
      </div>
    </Modal>
  );
}

export function Drawer({
  open, onClose, title, subtitle, children, width = 'max-w-xl',
}: { open: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode; width?: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div className="absolute inset-0 bg-slate-900/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside role="dialog" aria-modal="true"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'tween', duration: 0.22 }}
            className={cx('relative w-full bg-white border-l border-slate-200 shadow-2xl flex flex-col', width)}>
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-900 truncate">{title}</h3>
                {subtitle && <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>}
              </div>
              <button onClick={onClose} className={iconBtn} aria-label="Close"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ---------- Toast ---------- */
export function Toast({ toast }: { toast: { type: 'ok' | 'err'; msg: string } | null }) {
  return (
    <div className="fixed bottom-5 right-5 z-[60] pointer-events-none">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
            className={cx('pointer-events-auto flex items-center gap-2.5 text-xs font-medium px-4 py-3 rounded-lg border shadow-lg bg-white',
              toast.type === 'ok' ? 'border-emerald-200 text-emerald-800' : 'border-rose-200 text-rose-800')}>
            {toast.type === 'ok' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- Table helpers ---------- */
export const thCls = 'font-semibold px-4 py-2.5 text-left text-[10.5px] uppercase tracking-wide text-slate-400 bg-slate-50/70 whitespace-nowrap';
export const tdCls = 'px-4 py-3 align-middle';

/* ---------- Form field ---------- */
export function Field({
  label, hint, error, required, children, className,
}: { label: string; hint?: string; error?: string; required?: boolean; children: ReactNode; className?: string }) {
  return (
    <label className={cx('block', className)}>
      <span className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-slate-700">{label}{required && <span className="text-rose-500 ml-0.5">*</span>}</span>
        {hint && <span className="text-[11px] text-slate-400">{hint}</span>}
      </span>
      {children}
      {error && <span className="block text-[11px] text-rose-600 mt-1 font-medium">{error}</span>}
    </label>
  );
}
