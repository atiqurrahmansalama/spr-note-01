import { useState, useRef } from "react";
import ChevronIcon from "./ChevronIcon";

export default function CustomSelect({
  options = [],
  value = "",
  onChange,
  placeholder = "Select...",
  className = "",
  buttonClassName = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef(null);

  const toggleOpen = () => setIsOpen((prev) => !prev);

  const handleBlur = () => {
    // Delay closing so onMouseDown on list items can fire first
    setTimeout(() => setIsOpen(false), 150);
  };

  const handleItemMouseDown = (e, item) => {
    // Prevent the button from losing focus (which would trigger handleBlur prematurely)
    e.preventDefault();
    const selectedVal = typeof item === "object" ? item.value : item;
    if (onChange) onChange(selectedVal);
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  const selectedLabel =
    options.find((opt) => {
      const val = typeof opt === "object" ? opt.value : opt;
      return String(val) === String(value);
    })?.label ?? (value || placeholder);

  return (
    <div className={`relative min-w-[42px] ${isOpen ? "z-[100]" : "z-10"} ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        onBlur={handleBlur}
        className={
          buttonClassName ||
          "w-full theme-bg-sub border theme-border rounded-lg px-3 py-2 theme-text-primary text-xs font-mono flex items-center justify-between cursor-pointer hover:theme-border transition-colors select-none"
        }
      >
        <span className={`flex-1 text-center ${!value ? "theme-text-secondary" : "theme-text-primary"}`}>
          {selectedLabel}
        </span>
        <ChevronIcon isOpen={isOpen} className="w-3 h-3 theme-text-secondary shrink-0 ml-1" />
      </button>

      {isOpen && (
        <ul className="absolute z-[9999] top-full left-0 mt-1 min-w-[56px] max-h-56 overflow-y-auto theme-bg-surface rounded-lg shadow-2xl space-y-0.5 p-1 text-xs border theme-border">
          {options.map((item, index) => {
            const label = typeof item === "object" ? item.label : item;
            const itemVal = typeof item === "object" ? item.value : item;
            const isSelected = String(itemVal) === String(value);

            return (
              <li
                key={index}
                onMouseDown={(e) => handleItemMouseDown(e, item)}
                className={`px-2.5 py-1.5 rounded-md cursor-pointer transition-colors flex items-center justify-center font-semibold select-none ${
                  isSelected
                    ? "theme-bg-accent-soft theme-accent font-bold"
                    : "hover:theme-bg-elevated theme-text-primary"
                }`}
              >
                <span>{label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}