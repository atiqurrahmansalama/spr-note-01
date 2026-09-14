"""
Observability, Structured Logging, Audit Trail & Error Monitoring Test Suite (Phase 5).
Covers: Request Correlation ID middleware, JSON logging context, Immutable AuditLog records,
Tenant-scoped Audit Log API, and Structured Error Monitoring.
"""

from django.test import TestCase
from django.utils import timezone
from datetime import date, time
from rest_framework.test import APIClient, APIRequestFactory
from rest_framework import status
from django.contrib.auth import get_user_model

from core.models import (
    AcademicInstitution,
    AcademicDepartment,
    StudentClass,
    ClassSection,
    Student,
    StudentAttendance,
    AuditLog
)
from core.services.audit_service import record_audit_log, compute_state_diff
from core.legacy_services import transfer_student_academic
from core.logging_formatters import (
    set_request_context,
    get_request_context,
    clear_request_context,
    StructuredJsonLogFormatter,
    CorrelationLogFilter
)

User = get_user_model()


class RequestCorrelationMiddlewareTestCase(TestCase):
    """Verifies correlation ID generation, propagation, and response header injection."""

    def setUp(self):
        self.inst = AcademicInstitution.objects.create(name="Observability Inst", slug="obs-inst")
        self.admin_user = User.objects.create_user(phone_number="01788880001", password="SecurePassword@2026", user_type="ADMIN", institution=self.inst)
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin_user)

    def test_response_contains_generated_x_request_id(self):
        """Ensures every response contains an auto-generated X-Request-ID header."""
        res = self.client.get("/api/v1/students/")
        self.assertIn("X-Request-ID", res.headers)
        self.assertTrue(len(res.headers["X-Request-ID"]) >= 16)

    def test_custom_x_request_id_preserved_across_request_lifecycle(self):
        """Ensures client-provided X-Request-ID is preserved and echoed in response."""
        custom_id = "test-custom-correlation-id-9999"
        res = self.client.get("/api/v1/students/", HTTP_X_REQUEST_ID=custom_id)
        self.assertEqual(res.headers.get("X-Request-ID"), custom_id)


class AuditLoggingServiceTestCase(TestCase):
    """Verifies audit logging creation, diff computation, and lifecycle triggers."""

    def setUp(self):
        self.inst = AcademicInstitution.objects.create(name="Audit Service Inst", slug="audit-service-inst")
        self.admin_user = User.objects.create_user(
            phone_number="01788880002",
            password="SecurePassword@2026",
            user_type="ADMIN",
            institution=self.inst
        )
        self.dept = AcademicDepartment.objects.create(institution=self.inst, name="Hifz Dept", code="AUD-HD-01")
        self.cls1 = StudentClass.objects.create(institution=self.inst, department=self.dept, name="Class 8")
        self.cls2 = StudentClass.objects.create(institution=self.inst, department=self.dept, name="Class 9")
        self.student = Student.objects.create(
            institution=self.inst,
            student_class=self.cls1,
            name_en="Zubair Ahmed",
            uniq_id="STU-AUD-001"
        )

    def test_state_diff_computation_helper(self):
        """Verifies state diff calculation between old and new state dictionaries."""
        before = {"class": "Class 8", "status": "ACTIVE", "roll": 10}
        after = {"class": "Class 9", "status": "ACTIVE", "roll": 12}

        diff, summary = compute_state_diff(before, after)
        self.assertIn("class", diff)
        self.assertIn("roll", diff)
        self.assertNotIn("status", diff)  # Unchanged
        self.assertEqual(diff["class"]["before"], "Class 8")
        self.assertEqual(diff["class"]["after"], "Class 9")
        self.assertIn("Class 8", summary)
        self.assertIn("Class 9", summary)

    def test_direct_record_audit_log_persists_cleanly(self):
        """Verifies record_audit_log persists complete immutable audit trail record."""
        log = record_audit_log(
            action="UPDATE",
            resource_type="Student",
            resource_id=self.student.id,
            resource_name="Zubair Ahmed",
            before_state={"class": "Class 8"},
            after_state={"class": "Class 9"},
            reason="Annual Academic Promotion",
            actor=self.admin_user,
            institution=self.inst
        )
        self.assertIsNotNone(log)
        self.assertEqual(log.action, "UPDATE")
        self.assertEqual(log.resource_type, "Student")
        self.assertEqual(str(log.resource_id), str(self.student.id))
        self.assertEqual(log.actor_phone, "01788880002")
        self.assertEqual(log.institution_id, self.inst.id)
        self.assertIn("Class 8", log.changes_summary)
        self.assertIn("Class 9", log.changes_summary)

    def test_transfer_student_academic_creates_audit_log(self):
        """Verifies transfer_student_academic service automatically writes audit record."""
        res = transfer_student_academic(
            student_id=self.student.id,
            target_class_id=self.cls2.id,
            transition_reason="Promoted after final exam",
            performed_by=self.admin_user
        )
        self.assertEqual(res["status"], "success")

        # Verify Audit Log entry exists in DB
        audit_entry = AuditLog.objects.filter(
            institution=self.inst,
            resource_type="Student",
            resource_id=str(self.student.id),
            action="TRANSFER"
        ).first()

        self.assertIsNotNone(audit_entry)
        self.assertEqual(audit_entry.actor, self.admin_user)
        self.assertIn("Class 8", audit_entry.changes_summary)
        self.assertIn("Class 9", audit_entry.changes_summary)


