/**
 * PaginatedDocumentEditor
 *
 * Authoritative Single-Host Real Browser Automatic Pagination Document Editor for SPR Note DocLab.
 *
 * Core Principles:
 * 1. Exactly ONE single authoritative editing host (contentEditable="true") for all pages.
 * 2. Visual physical A4/Letter paper cards rendered beneath the continuous editing host.
 * 3. Real DOM measurement algorithm that detects when blocks cross printable page boundaries
 *    and inserts non-canonical runtime page-jump spacers.
 * 4. 100% native browser typing, selection, caret survival, and clipboard flow across all pages.
 * 5. Persistent canonical HTML remains 100% pure and clean of runtime spacers or page shells.
 * 6. Full support for ribbon commands, tokens, headings, lists, tables, images, and undo/redo.
 */

import React, { useRef, useState, useEffect, useCallback, useMemo, memo } from 'react';
import { PageGeometryCalculator, PageGeometry } from '../geometry/PageGeometry';
import { LayoutDocumentOptions } from '../types/documentTypes';
import { separateDocxStylesAndBody } from '../../docxStyleUtils';
import { ParagraphFragmenter } from '../fragmentation/ParagraphFragmenter';
import { TableFragmenter } from '../fragmentation/TableFragmenter';
import { ListFragmenter } from '../fragmentation/ListFragmenter';
import { EditorSerializer } from './EditorSerializer';
import { EditorHistory } from './EditorHistory';
import { EditorCommands } from './EditorCommands';
import { EditorDomAdapter } from './EditorDomAdapter';
import { EditorPositionMapper } from './EditorPositionMapper';
import { EditorTransaction } from './editorTypes';
import { PageBreakIcon } from '../../../ui/Icons';
import {
  RunningHeader,
  RunningFooter,
  WatermarkLayer,
  RuntimeVariableResolver,
} from '../chrome';

export interface PaginatedDocumentEditorProps {
  /** Initial canonical HTML content or template body */
  htmlContent?: string;
  /** Shared document CSS styles */
  styles?: string;
  /** Whether the document is interactively editable */
  isEditable?: boolean;
  /** Callback fired when canonical document content changes */
  onContentChange?: (updatedCanonicalHtml: string) => void;
  /** Layout document options (pageSize, orientation, margin, density, etc.) */
  options?: LayoutDocumentOptions;
  /** Additional container CSS class */
  className?: string;
  /** Current page index if single-page mode */
  pageIndex?: number;
  /** Total pages count */
  totalPages?: number;
  /** Transparent background mode */
  transparentBackground?: boolean;
  /** Add next page callback */
  onAddNextPage?: () => void;
  /** Debug layout inspector flag */
  debugLayout?: boolean;
}

const PAGE_GAP_PX = 32;
const SCREEN_HEADER_HEIGHT_PX = 32;

/**
 * Recombines sibling continuation fragments back into their leading fragment
 * prior to a new measurement pass.
 */
function mergeContinuationFragments(host: HTMLElement): void {
  const continuations = Array.from(
    host.querySelectorAll<HTMLElement>(
      '[data-is-continuation="true"], [data-table-continuation="true"], [data-list-continuation="true"]'
    )
  );

  for (const el of continuations) {
    if (!el.isConnected) continue;

    const sourceId =
      el.getAttribute('data-source-node-id') ||
      el.getAttribute('data-source-id') ||
      el.getAttribute('data-node-id');

    // Strict requirement: MUST have a source identity
    if (!sourceId) {
      continue;
    }

    let prev = el.previousElementSibling as HTMLElement | null;
    while (prev && prev.getAttribute('data-spr-runtime-pagination') === 'true') {
      prev = prev.previousElementSibling as HTMLElement | null;
    }

    if (!prev) {
      continue;
    }

    const prevSourceId =
      prev.getAttribute('data-source-node-id') ||
      prev.getAttribute('data-source-id') ||
      prev.getAttribute('data-node-id') ||
      prev.id;

    const tag = el.tagName.toLowerCase();
    const prevTag = prev.tagName.toLowerCase();

    // Strict requirement: exact source ID match AND matching tag
    const matchesSource = prevSourceId && sourceId === prevSourceId && tag === prevTag;

    if (!matchesSource) {
      // Source identity does not match -> leave continuation untouched
      continue;
    }

    if (tag === 'table') {
      // Table recombination:
      // The continuation table has a repeated <thead> (skip it)
      // and a <tbody> with rows that belong back in prev's <tbody>.
      const prevTbody = prev.querySelector('tbody') || prev;
      const elTbody = el.querySelector('tbody');
      if (elTbody) {
        while (elTbody.firstChild) {
          prevTbody.appendChild(elTbody.firstChild);
        }
      } else {
        const trs = Array.from(el.querySelectorAll('tr'));
        const elThead = el.querySelector('thead');
        const elTheadTrs = elThead ? Array.from(elThead.querySelectorAll('tr')) : [];
        trs.filter((tr) => !elTheadTrs.includes(tr)).forEach((tr) => prevTbody.appendChild(tr));
      }

      const elTfoot = el.querySelector('tfoot');
      if (elTfoot) {
        const prevTfoot = prev.querySelector('tfoot');
        if (prevTfoot) prevTfoot.remove();
        prev.appendChild(elTfoot);
      }

      el.remove();
      prev.removeAttribute('data-is-fragment');
      prev.removeAttribute('data-table-continuation');
      prev.removeAttribute('data-is-continuation');
      prev.removeAttribute('data-fragment-index');
      prev.removeAttribute('data-fragment-total');
    } else if (tag === 'ul' || tag === 'ol') {
      // List recombination:
      // Move all top-level <li> elements from el to prev
      const lis = Array.from(el.querySelectorAll(':scope > li'));
      if (lis.length > 0) {
        lis.forEach((li) => prev.appendChild(li));
      } else {
        while (el.firstChild) {
          prev.appendChild(el.firstChild);
        }
      }

      el.remove();
      prev.removeAttribute('data-is-fragment');
      prev.removeAttribute('data-list-continuation');
      prev.removeAttribute('data-is-continuation');
      prev.removeAttribute('data-fragment-index');
      prev.removeAttribute('data-fragment-total');
    } else {
      // Paragraph or general block:
      while (el.firstChild) {
        prev.appendChild(el.firstChild);
      }
      el.remove();
      prev.removeAttribute('data-is-fragment');
      prev.removeAttribute('data-is-continuation');
      prev.removeAttribute('data-fragment-index');
      prev.removeAttribute('data-fragment-total');
    }
  }
}

/**
 * Measures real browser DOM blocks inside the single contentEditable host
 * and places runtime page-jump spacers so content flows onto sequential physical pages.
 */
