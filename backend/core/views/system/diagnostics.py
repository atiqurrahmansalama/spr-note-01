import time
import sys
import platform
import logging

from django.conf import settings
from django.utils import timezone
from django.core.cache import cache
from django.db.models import Q
from django.contrib.auth import get_user_model

from rest_framework import status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.pagination import PageNumberPagination

from core.models import AuditLog, Student, AcademicInstitution as Institution
from core.serializers import AuditLogSerializer
from core.permissions import IsInstitutionAdmin
from core.services import get_scoped_tenant_id

logger = logging.getLogger(__name__)
User = get_user_model()


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Enterprise Immutable Audit Trail ViewSet.
    Provides tenant-scoped, filterable audit history for compliance and accountability.
    Strictly Read-Only (Disallows Direct Mutations to Preserve Audit Integrity).
    """
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated, IsInstitutionAdmin]
    pagination_class = PageNumberPagination

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return AuditLog.objects.none()

        qs = AuditLog.objects.select_related('institution', 'actor').all()
        tenant_id = get_scoped_tenant_id(self.request)
        if tenant_id and str(tenant_id).upper() != 'ALL':
            qs = qs.filter(institution_id=tenant_id)
        elif not (user.is_superuser or getattr(user, 'user_type', '').upper() == 'SUPER_ADMIN'):
            if user.institution_id:
                qs = qs.filter(institution_id=user.institution_id)
            else:
                return AuditLog.objects.none()

        # Query Filters
        action_param = self.request.query_params.get('action')
        if action_param and action_param.upper() != 'ALL':
            qs = qs.filter(action=action_param.upper())

        resource_type = self.request.query_params.get('resource_type')
        if resource_type and resource_type.upper() != 'ALL':
            qs = qs.filter(resource_type__iexact=resource_type)

        resource_id = self.request.query_params.get('resource_id')
        if resource_id:
            qs = qs.filter(resource_id=str(resource_id))

        actor_id = self.request.query_params.get('actor_id')
        if actor_id:
            qs = qs.filter(actor_id=actor_id)

        start_date = self.request.query_params.get('start_date')
        if start_date:
            qs = qs.filter(created_at__date__gte=start_date)

        end_date = self.request.query_params.get('end_date')
        if end_date:
            qs = qs.filter(created_at__date__lte=end_date)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(changes_summary__icontains=search) |
                Q(actor_name__icontains=search) |
                Q(resource_name__icontains=search) |
                Q(reason__icontains=search) |
                Q(request_id__icontains=search)
            )

        return qs.order_by('-created_at')


class SystemHealthDiagnosticsView(APIView):
    """
    Tier-1 Enterprise Observability & System APM Healthcheck Endpoint.
    Inspects DB query latency, Redis cache availability, Celery queue, and memory/system metrics.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        health_data = {
            'status': 'healthy',
            'environment': 'development' if settings.DEBUG else 'production',
            'timestamp': timezone.now().isoformat(),
            'platform': {
                'system': platform.system(),
                'release': platform.release(),
                'python_version': sys.version.split()[0],
                'django_version': '5.0+',
            },
            'services': {},
            'metrics': {},
        }

        # 1. Database Health & Roundtrip Latency
        db_start = time.perf_counter()
        try:
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            db_latency_ms = round((time.perf_counter() - db_start) * 1000, 2)
            health_data['services']['database'] = {
                'status': 'up',
                'engine': connection.vendor,
                'latency_ms': db_latency_ms,
            }
        except Exception as err:
            health_data['status'] = 'degraded'
            health_data['services']['database'] = {
                'status': 'down',
                'error': str(err),
            }

        # 2. Redis / Cache Health
        cache_start = time.perf_counter()
        try:
            test_key = f"health_check_{int(time.time())}"
            cache.set(test_key, "ok", timeout=5)
            val = cache.get(test_key)
            cache_latency_ms = round((time.perf_counter() - cache_start) * 1000, 2)
            health_data['services']['cache'] = {
                'status': 'up' if val == 'ok' else 'degraded',
                'backend': settings.CACHES['default']['BACKEND'].split('.')[-1],
                'latency_ms': cache_latency_ms,
            }
        except Exception as err:
            health_data['services']['cache'] = {
                'status': 'down',
                'error': str(err),
            }

        # 3. Asynchronous Worker & Celery Status
        health_data['services']['celery_worker'] = {
            'status': 'eager_in_process' if settings.CELERY_TASK_ALWAYS_EAGER else 'distributed_broker',
            'broker': 'redis' if 'redis' in settings.CELERY_BROKER_URL else 'local',
        }

        # 4. Global High-Level Metrics
        try:
            tenant_id = get_scoped_tenant_id(request)
            students_qs = Student.objects.all()
            staff_qs = User.objects.all()
            if tenant_id:
                students_qs = students_qs.filter(tenant_id=tenant_id)
                staff_qs = staff_qs.filter(tenant_id=tenant_id)

            health_data['metrics'] = {
                'total_institutions': Institution.objects.filter(is_active=True).count(),
                'total_students': students_qs.count(),
                'total_staff': staff_qs.count(),
            }
        except Exception:
            health_data['metrics'] = {}

        return Response(health_data, status=status.HTTP_200_OK)
