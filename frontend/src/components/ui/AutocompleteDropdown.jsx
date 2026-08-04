import { useState, useRef, useEffect } from "react";
import ChevronIcon from "./ChevronIcon";
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
    const label = typeof item === "string" ? item : (item?.label || "");
    return label.toLowerCase().includes(safeSearchTerm.toLowerCase());
  });

  const isNewName =
    safeSearchTerm.trim().length > 0 &&
    !options.some(
      (opt) => (typeof opt === "string" ? opt : (opt?.label || "")).toLowerCase() === safeSearchTerm.trim().toLowerCase()
    );

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
    // If user presses '+' to trigger Save Student Panel
    if (e.key === "+" || (e.shiftKey && e.key === "=")) {
      if (isNewName && onAddNew) {
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
            value={safeSearchTerm}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className="w-full theme-bg-sub rounded-xl px-4 py-2.5 theme-text-primary font-medium text-sm border theme-border focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors pr-8"
          />

          <div
            onClick={() => setIsOpen(!isOpen)}
            className="absolute right-3 p-1 theme-text-secondary hover:theme-text-primary cursor-pointer select-none flex items-center justify-center"
          >
            <ChevronIcon isOpen={isOpen} className="w-3.5 h-3.5 theme-text-secondary" />
          </div>
        </div>

        {/* Save button - outside the input box on the right */}
        {isNewName && (
          <button
            type="button"
            onClick={handleSaveClick}
            className="theme-bg-accent hover:opacity-90 theme-accent-text text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors shadow shrink-0 cursor-pointer"
            title="Press + to save"
          >
            Save (+)
          </button>
        )}
      </div>

      {isOpen && (
        <ul className="absolute z-50 left-0 right-0 mt-1.5 max-h-56 overflow-y-auto theme-bg-surface rounded-xl shadow-2xl space-y-0.5 p-1 text-sm border theme-border">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((item, index) => {
              const label = typeof item === "string" ? item : item.label;
              const sub = typeof item === "object" ? item.sub : null;
              const isHighlighted = index === highlightedIndex;

              return (
                <li
                  key={index}
                  onClick={() => handleSelect(item)}
                  className={`px-3.5 py-2 rounded-lg cursor-pointer transition-colors flex justify-between items-center ${
                    isHighlighted
                      ? "theme-bg-elevated theme-accent font-semibold"
                      : "hover:theme-bg-elevated theme-text-primary"
                  }`}
                >
                  <span>{label}</span>
                  {sub && <span className="text-[11px] theme-text-secondary font-sans">{sub}</span>}
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