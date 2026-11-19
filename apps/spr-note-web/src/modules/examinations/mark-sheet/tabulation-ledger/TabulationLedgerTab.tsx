import React, { useMemo } from 'react';
import MetricsGrid from '@/components/ui/MetricsGrid';
import DataTable from '@/components/ui/DataTable';
import CustomButton from '@/components/ui/CustomButton';
import {
  ChartBarIcon,
  UserIcon,
  CheckCircleIcon,
  TrophyIcon,
  AcademicCapIcon,
} from '@/components/ui/Icons';
import { examStore } from '@/stores/examStore';
import { TabulationLedgerTabProps, StudentResult } from '../types';

/**
 * TabulationLedgerTab
 * Enterprise Master Mark Sheet & Tabulation Ledger Grid with dynamic subject matrix,
 * multi-level ranking, metric statistics, sorting, and footer average computations.
 */
export default function TabulationLedgerTab({
  exam = null,
  subjects = [],
  studentsData = [],
  selectedClassId = '',
  selectedClassName = 'All Classes',
  activeDeptObj = null,
  gradingSystem = null,
  totalStudents = 0,
  passedCount = 0,
  failedCount = 0,
  passPercentage = 0,
  stats = {},
  totalMaxMarks = 0,
  onViewStudentTranscript,
}: TabulationLedgerTabProps) {
  // 1. Metric Cards Summary
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

  // 2. Dynamic Table Title
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

  // 3. Dynamic Columns Configuration for DataTable
  const columns = useMemo(() => {
    const cols: any[] = [
      // Roll Number
      {
        key: 'rollNumber',
        header: 'Roll',
        rotatable: false,
        align: 'center',
        sortable: true,
        sortValue: (st: StudentResult) => Number(st.rollNumber) || st.rollNumber,
        headerClassName: 'w-16 min-w-[60px] max-w-[60px] text-center px-1',
        cellClassName:
          'w-16 min-w-[60px] max-w-[60px] text-center font-bold text-xs theme-text-primary px-1',
        render: (st: StudentResult) =>
          st.rollNumber && st.rollNumber !== 'N/A' && st.rollNumber !== '-' ? (
            st.rollNumber
          ) : (
            <span className="theme-text-muted/40 font-normal select-none text-[11px]">-</span>
          ),
      },
      // Student Name
      {
        key: 'studentName',
        header: 'Student Name',
        subHeader: 'Full Marks',
        rotatable: false,
        align: 'left',
        sortable: true,
        sortValue: (st: StudentResult) => (st.studentName || '').toLowerCase(),
        headerClassName: 'min-w-[190px] text-left px-3',
        cellClassName: 'min-w-[190px] font-bold theme-text-primary text-left px-3',
        render: (st: StudentResult) => (
          <div
            onClick={() => onViewStudentTranscript && onViewStudentTranscript(st.studentId)}
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
              sortValue: (st: StudentResult) => (st.studentClass || '').toLowerCase(),
              headerClassName: 'min-w-[130px] text-left px-3',
              cellClassName: 'min-w-[130px] theme-text-secondary text-xs text-left px-3',
              render: (st: StudentResult) => st.studentClass || '-',
            },
          ]
        : []),
    ];

    // Dynamic Subject Columns
    (subjects || []).forEach((sub) => {
      cols.push({
        key: `subject_${sub.id}`,
        header: sub.subjectName,
        subHeader: sub.fullMarks,
        rotatable: true,
        align: 'center',
        sortable: true,
        sortValue: (st: StudentResult) => {
          const sm = st.subjectMarks?.find((s) => String(s.subjectId) === String(sub.id));
          if (!sm) return -999;
          if (sm.isAbsent) return -1;
          return Number(sm.obtained) || 0;
        },
        headerClassName: 'w-[64px] min-w-[64px] max-w-[64px] text-center px-1',
        cellClassName: 'w-[64px] min-w-[64px] max-w-[64px] text-center px-1',
        render: (st: StudentResult) => {
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
        sortValue: (st: StudentResult) =>
          st.totalObtained !== null && st.totalObtained !== undefined
            ? Number(st.totalObtained)
            : -999,
        headerClassName: 'w-20 min-w-[76px] max-w-[76px] text-center px-1',
        cellClassName:
          'w-20 min-w-[76px] max-w-[76px] text-center font-bold text-xs theme-text-primary px-1',
        render: (st: StudentResult) => {
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
        sortValue: (st: StudentResult) =>
          st.overallPercentage !== null && st.overallPercentage !== undefined
            ? Number(st.overallPercentage)
            : -999,
        headerClassName: 'w-20 min-w-[76px] max-w-[76px] text-center px-1',
        cellClassName:
          'w-20 min-w-[76px] max-w-[76px] text-center font-bold text-xs theme-text-primary px-1',
        render: (st: StudentResult) => {
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
        sortValue: (st: StudentResult) =>
          st.overallGpa !== null && st.overallGpa !== undefined ? Number(st.overallGpa) : -999,
        headerClassName: 'w-32 min-w-[120px] max-w-[120px] text-center px-2',
        cellClassName: 'w-32 min-w-[120px] max-w-[120px] text-center px-2',
        render: (st: StudentResult) => {
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
      {
        key: 'classRank',
        header: 'Rank',
        rotatable: false,
        align: 'center',
        sortable: true,
        sortValue: (st: StudentResult) => (st.classRank && st.classRank !== '-' ? Number(st.classRank) : 9999),
        headerClassName: 'w-16 min-w-[60px] max-w-[60px] text-center px-1',
        cellClassName: 'w-16 min-w-[60px] max-w-[60px] text-center px-1',
        render: (st: StudentResult) => {
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
        render: (st: StudentResult) => (
          <CustomButton
            variant="sub"
            size="xs"
            onClick={() => onViewStudentTranscript && onViewStudentTranscript(st.studentId)}
          >
            Transcript
          </CustomButton>
        ),
      }
    );

    return cols;
  }, [subjects, totalMaxMarks, selectedClassId, onViewStudentTranscript]);

  // 4. Dynamic Subject & Grand Average Calculations for Table Footer Row
  const footerRow = useMemo(() => {
    if (!studentsData || studentsData.length === 0) return null;

    const row: Record<string, any> = {
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
        const sum = validMarks.reduce((acc, m) => acc + Number(m!.obtained), 0);
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

  return (
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
          keyExtractor={(st: StudentResult) => String(st.studentId)}
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
  );
}
