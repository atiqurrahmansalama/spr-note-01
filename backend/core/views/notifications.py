import os
import io
import re
import csv
import json
import uuid
import base64
import pyotp
import qrcode
import calendar
import logging
from datetime import datetime, date, time, timedelta
from decimal import Decimal

from django.conf import settings
from django.utils import timezone
from django.db import transaction, models
from django.db.models import Max, Q, Count, Avg, Sum, F, Prefetch
from django.contrib.auth import get_user_model, authenticate
from django.http import HttpResponse, JsonResponse
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.core.cache import cache
from django.views.decorators.cache import never_cache
from django.utils.decorators import method_decorator

from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

from rest_framework import status, viewsets, permissions, generics, serializers
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.exceptions import PermissionDenied, ValidationError, NotFound
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.authentication import SessionAuthentication

from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken, UntypedToken
from rest_framework_simplejwt.authentication import JWTAuthentication

from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse, OpenApiExample, extend_schema_view
from drf_spectacular.types import OpenApiTypes

from core.models import *
from core.serializers import *
from core.permissions import (
    IsAdminUserRole,
    IsOwnerOrSuperAdmin,
    IsAdminOrSelf,
    HasSectionAccess,
    IsSuperAdmin,
    IsInstitutionAdmin,
    IsTeacher,
    IsStaffSelfOrAdmin,
)
from core.services import get_scoped_tenant_id
from core.notifications import (
    dispatch_notification,
    ping_gateway,
    fetch_gateway_balance,
    seed_default_templates,
)
from core.middleware import detect_device_type, detect_device_info, get_client_ip
from core.authentication import FlexibleJWTAuthentication
from core.cache_utils import get_or_set_cached_data, invalidate_tenant_cache

logger = logging.getLogger(__name__)
User = get_user_model()

