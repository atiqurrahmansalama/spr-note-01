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

import { CanonicalDocument } from '../../model/types';
import { HtmlImporter } from '../../model/serialization/htmlImporter';
import { HtmlExporter } from '../../model/serialization/htmlExporter';
import {
  sanitizeLogicalDocumentHtml,
  stripRuntimePaginationSpacers,
  createManualPageBreakHtml,
} from '../logicalDocument';

export class EditorSerializer {
  /**
   * Imports any HTML string or DOM container into a clean CanonicalDocument AST
   */
  public static toCanonicalDocument(htmlOrContainer: string | HTMLElement): CanonicalDocument {
    const rawHtml = typeof htmlOrContainer === 'string' ? htmlOrContainer : htmlOrContainer.innerHTML;
    const cleanHtml = this.sanitize(rawHtml);
    return HtmlImporter.importFromHtml(cleanHtml);
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
}
