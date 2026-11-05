import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import PageHeader from '../../../components/ui/PageHeader';
import TabSwitcher from '../../../components/ui/TabSwitcher';
import CustomButton from '../../../components/ui/CustomButton';
import MetricsGrid from '../../../components/ui/MetricsGrid';
import { PageContainer } from '../../../components/layout';
import { fetchWithAuth } from '../../../utils/authService';
import { useRightSidebar } from '../../../context/RightSidebarContext';
import { useFeatureControl } from '../../../context/FeatureControlContext';
import { useTenant } from '../../../context/TenantContext';
import { useAuth } from '../../../context/AuthContext';
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
  const rawTab = searchParams.get('tab');

  // Super Admin detection across roles, superuser flag, or tenant admin status
  const isSuperAdmin = Boolean(
    isMultiTenantAdmin ||
    user?.is_superuser ||
    (user?.user_type && user.user_type.toUpperCase() === 'SUPER_ADMIN') ||
    user?.role === 'SUPER_ADMIN'
  );

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
          total_departments: totalDepts,
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
        let mentorsCount = 0;
        if (groupsListRes.status === 'fulfilled' && groupsListRes.value.ok) {
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

  // Determine whether 'Classes', 'Sections' and 'Groups' tabs should be shown
  const isSectionDrawer = searchParams.get('drawer') === 'section';
  const isGroupDrawer = searchParams.get('drawer') === 'group';

  const isClassesFeatureEnabled = isSectionEnabled('classes_tab_classes');
  const isSectionsFeatureEnabled = isSectionEnabled('classes_tab_sections');
  const isGroupsFeatureEnabled = isSectionEnabled('classes_tab_groups');

  const canAddClass = isSectionEnabled('classes_action_add_class');
  const canAddSection = isSectionEnabled('sections_action_add_section');
  const canAddGroup = isSectionEnabled('groups_action_add_group');

  const hasSectionsData = (sectionMetrics.total_sections ?? 0) > 0;
  const hasGroupsData = (groupMetrics.total_groups ?? 0) > 0;

  // Super Admin always has access to all feature-enabled tabs regardless of whether data exists or not.
  // Regular users only see Sections and Groups tabs if there is actual data.
  const showSectionsTab = isSectionsFeatureEnabled && (isSuperAdmin || hasSectionsData);
  const showGroupsTab = isGroupsFeatureEnabled && (isSuperAdmin || hasGroupsData);

  // Fallback if current tab query parameter is hidden
  useEffect(() => {
    if (!showSectionsTab && rawTab === 'sections') {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('tab', isClassesFeatureEnabled ? 'classes' : (showGroupsTab ? 'groups' : 'classes'));
      setSearchParams(nextParams, { replace: true });
    } else if (!showGroupsTab && rawTab === 'groups') {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('tab', isClassesFeatureEnabled ? 'classes' : (showSectionsTab ? 'sections' : 'classes'));
      setSearchParams(nextParams, { replace: true });
    }
  }, [showSectionsTab, showGroupsTab, isClassesFeatureEnabled, rawTab, searchParams, setSearchParams]);

  const activeTab = useMemo(() => {
    if ((rawTab === 'sections' || isSectionDrawer) && showSectionsTab) return 'sections';
    if ((rawTab === 'groups' || isGroupDrawer) && showGroupsTab) return 'groups';
    if (isClassesFeatureEnabled) return 'classes';
    if (showSectionsTab) return 'sections';
    if (showGroupsTab) return 'groups';
    return 'classes';
  }, [rawTab, isSectionDrawer, isGroupDrawer, showSectionsTab, showGroupsTab, isClassesFeatureEnabled]);

  const handleTabChange = (tabId: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', tabId);
    setSearchParams(nextParams);
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
    if (activeTab === 'sections') return canAddSection;
    if (activeTab === 'groups') return canAddGroup;
    return canAddClass;
  }, [activeTab, canAddSection, canAddGroup, canAddClass]);

  const TABS = useMemo(() => {
    const tabsList: { id: string; label: string; icon: any }[] = [];

    if (isClassesFeatureEnabled) {
      tabsList.push({
        id: 'classes',
        label: 'Classes',
        icon: ClassIcon,
      });
    }

    if (showSectionsTab) {
      tabsList.push({
        id: 'sections',
        label: 'Sections',
        icon: SectionIcon,
      });
    }

    if (showGroupsTab) {
      tabsList.push({
        id: 'groups',
        label: 'Groups',
        icon: GroupIcon,
      });
    }

    return tabsList.length > 0 ? tabsList : [{ id: 'classes', label: 'Classes', icon: ClassIcon }];
  }, [isClassesFeatureEnabled, showSectionsTab, showGroupsTab]);

  const pageTitle = useMemo(() => {
    if (showSectionsTab && showGroupsTab) return "Classes & Sections";
    if (showSectionsTab) return "Classes & Sections";
    if (showGroupsTab) return "Classes & Groups";
    return "Academic Classes";
  }, [showSectionsTab, showGroupsTab]);

  const getDynamicCards = () => {
    if (activeTab === 'sections') {
      return [
        {
          label: 'Total Sections',
          value: sectionMetrics.total_sections ?? 0,
          icon: SectionIcon,
          color: 'accent',
          subLabel: 'Active sections',
        },
        {
          label: 'Total Capacity',
          value: sectionMetrics.total_capacity ?? 0,
          icon: StudentIcon,
          color: 'accent',
          subLabel: 'Allocated seats',
        },
        {
          label: 'Enrolled Students',
          value: sectionMetrics.total_enrolled ?? 0,
          icon: StudentIcon,
          color: 'accent',
          subLabel: 'Active enrollment',
        },
        {
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
          label: 'Total Groups',
          value: groupMetrics.total_groups ?? 0,
          icon: GroupIcon,
          color: 'accent',
          subLabel: 'Study circles & batches',
        },
        {
          label: 'Assigned Students',
          value: groupMetrics.total_assigned_students ?? 0,
          icon: StudentIcon,
          color: 'accent',
          subLabel: 'Group enrollment',
        },
        {
          label: 'Parent Classes',
          value: groupMetrics.total_classes ?? 0,
          icon: ClassIcon,
          color: 'accent',
          subLabel: 'Target classes',
        },
        {
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
        label: 'Total Classes',
        value: classMetrics.total_classes ?? 0,
        icon: ClassIcon,
        color: 'accent',
        subLabel: 'Academic grades',
      },
      {
        label: 'Enrolled Students',
        value: classMetrics.total_enrolled_students ?? 0,
        icon: StudentIcon,
        color: 'accent',
        subLabel: 'Active enrollment',
      },
      {
        label: 'Avg Students / Class',
        value: classMetrics.avg_students_per_class ?? 0,
        icon: DashboardIcon,
        color: 'accent',
        subLabel: 'Class density',
      },
      {
        label: 'Academic Departments',
        value: classMetrics.total_departments ?? 0,
        icon: DepartmentIcon,
        color: 'accent',
        subLabel: 'Assigned divisions',
      },
    ];
  };

  const dynamicCards = getDynamicCards();

  const getPrimaryActionText = () => {
    if (activeTab === 'sections') return 'Add Section';
    if (activeTab === 'groups') return 'Add Group';
    return 'Add Class';
  };

  return (
    <PageContainer>
      {/* 1. Header Overview with Reusable PageHeader */}
      <PageHeader
        title={pageTitle}
        subtitle="Unified academic console for managing academic grades, class sections, and student groups."
        icon={ClassIcon}
      />

      {/* 2. Top Toolbar Row: Theme-Aware TabSwitcher on Left + Dynamic Action Button on Far Right */}
      <TabSwitcher
        tabs={TABS}
        activeTab={activeTab}
        onChange={handleTabChange}
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

      {/* 4. Tab Body Content (Persistent display switching to eliminate layout jumping) */}
      <div className="w-full min-h-[460px]">
        <div className={activeTab === 'classes' ? 'block' : 'hidden'}>
          <ClassManagementView
            hideHeader
            hideMetrics
            isEmbedded
            isSuperAdmin={isSuperAdmin}
            showSectionsTab={showSectionsTab}
            showGroupsTab={showGroupsTab}
          />
        </div>
        {showSectionsTab && (
          <div className={activeTab === 'sections' ? 'block' : 'hidden'}>
            <SectionManagementView hideHeader hideMetrics isEmbedded />
          </div>
        )}
        {showGroupsTab && (
          <div className={activeTab === 'groups' ? 'block' : 'hidden'}>
            <GroupManagementView hideHeader hideMetrics isEmbedded />
          </div>
        )}
      </div>
    </PageContainer>
  );
}

