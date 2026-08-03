import { useState, useRef } from "react";
import StudentInput from "./StudentInput";
import AutocompleteDropdown from "../ui/AutocompleteDropdown";
import JuzPageInputSection from "./JuzPageInputSection";
import DetailSection from "../quran/DetailSection";
import CommentSection from "./CommentSection";

export default function SessionInput({
  studentDatabase,
  studentName,
  groupName,
  sessionList,
  selectedSession,
  juzPageData,
  setJuzPageData,
  mistakeData,
  setMistakeData,
  stuckData,
  setStuckData,
  comment,
  setComment,
  savedComments,
  setSavedComments,
  isPanelOpen,
  pendingName,
  availableGroups,
  onStudentSelect,
  onGroupNameChange,
  onSessionChange,
  onOpenSavePanel,
  onCloseSavePanel,
  onSaveResult,
  onAddToRecord,
  onMakeReport,
}) {
  const sessionOptions = sessionList.map((s) => ({
    label: typeof s === "object" ? (s.name || s.label) : s,
    value: typeof s === "object" ? (s.name || s.value) : s,
  }));

  const availableJuzs = Array.from(new Set(
    juzPageData
      .map(d => d.juz)
      .filter(j => j !== "" && j !== undefined && j !== null)
  ));

  const countValid = (data) => {
    return data.reduce((total, row) => {
      if (!row.page || row.page.toString().trim() === "") return total;
      const validAyahs = row.ayahs.filter(a => a.value && a.value.toString().trim() !== "").length;
      return total + validAyahs;
    }, 0);
  };
  
  const totalMistakes = countValid(mistakeData);
  const totalStuck = countValid(stuckData);

  // Helper to create a blank row
  const createBlankRow = () => ({
    id: crypto.randomUUID(),
    juz: "",
    page: "",
    ayahs: [{ id: crypto.randomUUID(), value: "" }],
  });

  // Refresh handlers for Mistake and Stuck
  const mistakeRefreshCount = useRef(0);
  const handleMistakeRefresh = () => {
    mistakeRefreshCount.current += 1;
    if (mistakeRefreshCount.current === 1) {
      // Single click: reset only mistake rows, keep at least one blank row
      setMistakeData([createBlankRow()]);
    } else if (mistakeRefreshCount.current >= 2) {
      // Double click: reset both mistake and stuck rows
      setMistakeData([createBlankRow()]);
      setStuckData([createBlankRow()]);
      mistakeRefreshCount.current = 0;
    }
  };
  const handleStuckRefresh = () => {
    // Reset only stuck rows, keep at least one blank row
    setStuckData([createBlankRow()]);
  };

  const [draggedItem, setDraggedItem] = useState(null);

  const handleDragStart = (e, listType, index) => {
    setDraggedItem({ listType, index });
    e.dataTransfer.effectAllowed = "move";
    // We can also attach data to dataTransfer for external drops, but react state is enough here
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, targetListType, targetIndex) => {
    e.preventDefault();
    if (!draggedItem) return;

    const { listType: sourceListType, index: sourceIndex } = draggedItem;
    if (sourceListType === targetListType && sourceIndex === targetIndex) {
      setDraggedItem(null);
      return;
    }

    let newMistake = [...mistakeData];
    let newStuck = [...stuckData];

    let sourceList = sourceListType === 'mistake' ? newMistake : newStuck;
    let targetList = targetListType === 'mistake' ? newMistake : newStuck;

    const [item] = sourceList.splice(sourceIndex, 1);
    
    if (targetIndex === undefined) {
      targetList.push(item);
    } else {
      targetList.splice(targetIndex, 0, item);
    }

    if (sourceListType === 'mistake' || targetListType === 'mistake') setMistakeData(newMistake);
    if (sourceListType === 'stuck' || targetListType === 'stuck') setStuckData(newStuck);
    
    setDraggedItem(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Card: Student, Session, Juz/Page */}
      <div className="bg-[#212327] rounded-2xl p-5 shadow-lg space-y-4 relative z-0">
        {/* 1. Student Input Section */}
        <StudentInput
          studentDatabase={studentDatabase}
          studentName={studentName}
          groupName={groupName}
          isPanelOpen={isPanelOpen}
          pendingName={pendingName}
          availableGroups={availableGroups}
          onStudentSelect={onStudentSelect}
          onGroupNameChange={onGroupNameChange}
          onOpenSavePanel={onOpenSavePanel}
          onCloseSavePanel={onCloseSavePanel}
          onSaveResult={onSaveResult}
        />

        {/* 2. Session Dropdown Section */}
        <div className="flex items-center justify-between gap-4 border-t border-slate-800/80 pt-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 w-20 shrink-0">
            SESSION
          </label>
          <div className="flex-1">
            <AutocompleteDropdown
              options={sessionOptions}
              value={selectedSession}
              onChange={(sel) => onSessionChange(typeof sel === "object" ? sel.label : sel)}
              placeholder="Select session..."
            />
          </div>
        </div>

        {/* 3. Juz / Page Input Section */}
        <div className="border-t border-slate-800/80 pt-4 mt-2">
          <JuzPageInputSection 
            data={juzPageData}
            onChange={setJuzPageData}
          />
        </div>
      </div>

      {/* Bottom Card: Mistake and Stuck Details */}
      <div className="bg-[#212327] rounded-2xl p-5 shadow-lg relative z-0">
        {/* Header with Totals */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-5 mb-5">
          <div className="flex items-center gap-4 w-full">
            {/* MISTAKE BOX */}
            <div className="bg-[#212327] border border-slate-700/50 rounded-xl px-5 py-4 flex-1 flex flex-col items-center justify-center shadow-sm">
              <span className="text-[10px] font-bold text-slate-500 tracking-wider">TOTAL MISTAKE</span>
              <span className="text-3xl font-bold text-slate-300 leading-none mt-1">{totalMistakes}</span>
            </div>
            
            {/* STUCK BOX */}
            <div className="bg-[#212327] border border-slate-700/50 rounded-xl px-5 py-4 flex-1 flex flex-col items-center justify-center shadow-sm">
              <span className="text-[10px] font-bold text-slate-500 tracking-wider">TOTAL STUCK</span>
              <span className="text-3xl font-bold text-slate-300 leading-none mt-1">{totalStuck}</span>
            </div>
          </div>
        </div>

        {/* 4. Mistake Detail Section */}
        <DetailSection
          title="Mistake Detail"
          listType="mistake"
          data={mistakeData}
          onChange={setMistakeData}
          availableJuzs={availableJuzs}
          juzPageData={juzPageData}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onReset={handleMistakeRefresh}
        />

        {/* 5. Stuck Detail Section */}
        <div className="border-t border-slate-800/80 pt-4 mt-4">
          <DetailSection
            title="Stuck Detail"
            listType="stuck"
            data={stuckData}
            onChange={setStuckData}
            availableJuzs={availableJuzs}
            juzPageData={juzPageData}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onReset={handleStuckRefresh}
          />
        </div>
      </div>

      {/* 6. Comment Section (Separate Component & Card) */}
      <CommentSection
        comment={comment}
        setComment={setComment}
        savedComments={savedComments}
        setSavedComments={setSavedComments}
        onAddToRecord={onAddToRecord}
        onMakeReport={onMakeReport}
      />
    </div>
  );
}