// ─────────────────────────────────────────────────────────────
// Urban Pulse AI — Comprehensive Mock Data
// Realistic data for Pune, India demo scenario
// ─────────────────────────────────────────────────────────────

export const CAMERAS = [
  { id: 'CAM-001', name: 'MG Road Junction', lat: 18.5196, lng: 73.8553, zone: 'Zone A', status: 'online', vehicles_today: 1240, pedestrians_today: 3450, uptime: 99.2 },
  { id: 'CAM-002', name: 'FC Road Signal', lat: 18.5314, lng: 73.8446, zone: 'Zone A', status: 'online', vehicles_today: 980, pedestrians_today: 2100, uptime: 98.5 },
  { id: 'CAM-003', name: 'Swargate Junction', lat: 18.5016, lng: 73.8577, zone: 'Zone B', status: 'online', vehicles_today: 1560, pedestrians_today: 4200, uptime: 99.8 },
  { id: 'CAM-004', name: 'Shivajinagar Circle', lat: 18.5308, lng: 73.8474, zone: 'Zone A', status: 'online', vehicles_today: 1120, pedestrians_today: 2800, uptime: 97.4 },
  { id: 'CAM-005', name: 'Kothrud Depot', lat: 18.5088, lng: 73.8064, zone: 'Zone C', status: 'online', vehicles_today: 760, pedestrians_today: 1900, uptime: 99.1 },
  { id: 'CAM-006', name: 'Hadapsar Signal', lat: 18.5018, lng: 73.9280, zone: 'Zone D', status: 'online', vehicles_today: 890, pedestrians_today: 2300, uptime: 98.7 },
  { id: 'CAM-007', name: 'Baner Road Junction', lat: 18.5590, lng: 73.7868, zone: 'Zone C', status: 'online', vehicles_today: 1430, pedestrians_today: 3100, uptime: 99.3 },
  { id: 'CAM-008', name: 'Hinjewadi IT Park', lat: 18.5912, lng: 73.7389, zone: 'Zone E', status: 'online', vehicles_today: 2100, pedestrians_today: 5600, uptime: 99.9 },
  { id: 'CAM-009', name: 'Viman Nagar Signal', lat: 18.5679, lng: 73.9143, zone: 'Zone D', status: 'online', vehicles_today: 1320, pedestrians_today: 3400, uptime: 98.2 },
  { id: 'CAM-010', name: 'Wakad Junction', lat: 18.5993, lng: 73.7617, zone: 'Zone E', status: 'online', vehicles_today: 980, pedestrians_today: 2100, uptime: 97.8 },
  { id: 'CAM-011', name: 'Kharadi IT Hub', lat: 18.5538, lng: 73.9416, zone: 'Zone D', status: 'online', vehicles_today: 1780, pedestrians_today: 4800, uptime: 99.6 },
  { id: 'CAM-012', name: 'Deccan Gymkhana', lat: 18.5197, lng: 73.8380, zone: 'Zone A', status: 'online', vehicles_today: 890, pedestrians_today: 2400, uptime: 98.1 },
  { id: 'CAM-013', name: 'Aundh Market', lat: 18.5617, lng: 73.8075, zone: 'Zone C', status: 'online', vehicles_today: 670, pedestrians_today: 1800, uptime: 99.4 },
  { id: 'CAM-014', name: 'Katraj Bypass', lat: 18.4535, lng: 73.8669, zone: 'Zone B', status: 'online', vehicles_today: 1240, pedestrians_today: 2100, uptime: 98.9 },
  { id: 'CAM-015', name: 'Pimpri Chowk', lat: 18.6298, lng: 73.7997, zone: 'Zone F', status: 'online', vehicles_today: 1560, pedestrians_today: 3800, uptime: 99.0 },
  { id: 'CAM-016', name: 'Chinchwad Bridge', lat: 18.6462, lng: 73.7940, zone: 'Zone F', status: 'online', vehicles_today: 2340, pedestrians_today: 4100, uptime: 98.4 },
  { id: 'CAM-017', name: 'Warje Junction', lat: 18.4922, lng: 73.8116, zone: 'Zone B', status: 'offline', vehicles_today: 0, pedestrians_today: 0, uptime: 45.2 },
  { id: 'CAM-018', name: 'Kondhwa Road', lat: 18.4721, lng: 73.8971, zone: 'Zone B', status: 'offline', vehicles_today: 0, pedestrians_today: 0, uptime: 12.8 },
  { id: 'CAM-019', name: 'Nagar Road Entry', lat: 18.5541, lng: 73.9512, zone: 'Zone D', status: 'online', vehicles_today: 1890, pedestrians_today: 2900, uptime: 99.7 },
  { id: 'CAM-020', name: 'Pune Station Gate', lat: 18.5280, lng: 73.8741, zone: 'Zone A', status: 'maintenance', vehicles_today: 0, pedestrians_today: 0, uptime: 88.3 },
]

