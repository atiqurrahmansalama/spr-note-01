import NumberScrollInput from "../ui/NumberScrollInput";
import { handleEnterFocusNext, handleBackspaceFocusPrev } from "../../utils/keyboardUtils";

export default function PageRangeInput({ range, onChange, onRemove, juzValue, isLast, onAddNextRange }) {
  const getMaxPage = (juzStr) => {
    const j = parseInt(juzStr, 10);
    if (j === 29) return 24;
    if (j === 30) return 25;
    return 20;
  };

  const maxPage = getMaxPage(juzValue);

  return (
    <div className="flex items-center bg-[#1c1d1f] rounded-lg border border-slate-700/50 overflow-hidden h-10 shadow-inner group focus-within:border-slate-500 focus-within:ring-1 focus-within:ring-slate-500 transition-all">
      <NumberScrollInput
        id={`${range.id}-start`}
        value={range.start}
        onChange={(val) => onChange({ ...range, start: val })}
        onEnter={handleEnterFocusNext}
        onAdd={() => {
          if (onAddNextRange) {
            onAddNextRange();
          }
        }}
        onEmptyBackspace={(e) => {
          // Focus previous input before deleting the range
          handleBackspaceFocusPrev(e, true);
          if (onRemove) onRemove();
        }}
        min={1}
        max={maxPage}
        className="w-10 h-full text-sm text-slate-300 placeholder-slate-600 focus:bg-slate-800"
      />
      <div className="w-px h-6 bg-slate-700/50 mx-1"></div>
      <span className="text-slate-500 font-mono text-xs">-</span>
      <div className="w-px h-6 bg-slate-700/50 mx-1"></div>
      <NumberScrollInput
        value={range.end}
        onChange={(val) => onChange({ ...range, end: val })}
        onEnter={(e) => {
          if (isLast && onAddNextRange) {
            onAddNextRange();
            setTimeout(() => handleEnterFocusNext(e), 50);
          } else {
            handleEnterFocusNext(e);
          }
        }}
        onAdd={() => {
          if (onAddNextRange) {
            onAddNextRange();
          }
        }}
        onEmptyBackspace={(e) => {
          // Focus previous input (start)
          handleBackspaceFocusPrev(e, true);
        }}
        min={range.start ? parseInt(range.start, 10) : 1}
        max={maxPage}
        className="w-10 h-full text-sm text-slate-300 placeholder-slate-600 focus:bg-slate-800"
      />
    </div>
  );
}
