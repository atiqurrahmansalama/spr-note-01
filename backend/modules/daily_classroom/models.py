"""
Daily Classroom Domain Models.
Re-exported from core domain models for module encapsulation while maintaining
100% database schema compatibility (app_label='core', db_table='core_...').
"""
from core.models.reports import (
    StudentDailyReport,
    ReportPortion,
    ReportErrorDetail,
    ReportStatus,
    AcademicGoal,
    DailyLessonPlan,
    LessonEvaluation,
    HomeworkAssignment,
    HomeworkSubmission,
)
from core.models.attendance import (
    AttendanceSessionSlot,
    StudentAttendance,
    GateEntryExitLog,
    AdHocHeadcountSession,
    BiometricDevice,
    RawAttendancePunchLog,
    AttendancePolicySetting,
)

__all__ = [
    'StudentDailyReport',
    'ReportPortion',
    'ReportErrorDetail',
    'ReportStatus',
    'AcademicGoal',
    'DailyLessonPlan',
    'LessonEvaluation',
    'HomeworkAssignment',
    'HomeworkSubmission',
    'AttendanceSessionSlot',
    'StudentAttendance',
    'GateEntryExitLog',
    'AdHocHeadcountSession',
    'BiometricDevice',
    'RawAttendancePunchLog',
    'AttendancePolicySetting',
]
