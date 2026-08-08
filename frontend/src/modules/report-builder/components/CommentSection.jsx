import { useState, useRef, useEffect } from "react";
import { RefreshIcon, SaveIcon, SavedMessagesIcon, CloseIcon, EditIcon } from "../../../components/ui/Icons";
import { fetchWithAuth } from "../../../utils/authService";
import { isOnline } from "../../../utils/localStore";

export default function CommentSection({
  comment = "",
  setComment,
  savedComments = [],
  setSavedComments,
  onAddToRecord,
  onMakeReport,
  showActions = true,
  isEditMode = false,
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

  const handleSaveComment = async () => {
    const trimmed = comment.trim();
    if (trimmed && !savedComments.includes(trimmed)) {
      setSavedComments((prev) => [...prev, trimmed]);

      if (isOnline()) {
        try {
          await fetchWithAuth("/messages/", {
            method: "POST",
            body: JSON.stringify({ text: trimmed }),
          });
        } catch (err) {
          console.warn("[CommentSection] Failed to sync saved comment with server:", err.message);
        }
      }
    }
  };

  const handleClearComment = () => {
    setComment("");
  };

  return (
    <div className="space-y-4">
      <div ref={containerRef} className="theme-bg-surface rounded-2xl p-5 shadow-lg relative z-0 space-y-3 border theme-border">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider theme-text-secondary flex items-center gap-2">
            Comments
          </h3>

          <div className="flex items-center gap-2">
            {comment.length > 0 && (
              <button
                type="button"
                onClick={handleClearComment}
                className="p-1 rounded-md theme-text-secondary hover:theme-danger hover:theme-bg-sub transition-colors group cursor-pointer"
                title="Clear comment text"
              >
                <RefreshIcon className="w-4 h-4" />
              </button>
            )}

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

            <button
              type="button"
              onClick={() => setIsSavedDropdownOpen((prev) => !prev)}
              className="p-1.5 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition-colors flex items-center justify-center cursor-pointer"
              title="Saved Messages"
            >
              <SavedMessagesIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

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
            className="w-full h-36 p-3.5 rounded-xl theme-bg-sub theme-text-primary text-sm border theme-border focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors resize-none placeholder:theme-text-secondary placeholder:opacity-60 font-normal leading-relaxed"
            placeholder="Enter comment..."
          />

          {isSavedDropdownOpen && (
            <div className="absolute inset-0 theme-bg-sub border theme-border rounded-xl z-20 p-3 flex flex-col space-y-2">
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
                  className="p-1 rounded-md theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition-colors cursor-pointer"
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
                        setComment((prev) => {
                          if (!prev.trim()) return msg;
                          return `${prev}\n${msg}`;
                        });
                        setIsSavedDropdownOpen(false);
                      }}
                      className="px-3.5 py-2.5 text-xs theme-text-primary theme-bg-surface hover:theme-bg-elevated border theme-border rounded-lg cursor-pointer transition-colors flex items-center justify-between gap-2"
                      title={msg}
                    >
                      <span className="truncate flex-1 font-medium">{msg}</span>
                    </div>
                  ))
                ) : (
                  <div
                    onClick={() => setIsSavedDropdownOpen(false)}
                    className="h-full flex flex-col items-center justify-center theme-text-secondary text-xs py-4 cursor-pointer hover:theme-text-primary transition-colors select-none gap-1"
                  >
                    <span>No saved messages yet.</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showActions && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 pt-1">
          <button
            type="button"
            onClick={onAddToRecord}
            className={`flex-1 font-bold py-3 sm:py-3.5 px-4 rounded-2xl shadow-lg transition-all text-sm text-center cursor-pointer flex items-center justify-center gap-2 ${
              isEditMode
                ? "bg-amber-500 hover:bg-amber-600 text-white border border-amber-400/40 shadow-amber-500/20 active:scale-[0.99]"
                : "theme-bg-elevated hover:theme-bg-sub theme-text-primary border theme-border shadow-md font-semibold"
            }`}
          >
            {isEditMode ? (
              <>
                <EditIcon className="w-4 h-4 text-white shrink-0" />
                <span>Confirm Edit</span>
              </>
            ) : (
              "Add to Record"
            )}
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
      )}
    </div>
  );
}
