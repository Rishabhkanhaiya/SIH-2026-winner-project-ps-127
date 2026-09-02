import React, { useState } from 'react'
import { FileText, Download, Loader } from 'lucide-react'
import { REPORTS } from '../data/mockData'
import { StatusBadge } from '../components/StatusBadge'

const REPORT_TYPES = ['Traffic', 'Vehicles', 'ANPR', 'Incidents', 'Pedestrians', 'System Performance']
const ZONES = ['All Zones', 'Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E', 'Zone F']

const TYPE_COLORS = {
  Traffic: '#2563EB',
  Vehicles: '#3B82F6',
  ANPR: '#22C55E',
  Incidents: '#EF4444',
  Pedestrians: '#F59E0B',
  'System Performance': '#8B5CF6',
  System: '#8B5CF6',
}

export default function Reports() {
  const [selectedType, setSelectedType] = useState('Traffic')
  const [zone, setZone] = useState('All Zones')
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)

  const handleGenerate = () => {
    setGenerating(true)
    setGenerated(false)
    setTimeout(() => { setGenerating(false); setGenerated(true) }, 2500)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reports</h1>
        <p className="text-sm text-slate-500 mt-0.5">Generate and download operational reports</p>
      </div>

      {/* Generator Panel */}
      <div className="rounded-xl p-6 bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="text-sm font-bold text-slate-900 dark:text-white mb-4">Generate New Report</div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Date Range */}
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Date Range</label>
            <div className="flex gap-2">
              <input
                type="date"
                defaultValue="2026-09-01"
                className="flex-1 px-3 py-2 text-sm rounded-lg outline-none bg-slate-50 dark:bg-[#162438] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200"
              />
              <input
                type="date"
                defaultValue="2026-09-02"
                className="flex-1 px-3 py-2 text-sm rounded-lg outline-none bg-slate-50 dark:bg-[#162438] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200"
              />
            </div>
          </div>
          {/* Zone */}
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">City Zone</label>
            <select
              value={zone}
              onChange={e => setZone(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg outline-none bg-slate-50 dark:bg-[#162438] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200"
            >
              {ZONES.map(z => <option key={z}>{z}</option>)}
            </select>
          </div>
        </div>

        {/* Report Types */}
        <div>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 block">Report Type</label>
          <div className="grid grid-cols-6 gap-2 mb-4">
            {REPORT_TYPES.map(type => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`py-3 rounded-xl text-xs font-semibold transition-all ${
                  selectedType === type
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-[#162438] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="px-8 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-70 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
        >
          {generating ? (
            <><Loader className="w-4 h-4 animate-spin" />Generating {selectedType} Report...</>
          ) : generated ? (
            <><Download className="w-4 h-4 text-green-300" /><span className="text-white">Download Report ↓</span></>
          ) : (
            <>Generate {selectedType} Report</>
          )}
        </button>
      </div>

      {/* Previous Reports */}
      <div>
        <div className="text-sm font-bold text-slate-900 dark:text-white mb-3">Previous Reports</div>
        <div className="rounded-xl overflow-hidden bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#162438]/50">
                {['Report Name', 'Type', 'Date', 'Status', 'Size', 'Action'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {REPORTS.map(rep => (
                <tr key={rep.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-200">{rep.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs px-2.5 py-0.5 rounded-full font-semibold border"
                      style={{
                        background: `${TYPE_COLORS[rep.type] || '#2563EB'}15`,
                        color: TYPE_COLORS[rep.type] || '#2563EB',
                        borderColor: `${TYPE_COLORS[rep.type] || '#2563EB'}30`
                      }}
                    >
                      {rep.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{rep.date}</td>
                  <td className="px-4 py-3"><StatusBadge status={rep.status} /></td>
                  <td className="px-4 py-3 text-xs text-slate-500">{rep.size || '—'}</td>
                  <td className="px-4 py-3">
                    {rep.status === 'ready' && (
                      <button className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 font-semibold transition-colors">
                        <Download className="w-3.5 h-3.5" />Download
                      </button>
                    )}
                    {rep.status === 'generating' && (
                      <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                        <Loader className="w-3.5 h-3.5 animate-spin" />Processing...
                      </div>
                    )}
                    {rep.status === 'scheduled' && (
                      <span className="text-xs text-slate-400">Scheduled</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
