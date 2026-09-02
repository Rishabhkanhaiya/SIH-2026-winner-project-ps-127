# test_ipv4.ps1
$t1 = Measure-Command {
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:8000/docs" -UseBasicParsing -TimeoutSec 3
        Write-Host "127.0.0.1:8000 Status: $($r.StatusCode)"
    } catch {
        Write-Host "127.0.0.1:8000 Failed: $($_.Exception.Message)"
    }
}
Write-Host "127.0.0.1:8000 Time: $($t1.TotalMilliseconds) ms"

$t2 = Measure-Command {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:8000/docs" -UseBasicParsing -TimeoutSec 3
        Write-Host "localhost:8000 Status: $($r.StatusCode)"
    } catch {
        Write-Host "localhost:8000 Failed: $($_.Exception.Message)"
    }
}
Write-Host "localhost:8000 Time: $($t2.TotalMilliseconds) ms"
