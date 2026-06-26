# BusinessAIOS - Complete startup (backend + frontend)

$root = $PSScriptRoot

Write-Host ""
Write-Host "  BUSINESSAIOS - Starting system..." -ForegroundColor Cyan
Write-Host ""

# 1. Kill previous processes on ports 3000 and 8000
Write-Host "  [1/4] Freeing ports..." -ForegroundColor Yellow
$p8000 = netstat -ano | findstr ":8000" | ForEach-Object { ($_ -split '\s+')[-1] } | Select-Object -Unique
$p3000 = netstat -ano | findstr ":3000" | ForEach-Object { ($_ -split '\s+')[-1] } | Select-Object -Unique
foreach ($pid in ($p8000 + $p3000)) {
    if ($pid -match '^\d+$' -and $pid -ne '0') {
        try { Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue } catch {}
    }
}
Start-Sleep -Seconds 1

# 2. Clear Next.js cache
Write-Host "  [2/4] Clearing Next.js cache..." -ForegroundColor Yellow
$nextCache = Join-Path $root "frontend\.next"
if (Test-Path $nextCache) {
    Remove-Item -Recurse -Force $nextCache -ErrorAction SilentlyContinue
    Write-Host "        Cache cleared." -ForegroundColor Green
} else {
    Write-Host "        No cache found." -ForegroundColor DarkGray
}

# 3. Start Backend in new window
Write-Host "  [3/4] Starting Backend (port 8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; Write-Host 'BACKEND - BusinessAIOS' -ForegroundColor Cyan; py -3.12 -m uvicorn main:app --reload --host 127.0.0.1 --port 8000"

Start-Sleep -Seconds 3

# 4. Start Frontend in new window
Write-Host "  [4/4] Starting Frontend (port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; Write-Host 'FRONTEND - BusinessAIOS' -ForegroundColor Cyan; `$env:NODE_OPTIONS='--openssl-legacy-provider'; npm run dev"

Write-Host ""
Write-Host "  System starting..." -ForegroundColor Green
Write-Host "  Wait 25 seconds and open: http://localhost:3000" -ForegroundColor White
Write-Host ""

# Open browser automatically after 25 seconds (backend + frontend compilation)
Start-Sleep -Seconds 25
Start-Process "http://localhost:3000"

Write-Host "  Browser opened. If not loaded, wait 10 more seconds and refresh." -ForegroundColor Cyan
Write-Host ""
