import React, { useState } from 'react'
import {
  AlertTriangle, Bell, ShieldAlert, PlusCircle, Filter, CheckCircle,
  Eye, Camera, MapPin, Clock, User, Search, X, ShieldCheck,
  AlertOctagon, ArrowUpRight, Car, Shield, ChevronRight, Check
} from 'lucide-react'
import { INCIDENTS, ALERTS, BLACKLIST, CAMERAS } from '../data/mockData'
import { SeverityBadge, PriorityBadge, ConfidenceBadge, StatusBadge } from '../components/StatusBadge'
import { formatDistanceToNow } from 'date-fns'

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

const INCIDENT_TYPES = [
  'Wrong-way Vehicle',
  'Unauthorized Entry',
  'Crowd Gathering',
  'Abandoned Vehicle',
  'Speeding Vehicle',
  'Traffic Accident',
  'Blacklist Match',
  'Signal Jump',
  'Road Blockage',
  'Pedestrian Safety',
]

const OFFICERS = [
  'Officer Kumar',
  'Officer Singh',
  'Officer Patil',
  'Inspector Joshi',
  'Traffic Control',
  'Dispatcher Team A'
]

export default function IncidentFlagging() {
  // Navigation tabs: 'incidents' | 'alerts' | 'watchlist'
  const [mainTab, setMainTab] = useState('incidents')
  
  // Data states
  const [incidents, setIncidents] = useState(INCIDENTS)
  const [alerts, setAlerts] = useState(ALERTS)
  const [watchlist, setWatchlist] = useState(BLACKLIST)

  // Incident filters
  const [incidentStatusFilter, setIncidentStatusFilter] = useState('active')
  const [incidentPriorityFilter, setIncidentPriorityFilter] = useState('ALL')
  const [incidentSearch, setIncidentSearch] = useState('')

  // Alert filters
  const [alertSeverityFilter, setAlertSeverityFilter] = useState('All')
  const [alertSearch, setAlertSearch] = useState('')

  // Flag Modal state
  const [isFlagModalOpen, setIsFlagModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    type: 'Traffic Accident',
    camera: 'CAM-001',
    location: 'MG Road Junction',
    priority: 'HIGH',
    assigned: 'Officer Kumar',
    description: '',
  })

  // Selected incident for detail view
  const [selectedIncident, setSelectedIncident] = useState(null)

  // Calculate live counts for summary KPIs
  const activeCount = incidents.filter(i => i.status === 'active').length
  const investigatingCount = incidents.filter(i => i.status === 'investigating').length
  const resolvedCount = incidents.filter(i => i.status === 'resolved').length
  const criticalAlertsCount = alerts.filter(a => a.severity === 'critical' && a.status === 'new').length
  const unackAlertsCount = alerts.filter(a => a.status === 'new').length

  // Filtered incidents
  const filteredIncidents = incidents.filter(i => {
    const matchesStatus = incidentStatusFilter === 'all' || i.status === incidentStatusFilter
    const matchesPriority = incidentPriorityFilter === 'ALL' || i.priority === incidentPriorityFilter
    const matchesSearch = incidentSearch === '' ||
      i.type.toLowerCase().includes(incidentSearch.toLowerCase()) ||
      i.location.toLowerCase().includes(incidentSearch.toLowerCase()) ||
      i.camera.toLowerCase().includes(incidentSearch.toLowerCase()) ||
      (i.assigned && i.assigned.toLowerCase().includes(incidentSearch.toLowerCase()))
    return matchesStatus && matchesPriority && matchesSearch
  })

  // Filtered alerts
  const filteredAlerts = alerts.filter(a => {
    const matchesSeverity = alertSeverityFilter === 'All' ||
      (alertSeverityFilter === 'Critical' && a.severity === 'critical') ||
      (alertSeverityFilter === 'Warning' && a.severity === 'warning') ||
      (alertSeverityFilter === 'Info' && a.severity === 'info')
    const matchesSearch = alertSearch === '' ||
      a.event.toLowerCase().includes(alertSearch.toLowerCase()) ||
      a.location.toLowerCase().includes(alertSearch.toLowerCase()) ||
      a.camera.toLowerCase().includes(alertSearch.toLowerCase()) ||
      (a.plate && a.plate.toLowerCase().includes(alertSearch.toLowerCase()))
    return matchesSeverity && matchesSearch
  })

  // Handlers
  const handleAcknowledgeAlert = (id) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'acknowledged' } : a))
  }

  const handleEscalateAlert = (alert) => {
    // Check if not already an incident
    const newInc = {
      id: Date.now(),
      type: alert.event.includes('Speeding') ? 'Speeding Vehicle' :
            alert.event.includes('Wrong-way') ? 'Wrong-way Vehicle' :
            alert.event.includes('crowd') ? 'Crowd Gathering' :
            alert.event.includes('Blacklist') ? 'Blacklist Match' :
            alert.event.includes('red light') ? 'Signal Jump' : 'Traffic Accident',
      priority: alert.severity === 'critical' ? 'HIGH' : 'MEDIUM',
      camera: alert.camera,
      location: alert.location,
      lat: 18.5204,
      lng: 73.8567,
      status: 'active',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      confidence: 0.95,
      assigned: 'Officer Kumar',
      description: `Escalated from live alert stream: ${alert.event} (Plate: ${alert.plate || 'N/A'})`,
    }
    setIncidents(prev => [newInc, ...prev])
    setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, status: 'acknowledged' } : a))
    setMainTab('incidents')
    setIncidentStatusFilter('active')
  }

  const handleStatusChange = (id, newStatus) => {
    setIncidents(prev => prev.map(inc => inc.id === id ? { ...inc, status: newStatus } : inc))
    if (selectedIncident && selectedIncident.id === id) {
      setSelectedIncident(prev => ({ ...prev, status: newStatus }))
    }
  }

  const handleAssignOfficer = (id, officer) => {
    setIncidents(prev => prev.map(inc => inc.id === id ? { ...inc, assigned: officer, status: inc.status === 'active' ? 'investigating' : inc.status } : inc))
  }

  const handleCameraChange = (camId) => {
    const cam = CAMERAS.find(c => c.id === camId)
    setFormData(prev => ({
      ...prev,
      camera: camId,
      location: cam ? cam.name : prev.location
    }))
  }

  const handleCreateIncidentSubmit = (e) => {
    e.preventDefault()
    if (!formData.description.trim()) {
      alert('Please enter a brief description for this incident.')
      return
    }

    const newIncident = {
      id: Date.now(),
      type: formData.type,
      priority: formData.priority,
      camera: formData.camera,
      location: formData.location,
      lat: 18.5204,
      lng: 73.8567,
      status: 'active',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      confidence: 0.99,
      assigned: formData.assigned,
      description: formData.description.trim(),
    }

    setIncidents(prev => [newIncident, ...prev])
    setIsFlagModalOpen(false)
    setFormData({
      type: 'Traffic Accident',
      camera: 'CAM-001',
      location: 'MG Road Junction',
      priority: 'HIGH',
      assigned: 'Officer Kumar',
      description: '',
    })
    setMainTab('incidents')
    setIncidentStatusFilter('active')
  }

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Incident Flagging & Alerts</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400">
              Live Control
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time incident response, alert triage, and security watchlist monitoring
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={() => setIsFlagModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold shadow-sm transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Flag New Incident</span>
        </button>
      </div>

      {/* KPI Metrics Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl p-4 bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Incidents</span>
            <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2">{activeCount}</div>
          <div className="text-xs text-slate-500 mt-1">Requires immediate action</div>
        </div>

        <div className="rounded-xl p-4 bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Critical Alerts</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">{criticalAlertsCount}</div>
          <div className="text-xs text-slate-500 mt-1">{unackAlertsCount} total pending triage</div>
        </div>

        <div className="rounded-xl p-4 bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Under Investigation</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">{investigatingCount}</div>
          <div className="text-xs text-slate-500 mt-1">Officers deployed on-site</div>
        </div>

        <div className="rounded-xl p-4 bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Resolved Today</span>
            <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">{resolvedCount}</div>
          <div className="text-xs text-slate-500 mt-1">Case closed successfully</div>
        </div>
      </div>

      {/* Main Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setMainTab('incidents')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              mainTab === 'incidents'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white dark:bg-[#101C2D] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Incident Center</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
              mainTab === 'incidents' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}>
              {incidents.length}
            </span>
          </button>

          <button
            onClick={() => setMainTab('alerts')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              mainTab === 'alerts'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white dark:bg-[#101C2D] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Live Alert Stream</span>
            {unackAlertsCount > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                mainTab === 'alerts' ? 'bg-red-500 text-white' : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
              }`}>
                {unackAlertsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setMainTab('watchlist')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              mainTab === 'watchlist'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white dark:bg-[#101C2D] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Flagged Watchlist</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
              mainTab === 'watchlist' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}>
              {watchlist.length}
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: INCIDENT CENTER */}
      {mainTab === 'incidents' && (
        <div className="space-y-4">
          
          {/* Sub-filters for incidents */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white dark:bg-[#101C2D] p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            {/* Status pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'active', label: 'Active', count: activeCount, color: 'text-red-600 dark:text-red-400' },
                { id: 'investigating', label: 'Investigating', count: investigatingCount, color: 'text-amber-600 dark:text-amber-400' },
                { id: 'resolved', label: 'Resolved', count: resolvedCount, color: 'text-green-600 dark:text-green-400' },
                { id: 'all', label: 'All Incidents', count: incidents.length, color: 'text-slate-600 dark:text-slate-300' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setIncidentStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all flex items-center gap-1.5 ${
                    incidentStatusFilter === tab.id
                      ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-slate-800/50'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[11px] font-bold ${tab.color}`}>({tab.count})</span>
                </button>
              ))}
            </div>

            {/* Priority filter and Search */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-500 font-medium">Priority:</span>
                {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map(p => (
                  <button
                    key={p}
                    onClick={() => setIncidentPriorityFilter(p)}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                      incidentPriorityFilter === p
                        ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 font-bold'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter incidents..."
                  value={incidentSearch}
                  onChange={(e) => setIncidentSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-[#08111F] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 outline-none w-44 focus:w-56 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Incident Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredIncidents.map(inc => {
              const isHigh = inc.priority === 'HIGH'
              const isMed = inc.priority === 'MEDIUM'
              const borderStripe = isHigh ? 'border-l-red-500' : isMed ? 'border-l-amber-500' : 'border-l-blue-500'

              return (
                <div
                  key={inc.id}
                  className={`rounded-xl overflow-hidden transition-all bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 border-l-4 ${borderStripe} shadow-sm flex flex-col justify-between`}
                >
                  <div>
                    {/* Header Thumbnail / Emoji */}
                    <div className="h-24 relative flex items-center justify-center bg-slate-50 dark:bg-[#0c1624] border-b border-slate-200 dark:border-slate-800/80">
                      <span className="text-3xl">{INCIDENT_ICONS[inc.type] || '⚠️'}</span>
                      <div className="absolute top-2.5 left-2.5">
                        <PriorityBadge priority={inc.priority} />
                      </div>
                      <div className="absolute top-2.5 right-2.5">
                        <ConfidenceBadge value={inc.confidence || 0.95} />
                      </div>
                      <div className="absolute bottom-1.5 right-2.5">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          inc.status === 'active' ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400' :
                          inc.status === 'investigating' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400' :
                          'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400'
                        }`}>
                          {inc.status}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-2.5">
                      <div>
                        <div className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                          {inc.type}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                          {inc.description}
                        </p>
                      </div>

                      <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1"><Camera className="w-3 h-3 text-slate-400" />{inc.camera}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-slate-400" />{inc.time}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3 text-slate-400" />{inc.location}</span>
                          {inc.assigned && (
                            <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                              <User className="w-3 h-3" />{inc.assigned}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="p-3 bg-slate-50/70 dark:bg-[#0c1624]/60 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-1.5">
                    {inc.status === 'active' && (
                      <>
                        <button
                          onClick={() => handleStatusChange(inc.id, 'investigating')}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/25 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all"
                        >
                          Investigate
                        </button>
                        <button
                          onClick={() => {
                            const nextOfficer = OFFICERS[(inc.id % OFFICERS.length)]
                            handleAssignOfficer(inc.id, nextOfficer)
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/25 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-all"
                        >
                          <User className="w-3 h-3 inline mr-1" />
                          {inc.assigned ? 'Reassign' : 'Assign'}
                        </button>
                        <button
                          onClick={() => handleStatusChange(inc.id, 'resolved')}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/25 hover:bg-green-100 dark:hover:bg-green-500/20 transition-all"
                        >
                          <Check className="w-3 h-3 inline mr-1" />Resolve
                        </button>
                      </>
                    )}

                    {inc.status === 'investigating' && (
                      <>
                        <button
                          onClick={() => setSelectedIncident(inc)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/25 hover:bg-blue-100 transition-all"
                        >
                          <Eye className="w-3 h-3 inline mr-1" />View Details
                        </button>
                        <button
                          onClick={() => handleStatusChange(inc.id, 'resolved')}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/25 hover:bg-green-100 transition-all"
                        >
                          <CheckCircle className="w-3 h-3 inline mr-1" />Mark Resolved
                        </button>
                      </>
                    )}

                    {inc.status === 'resolved' && (
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-1 text-xs font-semibold text-green-700 dark:text-green-400">
                          <CheckCircle className="w-3.5 h-3.5" />Case Resolved
                        </div>
                        <button
                          onClick={() => handleStatusChange(inc.id, 'active')}
                          className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline"
                        >
                          Reopen
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {filteredIncidents.length === 0 && (
            <div className="rounded-xl p-12 text-center bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 text-slate-500">
              <ShieldCheck className="w-10 h-10 mx-auto text-green-500 mb-2 opacity-80" />
              <div className="text-base font-bold text-slate-800 dark:text-slate-200">No Incidents Found</div>
              <p className="text-xs text-slate-500 mt-1">There are no incidents matching your active filters</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LIVE ALERT STREAM */}
      {mainTab === 'alerts' && (
        <div className="space-y-4">
          
          {/* Severity filters and search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#101C2D] p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              {['All', 'Critical', 'Warning', 'Info'].map(sev => (
                <button
                  key={sev}
                  onClick={() => setAlertSeverityFilter(sev)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    alertSeverityFilter === sev
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search alerts or plates..."
                value={alertSearch}
                onChange={(e) => setAlertSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-[#08111F] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 outline-none w-56 focus:w-64 transition-all"
              />
            </div>
          </div>

          {/* Alert Table Feed */}
          <div className="rounded-xl overflow-hidden bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#162438]/50">
                  <th className="px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Severity</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Trigger Event</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Camera ID</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Location</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Time</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredAlerts.map(alert => (
                  <tr
                    key={alert.id}
                    className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <SeverityBadge severity={alert.severity} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-200">{alert.event}</div>
                      {alert.plate && (
                        <div className="text-xs text-blue-600 dark:text-blue-400 font-mono mt-0.5">
                          Plate: <span className="font-bold">{alert.plate}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 font-mono">
                      {alert.camera}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                      {alert.location}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                        {typeof alert.timestamp === 'object' ? formatDistanceToNow(alert.timestamp, { addSuffix: true }) : 'Just now'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {typeof alert.timestamp === 'object' ? alert.timestamp.toLocaleTimeString() : '10:45 AM'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={alert.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {alert.status === 'new' && (
                          <button
                            onClick={() => handleAcknowledgeAlert(alert.id)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/25 hover:bg-green-100 transition-all"
                            title="Acknowledge Alert"
                          >
                            <CheckCircle className="w-3 h-3" />
                            <span>Ack</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleEscalateAlert(alert)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/25 hover:bg-red-100 transition-all"
                          title="Escalate Alert to Tracked Incident"
                        >
                          <ArrowUpRight className="w-3 h-3" />
                          <span>Flag Incident</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredAlerts.length === 0 && (
              <div className="py-12 text-center text-slate-500 text-sm">
                No alerts matching the selected criteria.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: FLAGGED WATCHLIST */}
      {mainTab === 'watchlist' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#101C2D] p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Flagged Vehicles & Plates Watchlist</h2>
              <p className="text-xs text-slate-500 mt-0.5">Vehicles blacklisted for traffic infractions, unpaid warrants, or criminal investigations</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 text-xs font-semibold border border-red-200 dark:border-red-500/20">
              <AlertOctagon className="w-4 h-4" />
              <span>{watchlist.length} Active Warrants</span>
            </div>
          </div>

          <div className="rounded-xl overflow-hidden bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#162438]/50">
                  <th className="px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">License Plate</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Flag Reason</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Authorizing Officer</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Added Date</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {watchlist.map(item => (
                  <tr key={item.plate} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                      <Car className="w-4 h-4 text-slate-400" />
                      {item.plate}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-200">
                      {item.reason}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                      {item.addedBy}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {item.addedAt}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400">
                        Active Alert
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          const newInc = {
                            id: Date.now(),
                            type: 'Blacklist Match',
                            priority: 'HIGH',
                            camera: 'CAM-007',
                            location: 'Baner Road Junction',
                            lat: 18.5590,
                            lng: 73.7868,
                            status: 'active',
                            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            confidence: 0.98,
                            assigned: item.addedBy,
                            description: `Flagged Vehicle Watchlist Intercept: Plate ${item.plate} detected. Reason: ${item.reason}`,
                          }
                          setIncidents(prev => [newInc, ...prev])
                          setMainTab('incidents')
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/25 hover:bg-blue-100 transition-all"
                      >
                        Trigger Intercept
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: FLAG NEW INCIDENT */}
      {isFlagModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-[#162438]/50">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Flag New Incident</h3>
              </div>
              <button
                onClick={() => setIsFlagModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateIncidentSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Incident Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-[#08111F] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                  >
                    {INCIDENT_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Priority Level
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-[#08111F] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 font-semibold"
                  >
                    <option value="HIGH">HIGH (Immediate Response)</option>
                    <option value="MEDIUM">MEDIUM (Standard Priority)</option>
                    <option value="LOW">LOW (Informational)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Source Camera
                  </label>
                  <select
                    value={formData.camera}
                    onChange={(e) => handleCameraChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-[#08111F] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                  >
                    {CAMERAS.map(c => (
                      <option key={c.id} value={c.id}>{c.id} — {c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Assign Officer
                  </label>
                  <select
                    value={formData.assigned}
                    onChange={(e) => setFormData(prev => ({ ...prev, assigned: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-[#08111F] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                  >
                    {OFFICERS.map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Location / Intersection
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-[#08111F] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Incident Description & Notes
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Provide operator observations, license plates, suspected safety hazard..."
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-[#08111F] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 placeholder-slate-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFlagModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm"
                >
                  Create & Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: INCIDENT DETAIL */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{INCIDENT_ICONS[selectedIncident.type] || '⚠️'}</span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{selectedIncident.type}</h3>
                  <div className="text-xs text-slate-500">ID: #{selectedIncident.id}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedIncident(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Priority:</span>
                <PriorityBadge priority={selectedIncident.priority} />
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Status:</span>
                <span className="font-bold uppercase text-blue-600 dark:text-blue-400">{selectedIncident.status}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Camera / Location:</span>
                <span className="font-medium text-slate-900 dark:text-white">{selectedIncident.camera} — {selectedIncident.location}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Assigned Officer:</span>
                <span className="font-medium text-slate-900 dark:text-white">{selectedIncident.assigned || 'Unassigned'}</span>
              </div>
              <div className="pt-2">
                <span className="text-slate-500 block mb-1">Details:</span>
                <p className="p-3 rounded-lg bg-slate-50 dark:bg-[#08111F] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 leading-relaxed">
                  {selectedIncident.description}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedIncident(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
