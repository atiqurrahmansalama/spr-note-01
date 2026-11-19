import React, { useState, useMemo } from 'react';
import {
  TimerIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
} from '../../../../components/ui/Icons';
import CustomButton from '../../../../components/ui/CustomButton';
import CustomSelect from '../../../../components/ui/CustomSelect';
import { ClassSelect } from '../../../../components/selectors';
import ActionMenu from '../../../../components/ui/ActionMenu';
import UniversalManagementView from '../../../../components/common/UniversalManagementView';
import DeleteImpactModal from '../../../../components/common/DeleteImpactModal';
import { periodCategoriesStore } from '../../../../utils/localStore';

export default function PeriodSlotsManagementView({
  periodSlots = [],
  departments = [],
  classes = [],
  sections = [],
  periodCategories = [],
  activeTenantId = 'default',
  loading = false,
  onOpenAddSlot,
  onEditSlot,
  onDeleteSlot,
  deletingSlot = null,
  isDeleting = false,
  onConfirmDelete,
  onCloseDeleteModal,
  getSequenceLabel,
  getCategoryLabel,
}) {
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [classFilter, setClassFilter] = useState('ALL');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [slotTypeFilter, setSlotTypeFilter] = useState('ALL');

  const filteredClassesForFilter = useMemo(() => {
    if (!deptFilter || deptFilter === 'ALL') return classes;
    return classes.filter(
      (c) =>
        String(c.department) === String(deptFilter) ||
        String(c.department_id) === String(deptFilter)
    );
  }, [classes, deptFilter]);

  const availableSectionsForFilter = useMemo(() => {
    if (classFilter && classFilter !== 'ALL') {
      return sections.filter((sec) => {
        const rawSecClass = sec.student_class !== undefined ? sec.student_class : sec.student_class_id;
        const secClassId = rawSecClass
          ? (typeof rawSecClass === 'object' ? String(rawSecClass.id || '') : String(rawSecClass))
          : '';
        return secClassId === String(classFilter);
      });
    }
    return sections;
  }, [sections, classFilter]);

  const filteredSlots = useMemo(() => {
    const list = periodSlots.filter((slot) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          slot.period_name?.toLowerCase().includes(q) ||
          slot.student_class_name?.toLowerCase().includes(q) ||
          slot.section_name?.toLowerCase().includes(q);
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
      if (sectionFilter !== 'ALL') {
        const slotSecId = slot.section || slot.section_id;
        if (String(slotSecId) !== String(sectionFilter)) return false;
      }
      if (slotTypeFilter !== 'ALL') {
        if (slot.slot_type !== slotTypeFilter) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => (Number(a.period_order) || 99) - (Number(b.period_order) || 99));
  }, [periodSlots, searchQuery, deptFilter, classFilter, sectionFilter, slotTypeFilter]);

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    deptFilter !== 'ALL' ||
    classFilter !== 'ALL' ||
    sectionFilter !== 'ALL' ||
    slotTypeFilter !== 'ALL'
  );

  const activeFilterCount = [
    deptFilter !== 'ALL',
    classFilter !== 'ALL',
    sectionFilter !== 'ALL',
    slotTypeFilter !== 'ALL',
  ].filter(Boolean).length;

  const getActionMenuItems = (slot) => [
    {
      label: 'Edit Period Slot',
      icon: EditIcon,
      onClick: () => onEditSlot?.(slot),
    },
    { divider: true },
    {
      label: 'Delete Period',
      icon: TrashIcon,
      danger: true,
      onClick: () => onDeleteSlot?.(slot),
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
          {getSequenceLabel?.(slot.period_order || 1)}
        </span>
      ),
    },
    {
      header: 'Period Name & Category',
      key: 'period_name',
      render: (slot) => {
        const categoryLabel = getCategoryLabel?.(slot.slot_type);
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
      header: 'Target Class / Scope',
      render: (slot) => {
        if (!slot.student_class_name) {
          return (
            <div className="space-y-0.5 text-xs">
              <span className="font-semibold theme-text-primary block">
                {slot.department_name || 'Institution-Wide (All Classes)'}
              </span>
            </div>
          );
        }

        return (
          <div className="space-y-1 text-xs">
            <span className="font-semibold theme-text-primary block">
              {slot.student_class_name}
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {slot.section_name ? (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold theme-bg-sub theme-text-primary border theme-border">
                  Section: {slot.section_name}
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wider theme-bg-sub theme-text-secondary border theme-border opacity-80">
                  All Sections
                </span>
              )}
            </div>
          </div>
        );
      },
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
    const categoryLabel = getCategoryLabel?.(slot.slot_type);
    const orderNum = slot.period_order || 1;
    const ordinal = getSequenceLabel?.(orderNum);

    const targetScopeDisplay = slot.student_class_name
      ? `${slot.student_class_name}${slot.section_name ? ` • Section: ${slot.section_name}` : ' (All Sections)'}`
      : (slot.department_name || 'Institution-Wide');

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
              <span className="font-medium theme-text-primary truncate max-w-[180px]">{targetScopeDisplay}</span>
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
    { label: 'All Period Categories', value: 'ALL' },
    ...periodCategories.map((c) => ({ label: c.name, value: c.code || c.id })),
  ];

  return (
    <div className="animate-fade-in">
      <UniversalManagementView
        hideHeader={true}
        isEmbedded={true}
        storageKey="spr_periods_view_mode"
        defaultViewMode="grid"
        stackedSwitcher={true}
        filterGridClassName="grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
        searchSpanClassName="col-span-1"
        searchLabel="Search Routine"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search period name, class, section..."
        toolbarActions={
          <CustomButton
            type="button"
            variant="primary"
            size="sm"
            icon={PlusIcon}
            onClick={onOpenAddSlot}
          >
            Add Period
          </CustomButton>
        }
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
                  setSectionFilter('ALL');
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
                onChange={(val) => {
                  setClassFilter(val);
                  setSectionFilter('ALL');
                }}
                allowAll={true}
                allLabel="All Classes"
                placeholder="All Classes"
                size="md"
              />
            </div>

            {availableSectionsForFilter.length > 0 && classFilter !== 'ALL' && (
              <div>
                <CustomSelect
                  label="Section"
                  options={[
                    { label: 'All Sections', value: 'ALL' },
                    ...availableSectionsForFilter.map((s) => ({
                      label: s.section_name || `Section ${s.name || ''}`,
                      value: String(s.id),
                    })),
                  ]}
                  value={sectionFilter}
                  onChange={(val) => setSectionFilter(val)}
                  placeholder="All Sections"
                  size="md"
                />
              </div>
            )}

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
        onRowClick={(slot) => onEditSlot?.(slot)}
        selectable={false}
        emptyIcon={TimerIcon}
        emptyTitle="No Period Slots Found"
        emptySubMessage="Add academic lecture periods, break times, and study sessions to build the routine schedule."
      />

      {/* Delete Impact Confirmation Modal */}
      {deletingSlot && (
        <DeleteImpactModal
          isOpen={Boolean(deletingSlot)}
          onClose={onCloseDeleteModal}
          onConfirm={onConfirmDelete}
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
    </div>
  );
}
