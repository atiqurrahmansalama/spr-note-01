"""
Academic Structure Domain Models.
Re-exported from core domain models for module encapsulation while maintaining
100% database schema compatibility (app_label='core', db_table='core_...').
"""
from core.models.institutions import (
    AcademicInstitution,
    AcademicInstitution as Institution,
    InstitutionCategory,
    Address,
    AcademicBranch,
    AcademicDepartment,
    TenantTaxonomySetting,
)
from core.models.academy import (
    StudentClass,
    ClassSection,
    ClassPeriodSlot,
    StudentGroup,
    Session,
    ResidentialBuilding,
    DormitoryRoom,
    BedAllocation,
)

__all__ = [
    'AcademicInstitution',
    'Institution',
    'InstitutionCategory',
    'Address',
    'AcademicBranch',
    'AcademicDepartment',
    'TenantTaxonomySetting',
    'StudentClass',
    'ClassSection',
    'ClassPeriodSlot',
    'StudentGroup',
    'Session',
    'ResidentialBuilding',
    'DormitoryRoom',
    'BedAllocation',
]