export const ALERTS = [
  { id: 1, severity: 'critical', event: 'Wrong-way vehicle detected', camera: 'CAM-024', location: 'Central Avenue', timestamp: new Date(Date.now() - 12000), status: 'new', plate: 'MH12AB5678' },
  { id: 2, severity: 'warning', event: 'Unusual crowd formation', camera: 'CAM-045', location: 'FC Road, Zone B4', timestamp: new Date(Date.now() - 65000), status: 'new', plate: null },
  { id: 3, severity: 'critical', event: 'Speeding vehicle detected', camera: 'CAM-008', location: 'Hinjewadi Expressway', timestamp: new Date(Date.now() - 120000), status: 'acknowledged', plate: 'DL01AB2345' },
  { id: 4, severity: 'info', event: 'Camera offline', camera: 'CAM-017', location: 'Warje Junction', timestamp: new Date(Date.now() - 300000), status: 'acknowledged', plate: null },
  { id: 5, severity: 'critical', event: 'Blacklisted vehicle detected', camera: 'CAM-003', location: 'Swargate Junction', timestamp: new Date(Date.now() - 450000), status: 'new', plate: 'MH14ZZ9999' },
  { id: 6, severity: 'warning', event: 'Traffic congestion detected', camera: 'CAM-001', location: 'MG Road Junction', timestamp: new Date(Date.now() - 600000), status: 'acknowledged', plate: null },
  { id: 7, severity: 'warning', event: 'Abandoned vehicle detected', camera: 'CAM-012', location: 'Deccan Gymkhana', timestamp: new Date(Date.now() - 900000), status: 'new', plate: 'KA01CD3456' },
  { id: 8, severity: 'info', event: 'Night vehicle movement', camera: 'CAM-014', location: 'Katraj Bypass', timestamp: new Date(Date.now() - 1200000), status: 'resolved', plate: 'MH12EF7890' },
  { id: 9, severity: 'critical', event: 'Vehicle running red light', camera: 'CAM-004', location: 'Shivajinagar', timestamp: new Date(Date.now() - 1500000), status: 'resolved', plate: 'MH15GH2345' },
  { id: 10, severity: 'warning', event: 'Pedestrian in restricted zone', camera: 'CAM-009', location: 'Viman Nagar', timestamp: new Date(Date.now() - 1800000), status: 'acknowledged', plate: null },
  { id: 11, severity: 'info', event: 'Vehicle count threshold exceeded', camera: 'CAM-016', location: 'Chinchwad Bridge', timestamp: new Date(Date.now() - 2100000), status: 'resolved', plate: null },
  { id: 12, severity: 'critical', event: 'Unauthorized entry detected', camera: 'CAM-011', location: 'Kharadi Restricted Zone', timestamp: new Date(Date.now() - 2400000), status: 'new', plate: 'UP32AB1111' },
]

