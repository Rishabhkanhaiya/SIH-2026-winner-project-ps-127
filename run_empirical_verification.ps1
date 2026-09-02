# Challenger 2 Full Empirical Verification Suite

Write-Host "`n=== STEP 1: Executing start_all.ps1 -NoWait ===" -ForegroundColor Cyan
& .\start_all.ps1 -NoWait
$startExitCode = $LASTEXITCODE
Write-Host "start_all.ps1 -NoWait Exit Code: $startExitCode"

Write-Host "`n=== STEP 2: Checking TCP Connections for Ports 5173, 8000, 8001 ===" -ForegroundColor Cyan
$connections = Get-NetTCPConnection -LocalPort 5173,8000,8001 -State Listen -ErrorAction SilentlyContinue
if ($connections) {
    $connections | Select-Object LocalAddress, LocalPort, OwningProcess, State | Format-Table -AutoSize
} else {
    Write-Host "Warning: Get-NetTCPConnection returned no listening ports. Checking netstat..." -ForegroundColor Yellow
    netstat -ano | Select-String "LISTENING" | Select-String ":5173|:8000|:8001"
}

Write-Host "`n=== STEP 3: Executing start_all.ps1 -Status ===" -ForegroundColor Cyan
& .\start_all.ps1 -Status
$statusExitCode = $LASTEXITCODE
Write-Host "start_all.ps1 -Status Exit Code: $statusExitCode"

Write-Host "`n=== STEP 4: Running Python Integration Verification Suite ===" -ForegroundColor Cyan
$pyExe = "C:\Users\Rishabh_Joshi\AppData\Local\Programs\Python\Python311\python.exe"
& $pyExe -u test_challenger_integration.py
$pyExitCode = $LASTEXITCODE
Write-Host "Python Test Suite Exit Code: $pyExitCode"

Write-Host "`n=== STEP 5: Executing start_all.ps1 -Stop ===" -ForegroundColor Cyan
& .\start_all.ps1 -Stop
$stopExitCode = $LASTEXITCODE
Write-Host "start_all.ps1 -Stop Exit Code: $stopExitCode"

Write-Host "`n=== STEP 6: Verifying Clean Port Release ===" -ForegroundColor Cyan
Start-Sleep -Seconds 2
$remainingConnections = Get-NetTCPConnection -LocalPort 5173,8000,8001 -State Listen -ErrorAction SilentlyContinue
if ($remainingConnections) {
    Write-Host "ERROR: Ports still occupied after -Stop:" -ForegroundColor Red
    $remainingConnections | Format-Table -AutoSize
    exit 1
} else {
    Write-Host "SUCCESS: All ports (5173, 8000, 8001) are cleanly released." -ForegroundColor Green
}

if ($startExitCode -eq 0 -and $statusExitCode -eq 0 -and $pyExitCode -eq 0 -and $stopExitCode -eq 0) {
    Write-Host "`n============================================================" -ForegroundColor Green
    Write-Host "ALL EMPIRICAL INTEGRATION VERIFICATION STEPS PASSED (100% OK)" -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n============================================================" -ForegroundColor Red
    Write-Host "ONE OR MORE VERIFICATION STEPS FAILED" -ForegroundColor Red
    Write-Host "============================================================" -ForegroundColor Red
    exit 1
}
