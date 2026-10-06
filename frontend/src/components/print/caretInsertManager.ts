/**
 * Enterprise Caret Tracker & Universal Token Insertion Engine
 * 
 * Provides rock-solid, zero-loss caret preservation and instantaneous placeholder token insertion
 * across all Universal Print Studio workbench canvases, single-host document editors, contentEditable
 * containers, tabular ledger cells, and custom form inputs.
 * 
 * Invariants:
 * 1. Inserts tokens via pure Editor Transactions on the authoritative single-host editor.
 * 2. Token nodes maintain stable logical identity (id, key, display, sourcePath, formatting).
 * 3. Intelligent bracket deduplication prevents `{{{{key}}}}` or double braces.
 * 4. Caret and selection remain stable after pagination reflow.
 * 5. Zero reliance on deprecated global execCommand or raw unmanaged DOM mutations.
 */

import { TokenInsertPayload, Mark } from './model/types';
import { EditorCommands } from './layout/editor/EditorCommands';
import { EditorDomAdapter } from './layout/editor/EditorDomAdapter';
import { EditorTransaction } from './layout/editor/editorTypes';

export interface ActiveCaretState {
  range: Range | null;
  element: HTMLElement | null;
  isInput: boolean;
  isContentEditable: boolean;
  isSingleHostEditor: boolean;
  selectionStart?: number;
  selectionEnd?: number;
}

let lastActiveCaret: ActiveCaretState = {
  range: null,
  element: null,
  isInput: false,
  isContentEditable: false,
  isSingleHostEditor: false,
};

/**
 * Checks if a given DOM node is inside a sidebar, drawer, modal, or toolbar control
 * that should not hijack the active document canvas caret.
 */
function isSidebarOrControlNode(node: Node | null): boolean {
  if (!node) return false;
  const el = (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement) as HTMLElement | null;
  if (!el) return false;
  return Boolean(
    el.closest('.print-sidebar-control, .doclab-sidebar, .doclab-ribbon, [data-sidebar-panel="true"], .theme-drawer, [role="dialog"]')
  );
}

/**
 * Checks if a given DOM node is inside an active document canvas or editable area
 */
function isEditableNode(node: Node | null): boolean {
  if (!node) return false;
  if (isSidebarOrControlNode(node)) return false;
  const el = (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement) as HTMLElement | null;
  if (!el) return false;
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return true;
  return el.isContentEditable || Boolean(el.closest('[contenteditable="true"]'));
}

/**
 * Finds the single-host editor container if present
 */
function findSingleHostEditor(el: HTMLElement | null): HTMLElement | null {
  if (!el) return null;
  if (el.getAttribute('data-doclab-single-host') === 'true') return el;
  return el.closest('[data-doclab-single-host="true"]') as HTMLElement | null;
}

/**
 * Gets the last known active caret state
 */
export function getLastActiveCaret(): ActiveCaretState {
  return lastActiveCaret;
}

/**
 * Capture and store current selection if it's within an editable element
 */
