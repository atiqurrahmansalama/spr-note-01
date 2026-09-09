import React, { useState, useMemo, useEffect, useRef } from 'react';
import PageContainer from '../../../components/layout/PageContainer';
import MetricsGrid from '../../../components/ui/MetricsGrid';
import DataTable from '../../../components/ui/DataTable';
import CustomButton from '../../../components/ui/CustomButton';
import TabSwitcher from '../../../components/ui/TabSwitcher';
import MarkSheetHeader from './components/MarkSheetHeader';
import MarkSheetPrint from './components/MarkSheetPrint';
import ResultGazetteTab from './components/ResultGazetteTab';
import TranscriptStudioTab from './components/TranscriptStudioTab';
import MarkEntryFilterBar from '../mark-entry/components/MarkEntryFilterBar';
import {
  ChartBarIcon,
  UserIcon,
  CheckCircleIcon,
  TrophyIcon,
  AcademicCapIcon,
  PrinterIcon,
  DocumentIcon,
} from '../../../components/ui/Icons';
import { examStore } from '../../../stores/examStore';
import useExamData from '../hooks/useExamData';
import useTabulationData from '../hooks/useTabulationData';

/**
 * MarkSheetLedgerView (Master Mark Sheet Ledger)
 * Enterprise Master Mark Sheet and Academic Ledger with multi-level ranking,
 * metric statistics, full sorting, and dedicated MarkSheetPrint studio.
 */
