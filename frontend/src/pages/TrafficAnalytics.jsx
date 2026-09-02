import React, { useState, useMemo } from 'react'
import {
  TrendingUp, Clock, Gauge, Users, Car, AlertTriangle,
  Calendar, Layers, ArrowUpRight, ArrowDownRight, Activity, MapPin
} from 'lucide-react'
import {
  TRAFFIC_24H, VEHICLE_TYPES, INCIDENTS_BY_HOUR, CAMERA_ACTIVITY, CAMERAS
} from '../data/mockData'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
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

export default function TrafficAnalytics() {
  const [timeHorizon, setTimeHorizon] = useState('today')
  const [selectedZone, setSelectedZone] = useState('All Zones')

  // Multiplier based on time horizon
  const multiplier = timeHorizon === 'today' ? 1 : timeHorizon === '7d' ? 6.8 : 28.5

  const totalVehiclesDisplay = Math.round(12400 * multiplier).toLocaleString()
  const totalFootfallDisplay = Math.round(34200 * multiplier).toLocaleString()

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
            Macro flow intelligence, throughput statistics, hourly density trends, and zone matrices
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

      {/* Summary KPI Cards Row (5 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        
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

        <div className="rounded-xl p-4 bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Peak Flow Period</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">09:00 AM</div>
          <div className="text-[11px] text-slate-500 mt-1">Morning Peak (1,840 v/h)</div>
        </div>

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

        <div className="rounded-xl p-4 bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Congestion Index</span>
            <Activity className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1.5">64%</div>
          <div className="text-[11px] text-slate-500 mt-1">Moderate Network Load</div>
        </div>

        <div className="rounded-xl p-4 bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Active Footfall</span>
            <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">{totalFootfallDisplay}</div>
          <div className="text-[11px] text-slate-500 mt-1">Pedestrian Crossings</div>
        </div>

      </div>

      {/* Primary Area Chart: 24-Hour Traffic & Pedestrian Volume (Solid Fills, Zero Gradients) */}
      <ChartCard
        title="Hourly Traffic & Pedestrian Throughput"
        subtitle="Aggregated detector volume across 20 smart surveillance nodes"
        badge={selectedZone}
      >
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={TRAFFIC_24H} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.15)" />
              <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} interval={2} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#101C2D',
                  borderColor: '#1E293B',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  fontSize: '12px'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              {/* Solid fills with fillOpacity, strictly NO linearGradient */}
              <Area
                type="monotone"
                dataKey="vehicles"
                stroke="#2563EB"
                strokeWidth={2}
                fill="#3B82F6"
                fillOpacity={0.2}
                name="Motor Vehicles"
              />
              <Area
                type="monotone"
                dataKey="pedestrians"
                stroke="#16A34A"
                strokeWidth={2}
                fill="#22C55E"
                fillOpacity={0.2}
                name="Pedestrians"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Mid-Row: Vehicle Classification PieChart & Incident Frequency BarChart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Vehicle Classification */}
        <ChartCard
          title="Vehicle Fleet Classification"
          subtitle="AI model classification breakdown (%)"
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

        {/* Incident Frequency by Hour */}
        <ChartCard
          title="Incident Severity Distribution"
          subtitle="Detected anomalies stacked by hourly frequency"
          badge="Past 12 Hours"
        >
          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={INCIDENTS_BY_HOUR} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.15)" />
                <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#101C2D',
                    borderColor: '#1E293B',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '12px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Bar dataKey="high" stackId="a" fill="#DC2626" name="High Priority" radius={[0, 0, 2, 2]} />
                <Bar dataKey="medium" stackId="a" fill="#D97706" name="Medium Priority" />
                <Bar dataKey="low" stackId="a" fill="#2563EB" name="Low Priority" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

      </div>

      {/* Bottom Row: Top Active Camera Ranking & Zone Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top Camera Activity Horizontal BarChart */}
        <ChartCard
          title="Top Camera Activity Ranking"
          subtitle="Highest vehicle detection volume by camera node"
          badge="Top 8 Nodes"
        >
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={CAMERA_ACTIVITY}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.15)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={false} width={65} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#101C2D',
                    borderColor: '#1E293B',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '12px'
                  }}
                  formatter={(val, name, props) => [`${val.toLocaleString()} vehicles`, props.payload.location]}
                />
                <Bar dataKey="vehicles" fill="#2563EB" radius={[0, 4, 4, 0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Zone Congestion & Throughput Matrix */}
        <div className="rounded-xl p-5 bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">Zone Congestion Breakdown</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Corridor operational states and average travel pace</div>
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
        </div>

      </div>

      {/* ── Camera-Wise Traffic Analytics ─────────────────────────────── */}
      <div className="rounded-xl p-5 bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">Camera-Wise Traffic Breakdown</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Vehicle &amp; pedestrian counts per surveillance node</div>
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
                pedestrians: c.pedestrians_today,
              }))}
              margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={false} interval={0} angle={-30} textAnchor="end" height={36} />
              <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#101C2D', borderColor: '#1E293B', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                formatter={(val, name, props) => [`${val.toLocaleString()}`, name === 'vehicles' ? `Vehicles — ${props.payload.location}` : `Pedestrians — ${props.payload.location}`]}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar dataKey="vehicles"    name="Vehicles"    fill="#2563EB" radius={[3,3,0,0]} maxBarSize={22} />
              <Bar dataKey="pedestrians" name="Pedestrians" fill="#22C55E" radius={[3,3,0,0]} maxBarSize={22} />
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
                <th className="py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-400 text-right">Pedestrians</th>
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
                    <td className="py-2.5 px-3 text-right font-semibold text-green-600 dark:text-green-400 tabular-nums">
                      {cam.pedestrians_today.toLocaleString()}
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
