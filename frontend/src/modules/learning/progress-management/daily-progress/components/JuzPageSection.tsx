import React from "react";
import { PlusIcon } from "@/components/ui/Icons";
import IconButton from "@/components/ui/IconButton";
import CustomInput from "@/components/ui/CustomInput";
import PageRangeInput, { type PageRange } from "@/components/ui/PageRangeInput";
import { handleEnterFocusNext, handleBackspaceFocusPrev } from "@/utils/keyboardUtils";
import { QURAN_RULES, getMaxPageForJuz } from "../quranRules";
import {
  RowRemoveButton,
  SectionHeaderBar,
  AddMoreSectionButton,
} from "./DailyProgressUIControls";
import type { JuzRowData } from "../types";

export function JuzRow({
  rowData,
  onChange,
  onRemoveJuz,
  onAddJuz,
}: {
  rowData: JuzRowData;
  onChange: (updater: (prevRow: JuzRowData) => JuzRowData) => void;
  onRemoveJuz?: () => void;
  onAddJuz?: () => void;
}) {
  const handleJuzChange = (val: string | number) => {
    onChange((prevRow) => ({ ...prevRow, juz: val }));
  };

  const handleJuzBlur = () => {
    if (rowData.juz !== "" && rowData.juz !== undefined && rowData.juz !== null) {
      let j = parseInt(String(rowData.juz), 10);
      if (!isNaN(j)) {
        if (j < QURAN_RULES.MIN_JUZ) j = QURAN_RULES.MIN_JUZ;
        if (j > QURAN_RULES.MAX_JUZ) j = QURAN_RULES.MAX_JUZ;
        if (j !== Number(rowData.juz)) handleJuzChange(j);
      }
    }
  };

  const handleRangeChange = (index: number, newRange: PageRange) => {
    onChange((prevRow) => {
      const newRanges = [...prevRow.ranges];
      newRanges[index] = newRange;
      return { ...prevRow, ranges: newRanges };
    });
  };

  const addRange = () => {
    const newId = crypto.randomUUID();
    onChange((prevRow) => ({
      ...prevRow,
      ranges: [...prevRow.ranges, { id: newId, start: "", end: "" }],
    }));
    setTimeout(() => {
      const el = document.getElementById(`${newId}-start`);
      if (el) el.focus();
    }, 100);
  };

  const removeRange = (index: number) => {
    onChange((prevRow) => {
      if (prevRow.ranges.length > 1) {
        const newRanges = prevRow.ranges.filter((_, idx) => idx !== index);
        return { ...prevRow, ranges: newRanges };
      }
      return prevRow;
    });
  };

  return (
    <div className="flex items-start gap-2 sm:gap-3 w-full py-1.5 px-2 sm:px-3 -mx-2 sm:-mx-3 rounded-xl relative group hover:theme-bg-elevated transition-colors duration-150 select-none">
      <div className="flex items-center gap-1 shrink-0 h-10 self-start">
        <label className="text-[11px] sm:text-xs font-semibold theme-text-secondary select-none">Juz</label>
        <div className="theme-bg-sub rounded-lg border theme-border overflow-hidden h-10 w-12 sm:w-14 shadow-xs shrink-0 transition-all focus-within:border-[var(--accent-main)]/50 focus-within:ring-1 focus-within:ring-[var(--accent-main)]/30 flex items-center justify-center">
          <CustomInput
            id={rowData.juzInputId}
            type="number"
            variant="borderless"
            scrollable={true}
            allowDecimals={false}
            value={rowData.juz}
            onChange={handleJuzChange}
            onBlur={handleJuzBlur}
            onEnter={handleEnterFocusNext}
            onAdd={onAddJuz}
            onAddShift={onAddJuz}
            onEmptyBackspace={(e: any) => {
              if (onRemoveJuz) onRemoveJuz();
              handleBackspaceFocusPrev(e, true);
            }}
            min={QURAN_RULES.MIN_JUZ}
            max={QURAN_RULES.MAX_JUZ}
            placeholder="--"
            className="w-full h-full p-0 min-h-0"
            wrapperClassName="w-full h-full"
            inputClassName="w-full h-full text-center text-xs sm:text-sm theme-text-primary font-semibold font-mono p-0"
          />
        </div>
      </div>

      <div className="flex-1 flex flex-wrap items-center gap-2 sm:gap-2.5 min-w-0">
        {(rowData.ranges || []).map((range, index) => {
          const isLastRange = index === (rowData.ranges?.length || 0) - 1;
          return (
            <div key={range.id || index} className="flex items-center gap-1.5 shrink-0">
              <PageRangeInput
                idPrefix={range.id}
                startValue={range.start}
                endValue={range.end}
                size="md"
                width="w-24 sm:w-28"
                min={QURAN_RULES.MIN_PAGE}
                max={getMaxPageForJuz(rowData.juz)}
                onChange={(newRange) => handleRangeChange(index, newRange)}
                onRemove={index > 0 ? () => removeRange(index) : undefined}
                onAdd={addRange}
                onAddShift={addRange}
                onEnter={handleEnterFocusNext}
              />
              {!isLastRange && (
                <span className="theme-text-secondary font-semibold text-xs sm:text-sm select-none -ml-0.5">
                  ,
                </span>
              )}
              {isLastRange && (
                <IconButton
                  icon={PlusIcon}
                  size="xs"
                  variant="ghost"
                  shape="circle"
                  onClick={addRange}
                  title="Add another Page Range"
                  ariaLabel="Add another Page Range"
                  className="border theme-border hover:theme-bg-surface hover:theme-text-primary shrink-0"
                />
              )}
            </div>
          );
        })}
      </div>

      <RowRemoveButton onRemove={onRemoveJuz} title="Remove Juz Row" />
    </div>
  );
}

