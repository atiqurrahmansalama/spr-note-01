import { separateDocxStylesAndBody } from './docxStyleUtils';
import {
  parseTokenDirective,
  formatMultiValueData,
  applySkipDataAndRemoveLines,
  applyDocumentSkipAndRemoveLines,
} from './docLabDirectiveEngine';
import {
  getSynonymsForKey,
  PURE_METADATA_KEYS,
  UNIVERSAL_SYNONYM_GROUPS,
} from './keyLibrary/tokenSynonyms';
import {
  normalizeIndentDirectives,
  sanitizeDocxPlaceholders,
  resolveTokenValue,
  normalizeKey,
  detectPlaceholders,
} from './docxTokenFilters';

/**
 * Builds an enriched key-value lookup map supporting camelCase, snake_case, spaces, nested properties, and casing variations.
 * 100% Dynamic & Algorithmic with smart universal domain alias resolution.
 */
function buildEnrichedLookup(dataRecord: Record<string, any>): Map<string, any> {
  const map = new Map<string, any>();
  if (!dataRecord || typeof dataRecord !== 'object') return map;

  const insertKeyVariants = (rawKey: string, val: any) => {
    if (val === undefined || val === null) return;

    // 1. Raw exact key
    map.set(rawKey, val);

    // 2. Lowercase key
    const lowerKey = rawKey.toLowerCase();
    map.set(lowerKey, val);

    // 3. Alphanumeric stripped key (e.g. 'roll_number' -> 'rollnumber', 'student-name' -> 'studentname')
    const norm = normalizeKey(rawKey);
    if (norm) {
      map.set(norm, val);
    }

    // 4. camelCase to snake_case (e.g. 'studentName' -> 'student_name')
    const snakeCase = rawKey.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
    if (snakeCase && snakeCase !== lowerKey) {
      map.set(snakeCase, val);
      map.set(snakeCase.replace(/_/g, ' '), val);
    }

    // 5. snake_case to camelCase (e.g. 'student_name' -> 'studentName')
    const camelCase = rawKey.replace(/_([a-z0-9])/gi, (_, letter) => letter.toUpperCase());
    if (camelCase && camelCase !== rawKey) {
      map.set(camelCase, val);
      map.set(camelCase.toLowerCase(), val);
    }

    // 6. Space-separated variant (e.g. 'student_name' or 'studentName' -> 'student name')
    const spaceCase = rawKey.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    if (spaceCase) {
      map.set(spaceCase, val);
    }

    // 7. Universal Declarative Synonym Matching
    for (const group of UNIVERSAL_SYNONYM_GROUPS) {
      if (group.some((syn) => syn.replace(/[^a-z0-9]/g, '') === norm)) {
        group.forEach((syn) => {
          map.set(syn, val);
          map.set(syn.replace(/[^a-z0-9]/g, ''), val);
        });
        break;
      }
    }
  };

  // 1. Process all direct and nested properties
  Object.entries(dataRecord).forEach(([k, v]) => {
    insertKeyVariants(k, v);

    // If property is a nested object, flatten keys (e.g. { student: { name: 'Ali' } } -> 'student_name', 'student.name')
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.entries(v).forEach(([subK, subV]) => {
        insertKeyVariants(`${k}_${subK}`, subV);
        insertKeyVariants(`${k}.${subK}`, subV);
      });
    }
  });

  // 2. Aggregate column-level lists across repeating row arrays (rows, items, data, routine, schedule, etc.)
  const arrayProps = [dataRecord.rows, dataRecord.items, dataRecord.data, dataRecord.schedule, dataRecord.routine, dataRecord.records]
    .filter((arr) => Array.isArray(arr) && arr.length > 0 && typeof arr[0] === 'object');

  arrayProps.forEach((rows) => {
    const colKeys = new Set<string>();
    rows.forEach((r: any) => {
      if (r && typeof r === 'object') {
        Object.keys(r).forEach((k) => colKeys.add(k));
      }
    });

    colKeys.forEach((colKey) => {
      const norm = normalizeKey(colKey);
      if (PURE_METADATA_KEYS.has(norm)) {
        return; // Preserve single top-level metadata string (exam-name, academic-year, session, etc.)
      }
      if (dataRecord[colKey] !== undefined && !Array.isArray(dataRecord[colKey])) {
        return; // Preserve explicit top-level scalar property
      }

      const colValues = rows
        .map((r: any) => r[colKey])
        .filter((val: any) => val !== undefined && val !== null && val !== '');
      if (colValues.length > 0) {
        insertKeyVariants(colKey, colValues);
      }
    });
  });

  return map;
}

