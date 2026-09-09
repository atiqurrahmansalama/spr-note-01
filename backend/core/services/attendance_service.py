"""
Attendance Domain Mutations & Bulk Processing Services
"""

from typing import List, Dict, Any
from django.db import transaction
from core.models.attendance import StudentAttendance
from core.validators.attendance_validator import validate_attendance_date


@transaction.atomic
def record_bulk_classroom_attendance(
    institution_id: str,
    class_id: str,
    attendance_date: str,
    records: List[Dict[str, Any]],
    marked_by_id: str = None
) -> Dict[str, Any]:
    """
    Atomically updates or creates daily attendance records for a class roster.
    """
    valid_date = validate_attendance_date(attendance_date)
    student_ids = [r['student_id'] for r in records if 'student_id' in r]

    # Delete existing entries for this class/date scope to allow idempotent save
    StudentAttendance.objects.filter(
        student_class_id=class_id,
        date=valid_date,
        student_id__in=student_ids
    ).delete()

    created_objects = []
    for r in records:
        created_objects.append(
            StudentAttendance(
                student_id=r.get('student_id'),
                student_class_id=class_id,
                date=valid_date,
                status=r.get('status', 'PRESENT'),
                remarks=r.get('remarks', ''),
                marked_by_id=marked_by_id
            )
        )

    StudentAttendance.objects.bulk_create(created_objects)
    return {
        'date': str(valid_date),
        'class_id': str(class_id),
        'saved_count': len(created_objects)
    }
