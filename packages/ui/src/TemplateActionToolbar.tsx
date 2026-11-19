import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  RefreshIcon,
  SaveIcon,
  SavedMessagesIcon,
  TrashIcon,
  SearchIcon,
} from "./Icons";
import { useTemplateStore } from "./hooks/useTemplateStore";
import { useToast } from "./context/ToastContext";
import { useUndoRedo } from "./context/useUndoRedo";
import IconButton from "./IconButton";
import ActionMenu from "./ActionMenu";

export interface TemplateActionToolbarProps {
  value?: string;
  onChange?: (val: string) => void;
  category?: string;
  namespace?: string;
  initialTemplates?: string[];
  mode?: "append" | "replace";
  showClear?: boolean;
  showSave?: boolean;
  showSaved?: boolean;
  showCount?: boolean;
  showCountBadge?: boolean;
  showSearch?: boolean;
  searchable?: boolean;
  showEdit?: boolean;
  editable?: boolean;
  showDelete?: boolean;
  deletable?: boolean;
  size?: "xs" | "sm" | "md";
  dropdownTitle?: string;
  className?: string;
  dropdownPosition?: "bottom-right" | "bottom-left" | "top-right" | "top-left" | "overlay";
  showOnFocusOnly?: boolean;
  active?: boolean;
  targetInputId?: string;
  onClear?: () => void;
  onSave?: (text: string) => void;
  onPick?: (item: any) => void;
  [key: string]: any;
}

/**
 * Enterprise Reusable Template Action Toolbar
 * 
 * Powered by ActionMenu (Project Menu Standard).
 * Provides interactive Clear, Save, and Saved Messages/Templates controls
 * for any text input, textarea, or comment/remark field across the application.
 */
