import React from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Map, Camera, TrendingUp, Search,
  Users, AlertTriangle, FileText, Activity,
  Zap, LogOut, User, ChevronRight, Radio
} from 'lucide-react'

export const NAV_ITEMS = [
  { path: '/',          label: 'Overview',          icon: LayoutDashboard },
  { path: '/map',       label: 'Live Map',           icon: Map             },
  { path: '/cameras',   label: 'Cameras',            icon: Camera          },
  { path: '/traffic',   label: 'Traffic Analytics',  icon: TrendingUp      },
  { path: '/vehicles',  label: 'Vehicle Search',     icon: Search          },
  { path: '/persons',   label: 'Person Tracking',    icon: Users           },
  { path: '/incidents', label: 'Incident Flagging',  icon: AlertTriangle   },
  { path: '/system',    label: 'System Health',      icon: Activity        },
]

export default function Sidebar({ onLogout }) {
  const location  = useLocation()
  const navigate  = useNavigate()

  let currentUser = { username: 'Admin Officer', role: 'Command Officer' }
  try {
    const raw = localStorage.getItem('urbanpulse_user')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && parsed.username) currentUser = parsed
    }
  } catch { /* fallback */ }

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 flex flex-col z-40 bg-white dark:bg-[#08111F] border-r border-slate-200 dark:border-slate-800 transition-colors">

      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-3 border-b border-slate-200 dark:border-slate-800">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-600 shadow-sm text-white flex-shrink-0">
          <Zap className="w-4 h-4 text-white" fill="white" />
        </div>
        <div>
          <div className="text-sm font-bold text-slate-900 dark:text-white leading-tight">Urban Pulse</div>
          <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">Surveillance Platform</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
          const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
          return (
            <NavLink
              key={path}
              to={path}
              className={`nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-l-2 border-blue-600 dark:border-blue-400 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {isActive && <ChevronRight className="w-3 h-3 opacity-60" />}
            </NavLink>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-4 space-y-1 border-t border-slate-200 dark:border-slate-800 pt-3">

        {/* System Status + Reports icon row */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20">
            <div className="relative flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-green-500 live-dot" />
            </div>
            <span className="text-xs font-semibold text-green-700 dark:text-green-400">System Online</span>
          </div>
          {/* Reports quick-access icon */}
          <button
            type="button"
            title="Reports"
            onClick={() => navigate('/reports')}
            className={`p-2 rounded-lg border transition-all ${
              location.pathname.startsWith('/reports')
                ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-white/10'
            }`}
          >
            <FileText className="w-4 h-4" />
          </button>
        </div>

        {/* User Profile */}
        <div className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-400 bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-slate-800">
          <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 text-white shadow-sm">
            <User className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex-1 text-left min-w-0">
            <div className="text-xs font-semibold text-slate-900 dark:text-slate-300 truncate capitalize">
              {currentUser.username}
            </div>
            <div className="text-[11px] text-slate-500 truncate">
              {currentUser.role || 'Command Officer'}
            </div>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          type="button"
          className="w-full nav-item flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}
