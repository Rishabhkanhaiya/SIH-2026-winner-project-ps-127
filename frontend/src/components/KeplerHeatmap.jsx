import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import {
  Layers, Flame, Activity, ShieldAlert, Sliders, Eye, Download,
  Radio, Compass, ChevronDown, RefreshCw, Zap
} from 'lucide-react'
import { getHeatmap, exportKeplerGeoJSON } from '../api/analytics'

// ─────────────────────────────────────────────────────────────────────────────
// Authentic Kepler.gl Color Palettes (RGBA ramp tables)
// ─────────────────────────────────────────────────────────────────────────────
export const KEPLER_PALETTES = {
  volcano: {
    id: 'volcano',
    name: 'Kepler Volcano',
    gradient: [
      { stop: 0.00, color: 'rgba(44, 17, 95, 0)' },
      { stop: 0.20, color: 'rgba(74, 12, 107, 0.45)' },
      { stop: 0.40, color: 'rgba(120, 28, 109, 0.65)' },
      { stop: 0.60, color: 'rgba(183, 55, 121, 0.82)' },
      { stop: 0.80, color: 'rgba(241, 96, 93, 0.92)' },
      { stop: 0.92, color: 'rgba(254, 176, 120, 0.98)' },
      { stop: 1.00, color: 'rgba(252, 253, 191, 1.0)' },
    ],
    preview: 'linear-gradient(to right, #2c115f, #721f81, #b73779, #f1605d, #feb078, #fcfdbf)',
  },
  neon: {
    id: 'neon',
    name: 'Cyberpunk Neon',
    gradient: [
      { stop: 0.00, color: 'rgba(5, 5, 24, 0)' },
      { stop: 0.25, color: 'rgba(0, 242, 254, 0.45)' },
      { stop: 0.50, color: 'rgba(79, 172, 254, 0.70)' },
      { stop: 0.75, color: 'rgba(240, 147, 251, 0.88)' },
      { stop: 1.00, color: 'rgba(245, 87, 108, 1.0)' },
    ],
    preview: 'linear-gradient(to right, #050518, #00f2fe, #4facfe, #f093fb, #f5576c)',
  },
  thermal: {
    id: 'thermal',
    name: 'Thermal Infrared',
    gradient: [
      { stop: 0.00, color: 'rgba(0, 0, 255, 0)' },
      { stop: 0.25, color: 'rgba(0, 255, 255, 0.50)' },
      { stop: 0.50, color: 'rgba(0, 255, 0, 0.70)' },
      { stop: 0.75, color: 'rgba(255, 255, 0, 0.90)' },
      { stop: 1.00, color: 'rgba(255, 0, 0, 1.0)' },
    ],
    preview: 'linear-gradient(to right, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000)',
  },
}

function createPaletteRamp(paletteDef) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 1
  const ctx = canvas.getContext('2d')
  const grad = ctx.createLinearGradient(0, 0, 256, 0)
  for (const s of paletteDef.gradient) {
    grad.addColorStop(s.stop, s.color)
  }
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 256, 1)
  return ctx.getImageData(0, 0, 256, 1).data
}

