import React, { useState, useEffect, useCallback } from 'react';
import {
  TimerIcon,
  PlusIcon,
  SearchIcon,
  EditIcon,
  TrashIcon,
  ClassIcon,
  SparklesIcon,
  CloseIcon,
  BookOpenIcon,
} from '../../components/ui/Icons';
import PageHeader from '../../components/ui/PageHeader';
import { PageContainer } from '../../components/layout';
import CustomSelect from '../../components/ui/CustomSelect';
import TabSwitcher from '../../components/ui/TabSwitcher';
import { ClassSelect, TeacherSelect } from '../../components/selectors';
import DataTable from '../../components/ui/DataTable';
import DataCardGrid from '../../components/ui/DataCardGrid';
import ActionMenu from '../../components/ui/ActionMenu';
import DataViewFooter from '../../components/ui/DataViewFooter';
import PeriodForm from './PeriodForm';
import { CurriculumTrackerView, SyllabusDrawerForm } from './curriculum';
import {
  getPeriodSlots,
  deletePeriodSlot,
  reorderPeriodSlots,
  getBranches,
} from '../../api/academy';
import { fetchWithAuth } from '../../utils/authService';
import { useToast } from '../../context/ToastContext';
import { useTenant } from '../../context/TenantContext';
import { useRightSidebar, useDrawerRegistration } from '../../context/RightSidebarContext';

const SLOT_TYPE_CONFIG = {
  TEACHING_PERIOD: {
    label: 'Teaching Period',
  },
  BREAK_TIFFIN: {
    label: 'Break / Tiffin',
  },
  PRAYER_BREAK: {
    label: 'Prayer Break',
  },
  MUTALA_SESSION: {
    label: 'Mutala Session',
  },
};

const TABS = [
  { id: 'periods', label: 'Daily Period Slots', icon: TimerIcon },
  { id: 'curriculum', label: 'Curriculum & Syllabus', icon: BookOpenIcon },
];

