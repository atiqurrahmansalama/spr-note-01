"""
Staff Management Views & ViewSets.
"""
from core.views.staff import (
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
