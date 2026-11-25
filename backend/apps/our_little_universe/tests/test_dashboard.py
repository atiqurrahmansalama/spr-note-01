"""Module 03 — Love Universe Dashboard Tests (Love Map, Surprises, Achievements, Module Lock Bypass)."""
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from core.models import User
from apps.our_little_universe.models.foundation import UniverseModuleRegistry
from apps.our_little_universe.modules.welcome.services import bootstrap_universe_space
from apps.our_little_universe.modules.admin.services import provision_or_update_recipient


class OurLittleUniverseDashboardTests(TestCase):
    databases = {"default", "universe"}

    def setUp(self):
        self.client = APIClient()
        self.owner = User(
            phone_number="olu-dash-owner",
            email="dashowner@test.local",
            name="Dash Owner",
            user_type="ADMIN",
            is_staff=True,
            is_active=True,
        )
        self.owner.set_password("OwnerSecret#123")
        self.owner.save()

        self.space = bootstrap_universe_space(self.owner, default_pin="1234")
        self.recipient_member = provision_or_update_recipient(
            space=self.space,
            actor=self.owner,
            email="dashrec@test.local",
            display_name="Dash Recipient",
            password="RecipientSecret#123",
            is_active=True,
        )
        self.recipient = User.objects.get(id=self.recipient_member.user_id)

    def test_dashboard_daily_surprise_claim_and_achievements_persist(self):
        self.client.force_authenticate(user=self.recipient)
        dash_resp = self.client.get(reverse("universe_dashboard"))
        self.assertEqual(dash_resp.status_code, status.HTTP_200_OK)
        self.assertFalse(dash_resp.data["daily_surprise"]["claimed_today"])
        self.assertIsNotNone(dash_resp.data["daily_surprise"]["item"])
        self.assertGreaterEqual(len(dash_resp.data["achievements"]), 5)

        initial_stars = dash_resp.data["progress"]["collected_stars"]
        reward = dash_resp.data["daily_surprise"]["item"]["reward_stars"]

        claim_resp = self.client.post(reverse("universe_claim_surprise"))
        self.assertEqual(claim_resp.status_code, status.HTTP_200_OK)
        self.assertTrue(claim_resp.data["claimed_today"])
        self.assertGreaterEqual(claim_resp.data["progress"]["collected_stars"], initial_stars + reward)

        # Claiming again same day is idempotent (no double star inflation)
        stars_after_first = claim_resp.data["progress"]["collected_stars"]
        claim_again = self.client.post(reverse("universe_claim_surprise"))
        self.assertEqual(claim_again.data["progress"]["collected_stars"], stars_after_first)

        # `first_daily_surprise` achievement should now be unlocked
        ach_map = {a["achievement_key"]: a for a in claim_again.data["achievements"]}
        self.assertTrue(ach_map["first_daily_surprise"]["unlocked"])

    def test_locked_module_cannot_be_bypassed_by_recipient(self):
        story_mod = UniverseModuleRegistry.objects.get(space=self.space, module_key="story")
        story_mod.is_locked = True
        story_mod.save(update_fields=["is_locked"])

        self.client.force_authenticate(user=self.recipient)
        story_resp = self.client.get(reverse("universe_story_hub"))
        self.assertEqual(story_resp.status_code, status.HTTP_403_FORBIDDEN)

        prog_resp = self.client.patch(
            reverse("universe_progress"),
            {"last_visited_route": "/story"},
            format="json",
        )
        self.assertEqual(prog_resp.status_code, status.HTTP_403_FORBIDDEN)

        # Owner can still access
        self.client.force_authenticate(user=self.owner)
        owner_resp = self.client.get(reverse("universe_story_hub"))
        self.assertEqual(owner_resp.status_code, status.HTTP_200_OK)

    def test_owner_can_manage_surprises_and_achievements(self):
        self.client.force_authenticate(user=self.owner)
        create_surp = self.client.post(
            reverse("universe_admin_surprises"),
            {
                "title": "Coffee Surprise",
                "message": "Iced latte waiting for you!",
                "surprise_type": "reward",
                "reward_stars": 15,
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(create_surp.status_code, status.HTTP_201_CREATED)

        create_ach = self.client.post(
            reverse("universe_admin_achievements"),
            {
                "achievement_key": "custom_dreamer",
                "title": "Dream Keeper",
                "description": "Added custom achievement from Admin.",
                "badge_label": "Dream",
                "icon_name": "stars",
                "points": 20,
                "rule_type": "stars_min",
                "rule_target": 5,
            },
            format="json",
        )
        self.assertEqual(create_ach.status_code, status.HTTP_201_CREATED)
