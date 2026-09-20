import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  RefreshIcon,
  SaveIcon,
  SavedMessagesIcon,
  CloseIcon,
  TrashIcon,
  SearchIcon,
  CheckIcon,
  EditIcon,
} from "./Icons";
import { useTemplateStore } from "../../hooks/useTemplateStore";
import { useToast } from "../../context/ToastContext";
import { useUndoRedo } from "../../context/useUndoRedo";

/**
 * Enterprise Reusable Template Action Toolbar
 * 
 * Provides interactive Clear, Save, and Saved Messages/Templates controls
 * for any text input, textarea, or comment/remark field across the application.
 */
export default function TemplateActionToolbar({
  value = "",
  onChange,
  category,
  namespace = "general",
  initialTemplates = [],
  mode = "append", // 'append' | 'replace'
  showClear = true,
  showSave = true,
  showSaved = true,
  showCount = true,
  showCountBadge,
  showSearch = false,
  searchable = false,
  showEdit = true,
  editable,
  showDelete = true,
  deletable,
  size = "sm", // 'xs' | 'sm' | 'md'
  dropdownTitle = "Saved Templates",
  className = "",
  dropdownPosition = "bottom-right", // 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'overlay'
  showOnFocusOnly = false, // When true, only visible when target input or container is clicked/focused
  active = undefined,      // Controlled visibility override
  onOpenChange,            // Callback when popover opens or closes
  targetInputId,           // Optional ID of specific input to listen to
  onClear,
  onSave,
  onPick,
}) {
  const { showToast } = useToast();
  let undoRedoCtx = null;
  try {
    undoRedoCtx = useUndoRedo();
  } catch {
    // Fallback if used outside provider
  }

  const resolvedCategory = category || namespace || "general";

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 320 });
  const [isFocusedScope, setIsFocusedScope] = useState(false);

  const containerRef = useRef(null);
  const triggerButtonRef = useRef(null);
  const popoverRef = useRef(null);

  const shouldShowCount = showCountBadge !== undefined ? Boolean(showCountBadge) : Boolean(showCount);
  const shouldShowSearch = searchable !== undefined ? Boolean(searchable) : Boolean(showSearch);
  const shouldAllowEdit = editable !== undefined ? Boolean(editable) : Boolean(showEdit);
  const shouldAllowDelete = deletable !== undefined ? Boolean(deletable) : Boolean(showDelete);

  const {
    templates,
    sortedTemplates,
    count,
    isAlreadySaved,
    addTemplate,
    restoreTemplate,
    updateTemplate,
    deleteTemplate,
    applyTemplate,
  } = useTemplateStore({
    category: resolvedCategory,
    namespace: resolvedCategory,
    initialTemplates,
  });

  // Calculate dynamic coordinates for portal popover with exact element dimensions
  const updateCoords = useCallback(() => {
    if (!triggerButtonRef.current) return;
    const triggerRect = triggerButtonRef.current.getBoundingClientRect();
    const popoverEl = popoverRef.current;
    
    // Use actual rendered popover height if mounted, otherwise use compact fallback
    const popoverHeight = popoverEl && popoverEl.offsetHeight > 0 ? popoverEl.offsetHeight : 180;
    const popoverWidth = Math.min(300, Math.max(260, window.innerWidth - 24));

    const spaceBelow = window.innerHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;

    // Flip upward if explicitly requested or if not enough space below and more space above
    const shouldFlipUp = dropdownPosition.startsWith("top") || (spaceBelow < popoverHeight + 10 && spaceAbove > spaceBelow);

    let top = shouldFlipUp
      ? Math.max(8, triggerRect.top - popoverHeight - 4)
      : Math.min(window.innerHeight - popoverHeight - 8, triggerRect.bottom + 4);

    // Align right edge of popover with right edge of trigger button
    let left = triggerRect.right - popoverWidth;
    if (dropdownPosition.endsWith("left")) {
      left = triggerRect.left;
    }

    // Constrain within horizontal viewport
    if (left < 10) {
      left = 10;
    } else if (left + popoverWidth > window.innerWidth - 10) {
      left = window.innerWidth - popoverWidth - 10;
    }

    setCoords({
      top: Math.round(top),
      left: Math.round(left),
      width: popoverWidth,
    });
  }, [dropdownPosition]);

  // Synchronously calculate before painting and refine on frame mount
  useLayoutEffect(() => {
    if (isOpen) {
      updateCoords();
      const raf = requestAnimationFrame(updateCoords);
      return () => cancelAnimationFrame(raf);
    }
  }, [isOpen, updateCoords]);

  // Listen for scroll & resize events in capturing phase and outside clicks
  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => {
      updateCoords();
    };

    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    const handleClickOutside = (e) => {
      if (
        triggerButtonRef.current &&
        !triggerButtonRef.current.contains(e.target) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target)
      ) {
        setIsOpen(false);
        setEditingItemId(null);
        setEditingText("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, updateCoords]);

  // Notify external listeners of open/close state changes
  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  // Reusable focus tracking: automatically detects clicks or focus in the associated input / container
  useEffect(() => {
    if (!showOnFocusOnly) return;
    const currentEl = containerRef.current;
    if (!currentEl) return;

    // Find the enclosing cell, form group, or scope container
    const scopeEl = targetInputId
      ? document.getElementById(targetInputId)
      : currentEl.closest("td") || currentEl.closest("[data-template-scope]") || currentEl.parentElement;

    if (!scopeEl) return;

    // Check initial focus state
    if (typeof document !== "undefined" && scopeEl.contains(document.activeElement)) {
      setIsFocusedScope(true);
    }

    const handleFocusIn = () => setIsFocusedScope(true);
    const handleFocusOut = (e) => {
      // Keep visible if focus remains within scope or on the toolbar trigger
      if (
        !scopeEl.contains(e.relatedTarget) &&
        (!triggerButtonRef.current || !triggerButtonRef.current.contains(e.relatedTarget))
      ) {
        setIsFocusedScope(false);
      }
    };

    scopeEl.addEventListener("focusin", handleFocusIn);
    scopeEl.addEventListener("focusout", handleFocusOut);
    return () => {
      scopeEl.removeEventListener("focusin", handleFocusIn);
      scopeEl.removeEventListener("focusout", handleFocusOut);
    };
  }, [showOnFocusOnly, targetInputId]);

  const isToolbarVisible = active !== undefined
    ? Boolean(active)
    : showOnFocusOnly
    ? Boolean(isOpen || isFocusedScope)
    : true;

  const handleToggle = (e) => {
    e.stopPropagation();
    if (!isOpen) {
      updateCoords();
    }
    setIsOpen((prev) => !prev);
  };

  // Clear action
  const handleClear = () => {
    if (onClear) {
      onClear();
    } else if (onChange) {
      const prev = value;
      if (!prev) return;
      onChange("");
      if (undoRedoCtx?.pushAction) {
        undoRedoCtx.pushAction({
          title: "Clear text",
          domain: "Input",
          scope: "global",
          undo: () => onChange(prev),
          redo: () => onChange(""),
        });
      }
      showToast("Text cleared. (Press Ctrl+Z to undo)", "info");
    }
  };

  // Save action
  const handleSave = async () => {
    const trimmed = (value || "").trim();
    if (!trimmed) return;

    if (onSave) {
      onSave(trimmed);
      return;
    }

    await addTemplate(trimmed);
  };

  // Pick template action
  const handlePick = (item) => {
    if (editingItemId) return;
    const text = typeof item === "object" && item !== null ? item.text : String(item);
    if (onPick) {
      onPick(item);
    } else if (onChange) {
      const prev = value;
      const updated = applyTemplate(item, value, mode);
      onChange(updated);
      if (undoRedoCtx?.pushAction) {
        const shortTxt = text.length > 20 ? text.slice(0, 18) + "..." : text;
        undoRedoCtx.pushAction({
          title: `Apply template: "${shortTxt}"`,
          domain: "Input",
          scope: "global",
          undo: () => onChange(prev),
          redo: () => onChange(updated),
        });
      }
      showToast("Template applied.", "info");
    }
    setIsOpen(false);
  };

  // Start edit template action
  const handleStartEdit = (e, item) => {
    e.stopPropagation();
    const text = typeof item === "object" && item !== null ? item.text : String(item);
    const itemId = typeof item === "object" && item !== null ? item.id : text;
    setEditingItemId(itemId);
    setEditingText(text);
  };

  // Cancel edit
  const handleCancelEdit = (e) => {
    if (e) e.stopPropagation();
    setEditingItemId(null);
    setEditingText("");
  };

  // Save edit
  const handleSaveEdit = async (e, item) => {
    if (e) e.stopPropagation();
    const trimmed = (editingText || "").trim();
    if (!trimmed) {
      showToast("Template text cannot be empty.", "warning");
      return;
    }
    await updateTemplate(item, trimmed);
    setEditingItemId(null);
    setEditingText("");
  };

  // Delete template action
  const handleDelete = async (e, item) => {
    e.stopPropagation();
    await deleteTemplate(item);
  };

  // Filter templates based on search query
  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return sortedTemplates;
    const q = searchQuery.toLowerCase().trim();
    return sortedTemplates.filter((item) => {
      const text = typeof item === "object" && item !== null ? item.text : String(item);
      return text.toLowerCase().includes(q);
    });
  }, [sortedTemplates, searchQuery]);

  // Size styling variants
  const sizeClasses = {
    xs: "p-1 rounded-lg text-xs",
    sm: "p-1.5 rounded-xl text-xs",
    md: "p-2 rounded-xl text-sm",
  };

  const iconSizes = {
    xs: "w-3.5 h-3.5",
    sm: "w-4 h-4",
    md: "w-4 h-4",
  };

  const currentSizeClass = sizeClasses[size] || sizeClasses.sm;
  const currentIconSize = iconSizes[size] || iconSizes.sm;

  // Determine whether to display the Save button
  const isSaveVisible = showSave && (value || "").trim().length > 0 && !isAlreadySaved(value);

  // Dropdown placement styling
  const positionClasses = {
    "bottom-right": "top-full right-0 mt-1.5",
    "bottom-left": "top-full left-0 mt-1.5",
    "top-right": "bottom-full right-0 mb-1.5",
    "top-left": "bottom-full left-0 mb-1.5",
    "overlay": "inset-0",
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center gap-1.5 transition-all duration-200 ${
        isToolbarVisible
          ? "opacity-100 pointer-events-auto max-h-8"
          : "opacity-0 pointer-events-none select-none max-h-0 overflow-hidden"
      } ${className}`}
    >
      {/* Clear Button */}
      {showClear && (value || "").length > 0 && (
        <button
          type="button"
          onClick={handleClear}
          className={`${currentSizeClass} theme-bg-sub border theme-border theme-text-secondary hover:theme-danger hover:theme-bg-elevated active:scale-95 transition-all cursor-pointer shadow-xs focus:outline-none focus:ring-1 focus:ring-[var(--accent-main)]/30`}
          title="Clear text"
          aria-label="Clear text"
        >
          <RefreshIcon className={currentIconSize} />
        </button>
      )}

      {/* Save Template Button */}
      {isSaveVisible && (
        <button
          type="button"
          onClick={handleSave}
          className={`${currentSizeClass} theme-bg-sub border theme-border theme-text-secondary hover:theme-accent hover:theme-bg-elevated active:scale-95 transition-all cursor-pointer shadow-xs animate-fade-in focus:outline-none focus:ring-1 focus:ring-[var(--accent-main)]/30`}
          title="Save as reusable template"
          aria-label="Save as template"
        >
          <SaveIcon className={currentIconSize} />
        </button>
      )}

      {/* Saved Messages / Templates Toggle Button */}
      {showSaved && (
        <button
          ref={triggerButtonRef}
          type="button"
          onClick={handleToggle}
          className={`${currentSizeClass} theme-bg-sub border theme-border theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer shadow-xs relative focus:outline-none focus:ring-1 focus:ring-[var(--accent-main)]/30 ${
            isOpen ? "theme-bg-elevated theme-text-primary border-[var(--accent-main)]/40" : ""
          }`}
          title="Browse Saved Templates"
          aria-label="Browse Saved Templates"
          aria-expanded={isOpen}
        >
          <SavedMessagesIcon className={currentIconSize} />
          {shouldShowCount && count > 0 && (
            <span className="text-[10px] font-bold font-mono px-1 py-0.2 rounded-full theme-bg-accent-soft theme-accent leading-none">
              {count}
            </span>
          )}
        </button>
      )}

      {/* Saved Templates Dropdown Popover (Rendered in Portal outside table/overflow boundaries) */}
      {isOpen && coords.top > 0 && typeof document !== "undefined" && createPortal(
        <div
          ref={popoverRef}
          style={{
            position: "fixed",
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            zIndex: 999999,
          }}
          className="max-h-[340px] theme-bg-surface border theme-border rounded-2xl p-3.5 flex flex-col space-y-2.5 shadow-2xl animate-fade-in"
          role="dialog"
          aria-label="Saved Templates List"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b theme-border pb-2 px-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
                {dropdownTitle}
              </span>
              <span className="theme-bg-accent-soft theme-accent text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                {count}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setEditingItemId(null);
              }}
              className="p-1 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition-colors cursor-pointer"
              title="Close"
              aria-label="Close"
            >
              <CloseIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Search bar when enabled and templates count >= 3 */}
          {shouldShowSearch && count >= 3 && (
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates..."
                className="w-full text-xs py-1.5 pl-7 pr-2.5 rounded-xl theme-bg-sub theme-text-primary border theme-border focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors placeholder:theme-text-secondary/60"
              />
              <SearchIcon className="w-3.5 h-3.5 absolute left-2 top-2.5 theme-text-secondary/60 pointer-events-none" />
            </div>
          )}

          {/* Template Items List */}
          <div className="flex-1 space-y-1.5 overflow-y-auto scrollbar-none no-scrollbar max-h-[220px] pr-0.5">
            {filteredTemplates.length > 0 ? (
              filteredTemplates.map((item, index) => {
                const text = typeof item === "object" && item !== null ? item.text : String(item);
                const itemId = typeof item === "object" && item !== null ? item.id : index;
                const isSelected = (value || "").includes(text);
                const isEditing = editingItemId === itemId || editingItemId === text;

                if (isEditing) {
                  return (
                    <div
                      key={itemId || index}
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 text-xs rounded-xl theme-bg-elevated border border-[var(--accent-main)]/40 shadow-xs flex flex-col gap-2 animate-fade-in"
                    >
                      <input
                        type="text"
                        autoFocus
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleSaveEdit(e, item);
                          } else if (e.key === "Escape") {
                            e.preventDefault();
                            handleCancelEdit(e);
                          }
                        }}
                        className="w-full text-xs py-1 px-2 rounded-lg theme-bg-sub theme-text-primary border theme-border focus:outline-none focus:border-[var(--accent-main)]"
                        placeholder="Edit template..."
                      />
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={(e) => handleCancelEdit(e)}
                          className="p-1 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition cursor-pointer"
                          title="Cancel"
                          aria-label="Cancel"
                        >
                          <CloseIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleSaveEdit(e, item)}
                          className="p-1 rounded-lg theme-bg-accent theme-accent-text hover:opacity-90 transition cursor-pointer shadow-xs"
                          title="Save"
                          aria-label="Save"
                        >
                          <CheckIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={itemId || index}
                    onClick={() => handlePick(item)}
                    className={`px-3 py-2 text-xs rounded-xl cursor-pointer transition-all flex items-start justify-between gap-2 group border ${
                      isSelected
                        ? "theme-bg-accent-soft theme-accent border-[var(--accent-main)]/30 font-medium"
                        : "theme-bg-sub hover:theme-bg-elevated theme-text-primary border-transparent hover:border-border"
                    }`}
                    title={text}
                  >
                    <span className="flex-1 font-normal break-words leading-relaxed whitespace-pre-wrap line-clamp-3">
                      {text}
                    </span>
                    {(shouldAllowEdit || shouldAllowDelete) && (
                      <div className="flex items-center gap-0.5 shrink-0 mt-0.5 opacity-40 group-hover:opacity-100 transition-opacity">
                        {shouldAllowEdit && (
                          <button
                            type="button"
                            onClick={(e) => handleStartEdit(e, item)}
                            className="p-1 rounded-lg theme-text-secondary hover:theme-accent transition-colors cursor-pointer hover:theme-bg-sub"
                            title="Edit template"
                            aria-label="Edit template"
                          >
                            <EditIcon className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {shouldAllowDelete && (
                          <button
                            type="button"
                            onClick={(e) => handleDelete(e, item)}
                            className="p-1 rounded-lg theme-text-secondary hover:theme-danger transition-colors cursor-pointer hover:theme-bg-sub"
                            title="Delete template"
                            aria-label="Delete template"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="py-6 flex flex-col items-center justify-center text-center theme-text-secondary text-xs select-none gap-1">
                {searchQuery.trim() ? (
                  <span>No matching templates found.</span>
                ) : (
                  <>
                    <span>No saved templates yet.</span>
                    <span className="text-[11px] opacity-70">
                      Type something and click the save button to add one.
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
