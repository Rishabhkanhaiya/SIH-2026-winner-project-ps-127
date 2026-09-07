import React, { useState, useEffect } from 'react'
import { Camera, Car, AlertTriangle, TrendingUp, Bell, ExternalLink, Clock, Eye, Wifi, WifiOff } from 'lucide-react'
import KPICard from '../components/KPICard'
import CityMap from '../components/CityMap'
import { SeverityBadge } from '../components/StatusBadge'
import { useApi } from '../hooks/useApi'
import { useAlertWebSocket } from '../hooks/useAlertWebSocket'
import { getSummary } from '../api/analytics'
import { getCameras } from '../api/cameras'
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { formatDistanceToNow } from 'date-fns'

function LiveCameraCard({ camera }) {
  return (
    <div className="rounded-xl overflow-hidden bg-white dark:bg-[#162438] border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="h-24 bg-slate-800 dark:bg-slate-900 relative flex items-center justify-center">
        <Camera className="w-8 h-8 text-slate-600" />
        <div className="absolute inset-0 p-2 pointer-events-none">
          <div className="absolute border border-blue-400/60 rounded" style={{ left: '15%', top: '20%', width: '25%', height: '45%' }} />
          <div className="absolute border border-green-400/60 rounded" style={{ left: '50%', top: '30%', width: '30%', height: '40%' }} />
        </div>
        <div className={`absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${camera.status === 'online' ? 'bg-red-600' : 'bg-slate-600'} text-white shadow-sm`}>
          <span className={`w-1.5 h-1.5 rounded-full bg-white ${camera.status === 'online' ? 'live-dot' : ''}`} />
          {camera.status === 'online' ? 'LIVE' : camera.status?.toUpperCase()}
        </div>
      </div>
      <div className="px-3 py-2 bg-white dark:bg-[#162438]">
        <div className="text-xs font-bold text-slate-900 dark:text-slate-200">{camera.camera_id}</div>
        <div className="text-xs text-slate-500 truncate">{camera.name}</div>
      </div>
    </div>
  )
}

function AlertItem({ alert }) {
  const colors = {
    critical: { border: 'border-l-red-500', bg: 'hover:bg-red-50 dark:hover:bg-red-500/5' },
    warning: { border: 'border-l-amber-500', bg: 'hover:bg-amber-50 dark:hover:bg-amber-500/5' },
    info: { border: 'border-l-blue-500', bg: 'hover:bg-blue-50 dark:hover:bg-blue-500/5' },
  }
  const c = colors[alert.severity] || colors.info

  // Normalize timestamp — can be string or Date
  let timeAgo = 'recently'
  try {
    const ts = alert.timestamp ? new Date(alert.timestamp) : null
    if (ts && !isNaN(ts)) timeAgo = formatDistanceToNow(ts, { addSuffix: true })
  } catch {}

  return (
    <div className={`border-l-4 ${c.border} ${c.bg} pl-3 pr-2 py-2.5 rounded-r-lg cursor-pointer transition-all bg-slate-50 dark:bg-[#162438]/60 border-y border-r border-slate-200 dark:border-slate-800`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-200 leading-tight">{alert.message}</div>
          <div className="text-xs text-slate-500 mt-0.5">{alert.camera_id} · {alert.location}</div>
          {alert.plate_number && (
            <div className="text-xs font-mono text-blue-600 dark:text-blue-400 mt-0.5">{alert.plate_number}</div>
          )}
        </div>
        <SeverityBadge severity={alert.severity} />
      </div>
      <div className="flex items-center gap-1.5 mt-1.5">
        <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
        <span className="text-xs text-slate-500">{timeAgo}</span>
      </div>
    </div>
  )
}

export default function Overview() {
  const { data: summary, loading: summaryLoading } = useApi(getSummary, [])
  const { data: cameras, loading: camsLoading } = useApi(getCameras, [])
  const { alerts, connected } = useAlertWebSocket()

  const miniCameras = (cameras || []).filter(c => c.status === 'online').slice(0, 4)
  const newAlertsCount = alerts.filter(a => a.status === 'new').length

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Command Center</h1>
          <p className="text-sm text-slate-500 mt-0.5">Pune Metro Zone · Live from database</p>
        </div>
        <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border ${connected ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20' : 'text-slate-500 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
          {connected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          {connected ? 'Live · WebSocket connected' : 'Connecting...'}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-4">
        <KPICard
          title="Cameras Online"
          value={summaryLoading ? '…' : String(summary?.cameras_online ?? '—')}
          icon={Camera}
          color="#22C55E"
          sub={`${summary?.cameras_offline ?? 0} offline`}
        />
        <KPICard
          title="Vehicles Tracked"
          value={summaryLoading ? '…' : String(summary?.total_vehicles_today ?? '—')}
          icon={Car}
          color="#2563EB"
          sub="Today"
        />
        <KPICard
          title="Active Incidents"
          value={summaryLoading ? '…' : String(summary?.active_incidents ?? '—')}
          icon={AlertTriangle}
          color="#EF4444"
          sub="In progress"
        />
        <KPICard
          title="Avg Confidence"
          value={summaryLoading ? '…' : summary?.average_confidence ? `${(summary.average_confidence * 100).toFixed(0)}%` : '—'}
          icon={TrendingUp}
          color="#22C55E"
          sub="OCR accuracy"
        />
        <KPICard
          title="Active Alerts"
          value={summaryLoading ? '…' : String(summary?.active_alerts ?? newAlertsCount)}
          icon={Bell}
          color="#F59E0B"
          sub="Needs attention"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-4" style={{ height: '420px' }}>
        {/* Map - 2/3 width */}
        <div className="col-span-2 rounded-xl overflow-hidden bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 live-dot" />
              <span className="text-sm font-bold text-slate-900 dark:text-white">Live City Map</span>
            </div>
            <button className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 transition-colors">
              Full view <ExternalLink className="w-3 h-3" />
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <CityMap height="100%" cameras={cameras} />
          </div>
        </div>

        {/* Alerts Panel - 1/3 width */}
        <div className="rounded-xl flex flex-col bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-red-500" />
              <span className="text-sm font-bold text-slate-900 dark:text-white">Live Alerts</span>
            </div>
            {newAlertsCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center font-bold">
                {newAlertsCount}
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {alerts.length === 0 ? (
              <div className="text-center text-xs text-slate-400 pt-8">
                {connected ? 'No alerts — system nominal' : 'Connecting to alert feed...'}
              </div>
            ) : (
              alerts.slice(0, 8).map((alert, i) => (
                <AlertItem key={alert.id || i} alert={alert} />
              ))
            )}
          </div>
          <div className="px-3 py-2.5 border-t border-slate-200 dark:border-slate-800">
            <button className="w-full text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-center transition-colors py-1">
              View all alerts →
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row: Live Camera Feeds */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-bold text-slate-900 dark:text-white">Live Feeds</span>
              <span className="text-xs text-slate-400">({(cameras || []).filter(c => c.status === 'online').length} online)</span>
            </div>
            <button className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
              View all →
            </button>
          </div>
          {camsLoading ? (
            <div className="text-xs text-slate-400 p-4">Loading cameras...</div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {miniCameras.map(cam => (
                <LiveCameraCard key={cam.camera_id || cam.id} camera={cam} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
