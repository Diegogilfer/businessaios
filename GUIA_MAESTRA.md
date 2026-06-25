# BusinessAIOS v1.0.0 — Guía Maestra de Uso
### El sistema de inteligencia artificial empresarial más completo que puedes operar desde tu terminal

---

## ÍNDICE
1. Arrancar el sistema completo
2. Hablar con tus agentes en tiempo real
3. 10 ejemplos reales de proyección, utilización y control
4. Comandos de control del sistema
5. Referencia rápida de endpoints

---

## 1. ARRANCAR EL SISTEMA COMPLETO

### Paso 1 — Configurar credenciales
```bash
cd ~/BusinessAIOS_v080
cp .env.example .env
nano .env
```
Llena obligatoriamente:
```
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu-anon-key
DEEPSEEK_API_KEY=sk-tu-key
DEFAULT_LLM_PROVIDER=deepseek
```

### Paso 2 — Ejecutar schema en Supabase
1. Abre tu proyecto en supabase.com → SQL Editor
2. Ejecuta `businessaios_schema_completo.sql`
3. Luego ejecuta `schema_chat.sql`

### Paso 3 — Arrancar el backend
```bash
cd ~/BusinessAIOS_v080
source venv/bin/activate
python main.py
# → http://localhost:8000/docs
```

### Paso 4 — Arrancar el frontend
```bash
cd ~/BusinessAIOS_v080/frontend
npm install
npm run dev
# → http://localhost:3000
```

---

## 2. HABLAR CON TUS AGENTES EN TIEMPO REAL

### Vía Dashboard (recomendado)
1. Abre `http://localhost:3000`
2. Haz clic en la tab **💬 Chat**
3. Selecciona el agente con quien quieres hablar
4. Escribe tu mensaje — el agente responde en tiempo real

### Vía API directa (para integrar en otros sistemas)
```bash
# 1. Crear conversación
curl -X POST http://localhost:8000/chat/conversations \
  -H "Content-Type: application/json" \
  -d '{"agent_role": "research", "title": "Análisis de mercado"}'

# 2. Enviar mensaje
curl -X POST http://localhost:8000/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_id": "uuid-retornado-arriba",
    "agent_role": "research",
    "message": "Analiza el mercado de e-commerce en Colombia"
  }'
```

### Vía WebSocket (para apps en tiempo real)
```javascript
const ws = new WebSocket('ws://localhost:8000/chat/ws/TU_CONV_ID')
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data)
  // msg.type: "thinking" | "response" | "error"
  if (msg.type === 'response') console.log(msg.response)
}
ws.send(JSON.stringify({ agent_role: 'ceo', message: 'Analiza mi negocio' }))
```

---

## 3. LOS 10 CASOS DE USO REALES

---

### CASO 1 — Investigación de mercado completa
**Agente:** Research Agent  
**Cuándo usarlo:** Antes de lanzar un producto o entrar a un nuevo mercado

**Cómo ejecutarlo:**
```
Habla con el Research Agent y escribe:
"Quiero lanzar un SaaS de gestión de inventarios para restaurantes en Colombia.
Analiza: tamaño de mercado, 5 competidores principales con sus precios,
oportunidades de diferenciación y riesgos regulatorios."
```

**Qué obtienes:** Análisis con TAM/SAM/SOM, matriz competitiva, ventanas de oportunidad  
**Valor:** Lo que antes costaba $2.000 dólares a una consultora, en 30 segundos

---

### CASO 2 — Plan de negocios ejecutivo
**Agente:** CEO Agent (con colaboración de todos)  
**Cuándo usarlo:** Pitches para inversores, nuevos proyectos, decisiones estratégicas

**Cómo ejecutarlo:**
```bash
curl -X POST http://localhost:8000/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Plan de negocios completo",
    "description": "Necesito un plan de negocios para una plataforma de delivery de comida saludable en Cali, Colombia. Modelo B2C, presupuesto inicial $50.000 USD. Incluir: análisis de mercado, modelo de revenue, estructura de costos, plan de go-to-market y proyección a 3 años.",
    "category": "strategy"
  }'
```
Luego ejecuta la tarea con `/tasks/execute`.

