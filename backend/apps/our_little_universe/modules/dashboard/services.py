from datetime import date
from django.db import transaction
from django.utils import timezone
from apps.our_little_universe.core.audit import log_universe_event
from apps.our_little_universe.models.dashboard import (
    UniverseAchievement,
    UniverseDailySurprise,
)
from apps.our_little_universe.models.foundation import (
    UniverseMember,
    UniverseModuleRegistry,
    UniverseProgress,
    UniverseSpace,
)
from apps.our_little_universe.models.media import UniverseAccessAuditLog
from apps.our_little_universe.models.story import UniverseStoryMilestone


DEFAULT_DAILY_SURPRISES = [
    {
        "title": "A Quiet Reminder",
        "message": "No matter how busy today feels, you are always my favorite place to return to.",
        "surprise_type": UniverseDailySurprise.TYPE_NOTE,
        "reward_stars": 5,
        "action_route": "/story",
        "sort_order": 1,
    },
    {
        "title": "Constellation Gift",
        "message": "Look closely inside Our Story Timeline—every shared moment glows brighter when revisited.",
        "surprise_type": UniverseDailySurprise.TYPE_CLUE,
        "reward_stars": 8,
        "action_route": "/story",
        "sort_order": 2,
    },
    {
        "title": "Starlight Blessing",
        "message": "Collected five fresh constellation stars to illuminate another piece of our universe.",
        "surprise_type": UniverseDailySurprise.TYPE_REWARD,
        "reward_stars": 10,
        "action_route": "/dashboard",
        "sort_order": 3,
    },
]

DEFAULT_ACHIEVEMENTS = [
    {
        "achievement_key": "portal_awakened",
        "title": "Portal Awakened",
        "description": "Unsealed the Entrance & Welcome sanctuary for the first time.",
        "badge_label": "First Step",
        "icon_name": "sparkles",
        "points": 10,
        "rule_type": UniverseAchievement.RULE_ENTRY,
        "rule_target": 1,
        "sort_order": 1,
    },
    {
        "achievement_key": "first_daily_surprise",
        "title": "Morning Star Finder",
        "description": "Opened your very first Daily Surprise inside the Love Universe.",
        "badge_label": "Daily Gift",
        "icon_name": "gift",
        "points": 10,
        "rule_type": UniverseAchievement.RULE_SURPRISES,
        "rule_target": 1,
        "sort_order": 2,
    },
    {
        "achievement_key": "world_explorer",
        "title": "Galaxy Wanderer",
        "description": "Visited at least 3 distinct worlds across Our Little Universe.",
        "badge_label": "Explorer",
        "icon_name": "compass",
        "points": 15,
        "rule_type": UniverseAchievement.RULE_MODULES,
        "rule_target": 3,
        "sort_order": 3,
    },
    {
        "achievement_key": "story_keeper",
        "title": "Chronicle Keeper",
        "description": "Added or celebrated 5 chapters inside Our Story Hub.",
        "badge_label": "Storyteller",
        "icon_name": "book-open",
        "points": 20,
        "rule_type": UniverseAchievement.RULE_CHAPTERS,
        "rule_target": 5,
        "sort_order": 4,
    },
    {
        "achievement_key": "star_collector",
        "title": "Starlight Collector",
        "description": "Gathered 25 constellation stars across surprises and milestones.",
        "badge_label": "Luminous",
        "icon_name": "stars",
        "points": 25,
        "rule_type": UniverseAchievement.RULE_STARS,
        "rule_target": 25,
        "sort_order": 5,
    },
]


@transaction.atomic(using="universe")
def ensure_dashboard_seeded(space: UniverseSpace):
    """Idempotently seeds default Daily Surprises & Achievements once per space."""
    if not space.daily_surprises.exists():
        UniverseDailySurprise.objects.bulk_create(
            [UniverseDailySurprise(space=space, **item) for item in DEFAULT_DAILY_SURPRISES]
        )

    existing_keys = set(space.achievements.values_list("achievement_key", flat=True))
    missing = [
        UniverseAchievement(space=space, **item)
        for item in DEFAULT_ACHIEVEMENTS
        if item["achievement_key"] not in existing_keys
    ]
    if missing:
        UniverseAchievement.objects.bulk_create(missing)


