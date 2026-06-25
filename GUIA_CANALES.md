# BusinessAIOS — Guía rápida de APIs de canales
## Telegram Bot + WhatsApp Business

---

## 🤖 TELEGRAM (10 minutos, 100% gratis)

### Paso 1 — Crear el bot

1. Abre Telegram y busca: **@BotFather**
2. Escribe `/newbot`
3. Te pide el **nombre** del bot (ej: `BusinessAIOS`)
4. Te pide el **username** (debe terminar en `bot`, ej: `businessaios_bot`)
5. BotFather te responde con el **TOKEN**:
   ```
   1234567890:AAFxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
6. Guarda ese token — es tu `TELEGRAM_BOT_TOKEN`

### Paso 2 — Configurar en .env

```bash
TELEGRAM_BOT_TOKEN=1234567890:AAFxxxxxxxx
```

### Paso 3 — Registrar el webhook (una sola vez, con servidor en producción)

```bash
# Reemplaza TU_DOMINIO con tu URL real
curl -X POST "https://api.TU_DOMINIO/channels/telegram/set-webhook?url=https://api.TU_DOMINIO"

# Respuesta esperada:
# {"ok": true, "result": true, "description": "Webhook was set"}
```

### Paso 4 — Probar

Busca tu bot en Telegram → escríbele `/start` → debería responder con el menú de agentes.

### Comandos disponibles para tus usuarios

```
/start     → Menú principal con botones
/agente    → Cambiar agente activo
/skills    → Ejecutar SWOT, finanzas, etc
/status    → Estado del sistema
/help      → Lista de comandos
```

O simplemente escríbele cualquier cosa y el CEO Agent responde.

### ⚠ Importante

- En **desarrollo local** el webhook no funciona (necesitas URL pública).
- Para probar local usa: `https://api.telegram.org/bot<TOKEN>/getUpdates`
  y haz polling manual, o usa **ngrok** para exponer el puerto 8000.

```bash
# Con ngrok (para desarrollo local)
ngrok http 8000
# Copia la URL https://xxxx.ngrok.io
curl -X POST "https://api.TU_DOMINIO/channels/telegram/set-webhook?url=https://xxxx.ngrok.io"
```

---

## 📱 WHATSAPP BUSINESS (30-60 minutos, requiere cuenta Meta Business)

### Lo que necesitas antes de empezar

- Cuenta de Facebook/Meta
- Número de teléfono que NO esté en WhatsApp personal
  (puede ser un número virtual de Twilio o similar)
- Servidor con URL pública (Railway, Fly.io, VPS)

### Paso 1 — Crear app en Meta Developers

1. Ve a **developers.facebook.com**
2. Clic en **"Mis Apps"** → **"Crear app"**
3. Tipo de app: **"Business"**
4. Nombre: `BusinessAIOS`
5. Clic en **"Crear app"**

### Paso 2 — Agregar WhatsApp al app

1. En el panel del app, busca **"WhatsApp"** → clic en **"Configurar"**
2. Acepta los términos
3. Verás una **prueba de sandbox** con un número temporal gratuito

### Paso 3 — Copiar las credenciales

En **WhatsApp → Configuración de la API**:

```
WHATSAPP_TOKEN=EAAxxxxxxx        ← "Access Token" (temporal en dev)
WHATSAPP_PHONE_ID=1234567890     ← "Phone number ID"
```

En **Configuración del App → Básico**:

```
WHATSAPP_APP_SECRET=abc123def    ← "Clave secreta de la app"
```

Y define un token de verificación propio (puede ser cualquier texto):

```
WHATSAPP_VERIFY_TOKEN=businessaios_verify
```

### Paso 4 — Configurar el webhook en Meta

1. Ve a **WhatsApp → Configuración** → sección **Webhooks**
2. Clic en **"Editar"**
3. URL del callback:
   ```
   https://api.TU_DOMINIO/channels/whatsapp/webhook
   ```
4. Token de verificación: `businessaios_verify` (el que pusiste en .env)
5. Clic en **"Verificar y guardar"**
   - Meta llamará a tu servidor para verificar — debe responder 200
6. Suscribirse a: ✅ **messages**

### Paso 5 — Probar en sandbox

En el sandbox de Meta puedes enviar mensajes de prueba a tu número de WhatsApp personal siguiendo las instrucciones que muestra el panel.

### Paso 6 — Producción (número propio)

Para tener tu propio número de WhatsApp Business:
1. Agrega un número de teléfono real en **WhatsApp → Números de teléfono**
2. Verifica el número con SMS o llamada
3. El `WHATSAPP_PHONE_ID` cambiará al del número real
4. El `WHATSAPP_TOKEN` permanente se genera en **System Users** de Meta Business

### Flujo de conversación con tus usuarios

```
Usuario escribe en WhatsApp → Meta → tu servidor → agente IA → respuesta

Comandos que entiende el bot:
/ceo       → CEO Agent (estrategia)
/research  → Research Agent (mercado)
/comercial → Commercial Agent (ventas)
/contenido → Content Agent (marketing)
/finanzas  → Finance Agent (proyecciones)
/ops       → Operations Agent (procesos)

Sin comando → CEO Agent por defecto
```

---

## 🔑 Resumen de variables en .env

```bash
# Telegram
TELEGRAM_BOT_TOKEN=1234567890:AAFxxxxxxxxxx

# WhatsApp
WHATSAPP_TOKEN=EAAxxxxxxxxxxxxxx
WHATSAPP_PHONE_ID=1234567890123
WHATSAPP_VERIFY_TOKEN=businessaios_verify
WHATSAPP_APP_SECRET=abc123def456

# Observabilidad (opcionales)
SENTRY_DSN=https://xxx@ooo.ingest.sentry.io/yyy
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx
POSTHOG_API_KEY=phc_xxxx
```

---

## ✅ Verificar que todo funciona

```bash
# Estado de los canales configurados
curl -H "X-Access-Key: BAIOS-XXXX" \
  http://localhost:8000/channels/status

# Health check completo
curl http://localhost:8000/observability/health
```

*BusinessAIOS v1.4.0 — Diego Gilfer, Cali Colombia*
