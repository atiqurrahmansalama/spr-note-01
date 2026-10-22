import React, { useState, useEffect, useMemo, useCallback } from "react";
import PageRangeInput, { type PageRange } from "@/components/ui/PageRangeInput";
import { handleEnterFocusNext, handleBackspaceFocusPrev } from "@/utils/keyboardUtils";
import { QURAN_RULES, getMaxPageForJuz, getJuzPageBounds, quranTrackingSession } from "../quranRules";
import { useQuranTrackingSession, useRowDragDrop } from "../hooks";
import {
  SectionHeaderBar,
  AddMoreSectionButton,
  RowAddCircleButton,
  ItemCommaSeparator,
  DraggableRowWrapper,
  ProgressNumberBox,
  JuzInputBox,
  PageInputBox,
  AyahInputBox,
  stepValueCircular,
  clampToAllowedOrRange,
  removeArrayItem,
  updateArrayItem,
} from "./DailyProgressUIControls";
import type { JuzRowData, DetailRowData } from "../types";

// Re-export shared UI controls & primitives for backward compatibility
export {
  ProgressNumberBox,
  JuzInputBox,
  PageInputBox,
  AyahInputBox,
  stepValueCircular,
  clampToAllowedOrRange,
  removeArrayItem,
  updateArrayItem,
};