---

### CASO 3 — Motor de arbitraje Amazon ↔ AliExpress
**Cuándo usarlo:** Negocio de e-commerce, dropshipping, Amazon FBA

**Cómo activarlo:**
```
En el .env activa:
AMAZON_CLIENT_ID=tu-id
ALIEXPRESS_APP_KEY=tu-key

El sistema hace scan automático cada día a las 2 AM.
Para forzar un scan manual:
```
```bash
curl -X POST http://localhost:8000/arbitrage/scan \
  -d '{"category": "Electronics", "subcategory": "Smartphones"}'
```
**Resultado en el dashboard:** Tabla con ASINs, ROI%, nivel de riesgo, margen neto  
**Proyección:** Con $5.000 USD de capital y oportunidades de ROI 200%+, el sistema identifica automáticamente dónde invertir

---

### CASO 4 — Estrategia de contenido mensual
**Agente:** Content Agent  
**Cuándo usarlo:** Community managers, creadores de contenido, marcas

**Conversación ejemplo:**
```
Tú: "Manejo una marca de ropa sostenible para millennials colombianos. Dame el plan de contenido completo para el próximo mes en Instagram y LinkedIn."

Content Agent: [Genera calendario de 30 días, temas por semana, formatos, hashtags, horarios óptimos, copy para cada post]

Tú: "Ahora escribe el copy completo para los 5 posts más importantes"

Content Agent: [Recuerda el contexto y escribe los copies]
```

---

### CASO 5 — Análisis financiero y punto de equilibrio
**Agente:** Finance Agent  
**Cuándo usarlo:** Antes de invertir, al evaluar un negocio, fundraising

**Prompt:**
```
"Mi SaaS cobra $49/mes. Costos fijos: $3.200/mes (servidores, equipo, etc).
Costo variable por cliente: $8/mes. CAC actual: $120.
Churn mensual: 4%. Calcula: punto de equilibrio, LTV, LTV:CAC ratio,
proyección a 24 meses con 3 escenarios (pesimista, base, optimista)
y dime en qué mes llego a rentabilidad en cada escenario."
```

---

### CASO 6 — Automatización de operaciones
**Agente:** Operations Agent  
**Cuándo usarlo:** Escalar un negocio, reducir costos operativos, documentar procesos

**Tarea programada (el scheduler lo ejecuta automáticamente):**
```python
# El sistema ya tiene este job configurado — se ejecuta cada lunes 6 AM
# services/scheduling/scheduler.py
job: "weekly_operations_review"
→ Operations Agent analiza métricas de la semana
→ Genera reporte de bottlenecks
→ Sugiere 3 optimizaciones prioritarias
→ Persiste en global_knowledge para aprendizaje futuro
```

---

### CASO 7 — Pipeline de ventas y leads
**Agente:** Commercial Agent  
**Cuándo usarlo:** Equipos de ventas, freelancers, agencias

**Conversación:**
```
Tú: "Tengo una agencia de desarrollo web. Mi cliente ideal es un negocio local con 10-50 empleados que quiere digitalizar su operación. Crea un script completo de cold email para LinkedIn."

Commercial: [Script personalizado con 5 variaciones A/B]

Tú: "Ahora dame el follow-up para quien no respondió en 3 días"

Commercial: [Recuerda el contexto del script original y crea el follow-up]
```

---

### CASO 8 — Sistema de memoria y conocimiento acumulado
**Cuándo usarlo:** Después de varias semanas usando el sistema

El sistema aprende automáticamente. Cada tarea completada genera conocimiento en `global_knowledge`. Puedes consultarlo así:

```bash
# Buscar conocimiento acumulado por el Research Agent
curl -X POST http://localhost:8000/rag/search/semantic \
  -d '{"query": "estrategias de pricing para SaaS", "limit": 5}'

# El sistema retorna los fragmentos más relevantes de todo lo que los agentes han analizado antes
```

