import DetailSection from "./quran/DetailSection";

export default function StuckTrackerSection({
  stuckData,
  setStuckData,
  availableJuzs,
  juzPageData,
  onDragStart,
  onDragOver,
  onDrop,
  onResetStuck,
}) {
  return (
    <DetailSection
      title="STUCK DETAILS"
      listType="stuck"
      data={stuckData}
      onChange={setStuckData}
      availableJuzs={availableJuzs}
      juzPageData={juzPageData}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onReset={onResetStuck}
    />
  );
}
