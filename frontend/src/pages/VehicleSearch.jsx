import React, { useState, useEffect } from 'react'
import { Search, Car, MapPin, Clock, ArrowRight, X, Map, Eye, EyeOff } from 'lucide-react'
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


// Per-vehicle mock trajectory coords (mapped to Pune camera positions)
const VEHICLE_TRAJECTORIES = {
  'MH12AB1234': [
    { camera: 'CAM-001', lat: 18.5196, lng: 73.8553, time: '09:12 AM', location: 'MG Road Junction' },
    { camera: 'CAM-004', lat: 18.5308, lng: 73.8474, time: '09:28 AM', location: 'Shivajinagar Circle' },
    { camera: 'CAM-003', lat: 18.5016, lng: 73.8577, time: '09:45 AM', location: 'Swargate Junction' },
  ],
  'DL01AB2345': [
    { camera: 'CAM-007', lat: 18.5590, lng: 73.7868, time: '09:00 AM', location: 'Baner Road' },
    { camera: 'CAM-010', lat: 18.5993, lng: 73.7617, time: '09:18 AM', location: 'Wakad Junction' },
    { camera: 'CAM-008', lat: 18.5912, lng: 73.7389, time: '09:40 AM', location: 'Hinjewadi IT Park' },
  ],
  'KA01CD3456': [
    { camera: 'CAM-002', lat: 18.5314, lng: 73.8446, time: '08:55 AM', location: 'FC Road Signal' },
    { camera: 'CAM-012', lat: 18.5197, lng: 73.8380, time: '09:10 AM', location: 'Deccan Gymkhana' },
  ],
  'MH14EF5678': [
    { camera: 'CAM-015', lat: 18.6298, lng: 73.7997, time: '08:00 AM', location: 'Pimpri Chowk' },
    { camera: 'CAM-016', lat: 18.6462, lng: 73.7940, time: '08:30 AM', location: 'Chinchwad Bridge' },
    { camera: 'CAM-010', lat: 18.5993, lng: 73.7617, time: '09:00 AM', location: 'Wakad Junction' },
  ],
  'UP32GH7890': [
    { camera: 'CAM-015', lat: 18.6298, lng: 73.7997, time: '08:15 AM', location: 'Pimpri Chowk' },
    { camera: 'CAM-005', lat: 18.5088, lng: 73.8064, time: '09:05 AM', location: 'Kothrud Depot' },
  ],
  'MH15IJ9012': [
    { camera: 'CAM-004', lat: 18.5308, lng: 73.8474, time: '09:30 AM', location: 'Shivajinagar Circle' },
    { camera: 'CAM-001', lat: 18.5196, lng: 73.8553, time: '09:48 AM', location: 'MG Road Junction' },
  ],
  'TN22KL3456': [
    { camera: 'CAM-011', lat: 18.5538, lng: 73.9416, time: '09:55 AM', location: 'Kharadi IT Hub' },
    { camera: 'CAM-019', lat: 18.5541, lng: 73.9512, time: '10:08 AM', location: 'Nagar Road Entry' },
  ],
  'MH14ZZ9999': [
    { camera: 'CAM-013', lat: 18.5617, lng: 73.8075, time: '08:20 AM', location: 'Aundh Market' },
    { camera: 'CAM-007', lat: 18.5590, lng: 73.7868, time: '08:48 AM', location: 'Baner Road Junction' },
    { camera: 'CAM-005', lat: 18.5088, lng: 73.8064, time: '09:20 AM', location: 'Kothrud Depot' },
  ],
}

const TRAJ_COLORS = ['#3B82F6','#EF4444','#22C55E','#F59E0B','#A855F7','#EC4899','#14B8A6','#F97316']

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

