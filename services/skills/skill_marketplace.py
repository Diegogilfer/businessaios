# ============================================================
# BusinessAIOS - services/skills/skill_marketplace.py
# Blueprint Fase 3 — Marketplace de Skills instalables
# Skills como plugins: instalar, activar, monetizar, compartir
# ============================================================

import uuid
from datetime import datetime
from dataclasses import dataclass, field
from services.skills.skill_registry import skill_registry, Skill, SkillRegistry
from core.database import get_supabase
from core.logger import get_logger

logger = get_logger("SkillMarketplace")


@dataclass
class MarketplaceSkill:
    """Skill enriquecida para el marketplace."""
    name:           str
    title:          str               # Nombre amigable
    description:    str
    category:       str               # "analysis" | "content" | "finance" | "operations" | "sales" | "custom"
    agent_roles:    list[str]
    prompt_template: str
    author:         str = "system"
    version:        str = "1.0.0"
    price:          float = 0.0       # 0 = free
    installs:       int = 0
    rating:         float = 5.0
    tags:           list[str] = field(default_factory=list)
    is_premium:     bool = False


# ── Catálogo del marketplace ─────────────────────────────────
MARKETPLACE_CATALOG: list[MarketplaceSkill] = [
    # Análisis
    MarketplaceSkill(
        name="swot_analysis", title="SWOT Analysis",
        description="Análisis FODA completo con puntos accionables para cada cuadrante",
        category="analysis", agent_roles=["research", "ceo"],
        prompt_template="Perform a detailed SWOT analysis for: {subject}\nContext: {context}\nStructure: Strengths | Weaknesses | Opportunities | Threats\nFor each quadrant provide 3-5 specific, actionable points.",
        tags=["strategy", "planning"], installs=284,
    ),
    MarketplaceSkill(
        name="competitor_analysis", title="Competitor Analysis",
        description="Mapeo de competidores con posicionamiento, precios y gaps del mercado",
        category="analysis", agent_roles=["research", "commercial"],
        prompt_template="Analyze the competitive landscape for: {market}\nIdentify top 3-5 competitors. For each: positioning, pricing, strengths, weaknesses, differentiators.\nConclude with market gaps and opportunities.",
        tags=["market", "competition"], installs=196,
    ),
    MarketplaceSkill(
        name="pestel_analysis", title="PESTEL Analysis",
        description="Análisis del macro-entorno: Político, Económico, Social, Tecnológico, Ambiental, Legal",
        category="analysis", agent_roles=["research", "ceo"],
        prompt_template="Conduct a PESTEL analysis for: {subject} in {country}.\nFor each factor provide: current state, trends, opportunities, and risks.\nConclude with top 3 strategic implications.",
        tags=["macro", "environment"], installs=142,
    ),
    MarketplaceSkill(
        name="porter_five_forces", title="Porter's Five Forces",
        description="Análisis de las 5 fuerzas competitivas de Porter",
        category="analysis", agent_roles=["research", "ceo"],
        prompt_template="Apply Porter's Five Forces to: {industry}.\nAnalyze: Supplier power, Buyer power, Competitive rivalry, Threat of substitution, Threat of new entry.\nRate each force (Low/Medium/High) and provide strategic recommendations.",
        tags=["strategy", "industry"], installs=118,
    ),
    # Finanzas
    MarketplaceSkill(
        name="financial_projection", title="Financial Projection 12M",
        description="Proyecciones financieras a 12 meses con 3 escenarios",
        category="finance", agent_roles=["finance"],
        prompt_template="Build 12-month financial projections for: {business}\nAssumptions: {assumptions}\nProvide: Revenue model, Cost structure, Monthly P&L, Break-even, Cash flow timeline.\nInclude conservative / base / optimistic scenarios.",
        tags=["finance", "planning"], installs=231,
    ),
    MarketplaceSkill(
        name="unit_economics", title="Unit Economics Calculator",
        description="Calcula LTV, CAC, LTV:CAC ratio, payback period y margen por unidad",
        category="finance", agent_roles=["finance", "ceo"],
        prompt_template="Calculate unit economics for: {business_model}\nData: {financial_data}\nCompute: CAC, LTV, LTV:CAC ratio, Payback period, Contribution margin, Break-even units.\nBenchmark against industry standards and provide optimization recommendations.",
        tags=["saas", "metrics"], installs=189, is_premium=False,
    ),
    MarketplaceSkill(
        name="fundraising_narrative", title="Fundraising Narrative",
        description="Construye el pitch narrative para inversores con estructura probada",
        category="finance", agent_roles=["ceo", "finance"],
        prompt_template="Build a compelling fundraising narrative for: {company}\nStage: {stage}, Amount: {amount}\nInclude: Problem, Solution, Market size, Traction, Business model, Team, Ask.\nUse the SCORE framework (Story, Challenge, Opportunity, Resolution, Evidence).",
        tags=["fundraising", "investors"], installs=156, is_premium=True, price=9.99,
    ),
    # Contenido
    MarketplaceSkill(
        name="content_strategy", title="Content Strategy",
        description="Estrategia de contenido con calendario de 30 días y KPIs",
        category="content", agent_roles=["content"],
        prompt_template="Design a content marketing strategy for: {brand}\nTarget audience: {audience}\nInclude: Tone of voice, Content pillars, Channel strategy, 30-day content calendar, KPIs.",
        tags=["marketing", "social"], installs=203,
    ),
    MarketplaceSkill(
        name="viral_post_generator", title="Viral Post Generator",
        description="Genera posts virales para LinkedIn, Instagram y Twitter con hooks probados",
        category="content", agent_roles=["content"],
        prompt_template="Create a viral {platform} post for: {topic}\nBrand voice: {voice}\nUse proven viral hooks: curiosity gap, controversy, value promise, or story.\nInclude: Hook, Body (3 key points), CTA, and relevant hashtags.",
        tags=["social", "viral"], installs=312,
    ),
    MarketplaceSkill(
        name="email_sequence", title="Email Sequence Builder",
        description="Secuencia de emails de onboarding o nurturing de 5-7 pasos",
        category="content", agent_roles=["content", "commercial"],
        prompt_template="Build a {sequence_type} email sequence for: {product}\nAudience: {audience}, Goal: {goal}\nCreate {num_emails} emails with: Subject line, Preview text, Body, CTA.\nFollow copywriting best practices: AIDA, problem-solution, social proof.",
        tags=["email", "automation"], installs=178,
    ),
    # Ventas / Comercial
    MarketplaceSkill(
        name="sales_funnel", title="Sales Funnel Designer",
        description="Diseño completo del funnel de ventas con tasas de conversión por etapa",
        category="sales", agent_roles=["commercial"],
        prompt_template="Design a complete sales funnel for: {product}\nTarget customer: {customer}\nInclude: Awareness → Interest → Consideration → Decision → Retention.\nTouchpoints, conversion tactics, and expected conversion rates per stage.",
        tags=["sales", "conversion"], installs=221,
    ),
    MarketplaceSkill(
        name="cold_outreach", title="Cold Outreach Script",
        description="Scripts de cold email y LinkedIn con variaciones A/B y follow-ups",
        category="sales", agent_roles=["commercial"],
        prompt_template="Write a cold outreach sequence for: {offer}\nTarget: {target_profile}, Pain point: {pain_point}\nCreate: Initial message (under 100 words), Follow-up 1 (day 3), Follow-up 2 (day 7).\nUse SPIN selling principles. Include subject lines and LinkedIn variants.",
        tags=["outreach", "B2B"], installs=267,
    ),
    MarketplaceSkill(
        name="objection_handler", title="Objection Handler",
        description="Respuestas para las 10 objeciones más comunes en ventas B2B",
        category="sales", agent_roles=["commercial"],
        prompt_template="Create objection handling scripts for: {product}\nTop objections in this market: {objections}\nFor each objection provide: Acknowledge, Reframe, Proof point, Close.\nInclude roleplay scenarios and escalation paths.",
        tags=["sales", "objections"], installs=143,
    ),
    # Operaciones
    MarketplaceSkill(
        name="process_design", title="Process Designer",
        description="Diseña procesos operativos con flujos, responsables y KPIs",
        category="operations", agent_roles=["operations"],
        prompt_template="Design an operational process for: {process_name}\nContext: {context}, Team size: {team_size}\nCreate: Step-by-step workflow, RACI matrix, KPIs, automation opportunities, SLAs.\nIdentify bottlenecks and propose improvements.",
        tags=["process", "efficiency"], installs=134,
    ),
    MarketplaceSkill(
        name="okr_builder", title="OKR Builder",
        description="Construye OKRs trimestrales alineados con la estrategia del negocio",
        category="operations", agent_roles=["operations", "ceo"],
        prompt_template="Build OKRs for: {company} for Q{quarter} {year}\nCompany goals: {goals}\nCreate 3-5 Objectives, each with 3-4 Key Results.\nEnsure: measurable, time-bound, ambitious but achievable.\nInclude tracking cadence and review process.",
        tags=["planning", "goals"], installs=198,
    ),
]


