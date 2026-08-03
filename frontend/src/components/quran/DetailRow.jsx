import { useState, useEffect } from "react";
import CustomSelect from "../ui/CustomSelect";
import NumberScrollInput from "../ui/NumberScrollInput";
import { handleEnterFocusNext, handleBackspaceFocusPrev } from "../../utils/keyboardUtils";
import { QURAN_CONSTANTS } from "../../constants/quranConstants";

export default function DetailRow({
  rowData,
  onChange,
  onRemoveRow,
  availableJuzs,
  listType,
  index,
  onDragStart,
  onDragOver,
  onDrop,
}) {
  const [isDraggable, setIsDraggable] = useState(false);
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
    const j = parseInt(juzNum, 10);
    const starts = QURAN_CONSTANTS.JUZ_PAGE_STARTS;
    if (!j || isNaN(j) || !starts || j < 1 || j > 30) return { min: 1, max: 604 };
    const start = starts[j] || 1;
    const end = j === 30 ? 604 : (starts[j + 1] ? starts[j + 1] - 1 : 604);
    return { min: start, max: end };
  };

  const { min: minPage, max: maxPage } = getPageRangeForJuz(rowData.juz);

  const handleJuzChange = (newJuz) => {
    const range = getPageRangeForJuz(newJuz);
    onChange((prev) => ({
      ...prev,
      juz: newJuz,
      page: range.min.toString(),
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
  // Line 1: on mobile multi-Juz: 2; on mobile single-Juz: 3; on desktop: 3 or 4
  const line1Max = isMobile ? (hasJuz ? 2 : 3) : (hasJuz ? 3 : 4);
  // Extra lines (mobile multi-Juz only): 4 per line for wider display
  const extraLineMax = 4;

  // Group ayahs: first chunk uses line1Max, subsequent chunks use extraLineMax if mobile+multiJuz
  const ayahChunks = [];
  let i = 0;
  while (i < rowData.ayahs.length) {
    const chunkSize = (ayahChunks.length === 0) ? line1Max : (isMobile && hasJuz ? extraLineMax : line1Max);
    ayahChunks.push({
      items: rowData.ayahs.slice(i, i + chunkSize),
      startIndex: i,
    });
    i += chunkSize;
  }

  // On Mobile when multiple Juzs exist, extra Ayah rows (Line 2+) align to the LEFT with the PAGE BOX ([3])
  const isMobileMultiJuzExtraRows = isMobile && hasJuz && ayahChunks.length > 1;
  const line1Chunk = ayahChunks[0] || { items: [], startIndex: 0 };
  const extraChunks = isMobileMultiJuzExtraRows ? ayahChunks.slice(1) : [];

  return (
    <div 
      className="flex items-start gap-1.5 sm:gap-2.5 w-full py-2 px-1 sm:px-3 -mx-1 sm:-mx-3 rounded-xl relative group hover:theme-bg-elevated transition-colors duration-150"
      draggable={isDraggable}
      onDragStart={(e) => {
        if (onDragStart) onDragStart(e, listType, index);
      }}
      onDragOver={(e) => {
        if (onDragOver) onDragOver(e);
      }}
      onDrop={(e) => {
        if (onDrop) {
          e.stopPropagation();
          onDrop(e, listType, index);
        }
      }}
    >
      {/* Drag handle */}
      <div 
        className="theme-text-secondary opacity-50 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity shrink-0 flex items-center justify-center self-start mt-2.5"
        onMouseEnter={() => setIsDraggable(true)}
        onMouseLeave={() => setIsDraggable(false)}
      >
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-12a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"></path>
        </svg>
      </div>

      {/* Main Row Content */}
      <div className="flex flex-col gap-2.5 sm:gap-3 flex-1 min-w-0">
        {/* Line 1: Juz + Page + Ayah label + Ayahs */}
        <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0 flex-nowrap">
          {/* Left Side: Juz Dropdown (if any) & Page Input */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {hasJuz && (
              <div className="flex items-center gap-1 shrink-0 relative z-30">
                <label className="text-[11px] sm:text-xs font-semibold theme-text-secondary">Juz</label>
                <CustomSelect
                  options={availableJuzs.map((j) => ({ label: j, value: j }))}
                  value={rowData.juz || (availableJuzs[0] || "")}
                  onChange={(val) => handleJuzChange(val)}
                  className="w-[42px] sm:w-16"
                  buttonClassName="h-9 sm:h-10 w-[42px] sm:w-16 theme-bg-sub rounded-lg border theme-border flex items-center justify-between px-1 text-xs sm:text-sm theme-text-primary font-semibold cursor-pointer shadow-sm transition-colors select-none"
                />
              </div>
            )}

            <div className="flex items-center gap-1 shrink-0">
              <label className="text-[11px] sm:text-xs font-semibold theme-text-secondary">Page</label>
              <div className="theme-bg-sub rounded-lg border theme-border overflow-hidden h-9 sm:h-10 w-[36px] sm:w-14 shadow-sm transition-all focus-within:border-[var(--accent-main)]/50 focus-within:ring-1 focus-within:ring-[var(--accent-main)]/30">
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

          {/* Right Side: Ayah Label + Ayah Rows */}
          <div className="flex items-start gap-1 sm:gap-1.5 shrink-0">
            <label className="text-[11px] sm:text-xs font-semibold theme-text-secondary shrink-0 mt-2">Ayah</label>

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
                          <div className="theme-bg-sub rounded-lg border theme-border overflow-hidden h-9 sm:h-10 w-[36px] sm:w-14 shadow-sm transition-all focus-within:border-[var(--accent-main)]/50 focus-within:ring-1 focus-within:ring-[var(--accent-main)]/30">
                            <NumberScrollInput
                              id={`ayah-${ayah.id}`}
                              value={ayah.value}
                              onChange={(val) => handleAyahChange(globalIdx, val)}
                              onEnter={handleEnterFocusNext}
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
                          {!isLastTotal && <span className="theme-text-secondary font-bold text-xs opacity-60 px-[1px]">,</span>}
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

        {/* Mobile ONLY with Multiple Juzs: Extra Ayah Rows (Line 2+) aligned EXACTLY under the Page Box ([3]) */}
        {isMobileMultiJuzExtraRows && (
          <div className="flex flex-col gap-2.5 pl-[96px]">
            {extraChunks.map((chunk, extraIdx) => {
              const isLastChunk = extraIdx === extraChunks.length - 1;
              return (
                <div key={extraIdx} className="flex items-center gap-0.5 shrink-0 flex-nowrap">
                  {chunk.items.map((ayah, itemIdx) => {
                    const globalIdx = chunk.startIndex + itemIdx;
                    const isLastTotal = globalIdx === rowData.ayahs.length - 1;
                    return (
                      <div key={ayah.id} className="flex items-center gap-0.5 shrink-0">
                        <div className="theme-bg-sub rounded-lg border theme-border overflow-hidden h-9 w-[36px] shadow-sm transition-all focus-within:border-[var(--accent-main)]/50 focus-within:ring-1 focus-within:ring-[var(--accent-main)]/30">
                          <NumberScrollInput
                            id={`ayah-${ayah.id}`}
                            value={ayah.value}
                            onChange={(val) => handleAyahChange(globalIdx, val)}
                            onEnter={handleEnterFocusNext}
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
                        {!isLastTotal && <span className="theme-text-secondary font-bold text-xs opacity-60 px-[1px]">,</span>}
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
          onClick={onRemoveRow}
          className="w-5 h-5 rounded-full theme-text-secondary hover:bg-red-500/20 hover:text-red-400 transition-colors shrink-0 flex items-center justify-center self-start mt-2.5 cursor-pointer ml-auto"
          title="Remove Row"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      )}
    </div>
  );
}
