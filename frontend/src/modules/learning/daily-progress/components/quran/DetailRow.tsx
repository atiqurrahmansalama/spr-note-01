import React, { useState, useEffect } from "react";
import CustomSelect from "../../../../../components/ui/CustomSelect";
import CustomInput from "../../../../../components/ui/CustomInput";
import { DragHandleIcon } from "../../../../../components/ui/Icons";
import { handleEnterFocusNext, handleBackspaceFocusPrev } from "../../../../../utils/keyboardUtils";
import { QURAN_CONSTANTS } from "../../../../../constants/quranConstants";
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
  onDragStart?: (e: React.DragEvent, listType: string, index: number) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, listType: string, index?: number) => void;
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
  onDragStart,
  onDragOver,
  onDrop,
}: DetailRowProps) {
  const [isDraggable, setIsDraggable] = useState(false);
  const [isDragOverTarget, setIsDragOverTarget] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    return typeof window !== "undefined" ? window.innerWidth < 640 : false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  const hasJuz = Boolean(availableJuzs && availableJuzs.length > 1);
  const line1Max = isMobile ? (hasJuz ? 1 : 3) : hasJuz ? 3 : 4;
  const extraLineMax = 3;

  const ayahChunks: Array<{ items: DetailAyahItem[]; startIndex: number }> = [];
  let i = 0;
  while (i < (rowData.ayahs?.length || 0)) {
    const rawChunkSize = ayahChunks.length === 0 ? line1Max : isMobile && hasJuz ? extraLineMax : line1Max;
    const chunkSize = Math.max(1, parseInt(String(rawChunkSize), 10) || 1);
    ayahChunks.push({
      items: rowData.ayahs.slice(i, i + chunkSize),
      startIndex: i,
    });
    i += chunkSize;
  }

  const isMobileMultiJuzExtraRows = isMobile && hasJuz && ayahChunks.length > 1;
  const line1Chunk = ayahChunks[0] || { items: [], startIndex: 0 };
  const extraChunks = isMobileMultiJuzExtraRows ? ayahChunks.slice(1) : [];

  return (
    <div
      className={`flex items-start gap-2 sm:gap-4 w-full py-2 px-1 sm:px-3 -mx-1 sm:-mx-3 rounded-xl relative group hover:theme-bg-elevated transition-all duration-150 select-none focus-within:z-40 hover:z-20 ${
        isDragOverTarget ? "border-2 border-dashed border-[var(--accent-main)] bg-[var(--accent-main)]/10" : ""
      }`}
      style={{ zIndex: 30 - index }}
      draggable={isDraggable}
      onDragStart={(e) => {
        if (onDragStart) onDragStart(e, listType, index);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (onDragOver) onDragOver(e);
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        setIsDragOverTarget(true);
      }}
      onDragLeave={() => {
        setIsDragOverTarget(false);
      }}
      onDrop={(e) => {
        setIsDragOverTarget(false);
        if (onDrop) {
          e.stopPropagation();
          onDrop(e, listType, index);
        }
      }}
    >
      {/* Drag handle */}
      <div
        className="theme-text-secondary opacity-50 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity shrink-0 flex items-center justify-center h-[38px] sm:h-10 self-start select-none"
        onMouseEnter={() => setIsDraggable(true)}
        onMouseLeave={() => setIsDraggable(false)}
      >
        <DragHandleIcon className="w-4 h-4" />
      </div>

      {/* Main Row Content */}
      <div className="flex flex-col gap-2.5 sm:gap-3 flex-1 min-w-0 w-full">
        {/* Line 1: Juz + Page + Ayah label + 1 Ayah box */}
        <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0 flex-nowrap w-full">
          {/* Left Side: Juz Dropdown (if any) & Page Input */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {hasJuz && availableJuzs && (
              <div className="flex items-center gap-1 shrink-0 relative z-30">
                <label className="text-[11px] sm:text-xs font-semibold theme-text-secondary select-none">Juz</label>
                <div className="h-[38px] sm:h-10 w-[50px] sm:w-[58px] shrink-0">
                  <CustomSelect
                    options={availableJuzs.map((j) => ({ label: String(j), value: String(j) }))}
                    value={String(rowData.juz || availableJuzs[0] || "")}
                    onChange={(val) => handleJuzChange(val)}
                    compactMode={true}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-1 shrink-0">
              <label className="text-[11px] sm:text-xs font-semibold theme-text-secondary select-none">Page</label>
              <div className="theme-bg-sub rounded-lg border theme-border overflow-hidden h-[38px] sm:h-10 w-14 sm:w-16 shadow-sm transition-all focus-within:border-[var(--accent-main)]/50 focus-within:ring-1 focus-within:ring-[var(--accent-main)]/30 flex items-center justify-center">
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
            </div>
          </div>

          {/* Right Side: Ayah Label + Line 1 Ayah Chunk */}
          <div className="flex items-start gap-1 sm:gap-1.5 flex-1 min-w-0 w-full">
            <label className="text-[11px] sm:text-xs font-semibold theme-text-secondary shrink-0 h-[38px] sm:h-10 flex items-center select-none">
              Ayah
            </label>

            <div className="flex flex-col gap-2.5 sm:gap-3 flex-1 min-w-0 w-full">
              {(isMobileMultiJuzExtraRows ? [line1Chunk] : ayahChunks).map((chunk, chunkRowIdx) => {
                const isLastChunk = isMobileMultiJuzExtraRows ? false : chunkRowIdx === ayahChunks.length - 1;

                return (
                  <div key={chunkRowIdx} className="flex items-center justify-between gap-1 sm:gap-2 w-full flex-nowrap">
                    <div className="flex items-center gap-0.5 shrink-0 flex-nowrap">
                      {chunk.items.map((ayah, itemIdx) => {
                        const globalIdx = chunk.startIndex + itemIdx;
                        const isLastTotal = globalIdx === rowData.ayahs.length - 1;
                        return (
                          <div key={ayah.id} className="flex items-center gap-0.5 shrink-0">
                            <div className="theme-bg-sub rounded-lg border theme-border overflow-hidden h-[38px] sm:h-10 w-14 sm:w-16 shadow-sm transition-all focus-within:border-[var(--accent-main)]/50 focus-within:ring-1 focus-within:ring-[var(--accent-main)]/30 flex items-center justify-center">
                              <CustomInput
                                id={`ayah-${ayah.id}`}
                                type="number"
                                variant="borderless"
                                scrollable={true}
                                allowDecimals={false}
                                value={ayah.value}
                                onChange={(val) => handleAyahChange(globalIdx, val)}
                                onEnter={(e: any) => {
                                  if (isLastRow && isLastTotal && onAddNewRow) {
                                    if (e && e.preventDefault) e.preventDefault();
                                    onAddNewRow();
                                  } else {
                                    handleEnterFocusNext(e);
                                  }
                                }}
                                onShiftEnter={onNextSection}
                                onAdd={() => {
                                  if (isLastTotal) addAyah();
                                }}
                                onEmptyBackspace={(e: any) => {
                                  handleBackspaceFocusPrev(e, true);
                                  removeAyah(globalIdx);
                                }}
                                min={1}
                                placeholder="--"
                                className="w-full h-full p-0 min-h-0"
                                wrapperClassName="w-full h-full"
                                inputClassName="w-full h-full text-center text-xs sm:text-sm theme-text-primary font-semibold font-mono p-0"
                              />
                            </div>
                            {!isLastTotal && (
                              <span className="theme-text-secondary font-bold text-xs opacity-60 px-[1px] select-none">,</span>
                            )}
                          </div>
                        );
                      })}

                      {/* Show + button on the last chunk row */}
                      {isLastChunk && (
                        <div className="ml-1 shrink-0">
                          <RowAddCircleButton onAdd={addAyah} title="Add Ayah" />
                        </div>
                      )}
                    </div>

                    {/* Show Row Remove (X) button on the far right of the last chunk row */}
                    {isLastChunk && onRemoveRow ? (
                      <RowRemoveButton onRemove={onRemoveRow} title="Remove Row" />
                    ) : (
                      <div className="shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mobile ONLY with Multiple Juzs: Extra Ayah Rows (Line 2+) aligned EXACTLY under the Page Box */}
        {isMobileMultiJuzExtraRows && (
          <div className="flex flex-col gap-2.5 pl-[108px] w-full">
            {extraChunks.map((chunk, extraIdx) => {
              const isLastChunk = extraIdx === extraChunks.length - 1;
              return (
                <div key={extraIdx} className="flex items-center justify-between gap-1 sm:gap-2 w-full flex-nowrap">
                  <div className="flex items-center gap-0.5 shrink-0 flex-nowrap">
                    {chunk.items.map((ayah, itemIdx) => {
                      const globalIdx = chunk.startIndex + itemIdx;
                      const isLastTotal = globalIdx === rowData.ayahs.length - 1;
                      return (
                        <div key={ayah.id} className="flex items-center gap-0.5 shrink-0">
                          <div className="theme-bg-sub rounded-lg border theme-border overflow-hidden h-[38px] w-14 shadow-sm transition-all focus-within:border-[var(--accent-main)]/50 focus-within:ring-1 focus-within:ring-[var(--accent-main)]/30 flex items-center justify-center">
                            <CustomInput
                              id={`ayah-${ayah.id}`}
                              type="number"
                              variant="borderless"
                              scrollable={true}
                              allowDecimals={false}
                              value={ayah.value}
                              onChange={(val) => handleAyahChange(globalIdx, val)}
                              onEnter={(e: any) => {
                                if (isLastRow && isLastTotal && onAddNewRow) {
                                  if (e && e.preventDefault) e.preventDefault();
                                  onAddNewRow();
                                } else {
                                  handleEnterFocusNext(e);
                                }
                              }}
                              onShiftEnter={onNextSection}
                              onAdd={() => {
                                if (isLastTotal) addAyah();
                              }}
                              onEmptyBackspace={(e: any) => {
                                handleBackspaceFocusPrev(e, true);
                                removeAyah(globalIdx);
                              }}
                              min={1}
                              placeholder="--"
                              className="w-full h-full p-0 min-h-0"
                              wrapperClassName="w-full h-full"
                              inputClassName="w-full h-full text-center text-xs theme-text-primary font-semibold font-mono p-0"
                            />
                          </div>
                          {!isLastTotal && (
                            <span className="theme-text-secondary font-bold text-xs opacity-60 px-[1px] select-none">,</span>
                          )}
                        </div>
                      );
                    })}

                    {/* Show + button on the last extra chunk row */}
                    {isLastChunk && (
                      <div className="ml-1 shrink-0">
                        <RowAddCircleButton onAdd={addAyah} title="Add Ayah" />
                      </div>
                    )}
                  </div>

                  {/* Show Row Remove (X) button on the far right of the last extra chunk row */}
                  {isLastChunk && onRemoveRow ? (
                    <RowRemoveButton onRemove={onRemoveRow} title="Remove Row" />
                  ) : (
                    <div className="shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
