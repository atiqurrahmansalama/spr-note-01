import DetailRow from "./DetailRow";
import { RefreshIcon } from "../../../../components/ui/Icons";

export default function DetailSection({ 
  title, 
  listType,
  data, 
  onChange, 
  availableJuzs, 
  juzPageData,
  onDragStart, 
  onDragOver, 
  onDrop,
  onReset 
}) {
  const addRow = () => {
    const newId = crypto.randomUUID();
    onChange(prevData => {
      const lastJuz = prevData.length > 0 ? prevData[prevData.length - 1].juz : (availableJuzs?.[0] || "");
      return [
        ...prevData,
        {
          id: newId,
          juz: lastJuz,
          page: "",
          ayahs: [{ id: crypto.randomUUID(), value: "" }]
        }
      ];
    });

    // Auto-focus new row's page box
    setTimeout(() => {
      const el = document.getElementById(`page-${newId}`);
      if (el) {
        el.focus();
        if (el.select) el.select();
      }
    }, 60);
  };

  const handleRemoveRow = (index) => {
    onChange(prevData => {
      if (prevData.length > 1) {
        return prevData.filter((_, idx) => idx !== index);
      }
      return prevData;
    });
  };

  const handleRowChange = (index, newRow) => {
    onChange(prevData => {
      const newData = [...prevData];
      newData[index] = typeof newRow === "function" ? newRow(newData[index]) : newRow;
      return newData;
    });
  };

  const handleNextSection = () => {
    if (listType === "mistake") {
      const stuckInputs = Array.from(document.querySelectorAll('input[id^="page-"]'));
      const stuckPageInput = stuckInputs.find((el) => {
        const parent = el.closest('[data-list-type="stuck"]');
        return parent !== null;
      }) || document.querySelector('[data-list-type="stuck"] input');

      if (stuckPageInput) {
        stuckPageInput.focus();
        if (stuckPageInput.select) stuckPageInput.select();
        return;
      }
    }

    const commentEl = document.getElementById("comment-textarea") || document.querySelector("textarea");
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
        const filledAyahs = row.ayahs?.filter(a => a.value && String(a.value).trim() !== "") || [];
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

  return (
    <div 
      data-list-type={listType}
      className="relative"
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, listType)}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold uppercase tracking-wider theme-text-secondary flex items-center gap-2">
          {title}
          {totalCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold theme-bg-accent-soft theme-accent border theme-border font-mono shadow-sm">
              {totalCount}
            </span>
          )}
        </h3>
        {onReset && hasContent && (
          <button
            type="button"
            onClick={onReset}
            className="theme-bg-sub border theme-border theme-text-secondary hover:theme-danger hover:theme-bg-elevated p-1.5 rounded-xl active:scale-95 transition-all cursor-pointer shadow-sm"
            title="Reset Details"
          >
            <RefreshIcon className="w-4 h-4 text-inherit transition-colors" />
          </button>
        )}
      </div>

      <div className="space-y-0">
        {data.map((row, idx) => (
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
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
          />
        ))}
      </div>

      {/* Centered on mobile, left-indented on desktop */}
      <div className="flex justify-center sm:justify-start sm:pl-[80px] pt-3.5 mt-2">
        <button
          type="button"
          onClick={addRow}
          className="px-4 py-1.5 rounded-full border theme-border border-dashed hover:border-solid theme-bg-sub hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary text-xs font-semibold transition-all cursor-pointer shadow-sm"
        >
          + Add More
        </button>
      </div>
    </div>
  );
}
