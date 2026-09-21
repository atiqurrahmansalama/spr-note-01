import { useState, useRef, useEffect, useCallback } from 'react';

export interface UseDropdownKeyboardOptions {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  itemCount: number;
  onSelectIndex?: (index: number) => void;
  onAddNew?: () => void;
  onNextFocus?: () => void;
  itemSelector?: string;
  autoScroll?: boolean;
}

export interface UseDropdownKeyboardReturn {
  highlightedIndex: number;
  setHighlightedIndex: React.Dispatch<React.SetStateAction<number>>;
  handleKeyDown: (e: React.KeyboardEvent<HTMLElement>) => void;
  optionsListRef: React.RefObject<HTMLDivElement | null>;
  resetHighlight: () => void;
}

/**
 * Enterprise Dropdown Keyboard Engine Hook
 * 
 * Handles ArrowUp / ArrowDown item navigation, cyclic index bounds,
 * Enter selection, Add New shortcut (Shift + +), and auto-scrolls
 * the active highlighted element into visible view.
 */
export function useDropdownKeyboard({
  isOpen,
  setIsOpen,
  itemCount,
  onSelectIndex,
  onAddNew,
  onNextFocus,
  itemSelector = '[data-dropdown-item="true"]',
  autoScroll = true,
}: UseDropdownKeyboardOptions): UseDropdownKeyboardReturn {
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const optionsListRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll highlighted item into view during keyboard navigation
  useEffect(() => {
    if (!isOpen || !autoScroll || !optionsListRef.current) return;
    const container = optionsListRef.current;
    const items = container.querySelectorAll<HTMLElement>(itemSelector);
    const highlightedEl = items[highlightedIndex];

    if (highlightedEl) {
      highlightedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [highlightedIndex, isOpen, autoScroll, itemSelector]);

  const resetHighlight = useCallback(() => {
    setHighlightedIndex(0);
    if (optionsListRef.current) {
      optionsListRef.current.scrollTop = 0;
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      // Shortcut: Shift + + or Shift + = to trigger Add New
      if (e.shiftKey && (e.key === '+' || e.key === '=')) {
        if (onAddNew) {
          e.preventDefault();
          onAddNew();
          return;
        }
      }

      if (isOpen && itemCount > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setHighlightedIndex((prev) => (prev + 1) % itemCount);
          return;
        }

        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setHighlightedIndex((prev) => (prev - 1 + itemCount) % itemCount);
          return;
        }

        if (e.key === 'Enter') {
          e.preventDefault();
          if (onSelectIndex && highlightedIndex >= 0 && highlightedIndex < itemCount) {
            onSelectIndex(highlightedIndex);
          } else if (onAddNew) {
            onAddNew();
          } else {
            setIsOpen(false);
            if (onNextFocus) onNextFocus();
          }
          return;
        }
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (onAddNew) {
          onAddNew();
        } else {
          setIsOpen(false);
          if (onNextFocus) onNextFocus();
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
      }
    },
    [isOpen, itemCount, highlightedIndex, onSelectIndex, onAddNew, onNextFocus, setIsOpen]
  );

  return {
    highlightedIndex,
    setHighlightedIndex,
    handleKeyDown,
    optionsListRef,
    resetHighlight,
  };
}

export default useDropdownKeyboard;
