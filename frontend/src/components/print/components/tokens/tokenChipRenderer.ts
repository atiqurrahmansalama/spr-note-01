/**
 * DocLab Token Chip Renderer & Utilities
 * 
 * Generates compact, accessible, and structured token chips for DocLab canvas templates.
 * Translates verbose token expressions into clean summary badges.
 */

import { parseTokenDirective, TokenDirectiveOptions } from '../../docLabDirectiveEngine';

export interface TokenSummaryInfo {
  baseKey: string;
  rawToken: string;
  direction?: 'vertical' | 'horizontal';
  separator?: string;
  indent?: number;
  fromLine?: number;
  toLine?: number;
  filters: string[];
  displayBadgeText: string;
  directiveBadges: Array<{ icon: string; text: string; title: string }>;
}

/**
 * Extracts structured summary information from a raw token expression
 * e.g. "exam-date | direction: horizontal, separator: cell | indent: 5"
 */
export function extractTokenSummary(rawTokenStr: string): TokenSummaryInfo {
  const clean = (rawTokenStr || '').replace(/^\{+/, '').replace(/\}+$/, '').trim();
  const parsed = parseTokenDirective(clean);

  const baseKey = parsed.baseKey || 'variable';
  const options: TokenDirectiveOptions = parsed.options || {};
  const filterSpecs: string[] = parsed.legacyFilterSpecs || [];

  const directiveBadges: Array<{ icon: string; text: string; title: string }> = [];

  // 1. Layout Direction & Cell Splitting
  if (options.direction === 'horizontal') {
    if (options.separator === 'cell') {
      directiveBadges.push({ icon: '↔', text: 'Cell Split', title: 'Layout: Horizontal table cell split' });
    } else {
      directiveBadges.push({ icon: '↔', text: 'Horiz', title: 'Layout: Horizontal flow' });
    }
  } else if (options.direction === 'vertical') {
    directiveBadges.push({ icon: '↕', text: 'Vert', title: 'Layout: Vertical stacked' });
  }

  // 2. Custom Separators
  if (options.separator && options.separator !== 'cell') {
    if (options.separator === 'newline') {
      directiveBadges.push({ icon: 'Line', text: 'Line', title: 'Separator: Newline' });
    } else if (options.separator === 'comma' || options.separator === ', ') {
      directiveBadges.push({ icon: ',', text: 'Comma', title: 'Separator: Comma' });
    } else {
      directiveBadges.push({ icon: '•', text: `Sep: "${options.separator}"`, title: `Separator: ${options.separator}` });
    }
  }

  // 3. Indentation
  const indentFilter = filterSpecs.find((f) => f.toLowerCase().startsWith('indent'));
  let indentSpaces = options.indent;
  let fromLine = options.from;
  let toLine = options.to;

  if (indentFilter) {
    const numMatch = indentFilter.match(/\bindent\s*:\s*(\d+)/i);
    if (numMatch) indentSpaces = parseInt(numMatch[1], 10);
    const fromMatch = indentFilter.match(/\bfrom:\s*(\d+)/i);
    if (fromMatch) fromLine = parseInt(fromMatch[1], 10);
    const toMatch = indentFilter.match(/\bto:\s*(\d+)/i);
    if (toMatch) toLine = parseInt(toMatch[1], 10);
  }

  if (indentSpaces && indentSpaces > 0) {
    const fromText = fromLine ? ` L${fromLine}+` : '';
    directiveBadges.push({
      icon: 'Indent',
      text: `Indent ${indentSpaces}${fromText}`,
      title: `Multi-line Indentation: ${indentSpaces} spaces${fromLine ? ` starting from line ${fromLine}` : ''}`,
    });
  }

  // 4. Formatting Filters (Upper, Lower, Cap, Date, Currency, Bengali)
  const allFilters: string[] = [];
  filterSpecs.forEach((f) => {
    const low = f.toLowerCase().trim();
    if (low.startsWith('indent')) return;

    allFilters.push(f.trim());

    if (low.startsWith('upper') || low === 'uppercase') {
      directiveBadges.push({ icon: 'Aa', text: 'UPPER', title: 'Filter: Uppercase' });
    } else if (low.startsWith('lower') || low === 'lowercase') {
      directiveBadges.push({ icon: 'aa', text: 'lower', title: 'Filter: Lowercase' });
    } else if (low.startsWith('cap') || low === 'capitalize') {
      directiveBadges.push({ icon: 'Ab', text: 'Capitalize', title: 'Filter: Capitalize words' });
    } else if (low.startsWith('date')) {
      directiveBadges.push({ icon: 'Date', text: 'Date', title: 'Filter: Formatted Date' });
    } else if (low.startsWith('currency') || low.startsWith('taka') || low.startsWith('money')) {
      directiveBadges.push({ icon: '৳', text: 'Currency', title: 'Filter: Currency format' });
    } else if (low.startsWith('bengali') || low === 'bn') {
      directiveBadges.push({ icon: '১', text: 'বাংলা', title: 'Filter: Bengali digits' });
    } else {
      directiveBadges.push({ icon: 'FX', text: f, title: `Filter: ${f}` });
    }
  });

  return {
    baseKey,
    rawToken: clean,
    direction: options.direction,
    separator: options.separator,
    indent: indentSpaces,
    fromLine,
    toLine,
    filters: allFilters,
    displayBadgeText: directiveBadges.map((b) => b.text).join(' | '),
    directiveBadges,
  };
}

/**
 * Builds the canonical Mustache token string from individual parameters
 */
export function buildTokenString(
  baseKey: string,
  options: {
    direction?: 'vertical' | 'horizontal';
    separator?: string;
    indent?: number;
    fromLine?: number;
    toLine?: number;
    filters?: string[];
  } = {}
): string {
  const cleanKey = (baseKey || '').trim().replace(/^\{+/, '').replace(/\}+$/, '');
  if (!cleanKey) return '';

  const directiveParts: string[] = [];

  // Layout directives
  const layoutParts: string[] = [];
  if (options.direction) {
    layoutParts.push(`direction: ${options.direction}`);
  }
  if (options.separator) {
    if (['cell', 'newline', 'comma', 'tab'].includes(options.separator)) {
      layoutParts.push(`separator: ${options.separator}`);
    } else if (options.separator === ', ') {
      layoutParts.push(`separator: ', '`);
    } else {
      layoutParts.push(`separator: "${options.separator}"`);
    }
  }

  if (layoutParts.length > 0) {
    directiveParts.push(layoutParts.join(', '));
  }

  // Indentation directive
  if (options.indent && options.indent > 0) {
    let indentSpec = `indent: ${options.indent}`;
    if (options.fromLine && options.fromLine > 1) {
      indentSpec += `, from: ${options.fromLine}`;
    }
    if (options.toLine && options.toLine > 0) {
      indentSpec += `, to: ${options.toLine}`;
    }
    directiveParts.push(indentSpec);
  }

  // Legacy formatting filters
  if (Array.isArray(options.filters)) {
    options.filters.forEach((f) => {
      if (f && f.trim()) directiveParts.push(f.trim());
    });
  }

  if (directiveParts.length === 0) {
    return `{{${cleanKey}}}`;
  }

  return `{{${cleanKey} | ${directiveParts.join(' | ')}}}`;
}
