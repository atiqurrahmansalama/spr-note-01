import React, { useState, useMemo, useEffect } from 'react';
import PageContainer from '../../../components/layout/PageContainer';
import useExamData from '../hooks/useExamData';
import useMarkEntryGrid from '../hooks/useMarkEntryGrid';
import MarkEntryHeader from './components/MarkEntryHeader';
import MarkEntryFilterBar from './components/MarkEntryFilterBar';
import MarkEntryStatsBar from './components/MarkEntryStatsBar';
import MarkEntryGridTable from './components/MarkEntryGridTable';
import CsvImportModal from './components/CsvImportModal';
import SupervisorUnlockModal from './components/SupervisorUnlockModal';
import MarkEntryPrintModal from './components/MarkEntryPrintModal';
import { examStore } from '@/stores/examStore';
import CustomButton from '../../../components/ui/CustomButton';
import AutoSaveBadge from '../../../components/ui/AutoSaveBadge';
import {
  BookOpenIcon,
  AcademicCapIcon,
  CheckIcon,
  SparklesIcon,
  TrashIcon,
  UserCheckIcon,
  BanIcon,
} from '../../../components/ui/Icons';


/**
 * MarkEntryDeskView
 * Enterprise Teacher Mark Entry Console connected to Exam Schedules & Routine Matrix.
 * 
 * Follows SPR Note Enterprise Engineering Guidelines:
 * - 100% Theme Tokens & Zero Hardcoded Colors
 * - PageContainer Layout & Responsive Density
 * - Continuous Live Auto-Save without manual draft saving friction
 * - High-speed spreadsheet grid with Bounds Validation and Keyboard Shortcuts
 * - Batch Fill Tools, Preset Remarks, and CSV Import/Export
 * - Official Printable Subject Award List
 * - Controller Submission Lock & Supervisor Override
 */
