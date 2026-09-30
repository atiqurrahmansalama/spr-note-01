/**
 * ParagraphFragmenter
 * Line-boundary text and rich paragraph fragmentation engine.
 *
 * Part of SPR Note DocLab Enterprise Layout Architecture.
 *
 * Slices multi-line paragraphs at exact browser line boundaries crossing page breaks,
 * preserving font formatting, inline spans, hyperlinks, dynamic tokens, direction,
 * indentation, alignment, and CSS classes across both page fragments.
 */

import { TextMeasurement } from '../measurement/TextMeasurement';
import { MeasurementContext } from '../measurement/measurementTypes';
import { MeasurementCache } from '../measurement/MeasurementCache';
import { ParagraphNode, InlineNode, TextNode, LinkNode, TokenNode } from '../../model/types';
import { HtmlExporter } from '../../model/serialization/htmlExporter';
import { HtmlImporter } from '../../model/serialization/htmlImporter';
import { FragmentationRules } from './fragmentationRules';

export interface ParagraphSplitResult {
  firstFragmentHtml: string;
  remainingFragmentHtml: string | null;
  firstFragmentHeight: number;
  remainingFragmentHeight: number;
  firstFragmentNode?: ParagraphNode;
  remainingFragmentNode?: ParagraphNode | null;
  isSplit: boolean;
}

export interface MultiPageParagraphFragment {
  pageIndex: number;
  fragmentIndex: number;
  totalFragments: number;
  html: string;
  height: number;
  node?: ParagraphNode;
  isFirstFragment: boolean;
  isLastFragment: boolean;
}

export class ParagraphFragmenter {
  /**
   * Splits a canonical ParagraphNode AST at a calculated character/line split point
   */
  public static splitParagraphNode(
    para: ParagraphNode,
    availableHeightPx: number,
    context?: MeasurementContext
  ): ParagraphSplitResult {
    const html = HtmlExporter.serializeBlock(para, { tokenFormat: 'mustache', includeNodeIds: true });
    const domSplit = this.splitParagraph(html, availableHeightPx, context);

    if (!domSplit.isSplit) {
      return {
        ...domSplit,
        firstFragmentNode: domSplit.firstFragmentHtml ? para : undefined,
        remainingFragmentNode: domSplit.remainingFragmentHtml ? para : null,
      };
    }

    // Parse the split HTML slices back to canonical ParagraphNode fragments
    let firstNode: ParagraphNode | undefined;
    let remainingNode: ParagraphNode | null = null;

    if (domSplit.firstFragmentHtml) {
      const parsed1 = HtmlImporter.parseHtml(domSplit.firstFragmentHtml);
      firstNode = parsed1.body[0] && parsed1.body[0].type === 'paragraph'
        ? { ...(parsed1.body[0] as ParagraphNode), id: para.id }
        : { ...para, id: para.id };
    }

    if (domSplit.remainingFragmentHtml) {
      const parsed2 = HtmlImporter.parseHtml(domSplit.remainingFragmentHtml);
      remainingNode = parsed2.body[0] && parsed2.body[0].type === 'paragraph'
        ? { ...(parsed2.body[0] as ParagraphNode), id: para.id }
        : { ...para, id: para.id };
    }

    return {
      ...domSplit,
      firstFragmentNode: firstNode,
      remainingFragmentNode: remainingNode,
    };
  }

