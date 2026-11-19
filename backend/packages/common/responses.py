"""
Standardized JSON Response Envelopes for REST APIs.
Rule 10 & 13: Single Source of Truth for API Output Consistency.
"""
from typing import Any, Optional, Dict
from rest_framework.response import Response
from rest_framework import status


def success_response(
    data: Any = None,
    message: str = "Operation completed successfully.",
    meta: Optional[Dict[str, Any]] = None,
    status_code: int = status.HTTP_200_OK,
) -> Response:
    payload = {
        "success": True,
        "message": message,
        "data": data,
    }
    if meta is not None:
        payload["meta"] = meta
    return Response(payload, status=status_code)


def error_response(
    message: str = "An unexpected error occurred.",
    code: str = "GENERIC_ERROR",
    errors: Any = None,
    status_code: int = status.HTTP_400_BAD_REQUEST,
) -> Response:
    payload = {
        "success": False,
        "code": code,
        "message": message,
        "errors": errors or [],
    }
    return Response(payload, status=status_code)
