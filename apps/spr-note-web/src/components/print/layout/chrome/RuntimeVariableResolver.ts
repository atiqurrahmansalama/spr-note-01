/**
 * RuntimeVariableResolver
 * Evaluates dynamic layout variables in headers, footers, continuation blocks,
 * and watermark strings at runtime.
 *
 * Example:
 * "Page {{page}} of {{pages}}" -> "Page 3 of 12"
 * "পৃষ্ঠা {{page_bn}} / {{pages_bn}}" -> "পৃষ্ঠা ৩ / ১২"
 * "Section {{section.number}} • Page {{section.page}} of {{section.total}}"
 * "Page {{page.roman}} ({{page.roman.lower}})" -> "Page III (iii)"
 *
 * Variables are derived strictly from layout results and NEVER persisted into document storage.
 */

import { RuntimeLayoutVariables } from './headerFooterTypes';

const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

const ROMAN_NUMERALS: [number, string][] = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];

export class RuntimeVariableResolver {
  /**
   * Converts positive integer to Roman numeral string
   */
  public static toRomanNumerals(num: number | string, uppercase: boolean = true): string {
    const val = typeof num === 'string' ? parseInt(num, 10) : num;
    if (isNaN(val) || val <= 0) return String(num);

    let remainder = Math.floor(val);
    let result = '';

    for (const [rValue, rNumeral] of ROMAN_NUMERALS) {
      while (remainder >= rValue) {
        result += rNumeral;
        remainder -= rValue;
      }
    }

    const roman = result || 'I';
    return uppercase ? roman : roman.toLowerCase();
  }

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
   * Formats a page number based on a specified numeral system
   */
  public static formatPageNumber(
    num: number,
    format: 'decimal' | 'roman-upper' | 'roman-lower' | 'bengali' | 'arabic' = 'decimal'
  ): string {
    switch (format) {
      case 'roman-upper':
        return this.toRomanNumerals(num, true);
      case 'roman-lower':
        return this.toRomanNumerals(num, false);
      case 'bengali':
        return this.toBengaliNumerals(num);
      case 'arabic':
        return this.toArabicNumerals(num);
      case 'decimal':
      default:
        return String(num);
    }
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

        // Roman Numerals
        case 'page.roman':
        case 'page.roman.upper':
        case 'pageroman':
        case 'pageromanupper':
          return vars.pageNumberRomanUpper || this.toRomanNumerals(vars.pageNumber, true);

        case 'page.roman.lower':
        case 'pageromanlower':
          return vars.pageNumberRomanLower || this.toRomanNumerals(vars.pageNumber, false);

        case 'pages.roman':
        case 'pages.roman.upper':
        case 'totalpages.roman':
        case 'totalpages.roman.upper':
          return vars.totalPagesRomanUpper || this.toRomanNumerals(vars.totalPages, true);

        case 'pages.roman.lower':
        case 'totalpages.roman.lower':
          return vars.totalPagesRomanLower || this.toRomanNumerals(vars.totalPages, false);

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
        case 'pagenumberar':
          return vars.pageNumberArabic || this.toArabicNumerals(vars.pageNumber);

        case 'pages.ar':
        case 'pagesar':
        case 'totalpages.ar':
        case 'totalpagesar':
          return vars.totalPagesArabic || this.toArabicNumerals(vars.totalPages);

        // Formatted based on active format
        case 'page.formatted':
        case 'pageformatted':
          return vars.pageNumberFormatted || this.formatPageNumber(vars.pageNumber, vars.pageNumberFormat);

        case 'pages.formatted':
        case 'pagesformatted':
        case 'totalpages.formatted':
          return vars.totalPagesFormatted || this.formatPageNumber(vars.totalPages, vars.pageNumberFormat);

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

        case 'section.page.formatted':
        case 'sectionpageformatted':
          return vars.sectionPageNumberFormatted || this.formatPageNumber(vars.sectionPageNumber !== undefined ? vars.sectionPageNumber : vars.pageNumber, vars.pageNumberFormat);

        case 'section.total.formatted':
        case 'sectiontotalformatted':
          return vars.sectionTotalPagesFormatted || this.formatPageNumber(vars.sectionTotalPages !== undefined ? vars.sectionTotalPages : vars.totalPages, vars.pageNumberFormat);

        case 'section.page.roman':
        case 'section.page.roman.upper':
        case 'sectionpageroman':
          return vars.sectionPageNumberRomanUpper || this.toRomanNumerals(vars.sectionPageNumber !== undefined ? vars.sectionPageNumber : vars.pageNumber, true);

        case 'section.page.roman.lower':
        case 'sectionpageromanlower':
          return vars.sectionPageNumberRomanLower || this.toRomanNumerals(vars.sectionPageNumber !== undefined ? vars.sectionPageNumber : vars.pageNumber, false);

        case 'section.total.roman':
        case 'section.total.roman.upper':
        case 'sectiontotalroman':
          return vars.sectionTotalPagesRomanUpper || this.toRomanNumerals(vars.sectionTotalPages !== undefined ? vars.sectionTotalPages : vars.totalPages, true);

        case 'section.total.roman.lower':
        case 'sectiontotalromanlower':
          return vars.sectionTotalPagesRomanLower || this.toRomanNumerals(vars.sectionTotalPages !== undefined ? vars.sectionTotalPages : vars.totalPages, false);

        case 'section.page.bn':
        case 'sectionpagebn':
          return vars.sectionPageNumberBengali || this.toBengaliNumerals(vars.sectionPageNumber !== undefined ? vars.sectionPageNumber : vars.pageNumber);

        case 'section.total.bn':
        case 'sectiontotalbn':
          return vars.sectionTotalPagesBengali || this.toBengaliNumerals(vars.sectionTotalPages !== undefined ? vars.sectionTotalPages : vars.totalPages);

        case 'section.page.ar':
        case 'sectionpagear':
          return vars.sectionPageNumberArabic || this.toArabicNumerals(vars.sectionPageNumber !== undefined ? vars.sectionPageNumber : vars.pageNumber);

        case 'section.total.ar':
        case 'sectiontotalar':
          return vars.sectionTotalPagesArabic || this.toArabicNumerals(vars.sectionTotalPages !== undefined ? vars.sectionTotalPages : vars.totalPages);

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
    const format = overrides?.pageNumberFormat || 'decimal';

    const secPageNum = overrides?.sectionPageNumber !== undefined ? overrides.sectionPageNumber : pageNum;
    const secTotalPages = overrides?.sectionTotalPages !== undefined ? overrides.sectionTotalPages : total;

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
      isFirstPage: pageIndex === 0,
      isSectionFirstPage: secPageNum === 1,
      pageNumberFormat: format,
      pageNumberFormatted: this.formatPageNumber(pageNum, format),
      totalPagesFormatted: this.formatPageNumber(total, format),
      pageNumberRomanUpper: this.toRomanNumerals(pageNum, true),
      pageNumberRomanLower: this.toRomanNumerals(pageNum, false),
      totalPagesRomanUpper: this.toRomanNumerals(total, true),
      totalPagesRomanLower: this.toRomanNumerals(total, false),
      pageNumberBengali: this.toBengaliNumerals(pageNum),
      totalPagesBengali: this.toBengaliNumerals(total),
      pageNumberArabic: this.toArabicNumerals(pageNum),
      totalPagesArabic: this.toArabicNumerals(total),
      sectionPageNumber: secPageNum,
      sectionTotalPages: secTotalPages,
      sectionPageNumberFormatted: this.formatPageNumber(secPageNum, format),
      sectionTotalPagesFormatted: this.formatPageNumber(secTotalPages, format),
      sectionPageNumberRomanUpper: this.toRomanNumerals(secPageNum, true),
      sectionPageNumberRomanLower: this.toRomanNumerals(secPageNum, false),
      sectionTotalPagesRomanUpper: this.toRomanNumerals(secTotalPages, true),
      sectionTotalPagesRomanLower: this.toRomanNumerals(secTotalPages, false),
      sectionPageNumberBengali: this.toBengaliNumerals(secPageNum),
      sectionTotalPagesBengali: this.toBengaliNumerals(secTotalPages),
      sectionPageNumberArabic: this.toArabicNumerals(secPageNum),
      sectionTotalPagesArabic: this.toArabicNumerals(secTotalPages),
      documentTitle: 'Official Document',
      institutionName: 'SPR Note Academy',
      currentDate,
      currentTime,
      ...overrides,
    };
  }
}
