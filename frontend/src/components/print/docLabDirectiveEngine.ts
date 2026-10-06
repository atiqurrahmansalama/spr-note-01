/**
 * DocLab Token Directive & Multi-Value Layout Engine
 * 
 * Enterprise-grade, pure modular parser & formatter for DocLab template tokens.
 * Handles single & multi-value data formatting with custom directives:
 * - Direction (vertical / horizontal)
 * - Order / Flow (asc / desc / reverse / bottom-to-top)
 * - Custom Delimiters / Separators (', ', ' • ', ' - ', ' / ', etc.)
 * - List Prefixing (number, bullet, dash, custom)
 * - Spacing / Gap & Indentation
 * - Range Slicing (limit, from, to)
 * - Fallback Defaults
 * 
 * Syntax: {{token_name <direction: vertical, order: desc, gap: 1>}}
 */

export type DirectiveDirection = 'vertical' | 'horizontal';
export type DirectiveOrder = 'asc' | 'desc';
export type DirectivePrefixStyle = 'none' | 'number' | 'bullet' | 'dash' | string;

export interface TokenDirectiveOptions {
  direction?: DirectiveDirection;
  order?: DirectiveOrder;
  separator?: string;
  prefix?: DirectivePrefixStyle;
  gap?: number;
  limit?: number;
  from?: number;
  to?: number;
  indent?: number;
  fallback?: string;
  [key: string]: any;
}

export interface ParsedTokenDirective {
  rawToken: string;
  baseKey: string;
  options: TokenDirectiveOptions;
  hasDirective: boolean;
  legacyFilterSpecs: string[];
}

/**
 * Splits directive arguments inside <...> safely preserving quoted strings like separator: ', ' or sep: ' • '
 */
function parseKeyValuePairs(directiveStr: string): TokenDirectiveOptions {
  const options: TokenDirectiveOptions = {};
  if (!directiveStr) return options;

  // Clean and normalize directive string (remove soft/hard hyphens at line ends and internal line breaks)
  const cleanDirective = directiveStr
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&nbsp;/gi, ' ')
    .replace(/-\s*[\r\n]+\s*/g, '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\bd\s*i\s*r\s*e\s*c\s*t\s*i\s*o\s*n\s*:/gi, 'direction:')
    .replace(/\bs\s*e\s*p\s*a\s*r\s*a\s*t\s*o\s*r\s*:/gi, 'separator:')
    .replace(/\bp\s*r\s*e\s*f\s*i\s*x\s*:/gi, 'prefix:')
    .replace(/\bo\s*r\s*d\s*e\s*r\s*:/gi, 'order:')
    .replace(/\bg\s*a\s*p\s*:/gi, 'gap:')
    .replace(/\bl\s*i\s*m\s*i\s*t\s*:/gi, 'limit:')
    .replace(/\b([a-zA-Z0-9_-]+)\s*:\s*/g, '$1: ')
    .trim();

  // Match key: 'value' or key: value
  const regex = /([a-zA-Z0-9_-]+)\s*:\s*(?:'([^']*)'|"([^"]*)"|([^,>]+))/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(cleanDirective)) !== null) {
    const rawKey = match[1].trim().toLowerCase();
    const rawVal = (match[2] !== undefined ? match[2] : match[3] !== undefined ? match[3] : match[4] || '').trim();

    switch (rawKey) {
      case 'direction':
      case 'dir':
      case 'layout':
      case 'orient':
      case 'orientation': {
        const valClean = rawVal.toLowerCase().replace(/[^a-z]/g, '');
        if (['vertical', 'v', 'vert', 'column', 'rows', 'col'].includes(valClean)) {
          options.direction = 'vertical';
        } else if (['horizontal', 'h', 'horiz', 'horizont', 'horizon', 'inline', 'row'].includes(valClean)) {
          options.direction = 'horizontal';
        }
        break;
      }
      case 'order':
      case 'flow':
      case 'sort': {
        const valClean = rawVal.toLowerCase().replace(/[^a-z0-9_-]/g, '');
        if (
          valClean === 'desc' ||
          valClean === 'reverse' ||
          valClean === 'reversed' ||
          valClean === 'bottomtotop' ||
          valClean === 'righttoleft' ||
          valClean === 'downtoup'
        ) {
          options.order = 'desc';
        } else {
          options.order = 'asc';
        }
        break;
      }
      case 'separator':
      case 'sep':
      case 'delimiter':
      case 'delim': {
        const valClean = rawVal.toLowerCase().replace(/[^a-z0-9_-]/g, '');
        if (['cell', 'tablecell', 'nextcell', 'td', 'table_cell'].includes(valClean)) {
          options.separator = 'cell';
        } else if (['newline', 'br', 'line', 'break'].includes(valClean)) {
          options.separator = 'newline';
        } else if (['tab', 'tabs'].includes(valClean)) {
          options.separator = 'tab';
        } else {
          options.separator = rawVal;
        }
        break;
      }
      case 'prefix':
      case 'list':
      case 'list-style':
      case 'bullet':
      case 'style': {
        options.prefix = rawVal.toLowerCase();
        break;
      }
      case 'gap':
      case 'spacing':
      case 'linegap':
      case 'linespace': {
        const num = parseInt(rawVal, 10);
        if (!isNaN(num)) options.gap = num;
        break;
      }
      case 'limit':
      case 'count':
      case 'max': {
        const num = parseInt(rawVal, 10);
        if (!isNaN(num) && num > 0) options.limit = num;
        break;
      }
      case 'from':
      case 'start': {
        const num = parseInt(rawVal, 10);
        if (!isNaN(num)) options.from = num;
        break;
      }
      case 'to':
      case 'end': {
        const num = parseInt(rawVal, 10);
        if (!isNaN(num)) options.to = num;
        break;
      }
      case 'indent':
      case 'indentation':
      case 'pad':
      case 'padding': {
        const num = parseInt(rawVal, 10);
        if (!isNaN(num)) options.indent = num;
        break;
      }
      case 'default':
      case 'fallback':
      case 'empty': {
        options.fallback = rawVal;
        break;
      }
      default: {
        options[rawKey] = rawVal;
        break;
      }
    }
  }

  return options;
}

