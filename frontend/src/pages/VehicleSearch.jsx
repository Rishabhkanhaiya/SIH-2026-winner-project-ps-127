import React, { useState, useEffect, useMemo } from 'react'
import { Search, Car, MapPin, Clock, ArrowRight, X, Map as MapIcon, Eye, EyeOff, Flag, Navigation } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { VEHICLES, VEHICLE_TRAJECTORY, CAMERAS } from '../data/mockData'
import { ConfidenceBadge } from '../components/StatusBadge'

// Fix leaflet default icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const COLOR_DOT = { White: '#e2e8f0', Black: '#1e293b', Red: '#ef4444', Blue: '#3b82f6', Grey: '#94a3b8', Silver: '#cbd5e1', Yellow: '#fbbf24' }
const TRAJ_COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316']

// Per-vehicle rich realistic Pune road trajectories with 4–7 waypoints
export const VEHICLE_TRAJECTORIES = {
  'MH12AB1234': {
    startLoc: 'Hinjewadi IT Park (CAM-008)',
    destLoc: 'Swargate Junction (CAM-003)',
    totalDistanceKm: 14.8,
    durationSec: 300,
    waypoints: [
      { camera: 'CAM-008', lat: 18.5912, lng: 73.7389, time: '09:05 AM', location: 'Hinjewadi Phase 1', label: 'Dispatch (Hinjewadi)', speed: '48 km/h' },
      { camera: 'CAM-010', lat: 18.5993, lng: 73.7617, time: '09:12 AM', location: 'Wakad Junction', label: 'Wakad Junction', speed: '52 km/h' },
      { camera: 'CAM-007', lat: 18.5590, lng: 73.7868, time: '09:20 AM', location: 'Baner Road', label: 'Baner Chowk', speed: '44 km/h' },
      { camera: 'CAM-013', lat: 18.5617, lng: 73.8075, time: '09:28 AM', location: 'Aundh Market', label: 'Aundh Circle', speed: '38 km/h' },
      { camera: 'CAM-004', lat: 18.5308, lng: 73.8474, time: '09:36 AM', location: 'Shivajinagar Circle', label: 'Shivajinagar', speed: '40 km/h' },
      { camera: 'CAM-001', lat: 18.5196, lng: 73.8553, time: '09:42 AM', location: 'MG Road Junction', label: 'MG Road', speed: '35 km/h' },
      { camera: 'CAM-003', lat: 18.5016, lng: 73.8577, time: '09:47 AM', location: 'Swargate Junction', label: 'Target (Swargate)', speed: '32 km/h' },
    ],
  },
  'DL01AB2345': {
    startLoc: 'Chinchwad Bridge (CAM-016)',
    destLoc: 'Hinjewadi IT Park (CAM-008)',
    totalDistanceKm: 12.4,
    durationSec: 280,
    waypoints: [
      { camera: 'CAM-016', lat: 18.6462, lng: 73.7940, time: '09:00 AM', location: 'Chinchwad Bridge', label: 'Dispatch (Chinchwad)', speed: '55 km/h' },
      { camera: 'CAM-015', lat: 18.6298, lng: 73.7997, time: '09:08 AM', location: 'Pimpri Chowk', label: 'Pimpri Chowk', speed: '42 km/h' },
      { camera: 'WP-101',  lat: 18.6080, lng: 73.7845, time: '09:16 AM', location: 'Kalewadi Phata', label: 'Kalewadi Phata', speed: '46 km/h' },
      { camera: 'CAM-010', lat: 18.5993, lng: 73.7617, time: '09:25 AM', location: 'Wakad Junction', label: 'Wakad Chowk', speed: '50 km/h' },
      { camera: 'WP-102',  lat: 18.5945, lng: 73.7510, time: '09:34 AM', location: 'Hinjewadi Phase 1 Entry', label: 'Phase 1 Entry', speed: '38 km/h' },
      { camera: 'CAM-008', lat: 18.5912, lng: 73.7389, time: '09:42 AM', location: 'Hinjewadi IT Park', label: 'Target (IT Park)', speed: '30 km/h' },
    ],
  },
  'KA01CD3456': {
    startLoc: 'Aundh Market (CAM-013)',
    destLoc: 'Kothrud Depot (CAM-005)',
    totalDistanceKm: 9.6,
    durationSec: 240,
    waypoints: [
      { camera: 'CAM-013', lat: 18.5617, lng: 73.8075, time: '08:45 AM', location: 'Aundh Market', label: 'Dispatch (Aundh)', speed: '40 km/h' },
      { camera: 'WP-103',  lat: 18.5428, lng: 73.8290, time: '08:55 AM', location: 'Pune University Circle', label: 'University Circle', speed: '36 km/h' },
      { camera: 'CAM-002', lat: 18.5314, lng: 73.8446, time: '09:05 AM', location: 'FC Road Signal', label: 'FC Road', speed: '32 km/h' },
      { camera: 'CAM-012', lat: 18.5197, lng: 73.8380, time: '09:15 AM', location: 'Deccan Gymkhana', label: 'Deccan Gymkhana', speed: '35 km/h' },
      { camera: 'WP-104',  lat: 18.5095, lng: 73.8210, time: '09:25 AM', location: 'Karve Road Signal', label: 'Karve Road', speed: '42 km/h' },
      { camera: 'CAM-005', lat: 18.5088, lng: 73.8064, time: '09:35 AM', location: 'Kothrud Depot', label: 'Target (Kothrud)', speed: '28 km/h' },
    ],
  },
  'MH14EF5678': {
    startLoc: 'Nigdi Pradhikaran (CAM-016N)',
    destLoc: 'Wakad Junction (CAM-010)',
    totalDistanceKm: 15.2,
    durationSec: 320,
    waypoints: [
      { camera: 'WP-105',  lat: 18.6620, lng: 73.7760, time: '08:00 AM', location: 'Bhakti Shakti Nigdi', label: 'Dispatch (Nigdi)', speed: '45 km/h' },
      { camera: 'CAM-016', lat: 18.6462, lng: 73.7940, time: '08:15 AM', location: 'Chinchwad Bridge', label: 'Chinchwad Bridge', speed: '40 km/h' },
      { camera: 'CAM-015', lat: 18.6298, lng: 73.7997, time: '08:30 AM', location: 'Pimpri Chowk', label: 'Pimpri Chowk', speed: '38 km/h' },
      { camera: 'WP-106',  lat: 18.6220, lng: 73.7650, time: '08:45 AM', location: 'Ravet Interchange', label: 'Ravet Interchange', speed: '50 km/h' },
      { camera: 'CAM-010', lat: 18.5993, lng: 73.7617, time: '09:00 AM', location: 'Wakad Junction', label: 'Target (Wakad)', speed: '35 km/h' },
    ],
  },
  'UP32GH7890': {
    startLoc: 'Nigdi Pradhikaran (CAM-016N)',
    destLoc: 'Swargate Junction (CAM-003)',
    totalDistanceKm: 17.5,
    durationSec: 350,
    waypoints: [
      { camera: 'WP-107',  lat: 18.6520, lng: 73.7850, time: '08:15 AM', location: 'Nigdi Depot', label: 'Dispatch (Nigdi)', speed: '40 km/h' },
      { camera: 'CAM-015', lat: 18.6298, lng: 73.7997, time: '08:32 AM', location: 'Pimpri Chowk', label: 'Pimpri Chowk', speed: '35 km/h' },
      { camera: 'WP-108',  lat: 18.5810, lng: 73.8310, time: '08:50 AM', location: 'Dapodi Khadki Link', label: 'Khadki Gate', speed: '42 km/h' },
      { camera: 'CAM-004', lat: 18.5308, lng: 73.8474, time: '09:05 AM', location: 'Shivajinagar Circle', label: 'Shivajinagar', speed: '30 km/h' },
      { camera: 'CAM-003', lat: 18.5016, lng: 73.8577, time: '09:20 AM', location: 'Swargate Junction', label: 'Target (Swargate)', speed: '25 km/h' },
    ],
  },
  'MH15IJ9012': {
    startLoc: 'Pune Station Gate (CAM-020)',
    destLoc: 'MG Road Junction (CAM-001)',
    totalDistanceKm: 8.5,
    durationSec: 220,
    waypoints: [
      { camera: 'WP-109',  lat: 18.5280, lng: 73.8741, time: '09:20 AM', location: 'Pune Station Gate', label: 'Dispatch (Pune Stn)', speed: '45 km/h' },
      { camera: 'CAM-004', lat: 18.5308, lng: 73.8474, time: '09:30 AM', location: 'Shivajinagar Circle', label: 'Shivajinagar', speed: '40 km/h' },
      { camera: 'CAM-002', lat: 18.5314, lng: 73.8446, time: '09:38 AM', location: 'FC Road Signal', label: 'FC Road', speed: '36 km/h' },
      { camera: 'CAM-012', lat: 18.5197, lng: 73.8380, time: '09:44 AM', location: 'Deccan Gymkhana', label: 'Deccan Gymkhana', speed: '38 km/h' },
      { camera: 'CAM-001', lat: 18.5196, lng: 73.8553, time: '09:48 AM', location: 'MG Road Junction', label: 'Target (MG Road)', speed: '30 km/h' },
    ],
  },
  'TN22KL3456': {
    startLoc: 'Pune Airport (CAM-009)',
    destLoc: 'Hadapsar Signal (CAM-006)',
    totalDistanceKm: 11.2,
    durationSec: 260,
    waypoints: [
      { camera: 'WP-110',  lat: 18.5800, lng: 73.9197, time: '09:45 AM', location: 'Pune Airport Gate', label: 'Dispatch (Airport)', speed: '45 km/h' },
      { camera: 'CAM-009', lat: 18.5679, lng: 73.9143, time: '09:55 AM', location: 'Viman Nagar Signal', label: 'Viman Nagar', speed: '40 km/h' },
      { camera: 'CAM-019', lat: 18.5541, lng: 73.9512, time: '10:02 AM', location: 'Nagar Road Entry', label: 'Nagar Road', speed: '48 km/h' },
      { camera: 'CAM-011', lat: 18.5538, lng: 73.9416, time: '10:08 AM', location: 'Kharadi IT Hub', label: 'Kharadi IT Hub', speed: '42 km/h' },
      { camera: 'WP-111',  lat: 18.5350, lng: 73.9320, time: '10:15 AM', location: 'Mundhwa Chowk', label: 'Mundhwa Chowk', speed: '44 km/h' },
      { camera: 'CAM-006', lat: 18.5089, lng: 73.9259, time: '10:22 AM', location: 'Hadapsar Signal', label: 'Target (Hadapsar)', speed: '35 km/h' },
    ],
  },
  'MH14ZZ9999': {
    startLoc: 'Katraj Bypass (CAM-014)',
    destLoc: 'Baner Road Junction (CAM-007)',
    totalDistanceKm: 22.4,
    durationSec: 360,
    waypoints: [
      { camera: 'CAM-014', lat: 18.4535, lng: 73.8669, time: '08:10 AM', location: 'Katraj Bypass', label: 'Dispatch (Katraj)', speed: '62 km/h' },
      { camera: 'CAM-003', lat: 18.5016, lng: 73.8577, time: '08:24 AM', location: 'Swargate Junction', label: 'Swargate Junction', speed: '45 km/h' },
      { camera: 'WP-112',  lat: 18.5280, lng: 73.8741, time: '08:38 AM', location: 'Pune Station Gate', label: 'Pune Station', speed: '40 km/h' },
      { camera: 'WP-113',  lat: 18.5520, lng: 73.8865, time: '08:50 AM', location: 'Yerwada Bridge', label: 'Yerwada Bridge', speed: '48 km/h' },
      { camera: 'CAM-013', lat: 18.5617, lng: 73.8075, time: '09:05 AM', location: 'Aundh Market', label: 'Aundh Market', speed: '50 km/h' },
      { camera: 'CAM-007', lat: 18.5590, lng: 73.7868, time: '09:18 AM', location: 'Baner Road Junction', label: 'Target (Baner Rd)', speed: '44 km/h' },
    ],
  },
}

