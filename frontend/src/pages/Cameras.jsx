import React, { useState } from 'react'
import {
  Camera, Maximize2, Search, Eye, Crosshair, Wifi, WifiOff,
  Wrench, Car, Users, Signal, TrendingUp, ShieldAlert
} from 'lucide-react'
import { CAMERAS } from '../data/mockData'

const GRID_CONFIGS = {
  '2x2': { cols: 2, count: 4 },
  '3x3': { cols: 3, count: 9 },
  '4x4': { cols: 4, count: 16 },
}

// Per-camera detection scene configs (deterministic by camera index)
const SCENE_CONFIGS = [
  {
    detections: [
      { label: 'Vehicle', x: '8%',  y: '22%', w: '32%', h: '44%', color: '#3B82F6' },
      { label: 'Person',  x: '56%', y: '18%', w: '24%', h: '40%', color: '#22C55E' },
    ],
    scanLine: true,
  },
  {
    detections: [
      { label: 'Vehicle', x: '12%', y: '28%', w: '28%', h: '40%', color: '#3B82F6' },
      { label: 'Person',  x: '55%', y: '14%', w: '22%', h: '36%', color: '#22C55E' },
      { label: 'Vehicle', x: '32%', y: '58%', w: '26%', h: '32%', color: '#3B82F6' },
    ],
    scanLine: false,
  },
  {
    detections: [
      { label: 'Vehicle', x: '6%',  y: '18%', w: '38%', h: '48%', color: '#3B82F6' },
      { label: 'Person',  x: '60%', y: '30%', w: '20%', h: '38%', color: '#22C55E' },
    ],
    scanLine: true,
  },
  {
    detections: [
      { label: 'Vehicle', x: '18%', y: '26%', w: '24%', h: '38%', color: '#3B82F6' },
      { label: 'Person',  x: '54%', y: '16%', w: '30%', h: '42%', color: '#22C55E' },
    ],
    scanLine: false,
  },
]

function StatusIcon({ status }) {
  if (status === 'online')      return <Wifi className="w-3 h-3 text-green-500" />
  if (status === 'offline')     return <WifiOff className="w-3 h-3 text-red-500" />
  if (status === 'maintenance') return <Wrench className="w-3 h-3 text-amber-500" />
  return null
}

function statusRingColor(status) {
  if (status === 'online')      return 'ring-green-500/40'
  if (status === 'offline')     return 'ring-red-500/40'
  if (status === 'maintenance') return 'ring-amber-500/40'
  return 'ring-slate-500/20'
}

function statusBadge(status) {
  if (status === 'online')      return { text: 'LIVE', bg: 'bg-red-600', dot: true }
  if (status === 'offline')     return { text: 'OFFLINE', bg: 'bg-slate-700', dot: false }
  if (status === 'maintenance') return { text: 'MAINT.', bg: 'bg-amber-600', dot: false }
  return { text: 'UNKNOWN', bg: 'bg-slate-700', dot: false }
}

function CameraFeed({ camera, isSmall }) {
  const sceneIdx = parseInt(camera.id.replace('CAM-', '')) % SCENE_CONFIGS.length
  const scene    = SCENE_CONFIGS[sceneIdx]
  const badge    = statusBadge(camera.status)
  const isOnline = camera.status === 'online'

  return (
    <div
      className="relative overflow-hidden bg-[#0a0f1a]"
      style={{ minHeight: isSmall ? 90 : 148 }}
    >
      {/* Grid overlay — simulated camera feed texture */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Horizontal scanline animation (online cams only) */}
      {isOnline && scene.scanLine && (
        <div
          className="absolute left-0 right-0 h-px bg-blue-400/30 pointer-events-none"
          style={{ animation: 'scanMove 3s linear infinite', top: '0%' }}
        />
      )}

      {/* Center camera icon (offline) */}
      {!isOnline && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <Camera className="w-8 h-8 text-slate-700" />
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
            {camera.status === 'maintenance' ? 'Under Maintenance' : 'Feed Unavailable'}
          </span>
        </div>
      )}

      {/* Detection bounding boxes */}
      {isOnline && !isSmall && scene.detections.map((d, i) => (
        <div
          key={i}
          className="absolute rounded"
          style={{
            left: d.x, top: d.y, width: d.w, height: d.h,
            border: `1.5px solid ${d.color}`,
            boxShadow: `0 0 8px ${d.color}50`,
          }}
        >
          <div
            className="absolute -top-5 left-0 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide"
            style={{ background: `${d.color}22`, color: d.color, border: `1px solid ${d.color}55` }}
          >
            {d.label}
          </div>
        </div>
      ))}

      {/* Corner brackets — targeting aesthetic */}
      {isOnline && (
        <>
          <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-blue-400/60 rounded-tl" />
          <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-blue-400/60 rounded-tr" />
          <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-blue-400/60 rounded-bl" />
          <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-blue-400/60 rounded-br" />
        </>
      )}

      {/* LIVE / OFFLINE badge */}
      <div className={`absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold text-white shadow-sm ${badge.bg}`}>
        {badge.dot && <span className="w-1.5 h-1.5 rounded-full bg-white live-dot" />}
        {badge.text}
      </div>

      {/* Detection count chip (online only) */}
      {isOnline && !isSmall && (
        <div className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[9px] font-semibold text-white">
          <ShieldAlert className="w-2.5 h-2.5 text-blue-400" />
          {scene.detections.length} detected
        </div>
      )}

      {/* Hover action buttons */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {[
          { icon: Maximize2, label: 'Full' },
          { icon: Crosshair, label: 'Track' },
          { icon: Eye,       label: 'View'  },
        ].map(({ icon: Icon, label }) => (
          <button
            key={label}
            title={label}
            className="w-6 h-6 rounded flex items-center justify-center text-white bg-black/60 backdrop-blur-sm hover:bg-white/20 transition-all"
          >
            <Icon className="w-3 h-3" />
          </button>
        ))}
      </div>
    </div>
  )
}

