/**
 * alerts.js — Alert REST API and WebSocket connection.
 */
import client, { BASE_URL } from './client'
import { getToken } from './auth'

/**
 * GET /api/v1/alerts — paginated alert list.
 * Returns array of alert objects.
 */
export async function getAlerts(limit = 50, offset = 0, params = {}) {
  const { data } = await client.get('/api/v1/alerts', {
    params: { limit, offset, ...params },
  })
  return data
}

/**
 * POST /api/v1/alerts/{id}/acknowledge
 */
export async function acknowledgeAlert(alertId) {
  const { data } = await client.post(`/api/v1/alerts/${alertId}/acknowledge`)
  return data
}

/**
 * Connect to WS /ws/alerts?token=<jwt>
 *
 * @param {function} onMessage  - Called with parsed alert object on each message
 * @param {function} onError    - Called on error
 * @param {function} onClose    - Called when connection closes
 * @returns {WebSocket}         - The WebSocket instance (call .close() to disconnect)
 */
export function connectAlertWebSocket(onMessage, onError, onClose) {
  const token = getToken()
  if (!token) {
    console.warn('[AlertWS] No token — skipping WebSocket connection')
    return null
  }

  const wsBase = BASE_URL.replace(/^http/, 'ws')
  const url = `${wsBase}/ws/alerts?token=${encodeURIComponent(token)}`

  let ws
  try {
    ws = new WebSocket(url)
  } catch (err) {
    console.error('[AlertWS] Failed to create WebSocket:', err)
    onError?.(err)
    return null
  }

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data)
      if (msg.type === 'ping') return  // ignore keep-alive pings
      onMessage?.(msg)
    } catch (err) {
      console.warn('[AlertWS] Failed to parse message:', event.data)
    }
  }

  ws.onerror = (err) => {
    console.error('[AlertWS] Error:', err)
    onError?.(err)
  }

  ws.onclose = (event) => {
    console.info('[AlertWS] Connection closed:', event.code, event.reason)
    onClose?.(event)
  }

  return ws
}
