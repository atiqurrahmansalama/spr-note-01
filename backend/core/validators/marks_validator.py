"""
Examination & Mark Entry Validators
"""

from rest_framework.exceptions import ValidationError


def validate_obtained_marks(obtained, full_marks: float, subject_name: str = "Subject"):
    """
    Validates that obtained mark is non-negative and does not exceed full marks.
    """
    if obtained is None or obtained == '':
        return
    try:
        val = float(obtained)
        if val < 0:
            raise ValidationError({
                "obtained_marks": f"{subject_name}: Obtained marks cannot be negative."
            })
        if full_marks and val > float(full_marks):
            raise ValidationError({
                "obtained_marks": f"{subject_name}: Obtained marks ({val}) cannot exceed full marks ({full_marks})."
            })
    except (ValueError, TypeError):
        raise ValidationError({"obtained_marks": f"{subject_name}: Invalid numerical marks entry."})


def validate_exam_is_unlocked(exam_session, is_supervisor: bool = False):
    """
    Validates whether mark entry is allowed or locked.
    """
    if not exam_session:
        return
    if getattr(exam_session, 'is_locked', False) and not is_supervisor:
        raise ValidationError(
            {"detail": "Marks ledger is officially locked. Supervisor override is required to edit."}
        )
