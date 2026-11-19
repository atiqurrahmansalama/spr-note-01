"""
Academic Structure Module Routing Table.
Provides RESTful endpoints for institutions, branches, departments, classes,
sections, period slots, dormitory facilities, and taxonomy configurations.
"""
from django.urls import path, include
from rest_framework.routers import SimpleRouter

from .views import (
    InstitutionViewSet,
    InstitutionCategoryViewSet,
    TenantTaxonomySettingViewSet,
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
)

router = SimpleRouter()
router.register(r'institutions', InstitutionViewSet, basename='academic-institutions')
router.register(r'institution-categories', InstitutionCategoryViewSet, basename='academic-institution-categories')
router.register(r'branches', AcademicBranchViewSet, basename='academic-branches')
router.register(r'departments', AcademicDepartmentViewSet, basename='academic-departments')
router.register(r'classes', StudentClassViewSet, basename='academic-classes')
router.register(r'sections', ClassSectionViewSet, basename='academic-sections')
router.register(r'periods', ClassPeriodSlotViewSet, basename='academic-periods')
router.register(r'groups', StudentGroupViewSet, basename='academic-groups')
router.register(r'sessions', SessionViewSet, basename='academic-sessions')
router.register(r'residential-buildings', ResidentialBuildingViewSet, basename='academic-residential-buildings')
router.register(r'dormitory-rooms', DormitoryRoomViewSet, basename='academic-dormitory-rooms')
router.register(r'bed-allocations', BedAllocationViewSet, basename='academic-bed-allocations')
router.register(r'taxonomies', TenantTaxonomySettingViewSet, basename='academic-taxonomies')

urlpatterns = [
    path('', include(router.urls)),
]
