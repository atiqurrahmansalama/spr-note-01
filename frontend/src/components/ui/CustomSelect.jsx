import { useState, useRef, useEffect } from "react";
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
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (item) => {
    const selectedVal = typeof item === "object" ? item.value : item;
    if (onChange) onChange(selectedVal);
    setIsOpen(false);
  };

  const selectedLabel =
    options.find((opt) => (typeof opt === "object" ? opt.value === value : opt === value))
      ?.label || value || placeholder;

  return (
    <div ref={containerRef} className={`relative min-w-[56px] ${className}`}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={
          buttonClassName ||
          "w-full bg-[#1c1d1f] border border-slate-700/80 rounded-lg px-3 py-2 text-slate-200 text-xs font-mono flex items-center justify-between cursor-pointer hover:border-slate-600 transition-colors select-none"
        }
      >
        <span className={!value ? "text-slate-500" : "text-slate-200"}>
          {selectedLabel}
        </span>
        <ChevronIcon isOpen={isOpen} className="w-3 h-3 text-slate-400 shrink-0 ml-1" />
      </div>

      {isOpen && (
        <ul className="absolute z-50 left-0 right-0 mt-1 min-w-[56px] max-h-56 overflow-y-auto bg-[#212327] rounded-lg shadow-2xl space-y-0.5 p-1 text-xs border border-slate-700/80">
          {options.map((item, index) => {
            const label = typeof item === "object" ? item.label : item;
            const itemVal = typeof item === "object" ? item.value : item;
            const isSelected = itemVal === value;

            return (
              <li
                key={index}
                onClick={() => handleSelect(item)}
                className={`px-2.5 py-1.5 rounded-md cursor-pointer transition-colors flex items-center justify-center font-medium ${
                  isSelected
                    ? "bg-indigo-600/35 text-indigo-100 font-semibold"
                    : "hover:bg-indigo-600/20 hover:text-indigo-200 text-slate-300"
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