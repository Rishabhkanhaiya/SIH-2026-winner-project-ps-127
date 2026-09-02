import React from 'react'
import { Camera, Activity, Database, Server, Wifi, WifiOff } from 'lucide-react'
import { SYSTEM_METRICS, CAMERAS } from '../data/mockData'

function MetricBar({ label, value, color = '#2563EB', unit = '%' }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</span>
        <span className="text-xs font-bold" style={{ color }}>{value}{unit}</span>
      </div>
      <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800">
        <div className="h-full rounded-full progress-bar" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  )
}

function StatusIndicator({ label, status, icon: Icon, value }) {
  const isOk = status === 'operational' || status === 'healthy' || status === 'online'
  const color = isOk ? '#22C55E' : '#EF4444'
  const bg = isOk ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'
  const border = isOk ? 'border-green-200 dark:border-green-500/20' : 'border-red-200 dark:border-red-500/20'
  return (
    <div className={`rounded-xl p-5 bg-white dark:bg-[#101C2D] border ${border} shadow-sm transition-all`}>
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: bg }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div className="flex-1">
          <div className="text-xs text-slate-500">{label}</div>
          <div className="text-sm font-bold capitalize" style={{ color }}>{status}</div>
        </div>
        <div className="w-3 h-3 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
      </div>
      {value !== undefined && (
        <div className="text-2xl font-bold" style={{ color }}>{value}</div>
      )}
    </div>
  )
}

export default function SystemHealth() {
  const m = SYSTEM_METRICS
  const offlineCams = CAMERAS.filter(c => c.status === 'offline')
  const maintenanceCams = CAMERAS.filter(c => c.status === 'maintenance')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">System Health</h1>
          <p className="text-sm text-slate-500 mt-0.5">Platform monitoring · Uptime {m.uptime_hours}h</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-green-700 dark:text-green-400 px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20">
          <span className="w-2 h-2 rounded-full bg-green-500 live-dot" />All systems operational
        </div>
      </div>

      {/* Primary Status Indicators */}
      <div className="grid grid-cols-5 gap-4">
        <StatusIndicator label="Cameras Online" status={`${m.cameras_online}/${m.cameras_total}`} icon={Camera} value={`${m.cameras_online}/${m.cameras_total}`} />
        <StatusIndicator label="AI Processing" status={m.ai_status} icon={Activity} />
        <StatusIndicator label="Database" status={m.db_status} icon={Database} />
        <StatusIndicator label="API Server" status={m.api_status} icon={Server} />
        <StatusIndicator label="Network" status="operational" icon={Wifi} />
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 gap-4">
        {/* Resource Usage */}
        <div className="rounded-xl p-5 space-y-4 bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">Resource Utilization</div>
          <MetricBar label="GPU Usage" value={m.gpu_usage} color="#2563EB" />
          <MetricBar label="CPU Usage" value={m.cpu_usage} color="#3B82F6" />
          <MetricBar label="RAM Usage" value={m.ram_usage} color="#22C55E" />
          <MetricBar label="Storage Used" value={m.storage_used} color="#F59E0B" />
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-lg p-3 text-center bg-slate-50 dark:bg-[#162438] border border-slate-200 dark:border-slate-800">
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{m.processing_fps}</div>
              <div className="text-xs text-slate-500">FPS Processing</div>
            </div>
            <div className="rounded-lg p-3 text-center bg-slate-50 dark:bg-[#162438] border border-slate-200 dark:border-slate-800">
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{m.api_latency}ms</div>
              <div className="text-xs text-slate-500">API Latency</div>
            </div>
          </div>
        </div>

        {/* Camera Status */}
        <div className="rounded-xl p-5 bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Camera Status</div>
          {/* Online/offline bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500">Camera Availability</span>
              <span className="text-xs font-bold text-green-600 dark:text-green-400">{((m.cameras_online / m.cameras_total) * 100).toFixed(1)}%</span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-800 flex overflow-hidden">
              <div className="h-full bg-green-500 rounded-l-full transition-all" style={{ width: `${(m.cameras_online / m.cameras_total) * 100}%` }} />
              <div className="h-full bg-red-500 transition-all" style={{ width: `${(m.cameras_offline / m.cameras_total) * 100}%` }} />
              <div className="h-full bg-amber-500 rounded-r-full transition-all" style={{ width: `${(m.cameras_maintenance / m.cameras_total) * 100}%` }} />
            </div>
            <div className="flex gap-4 mt-2 text-xs text-slate-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />{m.cameras_online} online</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />{m.cameras_offline} offline</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />{m.cameras_maintenance} maintenance</span>
            </div>
          </div>

          {/* Offline cameras */}
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Offline Cameras</div>
          {[...offlineCams, ...maintenanceCams].map(cam => (
            <div key={cam.id} className="flex items-center justify-between py-2.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <WifiOff className="w-3.5 h-3.5 text-red-500" />
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-300">{cam.id}</div>
                  <div className="text-xs text-slate-500">{cam.name}</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-xs font-bold ${cam.status === 'offline' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {cam.status.toUpperCase()}
                </div>
                <div className="text-xs text-slate-500">{cam.uptime}% uptime</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Service Status */}
      <div className="rounded-xl p-5 bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Service Components</div>
        <div className="grid grid-cols-4 gap-4">
          {[
            { name: 'Service A — AI Inference', port: 8001, status: 'operational', latency: '42ms' },
            { name: 'Service B — Backend', port: 8000, status: 'operational', latency: '45ms' },
            { name: 'Frontend Dashboard', port: 5173, status: 'operational', latency: '12ms' },
            { name: 'SQLite Database', port: null, status: 'operational', latency: '3ms' },
          ].map(svc => (
            <div key={svc.name} className="rounded-lg p-4 bg-slate-50 dark:bg-[#162438] border border-green-200 dark:border-green-500/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs font-semibold text-green-700 dark:text-green-400">HEALTHY</span>
              </div>
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-300">{svc.name}</div>
              {svc.port && <div className="text-xs text-slate-500 mt-0.5">Port {svc.port}</div>}
              <div className="text-xs text-slate-500 mt-1">Latency: {svc.latency}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
