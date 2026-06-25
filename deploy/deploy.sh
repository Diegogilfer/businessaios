#!/bin/bash
# ============================================================
# BusinessAIOS — Script de deploy automático
# Uso: bash deploy.sh [railway|vps|local]
# ============================================================

set -e
TARGET=${1:-local}
echo "🚀 BusinessAIOS deploy → $TARGET"

case $TARGET in

  # ── Deploy local con Docker ────────────────────────────────
  local)
    echo "📦 Building containers..."
    docker-compose build --no-cache
    echo "▶ Starting services..."
    docker-compose up -d backend frontend
    echo ""
    echo "✅ BusinessAIOS corriendo en:"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend:  http://localhost:8000"
    echo "   API Docs: http://localhost:8000/docs"
    ;;

  # ── Deploy a Railway ───────────────────────────────────────
  railway)
    if ! command -v railway &> /dev/null; then
      echo "⚠ Instalando Railway CLI..."
      npm install -g @railway/cli
    fi
    echo "🔑 Login a Railway..."
    railway login
    echo "📦 Deploy backend..."
    railway up --service backend
    echo "📦 Deploy frontend..."
    cd frontend && railway up --service frontend && cd ..
    echo "✅ Deploy a Railway completado"
    ;;

  # ── Deploy a VPS (Ubuntu) ──────────────────────────────────
  vps)
    VPS_IP=${VPS_IP:-"TU.IP.DEL.VPS"}
    VPS_USER=${VPS_USER:-"ubuntu"}
    echo "📡 Conectando a $VPS_USER@$VPS_IP..."

    ssh "$VPS_USER@$VPS_IP" << 'SSHEOF'
      set -e
      # Instalar Docker si no existe
      if ! command -v docker &> /dev/null; then
        curl -fsSL https://get.docker.com | sh
        sudo usermod -aG docker $USER
      fi
      # Clonar o actualizar el proyecto
      if [ -d ~/BusinessAIOS ]; then
        cd ~/BusinessAIOS && git pull
      else
        git clone https://github.com/TU_USUARIO/businessaios.git ~/BusinessAIOS
        cd ~/BusinessAIOS
      fi
      # Copiar .env de producción si no existe
      [ ! -f .env ] && cp deploy/env.production.example .env && echo "⚠ Edita .env con tus credenciales reales"
      # Build y start
      docker-compose pull
      docker-compose up -d --build
      echo "✅ Deploy VPS completado"
SSHEOF
    ;;

  *)
    echo "❌ Target desconocido: $TARGET"
    echo "   Uso: bash deploy.sh [local|railway|vps]"
    exit 1
    ;;
esac
