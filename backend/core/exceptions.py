import logging
import os
import uuid
from typing import Any, Dict
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from core.logging_formatters import get_request_context

logger = logging.getLogger("django.request")


def custom_exception_handler(exc: Exception, context: Dict[str, Any]) -> Response | None:
    """
    Global exception handler for DRF API responses, structured error logging,
    and correlation request ID tracking.
    """
    response = exception_handler(exc, context)
    request = context.get("request")
    view_name = context.get("view").__class__.__name__ if context.get("view") else "UnknownView"

    # Extract correlation Request ID
    req_ctx = get_request_context()
    request_id = getattr(request, "id", None) or req_ctx.get("request_id") or str(uuid.uuid4())

    is_debug = os.getenv("DEBUG", "False").lower() in ("true", "1")

    if response is not None:
        logger.warning(
            f"API Exception in [{view_name}] [{request_id}]: {exc} | Status Code: {response.status_code}"
        )
        response.data = {
            "success": False,
            "status_code": response.status_code,
            "error_type": exc.__class__.__name__,
            "request_id": request_id,
            "details": response.data,
        }
        response["X-Request-ID"] = request_id
    else:
        logger.error(
            f"Unhandled Critical Exception in [{view_name}] [{request_id}]: {exc}",
            exc_info=True
        )
        safe_message = (
            f"Server Error: {str(exc)}"
            if (is_debug and str(exc))
            else "An unexpected internal server error occurred. Please reference the request ID for assistance."
        )
        response = Response(
            {
                "success": False,
                "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
                "error_type": exc.__class__.__name__,
                "request_id": request_id,
                "message": safe_message,
                "details": {"detail": safe_message},
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
        response["X-Request-ID"] = request_id

    return response