export function captureActiveCaret(): ActiveCaretState {
  if (typeof window === 'undefined') return lastActiveCaret;

  const activeEl = document.activeElement as HTMLElement | null;

  // If the active element is part of sidebar/controls, preserve the previous canvas caret
  if (activeEl && isSidebarOrControlNode(activeEl)) {
    return lastActiveCaret;
  }

  // 1. Check if active element is a document canvas Input or Textarea
  if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
    const inputEl = activeEl as HTMLInputElement | HTMLTextAreaElement;
    lastActiveCaret = {
      range: null,
      element: inputEl,
      isInput: true,
      isContentEditable: false,
      isSingleHostEditor: false,
      selectionStart: inputEl.selectionStart ?? inputEl.value.length,
      selectionEnd: inputEl.selectionEnd ?? inputEl.value.length,
    };
    return lastActiveCaret;
  }

  // 2. Check DOM Selection for contentEditable or Single-Host Editor
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;

    if (isEditableNode(container) && !isSidebarOrControlNode(container)) {
      const editableEl = (container.nodeType === Node.ELEMENT_NODE
        ? (container as HTMLElement)
        : container.parentElement)?.closest('[contenteditable="true"]') as HTMLElement | null;

      const hostEl = editableEl || (container as HTMLElement);
      const isSingleHost = Boolean(findSingleHostEditor(hostEl));

      lastActiveCaret = {
        range: range.cloneRange(),
        element: hostEl,
        isInput: false,
        isContentEditable: true,
        isSingleHostEditor: isSingleHost,
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
 * Inserts a token directly via an Editor Transaction on a specified host element
 */
export function insertTokenViaEditorTransaction(
  host: HTMLElement,
  tokenPayload: TokenInsertPayload
): EditorTransaction {
  return EditorCommands.insertToken(host, tokenPayload);
}

/**
 * Normalizes any raw token string or payload into a standard TokenInsertPayload
 */
export function normalizeTokenPayload(
  rawToken: string | TokenInsertPayload,
  options: Partial<TokenInsertPayload> = {}
): TokenInsertPayload {
  if (typeof rawToken === 'object' && rawToken !== null) {
    const cleanKey = (rawToken.key || '').trim().replace(/^\{+/, '').replace(/\}+$/, '').trim();
    return {
      ...rawToken,
      key: cleanKey,
      display: rawToken.display || rawToken.label || cleanKey,
      label: rawToken.label || rawToken.display || cleanKey,
      ...options,
    };
  }

  const strToken = String(rawToken || '').trim();
  const isDirective = strToken.startsWith('<') || strToken.startsWith('|');
  const cleanKey = isDirective
    ? strToken
    : strToken.replace(/^\{+/, '').replace(/\}+$/, '').trim();

  return {
    key: cleanKey,
    display: options.display || options.label || cleanKey,
    label: options.label || options.display || cleanKey,
    sourcePath: options.sourcePath,
    category: options.category || 'general',
    defaultValue: options.defaultValue,
    format: options.format,
    formatting: options.formatting || options.marks,
    marks: options.marks || options.formatting,
    ...options,
  };
}

/**
 * Inserts a placeholder token (e.g. `{{student_name}}` or structured TokenInsertPayload)
 * cleanly at the user's active caret position.
 * 
 * Uses Editor Transaction APIs for the authoritative editor canvas, guaranteeing
 * stable AST identity and reliable cursor restoration after reflow.
 */
export function insertTokenAtActiveCaret(
  rawToken: string | TokenInsertPayload,
  options: Partial<TokenInsertPayload> = {}
): boolean {
  if (typeof window === 'undefined' || !rawToken) return false;

  const payload = normalizeTokenPayload(rawToken, options);
  const isDirective = payload.key.startsWith('<') || payload.key.startsWith('|');
  const tokenString = isDirective ? payload.key : `{{${payload.key}}}`;

  // Refresh active caret state
  captureActiveCaret();

  const { element, range, isInput, selectionStart, selectionEnd } = lastActiveCaret;

  // 1. If target is an <input> or <textarea>
  if (isInput && element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')) {
    const inputEl = element as HTMLInputElement | HTMLTextAreaElement;
    let start = selectionStart ?? inputEl.value.length;
    let end = selectionEnd ?? inputEl.value.length;
    const val = inputEl.value || '';

    // Smart deduplication for standard placeholder tokens only:
    if (!isDirective) {
      const beforeText = val.slice(0, start);
      if (beforeText.endsWith('{{')) {
        start -= 2;
      } else if (beforeText.endsWith('{')) {
        start -= 1;
      }

      const afterText = val.slice(end);
      if (afterText.startsWith('}}')) {
        end += 2;
      } else if (afterText.startsWith('}')) {
        end += 1;
      }
    }

    const nextVal = val.slice(0, start) + tokenString + val.slice(end);
    inputEl.value = nextVal;

    // Reposition cursor right after inserted token
    const nextPos = start + tokenString.length;
    inputEl.focus();
    inputEl.setSelectionRange(nextPos, nextPos);

    // Trigger synthetic input/change events for React form synchronization
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    inputEl.dispatchEvent(new Event('change', { bubbles: true }));

    lastActiveCaret.selectionStart = nextPos;
    lastActiveCaret.selectionEnd = nextPos;
    return true;
  }

  // 2. If target is within the Single-Host Editor Canvas
  const singleHost = findSingleHostEditor(element) || (document.querySelector('[data-doclab-single-host="true"]') as HTMLElement | null);

  if (singleHost) {
    try {
      // Restore active caret range if available inside singleHost before dispatching command
      if (range && singleHost.contains(range.commonAncestorContainer)) {
        const sel = window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(range);
        }
      } else {
        singleHost.focus();
      }

      // Dispatch authoritative Editor Command Event (handled transactionally by PaginatedDocumentEditor)
      window.dispatchEvent(
        new CustomEvent('spr_doclab_editor_command', {
          detail: {
            command: 'insertToken',
            value: payload.key,
            options: payload,
          },
        })
      );
      return true;
    } catch (err) {
      console.warn('Single-host editor token command dispatch failed, falling back to DOM adapter:', err);
    }
  }

  // 3. Fallback: If target is a generic contentEditable element with active Range
  if (range && element && document.body.contains(element)) {
    try {
      element.focus();
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);

        // Perform clean insertion using EditorDomAdapter
        EditorDomAdapter.insertTokenAtSelection(element, payload);

        // Capture updated range
        if (selection.rangeCount > 0) {
          lastActiveCaret.range = selection.getRangeAt(0).cloneRange();
        }

        element.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
    } catch (err) {
      console.warn('Generic contentEditable token insertion failed:', err);
    }
  }

  // 4. Fallback: Find any active canvas contentEditable element on screen
  const fallbackEditable = document.querySelector(
    '.universal-print-workbench [contenteditable="true"], .paper-sheet [contenteditable="true"]'
  ) as HTMLElement | null;

  if (fallbackEditable) {
    try {
      fallbackEditable.focus();
      EditorDomAdapter.insertTokenAtSelection(fallbackEditable, payload);
      fallbackEditable.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    } catch (err) {
      console.warn('Fallback canvas insertion failed:', err);
    }
  }

  // 5. Fallback: Copy to clipboard if no editable canvas area was active
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(tokenString);
  }

  return false;
}
