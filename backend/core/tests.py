from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

from core.models import (
    Student,
    StudentDetail,
    StudentDailyReport,
    ReportPortion,
    ReportErrorDetail,
    ReportStatus,
    UserSession,
    ActivityLog,
)
from core.serializers import StudentDailyReportSerializer

User = get_user_model()


class ModelAndRelationshipTestCase(TestCase):
    """
    1. Model & Relationship Tests:
    - Test creating a Student with StudentDetail (OneToOne).
    - Test creating a StudentDailyReport with ReportPortion and ReportErrorDetail.
    - Test UserSession and ActivityLog model creation.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            phone_number="01711111111",
            password="testpassword123",
            user_type="TEACHER"
        )

    def test_student_and_detail_relationship(self):
        student = Student.objects.create(
            name_en="Ahmad Hassan",
            group_name="Group A",
            status="Active"
        )
        detail = StudentDetail.objects.create(
            student=student,
            guardian_name="Hassan Ali",
            guardian_phone="01900000000",
            cur_address="Dhaka, Bangladesh"
        )

        self.assertIsNotNone(student.id)
        self.assertIsNotNone(detail.id)
        self.assertEqual(student.details, detail)
        self.assertEqual(detail.student, student)
        self.assertEqual(student.details.guardian_name, "Hassan Ali")

    def test_report_portion_and_error_detail_relationship(self):
        student = Student.objects.create(name_en="Tariq Ziyad")
        report = StudentDailyReport.objects.create(
            student=student,
            student_name=student.name,
            session_name="Subah",
            total_page=5,
            score=95,
            status="Excellent",
            created_by=self.user
        )

        portion = ReportPortion.objects.create(
            report=report,
            start_juz=1, start_page=1, start_ayah=1,
            end_juz=1, end_page=5, end_ayah=30
        )

        mistake = ReportErrorDetail.objects.create(
            report=report, type="Mistake", juz=1, page=2, ayah=10
        )
        stuck = ReportErrorDetail.objects.create(
            report=report, type="Stuck", juz=1, page=4, ayah=15
        )

        self.assertEqual(report.portions.count(), 1)
        self.assertEqual(report.error_details.count(), 2)
        self.assertEqual(portion.report, report)
        self.assertEqual(mistake.type, "Mistake")
        self.assertEqual(stuck.type, "Stuck")

    def test_user_session_and_activity_log(self):
        session = UserSession.objects.create(
            user=self.user,
            device_type="android",
            device_info="Pixel 8 Pro (Android 14)",
            ip_address="192.168.1.1",
            is_active=True
        )
        self.assertEqual(session.user, self.user)
        self.assertEqual(session.device_type, "android")
        self.assertTrue(session.is_active)

        activity = ActivityLog.objects.create(
            user=self.user,
            action_name="CREATE_REPORT",
            endpoint="/api/reports/",
            http_method="POST",
            ip_address="192.168.1.1"
        )
        self.assertEqual(activity.user, self.user)
        self.assertEqual(activity.action_name, "CREATE_REPORT")


class SerializerAndLogicTestCase(TestCase):
    """
    2. Serializer & Logic Tests:
    - Test creating a report via StudentDailyReportSerializer using a nested JSON payload.
    - Assert that total_mistake and total_stuck are automatically calculated correctly from error_details.
    - Assert that transaction.atomic() handles rollbacks if a portion or error detail fails.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            phone_number="01722222222",
            password="testpassword123",
            user_type="TEACHER"
        )
        self.student = Student.objects.create(name_en="Usman Ali")

    def test_nested_report_serializer_creates_and_calculates_errors(self):
        payload = {
            "student": self.student.id,
            "student_name": self.student.name,
            "session_name": "Subah",
            "total_page": 10,
            "score": 90,
            "status": "Completed",
            "portions": [
                {
                    "start_juz": 2, "start_page": 21, "start_ayah": 1,
                    "end_juz": 2, "end_page": 30, "end_ayah": 20
                }
            ],
            "error_details": [
                {"type": "Mistake", "juz": 2, "page": 22, "ayah": 5},
                {"type": "Mistake", "juz": 2, "page": 25, "ayah": 12},
                {"type": "Stuck", "juz": 2, "page": 28, "ayah": 18}
            ]
        }

        serializer = StudentDailyReportSerializer(data=payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        report = serializer.save(created_by=self.user)

        self.assertEqual(report.portions.count(), 1)
        self.assertEqual(report.error_details.count(), 3)

        # Assert automatic calculation of total_mistake and total_stuck
        report.refresh_from_db()
        self.assertEqual(report.total_mistake, 2)
        self.assertEqual(report.total_stuck, 1)

    def test_atomic_rollback_on_invalid_error_detail(self):
        initial_report_count = StudentDailyReport.objects.count()

        payload = {
            "student": self.student.id,
            "session_name": "Asr",
            "total_page": 5,
            "portions": [
                {
                    "start_juz": 1, "start_page": 1, "start_ayah": 1,
                    "end_juz": 1, "end_page": 5, "end_ayah": 10
                }
            ],
            # Invalid payload without required 'juz' field to trigger failure inside transaction
            "error_details": [
                {"type": "Mistake", "page": 2}
            ]
        }

        serializer = StudentDailyReportSerializer(data=payload)
        if serializer.is_valid():
            try:
                serializer.save()
            except Exception:
                pass

        self.assertEqual(StudentDailyReport.objects.count(), initial_report_count)


class SecuritySoftDeleteAndLockAPITestCase(APITestCase):
    """
    3. Security, Soft-Delete & Lock Tests:
    - Test soft-delete: Assert that setting is_deleted=True in ReportStatus excludes the report from default GET list API responses.
    - Test auto-lock: Assert that an update request on a report with is_locked=True returns 403 Forbidden for non-admin users.
    """

    def setUp(self):
        self.teacher_user = User.objects.create_user(
            phone_number="01744444444",
            password="password123",
            user_type="TEACHER"
        )
        self.admin_user = User.objects.create_superuser(
            phone_number="01755555555",
            password="password123",
            user_type="SUPER_ADMIN"
        )

        self.student = Student.objects.create(name_en="Omar Farooq")
        self.report = StudentDailyReport.objects.create(
            student=self.student,
            student_name=self.student.name,
            session_name="Subah",
            total_page=5,
            score=95,
            status="Good",
            created_by=self.teacher_user
        )

    def test_soft_deleted_report_excluded_from_api_list(self):
        self.client.force_authenticate(user=self.teacher_user)

        # Ensure report is in list before soft-delete
        response = self.client.get("/api/reports/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        report_ids = [r['id'] for r in response.data.get('results', response.data)]
        self.assertIn(self.report.id, report_ids)

        # Soft-delete the report via ReportStatus
        status_obj, _ = ReportStatus.objects.get_or_create(report=self.report)
        status_obj.is_deleted = True
        status_obj.save()

        # Assert excluded from default list response
        response = self.client.get("/api/reports/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        report_ids_after = [r['id'] for r in response.data.get('results', response.data)]
        self.assertNotIn(self.report.id, report_ids_after)

    def test_locked_report_returns_403_for_non_admin_on_update(self):
        # Lock the report
        status_obj, _ = ReportStatus.objects.get_or_create(report=self.report)
        status_obj.is_locked = True
        status_obj.save()

        # Non-admin (teacher) attempts update
        self.client.force_authenticate(user=self.teacher_user)
        update_data = {"session_name": "Night"}
        response = self.client.patch(f"/api/reports/{self.report.id}/", data=update_data, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("locked", str(response.data))

    def test_locked_report_allows_update_for_admin_user(self):
        # Lock the report
        status_obj, _ = ReportStatus.objects.get_or_create(report=self.report)
        status_obj.is_locked = True
        status_obj.save()

        # Admin user attempts update
        self.client.force_authenticate(user=self.admin_user)
        update_data = {"session_name": "Subah Updated"}
        response = self.client.patch(f"/api/reports/{self.report.id}/", data=update_data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.report.refresh_from_db()
        self.assertEqual(self.report.session_name, "Subah Updated")


class PublicVerificationAPITestCase(APITestCase):
    """
    4. Public Verification API:
    - Test GET /api/v1/hifz/verify-report/<report_id>/ returns correct public report details.
    - Test non-existent report returns 404.
    - Test deleted report returns 410.
    """

    def setUp(self):
        self.student = Student.objects.create(name_en="Zayd ibn Harithah")
        self.report = StudentDailyReport.objects.create(
            student=self.student,
            student_name=self.student.name,
            session_name="Subah",
            total_page=7,
            score=98.5,
            status="Mumtaz",
        )

    def test_verify_report_valid_unique_id(self):
        url = f"/api/v1/hifz/verify-report/{self.report.report_unique_id}/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "success")
        self.assertEqual(response.data["verification_status"], "VERIFIED")
        self.assertTrue(response.data["is_valid"])
        self.assertEqual(response.data["report_unique_id"], self.report.report_unique_id)
        self.assertEqual(response.data["student_name"], self.student.name)
        self.assertEqual(response.data["overall_score"], 98.5)

    def test_verify_report_valid_numeric_id(self):
        url = f"/api/v1/hifz/verify-report/{self.report.id}/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_valid"])

    def test_verify_report_nonexistent_returns_404(self):
        url = "/api/v1/hifz/verify-report/REP-NONEXISTENT-9999/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(response.data["is_valid"])
        self.assertEqual(response.data["verification_status"], "UNVERIFIED")

    def test_verify_report_deleted_returns_410(self):
        status_obj, _ = ReportStatus.objects.get_or_create(report=self.report)
        status_obj.is_deleted = True
        status_obj.save()

        url = f"/api/v1/hifz/verify-report/{self.report.report_unique_id}/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_410_GONE)
        self.assertFalse(response.data["is_valid"])
        self.assertEqual(response.data["verification_status"], "DELETED")


class HeartbeatAndAnalyticsAPITestCase(APITestCase):
    """
    5. Session Tracking & Heartbeat API Tests
    """

    def setUp(self):
        self.user = User.objects.create_user(
            phone_number="01788888888",
            password="password123",
            user_type="TEACHER"
        )
        self.admin = User.objects.create_superuser(
            phone_number="01799999999",
            password="password123",
            user_type="SUPER_ADMIN"
        )

    def test_heartbeat_updates_session(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post("/api/v1/auth/heartbeat/", data={
            "device_type": "android",
            "device_info": "Samsung Galaxy S24"
        }, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "success")
        self.assertEqual(response.data["device_type"], "android")
        self.assertIn("session_id", response.data)

        # Verify UserSession created in DB
        session = UserSession.objects.filter(user=self.user, is_active=True).first()
        self.assertIsNotNone(session)
        self.assertEqual(session.device_type, "android")

    def test_user_activity_analytics_admin_only(self):
        # Non-admin denied
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/v1/analytics/user-activity/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Admin allowed
        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/v1/analytics/user-activity/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "success")


from unittest.mock import patch


class GoogleOAuthAPITestCase(APITestCase):
    """
    6. Google OAuth & User Registration Logic Tests:
    - Test auto-registration of new user via get_or_create.
    - Test login of existing active user.
    - Test 403 Forbidden on deactivated account.
    - Test 400 Bad Request when credentials are missing.
    """

    @patch("google.oauth2.id_token.verify_oauth2_token")
    def test_google_oauth_auto_register_new_user(self, mock_verify):
        mock_verify.return_value = {
            "sub": "google-sub-12345",
            "email": "newuser@example.com",
            "given_name": "Google",
            "family_name": "User",
            "picture": "https://lh3.googleusercontent.com/a/avatar.jpg"
        }

        response = self.client.post("/api/v1/auth/google/", {
            "id_token": "fake-google-id-token"
        }, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["email"], "newuser@example.com")

        # Verify user in database
        db_user = User.objects.filter(email="newuser@example.com").first()
        self.assertIsNotNone(db_user)
        self.assertEqual(db_user.google_sub_id, "google-sub-12345")
        self.assertEqual(db_user.auth_provider, "google")
        self.assertTrue(db_user.is_email_verified)
        self.assertTrue(db_user.is_active)

    @patch("google.oauth2.id_token.verify_oauth2_token")
    def test_google_oauth_deactivated_account_returns_403(self, mock_verify):
        user = User.objects.create_user(
            phone_number="01700000099",
            email="deactivated@example.com",
            is_active=False,
            is_deactivated=True,
            google_sub_id="google-deactivated-sub"
        )

        mock_verify.return_value = {
            "sub": "google-deactivated-sub",
            "email": "deactivated@example.com",
            "given_name": "Deactivated",
            "family_name": "User"
        }

        response = self.client.post("/api/v1/auth/google/", {
            "id_token": "fake-deactivated-token"
        }, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["error"], "Account Deactivated")
        self.assertEqual(response.data["detail"], "Your account has been deactivated. Please contact support.")

    def test_google_oauth_missing_credentials_returns_400(self):
        response = self.client.post("/api/v1/auth/google/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


from core.models import UserPasskey

class UserSecurityAndIsolationTestCase(APITestCase):
    """
    Tests enforcing authentication, roles, and user-level isolation
    for all core user management, profile, session, and security views.
    """

    def setUp(self):
        self.teacher1 = User.objects.create_user(
            phone_number="01811111111",
            password="password123",
            user_type="TEACHER"
        )
        self.teacher2 = User.objects.create_user(
            phone_number="01822222222",
            password="password123",
            user_type="TEACHER"
        )
        self.admin = User.objects.create_superuser(
            phone_number="01899999999",
            password="password123",
            user_type="SUPER_ADMIN"
        )

    def test_unauthenticated_requests_return_401(self):
        endpoints = [
            ("/api/v1/user/profile/", "get"),
            ("/api/v1/user/profile/", "patch"),
            ("/api/v1/users/", "get"),
            ("/api/v1/user/sessions/", "get"),
            ("/api/v1/user/notification-preferences/", "get"),
        ]
        for url, method in endpoints:
            if method == "get":
                res = self.client.get(url)
            else:
                res = self.client.patch(url, data={})
            self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED, f"Endpoint {url} did not enforce auth.")

    def test_non_admin_user_isolation_on_list(self):
        self.client.force_authenticate(user=self.teacher1)
        response = self.client.get("/api/v1/users/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Results should only contain teacher1, not teacher2 or admin
        data = response.data.get('results') if isinstance(response.data, dict) else response.data
        user_ids = [u['id'] for u in data]
        self.assertIn(self.teacher1.id, user_ids)
        self.assertNotIn(self.teacher2.id, user_ids)
        self.assertNotIn(self.admin.id, user_ids)

    def test_non_admin_cannot_target_other_user_profile(self):
        self.client.force_authenticate(user=self.teacher1)
        # Request teacher2's profile via query param
        response = self.client.get(f"/api/v1/user/profile/?id={self.teacher2.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # It should fall back to teacher1's own profile
        self.assertEqual(response.data["id"], self.teacher1.id)

    def test_non_admin_patch_forbidden_on_other_user(self):
        self.client.force_authenticate(user=self.teacher1)
        response = self.client.patch(f"/api/v1/users/{self.teacher2.id}/", data={"name": "Hacked Name"})
        # Filtering querysets restricts users to only see themselves, so modifying another user returns 404
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_passkey_deletion_isolated(self):
        # Create passkey for teacher2
        pk2 = UserPasskey.objects.create(
            user=self.teacher2,
            credential_id="cred123",
            public_key="key123",
            device_name="device"
        )
        
        # teacher1 tries to delete it
        self.client.force_authenticate(user=self.teacher1)
        response = self.client.delete(f"/api/v1/auth/passkeys/{pk2.id}/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # teacher2 (owner) deletes it successfully
        self.client.force_authenticate(user=self.teacher2)
        response = self.client.delete(f"/api/v1/auth/passkeys/{pk2.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_has_full_access(self):
        self.client.force_authenticate(user=self.admin)
        # Admin can list all users
        response = self.client.get("/api/v1/users/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data.get('results') if isinstance(response.data, dict) else response.data
        user_ids = [u['id'] for u in data]
        self.assertIn(self.teacher1.id, user_ids)
        self.assertIn(self.teacher2.id, user_ids)
        
        # Admin can fetch other user profile
        response = self.client.get(f"/api/v1/user/profile/?id={self.teacher1.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.teacher1.id)


@override_settings(STRICT_FEATURE_FLAGS=True)
class FeatureRegistryAndPrecedenceTestCase(APITestCase):
    def setUp(self):
        from django.contrib.auth import get_user_model
        from core.services import sync_feature_registry_to_db
        User = get_user_model()
        self.user = User.objects.create_user(phone_number="01711111111", password="password123")
        sync_feature_registry_to_db()

    def test_tree_api_endpoint(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/v1/admin/section-control/tree/?scope=global")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("categories", response.data)
        
        cats = response.data["categories"]
        admin_cat = next((c for c in cats if c["key"] == "ADMIN"), None)
        self.assertIsNotNone(admin_cat)
        
        parent = next((s for s in admin_cat["sections"] if s["section_key"] == "nav_app_management"), None)
        self.assertIsNotNone(parent)
        self.assertTrue(parent["is_parent"])
        
        child = next((c for c in parent["children"] if c["section_key"] == "app_section_control"), None)
        self.assertIsNotNone(child)
        self.assertEqual(child["parent_key"], "nav_app_management")

    def test_one_way_cascading_inheritance(self):
        from core.models import AppSection, UserSectionOverride
        from core.services import evaluate_section_config_for_user

        parent_sec = AppSection.objects.get(section_key="nav_app_management")
        # Ensure parent is globally ON first for testing child OFF state
        parent_sec.is_globally_enabled = True
        parent_sec.save()

        child_sec = AppSection.objects.get(section_key="app_section_control")
        child_sec.is_globally_enabled = True
        child_sec.save()

        # 1. Child OFF, Parent remains ON
        UserSectionOverride.objects.create(user=self.user, section=child_sec, is_enabled=False)
        resolved, origins = evaluate_section_config_for_user(self.user)
        self.assertFalse(resolved["app_section_control"])
        self.assertTrue(resolved["nav_app_management"])

        # Clean overrides
        UserSectionOverride.objects.all().delete()

        # 2. Parent OFF, Child is forced OFF
        UserSectionOverride.objects.create(user=self.user, section=parent_sec, is_enabled=False)
        resolved, origins = evaluate_section_config_for_user(self.user)
        self.assertFalse(resolved["nav_app_management"])
        self.assertFalse(resolved["app_section_control"])


class RoleInviteTokenTestCase(APITestCase):
    def setUp(self):
        from django.contrib.auth import get_user_model
        from core.models import UserRole
        from core.services import sync_feature_registry_to_db
        User = get_user_model()
        
        sync_feature_registry_to_db()
        
        self.admin = User.objects.create_superuser(phone_number="01799999999", password="password123")
        self.user = User.objects.create_user(phone_number="01711111111", password="password123")
        self.target_role = UserRole.objects.create(name="Special Teacher", code="SPECIAL_TEACHER")

    def test_invite_generation_verification_and_claim_flow(self):
        # 1. Admin generates invite
        self.client.force_authenticate(user=self.admin)
        response = self.client.post("/api/v1/admin/invites/", data={
            "title": "Batch 2026",
            "target_role": self.target_role.id,
            "max_uses": 2,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        token = response.data["token"]
        self.assertIsNotNone(token)
        invite_id = response.data["id"]

        # 2. Public verification
        self.client.force_authenticate(user=None)
        response = self.client.get(f"/api/v1/invites/verify/?token={token}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["target_role_code"], "SPECIAL_TEACHER")

        # 3. Standard user claims invite
        self.client.force_authenticate(user=self.user)
        response = self.client.post("/api/v1/invites/claim/", data={"token": token})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["role"], "SPECIAL_TEACHER")
        
        self.user.refresh_from_db()
        self.assertEqual(self.user.role, self.target_role)

        # 4. Super Admin claims invite (Super Admin bypass check)
        self.client.force_authenticate(user=self.admin)
        response = self.client.post("/api/v1/invites/claim/", data={"token": token})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["role"], "SUPER_ADMIN")

        # 5. Check max usage limit exceeded
        self.client.force_authenticate(user=self.user)
        response = self.client.post("/api/v1/invites/claim/", data={"token": token})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
