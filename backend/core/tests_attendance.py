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
    AcademicCalendarEvent,
    InstitutionalTask,
    AttendanceSessionSlot,
    StudentAttendance,
    AttendancePolicySetting,
)

User = get_user_model()

class AttendanceCalendarTaskTestSuite(TestCase):
    def setUp(self):
        self.client = APIClient()

        # 1. Create Institutions (Tenant A and Tenant B)
        self.inst_a = AcademicInstitution.objects.create(
            name="Suffah Model Academy",
            slug="suffah-academy",
            is_active=True
        )
        self.inst_b = AcademicInstitution.objects.create(
            name="Other Islamic Institute",
            slug="other-institute",
            is_active=True
        )

        # 2. Create Users
        self.admin_user_a = User.objects.create_user(
            phone_number="+8801711111111",
            name="Principal A",
            password="Password123!",
            institution=self.inst_a,
            user_type="ADMIN"
        )
        self.admin_user_b = User.objects.create_user(
            phone_number="+8801722222222",
            name="Principal B",
            password="Password123!",
            institution=self.inst_b,
            user_type="ADMIN"
        )

        # 3. Create Department & Classes
        self.dept_a = AcademicDepartment.objects.create(
            institution=self.inst_a,
            name="Hifz Department",
            code="HIFZ"
        )
        self.class_a = StudentClass.objects.create(
            institution=self.inst_a,
            department=self.dept_a,
            name="Hifz Group 1",
            code="H-01"
        )
        self.group_a = StudentGroup.objects.create(
            institution=self.inst_a,
            student_class=self.class_a,
            name="Halqa Abu Bakr"
        )

        # 4. Create Students
        self.student_1 = Student.objects.create(
            institution=self.inst_a,
            student_class=self.class_a,
            student_group=self.group_a,
            roll_number=101,
            name="Abdullah Rahman",
            status="Active"
        )
        self.student_2 = Student.objects.create(
            institution=self.inst_a,
            student_class=self.class_a,
            student_group=self.group_a,
            roll_number=102,
            name="Zubair Ahmed",
            status="Active"
        )

        # Student in Tenant B
        self.student_b = Student.objects.create(
            institution=self.inst_b,
            roll_number=201,
            name="Usman Ali",
            status="Active"
        )

    def test_calendar_event_and_holiday_check(self):
        """Test creating calendar events and checking if a date is a holiday."""
        self.client.force_authenticate(user=self.admin_user_a)

        # Create Eid Vacation event (2026-08-20 to 2026-08-25)
        create_res = self.client.post('/api/v1/calendar/events/', {
            "title": "Eid-ul-Adha Vacation",
            "event_type": "PUBLIC_HOLIDAY",
            "start_date": "2026-08-20",
            "end_date": "2026-08-25",
            "affects_students": True,
            "affects_staff": True,
            "color_code": "#10b981"
        }, format='json')

        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_res.data['duration_days'], 6)

        # Check holiday endpoint for 2026-08-22 (Should be holiday)
        check_res = self.client.get('/api/v1/calendar/events/check-holiday/?date=2026-08-22')
        self.assertEqual(check_res.status_code, status.HTTP_200_OK)
        self.assertTrue(check_res.data['is_holiday'])
        self.assertEqual(check_res.data['reason'], "Eid-ul-Adha Vacation")

        # Check non-holiday date
        non_hol_res = self.client.get('/api/v1/calendar/events/check-holiday/?date=2026-08-10')
        self.assertEqual(non_hol_res.status_code, status.HTTP_200_OK)
        # 2026-08-10 is a Monday (not weekend, not holiday)
        self.assertFalse(non_hol_res.data['is_holiday'])

    def test_institutional_task_lifecycle(self):
        """Test task creation, listing, and 1-click toggle completion."""
        self.client.force_authenticate(user=self.admin_user_a)

        task_res = self.client.post('/api/v1/calendar/tasks/', {
            "title": "Prepare Ramadan Daily Attendance Reports",
            "priority": "HIGH",
            "category": "ACADEMIC",
            "due_date": "2026-08-30"
        }, format='json')

        self.assertEqual(task_res.status_code, status.HTTP_201_CREATED)
        task_id = task_res.data['id']
        self.assertFalse(task_res.data['is_completed'])

        # Toggle completion
        toggle_res = self.client.patch(f'/api/v1/calendar/tasks/{task_id}/toggle-complete/')
        self.assertEqual(toggle_res.status_code, status.HTTP_200_OK)
        self.assertTrue(toggle_res.data['is_completed'])
        self.assertEqual(toggle_res.data['status'], 'COMPLETED')

    def test_attendance_session_slot_management(self):
        """Test creating custom attendance slots (Fajr Sabaq, Period 1, etc.)."""
        self.client.force_authenticate(user=self.admin_user_a)

        slot_res = self.client.post('/api/v1/attendance/slots/', {
            "name": "Fajr Sabaq Roll Call",
            "slot_type": "RESIDENTIAL_PRAYER",
            "start_time": "05:30:00",
            "end_time": "07:00:00",
            "late_cutoff_time": "05:45:00",
            "order_rank": 1
        }, format='json')

        self.assertEqual(slot_res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(slot_res.data['name'], "Fajr Sabaq Roll Call")

    def test_bulk_student_attendance_and_tenant_security(self):
        """Test bulk marking student attendance and verifying cross-tenant isolation."""
        self.client.force_authenticate(user=self.admin_user_a)

        # Try to mark attendance for Student A1 and Student B (Cross-tenant)
        bulk_res = self.client.post('/api/v1/attendance/students/bulk-mark/', {
            "date": "2026-08-16",
            "override_holiday": True,
            "records": [
                {"student_id": self.student_1.id, "status": "PRESENT", "in_time": "08:00:00"},
                {"student_id": self.student_2.id, "status": "LATE", "in_time": "08:45:00", "remarks": "Traffic delay"},
                {"student_id": self.student_b.id, "status": "PRESENT"} # Tenant B! Should be ignored/rejected
            ]
        }, format='json')

        self.assertEqual(bulk_res.status_code, status.HTTP_200_OK)
        self.assertEqual(bulk_res.data['count'], 2) # Only 2 valid students for Tenant A

        # Verify records created
        att_1 = StudentAttendance.objects.filter(student=self.student_1, date="2026-08-16").first()
        self.assertIsNotNone(att_1)
        self.assertEqual(att_1.status, "PRESENT")

        att_2 = StudentAttendance.objects.filter(student=self.student_2, date="2026-08-16").first()
        self.assertIsNotNone(att_2)
        self.assertEqual(att_2.status, "LATE")

        # Verify Student B was NOT marked by User A
        att_b = StudentAttendance.objects.filter(student=self.student_b, date="2026-08-16").first()
        self.assertIsNone(att_b)

    def test_holiday_softening_auto_excuse(self):
        """Test that on scheduled holidays, bulk attendance automatically softens status to HOLIDAY_EXCUSED."""
        self.client.force_authenticate(user=self.admin_user_a)

        # Create Holiday on 2026-08-18
        AcademicCalendarEvent.objects.create(
            institution=self.inst_a,
            title="Institutional Holiday",
            event_type="INSTITUTIONAL_HOLIDAY",
            start_date="2026-08-18",
            end_date="2026-08-18",
            affects_students=True
        )

        # Bulk mark on holiday without override
        bulk_res = self.client.post('/api/v1/attendance/students/bulk-mark/', {
            "date": "2026-08-18",
            "override_holiday": False,
            "records": [
                {"student_id": self.student_1.id, "status": "PRESENT"}
            ]
        }, format='json')

        self.assertEqual(bulk_res.status_code, status.HTTP_200_OK)
        att = StudentAttendance.objects.filter(student=self.student_1, date="2026-08-18").first()
        self.assertEqual(att.status, "HOLIDAY_EXCUSED")

    def test_monthly_31_day_matrix_calculation(self):
        """Test monthly matrix generation across Days 1 to 31."""
        self.client.force_authenticate(user=self.admin_user_a)

        # Mark attendances for student 1 on multiple days in August 2026
        StudentAttendance.objects.create(student=self.student_1, date="2026-08-01", status="PRESENT")
        StudentAttendance.objects.create(student=self.student_1, date="2026-08-02", status="PRESENT")
        StudentAttendance.objects.create(student=self.student_1, date="2026-08-03", status="ABSENT")

        matrix_res = self.client.get(f'/api/v1/attendance/students/monthly-matrix/?class_id={self.class_a.id}&year=2026&month=8')
        self.assertEqual(matrix_res.status_code, status.HTTP_200_OK)
        self.assertEqual(matrix_res.data['total_days'], 31)
        self.assertEqual(len(matrix_res.data['students_matrix']), 2)

        s1_row = next(r for r in matrix_res.data['students_matrix'] if r['student_id'] == self.student_1.id)
        self.assertEqual(s1_row['totals']['present'], 2)
        self.assertEqual(s1_row['totals']['absent'], 1)
        # Attendance rate = 2/3 * 100 = 66.7%
        self.assertEqual(s1_row['totals']['attendance_rate'], 66.7)
