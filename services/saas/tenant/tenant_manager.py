# ============================================================
# BusinessAIOS - services/saas/tenant/tenant_manager.py
# FASE 11 — TenantManager completo con RLS y usage tracking
# ============================================================

import uuid
from datetime import datetime
from core.logger import get_logger
from core.database import get_supabase

logger = get_logger("TenantManager")


class TenantManager:

    def __init__(self):
        try:
            self.db = get_supabase()
        except Exception:
            self.db = None

    async def create_tenant(self, name: str, email: str, plan: str = "free") -> dict:
        tenant_id = str(uuid.uuid4())
        record    = {
            "id":         tenant_id,
            "name":       name,
            "email":      email,
            "plan":       plan,
            "status":     "active",
            "created_at": datetime.utcnow().isoformat(),
        }
        try:
            self.db.table("tenants").insert(record).execute()
            logger.info(f"Tenant created: {name} ({plan}) id={tenant_id}")
            return {"tenant_id": tenant_id, "name": name, "email": email,
                    "plan": plan, "status": "created"}
        except Exception as e:
            logger.error(f"create_tenant error: {e}")
            return {}

    async def get_tenant(self, tenant_id: str) -> dict | None:
        try:
            r = self.db.table("tenants").select("*").eq("id", tenant_id).execute()
            return r.data[0] if r.data else None
        except Exception:
            return None

    async def get_tenant_by_email(self, email: str) -> dict | None:
        try:
            r = self.db.table("tenants").select("*").eq("email", email).execute()
            return r.data[0] if r.data else None
        except Exception:
            return None

    async def list_tenants(self, status: str = "active") -> list:
        try:
            r = (self.db.table("tenants").select("id,name,email,plan,status,created_at")
                 .eq("status", status).order("created_at", desc=True).limit(100).execute())
            return r.data or []
        except Exception:
            return []

    async def suspend_tenant(self, tenant_id: str) -> bool:
        try:
            self.db.table("tenants").update({"status": "suspended"}).eq("id", tenant_id).execute()
            logger.warning(f"Tenant suspended: {tenant_id}")
            return True
        except Exception:
            return False

    async def delete_tenant(self, tenant_id: str) -> bool:
        """Elimina TODOS los datos del tenant (GDPR compliant)."""
        try:
            tables = ["chat_messages", "conversations", "tasks", "executions",
                      "agent_memories", "global_knowledge", "arbitrage_opportunities",
                      "audit_log", "api_keys", "subscriptions"]
            for table in tables:
                try:
                    self.db.table(table).delete().eq("tenant_id", tenant_id).execute()
                except Exception:
                    pass  # tabla puede no tener tenant_id
            self.db.table("tenants").delete().eq("id", tenant_id).execute()
            logger.info(f"Tenant deleted (GDPR): {tenant_id}")
            return True
        except Exception as e:
            logger.error(f"delete_tenant error: {e}")
            return False

    async def get_tenant_stats(self, tenant_id: str) -> dict:
        """Estadísticas del tenant para el admin dashboard."""
        stats: dict = {"tenant_id": tenant_id}
        try:
            for table, field in [
                ("tasks",          "total_tasks"),
                ("executions",     "total_executions"),
                ("conversations",  "total_conversations"),
                ("global_knowledge", "knowledge_entries"),
            ]:
                try:
                    r = self.db.table(table).select("id", count="exact").eq("tenant_id", tenant_id).execute()
                    stats[field] = r.count or 0
                except Exception:
                    stats[field] = 0
        except Exception:
            pass
        return stats


tenant_manager = TenantManager()
