import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BuildingOfficeIcon,
  DepartmentIcon,
  ClassIcon,
  UsersIcon,
  StudentIcon,
  CheckCircleIcon,
  TeacherIcon,
  SparklesIcon,
  PlusIcon,
  SessionsIcon,
  CalendarIcon,
} from '../../components/ui/Icons';
import PageHeader from '../../components/ui/PageHeader';
import MetricsGrid from '../../components/ui/MetricsGrid';
import { PageContainer } from '../../components/layout';
import TabSwitcher from '../../components/ui/TabSwitcher';
import BranchManagementView from './BranchManagementView';
import DepartmentManagementView from './departments/DepartmentManagementView';
import InstitutionListView from '../app-management/institutions/InstitutionListView';
import { AcademicYearsManagementView, AcademicYearDrawerForm } from './academic-years';
import BranchForm from './BranchForm';
import DepartmentForm from './departments/DepartmentForm';
import InstitutionOnboardingForm from '../app-management/institutions/InstitutionOnboardingForm';
import { getBranchMetrics } from '../../api/academy';
import { getInstitutionMetrics } from '../../api/institutions';
import { fetchWithAuth } from '../../utils/authService';
import { academicYearsStore } from '../../utils/localStore';
import { useTenant } from '../../context/TenantContext';
import { useRightSidebar, useDrawerRegistration } from '../../context/RightSidebarContext';
import { useToast } from '../../context/ToastContext';

const TABS = [
  { id: 'academies', label: 'Academies', icon: BuildingOfficeIcon },
  { id: 'branches', label: 'Branches', icon: BuildingOfficeIcon },
  { id: 'departments', label: 'Departments', icon: DepartmentIcon },
  { id: 'academic_years', label: 'Academic Years', icon: SessionsIcon },
];

