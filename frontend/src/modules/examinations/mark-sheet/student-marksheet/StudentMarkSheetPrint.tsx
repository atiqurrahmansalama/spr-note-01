import React, { useMemo } from 'react';
import UniversalPrintStudio from '@/components/print/UniversalPrintStudio';
import { useTenant } from '@/context/TenantContext';
import { TranscriptPrintProps } from '../types';
import {
  STUDENT_MARKSHEET_TAXONOMY_KEYS,
  STUDENT_MARKSHEET_REQUIRED_KEYS,
  buildSingleStudentTranscriptData,
  buildBulkStudentTranscriptData,
} from './studentTranscriptDataBuilder';

/**
 * StudentMarkSheetPrint
 * Master Student Mark Sheet & Bulk Academic Transcript Print Studio.
 * Fully decoupled from presentation markup: supplies student data models,
 * key taxonomy, and scope metadata to UniversalPrintStudio.
 * Word (.docx) templates set as default for this scope are automatically
 * ingested and populated for single or batch student printing.
 */
export default function StudentMarkSheetPrint({
  isOpen = false,
  onClose,
  exam = null,
  studentResult = null,
  studentsData = [],
  selectedStudentIds = [],
  initialMode = 'single',
  selectedClassName = 'Class',
  selectedSectionName = 'All Sections',
  subjects = [],
  gradingSystem = null,
}: TranscriptPrintProps) {
  const { currentInstitution } = useTenant();

  const isBulk = initialMode === 'bulk' || (!studentResult && studentsData.length > 0);

  // Filter selected students if specified
  const filteredStudents = useMemo(() => {
    if (Array.isArray(selectedStudentIds) && selectedStudentIds.length > 0) {
      const idSet = new Set(selectedStudentIds.map(String));
      return studentsData.filter((s) => idSet.has(String(s.studentId)));
    }
    return studentsData;
  }, [studentsData, selectedStudentIds]);

  // Active student for single mode
  const activeStudent = useMemo(() => {
    return studentResult || filteredStudents[0] || null;
  }, [studentResult, filteredStudents]);

  // Enriched student data records (Single or Bulk)
  const enrichedData = useMemo(() => {
    if (isBulk) {
      return buildBulkStudentTranscriptData({
        studentsData: filteredStudents,
        allStudents: studentsData.length > 0 ? studentsData : filteredStudents,
        exam,
        className: selectedClassName,
        sectionName: selectedSectionName,
        institutionName: currentInstitution?.name,
        institutionAddress: currentInstitution?.address,
        subjects,
        gradingSystem,
      });
    }

    if (!activeStudent) return [];
    return [
      buildSingleStudentTranscriptData({
        studentResult: activeStudent,
        allStudents: studentsData.length > 0 ? studentsData : [activeStudent],
        exam,
        className: selectedClassName,
        sectionName: selectedSectionName,
        institutionName: currentInstitution?.name,
        institutionAddress: currentInstitution?.address,
        subjects,
        gradingSystem,
      }),
    ];
  }, [isBulk, filteredStudents, activeStudent, studentsData, exam, selectedClassName, selectedSectionName, currentInstitution, subjects, gradingSystem]);

  return (
    <UniversalPrintStudio
      isOpen={isOpen}
      onClose={onClose}
      title={
        isBulk
          ? `${exam?.name || 'Academic'} — Bulk Student Mark Sheets (${filteredStudents.length} Students)`
          : exam?.name
          ? `${exam.name} — Student Mark Sheet`
          : 'Academic Transcript & Mark Sheet'
      }
      subtitle={isBulk ? `Class: ${selectedClassName} • Batch Print` : `Class: ${selectedClassName}`}
      data={enrichedData}
      placeholderKeys={STUDENT_MARKSHEET_TAXONOMY_KEYS}
      requiredKeys={STUDENT_MARKSHEET_REQUIRED_KEYS}
      scopeId="marksheet_transcript"
      scopeName="Student MarkSheet & Transcript"
      scopeDescription="Individual student academic evaluation, marks breakdown, GPA, and merit ranking report card."
      urlSync={true}
      urlParam="print"
      urlParamValue={isBulk ? 'bulk_student_marksheet' : 'student_marksheet'}
    />
  );
}

// Re-export with legacy alias for full backwards compatibility
export { StudentMarkSheetPrint as TranscriptPrint };
