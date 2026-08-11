import { useState, useRef, useEffect } from "react";
import ChevronIcon from "./ChevronIcon";

export default function CustomSelect({
  options = [],
  value = "",
  onChange,
  placeholder = "Select...",
  className = "",
  buttonClassName = "",
  icon = null,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOpen = () => setIsOpen((prev) => !prev);

  const handleItemClick = (item) => {
    const selectedVal = typeof item === "object" ? item.value : item;
    if (onChange) onChange(selectedVal);
    setIsOpen(false);
  };

  const selectedOpt = options.find((opt) => {
    const val = typeof opt === "object" ? opt.value : opt;
    return String(val) === String(value);
  });

  const selectedLabel = selectedOpt?.label ?? (typeof selectedOpt === "string" ? selectedOpt : value || placeholder);

  return (
    <div ref={containerRef} className={`relative ${isOpen ? "z-[100]" : "z-10"} ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        className={
          buttonClassName ||
          "w-full h-11 theme-bg-sub border theme-border rounded-xl px-3 theme-text-primary text-sm flex items-center justify-between cursor-pointer hover:theme-border transition-colors select-none font-medium shadow-sm"
        }
      >
        {icon && <span className="shrink-0 mr-1">{icon}</span>}
        <span className={`flex-1 text-center truncate ${!value || value === "ALL" ? "theme-text-primary font-medium" : "theme-accent font-semibold"}`}>
          {selectedLabel}
        </span>
        <ChevronIcon isOpen={isOpen} className="w-3.5 h-3.5 theme-text-secondary shrink-0 ml-1" />
      </button>

      {isOpen && (
        <ul className="absolute z-[9999] top-full left-0 right-0 mt-1 w-full max-h-64 overflow-y-auto theme-bg-surface rounded-xl shadow-2xl space-y-0.5 p-1 text-sm border theme-border animate-fade-in">
          {options.map((item, index) => {
            const label = typeof item === "object" ? item.label : item;
            const itemVal = typeof item === "object" ? item.value : item;
            const isSelected = String(itemVal) === String(value);

            return (
              <li
                key={index}
                onClick={() => handleItemClick(item)}
                className={`px-2 py-1.5 rounded-lg cursor-pointer transition-colors flex items-center justify-center gap-1 font-medium select-none text-xs sm:text-sm ${
                  isSelected
                    ? "theme-bg-accent-soft theme-accent font-semibold"
                    : "hover:theme-bg-elevated theme-text-primary"
                }`}
              >
                <span className="shrink-0 truncate">{label}</span>
                {isSelected && (
                  <svg className="w-3 h-3 theme-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}