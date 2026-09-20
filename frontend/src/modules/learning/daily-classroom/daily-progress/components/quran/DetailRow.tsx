import React, { useState, useEffect } from "react";
import CustomSelect from "../../../../../../components/ui/CustomSelect";
import CustomInput from "../../../../../../components/ui/CustomInput";
import { DragHandleIcon } from "../../../../../../components/ui/Icons";
import { handleEnterFocusNext, handleBackspaceFocusPrev } from "../../../../../../utils/keyboardUtils";
import { QURAN_CONSTANTS } from "../../../../../../constants/quranConstants";
import { RowRemoveButton, RowAddCircleButton } from "./QuranRowUI";
import { DetailRowData, DetailAyahItem } from "../../types";

export interface DetailRowProps {
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
  draggedItem?: { listType: string; index: number } | null;
  onDragStart?: (e: React.DragEvent | React.PointerEvent, listType: string, index: number) => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, listType: string, index?: number) => void;
  onReorderRows?: (sourceListType: string, sourceIndex: number, targetListType: string, targetIndex?: number) => void;
}

export default function DetailRow({
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
  draggedItem,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onReorderRows,
}: DetailRowProps) {
  const [isDraggable, setIsDraggable] = useState(false);
  const [dropPosition, setDropPosition] = useState<"before" | "after" | null>(null);

  const isDragging = Boolean(draggedItem && draggedItem.listType === listType && draggedItem.index === index);

  // Listen to custom hover events from Touchscreen Pointer Drag
  useEffect(() => {
    const handleDragHoverEvent = (e: any) => {
      const detail = e.detail;
      if (!detail) {
        setDropPosition(null);
        return;
      }
      if (detail.listType === listType && detail.index === index) {
        if (!isDragging) {
          setDropPosition(detail.position);
        }
      } else {
        setDropPosition(null);
      }
    };

    window.addEventListener("spr_detail_drag_hover", handleDragHoverEvent);
    return () => window.removeEventListener("spr_detail_drag_hover", handleDragHoverEvent);
  }, [listType, index, isDragging]);

  const getPageRangeForJuz = (juzNum: string | number) => {
    if (juzPageData && juzPageData.length > 0) {
      const matchingRows = juzPageData.filter(
        (row) => row.juz && row.juz.toString() === juzNum?.toString()
      );

      if (matchingRows.length > 0) {
        let min = 9999;
        let max = -1;

        matchingRows.forEach((row) => {
          (row.ranges || []).forEach((r: any) => {
            const s = parseInt(r.start, 10);
            const e = parseInt(r.end, 10);
            if (!isNaN(s) && s > 0 && s < min) min = s;
            if (!isNaN(e) && e > 0 && e > max) max = e;
          });
        });

        if (min !== 9999 && max !== -1) {
          return { min, max };
        }
      }
    }

    const j = parseInt(String(juzNum), 10);
    const starts = QURAN_CONSTANTS.JUZ_PAGE_STARTS;
    if (!j || isNaN(j) || !starts || j < 1 || j > 30) return { min: 1, max: 604 };
    const start = starts[j] || 1;
    const end = j === 30 ? 604 : starts[j + 1] ? starts[j + 1] - 1 : 604;
    return { min: start, max: end };
  };

  const { min: minPage, max: maxPage } = getPageRangeForJuz(rowData.juz);

  const handleJuzChange = (newJuz: string | number) => {
    onChange((prev) => ({
      ...prev,
      juz: newJuz,
    }));
  };

  const handlePageChange = (val: string | number) => {
    onChange((prev) => ({ ...prev, page: val }));
  };

  const handleAyahChange = (ayahIndex: number, val: string | number) => {
    onChange((prevRow) => {
      const newAyahs = [...prevRow.ayahs];
      newAyahs[ayahIndex] = { ...newAyahs[ayahIndex], value: val };
      return { ...prevRow, ayahs: newAyahs };
    });
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
        const newAyahs = prevRow.ayahs.filter((_, idx) => idx !== ayahIndex);
        return { ...prevRow, ayahs: newAyahs };
      }
      return prevRow;
    });
  };

  // HTML5 Desktop Drag Over
  const handleRowDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDragOver) onDragOver(e);

    if (isDragging) {
      setDropPosition(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const offset = e.clientY - rect.top;
    const isTopHalf = offset < rect.height / 2;
    setDropPosition(isTopHalf ? "before" : "after");
  };

  // HTML5 Desktop Drag Leave
  const handleRowDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDropPosition(null);
    }
  };

  // HTML5 Desktop Drop
  const handleRowDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const targetIdx = dropPosition === "after" ? index + 1 : index;
    setDropPosition(null);
    if (onReorderRows && draggedItem) {
      onReorderRows(draggedItem.listType, draggedItem.index, listType, targetIdx);
    } else if (onDrop) {
      onDrop(e, listType, targetIdx);
    }
  };

  const handleRowDragEnd = () => {
    setIsDraggable(false);
    setDropPosition(null);
    if (onDragEnd) onDragEnd();
  };

  // Touchscreen / Mobile Pointer Drag Handler
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const handleEl = e.currentTarget;

    try {
      handleEl.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture fails
    }

    if (typeof navigator !== "undefined" && "vibrate" in navigator && typeof navigator.vibrate === "function") {
      try {
        navigator.vibrate(10);
      } catch {
        // Ignore vibration error
      }
    }

    if (onDragStart) {
      onDragStart(e, listType, index);
    }

    let currentTargetListType = listType;
    let currentTargetIndex: number | undefined = undefined;

    const handlePointerMove = (moveEvt: PointerEvent) => {
      const el = document.elementFromPoint(moveEvt.clientX, moveEvt.clientY);
      if (!el) return;

      const targetRowEl = el.closest('[data-detail-row="true"]');
      if (targetRowEl) {
        const rowListType = targetRowEl.getAttribute("data-list-type") || listType;
        const rowIndexStr = targetRowEl.getAttribute("data-row-index");
        const rowIdx = rowIndexStr !== null ? parseInt(rowIndexStr, 10) : 0;

        const rect = targetRowEl.getBoundingClientRect();
        const offset = moveEvt.clientY - rect.top;
        const isTopHalf = offset < rect.height / 2;
        const calculatedTargetIdx = isTopHalf ? rowIdx : rowIdx + 1;

        currentTargetListType = rowListType;
        currentTargetIndex = calculatedTargetIdx;

        window.dispatchEvent(
          new CustomEvent("spr_detail_drag_hover", {
            detail: {
              listType: rowListType,
              index: rowIdx,
              position: isTopHalf ? "before" : "after",
            },
          })
        );
      } else {
        const sectionEl = el.closest("[data-list-type]");
        if (sectionEl) {
          const sectionListType = sectionEl.getAttribute("data-list-type") || listType;
          currentTargetListType = sectionListType;
          currentTargetIndex = undefined;
          window.dispatchEvent(
            new CustomEvent("spr_detail_drag_hover", {
              detail: { listType: sectionListType, index: -1, position: null },
            })
          );
        }
      }
    };

    const handlePointerUp = (upEvt: PointerEvent) => {
      handleEl.removeEventListener("pointermove", handlePointerMove);
      handleEl.removeEventListener("pointerup", handlePointerUp);
      handleEl.removeEventListener("pointercancel", handlePointerUp);

      try {
        handleEl.releasePointerCapture(upEvt.pointerId);
      } catch {
        // Ignore
      }

      window.dispatchEvent(new CustomEvent("spr_detail_drag_hover", { detail: null }));

      if (onDragEnd) onDragEnd();

      if (currentTargetListType) {
        if (onReorderRows) {
          onReorderRows(listType, index, currentTargetListType, currentTargetIndex);
        } else if (onDrop) {
          onDrop(upEvt as any, currentTargetListType, currentTargetIndex);
        }
      }
    };

    handleEl.addEventListener("pointermove", handlePointerMove);
    handleEl.addEventListener("pointerup", handlePointerUp);
    handleEl.addEventListener("pointercancel", handlePointerUp);
  };

  const hasJuz = Boolean(availableJuzs && availableJuzs.length > 1);

  const pageInputBox = (
    <div className="theme-bg-sub rounded-lg border theme-border overflow-hidden h-[38px] sm:h-10 w-14 sm:w-16 shadow-sm transition-all focus-within:border-[var(--accent-main)]/50 focus-within:ring-1 focus-within:ring-[var(--accent-main)]/30 flex items-center justify-center shrink-0">
      <CustomInput
        id={`page-${rowData.id}`}
        type="number"
        variant="borderless"
        scrollable={true}
        allowDecimals={false}
        value={rowData.page}
        onChange={handlePageChange}
        onEnter={handleEnterFocusNext}
        onEmptyBackspace={(e: any) => {
          if (onRemoveRow) onRemoveRow();
          handleBackspaceFocusPrev(e, true);
        }}
        min={minPage}
        max={maxPage}
        placeholder="--"
        className="w-full h-full p-0 min-h-0"
        wrapperClassName="w-full h-full"
        inputClassName="w-full h-full text-center text-xs sm:text-sm theme-text-primary font-semibold font-mono p-0"
      />
    </div>
  );

  return (
    <div
      data-detail-row="true"
      data-list-type={listType}
      data-row-index={index}
      className={`flex items-start gap-2 sm:gap-4 w-full py-2 px-1 sm:px-3 -mx-1 sm:-mx-3 rounded-xl relative group hover:theme-bg-elevated transition-all duration-150 select-none focus-within:z-40 hover:z-20 ${
        isDragging
          ? "opacity-30 scale-[0.985] ring-2 ring-dashed ring-[var(--accent-main)]/60 bg-[var(--accent-main)]/5 shadow-inner"
          : dropPosition
          ? "theme-bg-sub/60"
          : ""
      }`}
      style={{ zIndex: 30 - index }}
      draggable={isDraggable}
      onDragStart={(e) => {
        if (onDragStart) onDragStart(e, listType, index);
      }}
      onDragEnd={handleRowDragEnd}
      onDragOver={handleRowDragOver}
      onDragLeave={handleRowDragLeave}
      onDrop={handleRowDrop}
    >
      {/* Visual Drop Line Indicators */}
      {dropPosition === "before" && (
        <div className="absolute top-0 left-2 right-2 h-[3px] bg-[var(--accent-main)] rounded-full shadow-[0_0_8px_var(--accent-main)] z-40 pointer-events-none transition-all animate-pulse" />
      )}
      {dropPosition === "after" && (
        <div className="absolute bottom-0 left-2 right-2 h-[3px] bg-[var(--accent-main)] rounded-full shadow-[0_0_8px_var(--accent-main)] z-40 pointer-events-none transition-all animate-pulse" />
      )}

      {/* Drag handle with TouchScreen & Mouse Support */}
      <div
        style={{ touchAction: "none" }}
        className={`theme-text-secondary hover:theme-accent hover:theme-bg-sub/80 cursor-grab active:cursor-grabbing transition-all p-1 -ml-1 rounded-lg shrink-0 flex items-center justify-center h-[38px] sm:h-10 self-start select-none ${
          isDragging ? "opacity-20 cursor-grabbing" : "opacity-40 group-hover:opacity-100"
        }`}
        onMouseEnter={() => setIsDraggable(true)}
        onMouseLeave={() => {
          if (!isDragging) setIsDraggable(false);
        }}
        onMouseDown={() => setIsDraggable(true)}
        onPointerDown={handlePointerDown}
        title="Drag to reorder or move between sections"
      >
        <DragHandleIcon className="w-4 h-4 transition-transform group-hover:scale-110 pointer-events-none" />
      </div>

      {/* Fixed Left Section: [Juz + "Page" label] (if multiple juzs) OR ["Page" label] (if single juz) */}
      {hasJuz && availableJuzs ? (
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 h-[38px] sm:h-10 self-start relative z-30">
          <label className="text-[11px] sm:text-xs font-semibold theme-text-secondary select-none">Juz</label>
          <div className="h-[38px] sm:h-10 w-[50px] sm:w-[58px] shrink-0">
            <CustomSelect
              options={availableJuzs.map((j) => ({ label: String(j), value: String(j) }))}
              value={String(rowData.juz || availableJuzs[0] || "")}
              onChange={(val) => handleJuzChange(val)}
              compactMode={true}
            />
          </div>
          <label className="text-[11px] sm:text-xs font-semibold theme-text-secondary select-none ml-1 sm:ml-1.5">Page</label>
        </div>
      ) : (
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 h-[38px] sm:h-10 self-start">
          <label className="text-[11px] sm:text-xs font-semibold theme-text-secondary select-none">Page</label>
        </div>
      )}

      {/* Main Content Area: Responsive Wrap Behavior */}
      {/* On small screens (< sm): Entire content wraps together so Line 2 starts from Page Box */}
      {/* On large screens (sm+): Page Box and Ayah Label are fixed shrink-0 on the left, and Ayahs wrap in their own flex-1 container starting from Ayah Box */}
      <div className="flex items-center flex-wrap sm:flex-nowrap gap-y-2.5 gap-x-1 sm:gap-x-1.5 flex-1 min-w-0">
        {/* Page Box + Ayah Label Section */}
        <div className="contents sm:flex sm:items-center sm:gap-1 sm:sm:gap-1.5 sm:shrink-0 sm:self-start">
          {pageInputBox}
          <label className="text-[11px] sm:text-xs font-semibold theme-text-secondary select-none shrink-0 h-[38px] sm:h-10 flex items-center ml-0.5 sm:ml-1">
            Ayah
          </label>
        </div>

        {/* Dynamic wrapping Ayah Boxes Container */}
        <div className="contents sm:flex sm:items-center sm:flex-wrap sm:gap-y-2.5 sm:gap-x-1 sm:gap-x-1.5 sm:flex-1 sm:min-w-0">
          {(rowData.ayahs || []).map((ayah, ayahIdx) => {
            const isLastAyah = ayahIdx === (rowData.ayahs || []).length - 1;
            return (
              <div key={ayah.id} className="flex items-center gap-1 shrink-0">
                <div className="theme-bg-sub rounded-lg border theme-border overflow-hidden h-[38px] sm:h-10 w-14 sm:w-16 shadow-sm transition-all focus-within:border-[var(--accent-main)]/50 focus-within:ring-1 focus-within:ring-[var(--accent-main)]/30 flex items-center justify-center">
                  <CustomInput
                    id={`ayah-${ayah.id}`}
                    type="number"
                    variant="borderless"
                    scrollable={true}
                    allowDecimals={false}
                    value={ayah.value}
                    onChange={(val) => handleAyahChange(ayahIdx, val)}
                    onEnter={(e: any) => {
                      if (isLastRow && isLastAyah && onAddNewRow) {
                        if (e && e.preventDefault) e.preventDefault();
                        onAddNewRow();
                      } else {
                        handleEnterFocusNext(e);
                      }
                    }}
                    onShiftEnter={onNextSection}
                    onAdd={() => {
                      if (isLastAyah) addAyah();
                    }}
                    onEmptyBackspace={(e: any) => {
                      handleBackspaceFocusPrev(e, true);
                      removeAyah(ayahIdx);
                    }}
                    min={1}
                    placeholder="--"
                    className="w-full h-full p-0 min-h-0"
                    wrapperClassName="w-full h-full"
                    inputClassName="w-full h-full text-center text-xs sm:text-sm theme-text-primary font-semibold font-mono p-0"
                  />
                </div>
                {!isLastAyah && (
                  <span className="theme-text-secondary font-bold text-xs sm:text-sm opacity-70 px-0.5 text-center shrink-0 select-none">
                    ,
                  </span>
                )}
              </div>
            );
          })}

          {/* Add Ayah (+) Button */}
          <div className="flex items-center gap-1 shrink-0 ml-0.5 h-[38px] sm:h-10">
            <RowAddCircleButton onAdd={addAyah} title="Add Ayah" />
          </div>
        </div>
      </div>

      {/* Far Right: Row Remove (X) button */}
      {onRemoveRow && (
        <div className="shrink-0 h-[38px] sm:h-10 flex items-center self-start">
          <RowRemoveButton onRemove={onRemoveRow} title="Remove Row" />
        </div>
      )}
    </div>
  );
}
