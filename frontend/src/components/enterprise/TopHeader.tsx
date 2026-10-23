'use client';

import { useState } from 'react';
import { Search, Bell, ChevronDown, Settings } from 'lucide-react';

interface Props {
  userName: string;
  userAvatar?: string | null;
  unreadCount?: number;
  onSearch?: (q: string) => void;
}

export default function TopHeader({ userName, userAvatar, unreadCount = 0, onSearch }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 flex items-center gap-4 h-16 px-6 bg-white border-b border-gray-200">
      {/* Search */}
      <div className="flex-1 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          onChange={(e) => onSearch?.(e.target.value)}
          placeholder="Search jobs, candidates..."
          className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
        />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <button className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-50 text-gray-500 transition-colors">
          <Bell className="w-[18px] h-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-semibold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {userAvatar ? (
              <img src={userAvatar} className="w-8 h-8 rounded-full object-cover" alt={userName} />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-semibold">
                {userName?.[0]?.toUpperCase()}
              </div>
            )}
            <span className="text-sm font-medium text-gray-700 hidden sm:block">{userName}</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-30">
              <a href="/company/profile" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
                <Settings className="w-4 h-4" /> Settings
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}