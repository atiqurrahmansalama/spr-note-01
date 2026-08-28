import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import TabSwitcher from '../../components/ui/TabSwitcher';
import { PageContainer } from '../../components/layout';
import UniversalManagementView from '../../components/common/UniversalManagementView';
import CustomSelect from '../../components/ui/CustomSelect';
import ActionMenu from '../../components/ui/ActionMenu';
import {
  TargetIcon,
  PlusIcon,
  EditIcon,
  DeleteIcon,
} from '../../components/ui/Icons';
import { learningStore } from '../../utils/stores/learningStore';
import { useToast } from '../../context/ToastContext';
import { useTenant } from '../../context/TenantContext';
import { useRightSidebar, useDrawerRegistration } from '../../context/RightSidebarContext';
import { useAcademicData } from './useAcademicData';
import GoalSettingModal from './GoalSettingModal';

const TABS = [
  { id: 'PACING_GOALS', label: 'Curriculum Pacing & Goals', icon: TargetIcon },
];

const STATUS_FILTERS = [
  { value: 'ALL', label: 'All Goal Statuses' },
  { value: 'ON_TRACK', label: 'On Track' },
  { value: 'AHEAD', label: 'Ahead of Schedule' },
  { value: 'BEHIND', label: 'Behind Schedule' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'PAUSED', label: 'Paused' },
];

const DEPARTMENT_FILTERS = [
  { value: 'ALL', label: 'All Departments' },
  { value: 'HIFZ', label: 'Quran Hifz (Individual Track)' },
  { value: 'KITAB', label: 'Kitab & Hadith Division' },
  { value: 'GENERAL', label: 'General Academics' },
];

