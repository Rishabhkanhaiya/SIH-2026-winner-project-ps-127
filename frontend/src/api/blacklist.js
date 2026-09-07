/**
 * blacklist.js — Blacklist REST API calls.
 */
import client from './client'

/** GET /api/v1/blacklist — all blacklisted plates. */
export async function getBlacklist() {
  const { data } = await client.get('/api/v1/blacklist')
  return data
}

/**
 * POST /api/v1/blacklist — add a plate (admin only).
 * @param {string} plate_number
 * @param {string} reason
 */
export async function addToBlacklist(plate_number, reason) {
  const { data } = await client.post('/api/v1/blacklist', { plate_number, reason })
  return data
}

/**
 * DELETE /api/v1/blacklist/{plate_number} — remove a plate (admin only).
 */
export async function removeFromBlacklist(plateNumber) {
  const { data } = await client.delete(`/api/v1/blacklist/${encodeURIComponent(plateNumber)}`)
  return data
}
