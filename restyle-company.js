// LinkEdge: company-side UI restyle (colors, type scale, radius <= 16px). UI only, no logic changes.
// Run from the LinkEdge folder:  node restyle-company.js
const fs = require('fs'), path = require('path');
const SRC = path.join(process.cwd(), 'frontend', 'src');
if (!fs.existsSync(SRC)) { console.error('Run this from the LinkEdge folder (frontend/src not found).'); process.exit(1); }

function walk(d, out = []) {
  if (!fs.existsSync(d)) return out;
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p, out); else if (/\.(tsx|ts)$/.test(f.name)) out.push(p);
  }
  return out;
}
const files = [
  ...walk(path.join(SRC, 'components', 'enterprise')),
  ...walk(path.join(SRC, 'app', 'company', '(dashboard)')),
  path.join(SRC, 'components', 'LogoutConfirmModal.tsx'),
].filter(f => fs.existsSync(f));

const tint = {
  'bg-sky-50/50': 'bg-brand-50/60', 'bg-sky-50/30': 'bg-brand-50/40', 'bg-sky-50': 'bg-brand-50',
  'text-sky-700': 'text-brand-700', 'border-sky-200': 'border-brand-200', 'border-sky-100': 'border-brand-100',
  'ring-sky-50': 'ring-brand-50', 'bg-blue-50': 'bg-brand-50', 'text-blue-700': 'text-brand-700',
  'border-blue-100': 'border-brand-100', 'text-indigo-600': 'text-brand-600', 'bg-indigo-50': 'bg-brand-50',
};
const sizes = { 'text-[10px]': 'text-xs', 'text-[10.5px]': 'text-xs', 'text-[11px]': 'text-xs', 'text-[22px]': 'text-2xl', 'text-[26px]': 'text-3xl' };
const esc = s => s.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');

function edit(file, fn) {
  const raw = fs.readFileSync(file, 'utf8');
  const crlf = raw.includes('\r\n');
  let s = raw.replace(/\r\n/g, '\n');
  const o = s;
  s = fn(s, file);
  if (s !== o) { fs.writeFileSync(file, crlf ? s.replace(/\n/g, '\r\n') : s, 'utf8'); return true; }
  return false;
}
const rep = (s, a, b) => s.split(a).join(b);

let changed = 0;
for (const f of files) {
  const base = path.basename(f);
  if (edit(f, s => {
    if (base === 'eventStyle.ts') {
      s = s.replace("bg-sky-50 text-sky-800 border-sky-200', dot: 'bg-sky-500', bar: 'border-l-sky-500'", "bg-brand-50 text-brand-800 border-brand-200', dot: 'bg-brand-500', bar: 'border-l-brand-500'");
      s = s.replace("bg-blue-50 text-blue-800 border-blue-200', dot: 'bg-blue-600', bar: 'border-l-blue-600'", "bg-indigo-50 text-indigo-800 border-indigo-200', dot: 'bg-indigo-600', bar: 'border-l-indigo-600'");
    }
    s = s.replace(/#0025B8/gi, '#0063CE').replace(/#0F9DE4/gi, '#0084DA').replace(/#001f9c/gi, '#0052AB');
    for (const [a, b] of Object.entries(tint)) s = s.replace(new RegExp('(?<![\\w-])' + esc(a) + '(?![\\w/-])', 'g'), b);
    for (const [a, b] of Object.entries(sizes)) s = rep(s, a, b);
    s = s.replace(/(?<![\w:-])text-slate-500(?![\w-])/g, 'text-slate-600');
    s = s.replace(/(?<![\w:-])text-slate-400(?![\w-])/g, 'text-slate-500');
    s = rep(s, 'rounded-[28px]', 'rounded-2xl');
    s = s.replace(/(?<![\w-])rounded-xl(?![\w-])/g, 'rounded-2xl');
    s = rep(s, 'rounded-b-xl', 'rounded-b-2xl');
    // specific polish
    if (base === 'eventStyle.ts') s = s.replace("bg-brand-50 text-indigo-800", "bg-indigo-50 text-indigo-800");
    if (base === 'primitives.tsx') s = s.replace("px-2 py-0.5 rounded-full border whitespace-nowrap", "px-2 py-0.5 rounded-md border whitespace-nowrap");
    if (base === 'StatusBadge.tsx') s = s.replace("px-2.5 py-1 rounded-full border", "px-2.5 py-1 rounded-md border");
    if (base === 'StatCard.tsx') s = s.replace("px-1.5 py-0.5 rounded-full", "px-1.5 py-0.5 rounded-md");
    if (base === 'Sidebar.tsx') s = s.replace("active ? 'bg-slate-100 text-slate-900'", "active ? 'bg-brand-50 text-brand-700'");
    if (base === 'TopHeader.tsx') s = rep(s, 'rounded-lg shadow-xl', 'rounded-xl shadow-xl');
    if (base === 'layout.tsx' && f.includes('(dashboard)')) s = s.replace('min-h-screen bg-slate-50', 'min-h-screen bg-[#F5F8FC]');
    if (base === 'kit.tsx') {
      s = s.replace("export const thCls = 'font-semibold px-4 py-2.5", "export const thCls = 'font-semibold px-3 py-2.5");
      s = s.replace("export const tdCls = 'px-4 py-3", "export const tdCls = 'px-3 py-3");
    }
    return s;
  })) changed++;
}

// brand tokens in globals.css
const css = path.join(SRC, 'app', 'globals.css');
if (fs.existsSync(css) && edit(css, s => {
  if (!s.includes('--color-brand-600')) {
    s = s.replace(/(--font-sans:[^\n]*\n)/, `$1
  /* LinkEdge brand: primary #0063CE, secondary #0084DA */
  --color-brand-50: #eff6fd;
  --color-brand-100: #dbeafb;
  --color-brand-200: #b8d6f6;
  --color-brand-300: #85b8ee;
  --color-brand-400: #3d8fe0;
  --color-brand-500: #0084da;
  --color-brand-600: #0063ce;
  --color-brand-700: #0052ab;
  --color-brand-800: #004288;
  --color-brand-900: #00315f;
`);
  }
  if (!s.includes('-webkit-font-smoothing')) s = s.replace("body {\n  font-family: var(--font-inter) !important;\n}", "body {\n  font-family: var(--font-inter) !important;\n  -webkit-font-smoothing: antialiased;\n  font-feature-settings: 'cv11', 'ss01';\n}");
  return s;
})) changed++;

console.log('Done. Files updated:', changed);
