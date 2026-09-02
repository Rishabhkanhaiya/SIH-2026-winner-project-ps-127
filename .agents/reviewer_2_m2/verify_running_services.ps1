# verify_running_services.ps1
$ErrorActionPreference = "Stop"

Write-Host "=========================================================================="
Write-Host "  TEST 1: Service-B Swagger Docs (http://localhost:8000/docs)"
Write-Host "=========================================================================="
$bDocs = Invoke-WebRequest -Uri "http://localhost:8000/docs" -UseBasicParsing
Write-Host "Status: $($bDocs.StatusCode)"
Write-Host "Content length: $($bDocs.Content.Length)"
if ($bDocs.StatusCode -ne 200) { throw "Test 1 Failed" }

Write-Host "`n=========================================================================="
Write-Host "  TEST 2: Service-A Health (http://localhost:8001/health)"
Write-Host "=========================================================================="
$aHealth = Invoke-RestMethod -Uri "http://localhost:8001/health"
Write-Host "Status: $($aHealth.status)"
Write-Host "Model Version: $($aHealth.model_version)"
if ($aHealth.status -ne "ok") { throw "Test 2 Failed" }

Write-Host "`n=========================================================================="
Write-Host "  TEST 3: Frontend Root (http://localhost:5173/)"
Write-Host "=========================================================================="
$feRoot = Invoke-WebRequest -Uri "http://localhost:5173/" -UseBasicParsing
Write-Host "Status: $($feRoot.StatusCode)"
$hasTitle = $feRoot.Content -match "Urban Pulse AI"
Write-Host "Contains 'Urban Pulse AI': $hasTitle"
if ($feRoot.StatusCode -ne 200 -or -not $hasTitle) { throw "Test 3 Failed" }

Write-Host "`n=========================================================================="
Write-Host "  TEST 4: Service-B Root & Authenticated APIs"
Write-Host "=========================================================================="
$bRoot = Invoke-RestMethod -Uri "http://localhost:8000/"
Write-Host "Service-B Root: $($bRoot.service) ($($bRoot.status))"

# Admin Login
$login = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/auth/login" -Method Post -Body (@{username='admin'; password='admin123'} | ConvertTo-Json) -ContentType 'application/json'
Write-Host "Admin Login Token Type: $($login.token_type), Role: $($login.role)"
$token = $login.token
$headers = @{ Authorization = "Bearer $token" }

# Cameras
$cameras = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/cameras" -Headers $headers
Write-Host "Seeded Cameras Count: $($cameras.Count)"
Write-Host "First Camera: $($cameras[0].camera_id) | $($cameras[0].name) | $($cameras[0].zone)"

# Vehicles
$vehicles = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/vehicles" -Headers $headers
Write-Host "Seeded Vehicles Count: $($vehicles.Count)"
Write-Host "First Vehicle: $($vehicles[0].plate_number) | $($vehicles[0].vehicle_type) | $($vehicles[0].color)"

# Incidents
$incidents = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/incidents" -Headers $headers
Write-Host "Seeded Incidents Count: $($incidents.Count)"

# Alerts
$alerts = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/alerts" -Headers $headers
Write-Host "Seeded Alerts Count: $($alerts.Count)"

# Analytics Summary
$analytics = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/analytics/summary" -Headers $headers
Write-Host "Analytics: Total Sightings = $($analytics.total_sightings), Active Alerts = $($analytics.active_alerts), Total Incidents = $($analytics.total_incidents)"

# Blacklist
$blacklist = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/blacklist" -Headers $headers
Write-Host "Blacklist Entries: $($blacklist.Count)"

# Ingest API with X-API-Key
$ingestPayload = @{
    camera_id = "CAM-001"
    plate_number = "MH12AB1234"
    confidence = 0.94
    timestamp = (Get-Date).ToString("o")
    bbox = @(100.0, 200.0, 300.0, 400.0)
    vehicle_type = "sedan"
} | ConvertTo-Json

$ingestResp = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/ingest" -Method Post -Headers @{"X-API-Key"="urbanpulse-internal-api-key-2026"} -Body $ingestPayload -ContentType "application/json"
Write-Host "Ingest Response: Sighting ID $($ingestResp.id), Plate: $($ingestResp.plate_number), Blacklisted: $($ingestResp.is_blacklisted)"

Write-Host "`n=========================================================================="
Write-Host "  TEST 5: Frontend Vite Proxy to Service-B"
Write-Host "=========================================================================="
$proxiedCams = Invoke-RestMethod -Uri "http://localhost:5173/api/v1/cameras" -Headers $headers
Write-Host "Proxied Camera Count via Port 5173: $($proxiedCams.Count)"
if ($proxiedCams.Count -ne $cameras.Count) { throw "Proxy test failed" }

Write-Host "`n=========================================================================="
Write-Host "  TEST 6: Active Port Connections Check"
Write-Host "=========================================================================="
$ports = Get-NetTCPConnection -LocalPort 8000, 8001, 5173 -State Listen
foreach ($p in $ports) {
    Write-Host "Port $($p.LocalPort) is LISTENING on PID $($p.OwningProcess)"
}

Write-Host "`n=========================================================================="
Write-Host "  ALL 6 INTEGRATION TESTS PASSED WITH 200 OK!"
Write-Host "=========================================================================="
