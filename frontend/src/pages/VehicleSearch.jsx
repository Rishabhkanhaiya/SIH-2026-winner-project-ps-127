import React, { useState } from 'react'
import { Search, Filter, Car, MapPin, Clock, Eye, ChevronRight, ArrowRight, X } from 'lucide-react'
import { VEHICLES, VEHICLE_TRAJECTORY, CAMERAS } from '../data/mockData'
import { ConfidenceBadge, StatusBadge } from '../components/StatusBadge'

const COLOR_DOT = { White: '#e2e8f0', Black: '#1e293b', Red: '#ef4444', Blue: '#3b82f6', Grey: '#94a3b8', Silver: '#cbd5e1', Yellow: '#fbbf24' }

function VehicleCard({ vehicle, onClick }) {
  const dot = COLOR_DOT[vehicle.color] || '#94a3b8'
  return (
    <div onClick={() => onClick(vehicle)}
      className="card rounded-xl p-4 cursor-pointer hover:border-cyan-400/30 transition-all"
      style={{ background: '#101C2D', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-start gap-3">
        {/* Vehicle image placeholder */}
        <div className="w-20 h-14 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: '#162438', border: '1px solid rgba(255,255,255,0.06)' }}>
          <Car className="w-8 h-8 text-slate-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-cyan-400 tracking-widest">{vehicle.plate}</span>
            {vehicle.flagged && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">FLAGGED</span>}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-slate-400">{vehicle.type}</span>
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <span className="w-3 h-3 rounded-full border border-slate-600" style={{ background: dot }} />
              {vehicle.color}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-1.5">
            <MapPin className="w-3 h-3 text-slate-600" />
            <span className="text-xs text-slate-500">{vehicle.lastLocation}</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-600" />
              <span className="text-xs text-slate-500">{vehicle.lastSeen}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">{vehicle.sightings} sightings</span>
              <ConfidenceBadge value={vehicle.confidence} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function VehicleDetail({ vehicle, onClose }) {
  const traj = VEHICLE_TRAJECTORY
  return (
    <div className="slide-in-right fixed top-14 right-0 bottom-0 w-96 z-50 overflow-y-auto"
      style={{ background: '#101C2D', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b z-10"
        style={{ background: '#101C2D', borderColor: 'rgba(255,255,255,0.08)' }}>
        <div>
          <div className="text-base font-bold text-cyan-400 tracking-widest">{vehicle.plate}</div>
          <div className="text-xs text-slate-500">{vehicle.type} · {vehicle.color}</div>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Vehicle Info */}
        <div className="rounded-xl p-4" style={{ background: '#162438', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Vehicle Information</div>
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
                <div className="text-xs text-slate-600">{k}</div>
                <div className="text-sm font-semibold text-slate-200">{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Movement Route */}
        <div className="rounded-xl p-4" style={{ background: '#162438', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Movement Route</div>
          <div className="flex items-center gap-1 flex-wrap">
            {traj.sightings.map((s, i) => (
              <React.Fragment key={i}>
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
                  style={{ background: i === traj.sightings.length - 1 ? 'rgba(34,211,238,0.15)' : 'rgba(255,255,255,0.06)', color: i === traj.sightings.length - 1 ? '#22D3EE' : '#94A3B8' }}>
                  {s.camera}
                </div>
                {i < traj.sightings.length - 1 && <ArrowRight className="w-3 h-3 text-slate-600 flex-shrink-0" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Sighting Timeline */}
        <div className="rounded-xl p-4" style={{ background: '#162438', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Detection Timeline</div>
          <div className="relative">
            <div className="absolute left-3 top-0 bottom-0 w-px bg-white/10" />
            <div className="space-y-4">
              {traj.sightings.map((s, i) => (
                <div key={i} className="flex items-start gap-3 relative pl-8">
                  <div className="absolute left-2 top-1 w-2 h-2 rounded-full border-2 flex-shrink-0"
                    style={{ background: i === traj.sightings.length - 1 ? '#22D3EE' : '#162438', borderColor: i === traj.sightings.length - 1 ? '#22D3EE' : '#334155' }} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-200">{s.camera}</span>
                      <span className="text-xs text-slate-500">{s.time}</span>
                    </div>
                    <div className="text-xs text-slate-500">{s.location}</div>
                    <div className="text-xs text-green-400 mt-0.5">Confidence: {Math.round(s.confidence * 100)}%</div>
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

  const filtered = VEHICLES.filter(v =>
    (!query || v.plate.toLowerCase().includes(query.toLowerCase()) || v.type.toLowerCase().includes(query.toLowerCase()) || v.color.toLowerCase().includes(query.toLowerCase())) &&
    (!filters.type || v.type === filters.type) &&
    (!filters.color || v.color === filters.color)
  )

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white">Vehicle Intelligence</h1>
        <p className="text-sm text-slate-500 mt-0.5">Search and investigate vehicles across all cameras</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search vehicle number, type, colour, location or camera..."
          className="w-full pl-12 pr-6 py-3.5 text-sm rounded-xl outline-none"
          style={{ background: '#101C2D', border: '1px solid rgba(255,255,255,0.10)', color: '#F8FAFC', fontSize: '15px' }}
          onFocus={e => e.target.style.borderColor = '#22D3EE'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.10)'}
        />
        {query && <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['Vehicle Number', 'Vehicle Type', 'Colour', 'Time Range', 'Location', 'Camera'].map(f => (
          <button key={f} className="px-3 py-1.5 text-xs rounded-full text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            {f}
          </button>
        ))}
        <select value={filters.type} onChange={e => setFilters(f => ({...f, type: e.target.value}))}
          className="px-3 py-1.5 text-xs rounded-full outline-none"
          style={{ background: '#162438', border: '1px solid rgba(255,255,255,0.08)', color: '#94A3B8' }}>
          <option value="">All Types</option>
          {['Sedan','SUV','Hatchback','Truck','Bus','Motorcycle'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Count */}
      <div className="text-sm text-slate-500">{filtered.length} vehicle{filtered.length !== 1 ? 's' : ''} found</div>

      {/* Results */}
      <div className="grid grid-cols-2 gap-4">
        {filtered.map(v => (
          <VehicleCard key={v.plate} vehicle={v} onClick={setSelectedVehicle} />
        ))}
      </div>

      {/* Detail Panel */}
      {selectedVehicle && (
        <VehicleDetail vehicle={selectedVehicle} onClose={() => setSelectedVehicle(null)} />
      )}
    </div>
  )
}
