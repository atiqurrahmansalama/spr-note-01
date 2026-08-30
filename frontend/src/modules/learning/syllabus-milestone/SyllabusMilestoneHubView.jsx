import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../../../components/ui/PageHeader';
import TabSwitcher from '../../../components/ui/TabSwitcher';
import { PageContainer } from '../../../components/layout';
import UniversalManagementView from '../../../components/common/UniversalManagementView';
import CustomSelect from '../../../components/ui/CustomSelect';
import ActionMenu from '../../../components/ui/ActionMenu';
import CustomButton from '../../../components/ui/CustomButton';
import {
  TargetIcon,
  PlusIcon,
  EditIcon,
  DeleteIcon,
} from '../../../components/ui/Icons';
import { learningStore } from '../../../utils/stores/learningStore';
import { useToast } from '../../../context/ToastContext';
import { useTenant } from '../../../context/TenantContext';
import { useRightSidebar, useDrawerRegistration } from '../../../context/RightSidebarContext';
import { useAcademicData } from '../useAcademicData';
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

export default function SyllabusMilestoneHubView({ defaultTab = 'PACING_GOALS' }) {
  const { activeTenantId } = useTenant();
  const { showToast } = useToast();
  const { openDrawer, closeDrawer } = useRightSidebar();
  const [searchParams, setSearchParams] = useSearchParams();
  const { classes = [] } = useAcademicData();
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
  const [classFilter, setClassFilter] = useState('ALL');

  const loadData = () => {
    try {
      const list = learningStore.getGoals(tenantId);
      setGoals(list || []);
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
      showToast('Goal removed successfully.', 'success');
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
        <div className="text-left">
          <span className="font-bold theme-text-primary block">{row.student_name}</span>
          <span className="text-xs theme-text-secondary">{row.student_uniq_id || 'ID: N/A'}</span>
        </div>
      ),
    },
    {
      header: 'Subject & Target Milestone',
      render: (row) => (
        <div className="text-left">
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
        <span className="text-xs font-medium theme-text-secondary">{row.target_end_date || 'N/A'}</span>
      ),
    },
    {
      header: 'Syllabus Coverage %',
      render: (row) => (
        <div className="w-40 text-left">
          <div className="flex items-center justify-between text-xs font-semibold mb-1">
            <span className="theme-text-primary">{row.current_progress}</span>
            <span className="theme-text-accent">{row.progress_percentage || 0}%</span>
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
          {(row.status || 'ON_TRACK').replace('_', ' ')}
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
    <div key={goal.id} className="p-4 rounded-2xl border theme-border theme-bg-surface shadow-xs hover:theme-bg-sub/20 transition-all flex flex-col justify-between space-y-3 text-left">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-xs font-bold theme-text-accent uppercase tracking-wider block">{goal.subject_name}</span>
            <h4 className="text-sm font-bold theme-text-primary mt-0.5">{goal.target_title}</h4>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-md border theme-border theme-text-secondary">
            {(goal.status || 'ON_TRACK').replace('_', ' ')}
          </span>
        </div>

        <div className="p-2.5 rounded-xl theme-bg-sub border theme-border my-2.5">
          <span className="text-xs font-semibold theme-text-secondary block">Student</span>
          <span className="text-xs font-bold theme-text-primary">{goal.student_name}</span>
          <span className="text-[11px] theme-text-secondary block mt-0.5">{goal.student_class_name || 'Class'}</span>
        </div>

        <div className="space-y-1 mt-3">
          <div className="flex justify-between text-xs font-semibold">
            <span className="theme-text-secondary">Progress:</span>
            <span className="theme-text-primary">{goal.current_progress}</span>
          </div>
          <div className="w-full h-1.5 rounded-full theme-bg-secondary overflow-hidden">
            <div
              className="h-full theme-bg-accent transition-all duration-300 rounded-full"
              style={{ width: `${Math.min(100, goal.progress_percentage || 0)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="pt-2 border-t theme-border flex items-center justify-between text-xs theme-text-secondary">
        <span>Target: <strong>{goal.target_end_date || 'Ongoing'}</strong></span>
        <span className="font-semibold theme-accent">Pace: {goal.target_daily_pace || 'Regular'}</span>
      </div>
    </div>
  );

  return (
    <PageContainer className="space-y-4">
      <PageHeader
        title="Curriculum Pacing & Milestone Benchmarks"
        subtitle="Individualized syllabus timelines, daily target paces, and memorization progress tracking."
        icon={TargetIcon}
        actions={
          <CustomButton
            type="button"
            variant="primary"
            size="sm"
            icon={PlusIcon}
            onClick={() => openDrawer('academic_goal', { mode: 'add' })}
          >
            Set New Benchmark
          </CustomButton>
        }
      />

      <TabSwitcher tabs={TABS} activeTab={activeTab} onChange={handleTabChange} />

      <UniversalManagementView
        hideHeader={true}
        isEmbedded={true}
        storageKey="spr_milestone_goals_view"
        defaultViewMode="table"
        metrics={metrics}
        searchLabel="Search Benchmarks"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search student name, target goal, subject..."
        filters={
          <>
            <CustomSelect
              label="Goal Status"
              options={STATUS_FILTERS}
              value={statusFilter}
              onChange={setStatusFilter}
            />
            <CustomSelect
              label="Academic Class"
              options={classSelectOptions}
              value={classFilter}
              onChange={setClassFilter}
            />
          </>
        }
        data={filteredGoals}
        columns={columns}
        renderCard={renderCard}
        totalCount={filteredGoals.length}
        emptyIcon={TargetIcon}
        emptyTitle="No pacing benchmarks found"
        emptySubMessage="Create an individualized goal to track student syllabus progress."
      />
    </PageContainer>
  );
}
