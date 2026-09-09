import React, { useState, useEffect, useRef } from 'react'
import {
  X,
  Download,
  Printer,
  ExternalLink,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Building2,
  Cpu,
  Layers,
  Sparkles,
  Eye,
  Loader2,
} from 'lucide-react'
import { getPdfDownloadUrl, downloadReportPdf, getPdfBlobUrl } from '../api/reports'
import { REPORT_TEMPLATES } from '../data/reportTemplates'

export default function ReportModal({ report, onClose, initialMode = 'doc' }) {
  const [activeTab, setActiveTab] = useState(initialMode) // 'doc' or 'pdf'
  const [downloading, setDownloading] = useState(false)
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null)
  const [loadingPdf, setLoadingPdf] = useState(false)
  const printableRef = useRef(null)

  // Fetch report data template
  const template = REPORT_TEMPLATES[report?.id] || {
    id: report?.id || 1,
    name: report?.name || 'Urban Pulse Operational Report',
    type: report?.type || 'Traffic',
    date: report?.date || '2026-08-31',
    ref: `UP-RPT-2026-0831-${report?.type?.slice(0, 3)?.toUpperCase() || 'TRF'}`,
    authority: 'Ministry of Road Transport and Highways (MoRTH) & Pune Smart City Mission',
    classification: 'OFFICIAL SURVEILLANCE RECORD',
    kpis: [
      { value: '14,820', label: 'TOTAL VEHICLES' },
      { value: '1,840/hr', label: 'PEAK FLOW' },
      { value: '41.2 km/h', label: 'AVG SPEED' },
      { value: '34.6%', label: 'CONGESTION' },
      { value: '99.4%', label: 'UPTIME' },
    ],
    summary: 'Operational surveillance report analyzing traffic density and vehicular throughput.',
    headers: ['Corridor / Sensor', 'Zone', 'Volume', 'Avg Speed', 'Congestion', 'State'],
    rows: [
      ['Hinjewadi - Wakad Tech Corridor', 'IT Hub', '3,420 veh', '44.5 km/h', '42.0%', 'Optimal'],
      ['Wakad - Baner Expressway', 'West Pune', '2,980 veh', '48.0 km/h', '38.5%', 'Optimal'],
      ['Baner - Aundh Main Arterial', 'NW Pune', '2,150 veh', '41.0 km/h', '45.0%', 'Moderate'],
      ['Shivajinagar Station Junction', 'Central', '2,890 veh', '28.5 km/h', '76.0%', 'Congested'],
    ],
    signatory: 'Commissioner of Police & Traffic Surveillance Authority',
    checksum: 'SHA256: 7f8a9e4b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f',
  }

  // Load PDF blob for raw viewer tab
  useEffect(() => {
    let active = true
    if (activeTab === 'pdf' && !pdfBlobUrl) {
      setLoadingPdf(true)
      getPdfBlobUrl(report.id).then((url) => {
        if (active) {
          setPdfBlobUrl(url)
          setLoadingPdf(false)
        }
      }).catch(() => {
        if (active) setLoadingPdf(false)
      })
    }
    return () => {
      active = false
    }
  }, [activeTab, report.id, pdfBlobUrl])

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleDownload = async () => {
    setDownloading(true)
    try {
      await downloadReportPdf(report.id, report.name)
    } finally {
      setDownloading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const rawPdfDirectUrl = getPdfDownloadUrl(report.id)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 md:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[92vh] flex flex-col bg-slate-100 dark:bg-[#0B132B] rounded-2xl shadow-2xl border border-slate-300 dark:border-slate-800 overflow-hidden">
        
        {/* Top Header / Action Bar */}
        <div className="px-6 py-4 bg-white dark:bg-[#101C2D] border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1">
                  {report.name}
                </h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {template.ref}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official MoRTH Intelligence Template · Generated {report.date}
              </p>
            </div>
          </div>

          {/* Center Tabs: Document View vs Raw PDF */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-[#162438] rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('doc')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'doc'
                  ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Document Layout
            </button>
            <button
              onClick={() => setActiveTab('pdf')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'pdf'
                  ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              Live ReportLab Stream
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              title="Print official document"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-[#162438] hover:bg-slate-200 dark:hover:bg-[#1E3250] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
            <a
              href={rawPdfDirectUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open raw PDF in new browser tab"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-[#162438] hover:bg-slate-200 dark:hover:bg-[#1E3250] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open Tab
            </a>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all disabled:opacity-70"
            >
              {downloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>Download PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center custom-scrollbar">
          {activeTab === 'doc' ? (
            /* Document Layout Sheet */
            <div
              ref={printableRef}
              className="w-full max-w-3xl bg-white dark:bg-[#0E1726] text-slate-900 dark:text-slate-100 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 md:p-12 space-y-6 transition-colors print:p-0 print:border-none print:shadow-none"
            >
              {/* MoRTH Official Header */}
              <div className="border-b-2 border-slate-800 dark:border-slate-700 pb-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow">
                        🏛️
                      </div>
                      <div>
                        <div className="text-xs font-black tracking-wider uppercase text-blue-900 dark:text-blue-400">
                          GOVERNMENT OF MAHARASHTRA / PUNE SMART CITY MISSION
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-medium">
                          DIRECTORATE OF INTELLIGENT TRANSPORTATION SYSTEMS & URBAN SURVEILLANCE
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-block px-2.5 py-1 text-[10px] font-bold uppercase rounded tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      {template.classification}
                    </span>
                    <div className="text-[10px] font-mono text-slate-400 mt-1">
                      REF: {template.ref}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-500" />
                    Urban Pulse Surveillance Grid (Zone A–F, 20 Sensors)
                  </span>
                  <span className="flex items-center gap-1.5 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Reporting Window: {report.date} 00:00 — 23:59 IST
                  </span>
                </div>
              </div>

              {/* Document Title & Category Badge */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    {template.type}
                  </span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs font-mono text-slate-500">Form: MoRTH-ITS-2026-REV4</span>
                </div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  {report.name}
                </h1>
              </div>

              {/* Executive Summary Callout */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#142136] border border-slate-200 dark:border-slate-800/90 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Executive Intelligence Summary
                </div>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 font-normal">
                  {template.summary}
                </p>
              </div>

              {/* KPI Cards Grid */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2.5 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-500" />
                  Key Surveillance Telemetry Metrics
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                  {template.kpis.map((kpi, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50/80 dark:bg-[#121E30] border border-slate-200 dark:border-slate-800 text-center"
                    >
                      <div className="text-base font-black text-blue-600 dark:text-blue-400">
                        {kpi.value}
                      </div>
                      <div className="text-[10px] font-semibold tracking-wider uppercase text-slate-500 dark:text-slate-400 mt-1">
                        {kpi.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Corridor / Vehicle Telemetry Breakdown Table */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2.5 flex items-center justify-between">
                  <span>Corridor Breakdown & Optical Log Data</span>
                  <span className="text-[10px] font-mono text-slate-400 font-normal">
                    {template.rows.length} records verified
                  </span>
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-800 dark:bg-[#16253B] text-white">
                        {template.headers.map((h, i) => (
                          <th
                            key={i}
                            className="px-3.5 py-2.5 font-bold uppercase text-[11px] tracking-wider"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {template.rows.map((row, rIdx) => (
                        <tr
                          key={rIdx}
                          className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                        >
                          {row.map((cell, cIdx) => {
                            const isState =
                              cIdx === row.length - 1 &&
                              ['Optimal', 'Moderate', 'Congested', 'Resolved', 'Investigating', 'Operational', 'Protected Zebra', 'Scheduled'].includes(
                                cell
                              )
                            return (
                              <td
                                key={cIdx}
                                className={`px-3.5 py-2.5 text-xs text-slate-700 dark:text-slate-300 ${
                                  cIdx === 0 ? 'font-semibold text-slate-900 dark:text-white' : ''
                                }`}
                              >
                                {isState ? (
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                      cell === 'Optimal' || cell === 'Resolved' || cell === 'Operational' || cell === 'Protected Zebra'
                                        ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20'
                                        : cell === 'Moderate' || cell === 'Investigating' || cell === 'Scheduled'
                                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                        : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                                    }`}
                                  >
                                    {cell}
                                  </span>
                                ) : (
                                  cell
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Digital Authentication & Security Stamp */}
              <div className="pt-6 border-t-2 border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-600 dark:text-green-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                      <span>Digitally Authenticated Document</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                      {template.checksum}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    {template.signatory}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    Automated Verification via Urban Pulse AI v2.4
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Live Raw PDF Stream Tab */
            <div className="w-full h-full flex flex-col bg-white dark:bg-[#101C2D] rounded-xl border border-slate-300 dark:border-slate-800 overflow-hidden">
              {loadingPdf ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  <p className="text-sm font-medium">Rendering ReportLab PDF byte stream...</p>
                </div>
              ) : (
                <iframe
                  title="PDF Preview"
                  src={pdfBlobUrl || rawPdfDirectUrl}
                  className="w-full h-full border-none"
                />
              )}
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="px-6 py-3 bg-white dark:bg-[#101C2D] border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            ReportLab Engine Operational · 300 DPI Vector PDF
          </span>
          <span>
            Document Reference: <strong className="text-slate-700 dark:text-slate-300">{template.ref}</strong>
          </span>
        </div>
      </div>
    </div>
  )
}
