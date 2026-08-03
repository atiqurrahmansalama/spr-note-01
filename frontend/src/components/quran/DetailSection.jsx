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
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
          {title}
        </h3>
        {onReset && (
          <button
            onClick={onReset}
            className="text-slate-500 hover:text-red-400 transition-colors p-1 rounded-md hover:bg-slate-800"
            title={`Reset Details`}
          >
            <RefreshIcon className="w-4 h-4 text-slate-500 hover:text-red-400" />
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

      <div className="pl-[80px] pt-1">
        <button
          onClick={addRow}
          className="px-4 py-1.5 rounded-full border border-slate-700/80 border-dashed hover:border-solid hover:bg-[#232529] text-slate-400 hover:text-slate-200 text-sm font-medium transition-all"
        >
          + Add {title.split(" ")[0]}
        </button>
      </div>
    </div>
  );
}