export const INCIDENTS = [
  { id: 1, type: 'Wrong-way Vehicle', priority: 'HIGH', camera: 'CAM-024', location: 'Eastern Expressway', lat: 18.5280, lng: 73.8741, status: 'active', time: '10:43 AM', confidence: 0.97, assigned: null, description: 'Vehicle detected traveling in wrong direction on expressway entry ramp' },
  { id: 2, type: 'Unauthorized Entry', priority: 'HIGH', camera: 'CAM-012', location: 'Restricted Zone A', lat: 18.5197, lng: 73.8380, status: 'active', time: '10:31 AM', confidence: 0.94, assigned: 'Officer Kumar', description: 'Unregistered vehicle entered restricted government zone' },
  { id: 3, type: 'Crowd Gathering', priority: 'MEDIUM', camera: 'CAM-045', location: 'FC Road', lat: 18.5314, lng: 73.8446, status: 'active', time: '10:15 AM', confidence: 0.88, assigned: null, description: 'Large group of people gathering near FC Road market area' },
  { id: 4, type: 'Abandoned Vehicle', priority: 'MEDIUM', camera: 'CAM-018', location: 'Shivajinagar Station', lat: 18.5308, lng: 73.8474, status: 'active', time: '09:58 AM', confidence: 0.91, assigned: 'Officer Singh', description: 'Vehicle parked for extended period, no movement detected for 45 min' },
  { id: 5, type: 'Speeding Vehicle', priority: 'HIGH', camera: 'CAM-008', location: 'Hinjewadi Expressway', lat: 18.5912, lng: 73.7389, status: 'investigating', time: '09:42 AM', confidence: 0.96, assigned: 'Officer Patil', description: 'Vehicle traveling at estimated 120 km/h in 60 km/h zone' },
  { id: 6, type: 'Traffic Accident', priority: 'HIGH', camera: 'CAM-003', location: 'Swargate Junction', lat: 18.5016, lng: 73.8577, status: 'investigating', time: '09:15 AM', confidence: 0.99, assigned: 'Inspector Joshi', description: 'Two-vehicle collision detected, emergency services notified' },
  { id: 7, type: 'Blacklist Match', priority: 'HIGH', camera: 'CAM-007', location: 'Baner Road', lat: 18.5590, lng: 73.7868, status: 'investigating', time: '08:50 AM', confidence: 0.98, assigned: 'Officer Kumar', description: 'Blacklisted vehicle MH14ZZ9999 detected, police alerted' },
  { id: 8, type: 'Signal Jump', priority: 'MEDIUM', camera: 'CAM-001', location: 'MG Road', lat: 18.5196, lng: 73.8553, status: 'resolved', time: '08:23 AM', confidence: 0.89, assigned: 'Officer Singh', description: 'Vehicle ran red light at MG Road junction' },
  { id: 9, type: 'Road Blockage', priority: 'MEDIUM', camera: 'CAM-016', location: 'Chinchwad Bridge', lat: 18.6462, lng: 73.7940, status: 'resolved', time: '07:45 AM', confidence: 0.92, assigned: 'Traffic Control', description: 'Broken down vehicle blocking inner lane' },
  { id: 10, type: 'Pedestrian Safety', priority: 'LOW', camera: 'CAM-009', location: 'Viman Nagar Signal', lat: 18.5679, lng: 73.9143, status: 'resolved', time: '07:10 AM', confidence: 0.85, assigned: 'Officer Patil', description: 'Pedestrians crossing during red signal' },
]

