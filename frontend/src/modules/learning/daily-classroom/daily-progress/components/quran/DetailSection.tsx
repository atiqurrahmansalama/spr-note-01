import React, { useState } from "react";
import DetailRow from "./DetailRow";
import { SectionHeaderBar, AddMoreSectionButton } from "./QuranRowUI";
import { DetailRowData } from "../../types";

export interface DetailSectionProps {
  title: string;
  listType: "mistake" | "stuck" | string;
  data: DetailRowData[];
  onChange: (updater: DetailRowData[] | ((prevData: DetailRowData[]) => DetailRowData[])) => void;
  availableJuzs?: (string | number)[];
  juzPageData?: any[];
  draggedItem?: { listType: string; index: number } | null;
  onDragStart?: (e: React.DragEvent | React.PointerEvent, listType: string, index: number) => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, listType: string, index?: number) => void;
  onReorderRows?: (sourceListType: string, sourceIndex: number, targetListType: string, targetIndex?: number, isCopy?: boolean) => void;
  onReset?: () => void;
}

export default function DetailSection({
  title,
  listType,
  data,
  onChange,
  availableJuzs,
  juzPageData,
  draggedItem,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onReorderRows,
  onReset,
}: DetailSectionProps) {
  const [isSectionDragOver, setIsSectionDragOver] = useState(false);

  const activeDrag = draggedItem || (typeof window !== "undefined" ? (window as any).__spr_active_drag_item : null);
  const isOtherListDragging = Boolean(activeDrag && activeDrag.listType !== listType);

  const addRow = () => {
    const newId = crypto.randomUUID();
    onChange((prevData) => {
      const defaultJuz =
        (availableJuzs && availableJuzs.length > 0 ? availableJuzs[0] : "") ||
        (juzPageData?.find((r) => r.juz && String(r.juz).trim() !== "")?.juz || "");
      const lastJuz =
        prevData.length > 0 && prevData[prevData.length - 1].juz
          ? prevData[prevData.length - 1].juz
          : defaultJuz;
      return [
        ...prevData,
        {
          id: newId,
          juz: lastJuz,
          page: "",
          ayahs: [{ id: crypto.randomUUID(), value: "" }],
        },
      ];
    });

    // Auto-focus new row's page box
    setTimeout(() => {
      const el = document.getElementById(`page-${newId}`);
      if (el) {
        el.focus();
        if (typeof (el as HTMLInputElement).select === "function") (el as HTMLInputElement).select();
      }
    }, 60);
  };

  const handleRemoveRow = (index: number) => {
    onChange((prevData) => {
      if (prevData.length > 1) {
        return prevData.filter((_, idx) => idx !== index);
      }
      return prevData;
    });
  };

  const handleRowChange = (index: number, newRow: DetailRowData | ((prevRow: DetailRowData) => DetailRowData)) => {
    onChange((prevData) => {
      const newData = [...prevData];
      newData[index] = typeof newRow === "function" ? newRow(newData[index]) : newRow;
      return newData;
    });
  };

  const handleNextSection = () => {
    if (listType === "mistake") {
      const stuckInputs = Array.from(document.querySelectorAll('input[id^="page-"]')) as HTMLInputElement[];
      const stuckPageInput = stuckInputs.find((el) => {
        const parent = el.closest('[data-list-type="stuck"]');
        return parent !== null;
      }) || document.querySelector<HTMLInputElement>('[data-list-type="stuck"] input');

      if (stuckPageInput) {
        stuckPageInput.focus();
        if (stuckPageInput.select) stuckPageInput.select();
        return;
      }
    }

    const commentEl = (document.getElementById("comment-textarea") || document.querySelector("textarea")) as HTMLElement | null;
    if (commentEl) {
      commentEl.focus();
    }
  };

  const calculateTotalCount = () => {
    if (!data || !Array.isArray(data)) return 0;
    let count = 0;
    data.forEach((row) => {
      const hasPage = row.page && String(row.page).trim() !== "";
      if (hasPage) {
        const filledAyahs = row.ayahs?.filter((a) => a.value && String(a.value).trim() !== "") || [];
        count += filledAyahs.length;
      }
    });
    return count;
  };

  const totalCount = calculateTotalCount();

  const hasContent = data && data.length > 0 && data.some((row, idx) => {
    if (idx > 0) return true;
    if (row.page && String(row.page).trim() !== "") return true;
    if (row.ayahs && row.ayahs.length > 1) return true;
    if (row.ayahs && row.ayahs.some((a) => a.value && String(a.value).trim() !== "")) return true;
    return false;
  });

  const handleSectionDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (onDragOver) onDragOver(e);
    setIsSectionDragOver(true);
  };

  const handleSectionDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsSectionDragOver(false);
    }
  };

  const handleSectionDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsSectionDragOver(false);

    let sourceListType =
      draggedItem?.listType ||
      (typeof window !== "undefined" ? (window as any).__spr_active_drag_item?.listType : undefined);
    let sourceIndex =
      draggedItem?.index ??
      (typeof window !== "undefined" ? (window as any).__spr_active_drag_item?.index : undefined);

    if (sourceListType === undefined || sourceIndex === undefined) {
      try {
        const raw = e.dataTransfer.getData("application/json") || e.dataTransfer.getData("text/plain");
        if (raw) {
          const parsed = JSON.parse(raw);
          sourceListType = parsed.listType;
          sourceIndex = parsed.index;
        }
      } catch {
        // Ignore
      }
    }

    const isCopy = e.ctrlKey || e.altKey;

    if (onReorderRows && sourceListType !== undefined && sourceIndex !== undefined) {
      onReorderRows(sourceListType, sourceIndex, listType, data.length, isCopy);
    } else if (onDrop) {
      onDrop(e, listType, data.length);
    }
  };

  return (
    <div
      data-list-type={listType}
      className={`relative transition-colors duration-200 rounded-2xl p-1.5 -m-1.5 ${
        isSectionDragOver && isOtherListDragging
          ? "ring-2 ring-dashed ring-[var(--accent-main)]/60 bg-[var(--accent-main)]/5"
          : ""
      }`}
      onDragOver={handleSectionDragOver}
      onDragLeave={handleSectionDragLeave}
      onDrop={handleSectionDrop}
    >
      {/* Reusable Section Header Bar */}
      <SectionHeaderBar
        title={title}
        count={totalCount}
        showReset={Boolean(onReset && hasContent)}
        onReset={onReset}
        resetTitle={`Reset ${title}`}
      />

      <div className="space-y-0">
        {(data || []).map((row, idx) => (
          <DetailRow
            key={row.id}
            index={idx}
            isLastRow={idx === data.length - 1}
            listType={listType}
            rowData={row}
            onChange={(newR) => handleRowChange(idx, newR)}
            onRemoveRow={data.length > 1 ? () => handleRemoveRow(idx) : undefined}
            onAddNewRow={addRow}
            onNextSection={handleNextSection}
            availableJuzs={availableJuzs}
            juzPageData={juzPageData}
            draggedItem={draggedItem}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onReorderRows={onReorderRows}
          />
        ))}
      </div>

      {/* Reusable + Add More Button */}
      <AddMoreSectionButton onClick={addRow} label="+ Add More" />
    </div>
  );
}
