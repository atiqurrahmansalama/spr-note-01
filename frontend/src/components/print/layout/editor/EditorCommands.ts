/**
 * EditorCommands
 *
 * Standard Command Registry for the Single-Host Document Editor.
 * Exposes strongly typed, transaction-generating commands for formatting, block switching,
 * table and media insertions, token replacements, and manual page breaks.
 */

import { Mark, HeadingLevel, ListType, TextAlignment, TokenInsertPayload } from '../../model/types';
import { EditorDomAdapter } from './EditorDomAdapter';
import { EditorSerializer } from './EditorSerializer';
import { EditorTransaction } from './editorTypes';

export class EditorCommands {
  /**
   * 1. Inserts plain text at active selection
   */
  public static insertText(host: HTMLElement, text: string): EditorTransaction {
    EditorDomAdapter.insertTextAtSelection(host, text);
    const cleanHtml = EditorSerializer.sanitize(host.innerHTML);
    const doc = EditorSerializer.toCanonicalDocument(cleanHtml);

    return {
      doc,
      canonicalHtml: cleanHtml,
      origin: 'typing',
      timestamp: Date.now(),
      description: `Insert text: ${text.slice(0, 20)}`,
    };
  }

  /**
   * 2. Splits block or inserts paragraph (Enter key)
   */
  public static insertParagraph(host: HTMLElement): EditorTransaction {
    EditorDomAdapter.splitBlockAtSelection(host);
    const cleanHtml = EditorSerializer.sanitize(host.innerHTML);
    const doc = EditorSerializer.toCanonicalDocument(cleanHtml);

    return {
      doc,
      canonicalHtml: cleanHtml,
      origin: 'typing',
      timestamp: Date.now(),
      description: 'Split block / Enter',
    };
  }

  /**
   * 3. Applies an inline formatting mark (bold, italic, underline, color, font, size)
   */
  public static applyMark(
    host: HTMLElement,
    markType: keyof Mark | 'color' | 'backgroundColor' | 'fontSize' | 'fontFamily',
    value?: any
  ): EditorTransaction {
    EditorDomAdapter.applyMarkToSelection(host, markType, value);
    const cleanHtml = EditorSerializer.sanitize(host.innerHTML);
    const doc = EditorSerializer.toCanonicalDocument(cleanHtml);

    return {
      doc,
      canonicalHtml: cleanHtml,
      origin: 'command',
      timestamp: Date.now(),
      description: `Apply mark: ${String(markType)}`,
    };
  }

  /**
   * 4. Toggles block type (P, H1-H6, UL, OL, Blockquote)
   */
  public static toggleBlockType(
    host: HTMLElement,
    targetType: 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'ul' | 'ol' | 'blockquote'
  ): EditorTransaction {
    EditorDomAdapter.toggleBlockType(host, targetType);
    const cleanHtml = EditorSerializer.sanitize(host.innerHTML);
    const doc = EditorSerializer.toCanonicalDocument(cleanHtml);

    return {
      doc,
      canonicalHtml: cleanHtml,
      origin: 'command',
      timestamp: Date.now(),
      description: `Toggle block type: ${targetType}`,
    };
  }

  /**
   * 5. Sets text alignment (left, center, right, justify)
   */
  public static setAlignment(
    host: HTMLElement,
    alignment: TextAlignment
  ): EditorTransaction {
    EditorDomAdapter.setAlignment(host, alignment);
    const cleanHtml = EditorSerializer.sanitize(host.innerHTML);
    const doc = EditorSerializer.toCanonicalDocument(cleanHtml);

    return {
      doc,
      canonicalHtml: cleanHtml,
      origin: 'command',
      timestamp: Date.now(),
      description: `Set alignment: ${alignment}`,
    };
  }

  /**
   * 6. Inserts a standard table grid
   */
  public static insertTable(host: HTMLElement, rows: number = 3, cols: number = 3): EditorTransaction {
    let tableHtml = '<table style="width: 100%; border-collapse: collapse; margin: 12px 0; border: 1px solid #cbd5e1;">';
    tableHtml += '<thead><tr style="background-color: #f1f5f9;">';
    for (let c = 0; c < cols; c++) {
      tableHtml += `<th style="border: 1px solid #cbd5e1; padding: 6px 10px; font-weight: 700; text-align: left;">Header ${c + 1}</th>`;
    }
    tableHtml += '</tr></thead><tbody>';
    for (let r = 0; r < rows; r++) {
      tableHtml += '<tr>';
      for (let c = 0; c < cols; c++) {
        tableHtml += '<td style="border: 1px solid #cbd5e1; padding: 6px 10px;">Cell</td>';
      }
      tableHtml += '</tr>';
    }
    tableHtml += '</tbody></table><p><br></p>';

    EditorDomAdapter.insertHtmlAtSelection(host, tableHtml);
    const cleanHtml = EditorSerializer.sanitize(host.innerHTML);
    const doc = EditorSerializer.toCanonicalDocument(cleanHtml);

    return {
      doc,
      canonicalHtml: cleanHtml,
      origin: 'command',
      timestamp: Date.now(),
      description: `Insert table ${rows}x${cols}`,
    };
  }