**Proyección:** Después de 3 meses de uso, el sistema tiene un repositorio de conocimiento específico de TU industria y TUS proyectos.

---

### CASO 9 — Monitor de salud del sistema (control total)
**Dashboard en tiempo real:**
```
http://localhost:3000 → Overview
```
Ves en vivo:
- Health score del sistema
- Cuántas tareas completadas hoy
- Quality score promedio de los agentes
- Qué agente está trabajando ahora mismo
- Eventos del EventBus en tiempo real

**Via API:**
```bash
# Salud del sistema
curl http://localhost:8000/analytics/health

# Performance por agente
curl http://localhost:8000/analytics/agents

# Timeline de ejecuciones últimos 7 días
curl http://localhost:8000/analytics/executions?days=7
```

---

### CASO 10 — Modo multi-proyecto (agencia o freelancer)
**Cuándo usarlo:** Si manejas múltiples clientes o proyectos simultáneamente

```bash
# Crear proyecto para cliente A
curl -X POST http://localhost:8000/projects \
  -d '{"name": "Cliente A - E-commerce", "industry": "retail", "target_market": "Colombia"}'

# Crear proyecto para cliente B
curl -X POST http://localhost:8000/projects \
  -d '{"name": "Cliente B - SaaS", "industry": "technology", "target_market": "LATAM"}'

# Las tareas quedan asociadas a cada proyecto
# El knowledge base aprende por separado para cada cliente
# El dashboard filtra métricas por proyecto
```

---

## 4. COMANDOS DE CONTROL DEL SISTEMA

### Reiniciar solo el backend
```bash
# Ctrl+C para detener
python main.py
```

### Ver logs en tiempo real
```bash
tail -f logs/businessaios.log
```

### Forzar ejecución de jobs programados manualmente
```bash
curl -X POST http://localhost:8000/scheduling/trigger/arbitrage_scan
curl -X POST http://localhost:8000/scheduling/trigger/neuro_prediction
```

### Ver estado de todos los jobs
```bash
curl http://localhost:8000/scheduling/jobs
```

### Verificar conexión Supabase
```bash
curl http://localhost:8000/analytics/health
# → {"status": "healthy", "database": "connected", ...}
```

### Limpiar tareas antiguas
```bash
curl -X DELETE http://localhost:8000/tasks/cleanup?days=30
```

---

## 5. REFERENCIA RÁPIDA DE ENDPOINTS

| Área          | Endpoint                          | Uso                              |
|---------------|-----------------------------------|----------------------------------|
| **Chat**      | POST /chat/conversations          | Nueva conversación con agente    |
| **Chat**      | POST /chat/message                | Enviar mensaje                   |
| **Chat**      | WS /chat/ws/{conv_id}             | Chat en tiempo real              |
| **Tareas**    | POST /tasks                       | Crear tarea                      |
| **Tareas**    | POST /tasks/execute               | Ejecutar tarea con agentes       |
| **Tareas**    | GET /tasks?status=completed       | Listar tareas por estado         |
| **Arbitrage** | POST /arbitrage/scan              | Iniciar scan de oportunidades    |
| **Arbitrage** | GET /arbitrage/opportunities      | Ver oportunidades detectadas     |
| **RAG**       | POST /rag/search/semantic         | Búsqueda semántica en knowledge  |
| **Analytics** | GET /analytics/health             | Salud del sistema                |
| **Analytics** | GET /analytics/agents             | Performance por agente           |
| **Dashboard** | GET /dashboard/overview           | Métricas ejecutivas completas    |
| **Scheduler** | GET /scheduling/jobs              | Estado de jobs programados       |
| **Docs**      | GET /docs                         | Swagger UI interactivo           |

---

## ARQUITECTURA EN UNA LÍNEA

