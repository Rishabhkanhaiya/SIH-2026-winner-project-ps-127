import React, { useState, useMemo } from 'react'
import {
  TrendingUp, Clock, Gauge, Car, AlertTriangle,
  Calendar, Layers, ArrowUpRight, ArrowDownRight, Activity, MapPin, Flame
} from 'lucide-react'
import CityMap from '../components/CityMap'
import { useApi } from '../hooks/useApi'
import { getSummary, getTrafficByHour, getCameraActivity, getVehicleTypes } from '../api/analytics'
import { getCameras } from '../api/cameras'
import {
  TRAFFIC_24H as DEFAULT_TRAFFIC,
  VEHICLE_TYPES as DEFAULT_VEHICLE_TYPES,
  CAMERAS as DEFAULT_CAMERAS
} from '../data/mockData'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from 'recharts'

const PIE_COLORS = ['#2563EB', '#3B82F6', '#22C55E', '#F59E0B', '#8B5CF6']

const ZONES = ['All Zones', 'Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E', 'Zone F']
const TIME_HORIZONS = [
  { id: 'today', label: 'Today (Live)' },
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' },
]

const ZONE_STATS = [
  { zone: 'Zone A', name: 'Shivajinagar / Central', cameras: 4, speed: '38 km/h', flow: 'High', congestion: '74%', status: 'Congested', statusColor: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10' },
  { zone: 'Zone B', name: 'Swargate & South Corridors', cameras: 4, speed: '42 km/h', flow: 'Moderate', congestion: '58%', status: 'Normal', statusColor: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10' },
  { zone: 'Zone C', name: 'Kothrud & Baner Bypass', cameras: 3, speed: '48 km/h', flow: 'Smooth', congestion: '36%', status: 'Optimal', statusColor: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10' },
  { zone: 'Zone D', name: 'Viman Nagar / Kharadi IT', cameras: 4, speed: '34 km/h', flow: 'Heavy', congestion: '82%', status: 'Heavy Delay', statusColor: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10' },
  { zone: 'Zone E', name: 'Hinjewadi Tech Expressway', cameras: 2, speed: '54 km/h', flow: 'High', congestion: '62%', status: 'Moderate', statusColor: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10' },
  { zone: 'Zone F', name: 'Pimpri-Chinchwad Industrial', cameras: 3, speed: '45 km/h', flow: 'Moderate', congestion: '44%', status: 'Normal', statusColor: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10' },
]

const ChartCard = ({ title, subtitle, children, badge }) => (
  <div className="rounded-xl p-5 bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
    <div className="flex items-center justify-between mb-4">
      <div>
        <div className="text-sm font-bold text-slate-900 dark:text-white">{title}</div>
        {subtitle && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</div>}
      </div>
      {badge && (
        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
          {badge}
        </span>
      )}
    </div>
    {children}
  </div>
)

// Rich custom tooltip highlighting 9 AM morning peak and 9 PM high flow
const CustomTrafficTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const [hStr] = (label || '').split(':')
    const h = parseInt(hStr, 10)
    const period = h >= 12 ? 'PM' : 'AM'
    const display12 = `${h % 12 || 12}:00 ${period}`
    const is9am = label === '09:00'
    const is9pm = label === '21:00'
    const val = payload[0].value || 0

    return (
      <div className="bg-[#101C2D] border border-slate-700 rounded-xl p-3 shadow-2xl text-white text-xs min-w-[200px] backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
          <div className="flex items-center gap-1.5 font-bold text-slate-200">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{label} ({display12})</span>
          </div>
          {is9am && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold border border-amber-500/30">
              Morning Peak
            </span>
          )}
          {is9pm && (
            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold border border-blue-500/30">
              9 PM High Flow
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-4 py-1">
          <div className="flex items-center gap-1.5 text-blue-400 font-medium">
            <Car className="w-4 h-4" />
            <span>Motor Vehicles:</span>
          </div>
          <span className="font-mono font-bold text-base text-white">
            {val.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">v/h</span>
          </span>
        </div>
        {is9pm && (
          <div className="mt-2 pt-1.5 border-t border-blue-500/20 text-[11px] text-blue-300 font-medium flex items-center gap-1">
            <span>🌙 Heavy 9:00 PM corridor transit rush</span>
          </div>
        )}
        {is9am && (
          <div className="mt-2 pt-1.5 border-t border-amber-500/20 text-[11px] text-amber-300 font-medium flex items-center gap-1">
            <span>☀️ Citywide peak commuter rush hour</span>
          </div>
        )}
      </div>
    )
  }
  return null
}

export default function TrafficAnalytics() {
  const [timeHorizon, setTimeHorizon] = useState('today')
  const [selectedZone, setSelectedZone] = useState('All Zones')

  // Real API data with useApi hooks
  const { data: summary } = useApi(getSummary, [])
  const { data: trafficRaw } = useApi(getTrafficByHour, [])
  const { data: cameraActivityRaw } = useApi(getCameraActivity, [])
  const { data: vehicleTypesRaw } = useApi(getVehicleTypes, [])
  const { data: camerasRaw } = useApi(getCameras, [])

  // Multiplier based on time horizon
  const multiplier = timeHorizon === 'today' ? 1 : timeHorizon === '7d' ? 6.8 : 28.5

  // Normalize traffic data from API or fall back to default rich 24h curve (Pure vehicular)
  const TRAFFIC_24H = useMemo(() => {
    let baseData = DEFAULT_TRAFFIC
    if (Array.isArray(trafficRaw) && trafficRaw.length >= 24 && trafficRaw.some(d => d.count > 100)) {
      baseData = trafficRaw.map(d => ({
        hour: d.label || `${String(d.hour).padStart(2, '0')}:00`,
        vehicles: d.count,
      }))
    }
    const zoneMultiplier = selectedZone === 'All Zones' ? 1 : 0.32
    return baseData.map(d => ({
      hour: d.hour,
      vehicles: Math.round(d.vehicles * multiplier * zoneMultiplier),
    }))
  }, [trafficRaw, multiplier, selectedZone])

  // Compute Total Vehicles directly from the active graph throughput
  const totalVehiclesCount = useMemo(() => {
    return TRAFFIC_24H.reduce((acc, d) => acc + (d.vehicles || 0), 0)
  }, [TRAFFIC_24H])

  const totalVehiclesDisplay = totalVehiclesCount.toLocaleString()

  // Compute Peak Flow Period dynamically from the graph
  const peakFlowInfo = useMemo(() => {
    if (!TRAFFIC_24H.length) {
      return { time: '09:00 AM', volume: 1840, label: 'Morning Peak (1,840 v/h)', nightNote: '9:00 PM Flow: 1,450 v/h' }
    }
    const maxPoint = TRAFFIC_24H.reduce((max, d) => (d.vehicles > max.vehicles ? d : max), TRAFFIC_24H[0])
    const [hourStr] = maxPoint.hour.split(':')
    const h = parseInt(hourStr, 10)
    const period = h >= 12 ? 'PM' : 'AM'
    const displayHour = `${String(h % 12 || 12).padStart(2, '0')}:00 ${period}`
    const peakType = (h >= 17 && h <= 22) ? 'Evening Peak' : (h >= 7 && h <= 11) ? 'Morning Peak' : 'Peak Traffic'

    const night9pm = TRAFFIC_24H.find(d => d.hour === '21:00')
    const night9pmVol = night9pm ? night9pm.vehicles : Math.round(1450 * multiplier)

    return {
      time: displayHour,
      volume: maxPoint.vehicles,
      label: `${peakType} (${maxPoint.vehicles.toLocaleString()} v/h)`,
      nightNote: `9:00 PM Flow: ${night9pmVol.toLocaleString()} v/h`,
    }
  }, [TRAFFIC_24H, multiplier])

  // Vehicle types breakdown
  const VEHICLE_TYPES = useMemo(() => {
    if (Array.isArray(vehicleTypesRaw) && vehicleTypesRaw.length > 0) {
      return vehicleTypesRaw.map(vt => ({
        name: vt.vehicle_type.charAt(0).toUpperCase() + vt.vehicle_type.slice(1),
        value: vt.percentage,
        count: vt.count,
      }))
    }
    return DEFAULT_VEHICLE_TYPES
  }, [vehicleTypesRaw])

  // Cameras data (used in camera-wise traffic breakdown)
  const CAMERAS = useMemo(() => {
    if (Array.isArray(camerasRaw) && camerasRaw.length > 0) {
      return camerasRaw.map((c, i) => ({
        id: c.camera_id || c.id,
        name: c.name,
        zone: c.zone || 'Zone A',
        status: c.status || 'online',
        vehicles_today: c.vehicles_today || Math.round(1200 + (i * 73) % 900),
        uptime: c.uptime || 99.2,
      }))
    }
    return DEFAULT_CAMERAS
  }, [camerasRaw])

  // Filtered cameras for the zone matrix
  const filteredZoneStats = useMemo(() => {
    if (selectedZone === 'All Zones') return ZONE_STATS
    return ZONE_STATS.filter(z => z.zone === selectedZone)
  }, [selectedZone])


  return (
    <div className="space-y-6">
      
      {/* Header & Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Traffic Analytics & Mobility</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400">
              Pune Metro Zone
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Macro flow intelligence, vehicular throughput statistics, hourly density trends, and zone matrices
          </p>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Zone Selector */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 shadow-sm">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="text-xs font-semibold bg-transparent text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
            >
              {ZONES.map(z => (
                <option key={z} value={z} className="bg-white dark:bg-[#101C2D] text-slate-900 dark:text-white">
                  {z}
                </option>
              ))}
            </select>
          </div>

          {/* Time Horizon Switcher */}
          <div className="flex items-center bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-sm">
            {TIME_HORIZONS.map(th => (
              <button
                key={th.id}
                onClick={() => setTimeHorizon(th.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  timeHorizon === th.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {th.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary KPI Cards Row (4 Vehicular Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Vehicles */}
        <div className="rounded-xl p-4 bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Total Vehicles</span>
            <Car className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">{totalVehiclesDisplay}</div>
          <div className="flex items-center gap-1 text-[11px] text-green-600 dark:text-green-400 font-semibold mt-1">
            <ArrowUpRight className="w-3 h-3" />
            <span>+8.4% vs prev period</span>
          </div>
        </div>

        {/* Card 2: Peak Flow Period */}
        <div className="rounded-xl p-4 bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Peak Flow Period</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">{peakFlowInfo.time}</div>
          <div className="text-[11px] text-slate-500 mt-1">{peakFlowInfo.label}</div>
          <div className="text-[11px] text-blue-600 dark:text-blue-400 font-bold mt-1 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded w-fit">
            {peakFlowInfo.nightNote}
          </div>
        </div>

        {/* Card 3: Average Speed */}
        <div className="rounded-xl p-4 bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Average Speed</span>
            <Gauge className="w-4 h-4 text-green-600 dark:text-green-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">42 km/h</div>
          <div className="flex items-center gap-1 text-[11px] text-green-600 dark:text-green-400 font-semibold mt-1">
            <span>Normal Corridor Pace</span>
          </div>
        </div>

        {/* Card 4: Congestion Index */}
        <div className="rounded-xl p-4 bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Congestion Index</span>
            <Activity className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1.5">64%</div>
          <div className="text-[11px] text-slate-500 mt-1">Moderate Network Load</div>
        </div>

      </div>

      {/* Primary Area Chart: 24-Hour Pure Vehicular Traffic Volume with 9 AM and 9 PM Highlight */}
      <ChartCard
        title="Hourly Vehicular Traffic Volume (24h)"
        subtitle="Aggregated detector volume across 20 smart surveillance nodes (Highlighting 9 AM Morning Peak & 9 PM Evening Corridor Rush)"
        badge={selectedZone}
      >
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={TRAFFIC_24H} margin={{ top: 20, right: 25, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.15)" />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 11, fill: '#64748B' }}
                tickLine={false}
                axisLine={false}
                interval={1}
                tickFormatter={(val) => {
                  const [hStr] = val.split(':')
                  const h = parseInt(hStr, 10)
                  if (h === 9) return '09:00 AM (Peak)'
                  if (h === 21) return '21:00 (9 PM High)'
                  if (h % 3 === 0) return `${h % 12 || 12}:00 ${h >= 12 ? 'PM' : 'AM'}`
                  return ''
                }}
              />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTrafficTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              
              {/* Prominent Vertical Reference Lines for 9 AM Peak and 9 PM High Traffic */}
              <ReferenceLine
                x="09:00"
                stroke="#F59E0B"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{ value: '☀️ 9 AM Peak: 1,840 v/h', position: 'top', fill: '#D97706', fontSize: 11, fontWeight: 'bold' }}
              />
              <ReferenceLine
                x="21:00"
                stroke="#2563EB"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{ value: '🌙 9 PM Flow: 1,450 v/h', position: 'top', fill: '#2563EB', fontSize: 11, fontWeight: 'bold' }}
              />

              {/* Single Solid Fill Vehicular Area */}
              <Area
                type="monotone"
                dataKey="vehicles"
                stroke="#2563EB"
                strokeWidth={2.5}
                fill="#3B82F6"
                fillOpacity={0.25}
                name="Motor Vehicles"
                dot={(props) => {
                  const { payload, cx, cy } = props
                  if (payload.hour === '09:00' || payload.hour === '21:00') {
                    const color = payload.hour === '09:00' ? '#F59E0B' : '#2563EB'
                    return (
                      <g key={`marker-${payload.hour}`}>
                        <circle cx={cx} cy={cy} r={6} fill={color} stroke="#ffffff" strokeWidth={2} />
                        <circle cx={cx} cy={cy} r={10} fill="none" stroke={color} strokeWidth={1.5} opacity={0.6} />
                      </g>
                    )
                  }
                  return null
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>


      {/* Vehicle Fleet Classification — full width */}
      <ChartCard
        title="Vehicle Fleet Classification"
        subtitle="Classification breakdown by vehicle type (%)"
        badge="Live Feed"
      >
        <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
          <div className="w-48 h-48 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={VEHICLE_TYPES}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {VEHICLE_TYPES.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#101C2D',
                    borderColor: '#1E293B',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2.5 flex-1 w-full">
            {VEHICLE_TYPES.map((vt, i) => (
              <div key={vt.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="font-medium text-slate-700 dark:text-slate-300">{vt.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white">{vt.value}%</span>
                  <span className="text-slate-400 text-[11px]">({Math.round((vt.value / 100) * 12400).toLocaleString()})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ChartCard>

      {/* Kepler.gl Spatial Density & Corridor Congestion Engine */}
      <div className="rounded-xl p-5 bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md flex-shrink-0">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Kepler.gl Spatial Heatmap & Corridor Engine</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 font-bold">
                  LIVE GPU KDE
                </span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time arterial flow density, road vector interpolation, and bottleneck detection across Pune Metro
              </div>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20">
            Interactive GIS Layer
          </span>
        </div>

        <div className="relative rounded-xl overflow-hidden border border-slate-200/80 dark:border-slate-800" style={{ height: '440px' }}>
          <CityMap
            height="100%"
            showHeatmap={true}
            heatmapMode="congestion"
            showCameras={true}
            showIncidents={true}
          />
        </div>
      </div>

      {/* Zone Congestion & Throughput Matrix — full width */}
      <div className="rounded-xl p-5 bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">Zone Congestion Breakdown</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Corridor operational states</div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
            Matrix
          </span>
        </div>

        <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#162438]/50">
                    <th className="py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-400">Zone / Corridor</th>
                    <th className="py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-400">Cams</th>
                    <th className="py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-400">Congestion</th>
                    <th className="py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-400 text-right">State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredZoneStats.map(row => (
                    <tr key={row.zone} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 dark:text-white">{row.zone}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[140px]">{row.name}</div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                        {row.cameras}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                        {row.congestion}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${row.statusColor}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        </div>

      {/* ── Camera-Wise Traffic Analytics ─────────────────────────────── */}
      <div className="rounded-xl p-5 bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">Camera-Wise Traffic Breakdown</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Vehicular volume recorded per surveillance node</div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
            Live Demo
          </span>
        </div>

        {/* Bar chart — vehicles per camera */}
        <div className="h-56 w-full mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={CAMERAS.filter(c => c.status === 'online').map(c => ({
                name: c.id,
                location: c.name,
                vehicles: c.vehicles_today,
              }))}
              margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={false} interval={0} angle={-30} textAnchor="end" height={36} />
              <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#101C2D', borderColor: '#1E293B', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                formatter={(val, name, props) => [`${val.toLocaleString()} vehicles`, `Location: ${props.payload.location}`]}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar dataKey="vehicles" name="Vehicles" fill="#2563EB" radius={[3,3,0,0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Camera-wise table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#162438]/60">
                <th className="py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-400">Camera ID</th>
                <th className="py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-400">Location</th>
                <th className="py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-400">Zone</th>
                <th className="py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-400 text-right">Vehicles Today</th>
                <th className="py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-400 text-right">Uptime</th>
                <th className="py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-400 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {CAMERAS.map(cam => {
                const maxV = Math.max(...CAMERAS.map(c => c.vehicles_today))
                const pct  = maxV > 0 ? Math.round((cam.vehicles_today / maxV) * 100) : 0
                const statusColor =
                  cam.status === 'online'      ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10' :
                  cam.status === 'offline'     ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10' :
                                                 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10'
                return (
                  <tr key={cam.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-slate-100">{cam.id}</td>
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 max-w-[140px] truncate">{cam.name}</td>
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">{cam.zone}</td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="font-semibold text-blue-600 dark:text-blue-400 tabular-nums">{cam.vehicles_today.toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <div className="w-12 h-1 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${cam.uptime}%` }} />
                        </div>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums">{cam.uptime}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${statusColor}`}>
                        {cam.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
