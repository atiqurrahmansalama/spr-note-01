import { useState, useRef, useEffect } from "react";
import ChevronIcon from "./ChevronIcon";

export default function CustomSelect({
  options = [],
  value = "",
  onChange,
  placeholder = "Select...",
  className = "",
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
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* 🟢 টাইপিং বন্ধ করতে আসল বাটন বা ReadOnly ইনপুট ব্যবহার করা হলো */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-[#1c1d1f] border border-slate-700/80 rounded-xl px-3.5 py-2 text-slate-200 text-xs font-mono flex items-center justify-between cursor-pointer hover:border-slate-600 transition-colors select-none"
      >
        <span className={!value ? "text-slate-500" : "text-slate-200"}>
          {selectedLabel}
        </span>
        <ChevronIcon isOpen={isOpen} className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-2" />
      </div>

      {isOpen && (
        <ul className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-[#212327] rounded-xl shadow-2xl space-y-0.5 p-1 text-xs font-mono border border-slate-800">
          {options.map((item, index) => {
            const label = typeof item === "object" ? item.label : item;
            const itemVal = typeof item === "object" ? item.value : item;
            const isSelected = itemVal === value;

            return (
              <li
                key={index}
                onClick={() => handleSelect(item)}
                className={`px-3 py-2 rounded-lg cursor-pointer transition-colors flex items-center justify-between ${
                  isSelected
                    ? "bg-indigo-600/30 text-indigo-200 font-semibold"
                    : "hover:bg-slate-800 text-slate-300"
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