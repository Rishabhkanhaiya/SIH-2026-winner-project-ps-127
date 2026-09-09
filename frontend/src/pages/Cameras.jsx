import React, { useState, useMemo, useEffect } from 'react'
import {
  Camera, Maximize2, Search, Eye, Wifi, WifiOff,
  Wrench, Car, Signal, ShieldAlert, Plus, X, Video,
  CheckCircle2, AlertCircle, Sparkles, Clock,
  Trash2, Play, MapPin, AlertTriangle, Flag, ArrowRight
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import { getCameras, createCamera, deleteCamera } from '../api/cameras'
import { CAMERAS } from '../data/mockData'

// ─────────────────────────────────────────────────────────────────────────────
// Default 7 Strategic Cameras across Pune Metro Transit Network
// ─────────────────────────────────────────────────────────────────────────────
const STRATEGIC_CAMERA_IDS = [
  'CAM-001', // MG Road Junction
  'CAM-002', // FC Road Signal
  'CAM-003', // Swargate Junction
  'CAM-004', // Shivajinagar Station
  'CAM-007', // Hinjewadi Phase 1 Gate
  'CAM-008', // Baner Road Junction
  'CAM-016', // Pimpri Chowk
]

// ─────────────────────────────────────────────────────────────────────────────
// Paired Real-Time Incidents (Rule & Optical Radar Based — NO Isolation Forest)
// ─────────────────────────────────────────────────────────────────────────────
export const PAIRED_INCIDENTS = {
  'CAM-004': { type: 'Wrong-way Vehicle', severity: 'critical', desc: 'Vehicle traveling opposite one-way stream', speed: '52 km/h' },
  'CAM-008': { type: 'Speeding Vehicle', severity: 'critical', desc: 'High-speed sedan clocked at 112 km/h (Limit: 50)', speed: '112 km/h' },
  'CAM-002': { type: 'Lane Obstruction', severity: 'warning', desc: 'Stalled cargo carrier blocking bus corridor', speed: '0 km/h' },
  'CAM-003': { type: 'Traffic Accident', severity: 'critical', desc: 'Two-vehicle collision detected in junction box', speed: '24 km/h' },
  'CAM-007': { type: 'Blacklist Match', severity: 'critical', desc: 'ANPR hit: Stolen SUV MH14ZZ9999 intercepted', speed: '48 km/h' },
  'CAM-001': { type: 'Signal Jump', severity: 'warning', desc: 'Red light phase crossing at commercial signal', speed: '62 km/h' },
  'CAM-016': { type: 'Road Blockage', severity: 'warning', desc: 'Broken down chassis blocking central expressway', speed: '0 km/h' },
  'CAM-009': { type: 'Pedestrian Safety', severity: 'info', desc: 'Pedestrian crossing during rapid green phase', speed: '38 km/h' },
  'CAM-011': { type: 'Unauthorized Entry', severity: 'critical', desc: 'Commercial carrier entered tech zone without badge', speed: '35 km/h' },
  'CAM-005': { type: 'Abandoned Vehicle', severity: 'warning', desc: 'Vehicle stationary in transit lane for > 45 mins', speed: '0 km/h' },
}

// ─────────────────────────────────────────────────────────────────────────────
// Realistic Pune Geographic Presets for 1-Click Camera Creation
// ─────────────────────────────────────────────────────────────────────────────
const PUNE_LANDMARK_PRESETS = [
  { name: 'Kalyani Nagar Bridge Corridor', zone: 'East Pune', lat: '18.5484', lng: '73.9015' },
  { name: 'Chandani Chowk Multi-Level Flyover', zone: 'West Pune', lat: '18.5074', lng: '73.7844' },
  { name: 'Hinjewadi Phase 2 Wipro Circle', zone: 'IT Hub', lat: '18.5912', lng: '73.7228' },
  { name: 'Hadapsar Gadital Transit Hub', zone: 'East Pune', lat: '18.4988', lng: '73.9312' },
  { name: 'Katraj Snake Park Expressway', zone: 'South Pune', lat: '18.4529', lng: '73.8587' },
  { name: 'Bhakti Shakti Chowk Nigdi', zone: 'PCMC', lat: '18.6534', lng: '73.7712' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Google Drive, YouTube, and Direct Video Stream Formatter
// ─────────────────────────────────────────────────────────────────────────────
export function parseGoogleDriveUrl(url) {
  if (!url || typeof url !== 'string') return null
  const clean = url.trim()
  if (!clean) return null

  // 1. Google Drive preview/stream pattern
  const driveMatch = clean.match(/\/d\/([a-zA-Z0-9_-]+)/) || clean.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (driveMatch && driveMatch[1]) {
    return {
      fileId: driveMatch[1],
      embedUrl: `https://drive.google.com/file/d/${driveMatch[1]}/preview`,
      streamUrl: `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`,
      isDrive: true,
      isYoutube: false,
    }
  }

  // 2. YouTube format
  const ytMatch = clean.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/)
  if (ytMatch && ytMatch[1]) {
    return {
      fileId: ytMatch[1],
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&loop=1&playlist=${ytMatch[1]}&controls=0`,
      streamUrl: clean,
      isDrive: false,
      isYoutube: true,
    }
  }

  // 3. Direct video stream (mp4, webm, hls, etc.)
  return {
    fileId: null,
    embedUrl: clean,
    streamUrl: clean,
    isDrive: false,
    isYoutube: false,
  }
}

function StatusIcon({ status }) {
  if (status === 'online')      return <Wifi className="w-3 h-3 text-green-500" />
  if (status === 'offline')     return <WifiOff className="w-3 h-3 text-red-500" />
  if (status === 'maintenance') return <Wrench className="w-3 h-3 text-amber-500" />
  return null
}

function statusRingColor(status, isCustom = false, hasIncident = false) {
  if (hasIncident)              return 'ring-red-500/90 shadow-[0_0_18px_rgba(239,68,68,0.35)] dark:shadow-[0_0_24px_rgba(239,68,68,0.45)]'
  if (isCustom)                 return 'ring-purple-500/80 shadow-[0_0_15px_rgba(168,85,247,0.25)] dark:shadow-[0_0_20px_rgba(168,85,247,0.35)]'
  if (status === 'online')      return 'ring-green-500/40'
  if (status === 'offline')     return 'ring-red-500/40'
  if (status === 'maintenance') return 'ring-amber-500/40'
  return 'ring-slate-500/20'
}

function statusBadge(status) {
  if (status === 'online')      return { text: 'LIVE', bg: 'bg-red-600', dot: true }
  if (status === 'offline')     return { text: 'OFFLINE', bg: 'bg-slate-700', dot: false }
  if (status === 'maintenance') return { text: 'MAINT.', bg: 'bg-amber-600', dot: false }
  return { text: 'UNKNOWN', bg: 'bg-slate-700', dot: false }
}

// ─────────────────────────────────────────────────────────────────────────────
// CameraFeed Component (Plays REAL Stock Footage from AICity22 continuously)
// ─────────────────────────────────────────────────────────────────────────────
function CameraFeed({ camera, onMaximize, incident }) {
  const isOnline = camera.status === 'online'
  const badge = statusBadge(camera.status)
  const [timeStr, setTimeStr] = useState(() => new Date().toLocaleTimeString('en-GB'))

  // Live ticking IST clock
  useEffect(() => {
    if (!isOnline) return
    const timer = setInterval(() => {
      setTimeStr(new Date().toLocaleTimeString('en-GB'))
    }, 1000)
    return () => clearInterval(timer)
  }, [isOnline])

  // Resolve authentic video stream URL:
  // 1) From camera.video_url
  // 2) Or fallback to default /videos/cam_XXX.mp4
  const camIdNorm = (camera.id || camera.camera_id || 'cam_001').toLowerCase().replace('-', '_')
  const defaultVideoSrc = `/videos/${camIdNorm}.mp4`
  const rawVideoUrl = camera.video_url || defaultVideoSrc
  const driveInfo = useMemo(() => parseGoogleDriveUrl(rawVideoUrl), [rawVideoUrl])

  return (
    <div className="relative overflow-hidden bg-[#070b14] h-48 w-full select-none">
      {/* 1. If Camera is Online: Play Real Video Looping Continuously */}
      {isOnline ? (
        <div className="absolute inset-0 bg-black flex items-center justify-center">
          {driveInfo && (driveInfo.isDrive || driveInfo.isYoutube) ? (
            <iframe
              src={driveInfo.embedUrl}
              title={`Feed ${camera.id}`}
              className="w-full h-full border-0 pointer-events-none"
              allow="autoplay; encrypted-media"
            />
          ) : (
            <video
              src={driveInfo?.streamUrl || defaultVideoSrc}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          )}

          {/* Vignette & contrast lens shading */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/70 via-transparent to-black/40" />
        </div>
      ) : (
        /* 2. Offline / Maintenance Display */
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#0a0f1d]">
          <div className="p-3 rounded-full bg-slate-900 border border-slate-800">
            <Camera className="w-8 h-8 text-slate-600" />
          </div>
          <span className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-widest">
            {camera.status === 'maintenance' ? 'Optical Sensor Under Maintenance' : 'CCTV Feed Disconnected'}
          </span>
          <span className="text-[10px] text-slate-600 font-mono">CODE: 0x88F_{camera.id}</span>
        </div>
      )}

      {/* Target Corner Optical Brackets */}
      {isOnline && (
        <>
          <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-blue-400/80 rounded-tl pointer-events-none" />
          <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-blue-400/80 rounded-tr pointer-events-none" />
          <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 border-blue-400/80 rounded-bl pointer-events-none" />
          <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-blue-400/80 rounded-br pointer-events-none" />
        </>
      )}

      {/* Top Left: Live Status Badge & Pulsing REC */}
      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold text-white shadow-md ${badge.bg}`}>
          {badge.dot && <span className="w-1.5 h-1.5 rounded-full bg-white live-dot" />}
          <span>{badge.text}</span>
        </div>
        {isOnline && (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[9px] font-mono text-red-400 font-bold border border-red-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            REC
          </div>
        )}
      </div>

      {/* Top Center: Live Clock (IST) */}
      {isOnline && (
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 hidden sm:flex items-center gap-1 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[9px] font-mono text-slate-200 border border-slate-700/50 z-10 shadow-sm">
          <Clock className="w-2.5 h-2.5 text-blue-400" />
          <span>{timeStr} IST</span>
        </div>
      )}

      {/* Top Right: Stream Source & Fullscreen Control */}
      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
        {isOnline && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[9px] font-mono text-emerald-400 font-semibold border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>30.0 FPS</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => onMaximize && onMaximize(camera)}
          title="Fullscreen Live Stream"
          className="w-6 h-6 rounded flex items-center justify-center text-white bg-black/75 backdrop-blur-md hover:bg-blue-600 transition-colors shadow-md border border-white/10"
        >
          <Maximize2 className="w-3 h-3" />
        </button>
      </div>

      {/* Bottom Left: Paired Real-Time Incident Beacon */}
      {isOnline && incident && (
        <div className="absolute bottom-2.5 left-2.5 z-10 flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-600/90 text-white text-[10px] font-bold shadow-lg animate-pulse border border-red-400/60 backdrop-blur-sm">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
          <span>INCIDENT: {incident.type}</span>
          {incident.speed && incident.speed !== '0 km/h' && (
            <span className="ml-1 px-1 rounded bg-black/40 text-[9px] font-mono">{incident.speed}</span>
          )}
        </div>
      )}

      {/* Bottom Right: Optical Resolution Watermark */}
      {isOnline && (
        <div className="absolute bottom-2.5 right-2.5 text-[9px] font-mono text-slate-400 bg-black/60 px-1.5 py-0.5 rounded border border-white/5 pointer-events-none">
          1080p · AICITY-MTMC
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CameraCard Component
// ─────────────────────────────────────────────────────────────────────────────
function CameraCard({ camera, onMaximize, onRemove, onFlagIncident, incident }) {
  const isCustom = Boolean(camera.isCustom)
  const hasIncident = Boolean(incident)

  return (
    <div
      className={`rounded-xl overflow-hidden flex flex-col group bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all ring-2 ${statusRingColor(camera.status, isCustom, hasIncident)}`}
    >
      <CameraFeed camera={camera} onMaximize={onMaximize} incident={incident} />

      {/* Info Card Body */}
      <div className="p-3.5 bg-white dark:bg-[#101C2D] border-t border-slate-100 dark:border-slate-800/80 flex flex-col justify-between flex-1">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <StatusIcon status={camera.status} />
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono tracking-tight">{camera.id}</span>
                {isCustom && (
                  <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-mono flex items-center gap-1 shadow-sm">
                    <Sparkles className="w-2.5 h-2.5" />
                    NEW CAMERA
                  </span>
                )}
                {hasIncident && (
                  <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-red-600 text-white font-mono flex items-center gap-1 shadow-sm">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    FLAGGED
                  </span>
                )}
              </div>
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate mt-0.5">{camera.name}</div>
            </div>

            <div className="flex items-center gap-1">
              {/* Daily Vehicle Count */}
              {camera.status === 'online' && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-bold font-mono">
                  <Car className="w-3 h-3" />
                  <span>{(camera.vehicles_today || 1420).toLocaleString()}</span>
                </div>
              )}

              {/* Remove Camera Option for Custom Cameras */}
              {isCustom && onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(camera.id)}
                  title="Remove this custom camera"
                  className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1">
              <Signal className="w-3 h-3 text-slate-400" />
              <span className="font-medium truncate max-w-[130px]">{camera.zone}</span>
            </div>
            <div className="font-mono text-[10px]">
              {typeof camera.lat === 'number' ? camera.lat.toFixed(4) : camera.lat}, {typeof camera.lng === 'number' ? camera.lng.toFixed(4) : camera.lng}
            </div>
          </div>
        </div>

        {/* Real-time incident banner description if flagged */}
        {hasIncident && (
          <div className="mt-2.5 p-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 text-[11px] text-red-700 dark:text-red-300">
            <div className="font-bold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-red-500" />
              <span>{incident.desc}</span>
            </div>
          </div>
        )}

        {/* Footer Actions: Flag Incident & Uptime */}
        <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
          {camera.status === 'online' ? (
            <>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <span>AI Uptime</span>
                <span className="font-bold text-green-600 dark:text-green-400">{camera.uptime || 99.4}%</span>
              </div>
              <button
                type="button"
                onClick={() => onFlagIncident && onFlagIncident(camera)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
              >
                <Flag className="w-3 h-3" />
                <span>Flag Incident</span>
              </button>
            </>
          ) : (
            <div className="text-[10px] font-mono text-slate-400">Feed Offline</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Add Camera Modal Component (Preserves 1-click presets & Google Drive link)
// ─────────────────────────────────────────────────────────────────────────────
function AddCameraModal({ isOpen, onClose, onCameraAdded, existingCameras }) {
  const [formData, setFormData] = useState({
    camera_id: '',
    name: '',
    zone: 'East Pune',
    lat: '18.5484',
    lng: '73.9015',
    status: 'online',
    video_url: '',
  })

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isOpen) {
      const maxNum = (existingCameras || []).reduce((max, c) => {
        const idStr = c.id || c.camera_id || ''
        const num = parseInt(idStr.replace(/\D/g, ''), 10)
        return !isNaN(num) && num > max ? num : max
      }, 20)
      const nextId = `CAM-${String(maxNum + 1).padStart(3, '0')}`

      setFormData({
        camera_id: nextId,
        name: '',
        zone: 'East Pune',
        lat: '18.5484',
        lng: '73.9015',
        status: 'online',
        video_url: '',
      })
      setError(null)
    }
  }, [isOpen, existingCameras])

  if (!isOpen) return null

  const previewDriveInfo = parseGoogleDriveUrl(formData.video_url)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSelectPreset = (preset) => {
    setFormData(prev => ({
      ...prev,
      name: preset.name,
      zone: preset.zone,
      lat: preset.lat,
      lng: preset.lng,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!formData.camera_id.trim()) {
      setError('Camera ID / Number is required (e.g. CAM-021).')
      return
    }
    if (!formData.name.trim()) {
      setError('Camera Name / Junction Location is required.')
      return
    }

    setSubmitting(true)

    const payload = {
      camera_id: formData.camera_id.trim().toUpperCase(),
      name: formData.name.trim(),
      zone: formData.zone.trim(),
      lat: parseFloat(formData.lat) || 18.5204,
      lng: parseFloat(formData.lng) || 73.8567,
      status: formData.status,
      video_url: formData.video_url.trim() || '/videos/cam_001.mp4',
    }

    try {
      await createCamera(payload)
    } catch (err) {
      console.warn('Backend API save warning:', err)
    }

    onCameraAdded(payload)
    setSubmitting(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#0E1726] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Add New Surveillance Camera</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Configure junction sensor, coordinates & video stream source</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 text-red-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-[#162234] border border-slate-200 dark:border-slate-700/60">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-500" />
                <span>1-Click Pune Location Presets</span>
              </label>
              <span className="text-[10px] text-slate-400">Auto-fills name, zone & GPS</span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {PUNE_LANDMARK_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-white dark:bg-[#0B1120] hover:bg-blue-50 dark:hover:bg-blue-900/40 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-2xs transition-colors"
                >
                  + {preset.name.split(' ').slice(0, 2).join(' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Camera Number / ID *</label>
              <input
                type="text"
                name="camera_id"
                value={formData.camera_id}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#162234] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono outline-none"
                required
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Initial Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#162234] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
              >
                <option value="online">Online (Active Feed)</option>
                <option value="maintenance">Maintenance</option>
                <option value="offline">Offline</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">Camera Location Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Kalyani Nagar Bridge Corridor"
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#162234] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
              required
            />
          </div>

          <div className="p-3.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/60 space-y-2.5">
            <div className="flex items-center gap-1.5">
              <Video className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <label className="font-bold text-slate-900 dark:text-white text-xs">Video Feed Source (Stock Footage / G-Drive)</label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, video_url: '/videos/cam_001.mp4' }))}
                className="px-2.5 py-1 rounded-md bg-purple-100 dark:bg-purple-900/50 hover:bg-purple-200 text-purple-700 dark:text-purple-300 text-[10px] font-semibold flex items-center gap-1"
              >
                <Play className="w-3 h-3" />
                <span>Use Real AICity Stock Video</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, video_url: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view' }))}
                className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-[10px] font-medium flex items-center gap-1"
              >
                <Video className="w-3 h-3" />
                <span>Sample Drive Link</span>
              </button>
            </div>
            <input
              type="text"
              name="video_url"
              value={formData.video_url}
              onChange={handleChange}
              placeholder="/videos/cam_001.mp4 or Google Drive link"
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#162234] border border-purple-300 dark:border-purple-700 text-slate-900 dark:text-white text-xs font-mono outline-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border text-xs">Cancel</button>
            <button type="submit" disabled={submitting} className="px-5 py-2 rounded-lg bg-blue-600 text-white font-semibold text-xs shadow-md">
              {submitting ? 'Registering...' : 'Register Camera Feed'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Fullscreen Stream Modal
// ─────────────────────────────────────────────────────────────────────────────
function FullscreenModal({ camera, onClose, incident }) {
  if (!camera) return null
  const camIdNorm = (camera.id || camera.camera_id || 'cam_001').toLowerCase().replace('-', '_')
  const defaultVideoSrc = `/videos/${camIdNorm}.mp4`
  const rawVideoUrl = camera.video_url || defaultVideoSrc
  const driveInfo = parseGoogleDriveUrl(rawVideoUrl)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0B1120] border border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div>
              <div className="font-mono font-bold text-sm text-blue-400">{camera.id} · {camera.name}</div>
              <div className="text-xs text-slate-400">{camera.zone} · Live 1080p Stock CCTV Stream</div>
            </div>
            {incident && (
              <span className="px-2 py-0.5 rounded bg-red-600 text-white text-xs font-bold flex items-center gap-1 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
                <span>{incident.type} ({incident.speed || 'Active'})</span>
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative bg-black h-[540px] w-full flex items-center justify-center">
          {driveInfo && (driveInfo.isDrive || driveInfo.isYoutube) ? (
            <iframe
              src={driveInfo.embedUrl}
              title={`Fullscreen ${camera.id}`}
              className="w-full h-full border-0"
              allow="autoplay; encrypted-media; fullscreen"
            />
          ) : (
            <video
              src={driveInfo?.streamUrl || defaultVideoSrc}
              controls
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-contain"
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Real-Time Incident Flag Modal (Operator Quick Flagging)
// ─────────────────────────────────────────────────────────────────────────────
function QuickFlagModal({ camera, isOpen, onClose, onFlagged }) {
  const [incidentType, setIncidentType] = useState('Traffic Congestion / Obstruction')
  const [notes, setNotes] = useState('')

  if (!isOpen || !camera) return null

  const handleFlagSubmit = (e) => {
    e.preventDefault()
    onFlagged({
      camera_id: camera.id,
      camera_name: camera.name,
      zone: camera.zone,
      type: incidentType,
      notes: notes || `Operator flagged live event on ${camera.id} (${camera.name})`,
      timestamp: new Date().toLocaleTimeString(),
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#0E1726] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <Flag className="w-5 h-5" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Flag Incident on {camera.id}</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleFlagSubmit} className="py-4 space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold mb-1">Incident Classification</label>
            <select
              value={incidentType}
              onChange={e => setIncidentType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#162234] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
            >
              <option value="Wrong-way Vehicle">Wrong-way Vehicle</option>
              <option value="Speeding Vehicle">Speeding Vehicle (&gt; 90 km/h)</option>
              <option value="Traffic Collision">Traffic Collision / Crash</option>
              <option value="Signal Phase Violation">Signal Phase Violation (Red Jump)</option>
              <option value="Lane Obstruction / Stalled Vehicle">Lane Obstruction / Stalled Vehicle</option>
              <option value="Blacklisted Vehicle Match">Blacklisted Vehicle Match</option>
              <option value="Unauthorized Transit Entry">Unauthorized Transit Entry</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold mb-1">Operator Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. White SUV blocking intersection, plate MH14AB1234 suspected..."
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#162234] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border text-xs">Cancel</button>
            <button type="submit" className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md flex items-center gap-1.5">
              <Flag className="w-3.5 h-3.5" />
              <span>Broadcast Incident Alert</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Cameras Page Component
// ─────────────────────────────────────────────────────────────────────────────
export default function Cameras() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterView, setFilterView] = useState('working') // 'working' | 'all' | 'strategic'
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [maximizedCamera, setMaximizedCamera] = useState(null)
  const [flaggingCamera, setFlaggingCamera] = useState(null)
  const [notification, setNotification] = useState(null)

  // Local state for dynamic live incidents
  const [activeIncidents, setActiveIncidents] = useState(PAIRED_INCIDENTS)

  // Local storage for user-added cameras
  const [customCameras, setCustomCameras] = useState(() => {
    try {
      const saved = localStorage.getItem('urbanpulse_custom_cameras')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Real API data
  const { data: camerasRaw, refetch } = useApi(getCameras, [])

  // Combine backend cameras with custom user-added cameras (pinned to the top)
  const allCameras = useMemo(() => {
    const baseSource = (camerasRaw && camerasRaw.length > 0) ? camerasRaw : CAMERAS
    
    // Map existing backend/mock cameras
    const baseMap = new Map()
    baseSource.forEach(c => {
      const id = c.camera_id || c.id
      const camNorm = id.toLowerCase().replace('-', '_')
      baseMap.set(id, {
        ...c,
        id,
        video_url: c.video_url || `/videos/${camNorm}.mp4`,
        vehicles_today: c.vehicles_today || 1240,
        uptime: c.uptime || 99.4,
      })
    })

    // Custom cameras created by user (always pinned to the top)
    const customList = []
    const seenCustom = new Set()

    for (const c of customCameras) {
      const id = c.camera_id || c.id
      if (!id || seenCustom.has(id)) continue
      seenCustom.add(id)

      const backendObj = baseMap.get(id)
      customList.push({
        ...(backendObj || {}),
        ...c,
        id,
        video_url: c.video_url || backendObj?.video_url || '/videos/cam_001.mp4',
        vehicles_today: c.vehicles_today || backendObj?.vehicles_today || 1200,
        uptime: c.uptime || backendObj?.uptime || 99.8,
        isCustom: true,
      })
      baseMap.delete(id)
    }

    const standardList = Array.from(baseMap.values())
    return [...customList, ...standardList]
  }, [camerasRaw, customCameras])

  const handleCameraAdded = (newCam) => {
    const formatted = {
      ...newCam,
      id: newCam.camera_id,
      vehicles_today: Math.floor(Math.random() * 400) + 950,
      uptime: 99.9,
      isCustom: true,
      created_at: new Date().toISOString(),
    }
    const updated = [formatted, ...customCameras.filter(c => (c.id || c.camera_id) !== formatted.id)]
    setCustomCameras(updated)
    try {
      localStorage.setItem('urbanpulse_custom_cameras', JSON.stringify(updated))
    } catch (e) {
      console.warn('Storage error:', e)
    }

    setNotification({
      type: 'success',
      message: `Camera ${formatted.id} (${formatted.name}) added to network and streaming live stock footage!`
    })
    setTimeout(() => setNotification(null), 6000)

    if (refetch) refetch()
  }

  const handleRemoveCamera = async (camId) => {
    try {
      await deleteCamera(camId)
    } catch (e) {
      console.warn('Backend delete warning:', e)
    }

    const updated = customCameras.filter(c => (c.id || c.camera_id) !== camId)
    setCustomCameras(updated)
    try {
      localStorage.setItem('urbanpulse_custom_cameras', JSON.stringify(updated))
    } catch (e) {
      console.warn('Storage error:', e)
    }

    setNotification({
      type: 'info',
      message: `Camera ${camId} removed from network.`
    })
    setTimeout(() => setNotification(null), 5000)

    if (refetch) refetch()
  }

  // Operator flags an incident on a camera
  const handleIncidentFlagged = (inc) => {
    setActiveIncidents(prev => ({
      ...prev,
      [inc.camera_id]: {
        type: inc.type,
        severity: 'critical',
        desc: inc.notes,
        speed: 'Flagged Live'
      }
    }))
    setNotification({
      type: 'critical',
      message: `🚨 Real-time incident broadcasted on ${inc.camera_id} (${inc.camera_name}): ${inc.type}. Telemetry active.`
    })
  }

  // Demonstration helper: Trigger a simulated real-time incident on live cameras
  const handleSimulateLiveIncident = () => {
    const demoCandidates = ['CAM-006', 'CAM-010', 'CAM-013', 'CAM-014', 'CAM-015']
    const picked = demoCandidates[Math.floor(Math.random() * demoCandidates.length)]
    const demoEvents = [
      { type: 'Speeding Violation', desc: 'Optical radar trigger: Vehicle at 98 km/h in 50 km/h zone', speed: '98 km/h' },
      { type: 'Sudden Braking Collision', desc: 'Trajectory halt detected across multiple lanes', speed: '12 km/h' },
      { type: 'Illegal Reverse Maneuver', desc: 'Reverse vector detected on expressway junction', speed: '28 km/h' },
    ]
    const chosenEvent = demoEvents[Math.floor(Math.random() * demoEvents.length)]

    setActiveIncidents(prev => ({
      ...prev,
      [picked]: {
        type: chosenEvent.type,
        severity: 'critical',
        desc: chosenEvent.desc,
        speed: chosenEvent.speed
      }
    }))

    setNotification({
      type: 'critical',
      message: `🚨 REAL-TIME INCIDENT FLAGGED on ${picked}: ${chosenEvent.type} — ${chosenEvent.desc}. Paired footage active.`
    })
  }

  // Filter cameras based on search and selected view mode
  const displayCameras = useMemo(() => {
    return allCameras.filter(c => {
      const matchesSearch = !search ||
        c.id.toLowerCase().includes(search.toLowerCase()) ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.zone.toLowerCase().includes(search.toLowerCase())

      if (!matchesSearch) return false

      if (filterView === 'working') {
        return c.status === 'online' || c.isCustom
      }

      if (filterView === 'strategic') {
        return STRATEGIC_CAMERA_IDS.includes(c.id) || c.isCustom
      }

      return true
    })
  }, [allCameras, search, filterView])

  const onlineCount = allCameras.filter(c => c.status === 'online').length
  const offlineCount = allCameras.filter(c => c.status === 'offline').length
  const incidentCount = Object.keys(activeIncidents).length

  return (
    <div className="space-y-4">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <span>Camera Monitoring Grid</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-500/20 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 live-dot" />
              {displayCameras.length} Live Feeds Active
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time surveillance footage from 17 cameras across Pune Metro · Continuous playback with live incident flagging
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Working (17) / All (20) / Priority (7) View Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setFilterView('working')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterView === 'working'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 live-dot" />
              <span>Working Cameras ({onlineCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterView('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterView === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Cameras ({allCameras.length})
            </button>

            <button
              type="button"
              onClick={() => setFilterView('strategic')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterView === 'strategic'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>Priority Corridors ({STRATEGIC_CAMERA_IDS.length})</span>
            </button>
          </div>

          {/* Simulate Live Incident Button */}
          <button
            type="button"
            onClick={handleSimulateLiveIncident}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold text-xs border border-red-200 dark:border-red-500/30 shadow-sm transition-all"
            title="Demonstrate real-time incident detection & flagging"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Simulate Real-Time Incident</span>
          </button>

          {/* Add Camera Button */}
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Camera</span>
          </button>
        </div>
      </div>

      {/* Real-time Notification Banner */}
      {notification && (
        <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-medium animate-fadeIn ${
          notification.type === 'critical'
            ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 shadow-md'
            : notification.type === 'success'
            ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
            : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'critical' ? (
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 animate-bounce" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
            )}
            <span className="font-semibold">{notification.message}</span>
          </div>
          <div className="flex items-center gap-2">
            {notification.type === 'critical' && (
              <button
                onClick={() => navigate('/incidents')}
                className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] flex items-center gap-1"
              >
                <span>View Incident Center</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Status Indicators & Search Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap bg-white dark:bg-[#101C2D] p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-6 text-xs flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 live-dot" />
            <span className="text-slate-700 dark:text-slate-300 font-semibold">{onlineCount} Online Feeds</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-slate-700 dark:text-slate-300 font-semibold">{offlineCount} Offline</span>
          </div>
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{incidentCount} Cameras with Active Flagged Incidents</span>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter by junction, zone, or ID..."
            className="pl-8 pr-4 py-1.5 text-xs rounded-lg outline-none bg-slate-50 dark:bg-[#162234] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 w-64"
          />
        </div>
      </div>

      {/* Responsive Camera Grid (Real continuous stock footage in loop) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {displayCameras.map(cam => (
          <CameraCard
            key={cam.id}
            camera={cam}
            incident={activeIncidents[cam.id]}
            onMaximize={setMaximizedCamera}
            onRemove={handleRemoveCamera}
            onFlagIncident={setFlaggingCamera}
          />
        ))}
      </div>

      {/* Empty State */}
      {displayCameras.length === 0 && (
        <div className="py-16 text-center text-slate-400">
          <Camera className="w-12 h-12 mx-auto mb-2 opacity-40" />
          <p className="font-semibold text-sm">No cameras match your search criteria</p>
          <button
            onClick={() => setSearch('')}
            className="mt-2 text-xs text-blue-500 hover:underline font-medium"
          >
            Clear Search
          </button>
        </div>
      )}

      {/* Modals */}
      <AddCameraModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCameraAdded={handleCameraAdded}
        existingCameras={allCameras}
      />

      <FullscreenModal
        camera={maximizedCamera}
        incident={maximizedCamera ? activeIncidents[maximizedCamera.id] : null}
        onClose={() => setMaximizedCamera(null)}
      />

      <QuickFlagModal
        camera={flaggingCamera}
        isOpen={Boolean(flaggingCamera)}
        onClose={() => setFlaggingCamera(null)}
        onFlagged={handleIncidentFlagged}
      />
    </div>
  )
}
