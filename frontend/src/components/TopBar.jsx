import React from 'react'
import { Search, Bell, ChevronDown, Wifi } from 'lucide-react'

export default function TopBar() {
  return (
    <header className="fixed top-0 left-60 right-0 h-14 flex items-center px-6 gap-4 z-30"
      style={{ background: '#101C2D', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      
      {/* City / Zone */}
      <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all">
        <div className="w-2 h-2 rounded-full bg-green-400" />
        <span className="font-medium">Pune Metro Zone</span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-lg relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search vehicles, cameras, incidents..."
          className="w-full pl-9 pr-4 py-2 text-sm rounded-lg outline-none transition-all"
          style={{
            background: '#08111F',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#F8FAFC',
          }}
          onFocus={e => e.target.style.borderColor = '#22D3EE'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
        />
      </div>

      <div className="flex-1" />

      {/* System Status */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
        style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)' }}>
        <Wifi className="w-3.5 h-3.5 text-green-400" />
        <span className="text-xs font-medium text-green-400">All Systems Go</span>
      </div>

      {/* Notifications */}
      <button className="relative p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all">
        <Bell className="w-4 h-4" />
        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 critical-pulse" />
      </button>

      {/* Avatar */}
      <button className="flex items-center gap-2 p-1 rounded-lg hover:bg-white/5 transition-all">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #22D3EE, #3B82F6)' }}>
          AU
        </div>
      </button>
    </header>
  )
}