/**
 * Helper to build standardized 1-indexed row data context for tabular repetition.
 */
function buildTabularRowData(rec: Record<string, any>, rIdx: number, baseContext: Record<string, any>): Record<string, any> {
  return {
    sl: rIdx + 1,
    serial: rIdx + 1,
    no: rIdx + 1,
    index: rIdx + 1,
    row_num: rIdx + 1,
    row_number: rIdx + 1,
    index_0: rIdx,
    '@index': rIdx + 1,
    '#index': rIdx + 1,
    ...baseContext,
    ...rec,
  };
}

/**
 * Helper to build aggregate count metrics context for tabular documents.
 */
function buildTabularFinalContext(recordsLength: number, baseContext: Record<string, any>): Record<string, any> {
  return {
    ...baseContext,
    total_students: recordsLength,
    total_records: recordsLength,
    records_count: recordsLength,
    total_count: recordsLength,
  };
}

/**
 * Detects if a template is a Tabular Template (Type 1) containing repeating table rows or loop tags.
 */
export function isTabularTemplate(html: string): boolean {
  if (!html) return false;
  // 1. Explicit loop block markers (e.g. {{#rows}}, {{#students}}, {{#records}})
  if (/\{\{#(rows|students|records|data|items|table|list|row)\}\}/i.test(html)) {
    return true;
  }

  // 2. DOM-based table check with repeating placeholders
  if (typeof document !== 'undefined' && html.includes('<table')) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const tables = doc.querySelectorAll('table');
      for (const table of Array.from(tables)) {
        const rows = table.querySelectorAll('tr');
        for (const tr of Array.from(rows)) {
          // Check if this row contains {{...}} placeholders and is not purely <th> header cells
          const hasPlaceholders = /\{\{([\s\S]+?)\}\}/.test(tr.innerHTML);
          const hasOnlyTh = tr.querySelectorAll('th').length > 0 && tr.querySelectorAll('td').length === 0;
          if (hasPlaceholders && !hasOnlyTh) {
            return true;
          }
        }
      }
    } catch (e) {
      // fallback to regex
    }
  }

  // 3. Fallback regex for tables containing placeholders inside <td>
  const tdPlaceholderRegex = /<tr\b[^>]*>[\s\S]*?<td\b[^>]*>[\s\S]*?\{\{([\s\S]+?)\}\}[\s\S]*?<\/td>[\s\S]*?<\/tr>/i;
  return tdPlaceholderRegex.test(html);
}

/**
 * Type 1: Tabular Column-Loop / Table Data Row Merging Engine
 * Merges a table template with an array of records by repeating the template data row
 * for each record, populating column variables and sequential index (Sl/No/Index).
 */
