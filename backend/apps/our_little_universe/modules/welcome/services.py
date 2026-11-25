from datetime import timedelta
from django.contrib.auth.hashers import check_password, make_password
from django.db import transaction
from django.utils import timezone
from core.models import User
from apps.our_little_universe.core.audit import log_universe_event
from apps.our_little_universe.models.foundation import (
    UniverseSpace,
    UniverseMember,
    UniverseModuleRegistry,
    UniverseProgress,
)

DEFAULT_MODULE_CATALOG = [
    {
        "module_key": "welcome",
        "title": "Entrance & Welcome",
        "subtitle": "Secret landing portal, PIN gate, and countdown",
        "route_path": "/welcome",
        "icon_name": "sparkles",
        "sort_order": 1,
        "is_enabled": True,
        "is_locked": False,
        "unlock_rule_type": UniverseModuleRegistry.UNLOCK_PIN,
        "badge_text": "Portal",
    },
    {
        "module_key": "dashboard",
        "title": "Love Universe Dashboard",
        "subtitle": "Interactive universe map, daily surprise, and journey tracker",
        "route_path": "/dashboard",
        "icon_name": "compass",
        "sort_order": 2,
        "is_enabled": True,
        "is_locked": False,
        "unlock_rule_type": UniverseModuleRegistry.UNLOCK_MANUAL,
        "badge_text": "Hub",
    },
    {
        "module_key": "story",
        "title": "Our Story",
        "subtitle": "Chronological timeline of milestones and our firsts",
        "route_path": "/story",
        "icon_name": "book-open",
        "sort_order": 3,
        "is_enabled": True,
        "is_locked": False,
        "unlock_rule_type": UniverseModuleRegistry.UNLOCK_MANUAL,
        "badge_text": "Phase 04",
    },
    {
        "module_key": "memories",
        "title": "Memory Museum",
        "subtitle": "Photo gallery, memory wall, and random memory discovery",
        "route_path": "/memories",
        "icon_name": "image",
        "sort_order": 4,
        "is_enabled": True,
        "is_locked": True,
        "unlock_rule_type": UniverseModuleRegistry.UNLOCK_MANUAL,
        "badge_text": "Phase 04",
    },
    {
        "module_key": "letters",
        "title": "Letters & Messages",
        "subtitle": "Animated envelopes, open-when letters, and voice notes",
        "route_path": "/letters",
        "icon_name": "mail",
        "sort_order": 5,
        "is_enabled": True,
        "is_locked": True,
        "unlock_rule_type": UniverseModuleRegistry.UNLOCK_MANUAL,
        "badge_text": "Phase 05",
    },
    {
        "module_key": "garden",
        "title": "Virtual Garden",
        "subtitle": "Interactive flowers, planting rituals, and bloom notes",
        "route_path": "/garden",
        "icon_name": "flower",
        "sort_order": 6,
        "is_enabled": False,
        "is_locked": True,
        "unlock_rule_type": UniverseModuleRegistry.UNLOCK_MANUAL,
        "badge_text": "Upcoming",
    },
    {
        "module_key": "games",
        "title": "Games & Activities",
        "subtitle": "Couple quiz, matching cards, and treasure hunts",
        "route_path": "/games",
        "icon_name": "gamepad",
        "sort_order": 7,
        "is_enabled": False,
        "is_locked": True,
        "unlock_rule_type": UniverseModuleRegistry.UNLOCK_MANUAL,
        "badge_text": "Upcoming",
    },
    {
        "module_key": "gifts",
        "title": "Digital Gifts",
        "subtitle": "Gift boxes, scratch cards, and mystery rewards",
        "route_path": "/gifts",
        "icon_name": "gift",
        "sort_order": 8,
        "is_enabled": False,
        "is_locked": True,
        "unlock_rule_type": UniverseModuleRegistry.UNLOCK_MANUAL,
        "badge_text": "Upcoming",
    },
    {
        "module_key": "secrets",
        "title": "Secret & Mystery",
        "subtitle": "Code-locked chambers, distributed clues, and easter eggs",
        "route_path": "/secrets",
        "icon_name": "lock",
        "sort_order": 9,
        "is_enabled": False,
        "is_locked": True,
        "unlock_rule_type": UniverseModuleRegistry.UNLOCK_CODE,
        "badge_text": "Upcoming",
    },
    {
        "module_key": "night-sky",
        "title": "Night Sky & Wishes",
        "subtitle": "Interactive constellations and starlit wishes",
        "route_path": "/night-sky",
        "icon_name": "stars",
        "sort_order": 10,
        "is_enabled": False,
        "is_locked": True,
        "unlock_rule_type": UniverseModuleRegistry.UNLOCK_MANUAL,
        "badge_text": "Upcoming",
    },
    {
        "module_key": "dreams",
        "title": "Dreams & Future",
        "subtitle": "Shared bucket list, future wishes, and milestones ahead",
        "route_path": "/dreams",
        "icon_name": "sparkles",
        "sort_order": 11,
        "is_enabled": False,
        "is_locked": True,
        "unlock_rule_type": UniverseModuleRegistry.UNLOCK_MANUAL,
        "badge_text": "Upcoming",
    },
]

