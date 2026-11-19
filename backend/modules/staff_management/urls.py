"""
Staff Management Module Routing Table.
Provides RESTful endpoints for staff profiles, teacher assignments,
general duties, attendance, leaves, and onboarding pipeline.
"""
from django.urls import path, include
from rest_framework.routers import SimpleRouter

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

router = SimpleRouter()
router.register(r'teachers', TeacherAssignmentViewSet, basename='staff-teachers')
router.register(r'duties', GeneralStaffDutyViewSet, basename='staff-duties')
router.register(r'attendance', StaffAttendanceViewSet, basename='staff-attendance')
router.register(r'leaves', StaffLeaveRequestViewSet, basename='staff-leaves')
router.register(r'onboarding-tokens', StaffOnboardingTokenViewSet, basename='staff-onboarding-tokens')
router.register(r'', StaffProfileViewSet, basename='staff-profiles')

urlpatterns = [
    # Public & authenticated onboarding verification & application
    path('onboarding/verify/', PublicStaffOnboardingVerifyView.as_view(), name='staff_onboard_verify'),
    path('onboarding/apply/', StaffOnboardingApplyView.as_view(), name='staff_onboard_apply'),
    
    # ViewSet routes
    path('', include(router.urls)),
]
