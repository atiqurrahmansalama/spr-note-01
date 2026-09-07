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
        sortable: true,
        sortValue: (st) => {
          const r = st.roll_number || st.roll || st.uniq_id || '';
          return isNaN(Number(r)) ? String(r) : Number(r);
        },
        headerClassName: 'w-20 text-center text-xs font-bold',
        className: 'w-20 font-mono font-bold theme-text-primary text-center',
        render: (st) => st.roll_number || st.roll || st.uniq_id || '-',
      },

      // 3. Student Name & Unique ID
      {
        key: 'name',
        header: 'Student Name',
        sortable: true,
        sortValue: (st) => (st.name || st.student_name || '').toLowerCase(),
        headerClassName: 'min-w-[180px] text-xs font-bold',
        className: 'min-w-[180px]',
        render: (st) => {
          const sName = st.name || st.student_name || 'Unnamed Student';
          const sId = st.student_unique_id || st.student_id || st.admission_number || '';
          return (
            <div className="flex flex-col">
              <span className="font-semibold text-xs theme-text-primary truncate">{sName}</span>
              {sId && <span className="text-[10px] font-mono theme-text-secondary">{sId}</span>}
            </div>
          );
        },
      },

      // 4. Attendance (Is Absent Toggle)
      {
        key: 'attendance',
        header: 'Status',
        align: 'center',
        sortable: true,
        sortValue: (st) => (marksGrid[String(st.id)]?.isAbsent ? 1 : 0),
        headerClassName: 'w-24 text-center text-xs font-bold',
        className: 'w-24 text-center',
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

    // 5. Dynamic Component Marks Columns
    components.forEach((comp, cIdx) => {
      const compKey = `comp_${cIdx}`;

      cols.push({
        key: comp.id || compKey,
        header: `${comp.name} (${comp.maxMarks})`,
        align: 'center',
        sortable: true,
        sortValue: (st) => {
          const rowData = marksGrid[String(st.id)] || {};
          if (rowData.isAbsent) return -1;
          const val = rowData.componentMarks?.[compKey];
          return val === '' || val === undefined ? -1 : Number(val);
        },
        headerClassName: 'min-w-[90px] text-center text-xs font-bold',
        className: 'text-center',
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
                className="!w-14 !px-1 !min-h-[32px] !h-8"
                inputClassName="text-center font-mono font-bold text-xs"
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

    // 6. Total Marks Column
    cols.push({
      key: 'total',
      header: `Total (${fullMarks})`,
      align: 'center',
      sortable: true,
      sortValue: (st) => {
        const rowData = marksGrid[String(st.id)] || {};
        if (rowData.isAbsent) return -1;
        return Number(rowData.totalMarks ?? 0);
      },
      headerClassName: 'w-24 text-center text-xs font-bold',
      className: 'w-24 text-center font-mono font-bold text-xs',
      render: (st) => {
        const rowData = marksGrid[String(st.id)] || {};
        if (rowData.isAbsent) {
          return <span className="theme-text-danger font-semibold text-xs">ABS</span>;
        }

        const tot = rowData.totalMarks !== undefined ? rowData.totalMarks : '-';
        return <span className="theme-text-primary text-xs">{tot}</span>;
      },
    });

    // 7. Computed Grade & Result Status Column
    cols.push({
      key: 'grade',
      header: 'Grade',
      align: 'center',
      sortable: true,
      sortValue: (st) => (marksGrid[String(st.id)]?.grade || '').toLowerCase(),
      headerClassName: 'w-20 text-center text-xs font-bold',
      className: 'w-20 text-center',
      render: (st) => {
        const rowData = marksGrid[String(st.id)] || {};
        if (rowData.isAbsent) {
          return (
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md theme-bg-danger-soft theme-danger border border-red-500/20">
              F
            </span>
          );
        }

        const grade = rowData.grade;
        const isPass = rowData.isPassed;

        if (grade) {
          return (
            <div className="flex items-center justify-center gap-1">
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-md font-mono border ${
                  isPass
                    ? 'theme-bg-accent-soft theme-accent border-[var(--accent-main)]/30'
                    : 'theme-bg-danger-soft theme-danger border-red-500/20'
                }`}
              >
                {grade}
              </span>
              {rowData.gpa !== undefined && (
                <span className="text-[10px] theme-text-secondary font-mono">
                  ({Number(rowData.gpa).toFixed(1)})
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
      sortable: true,
      sortValue: (st) => (marksGrid[String(st.id)]?.teacherRemarks || '').toLowerCase(),
      headerClassName: 'min-w-[240px] text-xs font-bold',
      className: 'min-w-[240px]',
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

  return (
    <div className="print:hidden w-full space-y-3">
      {/* ─── Compact Header Row (Classes table pattern: Zero Background Box) ─── */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <AcademicCapIcon className="w-4 h-4 theme-accent" />
          <h5 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
            {title} ({students.length})
          </h5>
        </div>

        {/* Top-Right Single Quick Fill Action Button */}
        {quickFillActions && quickFillActions.length > 0 && (
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
        )}
      </div>

      <DataTable
        showSerial={true}
        columns={columns}
        data={students}
        keyExtractor={(st) => String(st.id)}
        emptyTitle="No Students Found"
        emptySubMessage="No active student records enrolled under this class and section."
        emptyIcon={AcademicCapIcon}
        sortable={true}
        selectable={false}
        theadClassName="text-xs tracking-wider font-extrabold"
        rowClassName={(st) => (marksGrid[String(st.id)]?.isAbsent ? 'opacity-60 theme-bg-sub/20' : '')}
        cellPaddingClass="py-2.5 px-3"
      />
    </div>
  );
}
