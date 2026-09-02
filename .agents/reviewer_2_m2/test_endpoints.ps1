# test_endpoints.ps1 - Reviewer 2 Independent Verification Script

Write-Host "=== 1. Service B Docs (port 8000) ==="
$respB = Invoke-WebRequest -Uri "http://localhost:8000/docs" -UseBasicParsing
Write-Host "Status Code: $($respB.StatusCode)"
Write-Host "Content length: $($respB.Content.Length)"

Write-Host "`n=== 2. Service A Health (port 8001) ==="
$respA = Invoke-WebRequest -Uri "http://localhost:8001/health" -UseBasicParsing
Write-Host "Status Code: $($respA.StatusCode)"
Write-Host "Content: $($respA.Content)"

Write-Host "`n=== 3. Frontend Dashboard (port 5173) ==="
$respF = Invoke-WebRequest -Uri "http://localhost:5173/" -UseBasicParsing
Write-Host "Status Code: $($respF.StatusCode)"
$titleLine = ($respF.Content -split "`n") | Where-Object { $_ -match "<title>" }
Write-Host "Title tag: $titleLine"

Write-Host "`n=== 4. Service B API Auth and Endpoints ==="
$loginPayload = @{ username = "admin"; password = "admin123" } | ConvertTo-Json
$loginResp = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/auth/login" -Method Post -Body $loginPayload -ContentType "application/json"
Write-Host "Login token type: $($loginResp.token_type)"
$token = $loginResp.access_token

$headers = @{ Authorization = "Bearer $token" }
$cameras = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/cameras" -Headers $headers
Write-Host "Cameras count: $($cameras.Count)"
Write-Host "First Camera: $($cameras[0].id) - $($cameras[0].name) - $($cameras[0].location)"

$health = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/system/health" -Headers $headers
Write-Host "System health: $($health.status) (DB: $($health.components.database.status), Service A: $($health.components.service_a.status))"

Write-Host "`n=== 5. Frontend Vite Proxy to Service B ==="
$proxiedHealth = Invoke-RestMethod -Uri "http://localhost:5173/api/v1/system/health" -Headers $headers
Write-Host "Proxied health status: $($proxiedHealth.status)"

Write-Host "`n=== 6. Status check via start_all.ps1 -Status ==="
& powershell.exe -ExecutionPolicy Bypass -File "$PSScriptRoot\..\..\start_all.ps1" -Status
Write-Host "start_all.ps1 -Status exit code: $LASTEXITCODE"
