import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import LoginPage from './pages/LoginPage'
import Overview from './pages/Overview'
import LiveMap from './pages/LiveMap'
import Cameras from './pages/Cameras'
import VehicleSearch from './pages/VehicleSearch'
import PersonTracking from './pages/PersonTracking'
import IncidentFlagging from './pages/IncidentFlagging'
import TrafficAnalytics from './pages/TrafficAnalytics'
import Reports from './pages/Reports'
import SystemHealth from './pages/SystemHealth'
import Settings from './pages/Settings'

function MainLayout({ onLogout }) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#08111F] text-slate-900 dark:text-[#F8FAFC] transition-colors">
      <Sidebar onLogout={onLogout} />
      <div className="flex-1 flex flex-col ml-60 overflow-hidden">
        <TopBar onLogout={onLogout} />
        <main className="flex-1 overflow-y-auto pt-14 p-6">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/map" element={<LiveMap />} />
            <Route path="/cameras" element={<Cameras />} />
            <Route path="/traffic" element={<TrafficAnalytics />} />
            <Route path="/vehicles" element={<VehicleSearch />} />
            <Route path="/persons" element={<PersonTracking />} />
            <Route path="/incidents" element={<IncidentFlagging />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/system" element={<SystemHealth />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    try {
      const stored = localStorage.getItem('urbanpulse_user')
      if (stored === null) {
        // Default to logged in so user sees dashboard directly on launch
        localStorage.setItem('urbanpulse_user', JSON.stringify({ username: 'admin', role: 'Command Officer' }))
        return true
      }
      return !!stored
    } catch {
      return true
    }
  })

  const handleLogin = (username) => {
    try {
      localStorage.setItem('urbanpulse_user', JSON.stringify({ username: username || 'admin', role: 'Command Officer' }))
    } catch {}
    setIsLoggedIn(true)
  }

  const handleLogout = () => {
    try {
      localStorage.removeItem('urbanpulse_user')
    } catch {}
    setIsLoggedIn(false)
  }

  return (
    <ThemeProvider>
      <BrowserRouter>
        {!isLoggedIn ? (
          <LoginPage onLogin={handleLogin} />
        ) : (
          <MainLayout onLogout={handleLogout} />
        )}
      </BrowserRouter>
    </ThemeProvider>
  )
}
