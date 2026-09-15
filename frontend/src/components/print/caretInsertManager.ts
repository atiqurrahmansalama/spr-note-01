/**
 * Enterprise Caret Tracker & Universal Token Insertion Engine
 * 
 * Provides rock-solid, zero-loss caret preservation and instantaneous placeholder token insertion
 * across all Universal Print Studio workbench canvases, contentEditable containers, Word (.docx) renderers,
 * tabular ledger cells, and custom document inputs.
 * 
 * Includes intelligent bracket deduplication (prevents `{{{{key}}}}` or duplicate keys).
 */

export interface ActiveCaretState {
  range: Range | null;
  element: HTMLElement | null;
  isInput: boolean;
  isContentEditable: boolean;
  selectionStart?: number;
  selectionEnd?: number;
}

let lastActiveCaret: ActiveCaretState = {
  range: null,
  element: null,
  isInput: false,
  isContentEditable: false,
};

/**
 * Checks if a given DOM node is inside an active document canvas or editable area
 */
function isEditableNode(node: Node | null): boolean {
  if (!node) return false;
  const el = (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement) as HTMLElement | null;
  if (!el) return false;
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return true;
  return el.isContentEditable || Boolean(el.closest('[contenteditable="true"]'));
}

/**
 * Capture and store current selection if it's within an editable element
 */
export function captureActiveCaret(): ActiveCaretState {
  if (typeof window === 'undefined') return lastActiveCaret;

  const activeEl = document.activeElement as HTMLElement | null;

  // 1. Check if active element is an Input or Textarea
  if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
    const inputEl = activeEl as HTMLInputElement | HTMLTextAreaElement;
    lastActiveCaret = {
      range: null,
      element: inputEl,
      isInput: true,
      isContentEditable: false,
      selectionStart: inputEl.selectionStart ?? inputEl.value.length,
      selectionEnd: inputEl.selectionEnd ?? inputEl.value.length,
    };
    return lastActiveCaret;
  }

  // 2. Check DOM Selection for contentEditable
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;

    if (isEditableNode(container)) {
      const editableEl = (container.nodeType === Node.ELEMENT_NODE
        ? (container as HTMLElement)
        : container.parentElement)?.closest('[contenteditable="true"]') as HTMLElement | null;

      lastActiveCaret = {
        range: range.cloneRange(),
        element: editableEl || (container as HTMLElement),
        isInput: false,
        isContentEditable: true,
      };
      return lastActiveCaret;
    }
  }

  return lastActiveCaret;
}

/**
 * Register global selection listener to continuously track caret position
 */
if (typeof window !== 'undefined') {
  document.addEventListener('selectionchange', () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (isEditableNode(range.commonAncestorContainer)) {
        captureActiveCaret();
      }
    }
  });

  document.addEventListener('focusin', (e) => {
    if (isEditableNode(e.target as Node)) {
      captureActiveCaret();
    }
  });
}

/**
 * Inserts a placeholder token (e.g. `{{student_name}}`) cleanly at the user's active caret position.
 * Intelligent deduplication prevents double braces `{{{{key}}}}` or double insertions.
 */
export function insertTokenAtActiveCaret(rawToken: string): boolean {
  if (typeof window === 'undefined' || !rawToken) return false;

  // Normalize token to pristine `{{key_name}}`
  const cleanKey = String(rawToken).replace(/^\{+/, '').replace(/\}+$/, '').trim();
  const token = `{{${cleanKey}}}`;

  // Refresh active caret state
  captureActiveCaret();

  const { element, range, isInput, selectionStart, selectionEnd } = lastActiveCaret;

  // 1. If target is an <input> or <textarea>
  if (isInput && element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')) {
    const inputEl = element as HTMLInputElement | HTMLTextAreaElement;
    let start = selectionStart ?? inputEl.value.length;
    let end = selectionEnd ?? inputEl.value.length;
    const val = inputEl.value || '';

    // Smart deduplication for inputs: if user typed `{` or `{{` before caret
    const beforeText = val.slice(0, start);
    if (beforeText.endsWith('{{')) {
      start -= 2;
    } else if (beforeText.endsWith('{')) {
      start -= 1;
    }

    // If user has `}` or `}}` after caret
    const afterText = val.slice(end);
    if (afterText.startsWith('}}')) {
      end += 2;
    } else if (afterText.startsWith('}')) {
      end += 1;
    }

    const nextVal = val.slice(0, start) + token + val.slice(end);
    inputEl.value = nextVal;

    // Reposition cursor right after inserted token
    const nextPos = start + token.length;
    inputEl.focus();
    inputEl.setSelectionRange(nextPos, nextPos);

    // Trigger synthetic input/change events for React form synchronization
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    inputEl.dispatchEvent(new Event('change', { bubbles: true }));

    lastActiveCaret.selectionStart = nextPos;
    lastActiveCaret.selectionEnd = nextPos;
    return true;
  }

  // 2. If target is a contentEditable element with active Range
  if (range && element && document.body.contains(element)) {
    try {
      element.focus();
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        
        // Smart deduplication for ContentEditable: check text node before/after cursor
        if (range.startContainer.nodeType === Node.TEXT_NODE) {
          const text = range.startContainer.textContent || '';
          const offset = range.startOffset;

          const beforeText = text.slice(0, offset);
          if (beforeText.endsWith('{{')) {
            range.setStart(range.startContainer, offset - 2);
          } else if (beforeText.endsWith('{')) {
            range.setStart(range.startContainer, offset - 1);
          }

          const afterText = text.slice(range.endOffset);
          if (afterText.startsWith('}}')) {
            range.setEnd(range.startContainer, range.endOffset + 2);
          } else if (afterText.startsWith('}')) {
            range.setEnd(range.startContainer, range.endOffset + 1);
          }
        }

        selection.addRange(range);

        // Standard text insertion command
        const success = document.execCommand('insertText', false, token);

        if (!success) {
          // Robust DOM fallback if execCommand fails
          range.deleteContents();
          const textNode = document.createTextNode(token);
          range.insertNode(textNode);

          // Move cursor after the inserted text node
          range.setStartAfter(textNode);
          range.setEndAfter(textNode);
          selection.removeAllRanges();
          selection.addRange(range);
        }

        // Save updated range
        if (selection.rangeCount > 0) {
          lastActiveCaret.range = selection.getRangeAt(0).cloneRange();
        }

        // Trigger input event on editable container
        element.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
    } catch (err) {
      console.warn('Failed to insert token via saved range:', err);
    }
  }

  // 3. Fallback: Find any active canvas contentEditable element on screen
  const fallbackEditable = document.querySelector(
    '.universal-print-workbench [contenteditable="true"], .paper-sheet [contenteditable="true"]'
  ) as HTMLElement | null;

  if (fallbackEditable) {
    try {
      fallbackEditable.focus();
      const selection = window.getSelection();
      if (selection) {
        const range = document.createRange();
        range.selectNodeContents(fallbackEditable);
        range.collapse(false); // Move to end
        selection.removeAllRanges();
        selection.addRange(range);

        document.execCommand('insertText', false, token);
        fallbackEditable.dispatchEvent(new Event('input', { bubbles: true }));

        if (selection.rangeCount > 0) {
          lastActiveCaret.range = selection.getRangeAt(0).cloneRange();
          lastActiveCaret.element = fallbackEditable;
        }
        return true;
      }
    } catch (err) {
      console.warn('Fallback canvas insertion failed:', err);
    }
  }

  // 4. Fallback: Copy to clipboard if no editable canvas area was active
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(token);
  }

  return false;
}
