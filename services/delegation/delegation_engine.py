# ============================================================
# BusinessAIOS - services/delegation/delegation_engine.py
# FASE 5.2 — CEO Auto-Delegation Engine
# CEO breaks objective → delegates sub-tasks → consolidates
# ============================================================

import json
import time
from services.providers.llm_provider import get_llm_provider
from services.agents.agent_definitions import AGENT_DEFINITIONS, get_agent_definition
from services.collaboration.collaboration_engine import CollaborationEngine
from core.logger import get_logger

logger = get_logger("DelegationEngine")


class DelegationEngine:
    """
    FASE 5.2 — Autonomous CEO Delegation System.

    Flow:
        1. User provides high-level objective
        2. CEO analyzes and breaks it into sub-tasks
        3. Each sub-task is assigned to the best-fit specialist agent
        4. Sub-tasks execute (optionally in parallel)
        5. CEO consolidates all results into final deliverable

    Example:
        Objective: "Open a Premium Spa in Cali"
        CEO creates:
          - Research Agent → Market research for spas in Cali
          - Commercial Agent → Revenue model and client acquisition
          - Content Agent → Brand name, tagline, marketing copy
          - Finance Agent → Investment requirements and projections
        CEO → Final business plan
    """

    def __init__(self, llm_provider=None):
        self.llm = llm_provider or get_llm_provider()
        self.collaboration = CollaborationEngine(self.llm)
        logger.info("DelegationEngine initialized")

    async def create_delegation_plan(
        self, objective: str, project_context: str = ""
    ) -> dict:
        """
        CEO creates a structured delegation plan from a business objective.
        Returns a plan with sub-tasks assigned to agents.
        """
        ceo_def = get_agent_definition("ceo")
        available_agents = [k for k in AGENT_DEFINITIONS.keys() if k != "ceo"]

        planning_prompt = f"""
Business Objective: {objective}
{f'Project Context: {project_context}' if project_context else ''}

Available specialist agents: {', '.join(available_agents)}

Break this objective into 3-5 specific sub-tasks. For each sub-task:
- Assign the best specialist agent
- Define a clear, specific task title
- Write a detailed description of what that agent should analyze/produce

Respond ONLY in this exact JSON format:
{{
  "objective_summary": "one sentence summary",
  "sub_tasks": [
    {{
      "agent": "research|commercial|content|finance|operations",
      "title": "specific task title",
      "description": "detailed description of what to produce"
    }}
  ],
  "consolidation_strategy": "brief description of how CEO will consolidate results"
}}
"""
        raw = await self.llm.generate(
            prompt=planning_prompt,
            system_context=ceo_def.system_prompt if ceo_def else "",
        )

        # Parse JSON response
        try:
            clean = raw.strip()
            if clean.startswith("```"):
                clean = clean.split("```")[1]
                if clean.startswith("json"):
                    clean = clean[4:]
            plan = json.loads(clean)
            logger.info(f"Delegation plan created: {len(plan.get('sub_tasks', []))} sub-tasks")
            return plan
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse delegation plan JSON: {e}")
            # Fallback plan
            return {
                "objective_summary": objective[:100],
                "sub_tasks": [
                    {"agent": "research", "title": f"Research: {objective[:50]}", "description": objective},
                    {"agent": "commercial", "title": f"Commercial strategy: {objective[:50]}", "description": objective},
                    {"agent": "content", "title": f"Content strategy: {objective[:50]}", "description": objective},
                ],
                "consolidation_strategy": "CEO consolidates all specialist inputs",
            }

    async def execute_delegation(
        self,
        objective: str,
        project_context: str = "",
    ) -> dict:
        """
        Full delegation execution:
        1. Create plan
        2. Execute each sub-task via collaboration engine
        3. CEO consolidates everything
        """
        start_time = time.time()
        logger.info(f"Delegation started: '{objective[:60]}'")

        # ── Step 1: Planning ──────────────────────────────────────
        plan = await self.create_delegation_plan(objective, project_context)
        sub_tasks = plan.get("sub_tasks", [])

        if not sub_tasks:
            raise ValueError("Delegation plan produced no sub-tasks")

        # ── Step 2: Execute sub-tasks ─────────────────────────────
        sub_results = []
        for st in sub_tasks:
            agent_role = st.get("agent", "research")
            title = st.get("title", "Sub-task")
            description = st.get("description", objective)

            logger.info(f"Executing sub-task [{agent_role}]: {title}")

            result = await self.collaboration.run_collaboration(
                task_title=title,
                task_description=description,
                context=f"Part of larger objective: {objective}",
                specialist_roles=[agent_role],
            )

            sub_results.append({
                "agent": agent_role,
                "title": title,
                "result": result.get("final_result", ""),
                "success": True,
            })

        # ── Step 3: CEO Final Consolidation ───────────────────────
        ceo_def = get_agent_definition("ceo")
        all_results_text = ""
        for sr in sub_results:
            all_results_text += f"\n\n=== {sr['agent'].upper()} AGENT: {sr['title']} ===\n{sr['result']}"

        final_consolidation_prompt = f"""
MAIN OBJECTIVE: {objective}

DELEGATION PLAN SUMMARY: {plan.get('objective_summary', '')}
CONSOLIDATION STRATEGY: {plan.get('consolidation_strategy', '')}

SPECIALIST AGENT RESULTS:
{all_results_text}

As CEO, create the FINAL COMPREHENSIVE BUSINESS PLAN incorporating all specialist inputs.

Structure:
# BUSINESS PLAN: {objective}

## 1. EXECUTIVE SUMMARY

## 2. MARKET ANALYSIS (from Research Agent)

## 3. COMMERCIAL STRATEGY (from Commercial Agent)

## 4. MARKETING & CONTENT (from Content Agent)

## 5. FINANCIAL OVERVIEW (if available)

## 6. OPERATIONAL ROADMAP

## 7. CRITICAL SUCCESS FACTORS & RISKS

## 8. 90-DAY ACTION PLAN
"""
        final_result = await self.llm.generate(
            prompt=final_consolidation_prompt,
            system_context=ceo_def.system_prompt if ceo_def else "",
        )

        elapsed = round(time.time() - start_time, 2)
        logger.info(f"Delegation completed in {elapsed}s")

        return {
            "objective": objective,
            "plan": plan,
            "sub_results": sub_results,
            "final_result": final_result,
            "agents_used": [sr["agent"] for sr in sub_results],
            "execution_time_seconds": elapsed,
        }
