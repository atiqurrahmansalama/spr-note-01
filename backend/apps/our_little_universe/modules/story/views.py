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
from apps.our_little_universe.models.foundation import UniverseMember
from apps.our_little_universe.models.media import UniverseMediaAsset
from apps.our_little_universe.models.story import (
    UniverseStoryChapter,
    UniverseStoryComparison,
    UniverseStoryMilestone,
    UniverseStorySpecialDate,
)
from apps.our_little_universe.modules.admin.serializers import UniverseMediaAssetSerializer
from apps.our_little_universe.modules.dashboard.services import is_module_accessible
from apps.our_little_universe.modules.story.serializers import (
    UniverseStoryChapterSerializer,
    UniverseStoryComparisonSerializer,
    UniverseStoryMilestoneSerializer,
    UniverseStoryProfileSerializer,
    UniverseStorySpecialDateSerializer,
)
from apps.our_little_universe.modules.story.services import (
    complete_story_chapter,
    ensure_story_interaction,
    ensure_story_seeded,
    unlock_story_milestone,
)


class UniverseStoryHubView(APIView):
    """Returns full dynamic Module 04 Story Hub data for any active Universe member."""
    authentication_classes = [UniverseJWTAuthentication]
    permission_classes = [IsAuthenticated, IsUniverseMember]

    def get(self, request):
        space = request.universe_space
        if not is_module_accessible(space, request.universe_member, "story"):
            return Response(
                {"detail": "Our Story chapter is currently locked."},
                status=status.HTTP_403_FORBIDDEN,
            )

        is_owner = request.universe_member.role == UniverseMember.ROLE_OWNER
        profile = ensure_story_seeded(space)
        interaction = ensure_story_interaction(space, request.user.id)

        chapters_qs = UniverseStoryChapter.objects.filter(space=space)
        milestones_qs = UniverseStoryMilestone.objects.filter(space=space).order_by(
            "event_date", "sort_order", "created_at"
        )
        comparisons_qs = UniverseStoryComparison.objects.filter(space=space).order_by(
            "sort_order", "created_at"
        )
        dates_qs = UniverseStorySpecialDate.objects.filter(space=space).order_by(
            "event_date", "sort_order"
        )

        # Strictly isolate Draft vs Published content for RECIPIENT
        if not is_owner:
            chapters_qs = chapters_qs.filter(is_published=True)
            milestones_qs = milestones_qs.filter(is_published=True)
            comparisons_qs = comparisons_qs.filter(is_published=True)
            dates_qs = dates_qs.filter(is_published=True)

        gallery_assets = UniverseMediaAsset.objects.filter(
            space=space,
            media_type="image",
        ).order_by("-created_at")
        audio_assets = UniverseMediaAsset.objects.filter(
            space=space,
            media_type="audio",
        ).order_by("-created_at")

        ctx = {"request": request, "space": space}
        chapters_data = UniverseStoryChapterSerializer(chapters_qs, many=True, context=ctx).data
        milestones_data = UniverseStoryMilestoneSerializer(milestones_qs, many=True, context=ctx).data

        # Mask locked surprises/narratives on sealed items for RECIPIENT
        if not is_owner:
            completed_set = set(interaction.completed_chapter_ids or [])
            unlocked_ms_set = set(interaction.unlocked_milestone_ids or [])

            for ch in chapters_data:
                if ch["is_locked"]:
                    ch["surprise_title"] = ""
                    ch["surprise_message"] = ""
                    ch["summary"] = "This story chapter is currently sealed by the Universe Owner."
                elif str(ch["id"]) not in completed_set:
                    # Keep surprise hidden until chapter is completed
                    ch["surprise_revealed"] = False
                else:
                    ch["surprise_revealed"] = True

            for ms in milestones_data:
                if ms["is_locked"]:
                    ms["description"] = ""
                    ms["surprise_note"] = ""
                elif ms["surprise_note"] and str(ms["id"]) not in unlocked_ms_set:
                    ms["surprise_revealed"] = False
                else:
                    ms["surprise_revealed"] = True
        else:
            for ch in chapters_data:
                ch["surprise_revealed"] = True
            for ms in milestones_data:
                ms["surprise_revealed"] = True

        return Response(
            {
                "profile": UniverseStoryProfileSerializer(profile, context=ctx).data,
                "chapters": chapters_data,
                "milestones": milestones_data,
                "comparisons": UniverseStoryComparisonSerializer(
                    comparisons_qs, many=True, context=ctx
                ).data,
                "special_dates": UniverseStorySpecialDateSerializer(
                    dates_qs, many=True, context=ctx
                ).data,
                "gallery_assets": UniverseMediaAssetSerializer(
                    gallery_assets, many=True, context=ctx
                ).data,
                "audio_assets": UniverseMediaAssetSerializer(
                    audio_assets, many=True, context=ctx
                ).data,
                "interaction": {
                    "completed_chapter_ids": interaction.completed_chapter_ids or [],
                    "unlocked_milestone_ids": interaction.unlocked_milestone_ids or [],
                },
                "can_edit": is_owner,
            }
        )