export function mergeTabularTemplateWithData(
  templateHtml: string,
  records: Array<Record<string, any>>,
  baseContext: Record<string, any> = {}
): string {
  if (!templateHtml) return '';
  if (!Array.isArray(records) || records.length === 0) {
    return mergeTemplateWithData(templateHtml, baseContext);
  }

  const sanitized = sanitizeDocxPlaceholders(templateHtml);

  // 1. Check for explicit loop block syntax: {{#rows}} ... {{/rows}}
  const loopBlockRegex = /\{\{#(rows|students|records|data|items|table|list|row)\}\}([\s\S]*?)\{\{\/\1\}\}/gi;
  if (loopBlockRegex.test(sanitized)) {
    const expanded = sanitized.replace(loopBlockRegex, (_, _tagName, blockContent) => {
      return records
        .map((rec, rIdx) => {
          const rowData = buildTabularRowData(rec, rIdx, baseContext);
          return mergeTemplateWithData(blockContent, rowData);
        })
        .join('\n');
    });

    return mergeTemplateWithData(expanded, buildTabularFinalContext(records.length, baseContext));
  }

  // 2. Implicit Table Row Detection via DOMParser
  if (typeof document !== 'undefined' && sanitized.includes('<table')) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(sanitized, 'text/html');
      const tables = doc.querySelectorAll('table');
      let tableFoundAndProcessed = false;

      tables.forEach((table) => {
        const trEls = Array.from(table.querySelectorAll('tr'));
        // Find the template row: a <tr> that contains <td> cells with {{...}} placeholders
        const templateRow = trEls.find((tr) => {
          const cells = tr.querySelectorAll('td');
          if (cells.length === 0) return false;
          return /\{\{([a-zA-Z0-9_\-\.\s]+)\}\}/.test(tr.innerHTML);
        });

        if (templateRow && templateRow.parentNode) {
          tableFoundAndProcessed = true;
          const parent = templateRow.parentNode;
          const rowTemplateHtml = templateRow.outerHTML;

          // Generate a populated row for each record
          records.forEach((rec, rIdx) => {
            const rowData = buildTabularRowData(rec, rIdx, baseContext);
            const populatedRowHtml = mergeTemplateWithData(rowTemplateHtml, rowData);
            const tempContainer = doc.createElement('tbody');
            tempContainer.innerHTML = populatedRowHtml;
            const newTr = tempContainer.firstElementChild;
            if (newTr) {
              parent.insertBefore(newTr, templateRow);
            }
          });

          // Remove the placeholder template row
          parent.removeChild(templateRow);
        }
      });

      if (tableFoundAndProcessed) {
        const bodyContent = doc.body.innerHTML;
        return mergeTemplateWithData(bodyContent, buildTabularFinalContext(records.length, baseContext));
      }
    } catch (e) {
      console.warn('DOM table parsing failed in mergeTabularTemplateWithData, falling back to regex', e);
    }
  }

  // 3. Fallback Regex for single-table row template
  const rowRegex = /<tr\b[^>]*>[\s\S]*?<td\b[^>]*>[\s\S]*?\{\{([a-zA-Z0-9_\-\.\s]+)\}\}[\s\S]*?<\/td>[\s\S]*?<\/tr>/i;
  const match = rowRegex.exec(sanitized);
  if (match) {
    const templateTr = match[0];
    const repeatedRows = records
      .map((rec, rIdx) => {
        const rowData = buildTabularRowData(rec, rIdx, baseContext);
        return mergeTemplateWithData(templateTr, rowData);
      })
      .join('\n');

    const expanded = sanitized.replace(templateTr, repeatedRows);
    return mergeTemplateWithData(expanded, buildTabularFinalContext(records.length, baseContext));
  }

  return mergeTemplateWithData(sanitized, baseContext);
}

/**
 * Universal Nested Array and Table Row Expansion Engine.
 * 100% Domain-Agnostic: Discovers any nested array of objects inside dataRecord
 * (e.g. subjectMarks, feeItems, items, records, rows, data) and dynamically
 * expands explicit loop tags ({{#arrayKey}} ... {{/arrayKey}}) or repeating table rows.
 */
