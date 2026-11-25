"""Foundation & Access Test Suite (Auth, RBAC, Welcome PIN, Admin, Private Media)."""
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from core.models import User
from apps.our_little_universe.models.foundation import UniverseProgress
from apps.our_little_universe.modules.welcome.services import bootstrap_universe_space
from apps.our_little_universe.modules.admin.services import provision_or_update_recipient


class OurLittleUniverseFoundationTests(TestCase):
    databases = {"default", "universe"}

    def setUp(self):
        self.client = APIClient()
        self.owner = User(
            phone_number="olu-test-owner",
            email="owner@test.local",
            name="Test Owner",
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
            email="recipient@test.local",
            display_name="Beloved Recipient",
            password="RecipientSecret#123",
            is_active=True,
        )
        self.recipient = User.objects.get(id=self.recipient_member.user_id)

        self.outsider = User(
            phone_number="olu-test-outsider",
            email="outsider@test.local",
            name="Outsider",
            is_active=True,
        )
        self.outsider.set_password("Outsider#123")
        self.outsider.save()

    def _login(self, identifier: str, password: str):
        return self.client.post(
            reverse("universe_private_login"),
            {"identifier": identifier, "password": password},
            format="json",
        )

    def test_private_login_blocks_outsider_and_allows_members(self):
        outsider_resp = self._login("outsider@test.local", "Outsider#123")
        self.assertEqual(outsider_resp.status_code, status.HTTP_403_FORBIDDEN)

        rec_resp = self._login("recipient@test.local", "RecipientSecret#123")
        self.assertEqual(rec_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(rec_resp.data["user"]["role"], "RECIPIENT")
        self.assertNotIn("secret_pin_hash", rec_resp.data["space"])

        owner_resp = self._login("owner@test.local", "OwnerSecret#123")
        self.assertEqual(owner_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(owner_resp.data["user"]["role"], "OWNER")

    def test_recipient_cannot_access_admin_endpoints(self):
        self.client.force_authenticate(user=self.recipient)
        resp = self.client.get(reverse("universe_admin_space"))
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

        mod_resp = self.client.get(reverse("universe_admin_modules"))
        self.assertEqual(mod_resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_server_side_pin_verification_and_progress_persistence(self):
        self.client.force_authenticate(user=self.recipient)

        bad = self.client.post(reverse("universe_verify_pin"), {"pin": "0000"}, format="json")
        self.assertEqual(bad.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(bad.data["verified"])

        good = self.client.post(reverse("universe_verify_pin"), {"pin": "4321"}, format="json")
        self.assertEqual(good.status_code, status.HTTP_200_OK)
        self.assertTrue(good.data["verified"])
        self.assertTrue(good.data["progress"]["entry_unlocked"])

        progress = UniverseProgress.objects.get(space=self.space, user_id=self.recipient.id)
        self.assertTrue(progress.entry_unlocked)
        self.assertIsNotNone(progress.pin_verified_at)

    def test_owner_can_update_space_and_modules(self):
        self.client.force_authenticate(user=self.owner)
        patch_resp = self.client.patch(
            reverse("universe_admin_space"),
            {
                "welcome_greeting": "Happy Anniversary My Love",
                "landing_eyebrow": "Open Your Gift",
                "landing_cta_label": "Unseal Now",
                "welcome_animation_enabled": False,
                "new_secret_pin": "9876",
            },
            format="json",
        )
        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_resp.data["welcome_greeting"], "Happy Anniversary My Love")
        self.assertEqual(patch_resp.data["landing_eyebrow"], "Open Your Gift")
        self.assertFalse(patch_resp.data["welcome_animation_enabled"])

        self.client.force_authenticate(user=self.recipient)
        welcome_resp = self.client.get(reverse("universe_welcome"))
        self.assertEqual(welcome_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(welcome_resp.data["space"]["landing_cta_label"], "Unseal Now")
        pin_resp = self.client.post(reverse("universe_verify_pin"), {"pin": "9876"}, format="json")
        self.assertEqual(pin_resp.status_code, status.HTTP_200_OK)

    def test_private_media_upload_and_authorized_stream(self):
        self.client.force_authenticate(user=self.owner)
        fake_img = SimpleUploadedFile("starlight.png", b"\x89PNG\r\n\x1a\n", content_type="image/png")
        upload_resp = self.client.post(
            reverse("universe_admin_media"),
            {"title": "Starlight Photo", "category": "welcome", "file": fake_img},
            format="multipart",
        )
        self.assertEqual(upload_resp.status_code, status.HTTP_201_CREATED)
        stream_url = upload_resp.data["stream_url"]
        asset_id = upload_resp.data["id"]

        anon_client = APIClient()
        no_auth_resp = anon_client.get(reverse("universe_media_stream", args=[asset_id]))
        self.assertEqual(no_auth_resp.status_code, status.HTTP_401_UNAUTHORIZED)

        signed_resp = anon_client.get(stream_url)
        self.assertEqual(signed_resp.status_code, status.HTTP_200_OK)
        signed_resp.close()

        self.client.force_authenticate(user=self.owner)
        del_resp = self.client.delete(reverse("universe_admin_media_detail", args=[asset_id]))
        self.assertEqual(del_resp.status_code, status.HTTP_204_NO_CONTENT)
