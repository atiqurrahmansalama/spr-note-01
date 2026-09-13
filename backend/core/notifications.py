import logging
import json
import re
from decimal import Decimal
from django.conf import settings
from django.utils import timezone
from django.core.mail import send_mail, get_connection
from django.core.mail.backends.smtp import EmailBackend

logger = logging.getLogger('core')


# ==============================================================================
# DEFAULT SYSTEM TEMPLATES SPECIFICATION
# ==============================================================================

DEFAULT_SYSTEM_TEMPLATES = [
    {
        "event_type": "STUDENT_ABSENT",
        "name": "Student Absence Notice to Guardian",
        "subject": "Absence Alert: {student_name} - {institution_name}",
        "body": "Dear Guardian, your ward {student_name} (Roll: {roll_number}, Class: {class_name}) was recorded ABSENT on {date} at {institution_name}. Please contact the administration if unexcused.",
        "available_tags": ["student_name", "roll_number", "class_name", "institution_name", "date", "guardian_name", "action_url"],
    },
    {
        "event_type": "STUDENT_LATE",
        "name": "Student Late Arrival Notice",
        "subject": "Late Arrival: {student_name} - {institution_name}",
        "body": "Dear Guardian, {student_name} arrived LATE at {institution_name} at {time} on {date}.",
        "available_tags": ["student_name", "roll_number", "class_name", "institution_name", "date", "time", "guardian_name"],
    },
    {
        "event_type": "GATE_BUNK_ALERT",
        "name": "Gate Entry/Exit Discrepancy & Bunk Alert",
        "subject": "Gate Discrepancy Alert: {student_name}",
        "body": "Urgent: {student_name} (Class: {class_name}) was scanned at {device_name} ({direction}) at {time} with no authorized gate pass.",
        "available_tags": ["student_name", "class_name", "institution_name", "time", "date", "direction", "device_name"],
    },
    {
        "event_type": "NEW_ADMISSION",
        "name": "Student Admission Confirmation Voucher",
        "subject": "Welcome to {institution_name}! Admission Confirmed",
        "body": "Assalamu Alaikum! Admission for {student_name} to class {class_name} has been successfully completed at {institution_name}. Student ID: {student_id}.",
        "available_tags": ["student_name", "class_name", "institution_name", "student_id", "date", "guardian_name"],
    },
    {
        "event_type": "DAILY_REPORT_SAVED",
        "name": "Daily Recitation Progress Report",
        "subject": "Hifz Daily Report: {student_name} ({date})",
        "body": "SPR Note: Daily recitation for {student_name} on {date} status: {status}. Sabaq Score: {score}. View report: {action_url}",
        "available_tags": ["student_name", "date", "status", "score", "institution_name", "action_url"],
    },
    {
        "event_type": "STAFF_LEAVE_ACTION",
        "name": "Staff Leave Desk Notice",
        "subject": "Staff Leave Update: {staff_name}",
        "body": "Leave application for {staff_name} ({leave_type}) from {start_date} to {end_date} has been {leave_status}.",
        "available_tags": ["staff_name", "leave_type", "start_date", "end_date", "leave_status", "institution_name"],
    },
    {
        "event_type": "GENERAL_BROADCAST",
        "name": "General Institutional Announcement",
        "subject": "Announcement from {institution_name}",
        "body": "{message}",
        "available_tags": ["institution_name", "date", "message", "sender_name"],
    },
]


def seed_default_templates(institution):
    """
    Seeds default system templates for an institution if not already present.
    """
    from core.models import NotificationTemplate
    created_count = 0
    for tpl_data in DEFAULT_SYSTEM_TEMPLATES:
        obj, created = NotificationTemplate.objects.get_or_create(
            institution=institution,
            event_type=tpl_data["event_type"],
            defaults={
                "name": tpl_data["name"],
                "subject": tpl_data["subject"],
                "body": tpl_data["body"],
                "available_tags": tpl_data["available_tags"],
                "is_system_default": True,
            }
        )
        if created:
            created_count += 1
    return created_count


# ==============================================================================
# DYNAMIC VARIABLE REPLACEMENT ENGINE
# ==============================================================================

def interpolate_template_variables(text, context):
    """
    Replaces {variable_name} placeholder tags with corresponding context values.
    Leaves unrecognized tags intact or empty string.
    """
    if not text:
        return ""
    
    def replacer(match):
        key = match.group(1).strip()
        val = context.get(key)
        if val is not None:
            return str(val)
        return match.group(0)

    return re.sub(r'\{([a-zA-Z0-9_]+)\}', replacer, text)


# ==============================================================================
# GATEWAY PROVIDER DISPATCH HANDLERS
# ==============================================================================