MAX_PIN_ATTEMPTS = 5
PIN_LOCK_MINUTES = 2


def set_space_pin(space: UniverseSpace, raw_pin: str):
    cleaned = (raw_pin or "").strip()
    space.secret_pin_hash = make_password(cleaned) if cleaned else ""


def ensure_default_modules(space: UniverseSpace):
    for item in DEFAULT_MODULE_CATALOG:
        UniverseModuleRegistry.objects.get_or_create(
            space=space,
            module_key=item["module_key"],
            defaults={
                "title": item["title"],
                "subtitle": item["subtitle"],
                "route_path": item["route_path"],
                "icon_name": item["icon_name"],
                "sort_order": item["sort_order"],
                "is_enabled": item["is_enabled"],
                "is_locked": item["is_locked"],
                "unlock_rule_type": item["unlock_rule_type"],
                "badge_text": item["badge_text"],
            },
        )


def ensure_progress_for_member(member: UniverseMember) -> UniverseProgress:
    progress, _ = UniverseProgress.objects.get_or_create(
        space=member.space,
        user_id=member.user_id,
        defaults={
            "entry_unlocked": member.role == UniverseMember.ROLE_OWNER and not member.space.pin_enabled,
            "collected_stars": 0,
            "unlocked_modules": ["welcome", "dashboard"],
            "last_visited_route": "/welcome",
        },
    )
    return progress


@transaction.atomic(using="universe")
def bootstrap_universe_space(owner_user: User, default_pin: str = "1234") -> UniverseSpace:
    space = UniverseSpace.objects.filter(slug="our-little-universe").first()
    if not space:
        space = UniverseSpace.objects.create(
            slug="our-little-universe",
            title="Our Little Universe",
            subtitle="A private galaxy of our memories & stories",
            owner_user_id=owner_user.id,
            recipient_name="My Favorite Person",
            welcome_greeting="Welcome to Our Little Universe",
            welcome_subtitle="Every star is a memory. Every story is a piece of us.",
            countdown_title="Until Our Next Anniversary",
            special_date=timezone.now() + timedelta(days=30),
            pin_enabled=True,
            pin_hint="Our special 4-digit code",
            active_theme_id="velvet-rose",
        )
        set_space_pin(space, default_pin)
        space.save()

    owner_member, _ = UniverseMember.objects.get_or_create(
        space=space,
        user_id=owner_user.id,
        defaults={
            "role": UniverseMember.ROLE_OWNER,
            "display_name": owner_user.name or owner_user.email or "Universe Owner",
            "is_active": True,
        },
    )
    ensure_default_modules(space)
    ensure_progress_for_member(owner_member)
    return space


def verify_space_pin(space: UniverseSpace, progress: UniverseProgress, raw_pin: str, actor: User, request=None):
    now = timezone.now()
    if progress.pin_locked_until and progress.pin_locked_until > now:
        remaining = int((progress.pin_locked_until - now).total_seconds())
        return False, "PIN_LOCKED", max(remaining, 1)

    if not space.pin_enabled or not space.secret_pin_hash:
        progress.entry_unlocked = True
        progress.entry_unlocked_at = progress.entry_unlocked_at or now
        progress.pin_verified_at = now
        progress.failed_pin_attempts = 0
        progress.pin_locked_until = None
        progress.save(
            update_fields=[
                "entry_unlocked",
                "entry_unlocked_at",
                "pin_verified_at",
                "failed_pin_attempts",
                "pin_locked_until",
                "updated_at",
            ]
        )
        log_universe_event(space, actor, "ENTRY_UNLOCKED_DIRECT", {}, request=request)
        return True, None, 0

    candidate = (raw_pin or "").strip()
    if candidate and check_password(candidate, space.secret_pin_hash):
        progress.entry_unlocked = True
        progress.entry_unlocked_at = progress.entry_unlocked_at or now
        progress.pin_verified_at = now
        progress.failed_pin_attempts = 0
        progress.pin_locked_until = None
        progress.save(
            update_fields=[
                "entry_unlocked",
                "entry_unlocked_at",
                "pin_verified_at",
                "failed_pin_attempts",
                "pin_locked_until",
                "updated_at",
            ]
        )
        log_universe_event(space, actor, "PIN_VERIFIED", {}, request=request)
        return True, None, 0

    progress.failed_pin_attempts += 1
    if progress.failed_pin_attempts >= MAX_PIN_ATTEMPTS:
        progress.pin_locked_until = now + timedelta(minutes=PIN_LOCK_MINUTES)
        progress.failed_pin_attempts = 0
        progress.save(update_fields=["failed_pin_attempts", "pin_locked_until", "updated_at"])
        log_universe_event(space, actor, "PIN_LOCKED", {"reason": "too_many_attempts"}, request=request)
        return False, "PIN_LOCKED", PIN_LOCK_MINUTES * 60

    progress.save(update_fields=["failed_pin_attempts", "updated_at"])
    log_universe_event(
        space,
        actor,
        "PIN_FAILED",
        {"attempts": progress.failed_pin_attempts},
        request=request,
    )
    return False, "INVALID_PIN", 0
