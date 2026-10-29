'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Same palette as the company workspace. */
export const COLORS = {
  blue: '#0063CE', sky: '#0084DA', violet: '#7c3aed', green: '#059669', amber: '#f59e0b', rose: '#e11d48', slate: '#94a3b8', teal: '#0d9488',
};
export const PALETTE = [COLORS.blue, COLORS.sky, COLORS.violet, COLORS.green, COLORS.amber, COLORS.rose, COLORS.teal, COLORS.slate];

export const num = (n: number | null | undefined, digits = 0) =>
  n === null || n === undefined || Number.isNaN(n) ? '–' : n.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
export const compact = (n: number) => (Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(Math.round(n)));
export const shortDay = (d: string | Date) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el); setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/* ---------- change badge ---------- */
export function Delta({ value, suffix = '%', goodWhenUp = true }: { value: number | null | undefined; suffix?: string; goodWhenUp?: boolean }) {
  if (value === null || value === undefined) return <span className="text-xs text-slate-400">no prior data</span>;
  if (value === 0) return <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-slate-500"><Minus className="w-3 h-3" />0{suffix}</span>;
  const up = value > 0; const good = goodWhenUp ? up : !up;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded', good ? 'text-emerald-700 bg-emerald-50' : 'text-rose-600 bg-rose-50')}>
      {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}{num(Math.abs(value), 1)}{suffix}
    </span>
  );
}

