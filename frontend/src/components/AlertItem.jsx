import React from 'react'
import { StatusBadge } from './StatusBadge'
import { Camera, MapPin, Clock } from 'lucide-react'

export default function AlertItem({ alert, onAcknowledge, onInvestigate }) {
  const timeAgo = (date) => {
    const seconds = Math.floor((Date.now() - new Date(date)) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    return `${Math.floor(seconds / 3600)}h ago`
  }

  return (
    <div
      className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101C2D] hover:bg-slate-50 dark:hover:bg-[#162438] transition-all duration-150 cursor-pointer shadow-sm"
    >
      {/* Severity dot */}
      <div className="flex-shrink-0 mt-1">
        <div className={`w-2 h-2 rounded-full ${
          alert.severity === 'critical' || alert.severity === 'HIGH' ? 'bg-red-500 live-dot' :
          alert.severity === 'warning' || alert.severity === 'MEDIUM' ? 'bg-amber-500' :
          'bg-blue-500'
        }`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold leading-snug text-slate-900 dark:text-[#F8FAFC]">
            {alert.event}
          </p>
          <StatusBadge status={alert.severity} />
        </div>
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <Camera size={12} /> {alert.camera}
          </span>
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <MapPin size={12} /> {alert.location}
          </span>
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <Clock size={12} /> {timeAgo(alert.time)}
          </span>
        </div>

        {/* Actions */}
        {alert.status !== 'resolved' && (
          <div className="flex gap-2 mt-2">
            {alert.status === 'new' && onAcknowledge && (
              <button
                onClick={(e) => { e.stopPropagation(); onAcknowledge(alert.id) }}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 hover:bg-amber-100 transition-all duration-150"
              >
                Acknowledge
              </button>
            )}
            {onInvestigate && (
              <button
                onClick={(e) => { e.stopPropagation(); onInvestigate(alert.id) }}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 hover:bg-blue-100 transition-all duration-150"
              >
                Investigate
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
