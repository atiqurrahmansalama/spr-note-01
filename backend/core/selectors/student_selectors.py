"""
Student Selectors
Encapsulates high-performance queries for student records and class rosters.
"""

from typing import Optional
from django.db.models import QuerySet
from core.models.students import Student


def get_scoped_students(
    institution_id: str,
    class_id: Optional[str] = None,
    section_id: Optional[str] = None,
    department_id: Optional[str] = None,
    search_query: Optional[str] = None
) -> QuerySet:
    """Retrieve multi-tenant scoped student list with relational lookups."""
    if not institution_id:
        return Student.objects.none()

    qs = Student.objects.select_related(
        'student_class', 'section', 'student_class__department', 'student_group', 'institution', 'branch'
    ).filter(institution_id=institution_id, is_deleted=False)

    if class_id and str(class_id).upper() != 'ALL':
        qs = qs.filter(student_class_id=class_id)

    if section_id and str(section_id).upper() != 'ALL':
        qs = qs.filter(section_id=section_id)

    if department_id and str(department_id).upper() != 'ALL':
        qs = qs.filter(student_class__department_id=department_id)

    if search_query:
        from django.db.models import Q
        q = search_query.strip()
        qs = qs.filter(
            Q(name_en__icontains=q) |
            Q(name__icontains=q) |
            Q(uniq_id__icontains=q)
        )

    return qs.order_by('roll_number', 'name_en')


def get_student_by_id(student_id: str, institution_id: Optional[str] = None) -> Optional[Student]:
    """Retrieve individual student with guard for tenant scoping."""
    if not student_id:
        return None
    qs = Student.objects.select_related('student_class', 'section', 'student_class__department', 'institution')
    if institution_id:
        qs = qs.filter(institution_id=institution_id)
    return qs.filter(id=student_id).first()


def get_students_by_class(institution_id: str, class_id: str) -> QuerySet:
    """Retrieve all students enrolled in a specific class."""
    return get_scoped_students(institution_id=institution_id, class_id=class_id)
