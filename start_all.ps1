<#
.SYNOPSIS
    Urban Pulse AI - Unified Multi-Service Startup Script
    Starts Service-A (8001), Service-B (8000), and Frontend (5173) concurrently.

.DESCRIPTION
    Launches all three subsystems concurrently with real-time log capture,
    polls health and readiness endpoints, displays service URLs, and handles
    graceful shutdown on Ctrl+C or script termination.

.PARAMETER NoWait
    Start services, wait for health readiness, report status, and exit without blocking.
.PARAMETER Stop
    Stop all running Urban Pulse AI services and free ports.
.PARAMETER Status
    Check the current health and status of all services.
.PARAMETER TimeoutSec
    Timeout in seconds for readiness checks (default: 60).

.EXAMPLE
    .\start_all.ps1
    Starts all services in foreground and monitors them until Ctrl+C.

.EXAMPLE
    .\start_all.ps1 -NoWait
    Starts all services in background and verifies readiness, then returns.

.EXAMPLE
    .\start_all.ps1 -Stop
    Stops all running instances of the services.
#>

[CmdletBinding()]
param(
    [Alias("Background")]
    [switch]$NoWait,
    [switch]$Stop,
    [switch]$Status,
    [Alias("PortCheckTimeoutSec")]
    [int]$TimeoutSec = 60,
    [string]$LogsDir = ""
)

$ErrorActionPreference = "Continue"

# Determine workspace root
$script:Root = $PSScriptRoot
if (-not $script:Root) {
    $script:Root = (Get-Location).Path
}

$script:ServiceADir = Join-Path $script:Root "service-a"
$script:ServiceBDir = Join-Path $script:Root "service-b"
$script:FrontendDir = Join-Path $script:Root "frontend"

if ($LogsDir -and $LogsDir.Trim() -ne "") {
    if ([System.IO.Path]::IsPathRooted($LogsDir)) {
        $script:LogsDir = $LogsDir
    } else {
        $script:LogsDir = Join-Path $script:Root $LogsDir
    }
} else {
    $script:LogsDir = Join-Path $script:Root "logs"
}

# Ensure logs folder exists
if (-not (Test-Path $script:LogsDir)) {
    New-Item -ItemType Directory -Path $script:LogsDir -Force | Out-Null
}

$script:Processes = @()

# -----------------------------------------------------------------------------
# Helper: Formatted Output
# -----------------------------------------------------------------------------
function Write-Header {
    param([string]$Text)
    Write-Host ""
    Write-Host "==========================================================================" -ForegroundColor Cyan
    Write-Host "  $Text" -ForegroundColor Cyan
    Write-Host "==========================================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Success {
    param([string]$Text)
    Write-Host "  [+] $Text" -ForegroundColor Green
}

function Write-Info {
    param([string]$Text)
    Write-Host "  [*] $Text" -ForegroundColor Cyan
}

function Write-Warn {
    param([string]$Text)
    Write-Host "  [!] $Text" -ForegroundColor Yellow
}

function Write-Err {
    param([string]$Text)
    Write-Host "  [-] $Text" -ForegroundColor Red
}

