# ============================================================
# BusinessAIOS - services/providers/llm_provider.py
# LLM Abstraction Layer — Gemini + DeepSeek (ambos funcionales)
# ============================================================

from abc import ABC, abstractmethod
from core.config import settings
from core.logger import get_logger

logger = get_logger("LLMProvider")


class BaseLLMProvider(ABC):
    """Interfaz base para todos los providers de LLM."""

    @abstractmethod
    async def generate(self, prompt: str, system_context: str = "") -> str:
        pass

    @abstractmethod
    async def generate_structured(self, prompt: str, output_format: str = "json") -> str:
        pass

    @abstractmethod
    def health_check(self) -> dict:
        pass


def get_llm_provider(provider_name: str | None = None) -> BaseLLMProvider:
    """
    Factory que retorna el provider activo según configuración.

    Prioridad de selección:
      1. provider_name si se pasa explícitamente
      2. DEFAULT_LLM_PROVIDER del .env
      3. Fallback automático:
           - Si DEEPSEEK_API_KEY está set  → deepseek
           - Si GEMINI_API_KEY está set     → gemini
           - Si ninguna                    → error claro

    Args:
        provider_name: 'gemini' | 'deepseek' | None

    Returns:
        BaseLLMProvider instance listo para usar
    """
    from services.providers.gemini_provider import GeminiProvider
    from services.providers.deepseek_provider import DeepSeekProvider

    name = provider_name or settings.DEFAULT_LLM_PROVIDER

    # Fallback automático si el nombre no coincide con ningún provider válido
    if name not in ("gemini", "deepseek"):
        logger.warning(f"Provider desconocido: '{name}' — activando fallback automático")
        if settings.DEEPSEEK_API_KEY:
            name = "deepseek"
        elif settings.GEMINI_API_KEY:
            name = "gemini"
        else:
            raise RuntimeError(
                "No hay ningún LLM provider configurado. "
                "Agrega DEEPSEEK_API_KEY o GEMINI_API_KEY en tu .env"
            )

    providers = {
        "gemini":   GeminiProvider,
        "deepseek": DeepSeekProvider,
    }

    logger.info(f"LLM provider activo: {name}")
    return providers[name]()