function createDotIcon(color) {
  return L.divIcon({
    html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>`,
    className: '',
    iconAnchor: [6, 6],
  })
}

function TrajectoryMap({ vehicles, singleVehicle }) {
  const allSightings = singleVehicle
    ? [{ vehicle: singleVehicle, sightings: VEHICLE_TRAJECTORIES[singleVehicle.plate] || [], color: TRAJ_COLORS[0] }]
    : vehicles.map((v, i) => ({ vehicle: v, sightings: VEHICLE_TRAJECTORIES[v.plate] || [], color: TRAJ_COLORS[i % TRAJ_COLORS.length] }))

  const allPoints = allSightings.flatMap(s => s.sightings)

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800" style={{ height: '400px' }}>
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
        {allSightings.map(({ vehicle, sightings, color }) => (
          <React.Fragment key={vehicle.plate}>
            {sightings.length > 1 && (
              <Polyline
                positions={sightings.map(s => [s.lat, s.lng])}
                pathOptions={{ color, weight: 3, opacity: 0.8, dashArray: null }}
              />
            )}
            {sightings.map((s, i) => (
              <Marker
                key={`${vehicle.plate}-${i}`}
                position={[s.lat, s.lng]}
                icon={createDotIcon(i === sightings.length - 1 ? color : '#94a3b8')}
              >
                <Popup>
                  <div className="text-xs font-semibold">{vehicle.plate}</div>
                  <div className="text-xs text-slate-500">{s.camera}</div>
                  <div className="text-xs text-slate-500">{s.location}</div>
                  <div className="text-xs text-slate-400">{s.time}</div>
                </Popup>
              </Marker>
            ))}
          </React.Fragment>
        ))}
      </MapContainer>
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
          <Map className="w-3.5 h-3.5" />
          Show Trajectory on Map
        </button>
      </div>
    </div>
  )
}

function VehicleDetail({ vehicle, onClose }) {
  const traj = VEHICLE_TRAJECTORIES[vehicle.plate] || VEHICLE_TRAJECTORY.sightings || []
  return (
    <div className="slide-in-right fixed top-14 right-0 bottom-0 w-96 z-50 overflow-y-auto bg-white dark:bg-[#101C2D] border-l border-slate-200 dark:border-slate-800 shadow-xl">
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

        {/* Movement Route */}
        <div className="rounded-xl p-4 bg-slate-50 dark:bg-[#162438] border border-slate-200 dark:border-slate-800">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider mb-3">Movement Route</div>
          <div className="flex items-center gap-1 flex-wrap">
            {traj.map((s, i) => (
              <React.Fragment key={i}>
                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                  i === traj.length - 1
                    ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30'
                    : 'bg-slate-200 dark:bg-white/5 text-slate-700 dark:text-slate-400'
                }`}>
                  {s.camera}
                </div>
                {i < traj.length - 1 && <ArrowRight className="w-3 h-3 text-slate-400 flex-shrink-0" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Trajectory Map */}
        <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
          <div className="px-3 py-2 bg-slate-50 dark:bg-[#162438] border-b border-slate-200 dark:border-slate-800">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider">Live Trajectory Map</div>
          </div>
          <div style={{ height: '220px' }}>
            <MapContainer center={[18.52, 73.86]} zoom={12} style={{ height: '100%', width: '100%' }} zoomControl={false}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {traj.length > 0 && <MapFitBounds points={traj} />}
              {traj.length > 1 && (
                <Polyline
                  positions={traj.map(s => [s.lat, s.lng])}
                  pathOptions={{ color: '#3B82F6', weight: 3, opacity: 0.85 }}
                />
              )}
              {traj.map((s, i) => (
                <Marker
                  key={i}
                  position={[s.lat, s.lng]}
                  icon={createDotIcon(i === traj.length - 1 ? '#3B82F6' : '#94a3b8')}
                >
                  <Popup>
                    <div className="text-xs font-semibold">{s.camera}</div>
                    <div className="text-xs text-slate-500">{s.location}</div>
                    <div className="text-xs text-slate-400">{s.time}</div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* Sighting Timeline */}
        <div className="rounded-xl p-4 bg-slate-50 dark:bg-[#162438] border border-slate-200 dark:border-slate-800">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider mb-3">Detection Timeline</div>
          <div className="relative">
            <div className="absolute left-3 top-0 bottom-0 w-px bg-slate-200 dark:bg-white/10" />
            <div className="space-y-4">
              {traj.map((s, i) => (
                <div key={i} className="flex items-start gap-3 relative pl-8">
                  <div className="absolute left-2 top-1 w-2.5 h-2.5 rounded-full border-2 flex-shrink-0"
                    style={{ background: i === traj.length - 1 ? '#2563EB' : '#94A3B8', borderColor: i === traj.length - 1 ? '#2563EB' : '#cbd5e1' }} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-200">{s.camera}</span>
                      <span className="text-xs text-slate-500">{s.time}</span>
                    </div>
                    <div className="text-xs text-slate-500">{s.location}</div>
                    <div className="text-xs text-green-600 dark:text-green-400 font-medium mt-0.5">
                      Confidence: {Math.round((s.confidence || vehicle.confidence) * 100)}%
                    </div>
                  </div>
                </div>
              ))}
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
          {mapMode === 'all' ? <EyeOff className="w-4 h-4" /> : <Map className="w-4 h-4" />}
          {mapMode === 'all' ? 'Hide All Trajectories' : 'Show All Trajectories'}
        </button>
      </div>

      {/* Map panel for all vehicles or single */}
      {mapMode && (
        <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101C2D]">
          <div className="px-4 py-3 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#162438]">
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                {mapMode === 'all' ? 'All Vehicle Trajectories' : `Trajectory: ${mapVehicle?.plate}`}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {mapMode === 'all' ? `${filtered.length} vehicles shown` : `${VEHICLE_TRAJECTORIES[mapVehicle?.plate]?.length || 0} camera sightings`}
              </div>
            </div>
            <button onClick={closeMap} className="w-7 h-7 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Color Legend for All */}
          {mapMode === 'all' && (
            <div className="px-4 py-2 flex flex-wrap gap-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#162438]">
              {filtered.map((v, i) => (
                <div key={v.plate} className="flex items-center gap-1.5 text-xs font-mono">
                  <div className="w-3 h-1.5 rounded-full" style={{ background: TRAJ_COLORS[i % TRAJ_COLORS.length] }} />
                  <span className="text-slate-600 dark:text-slate-400">{v.plate}</span>
                </div>
              ))}
            </div>
          )}

          <TrajectoryMap
            vehicles={filtered}
            singleVehicle={mapMode === 'single' ? mapVehicle : null}
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

      {/* Detail Panel */}
      {selectedVehicle && (
        <VehicleDetail vehicle={selectedVehicle} onClose={() => setSelectedVehicle(null)} />
      )}
    </div>
  )
}