class UniverseStoryProfileUpdateView(APIView):
    """OWNER-only endpoint for editing the Story Hero, Our Beginning, Couple Dossier metadata, and Facts."""
    authentication_classes = [UniverseJWTAuthentication]
    permission_classes = [IsAuthenticated, IsUniverseOwner]

    def patch(self, request):
        space = request.universe_space
        profile = ensure_story_seeded(space)
        serializer = UniverseStoryProfileSerializer(
            profile,
            data=request.data,
            partial=True,
            context={"request": request, "space": space},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        log_universe_event(space, request.user, "STORY_PROFILE_UPDATED", {}, request=request)
        return Response(serializer.data)


class UniverseStoryChapterView(APIView):
    """OWNER-only CRUD for Interactive Story Chapters."""
    authentication_classes = [UniverseJWTAuthentication]
    permission_classes = [IsAuthenticated, IsUniverseOwner]

    def post(self, request):
        space = request.universe_space
        ensure_story_seeded(space)
        serializer = UniverseStoryChapterSerializer(
            data=request.data,
            context={"request": request, "space": space},
        )
        serializer.is_valid(raise_exception=True)
        chapter = serializer.save(space=space)
        log_universe_event(
            space,
            request.user,
            "STORY_CHAPTER_CREATED",
            {"chapter_id": str(chapter.id)},
            request=request,
        )
        return Response(
            UniverseStoryChapterSerializer(chapter, context={"request": request, "space": space}).data,
            status=status.HTTP_201_CREATED,
        )

    def patch(self, request, chapter_id=None):
        space = request.universe_space
        chapter = UniverseStoryChapter.objects.filter(id=chapter_id, space=space).first()
        if not chapter:
            return Response({"detail": "Story chapter not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = UniverseStoryChapterSerializer(
            chapter,
            data=request.data,
            partial=True,
            context={"request": request, "space": space},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, chapter_id=None):
        space = request.universe_space
        chapter = UniverseStoryChapter.objects.filter(id=chapter_id, space=space).first()
        if not chapter:
            return Response({"detail": "Story chapter not found."}, status=status.HTTP_404_NOT_FOUND)
        chapter.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class UniverseStoryChapterCompleteView(APIView):
    """Completes an unlocked Story Chapter and reveals its surprise reward."""
    authentication_classes = [UniverseJWTAuthentication]
    permission_classes = [IsAuthenticated, IsUniverseMember]

    def post(self, request, chapter_id=None):
        space = request.universe_space
        is_owner = request.universe_member.role == UniverseMember.ROLE_OWNER
        chapter = UniverseStoryChapter.objects.filter(id=chapter_id, space=space).first()
        if not chapter:
            return Response({"detail": "Story chapter not found."}, status=status.HTTP_404_NOT_FOUND)
        if not is_owner and (not chapter.is_published or chapter.is_locked):
            return Response(
                {"detail": "This story chapter is locked or unpublished."},
                status=status.HTTP_403_FORBIDDEN,
            )

        interaction, stars_awarded = complete_story_chapter(
            space, request.universe_member, chapter, request=request
        )
        return Response(
            {
                "completed_chapter_ids": interaction.completed_chapter_ids or [],
                "stars_awarded": stars_awarded,
                "surprise_title": chapter.surprise_title,
                "surprise_message": chapter.surprise_message,
            }
        )


class UniverseStoryMilestoneView(APIView):
    """CRUD endpoint for Story Timeline Chapters & 'Our Firsts'."""
    authentication_classes = [UniverseJWTAuthentication]

    def get_permissions(self):
        if self.request.method == "PATCH":
            return [IsAuthenticated(), IsUniverseMember()]
        return [IsAuthenticated(), IsUniverseOwner()]

    def post(self, request):
        space = request.universe_space
        ensure_story_seeded(space)
        serializer = UniverseStoryMilestoneSerializer(
            data=request.data,
            context={"request": request, "space": space},
        )
        serializer.is_valid(raise_exception=True)
        milestone = serializer.save(space=space, created_by_user_id=request.user.id)
        log_universe_event(
            space,
            request.user,
            "STORY_MILESTONE_CREATED",
            {"milestone_id": str(milestone.id), "entry_type": milestone.entry_type},
            request=request,
        )
        return Response(
            UniverseStoryMilestoneSerializer(
                milestone, context={"request": request, "space": space}
            ).data,
            status=status.HTTP_201_CREATED,
        )

    def patch(self, request, milestone_id=None):
        space = request.universe_space
        milestone = UniverseStoryMilestone.objects.filter(id=milestone_id, space=space).first()
        if not milestone:
            return Response({"detail": "Story milestone not found."}, status=status.HTTP_404_NOT_FOUND)

        is_owner = request.universe_member.role == UniverseMember.ROLE_OWNER
        payload_keys = set(request.data.keys())

        if not is_owner:
            if payload_keys != {"is_favorite"}:
                return Response(
                    {"detail": "Only the Universe Owner can edit story details."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            milestone.is_favorite = bool(request.data.get("is_favorite"))
            milestone.save(update_fields=["is_favorite", "updated_at"])
            return Response(
                UniverseStoryMilestoneSerializer(
                    milestone, context={"request": request, "space": space}
                ).data
            )

        serializer = UniverseStoryMilestoneSerializer(
            milestone,
            data=request.data,
            partial=True,
            context={"request": request, "space": space},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        log_universe_event(
            space,
            request.user,
            "STORY_MILESTONE_UPDATED",
            {"milestone_id": str(milestone.id)},
            request=request,
        )
        return Response(serializer.data)

    def delete(self, request, milestone_id=None):
        space = request.universe_space
        milestone = UniverseStoryMilestone.objects.filter(id=milestone_id, space=space).first()
        if not milestone:
            return Response({"detail": "Story milestone not found."}, status=status.HTTP_404_NOT_FOUND)
        milestone.delete()
        log_universe_event(
            space,
            request.user,
            "STORY_MILESTONE_DELETED",
            {"milestone_id": str(milestone_id)},
            request=request,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class UniverseStoryMilestoneUnlockView(APIView):
    """Unlocks a milestone's attached surprise note when the milestone itself is accessible."""
    authentication_classes = [UniverseJWTAuthentication]
    permission_classes = [IsAuthenticated, IsUniverseMember]

    def post(self, request, milestone_id=None):
        space = request.universe_space
        is_owner = request.universe_member.role == UniverseMember.ROLE_OWNER
        milestone = UniverseStoryMilestone.objects.filter(id=milestone_id, space=space).first()
        if not milestone:
            return Response({"detail": "Story milestone not found."}, status=status.HTTP_404_NOT_FOUND)
        if not is_owner and (not milestone.is_published or milestone.is_locked):
            return Response(
                {"detail": "This memory is locked or unpublished."},
                status=status.HTTP_403_FORBIDDEN,
            )

        interaction, stars_awarded = unlock_story_milestone(
            space, request.universe_member, milestone, request=request
        )
        return Response(
            {
                "unlocked_milestone_ids": interaction.unlocked_milestone_ids or [],
                "stars_awarded": stars_awarded,
                "surprise_note": milestone.surprise_note,
            }
        )


class UniverseStoryComparisonView(APIView):
    """OWNER-only CRUD for Then & Now photo comparisons."""
    authentication_classes = [UniverseJWTAuthentication]
    permission_classes = [IsAuthenticated, IsUniverseOwner]

    def post(self, request):
        space = request.universe_space
        ensure_story_seeded(space)
        serializer = UniverseStoryComparisonSerializer(
            data=request.data,
            context={"request": request, "space": space},
        )
        serializer.is_valid(raise_exception=True)
        comp = serializer.save(space=space)
        return Response(
            UniverseStoryComparisonSerializer(comp, context={"request": request, "space": space}).data,
            status=status.HTTP_201_CREATED,
        )

    def patch(self, request, comparison_id=None):
        space = request.universe_space
        comp = UniverseStoryComparison.objects.filter(id=comparison_id, space=space).first()
        if not comp:
            return Response({"detail": "Comparison not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = UniverseStoryComparisonSerializer(
            comp,
            data=request.data,
            partial=True,
            context={"request": request, "space": space},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, comparison_id=None):
        space = request.universe_space
        comp = UniverseStoryComparison.objects.filter(id=comparison_id, space=space).first()
        if not comp:
            return Response({"detail": "Comparison not found."}, status=status.HTTP_404_NOT_FOUND)
        comp.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class UniverseStorySpecialDateView(APIView):
    """OWNER-only CRUD for Special Dates & Anniversaries."""
    authentication_classes = [UniverseJWTAuthentication]
    permission_classes = [IsAuthenticated, IsUniverseOwner]

    def post(self, request):
        space = request.universe_space
        ensure_story_seeded(space)
        serializer = UniverseStorySpecialDateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        sd = serializer.save(space=space)
        return Response(
            UniverseStorySpecialDateSerializer(sd).data,
            status=status.HTTP_201_CREATED,
        )

    def patch(self, request, date_id=None):
        space = request.universe_space
        sd = UniverseStorySpecialDate.objects.filter(id=date_id, space=space).first()
        if not sd:
            return Response({"detail": "Special date not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = UniverseStorySpecialDateSerializer(sd, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, date_id=None):
        space = request.universe_space
        sd = UniverseStorySpecialDate.objects.filter(id=date_id, space=space).first()
        if not sd:
            return Response({"detail": "Special date not found."}, status=status.HTTP_404_NOT_FOUND)
        sd.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
