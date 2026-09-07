/**
 * analytics.js — Analytics REST API calls.
 */
import client from './client'

/** GET /api/v1/analytics/summary — KPI rollup. */
export async function getSummary() {
  const { data } = await client.get('/api/v1/analytics/summary')
  return data
}

/** GET /api/v1/analytics/heatmap — weighted lat/lng points. */
export async function getHeatmap(params = {}) {
  const { data } = await client.get('/api/v1/analytics/heatmap', { params })
  return data
}

/** GET /api/v1/analytics/traffic — 24h traffic by hour. */
export async function getTrafficByHour() {
  const { data } = await client.get('/api/v1/analytics/traffic')
  return data
}

/** GET /api/v1/analytics/vehicle-types — breakdown by vehicle type. */
export async function getVehicleTypes() {
  const { data } = await client.get('/api/v1/analytics/vehicle-types')
  return data
}

/** GET /api/v1/analytics/camera-activity — top cameras by sightings today. */
export async function getCameraActivity() {
  const { data } = await client.get('/api/v1/analytics/camera-activity')
  return data
}

/** GET /api/v1/analytics/incidents-by-hour — incident distribution by hour. */
export async function getIncidentsByHour() {
  const { data } = await client.get('/api/v1/analytics/incidents-by-hour')
  return data
}
