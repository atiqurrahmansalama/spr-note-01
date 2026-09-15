import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import UniversalPrintStudio from '../../components/print/UniversalPrintStudio';
import { useTranslation } from '../../i18n';
import { PrintStudioProps } from './types';
import { TemplatePlaceholderKey } from '../../components/print/docxTemplateEngine';

/**
 * Enterprise Print Studio Hub View
 * 
 * Directly mounts and orchestrates the Universal Print & Export Studio,
 * powered by DocxLiveRenderer, DocxTemplateModal, and UniversalPrintEngine.
 */
export default function PrintStudioHubView({
  className = '',
}: PrintStudioProps) {
  const navigate = useNavigate();
  const { t } = useTranslation('navigation');
  const [isOpen, setIsOpen] = useState(true);

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

  // Initial Sample Rows for Instant WYSIWYG Editing
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
    navigate(-1);
  }, [navigate]);

  return (
    <div className={`w-full min-h-screen ${className}`}>
      <UniversalPrintStudio
        isOpen={isOpen}
        onClose={handleClose}
        title={t('printStudio', 'Print Studio')}
        subtitle="Universal Document, Template & Report Publishing Studio"
        columns={initialColumns}
        data={initialData}
        metaItems={initialMetaItems}
        placeholderKeys={standardPlaceholderKeys}
        showSectionsAndBars={true}
        showSectionsBar={true}
        showDisplayBars={true}
        showDataDisplay={true}
        showColumns={true}
        showRows={true}
        showHeaderSection={true}
        showWatermarkSection={true}
        showSignaturesSection={true}
        scopeId="general_document"
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