def send_sms_via_provider(gateway_config, phone_number, message_text):
    """
    Dispatches SMS through configured SMS provider (SSL Wireless, Greenweb, Twilio, BulkSMS BD).
    Falls back gracefully to SIMULATED mode if credentials are empty or network fails.
    """
    if not phone_number:
        return {"status": "FAILED", "error": "No recipient phone number provided", "response": {}}

    # Normalize BD phone number format
    cleaned_phone = re.sub(r'[^\d+]', '', phone_number)
    if cleaned_phone.startswith('01') and len(cleaned_phone) == 11:
        cleaned_phone = '+88' + cleaned_phone
    elif cleaned_phone.startswith('8801') and len(cleaned_phone) == 13:
        cleaned_phone = '+' + cleaned_phone

    if not gateway_config or not gateway_config.is_active or not gateway_config.api_key:
        logger.info(f"[SMS SIMULATED] Provider: {gateway_config.provider_name if gateway_config else 'None'} | To: {cleaned_phone} | Msg: {message_text[:80]}")
        return {
            "status": "SIMULATED",
            "provider": gateway_config.provider_name if gateway_config else "SIMULATOR",
            "response": {"note": "Simulated in development / inactive credentials", "phone": cleaned_phone, "length": len(message_text)},
        }

    provider = gateway_config.provider_name
    api_key = gateway_config.api_key
    sender_id = gateway_config.sender_id_or_phone or ""

    try:
        import requests

        if provider == 'SSL_WIRELESS':
            # SSL Wireless Bangladesh API
            url = gateway_config.api_url or "https://smsplus.sslwireless.com/api/v3/send-sms"
            payload = {
                "api_token": api_key,
                "sid": sender_id,
                "msisdn": cleaned_phone.replace('+', ''),
                "sms": message_text,
                "csms_id": str(timezone.now().timestamp()).replace('.', '')[:15],
            }
            resp = requests.post(url, json=payload, timeout=8)
            resp_data = resp.json() if resp.headers.get('content-type', '').startswith('application/json') else {"text": resp.text}
            is_ok = resp.status_code in [200, 201] and resp_data.get('status') in ['SUCCESS', 'Success', 200, '200']
            return {
                "status": "DELIVERED" if is_ok else "FAILED",
                "response": resp_data,
                "error": "" if is_ok else str(resp_data),
            }

        elif provider == 'GREENWEB':
            # Greenweb Bangladesh SMS Gateway
            url = gateway_config.api_url or "https://api.greenweb.com.bd/api.php"
            params = {
                "token": api_key,
                "to": cleaned_phone.replace('+', ''),
                "message": message_text,
            }
            resp = requests.get(url, params=params, timeout=8)
            is_ok = resp.status_code == 200 and "Ok" in resp.text
            return {
                "status": "DELIVERED" if is_ok else "FAILED",
                "response": {"raw_response": resp.text},
                "error": "" if is_ok else resp.text,
            }

        elif provider == 'BULK_SMS_BD':
            # BulkSMS BD Gateway
            url = gateway_config.api_url or "http://bulksmsbd.net/api/smsapi"
            params = {
                "api_key": api_key,
                "senderid": sender_id,
                "number": cleaned_phone.replace('+', ''),
                "message": message_text,
            }
            resp = requests.get(url, params=params, timeout=8)
            return {
                "status": "DELIVERED" if resp.status_code == 200 else "FAILED",
                "response": {"raw": resp.text},
                "error": "" if resp.status_code == 200 else f"HTTP {resp.status_code}: {resp.text}",
            }

        elif provider == 'TWILIO':
            # Twilio Global SMS
            account_sid = api_key
            auth_token = gateway_config.api_secret_or_token
            url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
            data = {
                "From": sender_id,
                "To": cleaned_phone,
                "Body": message_text,
            }
            resp = requests.post(url, data=data, auth=(account_sid, auth_token), timeout=8)
            resp_data = resp.json() if resp.status_code in [200, 201] else {"error": resp.text}
            is_ok = resp.status_code in [200, 201]
            return {
                "status": "DELIVERED" if is_ok else "FAILED",
                "response": resp_data,
                "error": "" if is_ok else resp.text,
            }

        else:
            # Custom Generic REST Webhook
            url = gateway_config.api_url
            if not url:
                return {"status": "SIMULATED", "response": {"note": "No API URL specified"}}
            payload = {
                "api_key": api_key,
                "sender": sender_id,
                "recipient": cleaned_phone,
                "message": message_text,
            }
            resp = requests.post(url, json=payload, timeout=8)
            return {
                "status": "DELIVERED" if resp.status_code in [200, 201] else "FAILED",
                "response": {"status_code": resp.status_code, "text": resp.text[:200]},
                "error": "" if resp.status_code in [200, 201] else f"HTTP {resp.status_code}",
            }

    except Exception as e:
        logger.error(f"[SMS Error] {str(e)}")
        return {"status": "FAILED", "error": str(e), "response": {}}


