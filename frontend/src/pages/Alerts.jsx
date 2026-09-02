import React, { useState } from 'react'
import { Filter, CheckCircle, Eye } from 'lucide-react'
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Alert Feed</h1>
          <p className="text-sm text-slate-500 mt-0.5">Chronological alert log · All cameras · All zones</p>
        </div>
        <div className="text-sm text-slate-500">{filtered.length} alerts</div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-slate-500" />
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setSeverityFilter(f)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${
              severityFilter === f
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700'
            }`}
          >
            {f}
          </button>
        ))}
        <div className="ml-4 flex items-center gap-2 text-xs text-slate-500">
          <span className="font-medium text-slate-700 dark:text-slate-300">{alerts.filter(a => a.status === 'new').length} new</span>
          <span>·</span>
          <span>{alerts.filter(a => a.status === 'acknowledged').length} acknowledged</span>
        </div>
      </div>

      {/* Alert List */}
      <div className="rounded-xl overflow-hidden bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#162438]/50">
              {['Severity', 'Event', 'Camera', 'Location', 'Time', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map(alert => (
              <tr
                key={alert.id}
                className="transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
                style={{ opacity: alert.status === 'resolved' ? 0.5 : 1 }}
              >
                <td className="px-4 py-3"><SeverityBadge severity={alert.severity} /></td>
                <td className="px-4 py-3">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-200">{alert.event}</div>
                  {alert.plate && <div className="text-xs text-blue-600 dark:text-blue-400 font-mono mt-0.5">{alert.plate}</div>}
                </td>
                <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 font-mono">{alert.camera}</td>
                <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">{alert.location}</td>
                <td className="px-4 py-3">
                  <div className="text-xs text-slate-500">{formatDistanceToNow(alert.timestamp, { addSuffix: true })}</div>
                  <div className="text-xs text-slate-400">{alert.timestamp.toLocaleTimeString()}</div>
                </td>
                <td className="px-4 py-3"><StatusBadge status={alert.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {alert.status === 'new' && (
                      <button
                        onClick={() => acknowledge(alert.id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/25 hover:bg-green-100 transition-all"
                      >
                        <CheckCircle className="w-3 h-3" />Ack
                      </button>
                    )}
                    <button
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/25 hover:bg-blue-100 transition-all"
                    >
                      <Eye className="w-3 h-3" />View
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-slate-500 text-sm">No alerts matching filter</div>
        )}
      </div>
    </div>
  )
}
