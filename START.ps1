# BusinessAIOS — Arranque completo (backend + frontend)
# Doble clic o ejecutar en PowerShell

$root = $PSScriptRoot

Write-Host ""
Write-Host "  BUSINESSAIOS — Iniciando sistema..." -ForegroundColor Cyan
Write-Host ""

# 1. Matar procesos anteriores en puertos 3000 y 8000
Write-Host "  [1/4] Liberando puertos..." -ForegroundColor Yellow
$p8000 = netstat -ano | findstr ":8000" | ForEach-Object { ($_ -split '\s+')[-1] } | Select-Object -Unique
$p3000 = netstat -ano | findstr ":3000" | ForEach-Object { ($_ -split '\s+')[-1] } | Select-Object -Unique
foreach ($pid in ($p8000 + $p3000)) {
    if ($pid -match '^\d+$' -and $pid -ne '0') {
        try { Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue } catch {}
    }
}
Start-Sleep -Seconds 1

# 2. Limpiar cache de Next.js (evita mostrar version vieja)
Write-Host "  [2/4] Limpiando cache de Next.js..." -ForegroundColor Yellow
$nextCache = Join-Path $root "frontend\.next"
if (Test-Path $nextCache) {
    Remove-Item -Recurse -Force $nextCache -ErrorAction SilentlyContinue
    Write-Host "        Cache eliminado." -ForegroundColor Green
} else {
    Write-Host "        No habia cache." -ForegroundColor DarkGray
}

# 3. Arrancar Backend en nueva ventana
Write-Host "  [3/4] Arrancando Backend (puerto 8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "cd '$root'; Write-Host 'BACKEND — BusinessAIOS' -ForegroundColor Cyan; py -3.12 -m uvicorn main:app --reload --host 127.0.0.1 --port 8000"

Start-Sleep -Seconds 3

# 4. Arrancar Frontend en nueva ventana
Write-Host "  [4/4] Arrancando Frontend (puerto 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "cd '$root\frontend'; Write-Host 'FRONTEND — BusinessAIOS' -ForegroundColor Cyan; `$env:NODE_OPTIONS='--openssl-legacy-provider'; npm run dev"

Write-Host ""
Write-Host "  Sistema iniciando..." -ForegroundColor Green
Write-Host "  Espera 15 segundos y abre: http://localhost:3000" -ForegroundColor White
Write-Host ""

# Abrir navegador automaticamente despues de 12 segundos
Start-Sleep -Seconds 12
Start-Process "http://localhost:3000"

Write-Host "  Navegador abierto. Si no carga, espera 10 segundos y recarga." -ForegroundColor Cyan
Write-Host ""
