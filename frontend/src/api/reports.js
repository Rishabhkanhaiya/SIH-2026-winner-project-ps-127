/**
 * reports.js — API client methods for ReportLab PDF generation and document viewing.
 */
import client, { BASE_URL } from './client'

export function getPdfDownloadUrl(reportId) {
  return `${BASE_URL}/api/v1/reports/${reportId}/pdf`
}

export async function fetchReportData(reportId) {
  try {
    const res = await client.get(`/api/v1/reports/${reportId}/view`)
    return res.data
  } catch (err) {
    console.warn(`Failed to fetch report ${reportId} view data:`, err)
    return null
  }
}

export async function downloadReportPdf(reportId, reportName = 'urbanpulse-report') {
  try {
    const res = await client.get(`/api/v1/reports/${reportId}/pdf`, {
      responseType: 'blob',
    })
    const blob = new Blob([res.data], { type: 'application/pdf' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const safeName = reportName.replace(/[^a-zA-Z0-9_\-]/g, '_')
    a.download = `${safeName}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => window.URL.revokeObjectURL(url), 1000)
    return true
  } catch (err) {
    console.warn('Axios PDF download failed, falling back to direct window download:', err)
    window.open(getPdfDownloadUrl(reportId), '_blank')
    return false
  }
}

export async function getPdfBlobUrl(reportId) {
  try {
    const res = await client.get(`/api/v1/reports/${reportId}/pdf`, {
      responseType: 'blob',
    })
    const blob = new Blob([res.data], { type: 'application/pdf' })
    return window.URL.createObjectURL(blob)
  } catch (err) {
    console.warn('Failed to get PDF blob, fallback to direct URL:', err)
    return `${BASE_URL}/api/v1/reports/${reportId}/pdf`
  }
}
