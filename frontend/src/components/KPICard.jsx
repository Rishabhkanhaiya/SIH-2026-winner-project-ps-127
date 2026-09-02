import React from 'react'

export default function KPICard({ title, value, icon: Icon, color = '#2563EB', sub, trend }) {
  return (
    <div className="card rounded-xl p-5 flex items-start gap-4 bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-sm transition-all">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">{value}</div>
        <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-0.5 truncate">{title}</div>
        {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
      </div>
      {trend !== undefined && (
        <div className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
          trend > 0
            ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20'
            : 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20'
        }`}>
          {trend > 0 ? '+' : ''}{trend}%
        </div>
      )}
    </div>
  )
}
