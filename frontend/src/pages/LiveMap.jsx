import React, { useState } from 'react'
import { Layers, Camera, Car, AlertTriangle, Activity, Map, Flame } from 'lucide-react'
import CityMap from '../components/CityMap'
import { StatusBadge } from '../components/StatusBadge'
import { useApi } from '../hooks/useApi'
import { getCameras } from '../api/cameras'
import { ALERTS } from '../data/mockData'

const LAYERS = [
  { key: 'heatmap', label: 'Kepler Heatmap', icon: Flame, badge: 'GPU' },
  { key: 'cameras', label: 'Cameras', icon: Camera },
  { key: 'incidents', label: 'Incidents', icon: AlertTriangle },
]

function CameraPanel({ camera, onClose }) {
  const camAlerts = ALERTS.filter(a => a.camera === camera.id).slice(0, 3)
  return (
    <div className="slide-in-right absolute top-0 right-0 h-full w-80 z-50 flex flex-col overflow-hidden bg-white dark:bg-[#101C2D] border-l border-slate-200 dark:border-slate-800 shadow-xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="text-sm font-bold text-slate-900 dark:text-white">{camera.id}</div>
          <div className="text-xs text-slate-500">{camera.name}</div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors text-lg leading-none">×</button>
      </div>

      {/* Live Preview */}
      <div className="mx-4 mt-4 rounded-lg overflow-hidden h-36 bg-slate-800 dark:bg-slate-900 relative flex items-center justify-center">
        <Camera className="w-10 h-10 text-slate-600 dark:text-slate-700" />
        <div className="absolute inset-0 p-3 pointer-events-none">
          <div className="border border-blue-400/60 rounded absolute" style={{ left: '20%', top: '20%', width: '25%', height: '40%' }} />
          <div className="border border-green-400/60 rounded absolute" style={{ left: '55%', top: '30%', width: '28%', height: '38%' }} />
        </div>
        {camera.status === 'online' && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-white live-dot" />LIVE
          </div>
        )}
      </div>

      {/* Info Grid */}
      <div className="px-4 pt-4 grid grid-cols-2 gap-3">
        {[
          { label: 'Status', value: <StatusBadge status={camera.status} /> },
          { label: 'Zone', value: <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{camera.zone}</span> },
          { label: 'Vehicles Today', value: <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{camera.vehicles_today.toLocaleString()}</span> },
          { label: 'Pedestrians', value: <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{camera.pedestrians_today.toLocaleString()}</span> },
          { label: 'Uptime', value: <span className="text-sm font-bold text-green-600 dark:text-green-400">{camera.uptime}%</span> },
          { label: 'Detections', value: <span className="text-xs text-slate-600 dark:text-slate-300">Car·Bike·Truck</span> },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg p-3 bg-slate-50 dark:bg-[#162438] border border-slate-200 dark:border-slate-800">
            <div className="text-xs text-slate-500 mb-1">{label}</div>
            <div>{value}</div>
          </div>
        ))}
      </div>

      {/* Recent Alerts */}
      <div className="px-4 pt-4">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Recent Alerts</div>
        {camAlerts.length > 0 ? (
          <div className="space-y-2">
            {camAlerts.map(a => (
              <div key={a.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#162438] border border-slate-200 dark:border-slate-800">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${a.severity === 'critical' ? 'bg-red-500' : a.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-300 truncate">{a.event}</div>
                  <div className="text-xs text-slate-500">{a.timestamp?.toLocaleTimeString?.() || ''}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-slate-500 text-center py-4">No recent alerts</div>
        )}
      </div>
    </div>
  )
}

export default function LiveMap() {
  const [activeLayers, setActiveLayers] = useState(['heatmap', 'cameras', 'incidents'])
  const [selectedCamera, setSelectedCamera] = useState(null)

  // Real cameras from API
  const { data: cameras } = useApi(getCameras, [])

  const toggleLayer = (key) => {
    setActiveLayers(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800"
      style={{ height: 'calc(100vh - 56px - 48px)' }}
    >
      {/* Top-Right Floating Layer Controller Pill */}
      <div className="absolute top-4 right-4 z-[1000] flex items-center gap-1.5 p-1.5 rounded-xl backdrop-blur-xl bg-white/90 dark:bg-[#0A1220]/90 border border-slate-200/80 dark:border-slate-800 shadow-xl">
        {LAYERS.map(l => {
          const active = activeLayers.includes(l.key)
          const Icon = l.icon
          return (
            <button
              key={l.key}
              type="button"
              onClick={() => toggleLayer(l.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                active
                  ? l.key === 'heatmap'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                    : 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{l.label}</span>
              {l.badge && (
                <span className={`px-1 py-0.2 rounded text-[9px] font-mono ${
                  active ? 'bg-white/20 text-white' : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                }`}>
                  {l.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Full-screen map */}
      <div className="absolute inset-0">
        <CityMap
          height="100%"
          cameras={cameras}
          selectedCamera={selectedCamera}
          onCameraSelect={setSelectedCamera}
          showIncidents={activeLayers.includes('incidents')}
          showCameras={activeLayers.includes('cameras')}
          showHeatmap={activeLayers.includes('heatmap')}
        />
      </div>

      {/* Camera detail panel — right side drawer */}
      {selectedCamera && (
        <div className="absolute top-0 right-0 bottom-0 w-80 z-40">
          <CameraPanel camera={selectedCamera} onClose={() => setSelectedCamera(null)} />
        </div>
      )}
    </div>
  )
}

