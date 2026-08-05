import JuzRow from "../quran/JuzRow";

export default function JuzPageInputSection({ data, onChange }) {
  const handleRowChange = (index, rowUpdater) => {
    onChange(prevData => {
      const newData = [...prevData];
      const oldRow = newData[index];
      const newRow = typeof rowUpdater === 'function' ? rowUpdater(oldRow) : rowUpdater;
      newData[index] = newRow;
      return newData;
    });
  };

  const handleRemoveJuz = (index) => {
    onChange(prevData => {
      if (prevData.length > 1) {
        return prevData.filter((_, idx) => idx !== index);
      }
      return prevData;
    });
  };

  const addJuzRow = () => {
    const newJuzId = `juz-input-${crypto.randomUUID()}`;
    onChange(prevData => [
      ...prevData,
      {
        id: crypto.randomUUID(),
        juz: "",
        juzInputId: newJuzId,
        ranges: [{ id: crypto.randomUUID(), start: "", end: "" }]
      }
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
    <div className="space-y-3">
      <div className="space-y-1.5 sm:space-y-2.5">
        {data.map((row, index) => (
          <JuzRow
            key={row.id}
            rowData={row}
            onChange={(rowUpdater) => handleRowChange(index, rowUpdater)}
            onRemoveJuz={() => handleRemoveJuz(index)}
            onAddJuz={addJuzRow}
            showLabel={index === 0}
          />
        ))}
      </div>

      <div className="flex justify-center sm:justify-start sm:pl-[104px] pt-1">
        <button
          type="button"
          onClick={addJuzRow}
          className="px-4 py-1.5 rounded-full border theme-border border-dashed hover:border-solid theme-bg-sub hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary text-xs font-semibold transition-all cursor-pointer shadow-sm"
        >
          + Add Juz
        </button>
      </div>
    </div>
  );
}
