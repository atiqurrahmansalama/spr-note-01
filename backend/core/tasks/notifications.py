import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_bulk_sms_task(self, recipient_numbers, message, tenant_id=None, provider="ONNOROKOM"):
    """
    Asynchronous bulk SMS dispatcher.
    Prevents HTTP request timeout (504) when dispatching SMS to hundreds of parents/staff.
    """
    try:
        from core.notifications import SMSNotificationService
        service = SMSNotificationService()
        result = service.send_bulk_sms(
            recipients=recipient_numbers,
            message=message,
            tenant_id=tenant_id,
            provider=provider
        )
        logger.info(f"Bulk SMS task completed for {len(recipient_numbers)} recipients: {result}")
        return result
    except Exception as exc:
        logger.error(f"Bulk SMS task failed: {exc}")
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def dispatch_push_notification_task(self, user_ids, title, body, data=None, tenant_id=None):
    """
    Asynchronous Firebase Push notification dispatcher.
    """
    try:
        from core.notifications import PushNotificationService
        service = PushNotificationService()
        result = service.send_to_users(
            user_ids=user_ids,
            title=title,
            body=body,
            data=data or {},
            tenant_id=tenant_id
        )
        logger.info(f"Push notification dispatched to {len(user_ids)} users.")
        return result
    except Exception as exc:
        logger.error(f"Push notification task error: {exc}")
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_email_notification_task(self, recipient_emails, subject, html_content, text_content=None, from_email=None):
    """
    Asynchronous Email notification sender.
    """
    try:
        from django.core.mail import send_mail
        send_mail(
            subject=subject,
            message=text_content or '',
            html_message=html_content,
            from_email=from_email,
            recipient_list=recipient_emails,
            fail_silently=False,
        )
        logger.info(f"Email sent successfully to {len(recipient_emails)} recipients.")
        return True
    except Exception as exc:
        logger.error(f"Email sending task failed: {exc}")
        raise self.retry(exc=exc)
