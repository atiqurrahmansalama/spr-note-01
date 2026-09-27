/**
 * RuntimeVariableResolver
 * Evaluates dynamic layout variables in headers, footers, and continuation blocks at runtime.
 *
 * Example:
 * "Page {{page.number}} of {{page.total}}" -> "Page 3 of 12"
 *
 * Variables are derived strictly from layout results and NEVER persisted into document storage.
 */

import { RuntimeLayoutVariables } from './headerFooterTypes';

export class RuntimeVariableResolver {
  /**
   * Replaces dynamic tokens in a template string with active layout runtime variables
   */
  public static resolve(template: string, vars: RuntimeLayoutVariables): string {
    if (!template || typeof template !== 'string') return '';

    return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, key) => {
      const normalizedKey = key.toLowerCase().replace(/_/g, '.');

      switch (normalizedKey) {
        case 'page.number':
        case 'page':
        case 'pagenumber':
        case 'page.index':
          return String(vars.pageNumber);

        case 'page.total':
        case 'pages':
        case 'totalpages':
        case 'total.pages':
          return String(vars.totalPages);

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
      pageNumber: pageIndex + 1,
      totalPages: Math.max(1, totalPages),
      documentTitle: 'Official Document',
      institutionName: 'Institution Name',
      currentDate,
      currentTime,
      ...overrides,
    };
  }
}
