import React, { useState } from 'react'
import { AlertTriangle, Camera, MapPin, Clock, User, CheckCircle, Eye } from 'lucide-react'
import { INCIDENTS } from '../data/mockData'
import { PriorityBadge, ConfidenceBadge } from '../components/StatusBadge'

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
  const isHigh = incident.priority === 'HIGH'
  const isMed = incident.priority === 'MEDIUM'
  const borderStripe = isHigh ? 'border-l-red-500' : isMed ? 'border-l-amber-500' : 'border-l-blue-500'

  return (
    <div className={`rounded-xl overflow-hidden transition-all bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 border-l-4 ${borderStripe} shadow-sm`}>
      {/* Thumbnail */}
      <div className="h-28 relative flex items-center justify-center bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
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
        <div className="text-base font-bold text-slate-900 dark:text-white">{incident.type}</div>
        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
          <span className="flex items-center gap-1"><Camera className="w-3 h-3" />{incident.camera}</span>
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{incident.location}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
          <Clock className="w-3 h-3" />
          <span>Detected {incident.time}</span>
          {incident.assigned && <span className="ml-2 text-slate-400">· {incident.assigned}</span>}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-3 flex-wrap">
          {incident.status === 'active' && !resolved && (
            <>
              <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/25 hover:bg-blue-100 transition-all">
                Investigate
              </button>
              <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/25 hover:bg-amber-100 transition-all">
                <User className="w-3 h-3 inline mr-1" />Assign
              </button>
              <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 transition-all">
                <Camera className="w-3 h-3 inline mr-1" />View Cam
              </button>
              <button
                onClick={() => setResolved(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/25 hover:bg-green-100 transition-all"
              >
                <CheckCircle className="w-3 h-3 inline mr-1" />Resolve
              </button>
            </>
          )}
          {(incident.status === 'investigating' && !resolved) && (
            <>
              <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/25 hover:bg-blue-100 transition-all">
                <Eye className="w-3 h-3 inline mr-1" />View Details
              </button>
              <button
                onClick={() => setResolved(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/25 hover:bg-green-100 transition-all"
              >
                Resolve
              </button>
            </>
          )}
          {(incident.status === 'resolved' || resolved) && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 px-2.5 py-1 rounded-md">
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
  const counts = {
    active: INCIDENTS.filter(i => i.status === 'active').length,
    investigating: INCIDENTS.filter(i => i.status === 'investigating').length,
    resolved: INCIDENTS.filter(i => i.status === 'resolved').length
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Incident Center</h1>
          <p className="text-sm text-slate-500 mt-0.5">AI-detected events requiring operator attention</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-red-700 dark:text-red-400 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
          <AlertTriangle className="w-3.5 h-3.5" />
          {counts.active} active incidents
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit bg-slate-100 dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all flex items-center gap-2 ${
              activeTab === tab
                ? 'bg-white dark:bg-[#162438] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {tab}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
              tab === 'active' ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400' :
              tab === 'investigating' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400' :
              'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400'
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
          <div className="col-span-3 py-16 text-center text-slate-500">No {activeTab} incidents</div>
        )}
      </div>
    </div>
  )
}