export default function ClassPeriodScheduleView({
  hideHeader = false,
  isEmbedded = false,
}) {
  const { showToast } = useToast();
  const { activeTenant } = useTenant();
  const activeTenantId = activeTenant?.id || 'default';

  const [activeTab, setActiveTab] = useState('periods');
  const [periodSlots, setPeriodSlots] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);

  // View Mode: 'grid' (Cards) or 'table' (Data Table)
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('spr_periods_view_mode') || 'grid';
    } catch {
      return 'grid';
    }
  });

  const handleToggleViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('spr_periods_view_mode', mode);
    } catch {}
  };

  const handleSelectRow = React.useCallback((id) => {
    setSelectedIds((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
    });
  }, []);

  const handleSelectAll = React.useCallback((val) => {
    if (Array.isArray(val)) {
      setSelectedIds(val);
    } else {
      setSelectedIds([]);
    }
  }, []);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [classFilter, setClassFilter] = useState('ALL');
  const [teacherFilter, setTeacherFilter] = useState('ALL');
  const [slotTypeFilter, setSlotTypeFilter] = useState('ALL');

  const loadLookups = React.useCallback(async () => {
    try {
      const [deptRes, classRes, staffRes] = await Promise.allSettled([
        fetchWithAuth('/api/v1/departments/'),
        fetchWithAuth('/api/v1/classes/'),
        fetchWithAuth('/api/v1/staff/'),
      ]);

      if (deptRes.status === 'fulfilled' && deptRes.value.ok) {
        const d = await deptRes.value.json();
        setDepartments(Array.isArray(d) ? d : d.results || []);
      }
      if (classRes.status === 'fulfilled' && classRes.value.ok) {
        const d = await classRes.value.json();
        setClasses(Array.isArray(d) ? d : d.results || []);
      }
      if (staffRes.status === 'fulfilled' && staffRes.value.ok) {
        const d = await staffRes.value.json();
        setTeachers(Array.isArray(d) ? d : d.results || []);
      }
    } catch {}
  }, []);

  const loadSlots = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (deptFilter && deptFilter !== 'ALL') params.department = deptFilter;
      if (classFilter && classFilter !== 'ALL') params.class = classFilter;
      if (teacherFilter && teacherFilter !== 'ALL') params.teacher = teacherFilter;
      if (slotTypeFilter && slotTypeFilter !== 'ALL') params.slot_type = slotTypeFilter;

      const data = await getPeriodSlots(params);
      const list = Array.isArray(data) ? data : data.results || [];
      // Sort by period_order and start_time
      list.sort((a, b) => (a.period_order || 0) - (b.period_order || 0));
      setPeriodSlots(list);
    } catch {
      showToast('Could not load period slots.', 'error');
    } finally {
      setLoading(false);
    }
  }, [deptFilter, classFilter, teacherFilter, slotTypeFilter, showToast]);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  useEffect(() => {
    const handleTenantChanged = () => {
      loadLookups();
      loadSlots();
    };
    window.addEventListener("spr_tenant_changed", handleTenantChanged);
    return () => window.removeEventListener("spr_tenant_changed", handleTenantChanged);
  }, [loadLookups, loadSlots]);

  const { openDrawer, closeDrawer } = useRightSidebar();

  // Universal Drawer Registration for Period Slot (survives F5 refresh)
  useDrawerRegistration(
    'period-slot',
    (params) => {
      const mode = params.get('mode') || 'add';
      const slotId = params.get('id');
      const foundSlot = slotId ? periodSlots.find((s) => String(s.id) === String(slotId)) : null;

      return {
        title: mode === 'add' ? 'Add Period Slot' : `Edit: ${foundSlot?.period_name || 'Period'}`,
        category: 'Class Routine & Periods',
        size: 'md',
        content: (
          <PeriodForm
            editingSlot={foundSlot}
            defaultDepartmentId={deptFilter !== 'ALL' ? deptFilter : null}
            defaultClassId={classFilter !== 'ALL' ? classFilter : null}
            nextOrder={foundSlot?.period_order || periodSlots.length + 1}
            onSaved={() => {
              loadSlots();
              closeDrawer();
              showToast(mode === 'add' ? 'Period slot saved successfully.' : 'Period slot updated successfully.', 'success');
            }}
            onCancel={closeDrawer}
          />
        ),
      };
    }
  );

  const handleCreateNew = () => {
    openDrawer('period-slot', { mode: 'add' });
  };

  const handleOpenAddSyllabusDrawer = () => {
    openDrawer({
      title: 'Add Syllabus Item',
      subtitle: 'Configure textbook, class syllabus, and page range milestones',
      icon: BookOpenIcon,
      width: 580,
      content: (
        <SyllabusDrawerForm
          activeTenantId={activeTenantId}
          classes={classes}
          teachers={teachers}
          onSaveSuccess={() => {
            closeDrawer();
          }}
          onCancel={closeDrawer}
        />
      ),
    });
  };

  const handlePrimaryAction = () => {
    if (activeTab === 'periods') {
      handleCreateNew();
    } else {
      handleOpenAddSyllabusDrawer();
    }
  };

  const handleEdit = (slot) => {
    openDrawer('period-slot', { mode: 'edit', id: slot.id });
  };

  const handleDelete = async (slot) => {
    if (!window.confirm(`Are you sure you want to delete "${slot.period_name}"?`)) {
      return;
    }
    try {
      await deletePeriodSlot(slot.id);
      showToast(`Period slot "${slot.period_name}" deleted.`, 'success');
      loadSlots();
    } catch (err) {
      showToast(err.message || 'Failed to delete period slot.', 'error');
    }
  };

  const handleMoveOrder = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= filteredSlots.length) return;

    const newSlots = [...periodSlots];
    const actualIndex = newSlots.findIndex((s) => s.id === filteredSlots[index].id);
    const targetActualIndex = newSlots.findIndex((s) => s.id === filteredSlots[targetIndex].id);

    if (actualIndex === -1 || targetActualIndex === -1) return;

    const temp = newSlots[actualIndex];
    newSlots[actualIndex] = newSlots[targetActualIndex];
    newSlots[targetActualIndex] = temp;

    // Update order numbers sequentially
    const payload = newSlots.map((s, idx) => ({
      id: s.id,
      period_order: idx + 1,
    }));

    setPeriodSlots(newSlots); // optimistic update

    try {
      await reorderPeriodSlots(payload);
      showToast('Period order updated.', 'success');
    } catch {
      showToast('Failed to save updated order.', 'error');
      loadSlots();
    }
  };

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    deptFilter !== 'ALL' ||
    classFilter !== 'ALL' ||
    teacherFilter !== 'ALL' ||
    slotTypeFilter !== 'ALL'
  );

  const handleResetFilters = () => {
    setSearchQuery('');
    setDeptFilter('ALL');
    setClassFilter('ALL');
    setTeacherFilter('ALL');
    setSlotTypeFilter('ALL');
  };

  const filteredSlots = periodSlots.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (s.period_name && s.period_name.toLowerCase().includes(q)) ||
      (s.teacher_name && s.teacher_name.toLowerCase().includes(q)) ||
      (s.teacher_designation && s.teacher_designation.toLowerCase().includes(q)) ||
      (s.department_name && s.department_name.toLowerCase().includes(q)) ||
      (s.student_class_name && s.student_class_name.toLowerCase().includes(q)) ||
      (s.branch_name && s.branch_name.toLowerCase().includes(q))
    );
  });

  const deptOptions = [
    { label: 'All Departments', value: 'ALL' },
    ...departments.map((d) => ({ label: d.name, value: d.id })),
  ];

  const classOptions = [
    { label: 'All Classes', value: 'ALL' },
    ...classes.map((c) => ({ label: c.name, value: c.id })),
  ];

  const teacherOptions = [
    { label: 'All Teachers', value: 'ALL' },
    ...teachers.map((t) => ({
      label: `${t.user_name || t.employee_id || 'Teacher'} (${t.designation || 'Faculty'})`,
      value: t.id,
    })),
  ];

  const slotTypeOptions = [
    { label: 'All Slot Types', value: 'ALL' },
    { label: 'Teaching Periods', value: 'TEACHING_PERIOD' },
    { label: 'Tiffin Breaks', value: 'BREAK_TIFFIN' },
    { label: 'Prayer Breaks', value: 'PRAYER_BREAK' },
    { label: 'Mutala Sessions', value: 'MUTALA_SESSION' },
  ];

  // Reusable 3-Dots Action Items Menu for Period Slots
  const getActionMenuItems = (slot) => [
    {
      label: 'Edit Period Slot',
      icon: EditIcon,
      onClick: () => handleEdit(slot),
    },
    {
      divider: true,
    },
    {
      label: 'Delete Slot',
      icon: TrashIcon,
      danger: true,
      onClick: () => handleDelete(slot),
    },
  ];

  // Reusable Card Renderer for Mobile / Grid View Mode
  const renderPeriodCard = (slot, index) => {
    const conf = SLOT_TYPE_CONFIG[slot.slot_type] || SLOT_TYPE_CONFIG.TEACHING_PERIOD;

    return (
      <div
        key={slot.id}
        className="theme-bg-surface border theme-border hover:border-current rounded-2xl p-4 sm:p-5 shadow-xs transition-all flex flex-col justify-between space-y-4"
      >
        <div>
          {/* Top Row: Order Badge & Up/Down + Category + ActionMenu */}
          <div className="flex items-start justify-between gap-2.5 mb-3">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              {/* Up/Down buttons + Order # */}
              <div className="flex items-center gap-1 theme-bg-sub border theme-border px-2 py-1 rounded-xl shrink-0">
                <button
                  type="button"
                  onClick={() => handleMoveOrder(index, -1)}
                  disabled={index === 0}
                  className="p-0.5 theme-text-secondary hover:theme-accent transition disabled:opacity-20 cursor-pointer"
                  title="Move Up"
                >
                  <svg className="w-3 h-3 rotate-180" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                <span className="font-mono font-bold text-xs theme-text-primary px-1">
                  #{slot.period_order || index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => handleMoveOrder(index, 1)}
                  disabled={index === filteredSlots.length - 1}
                  className="p-0.5 theme-text-secondary hover:theme-accent transition disabled:opacity-20 cursor-pointer"
                  title="Move Down"
                >
                  <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>

              <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20 shadow-xs truncate">
                {conf.label}
              </span>
            </div>

            <div className="shrink-0">
              <ActionMenu items={getActionMenuItems(slot)} align="right" />
            </div>
          </div>

          {/* Period Title */}
          <h4 className="font-bold theme-text-primary text-sm sm:text-base mb-2.5 break-words">
            {slot.period_name}
          </h4>

          {/* Timings & Duration Banner */}
          <div className="theme-bg-sub border theme-border p-3 rounded-xl flex items-center justify-between mb-3 text-xs">
            <div>
              <span className="text-[10px] theme-text-secondary uppercase font-semibold block mb-0.5">
                Schedule Timing
              </span>
              <span className="font-mono font-bold theme-text-primary text-xs sm:text-sm">
                {slot.start_time?.slice(0, 5)} - {slot.end_time?.slice(0, 5)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] theme-text-secondary uppercase font-semibold block mb-0.5">
                Duration
              </span>
              <span className="font-mono font-bold theme-accent text-xs">
                {slot.duration_minutes || 0} mins
              </span>
            </div>
          </div>

          {/* Target Scopes & Assigned Teacher Chips */}
          <div className="space-y-2">
            {/* Teacher Chip */}
            {slot.teacher_name ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl theme-bg-accent-soft border border-[var(--accent-main)]/20 text-xs">
                <span className="text-[10px] theme-accent font-bold uppercase tracking-wider">Teacher:</span>
                <span className="font-bold theme-text-primary truncate">{slot.teacher_name}</span>
                {slot.teacher_designation && (
                  <span className="text-[10px] theme-text-secondary opacity-75 truncate">({slot.teacher_designation})</span>
                )}
              </div>
            ) : (
              <div className="text-[11px] theme-text-secondary opacity-60 italic px-1">
                No Teacher Assigned
              </div>
            )}

            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              {slot.department_name && (
                <span className="px-2.5 py-1 rounded-lg theme-bg-sub border theme-border theme-text-secondary flex items-center gap-1">
                  <span className="opacity-70">Dept:</span>
                  <span className="font-medium theme-text-primary">{slot.department_name}</span>
                </span>
              )}
              {slot.student_class_name && (
                <span className="px-2.5 py-1 rounded-lg theme-bg-sub border theme-border theme-text-secondary flex items-center gap-1">
                  <span className="opacity-70">Class:</span>
                  <span className="font-medium theme-text-primary">{slot.student_class_name}</span>
                </span>
              )}
              {!slot.department_name && !slot.student_class_name && (
                <span className="px-2.5 py-1 rounded-lg theme-bg-sub border theme-border text-[11px] theme-text-secondary opacity-75 italic">
                  Institution-Wide Routine
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Reusable Table Columns Definition
  const tableColumns = [
    {
      header: 'Order',
      key: 'period_order',
      align: 'center',
      headerClassName: 'w-20',
      render: (slot, index) => (
        <div className="flex items-center justify-center gap-1.5" data-no-row-click="true">
          <div className="flex flex-col items-center gap-0.5">
            <button
              onClick={() => handleMoveOrder(index, -1)}
              disabled={index === 0}
              className="p-0.5 theme-text-secondary hover:theme-accent hover:theme-bg-sub rounded transition-all disabled:opacity-15 disabled:hover:bg-transparent cursor-pointer"
              title="Move Up"
            >
              <svg className="w-3 h-3 rotate-180" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              onClick={() => handleMoveOrder(index, 1)}
              disabled={index === filteredSlots.length - 1}
              className="p-0.5 theme-text-secondary hover:theme-accent hover:theme-bg-sub rounded transition-all disabled:opacity-15 disabled:hover:bg-transparent cursor-pointer"
              title="Move Down"
            >
              <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          <span className="font-mono font-bold text-xs theme-text-secondary">
            #{slot.period_order || index + 1}
          </span>
        </div>
      ),
    },
    {
      header: 'Period Name & Category',
      key: 'period_name',
      render: (slot) => {
        const conf = SLOT_TYPE_CONFIG[slot.slot_type] || SLOT_TYPE_CONFIG.TEACHING_PERIOD;
        return (
          <div className="space-y-1">
            <div className="font-bold theme-text-primary text-xs sm:text-sm">
              {slot.period_name}
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20 shadow-xs">
                {conf.label}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Timings & Duration',
      align: 'left',
      render: (slot) => (
        <div className="space-y-0.5">
          <div className="font-mono font-bold text-xs theme-text-primary">
            {slot.start_time?.slice(0, 5)} - {slot.end_time?.slice(0, 5)}
          </div>
          <div className="text-[11px] font-mono theme-accent font-semibold">
            {slot.duration_minutes || 0} Minutes
          </div>
        </div>
      ),
    },
    {
      header: 'Assigned Teacher',
      render: (slot) => (
        <div className="space-y-0.5">
          {slot.teacher_name ? (
            <>
              <div className="font-bold text-xs theme-text-primary flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full theme-bg-accent shrink-0"></span>
                <span>{slot.teacher_name}</span>
              </div>
              {slot.teacher_designation && (
                <div className="text-[10px] theme-text-secondary pl-3.5">
                  {slot.teacher_designation}
                </div>
              )}
            </>
          ) : (
            <span className="text-[11px] theme-text-secondary opacity-50 italic">
              Not Assigned
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Target Class / Dept',
      render: (slot) => (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          {slot.department_name && (
            <span className="px-2 py-0.5 rounded-md theme-bg-sub border theme-border theme-text-secondary">
              Dept: {slot.department_name}
            </span>
          )}
          {slot.student_class_name && (
            <span className="px-2 py-0.5 rounded-md theme-bg-sub border theme-border theme-text-secondary">
              Class: {slot.student_class_name}
            </span>
          )}
          {!slot.department_name && !slot.student_class_name && (
            <span className="theme-text-secondary opacity-70 italic">Institution-Wide</span>
          )}
        </div>
      ),
    },
    {
      header: 'Actions',
      align: 'right',
      headerClassName: 'w-16 text-right',
      render: (slot) => (
        <div className="flex items-center justify-end" data-no-row-click="true">
          <ActionMenu items={getActionMenuItems(slot)} align="right" />
        </div>
      ),
    },
  ];

  const emptySubMessage = hasActiveFilters
    ? 'No period slots match your current search and filter criteria. Try clearing filters.'
    : 'Add academic lecture periods, break times, and study sessions to build the routine schedule.';

  return (
    <PageContainer isEmbedded={isEmbedded} className="space-y-4">
      {/* Header */}
      {!hideHeader && (
        <PageHeader
          title="Period Schedules & Curriculum Console"
          subtitle="Configure dynamic class period slots, break intervals, daily routines, and institutional kitab syllabi."
          icon={TimerIcon}
          breadcrumbs={[
            { label: 'Academy', path: '/academy-profile' },
            { label: 'Period Schedules', path: '/academy/periods' },
          ]}
        />
      )}

      {/* Top Toolbar Row: Theme-Aware TabSwitcher with Dynamic Action Button */}
      <TabSwitcher
        tabs={TABS}
        activeTab={activeTab}
        onChange={setActiveTab}
        rightContent={
          <button
            type="button"
            onClick={handlePrimaryAction}
            className="w-full sm:w-auto px-4 py-2 text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-95 rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>{activeTab === 'periods' ? 'Add Period' : 'Add Syllabus'}</span>
          </button>
        }
      />

      {/* Tab 1: Daily Period Slots */}
      {activeTab === 'periods' && (
        <div className="space-y-4 animate-fade-in">
          {/* Responsive Filters & ViewMode Toolbar */}
          <div className="theme-bg-surface border theme-border p-3 sm:p-4 rounded-2xl shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-2.5 items-center">
              {/* Search (Full width on small phones, 2 col on tablet, 1 col on desktop) */}
              <div className="col-span-1 sm:col-span-2 lg:col-span-1 relative w-full">
                <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 theme-text-secondary opacity-60 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search period slots..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 theme-bg-sub border theme-border pl-10 pr-8 py-2 rounded-xl text-xs theme-text-primary placeholder-[var(--text-secondary)]/50 focus:outline-none focus:border-[var(--accent-main)]/60 transition-all font-medium"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition cursor-pointer"
                    title="Clear search"
                  >
                    <CloseIcon className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Department Filter */}
              <div className="col-span-1 w-full">
                <CustomSelect
                  options={deptOptions}
                  value={deptFilter}
                  onChange={(val) => setDeptFilter(val)}
                  placeholder="All Departments"
                />
              </div>

              {/* Class Filter */}
              <div className="col-span-1 w-full">
                <ClassSelect
                  classes={classes}
                  value={classFilter === 'ALL' ? '' : classFilter}
                  onChange={(val) => setClassFilter(val || 'ALL')}
                  allowAll={true}
                  allLabel="All Classes"
                />
              </div>

              {/* Teacher Filter */}
              <div className="col-span-1 w-full">
                <TeacherSelect
                  teachers={teachers}
                  value={teacherFilter === 'ALL' ? '' : teacherFilter}
                  onChange={(val) => setTeacherFilter(val || 'ALL')}
                  allowAll={true}
                  allLabel="All Teachers"
                  onlyTeachers={true}
                />
              </div>

              {/* Slot Type Filter */}
              <div className="col-span-1 w-full">
                <CustomSelect
                  options={slotTypeOptions}
                  value={slotTypeFilter}
                  onChange={(val) => setSlotTypeFilter(val)}
                  placeholder="All Slot Types"
                />
              </div>
            </div>

            {/* Active Filter Summary Bar & View Mode Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2.5 border-t theme-border text-xs">
              <div className="flex flex-wrap items-center gap-2">
                {hasActiveFilters ? (
                  <>
                    <span className="text-[11px] font-semibold theme-text-secondary">
                      Filtered:
                    </span>
                    <span className="px-2 py-0.5 rounded-md font-mono font-bold text-[11px] theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20 shadow-xs">
                      {filteredSlots.length} of {periodSlots.length} Slots
                    </span>
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="px-2 py-0.5 rounded-lg text-[11px] font-bold theme-bg-sub border theme-border theme-text-secondary hover:theme-danger hover:theme-bg-danger-soft transition cursor-pointer flex items-center gap-1 shadow-xs ml-1"
                    >
                      <CloseIcon className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  </>
                ) : (
                  <span className="text-[11px] theme-text-secondary font-medium">
                    Total <span className="font-bold theme-text-primary">{periodSlots.length}</span> Routine Periods
                  </span>
                )}
              </div>

              {/* View Mode Switcher (Cards Grid vs Data Table) */}
              <div className="flex items-center justify-center sm:justify-end gap-1 theme-bg-sub border theme-border p-1 rounded-xl shrink-0 select-none w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleToggleViewMode('grid')}
                  className={`flex-1 sm:flex-none px-3 py-1.5 sm:py-1 rounded-lg text-xs transition-colors duration-150 cursor-pointer outline-none focus:outline-none border-0 text-center ${
                    viewMode === 'grid'
                      ? 'theme-bg-accent theme-accent-text shadow-xs font-bold'
                      : 'theme-text-secondary hover:theme-text-primary font-medium'
                  }`}
                >
                  Cards Grid
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleViewMode('table')}
                  className={`flex-1 sm:flex-none px-3 py-1.5 sm:py-1 rounded-lg text-xs transition-colors duration-150 cursor-pointer outline-none focus:outline-none border-0 text-center ${
                    viewMode === 'table'
                      ? 'theme-bg-accent theme-accent-text shadow-xs font-bold'
                      : 'theme-text-secondary hover:theme-text-primary font-medium'
                  }`}
                >
                  Data Table
                </button>
              </div>
            </div>
          </div>

          {/* Main Content Area: Reusable DataCardGrid or DataTable */}
          <div className="space-y-4">
            {selectedIds.length > 0 && (
              <div className="p-3 rounded-2xl theme-bg-accent-soft/30 border theme-border flex items-center justify-between animate-fade-in">
                <span className="text-xs font-bold theme-text-primary">
                  {selectedIds.length} {selectedIds.length === 1 ? 'period slot' : 'period slots'} selected
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="text-xs font-bold theme-text-secondary hover:theme-text-primary px-3 py-1 rounded-lg theme-bg-sub border theme-border transition cursor-pointer"
                >
                  Deselect All
                </button>
              </div>
            )}

            {viewMode === 'grid' ? (
              <DataCardGrid
                data={filteredSlots}
                renderCard={renderPeriodCard}
                isLoading={loading}
                loadingMessage="Loading period schedule slots..."
                emptyTitle="No Period Slots Found"
                emptySubMessage={emptySubMessage}
                emptyIcon={TimerIcon}
                gridClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4"
              />
            ) : (
              <DataTable
                columns={tableColumns}
                data={filteredSlots}
                selectable={true}
                selectedIds={selectedIds}
                onSelectRow={handleSelectRow}
                onSelectAll={handleSelectAll}
                idField="id"
                isLoading={loading}
                loadingMessage="Loading period schedule slots..."
                emptyTitle="No Period Slots Found"
                emptySubMessage={emptySubMessage}
                emptyIcon={TimerIcon}
                keyExtractor={(slot) => slot.id}
              />
            )}

            {/* Reusable DataViewFooter */}
            {!loading && periodSlots.length > 0 && (
              <DataViewFooter
                filteredCount={filteredSlots.length}
                totalCount={periodSlots.length}
                itemLabel="period schedule slots"
              />
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Curriculum & Syllabus Tracker */}
      {activeTab === 'curriculum' && (
        <div className="animate-fade-in">
          <CurriculumTrackerView
            activeTenantId={activeTenantId}
            classes={classes}
            teachers={teachers}
            onOpenAddDrawer={handleOpenAddSyllabusDrawer}
          />
        </div>
      )}
    </PageContainer>
  );
}
