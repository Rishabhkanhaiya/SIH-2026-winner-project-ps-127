import React, { useState } from 'react'
import {
  Settings as SettingsIcon, Sliders, Shield, Bell, Moon, Sun,
  HardDrive, Database, Cpu, Wifi, Save, RefreshCw, CheckCircle2
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import ThemeToggle from '../components/ThemeToggle'

export default function Settings() {
  const { theme, setTheme } = useTheme()
  const [savedMessage, setSavedMessage] = useState(false)
  const [settings, setSettings] = useState({
    autoRefreshInterval: '5',
    alertSound: true,
    criticalNotifications: true,
    aiInferenceThreshold: '0.85',
    maxStoredTrajectories: '500',
    telemetryLogging: true,
    retentionDays: '30',
    selectedZone: 'Pune Metro Central',
    mapTileStyle: 'CartoDB Auto-Theme',
  })

  const handleSave = (e) => {
    e.preventDefault()
    setSavedMessage(true)
    setTimeout(() => {
      setSavedMessage(false)
    }, 2500)
  }

  return (
    <div className="space-y-6 max-w-5xl">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">System Settings</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400">
              Command Station
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure telemetry polling frequencies, AI detector thresholds, and interface preferences
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold shadow-sm transition-all"
        >
          <Save className="w-4 h-4" />
          <span>Save Preferences</span>
        </button>
      </div>

      {savedMessage && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-xs font-semibold text-green-700 dark:text-green-400 transition-all">
          <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
          <span>Configuration saved successfully and applied to active session.</span>
        </div>
      )}

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Appearance & Interface */}
        <div className="rounded-xl p-5 bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Interface & Visual Theme</h2>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">Color Theme</div>
                <div className="text-[11px] text-slate-500">Active mode: {theme === 'dark' ? 'Dark Mode' : 'Light Mode (Default)'}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    theme === 'light'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>Light</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    theme === 'dark'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>Dark</span>
                </button>
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Command Station Operating Zone
              </label>
              <select
                value={settings.selectedZone}
                onChange={(e) => setSettings(prev => ({ ...prev, selectedZone: e.target.value }))}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-[#08111F] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500"
              >
                <option value="Pune Metro Central">Pune Metro Central (Zone A - F)</option>
                <option value="Zone A - Shivajinagar">Zone A - Shivajinagar Circle</option>
                <option value="Zone B - Swargate">Zone B - Swargate Terminal</option>
                <option value="Zone E - Hinjewadi">Zone E - Hinjewadi Tech Corridor</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                GIS Map Tiles
              </label>
              <select
                value={settings.mapTileStyle}
                onChange={(e) => setSettings(prev => ({ ...prev, mapTileStyle: e.target.value }))}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-[#08111F] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500"
              >
                <option value="CartoDB Auto-Theme">CartoDB Voyager / DarkMatter (Auto-Theme)</option>
                <option value="OpenStreetMap Standard">OpenStreetMap Standard</option>
              </select>
            </div>
          </div>
        </div>

        {/* AI & Telemetry Engine */}
        <div className="rounded-xl p-5 bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <Cpu className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">AI Detection & Polling</h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Telemetry Refresh Interval (seconds)
              </label>
              <select
                value={settings.autoRefreshInterval}
                onChange={(e) => setSettings(prev => ({ ...prev, autoRefreshInterval: e.target.value }))}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-[#08111F] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500"
              >
                <option value="2">2 seconds (High Frequency / Low Latency)</option>
                <option value="5">5 seconds (Standard Operational)</option>
                <option value="15">15 seconds (Bandwidth Saver)</option>
                <option value="30">30 seconds (Manual Refresh Mode)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                AI Confidence Threshold
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0.5"
                  max="0.99"
                  step="0.01"
                  value={settings.aiInferenceThreshold}
                  onChange={(e) => setSettings(prev => ({ ...prev, aiInferenceThreshold: e.target.value }))}
                  className="flex-1 accent-blue-600 cursor-pointer"
                />
                <span className="font-mono text-xs font-bold px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white">
                  {Math.round(parseFloat(settings.aiInferenceThreshold) * 100)}%
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Detections below this confidence score will not trigger automated alerts.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Trajectory Waypoint Memory Limit
              </label>
              <input
                type="number"
                value={settings.maxStoredTrajectories}
                onChange={(e) => setSettings(prev => ({ ...prev, maxStoredTrajectories: e.target.value }))}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-[#08111F] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Notifications & Audio Alerting */}
        <div className="rounded-xl p-5 bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Audio & Visual Notifications</h2>
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <div>
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">Critical Audio Chime</div>
                <div className="text-[11px] text-slate-500">Play alert sound on high-priority vehicle match</div>
              </div>
              <input
                type="checkbox"
                checked={settings.alertSound}
                onChange={(e) => setSettings(prev => ({ ...prev, alertSound: e.target.checked }))}
                className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <div>
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">Desktop Notifications</div>
                <div className="text-[11px] text-slate-500">Display browser notification for immediate dispatches</div>
              </div>
              <input
                type="checkbox"
                checked={settings.criticalNotifications}
                onChange={(e) => setSettings(prev => ({ ...prev, criticalNotifications: e.target.checked }))}
                className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Data Retention & Storage */}
        <div className="rounded-xl p-5 bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Data Retention & Storage</h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Log Retention Policy
              </label>
              <select
                value={settings.retentionDays}
                onChange={(e) => setSettings(prev => ({ ...prev, retentionDays: e.target.value }))}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-[#08111F] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500"
              >
                <option value="7">7 Days (Short-term storage)</option>
                <option value="30">30 Days (Standard Audit Trail)</option>
                <option value="90">90 Days (Extended Regulatory Archive)</option>
                <option value="365">1 Year (Long-term Archive)</option>
              </select>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#08111F] border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-slate-500" />
                <span className="text-slate-600 dark:text-slate-400">Database Size</span>
              </div>
              <span className="font-mono font-bold text-slate-900 dark:text-white">2.41 GB / 20.0 GB</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  )
}
