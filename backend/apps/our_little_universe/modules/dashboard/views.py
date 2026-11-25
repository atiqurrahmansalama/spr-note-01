from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.our_little_universe.core.audit import log_universe_event
from apps.our_little_universe.core.permissions import (
    IsUniverseMember,
    IsUniverseOwner,
    UniverseJWTAuthentication,
)
from apps.our_little_universe.models.dashboard import UniverseAchievement, UniverseDailySurprise
from apps.our_little_universe.models.foundation import UniverseMember, UniverseModuleRegistry
from apps.our_little_universe.models.media import UniverseMediaAsset
from apps.our_little_universe.models.story import UniverseStoryMilestone
from apps.our_little_universe.modules.dashboard.serializers import (
    UniverseAchievementSerializer,
    UniverseDailySurpriseSerializer,
)
from apps.our_little_universe.modules.dashboard.services import (
    build_recent_activities,
    claim_daily_surprise,
    ensure_dashboard_seeded,
    evaluate_achievements,
    resolve_today_surprise,
)
from apps.our_little_universe.modules.welcome.serializers import (
    UniverseModuleRegistrySerializer,
    UniverseProgressSerializer,
    UniverseSpacePublicSerializer,
)
from apps.our_little_universe.modules.welcome.services import (
    ensure_default_modules,
    ensure_progress_for_member,
)


class UniverseDashboardView(APIView):
    """
    Canonical endpoint for Module 03 — Love Universe Dashboard.
    Aggregates Space config, Love Map modules, Daily Surprise, Progress Tracker,
    Achievements, Featured Shortcut, and Recent Activities.
    """
    authentication_classes = [UniverseJWTAuthentication]
    permission_classes = [IsAuthenticated, IsUniverseMember]

    def get(self, request):
        space = request.universe_space
        ensure_default_modules(space)
        ensure_dashboard_seeded(space)
        progress = ensure_progress_for_member(request.universe_member)

        # Record visiting dashboard cleanly in progress
        visited = list(progress.unlocked_modules or [])
        if "dashboard" not in visited:
            visited.append("dashboard")
            progress.unlocked_modules = visited
            progress.save(update_fields=["unlocked_modules", "updated_at"])

        achievements = evaluate_achievements(space, progress)
        surprise, claimed_today, today_iso = resolve_today_surprise(space, progress)
        modules = UniverseModuleRegistry.objects.filter(space=space).order_by("sort_order", "module_key")

        explorable = [m for m in modules if m.module_key not in ("welcome", "dashboard")]
        enabled_explorable = [m for m in explorable if m.is_enabled and not m.is_locked]
        visited_count = len(
            [m for m in enabled_explorable if m.module_key in (progress.unlocked_modules or [])]
        )

        return Response(
            {
                "space": UniverseSpacePublicSerializer(space, context={"request": request}).data,
                "progress": UniverseProgressSerializer(progress).data,
                "modules": UniverseModuleRegistrySerializer(modules, many=True).data,
                "daily_surprise": {
                    "date": today_iso,
                    "claimed_today": claimed_today,
                    "item": UniverseDailySurpriseSerializer(surprise).data if surprise else None,
                },
                "achievements": achievements,
                "stats": {
                    "total_worlds": len(explorable),
                    "unlocked_worlds": len(enabled_explorable),
                    "explored_worlds": visited_count,
                    "story_chapters": UniverseStoryMilestone.objects.filter(space=space).count(),
                    "private_media_count": UniverseMediaAsset.objects.filter(space=space).count(),
                    "achievements_unlocked": sum(1 for a in achievements if a["unlocked"]),
                    "achievements_total": len(achievements),
                },
                "recent_activities": build_recent_activities(space),
                "can_edit": request.universe_member.role == UniverseMember.ROLE_OWNER,
            },
            status=status.HTTP_200_OK,
        )


class UniverseClaimSurpriseView(APIView):
    """Idempotently claims today's Daily Surprise and awards stars + unlocks achievements."""
    authentication_classes = [UniverseJWTAuthentication]
    permission_classes = [IsAuthenticated, IsUniverseMember]

    def post(self, request):
        space = request.universe_space
        progress = ensure_progress_for_member(request.universe_member)
        surprise, claimed, today_iso = claim_daily_surprise(
            space=space,
            progress=progress,
            actor=request.user,
            request=request,
        )
        achievements = evaluate_achievements(space, progress)
        return Response(
            {
                "date": today_iso,
                "claimed_today": claimed,
                "item": UniverseDailySurpriseSerializer(surprise).data if surprise else None,
                "progress": UniverseProgressSerializer(progress).data,
                "achievements": achievements,
            },
            status=status.HTTP_200_OK,
        )


class UniverseAdminSurprisesView(APIView):
    """OWNER-only CRUD for Daily Surprises pool & scheduled surprises."""
    authentication_classes = [UniverseJWTAuthentication]
    permission_classes = [IsAuthenticated, IsUniverseOwner]

    def get(self, request):
        ensure_dashboard_seeded(request.universe_space)
        items = request.universe_space.daily_surprises.order_by("sort_order", "created_at")
        return Response(UniverseDailySurpriseSerializer(items, many=True).data)

    def post(self, request):
        serializer = UniverseDailySurpriseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = serializer.save(space=request.universe_space)
        log_universe_event(
            request.universe_space,
            request.user,
            "ADMIN_SURPRISE_CREATED",
            {"surprise_id": str(item.id)},
            request=request,
        )
        return Response(UniverseDailySurpriseSerializer(item).data, status=status.HTTP_201_CREATED)

    def patch(self, request, surprise_id=None):
        item = UniverseDailySurprise.objects.filter(
            id=surprise_id, space=request.universe_space
        ).first()
        if not item:
            return Response({"detail": "Surprise not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = UniverseDailySurpriseSerializer(item, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, surprise_id=None):
        item = UniverseDailySurprise.objects.filter(
            id=surprise_id, space=request.universe_space
        ).first()
        if not item:
            return Response({"detail": "Surprise not found."}, status=status.HTTP_404_NOT_FOUND)
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class UniverseAdminAchievementsView(APIView):
    """OWNER-only CRUD for Achievement definitions."""
    authentication_classes = [UniverseJWTAuthentication]
    permission_classes = [IsAuthenticated, IsUniverseOwner]

    def get(self, request):
        ensure_dashboard_seeded(request.universe_space)
        items = request.universe_space.achievements.order_by("sort_order", "achievement_key")
        return Response(UniverseAchievementSerializer(items, many=True).data)

    def post(self, request):
        serializer = UniverseAchievementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = serializer.save(space=request.universe_space)
        return Response(UniverseAchievementSerializer(item).data, status=status.HTTP_201_CREATED)

    def patch(self, request, achievement_id=None):
        item = UniverseAchievement.objects.filter(
            id=achievement_id, space=request.universe_space
        ).first()
        if not item:
            return Response({"detail": "Achievement not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = UniverseAchievementSerializer(item, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, achievement_id=None):
        item = UniverseAchievement.objects.filter(
            id=achievement_id, space=request.universe_space
        ).first()
        if not item:
            return Response({"detail": "Achievement not found."}, status=status.HTTP_404_NOT_FOUND)
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
