import React from "react";
import JuzRow from "./JuzRow";
import { SectionHeaderBar, AddMoreSectionButton } from "./QuranRowUI";
import { JuzRowData } from "../../types";

export interface JuzPageSectionProps {
  data: JuzRowData[];
  onChange: (updater: JuzRowData[] | ((prevData: JuzRowData[]) => JuzRowData[])) => void;
  onReset?: () => void;
}

export default function JuzPageSection({ data, onChange, onReset }: JuzPageSectionProps) {
  const handleRowChange = (index: number, rowUpdater: JuzRowData | ((prevRow: JuzRowData) => JuzRowData)) => {
    onChange((prevData) => {
      const newData = [...prevData];
      const oldRow = newData[index];
      const newRow = typeof rowUpdater === "function" ? rowUpdater(oldRow) : rowUpdater;
      newData[index] = newRow;
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

  const handleReset = () => {
    if (onReset) {
      onReset();
    } else {
      onChange([
        {
          id: crypto.randomUUID(),
          juz: "",
          juzInputId: `juz-input-${crypto.randomUUID()}`,
          ranges: [{ id: crypto.randomUUID(), start: "", end: "" }],
        },
      ]);
    }
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

  const hasContent = data && data.length > 0 && data.some((row, idx) => {
    if (idx > 0) return true;
    if (row.juz && String(row.juz).trim() !== "") return true;
    if (row.ranges && row.ranges.length > 1) return true;
    if (row.ranges && row.ranges.some((r) => (r.start && String(r.start).trim() !== "") || (r.end && String(r.end).trim() !== ""))) return true;
    return false;
  });

  return (
    <div className="relative">
      {/* Title Header Row with Badge and Refresh Icon */}
      <SectionHeaderBar
        title="JUZ / PAGE DETAILS"
        count={totalPages}
        showReset={hasContent}
        onReset={handleReset}
        resetTitle="Reset Juz / Page Details"
      />

      {/* Rows Container */}
      <div className="space-y-0.5">
        {(data || []).map((row, index) => (
          <JuzRow
            key={row.id}
            rowData={row}
            onChange={(rowUpdater) => handleRowChange(index, rowUpdater)}
            onRemoveJuz={data.length > 1 ? () => handleRemoveJuz(index) : undefined}
            onAddJuz={addJuzRow}
          />
        ))}
      </div>

      {/* Add Juz Row Button */}
      <AddMoreSectionButton onClick={addJuzRow} label="+ Add More" />
    </div>
  );
}
