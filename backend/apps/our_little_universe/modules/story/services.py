from django.db import transaction
from apps.our_little_universe.core.audit import log_universe_event
from apps.our_little_universe.models.foundation import UniverseMember, UniverseSpace
from apps.our_little_universe.models.story import (
    UniverseStoryChapter,
    UniverseStoryComparison,
    UniverseStoryInteraction,
    UniverseStoryMilestone,
    UniverseStoryProfile,
    UniverseStorySpecialDate,
)
from apps.our_little_universe.modules.welcome.services import ensure_progress_for_member

DEFAULT_STORY_FACTS = [
    {
        "id": "fact-met",
        "label": "Where We Met",
        "value": "Cafe Starlight by the window table",
        "category": "Origin",
        "icon_name": "map-pin",
    },
    {
        "id": "fact-ritual",
        "label": "Favorite Ritual",
        "value": "Late-night walks and sharing warm tea under the stars",
        "category": "Daily Magic",
        "icon_name": "sparkles",
    },
    {
        "id": "fact-song",
        "label": "Our Song",
        "value": "Starlight Lullaby",
        "category": "Soundtrack",
        "icon_name": "music",
    },
    {
        "id": "fact-dream",
        "label": "Next Shared Dream",
        "value": "Watching a meteor shower from a quiet mountain cabin",
        "category": "Future",
        "icon_name": "stars",
    },
]

DEFAULT_STORY_CHAPTERS = [
    {
        "chapter_number": 1,
        "title": "Chapter I: The Quiet Spark",
        "subtitle": "Two unfamiliar worlds gently crossing paths",
        "summary": "Every story begins with a moment that feels ordinary at first—until one conversation changes the rhythm of every day after.",
        "accent_token": "accent",
        "is_published": True,
        "is_locked": False,
        "surprise_title": "Chapter I Star",
        "surprise_message": "Thank you for walking into my life and making every ordinary day luminous.",
        "surprise_stars": 15,
        "sort_order": 1,
    },
    {
        "chapter_number": 2,
        "title": "Chapter II: Seasons Together",
        "subtitle": "Laughter in the rain, shared coffee, and small traditions",
        "summary": "From our very first walks to our quiet little jokes—every season added a warmer constellation to our sky.",
        "accent_token": "purple",
        "is_published": True,
        "is_locked": False,
        "surprise_title": "Chapter II Star",
        "surprise_message": "My favorite place in any room is still right next to you.",
        "surprise_stars": 15,
        "sort_order": 2,
    },
    {
        "chapter_number": 3,
        "title": "Chapter III: Horizons & Forever",
        "subtitle": "Promises written softly for the years ahead",
        "summary": "The finest chapters are still waiting ahead of us—ready to be lived slowly, side by side.",
        "accent_token": "sky",
        "is_published": True,
        "is_locked": False,
        "surprise_title": "Forever Note",
        "surprise_message": "Here is to every tomorrow we get to build hand in hand.",
        "surprise_stars": 20,
        "sort_order": 3,
    },
]

