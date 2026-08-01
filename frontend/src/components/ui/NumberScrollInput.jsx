import { useEffect, useRef } from "react";
import { focusNextInput, focusPrevInput } from "../../utils/keyboardUtils";

export default function NumberScrollInput({ 
  value, 
  onChange, 
  min = 1, 
  max, 
  placeholder = "-", 
  className = "",
  onEnter,
  onEmptyBackspace,
  onAdd,
  id
}) {
  const inputRef = useRef(null);

  const handleWheel = (e) => {
    // Removed focus check to allow scrolling on hover
    e.preventDefault();
    const step = e.deltaY < 0 ? 1 : -1;
    updateValue(step);
  };

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
      if (onEnter) onEnter(e);
    } else if (e.key === "+") {
      e.preventDefault();
      if (onAdd) onAdd(e);
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
    
    // Only allow typing numbers. We don't clamp min/max here to allow user to type freely (e.g. typing "12" when min is "11")
    let num = parseInt(val, 10);
    if (!isNaN(num)) {
      onChange(num.toString());
    }
  };

  const handleBlur = (e) => {
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
    if (inputEl) {
      inputEl.addEventListener("wheel", handleWheel, { passive: false });
      return () => inputEl.removeEventListener("wheel", handleWheel);
    }
  }, [value, max, min]);

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
      className={`bg-transparent border-none outline-none text-center font-mono rounded transition-all ${className}`}
      inputMode="numeric"
    />
  );
}
