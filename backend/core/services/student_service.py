"""
Student Domain Mutations & Business Workflows
"""

from typing import Dict, Any
from django.db import transaction
from core.models.students import Student
from core.validators.tenant_validator import validate_tenant_match


@transaction.atomic
def register_student(institution_id: str, data: Dict[str, Any]) -> Student:
    """
    Registers a new student strictly within the active institution scope.
    """
    if data.get('institution_id'):
        validate_tenant_match(data['institution_id'], institution_id, "Student Registration")

    # Generate sequential unique ID if not provided
    student = Student.objects.create(
        institution_id=institution_id,
        full_name=data.get('full_name'),
        roll_number=data.get('roll_number'),
        gender=data.get('gender', 'MALE'),
        date_of_birth=data.get('date_of_birth'),
        blood_group=data.get('blood_group', 'UNKNOWN'),
        student_class_id=data.get('student_class_id') or data.get('class_id'),
        section_id=data.get('section_id'),
        department_id=data.get('department_id'),
        group_id=data.get('group_id'),
        residential_status=data.get('residential_status', 'NON_RESIDENTIAL'),
        phone=data.get('phone', ''),
        emergency_contact=data.get('emergency_contact', ''),
        status='ACTIVE'
    )
    return student


def promote_student_class(
    student_id: str,
    target_class_id: str,
    target_section_id: str = None,
    institution_id: str = None
) -> Student:
    """Promotes a student to the next class tier."""
    student = Student.objects.filter(id=student_id).first()
    if not student:
        raise ValueError(f"Student #{student_id} not found.")

    if institution_id:
        validate_tenant_match(student.institution_id, institution_id, "Student Promotion")

    student.student_class_id = target_class_id
    if target_section_id:
        student.section_id = target_section_id
    student.save()
    return student