export default function MarkEntryDeskView({
  initialExamId = null,
  initialSubjectId = null,
  isEmbedded = false,
  onNavigateToTabulation = null,
  onNavigateToTranscripts = null,
  showAutoSave = true,
  showAutoSaveStatus = true,
  showAutoSaveTimestamp = true,
}) {
  const shouldShowAutoSave = Boolean(showAutoSave !== false && showAutoSaveStatus !== false);
  const {
    tenantId,
    exams,
    examSubjects,
    students,
    classOptions,
    departmentOptions,
    sectionOptions,
    gradingSystems,
    refreshExamData,
  } = useExamData();

  // URL Search Params Hydration
  const urlParams = useMemo(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search);
    }
    return new URLSearchParams();
  }, []);

  const urlExamId = urlParams.get('examId') || urlParams.get('exam');
  const urlSubjectId = urlParams.get('subjectId') || urlParams.get('subject');
  const urlDepartmentId = urlParams.get('departmentId') || urlParams.get('dept');
  const urlClassId = urlParams.get('classId') || urlParams.get('class');
  const urlSectionId = urlParams.get('sectionId') || urlParams.get('section');
  const urlPrint = urlParams.get('print');

  // Primary Selection States
  const [selectedExamId, setSelectedExamId] = useState(
    initialExamId || urlExamId || (exams[0]?.id ? String(exams[0].id) : '')
  );
  const [filterDepartmentId, setFilterDepartmentId] = useState(urlDepartmentId || 'ALL');
  const [filterClassId, setFilterClassId] = useState(urlClassId || '');
  const [filterSectionId, setFilterSectionId] = useState(urlSectionId || 'ALL');
  const [selectedSubjectId, setSelectedSubjectId] = useState(initialSubjectId || urlSubjectId || '');

  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isSupervisorModalOpen, setIsSupervisorModalOpen] = useState(false);
  const [isPrintStudioOpen, setIsPrintStudioOpen] = useState(Boolean(urlPrint));

  // Sync initial props
  useEffect(() => {
    if (initialExamId) {
      setSelectedExamId(String(initialExamId));
    }
  }, [initialExamId]);

  useEffect(() => {
    if (initialSubjectId) {
      setSelectedSubjectId(String(initialSubjectId));
    }
  }, [initialSubjectId]);

  // Selected Exam Session
  const selectedExam = useMemo(() => {
    return exams.find((e) => String(e.id) === String(selectedExamId)) || null;
  }, [exams, selectedExamId]);

  // Exam Options
  const examOptions = useMemo(() => {
    return exams.map((e) => ({
      value: String(e.id),
      label: `${e.name} (${e.academicYearName || 'Session'})`,
      exam: e,
    }));
  }, [exams]);

  // Filtered Class Options: Narrowed down to selected Exam target classes and Department
  const filteredClassOptions = useMemo(() => {
    let list = classOptions;

    // Filter by Exam target classes if specified
    if (selectedExam && Array.isArray(selectedExam.targetClassIds) && selectedExam.targetClassIds.length > 0) {
      const targetSet = new Set(selectedExam.targetClassIds.map((id) => String(id)));
      const hasMatch = list.some((c) => targetSet.has(String(c.value)));
      if (hasMatch) {
        list = list.filter((c) => targetSet.has(String(c.value)));
      }
    }

    // Filter by Department Scope
    if (filterDepartmentId && filterDepartmentId !== 'ALL') {
      list = list.filter((c) => {
        if (c.departmentId && String(c.departmentId) === String(filterDepartmentId)) {
          return true;
        }
        return examSubjects.some(
          (s) =>
            String(s.classId) === String(c.value) &&
            (s.departmentId === 'ALL' || String(s.departmentId) === String(filterDepartmentId))
        );
      });
    }

    return [{ value: '', label: 'All Classes' }, ...list];
  }, [classOptions, selectedExam, filterDepartmentId, examSubjects]);

  // Filtered Section Options: Narrowed down to selected Class and Department
  const filteredSectionOptions = useMemo(() => {
    let rawList = sectionOptions.filter((s) => s.value !== 'ALL');

    if (filterClassId) {
      rawList = rawList.filter((s) => {
        if (s.classId && String(s.classId) === String(filterClassId)) return true;
        return examSubjects.some(
          (sub) => String(sub.classId) === String(filterClassId) && String(sub.sectionId) === String(s.value)
        );
      });
    } else if (filterDepartmentId && filterDepartmentId !== 'ALL') {
      const allowedClassIds = new Set(
        filteredClassOptions
          .map((c) => String(c.value))
          .filter((v) => v && v !== '')
      );
      rawList = rawList.filter((s) => s.classId && allowedClassIds.has(String(s.classId)));
    }

    return [{ value: 'ALL', label: 'All Sections (Class Wide)' }, ...rawList];
  }, [sectionOptions, filterClassId, filterDepartmentId, filteredClassOptions, examSubjects]);

  // Cascading Auto-Reset: When Department changes, ensure Class is valid
  useEffect(() => {
    if (filterClassId) {
      const isValidClass = filteredClassOptions.some(
        (c) => c.value && String(c.value) === String(filterClassId)
      );
      if (!isValidClass) {
        setFilterClassId('');
        setFilterSectionId('ALL');
      }
    }
  }, [filterDepartmentId, filteredClassOptions, filterClassId]);

  // Cascading Auto-Reset: When Class changes, ensure Section is valid
  useEffect(() => {
    if (filterSectionId && filterSectionId !== 'ALL') {
      const isValidSection = filteredSectionOptions.some(
        (s) => s.value !== 'ALL' && String(s.value) === String(filterSectionId)
      );
      if (!isValidSection) {
        setFilterSectionId('ALL');
      }
    }
  }, [filterClassId, filteredSectionOptions, filterSectionId]);

  // Filtered Subject Routines for selected Exam & Scope
  const availableSubjects = useMemo(() => {
    if (!selectedExamId) return [];
    let list = examSubjects.filter((s) => String(s.examId) === String(selectedExamId));

    if (filterDepartmentId && filterDepartmentId !== 'ALL') {
      list = list.filter((s) => s.departmentId === 'ALL' || String(s.departmentId) === String(filterDepartmentId));
    }

    if (filterClassId) {
      list = list.filter((s) => String(s.classId) === String(filterClassId));
    }

    if (filterSectionId && filterSectionId !== 'ALL') {
      list = list.filter((s) => s.sectionId === 'ALL' || String(s.sectionId) === String(filterSectionId));
    }

    return list;
  }, [examSubjects, selectedExamId, filterDepartmentId, filterClassId, filterSectionId]);

  // Subject Dropdown Options: Displays cleanly Book and Subject only
  const subjectOptions = useMemo(() => {
    return availableSubjects.map((s) => {
      const book = (s.curriculumBookName || '').trim();
      const subject = (s.subjectName || 'Subject').trim();
      const code = (s.subjectCode || '').trim();

      let label = subject;
      if (book && book.toLowerCase() !== subject.toLowerCase()) {
        label = `${book} — ${subject}`;
      }
      if (code && !label.includes(code)) {
        label = `${label} (${code})`;
      }

      return {
        value: String(s.id),
        label,
        subject: s,
      };
    });
  }, [availableSubjects]);

  // Selected Subject Routine
  const selectedSubject = useMemo(() => {
    if (!selectedSubjectId) {
      return availableSubjects[0] || null;
    }
    return availableSubjects.find((s) => String(s.id) === String(selectedSubjectId)) || availableSubjects[0] || null;
  }, [availableSubjects, selectedSubjectId]);

  // Automatically select first subject when filter changes
  useEffect(() => {
    if (availableSubjects.length > 0) {
      const isCurrentValid = availableSubjects.some((s) => String(s.id) === String(selectedSubjectId));
      if (!isCurrentValid) {
        setSelectedSubjectId(String(availableSubjects[0].id));
      }
    } else {
      setSelectedSubjectId('');
    }
  }, [availableSubjects, selectedSubjectId]);

  // Filter Target Enrolled Students
  const targetStudents = useMemo(() => {
    if (!selectedSubject) return [];
    return students.filter((st) => {
      const rawClass = st.class_id !== undefined ? st.class_id : (st.student_class !== undefined ? st.student_class : (st.classId || st.class));
      const stClassId = typeof rawClass === 'object' ? rawClass?.id : rawClass;
      if (stClassId && selectedSubject.classId && String(stClassId) !== String(selectedSubject.classId)) {
        return false;
      }

      if (selectedSubject.sectionId && selectedSubject.sectionId !== 'ALL') {
        const rawSec = st.section !== undefined ? st.section : (st.section_id || st.sectionId || st.student_section);
        const stSecId = typeof rawSec === 'object' ? rawSec?.id : rawSec;
        if (stSecId && String(stSecId) !== String(selectedSubject.sectionId)) {
          return false;
        }
      }

      return true;
    });
  }, [students, selectedSubject?.id, selectedSubject?.classId, selectedSubject?.sectionId]);

  // Active Grading System
  const activeGradingSystem = useMemo(() => {
    if (!selectedExam) return gradingSystems[0] || null;
    return gradingSystems.find((g) => g.id === selectedExam.gradingSystemId) || gradingSystems[0] || null;
  }, [gradingSystems, selectedExam]);

  // Grid Operations Controller Hook
  const {
    marksGrid,
    validationErrors,
    components,
    fullMarks,
    passMarks,
    isLocked,
    isSupervisorUnlocked,
    saving,
    autoSaveStatus,
    lastSavedTime,
    stats,
    handleCellChange,
    handleToggleAbsent,
    handleRemarksChange,
    handleKeyDown,
    handleSave,
    handleSupervisorUnlock,
    fillFullMarks,
    fillPassingMarks,
    clearAllMarks,
    toggleAllAbsent,
    exportToCsv,
    importFromCsv,
  } = useMarkEntryGrid({
    tenantId,
    examId: selectedExamId,
    examSubjectId: selectedSubject?.id,
    students: targetStudents,
    examSubject: selectedSubject,
    gradingRules: activeGradingSystem?.rules || [],
  });

  const handlePrint = () => {
    setIsPrintStudioOpen(true);
  };

  // Bulk Quick Fill action menu items integrated into the bottom actions bar
  const quickFillActions = useMemo(
    () => [
      {
        label: 'Fill All Full Marks',
        icon: SparklesIcon,
        onClick: fillFullMarks,
      },
      {
        label: 'Fill Passing Marks',
        icon: CheckIcon,
        onClick: fillPassingMarks,
      },
      { divider: true },
      {
        label: 'Mark All Present',
        icon: UserCheckIcon,
        onClick: () => toggleAllAbsent(false),
      },
      {
        label: 'Mark All Absent',
        icon: BanIcon,
        onClick: () => toggleAllAbsent(true),
      },
      { divider: true },
      {
        label: 'Clear All Marks',
        icon: TrashIcon,
        danger: true,
        onClick: () => {
          if (window.confirm('Clear all entered marks for this subject?')) {
            clearAllMarks();
          }
        },
      },
    ],
    [fillFullMarks, fillPassingMarks, toggleAllAbsent, clearAllMarks]
  );

  const content = (
    <div className="space-y-4 text-left w-full">
      {/* ── 1. Desk Header & Action Console ── */}
      <MarkEntryHeader
        selectedExam={selectedExam}
        selectedSubject={selectedSubject}
        isLocked={isLocked}
        isSupervisorUnlocked={isSupervisorUnlocked}
        autoSaveStatus={autoSaveStatus}
        lastSavedTime={lastSavedTime}
        onOpenSupervisorUnlock={() => setIsSupervisorModalOpen(true)}
        onExportCsv={exportToCsv}
        onOpenCsvImport={() => setIsCsvModalOpen(true)}
        onPrintAwardList={handlePrint}
        onNavigateToTabulation={onNavigateToTabulation}
        hasStudents={targetStudents.length > 0}
      />

      {/* ── 2. Academic Filter & Subject Routine Selector ── */}
      <MarkEntryFilterBar
        examOptions={examOptions}
        selectedExamId={selectedExamId}
        setSelectedExamId={setSelectedExamId}
        departmentOptions={departmentOptions}
        filterDepartmentId={filterDepartmentId}
        setFilterDepartmentId={setFilterDepartmentId}
        classOptions={filteredClassOptions}
        filterClassId={filterClassId}
        setFilterClassId={setFilterClassId}
        sectionOptions={filteredSectionOptions}
        filterSectionId={filterSectionId}
        setFilterSectionId={setFilterSectionId}
        subjectOptions={subjectOptions}
        selectedSubjectId={selectedSubjectId}
        setSelectedSubjectId={setSelectedSubjectId}
        selectedSubject={selectedSubject}
        availableSubjects={availableSubjects}
        activeGradingSystem={activeGradingSystem}
      />

      {/* ── 3. Workspace Conditions ── */}
      {!selectedExamId || !selectedSubject ? (
        <div className="p-12 text-center border theme-border rounded-2xl theme-bg-surface/50 shadow-xs">
          <BookOpenIcon className="w-12 h-12 mx-auto theme-accent opacity-60 mb-3" />
          <h3 className="text-base font-bold theme-text-primary">No Scheduled Subject Selected</h3>
          <p className="text-xs theme-text-secondary mt-1 max-w-md mx-auto">
            Please choose an Examination Session and select a scheduled Subject Routine from the filter console above.
          </p>
        </div>
      ) : targetStudents.length === 0 ? (
        <div className="p-12 text-center border theme-border rounded-2xl theme-bg-surface/50 shadow-xs">
          <AcademicCapIcon className="w-12 h-12 mx-auto theme-accent opacity-60 mb-3" />
          <h3 className="text-base font-bold theme-text-primary">No Enrolled Students Found</h3>
          <p className="text-xs theme-text-secondary mt-1 max-w-md mx-auto">
            No active student records enrolled under Class <strong>{selectedSubject.className}</strong>.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* ── 4. Real-time Live Stats Ribbon ── */}
          <MarkEntryStatsBar
            stats={stats}
            fullMarks={fullMarks}
            gradingRules={activeGradingSystem?.rules || []}
          />

          {/* ── 5. Spreadsheet Grid Entry Table ── */}
          <MarkEntryGridTable
            title={selectedSubject?.subjectName ? `${selectedSubject.subjectName} Marksheet` : 'Student Marks Evaluation'}
            students={targetStudents}
            components={components}
            fullMarks={fullMarks}
            passMarks={passMarks}
            marksGrid={marksGrid}
            validationErrors={validationErrors}
            isLocked={isLocked}
            gradingRules={activeGradingSystem?.rules || []}
            handleCellChange={handleCellChange}
            handleToggleAbsent={handleToggleAbsent}
            handleRemarksChange={handleRemarksChange}
            handleKeyDown={handleKeyDown}
            quickFillActions={quickFillActions}
          />

          {/* ── 6. Bottom Submission Actions Row with Auto-Save Status ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border theme-border theme-bg-surface shadow-xs print:hidden">
            {/* Left side: Live Evaluation Stats & Auto-Save Badge */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-2 theme-text-secondary">
                <span>Evaluated Students:</span>
                <strong className="theme-text-primary font-mono font-bold text-sm">
                  {stats.evaluatedCount} / {stats.totalStudents}
                </strong>
                <span className="text-[11px] theme-text-secondary">({stats.evaluatedPct}% Completed)</span>
              </div>

              {/* Auto-Save Status Live Badge (Switchable via showAutoSave / showAutoSaveStatus, default: true) */}
              {shouldShowAutoSave && (
                <AutoSaveBadge
                  show={shouldShowAutoSave}
                  status={isLocked ? 'locked' : autoSaveStatus}
                  lastSavedAt={lastSavedTime}
                  showTimestamp={showAutoSaveTimestamp}
                  variant="badge"
                  size="sm"
                />
              )}
            </div>

            {/* Right side: Submission Button */}
            <div className="flex items-center gap-3">
              <CustomButton
                variant="primary"
                size="md"
                disabled={isLocked}
                loading={saving}
                loadingText="Submitting..."
                icon={CheckIcon}
                onClick={() => {
                  if (
                    window.confirm(
                      'Submit marks to Examination Controller? Marksheet will be locked from further editing.'
                    )
                  ) {
                    handleSave('SUBMITTED');
                  }
                }}
              >
                Submit to Exam Controller
              </CustomButton>
            </div>
          </div>
        </div>
      )}

      {/* ── 8. Universal Fullscreen Print Studio ── */}
      <MarkEntryPrintModal
        isOpen={isPrintStudioOpen}
        onClose={() => setIsPrintStudioOpen(false)}
        selectedExam={selectedExam}
        selectedSubject={selectedSubject}
        targetStudents={targetStudents}
        components={components}
        fullMarks={fullMarks}
        passMarks={passMarks}
        marksGrid={marksGrid}
        activeGradingSystem={activeGradingSystem}
        stats={stats}
        onExportCsv={exportToCsv}
      />

      {/* ── 9. CSV Import Modal ── */}
      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onImport={importFromCsv}
        components={components}
      />

      {/* ── 10. Supervisor Unlock Modal ── */}
      <SupervisorUnlockModal
        isOpen={isSupervisorModalOpen}
        onClose={() => setIsSupervisorModalOpen(false)}
        onConfirmUnlock={handleSupervisorUnlock}
        subjectName={selectedSubject?.subjectName}
      />
    </div>
  );

  return (
    <PageContainer maxWidth="7xl" isEmbedded={isEmbedded}>
      {content}
    </PageContainer>
  );
}
