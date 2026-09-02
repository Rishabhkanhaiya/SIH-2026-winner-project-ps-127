import React, { useState } from 'react'
import { Upload, User, ArrowRight, MapPin, Clock, Eye } from 'lucide-react'

const PERSON_MATCHES = [
  { cam: 'CAM-004', location: 'Shivajinagar Circle', time: '08:12 AM', confidence: 0.94, id: 'P-001' },
  { cam: 'CAM-017', location: 'Warje Junction', time: '08:34 AM', confidence: 0.88, id: 'P-001' },
  { cam: 'CAM-026', location: 'Sinhagad Road', time: '09:05 AM', confidence: 0.82, id: 'P-001' },
  { cam: 'CAM-031', location: 'Rajaram Bridge', time: '09:28 AM', confidence: 0.79, id: 'P-001' },
]

export default function PersonTracking() {
  const [selectedRef, setSelectedRef] = useState(null)
  const [showResults, setShowResults] = useState(false)

  const handleSearch = () => setShowResults(true)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white">Person Re-Identification</h1>
        <p className="text-sm text-slate-500 mt-0.5">Privacy-conscious cross-camera person tracking · Requires authorization</p>
      </div>

      {/* Privacy Notice */}
      <div className="rounded-xl p-4 flex items-start gap-3"
        style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.20)' }}>
        <div className="w-5 h-5 rounded-full bg-blue-400/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-blue-400 text-xs font-bold">i</span>
        </div>
        <div>
          <div className="text-sm font-semibold text-blue-300">Privacy Notice</div>
          <div className="text-xs text-blue-400/70 mt-0.5">This capability is restricted to authorized officers. All searches are logged and audited per PDPA guidelines. Use only for active investigations.</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Reference Image Upload */}
        <div className="rounded-xl p-4 space-y-3" style={{ background: '#101C2D', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="text-sm font-semibold text-white">Reference Appearance</div>
          <div className="rounded-lg flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-white/5 transition-all"
            style={{ background: '#162438', border: '2px dashed rgba(255,255,255,0.12)', height: '160px' }}
            onClick={() => setSelectedRef('selected')}>
            {selectedRef ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                  <User className="w-8 h-8 text-white" />
                </div>
                <span className="text-xs text-green-400 font-medium">Reference set</span>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 text-slate-500" />
                <span className="text-xs text-slate-500 text-center">Click to upload reference image or select from camera feeds</span>
              </>
            )}
          </div>
          <button onClick={handleSearch} disabled={!selectedRef}
            className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40"
            style={{ background: selectedRef ? '#22D3EE' : '#162438', color: selectedRef ? '#08111F' : '#94A3B8' }}>
            Search All Cameras
          </button>
        </div>

        {/* Results */}
        <div className="col-span-2 space-y-3">
          {showResults && (
            <>
              <div className="text-sm font-semibold text-white">{PERSON_MATCHES.length} matches found</div>
              {/* Timeline */}
              <div className="rounded-xl p-4" style={{ background: '#101C2D', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Movement Timeline</div>
                <div className="flex items-center gap-2 flex-wrap">
                  {PERSON_MATCHES.map((m, i) => (
                    <React.Fragment key={i}>
                      <div className="flex flex-col items-center gap-1">
                        <div className="px-3 py-2 rounded-lg text-xs font-bold"
                          style={{ background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.2)', color: '#22D3EE' }}>
                          {m.cam}
                        </div>
                        <div className="text-xs text-slate-600">{m.time}</div>
                      </div>
                      {i < PERSON_MATCHES.length - 1 && <ArrowRight className="w-4 h-4 text-slate-600 flex-shrink-0 mb-4" />}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Match Cards */}
              <div className="grid grid-cols-2 gap-3">
                {PERSON_MATCHES.map((m, i) => (
                  <div key={i} className="rounded-xl p-4" style={{ background: '#101C2D', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-16 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: '#162438', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <User className="w-6 h-6 text-slate-600" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{m.cam}</div>
                        <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                          <MapPin className="w-3 h-3" />{m.location}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                          <Clock className="w-3 h-3" />{m.time}
                        </div>
                        <div className="mt-1.5">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-slate-500">Match</span>
                            <span className="text-xs font-bold text-green-400">{Math.round(m.confidence * 100)}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-700">
                            <div className="h-full rounded-full bg-green-400" style={{ width: `${m.confidence * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {!showResults && (
            <div className="rounded-xl p-12 flex flex-col items-center justify-center text-center"
              style={{ background: '#101C2D', border: '1px solid rgba(255,255,255,0.06)' }}>
              <Eye className="w-10 h-10 text-slate-700 mb-3" />
              <div className="text-sm text-slate-500">Upload a reference image to search for matching appearances across all cameras</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
