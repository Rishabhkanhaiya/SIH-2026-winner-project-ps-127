/**
 * client.js — Axios instance with JWT auto-attach and 401 auto-redirect.
 *
 * All API calls go through this single client. Token is read from localStorage
 * on every request so it's always fresh after login.
 */
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Request interceptor: attach Bearer token ──────────────────────────────
client.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem('urbanpulse_token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    } catch {
      // localStorage unavailable — proceed without token
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response interceptor: handle 401 by clearing session ─────────────────
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear stale session data
      try {
        localStorage.removeItem('urbanpulse_token')
        localStorage.removeItem('urbanpulse_user')
      } catch {}
      // Redirect to login (only if not already there)
      if (!window.location.pathname.includes('login')) {
        window.location.reload()
      }
    }
    return Promise.reject(error)
  }
)

export default client
export { BASE_URL }
