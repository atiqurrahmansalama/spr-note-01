"""
Multi-Channel Notification Dispatcher.
Routes outgoing messages to Telegram, SMS, or Email based on channel type.
"""
from typing import Dict, Any
from .telegram import send_telegram_message
from .sms import send_sms_via_http_gateway


def dispatch_notification(
    channel: str,
    recipient: str,
    message: str,
    config: Dict[str, Any],
) -> Dict[str, Any]:
    ch = (channel or "").upper()
    if ch == "TELEGRAM":
        return send_telegram_message(
            bot_token=config.get("bot_token", ""),
            chat_id=recipient,
            text=message,
        )
    elif ch == "SMS":
        return send_sms_via_http_gateway(
            api_url=config.get("api_url", ""),
            api_key=config.get("api_key", ""),
            sender_id=config.get("sender_id", ""),
            recipient_phone=recipient,
            message_text=message,
            method=config.get("method", "POST"),
        )
    return {"success": False, "error": f"Unsupported notification channel '{channel}'"}
