/**
 * TextMeasurement
 * High-precision browser text measurement engine using native Range client rects.
 *
 * Replaces naive character-count heuristics with exact DOM line-box geometry.
 */

import { Rect } from '../types/layoutTypes';
import { LineMetric, BreakOpportunity, MeasurementContext } from './measurementTypes';

export class TextMeasurement {
  /**
   * Executes a measurement callback with guaranteed DOM attachment in the offscreen sandbox
   */
  public static withConnectedElement<T>(
    el: HTMLElement,
    context: MeasurementContext | undefined,
    callback: (connectedEl: HTMLElement) => T
  ): T {
    if (typeof document === 'undefined' || !el) {
      return callback(el);
    }

    if (el.isConnected) {
      return callback(el);
    }

    const sandboxId = 'spr-doclab-measurement-sandbox';
    let sandbox = document.getElementById(sandboxId) as HTMLDivElement | null;

    if (!sandbox) {
      sandbox = document.createElement('div');
      sandbox.id = sandboxId;
      sandbox.setAttribute('aria-hidden', 'true');
      sandbox.style.position = 'fixed';
      sandbox.style.top = '-99999px';
      sandbox.style.left = '-99999px';
      sandbox.style.visibility = 'hidden';
      sandbox.style.pointerEvents = 'none';
      sandbox.style.zIndex = '-9999';
      sandbox.style.overflow = 'hidden';
      document.body.appendChild(sandbox);
    }

    const prevWidth = sandbox.style.width;
    if (context?.containerWidth) {
      sandbox.style.width = `${Math.max(100, context.containerWidth)}px`;
      sandbox.style.maxWidth = `${Math.max(100, context.containerWidth)}px`;
    }

    sandbox.appendChild(el);

    try {
      return callback(el);
    } finally {
      if (el.parentNode === sandbox) {
        sandbox.removeChild(el);
      }
      if (context?.containerWidth && prevWidth) {
        sandbox.style.width = prevWidth;
        sandbox.style.maxWidth = prevWidth;
      }
    }
  }

