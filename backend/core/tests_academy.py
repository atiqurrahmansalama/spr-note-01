import datetime
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

from core.models import (
    AcademicInstitution,
    AcademicDepartment,
    StudentClass,
    AcademicBranch,
    ClassSection,
    ClassPeriodSlot,
    StaffProfile,
    Student,
)

User = get_user_model()


class AcademyModelsAndAPITestCase(APITestCase):
    """
    Automated Test Suite for Multi-Branch, Section & Dynamic Period Scheduling Engine
    """

    def setUp(self):
        self.institution = AcademicInstitution.objects.create(
            name="Darul Uloom Central Campus",
            slug="darul-uloom-central",
            institution_type="MADRASA",
            phone="01700000001",
            email="central@darululoom.edu",
        )

        self.admin_user = User.objects.create_user(
            phone_number="01712345678",
            password="securePassword123",
            user_type="ADMIN",
            institution=self.institution
        )

        self.staff_user = User.objects.create_user(
            phone_number="01812345678",
            password="securePassword123",
            user_type="TEACHER",
            name="Mawlana Zaid",
            institution=self.institution
        )

        self.staff_profile = StaffProfile.objects.create(
            user=self.staff_user,
            institution=self.institution,
            employee_id="STF-001",
            staff_type="TEACHING",
            designation="Senior Ustadh"
        )

        self.department = AcademicDepartment.objects.create(
            institution=self.institution,
            name="Hifz Department",
            code="HIFZ-01",
            has_quran_tracker=True,
            order_rank=1
        )

        self.student_class = StudentClass.objects.create(
            institution=self.institution,
            department=self.department,
            name="Hifz Final Year",
            code="HFZ-FIN",
            department_type="HIFZ",
            order_rank=1
        )

        self.client.force_authenticate(user=self.admin_user)

    def test_branch_model_and_crud_api(self):
        # Create branch via API
        payload = {
            "branch_name": "Mirpur Campus",
            "branch_code": "MIR-01",
            "branch_type": "SUB_BRANCH",
            "in_charge_staff": str(self.staff_profile.id),
            "contact_phone": "01911223344",
            "contact_email": "mirpur@darululoom.edu",
            "address": "Section 10, Mirpur, Dhaka",
            "district": "Dhaka",
            "division": "Dhaka",
            "is_active": True
        }

        res = self.client.post("/api/v1/academy/branches/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        branch_id = res.data["id"]
        self.assertEqual(res.data["branch_name"], "Mirpur Campus")
        self.assertEqual(res.data["in_charge_name"], "Mawlana Zaid")

        # Get metrics
        metrics_res = self.client.get("/api/v1/academy/branches/metrics/")
        self.assertEqual(metrics_res.status_code, status.HTTP_200_OK)
        self.assertEqual(metrics_res.data["total_branches"], 1)
        self.assertEqual(metrics_res.data["sub_branches"], 1)

        # Get stats
        stats_res = self.client.get(f"/api/v1/academy/branches/{branch_id}/stats/")
        self.assertEqual(stats_res.status_code, status.HTTP_200_OK)
        self.assertEqual(stats_res.data["total_sections"], 0)

    def test_class_section_model_and_capacity(self):
        branch = AcademicBranch.objects.create(
            institution=self.institution,
            branch_name="Uttara Campus",
            branch_code="UTT-01",
            branch_type="MAIN_CAMPUS"
        )

        section_payload = {
            "student_class": str(self.student_class.id),
            "branch": str(branch.id),
            "section_name": "Halqa A - Tajweed",
            "section_type": "HIFZ_HALQA",
            "room_number": "Room 302",
            "max_capacity": 30,
            "class_teacher": str(self.staff_profile.id),
            "is_active": True
        }

        res = self.client.post("/api/v1/academy/sections/", section_payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        section_id = res.data["id"]

        # Create student assigned to this section & branch
        student = Student.objects.create(
            institution=self.institution,
            name_en="Abdur Rahman",
            student_class=self.student_class,
            branch=branch,
            section_id=section_id
        )

        # Retrieve section and verify capacity
        get_res = self.client.get(f"/api/v1/academy/sections/{section_id}/")
        self.assertEqual(get_res.status_code, status.HTTP_200_OK)
        self.assertEqual(get_res.data["enrolled_students"], 1)
        self.assertAlmostEqual(get_res.data["capacity_percentage"], 3.3, places=1)

    def test_class_period_slot_and_auto_duration(self):
        # Create period slot with start and end times
        slot_payload = {
            "period_name": "1st Period: Quran Recitation",
            "slot_type": "TEACHING_PERIOD",
            "period_order": 1,
            "start_time": "08:00:00",
            "end_time": "08:45:00",
            "department": str(self.department.id),
            "student_class": str(self.student_class.id),
            "is_active": True
        }

        res = self.client.post("/api/v1/academy/periods/", slot_payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["duration_minutes"], 45)
        slot1_id = res.data["id"]

        # Create break period slot
        slot2_payload = {
            "period_name": "Tiffin / Breakfast Break",
            "slot_type": "BREAK_TIFFIN",
            "period_order": 2,
            "start_time": "08:45:00",
            "end_time": "09:15:00",
            "department": str(self.department.id),
            "is_active": True
        }
        res2 = self.client.post("/api/v1/academy/periods/", slot2_payload, format="json")
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res2.data["duration_minutes"], 30)
        slot2_id = res2.data["id"]

        # Test bulk reorder action
        reorder_payload = [
            {"id": slot1_id, "period_order": 2},
            {"id": slot2_id, "period_order": 1}
        ]
        reorder_res = self.client.post("/api/v1/academy/periods/reorder/", reorder_payload, format="json")
        self.assertEqual(reorder_res.status_code, status.HTTP_200_OK)

        slot1_obj = ClassPeriodSlot.objects.get(id=slot1_id)
        self.assertEqual(slot1_obj.period_order, 2)

    def test_department_requires_institution_and_accepts_branch(self):
        # Create department with branch
        branch = AcademicBranch.objects.create(
            institution=self.institution,
            branch_name="Uttara Branch",
            branch_code="UTT-01"
        )
        res = self.client.post("/api/v1/departments/", {
            "name": "General Education Department",
            "code": "GEN-01",
            "branch": str(branch.id),
            "order_rank": 2,
            "is_active": True
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["branch_name"], "Uttara Branch")

        # Create department without branch (institution-wide / main campus)
        res2 = self.client.post("/api/v1/departments/", {
            "name": "Qirat Department",
            "code": "QRT-01",
            "branch": None,
            "order_rank": 3,
            "is_active": True
        }, format="json")
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res2.data["branch"], None)

    def test_class_strictly_requires_department(self):
        # Fails without department
        res = self.client.post("/api/v1/classes/", {
            "name": "Class 10 Without Department",
            "code": "CLS-10",
            "department": None,
            "order_rank": 1,
            "is_active": True
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        details = res.data.get("details", res.data)
        self.assertIn("department", details)

        # Succeeds with department
        res_valid = self.client.post("/api/v1/classes/", {
            "name": "Class 10 With Department",
            "code": "CLS-10",
            "department": str(self.department.id),
            "order_rank": 1,
            "is_active": True
        }, format="json")
        self.assertEqual(res_valid.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res_valid.data["department_name"], "Hifz Department")

    def test_group_strictly_requires_class(self):
        # Fails without student_class
        res = self.client.post("/api/v1/groups/", {
            "name": "Halqa Without Class",
            "student_class": None,
            "capacity": 20,
            "is_active": True
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        details = res.data.get("details", res.data)
        self.assertIn("student_class", details)

        # Succeeds with student_class
        res_valid = self.client.post("/api/v1/groups/", {
            "name": "Halqa Abu Bakr",
            "student_class": str(self.student_class.id),
            "capacity": 25,
            "is_active": True
        }, format="json")
        self.assertEqual(res_valid.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res_valid.data["student_class_name"], "Hifz Final Year")
