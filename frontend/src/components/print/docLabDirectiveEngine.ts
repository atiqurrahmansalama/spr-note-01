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
  fromLine?: number;
  toLine?: number;
  all?: boolean;
  force?: boolean;
  sliceFrom?: number;
  sliceTo?: number;
  indent?: number;
  fallback?: string;
  skipData?: string;
  removeLine?: string;
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
    .replace(/\bs\s*k\s*i\s*p\s*d\s*a\s*t\s*a\s*:/gi, 'skipData:')
    .replace(/\br\s*e\s*m\s*o\s*v\s*e\s*l\s*i\s*n\s*e\s*:/gi, 'removeLine:')
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
      case 'fromline':
      case 'indentfrom': {
        const num = parseInt(rawVal, 10);
        if (!isNaN(num)) options.fromLine = num;
        break;
      }
      case 'toline':
      case 'indentto': {
        const num = parseInt(rawVal, 10);
        if (!isNaN(num)) options.toLine = num;
        break;
      }
      case 'slicefrom':
      case 'itemfrom': {
        const num = parseInt(rawVal, 10);
        if (!isNaN(num)) options.sliceFrom = num;
        break;
      }
      case 'sliceto':
      case 'itemto': {
        const num = parseInt(rawVal, 10);
        if (!isNaN(num)) options.sliceTo = num;
        break;
      }
      case 'all':
      case 'force': {
        if (rawVal.toLowerCase() === 'true' || rawVal === '1' || rawVal === '') {
          options.all = true;
        }
        break;
      }
      case 'indent':
      case 'indentation':
      case 'pad':
      case 'padding': {
        // Can be a simple number e.g. "5" or positional like "5:2:4" or "5:2"
        if (rawVal.includes(':')) {
          const parts = rawVal.split(':').map((p) => parseInt(p.trim(), 10));
          if (!isNaN(parts[0])) options.indent = parts[0];
          if (parts.length > 1 && !isNaN(parts[1])) options.from = parts[1];
          if (parts.length > 2 && !isNaN(parts[2])) options.to = parts[2];
        } else {
          const num = parseInt(rawVal, 10);
          if (!isNaN(num)) options.indent = num;
        }
        break;
      }
      case 'default':
      case 'fallback':
      case 'empty': {
        options.fallback = rawVal.replace(/^['"]|['"]$/g, '');
        break;
      }
      case 'skipdata':
      case 'skip_data':
      case 'skip':
      case 'ignore':
      case 'exclude': {
        options.skipData = rawVal;
        break;
      }
      case 'removeline':
      case 'remove_line':
      case 'removelines':
      case 'deleteline': {
        options.removeLine = rawVal;
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
  let normalized = tokenContent
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&nbsp;/gi, ' ')
    .replace(/-\s*[\r\n]+\s*/g, '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 0. Auto-heal mangled online token strings containing injected HTML attributes or tags
  // e.g. 'detail-mis " data-token="" data-token-key="" ... ">| indent: 5' or 'detail-mis" style="color: ...">'
  if (/(?:data-token|style\s*=|class\s*=|data-category|scrollbar-color|data-token-key|data-display|data-label)/i.test(normalized)) {
    const baseKeyMatch = normalized.match(/^([a-zA-Z0-9_\-\.]+)/);
    const indentMatch = normalized.match(/\bindent\s*:\s*(\d+(?:,\s*from:\s*\d+)?(?:,\s*to:\s*\d+)?)/i);
    const directionMatch = normalized.match(/\b(direction|dir|order|flow|separator|sep|prefix|limit|from|to)\s*:\s*([^,>|"]+)/gi);

    // Check if there is trailing directive syntax after quotes/tags e.g. >| indent: 5 or | indent: 5
    const trailingMatch = normalized.match(/[>"']\s*(?:\||>|&gt;)?\s*([^"'>]+)$/);

    const recoveredParts: string[] = [];
    if (trailingMatch && trailingMatch[1].trim()) {
      const part = trailingMatch[1].replace(/^[|>]+/, '').trim();
      if (part) recoveredParts.push(part);
    }
    if (indentMatch && !recoveredParts.some((p) => p.toLowerCase().includes('indent'))) {
      recoveredParts.push(`indent: ${indentMatch[1]}`);
    }
    if (directionMatch) {
      directionMatch.forEach((dm) => {
        if (!recoveredParts.some((p) => p.toLowerCase().includes(dm.toLowerCase()))) {
          recoveredParts.push(dm);
        }
      });
    }

    if (baseKeyMatch) {
      const cleanKey = baseKeyMatch[1];
      if (recoveredParts.length === 0) {
        if (cleanKey === 'juz-page' || cleanKey === 'juz_page') {
          recoveredParts.push('indent: 11');
        } else if (cleanKey === 'detail-mis' || cleanKey === 'detail_mis' || cleanKey === 'detail-stuck' || cleanKey === 'detail_stuck') {
          recoveredParts.push('indent: 5');
        }
      }
      normalized = cleanKey + (recoveredParts.length > 0 ? ` | ${recoveredParts.join(' | ')}` : '');
    }
  }

  // 1. Check for legacy `<...>` directive syntax: {{key <direction: vertical, order: desc>}} or {{key <| indent: 5>}} or {{key < | indent: 11>}}
  const directiveMatch = normalized.match(/^(.*?)\s*(?:&lt;|<)\s*(?:\|\s*)?([\s\S]*?)(?:&gt;|>)\s*$/);
  if (directiveMatch) {
    const rawKeyPart = directiveMatch[1].trim();
    let rawDirective = directiveMatch[2].trim();
    if (rawDirective.startsWith('|')) {
      rawDirective = rawDirective.slice(1).trim();
    }

    const pipeParts = rawKeyPart.split('|').map((p) => p.trim()).filter(Boolean);
    const baseKey = (pipeParts[0] || '').replace(/[\s]/g, '');
    const legacyFilterSpecs = pipeParts.slice(1);

    const options = parseKeyValuePairs(rawDirective);

    // If directive is indent (e.g. <| indent: 5> or <indent: 5> or < | indent: 11>), also add to legacyFilterSpecs for standard filter processing
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

  // 2. Pure Directive expressions: e.g. '| indent: 5' or 'indent: 5' or '| skipData: "..."'
  const isPureDirective =
    normalized.startsWith('|') ||
    normalized.startsWith('<') ||
    (/\b(direction|dir|layout|orient|orientation|separator|sep|order|flow|prefix|list|gap|limit|from|to|skipdata|skip|skip_data|removeline|remove_line|indent|default|fallback|empty)\s*:/i.test(
      normalized
    ) &&
      !normalized.includes('|'));

  if (isPureDirective) {
    const directiveStr = normalized.replace(/^[|<]+/, '').replace(/[>]+$/, '').trim();
    const options = parseKeyValuePairs(directiveStr);
    const legacyFilterSpecs: string[] = [];
    if (options.indent !== undefined) {
      let indentSpec = `indent: ${options.indent}`;
      const fromVal = options.fromLine !== undefined ? options.fromLine : options.from;
      if (fromVal !== undefined) indentSpec += `, from: ${fromVal}`;
      const toVal = options.toLine !== undefined ? options.toLine : options.to;
      if (toVal !== undefined) indentSpec += `, to: ${toVal}`;
      if (options.all) indentSpec += `, all: true`;
      legacyFilterSpecs.push(indentSpec);
    }
    return {
      rawToken: normalized,
      baseKey: '',
      options,
      hasDirective: Object.keys(options).length > 0,
      legacyFilterSpecs,
    };
  }

  // 3. Standard unified pipe syntax: {{key | direction: vertical, separator: ', ' | indent: 5 | uppercase}}
  const pipeParts = normalized.split('|').map((p) => p.trim()).filter(Boolean);
  const baseKey = (pipeParts[0] || '').replace(/[\s]/g, '');
  const remainingParts = pipeParts.slice(1);

  const options: TokenDirectiveOptions = {};
  let hasDirective = false;
  const legacyFilterSpecs: string[] = [];

  remainingParts.forEach((part) => {
    // Check if this pipe part contains layout/direction keywords
    const isDirectivePart = /\b(direction|dir|layout|orient|orientation|separator|sep|delimiter|delim|order|flow|sort|prefix|list|gap|spacing|limit|count|max|from|to|skipdata|skip|skip_data|removeline|remove_line|deleteline|indent|default|fallback|empty)\s*:/i.test(part);
    if (isDirectivePart) {
      hasDirective = true;
      const parsedOpts = parseKeyValuePairs(part);
      Object.assign(options, parsedOpts);
      if (parsedOpts.indent !== undefined && !legacyFilterSpecs.some((f) => f.toLowerCase().startsWith('indent'))) {
        let indentSpec = `indent: ${parsedOpts.indent}`;
        const fromVal = parsedOpts.fromLine !== undefined ? parsedOpts.fromLine : parsedOpts.from;
        if (fromVal !== undefined) indentSpec += `, from: ${fromVal}`;
        const toVal = parsedOpts.toLine !== undefined ? parsedOpts.toLine : parsedOpts.to;
        if (toVal !== undefined) indentSpec += `, to: ${toVal}`;
        if (parsedOpts.all) indentSpec += `, all: true`;
        legacyFilterSpecs.push(indentSpec);
      }
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

export interface RemoveLineRule {
  beforeCount: number;
  afterCount: number;
}

/**
 * Parses removeLine arguments:
 * - 'b' or 'b1' -> Before 1 line
 * - 'a' or 'a1' -> After 1 line
 * - 'b1-5' -> Before 1 to 5 lines
 * - 'a1-5' -> After 1 to 5 lines
 * - 'bN' -> Before N lines
 * - 'aN' -> After N lines
 */
export function parseRemoveLineSpec(spec: string): RemoveLineRule {
  const result: RemoveLineRule = { beforeCount: 0, afterCount: 0 };
  if (!spec) return result;

  const clean = spec.toLowerCase().trim();
  if (['self', 'current', 'none', '0', 'only', 'this', 'line'].includes(clean)) {
    return result;
  }

  // 1. Before pattern: b, b1, b1-5, b5, before 1-5, before 1, etc.
  const bRange = clean.match(/\bb(?:efore)?\s*(?:1\s*-\s*|\s*-\s*)(\d+)/);
  if (bRange) {
    result.beforeCount = parseInt(bRange[1], 10) || 1;
  } else {
    const bNum = clean.match(/\bb(?:efore)?\s*(\d+)/);
    if (bNum) {
      result.beforeCount = parseInt(bNum[1], 10) || 1;
    } else if (/\bb(?:efore)?\b/.test(clean)) {
      result.beforeCount = 1;
    }
  }

  // 2. After pattern: a, a1, a1-5, a5, after 1-5, after 1, etc.
  const aRange = clean.match(/\ba(?:fter)?\s*(?:1\s*-\s*|\s*-\s*)(\d+)/);
  if (aRange) {
    result.afterCount = parseInt(aRange[1], 10) || 1;
  } else {
    const aNum = clean.match(/\ba(?:fter)?\s*(\d+)/);
    if (aNum) {
      result.afterCount = parseInt(aNum[1], 10) || 1;
    } else if (/\ba(?:fter)?\b/.test(clean)) {
      result.afterCount = 1;
    }
  }

  return result;
}

/**
 * Scans an array of data lines / multi-value items.
 * If an item matches skipTarget, it skips that item and removes adjacent lines as configured.
 */
export function applySkipDataAndRemoveLines(
  lines: string[],
  skipTarget: string,
  removeLineSpec?: string
): string[] {
  if (!lines || lines.length === 0 || !skipTarget) return lines;

  const target = skipTarget.trim().toLowerCase();
  if (!target) return lines;

  const { beforeCount, afterCount } = parseRemoveLineSpec(removeLineSpec || '');
  const dropIndices = new Set<number>();

  lines.forEach((line, idx) => {
    const cleanText = line.replace(/<[^>]*>/g, '').trim().toLowerCase();
    const isMatch = cleanText === target || cleanText.includes(target);

    if (isMatch) {
      dropIndices.add(idx);

      if (beforeCount > 0) {
        for (let i = 1; i <= beforeCount; i++) {
          const targetIdx = idx - i;
          if (targetIdx >= 0) dropIndices.add(targetIdx);
        }
      }

      if (afterCount > 0) {
        for (let i = 1; i <= afterCount; i++) {
          const targetIdx = idx + i;
          if (targetIdx < lines.length) dropIndices.add(targetIdx);
        }
      }
    }
  });

  return lines.filter((_, idx) => !dropIndices.has(idx));
}

/**
 * Scans a document HTML string or text template for tokens configured with `skipData` and optional `removeLine`.
 * When a token's evaluated data matches its `skipData` condition:
 * - The line/block containing the token is removed.
 * - If `removeLine` specifies beforeCount (e.g. `b`, `b1`, `b3`), preceding lines/blocks are removed.
 * - If `removeLine` specifies afterCount (e.g. `a`, `a1`, `a2`), succeeding lines/blocks are removed.
 *
 * Supports all document formats:
 * 1. Block elements: `<p>`, `<div>`, `<li>`, `<tr>`, `<h1-6>`
 * 2. Nested `<br>` lines within blocks
 * 3. Flat HTML separated by `<br>` or `<br/>`
 * 4. Plain text lines separated by `\r?\n`
 */
export function applyDocumentSkipAndRemoveLines(
  html: string,
  dataLookup: Map<string, any> | Record<string, any>
): string {
  if (!html || typeof html !== 'string' || !html.includes('{{')) {
    return html;
  }

  const getVal = (key: string): any => {
    if (!key) return undefined;
    const cleanKey = key.trim();
    const norm = cleanKey.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (dataLookup instanceof Map) {
      if (dataLookup.has(norm)) return dataLookup.get(norm);
      if (dataLookup.has(cleanKey.toLowerCase())) return dataLookup.get(cleanKey.toLowerCase());
      if (dataLookup.has(cleanKey)) return dataLookup.get(cleanKey);
      for (const [k, v] of dataLookup.entries()) {
        if (k.toLowerCase().replace(/[^a-z0-9]/g, '') === norm) return v;
      }
      return undefined;
    }

    if (dataLookup && typeof dataLookup === 'object') {
      if (dataLookup[cleanKey] !== undefined) return dataLookup[cleanKey];
      if (dataLookup[cleanKey.toLowerCase()] !== undefined) return dataLookup[cleanKey.toLowerCase()];
      if (dataLookup[norm] !== undefined) return dataLookup[norm];
      for (const k of Object.keys(dataLookup)) {
        if (k.toLowerCase().replace(/[^a-z0-9]/g, '') === norm) return dataLookup[k];
      }
    }
    return undefined;
  };

  const tokenRegex = /\{\{([\s\S]*?)\}\}/g;
  let match: RegExpExecArray | null;
  const activeRules: Array<{
    fullToken: string;
    beforeCount: number;
    afterCount: number;
  }> = [];

  while ((match = tokenRegex.exec(html)) !== null) {
    const fullMatch = match[0];
    const innerToken = match[1].trim();
    const directive = parseTokenDirective(innerToken);

    const hasSkip = Boolean(directive.options.skipData);
    const hasRemoveLine = Boolean(directive.options.removeLine);

    if (hasSkip || hasRemoveLine) {
      const val = getVal(directive.baseKey);
      const target = (directive.options.skipData || 'empty').trim().toLowerCase();
      const cleanVal = val !== undefined && val !== null ? String(val).replace(/<[^>]*>/g, '').trim().toLowerCase() : '';

      let isMatch = false;
      if (['empty', 'blank', 'null', '""', "''"].includes(target)) {
        isMatch = cleanVal === '' || val === undefined || val === null;
      } else if (target === '*' || target === 'all' || target === 'any') {
        isMatch = true;
      } else if (target === 'self' || target === 'this' || target === 'line') {
        isMatch = true;
      } else if (val !== undefined && val !== null) {
        isMatch = cleanVal === target || (cleanVal.length > 0 && cleanVal.includes(target));
      }

      if (isMatch) {
        const { beforeCount, afterCount } = parseRemoveLineSpec(directive.options.removeLine || 'self');
        activeRules.push({
          fullToken: fullMatch,
          beforeCount,
          afterCount,
        });
      }
    }
  }

  if (activeRules.length === 0) {
    return html;
  }

  let result = html;

  for (const rule of activeRules) {
    const { fullToken, beforeCount, afterCount } = rule;
    if (!result.includes(fullToken)) continue;

    // Strategy 1: Table rows <tr>...</tr>
    if (/<tr\b/i.test(result)) {
      const trPattern = /(<tr\b[^>]*>[\s\S]*?<\/tr>)/gi;
      const parts = result.split(trPattern);
      const allTrs: number[] = [];
      const matchingTrs: number[] = [];

      parts.forEach((p, idx) => {
        if (/^<tr\b/i.test(p)) {
          allTrs.push(idx);
          if (p.includes(fullToken)) {
            matchingTrs.push(idx);
          }
        }
      });

      if (matchingTrs.length > 0) {
        const dropIndices = new Set<number>();
        matchingTrs.forEach((trIdx) => {
          const posInTrs = allTrs.indexOf(trIdx);
          dropIndices.add(trIdx);
          for (let b = 1; b <= beforeCount; b++) {
            if (posInTrs - b >= 0) dropIndices.add(allTrs[posInTrs - b]);
          }
          for (let a = 1; a <= afterCount; a++) {
            if (posInTrs + a < allTrs.length) dropIndices.add(allTrs[posInTrs + a]);
          }
        });
        result = parts.filter((_, idx) => !dropIndices.has(idx)).join('');
        continue;
      }
    }

    // Strategy 2: Block elements: <p>, <div>, <li>, <h1-6>
    const blockPattern = /(<(?:p|div|li|h[1-6])\b[^>]*>[\s\S]*?<\/(?:p|div|li|h[1-6])>)/gi;
    const parts = result.split(blockPattern);
    const allBlocks: number[] = [];
    const matchingBlocks: number[] = [];

    parts.forEach((p, idx) => {
      if (/^<(?:p|div|li|h[1-6])\b/i.test(p)) {
        allBlocks.push(idx);
        if (p.includes(fullToken)) {
          matchingBlocks.push(idx);
        }
      }
    });

    if (matchingBlocks.length > 0) {
      let handledByInnerBr = false;

      for (const blkIdx of matchingBlocks) {
        const blkContent = parts[blkIdx];
        if (/<br\s*\/?>/i.test(blkContent)) {
          const openMatch = blkContent.match(/^(<(?:p|div|li|h[1-6])\b[^>]*>)/i);
          const closeMatch = blkContent.match(/(<\/(?:p|div|li|h[1-6])>)$/i);
          if (openMatch && closeMatch) {
            const openTag = openMatch[1];
            const closeTag = closeMatch[1];
            const inner = blkContent.slice(openTag.length, -closeTag.length);

            const segments = inner.split(/(<br\s*\/?>)/gi);
            const lineUnits: string[] = [];
            let curr = '';
            for (const seg of segments) {
              if (/^<br\s*\/?>$/i.test(seg)) {
                lineUnits.push(curr);
                curr = '';
              } else {
                curr += seg;
              }
            }
            if (curr || lineUnits.length > 0) {
              lineUnits.push(curr);
            }

            const matchingUnits = lineUnits
              .map((u, i) => (u.includes(fullToken) ? i : -1))
              .filter((i) => i >= 0);

            if (matchingUnits.length > 0) {
              const dropUnits = new Set<number>();
              matchingUnits.forEach((mu) => {
                dropUnits.add(mu);
                for (let b = 1; b <= beforeCount; b++) {
                  if (mu - b >= 0) dropUnits.add(mu - b);
                }
                for (let a = 1; a <= afterCount; a++) {
                  if (mu + a < lineUnits.length) dropUnits.add(mu + a);
                }
              });

              const surviving = lineUnits.filter((_, i) => !dropUnits.has(i));
              parts[blkIdx] = surviving.length > 0 ? `${openTag}${surviving.join('<br>')}${closeTag}` : '';
              handledByInnerBr = true;
            }
          }
        }
      }

      if (handledByInnerBr) {
        result = parts.join('');
        continue;
      }

      const dropBlocks = new Set<number>();
      matchingBlocks.forEach((blkIdx) => {
        const posInBlocks = allBlocks.indexOf(blkIdx);
        dropBlocks.add(blkIdx);
        for (let b = 1; b <= beforeCount; b++) {
          if (posInBlocks - b >= 0) dropBlocks.add(allBlocks[posInBlocks - b]);
        }
        for (let a = 1; a <= afterCount; a++) {
          if (posInBlocks + a < allBlocks.length) dropBlocks.add(allBlocks[posInBlocks + a]);
        }
      });

      result = parts.filter((_, idx) => !dropBlocks.has(idx)).join('');
      continue;
    }

    // Strategy 3: Loose lines separated by <br> in HTML
    if (/<br\s*\/?>/i.test(result)) {
      const segments = result.split(/(<br\s*\/?>)/gi);
      const lineUnits: string[] = [];
      let curr = '';
      for (const seg of segments) {
        if (/^<br\s*\/?>$/i.test(seg)) {
          lineUnits.push(curr);
          curr = '';
        } else {
          curr += seg;
        }
      }
      if (curr || lineUnits.length > 0) lineUnits.push(curr);

      const matchingUnits = lineUnits
        .map((u, i) => (u.includes(fullToken) ? i : -1))
        .filter((i) => i >= 0);

      if (matchingUnits.length > 0) {
        const dropUnits = new Set<number>();
        matchingUnits.forEach((mu) => {
          dropUnits.add(mu);
          for (let b = 1; b <= beforeCount; b++) {
            if (mu - b >= 0) dropUnits.add(mu - b);
          }
          for (let a = 1; a <= afterCount; a++) {
            if (mu + a < lineUnits.length) dropUnits.add(mu + a);
          }
        });

        const surviving = lineUnits.filter((_, i) => !dropUnits.has(i));
        result = surviving.join('<br>');
        continue;
      }
    }

    // Strategy 4: Raw text lines separated by \n
    const lines = result.split(/\r?\n/);
    const matchingLines = lines
      .map((l, i) => (l.includes(fullToken) ? i : -1))
      .filter((i) => i >= 0);

    if (matchingLines.length > 0) {
      const dropLines = new Set<number>();
      matchingLines.forEach((ml) => {
        dropLines.add(ml);
        for (let b = 1; b <= beforeCount; b++) {
          if (ml - b >= 0) dropLines.add(ml - b);
        }
        for (let a = 1; a <= afterCount; a++) {
          if (ml + a < lines.length) dropLines.add(ml + a);
        }
      });

      const surviving = lines.filter((_, i) => !dropLines.has(i));
      result = surviving.join('\n');
    }
  }

  return result;
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

  // 1b. Apply Skip Data and Line Removal condition
  if (options.skipData) {
    items = applySkipDataAndRemoveLines(items, options.skipData, options.removeLine);
  }

  if (items.length === 0) {
    return options.fallback !== undefined ? options.fallback : '';
  }

  // 2. Apply Ordering (asc vs desc / reverse / bottom-to-top)
  if (options.order === 'desc') {
    items = [...items].reverse();
  }

  // 3. Apply Range Filtering (from, to, limit)
  // When options.indent is active, options.from and options.to denote indentation boundaries (fromLine, toLine), NOT item array slicing.
  const hasIndent = options.indent !== undefined && options.indent > 0;
  if (!hasIndent) {
    if (options.from !== undefined && options.from > 0) {
      const startIdx = Math.max(0, options.from - 1);
      const endIdx = options.to !== undefined && options.to >= options.from ? options.to : items.length;
      items = items.slice(startIdx, endIdx);
    } else if (options.to !== undefined && options.to > 0) {
      items = items.slice(0, options.to);
    }
  } else {
    // If explicit sliceFrom / sliceTo is provided alongside indent
    if (options.sliceFrom !== undefined && options.sliceFrom > 0) {
      const startIdx = Math.max(0, options.sliceFrom - 1);
      const endIdx = options.sliceTo !== undefined && options.sliceTo >= options.sliceFrom ? options.sliceTo : items.length;
      items = items.slice(startIdx, endIdx);
    } else if (options.sliceTo !== undefined && options.sliceTo > 0) {
      items = items.slice(0, options.sliceTo);
    }
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
  // Multi-line continuation / hanging indent standard:
  // By default, indentation starts from line 2 (fromLine = 2) so line 1 aligns flush with the template label prefix.
  // Explicit `all: true`, `force: true`, or `from: 1` indents all lines including line 1.
  const indentCount = options.indent && options.indent > 0 ? options.indent : 0;
  const spaceChar = mode === 'html' ? '&nbsp;' : ' ';
  const indentStr = indentCount > 0 ? spaceChar.repeat(indentCount) : '';

  const forceAllLines = options.all === true || options.force === true || options.from === 1 || options.fromLine === 1;
  const effectiveFrom = forceAllLines
    ? 1
    : (options.fromLine !== undefined ? options.fromLine : (options.from !== undefined ? options.from : 2));
  const effectiveTo = options.toLine !== undefined && options.toLine > 0
    ? options.toLine
    : (options.to !== undefined && options.to > 0 ? options.to : Infinity);

  const applyLineIndent = (lines: string[]): string[] => {
    if (!indentStr) return lines;
    return lines.map((line, idx) => {
      const lineNum = idx + 1; // 1-indexed
      if (lineNum >= effectiveFrom && lineNum <= effectiveTo) {
        return `${indentStr}${line}`;
      }
      return line;
    });
  };

  // 6. Apply Direction & Separator Layout
  const isMultiLineInput = typeof rawValue === 'string' && (rawValue.includes('\n') || /<br\s*\/?>/i.test(rawValue));
  const direction = options.direction || (isMultiLineInput && !options.separator ? 'vertical' : 'horizontal');
  const sep = options.separator !== undefined ? String(options.separator).trim().toLowerCase() : '';

  // 6a. Table Cell Flow (Populate consecutive table cells / rows)
  if (sep === 'cell' || sep === 'table-cell' || sep === 'next-cell' || sep === 'td') {
    const indentedLines = applyLineIndent(items);
    if (direction === 'vertical') {
      return mode === 'html' ? indentedLines.join('<!-- spr-row-cell-split -->') : indentedLines.join('\n');
    } else {
      return mode === 'html' ? indentedLines.join('<!-- spr-cell-split -->') : indentedLines.join('\t');
    }
  }

  if (direction === 'vertical') {
    // Line breaks with optional extra spacing / gap
    const gap = options.gap && options.gap > 0 ? options.gap : 0;
    const baseBreak = mode === 'html' ? '<br>' : '\n';
    const lineBreak = baseBreak.repeat(1 + gap);

    const indentedLines = applyLineIndent(items);
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
    return (indentStr && effectiveFrom <= 1) ? `${indentStr}${joined}` : joined;
  }
}

export interface FormattedDirectiveInsertion {
  textToInsert: string;
  replaceCharsBefore: number;
  replaceCharsAfter: number;
  isTokenUpdate: boolean;
  updatedFullToken?: string;
}

/**
 * Serializes structured TokenDirectiveOptions into standard HTML-safe pipe syntax.
 */
export function serializeDirectiveOptions(options: TokenDirectiveOptions): string {
  const parts: string[] = [];

  if (options.direction) {
    parts.push(`direction: ${options.direction}`);
  }
  if (options.separator) {
    if (['cell', 'newline', 'comma', 'tab'].includes(options.separator)) {
      parts.push(`separator: ${options.separator}`);
    } else if (options.separator === ', ') {
      parts.push(`separator: ', '`);
    } else {
      parts.push(`separator: "${options.separator}"`);
    }
  }
  if (options.order && options.order === 'desc') {
    parts.push(`order: ${options.order}`);
  }
  if (options.prefix && options.prefix !== 'none') {
    parts.push(`prefix: ${options.prefix}`);
  }
  if (options.indent && options.indent > 0) {
    let indentSpec = `indent: ${options.indent}`;
    const fromLine = options.fromLine !== undefined ? options.fromLine : options.from;
    if (fromLine !== undefined && fromLine > 1) {
      indentSpec += `, from: ${fromLine}`;
    }
    const toLine = options.toLine !== undefined ? options.toLine : options.to;
    if (toLine !== undefined && toLine > 0) {
      indentSpec += `, to: ${toLine}`;
    }
    parts.push(indentSpec);
  }
  if (options.limit && options.limit > 0) {
    parts.push(`limit: ${options.limit}`);
  }
  if (options.skipData) {
    parts.push(`skipData: "${options.skipData}"`);
  }
  if (options.removeLine) {
    parts.push(`removeLine: ${options.removeLine}`);
  }
  const fallbackVal = options.fallback !== undefined ? options.fallback : (options as any).default;
  if (fallbackVal !== undefined && fallbackVal !== null) {
    parts.push(`default: "${fallbackVal}"`);
  }

  return parts.join(', ');
}

/**
 * Intelligent directive insertion & in-place update formatter.
 *
 * Examines the active token context around the caret:
 * 1. If an active token is identified (inside `{{...}}` or in a token input field):
 *    - Parses existing directives vs incoming directives.
 *    - If any directive key/domain (e.g. `direction`, `indent`, `skipData`, `default`) was ALREADY USED,
 *      it UPDATES that directive in-place with new values instead of creating duplicate keys!
 *    - Preserves all other non-conflicting existing directives cleanly.
 *    - Automatically handles clean comma chaining when appending fresh directive types.
 * 2. If NO active token scope is present:
 *    - Inserts with the standard leading pipe (' | ' or '| ') as a fresh directive.
 */
export function formatDirectiveForInsertion(
  beforeText: string,
  rawDirective: string,
  afterText: string = ''
): FormattedDirectiveInsertion {
  const isDirective = rawDirective.startsWith('|') || rawDirective.startsWith('<');
  if (!isDirective) {
    return {
      textToInsert: rawDirective,
      replaceCharsBefore: 0,
      replaceCharsAfter: 0,
      isTokenUpdate: false,
    };
  }

  // Extract clean directive content (strip leading '|', '<', and trailing '>')
  const directiveBody = rawDirective
    .replace(/^[|<]\s*/, '')
    .replace(/[>]$/, '')
    .trim();

  const incomingParsed = parseTokenDirective(rawDirective);
  const incomingOpts = incomingParsed.options;

  // Determine if caret is inside mustache brackets {{ ... }}
  const lastOpenBrace = beforeText.lastIndexOf('{{');
  const lastCloseBrace = beforeText.lastIndexOf('}}');
  const isInsideMustache =
    lastOpenBrace !== -1 && (lastCloseBrace === -1 || lastOpenBrace > lastCloseBrace);

  let fullTokenText = '';
  let replaceCharsBefore = 0;
  let replaceCharsAfter = 0;
  let isTokenScopeFound = false;

  if (isInsideMustache) {
    const tokenBefore = beforeText.slice(lastOpenBrace + 2);
    const afterCloseBrace = afterText ? afterText.indexOf('}}') : -1;
    const tokenAfter = afterCloseBrace !== -1 ? afterText.slice(0, afterCloseBrace) : afterText;

    fullTokenText = `${tokenBefore}${tokenAfter}`.trim();
    replaceCharsBefore = tokenBefore.length;
    replaceCharsAfter = afterCloseBrace !== -1 ? afterCloseBrace : 0;
    isTokenScopeFound = true;
  } else {
    // Check if whole beforeText/afterText represents a token in a raw input (e.g. TokenInspectorPopover)
    const combined = `${beforeText}${afterText}`.trim();
    const hasPipe = combined.includes('|');
    const isSingleTokenKey = /^[a-zA-Z0-9_\-\.]+$/.test(combined);

    if (hasPipe || isSingleTokenKey) {
      fullTokenText = combined;
      replaceCharsBefore = beforeText.length;
      replaceCharsAfter = afterText.length;
      isTokenScopeFound = true;
    }
  }

  if (isTokenScopeFound && fullTokenText) {
    const existingParsed = parseTokenDirective(fullTokenText);
    const existingOpts = existingParsed.options;

    // Check if any directive domain in incomingOpts was already used in existingOpts
    const hasDirectionConflict =
      incomingOpts.direction !== undefined &&
      (existingOpts.direction !== undefined ||
        existingOpts.order !== undefined ||
        existingOpts.separator !== undefined ||
        existingOpts.prefix !== undefined ||
        existingOpts.limit !== undefined);

    const hasIndentConflict =
      incomingOpts.indent !== undefined && existingOpts.indent !== undefined;

    const hasSkipConflict =
      incomingOpts.skipData !== undefined &&
      (existingOpts.skipData !== undefined || existingOpts.removeLine !== undefined);

    const hasFallbackConflict =
      (incomingOpts.fallback !== undefined || (incomingOpts as any).default !== undefined) &&
      (existingOpts.fallback !== undefined || (existingOpts as any).default !== undefined);

    const isUsed =
      hasDirectionConflict || hasIndentConflict || hasSkipConflict || hasFallbackConflict;

    if (isUsed) {
      // In-place update of the already used directive!
      const mergedOpts: TokenDirectiveOptions = {
        ...existingOpts,
      };

      if (incomingOpts.direction !== undefined) {
        mergedOpts.direction = incomingOpts.direction;
        if (incomingOpts.separator !== undefined) mergedOpts.separator = incomingOpts.separator;
        if (incomingOpts.order !== undefined) mergedOpts.order = incomingOpts.order;
        if (incomingOpts.prefix !== undefined) mergedOpts.prefix = incomingOpts.prefix;
        if (incomingOpts.limit !== undefined) mergedOpts.limit = incomingOpts.limit;
      }

      if (incomingOpts.indent !== undefined) {
        mergedOpts.indent = incomingOpts.indent;
        if (incomingOpts.fromLine !== undefined || incomingOpts.from !== undefined) {
          mergedOpts.fromLine = incomingOpts.fromLine ?? incomingOpts.from;
        } else {
          delete mergedOpts.fromLine;
          delete mergedOpts.from;
        }
        if (incomingOpts.toLine !== undefined || incomingOpts.to !== undefined) {
          mergedOpts.toLine = incomingOpts.toLine ?? incomingOpts.to;
        } else {
          delete mergedOpts.toLine;
          delete mergedOpts.to;
        }
      }

      if (incomingOpts.skipData !== undefined) {
        mergedOpts.skipData = incomingOpts.skipData;
        if (incomingOpts.removeLine !== undefined) {
          mergedOpts.removeLine = incomingOpts.removeLine;
        }
      }

      const incomingFallback = incomingOpts.fallback !== undefined ? incomingOpts.fallback : (incomingOpts as any).default;
      if (incomingFallback !== undefined) {
        mergedOpts.fallback = incomingFallback;
      }

      const directiveStr = serializeDirectiveOptions(mergedOpts);
      const baseKey = existingParsed.baseKey || '';
      const updatedFullToken = baseKey
        ? (directiveStr ? `${baseKey} | ${directiveStr}` : baseKey)
        : (directiveStr ? `| ${directiveStr}` : '');

      return {
        textToInsert: updatedFullToken,
        replaceCharsBefore,
        replaceCharsAfter,
        isTokenUpdate: true,
        updatedFullToken,
      };
    }
  }

  // Fallback for caret in text where no active token scope was detected:
  // Standard pipe insertion or chaining based on beforeText:
  const tokenContext = isInsideMustache ? beforeText.slice(lastOpenBrace + 2) : beforeText;
  const pipeIndex = tokenContext.lastIndexOf('|');
  const hasPipe = pipeIndex !== -1;

  if (hasPipe) {
    const afterPipe = tokenContext.slice(pipeIndex + 1);
    const hasExistingDirectiveAfterPipe = afterPipe.trim().length > 0;

    if (hasExistingDirectiveAfterPipe) {
      if (beforeText.endsWith(', ') || beforeText.endsWith(',')) {
        const needsSpace = beforeText.endsWith(',') && !beforeText.endsWith(', ');
        return {
          textToInsert: needsSpace ? ` ${directiveBody}` : directiveBody,
          replaceCharsBefore: 0,
          replaceCharsAfter: 0,
          isTokenUpdate: false,
        };
      }

      if (beforeText.endsWith(' ')) {
        let trailingSpaceCount = 0;
        for (let i = beforeText.length - 1; i >= 0 && beforeText[i] === ' '; i--) {
          trailingSpaceCount++;
        }
        return {
          textToInsert: `, ${directiveBody}`,
          replaceCharsBefore: trailingSpaceCount,
          replaceCharsAfter: 0,
          isTokenUpdate: false,
        };
      }

      return {
        textToInsert: `, ${directiveBody}`,
        replaceCharsBefore: 0,
        replaceCharsAfter: 0,
        isTokenUpdate: false,
      };
    } else {
      if (beforeText.endsWith(' ')) {
        return {
          textToInsert: directiveBody,
          replaceCharsBefore: 0,
          replaceCharsAfter: 0,
          isTokenUpdate: false,
        };
      } else {
        return {
          textToInsert: ` ${directiveBody}`,
          replaceCharsBefore: 0,
          replaceCharsAfter: 0,
          isTokenUpdate: false,
        };
      }
    }
  }

  if (beforeText.endsWith(' ')) {
    return {
      textToInsert: `| ${directiveBody}`,
      replaceCharsBefore: 0,
      replaceCharsAfter: 0,
      isTokenUpdate: false,
    };
  }

  return {
    textToInsert: ` | ${directiveBody}`,
    replaceCharsBefore: 0,
    replaceCharsAfter: 0,
    isTokenUpdate: false,
  };
}