/**
 * Parses a raw token inside {{...}} and extracts:
 * 1. Base Key (e.g. "class-sub1")
 * 2. Directive Options inside `<...>` (e.g. `<direction: vertical, order: desc>`)
 * 3. Legacy Pipe Filter Specs (e.g. `| uppercase` or `| indent: 5`)
 */
export function parseTokenDirective(tokenContent: string): ParsedTokenDirective {
  if (!tokenContent) {
    return {
      rawToken: '',
      baseKey: '',
      options: {},
      hasDirective: false,
      legacyFilterSpecs: [],
    };
  }

  // Normalize internal whitespace, linebreaks, and decode HTML entities
  const normalized = tokenContent
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&nbsp;/gi, ' ')
    .replace(/-\s*[\r\n]+\s*/g, '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 1. Check for legacy `<...>` directive syntax: {{key <direction: vertical, order: desc>}} or {{key <| indent: 5>}}
  const directiveMatch = normalized.match(/^(.*?)\s*<([\s\S]*?)>\s*$/);
  if (directiveMatch) {
    const rawKeyPart = directiveMatch[1].trim();
    let rawDirective = directiveMatch[2].trim();
    if (rawDirective.startsWith('|')) {
      rawDirective = rawDirective.slice(1).trim();
    }

    const pipeParts = rawKeyPart.split('|').map((p) => p.trim());
    const baseKey = pipeParts[0].replace(/[\s]/g, '');
    const legacyFilterSpecs = pipeParts.slice(1);

    const options = parseKeyValuePairs(rawDirective);

    // If directive is indent (e.g. <| indent: 5> or <indent: 5>), also add to legacyFilterSpecs for standard filter processing
    if (rawDirective.toLowerCase().startsWith('indent') && !legacyFilterSpecs.some((f) => f.toLowerCase().startsWith('indent'))) {
      legacyFilterSpecs.push(rawDirective);
    }

    return {
      rawToken: normalized,
      baseKey,
      options,
      hasDirective: Object.keys(options).some((k) => k !== 'indent'),
      legacyFilterSpecs,
    };
  }

  // 2. Standard unified pipe syntax: {{key | direction: vertical, separator: ', ' | indent: 5 | uppercase}}
  const pipeParts = normalized.split('|').map((p) => p.trim());
  const baseKey = pipeParts[0].replace(/[\s]/g, '');
  const remainingParts = pipeParts.slice(1);

  const options: TokenDirectiveOptions = {};
  let hasDirective = false;
  const legacyFilterSpecs: string[] = [];

  remainingParts.forEach((part) => {
    // Check if this pipe part contains layout/direction keywords
    const isDirectivePart = /\b(direction|dir|layout|orient|orientation|separator|sep|delimiter|delim|order|flow|sort|prefix|list|gap|spacing|limit|count|max|from|to)\s*:/i.test(part);
    if (isDirectivePart) {
      hasDirective = true;
      const parsedOpts = parseKeyValuePairs(part);
      Object.assign(options, parsedOpts);
    } else {
      legacyFilterSpecs.push(part);
    }
  });

  return {
    rawToken: normalized,
    baseKey,
    options,
    hasDirective,
    legacyFilterSpecs,
  };
}

/**
 * Formats multi-value items or single value string according to parsed TokenDirectiveOptions.
 */
