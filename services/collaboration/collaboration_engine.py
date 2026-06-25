# ============================================================
# BusinessAIOS - services/collaboration/collaboration_engine.py
# FASE 6.1 — Event Driven Multi-Agent Collaboration Engine
# Research + Commercial + Content → CEO consolidates
# ============================================================

import asyncio
import time

from services.events.event_bus import event_bus
from services.events.event_types import EventType

from services.providers.llm_provider import get_llm_provider
from services.agents.agent_definitions import (
    AGENT_DEFINITIONS,
    get_agent_definition,
)
from services.knowledge.knowledge_service import KnowledgeService

from core.logger import get_logger

logger = get_logger("CollaborationEngine")
knowledge_svc = KnowledgeService()


class AgentContribution:
    """
    Holds a single agent contribution.
    """

    def __init__(
        self,
        agent_id: str,
        role: str,
        content: str,
        success: bool = True,
    ):
        self.agent_id = agent_id
        self.role = role
        self.content = content
        self.success = success

    def __repr__(self):
        return (
            f"AgentContribution("
            f"agent={self.agent_id}, "
            f"success={self.success}, "
            f"chars={len(self.content)})"
        )


class CollaborationEngine:
    """
    Event Driven Collaboration Engine

    Flow:

    CEO
        ↓
    Research
    Commercial
    Content
        ↓
    CEO Consolidation

    Emits:
        COLLABORATION_STARTED
        AGENT_STARTED
        AGENT_COMPLETED
        AGENT_FAILED
        COLLABORATION_COMPLETED
        COLLABORATION_FAILED
    """

    SPECIALIST_ROLES = [
        "research",
        "commercial",
        "content",
    ]

    def __init__(self, llm_provider=None):

        self.llm = llm_provider or get_llm_provider()

        logger.info(
            "CollaborationEngine initialized"
        )

    async def _run_specialist_agent(
        self,
        role: str,
        task_title: str,
        task_description: str,
        context: str = "",
    ) -> AgentContribution:

        event_bus.publish(
            EventType.AGENT_STARTED,
            {
                "agent_id": role,
                "task_title": task_title,
            },
        )

        agent_def = get_agent_definition(role)

        if not agent_def:

            logger.warning(
                f"Agent definition not found: {role}"
            )

            event_bus.publish(
                EventType.AGENT_FAILED,
                {
                    "agent_id": role,
                    "reason": "definition_not_found",
                },
            )

            return AgentContribution(
                role,
                role,
                "",
                success=False,
            )

        kb_context = (
            knowledge_svc.get_context_for_agent(
                role
            )
        )

        prompt = f"""
Task Title:
{task_title}

Task Description:
{task_description}

{f'Additional Context: {context}' if context else ''}

{kb_context if kb_context else ''}

Analyze this task from your specialized perspective as:

{agent_def.role}

Provide expert analysis and recommendations.
Maximum 400 words.
"""

        try:

            logger.info(
                f"Agent [{role}] starting..."
            )

            result = await self.llm.generate(
                prompt=prompt,
                system_context=agent_def.system_prompt,
            )

            logger.info(
                f"Agent [{role}] completed "
                f"({len(result)} chars)"
            )

            event_bus.publish(
                EventType.AGENT_COMPLETED,
                {
                    "agent_id": role,
                    "content_length": len(result),
                },
            )

            return AgentContribution(
                role,
                agent_def.role,
                result,
                success=True,
            )

        except Exception as e:

            logger.error(
                f"Agent [{role}] failed: {e}"
            )

            event_bus.publish(
                EventType.AGENT_FAILED,
                {
                    "agent_id": role,
                    "error": str(e),
                },
            )

            return AgentContribution(
                role,
                agent_def.role,
                f"[Analysis failed: {e}]",
                success=False,
            )

    async def run_collaboration(
        self,
        task_title: str,
        task_description: str,
        context: str = "",
        specialist_roles: list[str] | None = None,
    ) -> dict:

        roles = (
            specialist_roles
            or self.SPECIALIST_ROLES
        )

        start_time = time.time()

        logger.info(
            f"Collaboration started | "
            f"task='{task_title}'"
        )

        event_bus.publish(
            EventType.COLLABORATION_STARTED,
            {
                "task_title": task_title,
                "agents": roles,
            },
        )

        try:

            tasks = [
                self._run_specialist_agent(
                    role,
                    task_title,
                    task_description,
                    context,
                )
                for role in roles
            ]

            contributions = await asyncio.gather(
                *tasks
            )

            successful = [
                c
                for c in contributions
                if c.success and c.content
            ]

            failed = [
                c
                for c in contributions
                if not c.success
            ]

            if failed:

                logger.warning(
                    f"Failed agents: "
                    f"{[c.agent_id for c in failed]}"
                )

            ceo_def = get_agent_definition(
                "ceo"
            )

            kb_context = (
                knowledge_svc.get_context_for_agent(
                    "ceo"
                )
            )

            contributions_text = ""

            for c in successful:

                contributions_text += (
                    f"\n\n"
                    f"--- {c.role} Analysis ---\n"
                    f"{c.content}"
                )

            consolidation_prompt = f"""
TASK:
{task_title}

DESCRIPTION:
{task_description}

TEAM CONTRIBUTIONS:
{contributions_text}

{f'KNOWLEDGE BASE CONTEXT:\\n{kb_context}' if kb_context else ''}

As CEO:

1. Executive Summary
2. Key Insights
3. Strategic Recommendations
4. Risks
5. Next Steps
"""

            try:

                final_result = (
                    await self.llm.generate(
                        prompt=consolidation_prompt,
                        system_context=(
                            ceo_def.system_prompt
                            if ceo_def
                            else ""
                        ),
                    )
                )

            except Exception as e:

                logger.error(
                    f"CEO consolidation failed: {e}"
                )

                final_result = "\n\n".join(
                    [
                        f"[{c.role}]\n{c.content}"
                        for c in successful
                    ]
                )

            elapsed = round(
                time.time() - start_time,
                2,
            )

            logger.info(
                f"Collaboration completed "
                f"in {elapsed}s"
            )

            event_bus.publish(
                EventType.COLLABORATION_COMPLETED,
                {
                    "task_title": task_title,
                    "execution_time": elapsed,
                    "successful_agents": len(successful),
                    "failed_agents": len(failed),
                },
            )

            return {
                "final_result": final_result,
                "contributions": [
                    {
                        "agent_id": c.agent_id,
                        "role": c.role,
                        "content": c.content,
                        "success": c.success,
                    }
                    for c in contributions
                ],
                "agents_contributed": [
                    c.agent_id
                    for c in successful
                ],
                "agents_failed": [
                    c.agent_id
                    for c in failed
                ],
                "execution_time_seconds": elapsed,
            }

        except Exception as e:

            logger.error(
                f"Collaboration failed: {e}"
            )

            event_bus.publish(
                EventType.COLLABORATION_FAILED,
                {
                    "task_title": task_title,
                    "error": str(e),
                },
            )

            raise