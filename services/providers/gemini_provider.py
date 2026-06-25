# ============================================================
# BusinessAIOS - services/providers/gemini_provider.py
# Gemini provider — actualizado a google-genai (SDK nuevo)
# ============================================================

import asyncio
from core.config import settings
from core.logger import get_logger

logger = get_logger("GeminiProvider")


class GeminiProvider:
    """
    Gemini AI provider usando el SDK google-genai actualizado.
    Fallback cuando DeepSeek no está disponible.
    """

    def __init__(self):
        if not settings.GEMINI_API_KEY:
            raise ValueError(
                "GEMINI_API_KEY no configurado. "
                "Agrega GEMINI_API_KEY en tu .env o usa DEFAULT_LLM_PROVIDER=deepseek"
            )
        try:
            # Intentar SDK nuevo primero
            from google import genai
            self._client = genai.Client(api_key=settings.GEMINI_API_KEY)
            self._sdk = "new"
        except ImportError:
            try:
                # Fallback al SDK legacy
                import google.generativeai as genai_legacy
                genai_legacy.configure(api_key=settings.GEMINI_API_KEY)
                self._legacy = genai_legacy
                self._sdk = "legacy"
            except ImportError:
                raise RuntimeError("Instala google-genai: pip install google-genai")

        self.model = getattr(settings, "GEMINI_MODEL", "gemini-2.0-flash")
        logger.info(f"GeminiProvider initialized | model={self.model} sdk={self._sdk}")

    async def generate(self, prompt: str, system_context: str = "") -> str:
        full_prompt = f"{system_context}\n\n{prompt}" if system_context else prompt
        try:
            if self._sdk == "new":
                response = await asyncio.to_thread(
                    self._client.models.generate_content,
                    model=self.model,
                    contents=full_prompt,
                )
                return response.text or ""
            else:
                model = self._legacy.GenerativeModel(self.model)
                response = await asyncio.to_thread(model.generate_content, full_prompt)
                return response.text or ""
        except Exception as e:
            logger.error(f"Gemini generate error: {e}")
            raise

    async def generate_structured(self, prompt: str, output_format: str = "json") -> str:
        instruction = "\nRespond ONLY with valid JSON. No markdown." if output_format == "json" else f"\nRespond in {output_format}."
        return await self.generate(prompt + instruction)

    def health_check(self) -> dict:
        return {
            "provider":    "gemini",
            "model":       self.model,
            "sdk":         self._sdk,
            "api_key_set": bool(settings.GEMINI_API_KEY),
            "status":      "ok",
        }
