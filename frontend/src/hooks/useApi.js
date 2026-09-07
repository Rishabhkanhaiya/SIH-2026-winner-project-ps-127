/**
 * useApi.js — Generic data-fetching hook with loading/error state.
 *
 * Usage:
 *   const { data, loading, error, refetch } = useApi(getSummary, [])
 *   const { data: cameras } = useApi(() => getCameras({ zone: 'A' }), [])
 */
import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * @param {function} apiFn     - Async function that returns data
 * @param {Array}    deps      - Dependency array (re-fetches when these change)
 * @param {object}   options
 * @param {any}      options.initialData  - Initial value for data
 * @param {boolean}  options.enabled      - Set false to skip fetching
 */
export function useApi(apiFn, deps = [], { initialData = null, enabled = true } = {}) {
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState(null)
  const mountedRef = useRef(true)

  const fetch = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(null)
    try {
      const result = await apiFn()
      if (mountedRef.current) {
        setData(result)
      }
    } catch (err) {
      if (mountedRef.current) {
        console.error('[useApi] error:', err)
        setError(err?.response?.data?.message || err?.message || 'Request failed')
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    mountedRef.current = true
    fetch()
    return () => {
      mountedRef.current = false
    }
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}

export default useApi