function expandNestedArraysAndTables(html: string, dataRecord: Record<string, any>): string {
  if (!html || !dataRecord || typeof dataRecord !== 'object') return html;

  let result = html;

  // Find all array properties in dataRecord containing objects
  const arrayEntries = Object.entries(dataRecord).filter(
    ([_, val]) => Array.isArray(val) && val.length > 0 && typeof val[0] === 'object'
  );

  if (arrayEntries.length === 0) {
    return result;
  }

  // 1. Universal Explicit Loop Tags: {{#arrayKey}} ... {{/arrayKey}}
  arrayEntries.forEach(([arrayKey, items]) => {
    const loopRegex = new RegExp(`\\{\\{#(${arrayKey}|items|rows|list|data)\\}\\}([\\s\\S]*?)\\{\\{/\\1\\}\\}`, 'gi');
    if (loopRegex.test(result)) {
      result = result.replace(loopRegex, (_, _tagName, blockContent) => {
        return items
          .map((item: any, idx: number) => {
            const enrichedItem = {
              sl: idx + 1,
              serial: idx + 1,
              index: idx + 1,
              no: idx + 1,
              ...item,
            };
            return mergeTemplateWithData(blockContent, enrichedItem);
          })
          .join('\n');
      });
    }
  });

  // 2. Universal DOM-Based Repeating Table Row Detection
  if (typeof document !== 'undefined' && result.includes('<table')) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(result, 'text/html');
      const tables = doc.querySelectorAll('table');
      let tableModified = false;

      tables.forEach((table) => {
        const trEls = Array.from(table.querySelectorAll('tr'));
        if (trEls.length === 0) return;

        // Check if table contains numbered slot keys (e.g. subject_1_name, subject_2_name, etc.)
        // If it already has numbered slot keys across rows, it's a fixed slot table, so NEVER expand!
        const allTablePlaceholders = detectPlaceholders(table.innerHTML);
        const hasNumberedSlotKeys = allTablePlaceholders.some((p) => /_[1-9]\d*_/i.test(p) || /_[1-9]\d*$/i.test(p));
        if (hasNumberedSlotKeys) {
          return; // Fixed slot table: populated directly by mergeTemplateWithData!
        }

        // If the table explicitly uses multi-value token layout directives (direction: / separator: / prefix:), NEVER auto-expand as repeating rows!
        const tableHasDirectives = /(?:<|&lt;)(?:\s*direction|\s*separator|\s*prefix|\s*orient|\s*layout|\s*gap|\s*indent)\s*:/i.test(table.innerHTML);
        if (tableHasDirectives) {
          return;
        }

        // Try to match this table against any array in arrayEntries
        for (const [_, items] of arrayEntries) {
          if (!Array.isArray(items) || items.length === 0) continue;

          // Collect all known keys present in this array's items
          const sampleItem = items[0] || {};
          const itemKeys = Object.keys(sampleItem).map((k) => k.toLowerCase());

          // Find a template <tr> that contains non-numbered placeholders matching keys in this array's items
          const templateTr = trEls.find((tr, rIdx) => {
            const cells = tr.querySelectorAll('td');
            if (cells.length === 0) return false;

            // Skip top row if it's purely header (<th>)
            if (rIdx === 0 && trEls.length > 1 && tr.querySelectorAll('th').length > 0) {
              return false;
            }

            const inner = tr.innerHTML.toLowerCase();

            // Skip rows containing multi-value directives (e.g. {{exam-date<direction: horizontal, separator: cell>}})
            if (/(?:<|&lt;)(?:\s*direction|\s*separator|\s*prefix|\s*orient|\s*layout|\s*gap|\s*indent)\s*:/i.test(tr.innerHTML)) {
              return false;
            }

            const placeholders = detectPlaceholders(inner);

            // Skip rows that look like summary or total rows (e.g. only containing total_marks, average, gpa)
            const isSummaryOnlyRow = placeholders.length > 0 && placeholders.every((p) => {
              const norm = normalizeKey(p);
              return ['total', 'totalmarks', 'grandtotal', 'average', 'avg', 'gpa', 'highest', 'overallgpa', 'resultstatus'].includes(norm);
            });
            if (isSummaryOnlyRow) return false;

            // Skip rows that ONLY contain pure metadata keys (e.g. {{exam-name}}, {{academic-year}})
            const nonMetaPlaceholders = placeholders.filter((p) => {
              const norm = normalizeKey(p);
              return !PURE_METADATA_KEYS.has(norm);
            });
            if (nonMetaPlaceholders.length === 0) {
              return false; // Header / metadata row, NEVER repeat!
            }

            // Row MUST contain a primary item identifier placeholder (e.g. subject_name, subject, name, item_name, title)
            const hasPrimaryItemKey = nonMetaPlaceholders.some((p) => {
              const norm = normalizeKey(p);
              return ['subject', 'subjectname', 'item', 'itemname', 'name', 'title', 'course', 'coursename'].includes(norm);
            });

            const matchesArrayKeys = nonMetaPlaceholders.some((p) => {
              const norm = normalizeKey(p);
              return itemKeys.some((k) => normalizeKey(k) === norm && !PURE_METADATA_KEYS.has(normalizeKey(k)));
            });

            return hasPrimaryItemKey || (matchesArrayKeys && nonMetaPlaceholders.length >= 2);
          });

          if (templateTr && templateTr.parentNode) {
            tableModified = true;
            const parent = templateTr.parentNode;
            let rowTemplateHtml = templateTr.outerHTML;

            // Replace generic sample text like "Subject 1", "Item 1" in column with first item name key
            const preferredNameKey =
              Object.keys(sampleItem).find((k) =>
                ['subject_name', 'subjectname', 'item_name', 'itemname', 'name', 'title', 'label', 'description'].includes(k.toLowerCase())
              ) ||
              Object.keys(sampleItem).find((k) =>
                typeof sampleItem[k] === 'string' &&
                !k.toLowerCase().includes('id') &&
                !k.toLowerCase().includes('key') &&
                !k.toLowerCase().includes('code') &&
                !k.toLowerCase().includes('status') &&
                k !== 'sl' &&
                k !== 'index'
              ) ||
              'name';

            rowTemplateHtml = rowTemplateHtml.replace(/(subject|item|row|entry|record)\s*[-_]?\s*0?1\b/gi, `{{${preferredNameKey}}}`);

            items.forEach((item: any, idx: number) => {
              const enrichedItem = {
                sl: idx + 1,
                serial: idx + 1,
                index: idx + 1,
                no: idx + 1,
                ...item,
              };
              const populatedTrHtml = mergeTemplateWithData(rowTemplateHtml, enrichedItem);
              const temp = doc.createElement('tbody');
              temp.innerHTML = populatedTrHtml;
              const newRow = temp.firstElementChild;
              if (newRow) {
                parent.insertBefore(newRow, templateTr);
              }
            });

            parent.removeChild(templateTr);
            break; // Table processed for this array
          }
        }
      });

      if (tableModified) {
        result = doc.body.innerHTML;
      }
    } catch (e) {
      console.warn('Universal table expansion failed in mergeTemplateWithData', e);
    }
  }

  return result;
}

