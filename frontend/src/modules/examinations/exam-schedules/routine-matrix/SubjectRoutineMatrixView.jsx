import React from 'react';
import useSubjectMatrixState from './hooks/useSubjectMatrixState';
import SubjectMatrixHeader from './components/SubjectMatrixHeader';
import SubjectMatrixTable from './components/SubjectMatrixTable';
import SubjectRoutineDrawerForm from './components/SubjectRoutineDrawerForm';
import DeleteImpactModal from '../../../../components/common/DeleteImpactModal';
import { useRightSidebar, useDrawerRegistration } from '../../../../context/RightSidebarContext';
import { examStore } from '../../../../utils/stores/examStore';

/**
 * SubjectRoutineMatrixView
 * Enterprise-grade Subject Routine Matrix workspace.
 * Manages class exam dates, shifts, invigilators, and mark breakdown distributions.
 * Form creation and edits are performed seamlessly via the dedicated Right Sidebar Drawer.
 */
export default function SubjectRoutineMatrixView({ initialExamId = null, onNavigateToExamSessions = null }) {
  const { openDrawer, closeDrawer, openRightSidebar, closeRightSidebar } = useRightSidebar();

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
    showAutoPopulateConfirm,
    setShowAutoPopulateConfirm,
    executeAutoPopulate,
    handleSelectRow,
    handleAutoPopulateFromCurriculum,
    handleUpsertRow,
    handleDeleteRow,
    handleDuplicateRow,
    handleBulkDelete,
  } = useSubjectMatrixState({ initialExamId });

  // ─── Right Sidebar Drawer Registration for Subject Routine Form ───────────────
  useDrawerRegistration(
    'subject_routine',
    (params) => {
      const mode = params.get('mode') || 'add';
      const rowId = params.get('id');
      let foundRow = null;
      if (mode === 'edit' && rowId) {
        foundRow =
          rows.find((r) => String(r.id) === String(rowId)) ||
          (examStore.getExamSubjects(tenantId, selectedExamId) || []).find(
            (r) => String(r.id) === String(rowId)
          ) ||
          (examStore.getExamSubjects(tenantId) || []).find(
            (r) => String(r.id) === String(rowId)
          ) ||
          null;
      }

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

  const handleOpenAddDrawer = () => {
    openDrawer('subject_routine', { mode: 'add' });
  };

  const handleOpenEditDrawer = (row) => {
    if (!row) return;
    openDrawer('subject_routine', { mode: 'edit', id: row.id });
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
        onAutoPopulate={handleAutoPopulateFromCurriculum}
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
        onBulkDelete={handleBulkDelete}
      />

      {/* ── 2. Subject Routine Matrix Read-Only Presentation Table ── */}
      <SubjectMatrixTable
        filteredRows={filteredRows}
        onEditRow={handleOpenEditDrawer}
        onOpenComponentModal={handleOpenEditDrawer}
        onDuplicateRow={handleDuplicateRow}
        onDeleteRow={handleDeleteRow}
      />

      {/* ── 3. Confirm Overwrite Re-population Modal (Standard DeleteImpactModal) ── */}
      <DeleteImpactModal
        isOpen={showAutoPopulateConfirm}
        onClose={() => setShowAutoPopulateConfirm(false)}
        onConfirm={executeAutoPopulate}
        title="Overwrite Existing Routine Schedules?"
        subtitle={`You are about to re-populate the routine schedule for "${activeExam?.name || 'Active Examination Session'}".`}
        entityName={activeExam?.name || 'Exam Routine'}
        entityType="Exam Session"
        requireAck={false}
        requireNameMatch={false}
        confirmButtonText="Overwrite & Auto-Populate"
        warningMessage={`This examination session currently contains ${rows.length} scheduled subject ${rows.length === 1 ? 'entry' : 'entries'}. Re-populating from the curriculum will permanently overwrite and replace all current routines, custom date/shift timing adjustments, invigilator assignments, and mark breakdowns.`}
      />
    </div>
  );
}
