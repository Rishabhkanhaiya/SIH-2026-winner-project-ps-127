import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Map, Camera, TrendingUp, Search, ScanLine,
  Users, AlertTriangle, Bell, BarChart3, FileText, Activity,
  Settings, Zap, LogOut, User, ChevronRight
} from 'lucide-react'

const NAV_ITEMS = [
  { path: '/', label: 'Overview', icon: LayoutDashboard },
  { path: '/map', label: 'Live Map', icon: Map },
  { path: '/cameras', label: 'Cameras', icon: Camera },
  { path: '/traffic', label: 'Traffic Analytics', icon: TrendingUp },
  { path: '/vehicles', label: 'Vehicle Search', icon: Search },
  { path: '/anpr', label: 'ANPR', icon: ScanLine },
  { path: '/persons', label: 'Person Tracking', icon: Users },
  { path: '/incidents', label: 'Incidents', icon: AlertTriangle },
  { path: '/alerts', label: 'Alerts', icon: Bell },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/reports', label: 'Reports', icon: FileText },
  { path: '/system', label: 'System Health', icon: Activity },
  { path: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  const location = useLocation()

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 flex flex-col z-40"
      style={{ background: '#08111F', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
      
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #22D3EE, #3B82F6)' }}>
          <Zap className="w-4 h-4 text-white" fill="white" />
        </div>
        <div>
          <div className="text-sm font-bold text-white leading-tight">Urban Pulse</div>
          <div className="text-xs font-medium" style={{ color: '#22D3EE' }}>AI Intelligence</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
          const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
          return (
            <NavLink key={path} to={path}
              className={`nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'text-cyan-400 bg-cyan-400/10 border-l-2 border-cyan-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {isActive && <ChevronRight className="w-3 h-3 opacity-60" />}
            </NavLink>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-4 space-y-1 border-t pt-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        {/* AI Status */}
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg"
          style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)' }}>
          <div className="relative flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-green-400 live-dot" />
          </div>
          <span className="text-xs font-medium text-green-400">AI System Online</span>
        </div>

        {/* User Profile */}
        <button className="w-full nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-white/5">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center flex-shrink-0">
            <User className="w-3 h-3 text-white" />
          </div>
          <div className="flex-1 text-left">
            <div className="text-xs font-medium text-slate-300">Admin User</div>
            <div className="text-xs text-slate-500">Administrator</div>
          </div>
        </button>

        {/* Logout */}
        <button className="w-full nav-item flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-red-400 hover:bg-red-400/5">
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}
