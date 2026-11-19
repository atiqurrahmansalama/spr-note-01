import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import {
  ClassIcon,
  SectionIcon,
  GroupIcon,
  StudentIcon,
  DashboardIcon,
  DepartmentIcon,
  PlusIcon,
  TeacherIcon,
  SparklesIcon,
} from '../../../components/ui/Icons';
import TabSwitcher from '../../../components/ui/TabSwitcher';
import PageHeader from '../../../components/ui/PageHeader';
import CustomButton from '../../../components/ui/CustomButton';
import MetricsGrid from '../../../components/ui/MetricsGrid';
import ErrorBoundary from '../../../components/ui/ErrorBoundary';
import { PageContainer } from '../../../components/layout';
import { fetchWithAuth } from '../../../utils/authService';
import { useRightSidebar } from '../../../context/RightSidebarContext';
import { useFeatureControl } from '../../../context/FeatureControlContext';
import { useTenant } from '../../../context/TenantContext';
import { useAuth } from '../../../context/AuthContext';
import { isUserSuperAdmin } from '../../../utils/roleUtils';
import { ClassManagementView } from './classes';
import { SectionManagementView } from './sections';
import { GroupManagementView } from './groups';
import { getSectionMetrics } from '../../../api/academy';
import { ClassMetrics, SectionMetrics, GroupMetrics } from './types';

