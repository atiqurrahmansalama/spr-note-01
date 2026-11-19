"""
Enterprise Custom Exceptions and DRF Unified Exception Handler.
"""
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger("core")


class DomainException(Exception):
    default_code = "DOMAIN_ERROR"
    status_code = status.HTTP_400_BAD_REQUEST

    def __init__(self, message: str, code: str = None, details=None):
        super().__init__(message)
        self.message = message
        self.code = code or self.default_code
        self.details = details or []


class TenantIsolationException(DomainException):
    default_code = "TENANT_ISOLATION_ERROR"
    status_code = status.HTTP_403_FORBIDDEN


class EntityNotFoundException(DomainException):
    default_code = "ENTITY_NOT_FOUND"
    status_code = status.HTTP_404_NOT_FOUND


def global_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if isinstance(exc, DomainException):
        return Response(
            {
                "success": False,
                "code": exc.code,
                "message": exc.message,
                "errors": exc.details,
            },
            status=exc.status_code,
        )

    if response is not None:
        formatted_errors = response.data
        message = "Validation or client request error."
        if isinstance(response.data, dict) and "detail" in response.data:
            message = str(response.data["detail"])
        elif isinstance(response.data, list) and len(response.data) > 0:
            message = str(response.data[0])

        response.data = {
            "success": False,
            "code": "API_CLIENT_ERROR",
            "message": message,
            "errors": formatted_errors,
        }

    return response
