import React, { useRef, memo } from 'react';

export interface DocxLiveRendererProps {
  htmlContent: string;
  isEditable?: boolean;
  onContentChange?: (updatedHtml: string) => void;
  className?: string;
}

/**
 * Enterprise Docx Live Document & Template Renderer
 * 
 * Renders imported Word document structure on paper canvas with native in-place
 * contentEditable text & table editing, typography styling, and clean print rendering.
 * Wrapped in React.memo for blazing fast multi-page batch rendering.
 */
function DocxLiveRendererComponent({
  htmlContent,
  isEditable = true,
  onContentChange,
  className = '',
}: DocxLiveRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleBlur = () => {
    if (!onContentChange || !containerRef.current) return;
    onContentChange(containerRef.current.innerHTML);
  };

  return (
    <div
      ref={containerRef}
      contentEditable={isEditable}
      suppressContentEditableWarning={true}
      onBlur={handleBlur}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
      className={`docx-live-container text-slate-900 leading-normal focus:outline-none ${
        isEditable ? 'cursor-text focus:ring-1 focus:ring-blue-500/30' : ''
      } ${className}`}
    />
  );
}

const DocxLiveRenderer = memo(DocxLiveRendererComponent);
export default DocxLiveRenderer;
