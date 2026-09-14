import React, { useMemo } from 'react';
import CustomCheckbox from '@/components/ui/CustomCheckbox';
import CustomInput from '@/components/ui/CustomInput';
import { ActionMenuItem } from '@/components/ui/ActionMenu';
import {
  SparklesIcon,
  CheckIcon,
  UserCheckIcon,
  BanIcon,
  TrashIcon,
} from '@/components/ui/Icons';
import { examStore } from '@/stores/examStore';
import RemarksCell from '../components/RemarksCell';

export interface UseMarkEntryColumnsParams {
  components: Array<{ id?: string; name: string; maxMarks: number }>;
  fullMarks: number;
  passMarks: number;
  marksGrid: Record<string, any>;
  validationErrors: Record<string, string>;
  isLocked: boolean;
  activeGradingSystem: any;
  targetStudents: any[];
  stats?: any;
  handleCellChange: (stId: string, compKey: string, val: string, maxMarks: number) => void;
  handleToggleAbsent: (stId: string) => void;
  handleRemarksChange: (stId: string, val: string) => void;
  handleKeyDown: (
    e: React.KeyboardEvent,
    sIdx: number,
    colIdxOrName: number | string,
    totalStudents: number,
    totalComponents: number
  ) => void;
  fillFullMarks: () => void;
  fillPassingMarks: () => void;
  toggleAllAbsent: (absent: boolean) => void;
  clearAllMarks: () => void;
}

