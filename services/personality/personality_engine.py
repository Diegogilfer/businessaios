# ============================================================
# BusinessAIOS - Personality Engine (Blueprint 2026-2028)
# Perfiles de personalidad por agente + A/B testing
# ============================================================
import json
from enum import Enum
from dataclasses import dataclass, field
from core.logger import get_logger

logger = get_logger("PersonalityEngine")

class PersonalityMode(str, Enum):
    FIXED      = "fixed"       # Nunca cambia
    FLEXIBLE   = "flexible"    # Adapta tono según contexto
    ADJUSTABLE = "adjustable"  # El tenant puede configurarlo

@dataclass
class AgentPersonality:
    role:        str
    mode:        PersonalityMode
    tone:        str            # "professional" | "casual" | "direct" | "empathetic"
    verbosity:   str            # "concise" | "detailed" | "balanced"
    expertise:   str            # nivel de tecnicidad
    language:    str = "es"
    tenant_id:   str = "default"
    custom_instructions: str = ""
    ab_variant:  str = "A"      # A/B testing

# Personalidades base del sistema
DEFAULT_PERSONALITIES: dict[str, AgentPersonality] = {
    "ceo": AgentPersonality(
        role="ceo", mode=PersonalityMode.FIXED,
        tone="direct", verbosity="balanced", expertise="executive",
        custom_instructions="Piensa como un CEO con 20 años de experiencia. Sé directo, estratégico y orientado a resultados. Prioriza el ROI.",
    ),
    "research": AgentPersonality(
        role="research", mode=PersonalityMode.FLEXIBLE,
        tone="professional", verbosity="detailed", expertise="analyst",
        custom_instructions="Eres un analista senior. Cita datos, usa frameworks como PESTEL y Porter. Sé riguroso y objetivo.",
    ),
    "commercial": AgentPersonality(
        role="commercial", mode=PersonalityMode.ADJUSTABLE,
        tone="empathetic", verbosity="balanced", expertise="sales",
        custom_instructions="Eres un experto en ventas consultivas. Conecta problemas con soluciones. Usa técnicas de SPIN selling.",
    ),
    "content": AgentPersonality(
        role="content", mode=PersonalityMode.ADJUSTABLE,
        tone="casual", verbosity="concise", expertise="creative",
        custom_instructions="Eres un copywriter y estratega de contenido. Escribe para enganchar, educar y convertir.",
    ),
    "finance": AgentPersonality(
        role="finance", mode=PersonalityMode.FIXED,
        tone="professional", verbosity="detailed", expertise="cfo",
        custom_instructions="Eres un CFO experimentado. Siempre incluye números, proyecciones y análisis de riesgos financieros.",
    ),
    "operations": AgentPersonality(
        role="operations", mode=PersonalityMode.FLEXIBLE,
        tone="direct", verbosity="concise", expertise="ops",
        custom_instructions="Eres un COO pragmático. Diseña procesos eficientes, escalables y medibles. Piensa en automatización.",
    ),
}

class PersonalityEngine:
    def __init__(self):
        self._profiles: dict[str, AgentPersonality] = dict(DEFAULT_PERSONALITIES)
        logger.info("PersonalityEngine initialized")

    def get_personality(self, role: str, tenant_id: str = "default") -> AgentPersonality:
        key = f"{tenant_id}:{role}"
        return self._profiles.get(key) or self._profiles.get(role) or DEFAULT_PERSONALITIES.get(role)

    def build_system_prompt(self, role: str, base_prompt: str, tenant_id: str = "default") -> str:
        p = self.get_personality(role, tenant_id)
        if not p:
            return base_prompt
        tone_map = {
            "direct":     "Sé directo y conciso. Ve al grano sin rodeos.",
            "professional":"Mantén un tono profesional y formal.",
            "casual":     "Usa un tono amigable y cercano.",
            "empathetic": "Muestra empatía, escucha activamente y conecta emocionalmente.",
        }
        verb_map = {
            "concise":  "Respuestas cortas y precisas. Máximo 3-4 párrafos.",
            "detailed": "Respuestas completas con ejemplos, datos y contexto.",
            "balanced": "Equilibra profundidad con brevedad.",
        }
        personality_layer = f"""
PERSONALIDAD ACTIVA:
- Tono: {tone_map.get(p.tone, '')}
- Verbosidad: {verb_map.get(p.verbosity, '')}
- Variante A/B: {p.ab_variant}
{f'- Instrucciones adicionales: {p.custom_instructions}' if p.custom_instructions else ''}
"""
        return base_prompt + "\n\n" + personality_layer

    def update_personality(self, role: str, updates: dict, tenant_id: str = "default") -> AgentPersonality:
        key  = f"{tenant_id}:{role}"
        base = self.get_personality(role, tenant_id)
        for k, v in updates.items():
            if hasattr(base, k):
                setattr(base, k, v)
        self._profiles[key] = base
        logger.info(f"Personality updated: {role} tenant={tenant_id}")
        return base

personality_engine = PersonalityEngine()
