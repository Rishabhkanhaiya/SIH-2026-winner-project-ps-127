import React from 'react'
import StatusBadge from './StatusBadge'
import { Camera, MapPin, Clock, AlertTriangle } from 'lucide-react'

export default function AlertItem({ alert, onAcknowledge, onInvestigate }) {
  const timeAgo = (date) => {
    const seconds = Math.floor((Date.now() - new Date(date)) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    return `${Math.floor(seconds / 3600)}h ago`
  }

  return (
    <div
      className="flex items-start gap-3 p-3 rounded-xl border border-white/5 transition-all duration-150 cursor-pointer"
      style={{ backgroundColor: '#101C2D' }}
      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#162438'}
      onMouseLeave={e => e.currentTarget.style.backgroundColor = '#101C2D'}
    >
      {/* Severity dot */}
      <div className="flex-shrink-0 mt-1">
        <div className="w-2 h-2 rounded-full" style={{
          backgroundColor:
            alert.severity === 'critical' || alert.severity === 'HIGH' ? '#EF4444' :
            alert.severity === 'warning' || alert.severity === 'MEDIUM' ? '#F59E0B' :
            '#3B82F6'
        }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-snug" style={{ color: '#F8FAFC' }}>
            {alert.event}
          </p>
          <StatusBadge status={alert.severity} />
        </div>
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          <span className="flex items-center gap-1 text-xs" style={{ color: '#94A3B8' }}>
            <Camera size={11} /> {alert.camera}
          </span>
          <span className="flex items-center gap-1 text-xs" style={{ color: '#94A3B8' }}>
            <MapPin size={11} /> {alert.location}
          </span>
          <span className="flex items-center gap-1 text-xs" style={{ color: '#94A3B8' }}>
            <Clock size={11} /> {timeAgo(alert.time)}
          </span>
        </div>

        {/* Actions */}
        {alert.status !== 'resolved' && (
          <div className="flex gap-2 mt-2">
            {alert.status === 'new' && onAcknowledge && (
              <button
                onClick={(e) => { e.stopPropagation(); onAcknowledge(alert.id) }}
                className="px-2 py-1 rounded text-xs font-medium transition-all duration-150"
                style={{ backgroundColor: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}
              >
                Acknowledge
              </button>
            )}
            {onInvestigate && (
              <button
                onClick={(e) => { e.stopPropagation(); onInvestigate(alert.id) }}
                className="px-2 py-1 rounded text-xs font-medium transition-all duration-150"
                style={{ backgroundColor: 'rgba(34,211,238,0.12)', color: '#22D3EE' }}
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
