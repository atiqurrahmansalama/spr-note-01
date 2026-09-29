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

import { sanitizeLogicalDocumentHtml, createManualPageBreakHtml } from '../logicalDocument';
import { LayoutDocument, LayoutPage } from '../types/paginationTypes';
import { CanonicalDocument } from '../../model/types';
import { HtmlImporter } from '../../model/serialization/htmlImporter';
import { HtmlExporter } from '../../model/serialization/htmlExporter';
import { EditorSerializer } from './EditorSerializer';
import { EditorCommands } from './EditorCommands';

export interface EditorHistoryEntry {
  canonicalHtml: string;
  timestamp: number;
}

export class PaginatedEditorBridge {
  /**
   * Imports HTML into a CanonicalDocument AST.
   */
  static importHtmlToCanonical(html: string): CanonicalDocument {
    return EditorSerializer.toCanonicalDocument(html);
  }

  /**
   * Exports a CanonicalDocument AST to clean continuous HTML.
   */
  static exportCanonicalToHtml(doc: CanonicalDocument): string {
    return EditorSerializer.fromCanonicalDocument(doc);
  }

  /**
   * Inserts an explicit manual page break at the active cursor position.
   */
  static insertManualPageBreakAtCaret(host?: HTMLElement): boolean {
    if (typeof window === 'undefined' || typeof document === 'undefined') return false;
    try {
      if (host) {
        EditorCommands.insertManualPageBreak(host);
        return true;
      }
      const pageBreakHtml = EditorSerializer.createManualPageBreakHtml();
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return false;
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = pageBreakHtml;
      const frag = document.createDocumentFragment();
      let child: ChildNode | null;
      while ((child = tempDiv.firstChild)) {
        frag.appendChild(child);
      }
      range.insertNode(frag);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Selects all content across the single continuous editor host.
   */
  static selectAllDocument(host: HTMLElement): boolean {
    if (typeof window === 'undefined' || !host) return false;
    const sel = window.getSelection();
    if (!sel) return false;

    try {
      const range = document.createRange();
      range.selectNodeContents(host);
      sel.removeAllRanges();
      sel.addRange(range);
      return true;
    } catch {
      return false;
    }
  }
}

