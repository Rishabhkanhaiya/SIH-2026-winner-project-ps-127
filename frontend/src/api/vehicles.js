/**
 * vehicles.js — Vehicle and plate API calls.
 */
import client from './client'

/**
 * GET /api/v1/plates/search?query=XX
 * Returns { matches: ["MH12AB1234", ...] }
 */
export async function searchPlates(query, limit = 10) {
  const { data } = await client.get('/api/v1/plates/search', {
    params: { query, limit },
  })
  return data.matches || []
}

/**
 * GET /api/v1/trajectory/{plate_number}
 * Returns { plate_number, total_sightings, sightings: [...] }
 */
export async function getTrajectory(plateNumber, params = {}) {
  const { data } = await client.get(`/api/v1/trajectory/${encodeURIComponent(plateNumber)}`, {
    params,
  })
  return data
}

/**
 * GET /api/v1/vehicles — paginated vehicle list.
 */
export async function getVehicles(params = {}) {
  const { data } = await client.get('/api/v1/vehicles', { params })
  return data
}

/**
 * GET /api/v1/vehicles/{plate_number} — vehicle detail with recent sightings.
 */
export async function getVehicle(plateNumber) {
  const { data } = await client.get(`/api/v1/vehicles/${encodeURIComponent(plateNumber)}`)
  return data
}
