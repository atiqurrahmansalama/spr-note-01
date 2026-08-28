import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TimerIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  ClassIcon,
  BookOpenIcon,
} from '../../../components/ui/Icons';
import PageHeader from '../../../components/ui/PageHeader';
import TabSwitcher from '../../../components/ui/TabSwitcher';
import { PageContainer } from '../../../components/layout';
import CustomSelect from '../../../components/ui/CustomSelect';
import { ClassSelect } from '../../../components/selectors';
import ActionMenu from '../../../components/ui/ActionMenu';
import UniversalManagementView from '../../../components/common/UniversalManagementView';
import DeleteImpactModal from '../../../components/common/DeleteImpactModal';
import PeriodSlotForm, { getOrdinalPeriodLabel } from './PeriodSlotForm';
import CurriculumTrackerView from './CurriculumTrackerView';
import SyllabusDrawerForm from './SyllabusDrawerForm';
import {
  getPeriodSlots,
  deletePeriodSlot,
} from '../../../api/academy';
import { fetchWithAuth } from '../../../utils/authService';
import { useToast } from '../../../context/ToastContext';
import { useTenant } from '../../../context/TenantContext';
import { useRightSidebar, useDrawerRegistration } from '../../../context/RightSidebarContext';
import { periodCategoriesStore, periodSequencesStore } from '../../../utils/localStore';

const TABS = [
  { id: 'periods', label: 'Daily Period Slots', icon: TimerIcon },
  { id: 'curriculum', label: 'Curriculum & Syllabus', icon: BookOpenIcon },
];

