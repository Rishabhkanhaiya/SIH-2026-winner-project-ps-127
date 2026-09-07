import React, { useState, useEffect } from 'react'
import { Filter, CheckCircle, Eye, Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { SeverityBadge, StatusBadge } from '../components/StatusBadge'
import { formatDistanceToNow } from 'date-fns'
import { getAlerts, acknowledgeAlert } from '../api/alerts'
import { useAlertWebSocket } from '../hooks/useAlertWebSocket'

const FILTERS = ['All', 'Critical', 'Warning', 'Info']

export default function Alerts() {
  const [severityFilter, setSeverityFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // WebSocket hook — starts with recent alerts from WS on-connect payload
  const { alerts, connected, setAlerts } = useAlertWebSocket()

  // Load initial alert history from REST on mount
  useEffect(() => {
    loadAlerts()
  }, [])

  const loadAlerts = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAlerts(100, 0)
      setAlerts(data)
    } catch (err) {
      setError(err?.message || 'Failed to load alerts')
    } finally {
      setLoading(false)
    }
  }

  const filtered = alerts.filter(a => {
    if (severityFilter === 'All') return true
    return a.severity === severityFilter.toLowerCase()
  })

  const handleAcknowledge = async (id) => {
    try {
      const updated = await acknowledgeAlert(id)
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'acknowledged' } : a))
    } catch (err) {
      console.warn('Acknowledge failed:', err)
      // Optimistic update anyway
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'acknowledged' } : a))
    }
  }

  const formatTime = (ts) => {
    try {
      const d = new Date(ts)
      if (isNaN(d)) return '—'
      return formatDistanceToNow(d, { addSuffix: true })
    } catch { return '—' }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Alert Feed</h1>
          <p className="text-sm text-slate-500 mt-0.5">Live alert log · All cameras · All zones</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border ${connected ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20' : 'text-slate-500 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
            {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {connected ? 'Live' : 'Offline'}
          </div>
          <button
            onClick={loadAlerts}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
          <div className="text-sm text-slate-500">{filtered.length} alerts</div>
        </div>
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
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {alerts.filter(a => a.status === 'new').length} new
          </span>
          <span>·</span>
          <span>{alerts.filter(a => a.status === 'acknowledged').length} acknowledged</span>
        </div>
      </div>

      {/* Alert List */}
      <div className="rounded-xl overflow-hidden bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-400">Loading alerts...</div>
        ) : error ? (
          <div className="flex items-center justify-center py-16 text-sm text-red-500">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-400">No alerts</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#162438]/50">
                {['Severity', 'Type', 'Message', 'Camera', 'Plate', 'Time', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((alert, i) => (
                <tr
                  key={alert.id || i}
                  className="transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
                  style={{ opacity: alert.status === 'resolved' ? 0.5 : 1 }}
                >
                  <td className="px-4 py-3"><SeverityBadge severity={alert.severity} /></td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${alert.alert_type === 'BLACKLIST_MATCH' ? 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400' : 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'}`}>
                      {alert.alert_type === 'BLACKLIST_MATCH' ? 'BLACKLIST' : 'ANOMALY'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-200 max-w-xs truncate">{alert.message}</div>
                    {alert.reasons && alert.reasons.length > 0 && (
                      <div className="text-xs text-slate-400 mt-0.5">{alert.reasons.join(', ')}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 font-mono">{alert.camera_id}</td>
                  <td className="px-4 py-3 text-xs text-blue-600 dark:text-blue-400 font-mono">{alert.plate_number || '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatTime(alert.timestamp)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={alert.status} />
                  </td>
                  <td className="px-4 py-3">
                    {alert.status === 'new' && (
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        className="flex items-center gap-1 text-xs font-semibold text-green-700 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 transition-colors"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Acknowledge
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
