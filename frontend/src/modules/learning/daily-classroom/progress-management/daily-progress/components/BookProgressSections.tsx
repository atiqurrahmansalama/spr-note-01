import React, { useMemo, useCallback } from "react";
import PageRangeInput, { type PageRange } from "@/components/ui/PageRangeInput";
import { handleEnterFocusNext, handleBackspaceFocusPrev } from "@/utils/keyboardUtils";
import { useRowDragDrop } from "../hooks";
import {
  SectionHeaderBar,
  AddMoreSectionButton,
  RowAddCircleButton,
  ItemCommaSeparator,
  DraggableRowWrapper,
  ProgressNumberBox,
  removeArrayItem,
  updateArrayItem,
} from "./DailyProgressUIControls";
import type { JuzRowData, DetailRowData } from "../types";

// ══════════════════════════════════════════════════════════════════════════════
// 2. BOOK PAGE ROW COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export interface BookPageRowProps {
  rowData: JuzRowData;
  index: number;
  prevRowLastRangeId?: string;
  onChange: (updater: (prevRow: JuzRowData) => JuzRowData) => void;
  onRemoveRow?: () => void;
  onAddNewRow?: () => void;
  onNextSection?: () => void;
  draggedItem?: { listType: string; index: number } | null;
  onDragStart?: (e: React.DragEvent | React.PointerEvent, listType: string, index: number) => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, listType: string, index?: number) => void;
  onReorderRows?: (
    sourceListType: string,
    sourceIndex: number,
    targetListType: string,
    targetIndex?: number,
    isCopy?: boolean
  ) => void;
}