/**
 * Helper to extract outermost opening and closing HTML wrapper tags.
 */
function extractSurroundingTags(rawHtml: string): { openTags: string; closeTags: string } {
  const openTags = (rawHtml.match(/<[a-z0-9]+\b[^>]*>/gi) || []).join('');
  const closeTags = (rawHtml.match(/<\/[a-z0-9]+>/gi) || []).join('');
  return { openTags, closeTags };
}

/**
 * Helper to extract split parts from a cell, preserving internal formatting wrapper tags
 * (such as font-family, font-size, bold, color, align, etc.) across all split parts,
 * and supporting multi-stream zipping when multiple tokens are in the same cell.
 */
function extractCellSplitParts(rawHtml: string): string[] {
  if (!rawHtml || !rawHtml.includes('<!-- spr-cell-split -->')) return [rawHtml];

  // 1. Check if multiple distinct paragraphs/lines contain split streams
  const pRegex = /<p\b[^>]*>[\s\S]*?<\/p>|<div\b[^>]*>[\s\S]*?<\/div>/gi;
  const pMatches = rawHtml.match(pRegex);
  const streamBlocks = pMatches ? pMatches.filter((p) => p.includes('<!-- spr-cell-split -->')) : [];

  if (streamBlocks.length > 1) {
    const streamLists: string[][] = streamBlocks.map((blockHtml) => {
      const parts = blockHtml.split('<!-- spr-cell-split -->');
      const cleanValues = parts.map((p) => p.replace(/<[^>]*>/g, '').trim());
      const { openTags: firstOpenTags, closeTags: lastCloseTags } = extractSurroundingTags(parts[0]);
      const endCloseTags = (parts[parts.length - 1].match(/<\/[a-z0-9]+>/gi) || []).join('');
      return cleanValues.map((val) => `${firstOpenTags}${val}${endCloseTags || lastCloseTags}`);
    });

    const maxCols = Math.max(...streamLists.map((s) => s.length));
    const zipped: string[] = [];

    for (let c = 0; c < maxCols; c++) {
      const colItems = streamLists.map((s) => s[c] || '').filter(Boolean);
      zipped.push(colItems.join(''));
    }
    return zipped;
  }

  // 2. Check comma-separated split streams (e.g. date1<!-- -->date2, day1<!-- -->day2)
  if (rawHtml.includes('<!-- spr-cell-split -->') && rawHtml.includes(',')) {
    const commaParts = rawHtml.split(/,\s*(?=[^<]*<!-- spr-cell-split -->|[A-Za-z0-9])/);
    const streamParts = commaParts.filter((p) => p.includes('<!-- spr-cell-split -->'));
    if (streamParts.length > 1) {
      const streams = streamParts.map((p) => {
        const parts = p.split('<!-- spr-cell-split -->');
        const cleanValues = parts.map((it) => it.replace(/<[^>]*>/g, '').trim());
        const { openTags } = extractSurroundingTags(parts[0]);
        const closeTags = (parts[parts.length - 1].match(/<\/[a-z0-9]+>/gi) || []).join('');
        return cleanValues.map((val) => `${openTags}${val}${closeTags}`);
      });
      const maxCols = Math.max(...streams.map((s) => s.length));
      const zipped: string[] = [];

      for (let c = 0; c < maxCols; c++) {
        const colItems = streams.map((s) => s[c] || '').filter(Boolean);
        zipped.push(colItems.join(', '));
      }
      return zipped;
    }
  }

  // 3. Single stream with preserved wrapping tags
  const parts = rawHtml.split('<!-- spr-cell-split -->');
  if (parts.length <= 1) return [rawHtml];

  const cleanValues = parts.map((p) => p.replace(/<[^>]*>/g, '').trim());
  const { openTags: firstOpenTags } = extractSurroundingTags(parts[0]);
  const lastCloseTags = (parts[parts.length - 1].match(/<\/[a-z0-9]+>/gi) || []).join('');

  return cleanValues.map((val) => `${firstOpenTags}${val}${lastCloseTags}`);
}

