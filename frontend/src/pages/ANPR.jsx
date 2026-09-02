import React, { useState } from 'react'
import { Search, Car, X } from 'lucide-react'
import { ANPR_RECORDS } from '../data/mockData'
import { StatusBadge, ConfidenceBadge } from '../components/StatusBadge'

export default function ANPR() {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const PER_PAGE = 15

  const filtered = ANPR_RECORDS.filter(r =>
    !query || r.plate.toLowerCase().includes(query.toLowerCase()) ||
    r.camera.toLowerCase().includes(query.toLowerCase()) ||
    r.location.toLowerCase().includes(query.toLowerCase())
  )
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const totalPages = Math.ceil(filtered.length / PER_PAGE)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">ANPR — Number Plate Recognition</h1>
          <p className="text-sm text-slate-500 mt-0.5">Automatic Number Plate Recognition · All cameras · Live detection</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
          style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.15)' }}>
          <span className="w-2 h-2 rounded-full bg-cyan-400 live-dot" />
          <span className="text-cyan-400">Live detection active</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setPage(1) }}
          placeholder="Search plate, camera, location..."
          className="w-full pl-10 pr-8 py-2.5 text-sm rounded-lg outline-none"
          style={{ background: '#101C2D', border: '1px solid rgba(255,255,255,0.08)', color: '#F8FAFC' }}
        />
        {query && <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"><X className="w-3.5 h-3.5" /></button>}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#101C2D', border: '1px solid rgba(255,255,255,0.06)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Image','Plate Number','Type','Camera','Location','Time','Confidence','Status','Action'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((rec, i) => (
              <tr key={rec.id} className="transition-colors hover:bg-white/3 border-b"
                style={{ borderColor: 'rgba(255,255,255,0.03)' }}>
                <td className="px-4 py-3">
                  <div className="w-12 h-9 rounded flex items-center justify-center" style={{ background: '#162438' }}>
                    <Car className="w-5 h-5 text-slate-600" />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm font-bold tracking-widest" style={{ color: rec.status === 'Blacklisted' ? '#EF4444' : rec.status === 'Flagged' ? '#F59E0B' : '#22D3EE' }}>
                    {rec.plate}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-400">{rec.type}</td>
                <td className="px-4 py-3 text-sm text-slate-400 font-mono">{rec.camera}</td>
                <td className="px-4 py-3 text-sm text-slate-400">{rec.location}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{rec.time}</td>
                <td className="px-4 py-3"><ConfidenceBadge value={parseFloat(rec.confidence)} /></td>
                <td className="px-4 py-3"><StatusBadge status={rec.status} /></td>
                <td className="px-4 py-3">
                  <button className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors font-medium">View →</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">{filtered.length} records · Page {page} of {totalPages}</span>
        <div className="flex gap-2">
          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
            className="px-3 py-1.5 text-xs rounded-lg disabled:opacity-30 hover:bg-white/5 transition-all text-slate-400"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}>← Prev</button>
          <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
            className="px-3 py-1.5 text-xs rounded-lg disabled:opacity-30 hover:bg-white/5 transition-all text-slate-400"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}>Next →</button>
        </div>
      </div>
    </div>
  )
}
