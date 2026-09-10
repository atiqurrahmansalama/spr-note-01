import React, { useState, useMemo, useEffect, useRef } from 'react';
import PageContainer from '@/components/layout/PageContainer';
import TabSwitcher from '@/components/ui/TabSwitcher';
import CustomButton from '@/components/ui/CustomButton';
import MarkEntryFilterBar from '../mark-entry/components/MarkEntryFilterBar';
import TabulationLedgerTab from './tabulation-ledger/TabulationLedgerTab';
import MarkSheetHeader from './tabulation-ledger/MarkSheetHeader';
import MarkSheetPrint from './tabulation-ledger/MarkSheetPrint';
import TranscriptStudioTab from './transcript-studio/TranscriptStudioTab';
import StudentMarkSheetPrint from './transcript-studio/StudentMarkSheetPrint';
import {
  ChartBarIcon,
  AcademicCapIcon,
  PrinterIcon,
  DocumentIcon,
} from '@/components/ui/Icons';
import useExamData from '../hooks/useExamData';
import useTabulationData from '../hooks/useTabulationData';
import { MarkSheetLedgerViewProps, OptionItem } from './types';

/**
 * MarkSheetLedgerView (Master Mark Sheet Hub)
 * Master router and unified console for Tabulation Ledger and Transcript Studio.
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
  const urlDepartmentId = urlParams.get('departmentId') || urlParams.get('dept');
  const urlClassId = urlParams.get('classId') || urlParams.get('class');
  const urlSectionId = urlParams.get('sectionId') || urlParams.get('section');
  const urlStudentId = urlParams.get('studentId') || urlParams.get('student');
  const urlPrint = urlParams.get('print');

  const resolveActiveSubTab = (): 'ledger' | 'transcripts' => {
    if (defaultSubTab === 'transcripts') return 'transcripts';
    const tabParam = urlParams.get('tab');
    if (tabParam === 'transcripts' || tabParam === 'transcript' || tabParam === 'studio') {
      return 'transcripts';
    }
    return 'ledger';
  };

  const [selectedExamId, setSelectedExamId] = useState<string>(
    initialExamId ? String(initialExamId) : urlExamId || (exams[0]?.id ? String(exams[0].id) : '')
  );
  const [filterDepartmentId, setFilterDepartmentId] = useState<string>(urlDepartmentId || 'ALL');
  const [selectedClassId, setSelectedClassId] = useState<string>(
    urlClassId || (classOptions[0]?.value ? String(classOptions[0].value) : '')
  );
  const [selectedSectionId, setSelectedSectionId] = useState<string>(urlSectionId || 'ALL');
  const [activeSubTab, setActiveSubTab] = useState<'ledger' | 'transcripts'>(resolveActiveSubTab);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    initialStudentId ? String(initialStudentId) : urlStudentId || ''
  );
  const [isPrintStudioOpen, setIsPrintStudioOpen] = useState<boolean>(
    urlPrint === 'mark_sheet' ||
      urlPrint === 'marksheet' ||
      urlPrint === 'tabulation' ||
      urlPrint === 'ledger'
  );
  const [isStudentPrintOpen, setIsStudentPrintOpen] = useState<boolean>(
    urlPrint === 'student_marksheet' ||
      urlPrint === 'transcript' ||
      urlPrint === 'transcripts'
  );

  const handleViewStudentTranscript = (studentId: string | number) => {
    if (studentId) {
      setSelectedStudentId(String(studentId));
    }
    setActiveSubTab('transcripts');
  };

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
      if (tabParam === 'transcripts' || tabParam === 'transcript') {
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

      const deptParam = currentUrl.searchParams.get('departmentId') || currentUrl.searchParams.get('dept');
      if (deptParam) setFilterDepartmentId(deptParam);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Synchronize state changes to URL query parameters
  useEffect(() => {
    if (isEmbedded || typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    let changed = false;

    if (activeSubTab) {
      if (activeSubTab === 'transcripts') {
        if (url.searchParams.get('tab') !== 'transcripts') {
          url.searchParams.set('tab', 'transcripts');
          changed = true;
        }
      } else if (url.searchParams.has('tab')) {
        url.searchParams.delete('tab');
        changed = true;
      }
    }

    if (selectedExamId) {
      if (url.searchParams.get('examId') !== selectedExamId) {
        url.searchParams.set('examId', selectedExamId);
        changed = true;
      }
    }
    if (selectedClassId) {
      if (url.searchParams.get('classId') !== selectedClassId) {
        url.searchParams.set('classId', selectedClassId);
        changed = true;
      }
    } else if (url.searchParams.has('classId')) {
      url.searchParams.delete('classId');
      changed = true;
    }

    if (selectedSectionId && selectedSectionId !== 'ALL') {
      if (url.searchParams.get('sectionId') !== selectedSectionId) {
        url.searchParams.set('sectionId', selectedSectionId);
        changed = true;
      }
    } else if (url.searchParams.has('sectionId')) {
      url.searchParams.delete('sectionId');
      changed = true;
    }

    if (filterDepartmentId && filterDepartmentId !== 'ALL') {
      if (url.searchParams.get('departmentId') !== filterDepartmentId) {
        url.searchParams.set('departmentId', filterDepartmentId);
        changed = true;
      }
    } else if (url.searchParams.has('departmentId')) {
      url.searchParams.delete('departmentId');
      changed = true;
    }

    if (changed) {
      window.history.replaceState(null, '', url.toString());
    }
  }, [activeSubTab, selectedExamId, selectedClassId, selectedSectionId, filterDepartmentId, isEmbedded]);

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
  }, [selectedClassId, filteredSectionOptions, selectedSectionId]);

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

  const currentSelectedStudentResult = useMemo(() => {
    if (selectedStudentId) {
      const found = studentsData.find((s) => String(s.studentId) === String(selectedStudentId));
      if (found) return found;
    }
    return studentsData[0] || null;
  }, [studentsData, selectedStudentId]);

  const renderTabAction = () => {
    if (activeSubTab === 'ledger' && selectedExamId) {
      return (
        <CustomButton
          type="button"
          variant="sub"
          size="sm"
          icon={PrinterIcon}
          onClick={() => setIsPrintStudioOpen(true)}
          className="w-full sm:w-auto"
        >
          Print Ledger
        </CustomButton>
      );
    }
    if (activeSubTab === 'transcripts' && selectedExamId) {
      return (
        <CustomButton
          type="button"
          variant="sub"
          size="sm"
          icon={PrinterIcon}
          onClick={() => setIsStudentPrintOpen(true)}
          className="w-full sm:w-auto"
        >
          Print MarkSheet
        </CustomButton>
      );
    }
    return null;
  };

  return (
    <PageContainer maxWidth="7xl" isEmbedded={isEmbedded}>
      {/* 1. Top Header */}
      <MarkSheetHeader
        exam={exam}
        activeSubTab={activeSubTab}
        onExportCsv={exportToCsv}
        onOpenPrintStudio={() => setIsPrintStudioOpen(true)}
        onOpenTranscripts={() => setActiveSubTab('transcripts')}
        onSwitchToLedger={() => setActiveSubTab('ledger')}
        onPrintCurrentMarkSheet={() => setIsStudentPrintOpen(true)}
      />

      {/* 2. Unified Project-Standard TabSwitcher with Dynamic Action Button */}
      <TabSwitcher
        tabs={subTabs}
        activeTab={activeSubTab}
        onChange={(tabId: any) => setActiveSubTab(tabId)}
        rightContent={renderTabAction()}
        className="print:hidden"
      />

      {/* 3. Target Academic Filter Console */}
      <MarkEntryFilterBar
        examOptions={examOptions}
        selectedExamId={selectedExamId}
        setSelectedExamId={setSelectedExamId}
        onExamChange={(eId: string) => setSelectedExamId(eId)}
        departmentOptions={departmentOptions}
        filterDepartmentId={filterDepartmentId}
        setFilterDepartmentId={setFilterDepartmentId}
        onDepartmentChange={(deptId: string) => setFilterDepartmentId(deptId)}
        classOptions={filteredClassOptions}
        filterClassId={selectedClassId}
        selectedClassId={selectedClassId}
        setFilterClassId={setSelectedClassId}
        onClassChange={(cId: string) => setSelectedClassId(cId)}
        sectionOptions={filteredSectionOptions}
        filterSectionId={selectedSectionId}
        selectedSectionId={selectedSectionId}
        setFilterSectionId={setSelectedSectionId}
        onSectionChange={(sId: string) => setSelectedSectionId(sId)}
        showSubject={false}
        selectedClassName={selectedClassName}
        selectedSectionName={selectedSectionName}
        activeGradingSystem={gradingSystem}
        gradingSystem={gradingSystem}
      />

      {/* Main View Content */}
      {!selectedExamId ? (
        <div className="p-12 text-center border theme-border rounded-2xl theme-bg-surface/50 shadow-xs">
          <ChartBarIcon className="w-12 h-12 mx-auto theme-accent opacity-60 mb-3" />
          <h3 className="text-base font-bold theme-text-primary">Select Examination</h3>
          <p className="text-xs theme-text-secondary mt-1 max-w-md mx-auto">
            Choose an examination term from above to render the master mark sheet ledger and student transcripts.
          </p>
        </div>
      ) : activeSubTab === 'transcripts' ? (
        <TranscriptStudioTab
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
          onOpenPrintStudio={() => setIsPrintStudioOpen(true)}
        />
      )}

      {/* Master Mark Sheet (Tabulation Ledger) Print Studio */}
      {isPrintStudioOpen && (
        <MarkSheetPrint
          isOpen={isPrintStudioOpen}
          onClose={() => setIsPrintStudioOpen(false)}
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
        />
      )}

      {/* Dedicated Student Mark Sheet (Transcript) Print Studio */}
      {isStudentPrintOpen && (
        <StudentMarkSheetPrint
          isOpen={isStudentPrintOpen}
          onClose={() => setIsStudentPrintOpen(false)}
          exam={exam}
          studentResult={currentSelectedStudentResult}
          studentsData={studentsData}
          selectedClassId={selectedClassId}
          selectedClassName={selectedClassName}
          selectedSectionId={selectedSectionId}
          selectedSectionName={selectedSectionName}
          gradingSystem={gradingSystem}
          subjects={subjects}
        />
      )}
    </PageContainer>
  );
}
