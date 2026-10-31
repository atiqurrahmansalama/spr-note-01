import {
  parseTokenDirective,
  formatMultiValueData,
  applySkipDataAndRemoveLines,
  applyDocumentSkipAndRemoveLines,
} from './docLabDirectiveEngine';
import {
  UNIVERSAL_SYNONYM_GROUPS,
  PURE_METADATA_KEYS,
  getSynonymsForKey,
  areKeysSynonyms,
} from './keyLibrary/tokenSynonyms';

export interface TemplatePlaceholderKey {
  key: string;
  label: string;
  category?: 'student' | 'examination' | 'institution' | 'academic' | 'general' | 'custom' | string;
  sampleValue?: string;
  description?: string;
  isCustom?: boolean;
}

/**
 * Parses arguments of an indent directive like ": 5, from: 2, to: 4" or ": 5, from: 3" or ": 5"
 * Returns a standardized filter specification string, e.g. "indent: 5, from: 2, to: 4"
 */
export function parseIndentDirectiveArgs(rawInner: string): string {
  let clean = (rawInner || '').replace(/^[:\s]+/, '').trim();
  clean = clean.replace(/&(?:gt|lt);?/gi, '').replace(/[<>]/g, '').trim();
  if (!clean) return 'indent: 5';

  const spaceMatch = clean.match(/^(\d+)/);
  const fromMatch = clean.match(/\bfrom:\s*(\d+)/i);
  const toMatch = clean.match(/\bto:\s*(\d+)/i);

  const spaces = spaceMatch ? parseInt(spaceMatch[1], 10) : 5;
  const from = fromMatch ? parseInt(fromMatch[1], 10) : null;
  const to = toMatch ? parseInt(toMatch[1], 10) : null;

  let spec = `indent: ${spaces}`;
  if (from !== null) spec += `, from: ${from}`;
  if (to !== null) spec += `, to: ${to}`;
  return spec;
}

/**
 * Normalizes both Direction and Indent directive syntax (e.g. <direction: vertical>, <| indent: 11>, <indent: 11>)
 * into standard, HTML-safe unified Pipe Syntax (e.g. {{key | direction: vertical}}, {{key | indent: 11}}).
 */
