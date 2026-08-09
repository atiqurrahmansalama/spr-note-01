import JuzRow from "../../../components/quran/JuzRow";
import { RefreshIcon } from "../../../components/ui/Icons";

export default function JuzPageSection({ data, onChange, onReset }) {
  const handleRowChange = (index, rowUpdater) => {
    onChange((prevData) => {
      const newData = [...prevData];
      const oldRow = newData[index];
      const newRow = typeof rowUpdater === "function" ? rowUpdater(oldRow) : rowUpdater;
      newData[index] = newRow;
      return newData;
    });
  };

  const handleRemoveJuz = (index) => {
    onChange((prevData) => {
      if (prevData.length > 1) {
        return prevData.filter((_, idx) => idx !== index);
      }
      return prevData;
    });
  };

  const handleReset = () => {
    if (onReset) {
      onReset();
    } else {
      onChange([
        {
          id: crypto.randomUUID(),
          juz: "",
          juzInputId: `juz-input-${crypto.randomUUID()}`,
          ranges: [{ id: crypto.randomUUID(), start: "", end: "" }],
        },
      ]);
    }
  };

  const addJuzRow = () => {
    const newJuzId = `juz-input-${crypto.randomUUID()}`;
    onChange((prevData) => [
      ...prevData,
      {
        id: crypto.randomUUID(),
        juz: "",
        juzInputId: newJuzId,
        ranges: [{ id: crypto.randomUUID(), start: "", end: "" }],
      },
    ]);

    setTimeout(() => {
      const el = document.getElementById(newJuzId);
      if (el) {
        el.focus();
        if (typeof el.select === "function") el.select();
      }
    }, 100);
  };

  return (
    <div className="relative">
      {/* Title Header Row with Refresh Icon */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold uppercase tracking-wider theme-text-secondary flex items-center gap-2">
          JUZ / PAGE DETAILS
        </h3>
        <button
          type="button"
          onClick={handleReset}
          className="theme-bg-sub border theme-border theme-text-secondary hover:theme-danger hover:theme-bg-elevated p-1.5 rounded-xl active:scale-95 transition-all cursor-pointer shadow-sm"
          title="Reset Juz / Page Details"
        >
          <RefreshIcon className="w-4 h-4 text-inherit transition-colors" />
        </button>
      </div>

      {/* Rows Container */}
      <div className="space-y-0.5">
        {data.map((row, index) => (
          <JuzRow
            key={row.id}
            rowData={row}
            onChange={(rowUpdater) => handleRowChange(index, rowUpdater)}
            onRemoveJuz={data.length > 1 ? () => handleRemoveJuz(index) : undefined}
            onAddJuz={addJuzRow}
          />
        ))}
      </div>

      {/* Add Juz Row Button */}
      <div className="flex justify-center sm:justify-start sm:pl-[80px] pt-3.5 mt-2">
        <button
          type="button"
          onClick={addJuzRow}
          className="px-4 py-1.5 rounded-full border theme-border border-dashed hover:border-solid theme-bg-sub hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary text-xs font-semibold transition-all cursor-pointer shadow-sm"
        >
          + Add More
        </button>
      </div>
    </div>
  );
}
