import React, { useState } from 'react';
import UniversalManagementView from '../../../../components/common/UniversalManagementView';
import CustomSelect from '../../../../components/ui/CustomSelect';
import ReusableCalendar from '../../../../components/common/ReusableCalendar';
import ActionMenu from '../../../../components/ui/ActionMenu';
import ClassPeriodSwitcherBar from '../ClassPeriodSwitcherBar';
import DeleteImpactModal from '../../../../components/common/DeleteImpactModal';
import {
  renderAssessmentCurriculumLessonCell,
  renderMistakesStucksCell,
  renderAssessmentScoresCell,
  formatRangeText,
} from '../dailyClassroomTableHelpers';
import {
  ChecklistIcon,
  EditIcon,
  DeleteIcon,
} from '../../../../components/ui/Icons';
import { learningStore } from '../../../../utils/stores/learningStore';
import { deleteLessonEvaluation as deleteEvaluationAPI } from '../../../../api/learning';
import { useToast } from '../../../../context/ToastContext';

export default function StudentAssessmentManagementView({
  assessmentRows = [],
  assessmentMetrics = [],
  assessmentSearch = '',
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
  activePeriodId = 'ALL',
  onPeriodChange,
  allPeriodFilterOptions = [],
  getSlotLessonsCount,
  getSlotAssessmentCount,
  getPeriodTimeForSlot,
  onOpenAssessmentDrawer,
  tenantId,
  loadData,
}) {
  const { showToast } = useToast();
  const [deletingEvaluation, setDeletingEvaluation] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDeleteEvaluation = async () => {
    if (!deletingEvaluation) return;
    setIsDeleting(true);
    try {
      if (deletingEvaluation.id) {
        learningStore.deleteEvaluation(tenantId, deletingEvaluation.id);
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(deletingEvaluation.id));
        if (isUUID) {
          try {
            await deleteEvaluationAPI(deletingEvaluation.id);
          } catch (apiErr) {
            console.warn('Backend evaluation delete error:', apiErr);
          }
        }
      }
      showToast('Assessment evaluation record deleted.', 'success');
      setDeletingEvaluation(null);
      loadData?.();
    } catch (err) {
      showToast('Failed to delete assessment.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Clean Columns for Daily Student Assessment (Unified 3-line Curriculum & Lesson column)
  const assessmentColumns = [
    {
      header: 'Student Name',
      headerClassName: 'w-[20%] min-w-[170px]',
      cellClassName: 'w-[20%] min-w-[170px]',
      render: (row) => (
        <div className="cursor-pointer group text-left min-w-0">
          <span className="font-bold theme-text-primary group-hover:theme-text-accent transition-colors block truncate">
            {row.student_name}
          </span>
          <span className="text-xs theme-text-secondary block truncate">{row.student_uniq_id}</span>
        </div>
      ),
    },
    {
      header: 'Book & Lesson',
      headerClassName: 'w-[28%] min-w-[220px]',
      cellClassName: 'w-[28%] min-w-[220px]',
      render: renderAssessmentCurriculumLessonCell,
    },
    {
      header: 'Mistake & Stuck',
      align: 'center',
      headerClassName: 'w-[130px] min-w-[130px] text-center',
      cellClassName: 'w-[130px] min-w-[130px] text-center',
      render: renderMistakesStucksCell,
    },
    {
      header: 'Lesson & Homework',
      align: 'center',
      headerClassName: 'w-[150px] min-w-[150px] text-center',
      cellClassName: 'w-[150px] min-w-[150px] text-center',
      render: renderAssessmentScoresCell,
    },
    {
      header: 'Teacher Remarks',
      headerClassName: 'min-w-[160px]',
      cellClassName: 'min-w-[160px]',
      render: (row) => (
        <span className="text-xs theme-text-secondary line-clamp-2 text-left block">
          {row.teacher_remarks !== '—' && row.teacher_remarks ? row.teacher_remarks : <span className="opacity-40">—</span>}
        </span>
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
            label: row.is_evaluated ? 'Edit Assessment' : 'Evaluate Student',
            icon: EditIcon,
            onClick: () => onOpenAssessmentDrawer?.(row.student, row),
          },
        ];

        if (row.is_evaluated) {
          actionItems.push({
            label: 'Delete Assessment',
            icon: DeleteIcon,
            variant: 'danger',
            onClick: () => setDeletingEvaluation(row),
          });
        }

        return <ActionMenu items={actionItems} align="right" />;
      },
    },
  ];

  // Cards for Assessment
  const renderAssessmentCard = (row) => (
    <div
      key={row.id}
      onClick={() => onOpenAssessmentDrawer?.(row.student, row)}
      className="p-4 rounded-2xl border theme-border theme-bg-surface shadow-xs hover:theme-bg-sub/20 transition-all flex flex-col justify-between space-y-3 cursor-pointer group text-left"
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold theme-text-primary group-hover:theme-text-accent transition-colors">
              {row.student_name}
            </h4>
            <span className="text-xs theme-text-secondary">{row.student_uniq_id}</span>
          </div>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border theme-border ${
            row.is_evaluated ? 'theme-text-accent' : 'theme-text-secondary'
          }`}>
            {row.evaluation_status.replace('_', ' ')}
          </span>
        </div>

        {(row.curriculum_book_name || row.lesson_title || row.lesson_covered) && (
          <div className="mt-2.5 p-2.5 rounded-xl theme-bg-sub/60 border theme-border text-xs space-y-1">
            {row.curriculum_book_name && (
              <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-md theme-bg-accent/10 theme-text-accent inline-block">
                {row.curriculum_book_name}
              </span>
            )}
            <span className="font-bold theme-text-primary block text-xs">
              {row.lesson_title || row.lesson_covered || 'Daily Sabaq'}
            </span>
            {formatRangeText(row.start_unit, row.end_unit) && (
              <span className="text-xs font-bold theme-text-accent block">
                {formatRangeText(row.start_unit, row.end_unit)}
              </span>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-center">
          <div className="p-2 rounded-xl theme-bg-sub/50 border theme-border">
            <span className="text-[10px] theme-text-secondary block">Mistakes</span>
            <span className="text-xs font-bold theme-text-primary">{row.is_evaluated ? row.total_mistakes : '—'}</span>
          </div>
          <div className="p-2 rounded-xl theme-bg-sub/50 border theme-border">
            <span className="text-[10px] theme-text-secondary block">Stucks</span>
            <span className="text-xs font-bold theme-text-primary">{row.is_evaluated ? row.total_stucks : '—'}</span>
          </div>
          <div className="p-2 rounded-xl theme-bg-sub/50 border theme-border">
            <span className="text-[10px] theme-text-secondary block">Lesson</span>
            <span className="text-xs font-bold theme-accent">
              {row.is_evaluated ? `${row.recitation_score ?? row.score ?? 0}/10` : '—'}
            </span>
          </div>
          <div className="p-2 rounded-xl theme-bg-sub/50 border theme-border">
            <span className="text-[10px] theme-text-secondary block">Homework</span>
            <span className="text-xs font-bold theme-text-primary">
              {row.is_evaluated ? `${row.homework_score ?? row.score ?? 0}/10` : '—'}
            </span>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t theme-border flex items-center justify-between text-xs theme-text-secondary">
        <span className="truncate max-w-[200px]">{row.teacher_remarks !== '—' ? row.teacher_remarks : 'No remarks yet'}</span>
        <span className="font-semibold theme-text-accent shrink-0">
          {row.is_evaluated ? 'Edit' : 'Evaluate'} →
        </span>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in space-y-4">
      <UniversalManagementView
        hideHeader={true}
        isEmbedded={true}
        storageKey="spr_daily_assessment_view"
        defaultViewMode="table"
        stackedSwitcher={true}
        metrics={assessmentMetrics}
        searchLabel="Search Students"
        searchQuery={assessmentSearch}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search student name, ID, roll number..."
        filterGridClassName="grid-cols-6 gap-2.5"
        searchSpanClassName="col-span-6 @[540px]:col-span-3 @[900px]:col-span-2"
        filters={
          <>
            <div className={hasDepartments && hasSectionsForClass ? "col-span-6 @[540px]:col-span-3 @[900px]:col-span-1" : "col-span-6 @[540px]:col-span-3 @[900px]:col-span-2"}>
              <ReusableCalendar
                label="Evaluation Date"
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
                  onChange={(val) => {
                    onDepartmentChange(val);
                    onSectionChange('ALL');
                  }}
                  size="md"
                />
              </div>
            )}

            <div className={hasDepartments && hasSectionsForClass ? "col-span-6 @[540px]:col-span-2 @[900px]:col-span-1" : (hasDepartments || hasSectionsForClass ? "col-span-6 @[540px]:col-span-3 @[900px]:col-span-1" : "col-span-6 @[540px]:col-span-6 @[900px]:col-span-2")}>
              <CustomSelect
                label="Class"
                options={classSelectOptions}
                value={selectedClassId}
                onChange={(val) => {
                  onClassChange(val);
                  onSectionChange('ALL');
                }}
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
              getSlotCount={getSlotAssessmentCount || getSlotLessonsCount}
              getPeriodSubtitle={getPeriodTimeForSlot}
            />
          </>
        }
        data={assessmentRows}
        columns={assessmentColumns}
        renderCard={renderAssessmentCard}
        onRowClick={(row) => onOpenAssessmentDrawer?.(row.student || row.id)}
        totalCount={assessmentRows.length}
        emptyIcon={ChecklistIcon}
        emptyTitle="No students found"
        emptySubMessage="Select a class and section to evaluate student daily learning and performance."
      />

      {/* Delete Impact Confirmation Modal */}
      {deletingEvaluation && (
        <DeleteImpactModal
          isOpen={Boolean(deletingEvaluation)}
          onClose={() => setDeletingEvaluation(null)}
          onConfirm={handleConfirmDeleteEvaluation}
          title="Delete Assessment Evaluation"
          subtitle={`You are about to delete the evaluation record for ${deletingEvaluation?.student_name}.`}
          entityName={deletingEvaluation?.student_name || 'Student Evaluation'}
          entityType="Assessment Record"
          requireAck={false}
          requireNameMatch={false}
          isDeleting={isDeleting}
          confirmButtonText="Delete Evaluation"
          warningMessage="Deleting this student assessment will remove the scores, mistakes, and recitation remarks from their academic diary."
        />
      )}
    </div>
  );
}