```
Tú → [Chat/API] → FastAPI :8000 → ExecutionEngine → 6 Agentes IA (DeepSeek)
                                       ↓                    ↓
                                  Supabase DB          EventBus
                                  (persistencia)       ↓
                                                   WS Manager → Dashboard :3000
```

---

*BusinessAIOS v1.0.0 — Diego, Cali Colombia*
*Backend: FastAPI + Supabase + DeepSeek*
*Frontend: Next.js 14 + React 18*
*Construido con Claude Sonnet — Anthropic*

---

## FASE 11 — SaaS Multi-Tenant Completo

### Activar la Fase 11

```bash
# 1. Ejecutar schema en Supabase SQL Editor
#    schema_fase11.sql

# 2. Configurar Stripe (opcional — funciona sin él en modo local)
#    Crea productos en dashboard.stripe.com
#    Copia los Price IDs al .env:
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...

# 3. En el dashboard → tab ⬡ SaaS
```

### Flujo completo de un cliente nuevo

```bash
# 1. Registrar tenant (via API o tab SaaS → Registrar)
curl -X POST http://localhost:8000/saas/tenants \
  -d '{"name": "Empresa XYZ", "email": "ceo@xyz.com", "plan": "starter"}'
# → retorna tenant_id + api_key (¡guárdala!)

# 2. El cliente usa su api_key para autenticar requests
curl -X POST http://localhost:8000/tasks \
  -H "X-API-Key: bios_live_..." \
  -d '{"title": "Análisis de mercado", "description": "..."}'

# 3. Verificar uso del cliente
curl http://localhost:8000/saas/usage/TENANT_ID

# 4. Si excede su quota → 429 automático con mensaje claro
# 5. Upgrade de plan
curl -X POST http://localhost:8000/saas/billing/upgrade \
  -d '{"tenant_id": "...", "new_plan": "pro"}'
```

### Planes disponibles

| Plan       | Precio   | Tareas/mes | Chat/día | Arbitrage scans |
|------------|----------|------------|----------|-----------------|
| Free       | Gratis   | 50         | 20       | 0               |
| Starter    | $29/mo   | 500        | 200      | 5               |
| Pro        | $99/mo   | 5.000      | ∞        | 50              |
| Enterprise | Custom   | ∞          | ∞        | ∞               |

### Webhook Stripe (para pagos automáticos)

```bash
# En Stripe Dashboard → Webhooks → agregar endpoint:
# https://tudominio.com/saas/billing/webhook
# Eventos: checkout.session.completed, customer.subscription.deleted
```

---

## FASE 12 — Advanced NeuroIA

### Activar la Fase 12

```bash
# 1. Supabase SQL Editor → ejecutar schema_fase12.sql
# 2. Dashboard → tab ◈ NeuroIA
```

### Los 5 módulos del tab ◈ NeuroIA

**📋 Briefing** — El Executive Copilot analiza el estado real del sistema
y genera un briefing ejecutivo con IA cada vez que abres el tab.
Muestra: métricas clave + 3 prioridades de acción + alertas.

**⚠ Alertas** — Monitoreo proactivo. Sin que preguntes, detecta:
- Tasa de fallos > 20% → alerta alta
- Quality drift en agentes → alerta media
- Sistema inactivo → alerta baja
- Oportunidades de arbitraje sin revisar → info

**◈ Predicciones** — Para cada uno de los 6 agentes, calcula:
calidad predicha (media móvil ponderada), tendencia, confianza
y recomendación específica.

**◆ Segmentos** — Analiza qué categorías de tareas funcionan
mejor/peor. Genera insights automáticos sobre patrones de uso.

**⬡ Análisis IA** — Análisis estratégico profundo con 5 focos:
`general`, `growth`, `cost`, `quality`, `arbitrage`.
El LLM combina tus datos reales con inteligencia estratégica.

### Auto-Learning Loop (automático cada domingo 3 AM)

