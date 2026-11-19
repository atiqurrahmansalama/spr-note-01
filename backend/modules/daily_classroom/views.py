"""
Daily Classroom Views & ViewSets.
"""
from core.views.reports import (
    StudentDailyReportViewSet,
    VerifyReportView,
    AcademicGoalViewSet,
    DailyLessonPlanViewSet,
    LessonEvaluationViewSet,
    HomeworkAssignmentViewSet,
    HomeworkSubmissionViewSet,
    AcademicReportViewSet,
)
from core.views.attendance import (
    AttendanceSlotViewSet,
    StudentAttendanceViewSet,
    TeacherMatrixViewSet,
    GateLogViewSet,
    AdHocHeadcountViewSet,
    BiometricDeviceViewSet,
    BiometricGatewayViewSet,
    AttendancePolicyViewSet,
)
from core.views.academy import (
    CalendarEventViewSet,
    InstitutionalTaskViewSet,
    DynamicPeriodSlotViewSet,
    TeacherRoutineScheduleViewSet,
)

__all__ = [
    'StudentDailyReportViewSet',
    'VerifyReportView',
    'AcademicGoalViewSet',
    'DailyLessonPlanViewSet',
    'LessonEvaluationViewSet',
    'HomeworkAssignmentViewSet',
    'HomeworkSubmissionViewSet',
    'AcademicReportViewSet',
    'AttendanceSlotViewSet',
    'StudentAttendanceViewSet',
    'TeacherMatrixViewSet',
    'GateLogViewSet',
    'AdHocHeadcountViewSet',
    'BiometricDeviceViewSet',
    'BiometricGatewayViewSet',
    'AttendancePolicyViewSet',
    'CalendarEventViewSet',
    'InstitutionalTaskViewSet',
    'DynamicPeriodSlotViewSet',
    'TeacherRoutineScheduleViewSet',
]
