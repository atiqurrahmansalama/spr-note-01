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


class Student360TestCase(APITestCase):
    def setUp(self):
        from django.contrib.auth import get_user_model
        from core.models import Student, StudentDetail, StudentGroup
        from core.services import sync_feature_registry_to_db
        User = get_user_model()
        sync_feature_registry_to_db()

        self.admin = User.objects.create_superuser(phone_number="01799999999", password="password123")
        self.client.force_authenticate(user=self.admin)

        self.student1 = Student.objects.create(name_en="Abdur Rahman", group_name="Hifz Group", status="Active", created_by=self.admin)
        self.student2 = Student.objects.create(name_en="Abdullah", group_name="General Group", status="Active", created_by=self.admin)
        StudentDetail.objects.create(student=self.student1, initial_completed_juz=5, created_by=self.admin)

    def test_student_metrics(self):
        response = self.client.get("/api/v1/students/metrics/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_students"], 2)
        self.assertEqual(response.data["active_students"], 2)
        self.assertEqual(response.data["avg_juz_completed"], 5.0)

    def test_bulk_actions(self):
        # 1. Bulk Assign Group
        response = self.client.post("/api/v1/students/bulk-action/", data={
            "action": "assign_group",
            "group_name": "New Hifz Halqa",
            "student_ids": [self.student1.id, self.student2.id]
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.student1.refresh_from_db()
        self.student2.refresh_from_db()
        self.assertEqual(self.student1.group_name, "New Hifz Halqa")
        self.assertEqual(self.student2.group_name, "New Hifz Halqa")

        # 2. Bulk Change Status
        response = self.client.post("/api/v1/students/bulk-action/", data={
            "action": "change_status",
            "status": "Alumni",
            "student_ids": [self.student1.id]
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.student1.refresh_from_db()
        self.assertEqual(self.student1.status, "Alumni")

        # 3. Bulk Delete (Soft-Delete)
        response = self.client.post("/api/v1/students/bulk-action/", data={
            "action": "bulk_delete",
            "student_ids": [self.student1.id, self.student2.id]
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        from core.models import Student
        self.assertEqual(Student.objects.filter(id__in=[self.student1.id, self.student2.id], is_deleted=False).count(), 0)

    def test_guardian_lookup_and_verification(self):
        from core.models import StudentGuardian
        StudentGuardian.objects.create(
            student=self.student1,
            father_name="Abu Hanifa",
            primary_guardian_phone="01711111111",
            created_by=self.admin
        )
        
        response = self.client.get("/api/v1/students/guardian-lookup/?phone=01711111111")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["guardian"]["father_name"], "Abu Hanifa")
        self.assertEqual(len(response.data["siblings"]), 1)
        self.assertEqual(response.data["siblings"][0]["id"], self.student1.id)
        
        # Assign a uniq_id to test verification
        self.student1.uniq_id = "STU-12345"
        self.student1.save()
        
        # Access verify-admission (unauthenticated)
        self.client.force_authenticate(user=None)
        response = self.client.get("/api/v1/students/verify-admission/STU-12345/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Abdur Rahman")


class ClassAndGroupManagementTestCase(APITestCase):
    """
    Comprehensive verification for:
    1. Soft-delete filtering (is_deleted=True items excluded from standard listings)
    2. Self-target prevention in migration endpoints (Guardrail 1)
    3. Atomic class migration on deletion (students, groups, and academic history)
    4. Atomic group migration on deletion (students and academic history)
    5. Single student academic transfer endpoint and chronological timelines
    6. Group & Class auto-sync and backward compatibility with group_name (Guardrails 2 & 3)
    """

    def setUp(self):
        from core.models import StudentClass, StudentGroup, Student, StudentAcademicHistory, UserRole
        
        self.admin_role = UserRole.objects.create(
            name="Super Admin",
            code="SUPER_ADMIN",
            hierarchy_level=1,
            is_system_role=True
        )
        self.admin = User.objects.create_superuser(
            phone_number="01888888888",
            password="adminpassword123",
            user_type="SUPER_ADMIN",
            role=self.admin_role
        )
        self.client.force_authenticate(user=self.admin)

        # Create Classes
        self.class_a = StudentClass.objects.create(
            name="Hifz Division Alpha",
            code="HIFZ-A",
            department_type="HIFZ",
            order_rank=1
        )
        self.class_b = StudentClass.objects.create(
            name="Hifz Division Beta",
            code="HIFZ-B",
            department_type="HIFZ",
            order_rank=2
        )

        # Create Groups
        self.group_1 = StudentGroup.objects.create(
            name="Halqa Abu Bakr",
            student_class=self.class_a,
            capacity=20,
            created_by=self.admin
        )
        self.group_2 = StudentGroup.objects.create(
            name="Halqa Umar",
            student_class=self.class_b,
            capacity=25,
            created_by=self.admin
        )

        # Create Students
        self.student_1 = Student.objects.create(
            name_en="Zaid ibn Harithah",
            student_class=self.class_a,
            student_group=self.group_1,
            group_name=self.group_1.name,
            created_by=self.admin
        )
        self.student_2 = Student.objects.create(
            name_en="Usama ibn Zaid",
            student_class=self.class_a,
            student_group=self.group_1,
            group_name=self.group_1.name,
            created_by=self.admin
        )

    def test_soft_delete_filtering(self):
        from core.models import StudentClass, StudentGroup, Student
        
        # Create a deleted class and group
        deleted_class = StudentClass.objects.create(
            name="Decommissioned Class",
            is_deleted=True,
            is_active=False
        )
        deleted_group = StudentGroup.objects.create(
            name="Decommissioned Group",
            is_deleted=True,
            is_active=False
        )

        # Query class listing
        res_class = self.client.get("/api/v1/classes/")
        self.assertEqual(res_class.status_code, status.HTTP_200_OK)
        class_ids = [c["id"] for c in res_class.data]
        self.assertIn(str(self.class_a.id), class_ids)
        self.assertNotIn(str(deleted_class.id), class_ids)

        # Query group listing
        res_group = self.client.get("/api/v1/groups/")
        self.assertEqual(res_group.status_code, status.HTTP_200_OK)
        group_ids = [g["id"] for g in res_group.data]
        self.assertIn(self.group_1.id, group_ids)
        self.assertNotIn(deleted_group.id, group_ids)

    def test_self_target_migration_prevention(self):
        """Guardrail 1: Enforces that destination cannot be the entity being deleted."""
        # Class self-target attempt
        res = self.client.post(f"/api/v1/classes/{self.class_a.id}/delete-with-migration/", data={
            "target_class_id": str(self.class_a.id)
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Self-Migration Prohibited", str(res.data))

        # Group self-target attempt
        res = self.client.post(f"/api/v1/groups/{self.group_1.id}/delete-with-migration/", data={
            "target_group_id": self.group_1.id
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Self-Migration Prohibited", str(res.data))

    def test_atomic_class_deletion_with_migration(self):
        from core.models import StudentClass, StudentGroup, Student, StudentAcademicHistory

        res = self.client.post(f"/api/v1/classes/{self.class_a.id}/delete-with-migration/", data={
            "target_class_id": str(self.class_b.id)
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["migrated_students"], 2)
        self.assertEqual(res.data["migrated_groups"], 1)

        # Verify source class is soft-deleted
        self.class_a.refresh_from_db()
        self.assertTrue(self.class_a.is_deleted)
        self.assertFalse(self.class_a.is_active)

        # Verify group moved to class_b
        self.group_1.refresh_from_db()
        self.assertEqual(self.group_1.student_class, self.class_b)

        # Verify students moved to class_b
        self.student_1.refresh_from_db()
        self.student_2.refresh_from_db()
        self.assertEqual(self.student_1.student_class, self.class_b)
        self.assertEqual(self.student_2.student_class, self.class_b)

        # Verify academic history updated
        active_hist = StudentAcademicHistory.objects.filter(student=self.student_1, is_current=True).first()
        self.assertIsNotNone(active_hist)
        self.assertEqual(active_hist.student_class, self.class_b)
        self.assertIn("Class Reassignment", active_hist.transition_reason)

        # Verify closed history exists
        closed_hist = StudentAcademicHistory.objects.filter(student=self.student_1, is_current=False).first()
        self.assertIsNotNone(closed_hist)
        self.assertIsNotNone(closed_hist.end_date)

    def test_atomic_group_deletion_with_migration(self):
        from core.models import StudentGroup, Student, StudentAcademicHistory

        res = self.client.post(f"/api/v1/groups/{self.group_1.id}/delete-with-migration/", data={
            "target_group_id": self.group_2.id
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["migrated_students"], 2)

        # Verify group_1 is soft-deleted
        self.group_1.refresh_from_db()
        self.assertTrue(self.group_1.is_deleted)
        self.assertFalse(self.group_1.is_active)

        # Verify students moved to group_2 and auto-synced class
        self.student_1.refresh_from_db()
        self.assertEqual(self.student_1.student_group, self.group_2)
        self.assertEqual(self.student_1.group_name, self.group_2.name)
        self.assertEqual(self.student_1.student_class, self.class_b)

        # Verify academic history
        active_hist = StudentAcademicHistory.objects.filter(student=self.student_1, is_current=True).first()
        self.assertIsNotNone(active_hist)
        self.assertEqual(active_hist.student_group, self.group_2)

    def test_individual_student_academic_transfer(self):
        from core.models import StudentAcademicHistory

        res = self.client.post(f"/api/v1/students/{self.student_1.id}/transfer-academic/", data={
            "target_class_id": str(self.class_b.id),
            "target_group_id": self.group_2.id,
            "transition_date": "2026-08-16",
            "transition_reason": "Annual Promotion & Advancement"
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        self.student_1.refresh_from_db()
        self.assertEqual(self.student_1.student_class, self.class_b)
        self.assertEqual(self.student_1.student_group, self.group_2)
        self.assertEqual(self.student_1.group_name, self.group_2.name)

        # Check history endpoint
        hist_res = self.client.get(f"/api/v1/students/{self.student_1.id}/academic-history/")
        self.assertEqual(hist_res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(hist_res.data), 2)
        current = [h for h in hist_res.data if h["is_current"]][0]
        self.assertEqual(current["student_class_name"], "Hifz Division Beta")
        self.assertEqual(current["student_group_name"], "Halqa Umar")
        self.assertEqual(current["transition_reason"], "Annual Promotion & Advancement")

    def test_auto_sync_and_backward_compatibility(self):
        """Guardrails 2 & 3: Student.save() auto-syncs group_name and class from group."""
        from core.models import Student

        # Creating student with group_name creates/links StudentGroup
        stu = Student.objects.create(
            name_en="Talha ibn Ubaydullah",
            group_name="Halqa Abu Bakr",
            created_by=self.admin
        )
        stu.refresh_from_db()
        self.assertIsNotNone(stu.student_group)
        self.assertEqual(stu.student_group.name, "Halqa Abu Bakr")
        self.assertEqual(stu.student_class, self.class_a)


class AcademicDepartmentManagementTestCase(APITestCase):
    def setUp(self):
        from core.models import User, AcademicDepartment, StudentClass, StudentGroup, Student, UserRole, RoleActionPermission, AppSectionCategory, AppSection, RoleSectionPermission

        self.admin = User.objects.create_user(
            phone_number="01711999888",
            password="StrongPassword123!",
            name="Super Admin",
            is_active=True,
            is_staff=True,
            is_superuser=True
        )
        self.client.force_authenticate(user=self.admin)

        # Create sample departments
        self.dept_hifz = AcademicDepartment.objects.create(
            name="Hifz Division",
            code="HIFZ",
            has_quran_tracker=True,
            order_rank=1
        )
        self.dept_general = AcademicDepartment.objects.create(
            name="General Academic",
            code="GEN",
            has_quran_tracker=False,
            order_rank=2
        )

        # Create classes under dept_hifz
        self.class_1 = StudentClass.objects.create(
            name="Hifz Class 1",
            code="H1",
            department=self.dept_hifz,
            department_type="HIFZ"
        )
        self.class_2 = StudentClass.objects.create(
            name="Hifz Class 2",
            code="H2",
            department=self.dept_hifz,
            department_type="HIFZ"
        )

    def test_department_crud_and_soft_delete_filter(self):
        from core.models import AcademicDepartment

        res = self.client.get("/api/v1/departments/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        items = res.data.get("results") if isinstance(res.data, dict) else res.data
        self.assertGreaterEqual(len(items), 2)

        # Create new department
        create_res = self.client.post("/api/v1/departments/", data={
            "name": "Noorani Division",
            "code": "NOOR",
            "has_quran_tracker": True,
            "order_rank": 4
        }, format='json')
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        new_id = create_res.data["id"]

        # Soft delete department without classes
        del_res = self.client.delete(f"/api/v1/departments/{new_id}/")
        self.assertEqual(del_res.status_code, status.HTTP_200_OK)

        # Verify not in active list
        list_res = self.client.get("/api/v1/departments/")
        active_items = list_res.data.get("results") if isinstance(list_res.data, dict) else list_res.data
        active_ids = [d["id"] for d in active_items]
        self.assertNotIn(new_id, active_ids)

    def test_department_self_migration_prevention(self):
        """Guardrail: Self-Target Prevention in department migration."""
        res = self.client.post(f"/api/v1/departments/{self.dept_hifz.id}/delete-with-migration/", data={
            "target_department_id": str(self.dept_hifz.id)
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("target_department_id", str(res.data))

    def test_atomic_department_decommission_with_class_migration(self):
        """Decommission department migrates all active classes to target department."""
        from core.models import StudentClass, AcademicDepartment

        res = self.client.post(f"/api/v1/departments/{self.dept_hifz.id}/delete-with-migration/", data={
            "target_department_id": str(self.dept_general.id)
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["migrated_classes"], 2)

        # Classes should now belong to dept_general
        self.class_1.refresh_from_db()
        self.class_2.refresh_from_db()
        self.assertEqual(self.class_1.department, self.dept_general)
        self.assertEqual(self.class_2.department, self.dept_general)

        # Source department should be soft-deleted
        self.dept_hifz.refresh_from_db()
        self.assertTrue(self.dept_hifz.is_deleted)
        self.assertFalse(self.dept_hifz.is_active)

    def test_department_destroy_blocked_with_active_classes(self):
        """Standard DELETE on department with active classes should reject."""
        res = self.client.delete(f"/api/v1/departments/{self.dept_hifz.id}/")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", res.data)

    def test_department_metrics_endpoint(self):
        res = self.client.get("/api/v1/departments/metrics/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("total_departments", res.data)
        self.assertIn("total_classes", res.data)
        self.assertIn("total_enrolled_students", res.data)


class AcademicInstitutionMultiTenantTestCase(APITestCase):
    """
    Enterprise Multi-Tenancy Architecture Tests:
    1. Tenant data isolation (User from Inst A cannot query records of Inst B).
    2. Self-service onboarding atomic transaction with validation guards.
    3. Super admin context switching via X-Tenant-ID header.
    """

    def setUp(self):
        from core.models import (
            AcademicInstitution, AcademicDepartment, StudentClass,
            StudentGroup, Student
        )

        # 1. Create Institution A
        self.inst_a = AcademicInstitution.objects.create(
            name="Madrasa Al-Hikmah",
            bangla_name="Madrasa Al-Hikmah",
            slug="al-hikmah",
            institution_type="MADRASA",
            phone="01710000001",
            district="Dhaka",
        )

        # 2. Create Institution B
        self.inst_b = AcademicInstitution.objects.create(
            name="Suffah Model Academy",
            bangla_name="Suffah Model Academy",
            slug="suffah-academy",
            institution_type="SCHOOL",
            phone="01710000002",
            district="Chittagong",
        )

        # 3. Create Admin Users for each tenant
        self.admin_a = User.objects.create_user(
            phone_number="01810000001",
            password="Password123!",
            name="Admin Hikmah",
            user_type="ADMIN",
            institution=self.inst_a,
        )

        self.admin_b = User.objects.create_user(
            phone_number="01810000002",
            password="Password123!",
            name="Admin Suffah",
            user_type="ADMIN",
            institution=self.inst_b,
        )

        # 4. Create Platform Super Admin
        self.super_admin = User.objects.create_user(
            phone_number="01999999999",
            password="SuperPassword123!",
            name="Platform Super Admin",
            user_type="SUPER_ADMIN",
            is_staff=True,
            is_superuser=True,
        )

        # 5. Populate Hierarchy for Institution A
        self.dept_a = AcademicDepartment.objects.create(
            institution=self.inst_a,
            name="Hifz Division A",
            code="HIFZ-A",
            has_quran_tracker=True,
        )
        self.class_a = StudentClass.objects.create(
            institution=self.inst_a,
            department=self.dept_a,
            name="Class A1",
            code="C-A1",
        )
        self.group_a = StudentGroup.objects.create(
            institution=self.inst_a,
            student_class=self.class_a,
            name="Halqa A1",
            capacity=15,
            created_by=self.admin_a,
        )
        self.student_a = Student.objects.create(
            institution=self.inst_a,
            student_class=self.class_a,
            student_group=self.group_a,
            name_en="Student Alpha",
            created_by=self.admin_a,
        )

        # 6. Populate Hierarchy for Institution B
        self.dept_b = AcademicDepartment.objects.create(
            institution=self.inst_b,
            name="General Division B",
            code="GEN-B",
            has_quran_tracker=False,
        )
        self.class_b = StudentClass.objects.create(
            institution=self.inst_b,
            department=self.dept_b,
            name="Class B1",
            code="C-B1",
        )
        self.group_b = StudentGroup.objects.create(
            institution=self.inst_b,
            student_class=self.class_b,
            name="Section B1",
            capacity=25,
            created_by=self.admin_b,
        )
        self.student_b = Student.objects.create(
            institution=self.inst_b,
            student_class=self.class_b,
            student_group=self.group_b,
            name_en="Student Beta",
            created_by=self.admin_b,
        )

    def _get_items(self, data):
        if isinstance(data, dict):
            return data.get("results", [])
        return data if isinstance(data, list) else []

    def test_tenant_data_isolation(self):
        """User from Institution A cannot view records of Institution B."""
        self.client.force_authenticate(user=self.admin_a)

        # Test Department isolation
        res_dept = self.client.get("/api/v1/departments/")
        self.assertEqual(res_dept.status_code, status.HTTP_200_OK)
        dept_ids = [str(d["id"]) for d in self._get_items(res_dept.data)]
        self.assertIn(str(self.dept_a.id), dept_ids)
        self.assertNotIn(str(self.dept_b.id), dept_ids)

        # Test Class isolation
        res_class = self.client.get("/api/v1/classes/")
        self.assertEqual(res_class.status_code, status.HTTP_200_OK)
        class_ids = [str(c["id"]) for c in self._get_items(res_class.data)]
        self.assertIn(str(self.class_a.id), class_ids)
        self.assertNotIn(str(self.class_b.id), class_ids)

        # Test Group isolation
        res_group = self.client.get("/api/v1/groups/")
        self.assertEqual(res_group.status_code, status.HTTP_200_OK)
        group_ids = [g["id"] for g in self._get_items(res_group.data)]
        self.assertIn(self.group_a.id, group_ids)
        self.assertNotIn(self.group_b.id, group_ids)

        # Test Student isolation
        res_student = self.client.get("/api/v1/students/")
        self.assertEqual(res_student.status_code, status.HTTP_200_OK)
        student_ids = [s["id"] for s in self._get_items(res_student.data)]
        self.assertIn(self.student_a.id, student_ids)
        self.assertNotIn(self.student_b.id, student_ids)

    def test_self_service_onboarding_atomic_transaction(self):
        """Self-service onboarding creates Institution, Admin User, and Presets in one atomic transaction."""
        from core.models import AcademicInstitution, AcademicDepartment

        payload = {
            "name": "Iqra International Madrasa",
            "bangla_name": "Iqra International Madrasa",
            "slug": "iqra-intl",
            "institution_type": "MADRASA",
            "phone": "01755555555",
            "district": "Sylhet",
            "admin_name": "Maulana Abdullah",
            "admin_phone": "01855555555",
            "admin_email": "abdullah@iqra.edu",
            "admin_password": "SecurePassword123!",
            "preset_type": "BOTH",
        }

        res = self.client.post("/api/v1/institutions/register/", data=payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        inst = AcademicInstitution.objects.get(slug="iqra-intl")
        self.assertEqual(inst.name, "Iqra International Madrasa")
        self.assertEqual(inst.district, "Sylhet")

        admin = User.objects.get(phone_number="01855555555")
        self.assertEqual(admin.name, "Maulana Abdullah")
        self.assertEqual(admin.institution, inst)
        self.assertEqual(admin.user_type, "ADMIN")
        self.assertTrue(admin.check_password("SecurePassword123!"))

        # Check departments seeded
        depts = AcademicDepartment.objects.filter(institution=inst)
        self.assertEqual(depts.count(), 3)
        self.assertTrue(depts.filter(code="HIFZ").exists())
        self.assertTrue(depts.filter(code="NAZERA").exists())
        self.assertTrue(depts.filter(code="GEN").exists())

        # Guardrail test: Duplicate phone number returns clean 400 Bad Request
        dup_payload = payload.copy()
        dup_payload["slug"] = "another-slug"
        res_dup = self.client.post("/api/v1/institutions/register/", data=dup_payload, format='json')
        self.assertEqual(res_dup.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("admin_phone", str(res_dup.data))

        # Guardrail test: Duplicate slug returns clean 400 Bad Request
        dup_slug_payload = payload.copy()
        dup_slug_payload["admin_phone"] = "01911112222"
        res_dup_slug = self.client.post("/api/v1/institutions/register/", data=dup_slug_payload, format='json')
        self.assertEqual(res_dup_slug.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("slug", str(res_dup_slug.data))

    def test_super_admin_context_switching_with_header(self):
        """SUPER_ADMIN can list all institutions and filter by X-Tenant-ID header."""
        self.client.force_authenticate(user=self.super_admin)

        # 1. Super admin can list all institutions
        res_insts = self.client.get("/api/v1/institutions/")
        self.assertEqual(res_insts.status_code, status.HTTP_200_OK)
        slugs = [i["slug"] for i in self._get_items(res_insts.data)]
        self.assertIn("al-hikmah", slugs)
        self.assertIn("suffah-academy", slugs)

        # 2. Super admin querying without header sees all students
        res_all_students = self.client.get("/api/v1/students/")
        self.assertEqual(res_all_students.status_code, status.HTTP_200_OK)
        all_ids = [s["id"] for s in self._get_items(res_all_students.data)]
        self.assertIn(self.student_a.id, all_ids)
        self.assertIn(self.student_b.id, all_ids)

        # 3. Super admin passing X-Tenant-ID for Institution A
        res_inst_a_students = self.client.get(
            "/api/v1/students/",
            HTTP_X_TENANT_ID=str(self.inst_a.id)
        )
        self.assertEqual(res_inst_a_students.status_code, status.HTTP_200_OK)
        inst_a_ids = [s["id"] for s in self._get_items(res_inst_a_students.data)]
        self.assertIn(self.student_a.id, inst_a_ids)
        self.assertNotIn(self.student_b.id, inst_a_ids)

        # 4. Super admin passing X-Tenant-ID for Institution B
        res_inst_b_students = self.client.get(
            "/api/v1/students/",
            HTTP_X_TENANT_ID=str(self.inst_b.id)
        )
        self.assertEqual(res_inst_b_students.status_code, status.HTTP_200_OK)
        inst_b_ids = [s["id"] for s in self._get_items(res_inst_b_students.data)]
        self.assertIn(self.student_b.id, inst_b_ids)
        self.assertNotIn(self.student_a.id, inst_b_ids)