DEFAULT_STORY_MILESTONES = [
    {
        "entry_type": UniverseStoryMilestone.ENTRY_TIMELINE,
        "event_date": "2024-08-14",
        "badge": "Beginning",
        "title": "The First Hello",
        "subtitle": "Where everything quietly shifted",
        "location": "Cafe Starlight",
        "description": "The afternoon that felt like five minutes because every word felt effortless.",
        "icon_name": "sparkles",
        "color_token": "accent",
        "is_favorite": True,
        "is_published": True,
        "sort_order": 1,
        "chapter_number": 1,
    },
    {
        "entry_type": UniverseStoryMilestone.ENTRY_TIMELINE,
        "event_date": "2024-11-22",
        "badge": "Adventure",
        "title": "The Rainy Day Walk",
        "subtitle": "One small umbrella for two",
        "location": "Lakeside Park",
        "description": "Getting caught in an unexpected drizzle and laughing the whole walk home.",
        "icon_name": "flower",
        "color_token": "sky",
        "is_favorite": True,
        "is_published": True,
        "sort_order": 2,
        "chapter_number": 2,
    },
    {
        "entry_type": UniverseStoryMilestone.ENTRY_TIMELINE,
        "event_date": "2025-01-01",
        "badge": "Midnight Promise",
        "title": "New Year Stargazing",
        "subtitle": "Welcoming another year hand in hand",
        "location": "Rooftop Observatory",
        "description": "Counting constellations and making quiet wishes for every season ahead.",
        "icon_name": "stars",
        "color_token": "purple",
        "is_favorite": False,
        "is_published": True,
        "sort_order": 3,
        "chapter_number": 3,
    },
    {
        "entry_type": UniverseStoryMilestone.ENTRY_FIRST,
        "event_date": "2024-08-21",
        "badge": "First Coffee",
        "title": "Our First Long Coffee Date",
        "subtitle": "Two iced lattes and zero glance at the clock",
        "location": "Corner Roastery",
        "description": "We talked from late afternoon until the streetlamps turned golden outside.",
        "icon_name": "heart",
        "color_token": "accent",
        "is_favorite": True,
        "is_published": True,
        "sort_order": 1,
        "chapter_number": 1,
    },
    {
        "entry_type": UniverseStoryMilestone.ENTRY_FIRST,
        "event_date": "2024-10-09",
        "badge": "First Song",
        "title": "The Playlist We Shared",
        "subtitle": "Trading midnight tracks",
        "location": "Late Night Messages",
        "description": "The evening we built a shared soundtrack that still plays in the background.",
        "icon_name": "music",
        "color_token": "emerald",
        "is_favorite": False,
        "is_published": True,
        "sort_order": 2,
        "chapter_number": 2,
    },
    {
        "entry_type": UniverseStoryMilestone.ENTRY_FIRST,
        "event_date": "2024-12-18",
        "badge": "First Journey",
        "title": "Our First Sunset Train Ride",
        "subtitle": "Window seats and quiet horizons",
        "location": "Northern Line",
        "description": "Watching golden light fade across open fields while sharing headphones.",
        "icon_name": "calendar",
        "color_token": "amber",
        "is_favorite": True,
        "is_published": True,
        "sort_order": 3,
        "chapter_number": 2,
    },
]

DEFAULT_SPECIAL_DATES = [
    {
        "title": "The Day Our Story Began",
        "event_date": "2024-08-14",
        "category": UniverseStorySpecialDate.CAT_ANNIVERSARY,
        "notes": "Our annual celebration of the very first hello.",
        "repeats_yearly": True,
        "sort_order": 1,
    },
    {
        "title": "First Coffee Date Memory",
        "event_date": "2024-08-21",
        "category": UniverseStorySpecialDate.CAT_FIRST,
        "notes": "Corner Roastery window seat tradition.",
        "repeats_yearly": True,
        "sort_order": 2,
    },
    {
        "title": "New Year Under the Stars",
        "event_date": "2025-01-01",
        "category": UniverseStorySpecialDate.CAT_CELEBRATION,
        "notes": "Midnight wishes and shared resolutions.",
        "repeats_yearly": True,
        "sort_order": 3,
    },
]


