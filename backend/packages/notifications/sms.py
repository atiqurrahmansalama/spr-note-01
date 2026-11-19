"""
Reusable Multi-Provider SMS Gateway.
Supports HTTP GET/POST API endpoints for local and international SMS providers.
"""
import logging
import requests
from typing import Dict, Any

logger = logging.getLogger("core")


def send_sms_via_http_gateway(
    api_url: str,
    api_key: str,
    sender_id: str,
    recipient_phone: str,
    message_text: str,
    method: str = "POST",
    timeout: int = 10,
) -> Dict[str, Any]:
    if not api_url or not recipient_phone or not message_text:
        return {"success": False, "error": "api_url, recipient_phone, and message_text are required."}

    payload = {
        "api_key": api_key,
        "sender_id": sender_id,
        "recipient": recipient_phone,
        "message": message_text,
    }

    try:
        if method.upper() == "GET":
            resp = requests.get(api_url, params=payload, timeout=timeout)
        else:
            resp = requests.post(api_url, json=payload, timeout=timeout)

        return {
            "success": resp.status_code in (200, 201),
            "status_code": resp.status_code,
            "response": resp.text[:200],
        }
    except Exception as e:
        logger.error(f"[SMSGateway] Failed to dispatch SMS to {recipient_phone}: {e}")
        return {"success": False, "error": str(e)}