def evaluate_achievements(space: UniverseSpace, progress: UniverseProgress) -> list:
    """
    Single source of truth for evaluating active achievements against DB progress.
    Awards achievement bonus stars once per unlocked key cleanly.
    """
    ensure_dashboard_seeded(space)
    achievements = list(space.achievements.filter(is_active=True).order_by("sort_order", "achievement_key"))

    completed = list(progress.completed_milestones or [])
    completed_set = set(completed)
    surprises_opened = sum(
        1 for key in (progress.unlocked_surprises or []) if isinstance(key, str) and key.startswith("daily:")
    )
    modules_visited = len(set(progress.unlocked_modules or []))
    story_chapters = UniverseStoryMilestone.objects.filter(space=space).count()

    bonus_stars = 0
    changed = False

    for ach in achievements:
        if ach.achievement_key in completed_set:
            continue

        earned = False
        if ach.rule_type == UniverseAchievement.RULE_ENTRY:
            earned = bool(progress.entry_unlocked)
        elif ach.rule_type == UniverseAchievement.RULE_STARS:
            earned = progress.collected_stars >= ach.rule_target
        elif ach.rule_type == UniverseAchievement.RULE_SURPRISES:
            earned = surprises_opened >= ach.rule_target
        elif ach.rule_type == UniverseAchievement.RULE_CHAPTERS:
            earned = story_chapters >= ach.rule_target
        elif ach.rule_type == UniverseAchievement.RULE_MODULES:
            earned = modules_visited >= ach.rule_target

        if earned:
            completed.append(ach.achievement_key)
            completed_set.add(ach.achievement_key)
            bonus_stars += int(ach.points or 0)
            changed = True

    if changed:
        progress.completed_milestones = completed
        progress.collected_stars = progress.collected_stars + bonus_stars
        progress.save(update_fields=["completed_milestones", "collected_stars", "updated_at"])

    return [
        {
            "id": str(ach.id),
            "achievement_key": ach.achievement_key,
            "title": ach.title,
            "description": ach.description,
            "badge_label": ach.badge_label,
            "icon_name": ach.icon_name,
            "points": ach.points,
            "rule_type": ach.rule_type,
            "rule_target": ach.rule_target,
            "unlocked": ach.achievement_key in completed_set,
        }
        for ach in achievements
    ]


def resolve_today_surprise(space: UniverseSpace, progress: UniverseProgress):
    """Deterministically picks today's active Daily Surprise and checks whether claimed today."""
    ensure_dashboard_seeded(space)
    today = timezone.localdate() if hasattr(timezone, "localdate") else date.today()
    today_key = f"daily:{today.isoformat()}"

    active_surprises = list(space.daily_surprises.filter(is_active=True).order_by("sort_order", "created_at"))
    if not active_surprises:
        return None, False, today.isoformat()

    scheduled = next((s for s in active_surprises if s.scheduled_date == today), None)
    selected = scheduled or active_surprises[today.toordinal() % len(active_surprises)]
    claimed = today_key in (progress.unlocked_surprises or [])
    return selected, claimed, today.isoformat()


@transaction.atomic(using="universe")
def claim_daily_surprise(space: UniverseSpace, progress: UniverseProgress, actor, request=None):
    surprise, claimed, today_iso = resolve_today_surprise(space, progress)
    if not surprise:
        return None, False, today_iso

    today_key = f"daily:{today_iso}"
    if not claimed:
        unlocked_list = list(progress.unlocked_surprises or [])
        unlocked_list.append(today_key)
        progress.unlocked_surprises = unlocked_list
        progress.collected_stars = progress.collected_stars + int(surprise.reward_stars or 0)
        progress.save(update_fields=["unlocked_surprises", "collected_stars", "updated_at"])
        log_universe_event(
            space,
            actor,
            "DAILY_SURPRISE_CLAIMED",
            {"surprise_id": str(surprise.id), "title": surprise.title, "stars": surprise.reward_stars},
            request=request,
        )
    return surprise, True, today_iso


def record_route_visit(space: UniverseSpace, member: UniverseMember, progress: UniverseProgress, route_path: str):
    """Records unlocked module exploration cleanly in DB progress."""
    matching_mod = UniverseModuleRegistry.objects.filter(
        space=space, route_path=route_path
    ).first()
    if matching_mod:
        if member.role != UniverseMember.ROLE_OWNER and (not matching_mod.is_enabled or matching_mod.is_locked):
            return False

        visited = list(progress.unlocked_modules or [])
        if matching_mod.module_key not in visited:
            visited.append(matching_mod.module_key)
            progress.unlocked_modules = visited

    progress.last_visited_route = route_path[:120]
    progress.save(update_fields=["last_visited_route", "unlocked_modules", "updated_at"])
    evaluate_achievements(space, progress)
    return True


def is_module_accessible(space: UniverseSpace, member: UniverseMember, module_key: str) -> bool:
    if member.role == UniverseMember.ROLE_OWNER:
        return True
    mod = UniverseModuleRegistry.objects.filter(space=space, module_key=module_key).first()
    if not mod:
        return False
    return bool(mod.is_enabled and not mod.is_locked)


def build_recent_activities(space: UniverseSpace, limit: int = 8) -> list:
    friendly_events = {
        "PRIVATE_LOGIN": "Entered the private universe",
        "PIN_VERIFIED": "Unsealed the Entrance & Welcome portal",
        "DAILY_SURPRISE_CLAIMED": "Opened a Daily Surprise",
        "STORY_MILESTONE_CREATED": "Added a new chapter to Our Story",
        "STORY_MILESTONE_UPDATED": "Updated a chapter in Our Story",
        "STORY_PROFILE_UPDATED": "Refreshed Couple Story details",
        "ADMIN_SPACE_UPDATED": "Customized universe atmosphere",
        "ADMIN_MODULE_UPDATED": "Updated universe planet registry",
        "PRIVATE_MEDIA_UPLOADED": "Added a keepsake to Private Vault",
    }
    logs = UniverseAccessAuditLog.objects.filter(
        space=space,
        event_type__in=list(friendly_events.keys()),
    ).order_by("-created_at")[:limit]

    return [
        {
            "id": str(log.id),
            "event_type": log.event_type,
            "label": friendly_events.get(log.event_type, log.event_type),
            "detail": log.detail or {},
            "created_at": log.created_at.isoformat(),
        }
        for log in logs
    ]
