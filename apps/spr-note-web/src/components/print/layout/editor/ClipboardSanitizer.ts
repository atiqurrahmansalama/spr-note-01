/**
 * ClipboardSanitizer
 *
 * Dedicated industry-grade clipboard sanitizer for SPR Note DocLab.
 * Sanitizes external HTML from Microsoft Word, Microsoft Office/Outlook, Google Docs,
 * LibreOffice, and Apple Pages into clean, strongly-typed canonical HTML structures
 * without destroying legitimate formatting (bold, italic, underline, strike, colors,
 * fonts, sizes, headings, tables, lists, images, and alignments).
 */

import { sanitizeLogicalDocumentHtml, stripRuntimePaginationSpacers } from '../logicalDocument';

export class ClipboardSanitizer {
  /**
   * Main entry point: cleans and normalizes clipboard HTML into pristine canonical HTML.
   */
  public static sanitize(rawHtml: string): string {
    if (!rawHtml || !rawHtml.trim()) return '';

    let html = rawHtml;

    // 1. Strip HTML comments (including MS Word conditional comments like <!--[if gte mso 9]>...<![endif]-->)
    html = html.replace(/<!--\[if\s+[\s\S]*?<!\[endif\]-->/gi, '');
    html = html.replace(/<!--[\s\S]*?-->/gi, '');

    // 2. Strip XML namespaces and MS Office tags (<o:p>, <w:worddocument>, <m:math>, <v:shape>, <st1:place>, etc.)
    html = html.replace(/<\/?(?:o|w|m|v|st1|x|p|xml):[^>]*>/gi, '');

    // 3. Strip external <style>, <meta>, <link>, <title>, <xml> blocks injected by Word/Outlook/Google Docs
    html = html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
    html = html.replace(/<xml\b[^>]*>[\s\S]*?<\/xml>/gi, '');
    html = html.replace(/<meta\b[^>]*>/gi, '');
    html = html.replace(/<link\b[^>]*>/gi, '');
    html = html.replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, '');

    // 3.5 Strip Google Docs internal guid wrappers and IDs
    html = html.replace(/\bid="docs-internal-guid-[^"]*"/gi, '');
    html = html.replace(/<b\b[^>]*style="[^"]*font-weight:\s*normal[^"]*"[^>]*>([\s\S]*?)<\/b>/gi, '$1');

    // 4. Transform Word-style lists (paragraphs with mso-list or class="MsoListParagraph")
    html = this.transformWordLists(html);

    // 5. Clean style attributes across all elements (strip mso-*, redundant margins, line-heights)
    html = this.cleanStyleAttributes(html);

    // 6. Clean class names (strip MsoNormal, MsoListParagraph, docs-internal-guid, etc.)
    html = this.cleanClassNames(html);

    // 7. Unwrap redundant empty spans or zero-attribute container spans
    html = this.unwrapRedundantSpans(html);

    // 8. Normalize headings and paragraphs
    html = this.normalizeBlocks(html);

    // 9. Standard Logical Document Sanitization (strip runtime page shells, badges, diagnostics, spacers)
    html = sanitizeLogicalDocumentHtml(html);

    return html.trim();
  }

