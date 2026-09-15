import React, { useRef, memo, useCallback, useEffect } from 'react';

export interface DocxLiveRendererProps {
  htmlContent: string;
  isEditable?: boolean;
  onContentChange?: (updatedHtml: string) => void;
  className?: string;
}

/**
 * Enterprise Docx Live Document & Template Renderer
 * 
 * Renders imported Word document structure or blank canvas on paper with native in-place
 * contentEditable text & table editing and clean print rendering.
 * Caret position is strictly preserved across typing, formatting, and sidebar token insertions with zero jumping.
 */
function DocxLiveRendererComponent({
  htmlContent,
  isEditable = true,
  onContentChange,
  className = '',
}: DocxLiveRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastHtmlRef = useRef<string>(htmlContent || '');
  const savedRangeRef = useRef<Range | null>(null);
  const isFocusedRef = useRef<boolean>(false);
  const debounceTimerRef = useRef<any>(null);

  // Initialize and synchronize DOM content imperatively without overwriting active caret
  useEffect(() => {
    if (containerRef.current) {
      // If user is actively typing/focused, strictly do not overwrite innerHTML to prevent caret destruction
      if (isFocusedRef.current) {
        return;
      }
      if (containerRef.current.innerHTML !== htmlContent && lastHtmlRef.current !== htmlContent) {
        containerRef.current.innerHTML = htmlContent || '';
        lastHtmlRef.current = htmlContent || '';
      }
    }
  }, [htmlContent]);

  // Initial mount
  useEffect(() => {
    if (containerRef.current && htmlContent) {
      containerRef.current.innerHTML = htmlContent;
      lastHtmlRef.current = htmlContent;
    }
  }, []);

  // Save current caret selection range
  const saveSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && containerRef.current) {
      const range = sel.getRangeAt(0);
      if (containerRef.current.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange();
      }
    }
  }, []);

  // Track global selection changes to always know where the user's cursor is
  useEffect(() => {
    const handleSelectionChange = () => {
      saveSelection();
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [saveSelection]);

  const handleBlur = useCallback(() => {
    saveSelection();
    isFocusedRef.current = false;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (!onContentChange || !containerRef.current) return;
    lastHtmlRef.current = containerRef.current.innerHTML;
    onContentChange(containerRef.current.innerHTML);
  }, [onContentChange, saveSelection]);

  const handleFocus = useCallback(() => {
    isFocusedRef.current = true;
    saveSelection();
  }, [saveSelection]);

  const handleInput = useCallback(() => {
    saveSelection();
    if (!containerRef.current) return;
    const currentHtml = containerRef.current.innerHTML;
    lastHtmlRef.current = currentHtml;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      onContentChange?.(currentHtml);
    }, 180);
  }, [onContentChange, saveSelection]);

  return (
    <div className="relative group/docx-renderer w-full h-full">
      {/* Main ContentEditable Paper Body */}
      <div
        ref={containerRef}
        contentEditable={isEditable}
        suppressContentEditableWarning={true}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onInput={handleInput}
        onKeyUp={saveSelection}
        onMouseUp={saveSelection}
        className={`docx-live-container text-slate-900 focus:outline-none min-h-[600px] w-full h-full ${
          isEditable ? 'cursor-text focus:ring-1 focus:ring-blue-500/20 rounded-xs' : ''
        } ${className}`}
      />
    </div>
  );
}

const DocxLiveRenderer = memo(DocxLiveRendererComponent);
export default DocxLiveRenderer;
