"""
Dashboard Widget Governance, Cross-Admin Role Sync & Multi-Tenant Config Tests.
Verifies:
1. Second Administrator profile & token payloads expose structured role + role_code/role_id.
2. Authenticated non-superadmin users can read /api/v1/roles/ even when app_role_management is locked.
3. DashboardWorkspaceConfigView persists Widget Role & Academy Scopes and Role Templates in PostgreSQL,
   enforces multi-tenant isolation, and blocks non-admin writes.
"""

from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from rest_framework import status

from core.models.iam import User, UserRole
from core.models.institutions import AcademicInstitution
from core.models.staff import StaffOnboardingToken, StaffProfile
from core.models.system import AppSection, AppSectionCategory, RoleSectionPermission


class DashboardGovernanceAndRoleSyncTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.role_super, _ = UserRole.objects.get_or_create(
            code="SUPER_ADMIN",
            defaults={"name": "Super Admin", "hierarchy_level": 1, "is_system_role": True},
        )
        self.role_admin, _ = UserRole.objects.get_or_create(
            code="ADMIN",
            defaults={"name": "Administrator", "hierarchy_level": 2, "is_system_role": False},
        )
        self.role_teacher, _ = UserRole.objects.get_or_create(
            code="TEACHER",
            defaults={"name": "Teacher", "hierarchy_level": 5, "is_system_role": False},
        )

        self.inst_alpha = AcademicInstitution.objects.create(
            name="Darus Salam Islamic School",
            slug="darus-salam-test",
            is_active=True,
        )
        self.inst_beta = AcademicInstitution.objects.create(
            name="Other Academy",
            slug="other-academy-test",
            is_active=True,
        )

        self.super_admin = User.objects.create_superuser(
            phone_number="01700000001",
            password="Password123!",
            user_type="SUPER_ADMIN",
            role=self.role_super,
        )
        self.second_admin = User.objects.create_user(
            phone_number="01700000002",
            password="Password123!",
            user_type="ADMIN",
            role=self.role_admin,
            institution=self.inst_alpha,
            is_staff=True,
        )
        self.teacher = User.objects.create_user(
            phone_number="01700000003",
            password="Password123!",
            user_type="TEACHER",
            role=self.role_teacher,
            institution=self.inst_alpha,
        )

    def test_second_admin_profile_and_token_expose_structured_role_and_flat_code(self):
        self.client.force_authenticate(user=self.second_admin)
        res = self.client.get("/api/v1/user/profile/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIsInstance(res.data["role"], dict)
        self.assertEqual(res.data["role"]["code"], "ADMIN")
        self.assertEqual(res.data["role_code"], "ADMIN")
        self.assertEqual(res.data["role_id"], self.role_admin.id)
        self.assertEqual(res.data["role_name"], "Administrator")
        self.assertTrue(res.data["is_academy_admin"])

        token_client = APIClient()
        token_res = token_client.post(
            "/api/v1/auth/token/",
            {"phone_number": "01700000002", "password": "Password123!"},
            format="json",
        )
        self.assertEqual(token_res.status_code, status.HTTP_200_OK)
        user_payload = token_res.data["user"]
        self.assertIsInstance(user_payload["role"], dict)
        self.assertEqual(user_payload["role"]["code"], "ADMIN")
        self.assertEqual(user_payload["role_code"], "ADMIN")
        self.assertEqual(user_payload["role_id"], self.role_admin.id)
        self.assertTrue(user_payload["is_academy_admin"])

    @override_settings(STRICT_FEATURE_FLAGS=True)
    def test_roles_read_allowed_even_when_role_management_section_disabled(self):
        cat, _ = AppSectionCategory.objects.get_or_create(key="APP_MGMT", defaults={"title": "App Management"})
        sec, _ = AppSection.objects.get_or_create(
            section_key="app_role_management",
            defaults={"category": cat, "title": "Role Management", "is_globally_enabled": True},
        )
        user_mgmt_sec, _ = AppSection.objects.get_or_create(
            section_key="app_user_management",
            defaults={"category": cat, "title": "User Management", "is_globally_enabled": True},
        )
        RoleSectionPermission.objects.update_or_create(
            section=sec, role="ADMIN", defaults={"is_enabled": False}
        )
        RoleSectionPermission.objects.update_or_create(
            section=user_mgmt_sec, role="ADMIN", defaults={"is_enabled": False}
        )

        # Authenticated non-superadmin Admin & Teacher can still read role catalog for dashboard headers
        self.client.force_authenticate(user=self.second_admin)
        get_res = self.client.get("/api/v1/roles/")
        self.assertEqual(get_res.status_code, status.HTTP_200_OK)
        codes = [r["code"] for r in get_res.data]
        self.assertIn("ADMIN", codes)

        # Write mutations stay strictly gated by HasSectionAccess & IsAdminUserRole
        post_res = self.client.post("/api/v1/roles/", {"name": "Blocked Role", "code": "BLOCKED"})
        self.assertEqual(post_res.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.teacher)
        teacher_get_res = self.client.get("/api/v1/roles/")
        self.assertEqual(teacher_get_res.status_code, status.HTTP_200_OK)
        teacher_post_res = self.client.post("/api/v1/roles/", {"name": "Teacher Blocked", "code": "TBLOCKED"})
        self.assertEqual(teacher_post_res.status_code, status.HTTP_403_FORBIDDEN)

    def test_cloud_workspace_template_sync_and_tenant_isolation(self):
        # 1. Super Admin configures ADMIN Default Template for Alpha Academy
        self.client.force_authenticate(user=self.super_admin)
        admin_template = [
            {"widgetId": "kpi_metrics", "order": 1, "colSpan": 4, "isVisible": True},
            {"widgetId": "attendance_pulse", "order": 2, "colSpan": 2, "isVisible": True},
        ]
        save_res = self.client.post(
            f"/api/v1/dashboard/config/?tenant_id={self.inst_alpha.id}",
            {
                "role_template": {"role": "ADMIN", "items": admin_template, "scope": "tenant"},
            },
            format="json",
        )
        self.assertEqual(save_res.status_code, status.HTTP_200_OK)
        self.assertNotIn("role_entitlements", save_res.data)
        self.assertNotIn("academy_overrides", save_res.data)

        # Save a separate template on inst_beta to verify tenant isolation
        beta_template = [
            {"widgetId": "kpi_metrics", "order": 1, "colSpan": 4, "isVisible": True},
        ]
        self.client.post(
            f"/api/v1/dashboard/config/?tenant_id={self.inst_beta.id}",
            {"role_template": {"role": "ADMIN", "items": beta_template, "scope": "tenant"}},
            format="json",
        )

        # 2. Second Admin (logged into inst_alpha from another browser/session) queries config
        self.client.force_authenticate(user=self.second_admin)
        # Even if passing inst_beta in query param, non-superadmin is locked to inst_alpha
        fetch_res = self.client.get(f"/api/v1/dashboard/config/?tenant_id={self.inst_beta.id}")
        self.assertEqual(fetch_res.status_code, status.HTTP_200_OK)
        self.assertEqual(fetch_res.data["tenant_id"], str(self.inst_alpha.id))
        self.assertEqual(fetch_res.data["role_templates"]["ADMIN"], admin_template)
        self.assertNotIn("role_entitlements", fetch_res.data)
        self.assertNotIn("academy_overrides", fetch_res.data)
        self.assertNotIn("all_academy_overrides", fetch_res.data)

        # 3. Teacher cannot mutate dashboard templates
        self.client.force_authenticate(user=self.teacher)
        teacher_forbidden = self.client.post(
            "/api/v1/dashboard/config/",
            {"role_template": {"role": "TEACHER", "items": [], "scope": "tenant"}},
            format="json",
        )
        self.assertEqual(teacher_forbidden.status_code, status.HTTP_403_FORBIDDEN)

    def test_role_endpoints_and_profile_exclude_legacy_action_permissions_and_hierarchy(self):
        self.client.force_authenticate(user=self.second_admin)
        profile_res = self.client.get("/api/v1/user/profile/")
        self.assertEqual(profile_res.status_code, status.HTTP_200_OK)
        self.assertNotIn("hierarchy_level", profile_res.data["role"])
        self.assertNotIn("action_permissions", profile_res.data["role"])

        roles_res = self.client.get("/api/v1/roles/")
        self.assertEqual(roles_res.status_code, status.HTTP_200_OK)
        self.assertGreater(len(roles_res.data), 0)
        for role_item in roles_res.data:
            self.assertNotIn("hierarchy_level", role_item)
            self.assertNotIn("action_permissions", role_item)

    @override_settings(STRICT_FEATURE_FLAGS=True)
    def test_dashboard_widgets_governed_by_feature_control_and_parent_cascade(self):
        from core.legacy_services import sync_feature_registry_to_db
        from core.models.system import AcademySectionOverride

        sync_feature_registry_to_db()

        # 1. Section tree exposes nav_dashboard as parent with grouped dashboard_widget_* children
        self.client.force_authenticate(user=self.super_admin)
        tree_res = self.client.get("/api/v1/admin/section-control/tree/")
        self.assertEqual(tree_res.status_code, status.HTTP_200_OK)

        nav_dashboard_node = None
        for cat in tree_res.data.get("categories", []):
            for sec in cat.get("sections", []):
                if sec.get("section_key") == "nav_dashboard":
                    nav_dashboard_node = sec
                    break

        self.assertIsNotNone(nav_dashboard_node)
        self.assertTrue(nav_dashboard_node["is_parent"])
        child_map = {c["section_key"]: c for c in nav_dashboard_node.get("children", [])}
        self.assertIn("dashboard_widget_kpi_metrics", child_map)
        self.assertIn("dashboard_widget_finance_overview", child_map)
        self.assertEqual(child_map["dashboard_widget_finance_overview"].get("widget_group"), "Operations, Finance & Notices")

        # 2. Disable dashboard_widget_finance_overview for ADMIN role & verify evaluation + Super Admin preview
        fin_widget_sec = AppSection.objects.get(section_key="dashboard_widget_finance_overview")
        RoleSectionPermission.objects.update_or_create(
            section=fin_widget_sec, role="ADMIN", defaults={"is_enabled": False}
        )

        # Alpha academy disables attendance_pulse widget via Academy override
        att_widget_sec = AppSection.objects.get(section_key="dashboard_widget_attendance_pulse")
        AcademySectionOverride.objects.update_or_create(
            section=att_widget_sec, institution=self.inst_alpha, defaults={"is_enabled": False}
        )

        self.client.force_authenticate(user=self.second_admin)
        admin_eval = self.client.get("/api/v1/section-control/evaluate/")
        self.assertEqual(admin_eval.status_code, status.HTTP_200_OK)
        self.assertFalse(admin_eval.data["flags"]["dashboard_widget_finance_overview"])
        self.assertFalse(admin_eval.data["flags"]["dashboard_widget_attendance_pulse"])
        self.assertTrue(admin_eval.data["flags"]["dashboard_widget_kpi_metrics"])

        # Non-superadmin cannot spoof preview_role=SUPER_ADMIN
        spoof_eval = self.client.get("/api/v1/section-control/evaluate/?preview_role=SUPER_ADMIN")
        self.assertEqual(spoof_eval.status_code, status.HTTP_200_OK)
        self.assertFalse(spoof_eval.data["flags"]["dashboard_widget_finance_overview"])

        # Super Admin previewing ADMIN in Alpha academy sees identical flags
        self.client.force_authenticate(user=self.super_admin)
        preview_eval = self.client.get(
            f"/api/v1/section-control/evaluate/?preview_role=ADMIN&preview_tenant_id={self.inst_alpha.id}"
        )
        self.assertEqual(preview_eval.status_code, status.HTTP_200_OK)
        self.assertFalse(preview_eval.data["flags"]["dashboard_widget_finance_overview"])
        self.assertFalse(preview_eval.data["flags"]["dashboard_widget_attendance_pulse"])
        self.assertTrue(preview_eval.data["flags"]["dashboard_widget_kpi_metrics"])

        # 3. Parent Cascade: disabling nav_dashboard for ADMIN disables ALL dashboard_widget_* children
        nav_dash_sec = AppSection.objects.get(section_key="nav_dashboard")
        RoleSectionPermission.objects.update_or_create(
            section=nav_dash_sec, role="ADMIN", defaults={"is_enabled": False}
        )
        self.client.force_authenticate(user=self.second_admin)
        cascaded_eval = self.client.get("/api/v1/section-control/evaluate/")
        self.assertEqual(cascaded_eval.status_code, status.HTTP_200_OK)
        self.assertFalse(cascaded_eval.data["flags"]["nav_dashboard"])
        self.assertFalse(cascaded_eval.data["flags"]["dashboard_widget_kpi_metrics"])

    @override_settings(STRICT_FEATURE_FLAGS=True)
    def test_global_default_and_super_admin_dashboard_widget_toggles(self):
        from core.legacy_services import sync_feature_registry_to_db

        sync_feature_registry_to_db()
        self.client.force_authenticate(user=self.super_admin)

        # 1. Turn OFF dashboard_widget_finance_overview in Global Defaults via batch update API
        global_res = self.client.post(
            "/api/v1/admin/section-control/update/",
            {
                "scope_type": "GLOBAL",
                "updates": [
                    {"section_key": "dashboard_widget_finance_overview", "is_enabled": False}
                ],
            },
            format="json",
        )
        self.assertEqual(global_res.status_code, status.HTTP_200_OK)

        # Verify Global Default OFF applies to Super Admin dashboard widgets too (while nav/system stays bypassed)
        super_eval = self.client.get("/api/v1/section-control/evaluate/")
        self.assertEqual(super_eval.status_code, status.HTTP_200_OK)
        self.assertFalse(super_eval.data["flags"]["dashboard_widget_finance_overview"])
        self.assertTrue(super_eval.data["flags"]["nav_dashboard"])
        self.assertTrue(super_eval.data["flags"]["app_section_control"])

        # Verify Global Default OFF is NOT overwritten by REGISTRY_DEFAULT for regular users (ADMIN / TEACHER)
        self.client.force_authenticate(user=self.second_admin)
        admin_eval = self.client.get("/api/v1/section-control/evaluate/")
        self.assertEqual(admin_eval.status_code, status.HTTP_200_OK)
        self.assertFalse(admin_eval.data["flags"]["dashboard_widget_finance_overview"])
        self.assertEqual(admin_eval.data["origins"]["dashboard_widget_finance_overview"], "GLOBAL")

        # 2. Verify Super Admin can also toggle a widget for SUPER_ADMIN or ADMIN role via Role Scopes
        self.client.force_authenticate(user=self.super_admin)
        role_res = self.client.post(
            "/api/v1/admin/section-control/update/",
            {
                "scope_type": "ROLE",
                "target_identifier": "ADMIN",
                "updates": [
                    {"section_key": "dashboard_widget_hifz_tracker", "is_enabled": False}
                ],
            },
            format="json",
        )
        self.assertEqual(role_res.status_code, status.HTTP_200_OK)

        # Super Admin previewing ADMIN immediately sees dashboard_widget_hifz_tracker disabled
        preview_admin = self.client.get("/api/v1/section-control/evaluate/?preview_role=ADMIN")
        self.assertEqual(preview_admin.status_code, status.HTTP_200_OK)
        self.assertFalse(preview_admin.data["flags"]["dashboard_widget_hifz_tracker"])
        self.assertTrue(preview_admin.data["flags"]["dashboard_widget_kpi_metrics"])

    def test_google_staff_onboarding_upgrades_role_and_replaces_dummy_phone(self):
        role_guardian, _ = UserRole.objects.get_or_create(
            code="GUARDIAN",
            defaults={"name": "Guardian", "hierarchy_level": 8, "is_system_role": False},
        )
        google_user = User.objects.create_user(
            phone_number="g_998877665544",
            password=None,
            email="google.faculty@example.com",
            user_type="GUARDIAN",
            role=role_guardian,
            is_staff=False,
        )
        token_obj = StaffOnboardingToken.objects.create(
            institution=self.inst_alpha,
            token="stf_googletest123",
            title="Hifz Faculty Recruitment 2026",
            staff_type="TEACHING",
            designation="Senior Hifz Ustad",
            created_by=self.super_admin,
        )

        self.client.force_authenticate(user=google_user)
        res = self.client.post(
            "/api/v1/staff-onboarding/apply/",
            {
                "token": token_obj.token,
                "name": "Mufti Abdur Rahman",
                "email": "google.faculty@example.com",
                "phone_number": "01799998888",
                "staff_type": "TEACHING",
                "designation": "Senior Hifz Ustad",
                "photo_url": "https://lh3.googleusercontent.com/a/faculty-avatar.png",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        google_user.refresh_from_db()
        self.assertEqual(google_user.phone_number, "01799998888")
        self.assertEqual(google_user.name, "Mufti Abdur Rahman")
        self.assertEqual(google_user.first_name, "Mufti")
        self.assertEqual(google_user.last_name, "Abdur Rahman")
        self.assertEqual(google_user.institution_id, self.inst_alpha.id)
        self.assertEqual(google_user.user_type, "TEACHER")
        self.assertIsNotNone(google_user.role)
        self.assertEqual(google_user.role.code, "TEACHER")
        self.assertTrue(google_user.is_staff)
        self.assertEqual(
            google_user.avatar_url,
            "https://lh3.googleusercontent.com/a/faculty-avatar.png",
        )
        self.assertTrue(
            StaffProfile.objects.filter(
                user=google_user, institution=self.inst_alpha
            ).exists()
        )

    def test_staff_onboarding_preserves_existing_admin_role(self):
        token_obj = StaffOnboardingToken.objects.create(
            institution=self.inst_alpha,
            token="stf_admintest456",
            title="Executive Leadership Onboarding",
            staff_type="ADMIN",
            designation="Managing Administrator",
            created_by=self.super_admin,
        )

        self.client.force_authenticate(user=self.second_admin)
        res = self.client.post(
            "/api/v1/staff-onboarding/apply/",
            {
                "token": token_obj.token,
                "name": "Atiqur Rahman",
                "email": "admin.second@example.com",
                "phone_number": "01755556666",
                "staff_type": "ADMIN",
                "designation": "Managing Administrator",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        self.second_admin.refresh_from_db()
        # Existing ADMIN role and authentic phone must never be downgraded or overwritten
        self.assertEqual(self.second_admin.user_type, "ADMIN")
        self.assertEqual(self.second_admin.role.code, "ADMIN")
        self.assertEqual(self.second_admin.phone_number, "01700000002")

    @override_settings(STRICT_FEATURE_FLAGS=True)
    def test_daily_progress_lookup_endpoints_readable_when_admin_crud_modules_disabled(self):
        from core.models.academy import ClassSection, StudentClass
        from core.models.students import Student
        from core.services import sync_feature_registry_to_db

        sync_feature_registry_to_db()

        cls_alpha = StudentClass.objects.create(
            institution=self.inst_alpha,
            name="Hifzul Quran",
            code="HQ-1",
        )
        cls_beta = StudentClass.objects.create(
            institution=self.inst_beta,
            name="Beta Class",
            code="BC-1",
        )
        sec_alpha = ClassSection.objects.create(
            student_class=cls_alpha,
            section_name="Morning Hifz",
            section_type="HIFZ_SECTION",
        )
        ClassSection.objects.create(
            student_class=cls_beta,
            section_name="Beta Section",
            section_type="GENERAL_SECTION",
        )
        Student.objects.create(
            institution=self.inst_alpha,
            name_en="Yasin Ahmad",
            student_class=cls_alpha,
            section=sec_alpha,
        )
        StaffProfile.objects.create(
            user=self.teacher,
            institution=self.inst_alpha,
            employee_id="EMP-ALPHA-001",
            staff_type="TEACHING",
            designation="Hifz Ustad",
        )

        # Turn OFF admin management pages for TEACHER while keeping Daily Progress active
        for key in (
            "student_classes",
            "classes_tab_groups",
            "student_roster",
            "staff_roster",
            "nav_staff_management",
        ):
            sec = AppSection.objects.get(section_key=key)
            RoleSectionPermission.objects.update_or_create(
                section=sec, role="TEACHER", defaults={"is_enabled": False}
            )
        for key in ("nav_academic_studies", "progress_management", "progress_tab_daily_progress"):
            sec = AppSection.objects.get(section_key=key)
            RoleSectionPermission.objects.update_or_create(
                section=sec, role="TEACHER", defaults={"is_enabled": True}
            )

        self.client.force_authenticate(user=self.teacher)
        cls_res = self.client.get("/api/v1/classes/")
        sec_res = self.client.get("/api/v1/academy/sections/")
        stu_res = self.client.get("/api/v1/students/")
        stf_res = self.client.get("/api/v1/staff/")

        self.assertEqual(cls_res.status_code, status.HTTP_200_OK)
        self.assertEqual(sec_res.status_code, status.HTTP_200_OK)
        self.assertEqual(stu_res.status_code, status.HTTP_200_OK)
        self.assertEqual(stf_res.status_code, status.HTTP_200_OK)

        cls_names = [row["name"] for row in (cls_res.data if isinstance(cls_res.data, list) else cls_res.data["results"])]
        sec_names = [row["section_name"] for row in (sec_res.data if isinstance(sec_res.data, list) else sec_res.data["results"])]
        stu_names = [row["name_en"] for row in (stu_res.data if isinstance(stu_res.data, list) else stu_res.data["results"])]
        stf_ids = [row["employee_id"] for row in (stf_res.data if isinstance(stf_res.data, list) else stf_res.data["results"])]

        self.assertEqual(cls_names, ["Hifzul Quran"])
        self.assertEqual(sec_names, ["Morning Hifz"])
        self.assertEqual(stu_names, ["Yasin Ahmad"])
        self.assertIn("EMP-ALPHA-001", stf_ids)

        # Write mutations stay strictly forbidden when admin CRUD modules are disabled
        write_cls = self.client.post("/api/v1/classes/", {"name": "Blocked Class"})
        write_stu = self.client.post("/api/v1/students/", {"name_en": "Blocked Student"})
        self.assertEqual(write_cls.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(write_stu.status_code, status.HTTP_403_FORBIDDEN)

        # Users with NO classroom consumer modules enabled must still be denied on lookups
        guardian_role, _ = UserRole.objects.get_or_create(
            code="GUARDIAN",
            defaults={"name": "Guardian", "hierarchy_level": 8, "is_system_role": False},
        )
        guardian_user = User.objects.create_user(
            phone_number="01700000099",
            password="Password123!",
            user_type="GUARDIAN",
            role=guardian_role,
            institution=self.inst_alpha,
        )
        for sec in AppSection.objects.filter(
            section_key__in=[
                "student_classes", "student_roster", "student_admission",
                "nav_academic_studies", "monthly_attendance_matrix",
                "lesson_management", "lesson_tab_daily_lessons", "lesson_tab_assessments", "lesson_tab_analytics",
                "progress_management", "progress_tab_daily_progress", "progress_tab_reports",
                "nav_examinations", "exam_schedules", "exam_hall_logistics", "exam_tabulation",
            ]
        ):
            RoleSectionPermission.objects.update_or_create(
                section=sec, role="GUARDIAN", defaults={"is_enabled": False}
            )
        self.client.force_authenticate(user=guardian_user)
        self.assertEqual(self.client.get("/api/v1/classes/").status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.get("/api/v1/students/").status_code, status.HTTP_403_FORBIDDEN)

    def test_sessions_are_shared_within_institution_and_platform_without_cross_tenant_leakage(self):
        from core.models.academy import Session

        beta_teacher = User.objects.create_user(
            phone_number="01700000044",
            password="Password123!",
            user_type="TEACHER",
            role=self.role_teacher,
            institution=self.inst_beta,
        )

        Session.objects.create(name="Parah Sabaq", created_by=self.super_admin)
        Session.objects.create(name="Sabqi", created_by=self.second_admin)
        Session.objects.create(name="Beta Only Session", created_by=beta_teacher)

        self.client.force_authenticate(user=self.teacher)
        res = self.client.get("/api/v1/sessions/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        rows = res.data if isinstance(res.data, list) else res.data.get("results", [])
        names = [item["name"] for item in rows]

        self.assertIn("Parah Sabaq", names)
        self.assertIn("Sabqi", names)
        self.assertNotIn("Beta Only Session", names)

        # Idempotent create when same accessible session name already exists
        dup_res = self.client.post("/api/v1/sessions/", {"name": "sabqi"}, format="json")
        self.assertEqual(dup_res.status_code, status.HTTP_200_OK)
        self.assertEqual(dup_res.data["name"], "Sabqi")


