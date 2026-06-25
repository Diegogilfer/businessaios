# ============================================================
# BusinessAIOS - services/saas/api_keys/api_key_manager.py
# FASE 11 — API Key management con HASH + cache
# Las claves se guardan SOLO como SHA-256. La clave en claro se
# muestra una única vez al crearla y nunca se persiste.
# ============================================================

import secrets
import hashlib
from datetime import datetime
from core.logger import get_logger

logger = get_logger("APIKeyManager")

# Cache en memoria indexado por HASH (no por clave en claro)
_key_cache: dict[str, dict] = {}
_CACHE_TTL = 300  # 5 minutos


class APIKeyManager:

    def __init__(self):
        self._db = None

    @property
    def db(self):
        if self._db is None:
            try:
                from core.database import get_supabase
                self._db = get_supabase()
            except Exception:
                pass
        return self._db

    # ── Generación / hashing ─────────────────────────────────

    def generate_key(self) -> str:
        """Formato: bios_live_<43 chars> — distinguible de claves de test."""
        return f"bios_live_{secrets.token_urlsafe(32)}"

    def _hash_key(self, key: str) -> str:
        """SHA-256 hex — determinístico para poder buscar por hash."""
        return hashlib.sha256(key.encode()).hexdigest()

    @staticmethod
    def _prefix(key: str) -> str:
        """Prefijo no secreto para identificar la clave en listados."""
        return key[:16]

    # ── CRUD ─────────────────────────────────────────────────

    async def create_key(self, tenant_id: str, name: str) -> dict:
        key    = self.generate_key()
        record = {
            "key_hash":   self._hash_key(key),
            "key_prefix": self._prefix(key),
            "tenant_id":  tenant_id,
            "name":       name,
            "status":     "active",
            "created_at": datetime.utcnow().isoformat(),
        }
        try:
            self.db.table("api_keys").insert(record).execute()
            logger.info(f"API key created: tenant={tenant_id} name={name} prefix={record['key_prefix']}")
            return {
                "key":    key,   # ← única vez que se ve la clave en claro
                "name":   name,
                "status": "active",
                "note":   "Guarda esta clave AHORA — no se puede recuperar después (solo guardamos su hash).",
            }
        except Exception as e:
            logger.error(f"create_key error: {e}")
            return {}

    async def validate_key(self, api_key: str) -> dict | None:
        """
        Valida una API key buscando por su hash. Usa cache por hash
        para no golpear la DB en cada request.
        """
        if not api_key:
            return None

        key_hash = self._hash_key(api_key)

        # Cache por hash
        cached = _key_cache.get(key_hash)
        if cached:
            age = (datetime.utcnow() - datetime.fromisoformat(cached["_cached_at"])).seconds
            if age < _CACHE_TTL:
                return cached

        try:
            r = (self.db.table("api_keys").select("tenant_id,name,status")
                 .eq("key_hash", key_hash).eq("status", "active").execute())
            if not r.data:
                return None
            result = {**r.data[0], "_cached_at": datetime.utcnow().isoformat()}
            _key_cache[key_hash] = result
            return result
        except Exception as e:
            logger.error(f"validate_key error: {e}")
            return None

    async def list_keys(self, tenant_id: str) -> list:
        try:
            r = (self.db.table("api_keys")
                 .select("id,name,status,created_at,key_prefix")
                 .eq("tenant_id", tenant_id)
                 .order("created_at", desc=True).execute())
            return [{
                "id":         k["id"],
                "name":       k["name"],
                "status":     k["status"],
                "created_at": k["created_at"],
                "key_hint":   f"{k.get('key_prefix') or 'bios_live_'}…",
            } for k in (r.data or [])]
        except Exception:
            return []

    async def revoke_key(self, key_id: str, tenant_id: str) -> bool:
        try:
            self.db.table("api_keys").update({"status": "revoked"}).eq("id", key_id).eq("tenant_id", tenant_id).execute()
            _key_cache.clear()   # invalidar cache
            logger.info(f"API key revoked: {key_id}")
            return True
        except Exception:
            return False

    async def rotate_key(self, key_id: str, tenant_id: str) -> dict:
        """Revoca la clave anterior y crea una nueva."""
        old = await self.revoke_key(key_id, tenant_id)
        if not old:
            return {"error": "Clave no encontrada o no autorizado"}
        r = (self.db.table("api_keys").select("name").eq("id", key_id).execute())
        name = r.data[0]["name"] if r.data else "rotated"
        return await self.create_key(tenant_id, f"{name} (rotated)")


api_key_manager = APIKeyManager()