/* ---------- multi-line / area chart with hover ---------- */
export interface LineSeries { name: string; color: string; data: number[] }
export function LineChart({ series, labels, height = 240, area = true }: { series: LineSeries[]; labels: string[]; height?: number; area?: boolean }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const n = labels.length;
  const pad = { l: 38, r: 12, t: 12, b: 24 };
  const max = Math.max(1, ...series.flatMap((s) => s.data));
  const top = niceMax(max);
  const iw = Math.max(10, w - pad.l - pad.r), ih = height - pad.t - pad.b;
  const x = (i: number) => pad.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number) => pad.t + ih - (v / top) * ih;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(top * f * 100) / 100);
  const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / 70))));
  return (
    <div ref={ref} className="relative w-full select-none" style={{ height }}>
      {w > 0 && (
        <svg width={w} height={height} role="img" aria-label="Trend chart"
          onMouseLeave={() => setHover(null)}
          onMouseMove={(e) => {
            const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
            const i = Math.round(((e.clientX - r.left - pad.l) / iw) * (n - 1));
            setHover(Math.max(0, Math.min(n - 1, i)));
          }}>
          <defs>
            {series.map((s, i) => (
              <linearGradient key={i} id={`lg-${i}-${s.color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity="0.18" /><stop offset="100%" stopColor={s.color} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeDasharray={t === 0 ? '' : '3 4'} />
              <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize="10" fill="#64748b">{compact(t)}</text>
            </g>
          ))}
          {labels.map((l, i) => (i % every === 0 ? <text key={i} x={x(i)} y={height - 6} textAnchor="middle" fontSize="10" fill="#64748b">{l}</text> : null))}
          {series.map((s, si) => {
            const pts = s.data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
            return (
              <g key={s.name}>
                {area && n > 1 && <polygon points={`${x(0)},${y(0)} ${pts} ${x(n - 1)},${y(0)}`} fill={`url(#lg-${si}-${s.color.slice(1)})`} />}
                <polyline points={pts} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              </g>
            );
          })}
          {hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} stroke="#94a3b8" strokeDasharray="3 3" />
              {series.map((s) => <circle key={s.name} cx={x(hover)} cy={y(s.data[hover] ?? 0)} r="3.5" fill="#fff" stroke={s.color} strokeWidth="2" />)}
            </g>
          )}
        </svg>
      )}
      {hover !== null && w > 0 && (
        <div className="absolute z-10 pointer-events-none rounded-lg border border-slate-200 bg-white shadow-lg px-3 py-2 text-xs"
          style={{ top: 8, left: Math.min(Math.max(x(hover) + 12, 8), w - 170) }}>
          <p className="font-semibold text-slate-800 mb-1">{labels[hover]}</p>
          {series.map((s) => (
            <p key={s.name} className="flex items-center gap-2 text-slate-600">
              <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />{s.name}
              <span className="ml-auto font-semibold text-slate-900 tabular-nums">{num(s.data[hover])}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
function niceMax(v: number) {
  if (v <= 4) return 4;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 4 ? 4 : f <= 5 ? 5 : 10) * p;
}

export function Legend({ items }: { items: Array<{ name: string; color: string; value?: string }> }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-600">
      {items.map((i) => (
        <span key={i.name} className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: i.color }} />{i.name}{i.value && <b className="text-slate-900 tabular-nums">{i.value}</b>}
        </span>
      ))}
    </div>
  );
}

/* ---------- horizontal bar list ---------- */
export function BarList({ rows, color = COLORS.blue, format = num, empty = 'No data yet' }: {
  rows: Array<{ label: React.ReactNode; value: number; hint?: string; color?: string }>; color?: string; format?: (n: number) => string; empty?: string;
}) {
  if (!rows.length) return <p className="py-6 text-center text-xs text-slate-500">{empty}</p>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2.5">
      {rows.map((r, i) => (
        <li key={i}>
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="text-slate-700 font-medium truncate">{r.label}</span>
            <span className="text-slate-500 tabular-nums shrink-0"><b className="text-slate-900">{format(r.value)}</b>{r.hint && <span className="ml-1.5">{r.hint}</span>}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, background: r.color ?? color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ---------- donut ---------- */
export function Donut({ slices, size = 140, center, sub }: { slices: Array<{ label: string; value: number; color: string }>; size?: number; center?: React.ReactNode; sub?: string }) {
  const total = slices.reduce((a, s) => a + s.value, 0);
  const r = size / 2 - 12, c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex items-center gap-5 flex-wrap">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Distribution">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth="14" />
          {total > 0 && slices.filter((s) => s.value > 0).map((s) => {
            const len = (s.value / total) * c; const off = -acc; acc += len;
            return <circle key={s.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth="14"
              strokeDasharray={`${Math.max(0, len - 1.5)} ${c}`} strokeDashoffset={off} transform={`rotate(-90 ${size / 2} ${size / 2})`} />;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xl font-semibold text-slate-900 tabular-nums leading-none">{center ?? num(total)}</span>
          {sub && <span className="text-[11px] text-slate-500 mt-1">{sub}</span>}
        </div>
      </div>
      <ul className="space-y-1.5 text-xs min-w-[120px] flex-1">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-slate-600">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
            <span className="truncate">{s.label}</span>
            <span className="ml-auto font-semibold text-slate-900 tabular-nums">{num(s.value)}</span>
            <span className="text-slate-400 tabular-nums w-10 text-right">{total ? Math.round((s.value / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- vertical columns ---------- */
export function Columns({ data, color = COLORS.blue, height = 150, format = num }: { data: Array<{ label: string; value: number }>; color?: string; height?: number; format?: (n: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ height }}>
        {data.map((d) => (
          <div key={d.label} className="flex-1 min-w-0 h-full flex items-end group relative" title={`${d.label}: ${format(d.value)}`}>
            <div className="w-full rounded-t-md transition-opacity group-hover:opacity-80" style={{ height: `${Math.max(d.value ? 3 : 1, (d.value / max) * 100)}%`, background: d.value ? color : '#e2e8f0' }} />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 mt-1.5">
        {data.map((d, i) => (
          <span key={d.label} className="flex-1 min-w-0 text-center text-[10px] text-slate-500 whitespace-nowrap overflow-visible">
            {data.length > 12 ? (i % 3 === 0 ? <span className="inline-block -mx-4">{d.label}</span> : '') : d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- funnel ---------- */
export function Funnel({ steps, showStep = true }: { steps: Array<{ label: string; value: number; color?: string }>; showStep?: boolean }) {
  const top = Math.max(1, steps[0]?.value ?? 0, ...steps.map((s) => s.value));
  return (
    <ul className="space-y-3">
      {steps.map((s, i) => {
        const prev = i === 0 ? null : steps[i - 1].value;
        return (
          <li key={s.label}>
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-medium text-slate-700">{s.label}</span>
              <span className="tabular-nums text-slate-500">
                <b className="text-slate-900 text-sm">{num(s.value)}</b>
                <span className="ml-2">{Math.round((s.value / top) * 100)}%</span>
                {showStep && prev !== null && prev > 0 && <span className="ml-2 text-slate-400">({Math.round((s.value / prev) * 100)}% of previous)</span>}
              </span>
            </div>
            <div className="mt-1 h-6 rounded-md bg-slate-50 overflow-hidden">
              <div className="h-full rounded-md" style={{ width: `${Math.max(1.5, (s.value / top) * 100)}%`, background: s.color ?? PALETTE[i % PALETTE.length], opacity: 0.9 }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------- 24-hour strip ---------- */
export function HourStrip({ data }: { data: Array<{ hour: number; count: number }> }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div>
      <div className="grid grid-cols-12 sm:grid-cols-24 gap-1" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
        {data.map((d) => (
          <div key={d.hour} title={`${String(d.hour).padStart(2, '0')}:00 - ${d.count}`} className="h-9 rounded"
            style={{ background: COLORS.blue, opacity: d.count ? 0.15 + 0.85 * (d.count / max) : 0.06 }} />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-slate-500 mt-1"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span></div>
    </div>
  );
}

/* ---------- small stat ---------- */
export function Stat({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: string; tone?: 'good' | 'bad' | 'warn' }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cn('mt-1 text-xl font-semibold tabular-nums', tone === 'bad' ? 'text-rose-600' : tone === 'warn' ? 'text-amber-600' : tone === 'good' ? 'text-emerald-600' : 'text-slate-900')}>{value}</p>
      {hint && <p className="text-xs text-slate-500 mt-0.5">{hint}</p>}
    </div>
  );
}

/** "sql" -> "SQL", "node.js" -> "Node.js", "ux research" -> "UX Research". */
export const skillName = (s: string) =>
  s.split(' ').map((w) => (w.length <= 3 && !/[.]/.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
