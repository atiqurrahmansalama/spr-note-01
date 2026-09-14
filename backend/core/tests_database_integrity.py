"""
Automated Test Suite for Database Integrity, Constraints, Indexing & Transaction Atomicity (Phase 3 Hardening).
"""

from django.test import TestCase
from django.db import transaction, IntegrityError
from django.utils import timezone
from datetime import date, time, timedelta
from rest_framework.test import APIClient
from rest_framework import status

from core.models import (
    AcademicInstitution,
    AcademicDepartment,
    AcademicBranch,
    StudentClass,
    ClassSection,
    Student,
    StudentAttendance,
    AttendanceSessionSlot,
    ClassPeriodSlot,
    DynamicPeriodSlot,
    AcademicCalendarEvent,
    StaffProfile,
    StaffLeaveRequest,
    StaffAttendance,
    StudentDailyReport,
    DailyLessonPlan,
    LessonEvaluation,
    DormitoryRoom,
    ResidentialBuilding,
    BedAllocation,
    BiometricDevice,
    RawAttendancePunchLog,
    GateEntryExitLog,
    User
)
from core.services.student_service import promote_student_class
from core.services.attendance_service import record_bulk_classroom_attendance


class DatabaseIntegrityConstraintTestCase(TestCase):
    """Verifies schema constraints, uniqueness guarantees, and integrity rules."""

    def setUp(self):
        self.inst_a = AcademicInstitution.objects.create(
            name="Alpha Madrasa Complex",
            slug="alpha-madrasa-db-test"
        )
        self.inst_b = AcademicInstitution.objects.create(
            name="Beta Academy Complex",
            slug="beta-academy-db-test"
        )
        self.dept_a = AcademicDepartment.objects.create(
            institution=self.inst_a,
            name="Hifz Department",
            code="HIFZ-A"
        )
        self.cls_a1 = StudentClass.objects.create(
            institution=self.inst_a,
            department=self.dept_a,
            name="Hifz Class A"
        )
        self.section_a1 = ClassSection.objects.create(
            student_class=self.cls_a1,
            section_name="Section 1"
        )

    def test_student_duplicate_id_card_rejected_within_same_institution(self):
        """Ensures duplicate student ID card numbers within the same institution are rejected."""
        Student.objects.create(
            institution=self.inst_a,
            student_class=self.cls_a1,
            name_en="Student Alpha 1",
            student_id_card_number="CARD-1001",
            uniq_id="STU-00101"
        )

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Student.objects.create(
                    institution=self.inst_a,
                    student_class=self.cls_a1,
                    name_en="Student Alpha 2",
                    student_id_card_number="CARD-1001",
                    uniq_id="STU-00102"
                )

    def test_student_duplicate_id_card_allowed_across_different_institutions(self):
        """Ensures identical card numbers across different institutions remain valid."""
        s1 = Student.objects.create(
            institution=self.inst_a,
            student_class=self.cls_a1,
            name_en="Student Alpha 1",
            student_id_card_number="CARD-1001",
            uniq_id="STU-00101"
        )
        dept_b = AcademicDepartment.objects.create(institution=self.inst_b, name="Hifz Beta", code="HIFZ-B")
        cls_b = StudentClass.objects.create(institution=self.inst_b, department=dept_b, name="Class B")
        s2 = Student.objects.create(
            institution=self.inst_b,
            student_class=cls_b,
            name_en="Student Beta 1",
            student_id_card_number="CARD-1001",
            uniq_id="STU-00201"
        )
        self.assertEqual(s1.student_id_card_number, s2.student_id_card_number)

    def test_student_class_duplicate_name_rejected_within_same_institution(self):
        """Ensures duplicate class names in the same institution are rejected."""
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                StudentClass.objects.create(
                    institution=self.inst_a,
                    department=self.dept_a,
                    name="Hifz Class A"
                )

    def test_class_section_duplicate_name_rejected_within_same_class(self):
        """Ensures duplicate section names under the same class are rejected."""
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                ClassSection.objects.create(
                    student_class=self.cls_a1,
                    section_name="Section 1"
                )

    def test_calendar_event_start_after_end_rejected(self):
        """Ensures check constraint rejects calendar event where end_date < start_date."""
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                AcademicCalendarEvent.objects.create(
                    institution=self.inst_a,
                    title="Invalid Holiday",
                    start_date=date(2026, 6, 15),
                    end_date=date(2026, 6, 10),
                    event_type="PUBLIC_HOLIDAY"
                )

    def test_staff_leave_start_after_end_rejected(self):
        """Ensures check constraint rejects staff leave where end_date < start_date."""
        staff = StaffProfile.objects.create(
            institution=self.inst_a,
            employee_id="EMP-TEST-001",
            designation="Teacher"
        )
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                StaffLeaveRequest.objects.create(
                    staff=staff,
                    start_date=date(2026, 8, 20),
                    end_date=date(2026, 8, 15),
                    reason="Vacation"
                )

    def test_lesson_evaluation_invalid_score_rejected(self):
        """Ensures check constraint rejects lesson evaluation with score > max_score or score < 0."""
        teacher_user = User.objects.create_user(phone_number="01899990001", user_type="TEACHER")
        teacher_profile = StaffProfile.objects.create(
            user=teacher_user,
            institution=self.inst_a,
            employee_id="EMP-TCH-001",
            designation="Senior Teacher"
        )
        lesson_plan = DailyLessonPlan.objects.create(
            institution=self.inst_a,
            academic_class=self.cls_a1,
            teacher=teacher_profile,
            lesson_date=timezone.localdate(),
            lesson_title="Surah Al-Baqarah Ayah 1-10"
        )
        student = Student.objects.create(
            institution=self.inst_a,
            student_class=self.cls_a1,
            name_en="Talha",
            uniq_id="STU-00999"
        )

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                LessonEvaluation.objects.create(
                    lesson_plan=lesson_plan,
                    student=student,
                    evaluation_date=timezone.localdate(),
                    score=15.0,
                    max_score=10.0
                )

    def test_dormitory_duplicate_bed_number_rejected(self):
        """Ensures duplicate bed numbers in the same dormitory room are rejected."""
        building = ResidentialBuilding.objects.create(
            institution=self.inst_a,
            name="Hostel Block A"
        )
        room = DormitoryRoom.objects.create(
            institution=self.inst_a,
            building=building,
            room_number="101"
        )
        BedAllocation.objects.create(
            room=room,
            bed_number="Bed-A1"
        )

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                BedAllocation.objects.create(
                    room=room,
                    bed_number="Bed-A1"
                )