# -----------------------------------------------------------------------------
# Helper: Concrete Binary Resolution
# -----------------------------------------------------------------------------
function Get-ConcretePythonBinary {
    <#
    .SYNOPSIS
        Resolves the true concrete python.exe binary path on Windows, avoiding
        the Windows App Execution Alias shim (WindowsApps\python.exe) which exits
        immediately and corrupts process lifecycle tracking.
    #>
    # 1. Check workspace and service virtual environments
    $venvCandidates = @(
        (Join-Path $script:Root ".venv\Scripts\python.exe"),
        (Join-Path $script:Root "venv\Scripts\python.exe"),
        (Join-Path $script:ServiceADir ".venv\Scripts\python.exe"),
        (Join-Path $script:ServiceBDir ".venv\Scripts\python.exe")
    )
    foreach ($cand in $venvCandidates) {
        if ($cand -and (Test-Path -LiteralPath $cand -PathType Leaf)) {
            try {
                $ver = & $cand -c "import sys; print(sys.executable)" 2>$null
                if ($LASTEXITCODE -eq 0 -and $ver) {
                    Write-Info "Resolved Python (venv): $cand"
                    return $cand
                }
            } catch { }
        }
    }

    # 2. Check PATH commands, explicitly filtering out WindowsApps execution alias shim
    try {
        $pathPythons = Get-Command python.exe -All -ErrorAction SilentlyContinue |
            Where-Object { $_.Source -and ($_.Source -notmatch "WindowsApps") -and (Test-Path -LiteralPath $_.Source) } |
            Select-Object -ExpandProperty Source
        foreach ($cand in $pathPythons) {
            try {
                $ver = & $cand -c "import sys; print(sys.executable)" 2>$null
                if ($LASTEXITCODE -eq 0 -and $ver) {
                    Write-Info "Resolved Python (PATH): $cand"
                    return $cand
                }
            } catch { }
        }
    } catch { }

    # 3. Check LocalAppData Python installations ($env:LOCALAPPDATA\Programs\Python\Python*\python.exe)
    if ($env:LOCALAPPDATA) {
        $localPythonDir = Join-Path $env:LOCALAPPDATA "Programs\Python"
        if (Test-Path -LiteralPath $localPythonDir) {
            $localPythons = Get-ChildItem -Path $localPythonDir -Filter "python.exe" -Recurse -Depth 2 -ErrorAction SilentlyContinue |
                Select-Object -ExpandProperty FullName
            foreach ($cand in $localPythons) {
                if ($cand -and (Test-Path -LiteralPath $cand -PathType Leaf) -and ($cand -notmatch "WindowsApps")) {
                    try {
                        $ver = & $cand -c "import sys; print(sys.executable)" 2>$null
                        if ($LASTEXITCODE -eq 0 -and $ver) {
                            Write-Info "Resolved Python (LocalAppData): $cand"
                            return $cand
                        }
                    } catch { }
                }
            }
        }
    }

    # 4. Check Program Files and root Python directories
    $progDirs = @("C:\Program Files\Python*", "C:\Program Files (x86)\Python*", "C:\Python*")
    foreach ($dirPattern in $progDirs) {
        $progPythons = Get-ChildItem -Path $dirPattern -Filter "python.exe" -Recurse -Depth 2 -ErrorAction SilentlyContinue |
            Select-Object -ExpandProperty FullName
        foreach ($cand in $progPythons) {
            if ($cand -and (Test-Path -LiteralPath $cand -PathType Leaf)) {
                try {
                    $ver = & $cand -c "import sys; print(sys.executable)" 2>$null
                    if ($LASTEXITCODE -eq 0 -and $ver) {
                        Write-Info "Resolved Python (ProgramFiles): $cand"
                        return $cand
                    }
                } catch { }
            }
        }
    }

    # 5. Check Python Launcher py.exe if available and operational
    try {
        $pyCmd = Get-Command py.exe -ErrorAction SilentlyContinue
        if ($pyCmd -and $pyCmd.Source -and (Test-Path -LiteralPath $pyCmd.Source)) {
            $pyOutput = & $pyCmd.Source -3 -c "import sys; print(sys.executable)" 2>$null
            if ($LASTEXITCODE -eq 0 -and $pyOutput -and (Test-Path -LiteralPath $pyOutput)) {
                Write-Info "Resolved Python (Launcher): $pyOutput"
                return $pyOutput
            }
        }
    } catch { }

    # 6. Fallback to generic python
    Write-Warn "Could not resolve concrete Python executable path; falling back to default 'python'."
    return "python"
}

function Get-ConcreteNodeBinary {
    try {
        $nodeCmd = Get-Command node.exe -ErrorAction SilentlyContinue
        if ($nodeCmd -and $nodeCmd.Source -and (Test-Path -LiteralPath $nodeCmd.Source)) {
            return $nodeCmd.Source
        }
    } catch { }
    return "node"
}

