import { useState, useRef, useEffect } from "react";
import { RefreshIcon, SaveIcon, SavedMessagesIcon, TrashIcon, CloseIcon } from "../ui/Icons";

export default function CommentSection({
  comment = "",
  setComment,
  savedComments = [],
  setSavedComments,
  onAddToRecord,
  onMakeReport,
}) {
  const [isSavedDropdownOpen, setIsSavedDropdownOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsSavedDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSaveComment = () => {
    const trimmed = comment.trim();
    if (trimmed && !savedComments.includes(trimmed)) {
      setSavedComments((prev) => [...prev, trimmed]);
    }
  };

  const handleRemoveSavedComment = (e, index) => {
    e.stopPropagation();
    setSavedComments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearComment = () => {
    setComment("");
  };

  return (
    <div className="space-y-4">
      {/* Message Card */}
      <div ref={containerRef} className="theme-bg-surface rounded-2xl p-5 shadow-lg relative z-0 space-y-3 border theme-border">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider theme-text-secondary flex items-center gap-2">
            Comments
          </h3>

          <div className="flex items-center gap-2">
            {/* Refresh/Clear Icon Button - Shown when textarea has content */}
            {comment.length > 0 && (
              <button
                type="button"
                onClick={handleClearComment}
                className="p-1 rounded-md theme-text-secondary hover:text-red-500 hover:theme-bg-sub transition-colors group cursor-pointer"
                title="Clear comment text"
              >
                <RefreshIcon className="w-4 h-4 text-inherit group-hover:text-red-500 transition-colors" />
              </button>
            )}

            {/* Save Icon Button - Shown only when new text is typed */}
            {comment.trim().length > 0 && (
              <button
                type="button"
                onClick={handleSaveComment}
                className="p-1 rounded-md theme-text-secondary hover:theme-accent hover:theme-bg-sub transition-colors"
                title="Save to templates"
              >
                <SaveIcon className="w-4 h-4" />
              </button>
            )}

            {/* Saved Messages Dropdown Icon Button */}
            <button
              type="button"
              onClick={() => setIsSavedDropdownOpen((prev) => !prev)}
              className="relative p-1 rounded-md theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition-colors flex items-center justify-center"
              title="Saved Messages"
            >
              <SavedMessagesIcon className="w-4 h-4" />
              {savedComments.length > 0 && (
                <span className="absolute -top-1 -right-1 theme-bg-accent theme-accent-text text-[9px] font-bold px-1 rounded-full min-w-[14px] text-center leading-none py-0.5">
                  {savedComments.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Comment Input Container & Overlay */}
        <div className="relative">
          <textarea
            id="comment-textarea"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => {
              const isCmdOrCtrl = e.metaKey || e.ctrlKey;
              if (isCmdOrCtrl && e.key.toLowerCase() === "s") {
                e.preventDefault();
                if (onMakeReport) onMakeReport();
              } else if (e.altKey && e.key.toLowerCase() === "s") {
                e.preventDefault();
                if (onAddToRecord) onAddToRecord();
              } else if (isCmdOrCtrl && e.key === "Enter") {
                e.preventDefault();
                if (onAddToRecord) onAddToRecord();
              }
            }}
            className="w-full h-36 p-3 rounded-xl theme-bg-sub theme-text-primary text-sm border theme-border focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors resize-none placeholder:theme-text-secondary placeholder:opacity-60"
            placeholder="Enter comment... (Ctrl+S to Make Report, Alt+S or Ctrl+Enter to Add to Record)"
          />

          {/* Saved Messages Dropdown Overlay */}
          {isSavedDropdownOpen && (
            <div className="absolute inset-0 theme-bg-sub border theme-border rounded-xl shadow-2xl z-20 p-3 flex flex-col space-y-2">
              <div className="flex items-center justify-between border-b theme-border pb-2 px-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
                    Saved Templates
                  </span>
                  <span className="theme-bg-accent-soft theme-accent text-[10px] font-semibold px-2 py-0.5 rounded-full font-mono">
                    {savedComments.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSavedDropdownOpen(false)}
                  className="p-1 rounded-md theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition-colors"
                  title="Close templates"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 space-y-1.5 overflow-y-auto pr-0.5">
                {savedComments.length > 0 ? (
                  savedComments.map((msg, index) => (
                    <div
                      key={index}
                      onClick={() => {
                        setComment(msg);
                        setIsSavedDropdownOpen(false);
                      }}
                      className="px-3 py-2 text-xs theme-text-primary theme-bg-surface hover:theme-bg-elevated border theme-border rounded-lg cursor-pointer transition-colors flex items-center justify-between group gap-2"
                      title={msg}
                    >
                      <span className="truncate flex-1">{msg}</span>
                      <button
                        type="button"
                        onClick={(e) => handleRemoveSavedComment(e, index)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:theme-bg-elevated rounded transition-all shrink-0"
                        title="Delete saved message"
                      >
                        <TrashIcon className="w-3.5 h-3.5 theme-text-secondary hover:text-red-400" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div
                    onClick={() => setIsSavedDropdownOpen(false)}
                    className="h-full flex flex-col items-center justify-center theme-text-secondary text-xs py-4 cursor-pointer hover:theme-text-primary transition-colors select-none gap-1"
                  >
                    <span>No saved messages yet.</span>
                    <span className="theme-accent hover:underline font-medium text-[11px]">
                      Click to add
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons Below Message Card */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 pt-1">
        <button
          type="button"
          onClick={onAddToRecord}
          className="flex-1 theme-bg-elevated hover:theme-bg-sub theme-text-primary font-semibold py-3 sm:py-3.5 px-4 rounded-2xl shadow-md transition text-sm text-center cursor-pointer border theme-border"
        >
          Add to Record
        </button>

        <button
          type="button"
          data-shortcut="make-report"
          onClick={onMakeReport}
          className="flex-1 theme-bg-accent hover:opacity-90 theme-accent-text font-bold py-3 sm:py-3.5 px-4 rounded-2xl shadow-lg transition text-sm text-center cursor-pointer"
        >
          Make Report
        </button>
      </div>
    </div>
  );
}
