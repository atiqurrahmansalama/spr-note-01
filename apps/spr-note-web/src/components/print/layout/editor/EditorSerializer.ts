/**
 * EditorSerializer
 *
 * Dedicated bidirectional serializer and sanitizer for the Single-Host Document Editor.
 *
 * Architectural Invariants:
 * 1. Guarantees 100% pure canonical output free of runtime pagination artifacts.
 * 2. Manual page breaks (<div class="spr-page-break" data-manual-break="true">) are preserved as explicit semantic elements.
 * 3. Runtime page spacers (.spr-runtime-page-spacer, data-spr-runtime-pagination) are completely stripped on extraction.
 * 4. Bidirectional conversion between DOM, HTML strings, and CanonicalDocument AST.
 */

import { CanonicalDocument, BlockNode } from '../../model/types';
import { DocumentFactory } from '../../model/documentFactory';
import { HtmlImporter } from '../../model/serialization/htmlImporter';
import { HtmlExporter } from '../../model/serialization/htmlExporter';
import {
  sanitizeLogicalDocumentHtml,
  stripRuntimePaginationSpacers,
  createManualPageBreakHtml,
  createSectionBreakHtml,
  isExplicitManualBreak,
  isExplicitSectionBreak,
} from '../logicalDocument';

export class EditorSerializer {
  /**
   * Authoritative Canonical Document Extractor from Paged Editor DOM.
   *
   * SECTION 16 Requirements:
   * 1. Walks runtime page shells in document order
   * 2. Ignores page shell wrappers
   * 3. Ignores runtime chrome (running headers/footers, page badges, diagnostics)
   * 4. Collects editable fragments from content slots
   * 5. Merges fragments belonging to the same logical source node
   * 6. Removes runtime fragment metadata from canonical output
   * 7. Preserves formatting (bold, italic, underline, colors, alignment, spacing)
   * 8. Preserves tokens (Mustache placeholders, semantic token spans)
   * 9. Preserves explicit manual page breaks (data-manual-break="true")
   * 10. Preserves tables, lists, images, SVG vector shapes, signatures, dividers
   *
   * Invariant: Automatic page boundaries MUST NOT be written into saved template HTML.
   * Only explicit user page breaks survive.
   */
  public static extractCanonicalDocumentFromEditor(
    htmlOrContainer: string | HTMLElement,
    options: {
      id?: string;
      title?: string;
      metadata?: Record<string, any>;
    } = {}
  ): CanonicalDocument {
    if (!htmlOrContainer) {
      return DocumentFactory.createDocument({
        id: options.id,
        title: options.title,
        metadata: options.metadata,
        body: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('')] })],
      });
    }

    // 1. If string is passed, sanitize and import via HtmlImporter
    if (typeof htmlOrContainer === 'string') {
      const cleanHtml = this.sanitize(htmlOrContainer);
      return HtmlImporter.importFromHtml(cleanHtml, options);
    }

    // 2. If HTMLElement is passed, walk DOM directly
    const host = htmlOrContainer as HTMLElement;
    const rawBlocks: BlockNode[] = [];

    // Find all runtime page shells in document order
    const pageShells = Array.from(
      host.querySelectorAll<HTMLElement>(
        '[data-doclab-runtime-page="true"], [data-runtime-page], .doclab-runtime-page-shell, .paper-sheet'
      )
    );

    if (pageShells.length > 0) {
      // Sort page shells deterministically by data-runtime-page / data-page-index if present
      pageShells.sort((a, b) => {
        const idxA = parseInt(a.getAttribute('data-runtime-page') || a.getAttribute('data-page-index') || '0', 10);
        const idxB = parseInt(b.getAttribute('data-runtime-page') || b.getAttribute('data-page-index') || '0', 10);
        return idxA - idxB;
      });

      pageShells.forEach((pageShell) => {
        // Find printable content slot inside the page shell
        const contentSlot =
          pageShell.querySelector<HTMLElement>(
            '.doclab-runtime-page-content, .doclab-page-content-slot, .layout-page-fragments'
          ) || pageShell;

        // Traverse children of content slot, collecting editable fragments and ignoring runtime chrome
        this.collectBlocksFromContainer(contentSlot, rawBlocks);
      });
    } else {
      // Fallback: No page shells found, traverse host container directly
      this.collectBlocksFromContainer(host, rawBlocks);
    }

    // 5. Merge fragments belonging to the same logical source node
    const mergedBlocks = HtmlImporter.mergeConsecutiveFragments(rawBlocks);

    // Ensure at least one block exists
    if (mergedBlocks.length === 0) {
      mergedBlocks.push(DocumentFactory.createParagraph({ content: [DocumentFactory.createText('')] }));
    }

    return DocumentFactory.createDocument({
      id: options.id,
      title: options.title,
      metadata: options.metadata,
      body: mergedBlocks,
    });
  }

  /**
   * Extracts clean, canonical continuous HTML string from the paged editor DOM.
   * Free of all runtime page shells, page spacers, and transient pagination cuts.
   */
  public static extractCanonicalHtmlFromEditor(
    htmlOrContainer: string | HTMLElement,
    options: {
      prettyPrint?: boolean;
      tokenFormat?: 'mustache' | 'span';
    } = {}
  ): string {
    const doc = this.extractCanonicalDocumentFromEditor(htmlOrContainer);
    return HtmlExporter.exportToHtml(doc, {
      prettyPrint: options.prettyPrint ?? true,
      tokenFormat: options.tokenFormat ?? 'mustache',
    });
  }

  /**
   * Recursively collects BlockNode items from a DOM container while filtering out runtime chrome.
   */
  private static collectBlocksFromContainer(container: HTMLElement, targetArray: BlockNode[]): void {
    const children = Array.from(container.childNodes);

    children.forEach((child) => {
      if (child.nodeType === 8) {
        // Comment node
        if (isExplicitManualBreak(child)) {
          targetArray.push(DocumentFactory.createManualPageBreak());
        }
        return;
      }

      if (child.nodeType === 3) {
        // Top-level text node
        const text = child.nodeValue?.trim();
        if (text) {
          targetArray.push(
            DocumentFactory.createParagraph({
              content: [DocumentFactory.createText(text)],
            })
          );
        }
        return;
      }

      if (child.nodeType !== 1) return;

      const el = child as HTMLElement;

      // Filter out runtime chrome & diagnostics & spacers
      if (
        el.classList?.contains('doclab-runtime-chrome') ||
        el.classList?.contains('doclab-runtime-page-badge') ||
        el.classList?.contains('doclab-runtime-page-header') ||
        el.classList?.contains('doclab-runtime-page-footer') ||
        el.classList?.contains('spr-runtime-page-spacer') ||
        el.classList?.contains('spr-page-spacer') ||
        el.classList?.contains('spr-runtime-page-guide') ||
        el.classList?.contains('doclab-runtime-overlay') ||
        el.classList?.contains('doclab-visual-sheets-layer') ||
        el.classList?.contains('spr-page-overlay-wrapper') ||
        el.classList?.contains('doclab-diagnostics-overlay') ||
        el.classList?.contains('spr-layout-diagnostics') ||
        el.getAttribute?.('data-spr-runtime-pagination') === 'true' ||
        el.getAttribute?.('data-runtime-spacer') === 'true' ||
        el.getAttribute?.('data-runtime-guide') === 'true' ||
        el.getAttribute?.('data-layout-perf') === 'true' ||
        el.getAttribute?.('data-debug-overlay') === 'true' ||
        el.getAttribute?.('data-diagnostics') === 'true'
      ) {
        return;
      }

      // Check if this is non-editable chrome (that is NOT an explicit manual break or section break)
      const isNonEditable = el.getAttribute('contenteditable') === 'false';
      const isManualBreak = isExplicitManualBreak(el);
      const isSecBreak = isExplicitSectionBreak(el);

      if (isNonEditable && !isManualBreak && !isSecBreak) {
        return;
      }

      // Explicit Manual Page Break
      if (isManualBreak) {
        targetArray.push(DocumentFactory.createManualPageBreak());
        return;
      }

      // Explicit Section Break
      if (isSecBreak) {
        const parsed = HtmlImporter.parseDomNodeToBlock(el);
        if (parsed) {
          if (Array.isArray(parsed)) targetArray.push(...parsed);
          else targetArray.push(parsed);
        }
        return;
      }

      // If this element is a layout fragment wrapper or fragment container, unpack its children
      if (
        el.classList?.contains('docx-layout-fragment') ||
        el.classList?.contains('layout-page-fragments') ||
        el.hasAttribute('data-fragment-id')
      ) {
        // If the fragment wrapper has direct inner block elements (e.g. <p>, <table>)
        const innerBlocks = Array.from(el.children) as HTMLElement[];
        if (innerBlocks.length > 0) {
          innerBlocks.forEach((inner) => {
            const parsed = HtmlImporter.parseDomNodeToBlock(inner);
            if (parsed) {
              if (Array.isArray(parsed)) targetArray.push(...parsed);
              else targetArray.push(parsed);
            }
          });
          return;
        }
      }

      // Parse block element
      const block = HtmlImporter.parseDomNodeToBlock(el);
      if (block) {
        if (Array.isArray(block)) {
          targetArray.push(...block);
        } else {
          targetArray.push(block);
        }
      }
    });
  }

  /**
   * Imports any HTML string or DOM container into a clean CanonicalDocument AST
   */
  public static toCanonicalDocument(htmlOrContainer: string | HTMLElement): CanonicalDocument {
    return this.extractCanonicalDocumentFromEditor(htmlOrContainer);
  }

  /**
   * Serializes a CanonicalDocument AST into clean continuous HTML string
   */
  public static fromCanonicalDocument(doc: CanonicalDocument): string {
    return HtmlExporter.exportToHtml(doc, { tokenFormat: 'mustache', prettyPrint: true });
  }

  /**
   * Sanitizes document HTML to ensure zero auto-generated pagination artifacts are persisted
   */
  public static sanitize(html: string): string {
    return sanitizeLogicalDocumentHtml(html);
  }

  /**
   * Strips all transient runtime pagination spacers from an HTML string (legacy migration compatibility)
   */
  public static stripSpacers(html: string): string {
    return stripRuntimePaginationSpacers(html);
  }

  /**
   * Generates standard semantic manual page break HTML
   */
  public static createManualPageBreakHtml(): string {
    return createManualPageBreakHtml();
  }

  /**
   * Generates standard semantic section break HTML
   */
  public static createSectionBreakHtml(options: Parameters<typeof createSectionBreakHtml>[0] = {}): string {
    return createSectionBreakHtml(options);
  }
}

/**
 * Shorthand exported helper: extracts canonical document AST from paged editor DOM or HTML
 */
export function extractCanonicalDocumentFromEditor(
  htmlOrContainer: string | HTMLElement,
  options?: { id?: string; title?: string; metadata?: Record<string, any> }
): CanonicalDocument {
  return EditorSerializer.extractCanonicalDocumentFromEditor(htmlOrContainer, options);
}

/**
 * Shorthand exported helper: extracts clean canonical continuous HTML from paged editor DOM or HTML
 */
export function extractCanonicalHtmlFromEditor(
  htmlOrContainer: string | HTMLElement,
  options?: { prettyPrint?: boolean; tokenFormat?: 'mustache' | 'span' }
): string {
  return EditorSerializer.extractCanonicalHtmlFromEditor(htmlOrContainer, options);
}
