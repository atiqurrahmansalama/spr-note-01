export const focusNextInput = (currentElement) => {
  const inputs = Array.from(
    document.querySelectorAll('input:not([type="hidden"]), textarea, select')
  ).filter((el) => !el.disabled && el.offsetParent !== null && el.tabIndex !== -1);
  const active = currentElement || document.activeElement;
  const index = inputs.indexOf(active);
  if (index > -1 && index < inputs.length - 1) {
    const next = inputs[index + 1];
    next.focus();
    if (typeof next.select === "function" && next.type !== "button") {
      next.select();
    }
  }
};

export const focusPrevInput = (currentElement) => {
  const inputs = Array.from(
    document.querySelectorAll('input:not([type="hidden"]), textarea, select')
  ).filter((el) => !el.disabled && el.offsetParent !== null && el.tabIndex !== -1);
  const active = currentElement || document.activeElement;
  const index = inputs.indexOf(active);
  if (index > 0) {
    const prev = inputs[index - 1];
    prev.focus();
    if (typeof prev.select === "function" && prev.type !== "button") {
      prev.select();
    }
  }
};

export const focusElementById = (id) => {
  setTimeout(() => {
    const el = document.getElementById(id);
    if (el) {
      el.focus();
      if (typeof el.select === "function") el.select();
    }
  }, 40);
};

export const handleEnterFocusNext = (e) => {
  if (e && e.key === 'Enter') {
    e.preventDefault();
    focusNextInput(e.target);
  } else if (!e || !e.key) {
    focusNextInput();
  }
};

export const handleBackspaceFocusPrev = (e, isEmpty) => {
  if (e && e.key === 'Backspace' && isEmpty) {
    e.preventDefault();
    focusPrevInput(e.target);
    return true; 
  }
  return false;
};
