import { renderAsync } from 'docx-preview';
import mammoth from 'mammoth';
import JSZip from 'jszip';

import type {
  PrintPageSize,
  PrintOrientation,
  PrintMargin,
  DocxPageProperties,
} from './types';
import { separateDocxStylesAndBody, sanitizeDocxStyles } from './docxStyleUtils';
import { extractDocxPageProperties } from './docxGeometry';
import { detectPlaceholders } from './docxTokenFilters';

export interface DocxParseResult {
  html: string;
  messages: string[];
  detectedPlaceholders: string[];
  isTableDocument: boolean;
  extractedColumns: Array<{ id: string; header: string; label: string }>;
  extractedRows: Array<Record<string, any>>;
  pageProperties: DocxPageProperties;
  pageSize: PrintPageSize;
  orientation: PrintOrientation;
  margin: PrintMargin;
}

/**
 * Normalizes all SVG vector drawings, lines, and shapes in the parsed docx sandbox.
 */
export function normalizeSandboxSvgElements(sandbox: HTMLElement): void {
  const svgs = sandbox.querySelectorAll('svg');
  svgs.forEach((svg) => {
    const el = svg as SVGElement;
    const htmlEl = el as unknown as HTMLElement;
    el.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    htmlEl.style.maxWidth = '100%';
    htmlEl.style.overflow = 'visible';

    // If svg is inside a table, do not force full-page divider styles
    const isInsideTable = Boolean(htmlEl.closest('table'));

    // Preserve exact spacing from docx-preview or style attributes
    const parentEl = htmlEl.parentElement;
    const computedMarginTop = htmlEl.style.marginTop || parentEl?.style.marginTop;
    const computedMarginBottom = htmlEl.style.marginBottom || parentEl?.style.marginBottom;

    // Normalize child <line>
    const lines = el.querySelectorAll('line');
    lines.forEach((line) => {
      const stroke = line.getAttribute('stroke');
      if (!stroke || stroke === 'none' || stroke === 'null' || stroke === 'transparent') {
        line.setAttribute('stroke', '#0f172a');
      }
      if (!line.getAttribute('stroke-width')) {
        line.setAttribute('stroke-width', '1.5');
      }

      if (!isInsideTable) {
        const x1 = parseFloat(line.getAttribute('x1') || '0');
        const y1 = parseFloat(line.getAttribute('y1') || '0');
        const x2 = parseFloat(line.getAttribute('x2') || '0');
        const y2 = parseFloat(line.getAttribute('y2') || '0');

        // Horizontal line divider
        if (Math.abs(y1 - y2) <= 4 || (x2 > 50 && y1 === 0 && y2 === 0)) {
          const widthVal = Math.max(x1, x2, 100);
          const isCentered =
            htmlEl.style.textAlign === 'center' ||
            parentEl?.style.textAlign === 'center' ||
            parentEl?.getAttribute('align') === 'center';

          htmlEl.style.width = widthVal >= 550 ? '100%' : `${widthVal}px`;
          htmlEl.style.height = '4px';
          htmlEl.style.display = 'block';
          htmlEl.style.marginTop = computedMarginTop || '8px';
          htmlEl.style.marginBottom = computedMarginBottom || '10px';
          htmlEl.style.marginLeft = isCentered ? 'auto' : '0';
          htmlEl.style.marginRight = isCentered ? 'auto' : '0';
          el.setAttribute('preserveAspectRatio', 'none');
          el.setAttribute('viewBox', `0 0 ${widthVal} 4`);
          line.setAttribute('x1', '0');
          line.setAttribute('y1', '2');
          line.setAttribute('x2', String(widthVal));
          line.setAttribute('y2', '2');
        }
      }
    });

    // Normalize child <rect>
    const rects = el.querySelectorAll('rect');
    rects.forEach((rect) => {
      const fill = rect.getAttribute('fill');
      if (!fill || fill === 'none' || fill === 'null') {
        rect.setAttribute('fill', '#0f172a');
      }
      const h = parseFloat(rect.getAttribute('height') || '0');
      if (!isInsideTable && h > 0 && h <= 6) {
        const w = parseFloat(rect.getAttribute('width') || '0');
        const isCentered =
          htmlEl.style.textAlign === 'center' ||
          parentEl?.style.textAlign === 'center' ||
          parentEl?.getAttribute('align') === 'center';

        htmlEl.style.width = w > 0 && w < 550 ? `${w}px` : '100%';
        htmlEl.style.height = `${Math.max(h, 2)}px`;
        htmlEl.style.display = 'block';
        htmlEl.style.marginTop = computedMarginTop || '8px';
        htmlEl.style.marginBottom = computedMarginBottom || '10px';
        htmlEl.style.marginLeft = isCentered ? 'auto' : '0';
        htmlEl.style.marginRight = isCentered ? 'auto' : '0';
      }
    });

    // Normalize child paths, polylines, polygons
    const paths = el.querySelectorAll('path, polyline, polygon');
    paths.forEach((p) => {
      const stroke = p.getAttribute('stroke');
      const fill = p.getAttribute('fill');
      if ((!stroke || stroke === 'none') && (!fill || fill === 'none')) {
        p.setAttribute('stroke', '#0f172a');
        p.setAttribute('stroke-width', '1.5');
      }
    });

    // Ensure viewBox if dimensions exist
    if (!el.getAttribute('viewBox')) {
      const w = parseFloat(el.getAttribute('width') || '0');
      const h = parseFloat(el.getAttribute('height') || '0');
      if (w > 0 && h > 0) {
        el.setAttribute('viewBox', `0 0 ${w} ${h}`);
      }
    }
  });

  // Normalize all <hr> tags
  const hrs = sandbox.querySelectorAll('hr');
  hrs.forEach((hr) => {
    const el = hr as HTMLElement;
    el.style.border = 'none';
    el.style.borderTop = '1.5px solid #0f172a';
    el.style.marginTop = el.style.marginTop || '8px';
    el.style.marginBottom = el.style.marginBottom || '10px';
    el.style.width = '100%';
    el.style.display = 'block';
  });
}

