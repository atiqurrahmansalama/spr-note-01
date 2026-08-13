import DetailSection from "./quran/DetailSection";

export default function MistakeTrackerSection({
  mistakeData,
  setMistakeData,
  availableJuzs,
  juzPageData,
  onDragStart,
  onDragOver,
  onDrop,
  onResetMistakes,
}) {
  return (
    <DetailSection
      title="MISTAKE DETAILS"
      listType="mistake"
      data={mistakeData}
      onChange={setMistakeData}
      availableJuzs={availableJuzs}
      juzPageData={juzPageData}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onReset={onResetMistakes}
    />
  );
}
