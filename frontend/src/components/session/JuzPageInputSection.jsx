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
    onChange(prevData => [
      ...prevData,
      {
        id: crypto.randomUUID(),
        juz: "",
        ranges: [{ id: crypto.randomUUID(), start: "", end: "" }]
      }
    ]);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {data.map((row, index) => (
          <JuzRow
            key={row.id}
            rowData={row}
            onChange={(rowUpdater) => handleRowChange(index, rowUpdater)}
            onRemoveJuz={() => handleRemoveJuz(index)}
            showLabel={index === 0}
          />
        ))}
      </div>

      <div className="pl-[104px] pt-1">
        <button
          onClick={addJuzRow}
          className="px-4 py-1.5 rounded-full border border-slate-700/80 border-dashed hover:border-solid hover:bg-[#232529] text-slate-400 hover:text-slate-200 text-sm font-medium transition-all"
        >
          + Add Juz
        </button>
      </div>
    </div>
  );
}
