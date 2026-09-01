import React, { useState, useMemo } from 'react';
import { PageContainer } from '../../../components/layout';
import PageHeader from '../../../components/ui/PageHeader';
import MetricsGrid from '../../../components/ui/MetricsGrid';
import CustomButton from '../../../components/ui/CustomButton';
import CustomSelect from '../../../components/ui/CustomSelect';
import CustomInput from '../../../components/ui/CustomInput';
import ActionMenu from '../../../components/ui/ActionMenu';
import ExamFormDrawer from './ExamFormDrawer';
import ExamSubjectConfigDrawer from './ExamSubjectConfigDrawer';
import {
  CalendarIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  BookOpenIcon,
  CheckIcon,
  LockClosedIcon,
  BuildingOfficeIcon,
  ClockIcon,
  SearchIcon,
  ChartBarIcon,
  AcademicCapIcon,
  ChevronIcon,
  SparklesIcon,
  ShieldCheckIcon,
} from '../../../components/ui/Icons';
import { useToast } from '../../../context/ToastContext';
import { useRightSidebar, useDrawerRegistration } from '../../../context/RightSidebarContext';
import { examStore } from '../../../utils/stores/examStore';
import useExamData from '../hooks/useExamData';

/**
 * ExamSchedulesView
 * Standard project container & header compliant management view for examination schedules,
 * subject routines, and multi-tier lifecycle statuses.
 */