class SkillMarketplace:
    """
    Marketplace de skills instalables.
    Los skills son como plugins: se instalan, se activan y
    los agentes los usan automáticamente en sus ejecuciones.
    """

    def __init__(self):
        try:
            self.db = get_supabase()
        except Exception:
            self.db = None
        self._installed: dict[str, set] = {}  # tenant_id → set de skill names
        self._catalog   = {s.name: s for s in MARKETPLACE_CATALOG}
        # Registrar skills base en el registry
        self._bootstrap_registry()
        logger.info(f"SkillMarketplace ready: {len(self._catalog)} skills in catalog")

    def _bootstrap_registry(self):
        """Registra los skills del catálogo en el SkillRegistry global."""
        for ms in MARKETPLACE_CATALOG:
            skill = Skill(
                name=ms.name, description=ms.description,
                agent_roles=ms.agent_roles, prompt_template=ms.prompt_template,
            )
            skill_registry.register(skill)

    # ── Catálogo ─────────────────────────────────────────────

    def list_catalog(self, category: str = None, agent_role: str = None) -> list[dict]:
        skills = list(self._catalog.values())
        if category:
            skills = [s for s in skills if s.category == category]
        if agent_role:
            skills = [s for s in skills if agent_role in s.agent_roles]
        return [
            {
                "name":             s.name,
                "title":            s.title,
                "description":      s.description,
                "category":         s.category,
                "agent_roles":      s.agent_roles,
                "tags":             s.tags,
                "installs":         s.installs,
                "rating":           s.rating,
                "price":            s.price,
                "is_premium":       s.is_premium,
                "version":          s.version,
                "prompt_template":  s.prompt_template,
            }
            for s in skills
        ]

    def get_skill(self, name: str) -> dict | None:
        s = self._catalog.get(name)
        if not s:
            return None
        return {
            "name": s.name, "title": s.title,
            "description": s.description, "category": s.category,
            "agent_roles": s.agent_roles, "prompt_template": s.prompt_template,
            "tags": s.tags, "installs": s.installs,
            "price": s.price, "is_premium": s.is_premium,
        }

    # ── Instalación ──────────────────────────────────────────

    async def install(self, skill_name: str, tenant_id: str = "default") -> dict:
        if skill_name not in self._catalog:
            return {"success": False, "error": f"Skill '{skill_name}' no encontrado en el catálogo"}

        ms = self._catalog[skill_name]

        if tenant_id not in self._installed:
            self._installed[tenant_id] = set()
        self._installed[tenant_id].add(skill_name)

        # Persistir en DB
        if self.db:
            try:
                self.db.table("installed_skills").upsert({
                    "tenant_id":    tenant_id,
                    "skill_name":   skill_name,
                    "installed_at": datetime.utcnow().isoformat(),
                    "active":       True,
                }).execute()
                # Incrementar contador
                self._catalog[skill_name].installs += 1
            except Exception as e:
                logger.warning(f"install DB error: {e}")

        logger.info(f"Skill installed: {skill_name} → tenant={tenant_id}")
        return {
            "success":     True,
            "skill":       skill_name,
            "title":       ms.title,
            "agents":      ms.agent_roles,
            "message":     f"'{ms.title}' instalado. Los agentes {ms.agent_roles} ya pueden usarlo.",
        }

    async def uninstall(self, skill_name: str, tenant_id: str = "default") -> bool:
        if tenant_id in self._installed:
            self._installed[tenant_id].discard(skill_name)
        if self.db:
            try:
                self.db.table("installed_skills").update({"active": False}).eq("tenant_id", tenant_id).eq("skill_name", skill_name).execute()
            except Exception:
                pass
        return True

    async def get_installed(self, tenant_id: str = "default") -> list[dict]:
        try:
            if self.db:
                r = self.db.table("installed_skills").select("skill_name,installed_at").eq("tenant_id", tenant_id).eq("active", True).execute()
                names = {row["skill_name"] for row in (r.data or [])}
            else:
                names = self._installed.get(tenant_id, set())
        except Exception:
            names = self._installed.get(tenant_id, set())

        return [self.get_skill(n) for n in names if n in self._catalog]

    # ── Ejecución de skill ───────────────────────────────────

    async def execute_skill(self, skill_name: str, params: dict,
                             tenant_id: str = "default") -> dict:
        """
        Ejecuta un skill directamente con los parámetros dados.
        Construye el prompt y lo envía al LLM del agente apropiado.
        """
        ms = self._catalog.get(skill_name)
        if not ms:
            return {"error": f"Skill '{skill_name}' no encontrado"}

        try:
            prompt = ms.prompt_template.format(**params)
        except KeyError as e:
            return {"error": f"Parámetro faltante: {e}", "required_params": list(params.keys())}

        from services.providers.llm_provider import get_llm_provider
        llm = get_llm_provider()

        system_ctx = f"Eres el {ms.agent_roles[0]} agent especializado en {ms.category}. Responde siempre en español con alta calidad."

        try:
            result = await llm.generate(prompt=prompt, system_context=system_ctx)
        except Exception as e:
            return {"error": str(e)}

        return {
            "skill":      skill_name,
            "title":      ms.title,
            "agent_used": ms.agent_roles[0],
            "result":     result,
            "params":     params,
            "executed_at": datetime.utcnow().isoformat(),
        }

    # ── Stats del marketplace ────────────────────────────────

    def get_stats(self) -> dict:
        total      = len(self._catalog)
        by_cat     = {}
        for s in self._catalog.values():
            by_cat[s.category] = by_cat.get(s.category, 0) + 1
        top_skills = sorted(self._catalog.values(), key=lambda s: s.installs, reverse=True)[:5]
        return {
            "total_skills":   total,
            "by_category":    by_cat,
            "free_skills":    sum(1 for s in self._catalog.values() if s.price == 0),
            "premium_skills": sum(1 for s in self._catalog.values() if s.is_premium),
            "top_installs":   [{"name": s.name, "title": s.title, "installs": s.installs} for s in top_skills],
        }


skill_marketplace = SkillMarketplace()
