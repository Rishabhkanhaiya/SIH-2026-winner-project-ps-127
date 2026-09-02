import React, { useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import { CAMERAS, INCIDENTS } from '../data/mockData'

// Fix Leaflet default marker icon issue with Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Custom camera icon
const cameraIcon = (status) => L.divIcon({
  html: `<div style="
    width: 28px; height: 28px; border-radius: 50%;
    background: ${status === 'online' ? 'rgba(34,211,238,0.2)' : status === 'offline' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'};
    border: 2px solid ${status === 'online' ? '#22D3EE' : status === 'offline' ? '#EF4444' : '#F59E0B'};
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 0 8px ${status === 'online' ? 'rgba(34,211,238,0.4)' : 'rgba(239,68,68,0.3)'};
  ">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="${status === 'online' ? '#22D3EE' : status === 'offline' ? '#EF4444' : '#F59E0B'}">
      <path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
    </svg>
  </div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})

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
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})

export default function CityMap({ height = '100%', selectedCamera, onCameraSelect, showIncidents = true }) {
  const PUNE_CENTER = [18.5204, 73.8567]

  return (
    <div style={{ height, width: '100%', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
      <MapContainer
        center={PUNE_CENTER}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        {/* Camera markers */}
        {CAMERAS.map(cam => (
          <Marker
            key={cam.id}
            position={[cam.lat, cam.lng]}
            icon={cameraIcon(cam.status)}
            eventHandlers={{ click: () => onCameraSelect && onCameraSelect(cam) }}
          >
            <Popup className="dark-popup">
              <div style={{ background: '#162438', color: '#F8FAFC', padding: '8px', borderRadius: '8px', minWidth: '160px' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#22D3EE' }}>{cam.id}</div>
                <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>{cam.name}</div>
                <div style={{ fontSize: '11px', marginTop: '6px' }}>
                  <span style={{ color: cam.status === 'online' ? '#22C55E' : '#EF4444', textTransform: 'uppercase', fontWeight: 600 }}>● {cam.status}</span>
                </div>
                {cam.status === 'online' && (
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
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
                <div style={{ background: '#162438', color: '#F8FAFC', padding: '8px', borderRadius: '8px', minWidth: '160px' }}>
                  <div style={{ fontWeight: 700, fontSize: '12px', color: '#EF4444' }}>⚠ {inc.type}</div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>{inc.location}</div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>{inc.time} · {inc.camera}</div>
                </div>
              </Popup>
            </Marker>
            <Circle center={[inc.lat, inc.lng]} radius={150} color="#EF4444" fillColor="#EF4444" fillOpacity={0.05} weight={1} dashArray="5 5" />
          </React.Fragment>
        ))}

        {/* Selected camera highlight */}
        {selectedCamera && (
          <Circle
            center={[selectedCamera.lat, selectedCamera.lng]}
            radius={200}
            color="#22D3EE"
            fillColor="#22D3EE"
            fillOpacity={0.1}
            weight={2}
          />
        )}
      </MapContainer>

      {/* Map overlay info */}
      <div style={{
        position: 'absolute', bottom: 12, left: 12, zIndex: 1000,
        background: 'rgba(8,17,31,0.85)', backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px',
        padding: '6px 12px', display: 'flex', gap: '16px', alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
          <span style={{ color: '#22D3EE' }}>●</span>
          <span style={{ color: '#94A3B8' }}>Camera Online ({CAMERAS.filter(c => c.status==='online').length})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
          <span style={{ color: '#EF4444' }}>●</span>
          <span style={{ color: '#94A3B8' }}>Incident ({INCIDENTS.filter(i => i.status==='active').length})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
          <span style={{ color: '#F59E0B' }}>●</span>
          <span style={{ color: '#94A3B8' }}>Offline ({CAMERAS.filter(c => c.status==='offline').length})</span>
        </div>
      </div>
    </div>
  )
}
