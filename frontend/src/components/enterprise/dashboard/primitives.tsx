'use client';

import { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, AlertCircle, Inbox } from 'lucide-react';

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

export function fmtNum(n: number | null | undefined, digits = 0) {
  if (n === null || n === undefined || Number.isNaN(n)) return '–';
  return n.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

export function relTime(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function daysLeft(deadline: string | null | undefined) {
  if (!deadline) return null;
  const end = new Date(deadline);
  end.setHours(23, 59, 59, 999);
  return Math.ceil((end.getTime() - Date.now()) / 86400000);
}

/* ---------- Panel ---------- */
export function Panel({
  title, subtitle, icon, actions, children, className, bodyClassName, noPad,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  noPad?: boolean;
}) {
  return (
    <section className={cx('bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex flex-col min-w-0', className)}>
      <header className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2.5 min-w-0">
          {icon && <span className="w-7 h-7 rounded-md bg-slate-50 border border-slate-100 text-[#0025B8] flex items-center justify-center shrink-0">{icon}</span>}
          <div className="min-w-0">
            <h2 className="text-[13px] font-semibold text-slate-900 leading-tight truncate">{title}</h2>
            {subtitle && <p className="text-[11px] text-slate-400 leading-tight mt-0.5 truncate">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </header>
      <div className={cx('flex-1 min-h-0', noPad ? '' : 'p-5', bodyClassName)}>{children}</div>
    </section>
  );
}

export function PanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 rounded bg-slate-100" style={{ width: `${95 - i * 12}%` }} />
      ))}
    </div>
  );
}

export function EmptyNote({ text, icon }: { text: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
      <span className="text-slate-300">{icon ?? <Inbox className="w-6 h-6" />}</span>
      <p className="text-xs text-slate-400 max-w-[220px]">{text}</p>
    </div>
  );
}

export function ErrorNote({ text = 'Could not load this section.', onRetry }: { text?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
      <AlertCircle className="w-6 h-6 text-rose-300" />
      <p className="text-xs text-slate-400">{text}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-[11px] font-semibold text-[#0025B8] hover:underline cursor-pointer">Try again</button>
      )}
    </div>
  );
}

/* ---------- Sparkline ---------- */
export function Sparkline({ data, color = '#0025B8', height = 30, width = 96 }: { data: number[]; color?: string; height?: number; width?: number }) {
  if (!data || data.length < 2) return <div style={{ height, width }} />;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const step = width / (data.length - 1);
  const pts = data.map((v, i) => `${(i * step).toFixed(1)},${(height - 3 - ((v - min) / span) * (height - 6)).toFixed(1)}`);
  const area = `0,${height} ${pts.join(' ')} ${width},${height}`;
  const gid = `spark-${color.replace('#', '')}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gid})`} />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* ---------- KPI tile ---------- */
export function KpiTile({
  label, value, unit, hint, delta, deltaGood = true, icon, spark, sparkColor, loading, href,
}: {
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
  delta?: { value: number; label: string } | null;
  deltaGood?: boolean;
  icon: ReactNode;
  spark?: number[];
  sparkColor?: string;
  loading?: boolean;
  href?: string;
}) {
  const up = (delta?.value ?? 0) >= 0;
  const good = deltaGood ? up : !up;
  const body = (
    <div className="bg-white rounded-xl border border-slate-200 p-4 h-full hover:border-slate-300 hover:shadow-sm transition-all">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
        <span className="w-7 h-7 rounded-md bg-slate-50 text-slate-500 flex items-center justify-center">{icon}</span>
      </div>
      {loading ? (
        <div className="mt-3 space-y-2 animate-pulse">
          <div className="h-7 w-20 rounded bg-slate-100" />
          <div className="h-3 w-28 rounded bg-slate-100" />
        </div>
      ) : (
        <div className="mt-2 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[26px] leading-8 font-semibold text-slate-900 tabular-nums">
              {value}{unit && <span className="text-sm font-medium text-slate-400 ml-1">{unit}</span>}
            </p>
            <div className="mt-1 flex items-center gap-1.5 min-h-[18px]">
              {delta && (
                <span className={cx('inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded',
                  good ? 'text-emerald-700 bg-emerald-50' : 'text-rose-600 bg-rose-50')}>
                  {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {fmtNum(Math.abs(delta.value))}
                </span>
              )}
              {(delta?.label || hint) && <span className="text-[11px] text-slate-400 truncate">{delta?.label ?? hint}</span>}
            </div>
          </div>
          {spark && <Sparkline data={spark} color={sparkColor} />}
        </div>
      )}
    </div>
  );
  return href ? <a href={href} className="block h-full">{body}</a> : body;
}

/* ---------- Score ring ---------- */
export function ScoreRing({ value, size = 38 }: { value: number | null | undefined; size?: number }) {
  const v = value === null || value === undefined ? null : Math.max(0, Math.min(100, value));
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const color = v === null ? '#cbd5e1' : v >= 80 ? '#059669' : v >= 60 ? '#0F9DE4' : v >= 40 ? '#d97706' : '#e11d48';
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth="3.5" />
        {v !== null && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c - (v / 100) * c} />
        )}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-700 tabular-nums">
        {v === null ? '–' : Math.round(v)}
      </span>
    </div>
  );
}

export function Pill({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'blue' | 'green' | 'amber' | 'rose' | 'violet' | 'sky' }) {
  const tones: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-600 border-slate-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    violet: 'bg-violet-50 text-violet-700 border-violet-100',
    sky: 'bg-sky-50 text-sky-700 border-sky-100',
  };
  return <span className={cx('inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap', tones[tone])}>{children}</span>;
}
