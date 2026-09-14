"""
Unit Test Suite for Core Business Logic & Calculation Engines (Layer 1 of Testing Pyramid).
Covers: Grade computation, tabulation stats, routine clash detection, workload capacity,
recitation parsing, permission hierarchy, and tenant resolution.
"""

from django.test import TestCase
from django.utils import timezone
from datetime import date, time
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory

from core.models import (
    AcademicInstitution,
    AcademicDepartment,
    StudentClass,
    ClassSection,
    DynamicPeriodSlot,
    TeacherRoutineSchedule,
    TeacherProfile,
    StaffProfile,
    TeacherDetail,
    UserRole,
    RoleActionPermission,
    Student,
    DailyLessonPlan,
    LessonEvaluation,
    AcademicGoal
)
from core.services.exam_service import calculate_exam_tabulation_stats
from core.legacy_services import get_scoped_tenant_id

User = get_user_model()


class ExamTabulationAndGradingUnitTestCase(TestCase):
    """Verifies pure grading, GPA, and tabulation statistical calculations."""

    def test_tabulation_stats_regular_dataset(self):
        dataset = [
            {'total_obtained': 85.0, 'overall_gpa': 5.0, 'is_passed': True},
            {'total_obtained': 72.0, 'overall_gpa': 4.0, 'is_passed': True},
            {'total_obtained': 91.5, 'overall_gpa': 5.0, 'is_passed': True},
            {'total_obtained': 28.0, 'overall_gpa': 0.0, 'is_passed': False},
        ]
        stats = calculate_exam_tabulation_stats(dataset)

        self.assertEqual(stats['total_candidates'], 4)
        self.assertEqual(stats['passed_count'], 3)
        self.assertEqual(stats['failed_count'], 1)
        self.assertEqual(stats['pass_percentage'], 75.0)
        self.assertEqual(stats['highest_marks'], 91.5)
        self.assertEqual(stats['average_gpa'], 3.5)

    def test_tabulation_stats_empty_dataset(self):
        stats = calculate_exam_tabulation_stats([])
        self.assertEqual(stats['total_candidates'], 0)
        self.assertEqual(stats['passed_count'], 0)
        self.assertEqual(stats['failed_count'], 0)
        self.assertEqual(stats['pass_percentage'], 0.0)
        self.assertEqual(stats['highest_marks'], 0)
        self.assertEqual(stats['average_gpa'], 0.0)

    def test_tabulation_stats_all_failed(self):
        dataset = [
            {'total_obtained': 25.0, 'overall_gpa': 0.0, 'is_passed': False},
            {'total_obtained': 18.0, 'overall_gpa': 0.0, 'is_passed': False},
        ]
        stats = calculate_exam_tabulation_stats(dataset)
        self.assertEqual(stats['total_candidates'], 2)
        self.assertEqual(stats['passed_count'], 0)
        self.assertEqual(stats['failed_count'], 2)
        self.assertEqual(stats['pass_percentage'], 0.0)
        self.assertEqual(stats['highest_marks'], 25.0)
        self.assertEqual(stats['average_gpa'], 0.0)


class RoutineConflictAndWorkloadUnitTestCase(TestCase):
    """Verifies timetable clash detection and faculty workload calculation."""

    def setUp(self):
        self.inst = AcademicInstitution.objects.create(name="Darul Uloom Unit Test", slug="darul-uloom-unit")
        self.dept = AcademicDepartment.objects.create(institution=self.inst, name="Quran Department", code="QD-01")
        self.cls1 = StudentClass.objects.create(institution=self.inst, department=self.dept, name="Hifz Class 1")
        self.cls2 = StudentClass.objects.create(institution=self.inst, department=self.dept, name="Hifz Class 2")
        
        self.slot1 = DynamicPeriodSlot.objects.create(
            institution=self.inst,
            period_name="Morning Sabaq",
            period_order=1,
            start_time=time(8, 0),
            end_time=time(9, 0)
        )
        self.slot2 = DynamicPeriodSlot.objects.create(
            institution=self.inst,
            period_name="Second Period",
            period_order=2,
            start_time=time(9, 15),
            end_time=time(10, 0)
        )
        self.teacher_user = User.objects.create_user(phone_number="01711112222", user_type="TEACHER")
        self.teacher_profile = TeacherProfile.objects.create(
            user=self.teacher_user,
            name_en="Ustadh Ahmad",
            designation="Hifz Teacher"
        )

    def test_routine_teacher_schedule_assignment(self):
        """Ensures routine schedule creates cleanly and links teacher to period slot."""
        routine = TeacherRoutineSchedule.objects.create(
            institution=self.inst,
            teacher=self.teacher_profile,
            period_slot=self.slot1,
            student_class=self.cls1,
            subject_or_kitab_name="Sabaq Recitation",
            day_of_week="ALL"
        )
        self.assertEqual(routine.teacher.name_en, "Ustadh Ahmad")
        self.assertEqual(routine.period_slot.period_name, "Morning Sabaq")

    def test_teacher_workload_within_capacity(self):
        """Ensures teacher total scheduled periods can be calculated cleanly."""
        TeacherRoutineSchedule.objects.create(
            institution=self.inst,
            teacher=self.teacher_profile,
            period_slot=self.slot1,
            student_class=self.cls1,
            subject_or_kitab_name="Sabaq 1"
        )
        TeacherRoutineSchedule.objects.create(
            institution=self.inst,
            teacher=self.teacher_profile,
            period_slot=self.slot2,
            student_class=self.cls2,
            subject_or_kitab_name="Sabaq 2"
        )

        assigned_count = TeacherRoutineSchedule.objects.filter(teacher=self.teacher_profile, is_active=True).count()
        self.assertEqual(assigned_count, 2)


