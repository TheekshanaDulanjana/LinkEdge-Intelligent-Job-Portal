'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Bell, ChevronDown, Settings, Briefcase, Users, CornerDownLeft, CheckCheck, UserPlus, Info } from 'lucide-react';
import { applicationApi } from '@/lib/api';
import { cx, relTime } from '@/components/enterprise/dashboard/primitives';

interface Props {
  userName: string;
  userAvatar?: string | null;
}

const TITLES: Record<string, string> = {
  '/company/dashboard': 'Dashboard',
  '/company/jobs': 'Jobs',
  '/company/candidates': 'Candidates',
  '/company/calendar': 'Calendar',
  '/company/analytics': 'Analytics',
  '/company/profile': 'Company profile',
  '/company/post-job': 'Post a job',
};

type Notif = {
  id: string; type: string; title: string; message: string; isRead: boolean; createdAt: string;
  metadata?: { applicationId?: string; jobId?: string } | null;
};

export default function TopHeader({ userName, userAvatar }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [q, setQ] = useState('');
  const [focus, setFocus] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const section = Object.keys(TITLES).find(k => pathname === k || pathname.startsWith(k + '/'));
  const title = section ? TITLES[section] : 'Workspace';

  // Only this company's own notifications; the server scopes them by user and role.
  async function loadUnread() {
    try {
      const res = await applicationApi.get('/notifications/unread-count');
      setUnread(Number(res.data?.data?.count ?? 0));
    } catch { /* keep the previous count */ }
  }
  async function loadList() {
    try {
      const res = await applicationApi.get('/notifications');
      setNotifs(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch { /* keep the previous list */ }
  }
  useEffect(() => {
    loadUnread();
    const t = setInterval(loadUnread, 30000);
    return () => clearInterval(t);
  }, [pathname]);

  async function toggleBell() {
    const next = !bellOpen;
    setBellOpen(next); setMenuOpen(false);
    if (next) await loadList();
  }
  async function markRead(n: Notif) {
    if (!n.isRead) {
      setNotifs(p => p.map(x => (x.id === n.id ? { ...x, isRead: true } : x)));
      setUnread(c => Math.max(0, c - 1));
      try { await applicationApi.patch(`/notifications/${n.id}/read`); } catch { loadUnread(); }
    }
    setBellOpen(false);
    const jobId = n.metadata?.jobId;
    router.push(jobId ? `/company/jobs/${jobId}/applicants` : '/company/candidates');
  }
  async function markAll() {
    setNotifs(p => p.map(x => ({ ...x, isRead: true })));
    setUnread(0);
    try { await applicationApi.patch('/notifications/mark-all-read'); } catch { loadUnread(); }
  }

  // "/" focuses search, like most admin consoles
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
        e.preventDefault(); inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) { setMenuOpen(false); setBellOpen(false); setFocus(false); }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function go(path: 'jobs' | 'candidates') {
    const term = q.trim();
    setFocus(false);
    router.push(`/company/${path}${term ? `?q=${encodeURIComponent(term)}` : ''}`);
  }

  return (
    <header ref={boxRef} className="sticky top-0 z-20 flex items-center gap-4 h-16 pl-14 pr-4 lg:px-8 bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 shrink-0">
        <span>Employer</span><span>/</span><span className="font-semibold text-slate-700">{title}</span>
      </div>

      <div className="flex-1 max-w-lg relative md:ml-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          ref={inputRef}
          value={q}
          onChange={e => setQ(e.target.value)}
          onFocus={() => setFocus(true)}
          onKeyDown={e => { if (e.key === 'Enter' && q.trim()) go('candidates'); if (e.key === 'Escape') { setFocus(false); inputRef.current?.blur(); } }}
          placeholder="Search jobs and candidates"
          className="w-full h-9 pl-9 pr-9 text-[13px] bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400
                     focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0F9DE4]/25 focus:border-[#0F9DE4] transition-colors"
        />
        <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-400 border border-slate-200 rounded px-1.5 py-0.5 bg-white pointer-events-none">/</kbd>
        {focus && q.trim() && (
          <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-xl py-1.5 z-30">
            <button onMouseDown={e => e.preventDefault()} onClick={() => go('candidates')} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer">
              <Users className="w-4 h-4 text-slate-400" /> Search candidates for <b className="text-slate-900">“{q.trim()}”</b>
              <CornerDownLeft className="w-3.5 h-3.5 ml-auto text-slate-300" />
            </button>
            <button onMouseDown={e => e.preventDefault()} onClick={() => go('jobs')} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer">
              <Briefcase className="w-4 h-4 text-slate-400" /> Search jobs for <b className="text-slate-900">“{q.trim()}”</b>
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <div className="relative">
          <button onClick={toggleBell} aria-label={unread > 0 ? `${unread} unread notifications` : 'Notifications'}
            className="relative w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors cursor-pointer">
            <Bell className="w-4 h-4" />
            {unread > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white tabular-nums">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
          {bellOpen && (
            <div className="absolute right-0 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-lg shadow-xl z-30 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-900">Notifications{unread > 0 && <span className="ml-1.5 text-rose-600">({unread} new)</span>}</p>
                {unread > 0 && (
                  <button onClick={markAll} className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0025B8] hover:underline cursor-pointer">
                    <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                  </button>
                )}
              </div>
              {notifs.length === 0 ? (
                <p className="px-4 py-8 text-xs text-slate-400 text-center">No notifications yet.</p>
              ) : (
                <ul className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                  {notifs.slice(0, 20).map(n => (
                    <li key={n.id}>
                      <button onClick={() => markRead(n)} className={cx('w-full text-left px-4 py-3 flex gap-3 hover:bg-slate-50 cursor-pointer', !n.isRead && 'bg-sky-50/50')}>
                        <span className={cx('mt-0.5 w-7 h-7 rounded-md flex items-center justify-center shrink-0', n.type === 'NEW_APPLICATION' ? 'bg-blue-50 text-[#0025B8]' : 'bg-slate-100 text-slate-500')}>
                          {n.type === 'NEW_APPLICATION' ? <UserPlus className="w-3.5 h-3.5" /> : <Info className="w-3.5 h-3.5" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-semibold text-slate-800 truncate">{n.title}</span>
                          <span className="block text-xs text-slate-600 leading-snug mt-0.5">{n.message}</span>
                          <span className="block text-[10.5px] text-slate-400 mt-1">{relTime(n.createdAt)}</span>
                        </span>
                        {!n.isRead && <span className="mt-1.5 w-2 h-2 rounded-full bg-rose-500 shrink-0" />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="relative">
          <button onClick={() => { setMenuOpen(v => !v); setBellOpen(false); }}
            className="flex items-center gap-2 h-9 pl-1.5 pr-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer">
            {userAvatar
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={userAvatar} alt={userName} className="w-6 h-6 rounded-md object-cover" />
              : <span className="w-6 h-6 rounded-md bg-gradient-to-br from-[#0025B8] to-[#0F9DE4] text-white text-[11px] font-semibold flex items-center justify-center">{userName?.[0]?.toUpperCase()}</span>}
            <span className="text-xs font-semibold text-slate-700 hidden sm:block truncate max-w-[130px]">{userName}</span>
            <ChevronDown className={cx('w-3.5 h-3.5 text-slate-400 transition-transform', menuOpen && 'rotate-180')} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-lg shadow-xl py-1.5 z-30">
              <Link href="/company/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                <Settings className="w-4 h-4 text-slate-400" /> Company profile
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