// Helper to safely get vehicle route data
export function getVehicleRoute(plate) {
  const route = VEHICLE_TRAJECTORIES[plate]
  if (!route) {
    const fallbackSightings = VEHICLE_TRAJECTORY?.sightings || []
    return {
      startLoc: fallbackSightings[0]?.location || 'Dispatch Point',
      destLoc: fallbackSightings[fallbackSightings.length - 1]?.location || 'Destination',
      totalDistanceKm: 12.0,
      durationSec: 300,
      waypoints: fallbackSightings,
    }
  }
  if (Array.isArray(route)) {
    const first = route[0] || {}
    const last = route[route.length - 1] || {}
    return {
      startLoc: first.location || first.label || 'Dispatch Point',
      destLoc: last.location || last.label || 'Destination',
      totalDistanceKm: 12.0,
      durationSec: 300,
      waypoints: route,
    }
  }
  return route
}

// Persistent simulation registry across component re-renders
const SIMULATION_REGISTRY = new Map()

export function getVehicleSimulationState(plate, durationSec = 300) {
  if (!plate) return { progress: 0, elapsed: 0, durationMs: durationSec * 1000 }
  const now = Date.now()
  if (!SIMULATION_REGISTRY.has(plate)) {
    const charCodeSum = plate.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
    const initialOffsetSec = (charCodeSum * 23) % (durationSec * 0.75)
    SIMULATION_REGISTRY.set(plate, {
      startTime: now - initialOffsetSec * 1000,
      durationMs: durationSec * 1000,
    })
  }
  const entry = SIMULATION_REGISTRY.get(plate)
  const elapsed = (now - entry.startTime) % entry.durationMs
  const progress = Math.min(100, Math.max(0, (elapsed / entry.durationMs) * 100))
  return { progress, elapsed, durationMs: entry.durationMs }
}