def send_whatsapp_via_provider(gateway_config, phone_number, message_text, template_name=None, template_lang="en_US", template_params=None):
    """
    Dispatches WhatsApp message through Meta WhatsApp Business Cloud API.
    Supports both template messages (required outside 24h session window) and freeform text messages.
    """
    if not phone_number:
        return {"status": "FAILED", "error": "No recipient phone number provided", "response": {}}

    cleaned_phone = re.sub(r'[^\d]', '', str(phone_number))
    if cleaned_phone.startswith('01') and len(cleaned_phone) == 11:
        cleaned_phone = '88' + cleaned_phone
    elif cleaned_phone.startswith('8801') and len(cleaned_phone) == 13:
        cleaned_phone = cleaned_phone

    if len(cleaned_phone) < 10:
        return {"status": "FAILED", "error": f"Invalid recipient phone number: '{phone_number}'", "response": {}}

    if not gateway_config or not gateway_config.is_active or not gateway_config.api_secret_or_token:
        logger.info(f"[WHATSAPP SIMULATED] To: {cleaned_phone} | Msg: {message_text[:80]}")
        return {
            "status": "SIMULATED",
            "provider": "WHATSAPP_META",
            "response": {"note": "Simulated WhatsApp dispatch in development", "phone": cleaned_phone},
        }

    phone_number_id = (gateway_config.api_key or gateway_config.sender_id_or_phone or "").strip()
    access_token = (gateway_config.api_secret_or_token or "").strip()
    if access_token.startswith("Bearer "):
        access_token = access_token.replace("Bearer ", "", 1).strip()

    # Meta Phone Number ID validation check
    if phone_number_id.startswith('01') or (len(phone_number_id) <= 11 and not phone_number_id.startswith('10')):
        logger.warning(f"[WhatsApp Notice] phone_number_id '{phone_number_id}' looks like a phone number rather than a Meta Phone Number ID.")

    url = f"https://graph.facebook.com/v18.0/{phone_number_id}/messages"

    try:
        import requests
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

        # If template_name is specified, use Meta Template schema
        if template_name:
            template_obj = {
                "name": template_name,
                "language": {"code": template_lang or "en_US"}
            }
            if template_params and isinstance(template_params, (list, tuple)):
                template_obj["components"] = [
                    {
                        "type": "body",
                        "parameters": [
                            {"type": "text", "text": str(p)} for p in template_params
                        ]
                    }
                ]
            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": cleaned_phone,
                "type": "template",
                "template": template_obj
            }
        else:
            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": cleaned_phone,
                "type": "text",
                "text": {"preview_url": True, "body": message_text},
            }

        resp = requests.post(url, headers=headers, json=payload, timeout=10)
        resp_data = resp.json() if resp.headers.get('content-type', '').startswith('application/json') else {"text": resp.text}
        is_ok = resp.status_code in [200, 201] and "messages" in resp_data
        
        err_msg = ""
        if not is_ok:
            if isinstance(resp_data, dict) and "error" in resp_data:
                err_meta = resp_data["error"]
                code = err_meta.get("code")
                msg = err_meta.get("message", "")
                
                if code == 131030 or "Recipient phone number not in allowed list" in msg:
                    err_msg = f"Meta Sandbox Error (#131030): Recipient '{cleaned_phone}' is not in your Meta WhatsApp Test Allowed list. In developers.facebook.com > WhatsApp > API Setup > 'To' dropdown, click 'Manage phone number list' to add and verify this number with OTP."
                elif code == 190:
                    err_msg = "Meta Error (#190): Access Token expired or invalid. Please generate a new Temporary/Permanent Access Token in Meta Developer Portal."
                elif code == 100 and "does not exist" in msg:
                    err_msg = f"Meta Error (#100): Phone Number ID '{phone_number_id}' is invalid. Please enter the 15-digit Meta 'Phone Number ID' from developers.facebook.com WhatsApp API Setup."
                else:
                    err_msg = f"Meta WhatsApp Error (#{code}): {msg}"
            else:
                err_msg = str(resp_data)

        return {
            "status": "DELIVERED" if is_ok else "FAILED",
            "response": resp_data,
            "error": err_msg,
        }
    except Exception as e:
        logger.error(f"[WhatsApp Error] {str(e)}")
        return {"status": "FAILED", "error": str(e), "response": {}}


def send_email_via_provider(gateway_config, recipient_email, subject, message_text):
    """
    Dispatches SMTP Email through configured gateway or default Django SMTP backend.
    """
    if not recipient_email:
        return {"status": "FAILED", "error": "No recipient email provided", "response": {}}

    if not gateway_config or not gateway_config.is_active:
        logger.info(f"[EMAIL SIMULATED] To: {recipient_email} | Subject: {subject}")
        return {
            "status": "SIMULATED",
            "provider": "SMTP_CUSTOM",
            "response": {"note": "Simulated Email dispatch in development", "recipient": recipient_email},
        }

    try:
        if gateway_config.api_url and gateway_config.api_key:
            # Custom SMTP server
            backend = EmailBackend(
                host=gateway_config.api_url,
                port=gateway_config.port or 587,
                username=gateway_config.api_key,
                password=gateway_config.api_secret_or_token,
                use_tls=gateway_config.use_tls_ssl,
                timeout=10,
            )
            from_email = gateway_config.sender_id_or_phone or gateway_config.api_key
            connection = backend
        else:
            from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@sprnote.com')
            connection = None

        send_mail(
            subject=subject or "SPR Note Notification",
            message=message_text,
            from_email=from_email,
            recipient_list=[recipient_email],
            connection=connection,
            fail_silently=False,
        )
        return {
            "status": "DELIVERED",
            "response": {"from": from_email, "to": recipient_email},
            "error": "",
        }
    except Exception as e:
        logger.error(f"[Email Error] {str(e)}")
        return {"status": "FAILED", "error": str(e), "response": {}}