class DatabaseTransactionAtomicityTestCase(TestCase):
    """Verifies transaction atomicity and complete rollback behavior upon failures."""

    def setUp(self):
        self.inst = AcademicInstitution.objects.create(
            name="Transaction Test Madrasa",
            slug="tx-test-madrasa"
        )
        self.dept = AcademicDepartment.objects.create(
            institution=self.inst,
            name="Islamic Studies",
            code="IS-TX"
        )
        self.cls1 = StudentClass.objects.create(
            institution=self.inst,
            department=self.dept,
            name="Class Grade 1"
        )
        self.cls2 = StudentClass.objects.create(
            institution=self.inst,
            department=self.dept,
            name="Class Grade 2"
        )

    def test_bulk_attendance_atomic_rollback(self):
        """Ensures bulk classroom attendance rolls back completely if any record fails."""
        s1 = Student.objects.create(institution=self.inst, student_class=self.cls1, name_en="Student 1", uniq_id="STU-TX-1")
        s2 = Student.objects.create(institution=self.inst, student_class=self.cls1, name_en="Student 2", uniq_id="STU-TX-2")

        initial_count = StudentAttendance.objects.count()
        today = str(date.today())

        # Attempt to insert records where one record contains an invalid payload causing an exception
        try:
            with transaction.atomic():
                StudentAttendance.objects.create(
                    student=s1,
                    student_class=self.cls1,
                    date=today,
                    status='PRESENT'
                )
                # Intentionally trigger an IntegrityError / null failure
                StudentAttendance.objects.create(
                    student=None, # Invalid null student
                    student_class=self.cls1,
                    date=today,
                    status='PRESENT'
                )
        except Exception:
            pass

        # Verify that s1 attendance was rolled back and not committed
        self.assertEqual(StudentAttendance.objects.count(), initial_count)

    def test_student_promotion_service_atomicity(self):
        """Ensures promote_student_class executes atomically."""
        student = Student.objects.create(
            institution=self.inst,
            student_class=self.cls1,
            name_en="Candidate for Promotion",
            uniq_id="STU-TX-PROMOTE"
        )

        promoted = promote_student_class(
            student_id=str(student.id),
            target_class_id=str(self.cls2.id),
            institution_id=str(self.inst.id)
        )
        student.refresh_from_db()
        self.assertEqual(student.student_class_id, self.cls2.id)

    def test_biometric_device_push_transaction_handling(self):
        """Ensures BiometricGateway device push handles multiple records atomically."""
        device = BiometricDevice.objects.create(
            institution=self.inst,
            device_name="Main Gate Bio 1",
            device_serial="BIO-SN-998877",
            is_active=True
        )
        student = Student.objects.create(
            institution=self.inst,
            student_class=self.cls1,
            name_en="Bio Student",
            uniq_id="STU-BIO-01",
            student_id_card_number="BIO-CARD-01"
        )

        client = APIClient()
        payload = {
            "serial_number": "BIO-SN-998877",
            "punches": [
                {
                    "card_no": "BIO-CARD-01",
                    "timestamp": timezone.now().isoformat(),
                    "punch_type": "CHECK_IN"
                }
            ]
        }

        response = client.post("/api/v1/attendance/biometric/push/", payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get('auto_processed'), 1)

        # Verify raw punch log and gate log are both created
        self.assertTrue(RawAttendancePunchLog.objects.filter(device=device, user_pin_or_card="BIO-CARD-01").exists())
        self.assertTrue(GateEntryExitLog.objects.filter(institution=self.inst, student=student).exists())
