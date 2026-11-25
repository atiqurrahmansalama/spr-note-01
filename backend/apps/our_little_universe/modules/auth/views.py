from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from core.models import User, UserLoginLog, UserActivityLog, UserSession
from core.middleware import get_client_ip, detect_device_type, detect_device_info
from core.views.iam.auth import LogoutView as CoreIAMLogoutView

from apps.our_little_universe.core.audit import log_universe_event
from apps.our_little_universe.core.permissions import (
    IsUniverseMember,
    UniverseJWTAuthentication,
    set_postgres_rls_context,
)
from apps.our_little_universe.models.foundation import UniverseMember
from apps.our_little_universe.modules.auth.serializers import UniverseLoginSerializer
from apps.our_little_universe.modules.auth.services import build_session_payload
from apps.our_little_universe.modules.welcome.services import bootstrap_universe_space


class UniversePrivateLoginView(APIView):
    """
    Private login endpoint for Our Little Universe.
    Reuses core IAM authentication, JWT issuing, and session telemetry while enforcing
    strict private membership inside the isolated `universe` database.
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UniverseLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        identifier = serializer.validated_data["identifier"].strip()
        password = serializer.validated_data["password"]

        user = User.objects.filter(
            Q(email__iexact=identifier) | Q(phone_number=identifier)
        ).first()

        if not user or not user.check_password(password) or not user.is_active or user.is_deactivated:
            return Response(
                {"detail": "Invalid credentials or private access inactive."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        member = (
            UniverseMember.objects.select_related("space")
            .filter(user_id=user.id, is_active=True, space__is_active=True)
            .first()
        )
        if not member and user.is_superuser:
            space = bootstrap_universe_space(user)
            member = UniverseMember.objects.select_related("space").get(space=space, user_id=user.id)

        if not member:
            return Response(
                {"detail": "You do not have private membership access to this Universe."},
                status=status.HTTP_403_FORBIDDEN,
            )

        set_postgres_rls_context(user.id)
        member.last_entered_at = timezone.now()
        member.save(update_fields=["last_entered_at", "updated_at"])

        refresh = RefreshToken.for_user(user)
        ip = get_client_ip(request)
        UserLoginLog.objects.create(user=user, status="LOGIN", ip_address=ip, country="--", city="--")
        UserActivityLog.objects.create(user=user, status="ACTIVE")
        UserSession.objects.create(
            user=user,
            refresh_token_jti=refresh.payload.get("jti", ""),
            ip_address=ip,
            device_type=detect_device_type(request),
            device_info=detect_device_info(request),
            user_agent=request.META.get("HTTP_USER_AGENT", "")[:500],
            is_active=True,
        )
        log_universe_event(
            member.space,
            user,
            "PRIVATE_LOGIN",
            {"role": member.role},
            request=request,
        )

        payload = build_session_payload(member, request, user=user)
        payload["tokens"] = {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }
        return Response(payload, status=status.HTTP_200_OK)


class UniverseLogoutView(CoreIAMLogoutView):
    """Reuses core IAM LogoutView while logging audit telemetry."""
    authentication_classes = [UniverseJWTAuthentication]
    permission_classes = [IsAuthenticated, IsUniverseMember]

    def post(self, request):
        response = super().post(request)
        log_universe_event(request.universe_space, request.user, "PRIVATE_LOGOUT", {}, request=request)
        return response


class UniverseMeView(APIView):
    """Hydrates the authenticated member session, space config, module registry, and progress."""
    authentication_classes = [UniverseJWTAuthentication]
    permission_classes = [IsAuthenticated, IsUniverseMember]

    def get(self, request):
        return Response(build_session_payload(request.universe_member, request), status=status.HTTP_200_OK)
