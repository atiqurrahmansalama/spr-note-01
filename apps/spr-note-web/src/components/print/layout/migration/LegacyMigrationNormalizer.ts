/**
 * Legacy Content Migration Normalizer (Phase 37)
 *
 * Dedicated, explicit single migration normalizer for legacy saved content and templates.
 *
 * Architectural Invariants:
 * 1. Removes all old runtime spacers (.spr-runtime-page-spacer, [data-spr-runtime-pagination], etc.).
 * 2. Removes obsolete automatic page break artifacts (transient breaks without explicit manual markers).
 * 3. Preserves real semantic manual page breaks when confidently identifiable (data-manual-break="true", docx_page_break, page-break-after: always).
 * 4. Normalizes legacy markers into canonical ManualPageBreakNode AST objects and clean standard HTML.
 * 5. Unrolls legacy container wrappers (.docx-blank-canvas, .docx-parsed-body, .paper-sheet, etc.).
 * 6. Executes once on content loading / template deserialization, NOT continuously during interactive editing keystrokes.
 */

import { CanonicalDocument, ManualPageBreakNode } from '../../model/types';
import { HtmlImporter } from '../../model/serialization/htmlImporter';
import { HtmlExporter } from '../../model/serialization/htmlExporter';
import { CustomDocxTemplate } from '../../docxTemplateEngine';
import {
  isExplicitManualBreak,
  stripRuntimePaginationSpacers,
  createManualPageBreakHtml,
  MANUAL_PAGE_BREAK_MARKER,
  LEGACY_PAGE_BREAK_MARKER,
} from '../logicalDocument';

export interface MigrationResult {
  cleanHtml: string;
  isMigrated: boolean;
  purgedSpacersCount: number;
  purgedAutoBreaksCount: number;
  manualBreaksPreservedCount: number;
  unwrappedContainersCount: number;
}

export class LegacyMigrationNormalizer {
  /**
   * Detects whether an HTML string contains legacy artifacts requiring migration.
   */
  public static isLegacyContent(rawHtml: string): boolean {
    if (!rawHtml || typeof rawHtml !== 'string') return false;

    return (
      rawHtml.includes('spr-runtime-page-spacer') ||
      rawHtml.includes('data-spr-runtime-pagination') ||
      rawHtml.includes('data-runtime-spacer') ||
      rawHtml.includes('data-runtime-guide') ||
      rawHtml.includes('spr-runtime-page-guide') ||
      rawHtml.includes('doclab-runtime-overlay') ||
      rawHtml.includes('doclab-visual-sheets-layer') ||
      rawHtml.includes('spr-page-overlay-wrapper') ||
      rawHtml.includes('doclab-diagnostics-overlay') ||
      rawHtml.includes('spr-layout-diagnostics') ||
      rawHtml.includes('docx-blank-canvas') ||
      rawHtml.includes('docx-parsed-body') ||
      rawHtml.includes('docx-preview-content') ||
      rawHtml.includes('docx_page_break') ||
      rawHtml.includes('paper-sheet') ||
      rawHtml.includes('data-page-index') ||
      rawHtml.includes('spr-page-fragment') ||
      rawHtml.includes(LEGACY_PAGE_BREAK_MARKER)
    );
  }

  /**
   * Main entrypoint: Migrates and normalizes legacy raw HTML into clean, standard semantic HTML.
   * Purges all transient runtime spacers and obsolete auto breaks while preserving semantic manual breaks.
   */
  public static normalizeHtml(rawHtml: string): string {
    const result = this.normalizeHtmlWithReport(rawHtml);
    return result.cleanHtml;
  }

