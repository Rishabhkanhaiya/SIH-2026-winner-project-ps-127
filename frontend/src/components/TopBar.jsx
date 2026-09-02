import React, { useState } from 'react'
import { Search, Bell, ChevronDown, Wifi, LogOut, Settings } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'

export default function TopBar({ onLogout }) {
  const [showDropdown, setShowDropdown] = useState(false)
  const navigate  = useNavigate()
  const location  = useLocation()

  let currentUser = { username: 'admin', role: 'Command Officer' }
  try {
    const raw = localStorage.getItem('urbanpulse_user')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && parsed.username) currentUser = parsed
    }
  } catch { /* fallback */ }

  const initials = currentUser.username.slice(0, 2).toUpperCase()
  const settingsActive = location.pathname.startsWith('/settings')

  return (
    <header className="fixed top-0 left-60 right-0 h-14 flex items-center px-6 gap-4 z-30 bg-white/95 dark:bg-[#101C2D]/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white transition-colors">

      {/* City / Zone */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-slate-700 dark:text-slate-300 bg-slate-100/70 dark:bg-white/5 border border-slate-200 dark:border-slate-800 transition-all">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="font-semibold text-xs">Pune Metro Zone</span>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-lg relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
        <input
          type="text"
          placeholder="Search vehicles, cameras, incidents..."
          className="w-full pl-9 pr-4 py-2 text-sm rounded-lg outline-none transition-all bg-slate-100 dark:bg-[#08111F] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 dark:focus:border-blue-500"
        />
      </div>

      <div className="flex-1" />

      {/* System Status */}
      <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20">
        <Wifi className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
        <span className="text-xs font-semibold text-green-700 dark:text-green-400">All Systems Go</span>
      </div>

      {/* Theme Toggle */}
      <ThemeToggle />

      {/* Notifications */}
      <button
        type="button"
        className="relative p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 critical-pulse" />
      </button>

      {/* Settings icon — top-right */}
      <button
        type="button"
        title="Settings"
        onClick={() => navigate('/settings')}
        className={`p-2 rounded-lg transition-all ${
          settingsActive
            ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5'
        }`}
      >
        <Settings className="w-4 h-4" />
      </button>

      {/* User Avatar & Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          type="button"
          className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white bg-blue-600 shadow-sm">
            {initials}
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {showDropdown && (
          <div className="absolute right-0 top-11 w-48 rounded-xl bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-xl py-1 z-50">
            <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
              <div className="text-xs font-bold text-slate-900 dark:text-white capitalize">{currentUser.username}</div>
              <div className="text-[11px] text-slate-500">{currentUser.role || 'Command Officer'}</div>
            </div>
            {onLogout && (
              <button
                onClick={() => { setShowDropdown(false); onLogout() }}
                type="button"
                className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-left"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
