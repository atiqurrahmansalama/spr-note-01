import logging
from django.conf import settings

logger = logging.getLogger('core')


def send_fcm_notification(device_tokens, title, body, data=None):
    """
    Triggers FCM Push Notifications for target device tokens.
    Handles graceful fallback if FCM credentials/libraries are unconfigured.
    """
    if not device_tokens:
        return {"status": "skipped", "reason": "No device tokens provided"}

    try:
        from firebase_admin import messaging  # type: ignore

        message = messaging.MulticastMessage(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            data=data or {},
            tokens=list(device_tokens),
        )
        response = messaging.send_multicast(message)
        logger.info(f"FCM Notification sent. Success count: {response.success_count}")
        return {
            "status": "success",
            "success_count": response.success_count,
            "failure_count": response.failure_count
        }
    except ImportError:
        logger.info(f"[FCM SIMULATION] Title: {title} | Body: {body} | Tokens: {len(device_tokens)}")
        return {"status": "simulated", "title": title, "body": body}
    except Exception as e:
        logger.error(f"Error sending FCM notification: {str(e)}")
        return {"status": "error", "message": str(e)}


def send_sms_notification(phone_number, message_text):
    """
    Triggers SMS Gateway requests for critical notifications/alerts.
    Supports async execution and graceful simulation fallback.
    """
    if not phone_number:
        return {"status": "skipped", "reason": "No phone number provided"}

    sms_api_key = getattr(settings, 'SMS_API_KEY', None) or getattr(settings, 'BULK_SMS_API_KEY', None)
    
    if not sms_api_key:
        logger.info(f"[SMS SIMULATION] To: {phone_number} | Message: {message_text}")
        return {"status": "simulated", "phone_number": phone_number, "message": message_text}

    try:
        import requests
        sms_url = getattr(settings, 'SMS_GATEWAY_URL', 'https://api.sms-gateway.com/send')
        payload = {
            "api_key": sms_api_key,
            "to": phone_number,
            "message": message_text
        }
        resp = requests.post(sms_url, json=payload, timeout=5)
        return {"status": "sent", "status_code": resp.status_code}
    except Exception as e:
        logger.error(f"Error triggering SMS gateway: {str(e)}")
        return {"status": "error", "message": str(e)}


def notify_report_saved(report, action="CREATED"):
    """
    Triggered when a StudentDailyReport is created or updated.
    Notifies guardians/parents via Push Notification & SMS.
    """
    try:
        student = report.student
        guardian_tokens = []
        guardian_phone = None

        if student:
            guardians = student.guardians.all()
            for g in guardians:
                user = g.user
                if user:
                    if user.phone_number:
                        guardian_phone = user.phone_number
                    devices = getattr(user, 'devices', None)
                    if devices:
                        tokens = devices.values_list('device_token', flat=True)
                        guardian_tokens.extend([t for t in tokens if t])

        title = f"Hifz Report {action.title()}: {report.student_name}"
        score_val = getattr(report, 'score', None)
        body = f"Daily Report ({report.date}) status: {report.status}. Score: {score_val if score_val is not None else '--'}"

        # 1. FCM Push Notification
        if guardian_tokens:
            send_fcm_notification(
                device_tokens=set(guardian_tokens),
                title=title,
                body=body,
                data={"report_id": str(report.id), "unique_id": report.report_unique_id}
            )

        # 2. SMS Notification for critical actions
        if guardian_phone and action in ["LOCKED", "UPDATED"]:
            sms_text = f"SPR Hifz Update: Report #{report.report_unique_id} for {report.student_name} was {action.lower()} on {report.date}."
            send_sms_notification(guardian_phone, sms_text)

    except Exception as e:
        logger.error(f"Error in notify_report_saved: {str(e)}")
