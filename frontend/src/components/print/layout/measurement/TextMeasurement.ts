/**
 * TextMeasurement
 * High-precision browser text measurement engine using native Range client rects.
 *
 * Implements the True Line Model for SPR Note DocLab Layout Architecture:
 * - Visual line index
 * - Logical text start and end offsets
 * - Exact spatial bounding box (top, bottom, left, right, width, height)
 * - Text direction (LTR / RTL) and writing mode
 * - Inline formatting context (bold, italic, underline, links, tokens, mixed fonts, mixed sizes, script detection)
 * - Break opportunities on true visual line boundaries
 */

import { Rect } from '../types/layoutTypes';
import {
  LineMetric,
  BreakOpportunity,
  MeasurementContext,
  InlineRunFormatting,
  InlineRunMetric,
  InlineFormattingContext,
} from './measurementTypes';

export class TextMeasurement {
  /**
   * Executes a measurement callback with guaranteed DOM attachment in the offscreen sandbox
   */
  public static withConnectedElement<T>(
    el: HTMLElement,
    context: MeasurementContext | undefined,
    callback: (connectedEl: HTMLElement) => T
  ): T {
    const isRealBrowser = typeof window !== 'undefined' && typeof window.getComputedStyle === 'function' && typeof document !== 'undefined' && Boolean(document.body);
    if (!isRealBrowser || !el) {
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
   * Extracts inline formatting marks and attributes for a given DOM text node
   */
  public static extractInlineFormatting(node: Node, root: HTMLElement): InlineRunFormatting {
    const formatting: InlineRunFormatting = {};
    let curr: Node | null = node.parentElement;

    while (curr && curr !== root) {
      if (curr.nodeType === (typeof Node !== 'undefined' ? Node.ELEMENT_NODE : 1)) {
        const el = curr as HTMLElement;
        const tag = el.tagName.toLowerCase();

        // 1. Semantic Formatting Marks
        if (tag === 'b' || tag === 'strong') {
          formatting.bold = true;
        }
        if (tag === 'i' || tag === 'em') {
          formatting.italic = true;
        }
        if (tag === 'u') {
          formatting.underline = true;
        }
        if (tag === 's' || tag === 'del' || tag === 'strike') {
          formatting.strikethrough = true;
        }

        // 2. Hyperlinks
        if (tag === 'a') {
          formatting.isLink = true;
          formatting.linkHref = el.getAttribute('href') || undefined;
        }

        // 3. Dynamic Tokens and Fields
        if (
          el.classList.contains('spr-token') ||
          el.classList.contains('doclab-token') ||
          el.hasAttribute('data-token') ||
          el.hasAttribute('data-dynamic-field')
        ) {
          formatting.isToken = true;
          formatting.tokenId = el.getAttribute('data-token') || el.getAttribute('data-dynamic-field') || undefined;
        }

        if (el.classList.contains('badge') || el.classList.contains('spr-badge')) {
          formatting.isBadge = true;
        }

        // 4. Inline CSS Properties
        if (el.style) {
          if (el.style.fontWeight && (el.style.fontWeight === 'bold' || parseInt(el.style.fontWeight, 10) >= 600)) {
            formatting.bold = true;
            formatting.fontWeight = el.style.fontWeight;
          }
          if (el.style.fontStyle === 'italic') {
            formatting.italic = true;
          }
          if (el.style.textDecoration && el.style.textDecoration.includes('underline')) {
            formatting.underline = true;
          }
          if (el.style.fontSize) {
            formatting.fontSize = parseFloat(el.style.fontSize);
          }
          if (el.style.fontFamily) {
            formatting.fontFamily = el.style.fontFamily;
          }
          if (el.style.color) {
            formatting.color = el.style.color;
          }
          if (el.style.backgroundColor) {
            formatting.backgroundColor = el.style.backgroundColor;
          }
          if (el.style.direction === 'rtl' || el.getAttribute('dir') === 'rtl') {
            formatting.direction = 'rtl';
          } else if (el.style.direction === 'ltr' || el.getAttribute('dir') === 'ltr') {
            formatting.direction = 'ltr';
          }
        }
      }
      curr = curr.parentNode;
    }

    return formatting;
  }

  /**
   * Analyzes text characters to detect primary script and directionality
   */
  public static analyzeScriptDirection(text: string): {
    dominantDirection: 'ltr' | 'rtl';
    hasMixedDirection: boolean;
    isArabic: boolean;
    isBengali: boolean;
  } {
    let rtlCount = 0;
    let ltrCount = 0;
    let arabicCount = 0;
    let bengaliCount = 0;

    const len = text.length;
    for (let i = 0; i < len; i++) {
      const code = text.charCodeAt(i);
      // Arabic, Hebrew, Persian unicode ranges
      if ((code >= 0x0590 && code <= 0x05ff) || (code >= 0x0600 && code <= 0x06ff) || (code >= 0x0750 && code <= 0x077f)) {
        rtlCount++;
        if (code >= 0x0600 && code <= 0x06ff) arabicCount++;
      }
      // Bengali unicode range
      else if (code >= 0x0980 && code <= 0x09ff) {
        ltrCount++;
        bengaliCount++;
      }
      // Standard Latin / Greek / Cyrillic
      else if ((code >= 0x0041 && code <= 0x005a) || (code >= 0x0061 && code <= 0x007a) || (code >= 0x00c0 && code <= 0x024f)) {
        ltrCount++;
      }
    }

    const totalLetters = rtlCount + ltrCount;
    const dominantDirection: 'ltr' | 'rtl' = totalLetters > 0 && rtlCount > ltrCount ? 'rtl' : 'ltr';
    const hasMixedDirection = totalLetters > 0 && rtlCount > 0 && ltrCount > 0 && (rtlCount / totalLetters > 0.15 && ltrCount / totalLetters > 0.15);

    return {
      dominantDirection,
      hasMixedDirection,
      isArabic: arabicCount > 0,
      isBengali: bengaliCount > 0,
    };
  }

  /**
   * Builds an authoritative True Line Model for any paragraph or heading element
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

      const textNodes: Array<{ node: Text; formatting: InlineRunFormatting }> = [];
      const showTextFilter = typeof NodeFilter !== 'undefined' ? NodeFilter.SHOW_TEXT : 4;
      const textNodeType = typeof Node !== 'undefined' ? Node.TEXT_NODE : 3;
      const walker = typeof document !== 'undefined' && document.createTreeWalker ? document.createTreeWalker(connectedEl, showTextFilter, null) : null;
      let curr = walker ? walker.nextNode() : null;

      while (curr) {
        if ((curr as any).nodeType === textNodeType && (curr.textContent?.length || 0) > 0) {
          const tNode = curr as Text;
          const formatting = this.extractInlineFormatting(tNode, connectedEl);
          textNodes.push({ node: tNode, formatting });
        }
        curr = walker ? walker.nextNode() : null;
      }

      const elRect = connectedEl.getBoundingClientRect();
      const elOffsetWidth = connectedEl.offsetWidth;
      const elOffsetHeight = connectedEl.offsetHeight;
      const effectiveScale = (elOffsetWidth > 0 && elRect.width > 0) ? (elRect.width / elOffsetWidth) : 1;

      if (textNodes.length === 0) {
        const h = Math.max(elOffsetHeight, elRect.height > 0 ? elRect.height / effectiveScale : 0, 24);
        return {
          lines: [],
          firstLineHeight: h,
          lastLineHeight: h,
          totalHeight: h,
          breakOpportunities: [],
        };
      }

      const range = document.createRange();
      const rawLines: Array<{
        rect: Rect;
        top: number;
        bottom: number;
        left: number;
        right: number;
        text: string;
        charStart: number;
        charEnd: number;
        runs: InlineRunMetric[];
      }> = [];

      // Native segmenter for script boundary fidelity
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
      let currentLineRuns: InlineRunMetric[] = [];
      let currentRunText = '';
      let currentRunStart = 0;
      let currentRunFormatting: InlineRunFormatting = {};
      let currentRunLeft = Infinity;
      let currentRunRight = -Infinity;
      let currentRunTop = Infinity;
      let currentRunBottom = -Infinity;

      const flushCurrentRun = (lineTop: number, charEndOffset: number) => {
        if (currentRunText.length > 0) {
          const runRect: Rect = {
            x: Math.max(0, (currentRunLeft - elRect.left) / effectiveScale),
            y: Math.max(0, (currentRunTop - elRect.top) / effectiveScale),
            width: Math.max(4, (currentRunRight - currentRunLeft) / effectiveScale),
            height: Math.max(12, (currentRunBottom - currentRunTop) / effectiveScale),
          };
          currentLineRuns.push({
            text: currentRunText,
            charStart: currentRunStart,
            charEnd: charEndOffset,
            rect: runRect,
            formatting: { ...currentRunFormatting },
          });
          currentRunText = '';
          currentRunLeft = Infinity;
          currentRunRight = -Infinity;
          currentRunTop = Infinity;
          currentRunBottom = -Infinity;
        }
      };

      for (const item of textNodes) {
        const tNode = item.node;
        const formatting = item.formatting;
        const text = tNode.textContent || '';
        if (!text) continue;

        const segments: Array<{ index: number; segment: string }> = graphemeSegmenter
          ? Array.from(graphemeSegmenter.segment(text))
          : Array.from(text).map((ch, idx) => ({ index: idx, segment: ch }));

        for (const seg of segments) {
          const segStart = seg.index;
          const segLen = seg.segment.length;
          const globalCharPos = runningCharOffset + segStart;

          try {
            range.setStart(tNode, segStart);
            range.setEnd(tNode, segStart + segLen);
            const rects = range.getClientRects();

            if (rects.length > 0) {
              const r = rects[0];
              const charTop = r.top;
              const charBottom = r.bottom;

              // Check if this cluster starts a new visual line (threshold > 4px vertical delta adjusted for scale)
              if (currentLineTop === -1) {
                currentLineTop = charTop;
                currentLineBottom = charBottom;
                currentLineText = seg.segment;
                currentLineStart = globalCharPos;
                currentLineLeft = r.left;
                currentLineRight = r.right;

                currentRunText = seg.segment;
                currentRunStart = globalCharPos;
                currentRunFormatting = formatting;
                currentRunLeft = r.left;
                currentRunRight = r.right;
                currentRunTop = r.top;
                currentRunBottom = r.bottom;
              } else if (Math.abs(charTop - currentLineTop) > 4 * effectiveScale) {
                // 1. Flush active run
                flushCurrentRun(currentLineTop, globalCharPos);

                // 2. Flush completed line
                rawLines.push({
                  rect: {
                    x: Math.max(0, (currentLineLeft - elRect.left) / effectiveScale),
                    y: Math.max(0, (currentLineTop - elRect.top) / effectiveScale),
                    width: Math.max(10, (currentLineRight - currentLineLeft) / effectiveScale),
                    height: Math.max(12, (currentLineBottom - currentLineTop) / effectiveScale),
                  },
                  top: (currentLineTop - elRect.top) / effectiveScale,
                  bottom: (currentLineBottom - elRect.top) / effectiveScale,
                  left: (currentLineLeft - elRect.left) / effectiveScale,
                  right: (currentLineRight - elRect.left) / effectiveScale,
                  text: currentLineText,
                  charStart: currentLineStart,
                  charEnd: globalCharPos,
                  runs: [...currentLineRuns],
                });

                // 3. Start new visual line
                currentLineRuns = [];
                currentLineTop = charTop;
                currentLineBottom = charBottom;
                currentLineText = seg.segment;
                currentLineStart = globalCharPos;
                currentLineLeft = r.left;
                currentLineRight = r.right;

                currentRunText = seg.segment;
                currentRunStart = globalCharPos;
                currentRunFormatting = formatting;
                currentRunLeft = r.left;
                currentRunRight = r.right;
                currentRunTop = r.top;
                currentRunBottom = r.bottom;
              } else {
                // Continuation of current line
                currentLineText += seg.segment;
                currentLineBottom = Math.max(currentLineBottom, charBottom);
                currentLineLeft = Math.min(currentLineLeft, r.left);
                currentLineRight = Math.max(currentLineRight, r.right);

                // Check formatting run boundary
                if (currentRunFormatting !== formatting) {
                  flushCurrentRun(currentLineTop, globalCharPos);
                  currentRunText = seg.segment;
                  currentRunStart = globalCharPos;
                  currentRunFormatting = formatting;
                  currentRunLeft = r.left;
                  currentRunRight = r.right;
                  currentRunTop = r.top;
                  currentRunBottom = r.bottom;
                } else {
                  currentRunText += seg.segment;
                  currentRunLeft = Math.min(currentRunLeft, r.left);
                  currentRunRight = Math.max(currentRunRight, r.right);
                  currentRunTop = Math.min(currentRunTop, r.top);
                  currentRunBottom = Math.max(currentRunBottom, r.bottom);
                }
              }
            }
          } catch {
            // ignore transient DOM range errors
          }
        }
        runningCharOffset += text.length;
      }

      // Flush remaining run and last line
      if (currentLineTop !== -1) {
        flushCurrentRun(currentLineTop, runningCharOffset);
        rawLines.push({
          rect: {
            x: Math.max(0, (currentLineLeft - elRect.left) / effectiveScale),
            y: Math.max(0, (currentLineTop - elRect.top) / effectiveScale),
            width: Math.max(10, (currentLineRight - currentLineLeft) / effectiveScale),
            height: Math.max(12, (currentLineBottom - currentLineTop) / effectiveScale),
          },
          top: (currentLineTop - elRect.top) / effectiveScale,
          bottom: (currentLineBottom - elRect.top) / effectiveScale,
          left: (currentLineLeft - elRect.left) / effectiveScale,
          right: (currentLineRight - elRect.left) / effectiveScale,
          text: currentLineText,
          charStart: currentLineStart,
          charEnd: runningCharOffset,
          runs: [...currentLineRuns],
        });
      }

      const defaultDirection = context?.direction || ((context?.styles && /direction\s*:\s*rtl/i.test(context.styles)) ? 'rtl' : 'ltr');
      const writingMode = context?.writingMode || 'horizontal-tb';

      const lines: LineMetric[] = rawLines.map((l, idx) => {
        const scriptInfo = this.analyzeScriptDirection(l.text);
        const lineDir = scriptInfo.dominantDirection || defaultDirection;

        const fontFamilies = Array.from(
          new Set(
            l.runs
              .map((r) => r.formatting.fontFamily)
              .filter(Boolean) as string[]
          )
        );
        const fontSizes = Array.from(
          new Set(
            l.runs
              .map((r) => r.formatting.fontSize)
              .filter((sz): sz is number => typeof sz === 'number')
          )
        );

        const formattingContext: InlineFormattingContext = {
          hasBold: l.runs.some((r) => r.formatting.bold),
          hasItalic: l.runs.some((r) => r.formatting.italic),
          hasUnderline: l.runs.some((r) => r.formatting.underline),
          hasLinks: l.runs.some((r) => r.formatting.isLink),
          hasTokens: l.runs.some((r) => r.formatting.isToken),
          hasMixedFonts: fontFamilies.length > 1,
          hasMixedSizes: fontSizes.length > 1,
          hasMixedDirection: scriptInfo.hasMixedDirection,
          fontFamilies: fontFamilies.length > 0 ? fontFamilies : [context?.fontFamily || 'sans-serif'],
          fontSizes: fontSizes.length > 0 ? fontSizes : [context?.fontSizePx || 16],
          dominantDirection: lineDir,
        };

        return {
          index: idx,
          lineIndex: idx,
          rect: l.rect,
          top: l.top,
          bottom: l.bottom,
          left: l.left,
          right: l.right,
          width: l.rect.width,
          height: l.rect.height,
          charStart: l.charStart,
          charEnd: l.charEnd,
          text: l.text,
          direction: lineDir,
          writingMode,
          runs: l.runs,
          formattingContext,
          baseline: Math.round(l.rect.height * 0.8),
        };
      });

      const totalHeight = elOffsetHeight > 0 ? elOffsetHeight : (elRect.height > 0 ? elRect.height / effectiveScale : Math.max(lines.length * 20, 24));
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
   * Finds the exact text split boundary for an element that exceeds available height,
   * guaranteeing splitting on an authoritative visual line boundary.
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
      const effectiveScale = (connectedEl.offsetWidth > 0 && elRect.width > 0) ? (elRect.width / connectedEl.offsetWidth) : 1;
      const unscaledHeight = connectedEl.offsetHeight > 0 ? connectedEl.offsetHeight : (elRect.height > 0 ? elRect.height / effectiveScale : 0);
      if (unscaledHeight <= maxAllowedHeightPx) return null;

      const metrics = this.measureTextLines(connectedEl, context);
      const lines = metrics.lines;

      if (lines.length > 1) {
        let lastFittingIdx = -1;
        for (let i = 0; i < lines.length; i++) {
          const lineBottom = lines[i].rect.y + lines[i].rect.height;
          if (lineBottom <= maxAllowedHeightPx + 1) {
            lastFittingIdx = i;
          } else {
            break;
          }
        }

        if (lastFittingIdx >= 0) {
          const splitLine = lines[lastFittingIdx];
          const sliceHeight = splitLine.rect.y + splitLine.rect.height;
          return {
            splitOffset: splitLine.charEnd,
            splitNode: null,
            sliceHeight,
            remainingHeight: Math.max(16, unscaledHeight - sliceHeight),
          };
        }
      }

      return null;
    });
  }
}

