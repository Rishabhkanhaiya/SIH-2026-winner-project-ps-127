import client from './client'

export async function scanPlatePhoto(file, cameraId = null, colabUrl = null, plateOverride = null) {
  const formData = new FormData()
  formData.append('file', file)
  if (cameraId) {
    formData.append('camera_id', cameraId)
  }
  if (colabUrl) {
    formData.append('colab_url', colabUrl)
  }
  if (plateOverride) {
    formData.append('plate_override', plateOverride)
  }
  const res = await client.post('/api/v1/vehicles/scan-plate', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 35000,
  })
  return res.data
}

export async function getColabStatus() {
  const res = await client.get('/api/v1/system/colab')
  return res.data
}

export async function updateColabUrl(url) {
  const res = await client.post('/api/v1/system/colab', { url })
  return res.data
}

