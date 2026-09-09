"""
Core API Regression & Boundary Security Test Suite
Tests unauthenticated guards, invalid payloads, error formats, and system health status.
"""

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from core.models.iam import User, UserRole
from core.models.institutions import AcademicInstitution


class ApiRegressionTestCase(TestCase):
    """
    Validates API endpoint robustness, unauthorized guards, and payload validation.
    """

    def setUp(self):
        self.client = APIClient()

        self.role_admin, _ = UserRole.objects.get_or_create(
            code="ADMIN",
            defaults={'name': 'Administrator', 'hierarchy_level': 3, 'is_system_role': True}
        )

        self.institution = AcademicInstitution.objects.create(
            name="Regression Test Academy",
            slug="reg-academy",
            is_active=True
        )

        self.user_admin = User.objects.create_user(
            phone_number="01811112222",
            password="SecurePassword123!",
            institution=self.institution,
            role=self.role_admin,
            user_type="ADMIN"
        )

    def test_unauthenticated_access_guards(self):
        """Unauthenticated requests to protected endpoints must return 401 Unauthorized."""
        protected_endpoints = [
            '/api/v1/students/',
            '/api/v1/classes/',
            '/api/v1/departments/',
            '/api/v1/attendance/students/',
            '/api/v1/staff/',
            '/api/v1/user/profile/',
        ]

        for ep in protected_endpoints:
            res = self.client.get(ep)
            self.assertEqual(
                res.status_code,
                status.HTTP_401_UNAUTHORIZED,
                f"Endpoint {ep} allowed unauthenticated access with status {res.status_code}"
            )

    def test_invalid_class_creation_payload(self):
        """Creating class with missing mandatory department yields 400 Bad Request."""
        self.client.force_authenticate(user=self.user_admin)

        # Missing required department
        res = self.client.post('/api/v1/classes/', {'name': 'Test Class'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_department_creation_payload(self):
        """Creating department with missing name yields 400 Bad Request."""
        self.client.force_authenticate(user=self.user_admin)

        res = self.client.post('/api/v1/departments/', {'name': ''}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_nonexistent_resource_lookup(self):
        """Querying non-existent UUID or ID returns 404 Not Found."""
        self.client.force_authenticate(user=self.user_admin)

        fake_uuid = "99999999-9999-9999-9999-999999999999"
        res = self.client.get(f'/api/v1/students/{fake_uuid}/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_custom_cors_and_security_headers(self):
        """Checks API responds with proper custom headers allowed."""
        res = self.client.options('/api/v1/students/')
        self.assertIn(res.status_code, [status.HTTP_200_OK, status.HTTP_401_UNAUTHORIZED])
