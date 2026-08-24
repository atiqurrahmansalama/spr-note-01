import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ClassIcon,
  GroupIcon,
  StudentIcon,
  DashboardIcon,
  DepartmentIcon,
  PlusIcon,
  TeacherIcon,
} from '../../components/ui/Icons';
import PageHeader from '../../components/ui/PageHeader';
import TabSwitcher from '../../components/ui/TabSwitcher';
import MetricsGrid from '../../components/ui/MetricsGrid';
import { PageContainer } from '../../components/layout';
import { fetchWithAuth } from '../../utils/authService';
import { useRightSidebar } from '../../context/RightSidebarContext';
import ClassManagementView from './classes/ClassManagementView';
import GroupManagementView from './groups/GroupManagementView';

export default function ClassesGroupsHubView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { openDrawer } = useRightSidebar();
  const rawTab = searchParams.get('tab');
  const activeTab = rawTab === 'groups' ? 'groups' : 'classes';

  // Metrics for tabs
  const [classMetrics, setClassMetrics] = useState({
    total_classes: 0,
    total_enrolled_students: 0,
    avg_students_per_class: 0.0,
    total_departments: 0,
  });

  const [groupMetrics, setGroupMetrics] = useState({
    total_groups: 0,
    total_assigned_students: 0,
    total_classes: 0,
    active_mentors: 0,
  });

  const loadAllMetrics = useCallback(async () => {
    try {
      const [classRes, deptRes, groupRes, groupsListRes] = await Promise.allSettled([
        fetchWithAuth('/api/v1/classes/metrics/'),
        fetchWithAuth('/api/v1/departments/metrics/'),
        fetchWithAuth('/api/v1/groups/metrics/'),
        fetchWithAuth('/api/v1/groups/'),
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

      if (groupRes.status === 'fulfilled' && groupRes.value.ok) {
        const gd = await groupRes.value.json();
        let mentorsCount = 0;
        if (groupsListRes.status === 'fulfilled' && groupsListRes.value.ok) {
          const gl = await groupsListRes.value.json();
          const items = Array.isArray(gl) ? gl : gl.results || [];
          mentorsCount = items.filter((i) => i.mentor_teacher_name).length;
        }
        setGroupMetrics({
          total_groups: gd.total_groups ?? 0,
          total_assigned_students: gd.total_assigned_students ?? 0,
          total_classes: gd.total_classes ?? 0,
          active_mentors: mentorsCount,
        });
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

  const handlePrimaryAction = () => {
    if (activeTab === 'groups') {
      openDrawer('group', { mode: 'add' });
    } else {
      openDrawer('class', { mode: 'add' });
    }
  };

  const TABS = [
    {
      id: 'classes',
      label: 'Classes',
      icon: ClassIcon,
      // badge: classMetrics.total_classes,
    },
    {
      id: 'groups',
      label: 'Groups',
      icon: GroupIcon,
      // badge: groupMetrics.total_groups,
    },
  ];

  const getDynamicCards = () => {
    if (activeTab === 'groups') {
      return [
        {
          label: 'Total Groups',
          value: groupMetrics.total_groups ?? 0,
          icon: GroupIcon,
          color: 'accent',
          subLabel: 'Active Halqas',
        },
        {
          label: 'Assigned Students',
          value: groupMetrics.total_assigned_students ?? 0,
          icon: StudentIcon,
          color: 'accent',
          subLabel: 'Group Enrollment',
        },
        {
          label: 'Parent Classes',
          value: groupMetrics.total_classes ?? 0,
          icon: ClassIcon,
          color: 'accent',
          subLabel: 'Target Classes',
        },
        {
          label: 'Active Mentors',
          value: groupMetrics.active_mentors ?? 0,
          icon: TeacherIcon,
          color: 'accent',
          subLabel: 'Halqa Mentors',
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
        subLabel: 'Academic Grades',
      },
      {
        label: 'Enrolled Students',
        value: classMetrics.total_enrolled_students ?? 0,
        icon: StudentIcon,
        color: 'accent',
        subLabel: 'Active Enrollment',
      },
      {
        label: 'Avg Students / Class',
        value: classMetrics.avg_students_per_class ?? 0,
        icon: DashboardIcon,
        color: 'accent',
        subLabel: 'Class Density',
      },
      {
        label: 'Academic Departments',
        value: classMetrics.total_departments ?? 0,
        icon: DepartmentIcon,
        color: 'accent',
        subLabel: 'Assigned Divisions',
      },
    ];
  };

  const dynamicCards = getDynamicCards();
  const isGroups = activeTab === 'groups';

  return (
    <PageContainer>
      {/* 1. Header Overview with Reusable PageHeader */}
      <PageHeader
        title="Classes & Groups"
        subtitle="Unified academic console for managing class sections, academic stages, student batches, and specialized study groups."
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
            <span>{isGroups ? 'Add Group' : 'Add Class'}</span>
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
        <div className={activeTab === 'groups' ? 'block' : 'hidden'}>
          <GroupManagementView hideHeader hideMetrics isEmbedded />
        </div>
      </div>
    </PageContainer>
  );
}