def send_telegram_via_provider(gateway_config, recipient_chat_id, message_text, title=None, parse_mode="HTML"):
    """
    Dispatches notifications to Telegram Channel, Group, or Direct Chat via Telegram Bot API.
    """
    if not message_text:
        return {"status": "FAILED", "error": "Message body is required", "response": {}}

    if not gateway_config or not gateway_config.is_active:
        logger.info(f"[TELEGRAM SIMULATED] Chat: {recipient_chat_id} | Msg: {message_text[:80]}")
        return {
            "status": "SIMULATED",
            "provider": "TELEGRAM_BOT",
            "response": {"note": "Simulated Telegram dispatch in development", "chat_id": recipient_chat_id},
        }

    bot_token = (gateway_config.api_secret_or_token or gateway_config.api_key or "").strip()
    if not bot_token:
        return {"status": "FAILED", "error": "Telegram Bot Token is missing in gateway configuration.", "response": {}}

    # Determine target chat: recipient_chat_id or gateway default channel/group
    target_chat = (
        recipient_chat_id or 
        gateway_config.sender_id_or_phone or 
        (gateway_config.extra_headers_or_params.get('default_chat_id') if isinstance(gateway_config.extra_headers_or_params, dict) else None)
    )

    if not target_chat:
        return {
            "status": "FAILED",
            "error": "No Telegram Chat ID, Channel Username (@channel_name), or Group ID provided.",
            "response": {}
        }

    # Format content with optional bold title
    if title and str(title).strip():
        formatted_text = f"<b>{title.strip()}</b>\n\n{message_text}"
    else:
        formatted_text = message_text

    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {
        "chat_id": str(target_chat).strip(),
        "text": formatted_text,
        "parse_mode": parse_mode,
        "disable_web_page_preview": False
    }

    try:
        import requests
        resp = requests.post(url, json=payload, timeout=10)
        resp_data = resp.json() if resp.headers.get('content-type', '').startswith('application/json') else {"text": resp.text}

        if resp.status_code == 200 and resp_data.get("ok"):
            return {
                "status": "DELIVERED",
                "response": resp_data.get("result", {}),
                "error": "",
            }

        # If HTML parse error occurred, retry once as plain text
        if resp_data.get("error_code") == 400 and "can't parse entities" in resp_data.get("description", "").lower():
            payload.pop("parse_mode", None)
            plain_resp = requests.post(url, json=payload, timeout=10)
            plain_data = plain_resp.json() if plain_resp.headers.get('content-type', '').startswith('application/json') else {"text": plain_resp.text}
            if plain_resp.status_code == 200 and plain_data.get("ok"):
                return {
                    "status": "DELIVERED",
                    "response": plain_data.get("result", {}),
                    "error": "",
                }

        # Format user-friendly error message
        err_code = resp_data.get("error_code")
        err_desc = resp_data.get("description", "")
        if err_code == 401:
            err_msg = "Telegram Error (401 Unauthorized): Invalid Bot Token. Please check the token provided by @BotFather."
        elif err_code == 400 and "chat not found" in err_desc.lower():
            err_msg = f"Telegram Error (400 Chat Not Found): Could not find chat '{target_chat}'. For channels/groups, verify the username and ensure the Bot has been added as an Administrator."
        elif err_code == 403:
            err_msg = f"Telegram Error (403 Forbidden): Bot was blocked by user or lacks permission to post in channel '{target_chat}'."
        else:
            err_msg = f"Telegram Error ({err_code}): {err_desc}"

        return {
            "status": "FAILED",
            "response": resp_data,
            "error": err_msg,
        }

    except Exception as e:
        logger.error(f"[Telegram Error] {str(e)}")
        return {"status": "FAILED", "error": str(e), "response": {}}


# ==============================================================================
# LIVE GATEWAY PING & BALANCE INQUIRY
# ==============================================================================

