import React, { useState, useEffect } from 'react'
import { Camera, Car, AlertTriangle, TrendingUp, Bell, ExternalLink, Clock, Eye } from 'lucide-react'
import KPICard from '../components/KPICard'
import CityMap from '../components/CityMap'
import { SeverityBadge } from '../components/StatusBadge'
import { ALERTS, CAMERAS, KPI_SUMMARY, TRAFFIC_24H } from '../data/mockData'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { formatDistanceToNow } from 'date-fns'

const MINI_CAMERAS = CAMERAS.slice(0, 4)

function LiveCameraCard({ camera }) {
  const gradients = [
    'from-slate-800 to-slate-900',
    'from-gray-800 to-gray-900',
    'from-zinc-800 to-zinc-900',
    'from-stone-800 to-stone-900',
  ]
  const randomGrad = gradients[Math.floor(Math.random() * gradients.length)]
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#162438', border: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Camera Feed Preview */}
      <div className={`h-24 bg-gradient-to-br ${randomGrad} relative flex items-center justify-center`}>
        <Camera className="w-8 h-8 text-slate-600" />
        {/* Simulated AI bounding boxes */}
        <div className="absolute inset-0 p-2">
          <div className="absolute border border-cyan-400/50 rounded" style={{ left: '15%', top: '20%', width: '25%', height: '45%' }} />
          <div className="absolute border border-green-400/50 rounded" style={{ left: '50%', top: '30%', width: '30%', height: '40%' }} />
        </div>
        {/* LIVE badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold"
          style={{ background: 'rgba(239,68,68,0.9)', color: '#fff' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-white live-dot" />
          LIVE
        </div>
      </div>
      <div className="px-3 py-2">
        <div className="text-xs font-bold text-slate-300">{camera.id}</div>
        <div className="text-xs text-slate-500 truncate">{camera.name}</div>
      </div>
    </div>
  )
}

function AlertItem({ alert }) {
  const colors = {
    critical: { border: 'border-l-red-500', bg: 'hover:bg-red-500/5' },
    warning: { border: 'border-l-amber-500', bg: 'hover:bg-amber-500/5' },
    info: { border: 'border-l-blue-400', bg: 'hover:bg-blue-500/5' },
  }
  const c = colors[alert.severity] || colors.info
  return (
    <div className={`border-l-2 ${c.border} ${c.bg} pl-3 pr-2 py-2.5 rounded-r-lg cursor-pointer transition-all`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-200 leading-tight">{alert.event}</div>
          <div className="text-xs text-slate-500 mt-0.5">{alert.camera} · {alert.location}</div>
        </div>
        <SeverityBadge severity={alert.severity} />
      </div>
      <div className="flex items-center gap-2 mt-1.5">
        <Clock className="w-3 h-3 text-slate-600" />
        <span className="text-xs text-slate-500">{formatDistanceToNow(alert.timestamp, { addSuffix: true })}</span>
      </div>
    </div>
  )
}

export default function Overview() {
  const [selectedCamera, setSelectedCamera] = useState(null)
  const trafficData = TRAFFIC_24H.filter((_, i) => i % 2 === 0)

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Command Center</h1>
          <p className="text-sm text-slate-500 mt-0.5">Pune Metro Zone · Real-time overview</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <div className="w-2 h-2 rounded-full bg-green-400 live-dot" />
          Live · Updated just now
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-4">
        <KPICard title="Cameras Online" value="128" icon={Camera} color="#22D3EE" sub="4 offline" trend={2} />
        <KPICard title="Vehicles Detected" value="12.4K" icon={Car} color="#3B82F6" sub="Today" trend={8} />
        <KPICard title="Active Incidents" value="8" icon={AlertTriangle} color="#EF4444" sub="3 HIGH priority" trend={-12} />
        <KPICard title="Traffic Flow" value="74%" icon={TrendingUp} color="#22C55E" sub="Above avg" trend={5} />
        <KPICard title="Priority Alerts" value="3" icon={Bell} color="#F59E0B" sub="Needs attention" />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-4" style={{ height: '420px' }}>
        {/* Map - 2/3 width */}
        <div className="col-span-2 rounded-xl overflow-hidden" style={{ background: '#101C2D', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 live-dot" />
              <span className="text-sm font-semibold text-white">Live City Map</span>
            </div>
            <button className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors">
              Full view <ExternalLink className="w-3 h-3" />
            </button>
          </div>
          <div style={{ height: 'calc(100% - 49px)' }}>
            <CityMap height="100%" selectedCamera={selectedCamera} onCameraSelect={setSelectedCamera} />
          </div>
        </div>

        {/* Alerts Panel - 1/3 width */}
        <div className="rounded-xl flex flex-col" style={{ background: '#101C2D', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-red-400" />
              <span className="text-sm font-semibold text-white">Live Alerts</span>
            </div>
            <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
              {ALERTS.filter(a => a.status === 'new').length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {ALERTS.slice(0, 8).map(alert => (
              <AlertItem key={alert.id} alert={alert} />
            ))}
          </div>
          <div className="px-3 py-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <button className="w-full text-xs text-cyan-400 hover:text-cyan-300 text-center transition-colors py-1">
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
              <Eye className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-semibold text-white">Live Feeds</span>
            </div>
            <button className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">View all →</button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {MINI_CAMERAS.map(cam => (
              <LiveCameraCard key={cam.id} camera={cam} />
            ))}
          </div>
        </div>

        {/* Traffic Trend */}
        <div className="rounded-xl p-4" style={{ background: '#101C2D', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-white">Traffic Today</span>
            <span className="text-xs text-slate-500">24h</span>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={trafficData}>
              <defs>
                <linearGradient id="trafficGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22D3EE" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#64748B' }} tickLine={false} axisLine={false} interval={3} />
              <Tooltip
                contentStyle={{ background: '#162438', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '11px' }}
                labelStyle={{ color: '#94A3B8' }}
                itemStyle={{ color: '#22D3EE' }}
              />
              <Area type="monotone" dataKey="vehicles" stroke="#22D3EE" strokeWidth={2} fill="url(#trafficGrad)" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="mt-2 grid grid-cols-2 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-white">12.4K</div>
              <div className="text-xs text-slate-500">Total vehicles</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-400">42</div>
              <div className="text-xs text-slate-500">Avg km/h</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
