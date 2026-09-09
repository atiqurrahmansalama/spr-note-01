import React, { useMemo } from 'react';
import DataTable from '../../../../components/ui/DataTable';
import CustomCheckbox from '../../../../components/ui/CustomCheckbox';
import CustomInput from '../../../../components/ui/CustomInput';
import TemplateActionToolbar from '../../../../components/ui/TemplateActionToolbar';
import ActionMenu from '../../../../components/ui/ActionMenu';
import { AcademicCapIcon, SparklesIcon } from '../../../../components/ui/Icons';
import { examStore } from '@/stores/examStore';

/**
 * MarkEntryGridTable
 * High-performance spreadsheet mark entry console.
 * Reuses the project's standard DataTable and CustomInput components for enterprise consistency,
 * column sorting, and unified theme styles.
 */
/**
 * RemarksCell
 * Zero top spacing when inactive. Smoothly expands on top only when the input
 * is clicked or focused, giving ample room for the TemplateActionToolbar.
 */
const RemarksCell = React.memo(function RemarksCell({
  stId,
  sIdx,
  remarksVal,
  isLocked,
  isNearBottom,
  handleRemarksChange,
  handleKeyDown,
  studentsCount,
  componentsCount,
}) {
  const [isFocused, setIsFocused] = React.useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

  const isExpanded = isFocused || isPopoverOpen;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onFocus={() => setIsFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setIsFocused(false);
        }
      }}
      className="w-full min-w-[220px] py-1 flex flex-col justify-center transition-all duration-200"
    >
      {/* Dynamic Top Expansion Area: 0px when inactive, expands smoothly when focused */}
      <div
        className={`flex items-center justify-end overflow-hidden transition-all duration-200 ease-out ${
          isExpanded
            ? "max-h-8 opacity-100 mb-1 pointer-events-auto"
            : "max-h-0 opacity-0 mb-0 pointer-events-none"
        }`}
      >
        {!isLocked && (
          <TemplateActionToolbar
            value={remarksVal}
            onChange={(newVal) => handleRemarksChange(stId, newVal)}
            category="exam_mark_entry_remarks"
            namespace="exam_mark_entry_remarks"
            size="xs"
            dropdownPosition={isNearBottom ? "top-right" : "bottom-right"}
            onOpenChange={setIsPopoverOpen}
          />
        )}
      </div>

      <CustomInput
        id={`cell_${sIdx}_remarks`}
        name="teacherRemarks"
        type="text"
        size="sm"
        disabled={isLocked}
        value={remarksVal}
        onFocus={() => setIsFocused(true)}
        onChange={(val) =>
          handleRemarksChange(stId, typeof val === "string" ? val : val?.target?.value ?? "")
        }
        onKeyDown={(e) =>
          handleKeyDown(e, sIdx, "remarks", studentsCount, componentsCount)
        }
        placeholder="Optional feedback..."
        className="w-full"
        inputClassName="text-xs"
      />
    </div>
  );
});

