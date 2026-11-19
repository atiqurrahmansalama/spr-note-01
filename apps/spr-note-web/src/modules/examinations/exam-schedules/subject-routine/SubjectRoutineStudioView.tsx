import React, { useState, useMemo, useCallback } from 'react';
import useSubjectMatrixState from './hooks/useSubjectMatrixState';
import { TimetableMatrixGrid } from '../../../../components/common/TimetableMatrixGrid';
import { LENS_MODES } from '../../../../components/common/TimetableMatrixGrid/TimetableLensSelector';
import SubjectMatrixHeader from './components/SubjectMatrixHeader';
import { detectRoutineConflicts } from './utils/routineConflictHelper';
import {
  buildStudioMatrixColumns,
  buildStudioMatrixRows,
  extractStudioCellItem,
} from './utils/routineStudioMatrixHelper';
import { useRightSidebar, useDrawerRegistration } from '../../../../context/RightSidebarContext';
import { useToast } from '../../../../context/ToastContext';
import { UniversalAutoPopulateDrawer } from '../../../../components/ui/auto-populate';
import SubjectRoutineDrawerForm from './SubjectRoutineDrawerForm';
import DeleteImpactModal from '../../../../components/common/DeleteImpactModal';
import { examStore } from '@/stores/examStore';
import {
  swapRoutineScopedAttributes,
  copyRoutineScopedAttributes,
  isDndScopeAllowed,
} from './utils/routineDndHelper';
import { SubjectRoutineItem, SubjectRoutineStudioViewProps } from './types';

/**
 * SubjectRoutineStudioView (Routine Studio)
 * Enterprise High-Performance 2D Timetable Routine Generator & Matrix Studio.
 * Features:
 * - Shared Real-time Data Store with Subject Routine Matrix (100% Single Source of Truth)
 * - 60fps Drag-and-Drop (Move & Atomic Swap) across exam dates and class levels
 * - Universal Auto-Populate from Curriculum Syllabus (identical logic & storage)
 * - Multi-Lens Perspective Switcher (All Details, Subject, Examiner, Room)
 * - Live Conflict & Collision Detection (Examiner clashes, Class multi-bookings, Invigilator clashes)
 * - Integrated Delete Impact Modals (Single slot delete & Complete session clear)
 * - Enterprise Responsive Container Query Design tokens
 */
