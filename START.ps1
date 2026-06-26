# BusinessAIOS - Start backend + frontend

$root = $PSScriptRoot

# Kill anything on port 8000 and 3000
$ports = @(8000, 3000)
foreach ($port in $ports) {
    $pids = netstat -ano | findstr ":$port " | ForEach-Object { ($_ -split '\s+')[-1] } | Select-Object -Unique
    foreach ($p in $pids) {
        if ($p -match '^\d+$' -and $p -ne '0') {
            Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
        }
    }
}

# Clear Next.js cache
$cache = Join-Path $root "frontend\.next"
if (Test-Path $cache) { Remove-Item -Recurse -Force $cache }

Write-Host "Starting BACKEND on port 8000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit -Command cd '$root'; py -3.12 -m uvicorn main:app --reload --host 127.0.0.1 --port 8000"

Start-Sleep -Seconds 2

Write-Host "Starting FRONTEND on port 3000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit -Command cd '$root\frontend'; npm run dev"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Wait for BOTH windows to show 'ready'   " -ForegroundColor Cyan
Write-Host "  Then open: http://localhost:3000         " -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
