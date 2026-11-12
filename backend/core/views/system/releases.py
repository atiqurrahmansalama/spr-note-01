import re
import logging

from django.utils import timezone

from rest_framework import status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny

from core.models import AppRelease
from core.serializers import AppReleaseSerializer
from core.permissions import IsSuperAdmin, IsOwnerOrSuperAdmin

logger = logging.getLogger(__name__)


def parse_semver(version_str):
    if not version_str:
        return (0, 0, 0)
    clean = re.sub(r'^[vV]', '', str(version_str).strip())
    parts = clean.split('-')[0].split('.')
    nums = []
    for p in parts[:3]:
        try:
            nums.append(int(p))
        except ValueError:
            nums.append(0)
    while len(nums) < 3:
        nums.append(0)
    return tuple(nums)


def compare_semver(v1, v2):
    t1 = parse_semver(v1)
    t2 = parse_semver(v2)
    if t1 < t2:
        return -1
    elif t1 > t2:
        return 1
    return 0


class AppVersionCheckView(APIView):
    """
    Public and authenticated client version handshake endpoint.
    Compares client app version and build against active release registry,
    determining whether an optional or mandatory force-update is required.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        client_version = (
            request.query_params.get('version') or
            request.headers.get('X-App-Version') or
            '1.0.0'
        ).strip()

        raw_build = request.query_params.get('build') or request.headers.get('X-App-Build') or 1
        try:
            client_build = int(raw_build)
        except (ValueError, TypeError):
            client_build = 1

        channel = (request.query_params.get('channel') or 'STABLE').upper()
        platform = (request.query_params.get('platform') or 'WEB').upper()

        # Retrieve latest published release
        latest_qs = AppRelease.objects.filter(is_published=True)
        if channel in ['STABLE', 'BETA', 'ALPHA']:
            channel_qs = latest_qs.filter(channel=channel)
            latest_release = channel_qs.first() if channel_qs.exists() else latest_qs.first()
        else:
            latest_release = latest_qs.first()

        if not latest_release:
            # Fallback default when no releases have been published yet
            return Response({
                'current_app_version': client_version,
                'latest_version': client_version,
                'latest_build': client_build,
                'channel': channel,
                'has_update': False,
                'is_force_update': False,
                'release': None
            }, status=status.HTTP_200_OK)

        # SemVer & Build calculation
        has_semver_update = compare_semver(client_version, latest_release.version) < 0
        has_build_update = client_build < latest_release.build_number
        has_update = has_semver_update or has_build_update

        # Check critical force update threshold
        is_force_update = False
        if latest_release.is_critical_update and has_update:
            is_below_min_semver = compare_semver(client_version, latest_release.min_supported_version) < 0
            is_below_min_build = client_build < latest_release.min_supported_build
            if is_below_min_semver or is_below_min_build:
                is_force_update = True

        serializer = AppReleaseSerializer(latest_release)

        return Response({
            'current_app_version': client_version,
            'client_build': client_build,
            'latest_version': latest_release.version,
            'latest_build': latest_release.build_number,
            'channel': latest_release.channel,
            'has_update': has_update,
            'is_critical_update': latest_release.is_critical_update,
            'is_force_update': is_force_update,
            'min_supported_version': latest_release.min_supported_version,
            'min_supported_build': latest_release.min_supported_build,
            'release': serializer.data
        }, status=status.HTTP_200_OK)


class AppReleaseViewSet(viewsets.ModelViewSet):
    """
    Enterprise Release Management Console API.
    Provides complete administrative control to create, publish, and toggle release builds.
    """
    queryset = AppRelease.objects.all().select_related('published_by')
    serializer_class = AppReleaseSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin | IsOwnerOrSuperAdmin]

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        is_published = serializer.validated_data.get('is_published', False)
        published_at = timezone.now() if is_published else None
        published_by = user if is_published else None
        serializer.save(
            published_by=published_by,
            published_at=published_at
        )

    @action(detail=True, methods=['post'], url_path='publish')
    def publish(self, request, pk=None):
        release = self.get_object()
        release.is_published = True
        release.published_at = timezone.now()
        release.published_by = request.user
        release.save()
        serializer = self.get_serializer(release)
        return Response({
            'success': True,
            'message': f"Release v{release.version} published successfully!",
            'release': serializer.data
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='unpublish')
    def unpublish(self, request, pk=None):
        release = self.get_object()
        release.is_published = False
        release.save()
        serializer = self.get_serializer(release)
        return Response({
            'success': True,
            'message': f"Release v{release.version} retracted to draft.",
            'release': serializer.data
        }, status=status.HTTP_200_OK)