def ping_gateway(gateway_config, test_target=None):
    """
    Sends a test ping to verify credentials and connectivity.
    Updates last_ping_status and last_ping_at on the gateway record.
    """
    if not gateway_config:
        return {"status": "FAILED", "message": "Gateway configuration missing"}

    test_msg = f"SPR Note Ping Test on {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}"
    res = {"status": "UNTESTED"}

    if gateway_config.gateway_type == 'SMS':
        target = test_target or gateway_config.sender_id_or_phone or "01700000000"
        res = send_sms_via_provider(gateway_config, target, test_msg)
    elif gateway_config.gateway_type == 'WHATSAPP':
        target = test_target or "01700000000"
        # Meta WhatsApp requires a pre-approved template ('hello_world') to initiate outbound messages
        res = send_whatsapp_via_provider(gateway_config, target, test_msg, template_name="hello_world")
        if res.get("status") == "FAILED" and "template" in str(res.get("error", "")):
            res = send_whatsapp_via_provider(gateway_config, target, test_msg)
    elif gateway_config.gateway_type == 'SMTP_EMAIL':
        target = test_target or "test@example.com"
        res = send_email_via_provider(gateway_config, target, "Ping Test", test_msg)
    elif gateway_config.gateway_type == 'TELEGRAM':
        bot_token = (gateway_config.api_secret_or_token or gateway_config.api_key or "").strip()
        if not bot_token:
            res = {"status": "FAILED", "error": "Telegram Bot Token is not configured."}
        else:
            import requests
            try:
                # 1. Ping Telegram getMe
                get_me_url = f"https://api.telegram.org/bot{bot_token}/getMe"
                me_resp = requests.get(get_me_url, timeout=10)
                me_data = me_resp.json() if me_resp.headers.get('content-type', '').startswith('application/json') else {"text": me_resp.text}
                
                if me_resp.status_code == 200 and me_data.get("ok"):
                    bot_info = me_data.get("result", {})
                    # If target provided, also attempt sending ping message
                    if test_target or gateway_config.sender_id_or_phone:
                        res = send_telegram_via_provider(gateway_config, test_target, test_msg, title="SPR Note Bot Ping")
                    else:
                        res = {
                            "status": "DELIVERED",
                            "response": {
                                "bot_id": bot_info.get("id"),
                                "bot_name": bot_info.get("first_name"),
                                "username": f"@{bot_info.get('username')}",
                                "can_join_groups": bot_info.get("can_join_groups"),
                                "can_read_all_group_messages": bot_info.get("can_read_all_group_messages"),
                            },
                            "error": ""
                        }
                else:
                    res = {
                        "status": "FAILED",
                        "error": f"Telegram Bot Ping Failed: {me_data.get('description', 'Unauthorized')}",
                        "response": me_data
                    }
            except Exception as e:
                res = {"status": "FAILED", "error": str(e), "response": {}}
    else:
        res = {"status": "SIMULATED", "response": {"note": "Gateway ping simulated"}}

    status_str = "SUCCESS" if res.get("status") in ["DELIVERED", "SIMULATED", "SENT"] else "FAILED"
    gateway_config.last_ping_status = status_str
    gateway_config.last_ping_at = timezone.now()
    gateway_config.save(update_fields=['last_ping_status', 'last_ping_at'])

    return {
        "status": status_str,
        "detail": res.get("response", {}),
        "error": res.get("error", ""),
        "timestamp": gateway_config.last_ping_at.isoformat(),
    }


def fetch_gateway_balance(gateway_config):
    """
    Queries live SMS / provider balance.
    """
    if not gateway_config or gateway_config.gateway_type != 'SMS' or not gateway_config.is_active:
        return {"balance": gateway_config.balance_cache if gateway_config else 0.00, "status": "CACHED"}

    try:
        import requests
        provider = gateway_config.provider_name
        api_key = gateway_config.api_key

        if provider == 'GREENWEB':
            url = "https://api.greenweb.com.bd/greb_sms_balance.php"
            resp = requests.get(url, params={"token": api_key}, timeout=5)
            if resp.status_code == 200:
                match = re.search(r'[\d\.]+', resp.text)
                if match:
                    bal = Decimal(match.group(0))
                    gateway_config.balance_cache = bal
                    gateway_config.save(update_fields=['balance_cache'])
                    return {"balance": float(bal), "currency": "BDT", "status": "LIVE"}

        elif provider == 'SSL_WIRELESS':
            # Simulated or actual SSL balance endpoint
            return {"balance": float(gateway_config.balance_cache or 500.00), "currency": "BDT", "status": "ESTIMATED"}

    except Exception as e:
        logger.error(f"[Balance Fetch Error] {str(e)}")

    return {"balance": float(gateway_config.balance_cache or 0.00), "currency": "BDT", "status": "CACHED"}


# ==============================================================================
# UNIFIED MULTI-CHANNEL DISPATCH ENGINE
# ==============================================================================