export function normalizeIndentDirectives(html: string): string {
  if (!html) return '';

  let res = html;

  // 0. Auto-repair mangled tokens containing injected HTML attributes (e.g. {{key " data-token=... >| indent: 5}} or {{key" data-token=... >}})
  res = res.replace(
    /\{\{\s*([a-zA-Z0-9_\-\.]+)(?:[^\s|}][^"']*)?["'\s]+(?:data-token|data-key|data-token-key|data-display|data-label|data-category|data-source|style|class|scrollbar-color)[^}]*\}\}/gi,
    (match, rawKey) => {
      const cleanKey = rawKey.trim();
      // Recover specific embedded indent directives if present
      const indentMatch = match.match(/\bindent\s*:\s*(\d+(?:,\s*from:\s*\d+)?(?:,\s*to:\s*\d+)?)/i);
      if (indentMatch) {
        return `{{${cleanKey} | indent: ${indentMatch[1]}}}`;
      }
      const dirMatch = match.match(/\bdirection\s*:\s*([a-z]+)/i);
      if (dirMatch) {
        return `{{${cleanKey} | direction: ${dirMatch[1]}}}`;
      }
      if (cleanKey === 'juz-page' || cleanKey === 'juz_page') {
        return `{{${cleanKey} | indent: 11}}`;
      }
      if (cleanKey === 'detail-mis' || cleanKey === 'detail_mis' || cleanKey === 'detail-stuck' || cleanKey === 'detail_stuck') {
        return `{{${cleanKey} | indent: 5}}`;
      }
      return `{{${cleanKey}}}`;
    }
  );

  // 1. Direction and Layout Directives:
  // e.g. {{key <direction: vertical, ...>}} or {{key < | direction: ...>}} -> {{key | direction: ...}}
  res = res.replace(
    /\{\{([a-zA-Z0-9_\-\.\s|]+?)\s*(?:&lt;|<)\s*(?:\|\s*)?(direction|orient|layout|separator|order|prefix|limit)\s*:\s*([^>]+?)(?:&gt;|>)\s*\}\}/gi,
    (_, key, firstProp, restProps) => {
      const cleanKey = key.replace(/[|<]+$/, '').trim();
      return `{{${cleanKey} | ${firstProp}: ${restProps.trim()}}}`;
    }
  );

  // 2. Direct inside-braces Indent syntax:
  // e.g. {{key < | indent: 11>}} or {{key <| indent: 5, from: 2, to: 4>}} or {{key <indent: 5>}} or {{key<| indent: 11>}}
  res = res.replace(
    /\{\{([a-zA-Z0-9_\-\.\s]+?)\s*(?:\|)?\s*(?:&lt;|<)\s*(?:\|)?\s*indent((?:(?!(?:&gt;|>)).)*)(?:&gt;|>)\s*\}\}/gi,
    (_, key, innerArgs) => `{{${key.trim()} | ${parseIndentDirectiveArgs(innerArgs)}}}`
  );

  // 3. Direct adjacency (with optional spaces/entities):
  // e.g. {{key}}<| indent: 5, from: 2> or {{key}} < | indent: 5> or {{key}} | indent: 5
  res = res.replace(
    /\{\{([a-zA-Z0-9_\-\.\s]+?)\}\}(?:\s|&nbsp;)*(?:(?:&lt;|<)\s*(?:\|)?\s*indent((?:(?!(?:&gt;|>)).)*)(?:&gt;|>)|\|\s*indent\s*([^}\n<]+))/gi,
    (_, key, innerArgs, pipeArgs) => `{{${key.trim()} | ${parseIndentDirectiveArgs(innerArgs || pipeArgs || '')}}}`
  );

  // 4. Preceding direct adjacency:
  // e.g. <| indent: 5>{{key}} or < | indent: 5, from: 2> {{key}} or | indent: 5{{key}}
  res = res.replace(
    /(?:(?:&lt;|<)\s*(?:\|)?\s*indent((?:(?!(?:&gt;|>)).)*)(?:&gt;|>)|\|\s*indent\s*([^{\n<]+))(?:\s|&nbsp;)*\{\{([a-zA-Z0-9_\-\.\s]+?)\}\}/gi,
    (_, innerArgs, pipeArgs, key) => `{{${key.trim()} | ${parseIndentDirectiveArgs(innerArgs || pipeArgs || '')}}}`
  );

  // 5. Robust scanning for any remaining <| indent... > or &lt;| indent... &gt; or <indent... >
  // Associates with the closest preceding placeholder (or following if none preceding)
  const directiveRegex = /(?:&lt;|<)\s*(?:\|)?\s*indent((?:(?!(?:&gt;|>)).)*)(?:&gt;|>)/i;
  let match: RegExpExecArray | null;

  let safetyCount = 0;
  while ((match = directiveRegex.exec(res)) !== null && safetyCount < 100) {
    safetyCount++;
    const matchIndex = match.index;
    const matchLength = match[0].length;
    const innerArgs = match[1] || '';
    const filterSpec = parseIndentDirectiveArgs(innerArgs);

    const before = res.slice(0, matchIndex);
    const after = res.slice(matchIndex + matchLength);

    // Look backwards in `before` for the closest placeholder: {{...}}
    const lastOpenBrace = before.lastIndexOf('{{');
    const lastCloseBrace = before.lastIndexOf('}}');

    let handled = false;

    if (lastOpenBrace !== -1 && lastCloseBrace !== -1 && lastCloseBrace > lastOpenBrace) {
      const candidateKey = before.slice(lastOpenBrace + 2, lastCloseBrace).trim();
      if (/^[a-zA-Z0-9_\-\.\s|:'",]+$/.test(candidateKey)) {
        const cleanKey = candidateKey.split('|')[0].trim();
        const updatedPlaceholder = `{{${cleanKey} | ${filterSpec}}}`;
        const newBefore = before.slice(0, lastOpenBrace) + updatedPlaceholder + before.slice(lastCloseBrace + 2);
        res = newBefore + after;
        handled = true;
      }
    }

    if (!handled) {
      // Look forwards in `after` for the first placeholder: {{...}}
      const nextOpenBrace = after.indexOf('{{');
      const nextCloseBrace = after.indexOf('}}');

      if (nextOpenBrace !== -1 && nextCloseBrace !== -1 && nextCloseBrace > nextOpenBrace) {
        const candidateKey = after.slice(nextOpenBrace + 2, nextCloseBrace).trim();
        if (/^[a-zA-Z0-9_\-\.\s|:'",]+$/.test(candidateKey)) {
          const cleanKey = candidateKey.split('|')[0].trim();
          const updatedPlaceholder = `{{${cleanKey} | ${filterSpec}}}`;
          const newAfter = after.slice(0, nextOpenBrace) + updatedPlaceholder + after.slice(nextCloseBrace + 2);
          res = before + newAfter;
          handled = true;
        }
      }
    }

    if (!handled) {
      // Standalone directive with no placeholder nearby, remove it
      res = before + after;
    }
  }

  // 6. Final fallback cleanup of any lingering directives
  res = res.replace(/(?:&lt;|<)\s*(?:\|)?\s*indent[^>]*?(?:&gt;|>)/gi, '');

  return res;
}

/**
 * Cleans Word HTML by collapsing split run tags inside {{placeholders}} or {placeholders}.
 * Strictly prevents brace expansion (e.g. {{key}} never becomes {{{key}}}).
 * Preserves unified pipe directives (e.g. {{key | indent: 11}}, {{key | direction: vertical}}).
 */
export function sanitizeDocxPlaceholders(html: string): string {
  if (!html) return '';

  // 0. Collapse split braces across HTML tags first (e.g. {<span>{</span> -> {{ or }</span>} -> }})
  let res = html
    .replace(/\{\s*(?:<[^>]+>\s*)*\{/g, '{{')
    .replace(/\}\s*(?:<[^>]+>\s*)*\}/g, '}}');

  // 1. Collapse HTML tags and decode entities inside {{ ... }}
  let cleaned = res.replace(/\{\{([\s\S]*?)\}\}/g, (match, inner) => {
    // Decode HTML entities
    let decoded = inner
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&amp;/gi, '&')
      .replace(/&nbsp;/gi, ' ');

    // Strip HTML element tags (span, strong, b, em, i, u, font, a, small, mark, sub, sup, div, p, br, etc.)
    let stripped = decoded.replace(/<\/?(span|strong|b|em|i|u|font|a|small|mark|sub|sup|div|p|br)[^>]*>/gi, '').trim();

    // If inner contains injected HTML tag attributes without opening tag (e.g. `key " data-token="" ... >| indent: 5`)
    if (stripped.includes('data-token') || stripped.includes('data-key') || stripped.includes('style=') || stripped.includes('class=')) {
      const cleanKeyMatch = stripped.match(/^([a-zA-Z0-9_\-\.]+)/);
      const indentMatch = stripped.match(/\bindent\s*:\s*(\d+(?:,\s*from:\s*\d+)?(?:,\s*to:\s*\d+)?)/i);
      const dirMatch = stripped.match(/\bdirection\s*:\s*([a-z]+)/i);

      if (cleanKeyMatch) {
        const cleanKey = cleanKeyMatch[1];
        if (indentMatch) {
          return `{{${cleanKey} | indent: ${indentMatch[1]}}}`;
        }
        if (dirMatch) {
          return `{{${cleanKey} | direction: ${dirMatch[1]}}}`;
        }
        return `{{${cleanKey}}}`;
      }
    }

    // Normalize linebreaks and broken words inside placeholder
    const normalized = stripped
      .replace(/-\s*[\r\n]+\s*/g, '')
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/^\{+/, '')
      .replace(/\}+$/, '')
      .trim();

    return `{{${normalized}}}`;
  });

  // 2. Normalize both indent and direction directives now that placeholders are clean
  cleaned = normalizeIndentDirectives(cleaned);

  // 3. Collapse standalone single {variable} ONLY if not preceded or followed by { or }
  cleaned = cleaned.replace(/(?<!\{)\{([a-zA-Z0-9_\-\.\s|:'",<>&;=/()]{1,160})\}(?!\})/g, (match, inner) => {
    let decoded = inner
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&amp;/gi, '&')
      .replace(/&nbsp;/gi, ' ');
    const stripped = decoded.replace(/<\/?(span|strong|b|em|i|u|font|a|small|mark|sub|sup|div|p|br)[^>]*>/gi, '').trim();
    const cleanKey = stripped
      .replace(/-\s*[\r\n]+\s*/g, '')
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/^\{+/, '')
      .replace(/\}+$/, '')
      .trim();
    return `{{${cleanKey}}}`;
  });

  // 3b. Auto-repair unbalanced single-close on double-open: {{key} -> {{key}}
  cleaned = cleaned.replace(/\{\{([a-zA-Z0-9_\-\.\s|:'",<>&;=/()]{1,160})\}(?!\})/g, (_, key) => {
    const cleanKey = key.replace(/^\{+/, '').replace(/\}+$/, '').trim();
    return `{{${cleanKey}}}`;
  });

  // 3c. Auto-repair unbalanced single-open on double-close: {key}} -> {{key}}
  cleaned = cleaned.replace(/(?<!\{)\{([a-zA-Z0-9_\-\.\s|:'",<>&;=/()]{1,160})\}\}/g, (_, key) => {
    const cleanKey = key.replace(/^\{+/, '').replace(/\}+$/, '').trim();
    return `{{${cleanKey}}}`;
  });

  // 4. Prevent and collapse any accidental triple or quadruple braces: {{{key}}} -> {{key}}
  cleaned = cleaned.replace(/\{{3,}([a-zA-Z0-9_\-\.\s|:'",<>&;=/()]+)\}{3,}/g, (_, key) => `{{${key.trim()}}}`);

  return cleaned;
}

/**
 * Detect all placeholder tokens like {{student_name}}, {{field_name | indent: 7}}, {{exam-date <direction: horizontal>}} etc.
 */
export function detectPlaceholders(html: string): string[] {
  if (!html) return [];
  const sanitized = sanitizeDocxPlaceholders(html);
  const regex = /\{\{([a-zA-Z0-9_\-\.\s|:'",<>&;=/()]+)\}\}/g;
  const placeholders = new Set<string>();
  let match;
  while ((match = regex.exec(sanitized)) !== null) {
    const raw = (match[1] || '').trim();
    const token = raw.split(/[|<]/)[0].trim();
    if (token) {
      placeholders.add(token);
    }
  }
  return Array.from(placeholders);
}

/**
 * Normalizes a variable name by lowercasing and stripping non-alphanumeric chars.
 */
export function normalizeKey(str: string): string {
  return String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}


// PURE_METADATA_KEYS is decoupled into @/components/print/keyLibrary/tokenSynonyms


/**
 * Multi-line indentation filter:
 * Indents lines within the range [fromLine, toLine] with `spaceCount` spaces.
 * Line numbers are 1-indexed (e.g. line 1 is first line, line 2 is second line).
 * If toLine is omitted, null, or <= 0, indentation applies to all remaining lines from fromLine onwards.
 */
export function applyIndentFilter(
  text: string,
  spaceCount: number = 7,
  fromLine: number = 2,
  toLine?: number | null,
  mode: 'html' | 'text' = 'html'
): string {
  if (!text) return '';
  // Split on newlines or existing <br>
  const rawLines = text.includes('<br>') || text.includes('<br/>') || text.includes('<br />')
    ? text.split(/<br\s*[\/]?>/gi)
    : text.split(/\r?\n/);

  if (rawLines.length === 0) return text;

  // In HTML mode, use non-breaking space &nbsp; so browsers never collapse consecutive spaces
  const spaceChar = mode === 'html' ? '&nbsp;' : ' ';
  const indent = spaceChar.repeat(Math.max(1, spaceCount));

  const effectiveFrom = Math.max(1, fromLine || 2);
  const effectiveTo = toLine && toLine > 0 ? toLine : Infinity;

  const formattedLines = rawLines.map((line, idx) => {
    const lineNum = idx + 1; // 1-indexed

    const cleanLineText = line.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    if (!cleanLineText) {
      return line;
    }

    if (lineNum >= effectiveFrom && lineNum <= effectiveTo) {
      return `${indent}${line}`;
    }
    return line;
  });

  return mode === 'html' ? formattedLines.join('<br>') : formattedLines.join('\n');
}

export type TokenFilterInterceptor = (
  tokenKey: string,
  filterName: string,
  filterArgs: string,
  value: string,
  lookup: Map<string, string>,
  mode: 'html' | 'text'
) => { handled?: boolean; result?: string; skipFilter?: boolean } | null | void;

const tokenFilterInterceptors: TokenFilterInterceptor[] = [];

/**
 * Registers a dynamic token filter interceptor from any feature module.
 * Enables feature modules (like Daily Progress, Finance, Examinations) to apply domain-specific
 * formatting rules, conditional filters, or overrides without coupling the core docx engine.
 */
export function registerTokenFilterInterceptor(interceptor: TokenFilterInterceptor): () => void {
  tokenFilterInterceptors.push(interceptor);
  return () => {
    const idx = tokenFilterInterceptors.indexOf(interceptor);
    if (idx >= 0) tokenFilterInterceptors.splice(idx, 1);
  };
}

/**
 * Applies a specific condition/formatting filter to a value string.
 * Extensible filter registry pattern for DocLab conditions.
 */
export function applyFilter(
  value: string,
  filterSpec: string,
  mode: 'html' | 'text' = 'html'
): string {
  if (!filterSpec || typeof value !== 'string') return value;

  // Parse filter name and arguments, e.g. "indent: 5, from: 2, to: 4" or "indent: 7" or "default: 'N/A'"
  const colonIdx = filterSpec.indexOf(':');
  const filterName = (colonIdx > -1 ? filterSpec.slice(0, colonIdx) : filterSpec).trim().toLowerCase();
  const rawArgs = colonIdx > -1 ? filterSpec.slice(colonIdx + 1).trim() : '';

  switch (filterName) {
    case 'indent': {
      // Parse arguments: e.g. "5, from: 2, to: 4" or "5:2:4" or "5" or "10, all: true"
      let spaceCount = 5;
      let fromLine = 2;
      let toLine: number | undefined = undefined;
      const forceAll = /\b(all|force):\s*true\b/i.test(rawArgs) || /\bheaders?:\s*false\b/i.test(rawArgs);
      if (forceAll) {
        fromLine = 1;
      }

      const fromMatch = rawArgs.match(/\bfrom:\s*(\d+)/i);
      const toMatch = rawArgs.match(/\bto:\s*(\d+)/i);

      if (fromMatch) fromLine = parseInt(fromMatch[1], 10);
      if (toMatch) toLine = parseInt(toMatch[1], 10);

      if (rawArgs.includes(':') && !fromMatch && !toMatch && !forceAll) {
        // Positional syntax "5:2:4" or "5:2"
        const parts = rawArgs.split(':').map((p) => parseInt(p.trim(), 10));
        if (!isNaN(parts[0])) spaceCount = parts[0];
        if (parts.length > 1 && !isNaN(parts[1])) fromLine = parts[1];
        if (parts.length > 2 && !isNaN(parts[2])) toLine = parts[2];
      } else {
        const firstNumMatch = rawArgs.match(/^\s*(\d+)/);
        if (firstNumMatch) {
          spaceCount = parseInt(firstNumMatch[1], 10);
        }
      }

      return applyIndentFilter(value, spaceCount, fromLine, toLine, mode);
    }
    case 'uppercase':
    case 'upper':
      return value.toUpperCase();
    case 'lowercase':
    case 'lower':
      return value.toLowerCase();
    case 'capitalize':
    case 'cap':
      return value.replace(/\b\w/g, (c) => c.toUpperCase());
    case 'default': {
      const fallback = rawArgs.replace(/^['"]|['"]$/g, '');
      return (!value || value.trim() === '') ? fallback : value;
    }
    case 'prefix': {
      const prefix = rawArgs.replace(/^['"]|['"]$/g, '');
      return `${prefix}${value}`;
    }
    case 'skipdata':
    case 'skip':
    case 'skip_data': {
      const skipTargetMatch = rawArgs.match(/^['"]?([^,'"]+)['"]?(?:,\s*removeLine:\s*['"]?([a-zA-Z0-9_-]+)['"]?)?/i);
      const target = skipTargetMatch ? skipTargetMatch[1].trim() : rawArgs.trim();
      const removeLine = skipTargetMatch && skipTargetMatch[2] ? skipTargetMatch[2].trim() : undefined;
      
      const rawLines = value.includes('<br>') || value.includes('<br/>') || value.includes('<br />')
        ? value.split(/<br\s*[\/]?>/gi)
        : value.split(/\r?\n/);
      
      const filtered = applySkipDataAndRemoveLines(rawLines, target, removeLine);
      return mode === 'html' ? filtered.join('<br>') : filtered.join('\n');
    }
    case 'removeline':
    case 'remove_line': {
      return value;
    }
    default:
      return value;
  }
}

/**
 * Resolves a token with potential condition/formatting filters or modern <direction: vertical, ...> directives.
 * Matches base key against lookup and cascades through directive options and filter specifications.
 */
export function resolveTokenValue(
  tokenContent: string,
  lookup: Map<string, any>,
  mode: 'html' | 'text' = 'html'
): string | null {
  const directiveParsed = parseTokenDirective(tokenContent);
  const rawKey = directiveParsed.baseKey;
  const filterSpecs = directiveParsed.legacyFilterSpecs;

  const norm = normalizeKey(rawKey);
  let value: any = undefined;

  if (lookup.has(norm)) {
    value = lookup.get(norm);
  } else if (lookup.has(rawKey.toLowerCase())) {
    value = lookup.get(rawKey.toLowerCase());
  } else if (lookup.has(rawKey)) {
    value = lookup.get(rawKey);
  }

  // Helper to extract default / fallback if value is missing or empty
  const getFallbackValue = (): string | null => {
    if (directiveParsed.options.fallback !== undefined) {
      return String(directiveParsed.options.fallback).replace(/^['"]|['"]$/g, '');
    }
    if (filterSpecs && filterSpecs.length > 0) {
      for (const spec of filterSpecs) {
        const colonIdx = spec.indexOf(':');
        const filterName = (colonIdx > -1 ? spec.slice(0, colonIdx) : spec).trim().toLowerCase();
        if (filterName === 'default' || filterName === 'fallback') {
          const rawArgs = colonIdx > -1 ? spec.slice(colonIdx + 1).trim() : '';
          return rawArgs.replace(/^['"]|['"]$/g, '');
        }
      }
    }
    return null;
  };

  const isMissingOrEmpty = value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
  if (isMissingOrEmpty) {
    const fallbackVal = getFallbackValue();
    if (fallbackVal !== null) {
      return fallbackVal;
    }
    if (value === undefined) {
      return null; // Value not found and no fallback provided, keep fullMatch
    }
  }

  // Check if any registered interceptor will handle 'indent'
  let willInterceptIndent = false;
  if (directiveParsed.options.indent && directiveParsed.options.indent > 0) {
    for (const interceptor of tokenFilterInterceptors) {
      const testRes = interceptor(norm, 'indent', String(directiveParsed.options.indent), String(value), lookup, mode);
      if (testRes && (testRes.handled || testRes.skipFilter)) {
        willInterceptIndent = true;
        break;
      }
    }
  }

  // 1. If modern <...> directive is present, format multi-value or single value data
  let processed: any = value;
  let indentAppliedByDirective = false;

  if (directiveParsed.hasDirective) {
    const effectiveOptions = willInterceptIndent
      ? { ...directiveParsed.options, indent: 0 }
      : directiveParsed.options;
    processed = formatMultiValueData(value, effectiveOptions, mode);
    if (!willInterceptIndent && directiveParsed.options.indent && directiveParsed.options.indent > 0) {
      indentAppliedByDirective = true;
    }
  } else if (Array.isArray(value)) {
    processed = value
      .map((it) => (it && typeof it === 'object' ? (it.name || it.title || it.subjectName || JSON.stringify(it)) : String(it)))
      .join(', ');
  } else if (typeof value === 'object' && value !== null) {
    processed = JSON.stringify(value);
  } else {
    processed = String(value);
  }

  // 2. Apply legacy filters in sequence if present
  for (const filterSpec of filterSpecs) {
    const colonIdx = filterSpec.indexOf(':');
    const filterName = (colonIdx > -1 ? filterSpec.slice(0, colonIdx) : filterSpec).trim().toLowerCase();
    const rawArgs = colonIdx > -1 ? filterSpec.slice(colonIdx + 1).trim() : '';

    // Check if any feature-registered interceptor handles, modifies, or skips this filter
    let intercepted = false;
    for (const interceptor of tokenFilterInterceptors) {
      const interceptRes = interceptor(norm, filterName, rawArgs, String(processed), lookup, mode);
      if (interceptRes) {
        if (interceptRes.result !== undefined) {
          processed = interceptRes.result;
        }
        if (interceptRes.handled || interceptRes.skipFilter) {
          intercepted = true;
          break;
        }
      }
    }

    if (!intercepted) {
      if (filterName === 'indent' && indentAppliedByDirective) {
        continue;
      }
      processed = applyFilter(String(processed), filterSpec, mode);
    }
  }

  // Ensure multi-line output in HTML mode converts remaining \n to <br>
  if (mode === 'html' && typeof processed === 'string' && processed.includes('\n') && !processed.includes('<br') && !processed.includes('<!-- spr-')) {
    processed = processed.split(/\r?\n/).join('<br>');
  }

  return String(processed);
}
