import DetailRow from "./DetailRow";
import { RefreshIcon } from "../ui/Icons";

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
    onChange(prevData => {
      const lastJuz = prevData.length > 0 ? prevData[prevData.length - 1].juz : (availableJuzs?.[0] || "");
      return [
        ...prevData,
        {
          id: crypto.randomUUID(),
          juz: lastJuz,
          page: "",
          ayahs: [{ id: crypto.randomUUID(), value: "" }]
        }
      ];
    });
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

  return (
    <div 
      className="relative"
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, listType)}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold uppercase tracking-wider theme-text-secondary flex items-center gap-2">
          {title}
        </h3>
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="theme-text-secondary hover:text-red-500 transition-colors p-1 rounded-md hover:theme-bg-sub cursor-pointer group"
            title="Reset Details"
          >
            <RefreshIcon className="w-4 h-4 text-inherit group-hover:text-red-500 transition-colors" />
          </button>
        )}
      </div>

      <div className="space-y-0">
        {data.map((row, idx) => (
          <DetailRow
            key={row.id}
            index={idx}
            listType={listType}
            rowData={row}
            onChange={(newR) => handleRowChange(idx, newR)}
            onRemoveRow={data.length > 1 ? () => handleRemoveRow(idx) : undefined}
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
          + Add {title.split(" ")[0]}
        </button>
      </div>
    </div>
  );
}
