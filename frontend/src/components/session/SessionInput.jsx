import { useState, useRef, useMemo } from "react";
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
  onSaveSession,
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

  const availableJuzs = useMemo(() => {
    return Array.from(new Set(
      juzPageData
        .map(d => d.juz)
        .filter(j => j !== "" && j !== undefined && j !== null)
    ));
  }, [juzPageData]);

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
    e.dataTransfer.effectAllowed = "copyMove";
    // We can also attach data to dataTransfer for external drops, but react state is enough here
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (e.ctrlKey || e.altKey) {
      e.dataTransfer.dropEffect = "copy";
    } else {
      e.dataTransfer.dropEffect = "move";
    }
  };

  const handleDrop = (e, targetListType, targetIndex) => {
    e.preventDefault();
    if (!draggedItem) return;

    const { listType: sourceListType, index: sourceIndex } = draggedItem;
    const isCopy = e.ctrlKey || e.altKey;

    let newMistake = [...mistakeData];
    let newStuck = [...stuckData];

    let sourceList = sourceListType === 'mistake' ? newMistake : newStuck;
    let targetList = targetListType === 'mistake' ? newMistake : newStuck;

    if (isCopy) {
      const sourceItem = sourceList[sourceIndex];
      const itemCopy = {
        ...sourceItem,
        id: crypto.randomUUID(),
        ayahs: sourceItem.ayahs.map(a => ({
          ...a,
          id: crypto.randomUUID()
        }))
      };

      if (targetListType === 'mistake') {
        if (targetIndex === undefined) {
          newMistake.push(itemCopy);
        } else {
          newMistake.splice(targetIndex, 0, itemCopy);
        }
        setMistakeData(newMistake);
      } else {
        if (targetIndex === undefined) {
          newStuck.push(itemCopy);
        } else {
          newStuck.splice(targetIndex, 0, itemCopy);
        }
        setStuckData(newStuck);
      }
    } else {
      if (sourceListType === targetListType && sourceIndex === targetIndex) {
        setDraggedItem(null);
        return;
      }

      const [item] = sourceList.splice(sourceIndex, 1);
      
      if (targetIndex === undefined) {
        targetList.push(item);
      } else {
        targetList.splice(targetIndex, 0, item);
      }

      if (sourceListType === 'mistake' || targetListType === 'mistake') {
        setMistakeData(newMistake);
      }
      if (sourceListType === 'stuck' || targetListType === 'stuck') {
        setStuckData(newStuck);
      }
    }
    
    setDraggedItem(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Card: Student, Session, Juz/Page */}
      <div className="theme-bg-surface rounded-2xl p-5 shadow-lg space-y-4 relative z-0 border theme-border">
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-4 border-t theme-border pt-4 mt-4">
          <label className="text-xs font-bold uppercase tracking-wider theme-text-secondary w-full sm:w-20 shrink-0">
            SESSION
          </label>
          <div className="flex-1 w-full min-w-0">
            <AutocompleteDropdown
              options={sessionOptions}
              value={selectedSession}
              onChange={(sel) => onSessionChange(typeof sel === "object" ? sel.label : sel)}
              onAddNew={onSaveSession}
              placeholder="Select session..."
            />
          </div>
        </div>

        {/* 3. Juz / Page Input Section */}
        <div className="pt-2 mt-7">
          <JuzPageInputSection 
            data={juzPageData}
            onChange={setJuzPageData}
          />
        </div>
      </div>

      {/* Bottom Card: Mistake and Stuck Details */}
      <div className="theme-bg-surface rounded-2xl p-5 shadow-lg relative z-0 border theme-border">
        {/* Header with Totals */}
        <div className="flex items-center justify-between border-b theme-border pb-5 mb-5">
          <div className="flex items-center gap-4 w-full">
            {/* MISTAKE BOX */}
            <div className="theme-bg-sub rounded-xl px-5 py-3.5 flex-1 flex flex-col items-center justify-center shadow-sm">
              <span className="text-[10px] font-bold theme-text-secondary tracking-wider">TOTAL MISTAKE</span>
              <span className="text-3xl font-bold theme-text-primary leading-none mt-1">{totalMistakes}</span>
            </div>
            
            {/* STUCK BOX */}
            <div className="theme-bg-sub rounded-xl px-5 py-3.5 flex-1 flex flex-col items-center justify-center shadow-sm">
              <span className="text-[10px] font-bold theme-text-secondary tracking-wider">TOTAL STUCK</span>
              <span className="text-3xl font-bold theme-text-primary leading-none mt-1">{totalStuck}</span>
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
        <div className="border-t theme-border pt-6 mt-6">
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