def dispatch_notification(
    institution,
    event_type,
    recipient_user=None,
    recipient_identifier=None,
    dynamic_context=None,
    forced_channels=None,
    custom_message=None,
    custom_title=None,
    action_url="",
    notification_type="INFO"
):
    """
    Central Multi-Channel Notification Dispatcher.
    
    1. Loads active Trigger Rules & Gateway Configs for the institution.
    2. Interpolates message templates with dynamic_context.
    3. Dispatches across enabled channels (IN_APP, SMS, WHATSAPP, EMAIL).
    4. Writes immutable audit logs into NotificationDispatchLog.
    """
    from core.models import (
        NotificationTriggerRule,
        NotificationTemplate,
        NotificationGatewayConfig,
        InAppNotification,
        NotificationDispatchLog
    )

    if not institution:
        logger.warning("[dispatch_notification] Missing institution, skipping.")
        return {"status": "skipped", "reason": "No institution specified"}

    context = dynamic_context or {}
    context.setdefault("institution_name", getattr(institution, 'name', 'SPR Note'))
    context.setdefault("date", timezone.now().strftime("%Y-%m-%d"))
    context.setdefault("time", timezone.now().strftime("%I:%M %p"))

    # 1. Determine active channels
    channels = forced_channels or []
    trigger_rule = None

    if not forced_channels:
        trigger_rule = NotificationTriggerRule.objects.filter(
            institution=institution,
            event_type=event_type,
            is_enabled=True
        ).first()

        if trigger_rule:
            channels = trigger_rule.channels or []
        else:
            # Default fallback channel
            channels = ['IN_APP']

    if not channels:
        return {"status": "skipped", "reason": "No active channels for event trigger"}

    # 2. Resolve Subject & Message Body
    template = None
    if trigger_rule and trigger_rule.template:
        template = trigger_rule.template
    else:
        template = NotificationTemplate.objects.filter(
            institution=institution,
            event_type=event_type
        ).first()

    raw_subject = custom_title or (template.subject if template else f"Notice from {context.get('institution_name')}")
    raw_body = custom_message or (template.body if template else "You have a new update.")

    resolved_title = interpolate_template_variables(raw_subject, context)
    resolved_body = interpolate_template_variables(raw_body, context)

    # Determine recipient phone and email
    target_phone = recipient_identifier
    target_email = None

    if recipient_user:
        target_phone = target_phone or getattr(recipient_user, 'phone_number', None)
        target_email = getattr(recipient_user, 'email', None)

    # 3. Load Gateways for Institution
    gateways = {
        gw.gateway_type: gw 
        for gw in NotificationGatewayConfig.objects.filter(institution=institution, is_active=True)
    }

    results = {}

    # Helper to resolve a guaranteed non-null recipient identifier
    def resolve_safe_identifier(user, fallback_value=""):
        if fallback_value and str(fallback_value).strip():
            return str(fallback_value).strip()
        if user:
            phone = getattr(user, 'phone_number', None)
            if phone and str(phone).strip():
                return str(phone).strip()
            email = getattr(user, 'email', None)
            if email and str(email).strip():
                return str(email).strip()
            name = getattr(user, 'name', None)
            if name and str(name).strip():
                return str(name).strip()
            return f"User #{user.id}"
        return "Unknown Recipient"

    # --- CHANNEL A: IN-APP NOTIFICATION ---
    if 'IN_APP' in channels:
        if recipient_user:
            in_app_obj = InAppNotification.objects.create(
                institution=institution,
                recipient=recipient_user,
                title=resolved_title,
                message=resolved_body,
                notification_type=notification_type,
                action_url=action_url or context.get('action_url', '')
            )
            NotificationDispatchLog.objects.create(
                institution=institution,
                channel='IN_APP',
                event_type=event_type,
                recipient_identifier=resolve_safe_identifier(recipient_user, recipient_identifier),
                recipient_user=recipient_user,
                message_title=resolved_title,
                message_body=resolved_body,
                status='DELIVERED',
                provider_response={"in_app_id": str(in_app_obj.id)}
            )
            results['IN_APP'] = {"status": "DELIVERED", "id": str(in_app_obj.id)}
        else:
            results['IN_APP'] = {"status": "SKIPPED", "reason": "No recipient user"}

    # --- CHANNEL B: SMS GATEWAY ---
    if 'SMS' in channels and target_phone:
        sms_gw = gateways.get('SMS')
        sms_res = send_sms_via_provider(sms_gw, target_phone, resolved_body)
        NotificationDispatchLog.objects.create(
            institution=institution,
            channel='SMS',
            event_type=event_type,
            recipient_identifier=resolve_safe_identifier(recipient_user, target_phone or recipient_identifier),
            recipient_user=recipient_user,
            message_title=resolved_title,
            message_body=resolved_body,
            status=sms_res.get('status', 'SENT'),
            provider_response=sms_res.get('response', {}),
            error_reason=sms_res.get('error', '')
        )
        results['SMS'] = sms_res

    # --- CHANNEL C: WHATSAPP CLOUD API ---
    if 'WHATSAPP' in channels and target_phone:
        wa_gw = gateways.get('WHATSAPP')
        wa_tpl = wa_gw.extra_headers_or_params.get('template_name') if wa_gw and isinstance(wa_gw.extra_headers_or_params, dict) else None
        wa_lang = wa_gw.extra_headers_or_params.get('template_lang', 'en_US') if wa_gw and isinstance(wa_gw.extra_headers_or_params, dict) else 'en_US'
        wa_params = [recipient_user.name if recipient_user and recipient_user.name else "Member", resolved_body] if wa_tpl and wa_tpl != "hello_world" else None

        wa_res = send_whatsapp_via_provider(
            wa_gw, 
            target_phone, 
            resolved_body,
            template_name=wa_tpl,
            template_lang=wa_lang,
            template_params=wa_params
        )
        NotificationDispatchLog.objects.create(
            institution=institution,
            channel='WHATSAPP',
            event_type=event_type,
            recipient_identifier=resolve_safe_identifier(recipient_user, target_phone or recipient_identifier),
            recipient_user=recipient_user,
            message_title=resolved_title,
            message_body=resolved_body,
            status=wa_res.get('status', 'SENT'),
            provider_response=wa_res.get('response', {}),
            error_reason=wa_res.get('error', '')
        )
        results['WHATSAPP'] = wa_res

    # --- CHANNEL D: SMTP EMAIL ---
    if 'EMAIL' in channels and target_email:
        email_gw = gateways.get('SMTP_EMAIL')
        email_res = send_email_via_provider(email_gw, target_email, resolved_title, resolved_body)
        NotificationDispatchLog.objects.create(
            institution=institution,
            channel='EMAIL',
            event_type=event_type,
            recipient_identifier=resolve_safe_identifier(recipient_user, target_email or recipient_identifier),
            recipient_user=recipient_user,
            message_title=resolved_title,
            message_body=resolved_body,
            status=email_res.get('status', 'SENT'),
            provider_response=email_res.get('response', {}),
            error_reason=email_res.get('error', '')
        )
        results['EMAIL'] = email_res

    # --- CHANNEL E: TELEGRAM BOT & CHANNELS ---
    if 'TELEGRAM' in channels:
        tg_gw = gateways.get('TELEGRAM')
        # Check recipient target: direct chat_id/channel or fallback to gateway's default channel
        tg_target = (
            recipient_identifier if (recipient_identifier and (str(recipient_identifier).startswith('@') or str(recipient_identifier).startswith('-') or str(recipient_identifier).isdigit()))
            else (getattr(recipient_user, 'telegram_chat_id', None) if recipient_user else None)
        )
        tg_res = send_telegram_via_provider(tg_gw, tg_target, resolved_body, title=resolved_title)
        NotificationDispatchLog.objects.create(
            institution=institution,
            channel='TELEGRAM',
            event_type=event_type,
            recipient_identifier=resolve_safe_identifier(recipient_user, tg_target or (tg_gw.sender_id_or_phone if tg_gw else '') or recipient_identifier),
            recipient_user=recipient_user,
            message_title=resolved_title,
            message_body=resolved_body,
            status=tg_res.get('status', 'SENT'),
            provider_response=tg_res.get('response', {}),
            error_reason=tg_res.get('error', '')
        )
        results['TELEGRAM'] = tg_res

    return {
        "status": "COMPLETED",
        "event_type": event_type,
        "dispatched_channels": results,
        "resolved_title": resolved_title,
        "resolved_body": resolved_body
    }


