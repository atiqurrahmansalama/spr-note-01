"""
Attendance Selectors
Encapsulates daily attendance registers, student attendance history, and aggregates.
"""

from typing import Optional, Dict, Any
from django.db.models import QuerySet, Count, Q
from core.models.attendance import StudentAttendance


def get_daily_attendance_matrix(
    institution_id: str,
    attendance_date: str,
    class_id: Optional[str] = None,
    section_id: Optional[str] = None
) -> QuerySet:
    """Retrieve day attendance records for a class."""
    if not attendance_date:
        return StudentAttendance.objects.none()

    qs = StudentAttendance.objects.select_related('student', 'marked_by').filter(
        date=attendance_date
    )

    if class_id and str(class_id).upper() != 'ALL':
        qs = qs.filter(student_class_id=class_id)

    if institution_id:
        qs = qs.filter(student__institution_id=institution_id)

    return qs.order_by('student__roll_number')


def get_student_attendance_summary(
    student_id: str,
    start_date: str,
    end_date: str
) -> Dict[str, Any]:
    """Calculate summary statistics for a student within a date window."""
    if not student_id:
        return {'total': 0, 'present': 0, 'absent': 0, 'percentage': 0.0}

    stats = StudentAttendance.objects.filter(
        student_id=student_id,
        date__range=[start_date, end_date]
    ).aggregate(
        total=Count('id'),
        present=Count('id', filter=Q(status__in=['PRESENT', 'LATE'])),
        absent=Count('id', filter=Q(status='ABSENT')),
        leave=Count('id', filter=Q(status='ON_LEAVE'))
    )

    total = stats['total'] or 0
    present = stats['present'] or 0
    pct = round((present / total * 100), 1) if total > 0 else 0.0

    return {
        'total': total,
        'present': present,
        'absent': stats['absent'] or 0,
        'leave': stats['leave'] or 0,
        'percentage': pct
    }
