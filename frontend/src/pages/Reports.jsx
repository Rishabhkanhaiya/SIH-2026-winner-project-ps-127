import React, { useState } from 'react'
import { FileText, Download, Clock, Loader, Calendar } from 'lucide-react'
import { REPORTS } from '../data/mockData'
import { StatusBadge } from '../components/StatusBadge'

const REPORT_TYPES = ['Traffic', 'Vehicles', 'ANPR', 'Incidents', 'Pedestrians', 'System Performance']
const ZONES = ['All Zones', 'Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E', 'Zone F']

const TYPE_COLORS = {
  Traffic: '#22D3EE', Vehicles: '#3B82F6', ANPR: '#22C55E',
  Incidents: '#EF4444', Pedestrians: '#F59E0B', System: '#A855F7',
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
        <h1 className="text-xl font-bold text-white">Reports</h1>
        <p className="text-sm text-slate-500 mt-0.5">Generate and download operational reports</p>
      </div>

      {/* Generator Panel */}
      <div className="rounded-xl p-6" style={{ background: '#101C2D', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="text-sm font-semibold text-white mb-4">Generate New Report</div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Date Range */}
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">Date Range</label>
            <div className="flex gap-2">
              <input type="date" defaultValue="2026-09-01" className="flex-1 px-3 py-2 text-sm rounded-lg outline-none"
                style={{ background: '#162438', border: '1px solid rgba(255,255,255,0.08)', color: '#94A3B8', colorScheme: 'dark' }} />
              <input type="date" defaultValue="2026-09-02" className="flex-1 px-3 py-2 text-sm rounded-lg outline-none"
                style={{ background: '#162438', border: '1px solid rgba(255,255,255,0.08)', color: '#94A3B8', colorScheme: 'dark' }} />
            </div>
          </div>
          {/* Zone */}
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">City Zone</label>
            <select value={zone} onChange={e => setZone(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg outline-none"
              style={{ background: '#162438', border: '1px solid rgba(255,255,255,0.08)', color: '#F8FAFC' }}>
              {ZONES.map(z => <option key={z}>{z}</option>)}
            </select>
          </div>
        </div>

        {/* Report Types */}
        <div>
          <label className="text-xs text-slate-500 mb-2 block">Report Type</label>
          <div className="grid grid-cols-6 gap-2 mb-4">
            {REPORT_TYPES.map(type => (
              <button key={type} onClick={() => setSelectedType(type)}
                className={`py-3 rounded-xl text-xs font-semibold transition-all ${selectedType === type ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                style={{
                  background: selectedType === type ? `${TYPE_COLORS[type]}20` : '#162438',
                  border: `1px solid ${selectedType === type ? TYPE_COLORS[type] + '50' : 'rgba(255,255,255,0.06)'}`,
                }}>
                {type}
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleGenerate} disabled={generating}
          className="px-8 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-70"
          style={{ background: generating || generated ? '#162438' : '#22D3EE', color: generating || generated ? '#94A3B8' : '#08111F' }}>
          {generating ? (
            <><Loader className="w-4 h-4 animate-spin" />Generating {selectedType} Report...</>
          ) : generated ? (
            <><Download className="w-4 h-4 text-green-400" /><span className="text-green-400">Download Report ↓</span></>
          ) : (
            <>Generate {selectedType} Report</>
          )}
        </button>
      </div>

      {/* Previous Reports */}
      <div>
        <div className="text-sm font-semibold text-white mb-3">Previous Reports</div>
        <div className="rounded-xl overflow-hidden" style={{ background: '#101C2D', border: '1px solid rgba(255,255,255,0.06)' }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Report Name', 'Type', 'Date', 'Status', 'Size', 'Action'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {REPORTS.map(rep => (
                <tr key={rep.id} className="border-b hover:bg-white/2 transition-colors"
                  style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-600 flex-shrink-0" />
                      <span className="text-sm text-slate-200">{rep.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-1 rounded-full font-medium"
                      style={{ background: `${TYPE_COLORS[rep.type] || '#94A3B8'}15`, color: TYPE_COLORS[rep.type] || '#94A3B8' }}>
                      {rep.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">{rep.date}</td>
                  <td className="px-4 py-3"><StatusBadge status={rep.status} /></td>
                  <td className="px-4 py-3 text-xs text-slate-500">{rep.size || '—'}</td>
                  <td className="px-4 py-3">
                    {rep.status === 'ready' && (
                      <button className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
                        <Download className="w-3.5 h-3.5" />Download
                      </button>
                    )}
                    {rep.status === 'generating' && (
                      <div className="flex items-center gap-1 text-xs text-blue-400">
                        <Loader className="w-3.5 h-3.5 animate-spin" />Processing...
                      </div>
                    )}
                    {rep.status === 'scheduled' && (
                      <span className="text-xs text-slate-600">Scheduled</span>
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
