/**
 * cameras.js — Camera REST API calls.
 */
import client from './client'

/** GET /api/v1/cameras — returns array of camera objects. */
export async function getCameras(params = {}) {
  const { data } = await client.get('/api/v1/cameras', { params })
  return data
}

/** GET /api/v1/cameras/{camera_id} — single camera detail. */
export async function getCamera(cameraId) {
  const { data } = await client.get(`/api/v1/cameras/${cameraId}`)
  return data
}

/** GET /api/v1/cameras/{camera_id}/sightings — recent sightings at a camera. */
export async function getCameraSightings(cameraId, limit = 50) {
  const { data } = await client.get(`/api/v1/cameras/${cameraId}/sightings`, {
    params: { limit },
  })
  return data
}

/** POST /api/v1/cameras — create a new camera (admin only). */
export async function createCamera(payload) {
  const { data } = await client.post('/api/v1/cameras', payload)
  return data
}

/** DELETE /api/v1/cameras/{camera_id} — delete camera. */
export async function deleteCamera(cameraId) {
  const { data } = await client.delete(`/api/v1/cameras/${cameraId}`)
  return data
}
