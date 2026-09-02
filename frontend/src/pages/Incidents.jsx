import React, { useState } from 'react'
import { AlertTriangle, Camera, MapPin, Clock, User, CheckCircle, Eye } from 'lucide-react'
import { INCIDENTS } from '../data/mockData'
import { PriorityBadge, StatusBadge, ConfidenceBadge } from '../components/StatusBadge'

const TABS = ['active', 'investigating', 'resolved']

const INCIDENT_ICONS = {
  'Wrong-way Vehicle': '🚗',
  'Unauthorized Entry': '🚷',
  'Crowd Gathering': '👥',
  'Abandoned Vehicle': '🚙',
  'Speeding Vehicle': '💨',
  'Traffic Accident': '💥',
  'Blacklist Match': '🔴',
  'Signal Jump': '🚦',
  'Road Blockage': '🚧',
  'Pedestrian Safety': '🚶',
}

function IncidentCard({ incident }) {
  const [resolved, setResolved] = useState(false)
  const borderColor = incident.priority === 'HIGH' ? 'rgba(239,68,68,0.3)' : incident.priority === 'MEDIUM' ? 'rgba(245,158,11,0.3)' : 'rgba(59,130,246,0.3)'
  const topGlow = incident.priority === 'HIGH' ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.04)'

  return (
    <div className="rounded-xl overflow-hidden transition-all"
      style={{ border: `1px solid ${borderColor}`, background: `linear-gradient(180deg, ${topGlow}, #101C2D 60%)` }}>
      {/* Thumbnail */}
      <div className="h-28 relative flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #0d1a2b, #0a1420)' }}>
        <span className="text-4xl">{INCIDENT_ICONS[incident.type] || '⚠️'}</span>
        <div className="absolute top-3 left-3">
          <PriorityBadge priority={incident.priority} />
        </div>
        <div className="absolute top-3 right-3">
          <ConfidenceBadge value={incident.ai_confidence} />
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="text-base font-bold text-white">{incident.type}</div>
        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
          <span className="flex items-center gap-1"><Camera className="w-3 h-3" />{incident.camera}</span>
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{incident.location}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
          <Clock className="w-3 h-3" />
          <span>Detected {incident.time}</span>
          {incident.assigned && <span className="ml-2 text-slate-600">· {incident.assigned}</span>}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-3 flex-wrap">
          {incident.status === 'active' && (
            <>
              <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-400 hover:bg-blue-400/10 transition-all"
                style={{ border: '1px solid rgba(59,130,246,0.25)' }}>Investigate</button>
              <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-400 hover:bg-amber-400/10 transition-all"
                style={{ border: '1px solid rgba(245,158,11,0.25)' }}>
                <User className="w-3 h-3 inline mr-1" />Assign
              </button>
              <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:bg-white/5 transition-all"
                style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                <Camera className="w-3 h-3 inline mr-1" />View Cam
              </button>
              <button onClick={() => setResolved(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-green-400 hover:bg-green-400/10 transition-all"
                style={{ border: '1px solid rgba(34,197,94,0.25)' }}>
                <CheckCircle className="w-3 h-3 inline mr-1" />Resolve
              </button>
            </>
          )}
          {incident.status === 'investigating' && (
            <>
              <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-400 hover:bg-blue-400/10 transition-all"
                style={{ border: '1px solid rgba(59,130,246,0.25)' }}>
                <Eye className="w-3 h-3 inline mr-1" />View Details
              </button>
              <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-green-400 hover:bg-green-400/10 transition-all"
                style={{ border: '1px solid rgba(34,197,94,0.25)' }}>Resolve</button>
            </>
          )}
          {incident.status === 'resolved' && (
            <div className="flex items-center gap-1 text-xs text-green-400">
              <CheckCircle className="w-3.5 h-3.5" />Resolved
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Incidents() {
  const [activeTab, setActiveTab] = useState('active')

  const filtered = INCIDENTS.filter(i => i.status === activeTab)
  const counts = { active: INCIDENTS.filter(i => i.status === 'active').length, investigating: INCIDENTS.filter(i => i.status === 'investigating').length, resolved: INCIDENTS.filter(i => i.status === 'resolved').length }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Incident Center</h1>
          <p className="text-sm text-slate-500 mt-0.5">AI-detected events requiring operator attention</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-red-400 px-3 py-1.5 rounded-lg"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertTriangle className="w-3.5 h-3.5" />
          {counts.active} active incidents
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: '#101C2D', border: '1px solid rgba(255,255,255,0.06)' }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all flex items-center gap-2 ${
              activeTab === tab ? 'text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
            style={{ background: activeTab === tab ? '#162438' : 'transparent' }}>
            {tab}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
              tab === 'active' ? 'bg-red-500/20 text-red-400' :
              tab === 'investigating' ? 'bg-amber-500/20 text-amber-400' :
              'bg-green-500/20 text-green-400'
            }`}>{counts[tab]}</span>
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-4">
        {filtered.map(inc => (
          <IncidentCard key={inc.id} incident={inc} />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-3 py-16 text-center text-slate-600">No {activeTab} incidents</div>
        )}
      </div>
    </div>
  )
}