function CameraCard({ camera, gridLayout }) {
  const isSmall  = gridLayout === '4x4'
  const isMedium = gridLayout === '3x3'

  return (
    <div
      className={`rounded-xl overflow-hidden flex flex-col group bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all ring-2 ${statusRingColor(camera.status)}`}
    >
      {/* Feed area */}
      <CameraFeed camera={camera} isSmall={isSmall} />

      {/* Info bar */}
      <div className="px-3 py-2.5 bg-white dark:bg-[#101C2D] border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <StatusIcon status={camera.status} />
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono">{camera.id}</span>
            </div>
            {!isSmall && (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 max-w-32">{camera.name}</div>
            )}
          </div>

          {/* Stats column (medium/large only) */}
          {!isSmall && camera.status === 'online' && (
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                <Car className="w-3 h-3 text-blue-500" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">{camera.vehicles_today.toLocaleString()}</span>
              </div>
              {!isMedium && (
                <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                  <Users className="w-3 h-3 text-green-500" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{camera.pedestrians_today.toLocaleString()}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Uptime bar (medium/large) */}
        {!isSmall && camera.status === 'online' && (
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Uptime</span>
              <span className="text-[9px] font-bold text-green-600 dark:text-green-400">{camera.uptime}%</span>
            </div>
            <div className="h-1 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-green-500"
                style={{ width: `${camera.uptime}%` }}
              />
            </div>
          </div>
        )}

        {/* Zone badge */}
        {!isSmall && (
          <div className="mt-2 flex items-center gap-1">
            <Signal className="w-2.5 h-2.5 text-slate-400" />
            <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">{camera.zone}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Cameras() {
  const [layout, setLayout] = useState('3x3')
  const [search, setSearch] = useState('')
  const { cols, count } = GRID_CONFIGS[layout]

  const displayCameras = CAMERAS
    .filter(c => !search || c.id.toLowerCase().includes(search.toLowerCase()) || c.name.toLowerCase().includes(search.toLowerCase()))
    .slice(0, count)

  const online      = CAMERAS.filter(c => c.status === 'online').length
  const offline     = CAMERAS.filter(c => c.status === 'offline').length
  const maintenance = CAMERAS.filter(c => c.status === 'maintenance').length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Camera Monitoring</h1>
          <p className="text-sm text-slate-500 mt-0.5">Live CCTV surveillance · Detection active on all nodes</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 mr-1">Layout:</span>
          {['2x2', '3x3', '4x4'].map(l => (
            <button
              key={l}
              onClick={() => setLayout(l)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                layout === l
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-6 text-sm flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 live-dot" />
          <span className="text-slate-700 dark:text-slate-300 font-medium">{online} Online</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-slate-700 dark:text-slate-300 font-medium">{offline} Offline</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-slate-700 dark:text-slate-300 font-medium">{maintenance} Maintenance</span>
        </div>
        <div className="ml-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search cameras..."
              className="pl-8 pr-4 py-1.5 text-xs rounded-lg outline-none bg-slate-100 dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 w-44"
            />
          </div>
        </div>
      </div>

      {/* Camera Grid */}
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {displayCameras.map(cam => (
          <CameraCard key={cam.id} camera={cam} gridLayout={layout} />
        ))}
      </div>
    </div>
  )
}