  /**
   * Comprehensive normalizer with detailed migration diagnostics report.
   */
  public static normalizeHtmlWithReport(rawHtml: string): MigrationResult {
    if (!rawHtml || !rawHtml.trim()) {
      return {
        cleanHtml: '',
        isMigrated: false,
        purgedSpacersCount: 0,
        purgedAutoBreaksCount: 0,
        manualBreaksPreservedCount: 0,
        unwrappedContainersCount: 0,
      };
    }

    let isMigrated = false;
    let purgedSpacersCount = 0;
    let purgedAutoBreaksCount = 0;
    let manualBreaksPreservedCount = 0;
    let unwrappedContainersCount = 0;

    // 1. Initial transient spacer and visual guide purge
    const initialSpacersStripped = stripRuntimePaginationSpacers(rawHtml);
    if (initialSpacersStripped !== rawHtml) {
      isMigrated = true;
      purgedSpacersCount++;
    }

    let currentHtml = initialSpacersStripped;

    if (typeof document !== 'undefined') {
      try {
        const container = document.createElement('div');
        container.innerHTML = currentHtml;

        // A. Remove any lingering runtime spacers, overlays, and diagnostics
        const runtimeEls = container.querySelectorAll(
          '[data-spr-runtime-pagination="true"], .spr-runtime-page-spacer, .spr-page-spacer, ' +
          '[data-runtime-spacer="true"], [data-runtime-guide="true"], .spr-runtime-page-guide, ' +
          '.doclab-runtime-overlay, .doclab-visual-sheets-layer, .spr-page-overlay-wrapper, ' +
          '[data-layout-perf="true"], [data-debug-overlay="true"], [data-diagnostics="true"], [data-diagnostics], ' +
          '.doclab-diagnostics-overlay, .spr-layout-diagnostics'
        );
        if (runtimeEls.length > 0) {
          purgedSpacersCount += runtimeEls.length;
          isMigrated = true;
          runtimeEls.forEach((el) => el.parentNode?.removeChild(el));
        }

        // B. Unroll legacy container wrappers (.paper-sheet, [data-page-index], .docx-blank-canvas, .spr-page-fragment, etc.)
        const wrappers = container.querySelectorAll(
          '.paper-sheet, [data-page-index], [data-paper-sheet="true"], .spr-page-fragment, ' +
          '.docx-blank-canvas, .docx-parsed-body, .docx-preview-content, .docx-live-container'
        );
        if (wrappers.length > 0) {
          unwrappedContainersCount += wrappers.length;
          isMigrated = true;
          wrappers.forEach((wrapper) => {
            while (wrapper.firstChild) {
              wrapper.parentNode?.insertBefore(wrapper.firstChild, wrapper);
            }
            wrapper.parentNode?.removeChild(wrapper);
          });
        }

        // C. Disambiguate page breaks: preserve explicit manual breaks, delete obsolete auto breaks
        const breakElements = container.querySelectorAll(
          '.spr-page-break, [data-page-break], .docx_page_break, .docx-page-break, [style*="page-break-after"], [style*="break-after"]'
        );
        breakElements.forEach((el) => {
          const isManual = isExplicitManualBreak(el);
          if (isManual) {
            manualBreaksPreservedCount++;
            // Normalize into standard clean manual break element
            const normalizedEl = document.createElement('div');
            normalizedEl.className = 'spr-page-break';
            normalizedEl.setAttribute('data-manual-break', 'true');
            normalizedEl.setAttribute('contenteditable', 'false');
            normalizedEl.setAttribute('style', 'page-break-after: always; break-after: page;');
            normalizedEl.innerHTML = '<hr class="spr-page-break-divider" /><span class="spr-page-break-badge">Page Break</span>';
            el.parentNode?.replaceChild(normalizedEl, el);
          } else {
            purgedAutoBreaksCount++;
            isMigrated = true;
            el.parentNode?.removeChild(el);
          }
        });

        // D. Normalize legacy comment break markers: <!-- spr-page-break --> to standard manual break
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_COMMENT, null);
        const commentsToReplace: Comment[] = [];
        let commentNode = walker.nextNode() as Comment | null;
        while (commentNode) {
          const val = (commentNode.nodeValue || '').trim().toLowerCase();
          if (
            val === 'spr-page-break:manual' ||
            val === 'manual-page-break' ||
            val === 'spr-page-break' ||
            val === 'docx_page_break' ||
            val === 'docx-page-break' ||
            val === 'page-break'
          ) {
            commentsToReplace.push(commentNode);
          }
          commentNode = walker.nextNode() as Comment | null;
        }

        commentsToReplace.forEach((c) => {
          const manualBreakDiv = document.createElement('div');
          manualBreakDiv.className = 'spr-page-break';
          manualBreakDiv.setAttribute('data-manual-break', 'true');
          manualBreakDiv.setAttribute('contenteditable', 'false');
          manualBreakDiv.setAttribute('style', 'page-break-after: always; break-after: page;');
          manualBreakDiv.innerHTML = '<hr class="spr-page-break-divider" /><span class="spr-page-break-badge">Page Break</span>';
          c.parentNode?.replaceChild(manualBreakDiv, c);
          manualBreaksPreservedCount++;
          isMigrated = true;
        });

        currentHtml = container.innerHTML;
      } catch (err) {
        console.warn('DOM-based migration fallback:', err);
      }
    } else {
      // Headless / Node environment migration fallback
      // 1. Purge transient auto breaks while preserving manual breaks
      currentHtml = currentHtml.replace(
        /<div\b[^>]*?\b(?:spr-page-break|docx_page_break|docx-page-break|data-page-break|data-manual-break|page-break-after|break-after)\b[^>]*?>[\s\S]*?<\/div>/gi,
        (match) => {
          const isManual = isExplicitManualBreak(match);
          if (isManual) {
            manualBreaksPreservedCount++;
            return createManualPageBreakHtml();
          }
          purgedAutoBreaksCount++;
          isMigrated = true;
          return '';
        }
      );

      // 2. Unroll legacy wrapper tags without breaking inner children
      currentHtml = currentHtml.replace(
        /<div\b[^>]*?\b(?:paper-sheet|spr-page-fragment|data-page-index|docx-blank-canvas|docx-parsed-body|docx-preview-content|docx-live-container)\b[^>]*?>/gi,
        () => {
          unwrappedContainersCount++;
          isMigrated = true;
          return '';
        }
      );

      // 3. Normalize legacy manual comments
      currentHtml = currentHtml.replace(
        /<!--\s*spr-page-break(?::manual)?\s*-->/gi,
        () => {
          manualBreaksPreservedCount++;
          isMigrated = true;
          return createManualPageBreakHtml();
        }
      );
    }

