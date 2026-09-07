<#
.SYNOPSIS
    Connects your Google Colab Qwen2.5-VL GPU Tunnel to the local SIH surveillance system.

.PARAMETER Url
    The public Cloudflare tunnel URL printed by Step 6 in Google Colab (e.g. https://xxx.trycloudflare.com)
#>
param(
    [Parameter(Mandatory=$false)]
    [string]$Url
)

$ErrorActionPreference = "Stop"

if (-not $Url) {
    $Url = Read-Host "Enter the Cloudflare Tunnel URL from Colab Step 6 (e.g. https://xxxx.trycloudflare.com)"
}

$Url = $Url.Trim().TrimEnd('/')
if (-not ($Url -like "http*")) {
    Write-Host "[!] URL must start with http:// or https://" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "  Connecting Google Colab GPU to Urban Pulse AI System" -ForegroundColor Cyan
Write-Host "  Target URL: $Url" -ForegroundColor Cyan
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Health check
Write-Host "[1/4] Pinging Colab GPU health endpoint ($Url/health)..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$Url/health" -Method Get -TimeoutSec 10
    Write-Host "  [+] Connected successfully to Colab GPU!" -ForegroundColor Green
    Write-Host "  [+] GPU Model: $($health.gpu)" -ForegroundColor Green
    Write-Host "  [+] VLM Engine: $($health.model)" -ForegroundColor Green
} catch {
    Write-Host "  [-] Failed to reach Colab endpoint: $_" -ForegroundColor Red
    Write-Host "      Please make sure Cell 6 in your Colab notebook is actively running." -ForegroundColor Red
    exit 1
}

# 2. Run diagnostic test with sample plate
Write-Host "`n[2/4] Testing Plate Recognition Inference..." -ForegroundColor Yellow
$py = "C:\Users\Rishabh_Joshi\AppData\Local\Programs\Python\Python311\python.exe"
if (-not (Test-Path $py)) {
    $py = "python"
}
& $py service-a/test_colab_connection.py --url $Url

# 3. Update service-a/.env
Write-Host "`n[3/4] Updating service-a/.env with COLAB_OCR_URL..." -ForegroundColor Yellow
$envPath = "service-a/.env"
$envContent = @"
# Urban Pulse AI — Service A Configuration
COLAB_OCR_URL=$Url
SERVICE_B_URL=http://localhost:8000
INGEST_API_KEY=urban-pulse-m1-api-key-2024
AUTO_FORWARD_TO_SERVICE_B=True
INFERENCE_MODE=auto
"@
Set-Content -Path $envPath -Value $envContent -Encoding utf8
Write-Host "  [+] Saved COLAB_OCR_URL to $envPath" -ForegroundColor Green

# 4. Restart Service A so it picks up the new environment
Write-Host "`n[4/4] Restarting Service A (port 8001) to apply GPU offloading..." -ForegroundColor Yellow
try {
    $connections = Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue
    foreach ($conn in $connections) {
        $pidToKill = $conn.OwningProcess
        if ($pidToKill -gt 0) {
            Start-Process taskkill.exe -ArgumentList "/F /T /PID $pidToKill" -NoNewWindow -Wait -ErrorAction SilentlyContinue
        }
    }
} catch {}

Start-Sleep -Milliseconds 1000

$cmdA = "`"$py`" -m uvicorn app.main:app --host 0.0.0.0 --port 8001"
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "cmd.exe"
$psi.Arguments = "/c `"$cmdA < nul > `"logs\service-a.log`" 2> `"logs\service-a.err.log`"`""
$psi.WorkingDirectory = (Join-Path (Get-Location).Path "service-a")
$psi.UseShellExecute = $true
$psi.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
[System.Diagnostics.Process]::Start($psi) | Out-Null

Start-Sleep -Seconds 3

try {
    $aHealth = Invoke-RestMethod -Uri "http://localhost:8001/health" -Method Get -TimeoutSec 5
    Write-Host "  [+] Service A restarted and operational with Colab GPU OCR!" -ForegroundColor Green
} catch {
    Write-Host "  [*] Service A is initializing..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==========================================================================" -ForegroundColor Green
Write-Host "  ALL SET! Your local SIH system is now offloading to Colab GPU!" -ForegroundColor Green
Write-Host "==========================================================================" -ForegroundColor Green
Write-Host "  - Colab GPU URL:   $Url" -ForegroundColor Cyan
Write-Host "  - Service A:       http://localhost:8001" -ForegroundColor Cyan
Write-Host "  - Service B:       http://localhost:8000" -ForegroundColor Cyan
Write-Host "  - Frontend Web UI: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
