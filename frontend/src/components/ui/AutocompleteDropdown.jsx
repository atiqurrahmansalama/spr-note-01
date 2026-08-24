import { useState, useRef, useEffect } from "react";
import { ChevronIcon } from "./Icons";
import { focusNextInput } from "../../utils/keyboardUtils";

export default function AutocompleteDropdown({
  options = [],
  value = "",
  onChange,
  onAddNew,
  onNextFocus,
  placeholder = "Search or type...",
  className = "",
  autoFocus = false,
  inputRef = null,
  disableSaveButton = false,
  showAllOptionsOnFocus = false,
  readOnly = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const localInputRef = useRef(null);
  const refToUse = inputRef || localInputRef;
  const containerRef = useRef(null);

  if (value !== prevValue) {
    setPrevValue(value);
    setSearchTerm(value);
  }

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (autoFocus && refToUse.current) {
      setTimeout(() => {
        if (refToUse.current) {
          refToUse.current.focus();
        }
      }, 100);
    }
  }, [autoFocus, refToUse]);

  const safeSearchTerm = typeof searchTerm === "string" ? searchTerm : (searchTerm?.label || "");

  const filteredOptions = options.filter((item) => {
    if (showAllOptionsOnFocus && isOpen) return true;
    if (!safeSearchTerm || !safeSearchTerm.trim()) return true;
    const term = safeSearchTerm.trim().toLowerCase();
    const label = (typeof item === "string" ? item : (item?.label || item?.name || "")).toLowerCase();
    const sub = (typeof item === "object" ? (item?.sub || item?.group_name || "") : "").toLowerCase();
    return label.includes(term) || sub.includes(term);
  });

  const hasSearchTerm = safeSearchTerm.trim().length > 0;

  const triggerNextFocus = () => {
    if (onNextFocus) {
      onNextFocus();
    } else {
      setTimeout(() => {
        focusNextInput(refToUse.current);
      }, 30);
    }
  };

  const handleSelect = (item) => {
    const selectedLabel = typeof item === "string" ? item : item.label;
    setSearchTerm(selectedLabel);
    setIsOpen(false);
    if (onChange) onChange(item);
    triggerNextFocus();
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    setIsOpen(true);
    setHighlightedIndex(0);
    if (onChange) onChange(val);
  };

  const handleSaveClick = (e) => {
    if (e) e.stopPropagation();
    setIsOpen(false);
    if (onAddNew) onAddNew(safeSearchTerm);
  };

  const handleKeyDown = (e) => {
    // If user presses Shift + '+' (Shift + Plus) to trigger Save Student Panel
    if (e.shiftKey && (e.key === "+" || e.key === "=")) {
      if (onAddNew) {
        e.preventDefault();
        handleSaveClick(e);
        return;
      }
    }

    if (isOpen && filteredOptions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % filteredOptions.length);
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 + filteredOptions.length) % filteredOptions.length);
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        const selected = filteredOptions[highlightedIndex];
        if (selected) {
          handleSelect(selected);
        } else {
          setIsOpen(false);
          triggerNextFocus();
        }
        return;
      }
    }

    if (e.key === "Enter") {
      e.preventDefault();
      setIsOpen(false);
      triggerNextFocus();
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="flex items-center gap-2">
        {/* Input field with chevron */}
        <div className="relative flex items-center flex-1">
          <input
            ref={refToUse}
            type="text"
            readOnly={readOnly}
            value={safeSearchTerm}
            onChange={readOnly ? undefined : handleInputChange}
            onKeyDown={readOnly ? (e) => { if (e.key === 'Enter') setIsOpen(!isOpen); } : handleKeyDown}
            onFocus={() => setIsOpen(true)}
            onClick={() => setIsOpen(true)}
            placeholder={placeholder}
            className={`w-full theme-bg-sub rounded-xl px-4 py-2.5 theme-text-primary font-medium text-sm border theme-border focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors pr-8 ${
              readOnly ? "cursor-pointer select-none" : ""
            }`}
          />

          <div
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen((prev) => !prev);
            }}
            className="absolute right-3 p-1 theme-text-secondary hover:theme-text-primary cursor-pointer select-none flex items-center justify-center"
          >
            <ChevronIcon isOpen={isOpen} className="w-3.5 h-3.5 theme-text-secondary" />
          </div>
        </div>

        {/* Save button - outside the input box on the right */}
        {hasSearchTerm && !disableSaveButton && (
          <button
            type="button"
            onClick={handleSaveClick}
            className="theme-bg-accent hover:opacity-90 theme-accent-text text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors shadow shrink-0 cursor-pointer"
            title="Click or press Shift + + to save student record"
          >
            + Save
          </button>
        )}
      </div>


      {isOpen && (
        <ul className="absolute z-50 left-0 right-0 mt-1.5 max-h-56 overflow-y-auto theme-bg-surface rounded-xl shadow-2xl space-y-0.5 p-1 text-sm border theme-border">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((item, index) => {
              const label = typeof item === "string" ? item : item.label;
              const sub = typeof item === "object" ? item.sub : null;
              const hasActions = typeof item === "object" && (item.onEdit || item.onDelete);
              const isHighlighted = index === highlightedIndex;

              return (
                <li
                  key={index}
                  onClick={() => handleSelect(item)}
                  className={`px-3.5 py-2 rounded-lg cursor-pointer transition-colors flex justify-between items-center group/item ${
                    isHighlighted
                      ? "theme-bg-elevated theme-accent font-semibold"
                      : "hover:theme-bg-elevated theme-text-primary"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="truncate">{label}</span>
                    {sub && <span className="text-[11px] theme-text-secondary font-sans truncate">{sub}</span>}
                  </div>

                  {hasActions && (
                    <div className="flex items-center gap-1 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                      {item.onEdit && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen(false);
                            item.onEdit(item);
                          }}
                          className="p-1 rounded-md hover:theme-bg-surface text-xs theme-text-secondary hover:theme-accent transition cursor-pointer"
                          title="Edit"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 012.828 0L20.586 6a2 2 0 010 2.828L10 17.414l-4 1 1-4 10.414-10.414z" />
                          </svg>
                        </button>
                      )}
                      {item.onDelete && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen(false);
                            item.onDelete(item);
                          }}
                          className="p-1 rounded-md hover:theme-bg-surface text-xs theme-text-secondary hover:text-rose-400 transition cursor-pointer"
                          title="Delete"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
            })
          ) : (
            <li className="px-3.5 py-2 theme-text-secondary text-xs italic">
              No matching record found. Press &apos;+&apos; or &apos;Save&apos; to create new.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}