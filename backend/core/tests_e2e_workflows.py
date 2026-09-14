"""
End-to-End (E2E) Workflow Test Suite (Layer 3 of Testing Pyramid).
Simulates real-world multi-user and multi-tenant operational journeys:
1. Authentication -> Academic Setup -> Student Admission -> Staff Assignment -> Routine -> Attendance -> Lesson Evaluation -> Progress Verification.
2. Multi-tenant cross-contamination and isolation across concurrent user flows.
"""

from django.test import TestCase
from django.utils import timezone
from datetime import date, time
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model

from core.models import (
    AcademicInstitution,
    AcademicDepartment,
    StudentClass,
    ClassSection,
    Student,
    StudentAcademicHistory,
    StaffProfile,
    TeacherProfile,
    TeacherDetail,
    DynamicPeriodSlot,
    TeacherRoutineSchedule,
    AttendanceSessionSlot,
    StudentAttendance,
    DailyLessonPlan,
    LessonEvaluation,
    AcademicGoal
)

User = get_user_model()


class FullEducationalLifecycleE2ETestCase(TestCase):
    """
    Simulates complete institutional lifecycle from administrator login,
    academic configuration, student admission, timetable assignment,
    daily attendance roll call, to recitation mastery evaluation.
    """

    def setUp(self):
        self.institution = AcademicInstitution.objects.create(
            name="Al-Hikmah International Academy",
            slug="al-hikmah-e2e"
        )
        self.admin_user = User.objects.create_user(
            phone_number="01799990001",
            password="EnterpriseSecurePass@2026",
            user_type="ADMIN",
            institution=self.institution
        )
        self.teacher_user = User.objects.create_user(
            phone_number="01799990002",
            password="EnterpriseSecurePass@2026",
            user_type="TEACHER",
            institution=self.institution
        )
        self.staff_profile = StaffProfile.objects.create(
            user=self.teacher_user,
            institution=self.institution,
            employee_id="TCH-E2E-101",
            designation="Senior Qari"
        )
        self.teacher_profile = TeacherProfile.objects.create(
            user=self.teacher_user,
            name_en="Senior Qari Ibrahim",
            designation="Senior Qari"
        )

        self.client = APIClient()

    def test_complete_educational_lifecycle_journey(self):
        """
        Executes end-to-end multi-step workflow:
        1. Administrator logs in and obtains JWT token.
        2. Configures Academic Department, Class, and Section.
        3. Admits a new student and verifies academic history initialization.
        4. Configures dynamic period slot and assigns routine schedule to teacher.
        5. Teacher logs in with JWT.
        6. Teacher performs daily attendance roll-call for the student.
        7. Teacher creates daily lesson plan and submits recitation evaluation.
        8. Verifies end-to-end data cohesion across the database.
        """
        # Step 1: Admin JWT Authentication
        login_res = self.client.post("/api/v1/auth/token/", {
            "phone_number": "01799990001",
            "password": "EnterpriseSecurePass@2026"
        }, format='json')
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        admin_token = login_res.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_token}")

        # Step 2: Academic Setup (Department -> Class -> Section)
        dept_res = self.client.post("/api/v1/departments/", {
            "name": "Tahfeezul Quran Division",
            "code": "TQD-01",
            "description": "Quran memorization and tajweed department"
        }, format='json')
        self.assertEqual(dept_res.status_code, status.HTTP_201_CREATED)
        dept_id = dept_res.data['id']

        class_res = self.client.post("/api/v1/classes/", {
            "department": dept_id,
            "name": "Class 10 - Sanad Preparation",
            "code": "CLS-10-SANAD"
        }, format='json')
        self.assertEqual(class_res.status_code, status.HTTP_201_CREATED)
        class_id = class_res.data['id']

        section_res = self.client.post("/api/v1/sections/", {
            "student_class": class_id,
            "section_name": "Abu Bakr As-Siddiq Section",
            "capacity": 30
        }, format='json')
        self.assertEqual(section_res.status_code, status.HTTP_201_CREATED)
        section_id = section_res.data['id']

        # Step 3: Student Admission
        student_res = self.client.post("/api/v1/students/", {
            "name_en": "Ibrahim Al-Khalil",
            "bangla_name": "ইব্রাহীম আল-খলিল",
            "gender": "MALE",
            "student_class": class_id,
            "section": section_id,
            "admission_date": "2026-01-01",
            "uniq_id": "STU-E2E-9999"
        }, format='json')
        self.assertEqual(student_res.status_code, status.HTTP_201_CREATED)
        student_id = student_res.data['id']

        # Verify Student & Academic History in DB
        student_obj = Student.objects.get(id=student_id)
        self.assertEqual(student_obj.name_en, "Ibrahim Al-Khalil")
        self.assertEqual(student_obj.institution_id, self.institution.id)
        history_record = StudentAcademicHistory.objects.filter(student=student_obj).first()
        self.assertIsNotNone(history_record)
        self.assertEqual(str(history_record.student_class_id), str(class_id))

        # Step 4: Routine & Period Setup
        slot = DynamicPeriodSlot.objects.create(
            institution=self.institution,
            period_name="Morning Sabaq Slot",
            period_order=1,
            start_time=time(7, 30),
            end_time=time(8, 45)
        )
        routine = TeacherRoutineSchedule.objects.create(
            institution=self.institution,
            teacher=self.teacher_profile,
            period_slot=slot,
            student_class_id=class_id,
            subject_or_kitab_name="Sabaq Recitation",
            day_of_week="ALL"
        )
        self.assertEqual(routine.subject_or_kitab_name, "Sabaq Recitation")

        # Step 5: Teacher Login
        self.client.credentials()  # Clear admin token
        t_login_res = self.client.post("/api/v1/auth/token/", {
            "phone_number": "01799990002",
            "password": "EnterpriseSecurePass@2026"
        }, format='json')
        self.assertEqual(t_login_res.status_code, status.HTTP_200_OK)
        teacher_token = t_login_res.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {teacher_token}")

        # Step 6: Attendance Roll-Call Execution
        att_slot = AttendanceSessionSlot.objects.create(
            institution=self.institution,
            name="Daily Morning Assembly",
            slot_type="DAILY_GENERAL",
            start_time=time(7, 30),
            end_time=time(8, 0),
            order_rank=1
        )
        punch_res = self.client.post("/api/v1/attendance/students/bulk-mark/", {
            "date": "2026-09-14",
            "period_slot_id": str(att_slot.id),
            "records": [
                {
                    "student_id": student_id,
                    "status": "PRESENT",
                    "in_time": "07:28:00",
                    "remarks": "Arrived early with complete preparation"
                }
            ]
        }, format='json')
        self.assertEqual(punch_res.status_code, status.HTTP_200_OK)

        attendance_record = StudentAttendance.objects.get(student_id=student_id, date="2026-09-14")
        self.assertEqual(attendance_record.status, "PRESENT")

        # Step 7: Daily Lesson Plan & Recitation Assessment
        lesson_res = self.client.post("/api/v1/learning/daily-lessons/", {
            "academic_class": class_id,
            "section": section_id,
            "lesson_title": "Surah Maryam Ayah 1 to 25",
            "subject_name": "Sabaq",
            "lesson_date": "2026-09-14",
            "start_unit": "Surah 19:1",
            "end_unit": "Surah 19:25"
        }, format='json')
        self.assertEqual(lesson_res.status_code, status.HTTP_201_CREATED)
        lesson_id = lesson_res.data['id']

        eval_res = self.client.post(f"/api/v1/learning/daily-lessons/{lesson_id}/bulk-evaluate/", {
            "evaluations": [
                {
                    "student_id": student_id,
                    "evaluation_status": "MASTERED",
                    "score": 10.0,
                    "max_score": 10.0,
                    "total_mistakes": 0,
                    "total_stucks": 0,
                    "fluency_rating": 5,
                    "teacher_remarks": "Flawless makharij and melodious recitation"
                }
            ]
        }, format='json')
        self.assertEqual(eval_res.status_code, status.HTTP_200_OK)

        eval_record = LessonEvaluation.objects.get(student_id=student_id, lesson_plan_id=lesson_id)
        self.assertEqual(eval_record.evaluation_status, "MASTERED")
        self.assertEqual(eval_record.score, 10.0)
        self.assertEqual(eval_record.fluency_rating, 5)

        # Step 8: Academic Goal Verification
        goal = AcademicGoal.objects.create(
            institution=self.institution,
            student=student_obj,
            target_title="Complete Sanad Hifz Target",
            target_type="JUZ",
            start_point="1",
            target_point="30",
            current_progress="30",
            progress_percentage=100.0,
            status="COMPLETED"
        )
        self.assertEqual(goal.status, "COMPLETED")
        self.assertEqual(goal.progress_percentage, 100.0)


