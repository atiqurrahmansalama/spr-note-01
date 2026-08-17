from django.test import TestCase
from django.utils import timezone
from datetime import timedelta, time
from core.models import (
    User,
    UserRole,
    AcademicInstitution,
    AcademicDepartment,
    StudentClass,
    StudentGroup,
    Session,
    StaffProfile,
    TeacherDetail,
    GeneralStaffDetail,
    TeacherAssignment,
    GeneralStaffDuty,
    StaffAttendance,
    StaffLeaveRequest,
    RoleInviteToken,
)
from core.services import (
    StaffOnboardingService,
    StaffAttendanceService,
    StaffLeaveService,
    delete_staff_profile_with_cascading,
)
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken


class TeacherAndStaffManagementTestCase(TestCase):
    def setUp(self):
        # Create Super Admin
        self.super_admin = User.objects.create_superuser(
            phone_number='01700000001',
            password='TestPassword123!',
            name='Super Admin'
        )

        # Create Institution A & B
        self.inst_a = AcademicInstitution.objects.create(
            name='Institution Alpha',
            slug='inst-alpha',
            phone='01711111111'
        )
        self.inst_b = AcademicInstitution.objects.create(
            name='Institution Beta',
            slug='inst-beta',
            phone='01722222222'
        )

        # Create Admin for Institution A
        self.inst_a_admin = User.objects.create_user(
            phone_number='01733333333',
            password='TestPassword123!',
            name='Admin Alpha',
            user_type='ADMIN',
            institution=self.inst_a
        )

        # Academic hierarchy for Inst A
        self.dept_hifz = AcademicDepartment.objects.create(
            institution=self.inst_a,
            name='Hifzul Quran',
            code='HIFZ-A',
            has_quran_tracker=True
        )
        self.class_hifz_1 = StudentClass.objects.create(
            institution=self.inst_a,
            department=self.dept_hifz,
            name='Class Hifz One',
            code='CH-1'
        )
        self.group_hifz_1 = StudentGroup.objects.create(
            institution=self.inst_a,
            student_class=self.class_hifz_1,
            name='Halqa Abu Bakr'
        )
        self.session_2026 = Session.objects.create(name='Academic 2026', created_by=self.super_admin)

        # Academic hierarchy for Inst B (for cross-tenant tests)
        self.dept_b = AcademicDepartment.objects.create(
            institution=self.inst_b,
            name='Department Beta',
            code='DEPT-B'
        )
        self.class_b = StudentClass.objects.create(
            institution=self.inst_b,
            department=self.dept_b,
            name='Class Beta One',
            code='CB-1'
        )

        self.client = APIClient()

    def get_auth_client(self, user):
        client = APIClient()
        token = str(RefreshToken.for_user(user).access_token)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        return client

    def test_01_staff_onboarding_service_invite(self):
        """Test inviting a teacher creates User, StaffProfile, TeacherDetail, and RoleInviteToken."""
        invite_data = {
            'phone_number': '01744444444',
            'name': 'Ustadh Qari Tariq',
            'email': 'tariq@institution.edu',
            'staff_type': 'TEACHING',
            'designation': 'Senior Hifz Teacher',
            'department_id': str(self.dept_hifz.id),
            'highest_degree': 'Dawra-e-Hadith / Masters in Islamic Studies',
            'specialization': 'Tajweed & 30 Juz Hifz'
        }

        res = StaffOnboardingService.invite_staff(
            institution=self.inst_a,
            creator_user=self.inst_a_admin,
            data=invite_data
        )

        self.assertEqual(res['status'], 'success')
        self.assertTrue(res['invite_token'])

        staff = StaffProfile.objects.get(id=res['staff_id'])
        self.assertEqual(staff.employee_id, res['employee_id'])
        self.assertEqual(staff.staff_type, 'TEACHING')
        self.assertEqual(staff.designation, 'Senior Hifz Teacher')
        self.assertEqual(staff.institution, self.inst_a)

        # Polymorphic TeacherDetail verification
        self.assertTrue(hasattr(staff, 'teacher_detail'))
        self.assertEqual(staff.teacher_detail.specialization, 'Tajweed & 30 Juz Hifz')

        # Invite token verification
        token_obj = RoleInviteToken.objects.get(token=res['invite_token'])
        self.assertTrue(token_obj.is_valid())
        self.assertEqual(token_obj.created_by, self.inst_a_admin)

    def test_02_general_staff_creation_and_duty(self):
        """Test creating non-teaching staff and assigning non-academic duties."""
        user_support = User.objects.create_user(
            phone_number='01755555555',
            name='Abdur Rahim',
            institution=self.inst_a,
            user_type='STAFF'
        )

        staff = StaffProfile.objects.create(
            user=user_support,
            institution=self.inst_a,
            employee_id='STF-2026-001',
            staff_type='SUPPORT',
            designation='Hostel Superintendent / Warden',
            salary_type='MONTHLY',
            base_salary=25000.00
        )
        GeneralStaffDetail.objects.create(
            staff=staff,
            assigned_zone='Hostel Building 1',
            shift_type='NIGHT'
        )

        self.assertTrue(hasattr(staff, 'general_detail'))
        self.assertEqual(staff.general_detail.assigned_zone, 'Hostel Building 1')
        self.assertEqual(staff.general_detail.shift_type, 'NIGHT')

        # Assign Duty
        duty = GeneralStaffDuty.objects.create(
            staff=staff,
            duty_title='Hostel Evening Roll Call & Security Lockup',
            effective_from=timezone.now().date(),
            priority='HIGH'
        )
        self.assertTrue(duty.is_active)
        self.assertEqual(staff.duties.count(), 1)

    def test_03_teacher_assignment_and_cross_tenant_guard(self):
        """Test teacher assignment to class and ensure cross-tenant validation blocks unauthorized leaks."""
        user_teacher = User.objects.create_user(
            phone_number='01766666666',
            name='Ustadh Bilal',
            institution=self.inst_a,
            user_type='TEACHER'
        )
        teacher_profile = StaffProfile.objects.create(
            user=user_teacher,
            institution=self.inst_a,
            employee_id='TEA-2026-002',
            staff_type='TEACHING',
            designation='Assistant Teacher'
        )
        TeacherDetail.objects.create(staff=teacher_profile)

        # Valid Assignment within Inst A
        assignment = TeacherAssignment.objects.create(
            teacher=teacher_profile,
            assigned_class=self.class_hifz_1,
            assigned_group=self.group_hifz_1,
            session=self.session_2026,
            role_in_class='LEAD_TEACHER'
        )
        self.assertTrue(assignment.is_active)

        # API Cross-Tenant validation test via Serializer
        from core.serializers import TeacherAssignmentSerializer
        cross_tenant_data = {
            'teacher': str(teacher_profile.id),
            'assigned_class': str(self.class_b.id),  # Class from Institution Beta!
            'session': self.session_2026.id,
            'role_in_class': 'LEAD_TEACHER'
        }
        serializer = TeacherAssignmentSerializer(data=cross_tenant_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('assigned_class', serializer.errors)
        self.assertIn('Cross-tenant violation', str(serializer.errors['assigned_class']))

    def test_04_staff_bulk_attendance_and_monthly_summary(self):
        """Test bulk punch attendance with late calculation and monthly analytics summary."""
        user_1 = User.objects.create_user(phone_number='01777777771', name='Staff 1', institution=self.inst_a)
        staff_1 = StaffProfile.objects.create(user=user_1, institution=self.inst_a, employee_id='STF-01', staff_type='TEACHING', designation='Teacher')

        user_2 = User.objects.create_user(phone_number='01777777772', name='Staff 2', institution=self.inst_a)
        staff_2 = StaffProfile.objects.create(user=user_2, institution=self.inst_a, employee_id='STF-02', staff_type='SUPPORT', designation='Staff')

        today = timezone.now().date()
        records = [
            {'staff_id': str(staff_1.id), 'status': 'PRESENT', 'in_time': '08:45:00', 'out_time': '16:00:00'},
            {'staff_id': str(staff_2.id), 'status': 'PRESENT', 'in_time': '09:30:00', 'out_time': '17:00:00'} # Late arrival (> 09:15)
        ]

        result = StaffAttendanceService.bulk_punch_attendance(
            institution=self.inst_a,
            date_val=today,
            records=records,
            recorded_by=self.inst_a_admin
        )
        self.assertEqual(result['processed_count'], 2)

        att_1 = StaffAttendance.objects.get(staff=staff_1, date=today)
        self.assertEqual(att_1.status, 'PRESENT')

        att_2 = StaffAttendance.objects.get(staff=staff_2, date=today)
        self.assertEqual(att_2.status, 'LATE')  # Auto-calculated late status!

        # Monthly summary
        summary = StaffAttendanceService.get_monthly_analytics_summary(
            institution=self.inst_a,
            year=today.year,
            month=today.month
        )
        self.assertEqual(summary['total_staff_count'], 2)
        self.assertEqual(summary['present_count'], 1)
        self.assertEqual(summary['late_count'], 1)
        self.assertEqual(summary['attendance_percentage'], 100.0)

    def test_05_leave_approval_auto_attendance_sync(self):
        """Test that approving a leave request automatically creates/syncs ON_LEAVE attendance records."""
        user = User.objects.create_user(phone_number='01788888888', name='Teacher Leave', institution=self.inst_a)
        staff = StaffProfile.objects.create(user=user, institution=self.inst_a, employee_id='TEA-05', staff_type='TEACHING', designation='Teacher')

        start = timezone.now().date()
        end = start + timedelta(days=2)  # 3 days leave

        leave_req = StaffLeaveService.apply_leave(
            staff=staff,
            leave_data={
                'leave_type': 'SICK',
                'start_date': start,
                'end_date': end,
                'reason': 'Viral fever and doctor-prescribed rest.'
            }
        )
        self.assertEqual(leave_req.status, 'PENDING')

        # Approve Leave
        updated_leave = StaffLeaveService.action_leave(
            leave_request=leave_req,
            action_status='APPROVED',
            admin_user=self.inst_a_admin,
            admin_remarks='Approved. Get well soon.'
        )
        self.assertEqual(updated_leave.status, 'APPROVED')

        # Verify Attendance Sync on all 3 days
        curr = start
        while curr <= end:
            att = StaffAttendance.objects.filter(staff=staff, date=curr).first()
            self.assertIsNotNone(att)
            self.assertEqual(att.status, 'ON_LEAVE')
            self.assertEqual(att.source, 'LEAVE_APPROVAL')
            curr += timedelta(days=1)

    def test_06_soft_delete_cascading_integrity(self):
        """Test that soft-deleting a StaffProfile deactivates active assignments and duties."""
        user = User.objects.create_user(phone_number='01799999999', name='Departing Ustadh', institution=self.inst_a)
        staff = StaffProfile.objects.create(user=user, institution=self.inst_a, employee_id='TEA-99', staff_type='TEACHING', designation='Teacher')

        assignment = TeacherAssignment.objects.create(
            teacher=staff,
            assigned_class=self.class_hifz_1,
            assigned_group=self.group_hifz_1,
            session=self.session_2026,
            is_active=True
        )

        self.assertTrue(assignment.is_active)

        # Perform soft-delete
        res = delete_staff_profile_with_cascading(staff, performed_by=self.inst_a_admin)
        self.assertEqual(res['status'], 'success')
        self.assertEqual(res['deactivated_assignments'], 1)

        staff.refresh_from_db()
        self.assertTrue(staff.is_deleted)
        self.assertFalse(staff.is_active)

        assignment.refresh_from_db()
        self.assertFalse(assignment.is_active)  # Deactivated!

    def test_07_api_viewset_endpoints(self):
        """Test API endpoints for staff listing, metrics, and leave application."""
        user = User.objects.create_user(phone_number='01710101010', name='API Staff', institution=self.inst_a)
        staff = StaffProfile.objects.create(user=user, institution=self.inst_a, employee_id='STF-API-1', staff_type='TEACHING', designation='Lecturer')

        client = self.get_auth_client(self.inst_a_admin)

        # GET /api/v1/staff/
        resp = client.get('/api/v1/staff/')
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(len(resp.json()) >= 1)

        # GET /api/v1/staff/metrics/
        resp_metrics = client.get('/api/v1/staff/metrics/')
        self.assertEqual(resp_metrics.status_code, 200)
        self.assertIn('total_staff', resp_metrics.json())
        self.assertIn('teaching_staff', resp_metrics.json())

        # POST /api/v1/staff/leaves/apply/
        leave_payload = {
            'staff': str(staff.id),
            'leave_type': 'CASUAL',
            'start_date': str(timezone.now().date()),
            'end_date': str(timezone.now().date() + timedelta(days=1)),
            'reason': 'Family emergency.'
        }
        resp_leave = client.post('/api/v1/staff/leaves/apply/', leave_payload, format='json')
        self.assertEqual(resp_leave.status_code, 201)
        self.assertEqual(resp_leave.json()['status'], 'PENDING')

    def test_08_staff_onboarding_creation(self):
        """Test creating a new staff member with onboarding form modal payload."""
        new_user = User.objects.create_user(phone_number='01799999999', name='Onboarding Teacher', institution=self.inst_a)
        client = self.get_auth_client(self.inst_a_admin)

        onboarding_payload = {
            'user_id': new_user.id,
            'staff_type': 'TEACHING',
            'designation': 'Senior Qari & Ustadh',
            'department': None,
            'employment_status': 'PERMANENT',
            'joining_date': '2026-08-16',
            'emergency_contact': '01800000000',
            'nid_no': '1234567890123',
            'blood_group': 'B+',
            'salary_type': 'MONTHLY_FIXED',
            'base_salary': 25000,
            'bank_name': 'Islami Bank',
            'bank_account_no': '2050123456789',
            'mobile_banking_no': '01799999999',
            'teacher_detail': {
                'highest_degree': 'Dawra-e-Hadith',
                'specialization': 'Qira\'at & Hifz',
                'max_daily_periods': 5,
                'can_review_reports': True
            }
        }

        resp = client.post('/api/v1/staff/', onboarding_payload, format='json')
        self.assertEqual(resp.status_code, 201, resp.json() if hasattr(resp, 'json') else resp.content)
        data = resp.json()
        self.assertTrue(data['employee_id'].startswith('TEA-'))
        self.assertEqual(data['designation'], 'Senior Qari & Ustadh')
        self.assertEqual(data['teacher_detail']['specialization'], 'Qira\'at & Hifz')
