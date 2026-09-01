import React, { useState } from 'react';
import UniversalManagementView from '../../../../components/common/UniversalManagementView';
import ActionMenu from '../../../../components/ui/ActionMenu';
import DailyClassroomFilterControls from '../DailyClassroomFilterControls';
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
  filterProps = null,
  filteredLessons = [],
  lessonMetrics = [],
  lessonSearch = '',
  onSearchChange,
  getSlotLessonsCount,
  selectedClassObj,
  classes = [],
  tenantId,
  loadData,
  onOpenAddLesson,
  onEditLesson,
  onDuplicateLesson,
  ...restFilterProps
}) {
  const { showToast } = useToast();
  const [deletingLesson, setDeletingLesson] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
            onClick: () => onDuplicateLesson?.(row),
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
        onClick: () => onDuplicateLesson?.(row),
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
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20">
                {row.curriculum_book_name || row.subject_name || 'Academic Course'}
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md theme-bg-sub theme-text-secondary border theme-border inline-flex items-center gap-1">
                <TimerIcon className="w-3 h-3 theme-accent shrink-0" />
                {row.period_name || 'Assigned Slot'}
              </span>
            </div>
            <h4 className="text-sm font-bold theme-text-primary group-hover:theme-accent transition-colors pt-1">
              {row.lesson_title || 'Untitled Sabaq Plan'}
            </h4>
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <ActionMenu items={actionItems} align="right" />
          </div>
        </div>

        <div className="pt-2 border-t theme-border grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider theme-text-secondary block">Page Bounds</span>
            <span className="font-semibold theme-text-primary">{formatRangeText(row.start_unit, row.end_unit)}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider theme-text-secondary block">Instructor</span>
            <span className="font-medium theme-text-primary truncate block">{row.teacher_name || 'Unassigned'}</span>
          </div>
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
          <DailyClassroomFilterControls
            dateLabel="Delivery Date"
            filterProps={filterProps}
            getSlotCount={getSlotLessonsCount || filterProps?.getSlotCount}
            {...restFilterProps}
          />
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
