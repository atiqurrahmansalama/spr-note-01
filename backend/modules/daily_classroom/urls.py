"""
Daily Classroom Module Routing Table.
Provides RESTful endpoints for daily progress reports, attendance slots,
gate logs, biometric integration, lesson plans, goals, homework, and routines.
"""
from django.urls import path, include
from rest_framework.routers import SimpleRouter

from .views import (
    StudentDailyReportViewSet,
    VerifyReportView,
    AttendanceSlotViewSet,
    StudentAttendanceViewSet,
    TeacherMatrixViewSet,
    DynamicPeriodSlotViewSet,
    TeacherRoutineScheduleViewSet,
    GateLogViewSet,
    AdHocHeadcountViewSet,
    BiometricDeviceViewSet,
    BiometricGatewayViewSet,
    AttendancePolicyViewSet,
    AcademicGoalViewSet,
    DailyLessonPlanViewSet,
    LessonEvaluationViewSet,
    HomeworkAssignmentViewSet,
    HomeworkSubmissionViewSet,
    AcademicReportViewSet,
    CalendarEventViewSet,
    InstitutionalTaskViewSet,
)

router = SimpleRouter()
router.register(r'reports', StudentDailyReportViewSet, basename='classroom-reports')
router.register(r'calendar/events', CalendarEventViewSet, basename='classroom-calendar-events')
router.register(r'calendar/tasks', InstitutionalTaskViewSet, basename='classroom-calendar-tasks')
router.register(r'attendance/slots', AttendanceSlotViewSet, basename='classroom-attendance-slots')
router.register(r'attendance/period-slots', DynamicPeriodSlotViewSet, basename='classroom-attendance-period-slots')
router.register(r'attendance/routines', TeacherRoutineScheduleViewSet, basename='classroom-attendance-routines')
router.register(r'attendance/teacher-matrix', TeacherMatrixViewSet, basename='classroom-attendance-teacher-matrix')
router.register(r'attendance/gate-logs', GateLogViewSet, basename='classroom-attendance-gate-logs')
router.register(r'attendance/adhoc-headcounts', AdHocHeadcountViewSet, basename='classroom-attendance-adhoc-headcounts')
router.register(r'attendance/devices', BiometricDeviceViewSet, basename='classroom-attendance-devices')
router.register(r'attendance/biometric', BiometricGatewayViewSet, basename='classroom-attendance-biometric')
router.register(r'attendance/students', StudentAttendanceViewSet, basename='classroom-attendance-students')
router.register(r'attendance/policy', AttendancePolicyViewSet, basename='classroom-attendance-policy')
router.register(r'goals', AcademicGoalViewSet, basename='classroom-academic-goals')
router.register(r'lessons', DailyLessonPlanViewSet, basename='classroom-daily-lessons')
router.register(r'evaluations', LessonEvaluationViewSet, basename='classroom-evaluations')
router.register(r'homeworks', HomeworkAssignmentViewSet, basename='classroom-homeworks')
router.register(r'homework-submissions', HomeworkSubmissionViewSet, basename='classroom-homework-submissions')
router.register(r'learning-reports', AcademicReportViewSet, basename='classroom-learning-reports')

urlpatterns = [
    # Public report verification endpoint
    path('reports/verify/<str:report_id>/', VerifyReportView.as_view(), name='classroom_verify_report'),
    
    # ViewSet routes
    path('', include(router.urls)),
]