export default function MarkSheetLedgerView({
  initialExamId = null,
  initialStudentId = null,
  defaultSubTab = null,
  isEmbedded = false,
  onNavigateToTranscripts,
}) {
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

  const resolveActiveSubTab = () => {
    if (defaultSubTab) return defaultSubTab;
    const tabParam = urlParams.get('tab');
    if (tabParam === 'gazette') return 'gazette';
    if (tabParam === 'transcripts' || tabParam === 'transcript' || tabParam === 'studio') {
      return 'transcripts';
    }
    return 'ledger';
  };

  const [selectedExamId, setSelectedExamId] = useState(
    initialExamId || urlExamId || (exams[0]?.id ? String(exams[0].id) : '')
  );
  const [filterDepartmentId, setFilterDepartmentId] = useState(urlDepartmentId || 'ALL');
  const [selectedClassId, setSelectedClassId] = useState(
    urlClassId || (classOptions[0]?.value ? String(classOptions[0].value) : '')
  );
  const [selectedSectionId, setSelectedSectionId] = useState(urlSectionId || 'ALL');
  const [activeSubTab, setActiveSubTab] = useState(resolveActiveSubTab);
  const [selectedStudentId, setSelectedStudentId] = useState(initialStudentId || urlStudentId || '');
  const [isPrintStudioOpen, setIsPrintStudioOpen] = useState(
    urlPrint === 'mark_sheet' ||
      urlPrint === 'marksheet' ||
      urlPrint === 'tabulation' ||
      urlPrint === 'true' ||
      Boolean(urlPrint)
  );

  const handleViewStudentTranscript = (studentId) => {
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
      setIsPrintStudioOpen(Boolean(printParam));

      const tabParam = currentUrl.searchParams.get('tab');
      if (tabParam === 'gazette' || tabParam === 'ledger') {
        setActiveSubTab(tabParam);
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
      if (activeSubTab === 'gazette') {
        if (url.searchParams.get('tab') !== 'gazette') {
          url.searchParams.set('tab', 'gazette');
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
    return exams.map((e) => ({
      value: String(e.id),
      label: `${e.name} (${e.academicYearName || 'Session'})`,
    }));
  }, [exams]);

  // Filtered Class Options: Narrowed down to selected Exam target classes and Department
  const filteredClassOptions = useMemo(() => {
    let list = classOptions;

    const selectedExamObj = exams.find((e) => String(e.id) === String(selectedExamId));
    if (
      selectedExamObj &&
      Array.isArray(selectedExamObj.targetClassIds) &&
      selectedExamObj.targetClassIds.length > 0
    ) {
      const targetSet = new Set(selectedExamObj.targetClassIds.map((id) => String(id)));
      const hasMatch = list.some((c) => targetSet.has(String(c.value)));
      if (hasMatch) {
        list = list.filter((c) => targetSet.has(String(c.value)));
      }
    }

    if (filterDepartmentId && filterDepartmentId !== 'ALL') {
      list = list.filter((c) => {
        if (c.departmentId && String(c.departmentId) === String(filterDepartmentId)) {
          return true;
        }
        return (examSubjects || []).some(
          (s) =>
            String(s.classId) === String(c.value) &&
            (s.departmentId === 'ALL' || String(s.departmentId) === String(filterDepartmentId))
        );
      });
    }

    return [{ value: '', label: 'All Classes' }, ...list];
  }, [classOptions, exams, selectedExamId, filterDepartmentId, examSubjects]);

  // Filtered Section Options: Narrowed down to selected Class and Department
  const filteredSectionOptions = useMemo(() => {
    let rawList = sectionOptions.filter((s) => s.value !== 'ALL');

    if (selectedClassId) {
      rawList = rawList.filter((s) => {
        if (s.classId && String(s.classId) === String(selectedClassId)) return true;
        return (examSubjects || []).some(
          (sub) =>
            String(sub.classId) === String(selectedClassId) &&
            String(sub.sectionId) === String(s.value)
        );
      });
    } else if (filterDepartmentId && filterDepartmentId !== 'ALL') {
      const allowedClassIds = new Set(
        filteredClassOptions
          .map((c) => String(c.value))
          .filter((v) => v && v !== '')
      );
      rawList = rawList.filter((s) => s.classId && allowedClassIds.has(String(s.classId)));
    }

    return [{ value: 'ALL', label: 'All Sections (Class Wide)' }, ...rawList];
  }, [sectionOptions, selectedClassId, filterDepartmentId, filteredClassOptions, examSubjects]);

  // Cascading Auto-Select: When Department changes, ensure Class is valid or auto-select first class in department
  useEffect(() => {
    const validClasses = filteredClassOptions.filter((c) => c.value && c.value !== '');
    if (validClasses.length > 0) {
      const isCurrentValid = validClasses.some((c) => String(c.value) === String(selectedClassId));
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
        (s) => s.value !== 'ALL' && String(s.value) === String(selectedSectionId)
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
    return classOptions.find((c) => String(c.value) === String(selectedClassId));
  }, [classOptions, selectedClassId]);

  const selectedSectionObj = useMemo(() => {
    return sectionOptions.find((s) => String(s.value) === String(selectedSectionId));
  }, [sectionOptions, selectedSectionId]);

  const selectedClassName = selectedClassObj?.label || 'All Classes';
  const selectedSectionName =
    selectedSectionId === 'ALL' ? 'All Sections' : selectedSectionObj?.label || 'Section';

  // Total maximum marks across all subjects in this examination/class
  const totalMaxMarks = useMemo(() => {
    return (subjects || []).reduce((acc, sub) => acc + (Number(sub.fullMarks) || 0), 0);
  }, [subjects]);

  // Dynamic Columns Configuration for DataTable
  const columns = useMemo(() => {
    const cols = [
      // 1. Roll Number
      {
        key: 'rollNumber',
        header: 'Roll',
        rotatable: false,
        align: 'center',
        sortable: true,
        sortValue: (st) => Number(st.rollNumber) || st.rollNumber,
        headerClassName: 'w-16 min-w-[60px] max-w-[60px] text-center px-1',
        cellClassName:
          'w-16 min-w-[60px] max-w-[60px] text-center font-bold text-xs theme-text-primary px-1',
        render: (st) =>
          st.rollNumber && st.rollNumber !== 'N/A' && st.rollNumber !== '-' ? (
            st.rollNumber
          ) : (
            <span className="theme-text-muted/40 font-normal select-none text-[11px]">-</span>
          ),
      },
      // 2. Student Name
      {
        key: 'studentName',
        header: 'Student Name',
        subHeader: 'Full Marks',
        rotatable: false,
        align: 'left',
        sortable: true,
        sortValue: (st) => (st.studentName || '').toLowerCase(),
        headerClassName: 'min-w-[190px] text-left px-3',
        cellClassName: 'min-w-[190px] font-bold theme-text-primary text-left px-3',
        render: (st) => (
          <div
            onClick={() => handleViewStudentTranscript(st.studentId)}
            className="cursor-pointer group select-none"
            title="Click to view full transcript"
          >
            <div className="font-bold theme-text-primary group-hover:theme-accent transition-colors">
              {st.studentName}
            </div>
            {st.studentUniqId && (
              <div className="text-[10px] theme-text-secondary">{st.studentUniqId}</div>
            )}
          </div>
        ),
      },
      // Optional Class Column (when All Classes is selected)
      ...(!selectedClassId || selectedClassId === 'ALL'
        ? [
            {
              key: 'studentClass',
              header: 'Class',
              rotatable: false,
              align: 'left',
              sortable: true,
              sortValue: (st) => (st.studentClass || '').toLowerCase(),
              headerClassName: 'min-w-[130px] text-left px-3',
              cellClassName: 'min-w-[130px] theme-text-secondary text-xs text-left px-3',
              render: (st) => st.studentClass || '-',
            },
          ]
        : []),
    ];

    // Dynamic Subject Columns (Uniform Equal Size for All Mark Columns)
    (subjects || []).forEach((sub) => {
      cols.push({
        key: `subject_${sub.id}`,
        header: sub.subjectName,
        subHeader: sub.fullMarks,
        rotatable: true,
        align: 'center',
        sortable: true,
        sortValue: (st) => {
          const sm = st.subjectMarks?.find((s) => String(s.subjectId) === String(sub.id));
          if (!sm) return -999;
          if (sm.isAbsent) return -1;
          return Number(sm.obtained) || 0;
        },
        headerClassName: 'w-[64px] min-w-[64px] max-w-[64px] text-center px-1',
        cellClassName: 'w-[64px] min-w-[64px] max-w-[64px] text-center px-1',
        render: (st) => {
          const sm = st.subjectMarks?.find((s) => String(s.subjectId) === String(sub.id));
          if (
            !sm ||
            sm.obtained === null ||
            sm.obtained === undefined ||
            sm.status === 'NOT_ENTERED'
          ) {
            return <span className="theme-text-muted/40 font-normal select-none text-[11px]">-</span>;
          }
          if (sm.isAbsent) return <span className="theme-text-muted font-bold text-[11px]">ABS</span>;
          return (
            <span
              className={`font-semibold ${
                sm.isPassed ? 'theme-text-primary' : 'theme-text-danger font-bold underline'
              }`}
            >
              {sm.obtained}
            </span>
          );
        },
      });
    });

    // Summary Columns
    cols.push(
      {
        key: 'totalObtained',
        header: 'Total',
        subHeader: totalMaxMarks > 0 ? totalMaxMarks : undefined,
        rotatable: false,
        align: 'center',
        sortable: true,
        sortValue: (st) =>
          st.totalObtained !== null && st.totalObtained !== undefined
            ? Number(st.totalObtained)
            : -999,
        headerClassName: 'w-20 min-w-[76px] max-w-[76px] text-center px-1',
        cellClassName:
          'w-20 min-w-[76px] max-w-[76px] text-center font-bold text-xs theme-text-primary px-1',
        render: (st) => {
          if (st.totalObtained === null || st.totalObtained === undefined || !st.hasAnyMarks) {
            return <span className="theme-text-muted/40 font-normal select-none text-[11px]">-</span>;
          }
          return st.totalObtained;
        },
      },
      {
        key: 'overallPercentage',
        header: 'Avg',
        subHeader: '100%',
        rotatable: false,
        align: 'center',
        sortable: true,
        sortValue: (st) =>
          st.overallPercentage !== null && st.overallPercentage !== undefined
            ? Number(st.overallPercentage)
            : -999,
        headerClassName: 'w-20 min-w-[76px] max-w-[76px] text-center px-1',
        cellClassName:
          'w-20 min-w-[76px] max-w-[76px] text-center font-bold text-xs theme-text-primary px-1',
        render: (st) => {
          if (
            st.overallPercentage === null ||
            st.overallPercentage === undefined ||
            !st.hasAnyMarks
          ) {
            return <span className="theme-text-secondary font-normal">0%</span>;
          }
          return `${st.overallPercentage}%`;
        },
      },
      {
        key: 'grade',
        header: 'Grade / GPA',
        rotatable: false,
        align: 'center',
        sortable: true,
        sortValue: (st) =>
          st.overallGpa !== null && st.overallGpa !== undefined ? Number(st.overallGpa) : -999,
        headerClassName: 'w-32 min-w-[120px] max-w-[120px] text-center px-2',
        cellClassName: 'w-32 min-w-[120px] max-w-[120px] text-center px-2',
        render: (st) => {
          if (!st.hasAnyMarks || st.grade === '-' || !st.grade) {
            return <span className="theme-text-muted font-normal select-none text-[11px]">-</span>;
          }
          return (
            <div className="flex flex-col items-center justify-center leading-tight">
              <span
                className={`text-xs font-bold ${
                  st.isOverallPass ? 'theme-accent' : 'theme-text-danger'
                }`}
              >
                {st.grade}
              </span>
              {st.overallGpa !== null && st.overallGpa !== undefined && (
                <span className="text-[10px] theme-text-secondary leading-none mt-0.5">
                  GPA {Number(st.overallGpa).toFixed(2)}
                </span>
              )}
            </div>
          );
        },
      },
      // Rank (Positioned after Grade)
      {
        key: 'classRank',
        header: 'Rank',
        rotatable: false,
        align: 'center',
        sortable: true,
        sortValue: (st) => (st.classRank && st.classRank !== '-' ? Number(st.classRank) : 9999),
        headerClassName: 'w-16 min-w-[60px] max-w-[60px] text-center px-1',
        cellClassName: 'w-16 min-w-[60px] max-w-[60px] text-center px-1',
        render: (st) => {
          if (!st.classRank || st.classRank === '-' || !st.hasAnyMarks) {
            return <span className="theme-text-muted/40 font-normal select-none text-[11px]">-</span>;
          }
          if (st.classRank === 1) {
            return <span className="font-black theme-text-accent">1st</span>;
          }
          if (st.classRank === 2) {
            return <span className="font-black theme-text-secondary">2nd</span>;
          }
          if (st.classRank === 3) {
            return <span className="font-black theme-text-primary">3rd</span>;
          }
          return <span className="font-semibold theme-text-secondary">{st.classRank}</span>;
        },
      },
      {
        key: 'actions',
        header: 'Action',
        rotatable: false,
        align: 'center',
        sortable: false,
        sticky: 'right',
        headerClassName: 'w-24 min-w-[92px] max-w-[92px] text-center px-2',
        cellClassName: 'w-24 min-w-[92px] max-w-[92px] text-center px-2',
        render: (st) => (
          <CustomButton
            variant="sub"
            size="xs"
            onClick={() => handleViewStudentTranscript(st.studentId)}
          >
            Transcript
          </CustomButton>
        ),
      }
    );

    return cols;
  }, [subjects, totalMaxMarks, onNavigateToTranscripts, selectedExamId, selectedClassId]);

  // Dynamic Subject & Grand Average Calculations for Table Footer Row
  const footerRow = useMemo(() => {
    if (!studentsData || studentsData.length === 0) return null;

    const row = {
      rollNumber: '-',
      studentName: 'Average',
      ...((!selectedClassId || selectedClassId === 'ALL') ? { studentClass: '-' } : {}),
    };

    // Calculate individual subject averages (formatted as percentage)
    (subjects || []).forEach((sub) => {
      const validMarks = studentsData
        .map((st) => st.subjectMarks?.find((s) => String(s.subjectId) === String(sub.id)))
        .filter(
          (sm) =>
            sm &&
            sm.hasEntry &&
            !sm.isAbsent &&
            sm.obtained !== null &&
            sm.obtained !== undefined &&
            !isNaN(Number(sm.obtained))
        );

      if (validMarks.length > 0) {
        const sum = validMarks.reduce((acc, m) => acc + Number(m.obtained), 0);
        const avg = sum / validMarks.length;
        const subFullMarks = Number(sub.fullMarks) || 100;
        const avgPct = subFullMarks > 0 ? (avg / subFullMarks) * 100 : avg;
        row[`subject_${sub.id}`] = avgPct % 1 === 0 ? `${avgPct}%` : `${avgPct.toFixed(1)}%`;
      } else {
        row[`subject_${sub.id}`] = '0%';
      }
    });

    // Valid students with recorded marks
    const validStudents = studentsData.filter(
      (st) => st.hasAnyMarks && st.totalObtained !== null && st.totalObtained !== undefined
    );

    if (validStudents.length > 0) {
      // Total obtained average percentage
      const totalSum = validStudents.reduce((acc, st) => acc + Number(st.totalObtained), 0);
      const avgTotal = totalSum / validStudents.length;
      const totalMax = totalMaxMarks > 0 ? totalMaxMarks : 100;
      const totalPct = (avgTotal / totalMax) * 100;
      row.totalObtained = totalPct % 1 === 0 ? `${totalPct}%` : `${totalPct.toFixed(1)}%`;

      // Average percentage
      const pctSum = validStudents.reduce(
        (acc, st) => acc + (Number(st.overallPercentage) || 0),
        0
      );
      const avgPct = pctSum / validStudents.length;
      row.overallPercentage = avgPct % 1 === 0 ? `${avgPct}%` : `${avgPct.toFixed(1)}%`;

      // Average GPA and overall Grade
      const gpaSum = validStudents.reduce((acc, st) => acc + (Number(st.overallGpa) || 0), 0);
      const avgGpa = gpaSum / validStudents.length;
      const evaluatedGrade = examStore.evaluateGrade(avgPct, gradingSystem?.rules || []);

      row.grade = (
        <div className="flex flex-col items-center justify-center leading-tight">
          <span className="text-xs font-bold theme-accent">
            {evaluatedGrade?.grade || '-'}
          </span>
          <span className="text-[10px] theme-text-secondary leading-none mt-0.5">
            GPA {avgGpa.toFixed(2)}
          </span>
        </div>
      );
    } else {
      row.totalObtained = '0%';
      row.overallPercentage = '0%';
      row.grade = '-';
    }

    row.classRank = '-';
    row.actions = '-';

    return row;
  }, [studentsData, subjects, totalMaxMarks, gradingSystem, selectedClassId]);

  const metricItems = useMemo(
    () => [
      {
        id: 'passed',
        label: 'Passed',
        value: String(passedCount),
        icon: CheckCircleIcon,
        color: 'accent',
      },
      {
        id: 'failed',
        label: 'Failed',
        value: String(failedCount),
        icon: UserIcon,
        color: 'default',
      },
      {
        id: 'pass_rate',
        label: 'Pass Rate',
        value: `${passPercentage}%`,
        icon: TrophyIcon,
        color: 'accent',
      },
      {
        id: 'highest',
        label: 'Highest Marks',
        value: String(stats.highestMarks || 0),
        icon: TrophyIcon,
        color: 'default',
      },
      {
        id: 'average',
        label: 'Average GPA',
        value: String(stats.averageGpa || 0),
        icon: ChartBarIcon,
        color: 'accent',
      },
    ],
    [passedCount, failedCount, passPercentage, stats]
  );

  const activeDeptObj = useMemo(() => {
    return departmentOptions.find((d) => String(d.value) === String(filterDepartmentId));
  }, [departmentOptions, filterDepartmentId]);

  const displayTableTitle = useMemo(() => {
    if (
      selectedClassId &&
      selectedClassName !== 'Select Class' &&
      selectedClassName !== 'All Classes'
    ) {
      return `${selectedClassName} Marksheet`;
    }
    if (activeDeptObj && activeDeptObj.value !== 'ALL') {
      return `${activeDeptObj.label} Marksheet`;
    }
    return 'All Classes Master Marksheet';
  }, [selectedClassId, selectedClassName, activeDeptObj]);

  const subTabs = useMemo(
    () => [
      {
        id: 'ledger',
        label: 'Tabulation Ledger',
        icon: AcademicCapIcon,
        badge: studentsData.length > 0 ? studentsData.length : undefined,
      },
      {
        id: 'gazette',
        label: 'Result Gazette',
        icon: TrophyIcon,
        badge: studentsData.length > 0 ? `${passedCount}/${studentsData.length}` : undefined,
      },
      {
        id: 'transcripts',
        label: 'Transcript Studio',
        icon: DocumentIcon,
        badge: studentsData.length > 0 ? studentsData.length : undefined,
      },
    ],
    [studentsData.length, passedCount]
  );

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
    return null;
  };

  return (
    <PageContainer maxWidth="7xl" isEmbedded={isEmbedded}>
      {/* 1. Top Header */}
      <MarkSheetHeader
        exam={exam}
        onExportCsv={exportToCsv}
        onOpenPrintStudio={() => setIsPrintStudioOpen(true)}
        onOpenGazette={() => setActiveSubTab('gazette')}
        onOpenTranscripts={() => setActiveSubTab('transcripts')}
      />

      {/* 2. Unified Project-Standard TabSwitcher with Dynamic Action Button */}
      <TabSwitcher
        tabs={subTabs}
        activeTab={activeSubTab}
        onChange={setActiveSubTab}
        rightContent={renderTabAction()}
        className="print:hidden"
      />

      {/* 3. Target Academic Filter Console */}
      <MarkEntryFilterBar
        examOptions={examOptions}
        selectedExamId={selectedExamId}
        setSelectedExamId={setSelectedExamId}
        onExamChange={(eId) => setSelectedExamId(eId)}
        departmentOptions={departmentOptions}
        filterDepartmentId={filterDepartmentId}
        setFilterDepartmentId={setFilterDepartmentId}
        onDepartmentChange={(deptId) => setFilterDepartmentId(deptId)}
        classOptions={filteredClassOptions}
        filterClassId={selectedClassId}
        selectedClassId={selectedClassId}
        setFilterClassId={setSelectedClassId}
        onClassChange={(cId) => setSelectedClassId(cId)}
        sectionOptions={filteredSectionOptions}
        filterSectionId={selectedSectionId}
        selectedSectionId={selectedSectionId}
        setFilterSectionId={setSelectedSectionId}
        onSectionChange={(sId) => setSelectedSectionId(sId)}
        showSubject={false}
        selectedClassName={selectedClassName}
        selectedSectionName={selectedSectionName}
        activeGradingSystem={gradingSystem}
        gradingSystem={gradingSystem}
        totalStudents={totalStudents}
        passedCount={passedCount}
        failedCount={failedCount}
      />

      {/* Main View Content: Sub-Tab 1 (Ledger) vs Sub-Tab 2 (Result Gazette) vs Sub-Tab 3 (Transcript Studio) */}
      {!selectedExamId ? (
        <div className="p-12 text-center border theme-border rounded-2xl theme-bg-surface/50 shadow-xs">
          <ChartBarIcon className="w-12 h-12 mx-auto theme-accent opacity-60 mb-3" />
          <h3 className="text-base font-bold theme-text-primary">Select Examination</h3>
          <p className="text-xs theme-text-secondary mt-1 max-w-md mx-auto">
            Choose an examination term from above to render the master mark sheet ledger, result gazette, and student transcripts.
          </p>
        </div>
      ) : activeSubTab === 'gazette' ? (
        <ResultGazetteTab
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
          passPercentage={passPercentage}
          stats={stats}
          subjects={subjects}
          onSelectStudent={handleViewStudentTranscript}
        />
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
          passPercentage={passPercentage}
          selectedStudentId={selectedStudentId}
          onSelectStudentId={setSelectedStudentId}
          subjects={subjects}
        />
      ) : (
        <div className="space-y-4">
          {/* Metric Cards Summary */}
          <MetricsGrid items={metricItems} cols={5} />

          {/* Main MarkSheet Table */}
          <div className="print:hidden w-full space-y-3">
            <DataTable
              tableTitle={`${displayTableTitle} (${studentsData.length})`}
              tableTitleIcon={AcademicCapIcon}
              showSerial={true}
              serialHeader="No"
              verticalHeaders={true}
              resizable={true}
              columns={columns}
              data={studentsData}
              footerRow={footerRow}
              keyExtractor={(st) => String(st.studentId)}
              emptyTitle="No Student Results Found"
              emptySubMessage="No marks have been recorded yet for this examination and selection. Visit the Mark Entry Desk to enter subject marks."
              emptyIcon={UserIcon}
              sortable={true}
              defaultSortKey="classRank"
              defaultSortDirection="asc"
              cellPaddingClass="py-2.5 px-3"
            />
          </div>
        </div>
      )}

      {/* Master Mark Sheet Print Studio */}
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
    </PageContainer>
  );
}
