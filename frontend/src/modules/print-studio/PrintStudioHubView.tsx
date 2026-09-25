import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import UniversalPrintStudio from '../../components/print/UniversalPrintStudio';
import { useTranslation } from '../../i18n';
import { PrintStudioProps } from './types';
import type { TemplatePlaceholderKey } from '../../components/print/docxTemplateEngine';
import {
  DAILY_PROGRESS_SCOPE_ID,
  DAILY_PROGRESS_DOCLAB_KEYS,
} from '../learning/progress-management';
import {
  SUBJECT_ROUTINE_SCOPE_ID,
  SUBJECT_ROUTINE_DOCLAB_KEYS,
} from '../examinations/exam-schedules/subject-routine';

/**
 * Enterprise DocLab Studio Hub View
 * 
 * Directly mounts and orchestrates the Universal DocLab Studio,
 * powered by DocxLiveRenderer, DocxTemplateModal, and UniversalPrintEngine.
 */
export default function PrintStudioHubView({
  className = '',
}: PrintStudioProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const scopeParam = searchParams.get('scope') || 'general_document';
  const returnUrlParam = searchParams.get('returnUrl');

  const { t } = useTranslation('navigation');
  const [isOpen, setIsOpen] = useState(true);

  const isDailyProgressScope = scopeParam === DAILY_PROGRESS_SCOPE_ID;
  const isSubjectRoutineScope = scopeParam === SUBJECT_ROUTINE_SCOPE_ID;
  const isCustomScoped = isDailyProgressScope || isSubjectRoutineScope;

  // Standard SPR Note Placeholder Taxonomy for Docx Templates & Custom Sheets
  const standardPlaceholderKeys: TemplatePlaceholderKey[] = useMemo(
    () => [
      { key: 'student_name', label: 'Student Full Name', category: 'student', example: 'Abdullah Al Mamun' },
      { key: 'roll_number', label: 'Roll Number', category: 'student', example: '01' },
      { key: 'admission_no', label: 'Admission Number', category: 'student', example: 'ADM-2026-089' },
      { key: 'guardian_name', label: 'Father / Guardian Name', category: 'student', example: 'Mohammad Ali' },
      { key: 'guardian_phone', label: 'Guardian Contact', category: 'student', example: '+880 1712-345678' },
      { key: 'class_name', label: 'Class / Grade', category: 'academic', example: 'Hifzul Quran' },
      { key: 'section_name', label: 'Section / Branch', category: 'academic', example: 'Section A (Morning)' },
      { key: 'department_name', label: 'Department', category: 'academic', example: 'Tahfiz & Qiraat' },
      { key: 'academic_session', label: 'Academic Session', category: 'academic', example: '2025 - 2026' },
      { key: 'institution_name', label: 'Institution Name', category: 'general', example: 'Jamia Islamia Markaz' },
      { key: 'campus_address', label: 'Campus Address', category: 'general', example: 'Dhaka, Bangladesh' },
      { key: 'issue_date', label: 'Document Issue Date', category: 'general', example: new Date().toLocaleDateString() },
      { key: 'total_marks', label: 'Total Marks', category: 'exam', example: '100' },
      { key: 'obtained_marks', label: 'Obtained Marks', category: 'exam', example: '95' },
      { key: 'grade', label: 'Final Grade', category: 'exam', example: 'A+ (Mumtaz)' },
    ],
    []
  );

  // Check if session storage has data forwarded from user-picked modal
  const forwardedScopeData = useMemo(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem(`spr_doclab_scope_data_${scopeParam}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return null;
  }, [scopeParam]);

  // Strictly user-picked data: blank if not selected by user
  const activeData = useMemo(() => {
    return forwardedScopeData || [];
  }, [forwardedScopeData]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    if (returnUrlParam) {
      navigate(returnUrlParam);
    } else {
      navigate(-1);
    }
  }, [navigate, returnUrlParam]);

  const studioTitle = isDailyProgressScope
    ? 'Daily Progress & Hifz Report Studio'
    : isSubjectRoutineScope
    ? 'Examination Subject Routine Studio'
    : 'Universal Print & Document Studio';

  const studioSubtitle = isDailyProgressScope
    ? 'Design, Upload, and Customize Daily Progress Document Templates'
    : isSubjectRoutineScope
    ? 'Design, Upload, and Customize Examination Routine Document Templates'
    : 'Universal Document, Template & Report Publishing Studio';

  const activePlaceholderKeys = isDailyProgressScope
    ? DAILY_PROGRESS_DOCLAB_KEYS
    : isSubjectRoutineScope
    ? SUBJECT_ROUTINE_DOCLAB_KEYS
    : standardPlaceholderKeys;

  return (
    <div className={`w-full min-h-screen ${className}`}>
      <UniversalPrintStudio
        isOpen={isOpen}
        onClose={handleClose}
        title={studioTitle}
        subtitle={studioSubtitle}
        columns={[]}
        data={activeData}
        metaItems={[]}
        templates={[]}
        placeholderKeys={activePlaceholderKeys}
        showSectionsAndBars={true}
        showSectionsBar={true}
        showDisplayBars={true}
        showDataDisplay={true}
        showColumns={false}
        showRows={false}
        showHeaderSection={true}
        showWatermarkSection={true}
        showSignaturesSection={true}
        scopeId={scopeParam}
        activeTemplateId="blank_document"
        showPrint={true}
        showPDF={true}
        showWord={true}
        showExcel={true}
        showTxt={true}
        showImages={true}
      />
    </div>
  );
}