export function useVehicleTrajectoryProgress(plate, durationSec = 300) {
  const [, setTick] = useState(() => Date.now())

  useEffect(() => {
    if (!plate) return
    const interval = setInterval(() => {
      setTick(Date.now())
    }, 500)
    return () => clearInterval(interval)
  }, [plate])

  return getVehicleSimulationState(plate, durationSec)
}

// Calculate interpolated coordinates along waypoints based on progress (0% - 100%)
function getInterpolatedPosition(waypoints, progress) {
  if (!waypoints || waypoints.length === 0) return null
  if (waypoints.length === 1 || progress <= 0) return [waypoints[0].lat, waypoints[0].lng]
  if (progress >= 100) {
    const last = waypoints[waypoints.length - 1]
    return [last.lat, last.lng]
  }
  const totalSegments = waypoints.length - 1
  const globalT = (progress / 100) * totalSegments
  const segIndex = Math.min(totalSegments - 1, Math.floor(globalT))
  const segT = globalT - segIndex
  const p1 = waypoints[segIndex]
  const p2 = waypoints[segIndex + 1]
  const lat = p1.lat + (p2.lat - p1.lat) * segT
  const lng = p1.lng + (p2.lng - p1.lng) * segT
  return [lat, lng]
}

// RouteDisplay Component (Emergency Corridor UX)
export function RouteDisplay({ progress, startLoc, destLoc, totalDistanceKm = 12.5, durationSec = 300, waypoints = [] }) {
  const nodesCleared = progress > 90 ? 4 : progress > 65 ? 3 : progress > 25 ? 2 : progress > 0 ? 1 : 0

  const defaultLabels = ['Dispatch', 'Node 2', 'Node 3', 'Target']
  const nodes = [0, 1, 2, 3].map(i => {
    let label = defaultLabels[i]
    if (waypoints && waypoints.length >= 4) {
      const idx = i === 0 ? 0 : i === 1 ? Math.floor((waypoints.length - 1) * 0.33) : i === 2 ? Math.floor((waypoints.length - 1) * 0.67) : waypoints.length - 1
      const wp = waypoints[idx]
      if (wp) {
        label = wp.label || wp.location || wp.camera || label
      }
    } else if (waypoints && waypoints[i]) {
      label = waypoints[i].label || waypoints[i].location || waypoints[i].camera || label
    }
    return {
      label,
      cleared: nodesCleared >= i + 1,
    }
  })

  const remainingSec = Math.max(0, Math.round(durationSec * (1 - progress / 100)))
  const remainingMin = Math.floor(remainingSec / 60)
  const remainingSecMod = remainingSec % 60
  const remainingKm = (totalDistanceKm * (1 - progress / 100)).toFixed(1)

  return (
    <div className="flex flex-col gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-[#162438] border border-slate-200 dark:border-slate-800">
      {/* Origin -> Destination Header */}
      <div className="flex items-center gap-2 text-[11px]">
        <div className="flex items-center gap-1.5 min-w-0 max-w-[46%]">
          <MapPin size={13} className="text-[#10B981] shrink-0" />
          <span className="truncate font-bold text-slate-800 dark:text-slate-200" title={startLoc}>{startLoc}</span>
        </div>
        <div className="flex-1 border-t border-dashed border-slate-300 dark:border-slate-700 mx-1" />
        <div className="flex items-center gap-1.5 min-w-0 max-w-[46%] justify-end">
          <span className="truncate font-bold text-slate-800 dark:text-slate-200 text-right" title={destLoc}>{destLoc}</span>
          <Flag size={13} className="text-[#EF4444] shrink-0" />
        </div>
      </div>

      {/* Corridor Progress Bar + Percentage Chip & ETA */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Corridor Progress</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30">
              {Math.floor(progress)}% CLEARED
            </span>
          </div>
          <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 font-mono">
            ETA: {remainingMin}m {remainingSecMod.toString().padStart(2, '0')}s · {remainingKm} km left
          </div>
        </div>
        <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-linear"
            style={{ width: `${progress}%`, background: progress >= 100 ? '#10B981' : '#2563EB' }}
          />
        </div>
      </div>

      {/* 4 Checkpoint Nodes Segmented Bar */}
      <div className="flex items-center gap-1.5">
        {nodes.map((node, i) => (
          <div key={i} className="flex items-center gap-1.5 flex-1">
            <div className={`flex-1 h-1.5 rounded-full transition-colors duration-500 ${node.cleared ? 'bg-[#10B981]' : 'bg-slate-200 dark:bg-slate-700'}`} />
            <div
              className={`w-2.5 h-2.5 rounded-full shrink-0 transition-colors duration-500 border-2 ${
                node.cleared ? 'bg-[#10B981] border-green-200 dark:border-green-800' : 'bg-slate-300 dark:bg-slate-600 border-transparent'
              }`}
              title={node.label}
            />
          </div>
        ))}
      </div>

      {/* Checkpoint Node Labels */}
      <div className="flex justify-between text-[9px] text-slate-500 dark:text-slate-400 font-mono -mt-1">
        {nodes.map((n, i) => (
          <span key={i} className={`truncate max-w-[24%] ${n.cleared ? 'text-[#10B981] font-bold' : ''}`} title={n.label}>
            {n.label}
          </span>
        ))}
      </div>
    </div>
  )
}

function MapFitBounds({ points }) {
  const map = useMap()
  useEffect(() => {
    if (points && points.length > 0) {
      const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]))
      map.fitBounds(bounds, { padding: [40, 40] })
    }
  }, [points, map])
  return null
}

