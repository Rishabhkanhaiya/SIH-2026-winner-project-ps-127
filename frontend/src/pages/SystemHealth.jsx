import React, { useState, useEffect, useRef } from 'react'
import {
  Camera, Activity, Database, Server, Wifi, WifiOff,
  Cpu, HardDrive, Zap, RefreshCw, Pause, Play, Sparkles,
  TrendingUp, ArrowUpRight, ArrowDownRight, Layers, ShieldCheck
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts'
import { SYSTEM_METRICS, CAMERAS } from '../data/mockData'

function MetricBar({ label, value, color = '#2563EB', unit = '%', delta = null }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
          <span>{label}</span>
          {delta !== null && (
            <span
              className={`text-[10px] font-mono font-bold flex items-center ${
                delta >= 0 ? 'text-amber-500' : 'text-green-500'
              }`}
            >
              {delta >= 0 ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
              {Math.abs(delta)}%
            </span>
          )}
        </span>
        <span className="text-xs font-mono font-bold transition-all duration-300" style={{ color }}>
          {value}{unit}
        </span>
      </div>
      <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }}
        />
      </div>
    </div>
  )
}

function StatusIndicator({ label, status, icon: Icon, value, live = false, subtitle = null }) {
  const isOk = status === 'operational' || status === 'healthy' || status === 'online' || status.includes('17/20')
  const color = isOk ? '#22C55E' : '#EF4444'
  const bg = isOk ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'
  const border = isOk ? 'border-green-200 dark:border-green-500/20' : 'border-red-200 dark:border-red-500/20'

  return (
    <div className={`rounded-xl p-4 md:p-5 bg-white dark:bg-[#101C2D] border ${border} shadow-sm transition-all relative overflow-hidden`}>
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-slate-500 truncate">{label}</div>
          <div className="text-sm font-bold capitalize truncate" style={{ color }}>{status}</div>
        </div>
        <div className="relative flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
          {live && (
            <span
              className="absolute w-4 h-4 rounded-full animate-ping opacity-75"
              style={{ background: color }}
            />
          )}
        </div>
      </div>
      {value !== undefined && (
        <div className="text-2xl font-bold tracking-tight font-mono" style={{ color }}>
          {value}
        </div>
      )}
      {subtitle && (
        <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
          {subtitle}
        </div>
      )}
    </div>
  )
}