  /**
   * Splits a paragraph element or HTML string at the exact line boundary fitting availableHeightPx
   */
  public static splitParagraph(
    target: HTMLElement | string | any,
    availableHeightPx: number,
    context?: MeasurementContext
  ): ParagraphSplitResult {
    let el: HTMLElement;
    let isCreatedTemp = false;

    if (typeof target === 'string') {
      if (typeof document !== 'undefined') {
        const dummy = document.createElement('div');
        dummy.innerHTML = target.trim();
        el = (dummy.firstElementChild as HTMLElement) || dummy;
        isCreatedTemp = true;
      } else {
        return this.splitParagraphSSR(target, availableHeightPx, context);
      }
    } else if (typeof HTMLElement !== 'undefined' && target instanceof HTMLElement) {
      el = target;
    } else {
      const raw = (target && (target.rawHtml || target.outerHTML || target.textContent)) || '';
      return this.splitParagraphSSR(raw, availableHeightPx, context);
    }

    return TextMeasurement.withConnectedElement(el, context, (connectedEl) => {
      if (typeof document === 'undefined' || !connectedEl || !connectedEl.getBoundingClientRect) {
        const text = (target as any).textContent || (target as any).rawHtml || (typeof target === 'string' ? target : '');
        return this.splitParagraphSSR(text, availableHeightPx, context);
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

        // Evaluate orphan and widow rules
        if (lastFittingLineIdx >= 0) {
          const orphanWidowEval = FragmentationRules.evaluateOrphanWidow(lines.length, lastFittingLineIdx);
          if (orphanWidowEval.isValid && orphanWidowEval.adjustedSplitIndex >= 0) {
            lastFittingLineIdx = orphanWidowEval.adjustedSplitIndex;
          } else {
            // Cannot satisfy orphan/widow constraints -> push entire paragraph to next page
            return {
              firstFragmentHtml: '',
              remainingFragmentHtml: connectedEl.outerHTML,
              firstFragmentHeight: 0,
              remainingFragmentHeight: elHeight,
              isSplit: false,
            };
          }
        }

        // If a valid split point was found
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

      // 3. Fallback for single non-splittable line or small available height: push to next page
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
   * Slices a continuous paragraph across multiple pages (e.g. 2, 3, 5+ pages)
   */
  public static fragmentParagraphAcrossPages(
    target: HTMLElement | string | ParagraphNode,
    pageAvailableHeights: number[],
    context?: MeasurementContext
  ): MultiPageParagraphFragment[] {
    let currentHtml = typeof target === 'string'
      ? target
      : typeof HTMLElement !== 'undefined' && target instanceof HTMLElement
      ? target.outerHTML
      : HtmlExporter.serializeBlock(target as ParagraphNode, { tokenFormat: 'mustache', includeNodeIds: true });

    const fragments: MultiPageParagraphFragment[] = [];
    let pageIdx = 0;
    const defaultHeight = pageAvailableHeights.length > 0 ? pageAvailableHeights[pageAvailableHeights.length - 1] : 800;
    let safetyCounter = 0;

    while (currentHtml && currentHtml.trim() && safetyCounter < 5000) {
      safetyCounter++;
      const availH = pageIdx < pageAvailableHeights.length ? pageAvailableHeights[pageIdx] : defaultHeight;
      const splitRes = this.splitParagraph(currentHtml, availH, context);

      if (!splitRes.isSplit) {
        if (splitRes.firstFragmentHtml && splitRes.firstFragmentHtml.trim()) {
          fragments.push({
            pageIndex: pageIdx,
            fragmentIndex: fragments.length,
            totalFragments: fragments.length + 1,
            html: splitRes.firstFragmentHtml,
            height: splitRes.firstFragmentHeight,
            node: splitRes.firstFragmentNode,
            isFirstFragment: fragments.length === 0,
            isLastFragment: true,
          });
          currentHtml = '';
        } else if (splitRes.remainingFragmentHtml && splitRes.remainingFragmentHtml.trim()) {
          // Pushed completely to next page
          pageIdx++;
          continue;
        } else {
          break;
        }
      } else {
        fragments.push({
          pageIndex: pageIdx,
          fragmentIndex: fragments.length,
          totalFragments: fragments.length + 2,
          html: splitRes.firstFragmentHtml,
          height: splitRes.firstFragmentHeight,
          node: splitRes.firstFragmentNode,
          isFirstFragment: fragments.length === 0,
          isLastFragment: false,
        });

        currentHtml = splitRes.remainingFragmentHtml || '';
        pageIdx++;
      }
    }

    // Update totalFragments count accurately across all collected fragments
    const total = fragments.length;
    return fragments.map((f, idx) => ({
      ...f,
      fragmentIndex: idx,
      totalFragments: total,
      isFirstFragment: idx === 0,
      isLastFragment: idx === total - 1,
    }));
  }

  /**
   * Splits a DOM element tree cleanly at a global character offset, preserving all tags,
   * inline formatting marks, links, and element attributes across both halves.
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

      // Create second paragraph fragment with identical tag and attributes (avoiding duplicate DOM id)
      const p2 = document.createElement(el.tagName.toLowerCase());
      Array.from(el.attributes).forEach((attr) => {
        if (attr.name.toLowerCase() !== 'id') {
          p2.setAttribute(attr.name, attr.value);
        }
      });
      p2.appendChild(postFragment);

      const sourceId =
        el.getAttribute('data-source-node-id') ||
        el.getAttribute('data-source-id') ||
        el.getAttribute('data-node-id') ||
        el.id ||
        'p_body';

      clone.setAttribute('data-source-node-id', sourceId);
      clone.setAttribute('data-source-id', sourceId);
      clone.setAttribute('data-fragment-index', '0');
      clone.setAttribute('data-fragment-total', '2');
      clone.setAttribute('data-is-fragment', 'true');

      p2.setAttribute('data-source-node-id', sourceId);
      p2.setAttribute('data-source-id', sourceId);
      p2.setAttribute('data-fragment-index', '1');
      p2.setAttribute('data-fragment-total', '2');
      p2.setAttribute('data-is-fragment', 'true');
      p2.setAttribute('data-is-continuation', 'true');

      return {
        firstHtml: clone.outerHTML,
        remainingHtml: p2.outerHTML,
      };
    } catch (err) {
      console.warn('ParagraphFragmenter splitElementAtCharOffset error:', err);
      return null;
    }
  }

  /**
   * SSR fallback for Node.js / unit tests
   */
  private static splitParagraphSSR(
    htmlOrText: string,
    availableHeightPx: number,
    context?: MeasurementContext
  ): ParagraphSplitResult {
    const raw = htmlOrText.trim();
    const tagMatch = raw.match(/^<([a-z0-9]+)([^>]*)>([\s\S]*)<\/\1>$/i);
    const tagName = tagMatch ? tagMatch[1] : 'p';
    const tagAttrs = tagMatch ? tagMatch[2] : '';
    const innerContent = tagMatch ? tagMatch[3] : raw;
    const plainText = innerContent.replace(/<[^>]+>/g, '');

    const scriptAdj = MeasurementCache.estimateScriptAdjustment(plainText);
    const fontSize = context?.fontSizePx || 16;
    const lineHeight = fontSize * (context?.lineHeight ? Number(context.lineHeight) : 1.5) * scriptAdj.heightMultiplier;
    const containerWidth = context?.containerWidth || 602;
    const avgCharWidth = fontSize * 0.55 * scriptAdj.charWidthMultiplier;
    const charsPerLine = Math.max(20, Math.floor(containerWidth / avgCharWidth));
    const totalLines = Math.max(1, Math.ceil(plainText.length / charsPerLine));
    const approxHeight = Math.max(lineHeight, totalLines * lineHeight);

    if (approxHeight <= availableHeightPx) {
      return {
        firstFragmentHtml: raw,
        remainingFragmentHtml: null,
        firstFragmentHeight: approxHeight,
        remainingFragmentHeight: 0,
        isSplit: false,
      };
    }

    const fittingLines = Math.floor(availableHeightPx / lineHeight);

    // Check orphan & widow rules
    if (fittingLines < 2 || totalLines - fittingLines < 2) {
      return {
        firstFragmentHtml: '',
        remainingFragmentHtml: raw,
        firstFragmentHeight: 0,
        remainingFragmentHeight: approxHeight,
        isSplit: false,
      };
    }

    const splitCharIdx = fittingLines * charsPerLine;
    const lastSpace = plainText.lastIndexOf(' ', splitCharIdx);
    const cutIdx = lastSpace > splitCharIdx * 0.7 ? lastSpace : splitCharIdx;

    const part1 = plainText.slice(0, cutIdx).trim();
    const part2 = plainText.slice(cutIdx).trim();

    const firstH = fittingLines * lineHeight;
    const remH = (totalLines - fittingLines) * lineHeight;

    const sourceIdMatch = tagAttrs.match(/(?:data-source-node-id|data-source-id|data-node-id|id)=["']([^"']+)["']/i);
    const sourceId = sourceIdMatch ? sourceIdMatch[1] : 'p_body';

    const cleanAttrs = tagAttrs.replace(/\s*data-(?:source-node-id|source-id|fragment-index|fragment-total|is-fragment|is-continuation)=["'][^"']*["']/gi, '');
    const firstAttrs = `${cleanAttrs} data-source-node-id="${sourceId}" data-source-id="${sourceId}" data-fragment-index="0" data-fragment-total="2" data-is-fragment="true"`;
    const remAttrs = `${cleanAttrs} data-source-node-id="${sourceId}" data-source-id="${sourceId}" data-fragment-index="1" data-fragment-total="2" data-is-fragment="true" data-is-continuation="true"`;

    return {
      firstFragmentHtml: `<${tagName}${firstAttrs}>${part1}</${tagName}>`,
      remainingFragmentHtml: `<${tagName}${remAttrs}>${part2}</${tagName}>`,
      firstFragmentHeight: firstH,
      remainingFragmentHeight: remH,
      isSplit: true,
    };
  }
}