export default function ExamSchedulesView({
  isEmbedded = false,
  hideHeader = false,
  onNavigateToMatrix,
  onNavigateToMarkEntry,
  onNavigateToTabulation,
}) {
  const { showToast } = useToast();
  const { openDrawer, closeDrawer } = useRightSidebar();
  const {
    tenantId,
    exams,
    gradingSystems,
    gradingSystemOptions,
    examSubjects,
    branchOptions,
    academicYears,
    academicYearOptions,
    departmentOptions,
    classOptions,
    sectionOptions,
    curriculumBooks,
    teachers,
    staff,
    refreshExamData,
  } = useExamData();

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYearFilter, setSelectedYearFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  
  // Expanded Routine Cards State (Map of examId -> boolean)
  const [expandedExams, setExpandedExams] = useState({});

  // ── Global Drawer Registrations ───────────────────────────────────────────────

  // 1. Examination Session Drawer
  useDrawerRegistration(
    'exam_session',
    (params) => {
      const mode = params.get('mode') || 'add';
      const examId = params.get('id');
      const foundExam = examId ? exams.find((e) => String(e.id) === String(examId)) : null;

      return {
        title: mode === 'edit' ? 'Edit Examination Session' : 'Create Examination Session',
        subtitle: mode === 'edit' ? `Update details for ${foundExam?.name || 'Examination'}` : 'Configure institutional scope, grading scale, and CA weightage',
        category: 'Examination & Results',
        size: 'lg',
        width: 'lg',
        content: (
          <ExamFormDrawer
            key={`exam-session-drawer-${mode}-${examId || 'new'}`}
            exam={foundExam}
            tenantId={tenantId}
            academicYears={academicYears}
            academicYearOptions={academicYearOptions}
            departmentOptions={departmentOptions}
            gradingSystemOptions={gradingSystemOptions}
            classOptions={classOptions}
            onSaveSuccess={() => {
              refreshExamData();
              closeDrawer();
            }}
            onCancel={closeDrawer}
          />
        ),
      };
    },
    [exams, tenantId, academicYears, academicYearOptions, departmentOptions, gradingSystemOptions, classOptions, refreshExamData, closeDrawer]
  );

  // 2. Exam Subject Routine Drawer
  useDrawerRegistration(
    'exam_subject',
    (params) => {
      const mode = params.get('mode') || 'add';
      const examId = params.get('examId');
      const subjectId = params.get('id');
      const foundSubject = subjectId ? examSubjects.find((s) => String(s.id) === String(subjectId)) : null;
      const foundExam = examId ? exams.find((e) => String(e.id) === String(examId)) : null;

      return {
        title: mode === 'edit' ? 'Edit Subject Schedule' : 'Add Subject to Exam Routine',
        subtitle: mode === 'edit' ? `Update routine for ${foundSubject?.subjectName || 'Subject'}` : 'Assign exam date, time slot, full/pass marks, and examiner',
        category: 'Examination & Results',
        size: 'lg',
        width: 'lg',
        content: (
          <ExamSubjectConfigDrawer
            key={`exam-sub-drawer-${mode}-${subjectId || 'new'}-${examId}`}
            subjectConfig={foundSubject}
            exam={foundExam}
            examId={examId}
            tenantId={tenantId}
            departmentOptions={departmentOptions}
            classOptions={classOptions}
            sectionOptions={sectionOptions}
            curriculumBooks={curriculumBooks}
            teachers={teachers}
            staff={staff}
            onSaveSuccess={() => {
              refreshExamData();
              closeDrawer();
            }}
            onCancel={closeDrawer}
          />
        ),
      };
    },
    [exams, examSubjects, tenantId, departmentOptions, classOptions, sectionOptions, curriculumBooks, teachers, staff, refreshExamData, closeDrawer]
  );

  // Status Filter Options
  const statusOptions = [
    { value: 'ALL', label: 'All Statuses' },
    { value: 'DRAFT', label: 'Draft Setup' },
    { value: 'MARK_ENTRY', label: 'Mark Entry Open' },
    { value: 'FIRST_PUBLISHED', label: '1st Published (Review Window)' },
    { value: 'UNDER_REVIEW', label: 'Under Review' },
    { value: 'FINAL_PUBLISHED', label: 'Final Published & Certified' },
  ];

  // Filtered Examinations
  const filteredExams = useMemo(() => {
    return exams.filter((e) => {
      if (selectedYearFilter && String(e.academicYearId) !== String(selectedYearFilter)) return false;
      if (selectedStatusFilter && selectedStatusFilter !== 'ALL' && e.status !== selectedStatusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = e.name?.toLowerCase().includes(q);
        const matchCode = e.code?.toLowerCase().includes(q);
        const matchYear = e.academicYearName?.toLowerCase().includes(q);
        const matchBranch = e.branchName?.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchYear && !matchBranch) return false;
      }
      return true;
    });
  }, [exams, selectedYearFilter, selectedStatusFilter, searchQuery]);

  // Overall KPI Metrics for MetricsGrid
  const metricCards = useMemo(() => {
    const total = exams.length;
    const markEntryActive = exams.filter((e) => e.status === 'MARK_ENTRY').length;
    const published = exams.filter((e) => e.status === 'FIRST_PUBLISHED' || e.status === 'FINAL_PUBLISHED').length;
    const totalSubjects = examSubjects.length;

    return [
      {
        label: 'Total Exam Sessions',
        value: total,
        icon: CalendarIcon,
        color: 'accent',
        subLabel: 'Academic terms',
      },
      {
        label: 'Mark Entry Open',
        value: markEntryActive,
        icon: EditIcon,
        color: 'accent',
        subLabel: 'Active entry sessions',
      },
      {
        label: 'Results Published',
        value: published,
        icon: ShieldCheckIcon,
        color: 'accent',
        subLabel: 'Official & certified',
      },
      {
        label: 'Scheduled Subjects',
        value: totalSubjects,
        icon: BookOpenIcon,
        color: 'accent',
        subLabel: 'Exam routines',
      },
    ];
  }, [exams, examSubjects]);

  // Toggle Subject Routines Accordion
  const toggleExpand = (examId) => {
    setExpandedExams((prev) => ({
      ...prev,
      [examId]: !prev[examId],
    }));
  };

  const handleOpenNewExam = () => {
    openDrawer('exam_session', { mode: 'add' });
  };

  const handleEditExam = (exam) => {
    openDrawer('exam_session', { mode: 'edit', id: exam.id });
  };

  const handleDeleteExam = (examId) => {
    if (window.confirm('Are you sure you want to delete this examination? All scheduled subjects and recorded marks will be permanently removed.')) {
      examStore.deleteExam(tenantId, examId);
      refreshExamData();
      showToast('Examination session deleted.', 'success');
    }
  };

  const handleStatusChange = (examId, newStatus) => {
    examStore.updateExamStatus(tenantId, examId, newStatus);
    refreshExamData();
    showToast(`Exam status updated to ${newStatus.replace(/_/g, ' ')}.`, 'success');
  };

  const handleOpenSubjectDrawer = (examId, subject = null) => {
    if (subject) {
      openDrawer('exam_subject', { mode: 'edit', examId, id: subject.id });
    } else {
      openDrawer('exam_subject', { mode: 'add', examId });
    }
  };

  const handleDeleteSubject = (subjectId) => {
    if (window.confirm('Remove this subject routine schedule from the examination?')) {
      examStore.deleteExamSubject(tenantId, subjectId);
      refreshExamData();
      showToast('Subject schedule removed.', 'success');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold theme-bg-sub theme-text-secondary border theme-border">
            Draft Setup
          </span>
        );
      case 'MARK_ENTRY':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/30 animate-pulse">
            Mark Entry Open
          </span>
        );
      case 'FIRST_PUBLISHED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold theme-bg-surface theme-text-primary border theme-border">
            1st Published (Review Window)
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold theme-bg-sub theme-text-primary border theme-border">
            Under Review / Recheck
          </span>
        );
      case 'FINAL_PUBLISHED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold theme-bg-accent text-white border border-[var(--accent-main)]">
            Final Published & Certified
          </span>
        );
      case 'LOCKED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold theme-bg-sub theme-text-secondary border theme-border opacity-70">
            Archived / Locked
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold theme-bg-sub theme-text-secondary border theme-border">
            {status}
          </span>
        );
    }
  };

  return (
    <PageContainer isEmbedded={isEmbedded} maxWidth="7xl">
      {/* 1. Optional Standard PageHeader (When viewed standalone) */}
      {!hideHeader && (
        <PageHeader
          title="Exam Schedules & Sessions"
          subtitle="Configure examination terms, link participating classes, define subject full marks, and manage result lifecycles."
          icon={CalendarIcon}
          actions={
            <CustomButton
              variant="primary"
              size="sm"
              icon={PlusIcon}
              onClick={handleOpenNewExam}
            >
              Create Examination
            </CustomButton>
          }
        />
      )}

      {/* 2. Top Metric KPI Grid using project MetricsGrid component */}
      <div className="w-full">
        <MetricsGrid items={metricCards} />
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-6">
          <CustomInput
            placeholder="Search by exam name, code, session or branch..."
            prefix={SearchIcon}
            value={searchQuery}
            onChange={setSearchQuery}
          />
        </div>

        <div className="sm:col-span-3">
          <CustomSelect
            options={[{ value: '', label: 'All Academic Years' }, ...academicYearOptions]}
            value={selectedYearFilter}
            onChange={setSelectedYearFilter}
          />
        </div>

        <div className="sm:col-span-3">
          <CustomSelect
            options={statusOptions}
            value={selectedStatusFilter}
            onChange={setSelectedStatusFilter}
          />
        </div>
      </div>

      {/* 4. Examination Cards List */}
      {filteredExams.length === 0 ? (
        <div className="p-16 text-center border-2 border-dashed theme-border rounded-3xl theme-bg-surface/50 space-y-4">
          <div className="w-14 h-14 rounded-full theme-bg-sub flex items-center justify-center mx-auto text-slate-400">
            <CalendarIcon className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold theme-text-primary">No Examination Sessions Found</h3>
            <p className="text-xs theme-text-secondary">
              {searchQuery || selectedYearFilter || selectedStatusFilter !== 'ALL'
                ? 'No examination sessions match your active filters. Try clearing or changing filters.'
                : 'Create your first term examination session to configure subjects and start recording marks.'}
            </p>
          </div>
          <div>
            <CustomButton variant="primary" size="sm" icon={PlusIcon} onClick={handleOpenNewExam}>
              Create First Examination
            </CustomButton>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredExams.map((exam) => {
            const currentSubjects = examSubjects.filter((s) => String(s.examId) === String(exam.id));
            const grading = gradingSystems.find((g) => g.id === exam.gradingSystemId);
            const isExpanded = expandedExams[exam.id] ?? true;

            return (
              <div
                key={exam.id}
                className="rounded-2xl border theme-border theme-bg-surface shadow-xs transition-all hover:border-[var(--accent-main)]/40 overflow-hidden"
              >
                {/* Exam Header Row */}
                <div className="p-4 sm:p-5 border-b theme-border space-y-3.5 bg-slate-50/30 dark:bg-slate-900/20">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl theme-bg-accent-soft border border-[var(--accent-main)]/20 theme-accent flex items-center justify-center font-bold shrink-0 mt-0.5">
                        <AcademicCapIcon className="w-5 h-5" />
                      </div>
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base sm:text-lg font-bold theme-text-primary tracking-tight truncate">
                            {exam.name}
                          </h2>
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold theme-bg-sub theme-text-secondary border theme-border">
                            {exam.code}
                          </span>
                          {getStatusBadge(exam.status)}
                        </div>

                        <div className="flex items-center gap-2.5 text-xs theme-text-secondary flex-wrap">
                          <span className="inline-flex items-center gap-1 font-medium">
                            <AcademicCapIcon className="w-3.5 h-3.5 text-slate-400" />
                            {exam.departmentName || 'All Departments'}
                          </span>
                          <span>•</span>
                          <span className="font-semibold theme-text-primary">{exam.academicYearName}</span>
                          <span>•</span>
                          <span>{exam.semesterName}</span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 font-mono">
                            <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                            {exam.startDate} — {exam.endDate}
                          </span>
                          {exam.scheduleDays && exam.scheduleDays.length > 0 && (
                            <>
                              <span>•</span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20">
                                {exam.scheduleDays.filter((d) => d.type === 'EXAM_DAY').length} Exam Days
                              </span>
                              {exam.scheduleDays.some((d) => d.type === 'PREPARATION_GAP') && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold theme-bg-surface theme-text-primary border theme-border">
                                  {exam.scheduleDays.filter((d) => d.type === 'PREPARATION_GAP').length} Study Gaps
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions Toolbar — Three-Dots Reusable ActionMenu */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <ActionMenu
                        actions={[
                          {
                            label: 'Edit Examination',
                            icon: EditIcon,
                            onClick: () => handleEditExam(exam),
                          },
                          {
                            label: 'Subject Routine Matrix (Table)',
                            icon: BookOpenIcon,
                            onClick: () => onNavigateToMatrix ? onNavigateToMatrix(exam.id) : handleOpenSubjectDrawer(exam.id),
                          },
                          {
                            label: 'Schedule Subject (Drawer)',
                            icon: PlusIcon,
                            onClick: () => handleOpenSubjectDrawer(exam.id),
                          },
                          ...(onNavigateToMarkEntry
                            ? [
                                {
                                  label: 'Mark Entry',
                                  icon: EditIcon,
                                  onClick: () => onNavigateToMarkEntry(exam.id),
                                },
                              ]
                            : []),
                          ...(onNavigateToTabulation
                            ? [
                                {
                                  label: 'Tabulation Ledger',
                                  icon: ChartBarIcon,
                                  onClick: () => onNavigateToTabulation(exam.id),
                                },
                              ]
                            : []),
                          { divider: true },
                          {
                            label: 'Delete Examination',
                            icon: TrashIcon,
                            danger: true,
                            onClick: () => handleDeleteExam(exam.id),
                          },
                        ]}
                        align="right"
                        ariaLabel={`Actions for ${exam.name}`}
                      />
                    </div>
                  </div>

                  {/* Summary Badges Row */}
                  <div className="flex items-center gap-2 text-xs flex-wrap pt-0.5">
                    <div className="px-2.5 py-1 rounded-lg theme-bg-surface border theme-border text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1.5 shadow-2xs">
                      <span className="text-slate-400 text-[11px]">Grading Policy:</span>
                      <strong className="theme-text-primary font-bold text-xs">{grading?.name || 'Default Scale'}</strong>
                    </div>

                    {exam.caWeightage?.enabled && (
                      <div className="px-2.5 py-1 rounded-lg theme-bg-accent-soft border border-[var(--accent-main)]/20 theme-accent font-medium flex items-center gap-1.5 shadow-2xs text-[11px]">
                        <SparklesIcon className="w-3.5 h-3.5" />
                        <span>CA:</span>
                        <strong className="font-bold">
                          Daily {exam.caWeightage.dailyClassroomPct}% + Attendance {exam.caWeightage.attendancePct}% + Exam {exam.caWeightage.examPct}%
                        </strong>
                      </div>
                    )}

                    <div className="px-2.5 py-1 rounded-lg theme-bg-surface border theme-border text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1.5 shadow-2xs text-[11px]">
                      <span className="text-slate-400">Scheduled Subjects:</span>
                      <strong className="theme-text-primary font-bold">{currentSubjects.length}</strong>
                    </div>

                    {exam.rankingConfig && (
                      <div className="px-2.5 py-1 rounded-lg theme-bg-surface border theme-border text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1.5 shadow-2xs text-[11px]">
                        <span className="text-slate-400">Ranking:</span>
                        <strong className="theme-text-primary font-bold">
                          {exam.rankingConfig.scope === 'CLASS_ONLY' ? 'Class Only' : 'Class & Section'}
                        </strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Lifecycle Management Stepper Bar */}
                <div className="px-4 sm:px-5 py-2.5 border-b theme-border theme-bg-sub/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold theme-text-secondary uppercase tracking-wider text-[10px]">
                      Lifecycle Stage:
                    </span>
                    <span className="font-bold theme-text-primary text-xs">
                      {exam.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {exam.status === 'DRAFT' && (
                      <CustomButton
                        size="xs"
                        variant="soft"
                        icon={EditIcon}
                        onClick={() => handleStatusChange(exam.id, 'MARK_ENTRY')}
                      >
                        Open for Mark Entry
                      </CustomButton>
                    )}

                    {exam.status === 'MARK_ENTRY' && (
                      <CustomButton
                        size="xs"
                        variant="primary"
                        icon={CheckIcon}
                        onClick={() => handleStatusChange(exam.id, 'FIRST_PUBLISHED')}
                      >
                        Publish 1st Result (Open Review Window)
                      </CustomButton>
                    )}

                    {exam.status === 'FIRST_PUBLISHED' && (
                      <>
                        <CustomButton
                          size="xs"
                          variant="soft"
                          onClick={() => handleStatusChange(exam.id, 'UNDER_REVIEW')}
                        >
                          Mark as Under Review
                        </CustomButton>
                        <CustomButton
                          size="xs"
                          variant="primary"
                          icon={LockClosedIcon}
                          onClick={() => handleStatusChange(exam.id, 'FINAL_PUBLISHED')}
                        >
                          Publish Final Result & Lock
                        </CustomButton>
                      </>
                    )}

                    {exam.status === 'UNDER_REVIEW' && (
                      <CustomButton
                        size="xs"
                        variant="primary"
                        icon={LockClosedIcon}
                        onClick={() => handleStatusChange(exam.id, 'FINAL_PUBLISHED')}
                      >
                        Publish Final Result & Lock
                      </CustomButton>
                    )}

                    {exam.status === 'FINAL_PUBLISHED' && (
                      <span className="inline-flex items-center gap-1.5 font-bold theme-accent theme-bg-accent-soft px-2.5 py-0.5 rounded-full border border-[var(--accent-main)]/20 text-xs">
                        <LockClosedIcon className="w-3.5 h-3.5" />
                        Final Official Result Certified & Immutable
                      </span>
                    )}
                  </div>
                </div>

                {/* Subject Routine Cards Section */}
                <div className="p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider theme-text-primary">
                      Scheduled Subject Routines & Components ({currentSubjects.length})
                    </span>

                    <button
                      type="button"
                      onClick={() => toggleExpand(exam.id)}
                      className="text-xs font-bold theme-text-secondary hover:theme-text-primary flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
                      <ChevronIcon isOpen={isExpanded} className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {isExpanded && (
                    <>
                      {currentSubjects.length === 0 ? (
                        <div className="p-6 text-center border border-dashed theme-border rounded-xl theme-bg-sub/10 space-y-2">
                          <BookOpenIcon className="w-7 h-7 mx-auto text-slate-400" />
                          <p className="text-xs font-medium theme-text-secondary">
                            No subjects scheduled yet for this examination.
                          </p>
                          <CustomButton
                            variant="sub"
                            size="xs"
                            icon={PlusIcon}
                            onClick={() => handleOpenSubjectDrawer(exam.id)}
                          >
                            Schedule First Subject
                          </CustomButton>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {currentSubjects.map((sub) => (
                            <div
                              key={sub.id}
                              className="p-3.5 rounded-xl border theme-border theme-bg-surface hover:border-[var(--accent-main)]/30 transition-all space-y-2 shadow-2xs flex flex-col justify-between"
                            >
                              <div className="space-y-1">
                                <div className="flex items-start justify-between gap-2">
                                  <span className="font-bold text-xs sm:text-sm theme-text-primary block truncate">
                                    {sub.subjectName}
                                  </span>
                                  <div className="flex items-center shrink-0">
                                    <ActionMenu
                                      buttonClassName="p-1 rounded-lg border-0 shadow-none hover:theme-bg-sub"
                                      actions={[
                                        {
                                          label: 'Edit Subject Routine',
                                          icon: EditIcon,
                                          onClick: () => handleOpenSubjectDrawer(exam.id, sub),
                                        },
                                        {
                                          label: 'Remove Subject Routine',
                                          icon: TrashIcon,
                                          danger: true,
                                          onClick: () => handleDeleteSubject(sub.id),
                                        },
                                      ]}
                                      align="right"
                                      ariaLabel={`Actions for ${sub.subjectName}`}
                                    />
                                  </div>
                                </div>

                                <div className="space-y-1 text-[11px]">
                                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                                    <span>Class:</span>
                                    <strong className="theme-text-primary">
                                      {sub.className} ({sub.sectionName})
                                    </strong>
                                  </div>

                                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                                    <span>Exam Date:</span>
                                    <span className="font-mono theme-text-primary">
                                      {sub.examDate || 'TBD'}
                                    </span>
                                  </div>

                                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                                    <span>Timing:</span>
                                    <span className="font-mono theme-text-primary">
                                      {sub.startTime || '—'} to {sub.endTime || '—'}
                                    </span>
                                  </div>

                                  {sub.teacherName && (
                                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                                      <span>Invigilator:</span>
                                      <span className="theme-text-primary truncate max-w-[130px]">
                                        {sub.teacherName}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Marks & Components Pills */}
                              <div className="pt-2 border-t theme-border flex items-center justify-between text-[11px]">
                                <span className="font-bold theme-text-primary theme-bg-surface px-2 py-0.5 rounded-md border theme-border">
                                  Full: {sub.fullMarks} | Pass: {sub.passMarks}
                                </span>
                                <span className="text-[10px] theme-text-secondary truncate max-w-[110px]" title={sub.components?.map((c) => `${c.name}: ${c.maxMarks}`).join(', ')}>
                                  {sub.components?.map((c) => `${c.name}:${c.maxMarks}`).join(', ')}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