/**
 * Extracts exact paragraph before/after spacing in pixels from OpenXML paragraph node.
 */
function extractParagraphSpacingPx(xmlP: Element): { beforePx: number; afterPx: number } {
  const spacingNode = Array.from(xmlP.getElementsByTagName('*')).find(
    (node) => node.localName === 'spacing'
  );
  let beforePx = 4;
  let afterPx = 6;

  if (spacingNode) {
    const beforeAttr = spacingNode.getAttribute('w:before') || spacingNode.getAttribute('before');
    const afterAttr = spacingNode.getAttribute('w:after') || spacingNode.getAttribute('after');

    if (beforeAttr) {
      const beforeTwips = parseInt(beforeAttr, 10);
      if (!isNaN(beforeTwips)) {
        beforePx = Math.round((beforeTwips / 20) * 1.333); // 1 twip = 1/20 pt = (1/20)*1.333 px
      }
    }

    if (afterAttr) {
      const afterTwips = parseInt(afterAttr, 10);
      if (!isNaN(afterTwips)) {
        afterPx = Math.round((afterTwips / 20) * 1.333);
      }
    }
  }

  return { beforePx, afterPx };
}

/**
 * Extracts top and bottom distance in pixels from DrawingML inline or anchor wrapper.
 */
function extractDrawingDistancesPx(drawingOrPictNode: Element): { distTPx: number; distBPx: number } {
  let distTPx = 0;
  let distBPx = 0;

  const wrapperNode = Array.from(drawingOrPictNode.getElementsByTagName('*')).find(
    (node) => node.localName === 'inline' || node.localName === 'anchor'
  );

  if (wrapperNode) {
    const distT = wrapperNode.getAttribute('distT');
    const distB = wrapperNode.getAttribute('distB');
    if (distT) {
      const emus = parseInt(distT, 10);
      if (!isNaN(emus)) {
        distTPx = Math.round(emus / 9525); // 1px = 9525 EMUs
      }
    }
    if (distB) {
      const emus = parseInt(distB, 10);
      if (!isNaN(emus)) {
        distBPx = Math.round(emus / 9525);
      }
    }
  }

  return { distTPx, distBPx };
}

/**
 * Checks whether an OpenXML paragraph element is an empty line (blank paragraph).
 */
function isXmlParagraphEmpty(xmlP: Element | null | undefined): boolean {
  if (!xmlP) return false;
  const allChildren = Array.from(xmlP.getElementsByTagName('*'));
  const hasText = allChildren.some(
    (n) => n.localName === 't' && (n.textContent || '').trim().length > 0
  );
  const hasMedia = allChildren.some(
    (n) => ['drawing', 'pict', 'tbl', 'object', 'wsp', 'line', 'rect', 'shape'].includes(n.localName)
  );
  return !hasText && !hasMedia;
}

/**
 * Finds a top-level DOM paragraph that contains or matches the given text snippet.
 */
function findDomParagraphByText(
  topLevelDomPs: HTMLElement[],
  text: string
): HTMLElement | null {
  if (!text || topLevelDomPs.length === 0) return null;
  const cleanTarget = text.replace(/\s+/g, ' ').trim();
  if (!cleanTarget) return null;

  for (const domP of topLevelDomPs) {
    const pText = (domP.textContent || '').replace(/\s+/g, ' ').trim();
    if (pText && (pText === cleanTarget || pText.includes(cleanTarget) || cleanTarget.includes(pText))) {
      return domP;
    }
  }
  return null;
}

/**
 * Helper to construct a clean shape paragraph containing an SVG line or drawing.
 */
