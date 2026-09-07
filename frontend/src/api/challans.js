import client from './client'

export async function getChallans(params = {}) {
  const res = await client.get('/api/v1/challans', { params })
  return res.data
}

export async function issueChallan(data) {
  const res = await client.post('/api/v1/challans', data)
  return res.data
}

export async function payChallan(id) {
  const res = await client.put(`/api/v1/challans/${id}/pay`)
  return res.data
}

export async function cancelChallan(id) {
  const res = await client.delete(`/api/v1/challans/${id}`)
  return res.data
}