class SavedMessageViewSet(viewsets.ModelViewSet):
    queryset = SavedMessage.objects.all().order_by('-created_at')
    serializer_class = SavedMessageSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrSuperAdmin]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return self.queryset.none()

        if getattr(user, 'user_type', '').upper() == 'SUPER_ADMIN' or user.is_superuser:
            return self.queryset.all()

        return self.queryset.filter(created_by=user)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class InAppNotificationViewSet(viewsets.ModelViewSet):
    serializer_class = InAppNotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return InAppNotification.objects.filter(recipient=self.request.user).order_by('-created_at')

    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        count = self.get_queryset().filter(is_read=False).count()
        return Response({"unread_count": count}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        if not notification.is_read:
            notification.is_read = True
            notification.read_at = timezone.now()
            notification.save(update_fields=['is_read', 'read_at'])
        return Response({
            "status": "success",
            "message": "Notification marked as read",
            "notification": InAppNotificationSerializer(notification).data
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        now = timezone.now()
        updated_count = self.get_queryset().filter(is_read=False).update(is_read=True, read_at=now)
        return Response({
            "status": "success",
            "message": f"All {updated_count} notifications marked as read",
            "updated_count": updated_count
        }, status=status.HTTP_200_OK)


class NotificationGatewayViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationGatewayConfigSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        tenant_id = get_scoped_tenant_id(self.request) or getattr(self.request.user, 'institution_id', None)
        if not tenant_id:
            return NotificationGatewayConfig.objects.none()
        return NotificationGatewayConfig.objects.filter(institution_id=tenant_id).order_by('gateway_type', 'provider_name')

    def perform_create(self, serializer):
        tenant_id = get_scoped_tenant_id(self.request) or getattr(self.request.user, 'institution_id', None)
        if not tenant_id:
            raise ValidationError({"error": "Institutional context is required to configure gateways."})
        inst = AcademicInstitution.objects.filter(id=tenant_id).first()
        if not inst:
            raise ValidationError({"error": "Institution not found."})
        serializer.save(institution=inst)

    @action(detail=True, methods=['post'], url_path='test-ping')
    def test_ping(self, request, pk=None):
        gateway = self.get_object()
        target = request.data.get('target_recipient') or request.data.get('phone_number') or request.data.get('email')
        result = ping_gateway(gateway, test_target=target)
        return Response(result, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='balance')
    def balance(self, request, pk=None):
        gateway = self.get_object()
        bal_res = fetch_gateway_balance(gateway)
        return Response(bal_res, status=status.HTTP_200_OK)


class NotificationTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationTemplateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        tenant_id = get_scoped_tenant_id(self.request) or getattr(self.request.user, 'institution_id', None)
        if not tenant_id:
            return NotificationTemplate.objects.none()
        return NotificationTemplate.objects.filter(institution_id=tenant_id).order_by('-is_system_default', 'name')

    def perform_create(self, serializer):
        tenant_id = get_scoped_tenant_id(self.request) or getattr(self.request.user, 'institution_id', None)
        if not tenant_id:
            raise ValidationError({"error": "Institutional context is required."})
        inst = AcademicInstitution.objects.filter(id=tenant_id).first()
        if not inst:
            raise ValidationError({"error": "Institution not found."})
        serializer.save(institution=inst)

    @action(detail=False, methods=['post'], url_path='seed-defaults')
    def seed_defaults(self, request):
        tenant_id = get_scoped_tenant_id(request) or getattr(request.user, 'institution_id', None)
        if not tenant_id:
            return Response({"error": "Tenant context required."}, status=status.HTTP_400_BAD_REQUEST)
        inst = AcademicInstitution.objects.filter(id=tenant_id).first()
        if not inst:
            return Response({"error": "Institution not found."}, status=status.HTTP_404_NOT_FOUND)

        count = seed_default_templates(inst)
        return Response({
            "status": "success",
            "message": f"Successfully seeded {count} default templates.",
            "templates": NotificationTemplateSerializer(self.get_queryset(), many=True).data
        }, status=status.HTTP_200_OK)


class NotificationTriggerRuleViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationTriggerRuleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        tenant_id = get_scoped_tenant_id(self.request) or getattr(self.request.user, 'institution_id', None)
        if not tenant_id:
            return NotificationTriggerRule.objects.none()
        return NotificationTriggerRule.objects.filter(institution_id=tenant_id).order_by('event_type')

    @action(detail=False, methods=['get'], url_path='matrix')
    def matrix(self, request):
        tenant_id = get_scoped_tenant_id(request) or getattr(request.user, 'institution_id', None)
        if not tenant_id:
            return Response({"matrix": []}, status=status.HTTP_200_OK)

        inst = AcademicInstitution.objects.filter(id=tenant_id).first()
        if not inst:
            return Response({"matrix": []}, status=status.HTTP_200_OK)

        # Ensure default templates exist
        seed_default_templates(inst)

        event_choices = NotificationTriggerRule.EVENT_TYPE_CHOICES
        matrix_list = []

        for event_key, event_label in event_choices:
            rule, _ = NotificationTriggerRule.objects.get_or_create(
                institution=inst,
                event_type=event_key,
                defaults={
                    "channels": ["IN_APP", "SMS"],
                    "is_enabled": True,
                }
            )
            matrix_list.append(NotificationTriggerRuleSerializer(rule).data)

        return Response({"matrix": matrix_list}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='batch-update')
    def batch_update(self, request):
        tenant_id = get_scoped_tenant_id(request) or getattr(request.user, 'institution_id', None)
        if not tenant_id:
            return Response({"error": "Tenant context required."}, status=status.HTTP_400_BAD_REQUEST)

        inst = AcademicInstitution.objects.filter(id=tenant_id).first()
        if not inst:
            return Response({"error": "Institution not found."}, status=status.HTTP_404_NOT_FOUND)

        rules_data = request.data.get('rules', [])
        updated_rules = []

        with transaction.atomic():
            for item in rules_data:
                event_type = item.get('event_type')
                if not event_type:
                    continue
                channels = item.get('channels', ['IN_APP'])
                is_enabled = item.get('is_enabled', True)
                template_id = item.get('template')

                rule, _ = NotificationTriggerRule.objects.get_or_create(
                    institution=inst,
                    event_type=event_type
                )
                rule.channels = channels
                rule.is_enabled = is_enabled
                if template_id:
                    rule.template_id = template_id
                rule.save()
                updated_rules.append(rule)

        return Response({
            "status": "success",
            "message": f"Updated {len(updated_rules)} trigger rules successfully.",
            "matrix": NotificationTriggerRuleSerializer(updated_rules, many=True).data
        }, status=status.HTTP_200_OK)


class NotificationDispatchLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationDispatchLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        tenant_id = get_scoped_tenant_id(self.request) or getattr(self.request.user, 'institution_id', None)
        if not tenant_id:
            return NotificationDispatchLog.objects.none()

        qs = NotificationDispatchLog.objects.filter(institution_id=tenant_id)
        
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(recipient_identifier__icontains=search) |
                Q(message_body__icontains=search) |
                Q(message_title__icontains=search)
            )

        channel = self.request.query_params.get('channel')
        if channel and channel != 'ALL':
            qs = qs.filter(channel=channel)

        status_param = self.request.query_params.get('status')
        if status_param and status_param != 'ALL':
            qs = qs.filter(status=status_param)

        event_type = self.request.query_params.get('event_type')
        if event_type and event_type != 'ALL':
            qs = qs.filter(event_type=event_type)

        return qs.order_by('-dispatched_at')

    @action(detail=False, methods=['get'], url_path='analytics')
    def analytics(self, request):
        tenant_id = get_scoped_tenant_id(request) or getattr(request.user, 'institution_id', None)
        if not tenant_id:
            return Response({"total_dispatched": 0, "delivered": 0, "failed": 0, "simulated": 0}, status=status.HTTP_200_OK)

        qs = NotificationDispatchLog.objects.filter(institution_id=tenant_id)
        total = qs.count()
        delivered = qs.filter(status='DELIVERED').count()
        failed = qs.filter(status='FAILED').count()
        simulated = qs.filter(status='SIMULATED').count()
        queued = qs.filter(status='QUEUED').count()
        in_app_count = qs.filter(channel='IN_APP').count()
        sms_count = qs.filter(channel='SMS').count()
        wa_count = qs.filter(channel='WHATSAPP').count()
        email_count = qs.filter(channel='EMAIL').count()

        return Response({
            "total_dispatched": total,
            "delivered": delivered,
            "failed": failed,
            "simulated": simulated,
            "queued": queued,
            "channel_counts": {
                "IN_APP": in_app_count,
                "SMS": sms_count,
                "WHATSAPP": wa_count,
                "EMAIL": email_count,
            }
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='retry')
    def retry(self, request, pk=None):
        log_obj = self.get_object()
        institution = log_obj.institution

        res = dispatch_notification(
            institution=institution,
            event_type=log_obj.event_type or "MANUAL_RETRY",
            recipient_user=log_obj.recipient_user,
            recipient_identifier=log_obj.recipient_identifier,
            forced_channels=[log_obj.channel],
            custom_message=log_obj.message_body,
            custom_title=log_obj.message_title,
        )

        return Response({
            "status": "success",
            "message": f"Retry dispatched to {log_obj.recipient_identifier} via {log_obj.channel}",
            "result": res
        }, status=status.HTTP_200_OK)


class ManualBroadcastViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'], url_path='send')
    def send(self, request):
        tenant_id = get_scoped_tenant_id(request) or getattr(request.user, 'institution_id', None)
        if not tenant_id:
            return Response({"error": "Institutional context is required."}, status=status.HTTP_400_BAD_REQUEST)

        inst = AcademicInstitution.objects.filter(id=tenant_id).first()
        if not inst:
            return Response({"error": "Institution not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = ManualBroadcastSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        target_audience = data['target_audience']
        class_id = data.get('class_id')
        channels = data['channels']
        title = data['title']
        message = data['message']
        notification_type = data.get('notification_type', 'INFO')
        action_url = data.get('action_url', '')

        recipients = []

        if target_audience in ['ALL', 'STUDENTS', 'CLASS']:
            student_qs = Student.objects.filter(institution=inst, is_deleted=False)
            if target_audience == 'CLASS' and class_id:
                student_qs = student_qs.filter(student_class_id=class_id)

            for stu in student_qs[:500]:
                guardian = stu.guardians.first()
                g_user = guardian.user if guardian else None
                g_phone = guardian.user.phone_number if (guardian and guardian.user) else None
                recipients.append({
                    "user": g_user,
                    "phone": g_phone,
                    "context": {
                        "student_name": stu.name,
                        "class_name": stu.student_class.name if stu.student_class else "",
                        "roll_number": str(stu.roll_number or ""),
                    }
                })

        if target_audience in ['ALL', 'TEACHERS', 'STAFF']:
            staff_qs = StaffProfile.objects.filter(institution=inst, is_active=True)
            if target_audience == 'TEACHERS':
                staff_qs = staff_qs.filter(staff_type='TEACHING')
            elif target_audience == 'STAFF':
                staff_qs = staff_qs.filter(staff_type='SUPPORT')

            for stf in staff_qs[:500]:
                u = stf.user
                recipients.append({
                    "user": u,
                    "phone": u.phone_number if u else stf.emergency_contact,
                    "context": {
                        "staff_name": stf.designation or (u.username if u else "Staff"),
                    }
                })

        dispatched_count = 0
        for r in recipients:
            ctx = {
                "institution_name": inst.name,
                "message": message,
                "sender_name": request.user.username,
                **r.get('context', {})
            }
            dispatch_notification(
                institution=inst,
                event_type="GENERAL_BROADCAST",
                recipient_user=r.get('user'),
                recipient_identifier=r.get('phone'),
                dynamic_context=ctx,
                forced_channels=channels,
                custom_message=message,
                custom_title=title,
                action_url=action_url,
                notification_type=notification_type
            )
            dispatched_count += 1

        return Response({
            "status": "success",
            "message": f"Broadcast queued and dispatched to {dispatched_count} recipients across {', '.join(channels)}.",
            "dispatched_count": dispatched_count,
            "channels": channels
        }, status=status.HTTP_200_OK)