export default function CampusProfileHubView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTabParam = searchParams.get('tab') || 'academies';
  
  // Valid active tabs: academies -> branches -> departments -> academic_years
  const activeTab = ['academies', 'branches', 'departments', 'academic_years'].includes(activeTabParam)
    ? activeTabParam
    : 'academies';

  const { refreshInstitutions, activeTenantId } = useTenant();
  const { openDrawer, closeDrawer } = useRightSidebar();
  const { showToast } = useToast();

  // Metrics cache per tab
  const [branchMetrics, setBranchMetrics] = useState({
    total_branches: 0,
    main_campuses: 0,
    sub_branches: 0,
    total_capacity: 0,
    active_in_charges: 0,
  });

  const [deptMetrics, setDeptMetrics] = useState({
    total_departments: 0,
    total_classes: 0,
    total_enrolled_students: 0,
    quran_tracker_count: 0,
  });

  const [instMetrics, setInstMetrics] = useState({
    total_institutions: 0,
    verified_institutions: 0,
    total_active_students: 0,
    total_staff: 0,
  });

  const [academicYearMetrics, setAcademicYearMetrics] = useState({
    total_years: 0,
    active_year_name: 'None',
    total_terms: 0,
    avg_terms_per_year: 0,
  });

  const loadAllMetrics = useCallback(async () => {
    try {
      const [brRes, instRes, deptRes] = await Promise.allSettled([
        getBranchMetrics(),
        getInstitutionMetrics(),
        fetchWithAuth('/api/v1/departments/metrics/'),
      ]);

      if (brRes.status === 'fulfilled') {
        setBranchMetrics(brRes.value);
      }
      if (instRes.status === 'fulfilled') {
        setInstMetrics(instRes.value);
      }
      if (deptRes.status === 'fulfilled' && deptRes.value.ok) {
        const d = await deptRes.value.json();
        setDeptMetrics(d);
      } else {
        const listRes = await fetchWithAuth('/api/v1/departments/');
        if (listRes.ok) {
          const listData = await listRes.json();
          const items = Array.isArray(listData) ? listData : listData.results || [];
          setDeptMetrics({
            total_departments: items.length,
            total_classes: items.reduce((acc, i) => acc + (i.classes_count || 0), 0),
            total_enrolled_students: items.reduce((acc, i) => acc + (i.students_count || 0), 0),
            quran_tracker_count: items.filter((i) => i.has_quran_tracker).length,
          });
        }
      }
    } catch {
      // Graceful fallback
    }

    // Load Academic Years metrics
    try {
      const years = academicYearsStore.getAcademicYears(activeTenantId);
      const activeYear = academicYearsStore.getActiveYear(activeTenantId);
      const totalTerms = years.reduce((acc, y) => acc + (y.terms?.length || 0), 0);
      setAcademicYearMetrics({
        total_years: years.length,
        active_year_name: activeYear ? activeYear.name : 'None',
        total_terms: totalTerms,
        avg_terms_per_year: years.length > 0 ? (totalTerms / years.length).toFixed(1) : 0,
      });
    } catch {}
  }, [activeTenantId]);

  useEffect(() => {
    loadAllMetrics();

    const handleTenantChanged = () => {
      loadAllMetrics();
    };
    const handleYearsUpdated = () => {
      loadAllMetrics();
    };
    window.addEventListener('spr_tenant_changed', handleTenantChanged);
    window.addEventListener('spr_academic_years_updated', handleYearsUpdated);
    return () => {
      window.removeEventListener('spr_tenant_changed', handleTenantChanged);
      window.removeEventListener('spr_academic_years_updated', handleYearsUpdated);
    };
  }, [loadAllMetrics]);

  const handleTabChange = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  // Universal Drawer Registration for Campus Hub (survives F5 refresh)
  useDrawerRegistration(
    'campus-action',
    (params) => {
      const type = params.get('type') || activeTab;

      if (type === 'branches') {
        return {
          title: 'Register Academic Branch',
          category: 'Academy & Campus',
          size: 'md',
          content: (
            <BranchForm
              onSaved={() => {
                loadAllMetrics();
                closeDrawer();
                showToast('Academic branch registered successfully.', 'success');
              }}
              onCancel={closeDrawer}
            />
          ),
        };
      }

      if (type === 'departments') {
        return {
          title: 'Create Academic Department',
          category: 'Academy & Campus',
          size: 'md',
          content: (
            <DepartmentForm
              onSaved={() => {
                loadAllMetrics();
                closeDrawer();
                showToast('Department created successfully.', 'success');
              }}
              onCancel={closeDrawer}
            />
          ),
        };
      }

      if (type === 'academic_years') {
        const mode = params.get('mode') || 'add';
        const yearId = params.get('yearId');
        const years = academicYearsStore.getAcademicYears(activeTenantId);
        const foundYear = yearId ? years.find((y) => y.id === yearId) : null;

        return {
          title: mode === 'edit' ? 'Edit Academic Year & Terms' : 'Create Academic Year',
          category: 'Academy & Campus',
          size: 'md',
          content: (
            <AcademicYearDrawerForm
              year={foundYear}
              onSave={(savedData) => {
                if (savedData.id && foundYear) {
                  academicYearsStore.updateAcademicYear(activeTenantId, savedData.id, savedData);
                  showToast('Academic year updated successfully.', 'success');
                } else {
                  academicYearsStore.addAcademicYear(activeTenantId, savedData);
                  showToast('New academic year created successfully.', 'success');
                }
                loadAllMetrics();
                closeDrawer();
              }}
              onCancel={closeDrawer}
            />
          ),
        };
      }

      // type === 'academies'
      return {
        title: 'Onboard New Academy',
        category: 'Academy & Campus',
        size: 'md',
        content: (
          <InstitutionOnboardingForm
            onSuccess={() => {
              loadAllMetrics();
              refreshInstitutions();
              closeDrawer();
              showToast('New Academy onboarded successfully.', 'success');
            }}
            onCancel={closeDrawer}
          />
        ),
      };
    },
    [activeTab, activeTenantId, loadAllMetrics, refreshInstitutions, closeDrawer, showToast]
  );

  // Primary Action Button handler based on active tab
  const handlePrimaryAction = () => {
    openDrawer('campus-action', { type: activeTab });
  };

  const getPrimaryActionConfig = () => {
    if (activeTab === 'branches') {
      return {
        label: 'Add Academic Branch',
        icon: PlusIcon,
      };
    }
    if (activeTab === 'departments') {
      return {
        label: 'Add Department',
        icon: PlusIcon,
      };
    }
    if (activeTab === 'academic_years') {
      return {
        label: 'Add Academic Year',
        icon: PlusIcon,
      };
    }
    // Academies tab
    return {
      label: 'Onboard Academy',
      icon: PlusIcon,
    };
  };

  // 4 Dynamic Cards depending on the active tab (100% Theme colors)
  const getDynamicCards = () => {
    if (activeTab === 'branches') {
      return [
        {
          label: 'Total Campuses',
          value: branchMetrics.total_branches ?? 0,
          icon: BuildingOfficeIcon,
          color: 'accent',
          subLabel: `${branchMetrics.main_campuses ?? 0} Main Hubs`,
        },
        {
          label: 'Main Campuses',
          value: branchMetrics.main_campuses ?? 0,
          icon: BuildingOfficeIcon,
          color: 'accent',
          subLabel: 'Central Head Offices',
        },
        {
          label: 'Student Capacity',
          value: branchMetrics.total_capacity ?? 0,
          icon: StudentIcon,
          color: 'accent',
          subLabel: 'Allocated Seats',
        },
        {
          label: 'Campus In-Charges',
          value: branchMetrics.active_in_charges ?? 0,
          icon: TeacherIcon,
          color: 'accent',
          subLabel: 'Assigned Leadership',
        },
      ];
    }

    if (activeTab === 'departments') {
      return [
        {
          label: 'Academic Departments',
          value: deptMetrics.total_departments ?? 0,
          icon: DepartmentIcon,
          color: 'accent',
          subLabel: 'Active Divisions',
        },
        {
          label: 'Quran Tracker Depts',
          value: deptMetrics.quran_tracker_count ?? 0,
          icon: SparklesIcon,
          color: 'accent',
          subLabel: 'Hifz Enabled',
        },
        {
          label: 'Assigned Classes',
          value: deptMetrics.total_classes ?? 0,
          icon: ClassIcon,
          color: 'accent',
          subLabel: 'Across Departments',
        },
        {
          label: 'Enrolled Students',
          value: deptMetrics.total_enrolled_students ?? 0,
          icon: UsersIcon,
          color: 'accent',
          subLabel: 'Department Roll',
        },
      ];
    }

    if (activeTab === 'academic_years') {
      return [
        {
          label: 'Total Academic Years',
          value: academicYearMetrics.total_years ?? 0,
          icon: SessionsIcon,
          color: 'accent',
          subLabel: 'Recorded Sessions',
        },
        {
          label: 'Current Active Year',
          value: academicYearMetrics.active_year_name || 'None',
          icon: CheckCircleIcon,
          color: 'accent',
          subLabel: 'Default Session',
        },
        {
          label: 'Configured Terms',
          value: academicYearMetrics.total_terms ?? 0,
          icon: CalendarIcon,
          color: 'accent',
          subLabel: 'Semesters & Cycles',
        },
        {
          label: 'Avg Terms Per Year',
          value: academicYearMetrics.avg_terms_per_year ?? 0,
          icon: SparklesIcon,
          color: 'accent',
          subLabel: 'System Density',
        },
      ];
    }

    // Default: 'academies' tab (First tab)
    return [
      {
        label: 'Total Academies',
        value: instMetrics.total_institutions ?? 0,
        icon: BuildingOfficeIcon,
        color: 'accent',
        subLabel: 'Registered Institutions',
      },
      {
        label: 'Verified Campuses',
        value: instMetrics.verified_institutions ?? 0,
        icon: CheckCircleIcon,
        color: 'accent',
        subLabel: 'Certified Organizations',
      },
      {
        label: 'Active Students',
        value: instMetrics.total_active_students ?? 0,
        icon: UsersIcon,
        color: 'accent',
        subLabel: 'System-Wide Enrollment',
      },
      {
        label: 'Faculty & Staff',
        value: instMetrics.total_staff ?? 0,
        icon: TeacherIcon,
        color: 'accent',
        subLabel: 'Active Educators',
      },
    ];
  };

  const dynamicCards = getDynamicCards();
  const actionConfig = getPrimaryActionConfig();
  const ActionIcon = actionConfig.icon;

  return (
    <PageContainer>
      {/* 1. Header Overview with Reusable PageHeader */}
      <PageHeader
        title="Academies & Departments"
        subtitle="Unified central console for institutional academies, multi-campus branches, and academic departments."
        icon={BuildingOfficeIcon}
      />

      {/* 2. Top Toolbar Row: Theme-Aware TabSwitcher on Left + Dynamic Action Button on Far Right */}
      <TabSwitcher
        tabs={TABS}
        activeTab={activeTab}
        onChange={handleTabChange}
        rightContent={
          <button
            type="button"
            onClick={handlePrimaryAction}
            className="w-full sm:w-auto px-4 sm:px-5 py-2 rounded-xl text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ActionIcon className="w-3.5 h-3.5" />
            <span>{actionConfig.label}</span>
          </button>
        }
      />

      {/* 3. 4 Dynamic Short Total Cards (Synchronized with selected Tab) */}
      <div className="w-full">
        <MetricsGrid items={dynamicCards} />
      </div>

      {/* 4. Tab Body Content (Persistent display switching to eliminate any layout jumping) */}
      <div className="w-full min-h-[460px]">
        <div className={activeTab === 'academies' ? 'block' : 'hidden'}>
          <InstitutionListView hideHeader hideMetrics isEmbedded />
        </div>
        <div className={activeTab === 'branches' ? 'block' : 'hidden'}>
          <BranchManagementView hideHeader hideMetrics isEmbedded />
        </div>
        <div className={activeTab === 'departments' ? 'block' : 'hidden'}>
          <DepartmentManagementView hideHeader hideMetrics isEmbedded />
        </div>
        <div className={activeTab === 'academic_years' ? 'block' : 'hidden'}>
          <AcademicYearsManagementView isEmbedded hideHeader hideMetrics />
        </div>
      </div>
    </PageContainer>
  );
}