  /**
   * 7. Inserts an image element
   */
  public static insertImage(
    host: HTMLElement,
    options: { src: string; alt?: string; title?: string; width?: string | number; height?: string | number }
  ): EditorTransaction {
    const attrs = [`src="${options.src}"`];
    if (options.alt) attrs.push(`alt="${options.alt}"`);
    if (options.title) attrs.push(`title="${options.title}"`);
    if (options.width) attrs.push(`width="${options.width}"`);
    if (options.height) attrs.push(`height="${options.height}"`);

    const imgHtml = `<p><img ${attrs.join(' ')} style="max-width: 100%; height: auto;" /></p><p><br></p>`;
    EditorDomAdapter.insertHtmlAtSelection(host, imgHtml);
    const cleanHtml = EditorSerializer.sanitize(host.innerHTML);
    const doc = EditorSerializer.toCanonicalDocument(cleanHtml);

    return {
      doc,
      canonicalHtml: cleanHtml,
      origin: 'command',
      timestamp: Date.now(),
      description: 'Insert image',
    };
  }

  /**
   * 8. Inserts an SVG vector shape or diagram
   */
  public static insertSvg(host: HTMLElement, svgMarkup: string): EditorTransaction {
    EditorDomAdapter.insertHtmlAtSelection(host, svgMarkup);
    const cleanHtml = EditorSerializer.sanitize(host.innerHTML);
    const doc = EditorSerializer.toCanonicalDocument(cleanHtml);

    return {
      doc,
      canonicalHtml: cleanHtml,
      origin: 'command',
      timestamp: Date.now(),
      description: 'Insert SVG vector shape',
    };
  }

  /**
   * 9. Inserts a dynamic template token (placeholder) with stable logical identity
   */
  public static insertToken(
    host: HTMLElement,
    tokenKeyOrPayload: string | TokenInsertPayload,
    category: string = 'general',
    extraOptions: Partial<TokenInsertPayload> = {}
  ): EditorTransaction {
    const payload: TokenInsertPayload =
      typeof tokenKeyOrPayload === 'string'
        ? { key: tokenKeyOrPayload, category, ...extraOptions }
        : { category, ...tokenKeyOrPayload, ...extraOptions };

    EditorDomAdapter.insertTokenAtSelection(host, payload);
    const cleanHtml = EditorSerializer.sanitize(host.innerHTML);
    const doc = EditorSerializer.toCanonicalDocument(cleanHtml);

    return {
      doc,
      canonicalHtml: cleanHtml,
      origin: 'command',
      timestamp: Date.now(),
      description: `Insert token: ${payload.key}`,
    };
  }

  /**
   * 10. Inserts an explicit manual page break
   */
  public static insertManualPageBreak(host: HTMLElement): EditorTransaction {
    const breakHtml = `${EditorSerializer.createManualPageBreakHtml()}<p><br></p>`;
    EditorDomAdapter.insertHtmlAtSelection(host, breakHtml);
    const cleanHtml = EditorSerializer.sanitize(host.innerHTML);
    const doc = EditorSerializer.toCanonicalDocument(cleanHtml);

    return {
      doc,
      canonicalHtml: cleanHtml,
      origin: 'command',
      timestamp: Date.now(),
      description: 'Insert manual page break',
    };
  }

  /**
   * 11. Replaces current selection with arbitrary content
   */
  public static replaceSelection(host: HTMLElement, contentHtml: string): EditorTransaction {
    EditorDomAdapter.insertHtmlAtSelection(host, contentHtml);
    const cleanHtml = EditorSerializer.sanitize(host.innerHTML);
    const doc = EditorSerializer.toCanonicalDocument(cleanHtml);

    return {
      doc,
      canonicalHtml: cleanHtml,
      origin: 'command',
      timestamp: Date.now(),
      description: 'Replace selection',
    };
  }

  /**
   * 12. Clears inline formatting marks from current selection
   */
  public static removeFormat(host: HTMLElement): EditorTransaction {
    EditorDomAdapter.removeFormat(host);
    const cleanHtml = EditorSerializer.sanitize(host.innerHTML);
    const doc = EditorSerializer.toCanonicalDocument(cleanHtml);

    return {
      doc,
      canonicalHtml: cleanHtml,
      origin: 'command',
      timestamp: Date.now(),
      description: 'Clear formatting',
    };
  }
}