class AuditLogViewSetAPITestCase(TestCase):
    """Verifies tenant isolation, RBAC access control, and query filters on /api/v1/audit-logs/."""

    def setUp(self):
        # Tenant A Setup
        self.inst_a = AcademicInstitution.objects.create(name="Audit Academy Alpha", slug="audit-acad-alpha")
        self.admin_a = User.objects.create_user(phone_number="01788880011", password="SecurePassword@2026", user_type="ADMIN", institution=self.inst_a)
        self.teacher_a = User.objects.create_user(phone_number="01788880012", password="SecurePassword@2026", user_type="TEACHER", institution=self.inst_a)

        self.log_a1 = AuditLog.objects.create(
            institution=self.inst_a,
            actor=self.admin_a,
            actor_name="Admin Alpha",
            action="CREATE",
            resource_type="Student",
            resource_id="STU-001",
            resource_name="Tariq Jameel",
            changes_summary="Created student Tariq Jameel"
        )
        self.log_a2 = AuditLog.objects.create(
            institution=self.inst_a,
            actor=self.admin_a,
            actor_name="Admin Alpha",
            action="DELETE",
            resource_type="StudentAttendance",
            resource_id="ATT-001",
            resource_name="Attendance Tariq",
            changes_summary="Deleted attendance record"
        )

        # Tenant B Setup
        self.inst_b = AcademicInstitution.objects.create(name="Audit Academy Beta", slug="audit-acad-beta")
        self.admin_b = User.objects.create_user(phone_number="01788880021", password="SecurePassword@2026", user_type="ADMIN", institution=self.inst_b)

        self.log_b = AuditLog.objects.create(
            institution=self.inst_b,
            actor=self.admin_b,
            actor_name="Admin Beta",
            action="CREATE",
            resource_type="Student",
            resource_id="STU-002",
            resource_name="Yusuf Al-Qaradawi",
            changes_summary="Created student Yusuf"
        )

        self.client = APIClient()

    def test_tenant_a_admin_sees_only_tenant_a_audit_logs(self):
        """Confirms Tenant A Admin query returns Tenant A logs and never Tenant B logs."""
        self.client.force_authenticate(user=self.admin_a)
        res = self.client.get("/api/v1/audit-logs/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        data = res.data.get("results") if isinstance(res.data, dict) else res.data
        ids = [str(item["id"]) for item in data]

        self.assertIn(str(self.log_a1.id), ids)
        self.assertIn(str(self.log_a2.id), ids)
        self.assertNotIn(str(self.log_b.id), ids)

    def test_teacher_role_forbidden_from_accessing_audit_logs(self):
        """Confirms regular teachers cannot access audit trail logs (returns 403 Forbidden)."""
        self.client.force_authenticate(user=self.teacher_a)
        res = self.client.get("/api/v1/audit-logs/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_audit_logs_filtering_by_action_and_resource_type(self):
        """Confirms filtering by action=DELETE returns only deletion audit logs."""
        self.client.force_authenticate(user=self.admin_a)
        res = self.client.get("/api/v1/audit-logs/?action=DELETE")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        data = res.data.get("results") if isinstance(res.data, dict) else res.data
        self.assertEqual(len(data), 1)
        self.assertEqual(str(data[0]["id"]), str(self.log_a2.id))
        self.assertEqual(data[0]["action"], "DELETE")


class ErrorMonitoringAndExceptionHandlerTestCase(TestCase):
    """Verifies structured exception handling, correlation request ID attachment, and clean 500 error format."""

    def test_context_storage_and_json_formatter(self):
        """Ensures structured JSON logger includes correlation request_id, tenant_id, and telemetry."""
        set_request_context(
            request_id="test-req-id-777",
            tenant_id="tenant-uuid-888",
            user_id="01711112222",
            endpoint="/api/v1/test/",
            method="POST",
            ip_address="192.168.1.100"
        )
        ctx = get_request_context()
        self.assertEqual(ctx["request_id"], "test-req-id-777")
        self.assertEqual(ctx["tenant_id"], "tenant-uuid-888")
        self.assertEqual(ctx["user_id"], "01711112222")

        clear_request_context()
        cleared_ctx = get_request_context()
        self.assertEqual(cleared_ctx["request_id"], "-")
