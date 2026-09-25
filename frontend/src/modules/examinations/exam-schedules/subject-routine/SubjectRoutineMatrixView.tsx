import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useSubjectMatrixState from './hooks/useSubjectMatrixState';
import SubjectMatrixHeader from './components/SubjectMatrixHeader';
import SubjectMatrixTable from './components/SubjectMatrixTable';
import SubjectRoutineDrawerForm from './SubjectRoutineDrawerForm';
import SubjectRoutineStudioView from './SubjectRoutineStudioView';
import { UniversalAutoPopulateDrawer } from '../../../../components/ui/auto-populate';
import DeleteImpactModal from '../../../../components/common/DeleteImpactModal';
import { useRightSidebar, useDrawerRegistration } from '../../../../context/RightSidebarContext';
import { examStore } from '@/stores/examStore';
import { getSavedTemplatesForScope } from '../../../../components/print/scopeTemplateStore';
import { SUBJECT_ROUTINE_SCOPE_ID } from './subjectRoutineDocLabKeys';
import SubjectRoutinePrintModal from './SubjectRoutinePrintModal';
import { SubjectRoutineItem, SubjectRoutineMatrixViewProps } from './types';

/**
 * SubjectRoutineMatrixView
 * Enterprise-grade Subject Routine Matrix workspace.
 * Manages class exam dates, shifts, invigilators, and mark breakdown distributions.
 * Seamlessly toggles between Tabular Matrix View and 2D Routine Studio generator.
 */