function createDocxShapeParagraph(svgEl: SVGElement, isCentered: boolean): HTMLElement {
  const shapeP = document.createElement('p');
  shapeP.className = 'docx_p docx-shape-paragraph';
  shapeP.style.margin = '0px';
  shapeP.style.padding = '0px';
  shapeP.style.minHeight = 'auto';
  shapeP.style.lineHeight = 'normal';
  shapeP.style.textAlign = isCentered ? 'center' : 'left';
  shapeP.appendChild(svgEl);
  return shapeP;
}

/**
 * Removes empty intermediate paragraph nodes or orphaned SVGs/HRs between text anchors.
 */
function removeIntermediateEmptyNodes(fromNode: HTMLElement | null, toNode: HTMLElement | null, direction: 'forward' | 'backward' = 'forward'): void {
  const intermediateNodes: HTMLElement[] = [];
  let curr = direction === 'forward' ? fromNode?.nextElementSibling as HTMLElement | null : fromNode?.previousElementSibling as HTMLElement | null;
  while (curr && curr !== toNode) {
    const next = direction === 'forward' ? curr.nextElementSibling as HTMLElement | null : curr.previousElementSibling as HTMLElement | null;
    if (!curr.textContent?.trim() || curr.querySelector('svg, hr')) {
      intermediateNodes.push(curr);
    }
    curr = next;
  }
  intermediateNodes.forEach((node) => {
    if (node.parentNode) node.parentNode.removeChild(node);
  });
}

/**
 * Places an SVG element accurately into the DOM based on surrounding text paragraph anchors,
 * cleaning up any duplicate intermediate DOM nodes (such as docx-preview raw SVGs or excess empty paragraphs).
 */
function placeSvgElementWithAnchors(
  svgEl: SVGElement,
  topLevelXmlPs: Element[],
  xmlIdx: number,
  topLevelDomPs: HTMLElement[],
  xmlText: string,
  isCentered: boolean
): void {
  // If the current XML paragraph itself has text, match directly
  if (xmlText.length > 0) {
    const directDomP = findDomParagraphByText(topLevelDomPs, xmlText);
    if (directDomP) {
      if (!directDomP.querySelector('svg, hr')) {
        directDomP.insertAdjacentElement('afterend', svgEl);
      }
      return;
    }
  }

  // Find nearest previous XML paragraph with text
  let prevText = '';
  for (let i = xmlIdx - 1; i >= 0; i--) {
    const tNodes = Array.from(topLevelXmlPs[i].getElementsByTagName('*')).filter(
      (n) => n.localName === 't'
    );
    const txt = tNodes.map((t) => t.textContent || '').join('').trim();
    if (txt.length > 0) {
      prevText = txt;
      break;
    }
  }

  // Find nearest next XML paragraph with text
  let nextText = '';
  let nextTextXmlIdx = -1;
  for (let i = xmlIdx + 1; i < topLevelXmlPs.length; i++) {
    const tNodes = Array.from(topLevelXmlPs[i].getElementsByTagName('*')).filter(
      (n) => n.localName === 't'
    );
    const txt = tNodes.map((t) => t.textContent || '').join('').trim();
    if (txt.length > 0) {
      nextText = txt;
      nextTextXmlIdx = i;
      break;
    }
  }

  const prevDomP = prevText ? findDomParagraphByText(topLevelDomPs, prevText) : null;
  const nextDomP = nextText ? findDomParagraphByText(topLevelDomPs, nextText) : null;

  // Case 1: We found a preceding DOM paragraph anchor
  if (prevDomP) {
    removeIntermediateEmptyNodes(prevDomP, nextDomP, 'forward');

    const shapeP = createDocxShapeParagraph(svgEl, isCentered);
    prevDomP.insertAdjacentElement('afterend', shapeP);

    // Count how many empty XML paragraphs exist in Word OpenXML between this shape and nextTextXmlP
    let emptyXmlCount = 0;
    if (nextTextXmlIdx > xmlIdx + 1) {
      for (let i = xmlIdx + 1; i < nextTextXmlIdx; i++) {
        if (isXmlParagraphEmpty(topLevelXmlPs[i])) {
          emptyXmlCount++;
        }
      }
    }

    // Insert exactly that number of blank lines (typically 1)
    let lastInserted: HTMLElement = shapeP;
    for (let k = 0; k < emptyXmlCount; k++) {
      const blankP = document.createElement('p');
      blankP.className = 'docx_p';
      blankP.innerHTML = '<br>';
      blankP.style.minHeight = '1.2em';
      blankP.style.lineHeight = '1.3';
      blankP.style.display = 'block';
      blankP.style.margin = '2px 0';
      if (isCentered) blankP.style.textAlign = 'center';
      lastInserted.insertAdjacentElement('afterend', blankP);
      lastInserted = blankP;
    }
    return;
  }

  // Case 2: No preceding DOM paragraph anchor, but nextDomP exists
  if (nextDomP) {
    removeIntermediateEmptyNodes(nextDomP, null, 'backward');

    const shapeP = createDocxShapeParagraph(svgEl, isCentered);
    nextDomP.insertAdjacentElement('beforebegin', shapeP);
    return;
  }

  // Fallback: Place in topLevelDomPs[xmlIdx]
  if (xmlIdx >= 0 && xmlIdx < topLevelDomPs.length) {
    const fallbackP = topLevelDomPs[xmlIdx];
    if (fallbackP.textContent?.trim().length === 0) {
      fallbackP.innerHTML = '';
      fallbackP.appendChild(svgEl);
      fallbackP.style.margin = '0px';
      fallbackP.style.padding = '0px';
      fallbackP.style.minHeight = 'auto';
      fallbackP.style.lineHeight = 'normal';
    } else {
      fallbackP.insertAdjacentElement('afterend', svgEl);
    }
  }
}