# -----------------------------------------------------------------------------
# Helper: Stop processes by port or handle
# -----------------------------------------------------------------------------
function Stop-PortProcess {
    param([int]$Port)
    $killedPids = @{}
    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        if ($connections) {
            foreach ($conn in $connections) {
                $pidToKill = $conn.OwningProcess
                if ($pidToKill -gt 0 -and $pidToKill -ne $PID -and -not $killedPids.ContainsKey($pidToKill)) {
                    $killedPids[$pidToKill] = $true
                    $procObj = Get-Process -Id $pidToKill -ErrorAction SilentlyContinue
                    if ($procObj) {
                        Write-Warn "Port $Port is occupied by PID $pidToKill (state: $($conn.State)). Terminating..."
                        Start-Process taskkill.exe -ArgumentList "/F /T /PID $pidToKill" -NoNewWindow -Wait -ErrorAction SilentlyContinue
                    }
                }
            }
        }
    } catch { }

    # Fallback to netstat if Get-NetTCPConnection missed any local listeners
    try {
        $netstatOut = netstat -ano | Select-String "^\s*TCP\s+\S*:$Port\s+"
        foreach ($match in $netstatOut) {
            if ($match.Line -match "^\s*TCP\s+\S*:$Port\s+.*?\s+(\d+)\s*$") {
                $pidToKill = [int]$matches[1]
                if ($pidToKill -gt 0 -and $pidToKill -ne $PID -and -not $killedPids.ContainsKey($pidToKill)) {
                    $killedPids[$pidToKill] = $true
                    $procObj = Get-Process -Id $pidToKill -ErrorAction SilentlyContinue
                    if ($procObj) {
                        Write-Warn "Port $Port is occupied by PID $pidToKill (netstat). Terminating..."
                        Start-Process taskkill.exe -ArgumentList "/F /T /PID $pidToKill" -NoNewWindow -Wait -ErrorAction SilentlyContinue
                    }
                }
            }
        }
    } catch { }
}

function Stop-AllServices {
    Write-Header "Stopping Urban Pulse AI Services"

    # Stop tracked processes
    foreach ($proc in $script:Processes) {
        if ($proc -and -not $proc.HasExited) {
            Write-Info "Stopping process $($proc.ProcessName) (PID $($proc.Id))..."
            try {
                Start-Process taskkill.exe -ArgumentList "/F /T /PID $($proc.Id)" -NoNewWindow -Wait -ErrorAction SilentlyContinue
            } catch {
                try { $proc.Kill() } catch { }
            }
        }
    }

    # Free the ports explicitly
    $null = Stop-PortProcess -Port 8001
    $null = Stop-PortProcess -Port 8000
    $null = Stop-PortProcess -Port 5173

    # Ensure a 1500ms delay after killing prior listeners to allow Windows TCP sockets to release
    Start-Sleep -Milliseconds 1500

    Write-Success "All Urban Pulse AI services have been stopped."
}

# -----------------------------------------------------------------------------
# Helper: Health Checks
# -----------------------------------------------------------------------------
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

function Check-AllStatus {
    Write-Header "Urban Pulse AI - System Health Status"

    $serviceA = Test-HttpHealth -Url "http://localhost:8001/health"
    $serviceB = Test-HttpHealth -Url "http://localhost:8000/api/v1/health"
    if (-not $serviceB.Success) {
        $serviceB = Test-HttpHealth -Url "http://localhost:8000/docs"
    }
    if (-not $serviceB.Success) {
        $serviceB = Test-HttpHealth -Url "http://localhost:8000/health"
    }
    $frontend = Test-HttpHealth -Url "http://localhost:5173/"

    Write-Host ("  {0,-15} {1,-10} {2,-35} {3}" -f "SERVICE", "PORT", "URL", "STATUS") -ForegroundColor Gray
    Write-Host ("  {0,-15} {1,-10} {2,-35} {3}" -f "-------", "----", "---", "------") -ForegroundColor Gray

    # Service A
    $statusA = if ($serviceA.Success) { "ONLINE (HTTP 200)" } else { "OFFLINE" }
    $colorA  = if ($serviceA.Success) { "Green" } else { "Red" }
    Write-Host ("  {0,-15} {1,-10} {2,-35} {3}" -f "Service-A", "8001", "http://localhost:8001/health", $statusA) -ForegroundColor $colorA

    # Service B
    $statusB = if ($serviceB.Success) { "ONLINE (HTTP 200)" } else { "OFFLINE" }
    $colorB  = if ($serviceB.Success) { "Green" } else { "Red" }
    Write-Host ("  {0,-15} {1,-10} {2,-35} {3}" -f "Service-B", "8000", "http://localhost:8000/api/v1/health", $statusB) -ForegroundColor $colorB

    # Frontend
    $statusF = if ($frontend.Success) { "ONLINE (HTTP 200)" } else { "OFFLINE" }
    $colorF  = if ($frontend.Success) { "Green" } else { "Red" }
    Write-Host ("  {0,-15} {1,-10} {2,-35} {3}" -f "Frontend", "5173", "http://localhost:5173", $statusF) -ForegroundColor $colorF

    Write-Host ""
    return ($serviceA.Success -and $serviceB.Success -and $frontend.Success)
}

