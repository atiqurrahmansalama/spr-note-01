/**
 * RuntimeVariableResolver
 * Evaluates dynamic layout variables in headers, footers, continuation blocks,
 * and watermark strings at runtime.
 *
 * Example:
 * "Page {{page}} of {{pages}}" -> "Page 3 of 12"
 * "পৃষ্ঠা {{page_bn}} / {{pages_bn}}" -> "পৃষ্ঠা ৩ / ১২"
 * "Section {{section.number}} • Page {{section.page}} of {{section.total}}"
 *
 * Variables are derived strictly from layout results and NEVER persisted into document storage.
 */

import { RuntimeLayoutVariables } from './headerFooterTypes';

const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export class RuntimeVariableResolver {
  /**
   * Converts standard integer to Bengali numeral string
   */
  public static toBengaliNumerals(num: number | string): string {
    return String(num).replace(/\d/g, (d) => BENGALI_DIGITS[parseInt(d, 10)] || d);
  }

  /**
   * Converts standard integer to Arabic/Urdu numeral string
   */
  public static toArabicNumerals(num: number | string): string {
    return String(num).replace(/\d/g, (d) => ARABIC_DIGITS[parseInt(d, 10)] || d);
  }

  /**
   * Replaces dynamic tokens in a template string with active layout runtime variables.
   * Supports both double-brace `{{token}}` and single-brace `{token}` syntaxes.
   */
  public static resolve(template: string, vars: RuntimeLayoutVariables): string {
    if (!template || typeof template !== 'string') return '';

    // Match both {{key}} and {key}
    const tokenRegex = /\{\{?\s*([a-zA-Z0-9_.]+)\s*\}?\}/g;

    return template.replace(tokenRegex, (match, key) => {
      const normalizedKey = key.toLowerCase().replace(/_/g, '.');

      switch (normalizedKey) {
        // Standard Page Numbering
        case 'page.number':
        case 'page':
        case 'pagenumber':
        case 'page.index.1':
          return String(vars.pageNumber);

        case 'page.index':
        case 'pageindex':
          return String(vars.pageIndex);

        case 'page.total':
        case 'pages':
        case 'totalpages':
        case 'total.pages':
          return String(vars.totalPages);

        // Bengali Page Numbering
        case 'page.bn':
        case 'pagebn':
        case 'page.number.bn':
        case 'pagenumberbn':
          return vars.pageNumberBengali || this.toBengaliNumerals(vars.pageNumber);

        case 'pages.bn':
        case 'pagesbn':
        case 'totalpages.bn':
        case 'totalpagesbn':
          return vars.totalPagesBengali || this.toBengaliNumerals(vars.totalPages);

        // Arabic Page Numbering
        case 'page.ar':
        case 'pagear':
        case 'page.number.ar':
          return vars.pageNumberArabic || this.toArabicNumerals(vars.pageNumber);

        case 'pages.ar':
        case 'pagesar':
        case 'totalpages.ar':
          return vars.totalPagesArabic || this.toArabicNumerals(vars.totalPages);

        // Section Information
        case 'section.id':
        case 'sectionid':
          return vars.sectionId || 'default';

        case 'section.index':
        case 'sectionindex':
          return String(vars.sectionIndex !== undefined ? vars.sectionIndex : 0);

        case 'section.number':
        case 'sectionnumber':
          return String(vars.sectionNumber !== undefined ? vars.sectionNumber : 1);

        case 'section.title':
        case 'sectiontitle':
          return vars.sectionTitle || vars.documentTitle || '';

        case 'section.page':
        case 'sectionpage':
        case 'section.page.number':
          return String(vars.sectionPageNumber !== undefined ? vars.sectionPageNumber : vars.pageNumber);

        case 'section.total':
        case 'sectionpages':
        case 'section.total.pages':
          return String(vars.sectionTotalPages !== undefined ? vars.sectionTotalPages : vars.totalPages);

        // Document Metadata
        case 'document.title':
        case 'title':
        case 'doctitle':
          return vars.documentTitle || '';

        case 'document.subtitle':
        case 'subtitle':
          return vars.documentSubtitle || '';

        case 'institution.name':
        case 'institutionname':
        case 'academyname':
          return vars.institutionName || '';

        case 'institution.address':
        case 'institutionaddress':
          return vars.institutionAddress || '';

        // Date & Timestamp
        case 'date':
        case 'print.date':
        case 'printdate':
          return vars.currentDate || '';

        case 'time':
        case 'print.time':
        case 'printtime':
          return vars.currentTime || '';

        case 'timestamp':
          return `${vars.currentDate}, ${vars.currentTime}`;

        default:
          if (vars.meta && vars.meta[key] !== undefined) {
            return String(vars.meta[key]);
          }
          return match;
      }
    });
  }

  /**
   * Factory to construct active runtime layout variables for a page sheet
   */
  public static buildVariables(
    pageIndex: number,
    totalPages: number,
    overrides?: Partial<RuntimeLayoutVariables>
  ): RuntimeLayoutVariables {
    const pageNum = pageIndex + 1;
    const total = Math.max(1, totalPages);

    const now = new Date();
    const currentDate = now.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const currentTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    return {
      pageIndex,
      pageNumber: pageNum,
      totalPages: total,
      pageNumberBengali: this.toBengaliNumerals(pageNum),
      totalPagesBengali: this.toBengaliNumerals(total),
      pageNumberArabic: this.toArabicNumerals(pageNum),
      totalPagesArabic: this.toArabicNumerals(total),
      documentTitle: 'Official Document',
      institutionName: 'SPR Note Academy',
      currentDate,
      currentTime,
      ...overrides,
    };
  }
}