export default function SubjectRoutineStudioView({
  matrixState: externalMatrixState = null,
  initialExamId = null,
  onToggleViewMode = null,
  onNavigateToExamSessions = null,
  onPrint = null,
  actionMenuItems = undefined,
}: SubjectRoutineStudioViewProps) {
  const { openDrawer, closeDrawer } = useRightSidebar();
  const { showToast } = useToast();

  // Fallback for standalone usage if matrixState is not passed from parent
  const fallbackState = useSubjectMatrixState({
    initialExamId,
    onNavigateToExamSessions,
  });

  const matrixState = externalMatrixState || fallbackState;

  const {
    tenantId,
    selectedExamId,
    setSelectedExamId,
    activeExam,
    examShifts,
    designatedExamDays,
    rows: routineRows,
    participatingClasses,
    allAvailableClasses,
    availableCurriculumBooks,
    teachers,
    departments,
    examOptions,
    loadStoredRows,
    filterDepartmentId,
    setFilterDepartmentId,
    filterClassId,
    setFilterClassId,
    handleUpsertRow,
    handleSwapRows,
    handleBulkUpsertRows,
    handleDuplicateRow,
    handleDeleteRow,
    handleClearAllRows,
  } = matrixState;

  // ─── Studio-Specific Perspective Lens & Density States ──────────────────────
  const [activeLens, setActiveLens] = useState<string>(LENS_MODES.ALL);
  const [density, setDensity] = useState<'compact' | 'normal' | 'comfortable'>('normal');

  // ─── Pre-fill state for clicking an empty cell ──────────────────────────────
  const [targetSlotPrefill, setTargetSlotPrefill] = useState<any>(null);

  // ─── Delete Impact Confirmation Modal States ───────────────────────────────
  const [rowToDelete, setRowToDelete] = useState<SubjectRoutineItem | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState<boolean>(false);

  // ─── 1. Real-time Conflict & Collision Detection ───────────────────────────
  const { conflictMap } = useMemo(() => {
    return detectRoutineConflicts(routineRows);
  }, [routineRows]);

  // ─── 2. Build Dynamic 2D Column Headers (Dates & Shifts) ───────────────────
  const matrixColumns = useMemo(() => {
    return buildStudioMatrixColumns(activeExam, examShifts, designatedExamDays, routineRows);
  }, [activeExam, examShifts, designatedExamDays, routineRows]);

  // ─── 3. Build Dynamic 2D Row Headers (Classes / Academic Levels) ───────────
  const matrixRows = useMemo(() => {
    return buildStudioMatrixRows(
      participatingClasses,
      allAvailableClasses,
      routineRows,
      departments,
      filterDepartmentId,
      filterClassId
    );
  }, [participatingClasses, allAvailableClasses, routineRows, departments, filterDepartmentId, filterClassId]);

  // ─── 4. Bulletproof Cell Item Matching Logic ──────────────────────────────
  const cellItemExtractor = useCallback(
    (allData: SubjectRoutineItem[], row: any, col: any) => {
      return extractStudioCellItem(allData, row, col);
    },
    []
  );

  // ─── 5. Drag and Drop Handlers (Move, Granular Swap & Ctrl+Copy) ───────────
  const handleItemMove = useCallback(
    (draggedItem: any, sourceRow: any, sourceCol: any, targetRow: any, targetCol: any, scope = LENS_MODES.ALL) => {
      if (!draggedItem) return;

      const validation = isDndScopeAllowed(sourceRow, targetRow, scope);
      if (!validation.allowed) {
        showToast(
          'Curriculum books cannot be transferred across different classes. Please reschedule dates within the same class row.',
          'warning'
        );
        return;
      }

      if (scope === LENS_MODES.TEACHER || scope === LENS_MODES.ROOM) {
        showToast(
          `Cannot assign ${scope === LENS_MODES.TEACHER ? 'examiner' : 'room'} to an empty slot. Switch to "Full View" or "Subjects" to schedule a routine subject here first.`,
          'info'
        );
        return;
      }

      const targetDepartment = typeof targetRow?.sub === 'string' ? targetRow.sub : draggedItem.departmentName;
      const updatedItem: SubjectRoutineItem = {
        ...draggedItem,
        classId: targetRow?.id || draggedItem.classId,
        className: targetRow?.label || targetRow?.name || draggedItem.className,
        departmentName: targetDepartment,
        examDate: targetCol.date,
        shiftId: targetCol.shiftId || draggedItem.shiftId || 'shift_1',
        shiftName: targetCol.shiftName || draggedItem.shiftName || 'Shift 1 (Morning)',
        startTime: targetCol.rawShift?.startTime || targetCol.timing?.split(' - ')[0] || draggedItem.startTime,
        endTime: targetCol.rawShift?.endTime || targetCol.timing?.split(' - ')[1] || draggedItem.endTime,
        updatedAt: new Date().toISOString(),
      };

      handleUpsertRow(updatedItem, { silent: true });
      showToast(
        `Moved "${draggedItem.subjectName || 'Subject'}" to ${targetRow.label} on ${targetCol.dateLabel || targetCol.date}`,
        'success'
      );
    },
    [handleUpsertRow, showToast]
  );

  const handleItemSwap = useCallback(
    (draggedItem: any, targetItem: any, sourceRow: any, sourceCol: any, targetRow: any, targetCol: any, scope = LENS_MODES.ALL) => {
      if (!draggedItem || !targetItem) return;

      const validation = isDndScopeAllowed(sourceRow, targetRow, scope);
      if (!validation.allowed) {
        showToast(
          'Curriculum books cannot be transferred across different classes. Please reschedule dates within the same class row.',
          'warning'
        );
        return;
      }

      const { updatedSource, updatedTarget } = swapRoutineScopedAttributes(
        draggedItem,
        targetItem,
        scope,
        { sourceRow, sourceCol, targetRow, targetCol }
      );

      handleSwapRows(updatedSource, updatedTarget, { silent: true });

      if (scope === LENS_MODES.TEACHER) {
        showToast(
          `Swapped examiners: "${draggedItem.examinerName || draggedItem.teacherName || 'Examiner'}" ↔ "${targetItem.examinerName || targetItem.teacherName || 'Examiner'}"`,
          'info'
        );
      } else if (scope === LENS_MODES.ROOM) {
        showToast(
          `Swapped rooms: "${draggedItem.roomNo || 'Room'}" ↔ "${targetItem.roomNo || 'Room'}"`,
          'info'
        );
      } else if (scope === LENS_MODES.SUBJECT) {
        showToast(
          `Swapped subjects: "${draggedItem.subjectName || 'Subject'}" ↔ "${targetItem.subjectName || 'Subject'}"`,
          'info'
        );
      } else {
        showToast(
          `Swapped routine slots between "${draggedItem.subjectName || 'Subject'}" and "${targetItem.subjectName || 'Subject'}"`,
          'info'
        );
      }
    },
    [handleSwapRows, showToast]
  );

  const handleItemCopy = useCallback(
    (draggedItem: any, targetItem: any, sourceRow: any, sourceCol: any, targetRow: any, targetCol: any, scope = LENS_MODES.ALL) => {
      if (!draggedItem) return;

      const validation = isDndScopeAllowed(sourceRow, targetRow, scope);
      if (!validation.allowed) {
        showToast(
          'Curriculum books cannot be copied across different classes. Please duplicate dates within the same class row.',
          'warning'
        );
        return;
      }

      const copiedResult = copyRoutineScopedAttributes(
        draggedItem,
        targetItem,
        scope,
        { targetRow, targetCol }
      );

      if (!copiedResult) {
        if (scope === LENS_MODES.TEACHER || scope === LENS_MODES.ROOM) {
          showToast(
            `Cannot copy ${scope === LENS_MODES.TEACHER ? 'examiner' : 'room'} to an empty slot. Target must have a scheduled subject.`,
            'info'
          );
        }
        return;
      }

      handleUpsertRow(copiedResult, { silent: true });

      if (scope === LENS_MODES.TEACHER) {
        showToast(
          `Copied examiner "${draggedItem.examinerName || draggedItem.teacherName || 'Examiner'}" to ${targetItem?.subjectName || 'slot'}`,
          'success'
        );
      } else if (scope === LENS_MODES.ROOM) {
        showToast(
          `Copied room "${draggedItem.roomNo || 'Room'}" to ${targetItem?.subjectName || 'slot'}`,
          'success'
        );
      } else if (scope === LENS_MODES.SUBJECT) {
        showToast(
          `Duplicated subject "${draggedItem.subjectName || 'Subject'}" to ${targetRow?.label} on ${targetCol?.dateLabel || targetCol?.date}`,
          'success'
        );
      } else {
        showToast(
          `Duplicated complete routine schedule for "${draggedItem.subjectName || 'Subject'}" to ${targetRow?.label} on ${targetCol?.dateLabel || targetCol?.date}`,
          'success'
        );
      }
    },
    [handleUpsertRow, showToast]
  );

  // ─── 6. Right Sidebar Drawer Registration for Routine Editing & Adding ─────
  useDrawerRegistration(
    'subject_routine',
    (params: URLSearchParams) => {
      const mode = (params.get('mode') || 'add') as 'add' | 'edit';
      const rowId = params.get('id');
      const foundRow =
        mode === 'edit' && rowId
          ? routineRows.find((r: SubjectRoutineItem) => String(r.id) === String(rowId)) ||
            (examStore.getExamSubjects(tenantId, selectedExamId) || []).find((r: SubjectRoutineItem) => String(r.id) === String(rowId)) ||
            null
          : null;

      const initialPayload = foundRow || (targetSlotPrefill ? {
        classId: targetSlotPrefill.rowItem?.id,
        className: targetSlotPrefill.rowItem?.label,
        examDate: targetSlotPrefill.colItem?.date,
        shiftId: targetSlotPrefill.colItem?.shiftId || 'shift_1',
        shiftName: targetSlotPrefill.colItem?.shiftName || 'Shift 1 (Morning)',
        startTime: targetSlotPrefill.colItem?.rawShift?.startTime || '09:00 AM',
        endTime: targetSlotPrefill.colItem?.rawShift?.endTime || '11:00 AM',
      } : null);

      return {
        title: mode === 'edit' ? 'Edit Subject Routine' : 'Add Subject Routine',
        subtitle:
          mode === 'edit'
            ? `Update routine schedule and marks for ${foundRow?.subjectName || 'Subject'}`
            : `Schedule routine subject for ${activeExam?.name || 'Active Session'}`,
        category: 'Routine Studio',
        size: 'lg',
        width: 'lg',
        content: (
          <SubjectRoutineDrawerForm
            key={`routine-studio-form-${mode}-${rowId || (targetSlotPrefill ? `${targetSlotPrefill.rowItem?.id}_${targetSlotPrefill.colItem?.date}_${targetSlotPrefill.colItem?.shiftId}` : 'new')}`}
            mode={mode}
            initialData={initialPayload}
            activeExam={activeExam}
            allAvailableClasses={allAvailableClasses}
            availableCurriculumBooks={availableCurriculumBooks}
            examShifts={examShifts}
            designatedExamDays={designatedExamDays}
            onSave={(savedRow: SubjectRoutineItem) => {
              handleUpsertRow(savedRow);
              setTargetSlotPrefill(null);
              closeDrawer();
            }}
            onCancel={() => {
              setTargetSlotPrefill(null);
              closeDrawer();
            }}
          />
        ),
      };
    },
    [
      routineRows,
      tenantId,
      selectedExamId,
      activeExam,
      allAvailableClasses,
      availableCurriculumBooks,
      examShifts,
      designatedExamDays,
      targetSlotPrefill,
      handleUpsertRow,
      closeDrawer,
    ]
  );

  // ─── 7. Auto-Populate Drawer Registration ─────────────────────────────────
  useDrawerRegistration(
    'auto_populate_routine',
    () => ({
      title: 'Auto-Populate Exam Routine',
      subtitle: `Generate 2D routine grid automatically from curriculum syllabus for ${activeExam?.name || 'Active Session'}`,
      category: 'Routine Studio',
      size: 'lg',
      width: 'lg',
      content: (
        <UniversalAutoPopulateDrawer
          key={`auto-populate-studio-${selectedExamId}`}
          domainKey="exam_routine_matrix"
          context={{
            tenantId,
            activeExam,
            participatingClasses,
            allAvailableClasses,
            availableCurriculumBooks,
            teachers,
            examShifts,
            existingRowsCount: routineRows.length,
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
    }),
    [
      tenantId,
      activeExam,
      participatingClasses,
      allAvailableClasses,
      availableCurriculumBooks,
      teachers,
      examShifts,
      routineRows.length,
      selectedExamId,
      handleBulkUpsertRows,
      loadStoredRows,
      closeDrawer,
    ]
  );

  const handleOpenAddOnSlot = useCallback(
    (rowItem: any, colItem: any) => {
      setTargetSlotPrefill({ rowItem, colItem });
      openDrawer('subject_routine', { mode: 'add' });
    },
    [openDrawer]
  );

  const handleOpenEditItem = useCallback(
    (item: any) => {
      if (!item) return;
      openDrawer('subject_routine', { mode: 'edit', id: item.id });
    },
    [openDrawer]
  );

  const handleConfirmSingleDelete = useCallback(() => {
    if (!rowToDelete) return;
    handleDeleteRow(rowToDelete.id);
    setRowToDelete(null);
  }, [rowToDelete, handleDeleteRow]);

  const handleConfirmClearAll = useCallback(() => {
    handleClearAllRows();
    setShowClearAllConfirm(false);
  }, [handleClearAllRows]);

  return (
    <div className="space-y-4 animate-fade-in text-left">
      {/* ─── 1. Dedicated Enterprise Toolbar Header (Line 1 & Line 2) ────────── */}
      <SubjectMatrixHeader
        examOptions={examOptions}
        selectedExamId={selectedExamId}
        setSelectedExamId={setSelectedExamId}
        activeExam={activeExam}
        viewMode="studio"
        onToggleViewMode={onToggleViewMode || undefined}
        onAutoPopulate={() => openDrawer('auto_populate_routine')}
        onClearRoutine={() => setShowClearAllConfirm(true)}
        onPrint={onPrint || (() => window.print())}
        actionMenuItems={actionMenuItems}
        totalRowsCount={routineRows.length}
        filterDepartmentId={filterDepartmentId}
        setFilterDepartmentId={setFilterDepartmentId}
        filterClassId={filterClassId}
        setFilterClassId={setFilterClassId}
        allAvailableClasses={allAvailableClasses}
        activeLens={activeLens}
        setActiveLens={setActiveLens}
        density={density}
        setDensity={setDensity}
      />

      {/* ─── 2. Master 2D Timetable Routine Matrix Grid ──────────────────────── */}
      <TimetableMatrixGrid
        title={`${activeExam?.name || 'Examination'} — Routine Studio`}
        subtitle="Drag & drop cards across date columns or class rows to reschedule. Click empty slots to add."
        rows={matrixRows}
        columns={matrixColumns}
        items={routineRows}
        cellItemExtractor={cellItemExtractor}
        conflictMap={conflictMap}
        activeLens={activeLens}
        density={density}
        hideHeader={true}
        onItemMove={handleItemMove}
        onItemSwap={handleItemSwap}
        onItemCopy={handleItemCopy}
        onDndBlocked={(blocked: any) =>
          showToast(
            blocked.reason ||
              'Curriculum books cannot be transferred across different classes. Please reschedule dates within the same class row.',
            'warning'
          )
        }
        onCellAdd={handleOpenAddOnSlot}
        onCellEdit={handleOpenEditItem}
        onCellDuplicate={handleDuplicateRow}
        onCellDelete={(item: any) => setRowToDelete(item)}
        onCellClick={handleOpenEditItem}
        emptyMessage="No date slots or participating classes found for this examination session."
      />

      {/* ─── 3. Single Row Delete Confirmation Modal ──────────────────────────── */}
      <DeleteImpactModal
        isOpen={Boolean(rowToDelete)}
        onClose={() => setRowToDelete(null)}
        onConfirm={handleConfirmSingleDelete}
        title="Remove Subject from Routine Slot?"
        subtitle={`You are about to remove the schedule for "${rowToDelete?.subjectName || 'Subject'}" on ${rowToDelete?.examDate || 'scheduled date'}.`}
        entityName={rowToDelete?.subjectName || 'Subject Routine'}
        entityType="Routine Slot"
        requireAck={false}
        requireNameMatch={false}
        confirmButtonText="Remove from Routine"
        warningMessage="Removing this subject from the routine board will remove its scheduled date and examiner assignment from this session."
      />

      {/* ─── 4. Clear All Routine Confirmation Modal ──────────────────────────── */}
      <DeleteImpactModal
        isOpen={showClearAllConfirm}
        onClose={() => setShowClearAllConfirm(false)}
        onConfirm={handleConfirmClearAll}
        title="Clear All Routine Schedules?"
        subtitle={`You are about to remove all ${routineRows.length} scheduled subject routines for "${activeExam?.name || 'this exam session'}".`}
        entityName={`${routineRows.length} Scheduled Subjects`}
        entityType="Full Examination Routine"
        requireAck={false}
        requireNameMatch={false}
        confirmButtonText="Clear Entire Routine"
        warningMessage="This will clear all scheduled dates, examiners, and routine slots for this examination session. You can regenerate them at any time using Auto-Populate."
      />
    </div>
  );
}
