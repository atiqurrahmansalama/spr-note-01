export const focusNextInput = (currentElement?: HTMLElement | null): void => {
  if (typeof document === 'undefined') return;
  const inputs = Array.from(
    document.querySelectorAll<HTMLElement>('input:not([type="hidden"]), textarea, select')
  ).filter((el) => !(el as any).disabled && el.offsetParent !== null && el.tabIndex !== -1);
  const active = currentElement || (document.activeElement as HTMLElement | null);
  const index = active ? inputs.indexOf(active) : -1;
  if (index > -1 && index < inputs.length - 1) {
    const next = inputs[index + 1];
    next.focus();
    if (typeof (next as HTMLInputElement).select === "function" && (next as HTMLInputElement).type !== "button") {
      (next as HTMLInputElement).select();
    }
  }
};

export const focusPrevInput = (currentElement?: HTMLElement | null): void => {
  if (typeof document === 'undefined') return;
  const inputs = Array.from(
    document.querySelectorAll<HTMLElement>('input:not([type="hidden"]), textarea, select')
  ).filter((el) => !(el as any).disabled && el.offsetParent !== null && el.tabIndex !== -1);
  const active = currentElement || (document.activeElement as HTMLElement | null);
  const index = active ? inputs.indexOf(active) : -1;
  if (index > 0) {
    const prev = inputs[index - 1];
    prev.focus();
    if (typeof (prev as HTMLInputElement).select === "function" && (prev as HTMLInputElement).type !== "button") {
      (prev as HTMLInputElement).select();
    }
  }
};

export const focusElementById = (id: string): void => {
  if (typeof document === 'undefined') return;
  setTimeout(() => {
    const el = document.getElementById(id);
    if (el) {
      el.focus();
      if (typeof (el as HTMLInputElement).select === "function") (el as HTMLInputElement).select();
    }
  }, 40);
};

export const handleEnterFocusNext = (e?: { key?: string; target?: any; preventDefault?: () => void } | KeyboardEvent): void => {
  if (e && e.key === 'Enter') {
    e.preventDefault?.();
    focusNextInput(e.target as HTMLElement);
  } else if (!e || !e.key) {
    focusNextInput();
  }
};

export const handleBackspaceFocusPrev = (e?: { key?: string; target?: any; preventDefault?: () => void } | KeyboardEvent, isEmpty = false): void => {
  if (e && e.key === 'Backspace' && isEmpty) {
    e.preventDefault?.();
    focusPrevInput(e.target as HTMLElement);
  }
};
