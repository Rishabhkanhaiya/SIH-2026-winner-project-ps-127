# test_full_lifecycle.ps1
$ErrorActionPreference = "Continue"

Write-Host "=========================================================================="
Write-Host "  1. CLEAN UP EXISTING LISTENERS"
Write-Host "=========================================================================="
powershell.exe -ExecutionPolicy Bypass -File .\start_all.ps1 -Stop
Start-Sleep -Seconds 1

Write-Host "`n=========================================================================="
Write-Host "  2. LAUNCH VIA start_all.ps1 -NoWait"
Write-Host "=========================================================================="
powershell.exe -ExecutionPolicy Bypass -File .\start_all.ps1 -NoWait

Write-Host "`n=========================================================================="
Write-Host "  3. VERIFY HEALTH ENDPOINTS"
Write-Host "=========================================================================="
$rDocs = Invoke-WebRequest -Uri "http://localhost:8000/docs" -UseBasicParsing -TimeoutSec 5
Write-Host "Service-B Docs (8000/docs): StatusCode = $($rDocs.StatusCode)"

$rHealthA = Invoke-RestMethod -Uri "http://localhost:8001/health" -TimeoutSec 5
Write-Host "Service-A Health (8001/health): status = $($rHealthA.status), model = $($rHealthA.model_version)"

$rFrontend = Invoke-WebRequest -Uri "http://localhost:5173/" -UseBasicParsing -TimeoutSec 5
Write-Host "Frontend Dashboard (5173/): StatusCode = $($rFrontend.StatusCode)"

Write-Host "`n=========================================================================="
Write-Host "  4. VERIFY AUTHENTICATED API FLOW & VITE PROXY"
Write-Host "=========================================================================="
$auth = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/auth/login" -Method Post -Body (@{username='admin'; password='admin123'} | ConvertTo-Json) -ContentType 'application/json'
Write-Host "Admin Login: Token received (role = $($auth.role))"
$token = $auth.token
$headers = @{ Authorization = "Bearer $token" }

$cams = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/cameras" -Headers $headers
Write-Host "Direct Service-B Cameras Count: $($cams.Count)"

$proxiedCams = Invoke-RestMethod -Uri "http://localhost:5173/api/v1/cameras" -Headers $headers
Write-Host "Proxied Frontend Cameras Count: $($proxiedCams.Count)"

Write-Host "`n=========================================================================="
Write-Host "  5. VERIFY SYSTEM STATUS VIA start_all.ps1 -Status"
Write-Host "=========================================================================="
powershell.exe -ExecutionPolicy Bypass -File .\start_all.ps1 -Status
Write-Host "Status Exit Code: $LASTEXITCODE"

Write-Host "`n=========================================================================="
Write-Host "  6. TEARDOWN VIA start_all.ps1 -Stop & ORPHAN CHECK"
Write-Host "=========================================================================="
powershell.exe -ExecutionPolicy Bypass -File .\start_all.ps1 -Stop

$leftovers = Get-NetTCPConnection -LocalPort 8000, 8001, 5173 -State Listen -ErrorAction SilentlyContinue
if ($leftovers) {
    Write-Error "Orphaned processes remain on ports: $($leftovers | Out-String)"
} else {
    Write-Host "[+] Verified: Zero orphaned processes holding ports 8000, 8001, 5173."
}
