import React, { useState } from 'react'
import { BarChart3, TrendingUp, Calendar, Filter } from 'lucide-react'
import { TRAFFIC_24H, VEHICLE_TYPES, INCIDENTS_BY_HOUR, CAMERA_ACTIVITY } from '../data/mockData'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const COLORS = ['#22D3EE', '#3B82F6', '#22C55E', '#F59E0B', '#A855F7']

const ChartCard = ({ title, subtitle, children, filter }) => (
  <div className="rounded-xl p-5" style={{ background: '#101C2D', border: '1px solid rgba(255,255,255,0.06)' }}>
    <div className="flex items-center justify-between mb-4">
      <div>
        <div className="text-sm font-semibold text-white">{title}</div>
        {subtitle && <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div>}
      </div>
      {filter && <div className="text-xs text-slate-500">{filter}</div>}
    </div>
    {children}
  </div>
)

export default function Analytics() {
  const [dateFilter, setDateFilter] = useState('today')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Analytics Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Urban traffic intelligence · Pune Metro Zone</p>
        </div>
        <div className="flex items-center gap-2">
          {['today', 'week', 'month'].map(d => (
            <button key={d} onClick={() => setDateFilter(d)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-all ${
                dateFilter === d ? 'bg-cyan-400 text-black font-bold' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              style={{ border: `1px solid ${dateFilter === d ? '#22D3EE' : 'rgba(255,255,255,0.08)'}` }}>
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Vehicles', value: '12,400', change: '+8%', color: '#22D3EE' },
          { label: 'Peak Hour', value: '09:00 AM', change: 'Rush hour', color: '#3B82F6' },
          { label: 'Avg Speed', value: '42 km/h', change: 'Normal', color: '#22C55E' },
          { label: 'Incident Rate', value: '0.06%', change: '-12%', color: '#F59E0B' },
        ].map(({ label, value, change, color }) => (
          <div key={label} className="rounded-xl p-4" style={{ background: '#101C2D', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-xs text-slate-500">{label}</div>
            <div className="text-2xl font-bold mt-1" style={{ color }}>{value}</div>
            <div className="text-xs text-slate-500 mt-1">{change}</div>
          </div>
        ))}
      </div>

      {/* Traffic Volume */}
      <ChartCard title="Traffic Volume — 24 Hours" subtitle="Vehicles detected per hour across all cameras" filter="All zones">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={TRAFFIC_24H} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#22D3EE" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="pedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={false} interval={2} />
            <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background: '#162438', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '12px' }} labelStyle={{ color: '#94A3B8' }} />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
            <Area type="monotone" dataKey="vehicles" stroke="#22D3EE" strokeWidth={2} fill="url(#volGrad)" name="Vehicles" />
            <Area type="monotone" dataKey="pedestrians" stroke="#3B82F6" strokeWidth={2} fill="url(#pedGrad)" name="Pedestrians" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-2 gap-4">
        {/* Vehicle Types */}
        <ChartCard title="Vehicle Classification" subtitle="Breakdown by type">
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie data={VEHICLE_TYPES} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {VEHICLE_TYPES.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#162438', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 flex-1">
              {VEHICLE_TYPES.map((vt, i) => (
                <div key={vt.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i] }} />
                    <span className="text-xs text-slate-400">{vt.name}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-300">{vt.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        {/* Incidents by hour */}
        <ChartCard title="Incident Frequency" subtitle="By hour and priority">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={INCIDENTS_BY_HOUR} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: '#162438', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '12px' }} />
              <Bar dataKey="high" stackId="a" fill="#EF4444" name="High" radius={[0,0,2,2]} />
              <Bar dataKey="medium" stackId="a" fill="#F59E0B" name="Medium" />
              <Bar dataKey="low" stackId="a" fill="#3B82F6" name="Low" radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Camera Activity */}
      <ChartCard title="Top Camera Activity" subtitle="Vehicles detected per camera today">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={CAMERA_ACTIVITY} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} width={60} />
            <Tooltip contentStyle={{ background: '#162438', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '12px' }} />
            <Bar dataKey="vehicles" fill="#22D3EE" radius={[0,4,4,0]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}
