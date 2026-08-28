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
import MetricsGrid from '../../../components/ui/MetricsGrid';
import { PageContainer } from '../../../components/layout';
import { fetchWithAuth } from '../../../utils/authService';
import { useRightSidebar } from '../../../context/RightSidebarContext';
import { ClassManagementView } from './classes';
import { SectionManagementView } from './sections';
import { GroupManagementView } from './groups';
import { getSectionMetrics } from '../../../api/academy';

export default function ClassesSectionsHubView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { openDrawer } = useRightSidebar();
  const rawTab = searchParams.get('tab');

  // Metrics for tabs
  const [classMetrics, setClassMetrics] = useState({
    total_classes: 0,
    total_enrolled_students: 0,
    avg_students_per_class: 0.0,
    total_departments: 0,
  });

  const [sectionMetrics, setSectionMetrics] = useState({
    total_sections: 0,
    total_capacity: 0,
    total_enrolled: 0,
    occupancy_rate: 0,
  });

  const [groupMetrics, setGroupMetrics] = useState({
    total_groups: 0,
    total_assigned_students: 0,
    total_classes: 0,
    active_mentors: 0,
  });

  // Track if any classes have sections or groups enabled
  const [hasSectionsEnabledInClasses, setHasSectionsEnabledInClasses] = useState(true);
  const [hasGroupsEnabledInClasses, setHasGroupsEnabledInClasses] = useState(true);

  const loadAllMetrics = useCallback(async () => {
    try {
      const [classRes, deptRes, secRes, groupRes, groupsListRes, classesListRes, sectionsListRes] = await Promise.allSettled([
        fetchWithAuth('/api/v1/classes/metrics/'),
        fetchWithAuth('/api/v1/departments/metrics/'),
        getSectionMetrics(),
        fetchWithAuth('/api/v1/groups/metrics/'),
        fetchWithAuth('/api/v1/groups/'),
        fetchWithAuth('/api/v1/classes/?page_size=500&all=true'),
        fetchWithAuth('/api/v1/academy/sections/?page_size=500&all=true'),
      ]);

      if (classRes.status === 'fulfilled' && classRes.value.ok) {
        const d = await classRes.value.json();
        let totalDepts = 0;
        if (deptRes.status === 'fulfilled' && deptRes.value.ok) {
          const deptData = await deptRes.value.json();
          totalDepts = deptData.total_departments || 0;
        }
        setClassMetrics({
          total_classes: d.total_classes ?? 0,
          total_enrolled_students: d.total_enrolled_students ?? 0,
          avg_students_per_class: d.avg_students_per_class ?? 0,
          total_departments: totalDepts,
        });
      }

      let secCount = 0;
      if (secRes.status === 'fulfilled') {
        const sd = secRes.value || {};
        secCount = sd.total_sections ?? 0;
        setSectionMetrics({
          total_sections: secCount,
          total_capacity: sd.total_capacity ?? 0,
          total_enrolled: sd.total_enrolled ?? 0,
          occupancy_rate: sd.occupancy_rate ?? 0,
        });
      }

      let grpCount = 0;
      if (groupRes.status === 'fulfilled' && groupRes.value.ok) {
        const gd = await groupRes.value.json();
        grpCount = gd.total_groups ?? 0;
        let mentorsCount = 0;
        if (groupsListRes.status === 'fulfilled' && groupsListRes.value.ok) {
          const gl = await groupsListRes.value.json();
          const items = Array.isArray(gl) ? gl : gl.results || [];
          mentorsCount = items.filter((i) => i.mentor_teacher_name).length;
        }
        setGroupMetrics({
          total_groups: grpCount,
          total_assigned_students: gd.total_assigned_students ?? 0,
          total_classes: gd.total_classes ?? 0,
          active_mentors: mentorsCount,
        });
      }

      let sectionsList = [];
      if (sectionsListRes.status === 'fulfilled' && sectionsListRes.value.ok) {
        const slData = await sectionsListRes.value.json();
        sectionsList = Array.isArray(slData) ? slData : slData.results || [];
      }

      if (classesListRes.status === 'fulfilled' && classesListRes.value.ok) {
        const clData = await classesListRes.value.json();
        const items = Array.isArray(clData) ? clData : clData.results || [];
        if (items.length > 0) {
          const anyClassHasSections = items.some((c) => c.has_sections !== false);
          setHasSectionsEnabledInClasses(anyClassHasSections || secCount > 0);

          // Groups enabled if any direct class or any section has groups enabled OR if groups exist
          const anyClassDirectGroups = items.some((c) => !c.has_sections && c.has_groups !== false);
          const anySectionGroups = sectionsList.some((s) => s.has_groups !== false);
          setHasGroupsEnabledInClasses(anyClassDirectGroups || anySectionGroups || grpCount > 0);
        } else {
          setHasSectionsEnabledInClasses(secCount > 0);
          setHasGroupsEnabledInClasses(grpCount > 0);
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

  // Determine whether 'Sections' and 'Groups' tabs should be shown
  const showSectionsTab = hasSectionsEnabledInClasses || (sectionMetrics.total_sections > 0);
  const showGroupsTab = hasGroupsEnabledInClasses || (groupMetrics.total_groups > 0);

  // Fallback if current tab query parameter is hidden
  useEffect(() => {
    if (!showSectionsTab && rawTab === 'sections') {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('tab', 'classes');
      setSearchParams(nextParams, { replace: true });
    } else if (!showGroupsTab && rawTab === 'groups') {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('tab', 'classes');
      setSearchParams(nextParams, { replace: true });
    }
  }, [showSectionsTab, showGroupsTab, rawTab, searchParams, setSearchParams]);

  const activeTab = useMemo(() => {
    if (rawTab === 'sections' && showSectionsTab) return 'sections';
    if (rawTab === 'groups' && showGroupsTab) return 'groups';
    return 'classes';
  }, [rawTab, showSectionsTab, showGroupsTab]);

  const handleTabChange = (tabId) => {
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

  const TABS = useMemo(() => {
    const tabsList = [
      {
        id: 'classes',
        label: 'Classes',
        icon: ClassIcon,
      },
    ];

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

    return tabsList;
  }, [showSectionsTab, showGroupsTab]);

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
          <button
            type="button"
            onClick={handlePrimaryAction}
            className="w-full sm:w-auto px-4 sm:px-5 py-2 rounded-xl text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>{getPrimaryActionText()}</span>
          </button>
        }
      />

      {/* 3. 4 Dynamic Short Total Cards (Synchronized with selected Tab) */}
      <div className="w-full">
        <MetricsGrid items={dynamicCards} />
      </div>

      {/* 4. Tab Body Content (Persistent display switching to eliminate layout jumping) */}
      <div className="w-full min-h-[460px]">
        <div className={activeTab === 'classes' ? 'block' : 'hidden'}>
          <ClassManagementView hideHeader hideMetrics isEmbedded />
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
