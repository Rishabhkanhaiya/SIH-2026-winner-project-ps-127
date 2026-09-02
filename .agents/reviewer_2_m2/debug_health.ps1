# debug_health.ps1
function Test-HttpHealth {
    param(
        [string]$Url,
        [int]$ExpectedStatus = 200
    )
    try {
        $resp = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        if ($resp.StatusCode -eq $ExpectedStatus) {
            return @{ Success = $true; StatusCode = $resp.StatusCode; Message = "OK" }
        } else {
            return @{ Success = $false; StatusCode = $resp.StatusCode; Message = "Status $($resp.StatusCode)" }
        }
    } catch {
        return @{ Success = $false; StatusCode = 0; Message = $_.Exception.Message }
    }
}

$h8000 = Test-HttpHealth -Url "http://localhost:8000/docs"
$h8001 = Test-HttpHealth -Url "http://localhost:8001/health"
$h5173 = Test-HttpHealth -Url "http://localhost:5173/"

Write-Host "8000 (Service B docs):" ($h8000 | ConvertTo-Json -Compress)
Write-Host "8001 (Service A health):" ($h8001 | ConvertTo-Json -Compress)
Write-Host "5173 (Frontend root):" ($h5173 | ConvertTo-Json -Compress)
