# ============================================================
# BusinessAIOS - models/schemas.py
# All Pydantic request/response schemas
# ============================================================

from pydantic import BaseModel, Field
from typing import Optional, Any, List
from datetime import datetime
from enum import Enum


# ── Enums ────────────────────────────────────────────────────

class TaskStatus(str, Enum):
    PENDING   = "pending"
    RUNNING   = "running"
    COMPLETED = "completed"
    FAILED    = "failed"

class AgentRole(str, Enum):
    CEO        = "ceo"
    RESEARCH   = "research"
    COMMERCIAL = "commercial"
    CONTENT    = "content"
    FINANCE    = "finance"
    OPERATIONS = "operations"
    HR         = "hr"

class KnowledgeCategory(str, Enum):
    MARKET_RESEARCH = "market_research"
    SALES           = "sales"
    CONTENT         = "content"
    STRATEGY        = "strategy"
    FINANCE         = "finance"
    OPERATIONS      = "operations"
    GENERAL         = "general"


# ── Task Schemas ─────────────────────────────────────────────

class TaskCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: str = Field(..., min_length=10)
    project_id: Optional[str] = None
    agent_id: Optional[str] = None
    priority: int = Field(default=1, ge=1, le=5)
    category: Optional[KnowledgeCategory] = KnowledgeCategory.GENERAL

class TaskUpdate(BaseModel):
    status: Optional[TaskStatus] = None
    result: Optional[str] = None

class TaskResponse(BaseModel):
    id: str
    title: str
    description: str
    status: TaskStatus
    result: Optional[str] = None
    project_id: Optional[str] = None
    agent_id: Optional[str] = None
    priority: int
    category: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ── Execution Schemas ─────────────────────────────────────────

class ExecuteTaskRequest(BaseModel):
    task_id: str
    use_collaboration: bool = Field(
        default=True,
        description="If true, specialized agents collaborate before CEO consolidates"
    )
    use_delegation: bool = Field(
        default=False,
        description="If true, CEO auto-delegates sub-tasks (FASE 5.2)"
    )

class ExecutionResult(BaseModel):
    task_id: str
    status: TaskStatus
    result: str
    agent_used: str
    collaboration_used: bool
    agents_contributed: List[str] = []
    quality_score: float = 0.0
    execution_time_seconds: float = 0.0
    memory_saved: bool = False
    knowledge_saved: bool = False
    error: Optional[str] = None


# ── Agent Schemas ─────────────────────────────────────────────

class AgentCreate(BaseModel):
    name: str
    role: AgentRole
    goal: str
    project_id: Optional[str] = None
    personality: Optional[str] = None

class AgentResponse(BaseModel):
    id: str
    name: str
    role: str
    goal: str
    project_id: Optional[str] = None
    personality: Optional[str] = None
    created_at: Optional[datetime] = None


# ── Project Schemas ───────────────────────────────────────────

class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=3)
    description: Optional[str] = None
    industry: Optional[str] = None
    target_market: Optional[str] = None

class ProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    industry: Optional[str] = None
    target_market: Optional[str] = None
    created_at: Optional[datetime] = None


# ── Memory Schemas ────────────────────────────────────────────

class MemoryResponse(BaseModel):
    id: str
    task_id: Optional[str] = None
    agent_id: Optional[str] = None
    result: str
    objective: Optional[str] = None
    category: Optional[str] = None
    quality_score: float = 0.0
    success: bool = True
    created_at: Optional[datetime] = None


# ── Knowledge Schemas ─────────────────────────────────────────

class KnowledgeCreate(BaseModel):
    title: str
    content: str
    category: KnowledgeCategory
    source_agent: Optional[str] = None
    tags: Optional[List[str]] = []

class KnowledgeResponse(BaseModel):
    id: str
    title: str
    content: str
    category: str
    source_agent: Optional[str] = None
    tags: Optional[List[str]] = []
    created_at: Optional[datetime] = None


# ── Delegation Schemas (FASE 5.2) ─────────────────────────────

class DelegationPlan(BaseModel):
    main_objective: str
    sub_tasks: List[dict]
    estimated_agents: List[str]
    consolidation_strategy: str

class DelegateRequest(BaseModel):
    objective: str = Field(..., min_length=10, description="High-level business objective")
    project_id: Optional[str] = None
    auto_execute: bool = Field(
        default=False,
        description="If true, executes all delegated tasks immediately"
    )


# ── Health / Status ───────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    version: str
    environment: str
    services: dict
    timestamp: datetime
