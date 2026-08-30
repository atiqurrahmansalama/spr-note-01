import React from 'react';
import UniversalManagementView from '../../../../components/common/UniversalManagementView';
import CustomSelect from '../../../../components/ui/CustomSelect';
import ReusableCalendar from '../../../../components/common/ReusableCalendar';
import ActionMenu from '../../../../components/ui/ActionMenu';
import ClassPeriodSwitcherBar from '../ClassPeriodSwitcherBar';
import {
  renderAssessmentCurriculumLessonCell,
  renderMistakesStucksCell,
  renderAssessmentScoresCell,
  formatRangeText,
} from '../dailyClassroomTableHelpers';
import {
  ChecklistIcon,
  EditIcon,
} from '../../../../components/ui/Icons';

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
}) {
  // Clean Columns for Daily Student Assessment (Unified 3-line Curriculum & Lesson column)
  const assessmentColumns = [
    {
      header: 'Student Name',
      headerClassName: 'w-[180px]',
      render: (row) => (
        <div className="cursor-pointer group text-left">
          <span className="font-bold theme-text-primary group-hover:theme-text-accent transition-colors block">
            {row.student_name}
          </span>
          <span className="text-xs theme-text-secondary">{row.student_uniq_id}</span>
        </div>
      ),
    },
    {
      header: 'Curriculum & Lesson',
      headerClassName: 'w-[250px]',
      render: renderAssessmentCurriculumLessonCell,
    },
    {
      header: 'Mistakes & Stucks',
      align: 'center',
      headerClassName: 'w-[130px] text-center',
      render: renderMistakesStucksCell,
    },
    {
      header: 'Scores',
      align: 'center',
      headerClassName: 'w-[160px] text-center',
      render: renderAssessmentScoresCell,
    },
    {
      header: 'Teacher Remarks',
      headerClassName: 'min-w-[170px]',
      render: (row) => (
        <span className="text-xs theme-text-secondary line-clamp-1 text-left">
          {row.teacher_remarks !== '—' && row.teacher_remarks ? row.teacher_remarks : <span className="opacity-40">—</span>}
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
            label: row.is_evaluated ? 'Edit Assessment' : 'Evaluate Student',
            icon: EditIcon,
            onClick: () => onOpenAssessmentDrawer?.(row.student),
          },
        ];
        return <ActionMenu items={actionItems} align="right" />;
      },
    },
  ];

  // Cards for Assessment
  const renderAssessmentCard = (row) => (
    <div
      key={row.id}
      onClick={() => onOpenAssessmentDrawer?.(row.student)}
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
              getSlotCount={getSlotLessonsCount || getSlotAssessmentCount}
              getPeriodSubtitle={getPeriodTimeForSlot}
            />
          </>
        }
        data={assessmentRows}
        columns={assessmentColumns}
        renderCard={renderAssessmentCard}
        totalCount={assessmentRows.length}
        emptyIcon={ChecklistIcon}
        emptyTitle="No students found"
        emptySubMessage="Select a class and section to evaluate student daily learning and performance."
      />
    </div>
  );
}
