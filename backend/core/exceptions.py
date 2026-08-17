import logging
from typing import Any, Dict
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger("django.request")

def custom_exception_handler(exc: Exception, context: Dict[str, Any]) -> Response | None:
    """
    Global exception handler for DRF API responses and structured logging.
    """
    response = exception_handler(exc, context)

    view_name = context.get("view").__class__.__name__ if context.get("view") else "UnknownView"

    if response is not None:
        logger.warning(f"API Exception in [{view_name}]: {exc} | Status Code: {response.status_code}")
        response.data = {
            "success": False,
            "status_code": response.status_code,
            "error_type": exc.__class__.__name__,
            "details": response.data
        }
    else:
        logger.error(f"Unhandled Critical Exception in [{view_name}]: {exc}", exc_info=True)
        response = Response(
            {
                "success": False,
                "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
                "error_type": exc.__class__.__name__,
                "message": f"Server Error: {str(exc)}" if str(exc) else "An unexpected server error occurred. Please try again later.",
                "details": {"detail": str(exc) if str(exc) else "An unexpected server error occurred."}
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    return response