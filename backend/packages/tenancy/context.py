"""
Thread-local Multi-Tenant Context Resolver.
Rule 11: Multi-Tenant Isolation & Zero Data Leakage.
"""
import threading
from typing import Optional

_thread_local = threading.local()


def set_current_tenant_id(tenant_id: Optional[str]) -> None:
    _thread_local.tenant_id = str(tenant_id) if tenant_id is not None else None


def get_current_tenant_id() -> Optional[str]:
    return getattr(_thread_local, "tenant_id", None)


def clear_current_tenant_id() -> None:
    if hasattr(_thread_local, "tenant_id"):
        del _thread_local.tenant_id