@transaction.atomic(using="universe")
def ensure_story_seeded(space: UniverseSpace) -> UniverseStoryProfile:
    """Lazily seeds default Story Profile, Chapters, Timeline/Firsts & Special Dates in `universe` DB."""
    profile, _ = UniverseStoryProfile.objects.get_or_create(
        space=space,
        defaults={
            "hero_title": "Our Story Together",
            "hero_subtitle": "The unforgettable chapters, milestones, and firsts that built our universe.",
            "hero_badge": "Our Story Hub",
            "couple_names": f"For {space.recipient_name or 'My Favorite Person'}",
            "relationship_start_date": "2024-08-14",
            "meeting_place": "Cafe Starlight",
            "our_song_title": space.ambient_track_title or "Starlight Lullaby",
            "signature_quote": "Every ordinary day turned luminous the moment our paths crossed.",
            "beginning_eyebrow": "Our Beginning",
            "beginning_story": "Every beautiful story has a beginning. This is ours — a quiet afternoon conversation that slowly grew into our favorite sanctuary.",
            "profile_facts": DEFAULT_STORY_FACTS,
        },
    )

    chapter_map = {c.chapter_number: c for c in space.story_chapters.all()}
    if not chapter_map:
        created_chapters = [
            UniverseStoryChapter.objects.create(space=space, **ch)
            for ch in DEFAULT_STORY_CHAPTERS
        ]
        chapter_map = {c.chapter_number: c for c in created_chapters}

    if not space.story_milestones.exists():
        to_create = []
        for item in DEFAULT_STORY_MILESTONES:
            payload = dict(item)
            ch_num = payload.pop("chapter_number", 1)
            to_create.append(
                UniverseStoryMilestone(
                    space=space,
                    chapter=chapter_map.get(ch_num),
                    created_by_user_id=space.owner_user_id,
                    **payload,
                )
            )
        UniverseStoryMilestone.objects.bulk_create(to_create)

    if not space.story_special_dates.exists():
        UniverseStorySpecialDate.objects.bulk_create(
            [UniverseStorySpecialDate(space=space, **d) for d in DEFAULT_SPECIAL_DATES]
        )

    if not space.story_comparisons.exists():
        UniverseStoryComparison.objects.create(
            space=space,
            title="Then & Now — From Our First Day to Today",
            caption="Drag the slider across time to compare how far our story has traveled.",
            then_label="Then",
            now_label="Now",
            then_date="August 2024",
            now_date="Today",
            sort_order=1,
        )

    return profile


def ensure_story_interaction(space: UniverseSpace, user_id: int) -> UniverseStoryInteraction:
    interaction, _ = UniverseStoryInteraction.objects.get_or_create(
        space=space,
        user_id=user_id,
        defaults={
            "completed_chapter_ids": [],
            "unlocked_milestone_ids": [],
        },
    )
    return interaction


@transaction.atomic(using="universe")
def complete_story_chapter(
    space: UniverseSpace,
    member: UniverseMember,
    chapter: UniverseStoryChapter,
    request=None,
) -> tuple[UniverseStoryInteraction, int]:
    """Idempotently records chapter completion and awards chapter surprise stars once."""
    interaction = ensure_story_interaction(space, member.user_id)
    completed = list(interaction.completed_chapter_ids or [])
    ch_id = str(chapter.id)
    stars_awarded = 0

    if ch_id not in completed:
        completed.append(ch_id)
        interaction.completed_chapter_ids = completed
        interaction.save(update_fields=["completed_chapter_ids", "updated_at"])

        if chapter.surprise_stars > 0:
            progress = ensure_progress_for_member(member)
            progress.collected_stars += int(chapter.surprise_stars)
            progress.save(update_fields=["collected_stars", "updated_at"])
            stars_awarded = int(chapter.surprise_stars)

        log_universe_event(
            space,
            None,
            "STORY_CHAPTER_COMPLETED",
            {"chapter_id": ch_id, "title": chapter.title, "stars": stars_awarded},
            request=request,
        )

    return interaction, stars_awarded


@transaction.atomic(using="universe")
def unlock_story_milestone(
    space: UniverseSpace,
    member: UniverseMember,
    milestone: UniverseStoryMilestone,
    request=None,
) -> tuple[UniverseStoryInteraction, int]:
    """Idempotently unlocks a milestone surprise and awards optional bonus stars once."""
    interaction = ensure_story_interaction(space, member.user_id)
    unlocked = list(interaction.unlocked_milestone_ids or [])
    ms_id = str(milestone.id)
    stars_awarded = 0

    if ms_id not in unlocked:
        unlocked.append(ms_id)
        interaction.unlocked_milestone_ids = unlocked
        interaction.save(update_fields=["unlocked_milestone_ids", "updated_at"])

        if milestone.surprise_stars > 0:
            progress = ensure_progress_for_member(member)
            progress.collected_stars += int(milestone.surprise_stars)
            progress.save(update_fields=["collected_stars", "updated_at"])
            stars_awarded = int(milestone.surprise_stars)

        log_universe_event(
            space,
            None,
            "STORY_SURPRISE_UNLOCKED",
            {"milestone_id": ms_id, "title": milestone.title, "stars": stars_awarded},
            request=request,
        )

    return interaction, stars_awarded
