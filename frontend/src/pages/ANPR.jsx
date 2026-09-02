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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">ANPR — Number Plate Recognition</h1>
          <p className="text-sm text-slate-500 mt-0.5">Automatic Number Plate Recognition · All cameras · Live detection</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-400 font-semibold">
          <span className="w-2 h-2 rounded-full bg-green-500 live-dot" />
          <span>Live detection active</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setPage(1) }}
          placeholder="Search plate, camera, location..."
          className="w-full pl-10 pr-8 py-2.5 text-sm rounded-lg outline-none bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 shadow-sm"
        />
        {query && <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white"><X className="w-3.5 h-3.5" /></button>}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#162438]/50">
              {['Image', 'Plate Number', 'Type', 'Camera', 'Location', 'Time', 'Confidence', 'Status', 'Action'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {paginated.map((rec) => (
              <tr key={rec.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-white/5">
                <td className="px-4 py-3">
                  <div className="w-12 h-9 rounded flex items-center justify-center bg-slate-100 dark:bg-[#162438]">
                    <Car className="w-5 h-5 text-slate-500" />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-sm font-bold tracking-widest font-mono ${
                    rec.status === 'Blacklisted' || rec.status === 'Flagged'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-blue-600 dark:text-blue-400'
                  }`}>
                    {rec.plate}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{rec.type}</td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 font-mono">{rec.camera}</td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{rec.location}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{rec.time}</td>
                <td className="px-4 py-3"><ConfidenceBadge value={parseFloat(rec.confidence)} /></td>
                <td className="px-4 py-3"><StatusBadge status={rec.status} /></td>
                <td className="px-4 py-3">
                  <button className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 font-semibold transition-colors">View →</button>
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
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-xs rounded-lg disabled:opacity-30 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200"
          >
            ← Prev
          </button>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-xs rounded-lg disabled:opacity-30 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  )
}
