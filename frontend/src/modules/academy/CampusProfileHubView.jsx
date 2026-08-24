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
} from '../../components/ui/Icons';
import PageHeader from '../../components/ui/PageHeader';
import MetricsGrid from '../../components/ui/MetricsGrid';
import { PageContainer } from '../../components/layout';
import TabSwitcher from '../../components/ui/TabSwitcher';
import BranchManagementView from './BranchManagementView';
import DepartmentManagementView from './departments/DepartmentManagementView';
import InstitutionListView from '../app-management/institutions/InstitutionListView';
import BranchForm from './BranchForm';
import DepartmentForm from './departments/DepartmentForm';
import InstitutionOnboardingForm from '../app-management/institutions/InstitutionOnboardingForm';
import { getBranchMetrics } from '../../api/academy';
import { getInstitutionMetrics } from '../../api/institutions';
import { fetchWithAuth } from '../../utils/authService';
import { useTenant } from '../../context/TenantContext';
import { useRightSidebar, useDrawerRegistration } from '../../context/RightSidebarContext';
import { useToast } from '../../context/ToastContext';

const TABS = [
  { id: 'academies', label: 'Academies', icon: BuildingOfficeIcon },
  { id: 'branches', label: 'Branches', icon: BuildingOfficeIcon },
  { id: 'departments', label: 'Departments', icon: DepartmentIcon },
];

export default function CampusProfileHubView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTabParam = searchParams.get('tab') || 'academies';
  
  // Valid active tabs: academies -> branches -> departments
  const activeTab = ['academies', 'branches', 'departments'].includes(activeTabParam)
    ? activeTabParam
    : 'academies';

  const { refreshInstitutions } = useTenant();
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
  }, []);

  useEffect(() => {
    loadAllMetrics();

    const handleTenantChanged = () => {
      loadAllMetrics();
    };
    window.addEventListener('spr_tenant_changed', handleTenantChanged);
    return () => window.removeEventListener('spr_tenant_changed', handleTenantChanged);
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
    [activeTab, loadAllMetrics, refreshInstitutions, closeDrawer, showToast]
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
      </div>
    </PageContainer>
  );
}