export default function RoutineCurriculumHubView({
  hideHeader = false,
  isEmbedded = false,
}) {
  const { showToast } = useToast();
  const { activeTenant } = useTenant();
  const activeTenantId = activeTenant?.id || 'default';

  const [activeTab, setActiveTab] = useState('periods');
  const [periodSlots, setPeriodSlots] = useState([]);
  const [periodCategories, setPeriodCategories] = useState(() =>
    periodCategoriesStore.getCategories(activeTenantId)
  );
  const [periodSequences, setPeriodSequences] = useState(() =>
    periodSequencesStore.getSequences(activeTenantId)
  );

  useEffect(() => {
    const handleCategoriesUpdated = () => {
      setPeriodCategories(periodCategoriesStore.getCategories(activeTenantId));
    };
    const handleSequencesUpdated = () => {
      setPeriodSequences(periodSequencesStore.getSequences(activeTenantId));
    };

    window.addEventListener('spr_period_categories_updated', handleCategoriesUpdated);
    window.addEventListener('spr_period_sequences_updated', handleSequencesUpdated);

    return () => {
      window.removeEventListener('spr_period_categories_updated', handleCategoriesUpdated);
      window.removeEventListener('spr_period_sequences_updated', handleSequencesUpdated);
    };
  }, [activeTenantId]);

  const getCategoryLabel = useCallback((typeCode) => {
    const found = periodCategories.find((c) => c.code === typeCode || c.id === typeCode);
    return found ? (found.badge || found.name) : (typeCode ? typeCode.replace(/_/g, ' ') : 'Teaching Period');
  }, [periodCategories]);

  const getSequenceLabel = useCallback((orderNum) => {
    return periodSequencesStore.getLabelForOrder(activeTenantId, orderNum);
  }, [activeTenantId, periodSequences]);

  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingSlot, setDeletingSlot] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [classFilter, setClassFilter] = useState('ALL');
  const [slotTypeFilter, setSlotTypeFilter] = useState('ALL');

  const loadLookups = useCallback(async () => {
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

  const loadSlots = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPeriodSlots();
      setPeriodSlots(Array.isArray(data) ? data : data.results || []);
    } catch {
      showToast('Failed to load period schedule slots.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadLookups();
    loadSlots();

    const handleUpdate = () => loadSlots();
    window.addEventListener('spr_period_slots_updated', handleUpdate);
    return () => window.removeEventListener('spr_period_slots_updated', handleUpdate);
  }, [loadLookups, loadSlots]);

  const { openDrawer, closeDrawer } = useRightSidebar();

  useDrawerRegistration(
    'period_slot',
    (params) => {
      const mode = params.get('mode') || 'add';
      const slotId = params.get('id');
      const foundSlot = slotId ? periodSlots.find((s) => String(s.id) === String(slotId)) : null;

      return {
        title: mode === 'edit' ? 'Edit Period Slot' : 'Create Routine Period Slot',
        subtitle:
          mode === 'edit'
            ? `Update settings for ${foundSlot?.period_name || 'Period'}`
            : 'Configure daily lesson slots, break times, and routine timings',
        width: 'lg',
        content: (
          <PeriodSlotForm
            editingSlot={foundSlot}
            existingSlots={periodSlots}
            onSaved={() => {
              loadSlots();
              closeDrawer();
            }}
            onCancel={closeDrawer}
          />
        ),
      };
    },
    [periodSlots, loadSlots, closeDrawer]
  );

  useDrawerRegistration(
    'syllabus_form',
    () => ({
      title: 'Configure Course Syllabus',
      subtitle: 'Setup textbook target pages, assigned teachers, and academic terms',
      width: 'xl',
      content: (
        <SyllabusDrawerForm
          activeTenantId={activeTenantId}
          classes={classes}
          teachers={teachers}
          periodSlots={periodSlots}
          onCancel={closeDrawer}
          onSaved={() => {
            closeDrawer();
            window.dispatchEvent(new CustomEvent('spr_curriculum_updated'));
          }}
        />
      ),
    }),
    [closeDrawer, activeTenantId, classes, teachers, periodSlots]
  );

  const handleOpenAddSlot = () => {
    openDrawer('period_slot', { mode: 'add' });
  };

  const handleOpenAddSyllabus = () => {
    openDrawer('syllabus_form');
  };

  const handleEditSlot = (slot) => {
    openDrawer('period_slot', {
      mode: 'edit',
      id: slot.id,
      drawerKey: 'period_slot',
      title: `Edit Period Slot`,
      subtitle: `Update settings for ${slot.period_name || 'Period'}`,
      width: 'lg',
      content: (
        <PeriodSlotForm
          editingSlot={slot}
          existingSlots={periodSlots}
          onSaved={() => {
            loadSlots();
            closeDrawer();
          }}
          onCancel={closeDrawer}
        />
      ),
    });
  };

  const handleDeleteSlot = (slot) => {
    setDeletingSlot(slot);
  };

  const handleConfirmDelete = async () => {
    if (!deletingSlot?.id) return;
    setIsDeleting(true);
    try {
      await deletePeriodSlot(deletingSlot.id);
      showToast(`Period "${deletingSlot.period_name}" deleted successfully.`, 'success');
      setDeletingSlot(null);
      loadSlots();
    } catch {
      showToast('Failed to delete period slot.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setDeptFilter('ALL');
    setClassFilter('ALL');
    setSlotTypeFilter('ALL');
  };

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    deptFilter !== 'ALL' ||
    classFilter !== 'ALL' ||
    slotTypeFilter !== 'ALL'
  );

  const activeFilterCount = [
    deptFilter !== 'ALL',
    classFilter !== 'ALL',
    slotTypeFilter !== 'ALL',
  ].filter(Boolean).length;

  const filteredClassesForFilter = useMemo(() => {
    if (!deptFilter || deptFilter === 'ALL') return classes;
    return classes.filter(
      (c) =>
        String(c.department) === String(deptFilter) ||
        String(c.department_id) === String(deptFilter)
    );
  }, [classes, deptFilter]);

  const filteredSlots = useMemo(() => {
    const list = periodSlots.filter((slot) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          slot.period_name?.toLowerCase().includes(q) ||
          slot.student_class_name?.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (deptFilter !== 'ALL') {
        const slotDeptId = slot.department || slot.department_id;
        if (String(slotDeptId) !== String(deptFilter)) return false;
      }
      if (classFilter !== 'ALL') {
        const slotClassId = slot.student_class || slot.student_class_id;
        if (String(slotClassId) !== String(classFilter)) return false;
      }
      if (slotTypeFilter !== 'ALL') {
        if (slot.slot_type !== slotTypeFilter) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => (Number(a.period_order) || 99) - (Number(b.period_order) || 99));
  }, [periodSlots, searchQuery, deptFilter, classFilter, slotTypeFilter]);

  const getActionMenuItems = (slot) => [
    {
      label: 'Edit Period Slot',
      icon: EditIcon,
      onClick: () => handleEditSlot(slot),
    },
    { divider: true },
    {
      label: 'Delete Period',
      icon: TrashIcon,
      danger: true,
      onClick: () => handleDeleteSlot(slot),
    },
  ];

  const tableColumns = [
    {
      header: 'Slot',
      key: 'period_order',
      align: 'left',
      headerClassName: 'py-3 px-4 min-w-[110px]',
      cellClassName: 'py-3.5 px-4',
      render: (slot) => (
        <span className="text-xs font-semibold theme-text-primary whitespace-nowrap">
          {getSequenceLabel(slot.period_order || 1)}
        </span>
      ),
    },
    {
      header: 'Period Name & Category',
      key: 'period_name',
      render: (slot) => {
        const categoryLabel = getCategoryLabel(slot.slot_type);
        const isAttendanceTracked = periodCategoriesStore.isAttendanceTrackedForSlot(activeTenantId, slot);

        return (
          <div className="space-y-1">
            <div className="font-bold theme-text-primary text-xs sm:text-sm">
              {slot.period_name}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider theme-bg-accent-soft theme-accent border theme-border">
                {categoryLabel}
              </span>
              {!isAttendanceTracked && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider theme-bg-sub theme-text-secondary border theme-border opacity-85">
                  No Attendance
                </span>
              )}
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
      header: 'Target Class / Dept',
      render: (slot) => (
        <div className="space-y-0.5 text-xs">
          <span className="font-semibold theme-text-primary block">
            {slot.student_class_name || slot.department_name || 'Institution-Wide'}
          </span>
        </div>
      ),
    },
    {
      header: 'Actions',
      align: 'right',
      headerClassName: 'w-16 text-right',
      render: (slot) => (
        <div className="flex items-center justify-end">
          <ActionMenu items={getActionMenuItems(slot)} align="right" />
        </div>
      ),
    },
  ];

  const renderPeriodCard = (slot) => {
    const categoryLabel = getCategoryLabel(slot.slot_type);
    const orderNum = slot.period_order || 1;
    const ordinal = getSequenceLabel(orderNum);

    return (
      <div
        key={slot.id}
        className="rounded-2xl theme-bg-surface border theme-border p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:theme-bg-sub/20 transition-all space-y-3.5 group text-left"
      >
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold theme-bg-sub theme-text-primary border theme-border">
                  {ordinal}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider theme-bg-accent-soft theme-accent border theme-border">
                  {categoryLabel}
                </span>
              </div>
              <h4 className="font-bold theme-text-primary text-sm leading-tight truncate mt-1">
                {slot.period_name}
              </h4>
            </div>
            <ActionMenu items={getActionMenuItems(slot)} align="right" />
          </div>

          <div className="text-xs space-y-1.5 theme-text-secondary border-t theme-border pt-2.5">
            <div className="flex items-center justify-between">
              <span>Time:</span>
              <span className="font-mono font-bold theme-text-primary">
                {slot.start_time?.slice(0, 5)} - {slot.end_time?.slice(0, 5)} ({slot.duration_minutes || 0}m)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Scope:</span>
              <span className="font-medium theme-text-primary">{slot.student_class_name || slot.department_name || 'Institution-Wide'}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const deptOptions = [
    { label: 'All Departments', value: 'ALL' },
    ...departments.map((d) => ({ label: d.name, value: d.id })),
  ];

  const slotTypeOptions = [
    { label: 'All Period', value: 'ALL' },
    ...periodCategories.map((c) => ({ label: c.name, value: c.code || c.id })),
  ];

  return (
    <PageContainer isEmbedded={isEmbedded} className="space-y-4">
      {/* 1. Header */}
      {!hideHeader && (
        <PageHeader
          title="Period Schedules & Curriculum Console"
          subtitle="Configure dynamic class period slots, break intervals, daily routines, and institutional kitab syllabi."
          icon={TimerIcon}
          actions={
            <button
              type="button"
              onClick={activeTab === 'periods' ? handleOpenAddSlot : handleOpenAddSyllabus}
              className="px-4 py-2 rounded-xl text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-90 transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>{activeTab === 'periods' ? 'Add Period' : 'Add Book'}</span>
            </button>
          }
        />
      )}

      {/* 2. Tab Switcher */}
      <TabSwitcher
        tabs={TABS}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* 3. Tab 1: Daily Period Slots */}
      {activeTab === 'periods' && (
        <div className="animate-fade-in">
          <UniversalManagementView
            hideHeader={true}
            isEmbedded={true}
            storageKey="spr_periods_view_mode"
            defaultViewMode="grid"
            stackedSwitcher={true}
            filterGridClassName="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
            searchSpanClassName="col-span-1"
            searchLabel="Search Routine"
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search period name, class..."
            filters={
              <>
                <div>
                  <CustomSelect
                    label="Department"
                    options={deptOptions}
                    value={deptFilter}
                    onChange={(val) => {
                      setDeptFilter(val);
                      setClassFilter('ALL');
                    }}
                    placeholder="All Departments"
                    size="md"
                  />
                </div>

                <div>
                  <ClassSelect
                    label="Class"
                    classes={filteredClassesForFilter}
                    value={classFilter}
                    onChange={(val) => setClassFilter(val)}
                    allowAll={true}
                    allLabel="All Classes"
                    placeholder="All Classes"
                    size="md"
                  />
                </div>

                <div>
                  <CustomSelect
                    label="Period Category"
                    options={slotTypeOptions}
                    value={slotTypeFilter}
                    onChange={(val) => setSlotTypeFilter(val)}
                    placeholder="All Period Categories"
                    size="md"
                  />
                </div>
              </>
            }
            hasActiveFilters={hasActiveFilters}
            activeFilterCount={activeFilterCount}
            loading={loading}
            loadingMessage="Loading period schedule slots..."
            data={filteredSlots}
            totalCount={periodSlots.length}
            itemLabel="period schedule slots"
            columns={tableColumns}
            renderCard={renderPeriodCard}
            onRowClick={(slot) => handleEditSlot(slot)}
            selectable={false}
            emptyIcon={TimerIcon}
            emptyTitle="No Period Slots Found"
            emptySubMessage="Add academic lecture periods, break times, and study sessions to build the routine schedule."
          />
        </div>
      )}

      {/* 4. Tab 2: Curriculum & Syllabus */}
      {activeTab === 'curriculum' && (
        <div className="animate-fade-in">
          <CurriculumTrackerView
            activeTenantId={activeTenantId}
            classes={classes}
            teachers={teachers}
            periodSlots={periodSlots}
            onOpenAddDrawer={handleOpenAddSyllabus}
          />
        </div>
      )}

      {/* 5. Delete Impact Confirmation Modal */}
      {deletingSlot && (
        <DeleteImpactModal
          isOpen={Boolean(deletingSlot)}
          onClose={() => !isDeleting && setDeletingSlot(null)}
          onConfirm={handleConfirmDelete}
          title="Delete Period Slot"
          subtitle={`You are about to delete routine period "${deletingSlot?.period_name}".`}
          entityName={deletingSlot?.period_name || ''}
          entityType="Period Slot"
          requireAck={false}
          requireNameMatch={false}
          isDeleting={isDeleting}
          confirmButtonText="Delete Slot"
          warningMessage="Deleting this period slot will permanently remove it from institutional routines, teacher timetables, and period schedules."
        />
      )}
    </PageContainer>
  );
}
