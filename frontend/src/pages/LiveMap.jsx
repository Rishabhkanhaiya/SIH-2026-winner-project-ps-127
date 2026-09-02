import React, { useState } from 'react'
import { Layers, Camera, Car, Users, AlertTriangle, Activity, Map } from 'lucide-react'
import CityMap from '../components/CityMap'
import { StatusBadge } from '../components/StatusBadge'
import { CAMERAS, ALERTS } from '../data/mockData'

const LAYERS = [
  { key: 'traffic', label: 'Traffic', icon: Activity },
  { key: 'cameras', label: 'Cameras', icon: Camera },
  { key: 'vehicles', label: 'Vehicles', icon: Car },
  { key: 'people', label: 'People', icon: Users },
  { key: 'incidents', label: 'Incidents', icon: AlertTriangle },
  { key: 'heatmap', label: 'Heatmap', icon: Layers },
  { key: 'geofences', label: 'Geofences', icon: Map },
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
  const [activeLayers, setActiveLayers] = useState(['cameras', 'incidents'])
  const [selectedCamera, setSelectedCamera] = useState(null)

  const toggleLayer = (key) => {
    setActiveLayers(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  return (
    <div className="relative" style={{ height: 'calc(100vh - 56px - 48px)', marginTop: '-24px', marginLeft: '-24px', marginRight: '-24px' }}>
      {/* Full-screen map */}
      <div className="absolute inset-0">
        <CityMap
          height="100%"
          selectedCamera={selectedCamera}
          onCameraSelect={setSelectedCamera}
          showIncidents={activeLayers.includes('incidents')}
        />
      </div>

      {/* Layer Filter Panel */}
      <div className="absolute top-4 left-4 z-40 flex flex-col gap-2">
        <div className="rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider bg-white/90 dark:bg-[#101C2D]/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-md">
          Map Layers
        </div>
        <div className="rounded-xl overflow-hidden bg-white/90 dark:bg-[#101C2D]/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-md">
          {LAYERS.map(({ key, label, icon: Icon }) => {
            const active = activeLayers.includes(key)
            return (
              <button
                key={key}
                onClick={() => toggleLayer(key)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all border-b border-slate-100 dark:border-slate-800/60 last:border-0 ${
                  active
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
                <div className={`ml-auto w-4 h-4 rounded border flex items-center justify-center transition-all ${
                  active ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-400 dark:border-slate-600'
                }`}>
                  {active && <span className="text-[10px] font-bold">✓</span>}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Stats overlay */}
      <div className="absolute top-4 right-4 z-40 flex flex-col gap-2" style={{ width: selectedCamera ? '0' : 'auto', overflow: 'hidden' }}>
        {!selectedCamera && (
          <div className="rounded-xl p-4 space-y-3 min-w-48 bg-white/90 dark:bg-[#101C2D]/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-md">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider">Zone Overview</div>
            {[
              { label: 'Cameras Active', value: '17/20', color: 'text-green-600 dark:text-green-400' },
              { label: 'Vehicles Now', value: '1,240', color: 'text-slate-900 dark:text-white' },
              { label: 'Active Incidents', value: '8', color: 'text-red-600 dark:text-red-400' },
              { label: 'Traffic Flow', value: '74%', color: 'text-green-600 dark:text-green-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs text-slate-500">{label}</span>
                <span className={`text-sm font-bold ${color}`}>{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Camera detail panel */}
      {selectedCamera && (
        <div className="absolute top-0 right-0 bottom-0 w-80 z-40">
          <CameraPanel camera={selectedCamera} onClose={() => setSelectedCamera(null)} />
        </div>
      )}
    </div>
  )
}
