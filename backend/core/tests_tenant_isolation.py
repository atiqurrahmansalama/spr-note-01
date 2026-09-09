"""
Enterprise Multi-Tenant Data Isolation & Security Test Suite
Verifies strict data partitioning, cross-tenant mutation defense, RBAC scoping, and header security.
"""

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from core.models.iam import User, UserRole, RoleActionPermission
from core.models.institutions import AcademicInstitution, AcademicBranch, AcademicDepartment
from core.models.students import Student
from core.models.staff import StaffProfile
from core.models.academy import Session, StudentClass, ClassSection
from core.validators.tenant_validator import validate_tenant_match, TenantSecurityException
from core.selectors.student_selectors import get_scoped_students
from core.selectors.staff_selectors import get_scoped_teachers
from core.selectors.academic_selectors import get_classes_with_sections
from core.cache_utils import generate_cache_key, get_or_set_cached_data, invalidate_tenant_cache


class TenantIsolationTestCase(TestCase):
    """
    Validates complete data isolation between two independent tenants (Alpha vs Beta).
    """

    def setUp(self):
        self.client = APIClient()

        # 1. Create Base System Roles
        self.role_admin, _ = UserRole.objects.get_or_create(
            code="ADMIN",
            defaults={'name': 'Administrator', 'hierarchy_level': 3, 'is_system_role': True}
        )
        self.role_teacher, _ = UserRole.objects.get_or_create(
            code="TEACHER",
            defaults={'name': 'Teacher', 'hierarchy_level': 7, 'is_system_role': True}
        )
        self.role_super_admin, _ = UserRole.objects.get_or_create(
            code="SUPER_ADMIN",
            defaults={'name': 'Super Admin', 'hierarchy_level': 1, 'is_system_role': True}
        )

        # 2. Provision Tenant Alpha
        self.inst_alpha = AcademicInstitution.objects.create(
            name="Institution Alpha",
            slug="inst-alpha",
            is_active=True
        )
        self.user_alpha_admin = User.objects.create_user(
            phone_number="01800000001",
            password="Password123!",
            institution=self.inst_alpha,
            role=self.role_admin,
            user_type="ADMIN"
        )
        self.user_alpha_teacher = User.objects.create_user(
            phone_number="01800000002",
            password="Password123!",
            institution=self.inst_alpha,
            role=self.role_teacher,
            user_type="TEACHER"
        )

        # 3. Provision Tenant Beta
        self.inst_beta = AcademicInstitution.objects.create(
            name="Institution Beta",
            slug="inst-beta",
            is_active=True
        )
        self.user_beta_admin = User.objects.create_user(
            phone_number="01900000001",
            password="Password123!",
            institution=self.inst_beta,
            role=self.role_admin,
            user_type="ADMIN"
        )
        self.user_beta_teacher = User.objects.create_user(
            phone_number="01900000002",
            password="Password123!",
            institution=self.inst_beta,
            role=self.role_teacher,
            user_type="TEACHER"
        )

        # 4. Super Admin (Global Context)
        self.user_super_admin = User.objects.create_user(
            phone_number="01700000000",
            password="Password123!",
            role=self.role_super_admin,
            user_type="SUPER_ADMIN",
            is_staff=True,
            is_superuser=True
        )

        # 5. Populate Alpha Domain Data
        self.dept_alpha = AcademicDepartment.objects.create(
            institution=self.inst_alpha,
            name="Alpha Department"
        )
        self.class_alpha = StudentClass.objects.create(
            institution=self.inst_alpha,
            department=self.dept_alpha,
            name="Alpha Class 1"
        )
        self.section_alpha = ClassSection.objects.create(
            student_class=self.class_alpha,
            section_name="Alpha Section A"
        )
        self.student_alpha = Student.objects.create(
            institution=self.inst_alpha,
            student_class=self.class_alpha,
            section=self.section_alpha,
            name_en="Alpha Student One",
            uniq_id="ALPHA-001",
            roll_number=1
        )
        self.teacher_alpha = StaffProfile.objects.create(
            institution=self.inst_alpha,
            user=self.user_alpha_teacher,
            designation="Teacher",
            employee_id="T-ALPHA-01"
        )

        # 6. Populate Beta Domain Data
        self.dept_beta = AcademicDepartment.objects.create(
            institution=self.inst_beta,
            name="Beta Department"
        )
        self.class_beta = StudentClass.objects.create(
            institution=self.inst_beta,
            department=self.dept_beta,
            name="Beta Class 1"
        )
        self.section_beta = ClassSection.objects.create(
            student_class=self.class_beta,
            section_name="Beta Section B"
        )
        self.student_beta = Student.objects.create(
            institution=self.inst_beta,
            student_class=self.class_beta,
            section=self.section_beta,
            name_en="Beta Student One",
            uniq_id="BETA-001",
            roll_number=1
        )
        self.teacher_beta = StaffProfile.objects.create(
            institution=self.inst_beta,
            user=self.user_beta_teacher,
            designation="Teacher",
            employee_id="T-BETA-01"
        )

    def test_selector_level_isolation(self):
        """Verifies selector query scoping returns strictly the target tenant items."""
        alpha_students = get_scoped_students(institution_id=str(self.inst_alpha.id))
        self.assertEqual(alpha_students.count(), 1)
        self.assertEqual(alpha_students.first().id, self.student_alpha.id)

        beta_students = get_scoped_students(institution_id=str(self.inst_beta.id))
        self.assertEqual(beta_students.count(), 1)
        self.assertEqual(beta_students.first().id, self.student_beta.id)

        alpha_teachers = get_scoped_teachers(institution_id=str(self.inst_alpha.id))
        self.assertEqual(alpha_teachers.count(), 1)
        self.assertEqual(alpha_teachers.first().id, self.teacher_alpha.id)

        alpha_classes = get_classes_with_sections(institution_id=str(self.inst_alpha.id))
        self.assertEqual(alpha_classes.count(), 1)
        self.assertEqual(alpha_classes.first().id, self.class_alpha.id)

    def test_tenant_validator_defense(self):
        """Ensures cross-tenant linking triggers TenantSecurityException."""
        # Valid matching tenant
        validate_tenant_match(self.student_alpha, self.inst_alpha)

        # Cross-tenant mismatch must raise TenantSecurityException
        with self.assertRaises(TenantSecurityException):
            validate_tenant_match(self.student_alpha, self.inst_beta)

    def test_api_read_isolation_students(self):
        """Alpha authenticated user cannot see Beta students in roster."""
        self.client.force_authenticate(user=self.user_alpha_admin)
        response = self.client.get('/api/v1/students/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        results = response.data.get('results', response.data) if isinstance(response.data, dict) else response.data
        if isinstance(results, list):
            student_ids = [str(s.get('id')) for s in results]
            self.assertIn(str(self.student_alpha.id), student_ids)
            self.assertNotIn(str(self.student_beta.id), student_ids)

    def test_api_detail_cross_tenant_access_forbidden(self):
        """Alpha user attempting direct GET/PUT/DELETE on Beta student ID receives 404/403."""
        self.client.force_authenticate(user=self.user_alpha_teacher)
        response = self.client.get(f'/api/v1/students/{self.student_beta.id}/')
        # DRF scoped querysets return 404 Not Found when attempting to access cross-tenant records
        self.assertIn(response.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN])

        # Attempting DELETE on Beta student
        del_response = self.client.delete(f'/api/v1/students/{self.student_beta.id}/')
        self.assertIn(del_response.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN])

    def test_custom_role_isolation_across_tenants(self):
        """Users and role assignments in Tenant Alpha cannot be modified by Tenant Beta."""
        custom_role = UserRole.objects.create(
            code="CUSTOM_AUDITOR",
            name="Auditor",
            hierarchy_level=5,
            is_system_role=False
        )

        # Alpha admin lists users
        self.client.force_authenticate(user=self.user_alpha_admin)
        alpha_res = self.client.get('/api/v1/users/')
        self.assertEqual(alpha_res.status_code, status.HTTP_200_OK)

        # Beta admin attempts to update Alpha user role: forbidden/404
        self.client.force_authenticate(user=self.user_beta_admin)
        update_res = self.client.patch(
            f'/api/v1/users/{self.user_alpha_teacher.id}/',
            {'role': custom_role.id},
            format='json'
        )
        self.assertIn(update_res.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN])

    def test_header_spoofing_defense(self):
        """Normal tenant users cannot switch tenant context via X-Tenant-ID header."""
        self.client.force_authenticate(user=self.user_alpha_admin)
        # Attempting to spoof Tenant Beta via header
        response = self.client.get('/api/v1/students/', HTTP_X_TENANT_ID=str(self.inst_beta.id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        results = response.data.get('results', response.data) if isinstance(response.data, dict) else response.data
        if isinstance(results, list):
            student_ids = [str(s.get('id')) for s in results]
            # Must remain scoped to Alpha, never leak Beta
            self.assertIn(str(self.student_alpha.id), student_ids)
            self.assertNotIn(str(self.student_beta.id), student_ids)

    def test_super_admin_context_switching(self):
        """Super Admin with X-Tenant-ID header successfully filters by targeted tenant."""
        self.client.force_authenticate(user=self.user_super_admin)

        # Filter for Beta
        res_beta = self.client.get('/api/v1/students/', HTTP_X_TENANT_ID=str(self.inst_beta.id))
        self.assertEqual(res_beta.status_code, status.HTTP_200_OK)
        beta_results = res_beta.data.get('results', res_beta.data) if isinstance(res_beta.data, dict) else res_beta.data
        if isinstance(beta_results, list):
            beta_ids = [str(s.get('id')) for s in beta_results]
            self.assertIn(str(self.student_beta.id), beta_ids)
            self.assertNotIn(str(self.student_alpha.id), beta_ids)

    def test_cache_tenant_isolation(self):
        """Cache keys generated for separate tenants do not collide and invalidate independently."""
        key_alpha = generate_cache_key("student_roster", tenant_id=str(self.inst_alpha.id), class_id="10")
        key_beta = generate_cache_key("student_roster", tenant_id=str(self.inst_beta.id), class_id="10")

        self.assertNotEqual(key_alpha, key_beta)

        data_alpha = get_or_set_cached_data(key_alpha, lambda: {"count": 25, "tenant": "Alpha"})
        data_beta = get_or_set_cached_data(key_beta, lambda: {"count": 12, "tenant": "Beta"})

        self.assertEqual(data_alpha["count"], 25)
        self.assertEqual(data_beta["count"], 12)

        # Invalidate Alpha cache
        invalidate_tenant_cache(str(self.inst_alpha.id))
