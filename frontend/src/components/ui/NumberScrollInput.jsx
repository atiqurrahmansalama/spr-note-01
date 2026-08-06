import { useEffect, useRef } from "react";
import { focusNextInput, focusPrevInput } from "../../utils/keyboardUtils";

export default function NumberScrollInput({ 
  value, 
  onChange, 
  min = 1, 
  max, 
  placeholder = "--", 
  className = "",
  onEnter,
  onShiftEnter,
  onEmptyBackspace,
  onAdd,
  onAddShift,
  id
}) {
  const inputRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      updateValue(1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      updateValue(-1);
    } else if (e.key === "ArrowLeft") {
      if (e.target.selectionStart === 0) {
        e.preventDefault();
        focusPrevInput(inputRef.current);
      }
    } else if (e.key === "ArrowRight") {
      if (e.target.selectionEnd === e.target.value.length) {
        e.preventDefault();
        focusNextInput(inputRef.current);
      }
    } else if (e.key === "Enter") {
      if (e.shiftKey && onShiftEnter) {
        e.preventDefault();
        onShiftEnter(e);
      } else if (onEnter) {
        onEnter(e);
      }
    } else if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      if (e.shiftKey && onAddShift) {
        onAddShift(e);
      } else if (onAdd) {
        onAdd(e);
      }
    } else if (e.key === "Backspace") {
      if (value === "" && onEmptyBackspace) {
        e.preventDefault();
        onEmptyBackspace(e);
      }
    }
  };

  const updateValue = (step) => {
    let current = parseInt(value, 10);
    if (isNaN(current)) {
      current = step > 0 ? min : max;
    } else {
      current += step;
    }

    if (current < min) {
      current = max !== undefined ? max : min;
    } else if (max !== undefined && current > max) {
      current = min;
    }

    onChange(current.toString());
  };

  const handleChange = (e) => {
    const val = e.target.value;
    if (val === "") {
      onChange("");
      return;
    }
    
    let num = parseInt(val, 10);
    if (!isNaN(num)) {
      onChange(num.toString());
    }
  };

  const handleBlur = () => {
    if (value === "") return;
    
    let current = parseInt(value, 10);
    if (!isNaN(current)) {
      let changed = false;
      if (current < min) {
        current = min;
        changed = true;
      }
      if (max !== undefined && current > max) {
        current = max;
        changed = true;
      }
      if (changed) {
        onChange(current.toString());
      }
    }
  };

  useEffect(() => {
    const inputEl = inputRef.current;
    const onWheel = (e) => {
      e.preventDefault();
      const step = e.deltaY < 0 ? 1 : -1;
      let current = parseInt(value, 10);
      const safeMin = min !== undefined ? min : 1;
      const safeMax = max;

      if (isNaN(current)) {
        current = step > 0 ? safeMin : (safeMax !== undefined ? safeMax : safeMin);
      } else {
        current += step;
      }

      if (current < safeMin) {
        current = safeMax !== undefined ? safeMax : safeMin;
      } else if (safeMax !== undefined && current > safeMax) {
        current = safeMin;
      }

      if (current !== undefined && current !== null && !isNaN(current)) {
        onChange(current.toString());
      }
    };

    if (inputEl) {
      inputEl.addEventListener("wheel", onWheel, { passive: false });
      return () => inputEl.removeEventListener("wheel", onWheel);
    }
  }, [value, max, min, onChange]);

  return (
    <input
      id={id}
      ref={inputRef}
      type="text"
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={`bg-transparent focus:theme-bg-elevated border-none outline-none text-center text-[12px] sm:text-[14px] font-mono rounded transition-all placeholder:theme-text-secondary placeholder:opacity-50 focus:placeholder-transparent focus:placeholder:opacity-0 select-text ${className}`}
      inputMode="numeric"
    />
  );
}
