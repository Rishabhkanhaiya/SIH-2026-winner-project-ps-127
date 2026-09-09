import React, { useState } from 'react'
import { FileText, Download, Loader, Eye, Sparkles, CheckCircle, RefreshCw } from 'lucide-react'
import { REPORTS } from '../data/mockData'
import { StatusBadge } from '../components/StatusBadge'
import ReportModal from '../components/ReportModal'
import { downloadReportPdf } from '../api/reports'

const REPORT_TYPES = ['Traffic', 'Vehicles', 'ANPR', 'Incidents', 'Pedestrians', 'System Performance']
const ZONES = ['All Zones', 'Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E', 'Zone F']

const TYPE_COLORS = {
  Traffic: '#2563EB',
  Vehicles: '#3B82F6',
  ANPR: '#22C55E',
  Incidents: '#EF4444',
  Pedestrians: '#F59E0B',
  'System Performance': '#8B5CF6',
  System: '#8B5CF6',
}

export default function Reports() {
  const [reportsList, setReportsList] = useState(REPORTS)
  const [selectedType, setSelectedType] = useState('Traffic')
  const [zone, setZone] = useState('All Zones')
  const [generating, setGenerating] = useState(false)
  const [generatedReport, setGeneratedReport] = useState(null)
  const [activeModalReport, setActiveModalReport] = useState(null)
  const [modalMode, setModalMode] = useState('doc')
  const [downloadingId, setDownloadingId] = useState(null)

  const handleGenerate = () => {
    setGenerating(true)
    setGeneratedReport(null)
    setTimeout(() => {
      setGenerating(false)
      const newReport = {
        id: 1, // Points to valid template
        name: `${selectedType} Operational Report — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        type: selectedType,
        date: new Date().toISOString().slice(0, 10),
        status: 'ready',
        size: '1.9 MB',
      }
      setGeneratedReport(newReport)
      // Also prepend to list if not already there
      setReportsList(prev => [newReport, ...prev])
    }, 2200)
  }

  const handleView = (rep, mode = 'doc') => {
    setActiveModalReport(rep)
    setModalMode(mode)
  }

  const handleDownload = async (rep, e) => {
    if (e) e.stopPropagation()
    setDownloadingId(rep.id)
    try {
      await downloadReportPdf(rep.id, rep.name)
    } finally {
      setDownloadingId(null)
    }
    // Also show the same report in the reports section preview modal
    setActiveModalReport(rep)
    setModalMode('doc')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reports & Surveillance Audits</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Generate, preview, and download official MoRTH template-based intelligence reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            ReportLab 4.5.1 PDF Engine Active
          </span>
        </div>
      </div>

      {/* Generator Panel */}
      <div className="rounded-xl p-6 bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            Generate New Intelligence Report
          </div>
          <span className="text-xs text-slate-500">
            Includes official headers, telemetry charts & digital verification hash
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Date Range */}
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">
              Reporting Window
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                defaultValue="2026-08-31"
                className="flex-1 px-3 py-2 text-sm rounded-lg outline-none bg-slate-50 dark:bg-[#162438] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200"
              />
              <input
                type="date"
                defaultValue="2026-09-02"
                className="flex-1 px-3 py-2 text-sm rounded-lg outline-none bg-slate-50 dark:bg-[#162438] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200"
              />
            </div>
          </div>
          {/* Zone */}
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">
              City Surveillance Sector
            </label>
            <select
              value={zone}
              onChange={e => setZone(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg outline-none bg-slate-50 dark:bg-[#162438] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200"
            >
              {ZONES.map(z => <option key={z}>{z}</option>)}
            </select>
          </div>
        </div>

        {/* Report Types */}
        <div>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 block">
            Select Report Template Category
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mb-4">
            {REPORT_TYPES.map(type => (
              <button
                key={type}
                onClick={() => {
                  setSelectedType(type)
                  setGeneratedReport(null)
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                  selectedType === type
                    ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/30'
                    : 'bg-slate-100 dark:bg-[#162438] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-70 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          >
            {generating ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Compiling {selectedType} Report...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate {selectedType} Report
              </>
            )}
          </button>

          {generatedReport && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
              <button
                onClick={() => handleView(generatedReport, 'doc')}
                className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 bg-slate-100 dark:bg-[#162438] hover:bg-slate-200 dark:hover:bg-[#1F334E] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
              >
                <Eye className="w-4 h-4 text-blue-500" />
                View Document
              </button>
              <button
                onClick={(e) => handleDownload(generatedReport, e)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white shadow-sm"
              >
                <Download className="w-4 h-4" />
                Download PDF ↓
              </button>
              <span className="text-xs text-green-600 dark:text-green-400 font-semibold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                Generated Successfully
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Previous Reports Table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Official Surveillance Reports Archive</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-slate-100 dark:bg-[#162438] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
              {reportsList.length} Total
            </span>
          </div>
          <span className="text-xs text-slate-500">
            Click <strong>View</strong> to preview in-app or <strong>Download</strong> for the official PDF
          </span>
        </div>

        <div className="rounded-xl overflow-hidden bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#162438]/50">
                  {['Report Name', 'Type', 'Date', 'Status', 'Size', 'Action'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {reportsList.map(rep => (
                  <tr key={rep.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                          <FileText className="w-4 h-4 flex-shrink-0" />
                        </div>
                        <div>
                          <span
                            onClick={() => handleView(rep, 'doc')}
                            className="text-sm font-semibold text-slate-900 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors block"
                          >
                            {rep.name}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            ID: UP-00{rep.id}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className="text-xs px-2.5 py-0.5 rounded-full font-semibold border"
                        style={{
                          background: `${TYPE_COLORS[rep.type] || '#2563EB'}15`,
                          color: TYPE_COLORS[rep.type] || '#2563EB',
                          borderColor: `${TYPE_COLORS[rep.type] || '#2563EB'}30`
                        }}
                      >
                        {rep.type}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600 dark:text-slate-400 font-mono text-xs">{rep.date}</td>
                    <td className="px-4 py-3.5"><StatusBadge status={rep.status} /></td>
                    <td className="px-4 py-3.5 text-xs text-slate-500 font-mono">{rep.size || '—'}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        {/* View Button (Available for all reports) */}
                        <button
                          onClick={() => handleView(rep, 'doc')}
                          title="View official document in reports section"
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-[#162438] hover:bg-slate-200 dark:hover:bg-[#1E3250] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-500" />
                          <span>View</span>
                        </button>

                        {/* Download Button */}
                        {rep.status === 'ready' && (
                          <button
                            onClick={(e) => handleDownload(rep, e)}
                            disabled={downloadingId === rep.id}
                            title="Download official ReportLab PDF"
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40 transition-colors disabled:opacity-60"
                          >
                            {downloadingId === rep.id ? (
                              <Loader className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                            <span>Download</span>
                          </button>
                        )}

                        {rep.status === 'generating' && (
                          <button
                            onClick={(e) => handleDownload(rep, e)}
                            title="Download interim draft PDF"
                            className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                          >
                            <Loader className="w-3.5 h-3.5 animate-spin text-amber-500" />
                            <span>Processing (Draft)</span>
                          </button>
                        )}

                        {rep.status === 'scheduled' && (
                          <button
                            onClick={(e) => handleDownload(rep, e)}
                            title="Inspect scheduled template PDF"
                            className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 font-semibold"
                          >
                            <span>Scheduled Draft</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* In-App PDF Document Modal */}
      {activeModalReport && (
        <ReportModal
          report={activeModalReport}
          initialMode={modalMode}
          onClose={() => setActiveModalReport(null)}
        />
      )}
    </div>
  )
}