export default function ClassesSectionsHubView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { openDrawer } = useRightSidebar();
  const { isSectionEnabled } = useFeatureControl();
  const { activeTenantId, isMultiTenantAdmin } = useTenant();
  const { user } = useAuth();
  const location = useLocation();
  const urlTab = searchParams.get('tab');
  const pathTab =
    location.pathname === '/academy/sections' || location.pathname === '/sections'
      ? 'sections'
      : location.pathname === '/academy/groups' || location.pathname === '/groups'
      ? 'groups'
      : null;
  const isSectionDrawer = searchParams.get('drawer') === 'section';
  const isGroupDrawer = searchParams.get('drawer') === 'group';
  const rawTab = urlTab || pathTab || (isSectionDrawer ? 'sections' : isGroupDrawer ? 'groups' : 'classes');

  // Super Admin detection across roles, superuser flag, or tenant admin status
  const isSuperAdmin = isUserSuperAdmin(user, isMultiTenantAdmin);

  // Tenant-scoped initial metrics retrieval for instant, zero-flicker load
  const tenantCacheKey = `spr_classes_metrics_${activeTenantId || 'default'}_v1`;

  const [classMetrics, setClassMetrics] = useState<ClassMetrics>(() => {
    try {
      const saved = localStorage.getItem(`spr_classes_metrics_${activeTenantId || 'default'}_v1`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.classMetrics) return parsed.classMetrics;
      }
    } catch {}
    return {
      total_classes: 0,
      total_enrolled_students: 0,
      avg_students_per_class: 0.0,
      total_departments: 0,
    };
  });

  const [sectionMetrics, setSectionMetrics] = useState<SectionMetrics>(() => {
    try {
      const saved = localStorage.getItem(`spr_classes_metrics_${activeTenantId || 'default'}_v1`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.sectionMetrics) return parsed.sectionMetrics;
      }
    } catch {}
    return {
      total_sections: 0,
      total_capacity: 0,
      total_enrolled: 0,
      occupancy_rate: 0,
    };
  });

  const [groupMetrics, setGroupMetrics] = useState<GroupMetrics>(() => {
    try {
      const saved = localStorage.getItem(`spr_classes_metrics_${activeTenantId || 'default'}_v1`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.groupMetrics) return parsed.groupMetrics;
      }
    } catch {}
    return {
      total_groups: 0,
      total_assigned_students: 0,
      total_classes: 0,
      active_mentors: 0,
    };
  });

  // Rehydrate cache on tenant context change
  useEffect(() => {
    try {
      const saved = localStorage.getItem(tenantCacheKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.classMetrics) setClassMetrics(parsed.classMetrics);
        if (parsed.sectionMetrics) setSectionMetrics(parsed.sectionMetrics);
        if (parsed.groupMetrics) setGroupMetrics(parsed.groupMetrics);
      }
    } catch {}
  }, [tenantCacheKey]);

  const loadAllMetrics = useCallback(async () => {
    try {
      const tenantParam = activeTenantId && activeTenantId !== 'ALL' ? `?institution=${activeTenantId}` : '';
      const [classRes, deptRes, secRes, groupRes, groupsListRes] = await Promise.allSettled([
        fetchWithAuth(`/api/v1/classes/metrics/${tenantParam}`),
        fetchWithAuth(`/api/v1/departments/metrics/${tenantParam}`),
        getSectionMetrics({ ...(activeTenantId && activeTenantId !== 'ALL' ? { institution: activeTenantId } : {}) }),
        fetchWithAuth(`/api/v1/groups/metrics/${tenantParam}`),
        fetchWithAuth(`/api/v1/groups/${tenantParam}`),
      ]);

      let totalDepts = 0;
      if (deptRes.status === 'fulfilled' && deptRes.value.ok) {
        const deptData = await deptRes.value.json();
        totalDepts = deptData.total_departments || 0;
      }

      let nextClassMetrics: ClassMetrics = {
        total_classes: 0,
        total_enrolled_students: 0,
        avg_students_per_class: 0.0,
        total_departments: totalDepts,
      };

      if (classRes.status === 'fulfilled' && classRes.value.ok) {
        const d = await classRes.value.json();
        nextClassMetrics = {
          total_classes: d.total_classes ?? 0,
          total_enrolled_students: d.total_enrolled_students ?? 0,
          avg_students_per_class: d.avg_students_per_class ?? 0,
          total_departments: d.total_departments ?? totalDepts,
        };
        setClassMetrics(nextClassMetrics);
      }

      let secCount = 0;
      let nextSectionMetrics: SectionMetrics = {
        total_sections: 0,
        total_capacity: 0,
        total_enrolled: 0,
        occupancy_rate: 0,
      };

      if (secRes.status === 'fulfilled') {
        const sd = secRes.value || {};
        secCount = sd.total_sections ?? 0;
        nextSectionMetrics = {
          total_sections: secCount,
          total_capacity: sd.total_capacity ?? 0,
          total_enrolled: sd.total_enrolled ?? 0,
          occupancy_rate: sd.occupancy_rate ?? 0,
        };
        setSectionMetrics(nextSectionMetrics);
      }

      let grpCount = 0;
      let nextGroupMetrics: GroupMetrics = {
        total_groups: 0,
        total_assigned_students: 0,
        total_classes: 0,
        active_mentors: 0,
      };

      if (groupRes.status === 'fulfilled' && groupRes.value.ok) {
        const gd = await groupRes.value.json();
        grpCount = gd.total_groups ?? 0;
        let mentorsCount = gd.active_mentors ?? 0;
        if (!mentorsCount && groupsListRes.status === 'fulfilled' && groupsListRes.value.ok) {
          const gl = await groupsListRes.value.json();
          const items = Array.isArray(gl) ? gl : gl.results || [];
          mentorsCount = items.filter((i: any) => i.mentor_teacher_name).length;
        }
        nextGroupMetrics = {
          total_groups: grpCount,
          total_assigned_students: gd.total_assigned_students ?? 0,
          total_classes: gd.total_classes ?? 0,
          active_mentors: mentorsCount,
        };
        setGroupMetrics(nextGroupMetrics);
      }

      // Persist latest verified metrics to tenant cache for instant cold starts
      try {
        localStorage.setItem(
          `spr_classes_metrics_${activeTenantId || 'default'}_v1`,
          JSON.stringify({
            classMetrics: nextClassMetrics,
            sectionMetrics: nextSectionMetrics,
            groupMetrics: nextGroupMetrics,
          })
        );
      } catch {}
    } catch {
      // Graceful fallback
    }
  }, [activeTenantId]);

  useEffect(() => {
    loadAllMetrics();

    const handleTenantChanged = () => {
      loadAllMetrics();
    };
    const handleClassUpdated = () => {
      loadAllMetrics();
    };
    const handleSectionUpdated = () => {
      loadAllMetrics();
    };
    const handleGroupUpdated = () => {
      loadAllMetrics();
    };
    window.addEventListener('spr_tenant_changed', handleTenantChanged);
    window.addEventListener('spr_class_updated', handleClassUpdated);
    window.addEventListener('spr_section_updated', handleSectionUpdated);
    window.addEventListener('spr_group_updated', handleGroupUpdated);
    return () => {
      window.removeEventListener('spr_tenant_changed', handleTenantChanged);
      window.removeEventListener('spr_class_updated', handleClassUpdated);
      window.removeEventListener('spr_section_updated', handleSectionUpdated);
      window.removeEventListener('spr_group_updated', handleGroupUpdated);
    };
  }, [loadAllMetrics]);

  // Candidate tabs for Classes, Sections, Groups
  const candidateTabs = useMemo(() => [
    { id: 'classes', label: 'Classes', icon: ClassIcon, featureKey: 'classes_tab_classes' },
    { id: 'sections', label: 'Sections', icon: SectionIcon, featureKey: 'classes_tab_sections' },
    { id: 'groups', label: 'Groups', icon: GroupIcon, featureKey: 'classes_tab_groups' },
  ], []);

  // Filter tabs if explicitly disabled in Feature & Module Control
  const TABS = useMemo(() => {
    const list = candidateTabs.filter((tab) => isSectionEnabled(tab.featureKey) !== false);
    return list.length > 0 ? list : candidateTabs;
  }, [candidateTabs, isSectionEnabled]);

  const defaultTab = TABS[0]?.id || 'classes';

  // Canonical Single Source of Truth: Active tab derived directly from URL searchParams
  const activeTab = useMemo(() => {
    if (rawTab && TABS.some((t) => t.id === rawTab)) return rawTab;
    return defaultTab;
  }, [rawTab, TABS, defaultTab]);

  // Pre-mount all tabs to completely eliminate layout jumping, delayed mounting, and UI flickering
  const [visitedTabs] = useState<Record<string, boolean>>({
    classes: true,
    sections: true,
    groups: true,
  });

  const handleTabChange = (tabId: string) => {
    if (tabId === activeTab) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', tabId);
        return next;
      },
      { replace: true }
    );
  };

  const handlePrimaryAction = () => {
    if (activeTab === 'sections') {
      openDrawer('section', { mode: 'add' });
    } else if (activeTab === 'groups') {
      openDrawer('group', { mode: 'add' });
    } else {
      openDrawer('class', { mode: 'add' });
    }
  };

  const isPrimaryActionAllowed = useMemo(() => {
    if (activeTab === 'sections') return isSectionEnabled('sections_action_add_section') !== false;
    if (activeTab === 'groups') return isSectionEnabled('groups_action_add_group') !== false;
    return isSectionEnabled('classes_action_add_class') !== false;
  }, [activeTab, isSectionEnabled]);

  const getDynamicCards = () => {
    if (activeTab === 'sections') {
      return [
        {
          id: 'metric_0',
          label: 'Total Sections',
          value: sectionMetrics.total_sections ?? 0,
          icon: SectionIcon,
          color: 'accent',
          subLabel: 'Active sections',
        },
        {
          id: 'metric_1',
          label: 'Total Capacity',
          value: sectionMetrics.total_capacity ?? 0,
          icon: StudentIcon,
          color: 'accent',
          subLabel: 'Allocated seats',
        },
        {
          id: 'metric_2',
          label: 'Enrolled Students',
          value: sectionMetrics.total_enrolled ?? 0,
          icon: StudentIcon,
          color: 'accent',
          subLabel: 'Active enrollment',
        },
        {
          id: 'metric_3',
          label: 'Occupancy Rate',
          value: `${sectionMetrics.occupancy_rate ?? 0}%`,
          icon: SparklesIcon,
          color: 'accent',
          subLabel: 'Seat utilization',
        },
      ];
    }

    if (activeTab === 'groups') {
      return [
        {
          id: 'metric_0',
          label: 'Total Groups',
          value: groupMetrics.total_groups ?? 0,
          icon: GroupIcon,
          color: 'accent',
          subLabel: 'Active batches',
        },
        {
          id: 'metric_1',
          label: 'Assigned Students',
          value: groupMetrics.total_assigned_students ?? 0,
          icon: StudentIcon,
          color: 'accent',
          subLabel: 'Group enrollment',
        },
        {
          id: 'metric_2',
          label: 'Parent Classes',
          value: groupMetrics.total_classes ?? 0,
          icon: ClassIcon,
          color: 'accent',
          subLabel: 'Target classes',
        },
        {
          id: 'metric_3',
          label: 'Active Mentors',
          value: groupMetrics.active_mentors ?? 0,
          icon: TeacherIcon,
          color: 'accent',
          subLabel: 'Group mentors',
        },
      ];
    }

    // Default: 'classes' tab
    return [
      {
        id: 'metric_0',
        label: 'Total Classes',
        value: classMetrics.total_classes ?? 0,
        icon: ClassIcon,
        color: 'accent',
        subLabel: 'Academic grades',
      },
      {
        id: 'metric_1',
        label: 'Enrolled Students',
        value: classMetrics.total_enrolled_students ?? 0,
        icon: StudentIcon,
        color: 'accent',
        subLabel: 'Active enrollment',
      },
      {
        id: 'metric_2',
        label: 'Avg Students / Class',
        value: classMetrics.avg_students_per_class ?? 0,
        icon: DashboardIcon,
        color: 'accent',
        subLabel: 'Class density',
      },
      {
        id: 'metric_3',
        label: 'Academic Departments',
        value: classMetrics.total_departments ?? 0,
        icon: DepartmentIcon,
        color: 'accent',
        subLabel: 'Active divisions',
      },
    ];
  };

  const dynamicCards = useMemo(() => {
    return getDynamicCards();
  }, [activeTab, sectionMetrics, groupMetrics, classMetrics]);

  const getPrimaryActionText = () => {
    if (activeTab === 'sections') return 'Add Section';
    if (activeTab === 'groups') return 'Add Group';
    return 'Add Class';
  };

  return (
    <PageContainer>
      {/* 1. Header Overview with Reusable PageHeader (Standardized across Academy Hub views) */}
      <PageHeader
        title="Classes & Sections"
        subtitle="Unified central console for academic grades, section allocations, and student mentorship groups."
        icon={ClassIcon}
      />

      {/* 2. Top Toolbar Row: Theme-Aware TabSwitcher on Left + Dynamic Action Button on Far Right */}
      <TabSwitcher
        tabs={TABS}
        activeTab={activeTab}
        onChange={handleTabChange}
        keepRightContentInline={true}
        rightContent={
          isPrimaryActionAllowed ? (
            <CustomButton
              type="button"
              variant="primary"
              size="sm"
              icon={PlusIcon}
              onClick={handlePrimaryAction}
              className="w-full sm:w-auto"
            >
              {getPrimaryActionText()}
            </CustomButton>
          ) : undefined
        }
      />

      {/* 3. 4 Dynamic Short Total Cards (Synchronized with selected Tab) */}
      <div className="w-full">
        <MetricsGrid items={dynamicCards} />
      </div>

      {/* 4. Tab Body Content (Mounting active tab within Enterprise Error Boundary, preserved with zero-flicker keep-alive) */}
      <div className="w-full min-h-[460px]">
        {visitedTabs.classes && (
          <div className={activeTab === 'classes' ? 'block' : 'hidden'}>
            <ErrorBoundary componentName="Classes Management">
              <ClassManagementView
                hideHeader
                hideMetrics
                isEmbedded
                isSuperAdmin={isSuperAdmin}
                showSectionsTab={true}
                showGroupsTab={true}
              />
            </ErrorBoundary>
          </div>
        )}
        {visitedTabs.sections && (
          <div className={activeTab === 'sections' ? 'block' : 'hidden'}>
            <ErrorBoundary componentName="Sections Management">
              <SectionManagementView hideHeader hideMetrics isEmbedded />
            </ErrorBoundary>
          </div>
        )}
        {visitedTabs.groups && (
          <div className={activeTab === 'groups' ? 'block' : 'hidden'}>
            <ErrorBoundary componentName="Groups Management">
              <GroupManagementView hideHeader hideMetrics isEmbedded />
            </ErrorBoundary>
          </div>
        )}
      </div>
    </PageContainer>
  );
}