```bash
# Ejecutar manualmente un ciclo de aprendizaje
curl -X POST http://localhost:8000/neuro/learning/run \
  -d '{"auto_apply": false}'
# → propone mejoras de prompts para cada agente con baja calidad

# Con auto_apply=true aplica automáticamente si confianza > 85%
curl -X POST http://localhost:8000/neuro/learning/run \
  -d '{"auto_apply": true}'
```

### Endpoints clave Fase 12

| Endpoint                          | Descripción                           |
|-----------------------------------|---------------------------------------|
| GET /neuro/briefing               | Briefing ejecutivo diario con IA      |
| GET /neuro/alerts                 | Alertas proactivas del sistema        |
| GET /neuro/predict/{agent_role}   | Calidad predicha de un agente         |
| GET /neuro/predict/all            | Predicción simultánea 6 agentes       |
| GET /neuro/recommend?category=X   | Agente recomendado para una tarea     |
| GET /neuro/segments               | Segmentación de comportamiento        |
| GET /neuro/trends?days=30         | Tendencias históricas de uso          |
| GET /neuro/analyze?focus=growth   | Análisis estratégico profundo         |
| POST /neuro/learning/run          | Ciclo de auto-aprendizaje             |
| GET /neuro/learning/history       | Historial de mejoras propuestas       |

---

## BLUEPRINT FASE 5 — Auto-Optimization Engine

El sistema que se mejora solo. Sin intervención humana.

### Los 5 mecanismos del motor

**Self-Healing** — Diagnostica en tiempo real:
detecta agentes degradados, fallos acumulados, knowledge estancado
y scheduler caído. Genera y aplica correcciones automáticamente.

**Prompt Optimizer** — Reescribe los system_prompts de los agentes
que tienen baja calidad. Con `dry_run=false` los aplica directo.

**Threshold Tuner** — Recalibra los umbrales del sistema
(calidad mínima, confianza de auto-apply) usando percentiles
reales de los últimos 200 registros. El sistema aprende sus
propios estándares.

**Full Optimization Cycle** — El más poderoso. Ejecuta en secuencia:
tune → self-heal → optimize. Corre automáticamente cada sábado a las 4 AM.

### Comandos

```bash
# Self-heal manual (cuando sospechas que algo está mal)
curl -X POST http://localhost:8000/neuro/optimizer/self-heal

# Ver estado del motor
curl http://localhost:8000/neuro/optimizer/status

# Ciclo completo de optimización
curl -X POST http://localhost:8000/neuro/optimizer/full-cycle

# Optimizar prompts en modo propuesta (sin aplicar)
curl -X POST http://localhost:8000/neuro/optimizer/optimize-prompts \
  -d '{"dry_run": true}'

# Aplicar optimizaciones automáticamente
curl -X POST http://localhost:8000/neuro/optimizer/optimize-prompts \
  -d '{"dry_run": false}'
```

### Programación automática

| Job                        | Frecuencia         | Descripción                        |
|----------------------------|--------------------|------------------------------------|
| weekly_auto_learning       | Domingos 3 AM UTC  | Propone mejoras de prompts         |
| weekly_auto_optimization   | Sábados 4 AM UTC   | Ciclo completo tune+heal+optimize  |
| arbitrage_scan             | Diario 2 AM UTC    | Scan Amazon ↔ AliExpress           |
| neuro_prediction           | Diario 6 AM UTC    | Predicciones de calidad            |

---

## RESUMEN COMPLETO DEL PROYECTO

### Lo que tienes construido

| Capa         | Componente                | Estado     |
|--------------|---------------------------|------------|
| Core         | 6 Agentes IA + Loop       | ✓ Completo |
| Base de datos| 16 tablas Supabase + RPCs  | ✓ Completo |
| API          | 22 routers + 80+ endpoints| ✓ Completo |
| Frontend     | 10 tabs + 13 componentes  | ✓ Completo |
| Chat         | Tiempo real + historial   | ✓ Completo |
| Auth         | Clave BAIOS + recovery    | ✓ Completo |
| SaaS         | Multi-tenant + Stripe     | ✓ Completo |
| NeuroIA      | Copilot + predicciones    | ✓ Completo |
| Skills       | 15 skills en marketplace  | ✓ Completo |
| Auto-Opt     | Self-heal + optimizer     | ✓ Completo |