export function repaginateHostDOM(
  host: HTMLElement,
  geometry: PageGeometry
): { totalPages: number } {
  if (!host || typeof window === 'undefined') {
    return { totalPages: 1 };
  }

  // 1. Recombine any previous runtime continuation fragments before measuring
  mergeContinuationFragments(host);

  const paperHeight = geometry.paperDimensionsPx.height;
  const marginTop = geometry.marginsPx.top;
  const marginBottom = geometry.marginsPx.bottom;
  const headerHeight = Math.max(0, geometry.headerAreaPx?.height || 0);
  const footerHeight = Math.max(0, geometry.footerAreaPx?.height || 0);
  const availHeight = geometry.availableContentHeightPx || Math.max(120, paperHeight - marginTop - marginBottom - headerHeight - footerHeight);
  const baseJump = marginBottom + footerHeight + PAGE_GAP_PX + SCREEN_HEADER_HEIGHT_PX + marginTop + headerHeight;

  // Clean any leading runtime spacers at the start (page 1 top never needs a runtime spacer)
  let firstChild = host.firstElementChild as HTMLElement | null;
  while (firstChild && firstChild.getAttribute('data-spr-runtime-pagination') === 'true') {
    const next = firstChild.nextElementSibling as HTMLElement | null;
    firstChild.remove();
    firstChild = next;
  }

  let currentPage = 1;
  let currentY = 0;
  let safetyLoop = 0;

  for (let i = 0; i < host.children.length; i++) {
    if (++safetyLoop > 5000) break;

    const child = host.children[i] as HTMLElement;
    if (!child) continue;

    // If child is a runtime spacer we previously created, skip its height accumulation
    if (child.getAttribute('data-spr-runtime-pagination') === 'true') {
      continue;
    }

    // Check if child is an explicit manual page break (Ctrl+Enter) or Section Break
    const isManualBreak =
      child.getAttribute('data-manual-break') === 'true' ||
      child.getAttribute('data-doclab-page-break') === 'true' ||
      child.getAttribute('data-section-break') === 'true' ||
      child.getAttribute('data-doclab-section-break') === 'true' ||
      child.classList.contains('spr-page-break') ||
      child.classList.contains('spr-section-break') ||
      child.classList.contains('docx_page_break') ||
      child.classList.contains('docx-page-break') ||
      child.classList.contains('docx_section_break') ||
      child.classList.contains('docx-section-break') ||
      /page-break-(?:after|before)\s*:\s*always/i.test(child.getAttribute('style') || '') ||
      /break-(?:after|before)\s*:\s*(?:page|section)/i.test(child.getAttribute('style') || '') ||
      child.querySelector?.('[data-manual-break="true"], [data-doclab-page-break="true"], [data-section-break="true"], .spr-page-break, .spr-section-break, .docx_page_break, .docx-page-break, .docx_section_break') !== null;

    if (isManualBreak) {
      const remainingOnPage = Math.max(0, availHeight - currentY);
      const spacerHeight = remainingOnPage + baseJump;

      // Ensure runtime spacer immediately follows the manual page break if more content exists
      const nextSibling = child.nextElementSibling as HTMLElement | null;
      if (nextSibling && nextSibling.getAttribute('data-spr-runtime-pagination') === 'true') {
        nextSibling.style.height = `${spacerHeight}px`;
        // Clean any subsequent duplicate spacers
        let dup = nextSibling.nextElementSibling as HTMLElement | null;
        while (dup && dup.getAttribute('data-spr-runtime-pagination') === 'true') {
          const nextDup = dup.nextElementSibling as HTMLElement | null;
          dup.remove();
          dup = nextDup;
        }
      } else if (nextSibling) {
        const spacer = createRuntimeSpacer(spacerHeight);
        child.parentNode?.insertBefore(spacer, nextSibling);
      }

      currentPage += 1;
      currentY = 0;
      continue;
    }

    // Measure actual rendered block height in the real browser DOM
    const rect = child.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(child);
    const mTop = parseFloat(computedStyle.marginTop) || 0;
    const mBottom = parseFloat(computedStyle.marginBottom) || 0;
    const rawHeight = child.offsetHeight || rect.height;
    const blockHeight = (rawHeight > 0 ? rawHeight : 24) + mTop + mBottom;

    // Check if this block fits on the current page.
    const fitsOnCurrentPage = currentY + blockHeight <= availHeight;

    if (fitsOnCurrentPage) {
      // If we are partway through a page (currentY > 0) or at page 1 top,
      // any preceding runtime spacer is stale and should be removed.
      if (currentY > 0 || currentPage === 1) {
        let prevSibling = child.previousElementSibling as HTMLElement | null;
        while (prevSibling && prevSibling.getAttribute('data-spr-runtime-pagination') === 'true') {
          const prevPrevSibling = prevSibling.previousElementSibling as HTMLElement | null;
          const isPrevManualBreak =
            prevPrevSibling &&
            (prevPrevSibling.getAttribute('data-manual-break') === 'true' ||
              prevPrevSibling.getAttribute('data-doclab-page-break') === 'true' ||
              prevPrevSibling.getAttribute('data-section-break') === 'true' ||
              prevPrevSibling.classList.contains('spr-page-break') ||
              prevPrevSibling.classList.contains('spr-section-break') ||
              prevPrevSibling.classList.contains('docx_page_break') ||
              prevPrevSibling.classList.contains('docx-page-break') ||
              prevPrevSibling.classList.contains('docx_section_break') ||
              /page-break-(?:after|before)\s*:\s*always/i.test(prevPrevSibling.getAttribute('style') || '') ||
              /break-(?:after|before)\s*:\s*(?:page|section)/i.test(prevPrevSibling.getAttribute('style') || '') ||
              prevPrevSibling.querySelector?.('[data-manual-break="true"], [data-doclab-page-break="true"], [data-section-break="true"], .spr-page-break, .spr-section-break, .docx_page_break, .docx-page-break, .docx_section_break') !== null);

          const nextToRemove = prevSibling.previousElementSibling as HTMLElement | null;
          if (!isPrevManualBreak) {
            prevSibling.remove();
            prevSibling = nextToRemove;
          } else {
            break;
          }
        }
      }

      currentY += blockHeight;
    } else {
      // Block overflows current page!
      const tag = child.tagName.toLowerCase();
      const remainingOnPage = Math.max(0, availHeight - currentY);
      let splitSuccess = false;

      // 1. Identify atomic elements (Images, SVG, Figures, Signature blocks, keep-together)
      const isAtomic =
        tag === 'img' ||
        tag === 'svg' ||
        tag === 'figure' ||
        child.classList.contains('print-image-container') ||
        child.classList.contains('print-signature-block') ||
        child.classList.contains('print-signature-footer-container') ||
        child.classList.contains('print-avoid-break') ||
        child.classList.contains('keep-together') ||
        child.getAttribute('data-atomic') === 'true' ||
        /page-break-inside\s*:\s*avoid/i.test(child.getAttribute('style') || '') ||
        (tag === 'p' &&
          child.children.length === 1 &&
          (child.children[0].tagName.toLowerCase() === 'img' ||
            child.children[0].tagName.toLowerCase() === 'svg' ||
            child.children[0].tagName.toLowerCase() === 'figure'));

      if (isAtomic) {
        // Atomic block: never split, push whole block to next page if currentY > 0
        if (currentY > 0) {
          const spacerHeight = remainingOnPage + baseJump;
          const prevSibling = child.previousElementSibling as HTMLElement | null;
          if (prevSibling && prevSibling.getAttribute('data-spr-runtime-pagination') === 'true') {
            prevSibling.style.height = `${spacerHeight}px`;
            let dup = prevSibling.previousElementSibling as HTMLElement | null;
            while (dup && dup.getAttribute('data-spr-runtime-pagination') === 'true') {
              const nextDup = dup.previousElementSibling as HTMLElement | null;
              dup.remove();
              dup = nextDup;
            }
          } else {
            const spacer = createRuntimeSpacer(spacerHeight);
            child.parentNode?.insertBefore(spacer, child);
          }

          currentPage += 1;
          i += 1; // Advance past spacer

          if (blockHeight > availHeight) {
            const pagesSpanned = Math.max(1, Math.ceil(blockHeight / availHeight));
            currentPage += (pagesSpanned - 1);
            const nextSibling = child.nextElementSibling as HTMLElement | null;
            if (nextSibling) {
              const remainingOnLastPage = (pagesSpanned * availHeight) - blockHeight;
              const afterSpacerHeight = remainingOnLastPage + (pagesSpanned * baseJump);
              if (nextSibling.getAttribute('data-spr-runtime-pagination') === 'true') {
                nextSibling.style.height = `${afterSpacerHeight}px`;
                let dup = nextSibling.nextElementSibling as HTMLElement | null;
                while (dup && dup.getAttribute('data-spr-runtime-pagination') === 'true') {
                  const nextDup = dup.nextElementSibling as HTMLElement | null;
                  dup.remove();
                  dup = nextDup;
                }
              } else {
                const afterSpacer = createRuntimeSpacer(afterSpacerHeight);
                child.parentNode?.insertBefore(afterSpacer, nextSibling);
              }
              currentPage += 1;
              currentY = 0;
            } else {
              currentY = blockHeight - ((pagesSpanned - 1) * availHeight);
            }
          } else {
            currentY = blockHeight;
          }
          splitSuccess = true;
        } else {
          // currentY === 0: atomic block starts at top of page
          if (blockHeight > availHeight) {
            const pagesSpanned = Math.max(1, Math.ceil(blockHeight / availHeight));
            currentPage += (pagesSpanned - 1);
            const nextSibling = child.nextElementSibling as HTMLElement | null;
            if (nextSibling) {
              const remainingOnLastPage = (pagesSpanned * availHeight) - blockHeight;
              const afterSpacerHeight = remainingOnLastPage + (pagesSpanned * baseJump);
              if (nextSibling.getAttribute('data-spr-runtime-pagination') === 'true') {
                nextSibling.style.height = `${afterSpacerHeight}px`;
                let dup = nextSibling.nextElementSibling as HTMLElement | null;
                while (dup && dup.getAttribute('data-spr-runtime-pagination') === 'true') {
                  const nextDup = dup.nextElementSibling as HTMLElement | null;
                  dup.remove();
                  dup = nextDup;
                }
              } else {
                const afterSpacer = createRuntimeSpacer(afterSpacerHeight);
                child.parentNode?.insertBefore(afterSpacer, nextSibling);
              }
              currentPage += 1;
              currentY = 0;
            } else {
              currentY = blockHeight - ((pagesSpanned - 1) * availHeight);
            }
          } else {
            currentY = blockHeight;
          }
          splitSuccess = true;
        }
      } else if (tag === 'table') {
        // 2. Table fragmentation: split at row boundaries, repeat <thead> on continuation
        const targetHeight = currentY === 0 ? availHeight : Math.max(20, remainingOnPage - mTop - mBottom);
        const splitRes = TableFragmenter.splitTable(child, targetHeight);

        if (
          splitRes.isSplit &&
          splitRes.firstFragmentHtml &&
          splitRes.remainingFragmentHtml &&
          splitRes.rowsOnFirstPage > 0
        ) {
          const temp1 = document.createElement('div');
          temp1.innerHTML = splitRes.firstFragmentHtml;
          const firstEl = (temp1.querySelector('table') || temp1.firstElementChild) as HTMLElement | null;

          const temp2 = document.createElement('div');
          temp2.innerHTML = splitRes.remainingFragmentHtml;
          const contEl = (temp2.querySelector('table') || temp2.firstElementChild) as HTMLElement | null;

          if (firstEl && contEl) {
            const sourceId =
              child.getAttribute('data-source-node-id') ||
              child.getAttribute('data-source-id') ||
              child.id ||
              `table_${Date.now()}_${i}`;

            child.setAttribute('data-source-node-id', sourceId);
            child.setAttribute('data-source-id', sourceId);
            child.setAttribute('data-is-fragment', 'true');

            contEl.setAttribute('data-source-node-id', sourceId);
            contEl.setAttribute('data-source-id', sourceId);
            contEl.setAttribute('data-is-continuation', 'true');
            contEl.setAttribute('data-table-continuation', 'true');

            // Apply first fragment in-place to child
            child.innerHTML = firstEl.innerHTML;
            Array.from(firstEl.attributes).forEach((attr) => {
              child.setAttribute(attr.name, attr.value);
            });

            // Clean any stale spacer before child if currentY > 0 or page 1
            if (currentY > 0 || currentPage === 1) {
              let prevSibling = child.previousElementSibling as HTMLElement | null;
              while (prevSibling && prevSibling.getAttribute('data-spr-runtime-pagination') === 'true') {
                const prevPrevSibling = prevSibling.previousElementSibling as HTMLElement | null;
                const isPrevManualBreak =
                  prevPrevSibling &&
                  (prevPrevSibling.getAttribute('data-manual-break') === 'true' ||
                    prevPrevSibling.classList.contains('spr-page-break') ||
                    prevPrevSibling.querySelector?.('[data-manual-break="true"], .spr-page-break') !== null);

                const nextToRemove = prevSibling.previousElementSibling as HTMLElement | null;
                if (!isPrevManualBreak) {
                  prevSibling.remove();
                  prevSibling = nextToRemove;
                } else {
                  break;
                }
              }
            }

            // Calculate exact spacer height after first table slice
            const firstMeasuredHeight = child.offsetHeight || splitRes.firstFragmentHeight;
            const remainingAfterFirst = Math.max(0, availHeight - (currentY + firstMeasuredHeight + mTop + mBottom));
            const spacerHeight = remainingAfterFirst + baseJump;
            const spacer = createRuntimeSpacer(spacerHeight);

            // Insert spacer and continuation table after child
            child.parentNode?.insertBefore(spacer, child.nextSibling);
            child.parentNode?.insertBefore(contEl, spacer.nextSibling);

            currentPage += 1;
            currentY = 0;
            i += 1; // Advance loop index to spacer so next iteration visits contEl
            splitSuccess = true;
          }
        }
      } else if (tag === 'ul' || tag === 'ol') {
        // 3. List fragmentation: split between <li> items, preserve numbering & bullets
        const targetHeight = currentY === 0 ? availHeight : Math.max(20, remainingOnPage - mTop - mBottom);
        const splitRes = ListFragmenter.splitList(child, targetHeight);

        if (
          splitRes.isSplit &&
          splitRes.firstFragmentHtml &&
          splitRes.remainingFragmentHtml &&
          splitRes.itemsOnFirstPage > 0
        ) {
          const temp1 = document.createElement('div');
          temp1.innerHTML = splitRes.firstFragmentHtml;
          const firstEl = temp1.firstElementChild as HTMLElement | null;

          const temp2 = document.createElement('div');
          temp2.innerHTML = splitRes.remainingFragmentHtml;
          const contEl = temp2.firstElementChild as HTMLElement | null;

          if (firstEl && contEl) {
            const sourceId =
              child.getAttribute('data-source-node-id') ||
              child.getAttribute('data-source-id') ||
              child.id ||
              `list_${Date.now()}_${i}`;

            child.setAttribute('data-source-node-id', sourceId);
            child.setAttribute('data-source-id', sourceId);
            child.setAttribute('data-is-fragment', 'true');

            contEl.setAttribute('data-source-node-id', sourceId);
            contEl.setAttribute('data-source-id', sourceId);
            contEl.setAttribute('data-is-continuation', 'true');
            contEl.setAttribute('data-list-continuation', 'true');

            // Apply first fragment in-place to child
            child.innerHTML = firstEl.innerHTML;
            Array.from(firstEl.attributes).forEach((attr) => {
              child.setAttribute(attr.name, attr.value);
            });

            // Clean any stale spacer before child if currentY > 0 or page 1
            if (currentY > 0 || currentPage === 1) {
              let prevSibling = child.previousElementSibling as HTMLElement | null;
              while (prevSibling && prevSibling.getAttribute('data-spr-runtime-pagination') === 'true') {
                const prevPrevSibling = prevSibling.previousElementSibling as HTMLElement | null;
                const isPrevManualBreak =
                  prevPrevSibling &&
                  (prevPrevSibling.getAttribute('data-manual-break') === 'true' ||
                    prevPrevSibling.classList.contains('spr-page-break') ||
                    prevPrevSibling.querySelector?.('[data-manual-break="true"], .spr-page-break') !== null);

                const nextToRemove = prevSibling.previousElementSibling as HTMLElement | null;
                if (!isPrevManualBreak) {
                  prevSibling.remove();
                  prevSibling = nextToRemove;
                } else {
                  break;
                }
              }
            }

            // Calculate exact spacer height after first list slice
            const firstMeasuredHeight = child.offsetHeight || splitRes.firstFragmentHeight;
            const remainingAfterFirst = Math.max(0, availHeight - (currentY + firstMeasuredHeight + mTop + mBottom));
            const spacerHeight = remainingAfterFirst + baseJump;
            const spacer = createRuntimeSpacer(spacerHeight);

            // Insert spacer and continuation list after child
            child.parentNode?.insertBefore(spacer, child.nextSibling);
            child.parentNode?.insertBefore(contEl, spacer.nextSibling);

            currentPage += 1;
            currentY = 0;
            i += 1; // Advance past spacer
            splitSuccess = true;
          }
        }
      } else {
        // 4. Paragraph / Heading / Div line-level fragmentation
        const isSplittable =
          ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div'].includes(tag) &&
          !child.querySelector('table, img, svg, figure, .print-signature-block');

        if (isSplittable && (remainingOnPage >= 24 || currentY === 0)) {
          const targetHeight = currentY === 0 ? availHeight : Math.max(20, remainingOnPage - mTop - mBottom);
          const splitRes = ParagraphFragmenter.splitParagraph(child, targetHeight);

          if (splitRes.isSplit && splitRes.firstFragmentHtml && splitRes.remainingFragmentHtml) {
            const temp1 = document.createElement('div');
            temp1.innerHTML = splitRes.firstFragmentHtml;
            const firstEl = temp1.firstElementChild as HTMLElement | null;

            const temp2 = document.createElement('div');
            temp2.innerHTML = splitRes.remainingFragmentHtml;
            const contEl = temp2.firstElementChild as HTMLElement | null;

            if (firstEl && contEl) {
              const sourceId =
                child.getAttribute('data-source-node-id') ||
                child.getAttribute('data-source-id') ||
                child.getAttribute('data-node-id') ||
                (child.id && !child.id.startsWith('fragment-') ? child.id : null) ||
                firstEl.getAttribute('data-source-node-id') ||
                firstEl.getAttribute('data-source-id') ||
                `p_${Date.now()}_${i}`;

              const isAlreadyContinuation = child.getAttribute('data-is-continuation') === 'true';

              // Apply first fragment in-place to child
              child.innerHTML = firstEl.innerHTML;
              Array.from(firstEl.attributes).forEach((attr) => {
                child.setAttribute(attr.name, attr.value);
              });
              child.setAttribute('data-source-node-id', sourceId);
              child.setAttribute('data-source-id', sourceId);
              child.setAttribute('data-is-fragment', 'true');
              if (isAlreadyContinuation) {
                child.setAttribute('data-is-continuation', 'true');
              } else {
                child.removeAttribute('data-is-continuation');
              }

              contEl.setAttribute('data-source-node-id', sourceId);
              contEl.setAttribute('data-source-id', sourceId);
              contEl.setAttribute('data-is-fragment', 'true');
              contEl.setAttribute('data-is-continuation', 'true');

              // Clean any stale spacer before child if currentY > 0 or page 1
              if (currentY > 0 || currentPage === 1) {
                let prevSibling = child.previousElementSibling as HTMLElement | null;
                while (prevSibling && prevSibling.getAttribute('data-spr-runtime-pagination') === 'true') {
                  const prevPrevSibling = prevSibling.previousElementSibling as HTMLElement | null;
                  const isPrevManualBreak =
                    prevPrevSibling &&
                    (prevPrevSibling.getAttribute('data-manual-break') === 'true' ||
                      prevPrevSibling.getAttribute('data-doclab-page-break') === 'true' ||
                      prevPrevSibling.getAttribute('data-section-break') === 'true' ||
                      prevPrevSibling.classList.contains('spr-page-break') ||
                      prevPrevSibling.classList.contains('spr-section-break') ||
                      prevPrevSibling.querySelector?.('[data-manual-break="true"], [data-doclab-page-break="true"], [data-section-break="true"], .spr-page-break, .spr-section-break') !== null);

                  const nextToRemove = prevSibling.previousElementSibling as HTMLElement | null;
                  if (!isPrevManualBreak) {
                    prevSibling.remove();
                    prevSibling = nextToRemove;
                  } else {
                    break;
                  }
                }
              }

              // Calculate exact spacer height after first fragment
              const firstMeasuredHeight = child.offsetHeight || splitRes.firstFragmentHeight;
              const remainingAfterFirst = Math.max(0, availHeight - (currentY + firstMeasuredHeight + mTop + mBottom));
              const spacerHeight = remainingAfterFirst + baseJump;
              const spacer = createRuntimeSpacer(spacerHeight);

              // Insert spacer and continuation element after child
              child.parentNode?.insertBefore(spacer, child.nextSibling);
              child.parentNode?.insertBefore(contEl, spacer.nextSibling);

              currentPage += 1;
              currentY = 0;
              i += 1; // Advance loop index to spacer so next iteration visits contEl
              splitSuccess = true;
            }
          }
        }
      }

      if (!splitSuccess) {
        // Fallback for atomic blocks / blocks where split couldn't fit: push whole block to next page
        if (currentY > 0) {
          const spacerHeight = remainingOnPage + baseJump;

          const prevSibling = child.previousElementSibling as HTMLElement | null;
          if (prevSibling && prevSibling.getAttribute('data-spr-runtime-pagination') === 'true') {
            prevSibling.style.height = `${spacerHeight}px`;
            let dup = prevSibling.previousElementSibling as HTMLElement | null;
            while (dup && dup.getAttribute('data-spr-runtime-pagination') === 'true') {
              const nextDup = dup.previousElementSibling as HTMLElement | null;
              dup.remove();
              dup = nextDup;
            }
          } else {
            const spacer = createRuntimeSpacer(spacerHeight);
            child.parentNode?.insertBefore(spacer, child);
          }

          currentPage += 1;
          i += 1; // Advance past spacer

          if (blockHeight > availHeight) {
            const pagesSpanned = Math.max(1, Math.ceil(blockHeight / availHeight));
            currentPage += (pagesSpanned - 1);
            const nextSibling = child.nextElementSibling as HTMLElement | null;
            if (nextSibling) {
              const remainingOnLastPage = (pagesSpanned * availHeight) - blockHeight;
              const afterSpacerHeight = remainingOnLastPage + (pagesSpanned * baseJump);
              if (nextSibling.getAttribute('data-spr-runtime-pagination') === 'true') {
                nextSibling.style.height = `${afterSpacerHeight}px`;
                let dup = nextSibling.nextElementSibling as HTMLElement | null;
                while (dup && dup.getAttribute('data-spr-runtime-pagination') === 'true') {
                  const nextDup = dup.nextElementSibling as HTMLElement | null;
                  dup.remove();
                  dup = nextDup;
                }
              } else {
                const afterSpacer = createRuntimeSpacer(afterSpacerHeight);
                child.parentNode?.insertBefore(afterSpacer, nextSibling);
              }
              currentPage += 1;
              currentY = 0;
            } else {
              currentY = blockHeight - ((pagesSpanned - 1) * availHeight);
            }
          } else {
            currentY = blockHeight;
          }
        } else {
          // currentY === 0: atomic oversized block starting at page top
          if (blockHeight > availHeight) {
            const pagesSpanned = Math.max(1, Math.ceil(blockHeight / availHeight));
            currentPage += (pagesSpanned - 1);
            const nextSibling = child.nextElementSibling as HTMLElement | null;
            if (nextSibling) {
              const remainingOnLastPage = (pagesSpanned * availHeight) - blockHeight;
              const afterSpacerHeight = remainingOnLastPage + (pagesSpanned * baseJump);
              if (nextSibling.getAttribute('data-spr-runtime-pagination') === 'true') {
                nextSibling.style.height = `${afterSpacerHeight}px`;
                let dup = nextSibling.nextElementSibling as HTMLElement | null;
                while (dup && dup.getAttribute('data-spr-runtime-pagination') === 'true') {
                  const nextDup = dup.nextElementSibling as HTMLElement | null;
                  dup.remove();
                  dup = nextDup;
                }
              } else {
                const afterSpacer = createRuntimeSpacer(afterSpacerHeight);
                child.parentNode?.insertBefore(afterSpacer, nextSibling);
              }
              currentPage += 1;
              currentY = 0;
            } else {
              currentY = blockHeight - ((pagesSpanned - 1) * availHeight);
            }
          } else {
            currentY = blockHeight;
          }
        }
      }
    }
  }

  // Remove any trailing spacers at the very end of host
  let lastChild = host.lastElementChild as HTMLElement | null;
  while (lastChild && lastChild.getAttribute('data-spr-runtime-pagination') === 'true') {
    const prev = lastChild.previousElementSibling as HTMLElement | null;
    lastChild.remove();
    lastChild = prev;
  }

  return { totalPages: Math.max(1, currentPage) };
}

