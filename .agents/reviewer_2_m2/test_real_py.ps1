$realPy = (Get-ChildItem "$env:LOCALAPPDATA\Programs\Python\Python*\python.exe" -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName)
Write-Host "Found real python: $realPy"

$p = Start-Process -FilePath $realPy -ArgumentList "-c `"import time; time.sleep(2)`"" -PassThru -NoNewWindow
Write-Host "Launched PID: $($p.Id) HasExited: $($p.HasExited)"
Start-Sleep -Seconds 1
Write-Host "After 1s HasExited: $($p.HasExited)"
Start-Sleep -Seconds 2
Write-Host "After 3s HasExited: $($p.HasExited)"
