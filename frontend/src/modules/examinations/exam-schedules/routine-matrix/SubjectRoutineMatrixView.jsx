import React, { useState } from 'react';
import useSubjectMatrixState from './hooks/useSubjectMatrixState';
import SubjectMatrixHeader from './components/SubjectMatrixHeader';
import SubjectMatrixTable from '../components/SubjectMatrixTable';
import SubjectRoutineDrawerForm from './SubjectRoutineDrawerForm';
import { UniversalAutoPopulateDrawer } from '../../../../components/ui/auto-populate';
import DeleteImpactModal from '../../../../components/common/DeleteImpactModal';
import { useRightSidebar, useDrawerRegistration } from '../../../../context/RightSidebarContext';
import { examStore } from '../../../../utils/stores/examStore';

/**
 * SubjectRoutineMatrixView
 * Enterprise-grade Subject Routine Matrix workspace.
 * Manages class exam dates, shifts, invigilators, and mark breakdown distributions.
 * Form creation, edits, and auto-population are performed seamlessly via the dedicated Right Sidebar Drawer.
 */
export default function SubjectRoutineMatrixView({ initialExamId = null, onNavigateToExamSessions = null }) {
  const { openDrawer, closeDrawer } = useRightSidebar();

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
    handleDeleteRow,
    handleDuplicateRow,
    executeBulkDelete,
  } = useSubjectMatrixState({ initialExamId, onNavigateToExamSessions });

  // Delete Impact Modal States
  const [rowToDelete, setRowToDelete] = useState(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // ─── Right Sidebar Drawer Registration for Single Subject Routine Form ────────
  useDrawerRegistration(
    'subject_routine',
    (params) => {
      const mode = params.get('mode') || 'add';
      const rowId = params.get('id');
      const foundRow =
        mode === 'edit' && rowId
          ? rows.find((r) => String(r.id) === String(rowId)) ||
            (examStore.getExamSubjects(tenantId, selectedExamId) || []).find((r) => String(r.id) === String(rowId)) ||
            null
          : null;

      return {
        title: mode === 'edit' ? 'Edit Subject Routine' : 'Add Subject Routine',
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
            onSave={(savedRow) => {
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
              teachers,
              examShifts,
              existingRowsCount: rows.length,
            }}
            onSuccess={() => {
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
      teachers,
      examShifts,
      rows.length,
      selectedExamId,
      loadStoredRows,
      closeDrawer,
    ]
  );

  const handleOpenAddDrawer = () => {
    openDrawer('subject_routine', { mode: 'add' });
  };

  const handleOpenAutoPopulateDrawer = () => {
    openDrawer('auto_populate_routine');
  };

  const handleOpenEditDrawer = (row) => {
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

  return (
    <div className="space-y-4 animate-fade-in text-left">
      {/* ── 1. Unified Control Header: Session Selector, Actions, Search, Filters & Counters ── */}
      <SubjectMatrixHeader
        examOptions={examOptions}
        selectedExamId={selectedExamId}
        setSelectedExamId={(val) => {
          setSelectedExamId(val);
          setSelectedRowIds(new Set());
        }}
        onAutoPopulate={handleOpenAutoPopulateDrawer}
        onAddRow={handleOpenAddDrawer}
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
        onDeleteRow={(rowId) => {
          const found = rows.find((r) => String(r.id) === String(rowId));
          setRowToDelete(found || { id: rowId, subjectName: 'Subject' });
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
    </div>
  );
}
