import client from './client'

export async function scanPlatePhoto(file, cameraId = null) {
  const formData = new FormData()
  formData.append('file', file)
  if (cameraId) {
    formData.append('camera_id', cameraId)
  }
  const res = await client.post('/api/v1/vehicles/scan-plate', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 30000,
  })
  return res.data
}
