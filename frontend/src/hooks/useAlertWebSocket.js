/**
 * useAlertWebSocket.js — Manages the alert WebSocket lifecycle.
 *
 * Features:
 *   - Auto-connects on mount
 *   - Auto-reconnects on unexpected close (with 3s delay)
 *   - Prepends incoming alerts to state list
 *   - Cleans up on unmount
 *
 * Usage:
 *   const { alerts, connected } = useAlertWebSocket()
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { connectAlertWebSocket } from '../api/alerts'
import { isAuthenticated } from '../api/auth'

const RECONNECT_DELAY_MS = 3000
const MAX_ALERTS = 100

export function useAlertWebSocket() {
  const [alerts, setAlerts] = useState([])
  const [connected, setConnected] = useState(false)
  const wsRef = useRef(null)
  const reconnectTimer = useRef(null)
  const unmounted = useRef(false)

  const connect = useCallback(() => {
    if (unmounted.current) return
    if (!isAuthenticated()) return

    wsRef.current = connectAlertWebSocket(
      // onMessage
      (alert) => {
        if (unmounted.current) return
        setAlerts((prev) => {
          // Avoid duplicates (by id)
          if (prev.some((a) => a.id === alert.id)) return prev
          return [alert, ...prev].slice(0, MAX_ALERTS)
        })
      },
      // onError
      () => {
        if (unmounted.current) return
        setConnected(false)
      },
      // onClose
      (event) => {
        if (unmounted.current) return
        setConnected(false)
        // Reconnect unless it was a deliberate close (code 1000)
        if (event.code !== 1000) {
          reconnectTimer.current = setTimeout(() => {
            if (!unmounted.current) connect()
          }, RECONNECT_DELAY_MS)
        }
      }
    )

    if (wsRef.current) {
      wsRef.current.onopen = () => {
        if (!unmounted.current) setConnected(true)
      }
    }
  }, [])

  useEffect(() => {
    unmounted.current = false
    connect()
    return () => {
      unmounted.current = true
      clearTimeout(reconnectTimer.current)
      try {
        wsRef.current?.close(1000, 'Component unmounted')
      } catch {}
    }
  }, [connect])

  return { alerts, connected, setAlerts }
}

export default useAlertWebSocket
