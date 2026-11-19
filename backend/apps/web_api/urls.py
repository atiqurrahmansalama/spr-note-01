"""
Web API Service Routing Aggregator.
Demonstrates clean domain module mounting for multi-project architecture.
"""
from django.urls import path, include

urlpatterns = [
    path('iam/', include('modules.iam.urls')),
    path('academic/', include('modules.academic_structure.urls')),
    path('students/', include('modules.student_management.urls')),
    path('staff/', include('modules.staff_management.urls')),
    path('classroom/', include('modules.daily_classroom.urls')),
    path('finance/', include('modules.finance.urls')),
    path('helpdesk/', include('modules.helpdesk.urls')),
    path('system-control/', include('modules.system_control.urls')),
]
