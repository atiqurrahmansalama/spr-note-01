import { useState } from "react";
import NumberScrollInput from "../ui/NumberScrollInput";
import CustomSelect from "../ui/CustomSelect";
import { handleEnterFocusNext, handleBackspaceFocusPrev } from "../../utils/keyboardUtils";
import { QURAN_CONSTANTS } from "../../constants/quranConstants";

export default function DetailRow({ 
  rowData, 
  onChange, 
  onRemoveRow, 
  availableJuzs,
  juzPageData,
  index,
  listType,
  onDragStart,
  onDragOver,
  onDrop
}) {
  const [isDraggable, setIsDraggable] = useState(false);

  // Compute min/max page based on juzPageData
  let minPage = 1;
  let maxPage = QURAN_CONSTANTS.MAX_PAGES;
  const currentJuz = rowData.juz || (availableJuzs && availableJuzs[0]) || "";
  
  if (juzPageData && currentJuz) {
    const juzEntries = juzPageData.filter(d => d.juz === currentJuz.toString());
    let min = Infinity;
    let max = -Infinity;
    
    juzEntries.forEach(entry => {
      if (entry.ranges) {
        entry.ranges.forEach(r => {
          const s = parseInt(r.start);
          const e = parseInt(r.end);
          if (!isNaN(s) && s < min) min = s;
          if (!isNaN(e) && e > max) max = e;
          if (!isNaN(s) && isNaN(e) && s > max) max = s;
        });
      }
    });
    
    if (min !== Infinity) minPage = min;
    if (max !== -Infinity) maxPage = max;
  }

  const handleJuzChange = (val) => {
    onChange((prevRow) => ({ ...prevRow, juz: val }));
  };

  const handlePageChange = (val) => {
    onChange((prevRow) => ({ ...prevRow, page: val }));
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
      ayahs: [...prevRow.ayahs, { id: newId, value: "" }]
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

  return (
    <div 
      className="flex items-start gap-3 w-full py-0.5 relative group"
      draggable={isDraggable}
      onDragStart={(e) => {
        if (onDragStart) onDragStart(e, listType, index);
      }}
      onDragOver={(e) => {
        if (onDragOver) onDragOver(e);
      }}
      onDrop={(e) => {
        if (onDrop) {
          e.stopPropagation(); // prevent dropping on container
          onDrop(e, listType, index);
        }
      }}
    >
      {/* Drag handle */}
      <div 
        className="text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing opacity-50 group-hover:opacity-100 transition-opacity shrink-0 flex items-center justify-center self-start mt-[14px]"
        onMouseEnter={() => setIsDraggable(true)}
        onMouseLeave={() => setIsDraggable(false)}
      >
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-12a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"></path>
        </svg>
      </div>

      <div className="flex flex-wrap items-start gap-4 flex-1 mt-1">
        {/* Juz Dropdown */}
        {availableJuzs && availableJuzs.length > 1 && (
          <div className="flex items-center gap-1.5 shrink-0">
            <label className="text-xs font-semibold text-slate-400">Juz</label>
            <CustomSelect
              options={availableJuzs.map((j) => ({ label: j, value: j }))}
              value={rowData.juz || (availableJuzs[0] || "")}
              onChange={(val) => handleJuzChange(val)}
              className="w-14"
              buttonClassName="h-9 w-14 bg-[#1c1d1f] rounded-lg border border-slate-700/50 hover:border-slate-600 flex items-center justify-between px-2 text-sm text-slate-200 font-semibold cursor-pointer shadow-inner transition-colors select-none"
            />
          </div>
        )}

        {/* Page Input */}
        <div className="flex items-center gap-1.5 shrink-0">
          <label className="text-xs font-semibold text-slate-400">Page</label>
          <div className="bg-[#1c1d1f] rounded-lg border border-slate-700/50 overflow-hidden h-9 w-14 shadow-inner focus-within:border-slate-500 focus-within:ring-1 focus-within:ring-slate-500 transition-all">
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
              className="w-full h-full text-sm text-slate-300 font-semibold focus:bg-slate-800"
            />
          </div>
        </div>

        {/* Ayahs */}
        <div className="flex items-start gap-1.5 flex-1 min-w-[200px]">
          <label className="text-xs font-semibold text-slate-400 shrink-0 mt-2.5">Ayah</label>
          <div className="flex flex-wrap items-center gap-y-2 gap-x-1">
            {rowData.ayahs.map((ayah, idx) => {
              const isLast = idx === rowData.ayahs.length - 1;
              return (
                <div key={ayah.id} className="flex items-center gap-1">
                  <div className="bg-[#1c1d1f] rounded-lg border border-slate-700/50 overflow-hidden h-9 w-14 shadow-inner focus-within:border-slate-500 focus-within:ring-1 focus-within:ring-slate-500 transition-all">
                    <NumberScrollInput
                      id={`ayah-${ayah.id}`}
                      value={ayah.value}
                      onChange={(val) => handleAyahChange(idx, val)}
                      onEnter={handleEnterFocusNext}
                      onAdd={() => {
                        if (isLast) addAyah();
                      }}
                      onEmptyBackspace={(e) => {
                        handleBackspaceFocusPrev(e, true);
                        removeAyah(idx);
                      }}
                      min={1}
                      className="w-full h-full text-sm text-slate-300 font-semibold focus:bg-slate-800"
                    />
                  </div>
                  {!isLast && <span className="text-slate-600 font-bold ml-0.5 mr-0.5 opacity-60">,</span>}
                </div>
              );
            })}

            <button
              onClick={addAyah}
              className="w-6 h-6 text-sm rounded-full border border-slate-700/80 flex items-center justify-center text-slate-500 hover:text-slate-300 hover:border-slate-500 hover:bg-slate-800 transition-all shrink-0 ml-1"
              title="Add Ayah"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {onRemoveRow && (
        <button
          onClick={onRemoveRow}
          className="w-5 h-5 rounded-full text-slate-500 hover:bg-red-500/20 hover:text-red-400 transition-colors shrink-0 flex items-center justify-center self-start mt-3"
          title="Remove Row"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      )}
    </div>
  );
}
