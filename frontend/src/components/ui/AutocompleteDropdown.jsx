import { useState, useRef, useEffect } from "react";
import ChevronIcon from "./ChevronIcon";

export default function AutocompleteDropdown({
  options = [],
  value = "",
  onChange,
  onAddNew,
  placeholder = "Search or type...",
  className = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
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

  const handleSelect = (item) => {
    const selectedLabel = typeof item === "string" ? item : item.label;
    setSearchTerm(selectedLabel);
    setIsOpen(false);
    if (onChange) onChange(item);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    setIsOpen(true);
    if (onChange) onChange(val);
  };

  const handleSaveClick = (e) => {
    e.stopPropagation();
    setIsOpen(false);
    if (onAddNew) onAddNew(searchTerm);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="flex items-center gap-2">
        {/* Input field with chevron */}
        <div className="relative flex items-center flex-1">
          <input
            type="text"
            value={safeSearchTerm}
            onChange={handleInputChange}
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
            className="theme-bg-accent hover:opacity-90 theme-accent-text text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors shadow shrink-0"
          >
            Save
          </button>
        )}
      </div>

      {isOpen && (
        <ul className="absolute z-50 left-0 right-0 mt-1.5 max-h-56 overflow-y-auto theme-bg-surface rounded-xl shadow-2xl space-y-0.5 p-1 text-sm border theme-border">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((item, index) => {
              const label = typeof item === "string" ? item : item.label;
              const sub = typeof item === "object" ? item.sub : null;

              return (
                <li
                  key={index}
                  onClick={() => handleSelect(item)}
                  className="px-3.5 py-2 hover:theme-bg-elevated theme-text-primary rounded-lg cursor-pointer transition-colors flex justify-between items-center"
                >
                  <span>{label}</span>
                  {sub && <span className="text-[11px] theme-text-secondary font-sans">{sub}</span>}
                </li>
              );
            })
          ) : (
            <li className="px-3.5 py-2 theme-text-secondary text-xs italic">
              No matching record found. Click &apos;Save&apos; button to create new.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}