  /**
   * Measures text lines and line boxes inside a paragraph/heading using DOM Range APIs
   */
  public static measureTextLines(el: HTMLElement, context?: MeasurementContext): {
    lines: LineMetric[];
    firstLineHeight: number;
    lastLineHeight: number;
    totalHeight: number;
    breakOpportunities: BreakOpportunity[];
  } {
    return this.withConnectedElement(el, context, (connectedEl) => {
      if (typeof window === 'undefined' || !connectedEl) {
        const h = connectedEl?.offsetHeight || 28;
        return {
          lines: [],
          firstLineHeight: h,
          lastLineHeight: h,
          totalHeight: h,
          breakOpportunities: [],
        };
      }

      const textNodes: Text[] = [];
      const showTextFilter = typeof NodeFilter !== 'undefined' ? NodeFilter.SHOW_TEXT : 4;
      const textNodeType = typeof Node !== 'undefined' ? Node.TEXT_NODE : 3;
      const walker = typeof document !== 'undefined' && document.createTreeWalker ? document.createTreeWalker(connectedEl, showTextFilter, null) : null;
      let curr = walker ? walker.nextNode() : null;
      while (curr) {
        if ((curr as any).nodeType === textNodeType && (curr.textContent?.length || 0) > 0) {
          textNodes.push(curr as Text);
        }
        curr = walker ? walker.nextNode() : null;
      }

      if (textNodes.length === 0) {
        const elRect = connectedEl.getBoundingClientRect();
        const h = Math.max(connectedEl.offsetHeight, elRect.height, 24);
        return {
          lines: [],
          firstLineHeight: h,
          lastLineHeight: h,
          totalHeight: h,
          breakOpportunities: [],
        };
      }

      const elRect = connectedEl.getBoundingClientRect();
      const range = document.createRange();
      const lineRects: Array<{ rect: Rect; top: number; bottom: number; text: string; charStart: number; charEnd: number }> = [];

      // Use native Intl.Segmenter for complex scripts (Bengali, Arabic, Urdu, etc.) if supported
      const graphemeSegmenter =
        typeof Intl !== 'undefined' && (Intl as any).Segmenter
          ? new (Intl as any).Segmenter(undefined, { granularity: 'grapheme' })
          : null;

      let runningCharOffset = 0;
      let currentLineTop = -1;
      let currentLineBottom = -1;
      let currentLineText = '';
      let currentLineStart = 0;
      let currentLineLeft = Infinity;
      let currentLineRight = -Infinity;

      for (const tNode of textNodes) {
        const text = tNode.textContent || '';
        if (!text) continue;

        const segments: Array<{ index: number; segment: string }> = graphemeSegmenter
          ? Array.from(graphemeSegmenter.segment(text))
          : Array.from(text).map((ch, idx) => ({ index: idx, segment: ch }));

        for (const seg of segments) {
          const segStart = seg.index;
          const segLen = seg.segment.length;
          try {
            range.setStart(tNode, segStart);
            range.setEnd(tNode, segStart + segLen);
            const rects = range.getClientRects();

            if (rects.length > 0) {
              const r = rects[0];
              const charTop = r.top;
              const charBottom = r.bottom;

              // Check if this cluster is on a new line (threshold > 4px vertical delta)
              if (currentLineTop === -1) {
                currentLineTop = charTop;
                currentLineBottom = charBottom;
                currentLineText = seg.segment;
                currentLineStart = runningCharOffset + segStart;
                currentLineLeft = r.left;
                currentLineRight = r.right;
              } else if (Math.abs(charTop - currentLineTop) > 4) {
                // Flush completed line
                lineRects.push({
                  rect: {
                    x: Math.max(0, currentLineLeft - elRect.left),
                    y: Math.max(0, currentLineTop - elRect.top),
                    width: Math.max(10, currentLineRight - currentLineLeft),
                    height: Math.max(12, currentLineBottom - currentLineTop),
                  },
                  top: currentLineTop - elRect.top,
                  bottom: currentLineBottom - elRect.top,
                  text: currentLineText,
                  charStart: currentLineStart,
                  charEnd: runningCharOffset + segStart,
                });

                // Start new line
                currentLineTop = charTop;
                currentLineBottom = charBottom;
                currentLineText = seg.segment;
                currentLineStart = runningCharOffset + segStart;
                currentLineLeft = r.left;
                currentLineRight = r.right;
              } else {
                // Same line continuation
                currentLineText += seg.segment;
                currentLineBottom = Math.max(currentLineBottom, charBottom);
                currentLineLeft = Math.min(currentLineLeft, r.left);
                currentLineRight = Math.max(currentLineRight, r.right);
              }
            }
          } catch (e) {
            // ignore transient range errors
          }
        }
        runningCharOffset += text.length;
      }

      // Flush last line
      if (currentLineTop !== -1) {
        lineRects.push({
          rect: {
            x: Math.max(0, currentLineLeft - elRect.left),
            y: Math.max(0, currentLineTop - elRect.top),
            width: Math.max(10, currentLineRight - currentLineLeft),
            height: Math.max(12, currentLineBottom - currentLineTop),
          },
          top: currentLineTop - elRect.top,
          bottom: currentLineBottom - elRect.top,
          text: currentLineText,
          charStart: currentLineStart,
          charEnd: runningCharOffset,
        });
      }

      const lines: LineMetric[] = lineRects.map((l, idx) => ({
        index: idx,
        rect: l.rect,
        charStart: l.charStart,
        charEnd: l.charEnd,
        text: l.text,
      }));

      const totalHeight = elRect.height > 0 ? elRect.height : (connectedEl.offsetHeight || Math.max(lines.length * 20, 24));
      const firstLineHeight = lines.length > 0 ? lines[0].rect.height : totalHeight;
      const lastLineHeight = lines.length > 0 ? lines[lines.length - 1].rect.height : totalHeight;

      // Generate clean line-boundary break opportunities
      const breakOpportunities: BreakOpportunity[] = [];
      const minOrphans = 2;
      const minWidows = 2;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const sliceHeight = line.rect.y;
        const remainingHeight = totalHeight - sliceHeight;
        const isOrphanViolation = i < minOrphans;
        const isWidowViolation = lines.length - i < minWidows;

        breakOpportunities.push({
          offsetY: sliceHeight,
          type: 'line',
          index: i,
          sliceHeight,
          remainingHeight,
          discouraged: isOrphanViolation || isWidowViolation,
        });
      }

      return {
        lines,
        firstLineHeight,
        lastLineHeight,
        totalHeight,
        breakOpportunities,
      };
    });
  }

  /**
   * Finds the exact text split boundary for an element that exceeds available height
   */
  public static findTextSplitOffsetForHeight(
    el: HTMLElement,
    maxAllowedHeightPx: number,
    context?: MeasurementContext
  ): {
    splitOffset: number;
    splitNode: Text | null;
    sliceHeight: number;
    remainingHeight: number;
  } | null {
    return this.withConnectedElement(el, context, (connectedEl) => {
      if (typeof document === 'undefined' || !connectedEl) return null;

      const elRect = connectedEl.getBoundingClientRect();
      if (elRect.height <= maxAllowedHeightPx) return null;

      const textNodes: Text[] = [];
      const showTextFilter = typeof NodeFilter !== 'undefined' ? NodeFilter.SHOW_TEXT : 4;
      const textNodeType = typeof Node !== 'undefined' ? Node.TEXT_NODE : 3;
      const walker = typeof document !== 'undefined' && document.createTreeWalker ? document.createTreeWalker(connectedEl, showTextFilter, null) : null;
      let curr = walker ? walker.nextNode() : null;
      while (curr) {
        if ((curr as any).nodeType === textNodeType && (curr.textContent?.length || 0) > 0) {
          textNodes.push(curr as Text);
        }
        curr = walker ? walker.nextNode() : null;
      }

      if (textNodes.length === 0) return null;

      const wordSegmenter =
        typeof Intl !== 'undefined' && (Intl as any).Segmenter
          ? new (Intl as any).Segmenter(undefined, { granularity: 'word' })
          : null;

      const range = document.createRange();
      let targetNode: Text | null = null;
      let targetOffset = -1;

      for (const tNode of textNodes) {
        const text = tNode.textContent || '';
        if (!text) continue;

        if (wordSegmenter) {
          const words = Array.from(wordSegmenter.segment(text));
          for (const w of words) {
            const wStart = (w as any).index;
            const wLen = (w as any).segment.length;
            try {
              range.setStart(tNode, wStart);
              range.setEnd(tNode, wStart + wLen);
              const rects = range.getClientRects();
              if (rects.length > 0) {
                const relBottom = rects[0].bottom - elRect.top;
                if (relBottom > maxAllowedHeightPx) {
                  targetNode = tNode;
                  targetOffset = wStart;
                  break;
                }
              }
            } catch (e) {
              // ignore
            }
          }
        } else {
          const len = text.length;
          for (let o = 0; o < len; o += 3) {
            try {
              range.setStart(tNode, o);
              range.setEnd(tNode, Math.min(o + 1, len));
              const rects = range.getClientRects();
              if (rects.length > 0) {
                const relBottom = rects[0].bottom - elRect.top;
                if (relBottom > maxAllowedHeightPx) {
                  targetNode = tNode;
                  targetOffset = o;
                  break;
                }
              }
            } catch (e) {
              // ignore
            }
          }
        }
        if (targetNode) break;
      }

      if (targetNode && targetOffset > 0) {
        // Find nearest preceding space for a clean word boundary
        const text = targetNode.textContent || '';
        const lastSpace = text.lastIndexOf(' ', targetOffset);
        const safeOffset = lastSpace > 0 ? lastSpace : targetOffset;

        return {
          splitOffset: safeOffset,
          splitNode: targetNode,
          sliceHeight: maxAllowedHeightPx,
          remainingHeight: elRect.height - maxAllowedHeightPx,
        };
      }

      return null;
    });
  }
}