export default function SyllabusMilestoneHubView({ defaultTab = 'PACING_GOALS' }) {
  const { activeTenantId } = useTenant();
  const { showToast } = useToast();
  const { openDrawer, closeDrawer } = useRightSidebar();
  const [searchParams, setSearchParams] = useSearchParams();
  const { classes } = useAcademicData();
  const tenantId = activeTenantId || 'default';

  const activeTabParam = searchParams.get('tab') || defaultTab;
  const [activeTab, setActiveTab] = useState(activeTabParam);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', tabId);
        return next;
      },
      { replace: true }
    );
  };

  const [goals, setGoals] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [classFilter, setClassFilter] = useState('ALL');

  const loadData = () => {
    try {
      const list = learningStore.getGoals(tenantId);
      setGoals(list);
    } catch (err) {
      console.error('Failed to load goals:', err);
    }
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('spr_learning_updated', handleUpdate);
    return () => window.removeEventListener('spr_learning_updated', handleUpdate);
  }, [tenantId]);

  // ─── Register Right Sidebar Drawer ─────────────────────────────────────────

  useDrawerRegistration('academic_goal', (params) => {
    const mode = params.get('mode') || 'add';
    const goalId = params.get('id');
    const found = goalId ? goals.find((g) => String(g.id) === String(goalId)) : null;

    return {
      title: mode === 'add' ? 'Set New Curriculum Goal & Benchmark' : `Edit: ${found?.target_title || 'Goal'}`,
      category: 'Syllabus Milestone',
      size: 'md',
      content: (
        <GoalSettingModal
          goal={found}
          onSaveSuccess={() => {
            closeDrawer();
            loadData();
          }}
          onCancel={closeDrawer}
        />
      ),
    };
  });

  const filteredGoals = useMemo(() => {
    return goals.filter((g) => {
      const matchSearch =
        searchQuery === '' ||
        (g.student_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (g.target_title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (g.subject_name || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus = statusFilter === 'ALL' || g.status === statusFilter;
      const matchClass = classFilter === 'ALL' || String(g.student_class) === String(classFilter);
      return matchSearch && matchStatus && matchClass;
    });
  }, [goals, searchQuery, statusFilter, classFilter]);

  const metrics = useMemo(() => {
    const total = goals.length;
    const completed = goals.filter((g) => g.status === 'COMPLETED').length;
    const onTrack = goals.filter((g) => g.status === 'ON_TRACK').length;
    const behind = goals.filter((g) => g.status === 'BEHIND').length;

    return [
      { label: 'Total Goals', value: total, subValue: 'Active student benchmarks' },
      { label: 'On Track Pace', value: onTrack, subValue: 'Meeting daily targets' },
      { label: 'Completed Milestones', value: completed, subValue: 'Finished target syllabus' },
      { label: 'Behind Schedule', value: behind, subValue: 'Requires academic support' },
    ];
  }, [goals]);

  const handleDelete = (goalId) => {
    if (window.confirm('Are you sure you want to delete this academic goal?')) {
      learningStore.deleteGoal(tenantId, goalId);
      showToast({ type: 'success', message: 'Goal removed successfully.' });
      loadData();
    }
  };

  const classSelectOptions = [
    { value: 'ALL', label: 'All Classes' },
    ...classes.map((c) => ({ value: String(c.id), label: c.name || 'Class' })),
  ];

  // Table Columns
  const columns = [
    {
      header: 'Student Information',
      render: (row) => (
        <div>
          <span className="font-bold theme-text-primary block">{row.student_name}</span>
          <span className="text-xs theme-text-secondary">{row.student_uniq_id || 'ID: N/A'}</span>
        </div>
      ),
    },
    {
      header: 'Subject & Target Milestone',
      render: (row) => (
        <div>
          <span className="font-medium theme-text-primary block">{row.target_title}</span>
          <span className="text-xs theme-text-accent font-semibold">{row.subject_name}</span>
        </div>
      ),
    },
    {
      header: 'Target Daily Pace',
      render: (row) => (
        <span className="text-xs font-semibold theme-text-primary px-2.5 py-1 rounded-md border theme-border theme-bg-secondary/40">
          {row.target_daily_pace || 'N/A'}
        </span>
      ),
    },
    {
      header: 'Deadline',
      render: (row) => (
        <span className="text-xs font-medium theme-text-secondary">{row.target_completion_date || 'N/A'}</span>
      ),
    },
    {
      header: 'Syllabus Coverage %',
      render: (row) => (
        <div className="w-40">
          <div className="flex items-center justify-between text-xs font-semibold mb-1">
            <span className="theme-text-primary">{row.current_progress}</span>
            <span className="theme-text-accent">{row.progress_percentage}%</span>
          </div>
          <div className="w-full h-2 rounded-full theme-bg-secondary overflow-hidden">
            <div
              className="h-full theme-bg-accent transition-all duration-300 rounded-full"
              style={{ width: `${Math.min(100, row.progress_percentage || 0)}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      header: 'Status',
      render: (row) => (
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full border theme-border theme-text-secondary">
          {row.status.replace('_', ' ')}
        </span>
      ),
    },
    {
      header: 'Actions',
      align: 'right',
      headerClassName: 'w-16 text-right',
      render: (row) => {
        const actionItems = [
          {
            label: 'Edit Milestone',
            icon: EditIcon,
            onClick: () => {
              openDrawer('academic_goal', { mode: 'edit', id: row.id });
            },
          },
          {
            label: 'Delete Goal',
            icon: DeleteIcon,
            variant: 'danger',
            onClick: () => handleDelete(row.id),
          },
        ];
        return <ActionMenu items={actionItems} align="right" />;
      },
    },
  ];

  const renderCard = (goal) => (
    <div key={goal.id} className="p-4 rounded-2xl border theme-border theme-bg-surface shadow-xs hover:theme-bg-sub/20 transition-all flex flex-col justify-between space-y-3">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-xs font-bold theme-text-accent uppercase tracking-wider block">{goal.subject_name}</span>
            <h4 className="text-sm font-bold theme-text-primary mt-0.5">{goal.target_title}</h4>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-md border theme-border theme-text-secondary">
            {goal.status.replace('_', ' ')}
          </span>
        </div>

        <div className="p-2.5 rounded-xl theme-bg-sub border theme-border my-2.5">
          <span className="text-xs font-semibold theme-text-secondary block">Student</span>
          <span className="text-sm font-bold theme-text-primary">{goal.student_name}</span>
        </div>

        <div className="space-y-1 mb-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="theme-text-secondary">Coverage: {goal.current_progress}</span>
            <span className="theme-text-accent">{goal.progress_percentage}%</span>
          </div>
          <div className="w-full h-2 rounded-full theme-bg-secondary overflow-hidden">
            <div
              className="h-full theme-bg-accent transition-all duration-300 rounded-full"
              style={{ width: `${Math.min(100, goal.progress_percentage || 0)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t theme-border mt-2 text-xs theme-text-secondary">
        <span>Pace: <strong className="theme-text-primary">{goal.target_daily_pace || 'N/A'}</strong></span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              openDrawer('academic_goal', { mode: 'edit', id: goal.id });
            }}
            className="p-1 rounded-lg border theme-border hover:theme-bg-sub cursor-pointer"
            title="Edit"
          >
            <EditIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleDelete(goal.id)}
            className="p-1 rounded-lg border theme-border hover:theme-bg-sub cursor-pointer text-red-500"
            title="Delete"
          >
            <DeleteIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <PageContainer>
      {/* ─── 1. Header (Planning & Progression Layer) ─────────────────────────── */}
      <PageHeader
        title="Syllabus Milestone & Goals"
        subtitle="Planning & Progression Layer: Track individual student syllabus coverage %, milestone deadlines, and departmental pace"
        badge="Academic Studies"
        icon={TargetIcon}
        actions={
          <button
            onClick={() => openDrawer('academic_goal', { mode: 'add' })}
            className="px-4 py-2 text-xs font-bold text-white theme-bg-accent hover:opacity-90 rounded-xl flex items-center gap-1.5 shadow-md transition-opacity cursor-pointer"
          >
            <PlusIcon className="w-4 h-4" />
            Set New Goal
          </button>
        }
      />

      {/* ─── 2. In-Page Tab Switcher ──────────────────────────────────────────── */}
      <TabSwitcher tabs={TABS} activeTab={activeTab} onChange={handleTabChange} />

      {/* ─── 3. TAB CONTENT: Curriculum Pacing & Goals ────────────────────────── */}
      <div className="animate-fade-in">
        <UniversalManagementView
          hideHeader={true}
          isEmbedded={true}
          storageKey="spr_syllabus_milestones_view"
          defaultViewMode="table"
          stackedSwitcher={true}
          metrics={metrics}
          searchLabel="Search Goals"
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search student name, target title, subject..."
          filters={
            <>
              <div className="lg:col-span-1">
                <CustomSelect
                  label="Department"
                  options={DEPARTMENT_FILTERS}
                  value={deptFilter}
                  onChange={setDeptFilter}
                  size="md"
                />
              </div>

              <div className="lg:col-span-1">
                <CustomSelect
                  label="Class"
                  options={classSelectOptions}
                  value={classFilter}
                  onChange={setClassFilter}
                  size="md"
                />
              </div>

              <div className="lg:col-span-2">
                <CustomSelect
                  label="Goal Status"
                  options={STATUS_FILTERS}
                  value={statusFilter}
                  onChange={setStatusFilter}
                  size="md"
                />
              </div>
            </>
          }
          data={filteredGoals}
          columns={columns}
          renderCard={renderCard}
          totalCount={filteredGoals.length}
          emptyIcon={TargetIcon}
          emptyTitle="No curriculum goals found"
          emptySubMessage="Establish a student syllabus goal to begin tracking pacing benchmarks."
        />
      </div>
    </PageContainer>
  );
}
