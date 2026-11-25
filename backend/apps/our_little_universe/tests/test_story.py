"""Story Hub Test Suite (Profile, Facts, Timeline, Our Firsts, RBAC)."""
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from core.models import User
from apps.our_little_universe.modules.welcome.services import bootstrap_universe_space
from apps.our_little_universe.modules.admin.services import provision_or_update_recipient


class OurLittleUniverseStoryTests(TestCase):
    databases = {"default", "universe"}

    def setUp(self):
        self.client = APIClient()
        self.owner = User(
            phone_number="olu-story-owner",
            email="storyowner@test.local",
            name="Story Owner",
            user_type="ADMIN",
            is_staff=True,
            is_active=True,
        )
        self.owner.set_password("OwnerSecret#123")
        self.owner.save()

        self.space = bootstrap_universe_space(self.owner, default_pin="4321")
        self.recipient_member = provision_or_update_recipient(
            space=self.space,
            actor=self.owner,
            email="storyrec@test.local",
            display_name="Story Reader",
            password="RecipientSecret#123",
            is_active=True,
        )
        self.recipient = User.objects.get(id=self.recipient_member.user_id)

    def test_story_hub_seeded_and_owner_right_drawer_crud(self):
        self.client.force_authenticate(user=self.owner)
        hub_resp = self.client.get(reverse("universe_story_hub"))
        self.assertEqual(hub_resp.status_code, status.HTTP_200_OK)
        self.assertTrue(hub_resp.data["can_edit"])
        self.assertGreaterEqual(len(hub_resp.data["milestones"]), 5)

        profile_resp = self.client.patch(
            reverse("universe_story_profile"),
            {
                "hero_title": "Our Dynamic Galaxy Story",
                "profile_facts": [
                    {"id": "f1", "label": "Tea Spot", "value": "Rooftop Cafe", "category": "Origin"}
                ],
            },
            format="json",
        )
        self.assertEqual(profile_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(profile_resp.data["hero_title"], "Our Dynamic Galaxy Story")
        self.assertEqual(len(profile_resp.data["profile_facts"]), 1)

        create_resp = self.client.post(
            reverse("universe_story_milestones"),
            {
                "entry_type": "first",
                "event_date": "2025-02-14",
                "badge": "Special",
                "title": "First Sunset Walk",
                "location": "Harborfront",
                "icon_name": "heart",
                "color_token": "purple",
            },
            format="json",
        )
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        ms_id = create_resp.data["id"]

        edit_resp = self.client.patch(
            reverse("universe_story_milestone_detail", args=[ms_id]),
            {"title": "First Golden Sunset Walk"},
            format="json",
        )
        self.assertEqual(edit_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(edit_resp.data["title"], "First Golden Sunset Walk")

        self.client.force_authenticate(user=self.recipient)
        rec_hub = self.client.get(reverse("universe_story_hub"))
        self.assertEqual(rec_hub.status_code, status.HTTP_200_OK)
        self.assertFalse(rec_hub.data["can_edit"])

        fav_resp = self.client.patch(
            reverse("universe_story_milestone_detail", args=[ms_id]),
            {"is_favorite": True},
            format="json",
        )
        self.assertEqual(fav_resp.status_code, status.HTTP_200_OK)
        self.assertTrue(fav_resp.data["is_favorite"])

        blocked_edit = self.client.patch(
            reverse("universe_story_milestone_detail", args=[ms_id]),
            {"title": "Tampered"},
            format="json",
        )
        self.assertEqual(blocked_edit.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.owner)
        del_resp = self.client.delete(reverse("universe_story_milestone_detail", args=[ms_id]))
        self.assertEqual(del_resp.status_code, status.HTTP_204_NO_CONTENT)

    def test_story_chapters_draft_isolation_locked_surprises_comparisons_and_dates(self):
        self.client.force_authenticate(user=self.owner)

        # Create published unlocked chapter + draft chapter + locked chapter
        ch_pub = self.client.post(
            reverse("universe_story_chapters"),
            {
                "chapter_number": 10,
                "title": "Published Chapter",
                "summary": "Shared memories chapter",
                "is_published": True,
                "is_locked": False,
                "surprise_title": "Chapter Key",
                "surprise_message": "Secret love letter",
                "surprise_stars": 5,
            },
            format="json",
        )
        self.assertEqual(ch_pub.status_code, status.HTTP_201_CREATED)
        ch_pub_id = ch_pub.data["id"]

        ch_draft = self.client.post(
            reverse("universe_story_chapters"),
            {
                "chapter_number": 11,
                "title": "Hidden Draft Chapter",
                "is_published": False,
            },
            format="json",
        )
        self.assertEqual(ch_draft.status_code, status.HTTP_201_CREATED)

        ch_locked = self.client.post(
            reverse("universe_story_chapters"),
            {
                "chapter_number": 12,
                "title": "Sealed Future Chapter",
                "summary": "Should be masked until unlocked",
                "is_published": True,
                "is_locked": True,
                "surprise_message": "Hidden chapter message",
            },
            format="json",
        )
        self.assertEqual(ch_locked.status_code, status.HTTP_201_CREATED)
        ch_locked_id = ch_locked.data["id"]

        # Create published milestone with surprise note + draft milestone + locked milestone
        ms_note = self.client.post(
            reverse("universe_story_milestones"),
            {
                "chapter_id": ch_pub_id,
                "entry_type": "timeline",
                "event_date": "2025-04-01",
                "title": "Rainy Walk",
                "is_published": True,
                "is_locked": False,
                "surprise_note": "You stole my umbrella!",
                "surprise_stars": 3,
            },
            format="json",
        )
        self.assertEqual(ms_note.status_code, status.HTTP_201_CREATED)
        ms_note_id = ms_note.data["id"]

        ms_draft = self.client.post(
            reverse("universe_story_milestones"),
            {
                "entry_type": "first",
                "event_date": "2025-04-02",
                "title": "Draft Only First",
                "is_published": False,
            },
            format="json",
        )
        self.assertEqual(ms_draft.status_code, status.HTTP_201_CREATED)

        ms_locked = self.client.post(
            reverse("universe_story_milestones"),
            {
                "entry_type": "timeline",
                "event_date": "2025-04-03",
                "title": "Sealed Future Note",
                "description": "Private secret text",
                "is_published": True,
                "is_locked": True,
            },
            format="json",
        )
        self.assertEqual(ms_locked.status_code, status.HTTP_201_CREATED)
        ms_locked_id = ms_locked.data["id"]

        # Comparisons & Special Dates CRUD
        comp_resp = self.client.post(
            reverse("universe_story_comparisons"),
            {
                "title": "Coffee Shop Bench",
                "then_label": "Day 1",
                "now_label": "Year 2",
                "is_published": True,
            },
            format="json",
        )
        self.assertEqual(comp_resp.status_code, status.HTTP_201_CREATED)

        date_resp = self.client.post(
            reverse("universe_story_special_dates"),
            {
                "title": "First Anniversary",
                "event_date": "2024-05-14",
                "category": "anniversary",
                "repeats_yearly": True,
                "is_published": True,
            },
            format="json",
        )
        self.assertEqual(date_resp.status_code, status.HTTP_201_CREATED)

        # Recipient isolation checks
        self.client.force_authenticate(user=self.recipient)
        rec_hub = self.client.get(reverse("universe_story_hub"))
        self.assertEqual(rec_hub.status_code, status.HTTP_200_OK)

        rec_ch_titles = [c["title"] for c in rec_hub.data["chapters"]]
        self.assertIn("Published Chapter", rec_ch_titles)
        self.assertNotIn("Hidden Draft Chapter", rec_ch_titles)
        locked_ch = next(c for c in rec_hub.data["chapters"] if c["id"] == ch_locked_id)
        self.assertEqual(locked_ch["summary"], "This story chapter is currently sealed by the Universe Owner.")
        self.assertEqual(locked_ch["surprise_message"], "")

        rec_ms_titles = [m["title"] for m in rec_hub.data["milestones"]]
        self.assertIn("Rainy Walk", rec_ms_titles)
        self.assertNotIn("Draft Only First", rec_ms_titles)
        locked_ms = next(m for m in rec_hub.data["milestones"] if m["id"] == ms_locked_id)
        self.assertEqual(locked_ms["description"], "")
        masked_note_ms = next(m for m in rec_hub.data["milestones"] if m["id"] == ms_note_id)
        self.assertFalse(masked_note_ms["surprise_revealed"])

        # Locked endpoints rejected with 403
        blocked_ch = self.client.post(reverse("universe_story_chapter_complete", args=[ch_locked_id]))
        self.assertEqual(blocked_ch.status_code, status.HTTP_403_FORBIDDEN)
        blocked_ms = self.client.post(reverse("universe_story_milestone_unlock", args=[ms_locked_id]))
        self.assertEqual(blocked_ms.status_code, status.HTTP_403_FORBIDDEN)

        # Idempotent chapter completion & surprise reveal
        done_first = self.client.post(reverse("universe_story_chapter_complete", args=[ch_pub_id]))
        self.assertEqual(done_first.status_code, status.HTTP_200_OK)
        self.assertIn(ch_pub_id, done_first.data["completed_chapter_ids"])
        self.assertEqual(done_first.data["stars_awarded"], 5)
        self.assertEqual(done_first.data["surprise_message"], "Secret love letter")

        done_repeat = self.client.post(reverse("universe_story_chapter_complete", args=[ch_pub_id]))
        self.assertEqual(done_repeat.status_code, status.HTTP_200_OK)
        self.assertEqual(done_repeat.data["stars_awarded"], 0)

        unlock_ms = self.client.post(reverse("universe_story_milestone_unlock", args=[ms_note_id]))
        self.assertEqual(unlock_ms.status_code, status.HTTP_200_OK)
        self.assertIn(ms_note_id, unlock_ms.data["unlocked_milestone_ids"])
        self.assertEqual(unlock_ms.data["surprise_note"], "You stole my umbrella!")
        self.assertEqual(unlock_ms.data["stars_awarded"], 3)

        rec_hub_after = self.client.get(reverse("universe_story_hub"))
        revealed_ms = next(m for m in rec_hub_after.data["milestones"] if m["id"] == ms_note_id)
        self.assertTrue(revealed_ms["surprise_revealed"])

        # Recipient cannot create comparisons or special dates
        blocked_comp = self.client.post(
            reverse("universe_story_comparisons"),
            {"title": "Illegal"},
            format="json",
        )
        self.assertEqual(blocked_comp.status_code, status.HTTP_403_FORBIDDEN)