# -----------------------------------------------------------------------------
# Mode: Stop
# -----------------------------------------------------------------------------
if ($Stop) {
    Stop-AllServices
    exit 0
}

# -----------------------------------------------------------------------------
# Mode: Status Check
# -----------------------------------------------------------------------------
if ($Status) {
    $allOk = Check-AllStatus
    if ($allOk) {
        exit 0
    } else {
        exit 1
    }
}

# -----------------------------------------------------------------------------
# Mode: Start All Services
# -----------------------------------------------------------------------------
Write-Header "Urban Pulse AI - Launching Smart City Platform"

# 1. Prerequisites check
Write-Info "Verifying prerequisites..."
if (-not (Test-Path (Join-Path $script:FrontendDir "node_modules"))) {
    Write-Warn "Frontend node_modules missing. Installing npm packages..."
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm install" -WorkingDirectory $script:FrontendDir -NoNewWindow -Wait
}

# 2. Clean existing port conflicts
Write-Info "Checking for port conflicts (8001, 8000, 5173)..."
Stop-PortProcess -Port 8001
Stop-PortProcess -Port 8000
Stop-PortProcess -Port 5173
# 1500ms delay to allow Windows TCP sockets to fully release
Start-Sleep -Milliseconds 1500

# 3. Resolve concrete executables
$pythonExe = Get-ConcretePythonBinary
$nodeExe   = Get-ConcreteNodeBinary
Write-Info "Using Python executable: $pythonExe"
Write-Info "Using Node executable:   $nodeExe"

function Start-BackgroundService {
    param(
        [string]$Command,
        [string]$WorkingDirectory,
        [string]$LogPath,
        [string]$ErrLogPath
    )
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "cmd.exe"
    $psi.Arguments = "/c `"$Command < nul > `"`"$LogPath`"`" 2> `"`"$ErrLogPath`"`"`""
    $psi.WorkingDirectory = $WorkingDirectory
    $psi.UseShellExecute = $true
    $psi.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
    $proc = [System.Diagnostics.Process]::Start($psi)
    return $proc
}

# 4. Launch Service A (Port 8001)
Write-Info "Starting Service-A (Perception and OCR Engine) on port 8001..."
$cmdA = "`"$pythonExe`" -m uvicorn app.main:app --host 0.0.0.0 --port 8001"
$procA = Start-BackgroundService -Command $cmdA `
    -WorkingDirectory $script:ServiceADir `
    -LogPath (Join-Path $script:LogsDir "service-a.log") `
    -ErrLogPath (Join-Path $script:LogsDir "service-a.err.log")

$script:Processes += $procA
Write-Success "Service-A process launched (PID $($procA.Id))"

# 5. Launch Service B (Port 8000)
Write-Info "Starting Service-B (Central API and Backend) on port 8000..."
$cmdB = "`"$pythonExe`" -m uvicorn app.main:app --host 0.0.0.0 --port 8000"
$procB = Start-BackgroundService -Command $cmdB `
    -WorkingDirectory $script:ServiceBDir `
    -LogPath (Join-Path $script:LogsDir "service-b.log") `
    -ErrLogPath (Join-Path $script:LogsDir "service-b.err.log")

$script:Processes += $procB
Write-Success "Service-B process launched (PID $($procB.Id))"

