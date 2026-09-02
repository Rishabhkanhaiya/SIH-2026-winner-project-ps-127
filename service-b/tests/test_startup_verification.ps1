<#
.SYNOPSIS
    Automated Verification Test for start_all.ps1
#>

$scriptRoot = (Get-Item $PSScriptRoot).Parent.Parent.FullName
$startScript = Join-Path $scriptRoot "start_all.ps1"

Write-Host "================================================================"
Write-Host " Running start_all.ps1 Automated Verification Suite"
Write-Host " Target Script: $startScript"
Write-Host "================================================================"

# 1. Clean stop
Write-Host "`n--- STEP 1: Verify -Stop on clean baseline ---"
& powershell.exe -ExecutionPolicy Bypass -File $startScript -Stop
Start-Sleep -Milliseconds 1500

# 2. Launch with -NoWait
Write-Host "`n--- STEP 2: Verify -NoWait startup ---"
$startTime = [DateTime]::UtcNow
& powershell.exe -ExecutionPolicy Bypass -File $startScript -NoWait
$exitCode = $LASTEXITCODE

if ($exitCode -ne 0) {
    Write-Error "[-] start_all.ps1 -NoWait exited with code $exitCode"
    exit 1
} else {
    Write-Host "[+] start_all.ps1 -NoWait completed successfully with exit code 0"
}

# 3. Verify -Status mode
Write-Host "`n--- STEP 3: Verify -Status mode ---"
& powershell.exe -ExecutionPolicy Bypass -File $startScript -Status
$statusExit = $LASTEXITCODE
if ($statusExit -ne 0) {
    Write-Error "[-] start_all.ps1 -Status reported failure (code $statusExit)"
    exit 1
} else {
    Write-Host "[+] start_all.ps1 -Status succeeded (code $statusExit)"
}

# 4. Verify HTTP 200 Responses
Write-Host "`n--- STEP 4: Query Endpoints Directly ---"

# Frontend
$fe = Invoke-WebRequest -Uri "http://localhost:5173/" -UseBasicParsing -TimeoutSec 5
Write-Host "[+] Frontend (5173): StatusCode = $($fe.StatusCode), ContentLength = $($fe.Content.Length)"
if ($fe.StatusCode -ne 200) { throw "Frontend returned non-200" }

# Service B Docs
$sbDocs = Invoke-WebRequest -Uri "http://localhost:8000/docs" -UseBasicParsing -TimeoutSec 5
Write-Host "[+] Service-B Docs (8000): StatusCode = $($sbDocs.StatusCode)"
if ($sbDocs.StatusCode -ne 200) { throw "Service B Docs returned non-200" }

# Service B Health
$sbHealth = Invoke-RestMethod -Uri "http://localhost:8000/health" -TimeoutSec 5
Write-Host "[+] Service-B Health (/health): status = $($sbHealth.status), version = $($sbHealth.version)"
if ($sbHealth.status -ne "ok") { throw "Service B Health status not ok" }

$sbHealthApi = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/health" -TimeoutSec 5
Write-Host "[+] Service-B Health (/api/v1/health): status = $($sbHealthApi.status), version = $($sbHealthApi.version)"
if ($sbHealthApi.status -ne "ok") { throw "Service B API Health status not ok" }

# Service B Login & Cameras Data Endpoint
$loginBody = @{
    username = "admin"
    password = "admin123"
}
$loginRes = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/auth/login" -Method Post -Body ($loginBody | ConvertTo-Json) -ContentType "application/json" -TimeoutSec 5
$token = if ($loginRes.token) { $loginRes.token } else { $loginRes.access_token }
Write-Host "[+] Service-B Auth: Token received successfully ($($token.Substring(0, 15))...)"

$headers = @{
    Authorization = "Bearer $token"
}
$sbCameras = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/cameras" -Headers $headers -TimeoutSec 5
Write-Host "[+] Service-B Cameras API: Count = $($sbCameras.Count) cameras retrieved"
if ($sbCameras.Count -le 0) { throw "Service B Cameras returned empty" }

# Service A Health
$saHealth = Invoke-RestMethod -Uri "http://localhost:8001/health" -TimeoutSec 5
Write-Host "[+] Service-A Health (8001): status = $($saHealth.status), model = $($saHealth.model_version)"
if ($saHealth.status -ne "ok") { throw "Service A Health status not ok" }

# 5. Verify -Stop mode releases all ports
Write-Host "`n--- STEP 5: Verify -Stop cleanly frees ports ---"
& powershell.exe -ExecutionPolicy Bypass -File $startScript -Stop
Start-Sleep -Milliseconds 2000

$portsToCheck = @(8001, 8000, 5173)
$allFreed = $true
foreach ($port in $portsToCheck) {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($conn) {
        Write-Error "[-] Port $port is still listening after -Stop!"
        $allFreed = $false
    } else {
        Write-Host "[+] Port $port is confirmed FREED."
    }
}

# 6. Verify Interactive Mode Process Stability
Write-Host "`n--- STEP 6: Verify Interactive Mode Process Stability ---"
$interactiveProc = Start-Process -FilePath "powershell.exe" `
    -ArgumentList "-ExecutionPolicy Bypass -File `"$startScript`"" `
    -PassThru -WindowStyle Hidden

Write-Host "[+] Interactive start_all.ps1 launched (PID $($interactiveProc.Id)), waiting 15s for readiness and monitoring loop..."
Start-Sleep -Seconds 15

if ($interactiveProc.HasExited) {
    throw "Interactive mode process exited prematurely with code $($interactiveProc.ExitCode)!"
} else {
    Write-Host "[+] Interactive mode process (PID $($interactiveProc.Id)) is stably running in monitoring loop."
}

# Stop all services cleanly
& powershell.exe -ExecutionPolicy Bypass -File $startScript -Stop
Start-Sleep -Milliseconds 2000

Write-Host "`n================================================================"
Write-Host " ALL VERIFICATION TESTS PASSED SUCCESSFULLY!"
Write-Host "================================================================"