/**
 * Enriches sandbox DOM elements with DrawingML vector shapes, lines, and borders directly from OpenXML document.xml.
 * Strictly operates on top-level body paragraphs to prevent touching table cells.
 */
export async function enrichDocxHtmlFromOpenXml(
  arrayBuffer: ArrayBuffer,
  sandbox: HTMLElement
): Promise<void> {
  // 1. First normalize any SVG/VML elements rendered by docx-preview
  normalizeSandboxSvgElements(sandbox);

  // 2. Inspect OpenXML document.xml for dropped DrawingML shapes, VML lines, and paragraph borders
  try {
    const zip = await JSZip.loadAsync(arrayBuffer.slice(0));
    const docXmlFile = zip.file('word/document.xml');
    if (!docXmlFile) return;

    const docXmlText = await docXmlFile.async('text');
    if (!docXmlText || typeof DOMParser === 'undefined') return;

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(docXmlText, 'text/xml');
    if (xmlDoc.getElementsByTagName('parsererror').length > 0) return;

    const bodyNode = Array.from(xmlDoc.getElementsByTagName('*')).find(
      (node) => node.localName === 'body'
    );
    if (!bodyNode) return;

    // Extract ONLY top-level body paragraphs (NEVER inside tables)
    const topLevelXmlPs = Array.from(bodyNode.children).filter(
      (child) => child.localName === 'p'
    );

    // Get ONLY top-level DOM paragraphs in sandbox (NEVER inside <table>)
    const allDomPs = Array.from(
      sandbox.querySelectorAll('p, div.docx_p, .docx_p, h1, h2, h3, h4, h5, h6')
    ) as HTMLElement[];
    const topLevelDomPs = allDomPs.filter((el) => !el.closest('table'));

    topLevelXmlPs.forEach((xmlP, idx) => {
      // Extract text from paragraph
      const tNodes = Array.from(xmlP.getElementsByTagName('*')).filter(
        (node) => node.localName === 't'
      );
      const xmlText = tNodes.map((t) => t.textContent || '').join('').trim();

      // Extract exact paragraph spacing
      const { beforePx: pSpacingBefore, afterPx: pSpacingAfter } = extractParagraphSpacingPx(xmlP);

      // Check alignment from XML (jc center, right, left)
      const jcNode = Array.from(xmlP.getElementsByTagName('*')).find(
        (node) => node.localName === 'jc'
      );
      const jcVal = jcNode?.getAttribute('w:val') || jcNode?.getAttribute('val') || '';
      const isCentered = jcVal === 'center' || jcVal === 'both';

      // Check 1: DrawingML Shapes (<w:drawing> with <wps:wsp> / <a:prstGeom> / <a:ln>)
      const drawings = Array.from(xmlP.getElementsByTagName('*')).filter(
        (node) => node.localName === 'drawing'
      );
      if (drawings.length > 0) {
        for (const drawing of drawings) {
          const wsps = Array.from(drawing.getElementsByTagName('*')).filter(
            (node) => node.localName === 'wsp' || node.localName === 'prstGeom' || node.localName === 'ln'
          );
          if (wsps.length > 0) {
            let lineWidthPx = 1.5;
            let strokeColor = '#0f172a';
            let shapeWidthPx = 350; // default shape width in px (~260pt)

            // Extract extent (width cx in EMUs: 1px = 9525 EMUs at 96 DPI)
            const extentNodes = Array.from(drawing.getElementsByTagName('*')).filter(
              (node) => node.localName === 'extent' || node.localName === 'ext'
            );
            if (extentNodes.length > 0) {
              const cxAttr = extentNodes[0].getAttribute('cx');
              if (cxAttr) {
                const cxEmus = parseInt(cxAttr, 10);
                if (cxEmus > 0) {
                  shapeWidthPx = Math.round(cxEmus / 9525);
                }
              }
            }

            const lnNodes = Array.from(drawing.getElementsByTagName('*')).filter(
              (node) => node.localName === 'ln'
            );
            if (lnNodes.length > 0) {
              const wAttr = lnNodes[0].getAttribute('w');
              if (wAttr) {
                lineWidthPx = Math.max(1, Math.round((parseInt(wAttr, 10) / 12700) * 10) / 10);
              }
              const srgbClr = Array.from(lnNodes[0].getElementsByTagName('*')).find(
                (node) => node.localName === 'srgbClr'
              );
              if (srgbClr) {
                const val = srgbClr.getAttribute('val');
                if (val) strokeColor = `#${val}`;
              }
            }

            // Extract exact top/bottom distances and preserve Word vertical breathing room
            const { distTPx, distBPx } = extractDrawingDistancesPx(drawing);
            const marginTopPx = Math.max(pSpacingBefore, distTPx, 6);
            const marginBottomPx = Math.max(pSpacingAfter, distBPx, 6);

            const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            svgEl.setAttribute('viewBox', `0 0 ${shapeWidthPx} 4`);
            svgEl.setAttribute('preserveAspectRatio', 'none');
            svgEl.setAttribute('class', 'docx-vector-line');

            const isFullWidth = shapeWidthPx >= 550;
            svgEl.style.width = isFullWidth ? '100%' : `${shapeWidthPx}px`;
            svgEl.style.maxWidth = '100%';
            svgEl.style.height = `${Math.max(lineWidthPx * 2, 4)}px`;
            svgEl.style.display = 'block';
            svgEl.style.marginTop = `${marginTopPx}px`;
            svgEl.style.marginBottom = `${marginBottomPx}px`;
            svgEl.style.marginLeft = isCentered ? 'auto' : '0';
            svgEl.style.marginRight = isCentered ? 'auto' : '0';
            svgEl.style.overflow = 'visible';

            const lineEl = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            lineEl.setAttribute('x1', '0');
            lineEl.setAttribute('y1', '2');
            lineEl.setAttribute('x2', String(shapeWidthPx));
            lineEl.setAttribute('y2', '2');
            lineEl.setAttribute('stroke', strokeColor);
            lineEl.setAttribute('stroke-width', String(lineWidthPx));
            svgEl.appendChild(lineEl);

            placeSvgElementWithAnchors(svgEl, topLevelXmlPs, idx, topLevelDomPs, xmlText, isCentered);
          }
        }
      }

      // Check 2: VML Shapes (<w:pict> with <v:line> / <v:rect> / <v:shape>)
      const picts = Array.from(xmlP.getElementsByTagName('*')).filter(
        (node) => node.localName === 'pict'
      );
      if (picts.length > 0) {
        for (const pict of picts) {
          const vLines = Array.from(pict.getElementsByTagName('*')).filter(
            (node) => node.localName === 'line' || node.localName === 'rect' || node.localName === 'shape'
          );
          if (vLines.length > 0) {
            const vEl = vLines[0];
            const strokeColorAttr = vEl.getAttribute('strokecolor') || vEl.getAttribute('fillcolor') || '#0f172a';
            const strokeColor = strokeColorAttr.startsWith('#') ? strokeColorAttr : `#${strokeColorAttr}`;

            // Extract exact width from `to` or `style`
            let shapeWidthPx = 350;
            const toAttr = vEl.getAttribute('to');
            if (toAttr) {
              const x2Val = parseFloat(toAttr.split(',')[0]) || 0;
              if (x2Val > 0) {
                shapeWidthPx = toAttr.includes('pt') ? Math.round(x2Val * 1.333) : Math.round(x2Val);
              }
            } else {
              const styleAttr = vEl.getAttribute('style') || '';
              const wMatch = styleAttr.match(/width\s*:\s*([\d\.]+)(pt|px)?/i);
              if (wMatch) {
                const num = parseFloat(wMatch[1]);
                shapeWidthPx = wMatch[2]?.toLowerCase() === 'pt' ? Math.round(num * 1.333) : Math.round(num);
              }
            }

            // Extract exact VML margin-top and margin-bottom from style attribute
            let marginTopPx = Math.max(pSpacingBefore, 6);
            let marginBottomPx = Math.max(pSpacingAfter, 6);
            const styleAttr = vEl.getAttribute('style') || '';
            const mtMatch = styleAttr.match(/margin-top\s*:\s*([\d\.]+)(pt|px)?/i);
            if (mtMatch) {
              const num = parseFloat(mtMatch[1]);
              const parsedMt = mtMatch[2]?.toLowerCase() === 'pt' ? Math.round(num * 1.333) : Math.round(num);
              marginTopPx = Math.max(parsedMt, 6);
            }
            const mbMatch = styleAttr.match(/margin-bottom\s*:\s*([\d\.]+)(pt|px)?/i);
            if (mbMatch) {
              const num = parseFloat(mbMatch[1]);
              const parsedMb = mbMatch[2]?.toLowerCase() === 'pt' ? Math.round(num * 1.333) : Math.round(num);
              marginBottomPx = Math.max(parsedMb, 6);
            }

            const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            svgEl.setAttribute('viewBox', `0 0 ${shapeWidthPx} 4`);
            svgEl.setAttribute('preserveAspectRatio', 'none');
            svgEl.setAttribute('class', 'docx-vml-vector-line');

            const isFullWidth = shapeWidthPx >= 550;
            svgEl.style.width = isFullWidth ? '100%' : `${shapeWidthPx}px`;
            svgEl.style.maxWidth = '100%';
            svgEl.style.height = '4px';
            svgEl.style.display = 'block';
            svgEl.style.marginTop = `${marginTopPx}px`;
            svgEl.style.marginBottom = `${marginBottomPx}px`;
            svgEl.style.marginLeft = isCentered ? 'auto' : '0';
            svgEl.style.marginRight = isCentered ? 'auto' : '0';
            svgEl.style.overflow = 'visible';

            const lineEl = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            lineEl.setAttribute('x1', '0');
            lineEl.setAttribute('y1', '2');
            lineEl.setAttribute('x2', String(shapeWidthPx));
            lineEl.setAttribute('y2', '2');
            lineEl.setAttribute('stroke', strokeColor);
            lineEl.setAttribute('stroke-width', '1.5');
            svgEl.appendChild(lineEl);

            placeSvgElementWithAnchors(svgEl, topLevelXmlPs, idx, topLevelDomPs, xmlText, isCentered);
          }
        }
      }
    });
  } catch (err) {
    console.warn('OpenXML shape enrichment non-critical warning:', err);
  }
}

