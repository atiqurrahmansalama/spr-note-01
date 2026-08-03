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
      <div ref={containerRef} className="bg-[#212327] rounded-2xl p-5 shadow-lg relative z-0 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            Comments
          </h3>

          <div className="flex items-center gap-2">
            {/* Refresh/Clear Icon Button - Shown when textarea has content */}
            {comment.length > 0 && (
              <button
                type="button"
                onClick={handleClearComment}
                className="p-1 rounded-md text-slate-500 hover:text-red-400 hover:bg-slate-800/50 transition-colors"
                title="Clear comment text"
              >
                <RefreshIcon className="w-4 h-4" />
              </button>
            )}

            {/* Save Icon Button - Shown only when new text is typed */}
            {comment.trim().length > 0 && (
              <button
                type="button"
                onClick={handleSaveComment}
                className="p-1 rounded-md text-slate-500 hover:text-indigo-400 hover:bg-slate-800/50 transition-colors"
                title="Save to templates"
              >
                <SaveIcon className="w-4 h-4" />
              </button>
            )}

            {/* Saved Messages Dropdown Icon Button */}
            <button
              type="button"
              onClick={() => setIsSavedDropdownOpen((prev) => !prev)}
              className="relative p-1 rounded-md text-slate-500 hover:text-slate-200 hover:bg-slate-800/50 transition-colors flex items-center justify-center"
              title="Saved Messages"
            >
              <SavedMessagesIcon className="w-4 h-4" />
              {savedComments.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[9px] font-bold px-1 rounded-full min-w-[14px] text-center leading-none py-0.5">
                  {savedComments.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Comment Input Container & Overlay */}
        <div className="relative">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full h-36 p-3 rounded-xl bg-[#17181a] text-slate-100 text-sm border border-slate-800 focus:outline-none focus:border-indigo-500/80 transition-colors resize-none placeholder-slate-600"
            placeholder="Enter comment..."
          />

          {/* Saved Messages Dropdown Overlay */}
          {isSavedDropdownOpen && (
            <div className="absolute inset-0 bg-[#17181a] border border-slate-700/80 rounded-xl shadow-2xl z-20 p-3 flex flex-col space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 px-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Saved Templates
                  </span>
                  <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-semibold px-2 py-0.5 rounded-full font-mono">
                    {savedComments.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSavedDropdownOpen(false)}
                  className="p-1 rounded-md text-slate-500 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"
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
                      className="px-3 py-2 text-xs text-slate-200 bg-[#212327]/60 hover:bg-indigo-600/20 hover:text-indigo-200 border border-slate-800 hover:border-indigo-500/30 rounded-lg cursor-pointer transition-colors flex items-center justify-between group gap-2"
                      title={msg}
                    >
                      <span className="truncate flex-1 font-serif">{msg}</span>
                      <button
                        type="button"
                        onClick={(e) => handleRemoveSavedComment(e, index)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-700/80 rounded transition-all shrink-0"
                        title="Delete saved message"
                      >
                        <TrashIcon className="w-3.5 h-3.5 text-slate-500 hover:text-red-400" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div
                    onClick={() => setIsSavedDropdownOpen(false)}
                    className="h-full flex flex-col items-center justify-center text-slate-500 text-xs py-4 cursor-pointer hover:text-slate-300 transition-colors select-none gap-1"
                  >
                    <span>No saved messages yet.</span>
                    <span className="text-indigo-400 hover:text-indigo-300 underline font-medium text-[11px]">
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
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={onAddToRecord}
          className="flex-1 bg-[#2c2d31] hover:bg-[#34353a] text-slate-200 font-semibold py-3.5 px-4 rounded-2xl shadow-lg transition text-sm text-center cursor-pointer border border-slate-700/40"
        >
          Add to Record
        </button>

        <button
          type="button"
          onClick={onMakeReport}
          className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3.5 px-4 rounded-2xl shadow-lg transition text-sm text-center cursor-pointer shadow-indigo-600/20"
        >
          Make Report
        </button>
      </div>
    </div>
  );
}
