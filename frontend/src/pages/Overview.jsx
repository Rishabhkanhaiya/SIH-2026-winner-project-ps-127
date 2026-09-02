import React, { useState } from 'react'
import { Camera, Car, AlertTriangle, TrendingUp, Bell, ExternalLink, Clock, Eye } from 'lucide-react'
import KPICard from '../components/KPICard'
import CityMap from '../components/CityMap'
import { SeverityBadge } from '../components/StatusBadge'
import { ALERTS, CAMERAS, TRAFFIC_24H } from '../data/mockData'
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { formatDistanceToNow } from 'date-fns'

const MINI_CAMERAS = CAMERAS.slice(0, 4)

function LiveCameraCard({ camera }) {
  return (
    <div className="rounded-xl overflow-hidden bg-white dark:bg-[#162438] border border-slate-200 dark:border-slate-800 shadow-sm">
      {/* Camera Feed Preview - Flat solid canvas */}
      <div className="h-24 bg-slate-800 dark:bg-slate-900 relative flex items-center justify-center">
        <Camera className="w-8 h-8 text-slate-600" />
        {/* Simulated AI bounding boxes */}
        <div className="absolute inset-0 p-2 pointer-events-none">
          <div className="absolute border border-blue-400/60 rounded" style={{ left: '15%', top: '20%', width: '25%', height: '45%' }} />
          <div className="absolute border border-green-400/60 rounded" style={{ left: '50%', top: '30%', width: '30%', height: '40%' }} />
        </div>
        {/* LIVE badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-white live-dot" />
          LIVE
        </div>
      </div>
      <div className="px-3 py-2 bg-white dark:bg-[#162438]">
        <div className="text-xs font-bold text-slate-900 dark:text-slate-200">{camera.id}</div>
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
  return (
    <div className={`border-l-4 ${c.border} ${c.bg} pl-3 pr-2 py-2.5 rounded-r-lg cursor-pointer transition-all bg-slate-50 dark:bg-[#162438]/60 border-y border-r border-slate-200 dark:border-slate-800`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-200 leading-tight">{alert.event}</div>
          <div className="text-xs text-slate-500 mt-0.5">{alert.camera} · {alert.location}</div>
        </div>
        <SeverityBadge severity={alert.severity} />
      </div>
      <div className="flex items-center gap-1.5 mt-1.5">
        <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
        <span className="text-xs text-slate-500">{formatDistanceToNow(alert.timestamp, { addSuffix: true })}</span>
      </div>
    </div>
  )
}

export default function Overview() {
  const [selectedCamera, setSelectedCamera] = useState(null)
  const trafficData = TRAFFIC_24H.filter((_, i) => i % 2 === 0)

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Command Center</h1>
          <p className="text-sm text-slate-500 mt-0.5">Pune Metro Zone · Real-time overview</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-green-700 dark:text-green-400 px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20">
          <div className="w-2 h-2 rounded-full bg-green-500 live-dot" />
          Live · Updated just now
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-4">
        <KPICard title="Cameras Online" value="128" icon={Camera} color="#22C55E" sub="4 offline" trend={2} />
        <KPICard title="Vehicles Detected" value="12.4K" icon={Car} color="#2563EB" sub="Today" trend={8} />
        <KPICard title="Active Incidents" value="8" icon={AlertTriangle} color="#EF4444" sub="3 HIGH priority" trend={-12} />
        <KPICard title="Traffic Flow" value="74%" icon={TrendingUp} color="#22C55E" sub="Above avg" trend={5} />
        <KPICard title="Priority Alerts" value="3" icon={Bell} color="#F59E0B" sub="Needs attention" />
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
            <CityMap height="100%" selectedCamera={selectedCamera} onCameraSelect={setSelectedCamera} />
          </div>
        </div>

        {/* Alerts Panel - 1/3 width */}
        <div className="rounded-xl flex flex-col bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-red-500" />
              <span className="text-sm font-bold text-slate-900 dark:text-white">Live Alerts</span>
            </div>
            <span className="w-5 h-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center font-bold">
              {ALERTS.filter(a => a.status === 'new').length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {ALERTS.slice(0, 8).map(alert => (
              <AlertItem key={alert.id} alert={alert} />
            ))}
          </div>
          <div className="px-3 py-2.5 border-t border-slate-200 dark:border-slate-800">
            <button className="w-full text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-center transition-colors py-1">
              View all alerts →
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Live Cameras */}
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-bold text-slate-900 dark:text-white">Live Feeds</span>
            </div>
            <button className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
              View all →
            </button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {MINI_CAMERAS.map(cam => (
              <LiveCameraCard key={cam.id} camera={cam} />
            ))}
          </div>
        </div>

        {/* Traffic Trend */}
        <div className="rounded-xl p-4 bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-slate-900 dark:text-white">Traffic Today</span>
            <span className="text-xs font-medium text-slate-500">24h</span>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={trafficData}>
              <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#64748B' }} tickLine={false} axisLine={false} interval={3} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', fontSize: '11px' }}
              />
              <Area type="monotone" dataKey="vehicles" stroke="#2563EB" strokeWidth={2} fill="#3B82F6" fillOpacity={0.15} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="mt-2 grid grid-cols-2 gap-2 text-center pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">12.4K</div>
              <div className="text-xs text-slate-500">Total vehicles</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-600 dark:text-green-400">42</div>
              <div className="text-xs text-slate-500">Avg km/h</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
