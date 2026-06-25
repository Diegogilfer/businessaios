from fastapi import Request, HTTPException
from services.saas.api_keys.api_key_manager import api_key_manager

async def get_tenant_from_request(request: Request) -> str:
    """Extract tenant_id from API key in headers."""
    api_key = request.headers.get("X-API-Key")
    if not api_key:
        raise HTTPException(401, "X-API-Key header required")
    
    tenant_info = await api_key_manager.validate_key(api_key)
    if not tenant_info:
        raise HTTPException(401, "Invalid API key")
    
    return tenant_info["tenant_id"]
