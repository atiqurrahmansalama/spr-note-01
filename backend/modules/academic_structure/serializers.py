"""
Academic Structure Serializers.
"""
from core.serializers.institutions import (
    AcademicInstitutionSerializer,
    AcademicInstitutionSerializer as InstitutionSerializer,
    InstitutionCategorySerializer,
    AcademicBranchSerializer,
    AcademicDepartmentSerializer,
    TenantTaxonomySettingSerializer,
)
from core.serializers.academy import (
    ClassSectionSerializer,
    ClassPeriodSlotSerializer,
    StudentClassSerializer,
    StudentGroupSerializer,
    SessionSerializer,
    ResidentialBuildingSerializer,
    DormitoryRoomSerializer,
    BedAllocationSerializer,
)

__all__ = [
    'AcademicInstitutionSerializer',
    'InstitutionSerializer',
    'InstitutionCategorySerializer',
    'AcademicBranchSerializer',
    'AcademicDepartmentSerializer',
    'TenantTaxonomySettingSerializer',
    'ClassSectionSerializer',
    'ClassPeriodSlotSerializer',
    'StudentClassSerializer',
    'StudentGroupSerializer',
    'SessionSerializer',
    'ResidentialBuildingSerializer',
    'DormitoryRoomSerializer',
    'BedAllocationSerializer',
]
