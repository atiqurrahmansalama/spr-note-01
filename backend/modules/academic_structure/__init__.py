"""
Academic Structure Module
Encapsulates Institutions, Campuses/Branches, Departments, Classes, Sections,
Period Slots, Residential Facilities, and Academic Taxonomy Settings.
"""

from .views import (
    InstitutionViewSet,
    InstitutionCategoryViewSet,
    AcademicBranchViewSet,
    ClassSectionViewSet,
    ClassPeriodSlotViewSet,
    AcademicDepartmentViewSet,
    StudentClassViewSet,
    StudentGroupViewSet,
    SessionViewSet,
    ResidentialBuildingViewSet,
    DormitoryRoomViewSet,
    BedAllocationViewSet,
    TenantTaxonomySettingViewSet,
)

__all__ = [
    'InstitutionViewSet',
    'InstitutionCategoryViewSet',
    'AcademicBranchViewSet',
    'ClassSectionViewSet',
    'ClassPeriodSlotViewSet',
    'AcademicDepartmentViewSet',
    'StudentClassViewSet',
    'StudentGroupViewSet',
    'SessionViewSet',
    'ResidentialBuildingViewSet',
    'DormitoryRoomViewSet',
    'BedAllocationViewSet',
    'TenantTaxonomySettingViewSet',
]