export const VEHICLES = [
  { plate: 'MH12AB1234', type: 'Sedan', color: 'White', sightings: 8, lastCamera: 'CAM-003', lastLocation: 'Swargate Junction', lastSeen: '10:47 AM', confidence: 0.96, flagged: false },
  { plate: 'DL01AB2345', type: 'SUV', color: 'Black', sightings: 5, lastCamera: 'CAM-008', lastLocation: 'Hinjewadi IT Park', lastSeen: '10:42 AM', confidence: 0.92, flagged: true },
  { plate: 'KA01CD3456', type: 'Hatchback', color: 'Red', sightings: 3, lastCamera: 'CAM-012', lastLocation: 'Deccan Gymkhana', lastSeen: '10:35 AM', confidence: 0.88, flagged: false },
  { plate: 'MH14EF5678', type: 'Truck', color: 'Blue', sightings: 12, lastCamera: 'CAM-016', lastLocation: 'Chinchwad Bridge', lastSeen: '10:28 AM', confidence: 0.94, flagged: false },
  { plate: 'UP32GH7890', type: 'Bus', color: 'Yellow', sightings: 6, lastCamera: 'CAM-015', lastLocation: 'Pimpri Chowk', lastSeen: '10:20 AM', confidence: 0.97, flagged: false },
  { plate: 'MH15IJ9012', type: 'Motorcycle', color: 'Grey', sightings: 4, lastCamera: 'CAM-004', lastLocation: 'Shivajinagar', lastSeen: '10:15 AM', confidence: 0.85, flagged: false },
  { plate: 'TN22KL3456', type: 'Sedan', color: 'Silver', sightings: 2, lastCamera: 'CAM-019', lastLocation: 'Nagar Road', lastSeen: '10:10 AM', confidence: 0.90, flagged: false },
  { plate: 'MH14ZZ9999', type: 'SUV', color: 'Black', sightings: 3, lastCamera: 'CAM-007', lastLocation: 'Baner Road', lastSeen: '08:50 AM', confidence: 0.98, flagged: true },
]

export const ANPR_RECORDS = Array.from({ length: 40 }, (_, i) => ({
  id: i + 1,
  plate: ['MH12AB1234','DL01AB2345','KA01CD3456','MH14EF5678','UP32GH7890','MH15IJ9012','TN22KL3456','MH14ZZ9999','GJ05MN8901','RJ14OP2345'][i % 10],
  type: ['Sedan','SUV','Hatchback','Truck','Bus','Motorcycle'][i % 6],
  camera: `CAM-0${String((i % 16) + 1).padStart(2,'0')}`,
  location: ['MG Road','FC Road','Swargate','Shivajinagar','Kothrud','Hadapsar','Baner','Hinjewadi','Viman Nagar','Wakad'][i % 10],
  time: `${String(9 + Math.floor(i/4)).padStart(2,'0')}:${String((i * 7) % 60).padStart(2,'0')} AM`,
  confidence: (0.82 + Math.random() * 0.17).toFixed(2),
  status: ['Verified','Clear','Flagged','Blacklisted'][i % 4 === 3 && i === 7 ? 3 : i % 3],
}))

export const TRAFFIC_24H = Array.from({ length: 24 }, (_, h) => ({
  hour: `${String(h).padStart(2,'0')}:00`,
  vehicles: Math.round(200 + 800 * Math.sin((h - 8) * Math.PI / 10) * (h >= 7 && h <= 21 ? 1 : 0.1) + Math.random() * 100),
  incidents: Math.round(Math.random() * (h >= 8 && h <= 20 ? 3 : 1)),
  pedestrians: Math.round(100 + 400 * Math.sin((h - 9) * Math.PI / 10) * (h >= 6 && h <= 22 ? 1 : 0.05) + Math.random() * 50),
}))

export const VEHICLE_TYPES = [
  { name: 'Cars/Sedans', value: 42, color: '#22D3EE' },
  { name: 'Two-Wheelers', value: 28, color: '#3B82F6' },
  { name: 'SUVs', value: 15, color: '#22C55E' },
  { name: 'Trucks/Buses', value: 10, color: '#F59E0B' },
  { name: 'Autos', value: 5, color: '#A855F7' },
]

export const INCIDENTS_BY_HOUR = Array.from({ length: 12 }, (_, i) => ({
  hour: `${String(i + 7).padStart(2,'0')}:00`,
  high: Math.round(Math.random() * 3),
  medium: Math.round(Math.random() * 5),
  low: Math.round(Math.random() * 4),
}))

export const CAMERA_ACTIVITY = CAMERAS
  .filter(c => c.status === 'online')
  .sort((a, b) => b.vehicles_today - a.vehicles_today)
  .slice(0, 8)
  .map(c => ({ name: c.id, vehicles: c.vehicles_today, location: c.name }))

