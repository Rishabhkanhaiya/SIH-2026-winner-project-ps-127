import { useState, useEffect, useRef } from 'react'

// OSRM public routing API — no API key required
// Returns actual road geometry between coordinates
const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving'

// Module-level cache so repeated renders don't re-fetch
const ROUTE_CACHE = new Map()

/**
 * Given an array of {lat, lng} waypoints, fetches the real road geometry
 * from OSRM and returns an array of [lat, lng] positions for a Leaflet Polyline.
 */
export function useOsrmRoute(waypoints) {
  const [roadPath, setRoadPath] = useState(null)
  const [loading, setLoading] = useState(false)
  const abortRef = useRef(null)

  useEffect(() => {
    if (!waypoints || waypoints.length < 2) {
      setRoadPath(null)
      return
    }

    // Build cache key from coordinates
    const cacheKey = waypoints.map(w => `${w.lat.toFixed(5)},${w.lng.toFixed(5)}`).join('|')

    if (ROUTE_CACHE.has(cacheKey)) {
      setRoadPath(ROUTE_CACHE.get(cacheKey))
      return
    }

    // Cancel any in-flight request
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)

    // OSRM expects coordinates as lng,lat (reversed from Leaflet)
    const coords = waypoints.map(w => `${w.lng},${w.lat}`).join(';')
    const url = `${OSRM_BASE}/${coords}?overview=full&geometries=geojson`

    fetch(url, { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        if (data.code === 'Ok' && data.routes?.[0]?.geometry?.coordinates) {
          // GeoJSON coords are [lng, lat] — flip to Leaflet's [lat, lng]
          const path = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng])
          ROUTE_CACHE.set(cacheKey, path)
          setRoadPath(path)
        } else {
          // OSRM failed — fall back to straight waypoint line
          setRoadPath(waypoints.map(w => [w.lat, w.lng]))
        }
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          // Network error — fall back to waypoint positions
          setRoadPath(waypoints.map(w => [w.lat, w.lng]))
        }
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [waypoints])

  return { roadPath, loading }
}