export default function SubjectRoutineMatrixView({
  initialExamId = null,
  initialViewMode = 'table',
  onNavigateToExamSessions = null,
  onPrint = null,
  isPrintOpen = false,
  onClosePrint = undefined,
  actionMenuItems = undefined,
}: SubjectRoutineMatrixViewProps) {
  const { openDrawer, closeDrawer } = useRightSidebar();
  const [viewMode, setViewMode] = useState<string>(initialViewMode || 'table');

  useEffect(() => {
    if (initialViewMode) {
      setViewMode(initialViewMode);
    }
  }, [initialViewMode]);

  const matrixState = useSubjectMatrixState({ initialExamId, onNavigateToExamSessions });
  const {
    tenantId,
    selectedExamId,
    setSelectedExamId,
    activeExam,
    examShifts,
    designatedExamDays,
    rows,
    filteredRows,
    participatingClasses,
    allAvailableClasses,
    availableCurriculumBooks,
    periodSlots,
    teachers,
    examOptions,
    searchQuery,
    setSearchQuery,
    filterDepartmentId,
    setFilterDepartmentId,
    filterClassId,
    setFilterClassId,
    filterExamDate,
    setFilterExamDate,
    filterTeacherId,
    setFilterTeacherId,
    dateFilterOptions,
    selectedRowIds,
    setSelectedRowIds,
    loadStoredRows,
    handleUpsertRow,
    handleBulkUpsertRows,
    handleDeleteRow,
    handleDuplicateRow,
    executeBulkDelete,
  } = matrixState;

  // Delete Impact Modal States
  const [rowToDelete, setRowToDelete] = useState<SubjectRoutineItem | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState<boolean>(false);
  const [internalPrintOpen, setInternalPrintOpen] = useState<boolean>(false);

  const isPrintModalOpen = Boolean(isPrintOpen || internalPrintOpen);

  const handleClosePrintModal = () => {
    setInternalPrintOpen(false);
    onClosePrint?.();
  };

  const navigate = useNavigate();

  const handleTriggerPrint = () => {
    const saved = getSavedTemplatesForScope(SUBJECT_ROUTINE_SCOPE_ID);
    if (!saved || saved.length === 0) {
      navigate(`/print-studio?scope=${SUBJECT_ROUTINE_SCOPE_ID}&returnUrl=/examinations/routine-matrix`);
      return;
    }
    if (onPrint) {
      onPrint();
    } else {
      setInternalPrintOpen(true);
    }
  };

  // ─── Right Sidebar Drawer Registration for Single Subject Routine Form ────────
  useDrawerRegistration(
    'subject_routine',
    (params: URLSearchParams) => {
      const mode = (params.get('mode') || 'add') as 'add' | 'edit';
      const rowId = params.get('id');
      const foundRow =
        mode === 'edit' && rowId
          ? rows.find((r: SubjectRoutineItem) => String(r.id) === String(rowId)) ||
            (examStore.getExamSubjects(tenantId, selectedExamId) || []).find((r: SubjectRoutineItem) => String(r.id) === String(rowId)) ||
            null
          : null;

      return {
        title: mode === 'edit' ? 'Edit Routine' : 'Add Routine',
        subtitle:
          mode === 'edit'
            ? `Update routine schedule and marks for ${foundRow?.subjectName || 'Subject'}`
            : `Configure exam routine for ${activeExam?.name || 'Active Session'}`,
        category: 'Routine Matrix',
        size: 'lg',
        width: 'lg',
        content: (
          <SubjectRoutineDrawerForm
            key={`subject-routine-drawer-${mode}-${rowId || 'new'}`}
            mode={mode}
            initialData={foundRow}
            activeExam={activeExam}
            allAvailableClasses={allAvailableClasses}
            availableCurriculumBooks={availableCurriculumBooks}
            examShifts={examShifts}
            designatedExamDays={designatedExamDays}
            onSave={(savedRow: SubjectRoutineItem) => {
              handleUpsertRow(savedRow);
              closeDrawer();
            }}
            onCancel={closeDrawer}
          />
        ),
      };
    },
    [
      rows,
      filteredRows,
      tenantId,
      selectedExamId,
      activeExam,
      allAvailableClasses,
      availableCurriculumBooks,
      examShifts,
      designatedExamDays,
      handleUpsertRow,
      closeDrawer,
    ]
  );

  // ─── Right Sidebar Drawer Registration for Universal Auto-Populate Routine ──────────────
  useDrawerRegistration(
    'auto_populate_routine',
    () => {
      return {
        title: 'Auto-Populate Exam Routine',
        subtitle: `Configure curriculum mapping and examiner rules for ${activeExam?.name || 'Active Session'}`,
        category: 'Routine Matrix',
        size: 'lg',
        width: 'lg',
        content: (
          <UniversalAutoPopulateDrawer
            key={`auto-populate-drawer-${selectedExamId}`}
            domainKey="exam_routine_matrix"
            context={{
              tenantId,
              activeExam,
              participatingClasses,
              allAvailableClasses,
              availableCurriculumBooks,
              periodSlots,
              teachers,
              examShifts,
              existingRowsCount: rows.length,
            }}
            onSuccess={(data: any) => {
              if (Array.isArray(data) && data.length > 0) {
                handleBulkUpsertRows(data);
              }
              loadStoredRows();
              closeDrawer();
            }}
            onCancel={closeDrawer}
          />
        ),
      };
    },
    [
      tenantId,
      activeExam,
      participatingClasses,
      allAvailableClasses,
      availableCurriculumBooks,
      periodSlots,
      teachers,
      examShifts,
      rows.length,
      selectedExamId,
      handleBulkUpsertRows,
      loadStoredRows,
      closeDrawer,
    ]
  );

  const handleOpenAddDrawer = () => {
    openDrawer('subject_routine', { mode: 'add' });
  };

  const handleOpenEditDrawer = (row: SubjectRoutineItem) => {
    if (!row) return;
    openDrawer('subject_routine', { mode: 'edit', id: row.id });
  };

  const handleConfirmSingleDelete = () => {
    if (!rowToDelete) return;
    handleDeleteRow(rowToDelete.id);
    setRowToDelete(null);
  };

  const handleConfirmBulkDelete = () => {
    executeBulkDelete();
    setShowBulkDeleteConfirm(false);
  };

  if (viewMode === 'studio') {
    return (
      <div className="space-y-4 animate-fade-in text-left">
        <SubjectRoutineStudioView
          matrixState={matrixState}
          onToggleViewMode={() => {
            closeDrawer();
            setViewMode('table');
          }}
          onNavigateToExamSessions={onNavigateToExamSessions}
          onPrint={handleTriggerPrint}
          actionMenuItems={actionMenuItems}
        />

        {/* Dedicated Subject Routine Print Studio & DocLab Modal */}
        <SubjectRoutinePrintModal
          isOpen={isPrintModalOpen}
          onClose={handleClosePrintModal}
          activeExam={activeExam}
          routineRows={rows}
          academicContext={{
            departmentName: filterDepartmentId !== 'ALL' ? (matrixState.departments || []).find((d: any) => String(d.id) === String(filterDepartmentId))?.name : undefined,
            className: filterClassId !== 'ALL' ? (allAvailableClasses || []).find((c: any) => String(c.id) === String(filterClassId))?.name : undefined,
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in text-left">
      {/* ── 1. Unified Control Header: Session Selector, Actions, Search, Filters & Counters ── */}
      <SubjectMatrixHeader
        examOptions={examOptions}
        selectedExamId={selectedExamId}
        setSelectedExamId={(val: string) => {
          setSelectedExamId(val);
          setSelectedRowIds(new Set());
        }}
        viewMode={viewMode}
        onToggleViewMode={() => {
          closeDrawer();
          setViewMode('studio');
        }}
        onAddRow={handleOpenAddDrawer}
        onPrint={handleTriggerPrint}
        actionMenuItems={actionMenuItems}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterDepartmentId={filterDepartmentId}
        setFilterDepartmentId={setFilterDepartmentId}
        filterClassId={filterClassId}
        setFilterClassId={setFilterClassId}
        filterExamDate={filterExamDate}
        setFilterExamDate={setFilterExamDate}
        filterTeacherId={filterTeacherId}
        setFilterTeacherId={setFilterTeacherId}
        dateFilterOptions={dateFilterOptions}
        allAvailableClasses={allAvailableClasses}
        totalCount={rows.length}
        filteredCount={filteredRows.length}
        selectedCount={selectedRowIds.size}
        onBulkDelete={() => setShowBulkDeleteConfirm(true)}
      />

      {/* ── 2. Subject Routine Matrix Read-Only Presentation Table ── */}
      <SubjectMatrixTable
        activeExam={activeExam}
        filteredRows={filteredRows}
        onEditRow={handleOpenEditDrawer}
        onOpenComponentModal={handleOpenEditDrawer}
        onDuplicateRow={handleDuplicateRow}
        onDeleteRow={(rowId: string) => {
          const found = rows.find((r) => String(r.id) === String(rowId));
          setRowToDelete(found || ({ id: rowId, subjectName: 'Subject' } as SubjectRoutineItem));
        }}
      />

      {/* ── 4. Single Row Delete Confirmation Modal ── */}
      <DeleteImpactModal
        isOpen={Boolean(rowToDelete)}
        onClose={() => setRowToDelete(null)}
        onConfirm={handleConfirmSingleDelete}
        title="Delete Subject Routine Row?"
        subtitle={`You are about to delete the routine schedule for "${rowToDelete?.subjectName || 'Subject'}".`}
        entityName={rowToDelete?.subjectName || 'Subject Routine'}
        entityType="Subject Routine"
        requireAck={false}
        requireNameMatch={false}
        confirmButtonText="Delete Row"
        warningMessage="Deleting this subject routine row will remove its scheduled date, assigned examiner, and component marks distribution for this exam session."
      />

      {/* ── 5. Bulk Delete Confirmation Modal ── */}
      <DeleteImpactModal
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={handleConfirmBulkDelete}
        title="Delete Selected Subject Routines?"
        subtitle={`You are about to delete ${selectedRowIds.size} selected subject routine entries.`}
        entityName={`${selectedRowIds.size} Subject Routines`}
        entityType="Routine Entries"
        requireAck={false}
        requireNameMatch={false}
        confirmButtonText={`Delete ${selectedRowIds.size} Selected`}
        warningMessage="Permanently deleting these selected subject routines will remove their examination schedules and mark breakdown configs from this exam session."
      />

      {/* ── 6. Dedicated Subject Routine Print Studio & DocLab Modal ── */}
      <SubjectRoutinePrintModal
        isOpen={isPrintModalOpen}
        onClose={handleClosePrintModal}
        activeExam={activeExam}
        routineRows={filteredRows}
        academicContext={{
          departmentName: filterDepartmentId !== 'ALL' ? (matrixState.departments || []).find((d: any) => String(d.id) === String(filterDepartmentId))?.name : undefined,
          className: filterClassId !== 'ALL' ? (allAvailableClasses || []).find((c: any) => String(c.id) === String(filterClassId))?.name : undefined,
        }}
      />
    </div>
  );
}
