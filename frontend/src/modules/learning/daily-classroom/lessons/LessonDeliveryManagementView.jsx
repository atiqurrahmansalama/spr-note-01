import React, { useState, useMemo, useRef, useEffect } from 'react';
import UniversalManagementView from '../../../../components/common/UniversalManagementView';
import CustomSelect from '../../../../components/ui/CustomSelect';
import CustomButton from '../../../../components/ui/CustomButton';
import ReusableCalendar from '../../../../components/common/ReusableCalendar';
import ActionMenu from '../../../../components/ui/ActionMenu';
import CarryForwardLessonModal from './CarryForwardLessonModal';
import ClassPeriodSwitcherBar from '../ClassPeriodSwitcherBar';
import DeleteImpactModal from '../../../../components/common/DeleteImpactModal';
import {
  renderCurriculumBookCell,
  renderLessonRangeCell,
  formatRangeText,
} from '../dailyClassroomTableHelpers';
import {
  BookOpenIcon,
  TimerIcon,
  CopyIcon,
  EditIcon,
  DeleteIcon,
} from '../../../../components/ui/Icons';
import { learningStore } from '../../../../utils/stores/learningStore';
import { deleteDailyLesson as deleteDailyLessonAPI } from '../../../../api/learning';
import { useToast } from '../../../../context/ToastContext';

