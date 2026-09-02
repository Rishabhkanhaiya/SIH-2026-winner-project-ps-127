import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import Overview from './pages/Overview'
import LiveMap from './pages/LiveMap'
import Cameras from './pages/Cameras'
import VehicleSearch from './pages/VehicleSearch'
import ANPR from './pages/ANPR'
import PersonTracking from './pages/PersonTracking'
import Incidents from './pages/Incidents'
import Alerts from './pages/Alerts'
import Analytics from './pages/Analytics'
import Reports from './pages/Reports'
import SystemHealth from './pages/SystemHealth'

function PlaceholderPage({ title }) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="text-2xl font-bold text-white mb-2">{title}</div>
        <div className="text-slate-500">Module coming soon</div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden" style={{ background: '#08111F' }}>
        <Sidebar />
        <div className="flex-1 flex flex-col ml-60 overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto pt-14 p-6">
            <Routes>
              <Route path="/" element={<Overview />} />
              <Route path="/map" element={<LiveMap />} />
              <Route path="/cameras" element={<Cameras />} />
              <Route path="/traffic" element={<PlaceholderPage title="Traffic Analytics" />} />
              <Route path="/vehicles" element={<VehicleSearch />} />
              <Route path="/anpr" element={<ANPR />} />
              <Route path="/persons" element={<PersonTracking />} />
              <Route path="/incidents" element={<Incidents />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/system" element={<SystemHealth />} />
              <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  )
}
