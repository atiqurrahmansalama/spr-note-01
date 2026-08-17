import datetime
import uuid
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model

from core.models import (
    AcademicInstitution,
    AcademicDepartment,
    StudentClass,
    StudentGroup,
    Student,
    TeacherProfile,
    AcademicCalendarEvent,
    DynamicPeriodSlot,
    TeacherRoutineSchedule,
    TeacherPeriodAttendanceRecord,
    GateEntryExitLog,
    AdHocHeadcountSession,
    BiometricDevice,
    RawAttendancePunchLog,
    StudentAttendance,
    AttendancePolicySetting,
)

User = get_user_model()


class UnifiedAttendanceV2TestSuite(TestCase):
    def setUp(self):
        self.client = APIClient()

        # 1. Institutions
        self.inst = AcademicInstitution.objects.create(
            name="Suffah Model Academy",
            slug="suffah-academy",
            is_active=True
        )

        # 2. Admin User
        self.admin = User.objects.create_user(
            phone_number="+8801700000001",
            name="Admin User",
            password="Password123!",
            institution=self.inst,
            user_type="ADMIN"
        )

        # 3. Teacher Users and Profiles
        self.teacher_user_1 = User.objects.create_user(
            phone_number="+8801700000002",
            name="Qari Abdullah",
            password="Password123!",
            institution=self.inst,
            user_type="TEACHER"
        )
        self.teacher_1 = TeacherProfile.objects.create(
            user=self.teacher_user_1,
            name_en="Qari Abdullah",
            designation="Senior Qari"
        )

        self.teacher_user_2 = User.objects.create_user(
            phone_number="+8801700000003",
            name="Mawlana Hasan",
            password="Password123!",
            institution=self.inst,
            user_type="TEACHER"
        )
        self.teacher_2 = TeacherProfile.objects.create(
            user=self.teacher_user_2,
            name_en="Mawlana Hasan",
            designation="Kitab Ustadh"
        )

        # 4. Class and Students
        self.student_class = StudentClass.objects.create(
            institution=self.inst,
            name="Mizan Class",
            code="MIZAN"
        )
        self.student_1 = Student.objects.create(
            institution=self.inst,
            student_class=self.student_class,
            name="Zubair Ahmed",
            roll_number=101,
            is_active=True
        )
        self.student_2 = Student.objects.create(
            institution=self.inst,
            student_class=self.student_class,
            name="Salman Farisi",
            roll_number=102,
            is_active=True
        )

        # 5. Dynamic Period Slots
        self.slot_1 = DynamicPeriodSlot.objects.create(
            institution=self.inst,
            student_class=self.student_class,
            slot_type="PERIOD",
            period_name="1st Period",
            period_order=1,
            start_time=datetime.time(8, 0),
            end_time=datetime.time(8, 45)
        )
        self.slot_2 = DynamicPeriodSlot.objects.create(
            institution=self.inst,
            student_class=self.student_class,
            slot_type="PERIOD",
            period_name="2nd Period",
            period_order=2,
            start_time=datetime.time(8, 45),
            end_time=datetime.time(9, 30)
        )

        # 6. Teacher Routine Schedules
        self.routine_1 = TeacherRoutineSchedule.objects.create(
            institution=self.inst,
            teacher=self.teacher_1,
            period_slot=self.slot_1,
            student_class=self.student_class,
            subject_or_kitab_name="Mizan wa Munsha'ib",
            room_number="Room 101"
        )
        self.routine_2 = TeacherRoutineSchedule.objects.create(
            institution=self.inst,
            teacher=self.teacher_2,
            period_slot=self.slot_2,
            student_class=self.student_class,
            subject_or_kitab_name="Nahw Mir",
            room_number="Room 102"
        )

        self.client.force_authenticate(user=self.admin)

    def test_dynamic_period_slot_crud(self):
        url = "/attendance/period-slots/"
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 2)

    def test_teacher_matrix_list_and_totals(self):
        target_date = datetime.date(2026, 8, 10)
        TeacherPeriodAttendanceRecord.objects.create(
            institution=self.inst,
            schedule=self.routine_1,
            teacher=self.teacher_1,
            date=target_date,
            status="PRESENT",
            is_conducted=True
        )

        TeacherPeriodAttendanceRecord.objects.create(
            institution=self.inst,
            schedule=self.routine_2,
            teacher=self.teacher_2,
            substitute_teacher=self.teacher_1,
            date=target_date,
            status="SUBSTITUTED",
            is_conducted=True
        )

        url = "/attendance/teacher-matrix/?year=2026&month=8"
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.data
        self.assertEqual(data["year"], 2026)
        self.assertEqual(data["month"], 8)
        self.assertEqual(data["total_days"], 31)
        self.assertIn("hijri_month_span", data)
        self.assertEqual(len(data["teachers"]), 2)
        self.assertEqual(data["daily_class_counts"][10], 2)
        self.assertEqual(data["monthly_grand_total"], 2)

    def test_teacher_matrix_bulk_update(self):
        url = "/attendance/teacher-matrix/bulk-update/"
        payload = {
            "records": [
                {
                    "schedule_id": str(self.routine_1.id),
                    "date": "2026-08-15",
                    "status": "PRESENT",
                    "remarks": "Conducted on time"
                },
                {
                    "schedule_id": str(self.routine_2.id),
                    "date": "2026-08-15",
                    "status": "SUBSTITUTED",
                    "substitute_teacher_id": self.teacher_1.id,
                    "remarks": "Substituted by Qari Abdullah"
                }
            ]
        }
        resp = self.client.post(url, payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["count"], 2)

        rec1 = TeacherPeriodAttendanceRecord.objects.filter(schedule=self.routine_1, date="2026-08-15").first()
        self.assertIsNotNone(rec1)
        self.assertEqual(rec1.status, "PRESENT")

        rec2 = TeacherPeriodAttendanceRecord.objects.filter(schedule=self.routine_2, date="2026-08-15").first()
        self.assertIsNotNone(rec2)
        self.assertEqual(rec2.status, "SUBSTITUTED")
        self.assertEqual(rec2.substitute_teacher, self.teacher_1)

    def test_student_period_roll_call_and_teacher_sync(self):
        url = "/attendance/students/period-roll-call/"
        payload = {
            "date": "2026-08-16",
            "period_slot_id": str(self.slot_1.id),
            "class_id": self.student_class.id,
            "taken_by_teacher_id": self.teacher_1.id,
            "records": [
                {"student_id": self.student_1.id, "status": "PRESENT"},
                {"student_id": self.student_2.id, "status": "ABSENT"}
            ]
        }
        resp = self.client.post(url, payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["count"], 2)

        att1 = StudentAttendance.objects.filter(student=self.student_1, date="2026-08-16", period_slot=self.slot_1).first()
        self.assertIsNotNone(att1)
        self.assertEqual(att1.status, "PRESENT")
        self.assertEqual(att1.taken_by_teacher, self.teacher_1)

        teacher_rec = TeacherPeriodAttendanceRecord.objects.filter(schedule=self.routine_1, date="2026-08-16").first()
        self.assertIsNotNone(teacher_rec)
        self.assertEqual(teacher_rec.status, "PRESENT")
        self.assertTrue(teacher_rec.is_conducted)

    def test_gate_entry_and_bunk_discrepancy(self):
        gate_url = "/attendance/gate-logs/log-punch/"
        gate_payload = {
            "student_id": self.student_1.id,
            "direction": "ENTRY",
            "gate_pass_reason": "Morning Campus Entry"
        }
        gate_resp = self.client.post(gate_url, gate_payload, format="json")
        self.assertEqual(gate_resp.status_code, status.HTTP_201_CREATED)

        today_str = str(timezone.localdate())
        StudentAttendance.objects.create(
            student=self.student_1,
            period_slot=self.slot_1,
            date=today_str,
            status="ABSENT"
        )

        bunk_url = f"/attendance/students/bunk-discrepancy/?date={today_str}"
        bunk_resp = self.client.get(bunk_url)
        self.assertEqual(bunk_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(bunk_resp.data["total_discrepancies"], 1)
        self.assertEqual(bunk_resp.data["discrepancies"][0]["student_id"], self.student_1.id)

    def test_adhoc_headcount_session(self):
        url = "/attendance/adhoc-headcounts/"
        payload = {
            "title": "Night Mutala'a Surprise Roll Call",
            "student_class": self.student_class.id,
            "total_expected": 2
        }
        resp = self.client.post(url, payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        session_id = resp.data["id"]

        verify_url = f"/attendance/adhoc-headcounts/{session_id}/verify-students/"
        verify_resp = self.client.post(verify_url, {"verified_student_ids": [self.student_1.id]}, format="json")
        self.assertEqual(verify_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(verify_resp.data["total_verified"], 1)

    def test_biometric_device_and_raw_punch_push(self):
        device = BiometricDevice.objects.create(
            institution=self.inst,
            device_name="Main Gate ZKTeco",
            device_serial="ZK-123456",
            device_type="ZKTECO",
            location="Main Gate"
        )

        push_url = "/attendance/biometric/push/"
        push_payload = {
            "serial_number": "ZK-123456",
            "punches": [
                {
                    "user_pin": str(self.student_1.roll_number),
                    "timestamp": timezone.now().isoformat(),
                    "punch_type": "CHECK_IN"
                }
            ]
        }
        push_resp = self.client.post(push_url, push_payload, format="json")
        self.assertEqual(push_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(push_resp.data["auto_processed"], 1)

        raw_log = RawAttendancePunchLog.objects.filter(device=device).first()
        self.assertIsNotNone(raw_log)
        self.assertTrue(raw_log.is_processed)
        self.assertEqual(raw_log.matched_student, self.student_1)