// ─────────────────────────────────────────────────────────────────────────────
// KeplerHeatmap Component (Overlayed directly inside Leaflet MapContainer)
// ─────────────────────────────────────────────────────────────────────────────
export default function KeplerHeatmap({
  compact = false,
  initialMode = 'density',
  showCorridors = true,
  onCorridorSelect = null,
}) {
  const map = useMap()
  const canvasRef = useRef(null)

  // Interactive controls
  const [mode, setMode] = useState(initialMode) // 'density' | 'congestion' | 'violations'
  const [timeRange, setTimeRange] = useState('today') // '1h' | 'today' | '7d'
  const [paletteId, setPaletteId] = useState('volcano')
  const [radius, setRadius] = useState(26)
  const [blur, setBlur] = useState(18)
  const [opacity, setOpacity] = useState(0.85)
  const [corridorsVisible, setCorridorsVisible] = useState(showCorridors)
  const [controlsOpen, setControlsOpen] = useState(!compact)
  const [loading, setLoading] = useState(false)

  // Heatmap dataset
  const [heatData, setHeatData] = useState({ points: [], corridors: [], summary: null })

  // Fetch heatmap data from backend
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getHeatmap({ mode, time_range: timeRange })
      setHeatData(data || { points: [], corridors: [], summary: null })
    } catch (err) {
      console.error('Failed to load heatmap data:', err)
    } finally {
      setLoading(false)
    }
  }, [mode, timeRange])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Color ramp lookup table cached
  const colorRamp = useMemo(() => {
    const pal = KEPLER_PALETTES[paletteId] || KEPLER_PALETTES.volcano
    return createPaletteRamp(pal)
  }, [paletteId])

  // Render heatmap on canvas
  const drawHeatmap = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !map || !heatData.points.length) return

    const size = map.getSize()
    canvas.width = size.x
    canvas.height = size.y

    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, size.x, size.y)

    // Step 1: Draw alpha mask using Gaussian radial gradients
    const maskCanvas = document.createElement('canvas')
    maskCanvas.width = size.x
    maskCanvas.height = size.y
    const mCtx = maskCanvas.getContext('2d')

    const scaleFactor = Math.min(2.0, Math.max(0.7, Math.pow(2, map.getZoom() - 12)))
    const effectiveRadius = Math.round(radius * scaleFactor)
    const effectiveBlur = Math.round(blur * scaleFactor)

    for (const pt of heatData.points) {
      const p = map.latLngToContainerPoint([pt.lat, pt.lng])
      if (p.x < -effectiveRadius || p.x > size.x + effectiveRadius ||
          p.y < -effectiveRadius || p.y > size.y + effectiveRadius) {
        continue
      }

      const grad = mCtx.createRadialGradient(
        p.x, p.y, Math.max(0, effectiveRadius - effectiveBlur),
        p.x, p.y, effectiveRadius
      )
      const alpha = Math.min(1.0, Math.max(0.08, pt.weight * opacity))
      grad.addColorStop(0, `rgba(0, 0, 0, ${alpha})`)
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)')

      mCtx.fillStyle = grad
      mCtx.beginPath()
      mCtx.arc(p.x, p.y, effectiveRadius, 0, Math.PI * 2)
      mCtx.fill()
    }

    // Step 2: Colorize pixels via Kepler ramp lookup
    const maskImgData = mCtx.getImageData(0, 0, size.x, size.y)
    const pixels = maskImgData.data
    const outImgData = ctx.createImageData(size.x, size.y)
    const outPixels = outImgData.data

    for (let i = 0; i < pixels.length; i += 4) {
      const alphaVal = pixels[i + 3]
      if (alphaVal > 2) {
        const rampIdx = alphaVal * 4
        outPixels[i] = colorRamp[rampIdx]
        outPixels[i + 1] = colorRamp[rampIdx + 1]
        outPixels[i + 2] = colorRamp[rampIdx + 2]
        outPixels[i + 3] = Math.round(colorRamp[rampIdx + 3] * (alphaVal / 255) * opacity)
      }
    }

    ctx.putImageData(outImgData, 0, 0)
  }, [map, heatData.points, radius, blur, opacity, colorRamp])

  // Attach redraw listeners to Leaflet viewport movements
  useEffect(() => {
    drawHeatmap()
    map.on('move', drawHeatmap)
    map.on('zoomend', drawHeatmap)
    map.on('resize', drawHeatmap)
    return () => {
      map.off('move', drawHeatmap)
      map.off('zoomend', drawHeatmap)
      map.off('resize', drawHeatmap)
    }
  }, [map, drawHeatmap])

  // Kepler GeoJSON export handler
  const handleExport = async () => {
    try {
      const data = await exportKeplerGeoJSON({ mode, time_range: timeRange })
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pune_urbanpulse_kepler_heatmap_${mode}_${timeRange}.geojson`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      alert('Failed to export Kepler.gl dataset: ' + e.message)
    }
  }

  // Draw Corridor polyline segments with Leaflet
  useEffect(() => {
    if (!corridorsVisible || !heatData.corridors?.length || !map) return

    const lineLayers = []

    for (const cor of heatData.corridors) {
      const latlngs = cor.coordinates.map(c => [c[0], c[1]])
      const color = cor.congestion_pct >= 75 ? '#EF4444' :
                    cor.congestion_pct >= 60 ? '#F59E0B' :
                    cor.congestion_pct >= 40 ? '#3B82F6' : '#22C55E'

      const poly = L.polyline(latlngs, {
        color,
        weight: 5,
        opacity: 0.85,
        dashArray: cor.status === 'Severe' ? '8 6' : undefined,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map)

      poly.bindTooltip(`
        <div style="font-family: sans-serif; padding: 4px 6px; font-size: 11px;">
          <strong style="color: ${color};">${cor.name}</strong><br/>
          <span>Status: <b>${cor.status}</b> (${cor.congestion_pct}%)</span><br/>
          <span>Avg Speed: <b>${cor.speed_kmh} km/h</b></span>
        </div>
      `, { sticky: true, opacity: 0.95 })

      lineLayers.push(poly)
    }

    return () => {
      lineLayers.forEach(l => map.removeLayer(l))
    }
  }, [map, corridorsVisible, heatData.corridors])

  return (
    <>
      {/* Underlying Canvas Layer */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-[400]"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Kepler Floating Glassmorphic Dock */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2 pointer-events-auto select-none">
        <div className="backdrop-blur-xl bg-white/90 dark:bg-[#0A1220]/90 border border-slate-200/80 dark:border-slate-800 shadow-2xl rounded-2xl p-3 w-80 text-slate-800 dark:text-slate-200 transition-all">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60 dark:border-slate-800/80">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md">
                <Flame className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-xs font-bold tracking-tight uppercase flex items-center gap-1.5">
                  <span>Kepler.gl Heatmap</span>
                  <span className="px-1 py-0.2 rounded text-[9px] bg-purple-500/20 text-purple-600 dark:text-purple-400 font-mono">GPU KDE</span>
                </div>
                <div className="text-[10px] text-slate-500">Pune Urban Pulse Engine</div>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={fetchData}
                title="Refresh Heatmap Data"
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-purple-500' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => setControlsOpen(v => !v)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${controlsOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          {/* Mode Selector Pill Buttons */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100/80 dark:bg-slate-900/80 rounded-xl mb-3">
            {[
              { id: 'density', label: 'Volume', icon: Activity },
              { id: 'congestion', label: 'Bottlenecks', icon: Flame },
              { id: 'violations', label: 'Infractions', icon: ShieldAlert },
            ].map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  mode === m.id
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <m.icon className="w-3 h-3" />
                <span>{m.label}</span>
              </button>
            ))}
          </div>

          {/* Collapsible Fine-Tuning Controls */}
          {controlsOpen && (
            <div className="space-y-3 pt-1 text-xs">
              {/* Time Horizon Selector */}
              <div>
                <div className="text-[11px] font-medium text-slate-500 mb-1 flex items-center justify-between">
                  <span>Time Window</span>
                  <span className="font-mono text-purple-600 dark:text-purple-400 uppercase text-[10px]">{timeRange}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { id: '1h', label: 'Live (1h)' },
                    { id: 'today', label: 'Today (24h)' },
                    { id: '7d', label: 'Past 7 Days' },
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTimeRange(t.id)}
                      className={`py-1 rounded-md text-[11px] font-medium border transition-all ${
                        timeRange === t.id
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 font-bold'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Palette Picker */}
              <div>
                <div className="text-[11px] font-medium text-slate-500 mb-1">Kepler Color Palette</div>
                <div className="space-y-1">
                  {Object.values(KEPLER_PALETTES).map(pal => (
                    <button
                      key={pal.id}
                      type="button"
                      onClick={() => setPaletteId(pal.id)}
                      className={`w-full flex items-center gap-2 p-1.5 rounded-lg border transition-all ${
                        paletteId === pal.id
                          ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="w-16 h-3 rounded-md shadow-inner" style={{ background: pal.preview }} />
                      <span className={`text-[11px] flex-1 text-left ${paletteId === pal.id ? 'font-bold text-purple-600 dark:text-purple-400' : 'text-slate-600 dark:text-slate-400'}`}>
                        {pal.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Kernel Radius & Blur Sliders */}
              <div className="space-y-2 pt-1">
                <div>
                  <div className="flex justify-between text-[11px] text-slate-500 mb-0.5">
                    <span>Radius (KDE Bandwidth)</span>
                    <span className="font-mono">{radius}px</span>
                  </div>
                  <input
                    type="range"
                    min="14"
                    max="48"
                    value={radius}
                    onChange={e => setRadius(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-500 mb-0.5">
                    <span>Opacity Field</span>
                    <span className="font-mono">{Math.round(opacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.3"
                    max="1.0"
                    step="0.05"
                    value={opacity}
                    onChange={e => setOpacity(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                </div>
              </div>

              {/* Corridors Flow Toggle */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800/80">
                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Arterial Corridor Tubes</span>
                <button
                  type="button"
                  onClick={() => setCorridorsVisible(v => !v)}
                  className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${
                    corridorsVisible ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    corridorsVisible ? 'translate-x-4' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* Kepler GeoJSON Export Button */}
              <button
                type="button"
                onClick={handleExport}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/30 text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 border border-slate-200 dark:border-slate-700 transition-all font-semibold text-[11px]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export to Kepler.gl GeoJSON</span>
              </button>
            </div>
          )}

          {/* Quick Metrics Banner */}
          {heatData.summary && (
            <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/80 grid grid-cols-3 text-center text-[10px]">
              <div>
                <div className="text-slate-400">Hotspots</div>
                <div className="font-bold text-red-600 dark:text-red-400 text-xs">{heatData.summary.active_hotspots}</div>
              </div>
              <div>
                <div className="text-slate-400">Avg Delay</div>
                <div className="font-bold text-amber-600 dark:text-amber-400 text-xs">{heatData.summary.avg_congestion}%</div>
              </div>
              <div>
                <div className="text-slate-400">Data Points</div>
                <div className="font-bold text-blue-600 dark:text-blue-400 text-xs">{heatData.summary.total_points}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