export const HEATMAP_POINTS = CAMERAS
  .filter(c => c.status === 'online')
  .map(c => ({ lat: c.lat + (Math.random() - 0.5) * 0.005, lng: c.lng + (Math.random() - 0.5) * 0.005, weight: c.vehicles_today / 100 }))

export const BLACKLIST = [
  { plate: 'MH14ZZ9999', reason: 'Stolen vehicle', addedBy: 'Inspector Joshi', addedAt: '2026-08-15' },
  { plate: 'DL99XX0001', reason: 'Wanted criminal vehicle', addedBy: 'Admin', addedAt: '2026-08-20' },
  { plate: 'KA33YY1234', reason: 'Drug trafficking suspect', addedBy: 'Inspector Patil', addedAt: '2026-08-22' },
  { plate: 'UP45ZZ5678', reason: 'Expired registration', addedBy: 'Officer Singh', addedAt: '2026-08-28' },
  { plate: 'MH12AA9999', reason: 'Hit and run suspect', addedBy: 'Inspector Joshi', addedAt: '2026-09-01' },
]

export const REPORTS = [
  { id: 1, name: 'Daily Traffic Report — Aug 31', type: 'Traffic', date: '2026-08-31', status: 'ready', size: '2.4 MB' },
  { id: 2, name: 'Vehicle Activity Report — Week 35', type: 'Vehicles', date: '2026-08-30', status: 'ready', size: '4.1 MB' },
  { id: 3, name: 'ANPR Summary — August 2026', type: 'ANPR', date: '2026-08-29', status: 'ready', size: '8.7 MB' },
  { id: 4, name: 'Incident Analysis — Q3 2026', type: 'Incidents', date: '2026-08-28', status: 'ready', size: '1.8 MB' },
  { id: 5, name: 'System Performance Report', type: 'System', date: '2026-08-27', status: 'ready', size: '0.9 MB' },
  { id: 6, name: 'Pedestrian Density Analysis', type: 'Pedestrians', date: '2026-08-26', status: 'ready', size: '3.2 MB' },
  { id: 7, name: 'Traffic Report — Sept 1', type: 'Traffic', date: '2026-09-01', status: 'generating', size: null },
  { id: 8, name: 'Zone B Analytics', type: 'Traffic', date: '2026-09-02', status: 'scheduled', size: null },
]

export const SYSTEM_METRICS = {
  cameras_online: 17,
  cameras_total: 20,
  cameras_offline: 2,
  cameras_maintenance: 1,
  gpu_usage: 67,
  cpu_usage: 43,
  ram_usage: 58,
  storage_used: 72,
  api_latency: 45,
  processing_fps: 28.4,
  db_status: 'operational',
  ai_status: 'healthy',
  api_status: 'operational',
  uptime_hours: 842,
}

export const KPI_SUMMARY = {
  cameras_online: 128,
  vehicles_today: 12400,
  active_incidents: 8,
  traffic_flow: 74,
  high_priority_alerts: 3,
  plates_detected: 8934,
  avg_speed: 42,
}

// Vehicle trajectory for investigation panel
export const VEHICLE_TRAJECTORY = {
  plate: 'MH12AB1234',
  sightings: [
    { camera: 'CAM-008', location: 'Hinjewadi IT Park', time: '08:12 AM', confidence: 0.94, lat: 18.5912, lng: 73.7389 },
    { camera: 'CAM-013', location: 'Aundh Market', time: '08:34 AM', confidence: 0.91, lat: 18.5617, lng: 73.8075 },
    { camera: 'CAM-004', location: 'Shivajinagar', time: '08:58 AM', confidence: 0.96, lat: 18.5308, lng: 73.8474 },
    { camera: 'CAM-001', location: 'MG Road Junction', time: '09:15 AM', confidence: 0.93, lat: 18.5196, lng: 73.8553 },
    { camera: 'CAM-003', location: 'Swargate Junction', time: '10:47 AM', confidence: 0.96, lat: 18.5016, lng: 73.8577 },
  ]
}
