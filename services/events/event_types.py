# ============================================================
# BusinessAIOS - services/events/event_types.py
# UPGRADED: Delegation, Streaming, WebSocket, RAG events added
# ============================================================

class EventType:

    # ── Task lifecycle ────────────────────────────────────────
    TASK_STARTED        = "task_started"
    TASK_COMPLETED      = "task_completed"
    TASK_FAILED         = "task_failed"
    TASK_QUEUED         = "task_queued"         # FASE 6.3 Task Queue
    TASK_RETRYING       = "task_retrying"

    # ── Collaboration ─────────────────────────────────────────
    COLLABORATION_STARTED   = "collaboration_started"
    COLLABORATION_COMPLETED = "collaboration_completed"
    COLLABORATION_FAILED    = "collaboration_failed"

    # ── Agent ─────────────────────────────────────────────────
    AGENT_STARTED    = "agent_started"
    AGENT_COMPLETED  = "agent_completed"
    AGENT_FAILED     = "agent_failed"

    # ── Delegation (FASE 5.2) ─────────────────────────────────
    DELEGATION_STARTED   = "delegation_started"
    DELEGATION_PLANNED   = "delegation_planned"
    DELEGATION_COMPLETED = "delegation_completed"
    DELEGATION_FAILED    = "delegation_failed"

    # ── Streaming / WebSocket (FASE 6.2) ─────────────────────
    STREAM_CHUNK    = "stream_chunk"        # partial agent output
    STREAM_PROGRESS = "stream_progress"    # % progress update
    WS_CLIENT_CONNECTED    = "ws_client_connected"
    WS_CLIENT_DISCONNECTED = "ws_client_disconnected"

    # ── Knowledge / RAG (FASE 8) ──────────────────────────────
    KNOWLEDGE_SAVED      = "knowledge_saved"
    EMBEDDING_CREATED    = "embedding_created"
    VECTOR_SEARCH_RUN    = "vector_search_run"

    # ── Autonomous Loop (FASE 9) ──────────────────────────────
    LOOP_CYCLE_STARTED   = "loop_cycle_started"
    LOOP_CYCLE_COMPLETED = "loop_cycle_completed"
    LOOP_GOAL_REACHED    = "loop_goal_reached"
    LOOP_GOAL_FAILED     = "loop_goal_failed"

    # ── System ────────────────────────────────────────────────
    SYSTEM_STARTUP  = "system_startup"
    SYSTEM_SHUTDOWN = "system_shutdown"
    HEALTH_CHECK    = "health_check"