export function useMarkEntryColumns({
  components,
  fullMarks,
  passMarks,
  marksGrid,
  validationErrors,
  isLocked,
  activeGradingSystem,
  targetStudents,
  stats,
  handleCellChange,
  handleToggleAbsent,
  handleRemarksChange,
  handleKeyDown,
  fillFullMarks,
  fillPassingMarks,
  toggleAllAbsent,
  clearAllMarks,
}: UseMarkEntryColumnsParams) {
  // Bulk Quick Fill action menu items
  const quickFillActions = useMemo<ActionMenuItem[]>(
    () => [
      {
        label: 'Fill All Full Marks',
        icon: SparklesIcon,
        onClick: fillFullMarks,
      },
      {
        label: 'Fill Passing Marks',
        icon: CheckIcon,
        onClick: fillPassingMarks,
      },
      { divider: true },
      {
        label: 'Mark All Present',
        icon: UserCheckIcon,
        onClick: () => toggleAllAbsent(false),
      },
      {
        label: 'Mark All Absent',
        icon: BanIcon,
        onClick: () => toggleAllAbsent(true),
      },
      { divider: true },
      {
        label: 'Clear All Marks',
        icon: TrashIcon,
        danger: true,
        onClick: () => {
          if (window.confirm('Clear all entered marks for this subject?')) {
            clearAllMarks();
          }
        },
      },
    ],
    [fillFullMarks, fillPassingMarks, toggleAllAbsent, clearAllMarks]
  );

  // Dynamic columns for DataTable
  const columns = useMemo<any[]>(() => {
    const cols: any[] = [
      // 1. Roll Number
      {
        key: 'roll',
        header: 'Roll',
        rotatable: false,
        sortable: true,
        align: 'center',
        sortValue: (st: any) => {
          const r = st.roll_number || st.roll || st.uniq_id || '';
          return isNaN(Number(r)) ? String(r) : Number(r);
        },
        headerClassName: 'w-16 min-w-[64px] max-w-[64px] text-center text-xs font-bold px-1',
        className: 'w-16 min-w-[64px] max-w-[64px] font-bold theme-text-primary text-center px-1',
        render: (st: any) => st.roll_number || st.roll || st.uniq_id || '-',
      },

      // 2. Student Name & Unique ID
      {
        key: 'name',
        header: 'Student Name',
        rotatable: false,
        sortable: true,
        sortValue: (st: any) => (st.name || st.student_name || '').toLowerCase(),
        headerClassName: 'min-w-[200px] text-xs font-bold px-3',
        className: 'min-w-[200px] px-3',
        render: (st: any) => {
          const sName = st.name || st.student_name || 'Unnamed Student';
          const sId = st.student_unique_id || st.student_id || st.admission_number || '';
          return (
            <div className="flex flex-col">
              <span className="font-semibold text-xs theme-text-primary truncate">{sName}</span>
              {sId && <span className="text-[10px] theme-text-secondary">{sId}</span>}
            </div>
          );
        },
      },

      // 3. Attendance (Is Absent Toggle)
      {
        key: 'attendance',
        header: 'Status',
        rotatable: false,
        align: 'center',
        sortable: true,
        sortValue: (st: any) => (marksGrid[String(st.id)]?.isAbsent ? 1 : 0),
        headerClassName: 'w-[90px] min-w-[90px] max-w-[96px] text-center text-xs font-bold px-1',
        className: 'w-[90px] min-w-[90px] max-w-[96px] text-center px-1',
        render: (st: any) => {
          const stId = String(st.id);
          const isAbsent = Boolean(marksGrid[stId]?.isAbsent);
          return (
            <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
              <CustomCheckbox
                id={`absent_${stId}`}
                label="Absent"
                disabled={isLocked}
                checked={isAbsent}
                onChange={() => handleToggleAbsent(stId)}
                size="md"
              />
            </div>
          );
        },
      },
    ];

    // 4. Dynamic Component Marks Columns
    components.forEach((comp, cIdx) => {
      const compKey = `comp_${cIdx}`;

      cols.push({
        key: comp.id || compKey,
        header: comp.name,
        rotatable: false,
        align: 'center',
        sortable: true,
        sortValue: (st: any) => {
          const rowData = marksGrid[String(st.id)] || {
            componentMarks: {},
            obtainedMarks: '',
            isAbsent: false,
            teacherRemarks: '',
            status: 'DRAFT',
            studentId: String(st.id),
            studentName: '',
          };
          if (rowData.isAbsent) return -1;
          const val = rowData.componentMarks?.[compKey];
          return val === '' || val === undefined ? -1 : Number(val);
        },
        headerClassName: 'w-[96px] min-w-[90px] max-w-[110px] text-center text-xs font-bold px-1',
        className: 'w-[96px] min-w-[90px] max-w-[110px] text-center px-1',
        render: (st: any, sIdx: number) => {
          const stId = String(st.id);
          const rowData = marksGrid[stId] || {
            componentMarks: {},
            obtainedMarks: '',
            isAbsent: false,
            teacherRemarks: '',
            status: 'DRAFT',
            studentId: stId,
            studentName: '',
          };
          const isAbsent = Boolean(rowData.isAbsent);
          const cellId = `${stId}_${compKey}`;
          const cellError = validationErrors[cellId];
          const cellVal = rowData.componentMarks?.[compKey] ?? '';

          return (
            <div className="relative inline-flex justify-center" onClick={(e) => e.stopPropagation()}>
              <CustomInput
                id={`cell_${sIdx}_${cIdx}`}
                type="number"
                min={0}
                max={comp.maxMarks}
                step={1}
                allowDecimals={true}
                scrollable={true}
                size="sm"
                disabled={isLocked || isAbsent}
                value={isAbsent ? '0' : cellVal}
                onChange={(val: any) =>
                  handleCellChange(
                    stId,
                    compKey,
                    typeof val === 'string' ? val : val?.target?.value ?? '',
                    comp.maxMarks
                  )
                }
                onKeyDown={(e: any) =>
                  handleKeyDown(e, sIdx, cIdx, targetStudents.length, components.length)
                }
                placeholder="0"
                className="!w-16 !px-1 !min-h-[32px] !h-8"
                inputClassName="text-center font-bold text-xs"
                error={Boolean(cellError)}
              />
              {cellError && (
                <span className="absolute -bottom-3.5 left-0 right-0 text-[9px] text-red-500 font-semibold truncate text-center pointer-events-none">
                  {cellError}
                </span>
              )}
            </div>
          );
        },
      });
    });

    // 5. Total Marks Column
    cols.push({
      key: 'total',
      header: 'Total',
      rotatable: false,
      align: 'center',
      sortable: true,
      sortValue: (st: any) => {
        const rowData = marksGrid[String(st.id)] || {
          componentMarks: {},
          obtainedMarks: '',
          isAbsent: false,
          teacherRemarks: '',
          status: 'DRAFT',
          studentId: String(st.id),
          studentName: '',
        };
        if (rowData.isAbsent) return -1;
        const val =
          rowData.obtainedMarks !== undefined && rowData.obtainedMarks !== ''
            ? rowData.obtainedMarks
            : rowData.totalMarks !== undefined
            ? rowData.totalMarks
            : '';
        return val === '' || val === undefined ? -1 : Number(val);
      },
      headerClassName: 'w-[96px] min-w-[90px] max-w-[110px] text-center text-xs font-bold px-1',
      className: 'w-[96px] min-w-[90px] max-w-[110px] text-center font-bold text-xs px-1',
      render: (st: any) => {
        const rowData = marksGrid[String(st.id)] || {
          componentMarks: {},
          obtainedMarks: '',
          isAbsent: false,
          teacherRemarks: '',
          status: 'DRAFT',
          studentId: String(st.id),
          studentName: '',
        };
        if (rowData.isAbsent) {
          return <span className="theme-text-danger font-semibold text-xs">ABS</span>;
        }

        const obtained =
          rowData.obtainedMarks !== undefined && rowData.obtainedMarks !== ''
            ? rowData.obtainedMarks
            : rowData.totalMarks !== undefined && rowData.totalMarks !== ''
            ? rowData.totalMarks
            : '';

        if (obtained === '' || obtained === null || obtained === undefined) {
          return <span className="theme-text-secondary text-xs">-</span>;
        }

        return <span className="theme-text-primary text-xs font-bold font-mono">{obtained}</span>;
      },
    });

    // 6. Computed Grade & Result Status Column
    cols.push({
      key: 'grade',
      header: 'Grade',
      rotatable: false,
      align: 'center',
      sortable: true,
      sortValue: (st: any) => {
        const rowData = marksGrid[String(st.id)] || {
          componentMarks: {},
          obtainedMarks: '',
          isAbsent: false,
          teacherRemarks: '',
          status: 'DRAFT',
          studentId: String(st.id),
          studentName: '',
        };
        if (rowData.isAbsent) return -1;
        const obtained =
          rowData.obtainedMarks !== undefined && rowData.obtainedMarks !== ''
            ? rowData.obtainedMarks
            : rowData.totalMarks;
        if (obtained === '' || obtained === undefined || obtained === null) return -1;
        const num = Number(obtained) || 0;
        const pct = fullMarks > 0 ? (num / fullMarks) * 100 : 0;
        const gradeEval = examStore.evaluateGrade(pct, activeGradingSystem?.rules || []);
        return gradeEval?.gradePoint ?? -1;
      },
      headerClassName: 'w-[96px] min-w-[90px] max-w-[110px] text-center text-xs font-bold px-1',
      className: 'w-[96px] min-w-[90px] max-w-[110px] text-center px-1',
      render: (st: any) => {
        const rowData = marksGrid[String(st.id)] || {
          componentMarks: {},
          obtainedMarks: '',
          isAbsent: false,
          teacherRemarks: '',
          status: 'DRAFT',
          studentId: String(st.id),
          studentName: '',
        };
        const failingRule =
          (activeGradingSystem?.rules || []).find(
            (r: any) => r.isPass === false || Number(r.gradePoint) === 0
          ) ||
          (activeGradingSystem?.rules || [])[(activeGradingSystem?.rules || []).length - 1];

        if (rowData.isAbsent) {
          return (
            <div className="flex flex-col items-center justify-center leading-tight">
              <span className="text-xs font-bold font-mono theme-text-danger">
                {failingRule?.grade || 'F'}
              </span>
              <span className="text-[10px] theme-text-secondary font-mono leading-none mt-0.5">
                GPA {Number(failingRule?.gradePoint ?? 0).toFixed(1)}
              </span>
            </div>
          );
        }

        const obtained =
          rowData.obtainedMarks !== undefined && rowData.obtainedMarks !== ''
            ? rowData.obtainedMarks
            : rowData.totalMarks;
        const hasMarks = obtained !== '' && obtained !== undefined && obtained !== null;

        if (hasMarks) {
          const num = Number(obtained) || 0;
          const pct = fullMarks > 0 ? (num / fullMarks) * 100 : 0;
          const gradeEval = examStore.evaluateGrade(pct, activeGradingSystem?.rules || []);
          const isPass = num >= passMarks && gradeEval?.isPass !== false;
          const grade =
            rowData.grade || (isPass ? gradeEval?.grade : failingRule?.grade || gradeEval?.grade);
          const gpa =
            rowData.gpa !== undefined
              ? rowData.gpa
              : isPass
              ? gradeEval?.gradePoint
              : failingRule?.gradePoint ?? 0;

          return (
            <div className="flex flex-col items-center justify-center leading-tight">
              <span
                className={`text-xs font-bold font-mono ${
                  isPass ? 'theme-accent' : 'theme-text-danger'
                }`}
              >
                {grade}
              </span>
              {gpa !== undefined && (
                <span className="text-[10px] theme-text-secondary font-mono leading-none mt-0.5">
                  GPA {Number(gpa).toFixed(1)}
                </span>
              )}
            </div>
          );
        }

        return <span className="theme-text-secondary text-[11px]">-</span>;
      },
    });

    // 7. Teacher Remarks Column
    cols.push({
      key: 'remarks',
      header: 'Remarks',
      rotatable: false,
      sortable: true,
      sortValue: (st: any) => (marksGrid[String(st.id)]?.teacherRemarks || '').toLowerCase(),
      headerClassName: 'min-w-[220px] text-xs font-bold px-3',
      className: 'min-w-[220px] px-3',
      render: (st: any, sIdx: number) => {
        const stId = String(st.id);
        const rowData = marksGrid[stId] || {
          componentMarks: {},
          obtainedMarks: '',
          isAbsent: false,
          teacherRemarks: '',
          status: 'DRAFT',
          studentId: stId,
          studentName: '',
        };
        const remarksVal = rowData.teacherRemarks || '';
        const isNearBottom = sIdx >= targetStudents.length - 2 && targetStudents.length > 3;

        return (
          <RemarksCell
            key={`remarks_${stId}`}
            stId={stId}
            sIdx={sIdx}
            remarksVal={remarksVal}
            isLocked={isLocked}
            isNearBottom={isNearBottom}
            handleRemarksChange={handleRemarksChange}
            handleKeyDown={handleKeyDown}
            studentsCount={targetStudents.length}
            componentsCount={components.length}
          />
        );
      },
    });

    return cols;
  }, [
    components,
    fullMarks,
    passMarks,
    marksGrid,
    validationErrors,
    isLocked,
    activeGradingSystem?.rules,
    targetStudents.length,
    handleCellChange,
    handleToggleAbsent,
    handleRemarksChange,
    handleKeyDown,
  ]);

  // Subheader Row for Full Marks definition at the top of the table
  const fullMarksSubHeaderRow = useMemo(() => {
    const row: Record<string, string> = {
      roll: '-',
      name: 'Full Marks',
      attendance: '-',
      total: fullMarks !== undefined && fullMarks !== null ? String(fullMarks) : '-',
      grade: '-',
      remarks: '-',
    };
    (components || []).forEach((comp, cIdx) => {
      row[comp.id || `comp_${cIdx}`] = comp.maxMarks !== undefined ? String(comp.maxMarks) : '-';
    });
    return row;
  }, [components, fullMarks]);

  // Dynamic Class/Section Average & Summary Footer Row at the bottom of the table
  const footerRow = useMemo(() => {
    if (!targetStudents || targetStudents.length === 0) return null;

    const row: Record<string, any> = {
      roll: '-',
      name: 'Class Average',
      attendance: stats ? `${stats.presentCount} Pres` : '-',
      remarks: stats
        ? `${stats.passedCount} Passed • ${stats.failedCount} Failed`
        : '-',
    };

    // 1. Calculate Average for each component across present students
    (components || []).forEach((comp, cIdx) => {
      const compKey = `comp_${cIdx}`;
      const validScores = targetStudents
        .map((st) => marksGrid[String(st.id)])
        .filter(
          (r) =>
            r &&
            !r.isAbsent &&
            r.componentMarks?.[compKey] !== undefined &&
            r.componentMarks?.[compKey] !== '' &&
            !isNaN(Number(r.componentMarks[compKey]))
        )
        .map((r) => Number(r.componentMarks[compKey]));

      if (validScores.length > 0) {
        const sum = validScores.reduce((acc, s) => acc + s, 0);
        const avg = sum / validScores.length;
        row[comp.id || compKey] = avg % 1 === 0 ? String(avg) : avg.toFixed(1);
      } else {
        row[comp.id || compKey] = '-';
      }
    });

    // 2. Average Total Score
    const avgScore = stats?.averageObtained ?? 0;
    row.total = avgScore ? (avgScore % 1 === 0 ? String(avgScore) : Number(avgScore).toFixed(1)) : '-';

    // 3. Average Grade / GPA
    const numAvg = Number(avgScore) || 0;
    if (numAvg > 0) {
      const avgPct = fullMarks > 0 ? (numAvg / fullMarks) * 100 : 0;
      const avgGradeEval = examStore.evaluateGrade(avgPct, activeGradingSystem?.rules || []);
      const isPass = numAvg >= passMarks && avgGradeEval?.isPass !== false;
      const failingRule =
        (activeGradingSystem?.rules || []).find(
          (r: any) => r.isPass === false || Number(r.gradePoint) === 0
        ) ||
        (activeGradingSystem?.rules || [])[(activeGradingSystem?.rules || []).length - 1];

      const grade = isPass ? avgGradeEval?.grade : failingRule?.grade || avgGradeEval?.grade || '-';
      const gpa = isPass
        ? avgGradeEval?.gradePoint
        : failingRule?.gradePoint ?? avgGradeEval?.gradePoint ?? 0;

      row.grade = (
        <div className="flex flex-col items-center justify-center leading-tight">
          <span
            className={`text-xs font-bold font-mono ${
              isPass ? 'theme-accent' : 'theme-text-danger'
            }`}
          >
            {grade}
          </span>
          {gpa !== undefined && (
            <span className="text-[10px] theme-text-secondary font-mono leading-none mt-0.5">
              GPA {Number(gpa).toFixed(1)}
            </span>
          )}
        </div>
      );
    } else {
      row.grade = '-';
    }

    return row;
  }, [targetStudents, components, marksGrid, stats, fullMarks, passMarks, activeGradingSystem]);

  return {
    columns,
    quickFillActions,
    fullMarksSubHeaderRow,
    footerRow,
  };
}

export default useMarkEntryColumns;
