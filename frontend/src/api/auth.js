/**
 * auth.js — Authentication API calls and session management.
 */
import client from './client'

/**
 * Login with username + password.
 * On success, stores JWT token and user info in localStorage.
 * Returns { token, role, username, expires_in }
 */
export async function login(username, password) {
  const { data } = await client.post('/api/v1/auth/login', { username, password })
  // Store token and user info
  localStorage.setItem('urbanpulse_token', data.token)
  localStorage.setItem('urbanpulse_user', JSON.stringify({
    username: data.username,
    role: data.role,
  }))
  return data
}

/**
 * Logout — clear session data.
 */
export function logout() {
  localStorage.removeItem('urbanpulse_token')
  localStorage.removeItem('urbanpulse_user')
}

/**
 * Get the current user from localStorage (no network call).
 * Returns { username, role } or null if not logged in.
 */
export function getUser() {
  try {
    const stored = localStorage.getItem('urbanpulse_user')
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

/**
 * Get the JWT token from localStorage.
 */
export function getToken() {
  try {
    return localStorage.getItem('urbanpulse_token') || null
  } catch {
    return null
  }
}

/**
 * Check if the user is currently authenticated (token present).
 */
export function isAuthenticated() {
  return !!getToken()
}

/**
 * GET /api/v1/auth/me — verify token and get current user from server.
 */
export async function getMe() {
  const { data } = await client.get('/api/v1/auth/me')
  return data
}