# ==============================================================================
# LEGACY COMPATIBILITY HELPERS
# ==============================================================================

def send_fcm_notification(device_tokens, title, body, data=None):
    """
    Triggers FCM Push Notifications for target device tokens.
    """
    if not device_tokens:
        return {"status": "skipped", "reason": "No device tokens provided"}

    try:
        from firebase_admin import messaging  # type: ignore
        message = messaging.MulticastMessage(
            notification=messaging.Notification(title=title, body=body),
            data=data or {},
            tokens=list(device_tokens),
        )
        response = messaging.send_multicast(message)
        return {
            "status": "success",
            "success_count": response.success_count,
            "failure_count": response.failure_count
        }
    except ImportError:
        logger.info(f"[FCM SIMULATION] Title: {title} | Body: {body}")
        return {"status": "simulated", "title": title, "body": body}
    except Exception as e:
        logger.error(f"Error sending FCM notification: {str(e)}")
        return {"status": "error", "message": str(e)}


def send_sms_notification(phone_number, message_text):
    """Legacy SMS trigger."""
    return send_sms_via_provider(None, phone_number, message_text)


def get_student_guardian_info(student):
    """
    Extracts primary guardian name, phone number, and linked User model for a given Student.
    """
    if not student:
        return ("Guardian", None, None)

    guardian_name = getattr(student, 'guardian_name', None)
    guardian_phone = getattr(student, 'guardian_phone', None)
    guardian_user = None

    if hasattr(student, 'guardian_detail') and student.guardian_detail:
        guardian_phone = student.guardian_detail.primary_guardian_phone or guardian_phone
        guardian_name = student.guardian_detail.primary_guardian_name or guardian_name

    if hasattr(student, 'guardians') and student.guardians.exists():
        g_profile = student.guardians.first()
        if g_profile and g_profile.user:
            guardian_user = g_profile.user
            guardian_phone = guardian_phone or g_profile.user.phone_number
            guardian_name = guardian_name or g_profile.name_en or g_profile.user.get_full_name()

    return (guardian_name or "Guardian", guardian_phone, guardian_user)