/**
 * Expands table cell split directives (<!-- spr-cell-split --> and <!-- spr-row-cell-split -->)
 * generated by token directives like `<separator: cell>` or `<direction: horizontal, separator: cell>`.
 */
function expandTableCellSplits(html: string): string {
  if (!html || (!html.includes('<!-- spr-cell-split -->') && !html.includes('<!-- spr-row-cell-split -->'))) {
    return html;
  }

  if (typeof document !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // 1. Horizontal cell splits (populate consecutive <td> cells in current <tr>)
      const splitTds = Array.from(doc.querySelectorAll('td, th')).filter((cell) =>
        cell.innerHTML.includes('<!-- spr-cell-split -->')
      );

      splitTds.forEach((cell) => {
        const parentTr = cell.parentElement;
        if (!parentTr) return;

        const parts = extractCellSplitParts(cell.innerHTML);
        if (parts.length <= 1) return;

        // Current cell gets the first formatted value
        cell.innerHTML = parts[0];
        (cell as HTMLElement).style.width = '';

        // Capture cell styling template to clone to all subsequent cells
        const sourceClass = cell.className;
        const sourceStyle = cell.getAttribute('style') || '';
        const sourceAlign = cell.getAttribute('align');
        const sourceValign = cell.getAttribute('valign');

        // Subsequent values get populated into consecutive existing sibling cells, or cloned if none exist
        let currentRef: Element = cell;
        for (let i = 1; i < parts.length; i++) {
          const nextSibling = currentRef.nextElementSibling;
          if (nextSibling && (nextSibling.tagName.toLowerCase() === 'td' || nextSibling.tagName.toLowerCase() === 'th')) {
            nextSibling.innerHTML = parts[i];
            if (sourceClass) nextSibling.className = sourceClass;
            if (sourceStyle) nextSibling.setAttribute('style', sourceStyle);
            if (sourceAlign) nextSibling.setAttribute('align', sourceAlign);
            if (sourceValign) nextSibling.setAttribute('valign', sourceValign);
            (nextSibling as HTMLElement).style.width = '';
            currentRef = nextSibling;
          } else {
            const newCell = cell.cloneNode(false) as HTMLElement;
            newCell.removeAttribute('colspan');
            newCell.removeAttribute('rowspan');
            if (sourceClass) newCell.className = sourceClass;
            if (sourceStyle) newCell.setAttribute('style', sourceStyle);
            if (sourceAlign) newCell.setAttribute('align', sourceAlign);
            if (sourceValign) newCell.setAttribute('valign', sourceValign);
            newCell.innerHTML = parts[i];
            newCell.style.width = '';
            currentRef.insertAdjacentElement('afterend', newCell);
            currentRef = newCell;
          }
        }
      });

      // 2. Vertical row-cell splits (populate consecutive rows in the same column)
      const splitRowTds = Array.from(doc.querySelectorAll('td, th')).filter((cell) =>
        cell.innerHTML.includes('<!-- spr-row-cell-split -->')
      );

      splitRowTds.forEach((cell) => {
        const parentTr = cell.parentElement;
        const parentTbody = parentTr?.parentElement;
        if (!parentTr || !parentTbody) return;

        const cellIndex = Array.from(parentTr.children).indexOf(cell);
        const parts = cell.innerHTML.split('<!-- spr-row-cell-split -->');
        if (parts.length <= 1) return;

        const cleanValues = parts.map((p) => p.replace(/<[^>]*>/g, '').trim());
        const { openTags: firstOpenTags } = extractSurroundingTags(parts[0]);
        const lastCloseTags = (parts[parts.length - 1].match(/<\/[a-z0-9]+>/gi) || []).join('');
        const formattedParts = cleanValues.map((val) => `${firstOpenTags}${val}${lastCloseTags}`);

        cell.innerHTML = formattedParts[0];

        const sourceClass = cell.className;
        const sourceStyle = cell.getAttribute('style') || '';

        const allRows = Array.from(parentTbody.querySelectorAll('tr'));
        const currentRowIndex = allRows.indexOf(parentTr as HTMLTableRowElement);

        for (let i = 1; i < formattedParts.length; i++) {
          let targetTr = allRows[currentRowIndex + i];
          if (!targetTr) {
            targetTr = parentTr.cloneNode(true) as HTMLTableRowElement;
            Array.from(targetTr.children).forEach((c, idx) => {
              if (idx !== cellIndex) (c as HTMLElement).innerHTML = '';
            });
            parentTbody.appendChild(targetTr);
          }
          const targetCell = targetTr.children[cellIndex] as HTMLElement;
          if (targetCell) {
            if (sourceClass) targetCell.className = sourceClass;
            if (sourceStyle) targetCell.setAttribute('style', sourceStyle);
            targetCell.style.width = '';
            targetCell.innerHTML = formattedParts[i];
          }
        }
      });

      // 3. Balance all tables so all rows have equal column counts and no cramped or overflowing cells
      const tables = Array.from(doc.querySelectorAll('table'));
      tables.forEach((table) => {
        const rows = Array.from(table.querySelectorAll('tr'));
        if (rows.length === 0) return;

        // Determine max column count across rows (accounting for colspan)
        let maxCols = 0;
        const rowColCounts: number[] = [];

        rows.forEach((tr) => {
          let cols = 0;
          Array.from(tr.children).forEach((child) => {
            const colspan = parseInt(child.getAttribute('colspan') || '1', 10);
            cols += isNaN(colspan) || colspan < 1 ? 1 : colspan;
          });
          rowColCounts.push(cols);
          if (cols > maxCols) maxCols = cols;
        });

        if (maxCols <= 1) return;

        // Remove rigid <colgroup> definitions that restrict the table to fewer columns
        const colgroups = table.querySelectorAll('colgroup, col');
        colgroups.forEach((cg) => cg.remove());

        // Ensure table has clean width
        table.style.width = '100%';

        // Pad shorter rows with empty cells or expand single-cell full-width headers
        rows.forEach((tr, rIdx) => {
          const currentCols = rowColCounts[rIdx];
          const children = Array.from(tr.children) as HTMLElement[];

          // If row has a single cell spanning the table header, expand its colspan to maxCols
          if (children.length === 1 && (children[0].hasAttribute('colspan') || currentCols < maxCols)) {
            const onlyCell = children[0];
            const textLen = onlyCell.textContent?.trim().length || 0;
            if (textLen > 0 && rIdx === 0) {
              onlyCell.setAttribute('colspan', String(maxCols));
              return;
            }
          }

          if (currentCols < maxCols) {
            const needed = maxCols - currentCols;
            const templateCell = children[children.length - 1] || children[0];
            for (let k = 0; k < needed; k++) {
              if (templateCell) {
                const newTd = templateCell.cloneNode(false) as HTMLElement;
                newTd.removeAttribute('colspan');
                newTd.removeAttribute('rowspan');
                newTd.innerHTML = '';
                newTd.style.width = '';
                tr.appendChild(newTd);
              } else {
                const newTd = doc.createElement('td');
                tr.appendChild(newTd);
              }
            }
          }

          // Normalize cell widths
          children.forEach((c) => {
            if (c.style.width && (c.style.width.includes('pt') || c.style.width.includes('px') || c.style.width.includes('%'))) {
              c.style.width = '';
            }
          });
        });
      });

      // Clean up any stray split comments outside tables
      const output = doc.body.innerHTML
        .replace(/<!-- spr-cell-split -->/g, ' &nbsp; ')
        .replace(/<!-- spr-row-cell-split -->/g, '<br>');

      return output;
    } catch (e) {
      console.warn('Table cell split expansion failed', e);
    }
  }

  // Fallback if DOMParser is unavailable
  return html
    .replace(/<!-- spr-cell-split -->/g, ' &nbsp; ')
    .replace(/<!-- spr-row-cell-split -->/g, '<br>');
}

