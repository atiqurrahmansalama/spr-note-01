export const focusNextInput = (currentElement) => {
  const inputs = Array.from(
    document.querySelectorAll('input[type="text"], input[type="number"]')
  );
  const index = inputs.indexOf(currentElement || document.activeElement);
  if (index > -1 && index < inputs.length - 1) {
    inputs[index + 1].focus();
  }
};

export const focusPrevInput = (currentElement) => {
  const inputs = Array.from(
    document.querySelectorAll('input[type="text"], input[type="number"]')
  );
  const index = inputs.indexOf(currentElement || document.activeElement);
  if (index > 0) {
    inputs[index - 1].focus();
  }
};

export const handleEnterFocusNext = (e) => {
  if (e && e.key === 'Enter') {
    e.preventDefault();
    focusNextInput();
  } else if (!e || !e.key) {
    focusNextInput();
  }
};

export const handleBackspaceFocusPrev = (e, isEmpty) => {
  if (e && e.key === 'Backspace' && isEmpty) {
    e.preventDefault();
    focusPrevInput();
    return true; 
  }
  return false;
};
