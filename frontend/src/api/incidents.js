/**
 * incidents.js — Incidents REST API calls.
 */
import client from './client'

/** GET /api/v1/incidents — returns array of incident objects. */
export async function getIncidents(params = {}) {
  const { data } = await client.get('/api/v1/incidents', { params })
  return data
}

/** POST /api/v1/incidents — create new incident. */
export async function createIncident(payload) {
  const { data } = await client.post('/api/v1/incidents', payload)
  return data
}

/** GET /api/v1/incidents/{id} — single incident detail. */
export async function getIncident(id) {
  const { data } = await client.get(`/api/v1/incidents/${id}`)
  return data
}

/** PUT /api/v1/incidents/{id} — update status/priority. */
export async function updateIncident(id, payload) {
  const { data } = await client.put(`/api/v1/incidents/${id}`, payload)
  return data
}