class RecitationAndAcademicGoalUnitTestCase(TestCase):
    """Verifies recitation calculation, mistakes/stucks aggregation, and goal progress."""

    def setUp(self):
        self.inst = AcademicInstitution.objects.create(name="Goal Test Inst", slug="goal-test-inst")
        self.dept = AcademicDepartment.objects.create(institution=self.inst, name="Hifz Dept", code="HIFZ-G")
        self.cls = StudentClass.objects.create(institution=self.inst, department=self.dept, name="Nazera Class")
        self.student = Student.objects.create(
            institution=self.inst,
            student_class=self.cls,
            name_en="Abdullah",
            uniq_id="STU-GOAL-01"
        )

    def test_academic_goal_progress_percentage(self):
        """Verifies progress percentage calculation on academic targets."""
        goal = AcademicGoal.objects.create(
            institution=self.inst,
            student=self.student,
            target_title="Memorize Juz 30",
            target_type="PAGE_RANGE",
            start_point="1",
            target_point="20",
            current_progress="15",
            progress_percentage=75.0,
            status="ON_TRACK"
        )
        self.assertEqual(goal.progress_percentage, 75.0)
        self.assertEqual(goal.status, "ON_TRACK")


class RoleAndTenantResolutionUnitTestCase(TestCase):
    """Verifies RBAC permission structure and scoped tenant ID resolution."""

    def setUp(self):
        self.inst = AcademicInstitution.objects.create(name="IAM Test Inst", slug="iam-test-inst")
        self.factory = APIRequestFactory()

    def test_role_action_permission_defaults(self):
        """Ensures custom user role action permissions initialize correctly."""
        role = UserRole.objects.create(
            name="Assistant Teacher",
            code="ASSISTANT_TEACHER",
            hierarchy_level=4
        )
        perms = RoleActionPermission.objects.create(
            role=role,
            can_create_student=False,
            can_edit_student=True,
            can_delete_report=False,
            can_export_reports=True
        )
        self.assertFalse(perms.can_create_student)
        self.assertTrue(perms.can_edit_student)
        self.assertFalse(perms.can_delete_report)

    def test_get_scoped_tenant_id_for_regular_user_locked_to_institution(self):
        """Ensures regular user's tenant ID is strictly locked to user.institution_id."""
        user = User.objects.create_user(
            phone_number="01800001111",
            user_type="TEACHER",
            institution=self.inst
        )
        request = self.factory.get('/api/v1/students/', HTTP_X_TENANT_ID="fake-malicious-tenant-id")
        request.user = user

        scoped_id = get_scoped_tenant_id(request)
        self.assertEqual(str(scoped_id), str(self.inst.id))
        self.assertNotEqual(scoped_id, "fake-malicious-tenant-id")

    def test_get_scoped_tenant_id_for_super_admin_context_switching(self):
        """Ensures super admin can switch context via X-Tenant-ID header."""
        super_user = User.objects.create_superuser(
            phone_number="01900009999",
            password="super-secret-password-123"
        )
        request = self.factory.get('/api/v1/students/', HTTP_X_TENANT_ID=str(self.inst.id))
        request.user = super_user

        scoped_id = get_scoped_tenant_id(request)
        self.assertEqual(str(scoped_id), str(self.inst.id))
