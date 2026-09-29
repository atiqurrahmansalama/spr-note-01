/**
 * LayoutFragmentRenderer
 *
 * Renders individual layout fragments on a discrete physical page sheet.
 *
 * ARCHITECTURAL INVARIANTS:
 * 1. 100% Read-Only rendering of pre-computed layout fragments.
 * 2. Zero DOM mutations or in-DOM pagination heuristics.
 * 3. Preserves exact element attributes and fragmentation continuation metadata.
 */

import React, { memo } from 'react';
import { LayoutFragment } from '../types/fragmentTypes';

export interface LayoutFragmentRendererProps {
  fragment: LayoutFragment;
  className?: string;
  styles?: string;
}

export const LayoutFragmentRenderer: React.FC<LayoutFragmentRendererProps> = memo(({
  fragment,
  className = '',
}) => {
  if (!fragment) return null;

  const html = fragment.htmlContent || (fragment.textContent ? `<p>${fragment.textContent}</p>` : '');

  return (
    <div
      id={`fragment-${fragment.id}`}
      data-fragment-id={fragment.id}
      data-source-id={fragment.sourceNodeId}
      data-fragment-type={fragment.type}
      className={`docx-layout-fragment docx-fragment-${fragment.type} ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});

LayoutFragmentRenderer.displayName = 'LayoutFragmentRenderer';
