import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import PageContainer from '@/components/layout/PageContainer';
import TabSwitcher from '@/components/ui/TabSwitcher';
import MarkSheetFilterBar from './MarkSheetFilterBar';
import MarkEntryDeskView from './mark-entry/MarkEntryDeskView';
import TabulationLedgerTab from './tabulation-ledger/TabulationLedgerTab';
import MarkSheetHeader from './MarkSheetHeader';
import MarkSheetPrint from './tabulation-ledger/MarkSheetPrint';
import StudentMarkSheetView from './student-marksheet/StudentMarkSheetView';
import StudentMarkSheetPrint from './student-marksheet/StudentMarkSheetPrint';
import {
  ChartBarIcon,
  AcademicCapIcon,
  PrinterIcon,
  DocumentIcon,
  EditIcon,
} from '@/components/ui/Icons';
import useExamData from '../hooks/useExamData';
import useTabulationData from '../hooks/useTabulationData';
import { MarkSheetLedgerViewProps, OptionItem } from './types';

/**
 * MarkSheetLedgerView (Master Mark Sheet & Tabulation Hub)
 * Master router and unified console for Mark Entry Desk, Tabulation Ledger and Transcript Studio.
 */
export default function MarkSheetLedgerView({
  initialExamId = null,
  initialStudentId = null,
  defaultSubTab = null,
  isEmbedded = false,
}: MarkSheetLedgerViewProps) {
  const {
    tenantId,
    exams,
    students,
    classOptions,
    departmentOptions,
    sectionOptions,
    examSubjects,
  } = useExamData();

  // URL Search Params Hydration
  const urlParams = useMemo(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search);
    }
    return new URLSearchParams();
  }, []);

  const urlExamId = urlParams.get('examId') || urlParams.get('exam');
  const urlSubjectId = urlParams.get('subjectId') || urlParams.get('subject');
  const urlDepartmentId = urlParams.get('departmentId') || urlParams.get('dept');
  const urlClassId = urlParams.get('classId') || urlParams.get('class');
  const urlSectionId = urlParams.get('sectionId') || urlParams.get('section');
  const urlStudentId = urlParams.get('studentId') || urlParams.get('student');
  const urlPrint = urlParams.get('print');

  const resolveActiveSubTab = (): 'entry' | 'ledger' | 'transcripts' => {
    // 1. URL searchParams `tab` has highest priority
    const tabParam = urlParams.get('tab')?.toLowerCase();
    if (tabParam === 'entry' || tabParam === 'mark-entry' || tabParam === 'mark_entry') {
      return 'entry';
    }
    if (tabParam === 'transcripts' || tabParam === 'transcript' || tabParam === 'studio') {
      return 'transcripts';
    }
    if (tabParam === 'ledger' || tabParam === 'tabulation' || tabParam === 'marksheet' || tabParam === 'mark-sheet') {
      return 'ledger';
    }

    // 2. Specific pathname checks
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      if (path.includes('mark-entry') || path.includes('mark_entry')) return 'entry';
      if (path.includes('transcripts') || path.includes('transcript')) return 'transcripts';
      if (
        path.includes('tabulation') ||
        path.includes('marksheet') ||
        path.includes('mark-sheet') ||
        path.includes('tabulation-sheet')
      ) {
        return 'ledger';
      }
    }

    // 3. Fallback to defaultSubTab prop
    if (defaultSubTab === 'entry' || (defaultSubTab as any) === 'MARK_ENTRY') return 'entry';
    if (defaultSubTab === 'transcripts' || (defaultSubTab as any) === 'STUDENT_MARKSHEET') return 'transcripts';
    if (defaultSubTab === 'ledger' || (defaultSubTab as any) === 'TABULATION' || (defaultSubTab as any) === 'MARKSHEET') return 'ledger';

    return 'entry';
  };

  const [selectedExamId, setSelectedExamId] = useState<string>(
    initialExamId ? String(initialExamId) : urlExamId || (exams[0]?.id ? String(exams[0].id) : '')
  );
  const [filterDepartmentId, setFilterDepartmentId] = useState<string>(urlDepartmentId || 'ALL');
  const [selectedClassId, setSelectedClassId] = useState<string>(
    urlClassId || (classOptions[0]?.value ? String(classOptions[0].value) : '')
  );
  const [selectedSectionId, setSelectedSectionId] = useState<string>(urlSectionId || 'ALL');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(urlSubjectId || '');
  const [activeSubTab, setActiveSubTab] = useState<'entry' | 'ledger' | 'transcripts'>(resolveActiveSubTab);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    initialStudentId ? String(initialStudentId) : urlStudentId || ''
  );

  const handleTabChange = (tabId: 'entry' | 'ledger' | 'transcripts') => {
    setActiveSubTab(tabId);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (tabId === 'entry') {
        url.searchParams.set('tab', 'entry');
        if (url.pathname.includes('/examinations/')) {
          url.pathname = '/examinations/mark-entry';
        }
      } else if (tabId === 'transcripts') {
        url.searchParams.set('tab', 'transcripts');
        if (url.pathname.includes('/examinations/')) {
          url.pathname = '/examinations/transcripts';
        }
      } else {
        url.searchParams.delete('tab');
        if (url.pathname.includes('/examinations/')) {
          url.pathname = '/examinations/marksheet';
        }
      }
      window.history.replaceState(null, '', url.toString());
    }
  };

  // Sync external defaultSubTab prop changes
  useEffect(() => {
    if (defaultSubTab) {
      if (defaultSubTab === 'entry' || (defaultSubTab as any) === 'MARK_ENTRY') {
        setActiveSubTab('entry');
      } else if (defaultSubTab === 'transcripts' || (defaultSubTab as any) === 'STUDENT_MARKSHEET') {
        setActiveSubTab('transcripts');
      } else if (defaultSubTab === 'ledger' || (defaultSubTab as any) === 'TABULATION' || (defaultSubTab as any) === 'MARKSHEET') {
        setActiveSubTab('ledger');
      }
    }
  }, [defaultSubTab]);
  const [deskActions, setDeskActions] = useState<{
    exportCsv?: () => void;
    openCsvImport?: () => void;
    openPrint?: (mode?: 'single' | 'bulk') => void;
    openSupervisorUnlock?: () => void;
    isLocked?: boolean;
  }>({});

  const [isPrintStudioOpen, setIsPrintStudioOpen] = useState<boolean>(
    urlPrint === 'mark_sheet' ||
      urlPrint === 'marksheet' ||
      urlPrint === 'tabulation' ||
      urlPrint === 'ledger' ||
      urlPrint === 'bulk_marksheet' ||
      urlPrint === 'bulk_tabulation'
  );
  const [academicPrintMode, setAcademicPrintMode] = useState<'single' | 'bulk'>(
    urlPrint === 'bulk_marksheet' || urlPrint === 'bulk_tabulation' ? 'bulk' : 'single'
  );

  const handleOpenAcademicPrint = (mode: 'single' | 'bulk' = 'single') => {
    setAcademicPrintMode(mode);
    setIsPrintStudioOpen(true);
  };

  const [isStudentPrintOpen, setIsStudentPrintOpen] = useState<boolean>(
    urlPrint === 'student_marksheet' ||
      urlPrint === 'transcript' ||
      urlPrint === 'transcripts' ||
      urlPrint === 'bulk_student_marksheet'
  );
  const [studentPrintMode, setStudentPrintMode] = useState<'single' | 'bulk'>(
    urlPrint === 'bulk_student_marksheet' ? 'bulk' : 'single'
  );
  const [selectedStudentIdsForPrint, setSelectedStudentIdsForPrint] = useState<(string | number)[]>([]);

  const handleCloseAcademicPrint = useCallback(() => {
    setIsPrintStudioOpen(false);
  }, []);

  const handleCloseStudentPrint = useCallback(() => {
    setIsStudentPrintOpen(false);
    setSelectedStudentIdsForPrint([]);
  }, []);

  const handleOpenStudentPrint = useCallback((
    studentId?: string | number | null,
    mode: 'single' | 'bulk' = 'single',
    customIds?: (string | number)[]
  ) => {
    if (studentId) {
      setSelectedStudentId(String(studentId));
    }
    setStudentPrintMode(mode);
    if (customIds && customIds.length > 0) {
      setSelectedStudentIdsForPrint(customIds);
    } else {
      setSelectedStudentIdsForPrint([]);
    }
    setIsStudentPrintOpen(true);
  }, []);

  const handleViewStudentTranscript = useCallback((studentId: string | number) => {
    if (studentId) {
      setSelectedStudentId(String(studentId));
    }
    setActiveSubTab('transcripts');
  }, []);

  const hasInitializedClassRef = useRef(false);
  const hasInitializedExamRef = useRef(false);

  // Sync initialExamId prop
  useEffect(() => {
    if (initialExamId) {
      setSelectedExamId(String(initialExamId));
    }
  }, [initialExamId]);

  // Sync when exams become available on initial mount if not selected yet
  useEffect(() => {
    if (!hasInitializedExamRef.current && exams.length > 0) {
      hasInitializedExamRef.current = true;
      if (!selectedExamId) {
        setSelectedExamId(urlExamId || String(exams[0].id));
      }
    }
  }, [exams, selectedExamId, urlExamId]);

  // Sync when class options become available on initial mount if not selected yet
  useEffect(() => {
    if (!hasInitializedClassRef.current && classOptions.length > 0) {
      hasInitializedClassRef.current = true;
      if (!selectedClassId && urlClassId) {
        setSelectedClassId(urlClassId);
      } else if (!selectedClassId) {
        setSelectedClassId(String(classOptions[0].value));
      }
    }
  }, [classOptions, selectedClassId, urlClassId]);

  // Browser Back/Forward navigation listener
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = () => {
      const currentUrl = new URL(window.location.href);
      const path = currentUrl.pathname.toLowerCase();
      const printParam = currentUrl.searchParams.get('print');
      setIsPrintStudioOpen(
        printParam === 'mark_sheet' ||
          printParam === 'marksheet' ||
          printParam === 'tabulation' ||
          printParam === 'ledger'
      );
      setIsStudentPrintOpen(
        printParam === 'student_marksheet' ||
          printParam === 'transcript' ||
          printParam === 'transcripts'
      );

      const tabParam = currentUrl.searchParams.get('tab');
      if (
        path.includes('mark-entry') ||
        path.includes('mark_entry') ||
        tabParam === 'entry' ||
        tabParam === 'mark-entry' ||
        tabParam === 'mark_entry'
      ) {
        setActiveSubTab('entry');
      } else if (
        path.includes('transcripts') ||
        path.includes('transcript') ||
        tabParam === 'transcripts' ||
        tabParam === 'transcript'
      ) {
        setActiveSubTab('transcripts');
      } else {
        setActiveSubTab('ledger');
      }

      const examParam = currentUrl.searchParams.get('examId') || currentUrl.searchParams.get('exam');
      if (examParam) setSelectedExamId(examParam);

      const classParam = currentUrl.searchParams.get('classId') || currentUrl.searchParams.get('class');
      if (classParam !== null) setSelectedClassId(classParam);

      const secParam = currentUrl.searchParams.get('sectionId') || currentUrl.searchParams.get('section');
      if (secParam) setSelectedSectionId(secParam);

      const subParam = currentUrl.searchParams.get('subjectId') || currentUrl.searchParams.get('subject');
      if (subParam) setSelectedSubjectId(subParam);

      const deptParam = currentUrl.searchParams.get('departmentId') || currentUrl.searchParams.get('dept');
      if (deptParam) setFilterDepartmentId(deptParam);

      const stParam = currentUrl.searchParams.get('studentId') || currentUrl.searchParams.get('student');
      if (stParam) setSelectedStudentId(stParam);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Synchronize state changes to URL query parameters
  useEffect(() => {
    if (isEmbedded || typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    let changed = false;

    // 1. Tab Sync
    if (activeSubTab) {
      if (activeSubTab === 'entry') {
        if (url.searchParams.get('tab') !== 'entry') {
          url.searchParams.set('tab', 'entry');
          changed = true;
        }
      } else if (activeSubTab === 'transcripts') {
        if (url.searchParams.get('tab') !== 'transcripts') {
          url.searchParams.set('tab', 'transcripts');
          changed = true;
        }
      } else if (url.searchParams.has('tab')) {
        url.searchParams.delete('tab');
        changed = true;
      }
    }

    // 2. Exam Sync
    if (selectedExamId) {
      if (url.searchParams.get('examId') !== selectedExamId) {
        url.searchParams.set('examId', selectedExamId);
        changed = true;
      }
    } else if (url.searchParams.has('examId')) {
      url.searchParams.delete('examId');
      changed = true;
    }

    // 3. Class Sync
    if (selectedClassId) {
      if (url.searchParams.get('classId') !== selectedClassId) {
        url.searchParams.set('classId', selectedClassId);
        changed = true;
      }
    } else if (url.searchParams.has('classId')) {
      url.searchParams.delete('classId');
      changed = true;
    }

    // 4. Section Sync
    if (selectedSectionId && selectedSectionId !== 'ALL') {
      if (url.searchParams.get('sectionId') !== selectedSectionId) {
        url.searchParams.set('sectionId', selectedSectionId);
        changed = true;
      }
    } else if (url.searchParams.has('sectionId')) {
      url.searchParams.delete('sectionId');
      changed = true;
    }

    // 5. Department Sync
    if (filterDepartmentId && filterDepartmentId !== 'ALL') {
      if (url.searchParams.get('departmentId') !== filterDepartmentId) {
        url.searchParams.set('departmentId', filterDepartmentId);
        changed = true;
      }
    } else if (url.searchParams.has('departmentId')) {
      url.searchParams.delete('departmentId');
      changed = true;
    }

    // 6. Subject Sync (specifically for Mark Entry Desk)
    if (activeSubTab === 'entry' && selectedSubjectId) {
      if (url.searchParams.get('subjectId') !== selectedSubjectId) {
        url.searchParams.set('subjectId', selectedSubjectId);
        changed = true;
      }
    } else if (activeSubTab !== 'entry' && url.searchParams.has('subjectId')) {
      url.searchParams.delete('subjectId');
      changed = true;
    }

    // 7. Student Sync (specifically for Student Transcripts)
    if (activeSubTab === 'transcripts' && selectedStudentId) {
      if (url.searchParams.get('studentId') !== selectedStudentId) {
        url.searchParams.set('studentId', selectedStudentId);
        changed = true;
      }
    } else if (activeSubTab !== 'transcripts' && url.searchParams.has('studentId')) {
      url.searchParams.delete('studentId');
      changed = true;
    }

    if (changed) {
      window.history.replaceState(null, '', url.toString());
    }
  }, [
    activeSubTab,
    selectedExamId,
    selectedClassId,
    selectedSectionId,
    filterDepartmentId,
    selectedSubjectId,
    selectedStudentId,
    isEmbedded,
  ]);

  // Exam Options
  const examOptions = useMemo(() => {
    return exams.map((e: any) => ({
      value: String(e.id),
      label: `${e.name} (${e.academicYearName || 'Session'})`,
    }));
  }, [exams]);

  // Filtered Class Options
  const filteredClassOptions = useMemo(() => {
    let list = classOptions;

    const selectedExamObj = exams.find((e: any) => String(e.id) === String(selectedExamId));
    if (
      selectedExamObj &&
      Array.isArray(selectedExamObj.targetClassIds) &&
      selectedExamObj.targetClassIds.length > 0
    ) {
      const targetSet = new Set(selectedExamObj.targetClassIds.map((id: any) => String(id)));
      const hasMatch = list.some((c: OptionItem) => targetSet.has(String(c.value)));
      if (hasMatch) {
        list = list.filter((c: OptionItem) => targetSet.has(String(c.value)));
      }
    }

    if (filterDepartmentId && filterDepartmentId !== 'ALL') {
      list = list.filter((c: OptionItem) => {
        if (c.departmentId && String(c.departmentId) === String(filterDepartmentId)) {
          return true;
        }
        return (examSubjects || []).some(
          (s: any) =>
            String(s.classId) === String(c.value) &&
            (s.departmentId === 'ALL' || String(s.departmentId) === String(filterDepartmentId))
        );
      });
    }

    return [{ value: '', label: 'All Classes' }, ...list];
  }, [classOptions, exams, selectedExamId, filterDepartmentId, examSubjects]);

  // Filtered Section Options
  const filteredSectionOptions = useMemo(() => {
    let rawList = sectionOptions.filter((s: OptionItem) => s.value !== 'ALL');

    if (selectedClassId) {
      rawList = rawList.filter((s: OptionItem) => {
        if (s.classId && String(s.classId) === String(selectedClassId)) return true;
        return (examSubjects || []).some(
          (sub: any) =>
            String(sub.classId) === String(selectedClassId) &&
            String(sub.sectionId) === String(s.value)
        );
      });
    } else if (filterDepartmentId && filterDepartmentId !== 'ALL') {
      const allowedClassIds = new Set(
        filteredClassOptions
          .map((c: OptionItem) => String(c.value))
          .filter((v: string) => v && v !== '')
      );
      rawList = rawList.filter((s: OptionItem) => s.classId && allowedClassIds.has(String(s.classId)));
    }

    return [{ value: 'ALL', label: 'All Sections (Class Wide)' }, ...rawList];
  }, [sectionOptions, selectedClassId, filterDepartmentId, filteredClassOptions, examSubjects]);

  // Cascading Auto-Select: When Department changes, ensure Class is valid
  useEffect(() => {
    const validClasses = filteredClassOptions.filter((c: OptionItem) => c.value && c.value !== '');
    if (validClasses.length > 0) {
      const isCurrentValid = validClasses.some((c: OptionItem) => String(c.value) === String(selectedClassId));
      if (!isCurrentValid) {
        setSelectedClassId(String(validClasses[0].value));
        setSelectedSectionId('ALL');
      }
    } else {
      setSelectedClassId('');
      setSelectedSectionId('ALL');
    }
  }, [filterDepartmentId, filteredClassOptions]);

  // Cascading Auto-Reset: When Class changes, ensure Section is valid
  useEffect(() => {
    if (selectedSectionId && selectedSectionId !== 'ALL') {
      const isValidSection = filteredSectionOptions.some(
        (s: OptionItem) => s.value !== 'ALL' && String(s.value) === String(selectedSectionId)
      );
      if (!isValidSection) {
        setSelectedSectionId('ALL');
      }
    }
  }, [selectedClassId, filteredSectionOptions]);

  // Filtered Subject Routines for selected Exam & Scope
  const availableSubjects = useMemo(() => {
    if (!selectedExamId) return [];
    let list = (examSubjects || []).filter((s: any) => String(s.examId) === String(selectedExamId));

    if (filterDepartmentId && filterDepartmentId !== 'ALL') {
      list = list.filter(
        (s: any) => s.departmentId === 'ALL' || String(s.departmentId) === String(filterDepartmentId)
      );
    }

    if (selectedClassId) {
      list = list.filter((s: any) => String(s.classId) === String(selectedClassId));
    }

    if (selectedSectionId && selectedSectionId !== 'ALL') {
      list = list.filter(
        (s: any) => s.sectionId === 'ALL' || String(s.sectionId) === String(selectedSectionId)
      );
    }

    return list;
  }, [examSubjects, selectedExamId, filterDepartmentId, selectedClassId, selectedSectionId]);

  // Subject Dropdown Options
  const subjectOptions = useMemo(() => {
    return availableSubjects.map((s: any) => {
      const book = (s.curriculumBookName || '').trim();
      const subject = (s.subjectName || 'Subject').trim();
      const code = (s.subjectCode || '').trim();

      let label = subject;
      if (book && book.toLowerCase() !== subject.toLowerCase()) {
        label = `${book} — ${subject}`;
      }
      if (code && !label.includes(code)) {
        label = `${label} (${code})`;
      }

      return {
        value: String(s.id),
        label,
        subject: s,
      };
    });
  }, [availableSubjects]);

  // Selected Subject Routine
  const selectedSubject = useMemo(() => {
    if (!selectedSubjectId) {
      return availableSubjects[0] || null;
    }
    return (
      availableSubjects.find((s: any) => String(s.id) === String(selectedSubjectId)) ||
      availableSubjects[0] ||
      null
    );
  }, [availableSubjects, selectedSubjectId]);

  // Auto-sync first subject when availableSubjects change
  useEffect(() => {
    if (availableSubjects.length > 0) {
      const isCurrentValid = availableSubjects.some(
        (s: any) => String(s.id) === String(selectedSubjectId)
      );
      if (!isCurrentValid) {
        setSelectedSubjectId(String(availableSubjects[0].id));
      }
    } else {
      setSelectedSubjectId('');
    }
  }, [availableSubjects, selectedSubjectId]);

  const {
    exam,
    subjects,
    studentsData,
    gradingSystem,
    totalStudents,
    passedCount,
    failedCount,
    passPercentage,
    stats,
    exportToCsv,
  } = useTabulationData({
    tenantId,
    examId: selectedExamId,
    departmentId: filterDepartmentId,
    classId: selectedClassId,
    sectionId: selectedSectionId,
    students,
  });

  const selectedClassObj = useMemo(() => {
    return classOptions.find((c: OptionItem) => String(c.value) === String(selectedClassId));
  }, [classOptions, selectedClassId]);

  const selectedSectionObj = useMemo(() => {
    return sectionOptions.find((s: OptionItem) => String(s.value) === String(selectedSectionId));
  }, [sectionOptions, selectedSectionId]);

  const selectedClassName = selectedClassObj?.label || 'All Classes';
  const selectedSectionName =
    selectedSectionId === 'ALL' ? 'All Sections' : selectedSectionObj?.label || 'Section';

  const activeDeptObj = useMemo(() => {
    return departmentOptions.find((d: OptionItem) => String(d.value) === String(filterDepartmentId));
  }, [departmentOptions, filterDepartmentId]);

  // Total maximum marks across all subjects in this examination/class
  const totalMaxMarks = useMemo(() => {
    return (subjects || []).reduce((acc: number, sub: any) => acc + (Number(sub.fullMarks) || 0), 0);
  }, [subjects]);

  const subTabs = useMemo(
    () => [
      {
        id: 'entry' as const,
        label: 'Mark Entry Desk',
        icon: EditIcon,
      },
      {
        id: 'ledger' as const,
        label: 'Academic MarkSheet',
        icon: AcademicCapIcon,
      },
      {
        id: 'transcripts' as const,
        label: 'Student MarkSheet',
        icon: DocumentIcon,
      },
    ],
    []
  );

  return (
    <PageContainer maxWidth="7xl" isEmbedded={isEmbedded}>
      {/* 1. Top Master Page Header with 3-Dot Action Menu for each Tab */}
      <MarkSheetHeader
        exam={exam}
        activeSubTab={activeSubTab}
        onExportCsv={activeSubTab === 'entry' ? deskActions.exportCsv : exportToCsv}
        onOpenCsvImport={deskActions.openCsvImport}
        onPrintAwardList={() => deskActions.openPrint?.('single')}
        onBulkPrintSubjectMarkSheet={() => deskActions.openPrint?.('bulk')}
        onOpenSupervisorUnlock={deskActions.openSupervisorUnlock}
        isLocked={deskActions.isLocked}
        onOpenPrintStudio={() => handleOpenAcademicPrint('single')}
        onBulkPrintAcademicMarkSheet={() => handleOpenAcademicPrint('bulk')}
        onOpenTranscripts={() => handleTabChange('transcripts')}
        onSwitchToLedger={() => handleTabChange('ledger')}
        onSwitchToEntry={() => handleTabChange('entry')}
        onPrintCurrentMarkSheet={() => handleOpenStudentPrint(selectedStudentId, 'single')}
        onBulkPrintStudentMarkSheet={() => handleOpenStudentPrint(null, 'bulk')}
      />

      {/* 2. Unified Project-Standard TabSwitcher */}
      <TabSwitcher
        tabs={subTabs}
        activeTab={activeSubTab}
        onChange={(tabId: any) => handleTabChange(tabId)}
        className="print:hidden"
      />

      {/* 3. Universal Shared Academic Filter Console (For All 3 Tabs) */}
      <MarkSheetFilterBar
        examOptions={examOptions}
        selectedExamId={selectedExamId}
        onExamChange={setSelectedExamId}
        departmentOptions={departmentOptions}
        selectedDepartmentId={filterDepartmentId}
        onDepartmentChange={setFilterDepartmentId}
        classOptions={filteredClassOptions}
        selectedClassId={selectedClassId}
        onClassChange={setSelectedClassId}
        sectionOptions={filteredSectionOptions}
        selectedSectionId={selectedSectionId}
        onSectionChange={setSelectedSectionId}
        subjectOptions={subjectOptions}
        selectedSubjectId={selectedSubjectId}
        onSubjectChange={setSelectedSubjectId}
        selectedSubject={selectedSubject}
        availableSubjects={availableSubjects}
        showSubject={activeSubTab === 'entry'}
        selectedClassName={selectedClassName}
        selectedSectionName={selectedSectionName}
        gradingSystem={gradingSystem}
      />

      {/* 4. Main View Content */}
      {activeSubTab === 'entry' ? (
        <MarkEntryDeskView
          selectedExamId={selectedExamId}
          selectedSubjectId={selectedSubjectId}
          selectedDepartmentId={filterDepartmentId}
          selectedClassId={selectedClassId}
          selectedSectionId={selectedSectionId}
          selectedSubject={selectedSubject}
          hideFilterBar={true}
          isEmbedded={true}
          onRegisterActions={setDeskActions}
          onNavigateToTabulation={() => handleTabChange('ledger')}
          onNavigateToTranscripts={(studentId: any) => {
            if (studentId) setSelectedStudentId(String(studentId));
            handleTabChange('transcripts');
          }}
        />
      ) : !selectedExamId ? (
        <div className="p-12 text-center border theme-border rounded-2xl theme-bg-surface/50 shadow-xs">
          <ChartBarIcon className="w-12 h-12 mx-auto theme-accent opacity-60 mb-3" />
          <h3 className="text-base font-bold theme-text-primary">Select Examination</h3>
          <p className="text-xs theme-text-secondary mt-1 max-w-md mx-auto">
            Choose an examination term from above to render the master mark sheet ledger and student transcripts.
          </p>
        </div>
      ) : activeSubTab === 'transcripts' ? (
        <StudentMarkSheetView
          exam={exam}
          selectedClassId={selectedClassId}
          selectedClassName={selectedClassName}
          selectedSectionId={selectedSectionId}
          selectedSectionName={selectedSectionName}
          gradingSystem={gradingSystem}
          studentsData={studentsData}
          totalStudents={totalStudents}
          passedCount={passedCount}
          failedCount={failedCount}
          selectedStudentId={selectedStudentId}
          onSelectStudentId={setSelectedStudentId}
          onOpenStudentPrint={handleOpenStudentPrint}
          subjects={subjects}
        />
      ) : (
        <TabulationLedgerTab
          exam={exam}
          subjects={subjects}
          studentsData={studentsData}
          selectedClassId={selectedClassId}
          selectedClassName={selectedClassName}
          activeDeptObj={activeDeptObj}
          gradingSystem={gradingSystem}
          totalStudents={totalStudents}
          passedCount={passedCount}
          failedCount={failedCount}
          passPercentage={passPercentage}
          stats={stats}
          totalMaxMarks={totalMaxMarks}
          onViewStudentTranscript={handleViewStudentTranscript}
          onOpenPrintStudio={() => handleOpenAcademicPrint('single')}
        />
      )}

      {/* Master Mark Sheet (Tabulation Ledger) Print Studio */}
      <MarkSheetPrint
        isOpen={isPrintStudioOpen}
        onClose={handleCloseAcademicPrint}
        exam={exam}
        selectedClassId={selectedClassId}
        selectedClassName={selectedClassName}
        selectedSectionId={selectedSectionId}
        selectedSectionName={selectedSectionName}
        gradingSystem={gradingSystem}
        subjects={subjects}
        studentsData={studentsData}
        totalStudents={totalStudents}
        passedCount={passedCount}
        failedCount={failedCount}
        passPercentage={passPercentage}
        stats={stats}
        totalMaxMarks={totalMaxMarks}
        initialMode={academicPrintMode}
      />

      {/* Student Mark Sheet (Transcripts) Print Studio */}
      <StudentMarkSheetPrint
        isOpen={isStudentPrintOpen}
        onClose={handleCloseStudentPrint}
        exam={exam}
        studentResult={
          selectedStudentId && Array.isArray(studentsData)
            ? studentsData.find((s) => String(s.studentId) === String(selectedStudentId)) || null
            : null
        }
        studentsData={studentsData}
        selectedStudentIds={selectedStudentIdsForPrint}
        selectedClassId={selectedClassId}
        selectedClassName={selectedClassName}
        selectedSectionId={selectedSectionId}
        selectedSectionName={selectedSectionName}
        gradingSystem={gradingSystem}
        subjects={subjects}
        totalStudents={totalStudents}
        initialMode={studentPrintMode}
      />
    </PageContainer>
  );
}
