# comprehensive_test.ps1 - Complete Reviewer 2 Verification Suite

$scriptRoot = "c:\Users\Rishabh_Joshi\Downloads\sih"
Set-Location $scriptRoot

Write-Host "=========================================================================="
Write-Host "  Reviewer 2 - Milestone 2 Comprehensive Verification"
Write-Host "=========================================================================="

# Step 1: Ensure initial state is clean
Write-Host "`n[Step 1] Ensuring clean state before test..."
powershell.exe -ExecutionPolicy Bypass -File .\start_all.ps1 -Stop

$initialListeners = Get-NetTCPConnection -LocalPort 8000, 8001, 5173 -State Listen -ErrorAction SilentlyContinue
if ($initialListeners) {
    Write-Error "Failed to clean initial listeners: $($initialListeners | Out-String)"
    exit 1
}
Write-Host "[+] Initial ports 8000, 8001, 5173 are free."

# Step 2: Test start_all.ps1 -NoWait
Write-Host "`n[Step 2] Executing: .\start_all.ps1 -NoWait"
$startTime = [DateTime]::UtcNow
powershell.exe -ExecutionPolicy Bypass -File .\start_all.ps1 -NoWait
$launchDuration = ([DateTime]::UtcNow - $startTime).TotalSeconds
Write-Host "[+] start_all.ps1 -NoWait completed in $([math]::Round($launchDuration, 2)) seconds."

# Step 3: Verify Status Check
Write-Host "`n[Step 3] Executing: .\start_all.ps1 -Status"
powershell.exe -ExecutionPolicy Bypass -File .\start_all.ps1 -Status
$statusExit = $LASTEXITCODE
Write-Host "Status check exit code: $statusExit"

# Step 4: Programmatic Endpoint Verification (R1 & R2 Acceptance Criteria)
Write-Host "`n[Step 4] Querying core endpoints directly..."

# 4a. Service-B /docs
Write-Host "Testing Service-B Swagger Docs: GET http://localhost:8000/docs"
$docResp = Invoke-WebRequest -Uri "http://localhost:8000/docs" -UseBasicParsing -TimeoutSec 5
Write-Host "  -> StatusCode: $($docResp.StatusCode)"
if ($docResp.StatusCode -ne 200) { throw "Service-B /docs did not return 200 OK" }

# 4b. Service-B Root
Write-Host "Testing Service-B Root: GET http://localhost:8000/"
$rootResp = Invoke-RestMethod -Uri "http://localhost:8000/" -TimeoutSec 5
Write-Host "  -> Service: $($rootResp.service), Status: $($rootResp.status)"
if ($rootResp.status -ne "running") { throw "Service-B root status is not running" }

# 4c. Service-A /health
Write-Host "Testing Service-A Health: GET http://localhost:8001/health"
$healthAResp = Invoke-RestMethod -Uri "http://localhost:8001/health" -TimeoutSec 5
Write-Host "  -> Status: $($healthAResp.status), Model Version: $($healthAResp.model_version)"
if ($healthAResp.status -ne "ok") { throw "Service-A health is not ok" }

# 4d. Frontend Dashboard HTML
Write-Host "Testing Frontend HTML: GET http://localhost:5173/"
$feResp = Invoke-WebRequest -Uri "http://localhost:5173/" -UseBasicParsing -TimeoutSec 5
Write-Host "  -> StatusCode: $($feResp.StatusCode)"
$hasUrbanPulse = $feResp.Content -match "Urban Pulse AI"
Write-Host "  -> Contains 'Urban Pulse AI': $hasUrbanPulse"
if ($feResp.StatusCode -ne 200 -or -not $hasUrbanPulse) { throw "Frontend failed to return 200 OK or valid HTML" }

# 4e. Service-B Authenticated API Call
Write-Host "Testing Service-B Authentication & Cameras API:"
$loginBody = @{ username = "admin"; password = "admin123" } | ConvertTo-Json
$authResp = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $authResp.token
Write-Host "  -> Authenticated as '$($authResp.username)' (role: $($authResp.role)), token received"

$camHeaders = @{ Authorization = "Bearer $token" }
$cameras = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/cameras" -Headers $camHeaders
Write-Host "  -> Retrieved $($cameras.Count) seeded cameras from urbanpulse.db"
if ($cameras.Count -lt 1) { throw "No cameras returned from Service-B" }

# 4f. Vite Proxy verification (/api forwarded to 8000)
Write-Host "Testing Frontend Vite Proxy (/api/v1/cameras via port 5173):"
$proxiedCams = Invoke-RestMethod -Uri "http://localhost:5173/api/v1/cameras" -Headers $camHeaders
Write-Host "  -> Proxied camera count: $($proxiedCams.Count)"
if ($proxiedCams.Count -ne $cameras.Count) { throw "Vite proxy mismatch" }

# Step 5: Graceful Shutdown & Port Reclamation Verification
Write-Host "`n[Step 5] Testing graceful shutdown: .\start_all.ps1 -Stop"
powershell.exe -ExecutionPolicy Bypass -File .\start_all.ps1 -Stop

Write-Host "Verifying no orphaned processes holding ports..."
$remaining = Get-NetTCPConnection -LocalPort 8000, 8001, 5173 -State Listen -ErrorAction SilentlyContinue
if ($remaining) {
    Write-Error "Orphaned processes detected on ports: $($remaining | Out-String)"
    exit 1
}
Write-Host "[+] All ports 8000, 8001, 5173 cleanly freed! Zero orphan processes."

Write-Host "`n=========================================================================="
Write-Host "  ALL VERIFICATION TESTS PASSED SUCCESSFULLY!"
Write-Host "=========================================================================="