export default function LessonDeliveryManagementView({
  filteredLessons = [],
  lessonMetrics = [],
  lessonSearch = '',
  onSearchChange,
  selectedDate,
  onDateChange,
  selectedDepartmentId,
  onDepartmentChange,
  departmentSelectOptions = [],
  hasDepartments = false,
  selectedClassId,
  onClassChange,
  classSelectOptions = [],
  selectedSectionId,
  onSectionChange,
  sectionSelectOptions = [],
  hasSectionsForClass = false,
  activePeriodId,
  onPeriodChange,
  allPeriodFilterOptions = [],
  getSlotLessonsCount,
  getBookNamesForPeriod,
  getPeriodTimeForSlot,
  selectedClassObj,
  classes = [],
  tenantId,
  loadData,
  onOpenAddLesson,
  onEditLesson,
  onOpenBulkCarryForward,
}) {
  const { showToast } = useToast();
  const [carryForwardModal, setCarryForwardModal] = useState({
    isOpen: false,
    mode: 'bulk',
    sourceLesson: null,
  });
  const [deletingLesson, setDeletingLesson] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOpenSingleCarryForward = (lesson) => {
    setCarryForwardModal({
      isOpen: true,
      mode: 'single',
      sourceLesson: lesson,
    });
  };

  const handleCloseCarryForwardModal = () => {
    setCarryForwardModal({
      isOpen: false,
      mode: 'bulk',
      sourceLesson: null,
    });
  };

  const handleCarryForwardSuccess = () => {
    loadData?.();
  };

  const handleConfirmDelete = async () => {
    if (!deletingLesson) return;
    setIsDeleting(true);
    try {
      // 1. Delete from local store across all tenant buckets
      learningStore.deleteDailyLesson(tenantId, deletingLesson.id);

      // 2. Delete from backend API if it's a UUID record
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(deletingLesson.id));
      if (isUUID) {
        try {
          await deleteDailyLessonAPI(deletingLesson.id);
        } catch (apiErr) {
          console.warn('Backend lesson delete error:', apiErr);
        }
      }

      showToast('Daily lesson plan deleted successfully.', 'success');
      setDeletingLesson(null);
      loadData?.();
    } catch (err) {
      showToast('Failed to delete lesson.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Columns for Lessons
  const lessonColumns = [
    {
      header: 'Curriculum Book',
      headerClassName: 'w-[20%] min-w-[170px]',
      cellClassName: 'w-[20%] min-w-[170px]',
      render: renderCurriculumBookCell,
    },
    {
      header: 'Lesson & Assigned Range',
      headerClassName: 'w-[25%] min-w-[200px]',
      cellClassName: 'w-[25%] min-w-[200px]',
      render: renderLessonRangeCell,
    },
    {
      header: 'Homework Task',
      headerClassName: 'min-w-[180px]',
      cellClassName: 'min-w-[180px]',
      render: (row) => (
        <span
          className="text-xs theme-text-secondary line-clamp-2 block"
          title={row.homework_task || ''}
        >
          {row.homework_task || '—'}
        </span>
      ),
    },
    {
      header: 'Target Class / Section',
      headerClassName: 'w-[18%] min-w-[150px]',
      cellClassName: 'w-[18%] min-w-[150px]',
      render: (row) => {
        const resolvedSectionLabel = row.section_name
          ? row.section_name
          : (row.assigned_scope === 'CLASS_WIDE' ? 'All Sections (Class Wide)' : 'All Sections');

        return (
          <div className="min-w-0">
            <span className="font-medium theme-text-primary block truncate">{row.class_name}</span>
            <span className="text-xs theme-text-secondary block truncate" title={resolvedSectionLabel}>
              {resolvedSectionLabel}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Instructor',
      headerClassName: 'w-[15%] min-w-[130px]',
      cellClassName: 'w-[15%] min-w-[130px]',
      render: (row) => (
        <span className="text-xs font-medium theme-text-primary block truncate">{row.teacher_name || 'Assigned Instructor'}</span>
      ),
    },
    {
      header: 'Actions',
      align: 'right',
      headerClassName: 'w-[64px] min-w-[64px] text-right',
      cellClassName: 'w-[64px] min-w-[64px] text-right',
      render: (row) => {
        const actionItems = [
          {
            label: 'Carry Forward / Duplicate',
            icon: CopyIcon,
            onClick: () => handleOpenSingleCarryForward(row),
          },
          {
            label: 'Edit Lesson',
            icon: EditIcon,
            onClick: () => onEditLesson?.(row),
          },
          {
            label: 'Delete Lesson',
            icon: DeleteIcon,
            variant: 'danger',
            onClick: () => setDeletingLesson(row),
          },
        ];
        return <ActionMenu items={actionItems} align="right" />;
      },
    },
  ];

  // Render Lesson Card for Grid View
  const renderLessonCard = (row) => {
    const actionItems = [
      {
        label: 'Carry Forward / Duplicate',
        icon: CopyIcon,
        onClick: () => handleOpenSingleCarryForward(row),
      },
      {
        label: 'Edit Lesson',
        icon: EditIcon,
        onClick: () => onEditLesson?.(row),
      },
      {
        label: 'Delete Lesson',
        icon: DeleteIcon,
        variant: 'danger',
        onClick: () => setDeletingLesson(row),
      },
    ];

    return (
      <div
        key={row.id}
        onClick={() => onEditLesson(row)}
        className="rounded-2xl border theme-border theme-bg-primary p-4 sm:p-5 flex flex-col justify-between space-y-3.5 hover:shadow-md transition-shadow text-left cursor-pointer group hover:theme-bg-sub/20"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {row.curriculum_book_name && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg theme-bg-accent/10 theme-text-accent inline-flex items-center gap-1.5">
                  <BookOpenIcon className="w-3.5 h-3.5 shrink-0" />
                  {row.curriculum_book_name}
                </span>
              )}
              {row.period_name && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md border theme-border theme-bg-secondary/40 theme-text-primary inline-flex items-center gap-1">
                  <TimerIcon className="w-3 h-3 theme-accent shrink-0" />
                  {row.period_name}
                </span>
              )}
            </div>
            <h4 className="text-sm font-bold theme-text-primary mt-1 truncate">{row.lesson_title}</h4>
          </div>
          <ActionMenu items={actionItems} align="right" />
        </div>

        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl border theme-border theme-bg-secondary/20 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold theme-text-secondary block">Assigned Range</span>
            <span className="font-bold theme-text-accent">
              {formatRangeText(row.start_unit, row.end_unit) || '—'}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold theme-text-secondary block">Target Class</span>
            <span className="font-medium theme-text-primary truncate block">
              {row.class_name} ({row.section_name || 'All'})
            </span>
          </div>
        </div>

        {row.homework_task && (
          <div className="text-xs p-2 rounded-lg theme-bg-secondary/40 border theme-border/60 flex items-start gap-1.5">
            <span className="font-semibold theme-accent shrink-0">HW:</span>
            <span className="theme-text-primary line-clamp-2">{row.homework_task}</span>
          </div>
        )}

        {row.lesson_instructions && (
          <p className="text-xs theme-text-secondary italic line-clamp-2 p-2 rounded-lg theme-bg-secondary/30 border theme-border/40">
            "{row.lesson_instructions}"
          </p>
        )}

        <div className="pt-2 border-t theme-border flex items-center justify-between text-xs theme-text-secondary">
          <span className="font-medium">{row.teacher_name || 'Assigned Instructor'}</span>
          {row.period_time && <span className="font-semibold theme-text-primary">{row.period_time}</span>}
        </div>
      </div>
    );
  };

  return (
    <div className="animate-fade-in space-y-4">
      <UniversalManagementView
        hideHeader={true}
        isEmbedded={true}
        storageKey="spr_daily_lesson_view"
        defaultViewMode="table"
        stackedSwitcher={true}
        metrics={lessonMetrics}
        searchLabel="Search Lessons"
        searchQuery={lessonSearch}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search lesson title, kitab, teacher, topic..."
        filterGridClassName="grid-cols-6 gap-2.5"
        searchSpanClassName="col-span-6 @[540px]:col-span-3 @[900px]:col-span-2"
        filters={
          <>
            <div className={hasDepartments && hasSectionsForClass ? "col-span-6 @[540px]:col-span-3 @[900px]:col-span-1" : "col-span-6 @[540px]:col-span-3 @[900px]:col-span-2"}>
              <ReusableCalendar
                label="Delivery Date"
                selectedDate={selectedDate}
                onSelectDate={onDateChange}
                placeholder="Select Date"
              />
            </div>

            {hasDepartments && (
              <div className={hasSectionsForClass ? "col-span-6 @[540px]:col-span-2 @[900px]:col-span-1" : "col-span-6 @[540px]:col-span-3 @[900px]:col-span-1"}>
                <CustomSelect
                  label="Department"
                  options={departmentSelectOptions}
                  value={selectedDepartmentId}
                  onChange={onDepartmentChange}
                  size="md"
                />
              </div>
            )}

            <div className={hasDepartments && hasSectionsForClass ? "col-span-6 @[540px]:col-span-2 @[900px]:col-span-1" : (hasDepartments || hasSectionsForClass ? "col-span-6 @[540px]:col-span-3 @[900px]:col-span-1" : "col-span-6 @[540px]:col-span-6 @[900px]:col-span-2")}>
              <CustomSelect
                label="Class"
                options={classSelectOptions}
                value={selectedClassId}
                onChange={onClassChange}
                size="md"
              />
            </div>

            {hasSectionsForClass && (
              <div className={hasDepartments ? "col-span-6 @[540px]:col-span-2 @[900px]:col-span-1" : "col-span-6 @[540px]:col-span-3 @[900px]:col-span-1"}>
                <CustomSelect
                  label="Section"
                  options={sectionSelectOptions}
                  value={selectedSectionId}
                  onChange={onSectionChange}
                  size="md"
                />
              </div>
            )}

            {/* Routine Period Fast Selector Bar (Reusable Component) */}
            <ClassPeriodSwitcherBar
              allPeriodFilterOptions={allPeriodFilterOptions}
              activePeriodId={activePeriodId}
              onPeriodChange={onPeriodChange}
              getSlotCount={getSlotLessonsCount}
              getPeriodSubtitle={getPeriodTimeForSlot}
            />
          </>
        }
        data={filteredLessons}
        columns={lessonColumns}
        renderCard={renderLessonCard}
        onRowClick={(row) => onEditLesson(row)}
        totalCount={filteredLessons.length}
        emptyIcon={BookOpenIcon}
        emptyTitle="No lesson deliveries found"
        emptySubMessage="Assign a daily Sabaq or select another date/period to inspect records."
      />

      {/* Carry-Forward Modal */}
      <CarryForwardLessonModal
        isOpen={carryForwardModal.isOpen}
        onClose={handleCloseCarryForwardModal}
        mode={carryForwardModal.mode}
        sourceLesson={carryForwardModal.sourceLesson}
        currentDate={selectedDate}
        selectedClassId={selectedClassId}
        selectedClassObj={selectedClassObj}
        classes={classes}
        onSuccess={handleCarryForwardSuccess}
      />

      {/* Delete Impact Confirmation Modal */}
      {deletingLesson && (
        <DeleteImpactModal
          isOpen={Boolean(deletingLesson)}
          onClose={() => setDeletingLesson(null)}
          onConfirm={handleConfirmDelete}
          title="Delete Daily Lesson Plan"
          subtitle={`You are about to delete lesson assignment "${deletingLesson?.lesson_title}".`}
          entityName={deletingLesson?.lesson_title || ''}
          entityType="Daily Lesson Plan"
          requireAck={false}
          requireNameMatch={false}
          isDeleting={isDeleting}
          confirmButtonText="Delete Lesson"
          warningMessage="Deleting this lesson assignment will remove it from the classroom schedule and disconnect associated student evaluation records."
        />
      )}
    </div>
  );
}