export default function MarkEntryGridTable({
  title = "Student Marks Evaluation",
  students = [],
  components = [],
  fullMarks = 100,
  passMarks = 33,
  marksGrid = {},
  validationErrors = {},
  isLocked = false,
  gradingRules = [],
  quickFillActions = [],
  handleCellChange,
  handleToggleAbsent,
  handleRemarksChange,
  handleKeyDown,
}) {
  // Construct dynamic columns for DataTable
  const columns = useMemo(() => {
    const cols = [
      // 1. Roll Number
      {
        key: 'roll',
        header: 'Roll',
        rotatable: false,
        sortable: true,
        align: 'center',
        sortValue: (st) => {
          const r = st.roll_number || st.roll || st.uniq_id || '';
          return isNaN(Number(r)) ? String(r) : Number(r);
        },
        headerClassName: 'w-16 min-w-[64px] max-w-[64px] text-center text-xs font-bold px-1',
        className: 'w-16 min-w-[64px] max-w-[64px] font-bold theme-text-primary text-center px-1',
        render: (st) => st.roll_number || st.roll || st.uniq_id || '-',
      },

      // 3. Student Name & Unique ID
      {
        key: 'name',
        header: 'Student Name',
        rotatable: false,
        sortable: true,
        sortValue: (st) => (st.name || st.student_name || '').toLowerCase(),
        headerClassName: 'min-w-[200px] text-xs font-bold px-3',
        className: 'min-w-[200px] px-3',
        render: (st) => {
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

      // 4. Attendance (Is Absent Toggle)
      {
        key: 'attendance',
        header: 'Status',
        rotatable: false,
        align: 'center',
        sortable: true,
        sortValue: (st) => (marksGrid[String(st.id)]?.isAbsent ? 1 : 0),
        headerClassName: 'w-[90px] min-w-[90px] max-w-[96px] text-center text-xs font-bold px-1',
        className: 'w-[90px] min-w-[90px] max-w-[96px] text-center px-1',
        render: (st) => {
          const stId = String(st.id);
          const isAbsent = Boolean(marksGrid[stId]?.isAbsent);
          return (
            <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
              <CustomCheckbox
                id={`absent_${stId}`}
                label="Absent"
                labelPosition="right"
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

    // 5. Dynamic Component Marks Columns (Uniform Equal Size for All Mark Columns)
    components.forEach((comp, cIdx) => {
      const compKey = `comp_${cIdx}`;

      cols.push({
        key: comp.id || compKey,
        header: comp.name,
        rotatable: false,
        align: 'center',
        sortable: true,
        sortValue: (st) => {
          const rowData = marksGrid[String(st.id)] || {};
          if (rowData.isAbsent) return -1;
          const val = rowData.componentMarks?.[compKey];
          return val === '' || val === undefined ? -1 : Number(val);
        },
        headerClassName: 'w-[96px] min-w-[90px] max-w-[110px] text-center text-xs font-bold px-1',
        className: 'w-[96px] min-w-[90px] max-w-[110px] text-center px-1',
        render: (st, sIdx) => {
          const stId = String(st.id);
          const rowData = marksGrid[stId] || {};
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
                onChange={(val) =>
                  handleCellChange(stId, compKey, typeof val === 'string' ? val : val?.target?.value ?? '', comp.maxMarks)
                }
                onKeyDown={(e) =>
                  handleKeyDown(e, sIdx, cIdx, students.length, components.length)
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

    // 6. Total Marks Column (Uniform Equal Size matching components)
    cols.push({
      key: 'total',
      header: 'Total',
      rotatable: false,
      align: 'center',
      sortable: true,
      sortValue: (st) => {
        const rowData = marksGrid[String(st.id)] || {};
        if (rowData.isAbsent) return -1;
        const val = rowData.obtainedMarks !== undefined && rowData.obtainedMarks !== ''
          ? rowData.obtainedMarks
          : (rowData.totalMarks !== undefined ? rowData.totalMarks : '');
        return val === '' || val === undefined ? -1 : Number(val);
      },
      headerClassName: 'w-[96px] min-w-[90px] max-w-[110px] text-center text-xs font-bold px-1',
      className: 'w-[96px] min-w-[90px] max-w-[110px] text-center font-bold text-xs px-1',
      render: (st) => {
        const rowData = marksGrid[String(st.id)] || {};
        if (rowData.isAbsent) {
          return <span className="theme-text-danger font-semibold text-xs">ABS</span>;
        }

        const obtained = rowData.obtainedMarks !== undefined && rowData.obtainedMarks !== ''
          ? rowData.obtainedMarks
          : (rowData.totalMarks !== undefined && rowData.totalMarks !== '' ? rowData.totalMarks : '');

        if (obtained === '' || obtained === null || obtained === undefined) {
          return <span className="theme-text-secondary text-xs">-</span>;
        }

        return <span className="theme-text-primary text-xs font-bold font-mono">{obtained}</span>;
      },
    });

    // 7. Computed Grade & Result Status Column
    cols.push({
      key: 'grade',
      header: 'Grade',
      rotatable: false,
      align: 'center',
      sortable: true,
      sortValue: (st) => {
        const rowData = marksGrid[String(st.id)] || {};
        if (rowData.isAbsent) return -1;
        const obtained = rowData.obtainedMarks !== undefined && rowData.obtainedMarks !== ''
          ? rowData.obtainedMarks
          : rowData.totalMarks;
        if (obtained === '' || obtained === undefined || obtained === null) return -1;
        const num = Number(obtained) || 0;
        const pct = fullMarks > 0 ? (num / fullMarks) * 100 : 0;
        const gradeEval = examStore.evaluateGrade(pct, gradingRules);
        return gradeEval?.gradePoint ?? -1;
      },
      headerClassName: 'w-[96px] min-w-[90px] max-w-[110px] text-center text-xs font-bold px-1',
      className: 'w-[96px] min-w-[90px] max-w-[110px] text-center px-1',
      render: (st) => {
        const rowData = marksGrid[String(st.id)] || {};
        const failingRule = (gradingRules || []).find((r) => r.isPass === false || Number(r.gradePoint) === 0) || (gradingRules || [])[(gradingRules || []).length - 1];

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

        const obtained = rowData.obtainedMarks !== undefined && rowData.obtainedMarks !== ''
          ? rowData.obtainedMarks
          : rowData.totalMarks;
        const hasMarks = obtained !== '' && obtained !== undefined && obtained !== null;

        if (hasMarks) {
          const num = Number(obtained) || 0;
          const pct = fullMarks > 0 ? (num / fullMarks) * 100 : 0;
          const gradeEval = examStore.evaluateGrade(pct, gradingRules);
          const isPass = num >= passMarks && gradeEval?.isPass !== false;
          const grade = rowData.grade || (isPass ? gradeEval?.grade : (failingRule?.grade || gradeEval?.grade));
          const gpa = rowData.gpa !== undefined ? rowData.gpa : (isPass ? gradeEval?.gradePoint : (failingRule?.gradePoint ?? 0));

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

    // 8. Teacher Remarks Column (Expands on focus with zero inactive space)
    cols.push({
      key: 'remarks',
      header: 'Remarks',
      rotatable: false,
      sortable: true,
      sortValue: (st) => (marksGrid[String(st.id)]?.teacherRemarks || '').toLowerCase(),
      headerClassName: 'min-w-[220px] text-xs font-bold px-3',
      className: 'min-w-[220px] px-3',
      render: (st, sIdx) => {
        const stId = String(st.id);
        const rowData = marksGrid[stId] || {};
        const remarksVal = rowData.teacherRemarks || '';
        const isNearBottom = sIdx >= students.length - 2 && students.length > 3;

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
            studentsCount={students.length}
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
    gradingRules,
    students.length,
    handleCellChange,
    handleToggleAbsent,
    handleRemarksChange,
    handleKeyDown,
  ]);

  const fullMarksSubHeaderRow = useMemo(() => {
    const row = {
      roll: '-',
      name: 'Full Marks',
      status: '-',
      total: fullMarks !== undefined && fullMarks !== null ? String(fullMarks) : '-',
      grade: '-',
      remarks: '-',
    };
    (components || []).forEach((comp, cIdx) => {
      row[comp.id || `comp_${cIdx}`] = comp.maxMarks !== undefined ? String(comp.maxMarks) : '-';
    });
    return row;
  }, [components, fullMarks]);

  return (
    <div className="print:hidden w-full space-y-3">
      <DataTable
        showSerial={true}
        tableTitle={`${title} (${students.length})`}
        tableTitleIcon={AcademicCapIcon}
        verticalHeaders={false}
        subHeaderRow={fullMarksSubHeaderRow}
        headerActions={
          quickFillActions && quickFillActions.length > 0 ? (
            <ActionMenu
              label="Quick Fill"
              icon={SparklesIcon}
              items={quickFillActions}
              disabled={isLocked}
              size="sm"
              variant="sub"
              align="right"
              menuClassName="w-56"
            />
          ) : null
        }
        columns={columns}
        data={students}
        keyExtractor={(st) => String(st.id)}
        emptyTitle="No Students Found"
        emptySubMessage="No active student records enrolled under this class and section."
        emptyIcon={AcademicCapIcon}
        sortable={true}
        selectable={false}
        rowClassName={(st) => (marksGrid[String(st.id)]?.isAbsent ? 'opacity-60 theme-bg-sub/20' : '')}
        cellPaddingClass="py-2.5 px-3"
      />
    </div>
  );
}
