"""
Staff Management Module
Encapsulates Staff Profiles, Teacher Assignments, General Staff Duties,
Staff Attendance, Leave Requests, and Onboarding Pipeline.
"""
from .views import (
    StaffProfileViewSet,
    TeacherAssignmentViewSet,
    GeneralStaffDutyViewSet,
    StaffAttendanceViewSet,
    StaffLeaveRequestViewSet,
    StaffOnboardingTokenViewSet,
    PublicStaffOnboardingVerifyView,
    StaffOnboardingApplyView,
)

__all__ = [
    'StaffProfileViewSet',
    'TeacherAssignmentViewSet',
    'GeneralStaffDutyViewSet',
    'StaffAttendanceViewSet',
    'StaffLeaveRequestViewSet',
    'StaffOnboardingTokenViewSet',
    'PublicStaffOnboardingVerifyView',
    'StaffOnboardingApplyView',
]