  /**
   * Transforms MS Word list paragraphs with fake bullet spans into standard <ul>/<li> or <ol>/<li>
   */
  private static transformWordLists(html: string): string {
    // 1. Remove Word fake bullet marker spans (<span style="mso-list:Ignore">...</span>)
    let cleaned = html.replace(/<span\b[^>]*?\bmso-list:\s*Ignore\b[^>]*>[\s\S]*?<\/span>/gi, '');
    cleaned = cleaned.replace(/<!--\[if\s+!supportLists\]>[\s\S]*?<!\[endif\]-->/gi, '');

    // 2. Check if there are MsoListParagraph elements to convert
    if (/class="[^"]*MsoListParagraph[^"]*"|style="[^"]*mso-list:[^"]*"/i.test(cleaned)) {
      if (typeof document !== 'undefined') {
        try {
          const temp = document.createElement('div');
          temp.innerHTML = cleaned;

          const listParas = Array.from(
            temp.querySelectorAll('p.MsoListParagraph, p[style*="mso-list:"]')
          ) as HTMLElement[];

          if (listParas.length > 0) {
            let currentList: HTMLElement | null = null;

            listParas.forEach((p) => {
              const text = p.textContent?.trim() || '';
              const isNumbered = /^\d+[\.\)]\s*/.test(text);
              const targetListTag = isNumbered ? 'ol' : 'ul';

              if (!currentList || currentList.tagName.toLowerCase() !== targetListTag || p.previousElementSibling !== currentList) {
                currentList = document.createElement(targetListTag);
                p.parentNode?.insertBefore(currentList, p);
              }

              const li = document.createElement('li');
              // Strip leading number if present in text
              let innerHtml = p.innerHTML;
              if (isNumbered) {
                innerHtml = innerHtml.replace(/^\s*\d+[\.\)]\s*/, '');
              }
              li.innerHTML = innerHtml;
              currentList.appendChild(li);
              p.parentNode?.removeChild(p);
            });

            cleaned = temp.innerHTML;
          }
        } catch {
          // Fallback to regex
        }
      }
    }

    return cleaned;
  }

  /**
   * Cleans inline style attributes, removing mso-* properties and preserving legitimate styles
   */
  private static cleanStyleAttributes(html: string): string {
    return html.replace(/\bstyle="([^"]*)"/gi, (match, styleString: string) => {
      if (!styleString || !styleString.trim()) return '';

      const declarations = styleString.split(';');
      const preserved: string[] = [];

      declarations.forEach((decl) => {
        const colonIdx = decl.indexOf(':');
        if (colonIdx === -1) return;

        const prop = decl.slice(0, colonIdx).trim().toLowerCase();
        let val = decl.slice(colonIdx + 1).trim();

        // Drop mso-* properties
        if (prop.startsWith('mso-') || prop.startsWith('-mso-') || prop.startsWith('tab-stops')) {
          return;
        }

        // Drop zero margins or standard reset margins from Word
        if (prop === 'margin' && (val === '0in' || val === '0in 0in 0.0001pt' || val === '0px' || val === '0')) {
          return;
        }
        if (prop.startsWith('margin-') && (val === '0in' || val === '0pt' || val === '0px' || val === '0')) {
          return;
        }

        // Drop line-height: normal
        if (prop === 'line-height' && val === 'normal') {
          return;
        }

        // Drop font-family: 'Times New Roman' or 'Calibri' if generic default
        if (prop === 'font-family' && (val.toLowerCase().includes('times new roman') || val.toLowerCase().includes('calibri'))) {
          return;
        }

        // Normalize color: windowtext to #0f172a
        if (prop === 'color' && val.toLowerCase() === 'windowtext') {
          val = '#0f172a';
        }

        // Normalize font-size from pt to pt/px
        if (prop === 'font-size') {
          const ptMatch = val.match(/^(\d+(?:\.\d+)?)pt$/i);
          if (ptMatch) {
            val = `${Math.round(parseFloat(ptMatch[1]))}pt`;
          }
        }

        // Allowed formatting properties
        const allowedProps = [
          'font-weight',
          'font-style',
          'text-decoration',
          'color',
          'background-color',
          'font-size',
          'font-family',
          'text-align',
          'border',
          'border-collapse',
          'width',
          'max-width',
          'height',
          'padding',
          'margin',
        ];

        if (allowedProps.includes(prop) || prop.startsWith('border-') || prop.startsWith('padding-')) {
          preserved.push(`${prop}: ${val}`);
        }
      });

      if (preserved.length === 0) return '';
      return `style="${preserved.join('; ')}"`;
    });
  }

  /**
   * Cleans class names, stripping MS Word and Google Docs artifact classes
   */
  private static cleanClassNames(html: string): string {
    return html.replace(/\bclass="([^"]*)"/gi, (match, classString: string) => {
      if (!classString || !classString.trim()) return '';

      const classes = classString.split(/\s+/).filter(Boolean);
      const cleanClasses = classes.filter((cls) => {
        const lower = cls.toLowerCase();
        return (
          !lower.startsWith('mso') &&
          !lower.includes('wordsection') &&
          !lower.includes('docs-internal-guid') &&
          !lower.includes('c-') && // Google Docs transient c0, c1 classes
          !lower.includes('kix-')
        );
      });

      if (cleanClasses.length === 0) return '';
      return `class="${cleanClasses.join(' ')}"`;
    });
  }

  /**
   * Unwraps empty or non-styled span elements
   */
  private static unwrapRedundantSpans(html: string): string {
    let result = html;

    // Remove empty spans <span></span>
    result = result.replace(/<span>\s*<\/span>/gi, '');

    // Unwrap <span>text</span> without attributes
    result = result.replace(/<span>([\s\S]*?)<\/span>/gi, '$1');

    return result;
  }

  /**
   * Normalizes headings and block-level tags
   */
  private static normalizeBlocks(html: string): string {
    let result = html;

    // Convert Word Title / Subtitle classes to <h1> / <h2>
    result = result.replace(/<p\b[^>]*?\bclass="[^"]*MsoTitle[^"]*"[^>]*>([\s\S]*?)<\/p>/gi, '<h1>$1</h1>');
    result = result.replace(/<p\b[^>]*?\bclass="[^"]*MsoSubtitle[^"]*"[^>]*>([\s\S]*?)<\/p>/gi, '<h2>$1</h2>');
    result = result.replace(/<p\b[^>]*?\bclass="[^"]*MsoHeading1[^"]*"[^>]*>([\s\S]*?)<\/p>/gi, '<h1>$1</h1>');
    result = result.replace(/<p\b[^>]*?\bclass="[^"]*MsoHeading2[^"]*"[^>]*>([\s\S]*?)<\/p>/gi, '<h2>$1</h2>');
    result = result.replace(/<p\b[^>]*?\bclass="[^"]*MsoHeading3[^"]*"[^>]*>([\s\S]*?)<\/p>/gi, '<h3>$1</h3>');

    // Replace empty paragraph artifacts with <p><br></p>
    result = result.replace(/<p\b[^>]*>(?:&nbsp;|\s)*<\/p>/gi, '<p><br></p>');

    return result;
  }

  /**
   * Converts plain text with multiple lines into canonical paragraphs
   */
  public static plainTextToCanonicalHtml(text: string): string {
    if (!text || !text.trim()) return '<p><br></p>';

    const lines = text.split(/\r?\n/);
    const paragraphs = lines.map((line) => {
      const clean = line
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return clean.trim() ? `<p>${clean}</p>` : '<p><br></p>';
    });

    return paragraphs.join('');
  }
}
