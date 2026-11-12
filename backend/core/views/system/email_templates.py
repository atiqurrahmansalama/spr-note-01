import logging

from django.conf import settings
from django.template.loader import render_to_string
from django.core.mail import send_mail

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

logger = logging.getLogger(__name__)


class EmailTemplateCatalogView(APIView):
    """
    Developer & Admin Console API: Lists available system transactional HTML email templates
    and their parameter schemas.
    """
    permission_classes = [IsAuthenticated]

    TEMPLATES = {
        'password_reset': {
            'id': 'password_reset',
            'title': 'Password Reset Request',
            'template_path': 'emails/password_reset.html',
            'category': 'Authentication & Recovery',
            'description': 'Dispatched when a user requests password recovery instructions from the /forgot-password portal.',
            'default_subject': 'Reset Your Password - SPR Note Suite',
            'fields': [
                {'key': 'user_name', 'label': 'User Full Name', 'default': 'Atiqur Rahman', 'type': 'text'},
                {'key': 'reset_url', 'label': 'Password Reset URL', 'default': 'http://localhost:5173/reset-password/sample-uuid-token-f935fec9', 'type': 'url'},
                {'key': 'institution_name', 'label': 'Institution Name', 'default': 'SPR NOTE SUITE', 'type': 'text'},
            ],
            'sample_context': {
                'user_name': 'Atiqur Rahman',
                'reset_url': 'http://localhost:5173/reset-password/sample-uuid-token-f935fec9',
                'institution_name': 'SPR NOTE SUITE',
            }
        },
        'email_verification': {
            'id': 'email_verification',
            'title': 'Account Email Verification',
            'template_path': 'emails/email_verification.html',
            'category': 'Onboarding & Identity',
            'description': 'Sent to newly registered users to verify and confirm their registered email address.',
            'default_subject': 'Verify Your Email Address - SPR Note Suite',
            'fields': [
                {'key': 'user_name', 'label': 'User Full Name', 'default': 'Atiqur Rahman', 'type': 'text'},
                {'key': 'verification_code', 'label': '6-Digit Verification Code', 'default': '842915', 'type': 'text'},
                {'key': 'verification_url', 'label': 'Verification URL', 'default': 'http://localhost:5173/verify-email/sample-verification-token-12345', 'type': 'url'},
                {'key': 'institution_name', 'label': 'Institution Name', 'default': 'SPR NOTE SUITE', 'type': 'text'},
            ],
            'sample_context': {
                'user_name': 'Atiqur Rahman',
                'verification_code': '842915',
                'verification_url': 'http://localhost:5173/verify-email/sample-verification-token-12345',
                'institution_name': 'SPR NOTE SUITE',
            }
        },
        'password_changed_notification': {
            'id': 'password_changed_notification',
            'title': 'Security Alert: Password Changed',
            'template_path': 'emails/password_changed_notification.html',
            'category': 'Account Security & Audit',
            'description': 'Immediate automated security notification dispatched when account password is changed.',
            'default_subject': 'Security Alert: Your SPR Note Password Was Changed',
            'fields': [
                {'key': 'user_name', 'label': 'User Full Name', 'default': 'Atiqur Rahman', 'type': 'text'},
                {'key': 'change_time', 'label': 'Timestamp & Timezone', 'default': 'October 27, 2026 at 02:30 AM (UTC+06:00)', 'type': 'text'},
                {'key': 'ip_address', 'label': 'Client IP Address', 'default': '127.0.0.1', 'type': 'text'},
                {'key': 'device_info', 'label': 'Device & Browser Client', 'default': 'Google Chrome on Windows 11 (Mozilla/5.0...)', 'type': 'text'},
                {'key': 'security_url', 'label': 'Security Action URL', 'default': 'http://localhost:5173/forgot-password', 'type': 'url'},
            ],
            'sample_context': {
                'user_name': 'Atiqur Rahman',
                'change_time': 'October 27, 2026 at 02:30 AM (UTC+06:00)',
                'ip_address': '127.0.0.1',
                'device_info': 'Google Chrome on Windows 11 (Mozilla/5.0...)',
                'security_url': 'http://localhost:5173/forgot-password',
            }
        }
    }

    def get(self, request):
        return Response({
            'templates': list(self.TEMPLATES.values())
        }, status=status.HTTP_200_OK)


class EmailTemplateRenderView(APIView):
    """
    Renders an email template with arbitrary context parameters for live interactive preview.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        template_id = request.data.get('template_id')
        custom_context = request.data.get('context', {})

        template_meta = EmailTemplateCatalogView.TEMPLATES.get(template_id)
        if not template_meta:
            return Response({'error': f'Template "{template_id}" not found.'}, status=status.HTTP_404_NOT_FOUND)

        merged_context = {**template_meta['sample_context'], **custom_context}
        try:
            rendered_html = render_to_string(template_meta['template_path'], merged_context)
            return Response({
                'template_id': template_id,
                'html': rendered_html,
                'context': merged_context,
                'subject': template_meta['default_subject'],
                'from_email': settings.DEFAULT_FROM_EMAIL
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': f'Template rendering error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class EmailTemplateTestSendView(APIView):
    """
    Dispatches a real test email using the configured SMTP server directly to specified recipient.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        recipient_email = request.data.get('recipient_email') or request.user.email
        template_id = request.data.get('template_id')
        custom_context = request.data.get('context', {})
        subject = request.data.get('subject')

        if not recipient_email:
            return Response({'error': 'Recipient email address is required.'}, status=status.HTTP_400_BAD_REQUEST)

        template_meta = EmailTemplateCatalogView.TEMPLATES.get(template_id)
        if not template_meta:
            return Response({'error': f'Template "{template_id}" not found.'}, status=status.HTTP_404_NOT_FOUND)

        merged_context = {**template_meta['sample_context'], **custom_context}
        email_subject = subject or template_meta['default_subject']

        try:
            html_message = render_to_string(template_meta['template_path'], merged_context)
            send_mail(
                subject=f"[PREVIEW] {email_subject}",
                message="",
                html_message=html_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient_email],
                fail_silently=False
            )
            return Response({
                'success': True,
                'message': f'Test email successfully dispatched to {recipient_email}!',
                'recipient': recipient_email,
                'subject': f"[PREVIEW] {email_subject}"
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"[EmailTemplateTestSendView] Failed to dispatch test email: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