export function formatMultiValueData(
  rawValue: any,
  options: TokenDirectiveOptions = {},
  mode: 'html' | 'text' = 'html'
): string {
  if (rawValue === undefined || rawValue === null) {
    return options.fallback !== undefined ? options.fallback : '';
  }

  // 1. Extract raw items list
  let items: string[] = [];
  if (Array.isArray(rawValue)) {
    items = rawValue.map((it) => (it !== null && it !== undefined ? String(it).trim() : '')).filter(Boolean);
  } else if (typeof rawValue === 'string') {
    const str = rawValue.trim();
    if (!str) {
      return options.fallback !== undefined ? options.fallback : '';
    }

    if (str.includes('\n') || /<br\s*\/?>/i.test(str)) {
      items = str.split(/\r?\n|<br\s*\/?>/gi).map((s) => s.trim()).filter(Boolean);
    } else if (str.includes(', ') || str.includes(',')) {
      items = str.split(',').map((s) => s.trim()).filter(Boolean);
    } else {
      items = [str];
    }
  } else if (typeof rawValue === 'object') {
    items = [JSON.stringify(rawValue)];
  } else {
    items = [String(rawValue).trim()];
  }

  if (items.length === 0) {
    return options.fallback !== undefined ? options.fallback : '';
  }

  // 2. Apply Ordering (asc vs desc / reverse / bottom-to-top)
  if (options.order === 'desc') {
    items = [...items].reverse();
  }

  // 3. Apply Range Filtering (from, to, limit)
  if (options.from !== undefined && options.from > 0) {
    const startIdx = Math.max(0, options.from - 1);
    const endIdx = options.to !== undefined && options.to >= options.from ? options.to : items.length;
    items = items.slice(startIdx, endIdx);
  } else if (options.to !== undefined && options.to > 0) {
    items = items.slice(0, options.to);
  }

  if (options.limit !== undefined && options.limit > 0) {
    items = items.slice(0, options.limit);
  }

  if (items.length === 0) {
    return options.fallback !== undefined ? options.fallback : '';
  }

  // 4. Apply Prefix / List Styling (numbers, bullets, dashes, custom)
  if (options.prefix) {
    const pfx = options.prefix.trim().toLowerCase();
    if (pfx === 'number' || pfx === 'numeric' || pfx === '1.' || pfx === '1') {
      items = items.map((item, idx) => `${idx + 1}. ${item}`);
    } else if (pfx === 'bullet' || pfx === 'dot' || pfx === '•') {
      items = items.map((item) => `• ${item}`);
    } else if (pfx === 'dash' || pfx === '-') {
      items = items.map((item) => `- ${item}`);
    } else if (pfx !== 'none' && pfx !== 'false') {
      items = items.map((item) => `${options.prefix} ${item}`);
    }
  }

  // 5. Apply Indentation (if specified)
  const indentCount = options.indent && options.indent > 0 ? options.indent : 0;
  const spaceChar = mode === 'html' ? '&nbsp;' : ' ';
  const indentStr = indentCount > 0 ? spaceChar.repeat(indentCount) : '';

  // 6. Apply Direction & Separator Layout
  const direction = options.direction || 'horizontal';
  const sep = options.separator !== undefined ? String(options.separator).trim().toLowerCase() : '';

  // 6a. Table Cell Flow (Populate consecutive table cells / rows)
  if (sep === 'cell' || sep === 'table-cell' || sep === 'next-cell' || sep === 'td') {
    if (direction === 'vertical') {
      const indentedLines = items.map((line) => `${indentStr}${line}`);
      return mode === 'html' ? indentedLines.join('<!-- spr-row-cell-split -->') : indentedLines.join('\n');
    } else {
      const indentedLines = items.map((line) => `${indentStr}${line}`);
      return mode === 'html' ? indentedLines.join('<!-- spr-cell-split -->') : indentedLines.join('\t');
    }
  }

  if (direction === 'vertical') {
    // Line breaks with optional extra spacing / gap
    const gap = options.gap && options.gap > 0 ? options.gap : 0;
    const baseBreak = mode === 'html' ? '<br>' : '\n';
    const lineBreak = baseBreak.repeat(1 + gap);

    const indentedLines = items.map((line) => `${indentStr}${line}`);
    return indentedLines.join(lineBreak);
  } else {
    // Horizontal layout with custom separator
    let separatorStr = options.separator !== undefined ? options.separator : (items.length > 1 ? ', ' : '');
    if (separatorStr === 'newline' || separatorStr === 'br') {
      separatorStr = mode === 'html' ? '<br>' : '\n';
    } else if (separatorStr === 'tab') {
      separatorStr = mode === 'html' ? '&nbsp;&nbsp;&nbsp;&nbsp;' : '\t';
    } else if (separatorStr === 'space') {
      separatorStr = ' ';
    }
    const joined = items.join(separatorStr);
    return indentStr ? `${indentStr}${joined}` : joined;
  }
}

