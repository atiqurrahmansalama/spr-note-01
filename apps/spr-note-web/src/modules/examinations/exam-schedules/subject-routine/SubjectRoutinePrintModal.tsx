import React, { useMemo } from 'react';
import DocLabQuickDocumentModal from '@/components/print/DocLabQuickDocumentModal';
import {
  SUBJECT_ROUTINE_SCOPE_ID,
  buildSubjectRoutineReportData,
  SubjectRoutineAcademicContext,
} from './subjectRoutineDocLabKeys';
import { SubjectRoutineItem } from './types';

export interface SubjectRoutinePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeExam?: any;
  routineRows?: SubjectRoutineItem[];
  academicContext?: SubjectRoutineAcademicContext;
}

/**
 * SubjectRoutinePrintModal
 * 
 * Dedicated Document Modal for Subject Routine.
 * 100% Template-Driven:
 * - Uses DocLabQuickDocumentModal for high-fidelity DOCX rendering and printing.
 * - Merges Subject Routine live session data into user-uploaded templates.
 * - Allows switching templates, uploading new .docx templates, and printing.
 */
export default function SubjectRoutinePrintModal({
  isOpen,
  onClose,
  activeExam = null,
  routineRows = [],
  academicContext = {},
}: SubjectRoutinePrintModalProps) {
  // Build normalized DocLab data record for active exam session and routine rows
  const reportDataRecord = useMemo(() => {
    return buildSubjectRoutineReportData(routineRows, activeExam, academicContext);
  }, [routineRows, activeExam, academicContext]);

  if (!isOpen) return null;

  return (
    <DocLabQuickDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      scopeId={SUBJECT_ROUTINE_SCOPE_ID}
      scopeName="Subject Routine"
      title={activeExam?.name ? `${activeExam.name} — Subject Routine` : 'Subject Routine Report'}
      returnUrl="/examinations/routine-matrix"
      dataRecord={reportDataRecord}
    />
  );
}
