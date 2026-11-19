"""
Staff Management Domain Models.
Re-exported from core domain models for module encapsulation while maintaining
100% database schema compatibility (app_label='core', db_table='core_...').
"""
from core.models.staff import (
    StaffProfile,
    TeacherDetail,
    GeneralStaffDetail,
    TeacherAssignment,
    GeneralStaffDuty,
    StaffAttendance,
    StaffLeaveRequest,
    StaffOnboardingToken,
)

__all__ = [
    'StaffProfile',
    'TeacherDetail',
    'GeneralStaffDetail',
    'TeacherAssignment',
    'GeneralStaffDuty',
    'StaffAttendance',
    'StaffLeaveRequest',
    'StaffOnboardingToken',
]
