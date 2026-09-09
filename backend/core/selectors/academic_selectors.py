"""
Academic Hierarchy Selectors
Encapsulates departments, classes, sections, groups, curriculum books, and exam schedules.
"""

from typing import Optional
from django.db.models import QuerySet
from core.models.institutions import AcademicDepartment
from core.models.academy import (
    Session,
    StudentClass,
    ClassSection,
    AcademicCalendarEvent
)


def get_academic_years(institution_id: Optional[str] = None) -> QuerySet:
    """Retrieve all academic sessions."""
    return Session.objects.all().order_by('-created_at')


def get_departments(institution_id: str) -> QuerySet:
    """Retrieve departments for an institution."""
    if not institution_id:
        return AcademicDepartment.objects.none()
    return AcademicDepartment.objects.filter(institution_id=institution_id, is_active=True).order_by('order_rank', 'name')


def get_classes_with_sections(institution_id: str, department_id: Optional[str] = None) -> QuerySet:
    """Retrieve classes along with nested sections."""
    if not institution_id:
        return StudentClass.objects.none()
    qs = StudentClass.objects.prefetch_related('sections').filter(institution_id=institution_id, is_active=True)
    if department_id and str(department_id).upper() != 'ALL':
        qs = qs.filter(department_id=department_id)
    return qs.order_by('order_rank', 'name')


def get_calendar_events(institution_id: str) -> QuerySet:
    """Retrieve calendar events for an institution."""
    if not institution_id:
        return AcademicCalendarEvent.objects.none()
    return AcademicCalendarEvent.objects.filter(institution_id=institution_id, is_deleted=False).order_by('start_date')