export function JuzPageSection({
  data,
  onChange,
  onReset,
}: {
  data: JuzRowData[];
  onChange: (updater: JuzRowData[] | ((prevData: JuzRowData[]) => JuzRowData[])) => void;
  onReset?: () => void;
}) {
  const handleRowChange = (index: number, rowUpdater: JuzRowData | ((prevRow: JuzRowData) => JuzRowData)) => {
    onChange((prevData) => {
      const newData = [...prevData];
      const oldRow = newData[index];
      newData[index] = typeof rowUpdater === "function" ? rowUpdater(oldRow) : rowUpdater;
      return newData;
    });
  };

  const handleRemoveJuz = (index: number) => {
    onChange((prevData) => {
      if (prevData.length > 1) {
        return prevData.filter((_, idx) => idx !== index);
      }
      return prevData;
    });
  };

  const addJuzRow = () => {
    const newJuzId = `juz-input-${crypto.randomUUID()}`;
    onChange((prevData) => [
      ...prevData,
      {
        id: crypto.randomUUID(),
        juz: "",
        juzInputId: newJuzId,
        ranges: [{ id: crypto.randomUUID(), start: "", end: "" }],
      },
    ]);

    setTimeout(() => {
      const el = document.getElementById(newJuzId);
      if (el) {
        el.focus();
        if (typeof (el as HTMLInputElement).select === "function") (el as HTMLInputElement).select();
      }
    }, 100);
  };

  const totalPages = (data || []).reduce((sum, row) => {
    const hasJuz = row.juz && String(row.juz).trim() !== "";
    if (!hasJuz) return sum;

    const rowSum = (row.ranges || []).reduce((rSum, range) => {
      const hasStart = range.start !== undefined && String(range.start).trim() !== "";
      const hasEnd = range.end !== undefined && String(range.end).trim() !== "";
      if (hasStart && hasEnd) {
        const start = parseInt(String(range.start), 10);
        const end = parseInt(String(range.end), 10);
        if (!isNaN(start) && !isNaN(end) && end >= start) {
          return rSum + (end - start + 1);
        }
      }
      return rSum;
    }, 0);
    return sum + rowSum;
  }, 0);

  const hasJuzData =
    (data || []).length > 1 ||
    (data || []).some(
      (row) =>
        Boolean(row.juz && String(row.juz).trim() !== "") ||
        (row.ranges || []).some(
          (r) =>
            Boolean(r.start !== undefined && String(r.start).trim() !== "") ||
            Boolean(r.end !== undefined && String(r.end).trim() !== "")
        )
    );

  return (
    <div className="relative">
      <SectionHeaderBar
        title="JUZ / PAGE DETAILS"
        count={totalPages}
        showReset={hasJuzData}
        onReset={onReset}
        resetTitle="Reset Juz & Page Section"
      />

      <div className="space-y-1 sm:space-y-1.5">
        {data.map((row, index) => (
          <JuzRow
            key={row.id || index}
            rowData={row}
            onChange={(updater) => handleRowChange(index, updater)}
            onRemoveJuz={data.length > 1 ? () => handleRemoveJuz(index) : undefined}
            onAddJuz={index === data.length - 1 ? addJuzRow : undefined}
          />
        ))}
      </div>

      <AddMoreSectionButton onClick={addJuzRow} label="+ Add More" />
    </div>
  );
}
