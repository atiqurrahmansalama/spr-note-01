"""
Enterprise Structured Logging & Request Correlation Module.
Provides JSON formatting, correlation filtering, and context extraction for production observability.
"""

import json
import logging
import threading
import os
from datetime import datetime, timezone

_local_context = threading.local()


def set_request_context(request_id: str, tenant_id: str = None, user_id: str = None, endpoint: str = None, method: str = None, ip_address: str = None):
    """Sets correlation metadata in thread-local storage for log records."""
    _local_context.request_id = request_id
    _local_context.tenant_id = tenant_id or "-"
    _local_context.user_id = user_id or "Anonymous"
    _local_context.endpoint = endpoint or "-"
    _local_context.method = method or "-"
    _local_context.ip_address = ip_address or "-"


def get_request_context() -> dict:
    """Retrieves current thread-local correlation metadata."""
    return {
        "request_id": getattr(_local_context, "request_id", "-"),
        "tenant_id": getattr(_local_context, "tenant_id", "-"),
        "user_id": getattr(_local_context, "user_id", "Anonymous"),
        "endpoint": getattr(_local_context, "endpoint", "-"),
        "method": getattr(_local_context, "method", "-"),
        "ip_address": getattr(_local_context, "ip_address", "-"),
    }


def clear_request_context():
    """Clears thread-local correlation metadata after request lifecycle ends."""
    _local_context.request_id = "-"
    _local_context.tenant_id = "-"
    _local_context.user_id = "Anonymous"
    _local_context.endpoint = "-"
    _local_context.method = "-"
    _local_context.ip_address = "-"


class CorrelationLogFilter(logging.Filter):
    """
    Logging Filter that injects correlation telemetry into every LogRecord instance.
    """
    def filter(self, record):
        ctx = get_request_context()
        record.request_id = getattr(record, 'request_id', None) or ctx['request_id']
        record.tenant_id = getattr(record, 'tenant_id', None) or ctx['tenant_id']
        record.user_id = getattr(record, 'user_id', None) or ctx['user_id']
        record.endpoint = getattr(record, 'endpoint', None) or ctx['endpoint']
        record.method = getattr(record, 'method', None) or ctx['method']
        record.ip_address = getattr(record, 'ip_address', None) or ctx['ip_address']
        record.environment = os.getenv("DJANGO_ENV", "production" if not os.getenv("DEBUG", "False").lower() in ("true", "1") else "development")
        return True


class StructuredJsonLogFormatter(logging.Formatter):
    """
    High-performance JSON log formatter for structured production log ingestion (Datadog, CloudWatch, Loki, ELK).
    """
    def format(self, record):
        ctx = get_request_context()
        
        log_payload = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname.lower(),
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": getattr(record, 'request_id', None) or ctx['request_id'],
            "tenant_id": getattr(record, 'tenant_id', None) or ctx['tenant_id'],
            "user_id": getattr(record, 'user_id', None) or ctx['user_id'],
            "endpoint": getattr(record, 'endpoint', None) or ctx['endpoint'],
            "method": getattr(record, 'method', None) or ctx['method'],
            "ip_address": getattr(record, 'ip_address', None) or ctx['ip_address'],
            "environment": getattr(record, 'environment', "development"),
            "module": record.module,
            "line": record.lineno,
        }

        # Attach exception traceback if present
        if record.exc_info:
            log_payload["error"] = str(record.exc_info[1])
            log_payload["stack_trace"] = self.formatException(record.exc_info)

        return json.dumps(log_payload, ensure_ascii=False)
