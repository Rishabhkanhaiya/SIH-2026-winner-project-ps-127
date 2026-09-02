import React, { useState } from 'react'
import { Camera, Maximize2, Search, Eye, Crosshair } from 'lucide-react'
import { CAMERAS } from '../data/mockData'

const GRID_CONFIGS = {
  '2x2': { cols: 2, count: 4 },
  '3x3': { cols: 3, count: 9 },
  '4x4': { cols: 4, count: 16 },
}

const BOX_SETS = [
  [{ x: '10%', y: '20%', w: '28%', h: '45%', color: '#3B82F6' }, { x: '55%', y: '35%', w: '22%', h: '38%', color: '#22C55E' }],
  [{ x: '15%', y: '25%', w: '30%', h: '42%', color: '#3B82F6' }, { x: '60%', y: '20%', w: '20%', h: '35%', color: '#22C55E' }, { x: '30%', y: '60%', w: '25%', h: '30%', color: '#F59E0B' }],
  [{ x: '5%', y: '15%', w: '40%', h: '50%', color: '#3B82F6' }],
  [{ x: '20%', y: '30%', w: '22%', h: '35%', color: '#22C55E' }, { x: '55%', y: '15%', w: '30%', h: '45%', color: '#3B82F6' }],
]

function CameraCard({ camera, gridLayout }) {
  const isSmall = gridLayout === '4x4'
  const boxes = BOX_SETS[parseInt(camera.id.replace('CAM-','')) % BOX_SETS.length]

  return (
    <div className="rounded-xl overflow-hidden flex flex-col group bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-sm transition-all">
      {/* Video Area - Solid flat dark canvas */}
      <div className="relative flex-1 min-h-0 bg-slate-900 dark:bg-slate-950" style={{ minHeight: isSmall ? '100px' : '140px' }}>
        <Camera className="absolute inset-0 m-auto w-8 h-8 text-slate-700 dark:text-slate-800" />
        {/* Simulated AI bounding boxes */}
        {camera.status === 'online' && boxes.map((box, i) => (
          <div key={i} className="absolute border rounded transition-all"
            style={{ left: box.x, top: box.y, width: box.w, height: box.h, borderColor: box.color, borderWidth: '1.5px', boxShadow: `0 0 6px ${box.color}40` }}>
            <div className="absolute -top-4 left-0 text-xs px-1 font-bold"
              style={{ color: box.color, background: `${box.color}20`, borderRadius: '3px', fontSize: '9px' }}>
              {i === 0 ? 'Vehicle' : i === 1 ? 'Person' : 'Object'}
            </div>
          </div>
        ))}
        {/* Status & ID */}
        {camera.status === 'online' ? (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white shadow-sm">
            <span className="w-1 h-1 rounded-full bg-white live-dot" />LIVE
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/20 px-2.5 py-1 rounded border border-red-200 dark:border-red-500/30">
              OFFLINE
            </span>
          </div>
        )}
        {/* Action buttons on hover */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {[
            { icon: Maximize2, label: 'Full' },
            { icon: Crosshair, label: 'Track' },
            { icon: Eye, label: 'View' },
          ].map(({ icon: Icon, label }) => (
            <button key={label} title={label}
              className="w-6 h-6 rounded flex items-center justify-center text-white hover:bg-white/20 transition-all bg-black/60 backdrop-blur-sm">
              <Icon className="w-3 h-3" />
            </button>
          ))}
        </div>
      </div>
      {/* Camera info */}
      <div className="px-3 py-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#101C2D]">
        <div>
          <div className="text-xs font-bold text-slate-900 dark:text-slate-200">{camera.id}</div>
          {!isSmall && <div className="text-xs text-slate-500 truncate max-w-28">{camera.name}</div>}
        </div>
        {!isSmall && camera.status === 'online' && (
          <div className="text-xs font-medium text-slate-500">{camera.vehicles_today.toLocaleString()} vehicles</div>
        )}
      </div>
    </div>
  )
}

export default function Cameras() {
  const [layout, setLayout] = useState('3x3')
  const { cols, count } = GRID_CONFIGS[layout]
  const displayCameras = CAMERAS.slice(0, count)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Camera Monitoring</h1>
          <p className="text-sm text-slate-500 mt-0.5">Live CCTV feeds · AI detection active</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-slate-500 mr-2">Layout:</div>
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

      {/* Stats */}
      <div className="flex items-center gap-6 text-sm flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 live-dot" />
          <span className="text-slate-700 dark:text-slate-300 font-medium">17 Online</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-slate-700 dark:text-slate-300 font-medium">2 Offline</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-slate-700 dark:text-slate-300 font-medium">1 Maintenance</span>
        </div>
        <div className="ml-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <input
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
