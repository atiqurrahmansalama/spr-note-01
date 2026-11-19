"""
Academic Structure Views & ViewSets.
"""
from core.views.institutions import (
    InstitutionViewSet,
    InstitutionCategoryViewSet,
    AcademicBranchViewSet,
    AcademicDepartmentViewSet,
    TenantTaxonomySettingViewSet,
)
from core.views.academy import (
    ClassSectionViewSet,
    ClassPeriodSlotViewSet,
    StudentClassViewSet,
    StudentGroupViewSet,
    SessionViewSet,
    ResidentialBuildingViewSet,
    DormitoryRoomViewSet,
    BedAllocationViewSet,
)

__all__ = [
    'InstitutionViewSet',
    'InstitutionCategoryViewSet',
    'TenantTaxonomySettingViewSet',
    'AcademicBranchViewSet',
    'AcademicDepartmentViewSet',
    'ClassSectionViewSet',
    'ClassPeriodSlotViewSet',
    'StudentClassViewSet',
    'StudentGroupViewSet',
    'SessionViewSet',
    'ResidentialBuildingViewSet',
    'DormitoryRoomViewSet',
    'BedAllocationViewSet',
]