/**
 * Parses a Word document (.docx) ArrayBuffer into 100% exact OpenXML high-fidelity HTML and extracts structured tables.
 */
export async function parseDocxDocument(arrayBuffer: ArrayBuffer): Promise<DocxParseResult> {
  let html = '';
  let messages: string[] = [];
  let parsedSandbox: HTMLElement | null = null;
  let extractedPageProperties: DocxPageProperties | null = null;

  if (typeof document !== 'undefined') {
    const sandbox = document.createElement('div');
    sandbox.className = 'docx-preview-sandbox';
    sandbox.style.position = 'fixed';
    sandbox.style.left = '-99999px';
    sandbox.style.top = '0';
    sandbox.style.width = '1400px';
    sandbox.style.opacity = '0';
    sandbox.style.pointerEvents = 'none';
    sandbox.style.zIndex = '-99999';

    try {
      document.body.appendChild(sandbox);

      await renderAsync(arrayBuffer.slice(0), sandbox, null, {
        inWrapper: false,
        ignoreWidth: false, // PRESERVE exact table and column widths from Word!
        ignoreHeight: false, // PRESERVE row heights from Word!
        ignoreFonts: true, // Use local system fonts instantly (zero network latency & zero font blob overhead)
        breakPages: true, // Respect Word page breaks and generate discrete section.docx per page!
        experimental: false,
        useBase64URL: true,
        renderHeaders: true,
        renderFooters: true,
        renderFootnotes: true,
        renderEndnotes: true,
      });

      parsedSandbox = sandbox;

      // Extract page properties BEFORE resetting section container styles
      extractedPageProperties = extractDocxPageProperties(sandbox, '');

      // Normalize docx section and article wrappers so they don't force fixed widths or double padding
      const docxSections = sandbox.querySelectorAll('.docx, section.docx, article.docx');
      docxSections.forEach((sec) => {
        const el = sec as HTMLElement;
        el.style.width = '100%';
        el.style.maxWidth = '100%';
        el.style.minHeight = 'auto';
        el.style.height = 'auto';
        el.style.padding = '0px';
        el.style.margin = '0px';
        el.style.boxShadow = 'none';
        el.style.border = 'none';
        el.style.backgroundColor = '#ffffff';
        el.style.color = '#0f172a';
      });

      const articles = sandbox.querySelectorAll('article');
      articles.forEach((art) => {
        const el = art as HTMLElement;
        el.style.width = '100%';
        el.style.maxWidth = '100%';
        el.style.padding = '0px';
        el.style.margin = '0px';
        el.style.backgroundColor = '#ffffff';
        el.style.color = '#0f172a';
      });

      // Normalize images and embedded SVGs
      const images = sandbox.querySelectorAll('img');
      images.forEach((img) => {
        const el = img as HTMLElement;
        el.style.maxWidth = '100%';
        el.style.height = 'auto';
        el.style.display = 'inline-block';
        el.style.verticalAlign = 'middle';
      });

      // Normalize SVG elements, vector drawings, and graphics
      const svgs = sandbox.querySelectorAll('svg');
      svgs.forEach((svg) => {
        const el = svg as SVGElement;
        const htmlEl = el as unknown as HTMLElement;
        htmlEl.style.maxWidth = '100%';
        htmlEl.style.overflow = 'visible';
        htmlEl.style.display = 'inline-block';
        htmlEl.style.verticalAlign = 'middle';
        if (!el.getAttribute('xmlns')) {
          el.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        }
        // If viewBox is missing but width and height exist, create viewBox so it scales seamlessly
        if (!el.getAttribute('viewBox')) {
          const w = parseFloat(el.getAttribute('width') || '0');
          const h = parseFloat(el.getAttribute('height') || '0');
          if (w > 0 && h > 0) {
            el.setAttribute('viewBox', `0 0 ${w} ${h}`);
          }
        }
      });

      // Normalize table structures inside sandbox for 100% layout, column, and text-alignment fidelity
      const tables = sandbox.querySelectorAll('table');
      tables.forEach((tbl) => {
        tbl.style.borderCollapse = 'collapse';
        if (!tbl.style.width || tbl.style.width === 'auto') {
          tbl.style.width = '100%';
        }
        tbl.style.maxWidth = '100%';

        // Preserve colgroup and col widths
        const cols = tbl.querySelectorAll('col');
        cols.forEach((col) => {
          const colEl = col as HTMLElement;
          const widthAttr = colEl.getAttribute('width');
          if (widthAttr && !colEl.style.width) {
            colEl.style.width = widthAttr.endsWith('%') || widthAttr.endsWith('px') || widthAttr.endsWith('pt') ? widthAttr : `${widthAttr}px`;
          }
        });

        // Normalize table rows: reset row-level textAlign so cells govern their own alignment
        const trs = tbl.querySelectorAll('tr');
        trs.forEach((tr) => {
          if (tr.style.textAlign === 'center' || tr.getAttribute('align') === 'center') {
            tr.style.textAlign = '';
            tr.removeAttribute('align');
          }
        });

        // Normalize paragraphs inside table cells and preserve original Word text alignments
        const cellPs = tbl.querySelectorAll('td p, th p, td div.docx_p, th div.docx_p, td .docx_p, th .docx_p');
        cellPs.forEach((p) => {
          const el = p as HTMLElement;
          el.style.marginTop = '0px';
          el.style.marginBottom = '0px';
          el.style.lineHeight = '1.3';
          el.style.color = '#0f172a';

          // Preserve explicit align attribute if present
          const alignAttr = el.getAttribute('align')?.toLowerCase();
          if (alignAttr && ['center', 'right', 'justify', 'left'].includes(alignAttr)) {
            el.style.textAlign = alignAttr;
          }
        });

        // Ensure table cell dimensions, vertical alignment, and custom colors
        const cells = tbl.querySelectorAll('td, th');
        cells.forEach((cell) => {
          const c = cell as HTMLElement;
          c.style.boxSizing = 'border-box';
          c.style.wordBreak = 'break-word';
          c.style.overflowWrap = 'break-word';
          c.style.color = '#0f172a';

          // Preserve cell width attributes if present
          const widthAttr = c.getAttribute('width');
          if (widthAttr && !c.style.width) {
            c.style.width = widthAttr.endsWith('%') || widthAttr.endsWith('px') || widthAttr.endsWith('pt') ? widthAttr : `${widthAttr}px`;
          }

          // Preserve explicit align attribute on cell
          const alignAttr = c.getAttribute('align')?.toLowerCase();
          if (alignAttr && ['center', 'right', 'justify', 'left'].includes(alignAttr)) {
            c.style.textAlign = alignAttr;
          }

          if (!c.style.backgroundColor) {
            c.style.backgroundColor = c.tagName.toLowerCase() === 'th' ? '#f8fafc' : '#ffffff';
          }

          if (!c.style.verticalAlign) {
            c.style.verticalAlign = 'middle';
          }
        });
      });

      // Preserve explicit align attributes for all document-level paragraphs and headings
      const docParagraphs = sandbox.querySelectorAll('p, .docx_p, h1, h2, h3, h4, h5, h6');
      docParagraphs.forEach((p) => {
        const el = p as HTMLElement;
        const alignAttr = el.getAttribute('align')?.toLowerCase();
        if (alignAttr && ['center', 'right', 'justify', 'left'].includes(alignAttr)) {
          el.style.textAlign = alignAttr;
        }
      });

      // Deeply enrich DOM elements with DrawingML vector shapes, VML lines, and paragraph borders from OpenXML
      await enrichDocxHtmlFromOpenXml(arrayBuffer, sandbox);

      // Ensure all empty paragraphs, blank lines, and empty table cells have a clickable <br> node and full line height
      const allPs = sandbox.querySelectorAll('p, .docx_p, div.docx_p');
      allPs.forEach((p) => {
        const el = p as HTMLElement;
        const hasMedia = Boolean(el.querySelector('img, svg, table, canvas, video, iframe, hr'));
        const text = el.textContent?.trim() || '';
        if (!hasMedia && text.length === 0) {
          el.innerHTML = '<br>';
          el.style.minHeight = '1.35em';
          el.style.lineHeight = '1.4';
          el.style.display = 'block';
          el.style.margin = '4px 0';
        }
      });

      const allTds = sandbox.querySelectorAll('td, th');
      allTds.forEach((c) => {
        const cell = c as HTMLElement;
        const hasMedia = Boolean(cell.querySelector('img, svg, table, canvas, video, iframe, hr'));
        const text = cell.textContent?.trim() || '';
        if (!hasMedia && text.length === 0) {
          cell.innerHTML = '<br>';
          cell.style.minHeight = '1.5em';
        }
      });

      // Extract all scoped <style> tags generated by docx-preview and sanitize them
      let styleTags = Array.from(sandbox.querySelectorAll('style'))
        .map((s) => sanitizeDocxStyles(s.outerHTML))
        .join('\n');

      // Extract inner rendered content
      let bodyContent = '';
      if (docxSections.length > 0) {
        docxSections.forEach((sec) => {
          bodyContent += sec.outerHTML;
        });
      } else {
        bodyContent = sandbox.innerHTML;
      }

      if (bodyContent && bodyContent.trim().length > 0) {
        html = `${styleTags}\n<div class="docx-parsed-body">${bodyContent}</div>`;
      }
    } catch (e) {
      console.warn('docx-preview rendering failed, falling back to mammoth', e);
    } finally {
      if (sandbox.parentNode) {
        sandbox.parentNode.removeChild(sandbox);
      }
    }
  }

  // Fallback to mammoth if docx-preview is unavailable or produces empty HTML
  if (!html.trim()) {
    const options = {
      styleMap: [
        "p[style-name='Title'] => h1.doc-title:fresh",
        "p[style-name='Subtitle'] => h2.doc-subtitle:fresh",
        "p[style-name='Heading 1'] => h2.doc-heading-1:fresh",
        "p[style-name='Heading 2'] => h3.doc-heading-2:fresh",
        "p[style-name='Heading 3'] => h4.doc-heading-3:fresh",
        "table => table.w-full.border-collapse.border.border-slate-300:fresh",
        "tr => tr.border-b.border-slate-300:fresh",
        "th => th.py-1.5.px-2.5.border.border-slate-300.bg-slate-100.font-bold.text-slate-900:fresh",
        "td => td.py-1.5.px-2.5.border.border-slate-300.text-slate-800:fresh",
      ],
    };

    const result = await mammoth.convertToHtml({ arrayBuffer }, options);
    html = result.value || '';
    messages = (result.messages || []).map((m: any) => m.message || String(m));
  }

  // Extract placeholders matching {{field_name}} or {field_name}
  const detectedPlaceholders = detectPlaceholders(html);

  // Extract tables from HTML
  const { isTableDocument, extractedColumns, extractedRows } = extractTableDataFromHtml(html);

  // Extract page properties (Page Size, Orientation, Margins)
  const pageProperties = extractedPageProperties || extractDocxPageProperties(parsedSandbox, html);

  return {
    html,
    messages,
    detectedPlaceholders,
    isTableDocument,
    extractedColumns,
    extractedRows,
    pageProperties,
    pageSize: pageProperties.pageSize,
    orientation: pageProperties.orientation,
    margin: pageProperties.margin,
  };
}