export default function TemplateActionToolbar({
  value = "",
  onChange,
  category,
  namespace = "general",
  initialTemplates = [],
  mode = "append",
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
  size = "sm",
  dropdownTitle = "Saved Templates",
  className = "",
  dropdownPosition = "bottom-right",
  showOnFocusOnly = false,
  active = undefined,
  targetInputId,
  onClear,
  onSave,
  onPick,
}: TemplateActionToolbarProps) {
  const { showToast } = useToast() as any;
  let undoRedoCtx: any = null;
  try {
    undoRedoCtx = useUndoRedo();
  } catch {
    // Fallback if used outside provider
  }

  const resolvedCategory = category || namespace || "general";

  const [searchQuery, setSearchQuery] = useState("");
  const [isFocusedScope, setIsFocusedScope] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const shouldShowCount = showCountBadge !== undefined ? Boolean(showCountBadge) : Boolean(showCount);
  const shouldShowSearch = searchable !== undefined ? Boolean(searchable) : Boolean(showSearch);
  const shouldAllowDelete = deletable !== undefined ? Boolean(deletable) : Boolean(showDelete);

  const {
    sortedTemplates,
    count,
    isAlreadySaved,
    addTemplate,
    deleteTemplate,
    applyTemplate,
  } = useTemplateStore({
    category: resolvedCategory,
    namespace: resolvedCategory,
    initialTemplates,
    syncWithServer: false,
  });

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

    if (typeof document !== "undefined" && scopeEl.contains(document.activeElement)) {
      setIsFocusedScope(true);
    }

    const handleFocusIn = () => setIsFocusedScope(true);
    const handleFocusOut = (e: FocusEvent) => {
      if (!scopeEl.contains(e.relatedTarget as Node | null)) {
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
    ? Boolean(isFocusedScope)
    : true;

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
  const handlePick = (item: any) => {
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
  };

  // Delete template action
  const handleDelete = async (e: React.SyntheticEvent, item: any) => {
    e.stopPropagation();
    await deleteTemplate(item);
  };

  // Filter templates based on search query
  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return sortedTemplates;
    const q = searchQuery.toLowerCase().trim();
    return sortedTemplates.filter((item: any) => {
      const text = typeof item === "object" && item !== null ? item.text : String(item);
      return text.toLowerCase().includes(q);
    });
  }, [sortedTemplates, searchQuery]);

  // Determine whether to display the Save button
  const isSaveVisible = showSave && (value || "").trim().length > 0 && !isAlreadySaved(value);

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center gap-1.5 transition-all duration-200 select-none ${
        isToolbarVisible
          ? "opacity-100 pointer-events-auto max-h-8"
          : "opacity-0 pointer-events-none select-none max-h-0 overflow-hidden"
      } ${className}`}
    >
      {/* Clear Button */}
      {showClear && (value || "").length > 0 && (
        <IconButton
          icon={RefreshIcon}
          size={size}
          variant="ghost"
          shape="circle"
          onClick={handleClear}
          title="Clear text"
          ariaLabel="Clear text"
          className="hover:text-rose-400 hover:!text-rose-400 active:text-rose-500"
        />
      )}

      {/* Save Template Button */}
      {isSaveVisible && (
        <IconButton
          icon={SaveIcon}
          size={size}
          variant="sub"
          onClick={handleSave}
          title="Save as reusable template"
          ariaLabel="Save as template"
          className="hover:!text-[var(--accent-main)] animate-fade-in"
        />
      )}

      {/* Saved Messages / Templates Project Menu (ActionMenu) */}
      {showSaved && (
        <ActionMenu
          align={dropdownPosition.endsWith("left") ? "left" : "right"}
          size={size === "xs" ? "xs" : size === "sm" ? "sm" : "md"}
          variant="sub"
          buttonClassName="border-0 rounded-xl theme-bg-sub hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary shadow-2xs px-2 py-1 text-xs"
          menuClassName="border-0 shadow-2xl rounded-2xl min-w-[260px] max-w-[340px] p-1.5"
          icon={SavedMessagesIcon}
          label={
            shouldShowCount && count > 0 ? (
              <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded-full theme-bg-accent-soft theme-accent leading-none">
                {count}
              </span>
            ) : null
          }
          showChevron={false}
          ariaLabel={dropdownTitle || "Browse Saved Templates"}
          header={
            <div className="px-2 py-1 space-y-2 border-b theme-border-subtle mb-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider theme-text-secondary">
                  <SavedMessagesIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
                  <span>{dropdownTitle}</span>
                </div>
                {count > 0 && (
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full theme-bg-accent-soft theme-accent">
                    {count}
                  </span>
                )}
              </div>
              {shouldShowSearch && count >= 3 && (
                <div className="relative pt-0.5">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search templates..."
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    className="w-full text-xs py-1.5 pl-7 pr-2.5 rounded-xl theme-bg-sub theme-text-primary border-0 focus:outline-none focus:ring-1 focus:ring-[var(--accent-main)]/40 transition-colors placeholder:theme-text-secondary/60"
                  />
                  <SearchIcon className="w-3.5 h-3.5 absolute left-2 top-2.5 theme-text-secondary/60 pointer-events-none" />
                </div>
              )}
            </div>
          }
          items={filteredTemplates.map((item: any) => {
            const text = typeof item === "object" && item !== null ? item.text : String(item);
            const isSelected = (value || "").trim() === text.trim() || (value || "").includes(text);

            return {
              label: text,
              active: isSelected,
              onClick: () => handlePick(item),
              rightElement: shouldAllowDelete ? (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(e, item);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation();
                      handleDelete(e, item);
                    }
                  }}
                  className="p-1 rounded-lg hover:theme-bg-elevated text-slate-400 hover:text-rose-500 opacity-60 hover:opacity-100 transition-all cursor-pointer inline-flex items-center justify-center shrink-0 ml-1.5"
                  title="Delete template"
                  aria-label="Delete template"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                </span>
              ) : null,
            };
          })}
        >
          {filteredTemplates.length === 0 && (
            <div className="py-5 px-3 text-center text-xs theme-text-secondary select-none">
              {searchQuery.trim() ? "No matching templates found." : "No saved templates yet."}
            </div>
          )}
        </ActionMenu>
      )}
    </div>
  );
}