export function BookPageRow({
  rowData,
  index,
  prevRowLastRangeId,
  onChange,
  onRemoveRow,
  onAddNewRow,
  onNextSection,
  draggedItem,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onReorderRows,
}: BookPageRowProps) {
  const { dropPosition, isDragging, rowContainerProps, dragHandleProps } = useRowDragDrop({
    listType: "book-page",
    index,
    draggedItem,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDrop,
    onReorderRows,
  });

  const handleRangeChange = (rangeIndex: number, newRange: PageRange) => {
    onChange((prevRow) => {
      const newRanges = [...(prevRow.ranges || [])];
      const prevRange = (newRanges[rangeIndex] || {}) as Partial<PageRange>;
      newRanges[rangeIndex] = {
        ...prevRange,
        ...newRange,
        id: prevRange.id || newRange.id || `book-range-${index}-${rangeIndex}`,
      };
      return { ...prevRow, ranges: newRanges };
    });
  };

  const addRange = () => {
    const newId = `book-range-${crypto.randomUUID()}`;
    onChange((prevRow) => ({
      ...prevRow,
      ranges: [...(prevRow.ranges || []), { id: newId, start: "", end: "" }],
    }));
    setTimeout(() => {
      const el = document.getElementById(`${newId}-start`);
      if (el) el.focus();
    }, 100);
  };

  const removeRange = (rangeIndex: number) => {
    onChange((prevRow) => {
      if ((prevRow.ranges || []).length > 1) {
        return {
          ...prevRow,
          ranges: prevRow.ranges.filter((_, idx) => idx !== rangeIndex),
        };
      }
      return prevRow;
    });
  };

  return (
    <DraggableRowWrapper
      rowContainerProps={rowContainerProps}
      dropPosition={dropPosition}
      dragHandleProps={dragHandleProps}
      dragTitle="Drag to reorder Page Row"
      onRemove={onRemoveRow}
      removeTitle="Remove Page Row"
      isDragging={isDragging}
    >
      <div className="flex-1 flex flex-wrap items-center gap-2 sm:gap-2.5 min-w-0">
        {(rowData.ranges || []).map((range, rangeIndex) => {
          const isLastRange = rangeIndex === (rowData.ranges?.length || 0) - 1;
          const rangeKey = range.id || `book-range-${index}-${rangeIndex}`;
          return (
            <div key={rangeKey} className="flex items-center gap-1.5 shrink-0">
              <PageRangeInput
                idPrefix={rangeKey}
                range={range}
                startValue={range.start}
                endValue={range.end}
                size="md"
                width="w-24 sm:w-28"
                min={1}
                max={9999}
                placeholderStart="--"
                placeholderEnd="--"
                onChange={(newRange) => handleRangeChange(rangeIndex, newRange)}
                onRemove={rangeIndex > 0 ? () => removeRange(rangeIndex) : undefined}
                onAdd={addRange}
                onAddShift={addRange}
                onEmptyBackspace={(e) => {
                  if (rangeIndex === 0) {
                    if (index > 0 && onRemoveRow) {
                      e.preventDefault();
                      onRemoveRow();
                      setTimeout(() => {
                        if (prevRowLastRangeId) {
                          const targetEl = document.getElementById(`${prevRowLastRangeId}-end`);
                          if (targetEl) {
                            targetEl.focus();
                            if (typeof (targetEl as HTMLInputElement).select === "function") {
                              (targetEl as HTMLInputElement).select();
                            }
                            return;
                          }
                        }
                        handleBackspaceFocusPrev(e, true);
                      }, 50);
                    }
                  } else {
                    removeRange(rangeIndex);
                    handleBackspaceFocusPrev(e, true);
                  }
                }}
                onEndEnter={(e) => {
                  if (isLastRange && onAddNewRow) {
                    e.preventDefault();
                    onAddNewRow();
                  } else {
                    handleEnterFocusNext(e);
                  }
                }}
                onShiftEnter={(e) => {
                  if (onNextSection) {
                    e?.preventDefault?.();
                    onNextSection();
                  }
                }}
              />
              {!isLastRange && <ItemCommaSeparator />}
              {isLastRange && (
                <RowAddCircleButton
                  onAdd={addRange}
                  title="Add another Page Range"
                />
              )}
            </div>
          );
        })}
      </div>
    </DraggableRowWrapper>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. BOOK PAGE SECTION MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export interface BookPageSectionProps {
  data: JuzRowData[];
  onChange: (updater: JuzRowData[] | ((prevData: JuzRowData[]) => JuzRowData[])) => void;
  onReset?: () => void;
  onNextSection?: () => void;
  draggedItem?: { listType: string; index: number } | null;
  onDragStart?: (e: React.DragEvent | React.PointerEvent, listType: string, index: number) => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, listType: string, index?: number) => void;
  onReorderRows?: (
    sourceListType: string,
    sourceIndex: number,
    targetListType: string,
    targetIndex?: number,
    isCopy?: boolean
  ) => void;
}

export function BookPageSection({
  data,
  onChange,
  onReset,
  onNextSection,
  draggedItem,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onReorderRows,
}: BookPageSectionProps) {
  const handleRowChange = (index: number, rowUpdater: JuzRowData | ((prevRow: JuzRowData) => JuzRowData)) => {
    onChange((prevData) => updateArrayItem(prevData, index, rowUpdater, "book-page-row"));
  };

  const handleRemoveRow = (index: number) => {
    onChange((prevData) => removeArrayItem(prevData, index));
  };

  const addPageRow = () => {
    const newId = crypto.randomUUID();
    const newRangeId = `book-range-${crypto.randomUUID()}`;
    onChange((prevData) => [
      ...prevData,
      {
        id: newId,
        juz: "",
        ranges: [{ id: newRangeId, start: "", end: "" }],
      },
    ]);

    setTimeout(() => {
      const el = document.getElementById(`${newRangeId}-start`);
      if (el) {
        el.focus();
        if (typeof (el as HTMLInputElement).select === "function") (el as HTMLInputElement).select();
      }
    }, 100);
  };

  const totalPages = useMemo(() => {
    return (data || []).reduce((sum, row) => {
      const rowSum = (row.ranges || []).reduce((rSum, range) => {
        const hasStart = range.start !== undefined && String(range.start).trim() !== "";
        const hasEnd = range.end !== undefined && String(range.end).trim() !== "";
        if (hasStart && hasEnd) {
          const start = parseInt(String(range.start), 10);
          const end = parseInt(String(range.end), 10);
          if (!isNaN(start) && !isNaN(end) && end >= start) {
            return rSum + (end - start + 1);
          }
        } else if (hasStart) {
          return rSum + 1;
        }
        return rSum;
      }, 0);
      return sum + rowSum;
    }, 0);
  }, [data]);

  const hasPageData =
    (data || []).length > 1 ||
    (data || []).some((row) =>
      (row.ranges || []).some(
        (r) =>
          Boolean(r.start !== undefined && String(r.start).trim() !== "") ||
          Boolean(r.end !== undefined && String(r.end).trim() !== "")
      )
    );

  return (
    <div className="relative">
      <SectionHeaderBar
        title="PAGE DETAILS"
        count={totalPages}
        showReset={hasPageData}
        onReset={onReset}
        resetTitle="Reset Page Details Section"
      />

      <div className="space-y-1 sm:space-y-1.5">
        {data.map((row, index) => {
          const prevRow = index > 0 ? data[index - 1] : null;
          const prevRanges = prevRow?.ranges || [];
          const prevLastRange = prevRanges.length > 0 ? prevRanges[prevRanges.length - 1] : null;
          const prevRowLastRangeId = prevLastRange?.id || (prevLastRange ? `book-range-${index - 1}-${prevRanges.length - 1}` : undefined);

          return (
            <BookPageRow
              key={row.id || index}
              rowData={row}
              index={index}
              prevRowLastRangeId={prevRowLastRangeId}
              onChange={(updater) => handleRowChange(index, updater)}
              onRemoveRow={data.length > 1 ? () => handleRemoveRow(index) : undefined}
              onAddNewRow={index === data.length - 1 ? addPageRow : undefined}
              onNextSection={onNextSection}
              draggedItem={draggedItem}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onReorderRows={onReorderRows}
            />
          );
        })}
      </div>

      <AddMoreSectionButton onClick={addPageRow} label="+ Add More" />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. BOOK DETAIL ROW COMPONENT (PAGE & LINE INPUT FOR MISTAKES & STUCK)
// ══════════════════════════════════════════════════════════════════════════════

export interface BookDetailRowProps {
  rowData: DetailRowData;
  onChange: (updater: (prevRow: DetailRowData) => DetailRowData) => void;
  onRemoveRow?: () => void;
  onAddNewRow?: () => void;
  onNextSection?: () => void;
  listType?: string;
  index: number;
  isLastRow?: boolean;
  draggedItem?: { listType: string; index: number } | null;
  onDragStart?: (e: React.DragEvent | React.PointerEvent, listType: string, index: number) => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, listType: string, index?: number) => void;
  onReorderRows?: (
    sourceListType: string,
    sourceIndex: number,
    targetListType: string,
    targetIndex?: number,
    isCopy?: boolean
  ) => void;
}

export function BookDetailRow({
  rowData,
  onChange,
  onRemoveRow,
  onAddNewRow,
  onNextSection,
  listType = "mistake",
  index,
  isLastRow = false,
  draggedItem,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onReorderRows,
}: BookDetailRowProps) {
  const { dropPosition, isDragging, rowContainerProps, dragHandleProps } = useRowDragDrop({
    listType: `book-${listType}`,
    index,
    draggedItem,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDrop,
    onReorderRows,
  });

  const handlePageChange = (val: string | number) => {
    onChange((prev) => ({ ...prev, page: val }));
  };

  const handlePageWheel = (e: React.WheelEvent | WheelEvent) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    const current = Number(rowData.page) || 0;
    const direction = e.deltaY < 0 ? 1 : -1;
    const next = Math.max(1, current + direction);
    handlePageChange(next);
  };

  const handlePageEnter = (e: any) => {
    handleEnterFocusNext(e);
  };

  const handleLineChange = (lineIndex: number, val: string | number) => {
    onChange((prevRow) => {
      const newAyahs = [...(prevRow.ayahs || [])];
      newAyahs[lineIndex] = { ...newAyahs[lineIndex], value: val };
      return { ...prevRow, ayahs: newAyahs };
    });
  };

  const handleLineWheel = (lineIndex: number, e: React.WheelEvent | WheelEvent) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    const current = Number(rowData.ayahs?.[lineIndex]?.value) || 0;
    const direction = e.deltaY < 0 ? 1 : -1;
    const next = Math.max(1, current + direction);
    handleLineChange(lineIndex, next);
  };

  const handleLineEnter = (lineIndex: number, e: any, isLastLine: boolean) => {
    if (isLastRow && isLastLine && onAddNewRow) {
      e?.preventDefault?.();
      onAddNewRow();
    } else {
      handleEnterFocusNext(e);
    }
  };

  const addLine = () => {
    const newId = crypto.randomUUID();
    onChange((prevRow) => ({
      ...prevRow,
      ayahs: [...(prevRow.ayahs || []), { id: newId, value: "" }],
    }));
    setTimeout(() => {
      const el = document.getElementById(`book-line-${newId}`);
      if (el) el.focus();
    }, 100);
  };

  const removeLine = (lineIndex: number) => {
    onChange((prevRow) => {
      if ((prevRow.ayahs || []).length > 1) {
        return {
          ...prevRow,
          ayahs: prevRow.ayahs.filter((_, idx) => idx !== lineIndex),
        };
      }
      return prevRow;
    });
  };

  return (
    <DraggableRowWrapper
      rowContainerProps={rowContainerProps}
      dropPosition={dropPosition}
      dragHandleProps={dragHandleProps}
      dragTitle={`Drag to reorder ${listType === "mistake" ? "Mistake" : "Stuck"}`}
      onRemove={onRemoveRow}
      removeTitle={`Remove ${listType === "mistake" ? "Mistake" : "Stuck"} Row`}
      isDragging={isDragging}
    >
      {/* 1. Page Number Input Box (identical in size & style to Quran's PageInputBox) */}
      <ProgressNumberBox
        id={`book-page-${listType}-${rowData.id}`}
        label="Page"
        value={rowData.page}
        onChange={handlePageChange}
        onWheel={handlePageWheel}
        scrollable={true}
        onEnter={handlePageEnter}
        onShiftEnter={onNextSection}
        onAdd={addLine}
        onAddShift={addLine}
        onEmptyBackspace={(e: any) => {
          if (onRemoveRow) onRemoveRow();
          handleBackspaceFocusPrev(e, true);
        }}
        min={1}
        max={9999}
      />

      {/* 2. Line Inputs with Comma Separators & Plus Button */}
      <div className="flex-1 flex flex-wrap items-center gap-2 sm:gap-2.5 min-w-0">
        <label className="text-[11px] sm:text-xs font-semibold theme-text-secondary shrink-0 h-10 flex items-center select-none">
          Line
        </label>
        {(rowData.ayahs || []).map((lineItem, lIdx) => {
          const isLastLine = lIdx === (rowData.ayahs?.length || 0) - 1;
          return (
            <div key={lineItem.id || lIdx} className="flex items-center gap-1.5 shrink-0">
              <ProgressNumberBox
                id={`book-line-${lineItem.id}`}
                label=""
                value={lineItem.value}
                onChange={(val) => handleLineChange(lIdx, val)}
                onWheel={(e) => handleLineWheel(lIdx, e)}
                scrollable={true}
                onEnter={(e: any) => handleLineEnter(lIdx, e, isLastLine)}
                onShiftEnter={onNextSection}
                onAdd={addLine}
                onAddShift={addLine}
                onEmptyBackspace={(e: any) => {
                  if (lIdx > 0) removeLine(lIdx);
                  handleBackspaceFocusPrev(e, true);
                }}
                min={1}
                max={999}
              />
              {!isLastLine && <ItemCommaSeparator />}
              {isLastLine && (
                <RowAddCircleButton
                  onAdd={addLine}
                  title="Add another Line"
                />
              )}
            </div>
          );
        })}
      </div>
    </DraggableRowWrapper>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. BOOK DETAIL SECTION MAIN COMPONENT (MISTAKES & STUCK)
// ══════════════════════════════════════════════════════════════════════════════

export interface BookDetailSectionProps {
  title: string;
  listType: "mistake" | "stuck";
  data: DetailRowData[];
  onChange: (updater: DetailRowData[] | ((prevData: DetailRowData[]) => DetailRowData[])) => void;
  draggedItem?: { listType: string; index: number } | null;
  onDragStart?: (e: React.DragEvent | React.PointerEvent, listType: string, index: number) => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, listType: string, index?: number) => void;
  onReorderRows?: (
    sourceListType: string,
    sourceIndex: number,
    targetListType: string,
    targetIndex?: number,
    isCopy?: boolean
  ) => void;
  onReset?: () => void;
  onNextSection?: () => void;
}

export function BookDetailSection({
  title,
  listType,
  data,
  onChange,
  draggedItem,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onReorderRows,
  onReset,
  onNextSection,
}: BookDetailSectionProps) {
  const handleRowChange = (index: number, rowUpdater: (prevRow: DetailRowData) => DetailRowData) => {
    onChange((prevData) => updateArrayItem(prevData, index, rowUpdater, `book-${listType}`));
  };

  const handleRemoveRow = (index: number) => {
    onChange((prevData) => removeArrayItem(prevData, index));
  };

  const addRow = () => {
    const newId = crypto.randomUUID();
    onChange((prevData) => [
      ...prevData,
      {
        id: newId,
        juz: "",
        page: "",
        ayahs: [{ id: crypto.randomUUID(), value: "" }],
      },
    ]);

    setTimeout(() => {
      const el = document.getElementById(`book-page-${listType}-${newId}`);
      if (el) {
        el.focus();
        if (typeof (el as HTMLInputElement).select === "function") (el as HTMLInputElement).select();
      }
    }, 100);
  };

  // Total lines / count of mistakes or stuck
  const totalCount = useMemo(() => {
    return (data || []).reduce((sum, row) => {
      const validLines = (row.ayahs || []).filter(
        (a) => a.value !== undefined && a.value !== null && String(a.value).trim() !== ""
      ).length;
      return sum + validLines;
    }, 0);
  }, [data]);

  const hasData =
    (data || []).length > 1 ||
    (data || []).some(
      (r) =>
        Boolean(r.page && String(r.page).trim() !== "") ||
        (r.ayahs || []).some((a) => Boolean(a.value && String(a.value).trim() !== ""))
    );

  return (
    <div className="relative" data-section={`book-${listType}`}>
      <SectionHeaderBar
        title={title}
        count={totalCount}
        showReset={hasData}
        onReset={onReset}
        resetTitle={`Reset ${title} Section`}
      />

      <div className="space-y-1 sm:space-y-1.5">
        {data.map((row, index) => (
          <BookDetailRow
            key={row.id || index}
            rowData={row}
            index={index}
            isLastRow={index === data.length - 1}
            listType={listType}
            onChange={(rowUpdater) => handleRowChange(index, rowUpdater)}
            onRemoveRow={data.length > 1 ? () => handleRemoveRow(index) : undefined}
            onAddNewRow={addRow}
            onNextSection={onNextSection}
            draggedItem={draggedItem}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onReorderRows={onReorderRows}
          />
        ))}
      </div>

      <AddMoreSectionButton onClick={addRow} label="+ Add More" />
    </div>
  );
}

export default BookPageSection;