export function createRuntimeSpacer(heightPx: number): HTMLElement {
  const spacer = document.createElement('div');
  spacer.setAttribute('data-spr-runtime-pagination', 'true');
  spacer.setAttribute('contenteditable', 'false');
  spacer.className = 'spr-runtime-page-spacer select-none pointer-events-none print:hidden';
  spacer.style.height = `${Math.max(0, heightPx)}px`;
  spacer.style.width = '100%';
  spacer.style.display = 'block';
  spacer.style.userSelect = 'none';
  spacer.style.pointerEvents = 'none';
  spacer.style.margin = '0';
  spacer.style.padding = '0';
  return spacer;
}

export const PaginatedDocumentEditorComponent: React.FC<PaginatedDocumentEditorProps> = ({
  htmlContent = '<p><br></p>',
  styles = '',
  isEditable = true,
  onContentChange,
  options = {},
  className = '',
}) => {
  // Authoritative logical editing host ref
  const editorHostRef = useRef<HTMLDivElement>(null);
  const isInternalChangeRef = useRef<boolean>(false);
  const isFocusedRef = useRef<boolean>(false);
  const isComposingRef = useRef<boolean>(false);
  const debounceTimerRef = useRef<any>(null);
  const repaginateTimerRef = useRef<any>(null);
  const lastExportedHtmlRef = useRef<string | null>(null);
  const savedSelectionBookmarkRef = useRef<any>(null);

  // Total pages derived from real DOM geometry
  const [totalPagesCount, setTotalPagesCount] = useState<number>(1);

  // 1. Separate styles and clean canonical body
  const { styles: extractedStyles, body: extractedBody } = useMemo(() => {
    return separateDocxStylesAndBody(htmlContent || '');
  }, [htmlContent]);

  const cleanCanonicalBody = useMemo(() => {
    const raw = extractedBody && extractedBody.trim() ? extractedBody : '<p><br></p>';
    return EditorSerializer.sanitize(raw);
  }, [extractedBody]);

  const activeStyles = useMemo(() => {
    const raw = styles || extractedStyles || '';
    return raw.replace(/<\/?style\b[^>]*>/gi, '').trim();
  }, [styles, extractedStyles]);

  // History Manager
  const historyRef = useRef<EditorHistory>(new EditorHistory(cleanCanonicalBody));

  // Page geometry from centralized PageGeometryCalculator
  const pageGeometry = useMemo(() => {
    return PageGeometryCalculator.calculate({
      pageSize: options.pageSize || 'A4',
      orientation: options.orientation || 'PORTRAIT',
      margin: options.margin || 'NORMAL',
      customMarginsMm: options.customMarginsMm,
      pageProperties: options.pageProperties,
      density: options.density || 'NORMAL',
    });
  }, [
    options.pageSize,
    options.orientation,
    options.margin,
    options.customMarginsMm,
    options.pageProperties,
    options.density,
  ]);

  // Save current logical selection bookmark
  const saveSelection = useCallback(() => {
    if (!editorHostRef.current) return;
    try {
      const bookmark = EditorPositionMapper.captureLogicalSelection(editorHostRef.current);
      if (bookmark) {
        savedSelectionBookmarkRef.current = bookmark;
      }
    } catch {
      // ignore
    }
  }, []);

  // Real DOM Pagination trigger
  const runPaginationPass = useCallback(() => {
    if (!editorHostRef.current) return;
    // LIVE TYPING / IME GUARD: Never mutate DOM while user is composing
    if (isComposingRef.current) {
      return;
    }

    try {
      const host = editorHostRef.current;
      const hasFocus =
        typeof document !== 'undefined' &&
        (document.activeElement === host || host.contains(document.activeElement));

      // Selection safety check: ensure selection is valid and strictly inside host before capturing
      let savedSel: any = null;
      if (hasFocus) {
        try {
          const sel = typeof window !== 'undefined' ? window.getSelection() : null;
          if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            if (host.contains(range.startContainer) && host.contains(range.endContainer)) {
              savedSel = EditorPositionMapper.captureLogicalSelection(host);
            }
          }
        } catch {
          savedSel = null;
        }
      } else {
        savedSel = savedSelectionBookmarkRef.current;
      }

      const res = repaginateHostDOM(host, pageGeometry);
      setTotalPagesCount(res.totalPages);

      if (hasFocus && savedSel) {
        try {
          EditorPositionMapper.restoreLogicalSelection(host, savedSel);
        } catch (selErr) {
          // Selection restoration exception must never crash or block input
          console.warn('Selection restoration warning:', selErr);
        }
      }
    } catch (e) {
      console.warn('Pagination calculation error:', e);
    }
  }, [pageGeometry]);

  const schedulePaginationPass = useCallback(() => {
    // If actively composing, defer DOM pagination until compositionend
    if (isComposingRef.current) {
      return;
    }
    if (repaginateTimerRef.current) {
      clearTimeout(repaginateTimerRef.current);
    }
    repaginateTimerRef.current = setTimeout(() => {
      runPaginationPass();
    }, 40);
  }, [runPaginationPass]);

  // Centralized Transaction Dispatcher
  const dispatchTransaction = useCallback(
    (tx: EditorTransaction) => {
      isInternalChangeRef.current = true;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      const cleanHtml = EditorSerializer.sanitize(tx.canonicalHtml);
      historyRef.current.push(tx);
      lastExportedHtmlRef.current = cleanHtml;

      const finalExportHtml = activeStyles
        ? `<style>${activeStyles}</style>\n${cleanHtml}`
        : cleanHtml;

      onContentChange?.(finalExportHtml);
      schedulePaginationPass();
    },
    [activeStyles, onContentChange, schedulePaginationPass]
  );

  // Synchronize incoming canonical HTML content into authoritative single host on mount & external changes
  useEffect(() => {
    if (!editorHostRef.current) return;
    // If this change was triggered internally by user typing/IME in this component, skip overwriting
    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      return;
    }

    const currentHostSanitized = EditorSerializer.sanitize(editorHostRef.current.innerHTML);
    if (currentHostSanitized !== cleanCanonicalBody) {
      editorHostRef.current.innerHTML = cleanCanonicalBody;
      historyRef.current = new EditorHistory(cleanCanonicalBody);
      lastExportedHtmlRef.current = cleanCanonicalBody;
      runPaginationPass();
    }
  }, [cleanCanonicalBody, runPaginationPass]);

  // Composition Lifecycle Event Handlers (IME / CJK / Accents / Live Typing Safety)
  const handleCompositionStart = useCallback((e: React.CompositionEvent<HTMLDivElement>) => {
    isComposingRef.current = true;
    if (repaginateTimerRef.current) {
      clearTimeout(repaginateTimerRef.current);
      repaginateTimerRef.current = null;
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  const handleCompositionUpdate = useCallback((e: React.CompositionEvent<HTMLDivElement>) => {
    isComposingRef.current = true;
  }, []);

  const handleCompositionEnd = useCallback((e: React.CompositionEvent<HTMLDivElement>) => {
    isComposingRef.current = false;
    // Single controlled debounced pagination and synchronization pass after composition completes
    saveSelection();
    schedulePaginationPass();

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      if (!editorHostRef.current || isComposingRef.current) return;
      try {
        const rawDom = editorHostRef.current.innerHTML;
        const cleanHtml = EditorSerializer.sanitize(rawDom);
        const doc = EditorSerializer.toCanonicalDocument(cleanHtml);

        dispatchTransaction({
          doc,
          canonicalHtml: cleanHtml,
          origin: 'typing',
          timestamp: Date.now(),
          description: 'Composition input',
        });
      } catch (err) {
        console.warn('Composition commit error:', err);
      }
    }, 150);
  }, [saveSelection, schedulePaginationPass, dispatchTransaction]);

  // Focus & Blur Handlers
  const handleFocus = useCallback(() => {
    if (!isEditable) return;
    isFocusedRef.current = true;
    saveSelection();
  }, [isEditable, saveSelection]);

  const handleBlur = useCallback(() => {
    if (!isEditable || !editorHostRef.current) return;
    isFocusedRef.current = false;
    saveSelection();

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const currentRaw = editorHostRef.current.innerHTML;
    const cleanHtml = EditorSerializer.sanitize(currentRaw);
    lastExportedHtmlRef.current = cleanHtml;

    const finalExportHtml = activeStyles
      ? `<style>${activeStyles}</style>\n${cleanHtml}`
      : cleanHtml;

    onContentChange?.(finalExportHtml);
    runPaginationPass();
  }, [isEditable, saveSelection, activeStyles, onContentChange, runPaginationPass]);

  // Native Input Handler with Immediate and Debounced Synchronization
  const handleInput = useCallback(() => {
    if (!isEditable || !editorHostRef.current) return;
    isInternalChangeRef.current = true;

    // During active IME composition, defer pagination and synchronization until compositionend
    if (isComposingRef.current) {
      return;
    }

    saveSelection();

    // Trigger immediate micro-pass for fast visual feedback
    schedulePaginationPass();

    // Instant zero-delay export on every keystroke (0ms latency for crash/reload resilience)
    try {
      const rawDom = editorHostRef.current.innerHTML;
      const cleanHtml = EditorSerializer.sanitize(rawDom);
      lastExportedHtmlRef.current = cleanHtml;
      const finalExportHtml = activeStyles
        ? `<style>${activeStyles}</style>\n${cleanHtml}`
        : cleanHtml;
      onContentChange?.(finalExportHtml);
    } catch (e) {
      console.warn('Immediate content sync error:', e);
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (!editorHostRef.current || isComposingRef.current) return;
      try {
        const rawDom = editorHostRef.current.innerHTML;
        const cleanHtml = EditorSerializer.sanitize(rawDom);
        const doc = EditorSerializer.toCanonicalDocument(cleanHtml);

        dispatchTransaction({
          doc,
          canonicalHtml: cleanHtml,
          origin: 'typing',
          timestamp: Date.now(),
          description: 'Typing input',
        });
      } catch (err) {
        console.warn('Typing input transaction error:', err);
      }
    }, 150);
  }, [isEditable, saveSelection, schedulePaginationPass, activeStyles, onContentChange, dispatchTransaction]);

  // Flush any pending changes synchronously before window unloads
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!editorHostRef.current) return;
      try {
        const rawDom = editorHostRef.current.innerHTML;
        const cleanHtml = EditorSerializer.sanitize(rawDom);
        const finalExportHtml = activeStyles
          ? `<style>${activeStyles}</style>\n${cleanHtml}`
          : cleanHtml;
        onContentChange?.(finalExportHtml);
      } catch {}
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      }
    };
  }, [activeStyles, onContentChange]);

  // Native Keydown Handler (Enter, Ctrl+Enter, Ctrl+Z, Ctrl+Y, Tab)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!isEditable || !editorHostRef.current) return;

      // Do not interfere with native IME composition key events
      if (e.nativeEvent.isComposing || isComposingRef.current) {
        return;
      }

      // Ctrl+Enter or Cmd+Enter: Insert explicit manual page break
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        e.stopPropagation();
        const tx = EditorCommands.insertManualPageBreak(editorHostRef.current);
        dispatchTransaction(tx);
        return;
      }

      // Enter (normal): Split block or create logical paragraph
      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        const tx = EditorCommands.insertParagraph(editorHostRef.current);
        dispatchTransaction(tx);
        return;
      }

      // Ctrl+Z: Undo
      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        const prevHtml = historyRef.current.undo();
        if (prevHtml !== null && editorHostRef.current) {
          editorHostRef.current.innerHTML = prevHtml;
          isInternalChangeRef.current = true;
          lastExportedHtmlRef.current = prevHtml;
          onContentChange?.(activeStyles ? `<style>${activeStyles}</style>\n${prevHtml}` : prevHtml);
          schedulePaginationPass();
        }
        return;
      }

      // Ctrl+Y or Ctrl+Shift+Z: Redo
      if (
        (e.key === 'y' && (e.ctrlKey || e.metaKey)) ||
        (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)
      ) {
        e.preventDefault();
        e.stopPropagation();
        const nextHtml = historyRef.current.redo();
        if (nextHtml !== null && editorHostRef.current) {
          editorHostRef.current.innerHTML = nextHtml;
          isInternalChangeRef.current = true;
          lastExportedHtmlRef.current = nextHtml;
          onContentChange?.(activeStyles ? `<style>${activeStyles}</style>\n${nextHtml}` : nextHtml);
          schedulePaginationPass();
        }
        return;
      }

      // Tab key: Indent
      if (e.key === 'Tab') {
        e.preventDefault();
        EditorDomAdapter.insertTextAtSelection(editorHostRef.current, '    ');
        handleInput();
      }
    },
    [isEditable, dispatchTransaction, onContentChange, activeStyles, schedulePaginationPass, handleInput]
  );

  // Paste Handler
  const handlePaste = useCallback(() => {
    if (isComposingRef.current) return;
    saveSelection();
    setTimeout(() => {
      handleInput();
      runPaginationPass();
    }, 10);
  }, [saveSelection, handleInput, runPaginationPass]);

  // Click on empty canvas margin to focus editor at end without collapsing selection
  const handleSheetClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isEditable || !editorHostRef.current) return;

      const sel = typeof window !== 'undefined' ? window.getSelection() : null;
      if (sel && !sel.isCollapsed) return;

      const target = e.target as HTMLElement;
      if (target !== editorHostRef.current && editorHostRef.current.contains(target)) {
        saveSelection();
        return;
      }

      // If clicked on empty sheet padding/margin:
      try {
        editorHostRef.current.focus({ preventScroll: true });
        const leafElements = Array.from(
          editorHostRef.current.querySelectorAll('p, td, th, div.docx_p, h1, h2, h3, h4, h5, h6, li')
        ) as HTMLElement[];

        if (leafElements.length === 0) {
          const p = document.createElement('p');
          p.innerHTML = '<br>';
          editorHostRef.current.appendChild(p);
          const range = document.createRange();
          range.setStart(p, 0);
          range.collapse(true);
          sel?.removeAllRanges();
          sel?.addRange(range);
          saveSelection();
          return;
        }

        const lastEl = leafElements[leafElements.length - 1];
        const range = document.createRange();
        range.selectNodeContents(lastEl);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
        saveSelection();
      } catch (err) {
        console.warn('Click focus error', err);
      }
    },
    [isEditable, saveSelection]
  );

  // Insert Manual Page Break Handler
  const handleManualPageBreak = useCallback(() => {
    if (!editorHostRef.current) return;
    const tx = EditorCommands.insertManualPageBreak(editorHostRef.current);
    dispatchTransaction(tx);
  }, [dispatchTransaction]);

  // Global Command Listener (for Formatting Ribbon, Sidebar, and Shortcuts)
  useEffect(() => {
    const handleCommandEvent = (e: CustomEvent) => {
      if (!isEditable || !editorHostRef.current) return;
      const { command, value, options: cmdOpts } = e.detail || {};

      switch (command) {
        case 'bold':
        case 'italic':
        case 'underline':
        case 'strike':
        case 'code':
        case 'color':
        case 'backgroundColor':
        case 'fontSize':
        case 'fontFamily': {
          const tx = EditorCommands.applyMark(editorHostRef.current, command, value);
          dispatchTransaction(tx);
          break;
        }
        case 'heading': {
          const targetTag = (`h${value || 1}`) as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
          const tx = EditorCommands.toggleBlockType(editorHostRef.current, targetTag);
          dispatchTransaction(tx);
          break;
        }
        case 'paragraph': {
          const tx = EditorCommands.toggleBlockType(editorHostRef.current, 'p');
          dispatchTransaction(tx);
          break;
        }
        case 'unordered-list':
        case 'bullet-list': {
          const tx = EditorCommands.toggleBlockType(editorHostRef.current, 'ul');
          dispatchTransaction(tx);
          break;
        }
        case 'ordered-list': {
          const tx = EditorCommands.toggleBlockType(editorHostRef.current, 'ol');
          dispatchTransaction(tx);
          break;
        }
        case 'align':
        case 'justifyLeft':
        case 'justifyCenter':
        case 'justifyRight':
        case 'justifyFull': {
          const alignMap: Record<string, any> = {
            justifyLeft: 'left',
            justifyCenter: 'center',
            justifyRight: 'right',
            justifyFull: 'justify',
            left: 'left',
            center: 'center',
            right: 'right',
            justify: 'justify',
          };
          const alignVal = alignMap[command] || alignMap[value] || 'left';
          const tx = EditorCommands.setAlignment(editorHostRef.current, alignVal);
          dispatchTransaction(tx);
          break;
        }
        case 'insertTable': {
          const tx = EditorCommands.insertTable(editorHostRef.current, cmdOpts?.rows || 3, cmdOpts?.cols || 3);
          dispatchTransaction(tx);
          break;
        }
        case 'insertImage': {
          const tx = EditorCommands.insertImage(editorHostRef.current, { src: value, ...cmdOpts });
          dispatchTransaction(tx);
          break;
        }
        case 'insertSvg': {
          const tx = EditorCommands.insertSvg(editorHostRef.current, value);
          dispatchTransaction(tx);
          break;
        }
        case 'insertToken': {
          const tokenPayload =
            typeof value === 'object' && value !== null
              ? value
              : {
                  key: typeof value === 'string' ? value : cmdOpts?.key || '',
                  ...cmdOpts,
                };
          const tx = EditorCommands.insertToken(editorHostRef.current, tokenPayload);
          dispatchTransaction(tx);
          break;
        }
        case 'insertPageBreak': {
          const tx = EditorCommands.insertManualPageBreak(editorHostRef.current);
          dispatchTransaction(tx);
          break;
        }
        case 'removeFormat': {
          const tx = EditorCommands.removeFormat(editorHostRef.current);
          dispatchTransaction(tx);
          break;
        }
        default:
          break;
      }
    };

    const handlePageBreakEvent = () => {
      if (!isEditable || !editorHostRef.current) return;
      const tx = EditorCommands.insertManualPageBreak(editorHostRef.current);
      dispatchTransaction(tx);
    };

    const handleTokenInsertEvent = (e: CustomEvent) => {
      if (!isEditable || !editorHostRef.current) return;
      const key = e.detail?.key || e.detail?.token || '';
      if (key) {
        const tx = EditorCommands.insertToken(editorHostRef.current, key, e.detail?.category);
        dispatchTransaction(tx);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('spr_doclab_editor_command' as any, handleCommandEvent);
      window.addEventListener('spr_doclab_insert_page_break' as any, handlePageBreakEvent);
      window.addEventListener('spr_doclab_insert_token' as any, handleTokenInsertEvent);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('spr_doclab_editor_command' as any, handleCommandEvent);
        window.removeEventListener('spr_doclab_insert_page_break' as any, handlePageBreakEvent);
        window.removeEventListener('spr_doclab_insert_token' as any, handleTokenInsertEvent);
      }
    };
  }, [isEditable, dispatchTransaction]);

  return (
    <div
      className={`paginated-document-editor relative flex flex-col items-center select-text ${className}`}
      style={{
        width: '100%',
        maxWidth: '100%',
      }}
    >
      {/* Active Document CSS Style Element */}
      {activeStyles && <style dangerouslySetInnerHTML={{ __html: activeStyles }} />}

      {/* Visual Page Break & Pagination Spacer Styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .spr-page-break {
              display: block;
              page-break-after: always;
              break-after: page;
              margin: 16px 0;
              position: relative;
              user-select: none;
              -webkit-user-select: none;
              background: #090d16;
              padding: 10px 0;
              min-height: 24px;
              height: 24px;
              box-sizing: border-box;
              border-top: 1.5px solid rgba(0, 0, 0, 0.4);
              border-bottom: 1.5px solid rgba(0, 0, 0, 0.4);
              box-shadow: inset 0 8px 16px -4px rgba(0, 0, 0, 0.75), inset 0 -8px 16px -4px rgba(0, 0, 0, 0.75);
              cursor: default;
            }
            .spr-page-break-divider {
              border: none;
              border-top: 1px dashed rgba(255, 255, 255, 0.2);
              margin: 0;
            }
            .spr-page-break-badge {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              background: #1e293b;
              padding: 3px 14px;
              font-size: 10px;
              font-weight: 700;
              color: #94a3b8;
              border: 1px solid rgba(255, 255, 255, 0.15);
              border-radius: 9999px;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
              letter-spacing: 0.06em;
              text-transform: uppercase;
              pointer-events: none;
            }
            .spr-runtime-page-spacer {
              display: block;
              user-select: none;
              -webkit-user-select: none;
              pointer-events: none;
              background: transparent;
            }
            @media print {
              .spr-page-break {
                display: block !important;
                page-break-after: always !important;
                break-after: page !important;
                margin: 0 !important;
                padding: 0 !important;
                height: 0 !important;
                border: none !important;
                background: transparent !important;
                box-shadow: none !important;
              }
              .spr-page-break-divider,
              .spr-page-break-badge,
              .spr-runtime-page-spacer {
                display: none !important;
              }
            }
          `,
        }}
      />

      {/* Main Container Positioning Underlying Physical Sheets and Overlaid Single Host */}
      <div
        className="relative flex flex-col items-center select-text"
        style={{
          width: `${pageGeometry.paperDimensionsPx.width}px`,
          maxWidth: `${pageGeometry.paperDimensionsPx.width}px`,
        }}
      >
        {/* 1. Underlying Visual Physical Paper Cards Layer (Sequential A4 Sheets) */}
        <div
          className="absolute inset-0 pointer-events-none flex flex-col items-center select-none"
          style={{
            width: `${pageGeometry.paperDimensionsPx.width}px`,
            zIndex: 0,
          }}
        >
          {Array.from({ length: totalPagesCount }).map((_, pageIdx) => {
            const pageNum = pageIdx + 1;
            const isFirst = pageIdx === 0;

            return (
              <div
                key={`visual_page_sheet_${pageIdx}`}
                id={`docx-visual-sheet-${pageIdx}`}
                className="paper-sheet-wrapper flex flex-col items-center mb-8 print:mb-0"
                style={{
                  width: `${pageGeometry.paperDimensionsPx.width}px`,
                  maxWidth: `${pageGeometry.paperDimensionsPx.width}px`,
                }}
              >
                {/* Screen-Only Top Physical Page Header Bar */}
                <div
                  style={{
                    width: `${pageGeometry.paperDimensionsPx.width}px`,
                    height: `${SCREEN_HEADER_HEIGHT_PX}px`,
                  }}
                  className="flex items-center justify-between px-2 py-1 text-xs theme-text-secondary select-none print:hidden w-full pointer-events-auto box-border"
                >
                  <div className="flex items-center gap-2 font-medium">
                    <span className="w-2 h-2 rounded-full theme-bg-accent animate-pulse" />
                    <span className="font-bold theme-text-primary font-mono text-[11.5px]">
                      Page {pageNum} of {totalPagesCount} ({options.pageSize || 'A4'} • {options.orientation || 'PORTRAIT'})
                    </span>
                    <span className="text-[10px] font-semibold theme-text-muted px-1.5 py-0.5 rounded-sm theme-bg-sub border theme-border font-mono">
                      {Math.round(pageGeometry.paperDimensionsPx.width)} × {Math.round(pageGeometry.paperDimensionsPx.height)}px
                    </span>
                  </div>

                  {isFirst && (
                    <button
                      type="button"
                      onClick={handleManualPageBreak}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold theme-bg-elevated theme-text-secondary hover:theme-accent transition-colors border theme-border cursor-pointer shadow-2xs"
                      title="Insert an explicit manual page break at cursor (Ctrl+Enter)"
                    >
                      <PageBreakIcon className="w-3.5 h-3.5" />
                      <span>+ Page Break</span>
                    </button>
                  )}
                </div>

                {/* Physical Paper Sheet White Surface with Shadow */}
                <div
                  className="paper-sheet docx-paper-sheet relative text-left box-border shadow-xl rounded-xs print:shadow-none print:border-none print:w-full print:m-0 print:bg-white flex flex-col justify-between overflow-hidden"
                  data-size={options.pageSize || 'A4'}
                  data-orientation={options.orientation || 'PORTRAIT'}
                  data-margin={options.margin || 'NORMAL'}
                  data-density={options.density || 'NORMAL'}
                  data-page-index={pageIdx}
                  data-page-break="true"
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    width: `${pageGeometry.paperDimensionsPx.width}px`,
                    maxWidth: `${pageGeometry.paperDimensionsPx.width}px`,
                    height: `${pageGeometry.paperDimensionsPx.height}px`,
                    minHeight: `${pageGeometry.paperDimensionsPx.height}px`,
                    maxHeight: `${pageGeometry.paperDimensionsPx.height}px`,
                    padding: `${pageGeometry.marginsPx.top}px ${pageGeometry.marginsPx.right}px ${pageGeometry.marginsPx.bottom}px ${pageGeometry.marginsPx.left}px`,
                    boxSizing: 'border-box',
                  }}
                >
                  {/* Background Watermark */}
                  {(options.watermarkConfig || options.watermarkText) && (
                    <WatermarkLayer
                      config={options.watermarkConfig}
                      text={options.watermarkText}
                      variables={RuntimeVariableResolver.buildVariables(pageIdx, totalPagesCount, {
                        documentTitle: options.title || 'Official Document',
                        documentSubtitle: options.subtitle,
                        institutionName: options.institutionName || 'SPR Note Academy',
                        institutionAddress: options.institutionAddress,
                        pageNumberFormat: options.pageNumberFormat || options.headerConfig?.pageNumberFormat,
                      })}
                    />
                  )}

                  {/* Reserved Running Header */}
                  {options.headerConfig && (pageGeometry.headerAreaPx?.height || 0) > 0 && (
                    <div
                      className="w-full relative z-10 shrink-0 overflow-hidden flex flex-col justify-end"
                      style={{
                        height: `${pageGeometry.headerAreaPx.height}px`,
                        minHeight: `${pageGeometry.headerAreaPx.height}px`,
                      }}
                    >
                      <RunningHeader
                        variables={RuntimeVariableResolver.buildVariables(pageIdx, totalPagesCount, {
                          documentTitle: options.title || 'Official Document',
                          documentSubtitle: options.subtitle,
                          institutionName: options.institutionName || 'SPR Note Academy',
                          institutionAddress: options.institutionAddress,
                          pageNumberFormat: options.pageNumberFormat || options.headerConfig?.pageNumberFormat,
                        })}
                        config={options.headerConfig}
                      />
                    </div>
                  )}

                  {/* Spacer for flow content */}
                  <div className="flex-1" />

                  {/* Reserved Running Footer */}
                  {options.footerConfig && (pageGeometry.footerAreaPx?.height || 0) > 0 && (
                    <div
                      className="w-full relative z-10 shrink-0 overflow-hidden flex flex-col justify-start"
                      style={{
                        height: `${pageGeometry.footerAreaPx.height}px`,
                        minHeight: `${pageGeometry.footerAreaPx.height}px`,
                      }}
                    >
                      <RunningFooter
                        variables={RuntimeVariableResolver.buildVariables(pageIdx, totalPagesCount, {
                          documentTitle: options.title || 'Official Document',
                          documentSubtitle: options.subtitle,
                          institutionName: options.institutionName || 'SPR Note Academy',
                          institutionAddress: options.institutionAddress,
                          pageNumberFormat: options.pageNumberFormat || options.headerConfig?.pageNumberFormat,
                        })}
                        config={options.footerConfig}
                        numeralSystem={options.numeralSystem}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 2. Top-Level Authoritative contentEditable Host */}
        <div
          ref={editorHostRef}
          contentEditable={isEditable}
          suppressContentEditableWarning={true}
          data-doclab-single-host="true"
          onClick={handleSheetClick}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onInput={handleInput}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          onKeyUp={saveSelection}
          onMouseUp={saveSelection}
          onCompositionStart={handleCompositionStart}
          onCompositionUpdate={handleCompositionUpdate}
          onCompositionEnd={handleCompositionEnd}
          className="doclab-single-host-editor docx-preview-content docx-parsed-body docx-live-container font-sans text-xs sm:text-sm leading-relaxed !text-slate-900 w-full text-left focus:outline-none cursor-text select-text relative z-10"
          style={{
            width: `${pageGeometry.paperDimensionsPx.width}px`,
            maxWidth: `${pageGeometry.paperDimensionsPx.width}px`,
            marginTop: `${SCREEN_HEADER_HEIGHT_PX}px`,
            paddingTop: `${pageGeometry.marginsPx.top + (pageGeometry.headerAreaPx?.height || 0)}px`,
            paddingBottom: `${pageGeometry.marginsPx.bottom + (pageGeometry.footerAreaPx?.height || 0)}px`,
            paddingLeft: `${pageGeometry.marginsPx.left}px`,
            paddingRight: `${pageGeometry.marginsPx.right}px`,
            minHeight: `${pageGeometry.paperDimensionsPx.height}px`,
            boxSizing: 'border-box',
            outline: 'none',
            wordBreak: 'break-word',
            textAlign: 'left',
            backgroundColor: 'transparent',
            color: '#0f172a',
            userSelect: 'text',
            WebkitUserSelect: 'text',
          }}
        />
      </div>
    </div>
  );
};

export const PaginatedDocumentEditor = memo(PaginatedDocumentEditorComponent);
export default PaginatedDocumentEditor;
