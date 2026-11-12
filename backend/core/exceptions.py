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

    from django.core.exceptions import ObjectDoesNotExist
    from django.db import IntegrityError, DatabaseError

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
    elif isinstance(exc, (IntegrityError, DatabaseError)):
        logger.error(
            f"Database Constraint/Integrity Error in [{view_name}] [{request_id}]: {exc}",
            exc_info=True
        )
        exc_str = str(exc)
        clean_msg = "Database constraint violation occurred."
        if "violates not-null constraint" in exc_str or "NOT NULL constraint failed" in exc_str:
            if 'column "' in exc_str:
                col = exc_str.split('column "')[-1].split('"')[0]
            elif "NOT NULL constraint failed:" in exc_str:
                col = exc_str.split("NOT NULL constraint failed:")[-1].strip().split(".")[-1]
            else:
                col = "required field"
            clean_msg = f"Missing required database field '{col}'."
        elif "duplicate key value" in exc_str or "UNIQUE constraint failed" in exc_str:
            clean_msg = "A record with this identifier already exists in the database."
        elif "violates foreign key constraint" in exc_str or "FOREIGN KEY constraint failed" in exc_str:
            clean_msg = "Referenced entity does not exist in the database."
        elif is_debug and exc_str:
            clean_msg = f"Database error: {exc_str}"
        elif exc_str:
            clean_msg = f"Database constraint violation: {exc_str}"

        response = Response(
            {
                "success": False,
                "status_code": status.HTTP_400_BAD_REQUEST,
                "error_type": exc.__class__.__name__,
                "request_id": request_id,
                "message": clean_msg,
                "details": {"detail": clean_msg},
            },
            status=status.HTTP_400_BAD_REQUEST,
            headers={"X-Request-ID": request_id}
        )
    elif isinstance(exc, ObjectDoesNotExist) and (
        view_name in ("TokenRefreshView", "TokenVerifyView", "TokenObtainPairView")
        or (request and getattr(request, "path", "").startswith(("/api/token/", "/token/")))
    ):
        logger.warning(
            f"Authentication token user not found in [{view_name}] [{request_id}]: {exc} | Status Code: 401"
        )
        response = Response(
            {
                "success": False,
                "status_code": status.HTTP_401_UNAUTHORIZED,
                "error_type": "InvalidToken",
                "request_id": request_id,
                "detail": "User associated with this authentication session does not exist. Please log in again.",
            },
            status=status.HTTP_401_UNAUTHORIZED,
            headers={"X-Request-ID": request_id}
        )
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
