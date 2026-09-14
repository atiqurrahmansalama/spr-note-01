import React, { useState, useEffect } from 'react';
import PageContainer from '@/components/layout/PageContainer';
import DataTable from '@/components/ui/DataTable';
import CustomButton from '@/components/ui/CustomButton';
import AutoSaveBadge from '@/components/ui/AutoSaveBadge';
import ActionMenu from '@/components/ui/ActionMenu';
import {
  BookOpenIcon,
  AcademicCapIcon,
  CheckIcon,
  SparklesIcon,
} from '@/components/ui/Icons';
import useExamData from '../../hooks/useExamData';
import useMarkEntryGrid from '../../hooks/useMarkEntryGrid';
import MarkSheetFilterBar from '../MarkSheetFilterBar';
import { Subject } from '../types';
import {
  MarkEntryPrintModal,
  CsvImportModal,
  SupervisorUnlockModal,
  SubmitConfirmationModal,
} from './components';
import { useMarkEntryScope, useMarkEntryColumns } from './hooks';

export interface MarkEntryDeskActions {
  exportCsv: () => void;
  openCsvImport: () => void;
  openPrint: (mode?: 'single' | 'bulk') => void;
  openSupervisorUnlock: () => void;
  isLocked: boolean;
}

export interface MarkEntryDeskViewProps {
  selectedExamId?: string | number | null;
  selectedSubjectId?: string | number | null;
  selectedDepartmentId?: string | number | null;
  selectedClassId?: string | number | null;
  selectedSectionId?: string | number | null;
  selectedSubject?: Subject | null;
  hideFilterBar?: boolean;
  isEmbedded?: boolean;
  onNavigateToTabulation?: (examId?: string | number) => void;
  onNavigateToTranscripts?: (studentId?: string | number) => void;
  onRegisterActions?: (actions: MarkEntryDeskActions) => void;
  showAutoSave?: boolean;
  showAutoSaveStatus?: boolean;
  showAutoSaveTimestamp?: boolean;
}