export default function SystemHealth() {
  const [isStreaming, setIsStreaming] = useState(true)
  const [surgeMode, setSurgeMode] = useState(false)
  const [tick, setTick] = useState(0)

  // Live fluctuating telemetry states
  const [gpu, setGpu] = useState(67)
  const [cpu, setCpu] = useState(43)
  const [ram, setRam] = useState(58.4)
  const [storage, setStorage] = useState(72.2)
  const [fps, setFps] = useState(28.6)
  const [latency, setLatency] = useState(42)
  const [throughput, setThroughput] = useState(154.2)
  const [framesTotal, setFramesTotal] = useState(2489140)
  const [queueDepth, setQueueDepth] = useState(3)

  // Rolling chart history (last 14 points)
  const [history, setHistory] = useState(() => {
    const initial = []
    const now = Date.now()
    for (let i = 13; i >= 0; i--) {
      const t = new Date(now - i * 2000)
      initial.push({
        time: t.toLocaleTimeString('en-GB', { hour12: false }),
        gpu: 65 + Math.floor(Math.sin(i) * 6),
        cpu: 42 + Math.floor(Math.cos(i) * 5),
        fps: 28.5 + (i % 3) * 0.4,
      })
    }
    return initial
  })

  // Micro-services latency states
  const [serviceLatencies, setServiceLatencies] = useState({
    svcA: 41,
    svcB: 44,
    frontend: 11,
    db: 3,
    anpr: 62,
  })

  // Simulation loop: triggers subtle random jitter every 2 seconds
  useEffect(() => {
    if (!isStreaming) return

    const interval = setInterval(() => {
      setTick(t => t + 1)

      // Random natural drift with bound clamping
      setGpu(prev => {
        if (surgeMode) return Math.min(94, prev + Math.floor(Math.random() * 4) + 2)
        const delta = Math.floor(Math.random() * 5) - 2 // -2 to +2
        return Math.min(82, Math.max(58, prev + delta))
      })

      setCpu(prev => {
        if (surgeMode) return Math.min(88, prev + Math.floor(Math.random() * 4) + 2)
        const delta = Math.floor(Math.random() * 5) - 2
        return Math.min(58, Math.max(36, prev + delta))
      })

      setRam(prev => {
        const delta = (Math.random() * 0.4 - 0.2)
        return +(Math.min(64.0, Math.max(56.0, prev + delta)).toFixed(1))
      })

      setFps(prev => {
        const delta = (Math.random() * 0.8 - 0.4)
        return +(Math.min(30.0, Math.max(27.4, prev + delta)).toFixed(1))
      })

      setLatency(prev => {
        const delta = Math.floor(Math.random() * 7) - 3 // -3 to +3
        return Math.min(52, Math.max(34, prev + delta))
      })

      setThroughput(prev => {
        const delta = (Math.random() * 6 - 3)
        return +(Math.min(185.0, Math.max(135.0, prev + delta)).toFixed(1))
      })

      setFramesTotal(prev => prev + Math.floor(Math.random() * 26) + 22)
      setQueueDepth(Math.floor(Math.random() * 4) + 2)

      // Jitter microservice latencies
      setServiceLatencies({
        svcA: 38 + Math.floor(Math.random() * 8),
        svcB: 40 + Math.floor(Math.random() * 9),
        frontend: 9 + Math.floor(Math.random() * 5),
        db: 2 + Math.floor(Math.random() * 3),
        anpr: 58 + Math.floor(Math.random() * 12),
      })

      // Update history buffer
      setHistory(prev => {
        const nowStr = new Date().toLocaleTimeString('en-GB', { hour12: false })
        const next = [
          ...prev.slice(1),
          {
            time: nowStr,
            gpu: Math.round(gpu),
            cpu: Math.round(cpu),
            fps: fps,
          },
        ]
        return next
      })
    }, 2000)

    return () => clearInterval(interval)
  }, [isStreaming, surgeMode, gpu, cpu, fps])

  // Surge button handler (simulates temporary load burst for demo)
  const triggerSurge = () => {
    setSurgeMode(true)
    setTimeout(() => setSurgeMode(false), 6000)
  }

  // Camera calculations
  const onlineCameras = CAMERAS.filter(c => c.status === 'online') // 17 cameras
  const offlineCams = CAMERAS.filter(c => c.status === 'offline') // 2 cameras
  const maintenanceCams = CAMERAS.filter(c => c.status === 'maintenance') // 1 camera

  return (
    <div className="space-y-6">
      {/* Top Header Bar with Live Simulation Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <span>System Health & Infrastructure</span>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-500/20">
              <span className="w-2 h-2 rounded-full bg-green-500 live-dot" />
              LIVE TELEMETRY
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Platform monitoring · 17 cameras streaming · Automated YOLOv8 & FastAPI load balance
          </p>
        </div>

        {/* Demo Controls Toolbar */}
        <div className="flex items-center gap-2">
          {/* Pause / Resume Stream */}
          <button
            type="button"
            onClick={() => setIsStreaming(s => !s)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              isStreaming
                ? 'bg-slate-100 dark:bg-[#162438] hover:bg-slate-200 dark:hover:bg-[#1E3250] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                : 'bg-amber-500 text-white border-amber-600 shadow-sm'
            }`}
          >
            {isStreaming ? (
              <>
                <Pause className="w-3.5 h-3.5 text-amber-500" />
                <span>Pause Stream</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-white" />
                <span>Resume Stream</span>
              </>
            )}
          </button>

          {/* Simulate Traffic Spike Button */}
          <button
            type="button"
            onClick={triggerSurge}
            disabled={surgeMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              surgeMode
                ? 'bg-red-500 text-white border-red-600 animate-pulse'
                : 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>{surgeMode ? 'Surge Active...' : 'Simulate Spike'}</span>
          </button>
        </div>
      </div>

      {/* Primary Status Indicators (5 columns) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <StatusIndicator
          label="Active Fleet"
          status={`${onlineCameras.length}/${CAMERAS.length} Working`}
          icon={Camera}
          value={`${onlineCameras.length} Online`}
          subtitle="17 active CCTV feeds"
          live={true}
        />
        <StatusIndicator
          label="AI Inference Core"
          status="Healthy"
          icon={Activity}
          value={`${fps} FPS`}
          subtitle="YOLOv8 + Qwen2.5-VL"
          live={true}
        />
        <StatusIndicator
          label="API Latency"
          status="Optimal"
          icon={Server}
          value={`${latency} ms`}
          subtitle="FastAPI Port 8000"
          live={true}
        />
        <StatusIndicator
          label="Network Stream"
          status="Operational"
          icon={Wifi}
          value={`${throughput} MB/s`}
          subtitle="Zero packet loss (0.01%)"
          live={true}
        />
        <StatusIndicator
          label="Telemetry Frames"
          status="Continuous"
          icon={Database}
          value={framesTotal.toLocaleString()}
          subtitle="Total scanned today"
          live={true}
        />
      </div>

      {/* Resource Utilization & Live Telemetry History Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left: Resource Utilization Progress Bars (5 cols) */}
        <div className="lg:col-span-5 rounded-xl p-5 bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-500" />
              <span>Real-Time Compute Utilization</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Jitter: ±2.5%
            </span>
          </div>

          <MetricBar label="GPU Inference Engine" value={gpu} color="#2563EB" delta={surgeMode ? +18 : +1} />
          <MetricBar label="CPU Compute Cores" value={cpu} color="#3B82F6" delta={surgeMode ? +12 : -1} />
          <MetricBar label="System RAM (DDR5)" value={ram} color="#10B981" />
          <MetricBar label="NVMe Fast Storage" value={storage} color="#F59E0B" />

          {/* Quick Metrics Sub-grid */}
          <div className="grid grid-cols-3 gap-2.5 pt-2">
            <div className="rounded-lg p-2.5 text-center bg-slate-50 dark:bg-[#162438] border border-slate-200 dark:border-slate-800">
              <div className="text-base font-bold font-mono text-blue-600 dark:text-blue-400">{fps}</div>
              <div className="text-[10px] text-slate-500">Processing FPS</div>
            </div>
            <div className="rounded-lg p-2.5 text-center bg-slate-50 dark:bg-[#162438] border border-slate-200 dark:border-slate-800">
              <div className="text-base font-bold font-mono text-green-600 dark:text-green-400">{latency}ms</div>
              <div className="text-[10px] text-slate-500">API Latency</div>
            </div>
            <div className="rounded-lg p-2.5 text-center bg-slate-50 dark:bg-[#162438] border border-slate-200 dark:border-slate-800">
              <div className="text-base font-bold font-mono text-purple-600 dark:text-purple-400">{queueDepth}</div>
              <div className="text-[10px] text-slate-500">Inference Queue</div>
            </div>
          </div>
        </div>

        {/* Right: Live Rolling Sparkline History (7 cols) */}
        <div className="lg:col-span-7 rounded-xl p-5 bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span>Rolling Telemetry Stream (Last 30 Seconds)</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Dynamic load trend across GPU inference and CPU ingest threads
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-blue-600 dark:text-blue-400">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>GPU ({gpu}%)</span>
              </div>
              <div className="flex items-center gap-1.5 font-semibold text-indigo-500">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <span>CPU ({cpu}%)</span>
              </div>
            </div>
          </div>

          {/* Recharts Area Chart */}
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gpuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={false} />
                <YAxis domain={[20, 100]} tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: '#fff',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="gpu"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#gpuGrad)"
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="cpu"
                  stroke="#6366F1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#cpuGrad)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>Hardware: NVIDIA RTX 4090 · 24GB VRAM · 16 vCPU</span>
            <span className="font-mono text-green-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
              FPS: {fps} (Healthy)
            </span>
          </div>
        </div>
      </div>

      {/* Camera Fleet Health Status (17 Online / 2 Offline / 1 Maint) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Fleet Availability Bar (5 cols) */}
        <div className="lg:col-span-5 rounded-xl p-5 bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Camera className="w-4 h-4 text-blue-500" />
              <span>Camera Fleet Status (17 Working)</span>
            </div>
            <span className="text-xs font-mono font-bold text-green-600 dark:text-green-400">
              85.0% Operational
            </span>
          </div>

          {/* Three-color stacked availability bar */}
          <div className="mb-4">
            <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-800 flex overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-l-full transition-all duration-500"
                style={{ width: `${(onlineCameras.length / CAMERAS.length) * 100}%` }}
                title={`${onlineCameras.length} Online`}
              />
              <div
                className="h-full bg-red-500 transition-all duration-500"
                style={{ width: `${(offlineCams.length / CAMERAS.length) * 100}%` }}
                title={`${offlineCams.length} Offline`}
              />
              <div
                className="h-full bg-amber-500 rounded-r-full transition-all duration-500"
                style={{ width: `${(maintenanceCams.length / CAMERAS.length) * 100}%` }}
                title={`${maintenanceCams.length} Maintenance`}
              />
            </div>

            <div className="flex items-center justify-between mt-2.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <strong>{onlineCameras.length} Working (Online)</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span>{offlineCams.length} Offline</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>{maintenanceCams.length} Maint</span>
              </span>
            </div>
          </div>

          {/* Inactive Cameras Alert list */}
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            Sensors Requiring Attention ({offlineCams.length + maintenanceCams.length})
          </div>
          <div className="space-y-2">
            {[...offlineCams, ...maintenanceCams].map(cam => (
              <div
                key={cam.id}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-[#162438] border border-slate-200 dark:border-slate-800"
              >
                <div className="flex items-center gap-2.5">
                  <WifiOff className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-200 font-mono">
                      {cam.id} · {cam.name}
                    </div>
                    <div className="text-[11px] text-slate-500">{cam.zone} Corridor</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    cam.status === 'offline'
                      ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                      : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                  }`}>
                    {cam.status}
                  </span>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">{cam.uptime}% uptime</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Working Cameras Matrix Grid (7 cols) */}
        <div className="lg:col-span-7 rounded-xl p-5 bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              <span>17 Working Cameras Live Telemetry Grid</span>
            </div>
            <span className="text-xs text-green-500 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 live-dot" />
              100% Stream Sync
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 overflow-y-auto max-h-56 pr-1 custom-scrollbar">
            {onlineCameras.map((cam, idx) => {
              const camFps = (28.4 + ((idx * 3 + tick) % 15) * 0.1).toFixed(1)
              const camPing = 18 + ((idx * 4 + tick) % 12)
              return (
                <div
                  key={cam.id}
                  className="p-2 rounded-lg bg-slate-50 dark:bg-[#162438] border border-slate-200 dark:border-slate-800 text-left transition-colors hover:border-blue-400/40"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="font-bold text-slate-900 dark:text-white">{cam.id}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">{cam.name}</div>
                  <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 mt-1">
                    <span className="text-green-500">{camFps} FPS</span>
                    <span>{camPing}ms</span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Aggregated Ingest: 17 streams · H.264/RTSP</span>
            <span className="font-mono text-blue-500">Zero packet drops</span>
          </div>
        </div>
      </div>

      {/* Service Components with Live Jitter Latencies */}
      <div className="rounded-xl p-5 bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-500" />
            <span>Core Subsystem Architecture & Latency Jitter</span>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Updated just now
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {[
            { name: 'Service A — Perception', role: 'YOLOv8 Plate Detection', port: 8001, latency: `${serviceLatencies.svcA}ms`, status: 'OPERATIONAL' },
            { name: 'Service B — Central Core', role: 'FastAPI REST & Reports', port: 8000, latency: `${serviceLatencies.svcB}ms`, status: 'OPERATIONAL' },
            { name: 'Frontend Console', role: 'React 18 + Vite SPA', port: 5173, latency: `${serviceLatencies.frontend}ms`, status: 'OPERATIONAL' },
            { name: 'SQLite Persistence', role: 'WAL Journaling Engine', port: null, latency: `${serviceLatencies.db}ms`, status: 'HEALTHY' },
            { name: 'ANPR Qwen-VL Engine', role: 'MoRTH OCR Grammar', port: 'Model', latency: `${serviceLatencies.anpr}ms`, status: 'OPERATIONAL' },
          ].map(svc => (
            <div
              key={svc.name}
              className="rounded-xl p-3.5 bg-slate-50 dark:bg-[#162438] border border-green-200 dark:border-green-500/20 flex flex-col justify-between transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500 live-dot" />
                    <span className="text-[10px] font-bold text-green-700 dark:text-green-400">{svc.status}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                    {svc.latency}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-200 leading-tight">
                  {svc.name}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">{svc.role}</div>
              </div>
              {svc.port && (
                <div className="text-[10px] font-mono text-slate-400 mt-2">
                  {typeof svc.port === 'number' ? `Port ${svc.port}` : svc.port}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

