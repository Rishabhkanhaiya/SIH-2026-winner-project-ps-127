import React, { useState } from 'react'
import { Bell, Camera, MapPin, Clock, CheckCircle, Eye, Filter } from 'lucide-react'
import { ALERTS } from '../data/mockData'
import { SeverityBadge, StatusBadge } from '../components/StatusBadge'
import { formatDistanceToNow } from 'date-fns'

const FILTERS = ['All', 'Critical', 'Warning', 'Info']

export default function Alerts() {
  const [severityFilter, setSeverityFilter] = useState('All')
  const [alerts, setAlerts] = useState(ALERTS)

  const filtered = alerts.filter(a =>
    severityFilter === 'All' ||
    (severityFilter === 'Critical' && a.severity === 'critical') ||
    (severityFilter === 'Warning' && a.severity === 'warning') ||
    (severityFilter === 'Info' && a.severity === 'info')
  )

  const acknowledge = (id) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'acknowledged' } : a))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Alert Feed</h1>
          <p className="text-sm text-slate-500 mt-0.5">Chronological alert log · All cameras · All zones</p>
        </div>
        <div className="text-sm text-slate-500">{filtered.length} alerts</div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-slate-500" />
        {FILTERS.map(f => (
          <button key={f} onClick={() => setSeverityFilter(f)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
              severityFilter === f
                ? 'bg-cyan-400 text-black font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
            style={{ border: `1px solid ${severityFilter === f ? '#22D3EE' : 'rgba(255,255,255,0.08)'}` }}>
            {f}
          </button>
        ))}
        <div className="ml-4 flex items-center gap-2 text-xs text-slate-500">
          <span>{alerts.filter(a => a.status === 'new').length} new</span>
          <span>·</span>
          <span>{alerts.filter(a => a.status === 'acknowledged').length} acknowledged</span>
        </div>
      </div>

      {/* Alert List */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#101C2D', border: '1px solid rgba(255,255,255,0.06)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Severity', 'Event', 'Camera', 'Location', 'Time', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(alert => (
              <tr key={alert.id} className="transition-colors hover:bg-white/2 border-b"
                style={{ borderColor: 'rgba(255,255,255,0.03)', opacity: alert.status === 'resolved' ? 0.5 : 1 }}>
                <td className="px-4 py-3"><SeverityBadge severity={alert.severity} /></td>
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-slate-200">{alert.event}</div>
                  {alert.plate && <div className="text-xs text-cyan-400 font-mono mt-0.5">{alert.plate}</div>}
                </td>
                <td className="px-4 py-3 text-xs text-slate-400 font-mono">{alert.camera}</td>
                <td className="px-4 py-3 text-xs text-slate-400">{alert.location}</td>
                <td className="px-4 py-3">
                  <div className="text-xs text-slate-500">{formatDistanceToNow(alert.timestamp, { addSuffix: true })}</div>
                  <div className="text-xs text-slate-700">{alert.timestamp.toLocaleTimeString()}</div>
                </td>
                <td className="px-4 py-3"><StatusBadge status={alert.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {alert.status === 'new' && (
                      <button onClick={() => acknowledge(alert.id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-green-400 hover:bg-green-400/10 transition-all"
                        style={{ border: '1px solid rgba(34,197,94,0.2)' }}>
                        <CheckCircle className="w-3 h-3" />Ack
                      </button>
                    )}
                    <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-blue-400 hover:bg-blue-400/10 transition-all"
                      style={{ border: '1px solid rgba(59,130,246,0.2)' }}>
                      <Eye className="w-3 h-3" />View
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-slate-600 text-sm">No alerts matching filter</div>
        )}
      </div>
    </div>
  )
}