### Stack tecnológico

Backend: Python 3.11 + FastAPI + Supabase (PostgreSQL + pgvector)
IA: DeepSeek V3/R1 (+ fallback Gemini)
Frontend: Next.js 14 + React 18 + TypeScript
Pagos: Stripe Checkout + Webhooks
WebSocket: APScheduler + EventBus
Deploy: WSL Ubuntu + cualquier VPS Linux

*BusinessAIOS v1.3.0 — Diego Gilfer, Cali Colombia*
*Construido con Claude Sonnet — Anthropic*

---

## DEPLOY A PRODUCCIÓN

### Opción A — Railway (más rápido, 5 minutos)
```bash
# 1. Instalar Railway CLI
npm install -g @railway/cli

# 2. Login y deploy
railway login
railway init
railway up

# 3. Configurar variables de entorno en el dashboard de Railway
# (las mismas del .env)
```

### Opción B — Docker en VPS
```bash
# En tu VPS Ubuntu:
git clone https://github.com/TU_USUARIO/businessaios
cd businessaios
cp deploy/env.production.example .env
nano .env   # llenar credenciales

# Build y arrancar
docker-compose up -d backend frontend

# Verificar
curl http://TU_IP:8000/health
```

### Opción C — Fly.io
```bash
fly auth login
fly launch    # detecta fly.toml automáticamente
fly secrets set DEEPSEEK_API_KEY=sk-...
fly deploy
```

---

## CANALES — WhatsApp y Telegram

### Telegram (más fácil, 10 minutos)
```bash
# 1. Crear bot con @BotFather en Telegram
#    /newbot → elegir nombre → copiar TOKEN

# 2. Agregar al .env
TELEGRAM_BOT_TOKEN=123456789:AAF...

# 3. Registrar webhook (con servidor en producción)
curl -X POST "https://api.TU_DOMINIO/channels/telegram/set-webhook?url=https://api.TU_DOMINIO"

# ✅ Listo — busca tu bot en Telegram y escríbele
```

### WhatsApp Business (requiere cuenta Meta Business)
```bash
# 1. Ir a developers.facebook.com → crear app → agregar WhatsApp
# 2. Copiar credenciales al .env:
WHATSAPP_TOKEN=EAAxxxxx
WHATSAPP_PHONE_ID=123456789
WHATSAPP_VERIFY_TOKEN=businessaios_verify   # puedes cambiarlo
WHATSAPP_APP_SECRET=abc123

# 3. En Meta Developers → Webhooks → configurar URL:
#    https://api.TU_DOMINIO/channels/whatsapp/webhook
#    Verify Token: businessaios_verify

# 4. Suscribirse al evento: messages
# ✅ Listo — los usuarios te escriben a tu número de WhatsApp Business
```

---

## OBSERVABILIDAD

### Sentry (captura de errores)
```bash
# 1. Crear proyecto en sentry.io (gratis)
# 2. Copiar DSN al .env:
SENTRY_DSN=https://xxx@ooo.ingest.sentry.io/yyy

# ✅ Todos los errores de producción aparecen en Sentry
```

### Slack (alertas en tiempo real)
```bash
# 1. slack.com/apps → buscar "Incoming WebHooks" → agregar
# 2. Copiar URL al .env:
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx/yyy/zzz

# Probar:
curl -X POST http://localhost:8000/observability/alert \
  -H "X-Access-Key: BAIOS-XXXX" \
  -d '{"message": "Sistema arrancado correctamente", "level": "success"}'
```

### UptimeRobot (monitor de disponibilidad, gratis)
```
URL a monitorear: https://api.TU_DOMINIO/observability/health
Intervalo: 5 minutos
Alerta a: tu email o Slack
```
