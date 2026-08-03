import { useState, useRef, useEffect } from "react";
import ChevronIcon from "./ChevronIcon"; // 🚀 কাস্টম SVG আইকন ইমপোর্ট

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
      <div className="relative flex items-center">
        <input
          type="text"
          value={safeSearchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full bg-[#17181a] rounded-xl px-4 py-2.5 text-slate-100 font-serif font-medium text-sm focus:outline-none focus:border-indigo-500/80 transition-colors pr-16"
        />

        {isNewName && (
          <button
            type="button"
            onClick={handleSaveClick}
            className="absolute right-8 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold px-2.5 py-1 rounded-md transition-colors shadow"
          >
            Save
          </button>
        )}

        {/* 🚀 ইমোজি সরিয়ে কাস্টম SVG আউটলাইন রিয়্যুজেবল আইকন */}
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-3 p-1 text-slate-500 hover:text-slate-300 cursor-pointer select-none flex items-center justify-center"
        >
          <ChevronIcon isOpen={isOpen} className="w-3.5 h-3.5 text-slate-400" />
        </div>
      </div>

      {isOpen && (
        <ul className="absolute z-50 left-0 right-0 mt-1.5 max-h-56 overflow-y-auto bg-[#212327] rounded-xl shadow-2xl space-y-0.5 p-1 text-sm font-serif border border-slate-800">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((item, index) => {
              const label = typeof item === "string" ? item : item.label;
              const sub = typeof item === "object" ? item.sub : null;

              return (
                <li
                  key={index}
                  onClick={() => handleSelect(item)}
                  className="px-3.5 py-2 hover:bg-indigo-600/20 hover:text-indigo-200 text-slate-200 rounded-lg cursor-pointer transition-colors flex justify-between items-center"
                >
                  <span>{label}</span>
                  {sub && <span className="text-[11px] text-slate-500 font-sans">{sub}</span>}
                </li>
              );
            })
          ) : (
            <li className="px-3.5 py-2 text-slate-500 text-xs italic">
              No matching record found. Click 'Save' button to create new.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}