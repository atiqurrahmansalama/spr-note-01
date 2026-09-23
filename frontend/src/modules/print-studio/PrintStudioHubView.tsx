import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import UniversalPrintStudio from '../../components/print/UniversalPrintStudio';
import { useTranslation } from '../../i18n';
import { PrintStudioProps } from './types';
import type { TemplatePlaceholderKey } from '../../components/print/docxTemplateEngine';
import {
  DAILY_PROGRESS_SCOPE_ID,
  DAILY_PROGRESS_DOCLAB_KEYS,
} from '../learning/daily-classroom/daily-progress/dailyProgressDocLabKeys';

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

  // Initial Sample Columns for Table & Tabular Document Designer
  const initialColumns = useMemo(
    () => [
      { id: 'roll', header: 'Roll No', label: 'Roll No', accessor: 'roll' },
      { id: 'name', header: 'Student Name', label: 'Student Name', accessor: 'name' },
      { id: 'department', header: 'Department', label: 'Department', accessor: 'department' },
      { id: 'class_section', header: 'Class & Section', label: 'Class & Section', accessor: 'class_section' },
      { id: 'progress', header: 'Quran Progress / Status', label: 'Quran Progress / Status', accessor: 'progress' },
      { id: 'evaluation', header: 'Evaluation / Remarks', label: 'Evaluation / Remarks', accessor: 'evaluation' },
    ],
    []
  );

  // Initial Sample Rows for Instant WYSIWYG Editing (General Scopes)
  const initialData = useMemo(
    () => [
      {
        id: '1',
        roll: '01',
        name: 'Abdullah Al Mamun',
        department: 'Tahfizul Quran',
        class_section: 'Hifz - Sec A',
        progress: 'Juz 30 (Complete)',
        evaluation: 'Excellent Tajweed & Fluency',
      },
      {
        id: '2',
        roll: '02',
        name: 'Muhammad Rayhan',
        department: 'Tahfizul Quran',
        class_section: 'Hifz - Sec A',
        progress: 'Juz 15 (Page 10-15)',
        evaluation: 'Regular & Attentive',
      },
      {
        id: '3',
        roll: '03',
        name: 'Abu Bakr Siddiq',
        department: 'Tahfizul Quran',
        class_section: 'Hifz - Sec B',
        progress: 'Juz 05 (Revision)',
        evaluation: 'Needs Makhraj Revision',
      },
      {
        id: '4',
        roll: '04',
        name: 'Zubair Ahmed',
        department: 'Tahfizul Quran',
        class_section: 'Hifz - Sec B',
        progress: 'Juz 22 (Page 1-5)',
        evaluation: 'Good Progress',
      },
      {
        id: '5',
        roll: '05',
        name: 'Tariq Hasan',
        department: 'Tahfizul Quran',
        class_section: 'Hifz - Sec A',
        progress: 'Juz 28 (Sabaq)',
        evaluation: 'Clear Pronunciation',
      },
    ],
    []
  );

  // Check if session storage has data forwarded from user-picked modal
  const forwardedDailyProgressData = useMemo(() => {
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
    if (isDailyProgressScope) {
      return forwardedDailyProgressData || [];
    }
    return initialData;
  }, [forwardedDailyProgressData, isDailyProgressScope, initialData]);

  // Metadata items displayed at the top of the generated document
  const initialMetaItems = useMemo(
    () => [
      { label: 'Academic Session', value: '2025 - 2026' },
      { label: 'Department', value: 'Tahfizul Quran' },
      { label: 'Branch / Campus', value: 'Main Campus' },
      { label: 'Generated Date', value: new Date().toLocaleDateString() },
    ],
    []
  );

  const handleClose = useCallback(() => {
    setIsOpen(false);
    if (returnUrlParam) {
      navigate(returnUrlParam);
    } else {
      navigate(-1);
    }
  }, [navigate, returnUrlParam]);

  return (
    <div className={`w-full min-h-screen ${className}`}>
      <UniversalPrintStudio
        isOpen={isOpen}
        onClose={handleClose}
        title={
          isDailyProgressScope
            ? 'Daily Progress & Hifz Report Studio'
            : 'Universal Print & Document Studio'
        }
        subtitle={
          isDailyProgressScope
            ? 'Design, Upload, and Customize Daily Progress Document Templates'
            : 'Universal Document, Template & Report Publishing Studio'
        }
        columns={isDailyProgressScope ? [] : initialColumns}
        data={activeData}
        metaItems={isDailyProgressScope ? [] : initialMetaItems}
        templates={[]}
        placeholderKeys={
          isDailyProgressScope ? DAILY_PROGRESS_DOCLAB_KEYS : standardPlaceholderKeys
        }
        showSectionsAndBars={true}
        showSectionsBar={true}
        showDisplayBars={true}
        showDataDisplay={true}
        showColumns={!isDailyProgressScope}
        showRows={!isDailyProgressScope}
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
