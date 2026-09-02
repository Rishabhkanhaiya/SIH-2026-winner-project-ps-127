import React from 'react'

const SEVERITY_CONFIG = {
  critical: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', dot: 'bg-red-500', label: 'CRITICAL' },
  warning:  { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', dot: 'bg-amber-500', label: 'WARNING' },
  info:     { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', dot: 'bg-blue-400', label: 'INFO' },
  success:  { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-400', dot: 'bg-green-500', label: 'ONLINE' },
}

const PRIORITY_CONFIG = {
  HIGH:   { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400' },
  MEDIUM: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' },
  LOW:    { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400' },
}

const STATUS_CONFIG = {
  online:      { bg: 'bg-green-500/10', text: 'text-green-400', label: 'ONLINE' },
  offline:     { bg: 'bg-red-500/10', text: 'text-red-400', label: 'OFFLINE' },
  maintenance: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'MAINTENANCE' },
  new:         { bg: 'bg-red-500/10', text: 'text-red-400', label: 'NEW' },
  acknowledged:{ bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'ACK' },
  resolved:    { bg: 'bg-green-500/10', text: 'text-green-400', label: 'RESOLVED' },
  active:      { bg: 'bg-red-500/10', text: 'text-red-400', label: 'ACTIVE' },
  investigating:{ bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'INVESTIGATING' },
  Verified:    { bg: 'bg-green-500/10', text: 'text-green-400', label: 'VERIFIED' },
  Clear:       { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'CLEAR' },
  Flagged:     { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'FLAGGED' },
  Blacklisted: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'BLACKLISTED' },
  ready:       { bg: 'bg-green-500/10', text: 'text-green-400', label: 'READY' },
  generating:  { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'GENERATING' },
  scheduled:   { bg: 'bg-slate-500/10', text: 'text-slate-400', label: 'SCHEDULED' },
}

export function SeverityBadge({ severity }) {
  const cfg = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.info
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${severity === 'critical' ? 'live-dot' : ''}`} />
      {cfg.label}
    </span>
  )
}

export function PriorityBadge({ priority }) {
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.LOW
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
      {priority}
    </span>
  )
}

export function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.info
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  )
}

export function ConfidenceBadge({ value }) {
  const pct = Math.round(value * 100)
  const color = pct >= 90 ? 'text-green-400' : pct >= 75 ? 'text-amber-400' : 'text-red-400'
  return <span className={`text-xs font-bold ${color}`}>{pct}%</span>
}
