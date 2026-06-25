# ============================================================
# BusinessAIOS - services/providers/deepseek_provider.py
# DeepSeek provider — implementación real con retry logic
# Reemplaza el stub vacío del llm_provider.py
# ============================================================

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from core.config import settings
from core.logger import get_logger

logger = get_logger("DeepSeekProvider")

DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"
DEFAULT_MODEL     = "deepseek-v4-flash"   # V4 Flash: rápido, económico ($0.14/$0.28)
FALLBACK_MODEL    = "deepseek-v4-pro"     # V4 Pro: razonamiento avanzado ($0.435/$0.87)
# deepseek-chat y deepseek-reasoner deprecados el 24-Jul-2026


class DeepSeekProvider:
    """
    DeepSeek AI provider — implementación completa.
    API compatible con OpenAI: /v1/chat/completions.

    Modelos disponibles (2025-2026):
      - deepseek-v4-flash  → V4 Flash, rápido y económico — $0.14/$0.28 (recomendado)
      - deepseek-v4-pro    → V4 Pro, razonamiento avanzado — $0.435/$0.87
    """

    def __init__(self, model: str | None = None):
        self._validate_key()
        self.model = model or settings.DEFAULT_MODEL or DEFAULT_MODEL
        self.headers = {
            "Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}",
            "Content-Type": "application/json",
        }
        logger.info(f"DeepSeekProvider initialized | model={self.model}")

    def _validate_key(self):
        """Validación explícita de la API key."""
        key = settings.DEEPSEEK_API_KEY
        if not key or key.strip() == "" or key.startswith("your_") or key.startswith("sk-..."):
            raise ValueError(
                "\n"
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                "  BusinessAIOS — DEEPSEEK_API_KEY not configured\n"
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                "  Steps to fix:\n"
                "  1. Go to: https://platform.deepseek.com/api_keys\n"
                "  2. Create a new API key\n"
                "  3. Set DEEPSEEK_API_KEY=sk-... in your .env\n"
                "  4. Set DEFAULT_LLM_PROVIDER=deepseek in your .env\n"
                "  5. Set DEFAULT_MODEL=deepseek-v4-flash in your .env\n"
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            )

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((httpx.HTTPError, httpx.TimeoutException)),
        reraise=True,
    )
    async def generate(self, prompt: str, system_context: str = "") -> str:
        """
        Genera una respuesta usando la API de DeepSeek.

        Args:
            prompt: Prompt del usuario
            system_context: Contexto de sistema (system prompt del agente)

        Returns:
            str: Texto generado
        """
        messages = []

        if system_context:
            messages.append({"role": "system", "content": system_context})

        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 4096,
            "stream": False,
        }

        logger.debug(f"DeepSeek request | model={self.model} chars={len(prompt)}")

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                DEEPSEEK_API_URL,
                headers=self.headers,
                json=payload,
            )
            response.raise_for_status()

        data = response.json()

        # Extraer contenido de la respuesta
        choices = data.get("choices", [])
        if not choices:
            raise ValueError("DeepSeek returned empty choices list")

        content = choices[0].get("message", {}).get("content", "").strip()
        if not content:
            raise ValueError("DeepSeek returned empty content")

        # Log de usage para monitoreo de costos
        usage = data.get("usage", {})
        logger.info(
            f"DeepSeek response | "
            f"input_tokens={usage.get('prompt_tokens', '?')} "
            f"output_tokens={usage.get('completion_tokens', '?')} "
            f"chars={len(content)}"
        )

        return content

    async def generate_structured(self, prompt: str, output_format: str = "json") -> str:
        """
        Genera salida estructurada (JSON o markdown).
        DeepSeek sigue instrucciones de formato con alta fidelidad.
        """
        if output_format == "json":
            instruction = (
                "\n\nRespond ONLY with valid JSON. "
                "No markdown fences, no explanation, just the JSON object."
            )
        else:
            instruction = f"\n\nRespond in {output_format} format."

        return await self.generate(prompt + instruction)

    async def generate_with_reasoning(self, prompt: str, system_context: str = "") -> dict:
        """
        Usa deepseek-reasoner (R1) para tareas que requieren razonamiento profundo.
        Retorna tanto el chain-of-thought como la respuesta final.

        Úsalo para: análisis financiero complejo, estrategia multi-paso,
        decisiones de arbitraje de alto riesgo.
        """
        messages = []
        if system_context:
            messages.append({"role": "system", "content": system_context})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": FALLBACK_MODEL,   # deepseek-reasoner
            "messages": messages,
            "max_tokens": 8000,
            "stream": False,
        }

        logger.info(f"DeepSeek R1 reasoning request | chars={len(prompt)}")

        async with httpx.AsyncClient(timeout=120.0) as client:  # R1 necesita más tiempo
            response = await client.post(
                DEEPSEEK_API_URL,
                headers=self.headers,
                json=payload,
            )
            response.raise_for_status()

        data = response.json()
        message = data.get("choices", [{}])[0].get("message", {})

        return {
            "reasoning": message.get("reasoning_content", ""),   # chain-of-thought de R1
            "answer":    message.get("content", "").strip(),
            "model":     FALLBACK_MODEL,
        }

    def health_check(self) -> dict:
        """Estado del provider."""
        return {
            "provider":    "deepseek",
            "model":       self.model,
            "api_key_set": bool(settings.DEEPSEEK_API_KEY),
            "status":      "ok",
            "api_url":     DEEPSEEK_API_URL,
        }