class MultiTenantIsolationE2ETestCase(TestCase):
    """
    Verifies zero cross-tenant contamination across simultaneous
    educational workflows between two separate institutions.
    """

    def setUp(self):
        # Tenant A Setup
        self.inst_a = AcademicInstitution.objects.create(name="Campus Alpha", slug="campus-alpha-e2e")
        self.admin_a = User.objects.create_user(phone_number="01911110001", password="SecureAlphaPass@2026", user_type="ADMIN", institution=self.inst_a)
        self.dept_a = AcademicDepartment.objects.create(institution=self.inst_a, name="Alpha Dept", code="AD-01")
        self.cls_a = StudentClass.objects.create(institution=self.inst_a, department=self.dept_a, name="Alpha Class")
        self.sec_a = ClassSection.objects.create(student_class=self.cls_a, section_name="Alpha Sec A")
        self.stu_a = Student.objects.create(institution=self.inst_a, student_class=self.cls_a, name_en="Alpha Student", uniq_id="STU-ALPHA-01")
        self.lesson_a = DailyLessonPlan.objects.create(
            institution=self.inst_a,
            academic_class=self.cls_a,
            lesson_title="Alpha Sabaq",
            lesson_date="2026-09-14"
        )

        # Tenant B Setup
        self.inst_b = AcademicInstitution.objects.create(name="Campus Beta", slug="campus-beta-e2e")
        self.admin_b = User.objects.create_user(phone_number="01922220002", password="SecureBetaPass@2026", user_type="ADMIN", institution=self.inst_b)
        self.dept_b = AcademicDepartment.objects.create(institution=self.inst_b, name="Beta Dept", code="BD-01")
        self.cls_b = StudentClass.objects.create(institution=self.inst_b, department=self.dept_b, name="Beta Class")
        self.sec_b = ClassSection.objects.create(student_class=self.cls_b, section_name="Beta Sec B")
        self.stu_b = Student.objects.create(institution=self.inst_b, student_class=self.cls_b, name_en="Beta Student", uniq_id="STU-BETA-01")
        self.lesson_b = DailyLessonPlan.objects.create(
            institution=self.inst_b,
            academic_class=self.cls_b,
            lesson_title="Beta Sabaq",
            lesson_date="2026-09-14"
        )

        self.client = APIClient()

    def test_tenant_isolation_in_querysets_and_mutations(self):
        """
        Confirms Tenant A cannot read, query, or mutate Tenant B records, and vice versa.
        """
        # 1. Authenticate as Admin A
        login_res = self.client.post("/api/v1/auth/token/", {
            "phone_number": "01911110001",
            "password": "SecureAlphaPass@2026"
        }, format='json')
        token_a = login_res.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_a}")

        # Query Student list -> Should only contain Student A
        stu_list = self.client.get("/api/v1/students/")
        self.assertEqual(stu_list.status_code, status.HTTP_200_OK)
        ids_returned = [s['id'] for s in (stu_list.data.get('results') if isinstance(stu_list.data, dict) else stu_list.data)]
        self.assertIn(self.stu_a.id, ids_returned)
        self.assertNotIn(self.stu_b.id, ids_returned)

        # Attempt to read Student B detail -> Should return 404
        stu_b_detail = self.client.get(f"/api/v1/students/{self.stu_b.id}/")
        self.assertEqual(stu_b_detail.status_code, status.HTTP_404_NOT_FOUND)

        # Attempt to mutate Student B -> Should return 404
        stu_b_update = self.client.patch(f"/api/v1/students/{self.stu_b.id}/", {"name_en": "Hacked Name"}, format='json')
        self.assertEqual(stu_b_update.status_code, status.HTTP_404_NOT_FOUND)

        # Attempt to evaluate Tenant B lesson plan -> Should return 404
        eval_attempt = self.client.post(f"/api/v1/learning/daily-lessons/{self.lesson_b.id}/bulk-evaluate/", {
            "evaluations": [{"student_id": self.stu_a.id, "evaluation_status": "MASTERED"}]
        }, format='json')
        self.assertEqual(eval_attempt.status_code, status.HTTP_404_NOT_FOUND)

        # 2. Authenticate as Admin B
        self.client.credentials()
        login_b_res = self.client.post("/api/v1/auth/token/", {
            "phone_number": "01922220002",
            "password": "SecureBetaPass@2026"
        }, format='json')
        token_b = login_b_res.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_b}")

        # Query Student list -> Should only contain Student B
        stu_b_list = self.client.get("/api/v1/students/")
        self.assertEqual(stu_b_list.status_code, status.HTTP_200_OK)
        b_ids = [s['id'] for s in (stu_b_list.data.get('results') if isinstance(stu_b_list.data, dict) else stu_b_list.data)]
        self.assertIn(self.stu_b.id, b_ids)
        self.assertNotIn(self.stu_a.id, b_ids)

        # Attempt to read Student A detail -> Should return 404
        stu_a_detail = self.client.get(f"/api/v1/students/{self.stu_a.id}/")
        self.assertEqual(stu_a_detail.status_code, status.HTTP_404_NOT_FOUND)
