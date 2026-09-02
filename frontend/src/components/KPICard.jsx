import React from 'react'

export default function KPICard({ title, value, icon: Icon, color = '#22D3EE', sub, trend }) {
  return (
    <div className="card rounded-xl p-5 flex items-start gap-4"
      style={{ background: '#101C2D', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-2xl font-bold text-white leading-tight">{value}</div>
        <div className="text-sm font-medium text-slate-400 mt-0.5 truncate">{title}</div>
        {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
      </div>
      {trend !== undefined && (
        <div className={`text-xs font-medium px-2 py-1 rounded-full ${trend > 0 ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </div>
      )}
    </div>
  )
}
