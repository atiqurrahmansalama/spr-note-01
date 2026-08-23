import functools
import logging
from django.core.cache import cache

logger = logging.getLogger(__name__)


def generate_cache_key(prefix, tenant_id=None, *args, **kwargs):
    """
    Generates a standardized cache key scoped to tenant.
    """
    tenant_part = f"tenant_{tenant_id}" if tenant_id else "global"
    args_part = "_".join(str(a) for a in args) if args else ""
    kwargs_part = "_".join(f"{k}:{v}" for k, v in sorted(kwargs.items())) if kwargs else ""
    return f"{prefix}:{tenant_part}:{args_part}:{kwargs_part}".strip(":")


def get_or_set_cached_data(key, fetch_fn, timeout=300):
    """
    Retrieves data from cache or evaluates fetch_fn and stores it in cache.
    """
    cached = cache.get(key)
    if cached is not None:
        return cached

    data = fetch_fn()
    try:
        cache.set(key, data, timeout=timeout)
    except Exception as e:
        logger.warning(f"Cache set failed for key '{key}': {e}")
    return data


def invalidate_cache_pattern(pattern):
    """
    Invalidates keys matching a given pattern (if supported by backend).
    """
    try:
        if hasattr(cache, 'delete_pattern'):
            cache.delete_pattern(pattern)
        else:
            # Fallback for LocMem or basic backends
            cache.delete(pattern)
    except Exception as e:
        logger.warning(f"Cache invalidation failed for pattern '{pattern}': {e}")


def invalidate_tenant_cache(tenant_id, prefix="*"):
    """
    Convenience method to clear cache for a specific tenant.
    """
    pattern = f"*{prefix}*tenant_{tenant_id}*"
    invalidate_cache_pattern(pattern)
