/**
 * PaginatedEditorBridge
 *
 * Coordinates document-centric state management, canonical HTML re-assembly from
 * discrete visual page sheets, undo/redo history stack management, and manual page break insertion.
 *
 * ARCHITECTURAL INVARIANT:
 * - The canonical document remains a 100% pure continuous flow.
 * - Zero runtime page boundary elements, spacers, or dashed lines are persisted.
 * - Manual page breaks are preserved as explicit semantic elements.
 */

import { stripRuntimePaginationSpacers, sanitizeLogicalDocumentHtml, createManualPageBreakHtml } from '../logicalDocument';
import { LayoutDocument, LayoutPage } from '../types/paginationTypes';
import { CanonicalDocument } from '../../model/types';
import { HtmlImporter } from '../../model/serialization/htmlImporter';
import { HtmlExporter } from '../../model/serialization/htmlExporter';

export interface EditorHistoryEntry {
  canonicalHtml: string;
  timestamp: number;
}

export class PaginatedEditorBridge {
  /**
   * Assembles a continuous canonical HTML string from all discrete page editable DOM roots.
   */
  static assembleCanonicalHtmlFromPages(pagesContainer: HTMLElement): string {
    if (!pagesContainer) return '<p><br></p>';

    const pageElements = Array.from(
      pagesContainer.querySelectorAll<HTMLElement>('[data-page-index]')
    ).sort((a, b) => {
      const idxA = parseInt(a.getAttribute('data-page-index') || '0', 10);
      const idxB = parseInt(b.getAttribute('data-page-index') || '0', 10);
      return idxA - idxB;
    });

    if (pageElements.length === 0) {
      return '<p><br></p>';
    }

    const pageHtmlFragments: string[] = [];

    pageElements.forEach((pageEl) => {
      const editableRoot =
        pageEl.querySelector<HTMLElement>('[contenteditable="true"]') ||
        (pageEl.isContentEditable ? pageEl : null);

      if (editableRoot) {
        const rawInner = editableRoot.innerHTML || '';
        const clean = stripRuntimePaginationSpacers(rawInner).trim();
        if (clean && clean !== '<p><br></p>' && clean !== '<p></p>') {
          pageHtmlFragments.push(clean);
        }
      }
    });

    if (pageHtmlFragments.length === 0) {
      return '<p><br></p>';
    }

    // Merge adjacent continuation fragments (tables with data-table-continuation, etc.)
    if (typeof document !== 'undefined') {
      try {
        const container = document.createElement('div');
        container.innerHTML = pageHtmlFragments.join('\n');

        // Merge continuation tables back into their parent table
        const continuationTables = Array.from(container.querySelectorAll('table[data-table-continuation="true"]'));
        continuationTables.forEach((contTable) => {
          let prev = contTable.previousElementSibling;
          while (prev && prev.tagName !== 'TABLE') {
            prev = prev.previousElementSibling;
          }
          if (prev && prev.tagName === 'TABLE') {
            const prevTbody = prev.querySelector('tbody');
            const contTbody = contTable.querySelector('tbody');
            if (prevTbody && contTbody) {
              Array.from(contTbody.children).forEach((tr) => {
                prevTbody.appendChild(tr);
              });
            }
            const contTfoot = contTable.querySelector('tfoot');
            if (contTfoot && !prev.querySelector('tfoot')) {
              prev.appendChild(contTfoot);
            }
            contTable.remove();
          } else {
            contTable.removeAttribute('data-table-continuation');
          }
        });

        return sanitizeLogicalDocumentHtml(container.innerHTML);
      } catch {
        // fallback
      }
    }

    const rawCombined = pageHtmlFragments.join('\n');
    return sanitizeLogicalDocumentHtml(rawCombined);
  }

  /**
   * Sanitizes and imports HTML into a CanonicalDocument AST.
   */
  static importHtmlToCanonical(html: string): CanonicalDocument {
    const cleanHtml = sanitizeLogicalDocumentHtml(html);
    return HtmlImporter.importFromHtml(cleanHtml);
  }

  /**
   * Exports a CanonicalDocument AST to clean continuous HTML.
   */
  static exportCanonicalToHtml(doc: CanonicalDocument): string {
    return HtmlExporter.exportToHtml(doc);
  }

  /**
   * Inserts an explicit manual page break at the active cursor position.
   */
  static insertManualPageBreakAtCaret(): boolean {
    if (typeof window === 'undefined' || typeof document === 'undefined') return false;
    try {
      const pageBreakHtml = createManualPageBreakHtml();
      document.execCommand('insertHTML', false, pageBreakHtml);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Selects all content across all pages in the editor.
   */
  static selectAllDocument(pagesContainer: HTMLElement): boolean {
    if (typeof window === 'undefined' || !pagesContainer) return false;
    const sel = window.getSelection();
    if (!sel) return false;

    try {
      const firstEditable = pagesContainer.querySelector<HTMLElement>('[contenteditable="true"]');
      const allEditables = Array.from(
        pagesContainer.querySelectorAll<HTMLElement>('[contenteditable="true"]')
      );
      const lastEditable = allEditables[allEditables.length - 1] || firstEditable;

      if (!firstEditable || !lastEditable) return false;

      const range = document.createRange();
      range.setStart(firstEditable, 0);
      range.setEnd(lastEditable, lastEditable.childNodes.length);

      sel.removeAllRanges();
      sel.addRange(range);
      return true;
    } catch {
      return false;
    }
  }
}
