"""
High-Performance Multi-Tenant Caching Utility
Supports Redis (with fallback to LocMemCache), tenant-scoped keys, and automated invalidation.
"""

import functools
import logging
from typing import Callable, Any, Optional
from django.core.cache import cache

logger = logging.getLogger('core')


def generate_cache_key(prefix: str, tenant_id: Optional[str] = None, *args, **kwargs) -> str:
    """
    Generates a standardized cache key scoped to a specific tenant.
    Format: prefix:tenant_{tenant_id}:{args}:{kwargs}
    """
    tenant_part = f"tenant_{tenant_id}" if tenant_id else "global"
    args_part = "_".join(str(a) for a in args if a is not None) if args else ""
    kwargs_part = "_".join(f"{k}:{v}" for k, v in sorted(kwargs.items()) if v is not None) if kwargs else ""
    raw_key = f"{prefix}:{tenant_part}:{args_part}:{kwargs_part}".strip(":")
    # Replace whitespace and invalid characters in cache keys
    return raw_key.replace(" ", "_").replace("\n", "")


def get_or_set_cached_data(key: str, fetch_fn: Callable[[], Any], timeout: int = 300) -> Any:
    """
    Retrieves data from cache or evaluates fetch_fn and stores it in cache.
    Safely catches cache exceptions to prevent request failures.
    """
    try:
        cached = cache.get(key)
        if cached is not None:
            return cached
    except Exception as e:
        logger.warning(f"Cache get failed for key '{key}': {e}")

    data = fetch_fn()
    try:
        cache.set(key, data, timeout=timeout)
    except Exception as e:
        logger.warning(f"Cache set failed for key '{key}': {e}")
    return data


def invalidate_cache_pattern(pattern: str) -> None:
    """
    Invalidates keys matching a given pattern (if supported by Redis backend),
    or safely falls back to standard key deletion.
    """
    try:
        if hasattr(cache, 'delete_pattern'):
            cache.delete_pattern(pattern)
        else:
            # Fallback for LocMem or basic backends
            cache.delete(pattern)
    except Exception as e:
        logger.warning(f"Cache invalidation failed for pattern '{pattern}': {e}")


def invalidate_tenant_cache(tenant_id: str, prefix: str = "*") -> None:
    """
    Clears all cached items for a specific tenant across all or specific domains.
    """
    if not tenant_id:
        return
    pattern = f"*{prefix}*tenant_{tenant_id}*"
    invalidate_cache_pattern(pattern)


def invalidate_tenant_domain_cache(tenant_id: str, domain: str) -> None:
    """
    Clears cache for a specific tenant within a single domain (e.g. 'students', 'staff', 'academic').
    """
    if not tenant_id:
        return
    pattern = f"*{domain}*tenant_{tenant_id}*"
    invalidate_cache_pattern(pattern)


def cached_for_tenant(prefix: str, ttl: int = 300, tenant_kwarg: str = "institution_id"):
    """
    Decorator to cache function results scoped to tenant.
    Extracts tenant_id from positional args or kwargs matching tenant_kwarg.
    """
    def decorator(func: Callable):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            tenant_id = kwargs.get(tenant_kwarg)
            # If not in kwargs, check first positional arg if named or passed
            if not tenant_id and args:
                # If first arg is a string ID
                if isinstance(args[0], str) and len(args[0]) > 5:
                    tenant_id = args[0]

            cache_key = generate_cache_key(prefix, tenant_id, *args, **kwargs)
            return get_or_set_cached_data(cache_key, lambda: func(*args, **kwargs), timeout=ttl)
        return wrapper
    return decorator