/**
 * Extracts structured table columns and rows from parsed HTML.
 */
export function extractTableDataFromHtml(html: string): {
  isTableDocument: boolean;
  extractedColumns: Array<{ id: string; header: string; label: string }>;
  extractedRows: Array<Record<string, any>>;
} {
  if (typeof document === 'undefined' || !html.includes('<table')) {
    return { isTableDocument: false, extractedColumns: [], extractedRows: [] };
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const tableEl = doc.querySelector('table');
    if (!tableEl) {
      return { isTableDocument: false, extractedColumns: [], extractedRows: [] };
    }

    const trEls = Array.from(tableEl.querySelectorAll('tr'));
    if (trEls.length === 0) {
      return { isTableDocument: false, extractedColumns: [], extractedRows: [] };
    }

    // Identify headers from first row
    const firstRowCells = Array.from(trEls[0].querySelectorAll('th, td'));
    const columns = firstRowCells.map((cell, idx) => {
      const text = cell.textContent?.trim() || `Column ${idx + 1}`;
      const id = text.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '') || `col_${idx}`;
      return {
        id,
        header: text,
        label: text,
      };
    });

    // Extract remaining rows
    const dataRows = trEls.slice(1);
    const rows = dataRows.map((tr, rIdx) => {
      const cells = Array.from(tr.querySelectorAll('td, th'));
      const rowRecord: Record<string, any> = { id: `docx_row_${rIdx + 1}` };
      columns.forEach((col, cIdx) => {
        rowRecord[col.id] = cells[cIdx]?.textContent?.trim() || '';
      });
      return rowRecord;
    });

    return {
      isTableDocument: rows.length > 0,
      extractedColumns: columns,
      extractedRows: rows,
    };
  } catch (e) {
    console.warn('Failed to parse table from DOCX HTML', e);
    return { isTableDocument: false, extractedColumns: [], extractedRows: [] };
  }
}
