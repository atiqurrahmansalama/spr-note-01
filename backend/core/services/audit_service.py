"""
Enterprise Audit Logging Service.
Provides centralized, immutable audit logging with diff computation and request telemetry extraction.
"""

import logging
from typing import Any, Dict, Optional, Tuple
from django.utils import timezone
from core.models import AuditLog, AcademicInstitution, User
from core.middleware import get_client_ip, detect_device_type, detect_device_info
from core.logging_formatters import get_request_context

logger = logging.getLogger("core")


def compute_state_diff(before: Optional[Dict[str, Any]], after: Optional[Dict[str, Any]]) -> Tuple[Dict[str, Any], str]:
    """
    Computes differences between before and after dictionary states,
    returning a structured diff dict and human-readable summary text.
    """
    if not before and not after:
        return {}, ""
    if not before:
        return {"created": after}, "Created new record."
    if not after:
        return {"deleted": before}, "Deleted record."

    diff: Dict[str, Any] = {}
    summary_parts = []

    all_keys = set(before.keys()).union(set(after.keys()))
    for key in sorted(all_keys):
        b_val = before.get(key)
        a_val = after.get(key)

        # Skip unchanged or noisy internal fields
        if b_val == a_val or key in ['updated_at', 'created_at', 'last_activity', 'password']:
            continue

        diff[key] = {"before": b_val, "after": a_val}
        summary_parts.append(f"{key}: '{b_val}' -> '{a_val}'")

    summary = ", ".join(summary_parts) if summary_parts else "No critical attribute changes."
    return diff, summary


def record_audit_log(
    action: str,
    resource_type: str,
    resource_id: Any,
    resource_name: str = "",
    before_state: Optional[Dict[str, Any]] = None,
    after_state: Optional[Dict[str, Any]] = None,
    changes_summary: str = "",
    reason: str = "",
    request: Any = None,
    actor: Optional[User] = None,
    institution: Optional[AcademicInstitution] = None,
) -> Optional[AuditLog]:
    """
    Centralized service function to persist an immutable AuditLog record.
    Extracts telemetry and context automatically when request object is passed.
    """
    try:
        req_ctx = get_request_context()
        request_id = getattr(request, "id", None) or req_ctx.get("request_id") or ""

        # Extract Actor telemetry
        if not actor and request and getattr(request, "user", None) and request.user.is_authenticated:
            actor = request.user

        actor_name = ""
        actor_phone = ""
        actor_role = ""
        if actor:
            actor_name = (
                getattr(actor, "full_name", None)
                or getattr(actor, "name_en", None)
                or getattr(actor, "first_name", None)
                or str(actor)
            )
            actor_phone = getattr(actor, "phone_number", "") or ""
            actor_role = str(getattr(actor, "user_type", "") or getattr(actor, "role", "") or "STAFF")

        # Extract Institution / Tenant
        if not institution and request:
            inst_id = getattr(request.user, "institution_id", None) if getattr(request, "user", None) else None
            if inst_id:
                institution = AcademicInstitution.objects.filter(id=inst_id).first()
            elif hasattr(request, "headers") and request.headers.get("X-Tenant-ID"):
                institution = AcademicInstitution.objects.filter(id=request.headers.get("X-Tenant-ID")).first()

        # Extract Network & Device Metadata
        ip_address = get_client_ip(request) if request else None
        user_agent = request.META.get("HTTP_USER_AGENT", "") if request else ""
        device_meta = None
        if request:
            device_meta = {
                "device_type": detect_device_type(request),
                "device_info": detect_device_info(request),
            }

        # Auto-compute summary if not provided
        if not changes_summary and (before_state or after_state):
            _, computed_summary = compute_state_diff(before_state, after_state)
            changes_summary = computed_summary

        audit_entry = AuditLog.objects.create(
            institution=institution,
            actor=actor,
            actor_name=actor_name[:150],
            actor_phone=actor_phone[:32],
            actor_role=actor_role[:64],
            action=action[:50].upper(),
            resource_type=resource_type[:100],
            resource_id=str(resource_id)[:100],
            resource_name=str(resource_name)[:255],
            before_state=before_state,
            after_state=after_state,
            changes_summary=changes_summary,
            reason=reason,
            ip_address=ip_address,
            user_agent=user_agent,
            device_metadata=device_meta,
            request_id=request_id[:64],
        )

        logger.info(
            f"AUDIT LOG [{audit_entry.action}] {resource_type}#{resource_id} by {actor_name or 'System'} | Req: {request_id}"
        )
        return audit_entry

    except Exception as e:
        logger.error(f"Failed to record audit log for {resource_type}#{resource_id}: {e}", exc_info=True)
        return None