function createOriginIcon() {
  return L.divIcon({
    html: `
      <div style="width:26px;height:26px;border-radius:50%;background:#10B981;border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;color:white;">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
      </div>
    `,
    className: '',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  })
}

function createDestIcon() {
  return L.divIcon({
    html: `
      <div style="width:26px;height:26px;border-radius:50%;background:#EF4444;border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;color:white;">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>
      </div>
    `,
    className: '',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  })
}

function createWaypointIcon(color, index, isCleared) {
  const bg = isCleared ? '#10B981' : color || '#94A3B8'
  return L.divIcon({
    html: `
      <div style="width:18px;height:18px;border-radius:50%;background:${bg};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;color:white;font-size:9px;font-weight:700;font-family:monospace;">
        ${index}
      </div>
    `,
    className: '',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
}

function createLiveVehicleIcon(color = '#2563EB') {
  return L.divIcon({
    html: `
      <div style="position:relative;width:26px;height:26px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;width:26px;height:26px;border-radius:50%;background:${color};opacity:0.35;animation:livePulse 1.5s ease-in-out infinite;"></div>
        <div style="width:13px;height:13px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.45);position:relative;z-index:2;"></div>
      </div>
    `,
    className: '',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  })
}

// Styled Card-Boxed Grayscale Trajectory Map Component
function TrajectoryMapCard({ vehicles, singleVehicle, onClose }) {
  const plate = singleVehicle?.plate
  const routeData = plate ? getVehicleRoute(plate) : null
  const { progress } = useVehicleTrajectoryProgress(plate || 'ALL_VEHICLES', routeData?.durationSec || 300)

  const allSightings = useMemo(() => {
    if (singleVehicle) {
      return [{
        vehicle: singleVehicle,
        route: routeData,
        sightings: routeData?.waypoints || [],
        color: '#2563EB',
      }]
    }
    return vehicles.map((v, i) => {
      const r = getVehicleRoute(v.plate)
      return {
        vehicle: v,
        route: r,
        sightings: r?.waypoints || [],
        color: TRAJ_COLORS[i % TRAJ_COLORS.length],
      }
    })
  }, [singleVehicle, vehicles, routeData])

  const allPoints = useMemo(() => allSightings.flatMap(s => s.sightings), [allSightings])

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101C2D] shadow-md transition-all">
      {/* Card Header Bar */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#162438]">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400">
            <MapIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {singleVehicle ? `Live Trajectory Map` : 'Live Trajectory Map — All Vehicles'}
              </span>
              {singleVehicle && (
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-500/30">
                  {singleVehicle.plate}
                </span>
              )}
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 live-dot" />
                LIVE TRACKING
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {singleVehicle
                ? `${routeData?.waypoints?.length || 0} camera checkpoints · ${routeData?.totalDistanceKm || 0} km corridor`
                : `${vehicles.length} vehicles actively tracked across Pune grid`}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all"
          title="Close Trajectory Map"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Route Progression Corridor (for single vehicle view) */}
      {singleVehicle && routeData && (
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101C2D]">
          <RouteDisplay
            progress={progress}
            startLoc={routeData.startLoc}
            destLoc={routeData.destLoc}
            totalDistanceKm={routeData.totalDistanceKm}
            durationSec={routeData.durationSec}
            waypoints={routeData.waypoints}
          />
        </div>
      )}

      {/* Color Legend for All Vehicles */}
      {!singleVehicle && (
        <div className="px-4 py-2.5 flex flex-wrap gap-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-[#162438]/60">
          {vehicles.map((v, i) => (
            <div key={v.plate} className="flex items-center gap-1.5 text-xs font-mono">
              <div className="w-3 h-1.5 rounded-full" style={{ background: TRAJ_COLORS[i % TRAJ_COLORS.length] }} />
              <span className="text-slate-700 dark:text-slate-300 font-semibold">{v.plate}</span>
              <span className="text-slate-400 text-[10px]">({v.type})</span>
            </div>
          ))}
        </div>
      )}

      {/* Grayscale Leaflet Map Container (Fixed/Responsive height 360px) */}
      <div className="grayscale-map relative" style={{ height: '360px', width: '100%' }}>
        <MapContainer
          center={[18.5204, 73.8567]}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {allPoints.length > 0 && <MapFitBounds points={allPoints} />}

          {allSightings.map(({ vehicle, sightings, color }) => {
            const vRoute = getVehicleRoute(vehicle.plate)
            const vProg = singleVehicle ? progress : getVehicleSimulationState(vehicle.plate, vRoute.durationSec || 300).progress

            return (
              <React.Fragment key={vehicle.plate}>
                {/* Route Polyline */}
                {sightings.length > 1 && (
                  <Polyline
                    positions={sightings.map(s => [s.lat, s.lng])}
                    pathOptions={{
                      color: singleVehicle ? '#2563EB' : color,
                      weight: 4,
                      opacity: 0.85,
                    }}
                  />
                )}

                {/* Waypoint Checkpoint Markers */}
                {sightings.map((s, i) => {
                  const isOrigin = i === 0
                  const isDest = i === sightings.length - 1
                  const checkpointThreshold = (i / Math.max(1, sightings.length - 1)) * 100
                  const isCleared = vProg >= checkpointThreshold

                  let icon
                  if (isOrigin) {
                    icon = createOriginIcon()
                  } else if (isDest) {
                    icon = createDestIcon()
                  } else {
                    icon = createWaypointIcon(color, i + 1, isCleared)
                  }

                  return (
                    <Marker
                      key={`${vehicle.plate}-${i}`}
                      position={[s.lat, s.lng]}
                      icon={icon}
                    >
                      <Popup>
                        <div className="p-1 text-xs">
                          <div className="font-bold text-blue-600 dark:text-blue-400 font-mono">{vehicle.plate}</div>
                          <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{s.location || s.label}</div>
                          <div className="text-slate-500">{s.camera} · {s.time}</div>
                          {s.speed && <div className="text-slate-500">Speed: {s.speed}</div>}
                          <div className="text-[10px] font-bold mt-1" style={{ color: isCleared ? '#10B981' : '#64748B' }}>
                            Status: {isCleared ? '✓ Cleared Checkpoint' : '⏳ Pending Passage'}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  )
                })}

                {/* Live Interpolated Moving Vehicle Marker */}
                {sightings.length > 1 && (() => {
                  const vPos = getInterpolatedPosition(sightings, vProg)
                  if (!vPos) return null
                  return (
                    <Marker
                      position={vPos}
                      icon={createLiveVehicleIcon(singleVehicle ? '#2563EB' : color)}
                      zIndexOffset={1000}
                    >
                      <Popup>
                        <div className="p-1 text-xs">
                          <div className="font-bold text-blue-600 font-mono">{vehicle.plate} (Live Sim)</div>
                          <div className="text-slate-600">Corridor Progress: {Math.floor(vProg)}%</div>
                        </div>
                      </Popup>
                    </Marker>
                  )
                })()}
              </React.Fragment>
            )
          })}
        </MapContainer>
      </div>
    </div>
  )
}

