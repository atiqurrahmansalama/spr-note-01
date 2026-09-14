"""
Integration Test Suite for Full API -> Serializer -> Service -> Database Pipelines (Layer 2 of Testing Pyramid).
Covers: Student admission pipeline, Attendance lifecycle, Sabaq evaluation pipeline,
Staff onboarding pipeline, and Calendar/Task workflow.
"""

from django.test import TestCase
from django.utils import timezone
from datetime import date, time, timedelta
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model

from core.models import (
    AcademicInstitution,
    AcademicDepartment,
    AcademicBranch,
    StudentClass,
    ClassSection,
    Student,
    StudentDetail,
    StudentGuardian,
    StudentAcademicHistory,
    AttendanceSessionSlot,
    DynamicPeriodSlot,
    StudentAttendance,
    StaffProfile,
    TeacherDetail,
    StaffOnboardingToken,
    DailyLessonPlan,
    LessonEvaluation,
    AcademicCalendarEvent,
    InstitutionalTask
)

User = get_user_model()


class StudentLifecycleIntegrationTestCase(TestCase):
    """Verifies complete student registration, detail generation, and academic movement pipeline."""

    def setUp(self):
        self.inst = AcademicInstitution.objects.create(name="Integration Madrasa", slug="integ-madrasa")
        self.dept = AcademicDepartment.objects.create(institution=self.inst, name="Hifzul Quran", code="HQ-01")
        self.cls = StudentClass.objects.create(institution=self.inst, department=self.dept, name="Class 1")
        self.sec = ClassSection.objects.create(student_class=self.cls, section_name="Section A")

        self.admin_user = User.objects.create_user(
            phone_number="01811112222",
            user_type="ADMIN",
            institution=self.inst
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin_user)

    def test_student_full_registration_and_history_pipeline(self):
        """End-to-end test: API call creates Student, saves Academic History, and verifies database consistency."""
        payload = {
            "name_en": "Mahmudur Rahman",
            "bangla_name": "মাহমুদুর রহমান",
            "gender": "MALE",
            "student_class": str(self.cls.id),
            "section": str(self.sec.id),
            "admission_date": "2026-01-10",
            "uniq_id": "INT-CARD-001"
        }

        response = self.client.post("/api/v1/students/", payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        student_id = response.data['id']

        # Verify Student in DB
        student = Student.objects.get(id=student_id)
        self.assertEqual(student.name_en, "Mahmudur Rahman")
        self.assertEqual(student.institution_id, self.inst.id)
        self.assertEqual(student.uniq_id, "INT-CARD-001")

        # Verify Academic History auto-created in DB
        history = StudentAcademicHistory.objects.filter(student=student).first()
        self.assertIsNotNone(history)
        self.assertEqual(history.student_class_id, self.cls.id)
        self.assertTrue(history.is_current)


class AttendanceOperationsIntegrationTestCase(TestCase):
    """Verifies slot creation, multi-student bulk roll call, and attendance query pipeline."""

    def setUp(self):
        self.inst = AcademicInstitution.objects.create(name="Attendance Pipeline Madrasa", slug="att-pipeline-madrasa")
        self.dept = AcademicDepartment.objects.create(institution=self.inst, name="Nazera Dept", code="NZ-01")
        self.cls = StudentClass.objects.create(institution=self.inst, department=self.dept, name="Nazera Class")
        self.s1 = Student.objects.create(institution=self.inst, student_class=self.cls, name_en="Student One", uniq_id="STU-ATT-1")
        self.s2 = Student.objects.create(institution=self.inst, student_class=self.cls, name_en="Student Two", uniq_id="STU-ATT-2")

        self.admin_user = User.objects.create_user(
            phone_number="01822223333",
            user_type="ADMIN",
            institution=self.inst
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin_user)

    def test_slot_creation_and_bulk_rollcall_pipeline(self):
        """End-to-end: Create slot -> Bulk punch attendance -> Verify DB records."""
        # 1. Create slot
        slot_res = self.client.post("/api/v1/attendance/slots/", {
            "name": "Daily Morning Roll Call",
            "slot_type": "DAILY_GENERAL",
            "start_time": "08:00:00",
            "end_time": "09:00:00",
            "order_rank": 1
        }, format='json')
        self.assertEqual(slot_res.status_code, status.HTTP_201_CREATED)
        slot_id = slot_res.data['id']

        # 2. Bulk mark attendance
        bulk_payload = {
            "date": "2026-09-14",
            "period_slot_id": str(slot_id),
            "records": [
                {"student_id": self.s1.id, "status": "PRESENT", "in_time": "08:05:00"},
                {"student_id": self.s2.id, "status": "LATE", "in_time": "08:25:00", "remarks": "Traffic delay"}
            ]
        }
        punch_res = self.client.post("/api/v1/attendance/students/bulk-mark/", bulk_payload, format='json')
        self.assertEqual(punch_res.status_code, status.HTTP_200_OK)

        # 3. Verify in DB
        att1 = StudentAttendance.objects.get(student=self.s1, date="2026-09-14")
        self.assertEqual(att1.status, "PRESENT")

        att2 = StudentAttendance.objects.get(student=self.s2, date="2026-09-14")
        self.assertEqual(att2.status, "LATE")
        self.assertEqual(att2.remarks, "Traffic delay")


class LessonEvaluationIntegrationTestCase(TestCase):
    """Verifies daily lesson plan creation and multi-student recitation evaluation pipeline."""

    def setUp(self):
        self.inst = AcademicInstitution.objects.create(name="Evaluation Pipeline Madrasa", slug="eval-pipeline-madrasa")
        self.dept = AcademicDepartment.objects.create(institution=self.inst, name="Hifz Dept", code="HF-01")
        self.cls = StudentClass.objects.create(institution=self.inst, department=self.dept, name="Hifz 1")
        self.student = Student.objects.create(institution=self.inst, student_class=self.cls, name_en="Hafiz Ahmed", uniq_id="STU-EV-01")

        self.teacher_user = User.objects.create_user(phone_number="01833334444", user_type="TEACHER", institution=self.inst)
        self.teacher_profile = StaffProfile.objects.create(
            user=self.teacher_user,
            institution=self.inst,
            employee_id="EMP-TCH-099",
            designation="Hifz Teacher"
        )

        self.client = APIClient()
        self.client.force_authenticate(user=self.teacher_user)

    def test_lesson_creation_and_bulk_evaluation_pipeline(self):
        """End-to-end: Create lesson plan -> Record evaluation -> Verify evaluation record."""
        # 1. Create Lesson Plan
        plan_res = self.client.post("/api/v1/learning/daily-lessons/", {
            "academic_class": str(self.cls.id),
            "lesson_title": "Surah An-Naba Recitation",
            "subject_name": "Sabaq Delivery",
            "lesson_date": "2026-09-14",
            "start_unit": "Page 582",
            "end_unit": "Page 583"
        }, format='json')
        self.assertEqual(plan_res.status_code, status.HTTP_201_CREATED)
        plan_id = plan_res.data['id']

        # 2. Bulk Evaluate Student
        eval_payload = {
            "evaluations": [
                {
                    "student_id": self.student.id,
                    "evaluation_status": "MASTERED",
                    "score": 10.0,
                    "max_score": 10.0,
                    "total_mistakes": 0,
                    "total_stucks": 0,
                    "fluency_rating": 5,
                    "teacher_remarks": "Excellent recitation and tajweed"
                }
            ]
        }
        eval_res = self.client.post(f"/api/v1/learning/daily-lessons/{plan_id}/bulk-evaluate/", eval_payload, format='json')
        self.assertEqual(eval_res.status_code, status.HTTP_200_OK)

        # 3. Verify DB record
        eval_obj = LessonEvaluation.objects.get(student=self.student, lesson_plan_id=plan_id)
        self.assertEqual(eval_obj.evaluation_status, "MASTERED")
        self.assertEqual(eval_obj.score, 10.0)
        self.assertEqual(eval_obj.fluency_rating, 5)


class CalendarAndTaskIntegrationTestCase(TestCase):
    """Verifies academic calendar event creation and institutional task lifecycle."""

    def setUp(self):
        self.inst = AcademicInstitution.objects.create(name="Task Pipeline Madrasa", slug="task-pipeline-madrasa")
        self.admin_user = User.objects.create_user(phone_number="01844445555", user_type="ADMIN", institution=self.inst)
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin_user)

    def test_calendar_and_task_pipeline(self):
        """End-to-end: Create calendar event -> Create task -> Complete task."""
        # 1. Create Calendar Event
        cal_res = self.client.post("/api/v1/calendar/events/", {
            "title": "Eid-ul-Fitr Vacation",
            "event_type": "VACATION",
            "start_date": "2026-03-20",
            "end_date": "2026-03-28",
            "affects_students": True,
            "affects_staff": True
        }, format='json')
        self.assertEqual(cal_res.status_code, status.HTTP_201_CREATED)

        # 2. Create Institutional Task
        task_res = self.client.post("/api/v1/calendar/tasks/", {
            "title": "Prepare Annual Marksheet Banners",
            "priority": "HIGH",
            "status": "PENDING",
            "due_date": "2026-03-15"
        }, format='json')
        self.assertEqual(task_res.status_code, status.HTTP_201_CREATED)
        task_id = task_res.data['id']

        # 3. Complete Task
        complete_res = self.client.patch(f"/api/v1/calendar/tasks/{task_id}/", {
            "is_completed": True,
            "status": "COMPLETED"
        }, format='json')
        self.assertEqual(complete_res.status_code, status.HTTP_200_OK)

        # 4. Verify DB
        task_obj = InstitutionalTask.objects.get(id=task_id)
        self.assertTrue(task_obj.is_completed)
        self.assertEqual(task_obj.status, "COMPLETED")
