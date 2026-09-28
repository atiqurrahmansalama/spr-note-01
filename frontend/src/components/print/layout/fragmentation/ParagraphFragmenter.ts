/**
 * ParagraphFragmenter
 * Line-boundary text and rich paragraph fragmentation engine.
 *
 * Splits multi-line paragraphs at exact browser line boundaries crossing page breaks
 * using Range.getClientRects() geometry, preserving font formatting, inline spans,
 * and CSS classes across both page fragments.
 */

import { TextMeasurement } from '../measurement/TextMeasurement';
import { MeasurementContext } from '../measurement/measurementTypes';

export interface ParagraphSplitResult {
  firstFragmentHtml: string;
  remainingFragmentHtml: string | null;
  firstFragmentHeight: number;
  remainingFragmentHeight: number;
  isSplit: boolean;
}

export class ParagraphFragmenter {
  /**
   * Splits a paragraph or rich text block at the exact line boundary fitting availableHeightPx
   */
  public static splitParagraph(
    el: HTMLElement,
    availableHeightPx: number,
    context?: MeasurementContext
  ): ParagraphSplitResult {
    return TextMeasurement.withConnectedElement(el, context, (connectedEl) => {
      if (typeof document === 'undefined' || !connectedEl || !connectedEl.getBoundingClientRect) {
        const text = (el as any).textContent || (el as any).rawHtml || '';
        const approxHeight = Math.max(24, Math.ceil((text.length * 8.5) / (context?.containerWidth || 602)) * 24);
        if (approxHeight > availableHeightPx && availableHeightPx > 50) {
          const splitRatio = Math.max(0.1, Math.min(0.9, (availableHeightPx - 16) / approxHeight));
          const splitCharIdx = Math.floor(text.length * splitRatio);
          const lastSpace = text.lastIndexOf(' ', splitCharIdx);
          const cutIdx = lastSpace > 0 ? lastSpace : splitCharIdx;
          const text1 = text.slice(0, cutIdx).trim();
          const text2 = text.slice(cutIdx).trim();
          return {
            firstFragmentHtml: `<p>${text1}</p>`,
            remainingFragmentHtml: `<p>${text2}</p>`,
            firstFragmentHeight: availableHeightPx,
            remainingFragmentHeight: Math.max(24, approxHeight - availableHeightPx),
            isSplit: true,
          };
        }
        if (approxHeight <= availableHeightPx) {
          return {
            firstFragmentHtml: (el as any).rawHtml || `<p>${text}</p>`,
            remainingFragmentHtml: null,
            firstFragmentHeight: approxHeight,
            remainingFragmentHeight: 0,
            isSplit: false,
          };
        }
        return {
          firstFragmentHtml: '',
          remainingFragmentHtml: (el as any).rawHtml || `<p>${text}</p>`,
          firstFragmentHeight: 0,
          remainingFragmentHeight: approxHeight,
          isSplit: false,
        };
      }

      const elRect = connectedEl.getBoundingClientRect();
      const elHeight = Math.max(connectedEl.offsetHeight, elRect.height, 1);

      // If whole paragraph fits, no split needed
      if (elHeight <= availableHeightPx) {
        return {
          firstFragmentHtml: connectedEl.outerHTML,
          remainingFragmentHtml: null,
          firstFragmentHeight: elHeight,
          remainingFragmentHeight: 0,
          isSplit: false,
        };
      }

      // 1. Measure all lines with native DOM Range.getClientRects()
      const textMetrics = TextMeasurement.measureTextLines(connectedEl, context);
      const lines = textMetrics.lines;

      // 2. If we have multiple lines, find the last line that fits within availableHeightPx
      if (lines.length > 1) {
        let lastFittingLineIdx = -1;

        for (let i = 0; i < lines.length; i++) {
          const lineBottom = lines[i].rect.y + lines[i].rect.height;
          if (lineBottom <= availableHeightPx + 1) {
            lastFittingLineIdx = i;
          } else {
            break;
          }
        }

        // If at least one line fits on the current page
        if (lastFittingLineIdx >= 0 && lastFittingLineIdx < lines.length - 1) {
          const splitLine = lines[lastFittingLineIdx];
          const splitCharOffset = splitLine.charEnd;

          const splitResult = this.splitElementAtCharOffset(connectedEl, splitCharOffset);
          if (splitResult) {
            const firstHeight = splitLine.rect.y + splitLine.rect.height;
            const remainingHeight = Math.max(16, elHeight - firstHeight);

            return {
              firstFragmentHtml: splitResult.firstHtml,
              remainingFragmentHtml: splitResult.remainingHtml,
              firstFragmentHeight: firstHeight,
              remainingFragmentHeight: remainingHeight,
              isSplit: true,
            };
          }
        }
      }

      // 3. Range-based sub-character offset measurement for continuous blocks
      const splitData = TextMeasurement.findTextSplitOffsetForHeight(connectedEl, availableHeightPx, context);

      if (splitData && splitData.splitNode && splitData.splitOffset > 0) {
        try {
          const clone = connectedEl.cloneNode(true) as HTMLElement;
          const postRange = document.createRange();

          // Trace splitNode in cloned DOM
          const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT, null);
          let curr = walker.nextNode() as Text | null;
          let targetCloneNode: Text | null = null;
          let targetCloneOffset = 0;

          const targetText = splitData.splitNode.textContent || '';
          const targetSubstring = targetText.slice(0, splitData.splitOffset);

          while (curr) {
            if (curr.textContent?.includes(targetSubstring) || curr.textContent === targetText) {
              targetCloneNode = curr;
              targetCloneOffset = splitData.splitOffset;
              break;
            }
            curr = walker.nextNode() as Text | null;
          }

          if (targetCloneNode) {
            postRange.setStart(targetCloneNode, targetCloneOffset);
            postRange.setEnd(clone, clone.childNodes.length);

            const postFragment = postRange.extractContents();

            // Create second paragraph fragment with identical tag and attributes
            const p2 = document.createElement(connectedEl.tagName.toLowerCase());
            Array.from(connectedEl.attributes).forEach((attr) => {
              p2.setAttribute(attr.name, attr.value);
            });
            p2.appendChild(postFragment);

            return {
              firstFragmentHtml: clone.outerHTML,
              remainingFragmentHtml: p2.outerHTML,
              firstFragmentHeight: availableHeightPx,
              remainingFragmentHeight: Math.max(16, elHeight - availableHeightPx),
              isSplit: true,
            };
          }
        } catch (err) {
          console.warn('ParagraphFragmenter Range split error:', err);
        }
      }

      // 4. Fallback for non-splittable single line or small available height:
      // If availableHeightPx cannot even fit the first line, signal to push to next page
      return {
        firstFragmentHtml: '',
        remainingFragmentHtml: connectedEl.outerHTML,
        firstFragmentHeight: 0,
        remainingFragmentHeight: elHeight,
        isSplit: false,
      };
    });
  }

  /**
   * Splits a DOM element tree cleanly at a global character offset
   */
  private static splitElementAtCharOffset(
    el: HTMLElement,
    targetCharOffset: number
  ): { firstHtml: string; remainingHtml: string } | null {
    try {
      const clone = el.cloneNode(true) as HTMLElement;
      const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT, null);
      let curr = walker.nextNode() as Text | null;
      let runningOffset = 0;
      let targetNode: Text | null = null;
      let targetOffsetInNode = 0;

      while (curr) {
        const nodeLen = curr.textContent?.length || 0;
        if (runningOffset + nodeLen >= targetCharOffset) {
          targetNode = curr;
          targetOffsetInNode = targetCharOffset - runningOffset;
          break;
        }
        runningOffset += nodeLen;
        curr = walker.nextNode() as Text | null;
      }

      if (!targetNode) {
        return null;
      }

      const postRange = document.createRange();
      postRange.setStart(targetNode, targetOffsetInNode);
      postRange.setEnd(clone, clone.childNodes.length);

      const postFragment = postRange.extractContents();

      // Create second paragraph fragment with identical tag and attributes
      const p2 = document.createElement(el.tagName.toLowerCase());
      Array.from(el.attributes).forEach((attr) => {
        p2.setAttribute(attr.name, attr.value);
      });
      p2.appendChild(postFragment);

      return {
        firstHtml: clone.outerHTML,
        remainingHtml: p2.outerHTML,
      };
    } catch (err) {
      console.warn('ParagraphFragmenter splitElementAtCharOffset error:', err);
      return null;
    }
  }
}