/**
 * Merges template HTML with a single record or multiple records with smart fuzzy key matching.
 */
export function mergeTemplateWithData(
  templateHtml: string,
  dataRecord: Record<string, any>
): string {
  if (!templateHtml || !dataRecord) return templateHtml;
  let sanitized = sanitizeDocxPlaceholders(templateHtml);

  // Expand any nested arrays or repeating table rows generically
  sanitized = expandNestedArraysAndTables(sanitized, dataRecord);

  const lookup = buildEnrichedLookup(dataRecord);

  // Apply Document-Level Skip & Line Removal for tokens matching skipData + removeLine
  sanitized = applyDocumentSkipAndRemoveLines(sanitized, lookup);

  // Match any {{placeholder}} or {placeholder}
  const merged = sanitized.replace(/\{\{([\s\S]*?)\}\}/g, (fullMatch, token) => {
    const resolved = resolveTokenValue(token.trim(), lookup, 'html');
    return resolved !== null ? resolved : fullMatch;
  });

  return expandTableCellSplits(merged);
}

/**
 * Ultra-fast bulk merges template HTML across multiple records into distinct printable page HTML blocks.
 * Sanitizes template ONCE, avoids repeated regex compiling, and separates styles to prevent CSSOM lockup.
 */
export function bulkMergeTemplate(
  templateHtml: string,
  records: Array<Record<string, any>>
): string[] {
  if (!records || records.length === 0) {
    return [templateHtml];
  }

  // Separate style tags from template body so styles aren't duplicated 100 times in memory
  const { styles, body } = separateDocxStylesAndBody(templateHtml);
  const targetBody = body || templateHtml;

  return records.map((record) => {
    const finalHtml = mergeTemplateWithData(targetBody, record);
    return styles ? `${styles}\n${finalHtml}` : finalHtml;
  });
}
