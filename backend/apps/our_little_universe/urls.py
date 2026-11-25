"""
Our Little Universe — Aggregated Domain Routing Table (/api/v1/universe/).
Mirrors frontend module structure (auth, welcome, admin, story, media).
"""
from django.urls import path
from apps.our_little_universe.modules.auth.views import (
    UniversePrivateLoginView,
    UniverseLogoutView,
    UniverseMeView,
)
from apps.our_little_universe.modules.welcome.views import (
    UniverseWelcomeView,
    UniverseVerifyPinView,
    UniverseProgressView,
)
from apps.our_little_universe.modules.admin.views import (
    UniverseAdminSpaceView,
    UniverseAdminModulesView,
    UniverseAdminRecipientView,
    UniverseAdminMediaView,
    UniverseProtectedMediaStreamView,
)
from apps.our_little_universe.modules.story.views import (
    UniverseStoryHubView,
    UniverseStoryProfileUpdateView,
    UniverseStoryChapterView,
    UniverseStoryChapterCompleteView,
    UniverseStoryMilestoneView,
    UniverseStoryMilestoneUnlockView,
    UniverseStoryComparisonView,
    UniverseStorySpecialDateView,
)
from apps.our_little_universe.modules.dashboard.views import (
    UniverseDashboardView,
    UniverseClaimSurpriseView,
    UniverseAdminSurprisesView,
    UniverseAdminAchievementsView,
)

urlpatterns = [
    # Auth
    path("auth/login/", UniversePrivateLoginView.as_view(), name="universe_private_login"),
    path("auth/logout/", UniverseLogoutView.as_view(), name="universe_private_logout"),
    path("auth/me/", UniverseMeView.as_view(), name="universe_me"),

    # Welcome & Progress
    path("welcome/", UniverseWelcomeView.as_view(), name="universe_welcome"),
    path("welcome/verify-pin/", UniverseVerifyPinView.as_view(), name="universe_verify_pin"),
    path("progress/", UniverseProgressView.as_view(), name="universe_progress"),

    # Admin Foundation (OWNER-only)
    path("admin/space/", UniverseAdminSpaceView.as_view(), name="universe_admin_space"),
    path("admin/modules/", UniverseAdminModulesView.as_view(), name="universe_admin_modules"),
    path("admin/modules/<uuid:module_id>/", UniverseAdminModulesView.as_view(), name="universe_admin_module_detail"),
    path("admin/recipient/", UniverseAdminRecipientView.as_view(), name="universe_admin_recipient"),
    path("admin/media/", UniverseAdminMediaView.as_view(), name="universe_admin_media"),
    path("admin/media/<uuid:asset_id>/", UniverseAdminMediaView.as_view(), name="universe_admin_media_detail"),
    path("admin/surprises/", UniverseAdminSurprisesView.as_view(), name="universe_admin_surprises"),
    path("admin/surprises/<uuid:surprise_id>/", UniverseAdminSurprisesView.as_view(), name="universe_admin_surprise_detail"),
    path("admin/achievements/", UniverseAdminAchievementsView.as_view(), name="universe_admin_achievements"),
    path("admin/achievements/<uuid:achievement_id>/", UniverseAdminAchievementsView.as_view(), name="universe_admin_achievement_detail"),

    # Phase 03 — Love Universe Dashboard
    path("dashboard/", UniverseDashboardView.as_view(), name="universe_dashboard"),
    path("dashboard/claim-surprise/", UniverseClaimSurpriseView.as_view(), name="universe_claim_surprise"),

    # Phase 04 — Our Story Hub
    path("story/", UniverseStoryHubView.as_view(), name="universe_story_hub"),
    path("story/profile/", UniverseStoryProfileUpdateView.as_view(), name="universe_story_profile"),
    path("story/chapters/", UniverseStoryChapterView.as_view(), name="universe_story_chapters"),
    path("story/chapters/<uuid:chapter_id>/", UniverseStoryChapterView.as_view(), name="universe_story_chapter_detail"),
    path("story/chapters/<uuid:chapter_id>/complete/", UniverseStoryChapterCompleteView.as_view(), name="universe_story_chapter_complete"),
    path("story/milestones/", UniverseStoryMilestoneView.as_view(), name="universe_story_milestones"),
    path("story/milestones/<uuid:milestone_id>/", UniverseStoryMilestoneView.as_view(), name="universe_story_milestone_detail"),
    path("story/milestones/<uuid:milestone_id>/unlock/", UniverseStoryMilestoneUnlockView.as_view(), name="universe_story_milestone_unlock"),
    path("story/comparisons/", UniverseStoryComparisonView.as_view(), name="universe_story_comparisons"),
    path("story/comparisons/<uuid:comparison_id>/", UniverseStoryComparisonView.as_view(), name="universe_story_comparison_detail"),
    path("story/special-dates/", UniverseStorySpecialDateView.as_view(), name="universe_story_special_dates"),
    path("story/special-dates/<uuid:date_id>/", UniverseStorySpecialDateView.as_view(), name="universe_story_special_date_detail"),

    # Private Media Streaming
    path("media/<uuid:asset_id>/stream/", UniverseProtectedMediaStreamView.as_view(), name="universe_media_stream"),
]
