import { useState, useEffect } from "react";
import CustomSelect from "../../../../components/ui/CustomSelect";
import NumberScrollInput from "../../../../components/ui/NumberScrollInput";
import { handleEnterFocusNext, handleBackspaceFocusPrev } from "../../../../utils/keyboardUtils";
import { QURAN_CONSTANTS } from "../../../../constants/quranConstants";

export default function DetailRow({
  rowData,
  onChange,
  onRemoveRow,
  onAddNewRow,
  onNextSection,
  availableJuzs,
  juzPageData,
  listType,
  index,
  isLastRow = false,
  onDragStart,
  onDragOver,
  onDrop,
}) {
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

  const getPageRangeForJuz = (juzNum) => {
    if (juzPageData && juzPageData.length > 0) {
      const matchingRows = juzPageData.filter(
        (row) => row.juz && row.juz.toString() === juzNum?.toString()
      );

      if (matchingRows.length > 0) {
        let min = 9999;
        let max = -1;

        matchingRows.forEach((row) => {
          (row.ranges || []).forEach((r) => {
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

    const j = parseInt(juzNum, 10);
    const starts = QURAN_CONSTANTS.JUZ_PAGE_STARTS;
    if (!j || isNaN(j) || !starts || j < 1 || j > 30) return { min: 1, max: 604 };
    const start = starts[j] || 1;
    const end = j === 30 ? 604 : (starts[j + 1] ? starts[j + 1] - 1 : 604);
    return { min: start, max: end };
  };

  const { min: minPage, max: maxPage } = getPageRangeForJuz(rowData.juz);

  // NOTE: Intentionally NO auto-clamp useEffect here.
  // Auto-setting juz/page on every juzPageData change caused two bugs:
  //   1. Sessions/rows kept re-appearing after the user deleted them.
  //   2. Typing a multi-digit page number (e.g. "12") was impossible because
  //      the effect fired after the first digit and clamped the value.
  // Validation now only happens on blur (handled by NumberScrollInput.handleBlur).

  const handleJuzChange = (newJuz) => {
    // Keep the existing page value when switching juz so typing is not disrupted.
    // onBlur in NumberScrollInput will clamp the page to the new juz's range.
    onChange((prev) => ({
      ...prev,
      juz: newJuz,
    }));
  };

  const handlePageChange = (val) => {
    onChange((prev) => ({ ...prev, page: val }));
  };

  const handleAyahChange = (ayahIndex, val) => {
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

  const removeAyah = (ayahIndex) => {
    onChange((prevRow) => {
      if (prevRow.ayahs.length > 1) {
        const newAyahs = prevRow.ayahs.filter((_, idx) => idx !== ayahIndex);
        return { ...prevRow, ayahs: newAyahs };
      }
      return prevRow;
    });
  };

  const hasJuz = availableJuzs && availableJuzs.length > 1;
  const line1Max = isMobile ? (hasJuz ? 1 : 3) : (hasJuz ? 3 : 4);
  const extraLineMax = 3;

  const ayahChunks = [];
  let i = 0;
  while (i < (rowData.ayahs?.length || 0)) {
    const rawChunkSize = (ayahChunks.length === 0) ? line1Max : (isMobile && hasJuz ? extraLineMax : line1Max);
    const chunkSize = Math.max(1, parseInt(rawChunkSize, 10) || 1);
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
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-12a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"></path>
        </svg>
      </div>

      {/* Main Row Content */}
      <div className="flex flex-col gap-2.5 sm:gap-3 flex-1 min-w-0">
        {/* Line 1: Juz + Page + Ayah label + 1 Ayah box */}
        <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0 flex-nowrap">
          {/* Left Side: Juz Dropdown (if any) & Page Input */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {hasJuz && (
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
              <div className="theme-bg-sub rounded-lg border theme-border overflow-hidden h-[38px] sm:h-10 w-[42px] sm:w-14 shadow-sm transition-all focus-within:border-[var(--accent-main)]/50 focus-within:ring-1 focus-within:ring-[var(--accent-main)]/30">
                <NumberScrollInput
                  id={`page-${rowData.id}`}
                  value={rowData.page}
                  onChange={handlePageChange}
                  onEnter={handleEnterFocusNext}
                  onEmptyBackspace={(e) => {
                    if (onRemoveRow) onRemoveRow();
                    handleBackspaceFocusPrev(e, true);
                  }}
                  min={minPage}
                  max={maxPage}
                  placeholder="--"
                  className="w-full h-full text-xs sm:text-sm theme-text-primary font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Right Side: Ayah Label + Line 1 Ayah Chunk */}
          <div className="flex items-start gap-1 sm:gap-1.5 shrink-0">
            <label className="text-[11px] sm:text-xs font-semibold theme-text-secondary shrink-0 h-[38px] sm:h-10 flex items-center select-none">Ayah</label>

            <div className="flex flex-col gap-2.5 sm:gap-3">
              {(isMobileMultiJuzExtraRows ? [line1Chunk] : ayahChunks).map((chunk, chunkRowIdx) => {
                const isLastChunk = isMobileMultiJuzExtraRows 
                  ? false 
                  : chunkRowIdx === ayahChunks.length - 1;

                return (
                  <div key={chunkRowIdx} className="flex items-center gap-0.5 shrink-0 flex-nowrap">
                    {chunk.items.map((ayah, itemIdx) => {
                      const globalIdx = chunk.startIndex + itemIdx;
                      const isLastTotal = globalIdx === rowData.ayahs.length - 1;
                      return (
                        <div key={ayah.id} className="flex items-center gap-0.5 shrink-0">
                          <div className="theme-bg-sub rounded-lg border theme-border overflow-hidden h-[38px] sm:h-10 w-[42px] sm:w-14 shadow-sm transition-all focus-within:border-[var(--accent-main)]/50 focus-within:ring-1 focus-within:ring-[var(--accent-main)]/30">
                            <NumberScrollInput
                              id={`ayah-${ayah.id}`}
                              value={ayah.value}
                              onChange={(val) => handleAyahChange(globalIdx, val)}
                              onEnter={(e) => {
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
                              onEmptyBackspace={(e) => {
                                handleBackspaceFocusPrev(e, true);
                                removeAyah(globalIdx);
                              }}
                              min={1}
                              placeholder="--"
                              className="w-full h-full text-xs sm:text-sm theme-text-primary font-semibold"
                            />
                          </div>
                          {!isLastTotal && <span className="theme-text-secondary font-bold text-xs opacity-60 px-[1px] select-none">,</span>}
                        </div>
                      );
                    })}

                    {/* Show + button on the last chunk row */}
                    {isLastChunk && (
                      <button
                        onClick={addAyah}
                        className="w-5 h-5 sm:w-6 sm:h-6 text-xs sm:text-sm rounded-full border theme-border flex items-center justify-center theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition-all shrink-0 ml-1 cursor-pointer"
                        title="Add Ayah"
                      >
                        +
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mobile ONLY with Multiple Juzs: Extra Ayah Rows (Line 2+) aligned EXACTLY under the Page Box */}
        {isMobileMultiJuzExtraRows && (
          <div className="flex flex-col gap-2.5 pl-[108px]">
            {extraChunks.map((chunk, extraIdx) => {
              const isLastChunk = extraIdx === extraChunks.length - 1;
              return (
                <div key={extraIdx} className="flex items-center gap-0.5 shrink-0 flex-nowrap">
                  {chunk.items.map((ayah, itemIdx) => {
                    const globalIdx = chunk.startIndex + itemIdx;
                    const isLastTotal = globalIdx === rowData.ayahs.length - 1;
                    return (
                      <div key={ayah.id} className="flex items-center gap-0.5 shrink-0">
                        <div className="theme-bg-sub rounded-lg border theme-border overflow-hidden h-[38px] w-[42px] shadow-sm transition-all focus-within:border-[var(--accent-main)]/50 focus-within:ring-1 focus-within:ring-[var(--accent-main)]/30">
                          <NumberScrollInput
                            id={`ayah-${ayah.id}`}
                            value={ayah.value}
                            onChange={(val) => handleAyahChange(globalIdx, val)}
                            onEnter={(e) => {
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
                            onEmptyBackspace={(e) => {
                              handleBackspaceFocusPrev(e, true);
                              removeAyah(globalIdx);
                            }}
                            min={1}
                            placeholder="--"
                            className="w-full h-full text-xs theme-text-primary font-semibold"
                          />
                        </div>
                        {!isLastTotal && <span className="theme-text-secondary font-bold text-xs opacity-60 px-[1px] select-none">,</span>}
                      </div>
                    );
                  })}

                  {/* Show + button on the last extra chunk row */}
                  {isLastChunk && (
                    <button
                      onClick={addAyah}
                      className="w-5 h-5 text-xs rounded-full border theme-border flex items-center justify-center theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition-all shrink-0 ml-1 cursor-pointer"
                      title="Add Ayah"
                    >
                      +
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {onRemoveRow && (
        <button
          type="button"
          onClick={onRemoveRow}
          className="p-1 theme-text-secondary hover:text-red-400 transition-colors shrink-0 flex items-center justify-center h-[38px] sm:h-10 self-start cursor-pointer ml-auto"
          title="Remove Row"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      )}
    </div>
  );
}
