/**
 * CanonicalContentRenderer
 *
 * Renders pure canonical document content (or continuous HTML) in read-only mode.
 *
 * ARCHITECTURAL INVARIANTS:
 * 1. 100% Read-Only rendering of canonical documents or HTML slices.
 * 2. Zero DOM mutations or runtime pagination spacer injection.
 * 3. Supports optional dynamic styling and clean text selection.
 */

import React, { memo, useMemo } from 'react';
import { CanonicalDocument } from '../../model/types';
import { HtmlExporter } from '../../model/serialization/htmlExporter';

export interface CanonicalContentRendererProps {
  content?: string;
  document?: CanonicalDocument;
  styles?: string;
  className?: string;
  pageIndex?: number;
  totalPages?: number;
}

export const CanonicalContentRenderer: React.FC<CanonicalContentRendererProps> = memo(({
  content,
  document,
  styles = '',
  className = '',
}) => {
  const htmlToRender = useMemo(() => {
    if (document) {
      return HtmlExporter.exportToHtml(document);
    }
    return content || '<p><br></p>';
  }, [content, document]);

  return (
    <div className={`canonical-content-renderer w-full text-left select-text ${className}`}>
      {styles && (
        <style
          dangerouslySetInnerHTML={{
            __html: styles.replace(/<\/?style\b[^>]*>/gi, ''),
          }}
        />
      )}
      <div
        className="canonical-html-root select-text"
        dangerouslySetInnerHTML={{ __html: htmlToRender }}
      />
    </div>
  );
});

CanonicalContentRenderer.displayName = 'CanonicalContentRenderer';
