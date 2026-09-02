import React from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'
import L from 'leaflet'
import { CAMERAS, INCIDENTS } from '../data/mockData'
import { useTheme } from '../context/ThemeContext'

// Fix Leaflet default marker icon issue with Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Custom camera icon with semantic colors
const cameraIcon = (status) => {
  const isOnline = status === 'online'
  const isOffline = status === 'offline'
  const color = isOnline ? '#22C55E' : isOffline ? '#EF4444' : '#F59E0B'
  const bg = isOnline ? 'rgba(34,197,94,0.2)' : isOffline ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'
  const shadow = isOnline ? 'rgba(34,197,94,0.4)' : isOffline ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'

  return L.divIcon({
    html: `<div style="
      width: 28px; height: 28px; border-radius: 50%;
      background: ${bg};
      border: 2px solid ${color};
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 0 8px ${shadow};
    ">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="${color}">
        <path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
      </svg>
    </div>`,
    className: 'camera-marker-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

const incidentIcon = L.divIcon({
  html: `<div style="
    width: 28px; height: 28px; border-radius: 50%;
    background: rgba(239,68,68,0.2); border: 2px solid #EF4444;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 0 12px rgba(239,68,68,0.5);
    animation: criticalPulse 2s ease-in-out infinite;
  ">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#EF4444">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13" stroke="#fff" stroke-width="2"/>
      <line x1="12" y1="17" x2="12.01" y2="17" stroke="#fff" stroke-width="2"/>
    </svg>
  </div>`,
  className: 'incident-marker-icon',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})

export default function CityMap({ height = '100%', selectedCamera, onCameraSelect, showIncidents = true }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const PUNE_CENTER = [18.5204, 73.8567]

  const tileUrl = isDark
    ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

  return (
    <div style={{ height, width: '100%', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
      <MapContainer
        key={theme} // Force re-render on theme change to swap tiles cleanly
        center={PUNE_CENTER}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          url={tileUrl}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* Camera markers */}
        {CAMERAS.map(cam => (
          <Marker
            key={cam.id}
            position={[cam.lat, cam.lng]}
            icon={cameraIcon(cam.status)}
            eventHandlers={{ click: () => onCameraSelect && onCameraSelect(cam) }}
          >
            <Popup>
              <div className="p-2 min-w-[160px] text-slate-900 dark:text-[#F8FAFC]">
                <div className="font-bold text-xs text-blue-600 dark:text-blue-400">{cam.id}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{cam.name}</div>
                <div className="text-[11px] mt-1.5">
                  <span className={`font-semibold uppercase ${cam.status === 'online' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    ● {cam.status}
                  </span>
                </div>
                {cam.status === 'online' && (
                  <div className="text-[11px] text-slate-500 mt-1">
                    {cam.vehicles_today.toLocaleString()} vehicles today
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Incident markers */}
        {showIncidents && INCIDENTS.filter(i => i.status === 'active').map(inc => (
          <React.Fragment key={inc.id}>
            <Marker position={[inc.lat, inc.lng]} icon={incidentIcon}>
              <Popup>
                <div className="p-2 min-w-[160px] text-slate-900 dark:text-[#F8FAFC]">
                  <div className="font-bold text-xs text-red-600 dark:text-red-400">⚠ {inc.type}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{inc.location}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{inc.time} · {inc.camera}</div>
                </div>
              </Popup>
            </Marker>
            <Circle center={[inc.lat, inc.lng]} radius={150} color="#EF4444" fillColor="#EF4444" fillOpacity={0.08} weight={1} dashArray="5 5" />
          </React.Fragment>
        ))}

        {/* Selected camera highlight */}
        {selectedCamera && (
          <Circle
            center={[selectedCamera.lat, selectedCamera.lng]}
            radius={200}
            color="#2563EB"
            fillColor="#2563EB"
            fillOpacity={0.15}
            weight={2}
          />
        )}
      </MapContainer>

      {/* Map overlay info */}
      <div className="absolute bottom-3 left-3 z-[1000] px-3 py-1.5 rounded-lg flex items-center gap-4 text-xs font-medium shadow-md backdrop-blur-md bg-white/90 dark:bg-[#08111F]/90 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-green-500">●</span>
          <span>Online ({CAMERAS.filter(c => c.status==='online').length})</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-red-500">●</span>
          <span>Incident ({INCIDENTS.filter(i => i.status==='active').length})</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-amber-500">●</span>
          <span>Offline ({CAMERAS.filter(c => c.status==='offline').length})</span>
        </div>
      </div>
    </div>
  )
}
