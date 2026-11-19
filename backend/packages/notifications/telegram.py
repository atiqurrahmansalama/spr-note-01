"""
Reusable Telegram Bot API Notification Gateway.
"""
import logging
import requests
from typing import Dict, Any, Optional

logger = logging.getLogger("core")


def send_telegram_message(
    bot_token: str,
    chat_id: str,
    text: str,
    parse_mode: str = "HTML",
    timeout: int = 8,
) -> Dict[str, Any]:
    if not bot_token or not chat_id:
        return {"success": False, "error": "bot_token and chat_id are required."}

    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": parse_mode,
        "disable_web_page_preview": True,
    }

    try:
        resp = requests.post(url, json=payload, timeout=timeout)
        data = resp.json() if resp.content else {}
        if resp.status_code == 200 and data.get("ok"):
            return {"success": True, "data": data}
        return {
            "success": False,
            "error": data.get("description", f"HTTP {resp.status_code}"),
            "response": data,
        }
    except Exception as e:
        logger.error(f"[TelegramGateway] Failed to dispatch: {e}")
        return {"success": False, "error": str(e)}
