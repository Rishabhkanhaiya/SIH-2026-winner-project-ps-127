import React, { useState } from 'react'
import { Zap, Shield, User, Lock, Eye, EyeOff, LogIn, Sparkles, CheckCircle2 } from 'lucide-react'
import ThemeToggle from '../components/ThemeToggle'

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('password123')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (!username.trim()) {
      setError('Please enter your operator username.')
      return
    }
    setIsLoading(true)
    setTimeout(() => {
      onLogin(username.trim())
    }, 300)
  }

  const handleDemoLogin = (demoRole = 'admin') => {
    setIsLoading(true)
    setTimeout(() => {
      onLogin(demoRole)
    }, 200)
  }

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-slate-50 dark:bg-[#08111F] text-slate-900 dark:text-[#F8FAFC] transition-colors relative overflow-hidden">
      
      {/* Top Header / Theme Toggle */}
      <header className="w-full px-6 py-4 flex items-center justify-between z-10 border-b border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-[#101C2D]/80 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-600 shadow-sm text-white flex-shrink-0">
            <Zap className="w-5 h-5 text-white" fill="white" />
          </div>
          <div>
            <div className="text-base font-bold text-slate-900 dark:text-white leading-tight">Urban Pulse AI</div>
            <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">Smart City Intelligence & Surveillance</div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span>Command Center Online</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4 z-10">
        <div className="w-full max-w-md">
          <div className="rounded-2xl bg-white dark:bg-[#101C2D] border border-slate-200 dark:border-slate-800 shadow-lg p-8 transition-colors">
            
            {/* Title & Badge */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 mb-3">
                <Shield className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Command Center Gateway
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Enter your credentials to access live surveillance telemetry
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 rounded-lg text-xs font-semibold bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  Operator Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. admin or officer1"
                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg bg-slate-50 dark:bg-[#08111F] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  Security Passcode
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-9 pr-10 py-2.5 text-sm rounded-lg bg-slate-50 dark:bg-[#08111F] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-[#101C2D] disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                <span>{isLoading ? 'Authenticating...' : 'Sign In to Command Center'}</span>
              </button>
            </form>

            {/* Quick Demo Access Divider */}
            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-800" />
              </div>
              <span className="relative px-3 text-xs uppercase tracking-wider bg-white dark:bg-[#101C2D] text-slate-400 font-semibold">
                Fast Track
              </span>
            </div>

            {/* Quick Demo Buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('admin')}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Quick Demo Access (Administrator)</span>
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('officer1')}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-slate-50 dark:bg-[#162438] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-800 transition-all"
              >
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>Demo Access as Officer 1</span>
              </button>
            </div>

            {/* Hint Badge */}
            <div className="mt-6 p-3 rounded-xl bg-blue-50/60 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10 text-xs text-slate-600 dark:text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-blue-700 dark:text-blue-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Demo Mode Credentials</span>
              </div>
              <p className="leading-relaxed text-[11px]">
                Username: <code className="px-1 py-0.5 rounded bg-blue-100/70 dark:bg-blue-500/20 font-mono text-blue-800 dark:text-blue-300">admin</code> or <code className="px-1 py-0.5 rounded bg-blue-100/70 dark:bg-blue-500/20 font-mono text-blue-800 dark:text-blue-300">officer1</code> · Password: any
              </p>
            </div>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-xs text-slate-400 dark:text-slate-500 border-t border-slate-200 dark:border-slate-800/80 bg-white/60 dark:bg-[#101C2D]/60 backdrop-blur">
        Urban Pulse AI Smart City Operations · ISO 27001 Certified Gateway · All rights reserved
      </footer>
    </div>
  )
}
