from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.our_little_universe.core.permissions import IsUniverseMember, UniverseJWTAuthentication
from apps.our_little_universe.modules.welcome.serializers import (
    UniverseProgressSerializer,
    UniverseSpacePublicSerializer,
)
from apps.our_little_universe.modules.welcome.services import (
    ensure_progress_for_member,
    verify_space_pin,
)
from apps.our_little_universe.modules.dashboard.services import record_route_visit


class UniverseWelcomeView(APIView):
    """Entrance & Welcome data endpoint for Phase 02."""
    authentication_classes = [UniverseJWTAuthentication]
    permission_classes = [IsAuthenticated, IsUniverseMember]

    def get(self, request):
        space = request.universe_space
        progress = ensure_progress_for_member(request.universe_member)
        return Response(
            {
                "space": UniverseSpacePublicSerializer(space, context={"request": request}).data,
                "progress": UniverseProgressSerializer(progress).data,
                "role": request.universe_member.role,
            },
            status=status.HTTP_200_OK,
        )


class UniverseVerifyPinView(APIView):
    """Server-side Secret PIN verification & entry unlock persistence."""
    authentication_classes = [UniverseJWTAuthentication]
    permission_classes = [IsAuthenticated, IsUniverseMember]

    def post(self, request):
        space = request.universe_space
        progress = ensure_progress_for_member(request.universe_member)
        pin = str(request.data.get("pin", ""))

        ok, err_code, retry_after = verify_space_pin(
            space=space,
            progress=progress,
            raw_pin=pin,
            actor=request.user,
            request=request,
        )
        if not ok:
            http_status = status.HTTP_429_TOO_MANY_REQUESTS if err_code == "PIN_LOCKED" else status.HTTP_400_BAD_REQUEST
            return Response(
                {
                    "verified": False,
                    "error_code": err_code,
                    "retry_after_seconds": retry_after,
                    "detail": (
                        f"Too many attempts. Please wait {retry_after} seconds."
                        if err_code == "PIN_LOCKED"
                        else "Incorrect secret PIN. Please try again."
                    ),
                },
                status=http_status,
            )

        return Response(
            {
                "verified": True,
                "progress": UniverseProgressSerializer(progress).data,
            },
            status=status.HTTP_200_OK,
        )


class UniverseProgressView(APIView):
    """Reads or updates safe navigation progress fields for the authenticated member."""
    authentication_classes = [UniverseJWTAuthentication]
    permission_classes = [IsAuthenticated, IsUniverseMember]

    def get(self, request):
        progress = ensure_progress_for_member(request.universe_member)
        return Response(UniverseProgressSerializer(progress).data, status=status.HTTP_200_OK)

    def patch(self, request):
        progress = ensure_progress_for_member(request.universe_member)
        last_route = request.data.get("last_visited_route")
        if isinstance(last_route, str) and last_route.startswith("/"):
            allowed = record_route_visit(
                request.universe_space,
                request.universe_member,
                progress,
                last_route,
            )
            if not allowed:
                return Response(
                    {"detail": "This module is currently locked."},
                    status=status.HTTP_403_FORBIDDEN,
                )
        return Response(UniverseProgressSerializer(progress).data, status=status.HTTP_200_OK)
