'use client';

import { useState } from 'react';
import { Search, Bell, ChevronDown, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  userName: string;
  userAvatar?: string | null;
  unreadCount?: number;
  onSearch?: (q: string) => void;
}

export default function TopHeader({ userName, userAvatar, unreadCount = 0, onSearch }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 flex items-center gap-4 h-20 px-4 sm:px-8 bg-white/90 backdrop-blur-xl border-b border-sky-100 shadow-xs">
      {/* Search */}
      <div className="flex-1 max-w-md relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          onChange={(e) => onSearch?.(e.target.value)}
          placeholder="Search jobs, candidates..."
          className="w-full pl-11 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-sky-100 rounded-2xl
                     focus:outline-none focus:ring-2 focus:ring-[#0F9DE4]/20 focus:border-[#0F9DE4] transition-all text-slate-800 shadow-xs"
        />
      </div>

      <div className="flex items-center gap-3 ml-auto">
        <button className="relative w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-sky-50 text-slate-600 transition-colors border border-sky-100/60 shadow-xs cursor-pointer">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 rounded-full text-[10px] text-white flex items-center justify-center font-bold shadow-xs">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-2xl hover:bg-sky-50 transition-colors border border-sky-100/60 shadow-xs cursor-pointer"
          >
            {userAvatar ? (
              <img src={userAvatar} className="w-9 h-9 rounded-xl object-cover shadow-xs" alt={userName} />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0025B8] to-[#0F9DE4] text-white flex items-center justify-center text-xs font-extrabold shadow-xs">
                {userName?.[0]?.toUpperCase()}
              </div>
            )}
            <span className="text-xs sm:text-sm font-bold text-slate-700 hidden sm:block truncate max-w-[120px]">{userName}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 mt-3 w-52 bg-white/95 backdrop-blur-2xl border border-sky-100 rounded-2xl shadow-2xl py-2 z-30 overflow-hidden"
              >
                <a href="/company/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-sky-50 transition-colors">
                  <Settings className="w-4 h-4 text-[#0F9DE4]" /> Settings
                </a>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}