export default function MarkEntryDeskView({
  selectedExamId: propExamId = null,
  selectedSubjectId: propSubjectId = null,
  selectedDepartmentId: propDeptId = null,
  selectedClassId: propClassId = null,
  selectedSectionId: propSectionId = null,
  selectedSubject: propSelectedSubject = null,
  hideFilterBar = false,
  isEmbedded = false,
  onRegisterActions,
  showAutoSave = true,
  showAutoSaveStatus = true,
  showAutoSaveTimestamp = true,
}: MarkEntryDeskViewProps) {
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
  } = useExamData();

  // Academic Filter Scope & Cascading Management Hook
  const {
    internalExamId,
    setInternalExamId,
    internalDeptId,
    setInternalDeptId,
    internalClassId,
    setInternalClassId,
    internalSectionId,
    setInternalSectionId,
    internalSubjectId,
    setInternalSubjectId,
    activeExamId,
    selectedExam,
    examOptions,
    filteredClassOptions,
    filteredSectionOptions,
    availableSubjects,
    subjectOptions,
    selectedSubject,
    targetStudents,
    activeGradingSystem,
  } = useMarkEntryScope({
    propExamId,
    propSubjectId,
    propDeptId,
    propClassId,
    propSectionId,
    propSelectedSubject,
    hideFilterBar,
    exams,
    examSubjects,
    students,
    classOptions,
    departmentOptions,
    sectionOptions,
    gradingSystems,
  });

  // Modal State Controllers
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isSupervisorModalOpen, setIsSupervisorModalOpen] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isPrintStudioOpen, setIsPrintStudioOpen] = useState(false);
  const [printMode, setPrintMode] = useState<'single' | 'bulk'>('single');

  // Grid Operations Controller Hook
  const {
    marksGrid,
    validationErrors,
    components,
    fullMarks,
    passMarks,
    isLocked,
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
    examId: activeExamId,
    examSubjectId: selectedSubject?.id,
    students: targetStudents,
    examSubject: selectedSubject,
    gradingRules: activeGradingSystem?.rules || [],
    onSaveSuccess: () => {},
  });

  // Dynamic Columns & Quick Fill Actions Hook
  const { columns, quickFillActions, fullMarksSubHeaderRow, footerRow } = useMarkEntryColumns({
    components,
    fullMarks,
    passMarks,
    marksGrid,
    validationErrors,
    isLocked,
    activeGradingSystem,
    targetStudents,
    stats,
    handleCellChange,
    handleToggleAbsent,
    handleRemarksChange,
    handleKeyDown,
    fillFullMarks,
    fillPassingMarks,
    toggleAllAbsent,
    clearAllMarks,
  });

  // Register actions with parent hub (so PageHeader three-dot menu can trigger them)
  useEffect(() => {
    if (onRegisterActions) {
      onRegisterActions({
        exportCsv: exportToCsv,
        openCsvImport: () => setIsCsvModalOpen(true),
        openPrint: (mode: 'single' | 'bulk' = 'single') => {
          setPrintMode(mode);
          setIsPrintStudioOpen(true);
        },
        openSupervisorUnlock: () => setIsSupervisorModalOpen(true),
        isLocked,
      });
    }
  }, [onRegisterActions, exportToCsv, isLocked]);

  const content = (
    <div className={`text-left w-full ${hideFilterBar ? 'space-y-3' : 'space-y-4'}`}>
      {/* ── 1. Academic Filter (Rendered only if standalone) ── */}
      {!hideFilterBar && (
        <MarkSheetFilterBar
          examOptions={examOptions}
          selectedExamId={internalExamId}
          onExamChange={setInternalExamId}
          departmentOptions={departmentOptions}
          selectedDepartmentId={internalDeptId}
          onDepartmentChange={setInternalDeptId}
          classOptions={filteredClassOptions}
          selectedClassId={internalClassId}
          onClassChange={setInternalClassId}
          sectionOptions={filteredSectionOptions}
          selectedSectionId={internalSectionId}
          onSectionChange={setInternalSectionId}
          subjectOptions={subjectOptions}
          selectedSubjectId={internalSubjectId}
          onSubjectChange={setInternalSubjectId}
          selectedSubject={selectedSubject}
          availableSubjects={availableSubjects}
          gradingSystem={activeGradingSystem}
        />
      )}

      {/* ── 2. Workspace Conditions ── */}
      {!activeExamId || !selectedSubject ? (
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
        <>
          {/* ── 3. Spreadsheet Grid Entry Table with SubHeader & Summary Footer ── */}
          <div className="print:hidden w-full">
            <DataTable
              showSerial={true}
              tableTitle={`${selectedSubject?.subjectName ? `${selectedSubject.subjectName} Marksheet` : 'Student Marks Evaluation'} (${targetStudents.length})`}
              tableTitleIcon={AcademicCapIcon}
              verticalHeaders={false}
              subHeaderRow={fullMarksSubHeaderRow}
              footerRow={footerRow}
              headerActions={
                quickFillActions && quickFillActions.length > 0 ? (
                  <ActionMenu
                    label="Quick Fill"
                    icon={SparklesIcon}
                    items={quickFillActions}
                    disabled={isLocked}
                    size="sm"
                    variant="sub"
                    align="right"
                    menuClassName="w-56"
                  />
                ) : null
              }
              columns={columns}
              data={targetStudents}
              keyExtractor={(st: any) => String(st.id)}
              emptyTitle="No Students Found"
              emptySubMessage="No active student records enrolled under this class and section."
              emptyIcon={AcademicCapIcon}
              sortable={true}
              selectable={false}
              rowClassName={((st: any) => (marksGrid[String(st?.id)]?.isAbsent ? 'opacity-60 theme-bg-sub/20' : '')) as any}
              cellPaddingClass="py-2.5 px-3"
            />
          </div>

          {/* ── 4. Bottom Submission Actions Row with Auto-Save Status ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border theme-border theme-bg-surface shadow-xs print:hidden">
            {/* Left: Live Evaluation Stats & Auto-Save Badge */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-2 theme-text-secondary">
                <span>Evaluated Students:</span>
                <strong className="theme-text-primary font-mono font-bold text-sm">
                  {stats.evaluatedCount} / {stats.totalStudents}
                </strong>
                <span className="text-[11px] theme-text-secondary">
                  ({stats.evaluatedPct}% Completed)
                </span>
              </div>

              {/* Auto-Save Status Live Badge */}
              {shouldShowAutoSave && (
                <AutoSaveBadge
                  show={shouldShowAutoSave}
                  status={isLocked ? 'locked' : (autoSaveStatus as any)}
                  lastSavedAt={lastSavedTime}
                  showTimestamp={showAutoSaveTimestamp}
                  variant="badge"
                  size="sm"
                />
              )}
            </div>

            {/* Right: Submission Button */}
            <div className="flex items-center gap-3">
              <CustomButton
                variant="primary"
                size="md"
                disabled={isLocked}
                loading={saving}
                loadingText="Submitting..."
                icon={CheckIcon}
                onClick={() => setIsSubmitModalOpen(true)}
              >
                Submit to Exam Controller
              </CustomButton>
            </div>
          </div>
        </>
      )}

      {/* ── 5. Universal Fullscreen Print Studio ── */}
      <MarkEntryPrintModal
        isOpen={isPrintStudioOpen}
        onClose={() => setIsPrintStudioOpen(false)}
        selectedExam={selectedExam}
        selectedSubject={selectedSubject}
        availableSubjects={availableSubjects}
        targetStudents={targetStudents}
        allStudents={students}
        components={components}
        fullMarks={fullMarks}
        passMarks={passMarks}
        marksGrid={marksGrid}
        activeGradingSystem={activeGradingSystem}
        stats={stats}
        initialMode={printMode}
        tenantId={tenantId}
        onExportCsv={exportToCsv}
      />

      {/* ── 6. CSV Import Modal ── */}
      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onImport={importFromCsv}
        components={components}
      />

      {/* ── 7. Supervisor Unlock Modal ── */}
      <SupervisorUnlockModal
        isOpen={isSupervisorModalOpen}
        onClose={() => setIsSupervisorModalOpen(false)}
        onConfirmUnlock={handleSupervisorUnlock}
        subjectName={selectedSubject?.subjectName}
      />

      {/* ── 8. Submit to Exam Controller Modal ── */}
      <SubmitConfirmationModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onConfirm={async () => {
          await handleSave('SUBMITTED');
          setIsSubmitModalOpen(false);
        }}
        isSubmitting={saving}
        subjectName={selectedSubject?.subjectName}
        totalStudents={stats.totalStudents || targetStudents.length}
        evaluatedStudents={stats.evaluatedCount}
        absentStudents={stats.absentCount}
      />
    </div>
  );

  if (isEmbedded) {
    return content;
  }

  return (
    <PageContainer maxWidth="7xl" isEmbedded={false}>
      {content}
    </PageContainer>
  );
}
