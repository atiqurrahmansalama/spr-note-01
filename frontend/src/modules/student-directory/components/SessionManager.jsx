import { useState, useEffect } from "react";
import { fetchWithAuth } from "../../../utils/authService";
import { useToast } from "../../../context/ToastContext";
import { 
  sessions as sessionStore, 
  savedComments as commentStore, 
  isOnline, 
  mergeSessions 
} from "../../../utils/localStore";
import { SessionsIcon, ChatIcon, TrashIcon, CopyIcon, EditIcon } from "../../../components/ui/Icons";
import { syncSessionsAndComments } from "../../../utils/syncEngine";

export default function SessionManager() {
  const { showToast } = useToast();

  const [sessions, setSessions] = useState([]);
  const [newSessionName, setNewSessionName] = useState("");
  const [sessionSearch, setSessionSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Saved comments state
  const [comments, setComments] = useState(() => commentStore.getAll());
  const [newCommentText, setNewCommentText] = useState("");
  const [commentSearch, setCommentSearch] = useState("");

  const [offline, setOffline] = useState(!isOnline());

  // Editing states
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editSessionNameInput, setEditSessionNameInput] = useState("");
  const [editingCommentIndex, setEditingCommentIndex] = useState(null);
  const [editCommentTextInput, setEditCommentTextInput] = useState("");

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setOffline(false);
      loadSessionsAndComments();
    };
    const handleOffline = () => setOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save comment list changes locally
  useEffect(() => {
    commentStore.saveAll(comments);
  }, [comments]);

  // Load Sessions and Comments
  const loadSessionsAndComments = async () => {
    const cached = sessionStore.getAll();
    if (cached.length > 0) {
      setSessions(cached);
    }
    const cachedComments = commentStore.getAll();
    if (cachedComments.length > 0) {
      setComments(cachedComments);
    }

    if (!isOnline()) return;

    try {
      // Sync local changes to backend first
      await syncSessionsAndComments();

      // Load sessions
      const res = await fetchWithAuth("/sessions/");
      if (res.ok) {
        const apiData = await res.json();
        const formattedApi = (Array.isArray(apiData) ? apiData : []).map((s, idx) => ({
          id: typeof s === "object" ? (s.id || `api-${idx}`) : `api-${idx}`,
          name: typeof s === "object" ? (s.name || s.session_name || s.label || String(s)) : String(s),
        }));

        const localData = sessionStore.getAll();
        const merged = mergeSessions(formattedApi, localData);
        setSessions(merged);
      }

      // Load comments
      const commentsRes = await fetchWithAuth("/messages/");
      if (commentsRes.ok) {
        const rawMessages = await commentsRes.json();
        const apiComments = (Array.isArray(rawMessages) ? rawMessages : [])
          .map((m) => (typeof m === "object" ? (m.text || m.comment) : String(m)))
          .filter(Boolean);
        const localComments = commentStore.getAll();
        const mergedComments = Array.from(new Set([...apiComments, ...localComments]));
        setComments(mergedComments);
        commentStore.saveAll(mergedComments);
      }
    } catch (err) {
      console.warn("[SessionManager] API fetch failed, using cache:", err.message);
    }
  };

  useEffect(() => {
    loadSessionsAndComments();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle Add Session
  const handleAddSession = async (e) => {
    if (e) e.preventDefault();
    const trimmedName = newSessionName.trim();
    if (!trimmedName) {
      showToast("Session name cannot be empty!", "warning");
      return;
    }

    setIsSubmitting(true);

    const { updated, newSession } = sessionStore.add(trimmedName);
    if (!newSession) {
      showToast(`Session "${trimmedName}" already exists!`, "warning");
      setIsSubmitting(false);
      return;
    }
    setSessions(updated);
    setNewSessionName("");
    showToast(`Session "${trimmedName}" saved!`, "success");

    if (isOnline()) {
      try {
        const res = await fetchWithAuth("/sessions/", {
          method: "POST",
          body: JSON.stringify({ name: trimmedName }),
        });

        if (res.ok) {
          await loadSessionsAndComments();
        }
      } catch (err) {
        console.warn("[SessionManager] Online save error:", err.message);
      }
    }

    setIsSubmitting(false);
  };

  // Start edit session
  const startEditSession = (session) => {
    setEditingSessionId(session.id);
    setEditSessionNameInput(session.name);
  };

  // Save edited session
  const handleSaveEditSession = async (session) => {
    const trimmed = editSessionNameInput.trim();
    if (!trimmed) {
      showToast("Session name cannot be empty!", "error");
      return;
    }

    const currentSessions = sessionStore.getAll();
    const updated = currentSessions.map((s) => 
      s.id === session.id ? { ...s, name: trimmed, _local: true } : s
    );
    setSessions(updated);
    setEditingSessionId(null);
    showToast(`Updated session to "${trimmed}" locally`, "success");

    if (isOnline() && session.id && !String(session.id).startsWith("local-")) {
      try {
        const res = await fetchWithAuth(`/sessions/${session.id}/`, {
          method: "PATCH",
          body: JSON.stringify({ name: trimmed }),
        });
        if (res.ok) {
          showToast("Session synced with database!", "success");
          await loadSessionsAndComments();
        }
      } catch (err) {
        console.warn("Failed to sync edited session:", err.message);
      }
    }
  };

  // Handle Delete Session
  const handleDeleteSession = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete session "${name}"?`)) {
      return;
    }

    const updated = sessionStore.remove(id);
    setSessions(updated);
    window.dispatchEvent(new CustomEvent("spr_session_updated"));
    window.dispatchEvent(new CustomEvent("spr_project_changed"));

    if (isOnline() && id && !String(id).startsWith("local-")) {
      try {
        const res = await fetchWithAuth(`/sessions/${id}/`, {
          method: "DELETE",
        });

        if (res.ok || res.status === 204) {
          showToast(`Session "${name}" deleted from database!`, "success");
        } else {
          showToast(`"${name}" removed locally.`, "info");
        }
      } catch {
        showToast(`"${name}" removed locally (offline).`, "info");
      }
    } else {
      showToast(`Session "${name}" deleted!`, "success");
    }
  };

  // Handle Add Saved Comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    const trimmed = newCommentText.trim();
    if (!trimmed) {
      showToast("Comment template text cannot be empty", "warning");
      return;
    }

    if (comments.includes(trimmed)) {
      showToast("Comment template already exists!", "warning");
      return;
    }

    const updated = commentStore.add(trimmed);
    setComments(updated);
    setNewCommentText("");
    showToast("New comment template saved!", "success");

    if (isOnline()) {
      try {
        await fetchWithAuth("/messages/", {
          method: "POST",
          body: JSON.stringify({ text: trimmed }),
        });
      } catch (err) {
        console.warn("[SessionManager] Online comment save error:", err.message);
      }
    }
  };

  // Start edit comment template
  const startEditComment = (index, text) => {
    setEditingCommentIndex(index);
    setEditCommentTextInput(text);
  };

  // Save edited comment template
  const handleSaveEditComment = async (index, oldText) => {
    const trimmed = editCommentTextInput.trim();
    if (!trimmed) {
      showToast("Comment template text cannot be empty!", "error");
      return;
    }

    const currentComments = commentStore.getAll();
    const updated = currentComments.map((c, i) => i === index ? trimmed : c);
    setComments(updated);
    setEditingCommentIndex(null);
    showToast("Comment template updated locally!", "success");

    if (isOnline()) {
      try {
        const res = await fetchWithAuth("/messages/");
        if (res.ok) {
          const rawMessages = await res.json();
          const serverMsg = rawMessages.find(m => 
            (typeof m === "object" ? (m.text || m.comment) : String(m)) === oldText
          );
          if (serverMsg && serverMsg.id) {
            await fetchWithAuth(`/messages/${serverMsg.id}/`, {
              method: "PATCH",
              body: JSON.stringify({ text: trimmed }),
            });
            showToast("Comment template synced with database!", "success");
            await loadSessionsAndComments();
          }
        }
      } catch (err) {
        console.warn("Failed to sync edited comment:", err.message);
      }
    }
  };

  // Handle Delete Comment
  const handleDeleteComment = async (index, commentText) => {
    if (!window.confirm(`Are you sure you want to delete comment template "${commentText}"?`)) {
      return;
    }

    const updated = commentStore.remove(index);
    setComments(updated);
    showToast("Comment template deleted", "info");

    if (isOnline()) {
      try {
        const res = await fetchWithAuth("/messages/");
        if (res.ok) {
          const rawMessages = await res.json();
          const serverMsg = rawMessages.find(m => 
            (typeof m === "object" ? (m.text || m.comment) : String(m)) === commentText
          );
          if (serverMsg && serverMsg.id) {
            await fetchWithAuth(`/messages/${serverMsg.id}/`, {
              method: "DELETE",
            });
          }
        }
      } catch (err) {
        console.warn("Failed to delete comment from server:", err.message);
      }
    }
  };

  // Filtered and sorted Sessions (A-Z)
  const filteredSessions = sessions
    .filter((s) => (s.name || "").toLowerCase().includes(sessionSearch.toLowerCase()))
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  // Filtered and sorted Comments (A-Z)
  const filteredComments = comments
    .filter((c) => (c || "").toLowerCase().includes(commentSearch.toLowerCase()))
    .sort((a, b) => (a || "").localeCompare(b || ""));

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5 theme-text-primary animate-fade-in flex flex-col items-center justify-start py-4 px-3 sm:px-6">
      
      {/* Unified Main Presets & Templates Card */}
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-5 shadow-xl space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b theme-border">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 theme-bg-accent-soft rounded-xl theme-accent shrink-0">
              <SessionsIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold theme-text-primary tracking-tight">
                Presets & Configurations
              </h2>
              <p className="text-[11px] theme-text-secondary mt-0.5">
                Configure report sessions presets and customize reusable template shortcuts.
              </p>
            </div>
          </div>
        </div>

        {/* Offline Alert Badge */}
        {offline && (
          <div className="w-full flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <span>Offline mode active — changes will be saved locally and synced later.</span>
          </div>
        )}

        {/* Dual Column Layout (Sessions on Left, Comments on Right) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* COLUMN 1: SESSIONS */}
          <div className="space-y-4 pr-0 md:pr-3 md:border-r theme-border">
            <div className="flex items-center justify-between border-b theme-border pb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider theme-text-secondary flex items-center gap-2">
                <SessionsIcon className="w-4 h-4 theme-accent" />
                <span>Sessions Preset</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md theme-bg-app theme-accent font-semibold">
                {filteredSessions.length} sessions
              </span>
            </div>

            {/* Add Session Form */}
            <form onSubmit={handleAddSession} className="flex gap-2">
              <input
                type="text"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                placeholder="Enter session name (e.g. Sabaq, Hifz)..."
                className="flex-1 theme-bg-sub border theme-border theme-text-primary text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="theme-bg-accent hover:opacity-90 disabled:opacity-50 theme-accent-text text-xs px-3.5 py-2 rounded-xl font-semibold transition shrink-0 cursor-pointer"
              >
                Add
              </button>
            </form>

            {/* Session Search */}
            <input
              type="text"
              value={sessionSearch}
              onChange={(e) => setSessionSearch(e.target.value)}
              placeholder="Search sessions..."
              className="w-full theme-bg-sub border theme-border theme-text-primary px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-[var(--accent-main)]/50"
            />

            {/* Sessions List */}
            <div className="max-h-72 overflow-y-auto pr-1 space-y-2" style={{ scrollbarGutter: "stable" }}>
              {filteredSessions.length === 0 ? (
                <p className="text-[11px] theme-text-secondary italic text-center py-6">
                  No sessions found.
                </p>
              ) : (
                filteredSessions.map((s) => {
                  const isEditing = editingSessionId === s.id;
                  
                  if (isEditing) {
                    return (
                      <div key={s.id || s.name} className="theme-bg-sub border theme-border rounded-xl p-3 space-y-2 shadow-sm animate-fade-in">
                        <input
                          type="text"
                          value={editSessionNameInput}
                          onChange={(e) => setEditSessionNameInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEditSession(s); }}
                          autoFocus
                          className="w-full theme-bg-app border theme-border theme-text-primary px-2.5 py-1 rounded-md text-xs focus:outline-none"
                        />
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingSessionId(null)}
                            className="px-2 py-0.5 text-[10px] font-semibold theme-text-secondary hover:theme-text-primary"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEditSession(s)}
                            className="px-2.5 py-0.5 text-[10px] font-semibold theme-accent-text theme-bg-accent rounded-md"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={s.id || s.name}
                      className="theme-bg-sub border theme-border rounded-xl px-3 py-2 flex items-center justify-between gap-3 hover:theme-bg-elevated transition group select-none cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {s._local && (
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"
                            title="Pending sync"
                          />
                        )}
                        <span className="text-xs font-semibold theme-text-primary truncate">
                          {s.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => startEditSession(s)}
                          className="p-1 text-xs theme-text-secondary hover:theme-accent rounded-lg hover:theme-bg-surface transition shrink-0"
                          title="Edit"
                        >
                          <EditIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSession(s.id || s.name, s.name)}
                          className="p-1 text-xs theme-text-secondary hover:text-rose-400 transition rounded-lg hover:theme-bg-surface shrink-0"
                          title="Delete"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* COLUMN 2: COMMENT TEMPLATES */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b theme-border pb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider theme-text-secondary flex items-center gap-2">
                <ChatIcon className="w-4 h-4 theme-accent" />
                <span>Comments Templates</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md theme-bg-app theme-accent font-semibold">
                {filteredComments.length} templates
              </span>
            </div>

            {/* Add Comment Form */}
            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                type="text"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Enter comment template text..."
                className="flex-1 theme-bg-sub border theme-border theme-text-primary text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
              />
              <button
                type="submit"
                className="theme-bg-accent hover:opacity-90 theme-accent-text text-xs px-3.5 py-2 rounded-xl font-semibold transition shrink-0 cursor-pointer"
              >
                Add
              </button>
            </form>

            {/* Comment Search */}
            <input
              type="text"
              value={commentSearch}
              onChange={(e) => setSessionSearch(e.target.value)}
              placeholder="Search templates..."
              className="w-full theme-bg-sub border theme-border theme-text-primary px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-[var(--accent-main)]/50"
            />

            {/* Comments List */}
            <div className="max-h-72 overflow-y-auto pr-1 space-y-2" style={{ scrollbarGutter: "stable" }}>
              {filteredComments.length === 0 ? (
                <p className="text-[11px] theme-text-secondary italic text-center py-6">
                  No comment templates found.
                </p>
              ) : (
                filteredComments.map((cmt, idx) => {
                  const isEditing = editingCommentIndex === idx;

                  if (isEditing) {
                    return (
                      <div key={idx} className="theme-bg-sub border theme-border rounded-xl p-3 space-y-2 shadow-sm animate-fade-in">
                        <textarea
                          value={editCommentTextInput}
                          onChange={(e) => setEditCommentTextInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSaveEditComment(idx, cmt);
                            }
                          }}
                          autoFocus
                          className="w-full h-16 p-2 rounded-xl theme-bg-app border theme-border theme-text-primary text-xs resize-none focus:outline-none"
                        />
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingCommentIndex(null)}
                            className="px-2 py-0.5 text-[10px] font-semibold theme-text-secondary hover:theme-text-primary"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEditComment(idx, cmt)}
                            className="px-2.5 py-0.5 text-[10px] font-semibold theme-accent-text theme-bg-accent rounded-md"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={idx}
                      className="theme-bg-sub border theme-border rounded-xl px-3 py-2.5 flex items-center justify-between gap-3 hover:theme-bg-elevated transition group select-none cursor-pointer"
                    >
                      <span className="text-xs theme-text-primary font-medium flex-1 truncate">
                        "{cmt}"
                      </span>

                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(cmt);
                            showToast("Comment template copied!", "info");
                          }}
                          className="p-1 text-xs theme-text-secondary hover:theme-accent rounded-lg hover:theme-bg-surface transition"
                          title="Copy"
                        >
                          <CopyIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => startEditComment(idx, cmt)}
                          className="p-1 text-xs theme-text-secondary hover:theme-accent rounded-lg hover:theme-bg-surface transition"
                          title="Edit"
                        >
                          <EditIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(idx, cmt)}
                          className="p-1 text-xs theme-text-secondary hover:text-rose-400 rounded-lg hover:theme-bg-surface transition"
                          title="Delete"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}