# 6. Launch Frontend (Port 5173)
Write-Info "Starting Frontend (React Vite Dashboard) on port 5173..."
$viteBin = Join-Path $script:FrontendDir "node_modules\vite\bin\vite.js"
if (Test-Path -LiteralPath $viteBin) {
    $cmdF = "`"$nodeExe`" `"$viteBin`" --port 5173 --strictPort --host 0.0.0.0"
} else {
    $cmdF = "npm run dev -- --port 5173 --strictPort --host 0.0.0.0"
}
$procF = Start-BackgroundService -Command $cmdF `
    -WorkingDirectory $script:FrontendDir `
    -LogPath (Join-Path $script:LogsDir "frontend.log") `
    -ErrLogPath (Join-Path $script:LogsDir "frontend.err.log")

$script:Processes += $procF
Write-Success "Frontend process launched (PID $($procF.Id))"


# 7. Poll Health Readiness
Write-Info "Waiting for all services to become ready (timeout: ${TimeoutSec}s)..."
$startTime = [DateTime]::UtcNow
$serviceAReady = $false
$serviceBReady = $false
$frontendReady = $false

while (([DateTime]::UtcNow - $startTime).TotalSeconds -lt $TimeoutSec) {
    if (-not $serviceAReady) {
        $checkA = Test-HttpHealth -Url "http://localhost:8001/health"
        if ($checkA.Success) {
            $serviceAReady = $true
            Write-Success "Service-A is ready at http://localhost:8001/health"
        }
    }

    if (-not $serviceBReady) {
        $checkB = Test-HttpHealth -Url "http://localhost:8000/api/v1/health"
        if (-not $checkB.Success) {
            $checkB = Test-HttpHealth -Url "http://localhost:8000/docs"
        }
        if (-not $checkB.Success) {
            $checkB = Test-HttpHealth -Url "http://localhost:8000/health"
        }
        if ($checkB.Success) {
            $serviceBReady = $true
            Write-Success "Service-B is ready at http://localhost:8000"
        }
    }

    if (-not $frontendReady) {
        $checkF = Test-HttpHealth -Url "http://localhost:5173/"
        if ($checkF.Success) {
            $frontendReady = $true
            Write-Success "Frontend is ready at http://localhost:5173"
        }
    }

    if ($serviceAReady -and $serviceBReady -and $frontendReady) {
        break
    }

    Start-Sleep -Milliseconds 800
}

if (-not ($serviceAReady -and $serviceBReady -and $frontendReady)) {
    Write-Err "Startup timeout exceeded! Service status:"
    Write-Err "  Service-A (8001): $(if ($serviceAReady) { 'OK' } else { 'FAILED' })"
    Write-Err "  Service-B (8000): $(if ($serviceBReady) { 'OK' } else { 'FAILED' })"
    Write-Err "  Frontend  (5173): $(if ($frontendReady) { 'OK' } else { 'FAILED' })"
    Write-Err "Check logs in $script:LogsDir for details."
    if (-not $NoWait) {
        Stop-AllServices
    }
    exit 1
}

# 8. Print Active Services Summary
Write-Header "Urban Pulse AI - All Subsystems Running Successfully"
Write-Host "  [>] Frontend Dashboard:       http://localhost:5173" -ForegroundColor Green
Write-Host "  [>] Service B (API Docs):      http://localhost:8000/docs" -ForegroundColor Green
Write-Host "  [>] Service B (Health Check):  http://localhost:8000/api/v1/health" -ForegroundColor Green
Write-Host "  [>] Service A (Perception AI): http://localhost:8001/health" -ForegroundColor Green
Write-Host "  [>] Log Output Directory:     $script:LogsDir" -ForegroundColor Gray
Write-Host ""

if ($NoWait) {
    Write-Success "Services started in background mode (-NoWait). Returning."
    exit 0
}

# 9. Interactive Loop with Graceful Shutdown on Exit
Write-Host "  [i] Press Ctrl+C at any time to stop all services." -ForegroundColor Yellow
Write-Host ""

try {
    while ($true) {
        Start-Sleep -Seconds 2
        # Check if any process crashed
        foreach ($p in $script:Processes) {
            if ($p.HasExited) {
                Write-Err "Process $($p.ProcessName) (PID $($p.Id)) terminated unexpectedly with code $($p.ExitCode)."
                throw "A child service process has exited."
            }
        }
    }
} finally {
    Stop-AllServices
}
