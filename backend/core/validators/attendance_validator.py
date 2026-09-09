"""
Attendance Date & Check-in Validators
"""

from datetime import datetime, date
from rest_framework.exceptions import ValidationError


def validate_attendance_date(target_date_str: str, allow_future: bool = False):
    """
    Validates attendance date format and prevents accidental future-date marking.
    """
    if not target_date_str:
        raise ValidationError({"date": "Attendance date is required."})
    try:
        parsed_date = datetime.strptime(str(target_date_str), "%Y-%m-%d").date()
    except ValueError:
        raise ValidationError({"date": "Invalid date format. Expected YYYY-MM-DD."})

    if not allow_future and parsed_date > date.today():
        raise ValidationError({"date": "Future date attendance recording is prohibited."})
    return parsed_date


def validate_no_duplicate_checkin(existing_record, student_name: str = "Student"):
    """
    Validates that a duplicate daily check-in is not created.
    """
    if existing_record:
        raise ValidationError({
            "duplicate": f"Attendance record for {student_name} already exists for this date."
        })