function VehicleCard({ vehicle, onClick, onShowMap }) {
  const dot = COLOR_DOT[vehicle.color] || '#94a3b8'
  return (
    <div className="card rounded-xl p-4 cursor-pointer hover:border-blue-500/50 transition-all bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-start gap-3" onClick={() => onClick(vehicle)}>
        <div className="w-20 h-14 rounded-lg flex items-center justify-center flex-shrink-0 bg-slate-100 dark:bg-[#162438] border border-slate-200 dark:border-slate-800">
          <Car className="w-8 h-8 text-slate-500 dark:text-slate-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-blue-600 dark:text-blue-400 tracking-widest font-mono">{vehicle.plate}</span>
            {vehicle.flagged && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20">
                FLAGGED
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{vehicle.type}</span>
            <span className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
              <span className="w-3 h-3 rounded-full border border-slate-400 dark:border-slate-600" style={{ background: dot }} />
              {vehicle.color}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-1.5">
            <MapPin className="w-3 h-3 text-slate-400" />
            <span className="text-xs text-slate-500">{vehicle.lastLocation}</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span className="text-xs text-slate-500">{vehicle.lastSeen}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">{vehicle.sightings} sightings</span>
              <ConfidenceBadge value={vehicle.confidence} />
            </div>
          </div>
        </div>
      </div>
      {/* Map trajectory button */}
      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={(e) => { e.stopPropagation(); onShowMap(vehicle) }}
          className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
        >
          <MapIcon className="w-3.5 h-3.5" />
          Show Trajectory on Map
        </button>
      </div>
    </div>
  )
}

function VehicleDetail({ vehicle, onClose }) {
  const routeData = getVehicleRoute(vehicle.plate)
  const traj = routeData?.waypoints || []
  const { progress } = useVehicleTrajectoryProgress(vehicle.plate, routeData?.durationSec || 300)
  const livePosition = traj.length > 1 ? getInterpolatedPosition(traj, progress) : null

  return (
    <div className="slide-in-right fixed top-14 right-0 bottom-0 w-96 z-50 overflow-y-auto bg-white dark:bg-[#101C2D] border-l border-slate-200 dark:border-slate-800 shadow-xl">
      {/* Drawer Header */}
      <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#101C2D]/95 backdrop-blur z-10">
        <div>
          <div className="text-base font-bold text-blue-600 dark:text-blue-400 tracking-widest font-mono">{vehicle.plate}</div>
          <div className="text-xs text-slate-500">{vehicle.type} · {vehicle.color}</div>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Vehicle Info */}
        <div className="rounded-xl p-4 bg-slate-50 dark:bg-[#162438] border border-slate-200 dark:border-slate-800">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider mb-3">Vehicle Information</div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Plate', vehicle.plate],
              ['Type', vehicle.type],
              ['Color', vehicle.color],
              ['Total Sightings', vehicle.sightings],
              ['Last Camera', vehicle.lastCamera],
              ['Confidence', `${Math.round(vehicle.confidence * 100)}%`],
            ].map(([k, v]) => (
              <div key={k}>
                <div className="text-xs text-slate-500">{k}</div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-200">{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Animated Route Progression Corridor */}
        <div className="rounded-xl overflow-hidden">
          <RouteDisplay
            progress={progress}
            startLoc={routeData.startLoc}
            destLoc={routeData.destLoc}
            totalDistanceKm={routeData.totalDistanceKm}
            durationSec={routeData.durationSec}
            waypoints={traj}
          />
        </div>

        {/* Grayscale Leaflet Map Card in Drawer */}
        <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-[#101C2D]">
          <div className="px-3 py-2 bg-slate-50 dark:bg-[#162438] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider">Live Trajectory Map</div>
            <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 dark:text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 live-dot" />
              LIVE
            </span>
          </div>
          <div className="grayscale-map" style={{ height: '240px' }}>
            <MapContainer center={[18.52, 73.86]} zoom={12} style={{ height: '100%', width: '100%' }} zoomControl={false}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {traj.length > 0 && <MapFitBounds points={traj} />}
              {traj.length > 1 && (
                <Polyline
                  positions={traj.map(s => [s.lat, s.lng])}
                  pathOptions={{ color: '#3B82F6', weight: 3.5, opacity: 0.85 }}
                />
              )}
              {traj.map((s, i) => {
                const isOrigin = i === 0
                const isDest = i === traj.length - 1
                const checkpointThreshold = (i / Math.max(1, traj.length - 1)) * 100
                const isCleared = progress >= checkpointThreshold

                let icon
                if (isOrigin) icon = createOriginIcon()
                else if (isDest) icon = createDestIcon()
                else icon = createWaypointIcon('#3B82F6', i + 1, isCleared)

                return (
                  <Marker
                    key={i}
                    position={[s.lat, s.lng]}
                    icon={icon}
                  >
                    <Popup>
                      <div className="text-xs font-semibold">{s.camera}</div>
                      <div className="text-xs text-slate-500">{s.location || s.label}</div>
                      <div className="text-xs text-slate-400">{s.time}</div>
                    </Popup>
                  </Marker>
                )
              })}
              {livePosition && (
                <Marker
                  position={livePosition}
                  icon={createLiveVehicleIcon('#2563EB')}
                  zIndexOffset={1000}
                />
              )}
            </MapContainer>
          </div>
        </div>

        {/* Sighting Timeline */}
        <div className="rounded-xl p-4 bg-slate-50 dark:bg-[#162438] border border-slate-200 dark:border-slate-800">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider mb-3">Detection Timeline</div>
          <div className="relative">
            <div className="absolute left-3 top-0 bottom-0 w-px bg-slate-200 dark:bg-white/10" />
            <div className="space-y-4">
              {traj.map((s, i) => {
                const checkpointThreshold = (i / Math.max(1, traj.length - 1)) * 100
                const isCleared = progress >= checkpointThreshold
                return (
                  <div key={i} className="flex items-start gap-3 relative pl-8">
                    <div
                      className="absolute left-2 top-1 w-2.5 h-2.5 rounded-full border-2 flex-shrink-0 transition-colors duration-500"
                      style={{
                        background: isCleared ? '#10B981' : '#94A3B8',
                        borderColor: isCleared ? '#10B981' : '#cbd5e1',
                      }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-200">{s.location || s.label}</span>
                        <span className="text-xs text-slate-500">{s.time}</span>
                      </div>
                      <div className="text-xs text-slate-500">{s.camera} {s.speed ? `· ${s.speed}` : ''}</div>
                      <div className="text-xs font-medium mt-0.5" style={{ color: isCleared ? '#10B981' : '#64748B' }}>
                        {isCleared ? '✓ Cleared Checkpoint' : '⏳ En Route'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function VehicleSearch() {
  const [query, setQuery] = useState('')
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [filters, setFilters] = useState({ type: '', color: '' })
  const [mapMode, setMapMode] = useState(null) // null | 'single' | 'all'
  const [mapVehicle, setMapVehicle] = useState(null)

  const filtered = VEHICLES.filter(v =>
    (!query || v.plate.toLowerCase().includes(query.toLowerCase()) || v.type.toLowerCase().includes(query.toLowerCase()) || v.color.toLowerCase().includes(query.toLowerCase())) &&
    (!filters.type || v.type === filters.type) &&
    (!filters.color || v.color === filters.color)
  )

  const handleShowSingleMap = (vehicle) => {
    setMapVehicle(vehicle)
    setMapMode('single')
    setSelectedVehicle(null)
  }

  const handleShowAllMap = () => {
    setMapMode('all')
    setMapVehicle(null)
    setSelectedVehicle(null)
  }

  const closeMap = () => {
    setMapMode(null)
    setMapVehicle(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Vehicle Intelligence</h1>
          <p className="text-sm text-slate-500 mt-0.5">Search and investigate vehicles across all cameras</p>
        </div>
        {/* Show All Trajectories button */}
        <button
          onClick={mapMode === 'all' ? closeMap : handleShowAllMap}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all border ${
            mapMode === 'all'
              ? 'bg-blue-600 text-white border-blue-700'
              : 'bg-white dark:bg-[#101C2D] text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30 hover:bg-blue-50 dark:hover:bg-blue-500/10'
          }`}
        >
          {mapMode === 'all' ? <EyeOff className="w-4 h-4" /> : <MapIcon className="w-4 h-4" />}
          {mapMode === 'all' ? 'Hide All Trajectories' : 'Show All Trajectories'}
        </button>
      </div>

      {/* Trajectory Map Card Component */}
      {mapMode && (
        <div className="mb-2">
          <TrajectoryMapCard
            vehicles={filtered}
            singleVehicle={mapMode === 'single' ? mapVehicle : null}
            onClose={closeMap}
          />
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search vehicle number, type, colour, location or camera..."
          className="w-full pl-12 pr-10 py-3 text-sm rounded-xl outline-none bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 focus:border-blue-500 shadow-sm transition-colors"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        {['Vehicle Number', 'Vehicle Type', 'Colour', 'Time Range', 'Location', 'Camera'].map(f => (
          <button key={f} className="px-3 py-1.5 text-xs font-medium rounded-full bg-slate-100 dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all">
            {f}
          </button>
        ))}
        <select value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
          className="px-3 py-1.5 text-xs rounded-full outline-none bg-slate-100 dark:bg-[#162438] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
          <option value="">All Types</option>
          {['Sedan', 'SUV', 'Hatchback', 'Truck', 'Bus', 'Motorcycle'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Count */}
      <div className="text-sm text-slate-500">{filtered.length} vehicle{filtered.length !== 1 ? 's' : ''} found</div>

      {/* Results Grid */}
      <div className="grid grid-cols-2 gap-4">
        {filtered.map(v => (
          <VehicleCard
            key={v.plate}
            vehicle={v}
            onClick={setSelectedVehicle}
            onShowMap={handleShowSingleMap}
          />
        ))}
      </div>

      {/* Detail Drawer */}
      {selectedVehicle && (
        <VehicleDetail vehicle={selectedVehicle} onClose={() => setSelectedVehicle(null)} />
      )}
    </div>
  )
}