// ══════════════════════════════════════════════════════════════════════════════
// 3. JUZ & PAGE SECTION ROW COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export function JuzRow({
  rowData,
  onChange,
  onRemoveJuz,
  onAddJuz,
  onNextSection,
  index,
  showJuz = true,
  maxPage = 9999,
  draggedItem,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onReorderRows,
}: {
  rowData: JuzRowData;
  onChange: (updater: (prevRow: JuzRowData) => JuzRowData) => void;
  onRemoveJuz?: () => void;
  onAddJuz?: () => void;
  onNextSection?: () => void;
  index: number;
  showJuz?: boolean;
  maxPage?: number;
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
}) {
  const { dropPosition, isDragging, rowContainerProps, dragHandleProps } = useRowDragDrop({
    listType: showJuz ? "juz" : "page",
    index,
    draggedItem,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDrop,
    onReorderRows,
  });

  const handleJuzChange = (val: string | number) => {
    onChange((prevRow) => ({ ...prevRow, juz: val }));
  };

  const handleJuzBlur = () => {
    const clamped = clampToAllowedOrRange(rowData.juz, null, QURAN_RULES.MIN_JUZ, QURAN_RULES.MAX_JUZ);
    if (clamped !== null && clamped !== Number(rowData.juz)) {
      handleJuzChange(clamped);
    }
  };

  const handleRangeChange = (rangeIndex: number, newRange: PageRange) => {
    onChange((prevRow) => {
      const newRanges = [...prevRow.ranges];
      const prevRange = (newRanges[rangeIndex] || {}) as Partial<PageRange>;
      newRanges[rangeIndex] = {
        ...prevRange,
        ...newRange,
        id: prevRange.id || newRange.id || `range-${rangeIndex}`,
      };
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

  const removeRange = (rangeIndex: number) => {
    onChange((prevRow) => {
      if (prevRow.ranges.length > 1) {
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
      dragTitle={showJuz ? "Drag to reorder Juz" : "Drag to reorder Page"}
      onRemove={onRemoveJuz}
      removeTitle={showJuz ? "Remove Juz Row" : "Remove Page Row"}
      isDragging={isDragging}
    >
      {showJuz && (
        <JuzInputBox
          id={rowData.juzInputId || `juz-input-${rowData.id}`}
          value={rowData.juz}
          onChange={handleJuzChange}
          onBlur={handleJuzBlur}
          onEnter={handleEnterFocusNext}
          onShiftEnter={onNextSection}
          onAdd={onAddJuz}
          onAddShift={onAddJuz}
          onEmptyBackspace={(e: any) => {
            if (onRemoveJuz) onRemoveJuz();
            handleBackspaceFocusPrev(e, true);
          }}
          min={QURAN_RULES.MIN_JUZ}
          max={QURAN_RULES.MAX_JUZ}
        />
      )}

      <div className="flex-1 flex flex-wrap items-center gap-2 sm:gap-2.5 min-w-0">
        {(rowData.ranges || []).map((range, rangeIndex) => {
          const isLastRange = rangeIndex === (rowData.ranges?.length || 0) - 1;
          const rangeKey = range.id || `range-${rangeIndex}`;
          return (
            <div key={rangeKey} className="flex items-center gap-1.5 shrink-0">
              <PageRangeInput
                idPrefix={rangeKey}
                range={range}
                startValue={range.start}
                endValue={range.end}
                size="md"
                width="w-24 sm:w-28"
                min={QURAN_RULES.MIN_PAGE}
                max={showJuz ? getMaxPageForJuz(rowData.juz) : maxPage}
                onChange={(newRange) => handleRangeChange(rangeIndex, newRange)}
                onRemove={rangeIndex > 0 ? () => removeRange(rangeIndex) : undefined}
                onAdd={addRange}
                onAddShift={addRange}
                onEndEnter={(e) => {
                  if (isLastRange && onAddJuz) {
                    e.preventDefault();
                    onAddJuz();
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
// 4. JUZ & PAGE SECTION MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export function JuzPageSection({
  title,
  showJuz = true,
  maxPage = 9999,
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
}: {
  title?: string;
  showJuz?: boolean;
  maxPage?: number;
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
}) {
  const handleRowChange = (index: number, rowUpdater: JuzRowData | ((prevRow: JuzRowData) => JuzRowData)) => {
    onChange((prevData) => updateArrayItem(prevData, index, rowUpdater, "juz-row"));
  };

  const handleRemoveJuz = (index: number) => {
    onChange((prevData) => removeArrayItem(prevData, index));
  };

  const addJuzRow = () => {
    const newId = crypto.randomUUID();
    const newJuzId = `juz-input-${newId}`;
    const firstRangeId = `range-${newId}-0`;
    onChange((prevData) => [
      ...prevData,
      {
        id: newId,
        juz: "",
        juzInputId: newJuzId,
        ranges: [{ id: firstRangeId, start: "", end: "" }],
      },
    ]);

    setTimeout(() => {
      const targetId = showJuz ? newJuzId : `${firstRangeId}-start`;
      const el = document.getElementById(targetId);
      if (el) {
        el.focus();
        if (typeof (el as HTMLInputElement).select === "function") (el as HTMLInputElement).select();
      }
    }, 100);
  };

  const totalPages = useMemo(() => {
    return (data || []).reduce((sum, row) => {
      if (showJuz) {
        const hasJuz = row.juz && String(row.juz).trim() !== "";
        if (!hasJuz) return sum;
      }

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
  }, [data, showJuz]);

  const hasJuzData =
    (data || []).length > 1 ||
    (data || []).some(
      (row) =>
        (showJuz && Boolean(row.juz && String(row.juz).trim() !== "")) ||
        (row.ranges || []).some(
          (r) =>
            Boolean(r.start !== undefined && String(r.start).trim() !== "") ||
            Boolean(r.end !== undefined && String(r.end).trim() !== "")
        )
    );

  const sectionTitle = title || (showJuz ? "JUZ / PAGE DETAILS" : "PAGE DETAILS");

  return (
    <div className="relative">
      <SectionHeaderBar
        title={sectionTitle}
        count={totalPages}
        showReset={hasJuzData}
        onReset={onReset}
        resetTitle={`Reset ${sectionTitle}`}
      />

      <div className="space-y-1 sm:space-y-1.5">
        {data.map((row, index) => (
          <JuzRow
            key={row.id || index}
            rowData={row}
            index={index}
            showJuz={showJuz}
            maxPage={maxPage}
            onChange={(updater) => handleRowChange(index, updater)}
            onRemoveJuz={data.length > 1 ? () => handleRemoveJuz(index) : undefined}
            onAddJuz={index === data.length - 1 ? addJuzRow : undefined}
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

      <AddMoreSectionButton onClick={addJuzRow} label="+ Add More" />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. DETAIL ROW COMPONENT (MISTAKE & STUCK)
// ══════════════════════════════════════════════════════════════════════════════

export function DetailRow({
  rowData,
  onChange,
  onRemoveRow,
  onAddNewRow,
  onNextSection,
  availableJuzs,
  juzPageData,
  listType = "mistake",
  index,
  isLastRow = false,
  showJuz = true,
  unitLabel,
  maxPage = 9999,
  draggedItem,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onReorderRows,
}: {
  rowData: DetailRowData;
  onChange: (updater: (prevRow: DetailRowData) => DetailRowData) => void;
  onRemoveRow?: () => void;
  onAddNewRow?: () => void;
  onNextSection?: () => void;
  availableJuzs?: (string | number)[];
  juzPageData?: any[];
  listType?: string;
  index: number;
  isLastRow?: boolean;
  showJuz?: boolean;
  unitLabel?: string;
  maxPage?: number;
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
}) {
  const { dropPosition, isDragging, rowContainerProps, dragHandleProps } = useRowDragDrop({
    listType: showJuz ? listType : `book-${listType}`,
    index,
    draggedItem,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDrop,
    onReorderRows,
  });

  const { lastPage, lastAyah } = useQuranTrackingSession();
  const effectiveUnitLabel = unitLabel || (showJuz ? "Ayah" : "Line");

  const validAvailableJuzNumbers = useMemo(() => {
    if (!showJuz) return [];
    return (availableJuzs || [])
      .map((j) => parseInt(String(j), 10))
      .filter((n) => !isNaN(n) && n >= QURAN_RULES.MIN_JUZ && n <= QURAN_RULES.MAX_JUZ)
      .sort((a, b) => a - b);
  }, [availableJuzs, showJuz]);

  const minJuz = validAvailableJuzNumbers.length > 0 ? Math.min(...validAvailableJuzNumbers) : QURAN_RULES.MIN_JUZ;
  const maxJuz = validAvailableJuzNumbers.length > 0 ? Math.max(...validAvailableJuzNumbers) : QURAN_RULES.MAX_JUZ;

  const effectiveJuz =
    availableJuzs && availableJuzs.length === 1
      ? availableJuzs[0]
      : (rowData.juz || (availableJuzs && availableJuzs.length > 0 ? availableJuzs[0] : (juzPageData?.find((r) => r.juz && String(r.juz).trim() !== "")?.juz || "")));

  const quranBounds = useMemo(() => {
    if (!showJuz) return { minPage: 1, maxPage: maxPage || 9999, allowedPages: null };
    return getJuzPageBounds(effectiveJuz, juzPageData);
  }, [showJuz, effectiveJuz, juzPageData, maxPage]);

  const minPage = quranBounds.minPage;
  const maxPageVal = quranBounds.maxPage;
  const allowedPages = quranBounds.allowedPages;

  const allowedPagesKey = useMemo(() => (allowedPages || []).join(","), [allowedPages]);
  const availableJuzsKey = useMemo(() => (validAvailableJuzNumbers || []).join(","), [validAvailableJuzNumbers]);

  // Sync Juz when parent availableJuzs / juzPageData change
  useEffect(() => {
    if (!showJuz) return;
    if (validAvailableJuzNumbers.length > 0) {
      onChange((prev) => {
        if (prev.juz === "" || prev.juz === undefined || prev.juz === null) {
          return { ...prev, juz: validAvailableJuzNumbers[0] };
        }
        const clamped = clampToAllowedOrRange(prev.juz, validAvailableJuzNumbers, minJuz, maxJuz);
        if (clamped !== null && clamped !== Number(prev.juz)) {
          return { ...prev, juz: clamped };
        }
        return prev;
      });
    }
  }, [availableJuzsKey, showJuz]);

  // Sync Page when parent bounds change
  useEffect(() => {
    onChange((prev) => {
      if (prev.page === "" || prev.page === undefined || prev.page === null) {
        return prev;
      }
      const clamped = clampToAllowedOrRange(prev.page, allowedPages, minPage, maxPageVal);
      if (clamped !== null && clamped !== Number(prev.page)) {
        return { ...prev, page: clamped };
      }
      return prev;
    });
  }, [minPage, maxPageVal, allowedPagesKey]);

  const handleJuzChange = (val: string | number) => {
    onChange((prev) => ({ ...prev, juz: val }));
  };

  const handleJuzBlur = () => {
    const clamped = clampToAllowedOrRange(
      rowData.juz,
      validAvailableJuzNumbers.length > 0 ? validAvailableJuzNumbers : null,
      minJuz,
      maxJuz
    );
    if (clamped !== null && clamped !== Number(rowData.juz)) {
      handleJuzChange(clamped);
    }
  };

  const stepJuz = useCallback((direction: number) => {
    onChange((prev) => {
      const nextJuz = stepValueCircular(
        prev.juz,
        direction,
        validAvailableJuzNumbers.length > 0 ? validAvailableJuzNumbers : null,
        minJuz,
        maxJuz,
        validAvailableJuzNumbers[0] || minJuz
      );
      return { ...prev, juz: nextJuz };
    });
  }, [validAvailableJuzNumbers, minJuz, maxJuz, onChange]);

  const handleJuzWheel = (e: React.WheelEvent | WheelEvent) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    stepJuz(e.deltaY < 0 ? 1 : -1);
  };

  const handleJuzKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      stepJuz(1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      stepJuz(-1);
    }
  };

  const handleJuzEnter = (e: any) => {
    handleJuzBlur();
    handleEnterFocusNext(e);
  };

  const handlePageChange = (val: string | number) => {
    onChange((prev) => ({ ...prev, page: val }));
    if (val !== "" && val !== undefined && val !== null) {
      quranTrackingSession.setLastPage(val);
    }
  };

  const handlePageBlur = () => {
    const clamped = clampToAllowedOrRange(rowData.page, allowedPages, minPage, maxPageVal);
    if (clamped !== null) {
      if (clamped !== Number(rowData.page)) {
        handlePageChange(clamped);
      } else {
        quranTrackingSession.setLastPage(clamped);
      }
    }
  };

  const stepPage = useCallback((direction: number) => {
    onChange((prev) => {
      const nextVal = stepValueCircular(
        prev.page,
        direction,
        allowedPages,
        minPage,
        maxPageVal,
        lastPage
      );
      quranTrackingSession.setLastPage(nextVal);
      return { ...prev, page: nextVal };
    });
  }, [allowedPages, minPage, maxPageVal, lastPage, onChange]);

  const handlePageWheel = (e: React.WheelEvent | WheelEvent) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    stepPage(e.deltaY < 0 ? 1 : -1);
  };

  const handlePageKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      stepPage(1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      stepPage(-1);
    }
  };

  const handlePageEnter = (e: any) => {
    handlePageBlur();
    handleEnterFocusNext(e);
  };

  const handleAyahChange = (ayahIndex: number, val: string | number) => {
    onChange((prevRow) => {
      const newAyahs = [...prevRow.ayahs];
      newAyahs[ayahIndex] = { ...newAyahs[ayahIndex], value: val };
      return { ...prevRow, ayahs: newAyahs };
    });
    if (val !== "" && val !== undefined && val !== null) {
      quranTrackingSession.setLastAyah(val);
    }
  };

  const handleAyahBlur = (ayahIndex: number) => {
    const ayah = rowData.ayahs[ayahIndex];
    if (ayah && ayah.value !== "" && ayah.value !== undefined && ayah.value !== null) {
      const maxLimit = showJuz ? QURAN_RULES.MAX_AYAH : 9999;
      const clamped = clampToAllowedOrRange(ayah.value, null, 1, maxLimit);
      if (clamped !== null) {
        if (clamped !== Number(ayah.value)) {
          handleAyahChange(ayahIndex, clamped);
        } else {
          quranTrackingSession.setLastAyah(clamped);
        }
      }
    }
  };

  const handleAyahEnter = (ayahIndex: number, e: any, isLastAyah: boolean) => {
    handleAyahBlur(ayahIndex);
    if (isLastRow && isLastAyah && onAddNewRow) {
      e?.preventDefault?.();
      onAddNewRow();
    } else {
      handleEnterFocusNext(e);
    }
  };

  const addAyah = () => {
    const newId = crypto.randomUUID();
    onChange((prevRow) => ({
      ...prevRow,
      ayahs: [...prevRow.ayahs, { id: newId, value: "" }],
    }));
    setTimeout(() => {
      const el = document.getElementById(`ayah-${newId}`);
      if (el) el.focus();
    }, 100);
  };

  const removeAyah = (ayahIndex: number) => {
    onChange((prevRow) => {
      if (prevRow.ayahs.length > 1) {
        return {
          ...prevRow,
          ayahs: prevRow.ayahs.filter((_, idx) => idx !== ayahIndex),
        };
      }
      return prevRow;
    });
  };

  const hasMultiJuz = showJuz && Boolean(availableJuzs && availableJuzs.length > 1);

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
      {hasMultiJuz && (
        <JuzInputBox
          id={`juz-${rowData.id}`}
          value={rowData.juz}
          onChange={handleJuzChange}
          onBlur={handleJuzBlur}
          onKeyDown={handleJuzKeyDown}
          onWheel={handleJuzWheel}
          onEnter={handleJuzEnter}
          onShiftEnter={onNextSection}
          min={minJuz}
          max={maxJuz}
          initialScrollValue={validAvailableJuzNumbers[0] || minJuz}
        />
      )}

      <PageInputBox
        id={`page-${rowData.id}`}
        value={rowData.page}
        onChange={handlePageChange}
        onBlur={handlePageBlur}
        onKeyDown={handlePageKeyDown}
        onWheel={handlePageWheel}
        onEnter={handlePageEnter}
        onShiftEnter={onNextSection}
        onAdd={addAyah}
        onAddShift={addAyah}
        onEmptyBackspace={(e: any) => {
          if (onRemoveRow) onRemoveRow();
          handleBackspaceFocusPrev(e, true);
        }}
        min={minPage}
        max={maxPageVal}
        initialScrollValue={
          lastPage !== null && lastPage >= minPage && lastPage <= maxPageVal
            ? lastPage
            : minPage
        }
      />

      <div className="flex-1 flex flex-wrap items-center gap-2 sm:gap-2.5 min-w-0">
        <label className="text-[11px] sm:text-xs font-semibold theme-text-secondary shrink-0 h-10 flex items-center select-none">
          {effectiveUnitLabel}
        </label>
        {(rowData.ayahs || []).map((ayah, aIdx) => {
          const isLastAyah = aIdx === (rowData.ayahs?.length || 0) - 1;
          return (
            <div key={ayah.id || aIdx} className="flex items-center gap-1.5 shrink-0">
              <AyahInputBox
                id={`ayah-${ayah.id}`}
                value={ayah.value}
                onChange={(val) => handleAyahChange(aIdx, val)}
                onBlur={() => handleAyahBlur(aIdx)}
                onEnter={(e: any) => handleAyahEnter(aIdx, e, isLastAyah)}
                onShiftEnter={onNextSection}
                onAdd={addAyah}
                onAddShift={addAyah}
                onEmptyBackspace={(e: any) => {
                  if (aIdx > 0) removeAyah(aIdx);
                  handleBackspaceFocusPrev(e, true);
                }}
                initialScrollValue={lastAyah !== null ? lastAyah : 1}
              />
              {!isLastAyah && <ItemCommaSeparator />}
              {isLastAyah && (
                <RowAddCircleButton
                  onAdd={addAyah}
                  title={`Add another ${effectiveUnitLabel}`}
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
// 6. DETAIL SECTION MAIN COMPONENT (MISTAKE & STUCK)
// ══════════════════════════════════════════════════════════════════════════════

export function DetailSection({
  title,
  listType,
  data,
  onChange,
  availableJuzs,
  juzPageData,
  showJuz = true,
  unitLabel,
  maxPage = 9999,
  draggedItem,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onReorderRows,
  onReset,
  onNextSection,
}: {
  title: string;
  listType: "mistake" | "stuck" | string;
  data: DetailRowData[];
  onChange: (updater: DetailRowData[] | ((prevData: DetailRowData[]) => DetailRowData[])) => void;
  availableJuzs?: (string | number)[];
  juzPageData?: any[];
  showJuz?: boolean;
  unitLabel?: string;
  maxPage?: number;
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
}) {
  const addRow = () => {
    const newId = crypto.randomUUID();
    onChange((prevData) => {
      const defaultJuz = showJuz
        ? ((availableJuzs && availableJuzs.length > 0 ? availableJuzs[0] : "") ||
          (juzPageData?.find((r) => r.juz && String(r.juz).trim() !== "")?.juz || ""))
        : "";
      const lastJuz =
        prevData.length > 0 && prevData[prevData.length - 1].juz
          ? prevData[prevData.length - 1].juz
          : defaultJuz;
      const rowJuz = showJuz
        ? (availableJuzs && availableJuzs.length === 1
            ? availableJuzs[0]
            : availableJuzs && availableJuzs.length > 1
            ? (lastJuz && availableJuzs.some((j) => String(j) === String(lastJuz)) ? lastJuz : availableJuzs[0])
            : (lastJuz || defaultJuz))
        : "";
      return [
        ...prevData,
        {
          id: newId,
          juz: rowJuz,
          page: "",
          ayahs: [{ id: crypto.randomUUID(), value: "" }],
        },
      ];
    });

    setTimeout(() => {
      const el = document.getElementById(`page-${newId}`);
      if (el) {
        el.focus();
        if (typeof (el as HTMLInputElement).select === "function") (el as HTMLInputElement).select();
      }
    }, 60);
  };

  const handleRemoveRow = (index: number) => {
    onChange((prevData) => removeArrayItem(prevData, index));
  };

  const handleRowChange = (index: number, newRow: DetailRowData | ((prevRow: DetailRowData) => DetailRowData)) => {
    onChange((prevData) => updateArrayItem(prevData, index, newRow, "detail-row"));
  };

  const totalCount = useMemo(() => {
    return (data || []).reduce((sum, row) => {
      if (row.page && String(row.page).trim() !== "") {
        const filledAyahs = (row.ayahs || []).filter((a) => a.value && String(a.value).trim() !== "");
        return sum + filledAyahs.length;
      }
      return sum;
    }, 0);
  }, [data]);

  const hasDetailData =
    (data || []).length > 1 ||
    (data || []).some(
      (row) =>
        Boolean(row.page !== undefined && row.page !== null && String(row.page).trim() !== "") ||
        (row.ayahs || []).some((a) => Boolean(a.value !== undefined && a.value !== null && String(a.value).trim() !== ""))
    );

  return (
    <div className="relative" data-section={listType} id={`section-${listType}`}>
      <SectionHeaderBar
        title={title}
        count={totalCount}
        showReset={hasDetailData}
        onReset={onReset}
        resetTitle={`Reset ${title}`}
      />

      <div className="space-y-1 sm:space-y-1.5">
        {data.map((row, index) => (
          <DetailRow
            key={row.id || index}
            rowData={row}
            onChange={(updater) => handleRowChange(index, updater)}
            onRemoveRow={data.length > 1 ? () => handleRemoveRow(index) : undefined}
            onAddNewRow={index === data.length - 1 ? addRow : undefined}
            onNextSection={onNextSection}
            availableJuzs={availableJuzs}
            juzPageData={juzPageData}
            listType={listType}
            index={index}
            isLastRow={index === data.length - 1}
            showJuz={showJuz}
            unitLabel={unitLabel}
            maxPage={maxPage}
            draggedItem={draggedItem}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onReorderRows={onReorderRows}
          />
        ))}
      </div>

      <AddMoreSectionButton onClick={addRow} label={`+ Add More`} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 7. BACKWARD COMPATIBILITY EXPORTS FOR BOOK SECTIONS
// ══════════════════════════════════════════════════════════════════════════════

export function BookPageSection(props: any) {
  return <JuzPageSection {...props} showJuz={false} title="PAGE DETAILS" />;
}

export function BookDetailSection(props: any) {
  return <DetailSection {...props} showJuz={false} unitLabel="Line" />;
}