def notify_student_attendance(student, status_val, date_val, time_val=None):
    """
    Dispatches automated attendance alert to guardian on absence or late arrival.
    """
    try:
        if not student:
            return

        institution = getattr(student, 'institution', None)
        if not institution:
            return

        status_str = str(status_val).upper()
        if status_str not in ['ABSENT', 'LATE']:
            return

        event_type = "STUDENT_ABSENT" if status_str == "ABSENT" else "STUDENT_LATE"
        guardian_name, guardian_phone, guardian_user = get_student_guardian_info(student)

        student_name = getattr(student, 'name_en', None) or getattr(student, 'name_bn', None) or getattr(student, 'name', 'Student')
        class_obj = getattr(student, 'student_class', None)
        class_name = class_obj.name if class_obj else 'General'

        context = {
            "student_name": student_name,
            "roll_number": str(getattr(student, 'roll_number', '') or '--'),
            "class_name": class_name,
            "guardian_name": guardian_name,
            "date": str(date_val),
            "time": str(time_val or timezone.now().strftime("%I:%M %p")),
            "institution_name": getattr(institution, 'name', 'SPR Note'),
            "action_url": f"/attendance/students?student_id={student.id}&date={date_val}",
        }

        dispatch_notification(
            institution=institution,
            event_type=event_type,
            recipient_user=guardian_user,
            recipient_identifier=guardian_phone,
            dynamic_context=context,
            notification_type="WARNING" if event_type == "STUDENT_ABSENT" else "INFO",
            action_url=context["action_url"]
        )
    except Exception as e:
        logger.error(f"Error in notify_student_attendance: {str(e)}")


def notify_new_admission(student):
    """
    Dispatches admission confirmation voucher notification.
    """
    try:
        if not student:
            return

        institution = getattr(student, 'institution', None)
        if not institution:
            return

        guardian_name, guardian_phone, guardian_user = get_student_guardian_info(student)
        student_name = getattr(student, 'name_en', None) or getattr(student, 'name_bn', None) or getattr(student, 'name', 'Student')
        class_obj = getattr(student, 'student_class', None)
        class_name = class_obj.name if class_obj else 'General'

        context = {
            "student_name": student_name,
            "student_id": getattr(student, 'uniq_id', '') or str(student.id),
            "roll_number": str(getattr(student, 'roll_number', '') or '--'),
            "class_name": class_name,
            "guardian_name": guardian_name,
            "date": timezone.now().strftime("%Y-%m-%d"),
            "institution_name": getattr(institution, 'name', 'SPR Note'),
        }

        dispatch_notification(
            institution=institution,
            event_type="NEW_ADMISSION",
            recipient_user=guardian_user,
            recipient_identifier=guardian_phone,
            dynamic_context=context,
            notification_type="SUCCESS",
            action_url=f"/students?id={student.id}"
        )
    except Exception as e:
        logger.error(f"Error in notify_new_admission: {str(e)}")


def notify_staff_leave_action(leave_request, action_status):
    """
    Dispatches staff leave decision notice to the applied staff member.
    """
    try:
        if not leave_request or not leave_request.staff:
            return

        staff = leave_request.staff
        institution = getattr(staff, 'institution', None)
        if not institution:
            return

        staff_user = getattr(staff, 'user', None)
        staff_phone = staff_user.phone_number if staff_user else None
        staff_name = (
            getattr(staff, 'name_en', None) or
            getattr(staff, 'name_bn', None) or
            (staff_user.get_full_name() if staff_user else 'Staff Member')
        )
        leave_type_display = leave_request.get_leave_type_display() if hasattr(leave_request, 'get_leave_type_display') else str(leave_request.leave_type)

        context = {
            "staff_name": staff_name,
            "leave_type": leave_type_display,
            "start_date": str(leave_request.start_date),
            "end_date": str(leave_request.end_date),
            "leave_status": str(action_status).upper(),
            "institution_name": getattr(institution, 'name', 'SPR Note'),
            "action_url": "/staff/leaves",
        }

        dispatch_notification(
            institution=institution,
            event_type="STAFF_LEAVE_ACTION",
            recipient_user=staff_user,
            recipient_identifier=staff_phone,
            dynamic_context=context,
            notification_type="SUCCESS" if str(action_status).upper() == 'APPROVED' else "WARNING",
            action_url=context["action_url"]
        )
    except Exception as e:
        logger.error(f"Error in notify_staff_leave_action: {str(e)}")


def notify_report_saved(report, action="CREATED"):
    """
    Triggered when a StudentDailyReport is created or updated.
    Dispatches through the centralized notification dispatcher.
    """
    try:
        student = report.student
        institution = getattr(student, 'institution', None) or getattr(report, 'institution', None)
        if not institution and student:
            institution = student.institution

        if not institution:
            return

        guardian_name, guardian_phone, guardian_user = get_student_guardian_info(student)

        score_val = getattr(report, 'score', None)
        context = {
            "student_name": report.student_name,
            "date": str(report.date),
            "status": str(report.status),
            "score": str(score_val if score_val is not None else '--'),
            "institution_name": getattr(institution, 'name', 'SPR Note'),
            "guardian_name": guardian_name,
            "action_url": f"/student-reports?student_id={student.id if student else ''}",
        }

        dispatch_notification(
            institution=institution,
            event_type="DAILY_REPORT_SAVED",
            recipient_user=guardian_user,
            recipient_identifier=guardian_phone,
            dynamic_context=context,
            notification_type="SUCCESS" if action == "CREATED" else "INFO"
        )
    except Exception as e:
        logger.error(f"Error in notify_report_saved: {str(e)}")