    return {
      cleanHtml: currentHtml.trim(),
      isMigrated,
      purgedSpacersCount,
      purgedAutoBreaksCount,
      manualBreaksPreservedCount,
      unwrappedContainersCount,
    };
  }

  /**
   * Migrates a legacy CustomDocxTemplate object in storage upon loading.
   */
  public static normalizeTemplate<T extends Partial<CustomDocxTemplate> & Record<string, any>>(template: T): T {
    if (!template) return template;

    const raw = template.rawHtml || (template as any).html || '';
    if (!raw) return template;

    const migration = this.normalizeHtmlWithReport(raw);

    const updated: T = {
      ...template,
      rawHtml: migration.cleanHtml,
      ...(template.templateBody !== undefined && {
        templateBody: this.normalizeHtml(template.templateBody),
      }),
      ...(template.body !== undefined && {
        body: this.normalizeHtml(template.body),
      }),
      ...(template.html !== undefined && {
        html: migration.cleanHtml,
      }),
    };

    return updated;
  }

  /**
   * Imports legacy content directly into a pristine CanonicalDocument AST.
   * Runs one-time migration normalization, then constructs pure strongly typed AST blocks.
   */
  public static toCanonicalDocument(
    rawHtmlOrContainer: string | HTMLElement,
    options: {
      id?: string;
      title?: string;
      metadata?: Record<string, any>;
    } = {}
  ): CanonicalDocument {
    const rawHtml = typeof rawHtmlOrContainer === 'string' ? rawHtmlOrContainer : rawHtmlOrContainer.innerHTML;
    const cleanHtml = this.normalizeHtml(rawHtml);
    return HtmlImporter.importFromHtml(cleanHtml, options);
  }

  /**
   * Serializes a CanonicalDocument AST back to clean HTML.
   */
  public static fromCanonicalDocument(doc: CanonicalDocument): string {
    return HtmlExporter.exportToHtml(doc, { tokenFormat: 'mustache', prettyPrint: true });
  }
}
