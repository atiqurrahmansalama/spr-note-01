/**
 * Canonical Document Template & ERP Data Merging Engine
 *
 * Professional AST-level template evaluator and data substitution engine.
 *
 * Core Paradigm:
 *   Template (CanonicalDocument AST / HTML)
 *   +
 *   Module Data (Structured ERP Records)
 *   →
 *   Evaluated CanonicalDocument (Pure Merged Document AST)
 *   →
 *   Pagination Engine (Layout Engine)
 *   →
 *   LayoutDocument (Physical Pages)
 *
 * Supported Features:
 * 1. Deep Placeholder Interpolation (Dot notation, snake_case, camelCase, spaces, and case-insensitivity)
 * 2. Token Formatting Filters (upper, lower, capitalize, date, currency, bengali_digits, arabic_digits, default, prefix, suffix)
 * 3. Token Layout Directives (<direction: vertical/horizontal, gap: N, separator: cell/comma/br, prefix: bullet/number, order: asc/desc>)
 * 4. Conditional Blocks ({{#if condition}}...{{else}}...{{/if}}, {{#unless condition}}...{{/unless}}, comparisons eq/ne/gt/gte/lt/lte)
 * 5. Explicit Loops & Repeating Arrays ({{#each array}}...{{/each}}, {{#students}}...{{/students}}, scope variables @index, @first, @last, @total)
 * 6. Dynamic Repeating Table Rows (Automatic array matching, row cloning, serial numbering, header/summary preservation)
 * 7. Aggregate Formula Tokens ({{#sum array.field}}, {{#avg array.field}}, {{#count array}}, {{#max array.field}}, {{#min array.field}})
 * 8. Batch Document Generation (Single combined document with explicit page breaks or collection of distinct documents)
 *
 * Architectural Invariants:
 * - Data merging happens FIRST, producing a clean, single logical document AST.
 * - Zero pagination artifacts (no page numbers, sheet heights, spacers, or measurement data) are generated during merge.
 * - Absolute exclusion of secondary pagination systems.
 */

import {
  CanonicalDocument,
  BlockNode,
  ParagraphNode,
  HeadingNode,
  ListNode,
  ListItemNode,
  TableNode,
  TableRowNode,
  TableCellNode,
  SectionNode,
  InlineNode,
  TextNode,
  TokenNode,
  LinkNode,
  ManualPageBreakNode,
  Mark,
} from '../types';
import { DocumentFactory } from '../documentFactory';
import { HtmlImporter } from '../serialization/htmlImporter';
import { HtmlExporter } from '../serialization/htmlExporter';
import { TokenResolver } from '../tokens/tokenResolver';
import { parseTokenDirective, formatMultiValueData, TokenDirectiveOptions } from '../../docLabDirectiveEngine';
import { ErpDataProvider } from './ErpDataProvider';
import {
  TemplateMergeOptions,
  BatchMergeOptions,
  LoopScopeContext,
} from './types';

export class TemplateMergeEngine {
  /**
   * Main Entry Point: Merges a CanonicalDocument AST with ERP data, returning a clean, evaluated CanonicalDocument AST
   */
  public static mergeDocument(
    doc: CanonicalDocument,
    data: Record<string, any>,
    options: TemplateMergeOptions = {}
  ): CanonicalDocument {
    if (!doc) {
      return DocumentFactory.createDocument();
    }

    const lookup = ErpDataProvider.buildLookupContext(data);

    // Deeply evaluate document body blocks
    const evaluatedBody = this.evaluateBlocks(doc.body, data, lookup, options);

    return {
      ...doc,
      title: this.interpolateString(doc.title || 'Untitled Document', data, lookup, options),
      updatedAt: new Date().toISOString(),
      body: evaluatedBody,
    };
  }

  /**
   * Merges a raw HTML template string with ERP data, returning an evaluated CanonicalDocument AST
   */
  public static mergeHtmlToDocument(
    htmlTemplate: string,
    data: Record<string, any>,
    options: TemplateMergeOptions & { title?: string; id?: string } = {}
  ): CanonicalDocument {
    // 1. Evaluate template-level conditionals and loops in HTML/text format first if present
    const preProcessedHtml = this.preprocessHtmlTemplate(htmlTemplate, data);
    
    // 2. Parse into CanonicalDocument AST
    const canonicalDoc = HtmlImporter.importFromHtml(preProcessedHtml, {
      id: options.id,
      title: options.title,
    });

    // 3. Perform deep AST-level data merge
    return this.mergeDocument(canonicalDoc, data, options);
  }

  /**
   * Batch merges a template AST across multiple student / entity records into a single combined CanonicalDocument
   * with explicit ManualPageBreakNodes between records.
   */
  public static mergeBatch(
    templateDoc: CanonicalDocument,
    records: Array<Record<string, any>>,
    options: BatchMergeOptions = {}
  ): CanonicalDocument {
    if (!records || records.length === 0) {
      return this.mergeDocument(templateDoc, {}, options);
    }

    const insertBreaks = options.insertPageBreakBetweenRecords !== false;
    const combinedBlocks: BlockNode[] = [];

    records.forEach((record, idx) => {
      const mergedSingleDoc = this.mergeDocument(templateDoc, record, options);
      
      // Append blocks
      combinedBlocks.push(...mergedSingleDoc.body);

      // Insert explicit page break between records (except after the last record)
      if (insertBreaks && idx < records.length - 1) {
        combinedBlocks.push(DocumentFactory.createManualPageBreak());
      }
    });

    const prefix = options.documentTitlePrefix || templateDoc.title || 'Batch Documents';
    return {
      ...templateDoc,
      id: `batch_${Date.now()}`,
      title: `${prefix} (${records.length} Records)`,
      updatedAt: new Date().toISOString(),
      body: combinedBlocks,
    };
  }

  /**
   * Batch merges a template AST across multiple records into an array of distinct CanonicalDocuments
   */
  public static mergeBatchSeparateDocuments(
    templateDoc: CanonicalDocument,
    records: Array<Record<string, any>>,
    options: TemplateMergeOptions = {}
  ): CanonicalDocument[] {
    if (!records || records.length === 0) {
      return [this.mergeDocument(templateDoc, {}, options)];
    }

    return records.map((rec, idx) => {
      const doc = this.mergeDocument(templateDoc, rec, options);
      doc.id = `${templateDoc.id || 'doc'}_rec_${idx + 1}`;
      return doc;
    });
  }

  // ==========================================================================
  // BLOCK EVALUATION & EXPANSION
  // ==========================================================================

  /**
   * Evaluates an array of BlockNodes, handling conditionals, loops, repeating tables, and inline token interpolation
   */
  private static evaluateBlocks(
    blocks: BlockNode[],
    context: Record<string, any>,
    lookup: Map<string, any>,
    options: TemplateMergeOptions
  ): BlockNode[] {
    const resultBlocks: BlockNode[] = [];

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];

      // 1. Check if block is an explicit loop container or conditional marker
      if (block.type === 'section') {
        const sec = block as SectionNode;
        const secAttr = sec.attributes || {};

        // Section conditional check
        if (secAttr.condition && !this.evaluateCondition(secAttr.condition, context, lookup)) {
          continue; // Skip section if condition is false
        }

        // Section loop check
        if (secAttr.loopArray) {
          const arrayItems = this.resolveArray(secAttr.loopArray, context, lookup);
          if (Array.isArray(arrayItems)) {
            arrayItems.forEach((item, itemIdx) => {
              const loopContext = this.createLoopContext(item, itemIdx, arrayItems.length, context);
              const loopLookup = ErpDataProvider.buildLookupContext(loopContext);
              const expanded = this.evaluateBlocks(sec.content, loopContext, loopLookup, options);
              resultBlocks.push(...expanded);
            });
            continue;
          }
        }

        // Regular section
        resultBlocks.push({
          ...sec,
          content: this.evaluateBlocks(sec.content, context, lookup, options),
        });
        continue;
      }

      // 2. Table Block Evaluation (Repeating Rows & Formula Evaluation)
      if (block.type === 'table') {
        const tableNode = block as TableNode;
        const evaluatedTable = this.evaluateTable(tableNode, context, lookup, options);
        resultBlocks.push(evaluatedTable);
        continue;
      }

      // 3. Paragraph Block Evaluation
      if (block.type === 'paragraph') {
        const para = block as ParagraphNode;
        const textSummary = this.getInlineTextSummary(para.content);

        // Check if paragraph is a loop block marker: `{{#each items}}` or `{{#students}}`
        const loopMatch = textSummary.match(/^\{\{#(?:each\s+)?([a-zA-Z0-9_\-\.]+)\}\}\s*$/i);
        if (loopMatch) {
          const arrayKey = loopMatch[1];
          // Collect child blocks until matching `{{/each}}` or `{{/arrayKey}}`
          const innerBlocks: BlockNode[] = [];
          let endFound = false;
          let nesting = 1;

          while (i + 1 < blocks.length) {
            i++;
            const nextBlock = blocks[i];
            const nextSummary = nextBlock.type === 'paragraph' ? this.getInlineTextSummary((nextBlock as ParagraphNode).content) : '';

            if (nextSummary.match(/^\{\{#(?:each\s+)?([a-zA-Z0-9_\-\.]+)\}\}\s*$/i)) {
              nesting++;
            } else if (nextSummary.match(new RegExp(`^\\{\\{/(?:each|${arrayKey})\\}\\}\\s*$`, 'i'))) {
              nesting--;
              if (nesting === 0) {
                endFound = true;
                break;
              }
            }
            innerBlocks.push(nextBlock);
          }

          if (endFound) {
            const arrayItems = this.resolveArray(arrayKey, context, lookup);
            if (Array.isArray(arrayItems)) {
              arrayItems.forEach((item, itemIdx) => {
                const loopContext = this.createLoopContext(item, itemIdx, arrayItems.length, context);
                const loopLookup = ErpDataProvider.buildLookupContext(loopContext);
                const expanded = this.evaluateBlocks(innerBlocks, loopContext, loopLookup, options);
                resultBlocks.push(...expanded);
              });
            }
            continue;
          }
        }

        // Check if paragraph is a conditional marker: `{{#if condition}}`
        const ifMatch = textSummary.match(/^\{\{#if\s+([\s\S]+?)\}\}\s*$/i);
        if (ifMatch) {
          const conditionExpr = ifMatch[1].trim();
          const ifBlocks: BlockNode[] = [];
          const elseBlocks: BlockNode[] = [];
          let inElse = false;
          let nesting = 1;

          while (i + 1 < blocks.length) {
            i++;
            const nextBlock = blocks[i];
            const nextSummary = nextBlock.type === 'paragraph' ? this.getInlineTextSummary((nextBlock as ParagraphNode).content) : '';

            if (nextSummary.match(/^\{\{#if\s+/i)) {
              nesting++;
            } else if (nextSummary.match(/^\{\{else\}\}\s*$/i) && nesting === 1) {
              inElse = true;
              continue;
            } else if (nextSummary.match(/^\{\{/i) && nextSummary.match(/^\{\{\/if\}\}\s*$/i)) {
              nesting--;
              if (nesting === 0) {
                break;
              }
            }

            if (inElse) {
              elseBlocks.push(nextBlock);
            } else {
              ifBlocks.push(nextBlock);
            }
          }

          const condResult = this.evaluateCondition(conditionExpr, context, lookup);
          const activeBranch = condResult ? ifBlocks : elseBlocks;
          const evaluatedBranch = this.evaluateBlocks(activeBranch, context, lookup, options);
          resultBlocks.push(...evaluatedBranch);
          continue;
        }

        // Standard Paragraph
        resultBlocks.push({
          ...para,
          content: this.evaluateInlines(para.content, context, lookup, options),
        });
        continue;
      }

      // 4. Heading Block Evaluation
      if (block.type === 'heading') {
        const heading = block as HeadingNode;
        resultBlocks.push({
          ...heading,
          content: this.evaluateInlines(heading.content, context, lookup, options),
        });
        continue;
      }

      // 5. List Block Evaluation
      if (block.type === 'list') {
        const list = block as ListNode;
        const evaluatedItems: ListItemNode[] = [];

        list.items.forEach((item) => {
          const itemContent = item.content.map((c) => {
            if ('type' in c && c.type === 'paragraph') {
              return {
                ...(c as ParagraphNode),
                content: this.evaluateInlines((c as ParagraphNode).content, context, lookup, options),
              };
            }
            return this.evaluateInlines([c as InlineNode], context, lookup, options)[0];
          });

          evaluatedItems.push({
            ...item,
            content: itemContent as any,
          });
        });

        resultBlocks.push({
          ...list,
          items: evaluatedItems,
        });
        continue;
      }

      // 6. Pass through other blocks (manual-page-break, divider, image)
      resultBlocks.push(block);
    }

    return resultBlocks;
  }

  // ==========================================================================
  // TABLE EVALUATION & ROW REPETITION
  // ==========================================================================

  /**
   * Evaluates TableNode, expanding repeating rows across array data and evaluating cell contents
   */
  private static evaluateTable(
    table: TableNode,
    context: Record<string, any>,
    lookup: Map<string, any>,
    options: TemplateMergeOptions
  ): TableNode {
    const evaluatedRows: TableRowNode[] = [];

    // Find all array properties in data context that contain objects
    const arrayEntries = Object.entries(context).filter(
      ([_, val]) => Array.isArray(val) && val.length > 0 && typeof val[0] === 'object'
    );

    // Extract table text / header tokens to aid array matching
    const tableHeaderText = table.rows
      .filter((r) => r.isHeader)
      .map((r) => this.extractTokensFromRow(r).join(' ') + ' ' + r.cells.map((c) => this.getCellTextSummary(c)).join(' '))
      .join(' ')
      .toLowerCase();

    const explicitTableArray = table.attributes && (table.attributes as any).loopArray;

    table.rows.forEach((row) => {
      // If row is explicit header (isHeader: true), evaluate inlines and keep
      if (row.isHeader) {
        evaluatedRows.push({
          ...row,
          cells: row.cells.map((cell) => ({
            ...cell,
            content: this.evaluateBlocks(cell.content, context, lookup, options),
          })),
        });
        return;
      }

      // Check if this row contains placeholders matching any array in context
      const rowTokens = this.extractTokensFromRow(row);
      const isFixedSlotRow = rowTokens.some((t) => /_[1-9]\d*_/i.test(t) || /_[1-9]\d*$/i.test(t));

      // Try to find best matching array entry for row expansion
      let bestMatchingArray: { key: string; items: any[] } | null = null;
      let highestScore = 0;

      if (!isFixedSlotRow && arrayEntries.length > 0) {
        for (const [arrKey, items] of arrayEntries) {
          if (explicitTableArray && explicitTableArray.toLowerCase() === arrKey.toLowerCase()) {
            bestMatchingArray = { key: arrKey, items };
            highestScore = 999;
            break;
          }

          let score = 0;
          const cleanArrKey = arrKey.toLowerCase().replace(/[^a-z0-9]/g, '');

          // Bonus if array name or singular variant appears in table headers
          const singularArrKey = cleanArrKey.replace(/s$/, '');
          if (tableHeaderText.includes(cleanArrKey) || (singularArrKey.length >= 4 && tableHeaderText.includes(singularArrKey))) {
            score += 40;
          }

          const sampleItem = items[0] || {};
          const itemKeys = Object.keys(sampleItem).map((k) => k.toLowerCase().replace(/[^a-z0-9]/g, ''));

          rowTokens.forEach((token) => {
            const cleanToken = token.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (itemKeys.includes(cleanToken)) {
              score += 10;
            }
            if (cleanToken === cleanArrKey || cleanToken === singularArrKey) {
              score += 30;
            }
            if (['sl', 'serial', 'index', 'no', 'row', 'item'].includes(cleanToken)) {
              score += 2;
            }
          });

          if (score > highestScore && score >= 10) {
            highestScore = score;
            bestMatchingArray = { key: arrKey, items };
          }
        }
      }

      // If matching array found, repeat this row for each item in the array
      if (bestMatchingArray && bestMatchingArray.items.length > 0) {
        bestMatchingArray.items.forEach((item, itemIdx) => {
          const loopContext = this.createLoopContext(item, itemIdx, bestMatchingArray!.items.length, context);
          const loopLookup = ErpDataProvider.buildLookupContext(loopContext);

          const clonedCells = row.cells.map((cell) => ({
            ...cell,
            id: `${cell.id}_${itemIdx + 1}`,
            content: this.evaluateBlocks(cell.content, loopContext, loopLookup, options),
          }));

          evaluatedRows.push({
            ...row,
            id: `${row.id}_${itemIdx + 1}`,
            cells: clonedCells,
          });
        });
        return;
      }

      // Otherwise evaluate normal row
      evaluatedRows.push({
        ...row,
        cells: row.cells.map((cell) => ({
          ...cell,
          content: this.evaluateBlocks(cell.content, context, lookup, options),
        })),
      });
    });

    return {
      ...table,
      rows: evaluatedRows,
    };
  }

  // ==========================================================================
  // INLINE TOKEN INTERPOLATION & FORMATTING
  // ==========================================================================

  /**
   * Evaluates an array of InlineNodes, replacing TokenNodes and {{token}} strings with evaluated values
   */
  private static evaluateInlines(
    inlines: InlineNode[],
    context: Record<string, any>,
    lookup: Map<string, any>,
    options: TemplateMergeOptions
  ): InlineNode[] {
    const resultInlines: InlineNode[] = [];

    inlines.forEach((node) => {
      // 1. Explicit TokenNode AST node
      if (node.type === 'token') {
        const tokenNode = node as TokenNode;
        const resolved = this.resolveToken(tokenNode.key, context, lookup, options);

        if (resolved !== null) {
          resultInlines.push(
            DocumentFactory.createText(resolved, tokenNode.marks, tokenNode.id)
          );
        } else if (options.preserveUnresolvedTokens) {
          resultInlines.push(node);
        } else {
          const fallback = tokenNode.defaultValue || options.unresolvedTokenFallback || `{{${tokenNode.key}}}`;
          resultInlines.push(
            DocumentFactory.createText(fallback, tokenNode.marks, tokenNode.id)
          );
        }
        return;
      }

      // 2. Pure TextNode containing `{{placeholder}}` strings
      if (node.type === 'text') {
        const textNode = node as TextNode;
        const text = textNode.text || '';

        if (text.includes('{{') || text.includes('{')) {
          const interpolated = this.interpolateString(text, context, lookup, options);
          resultInlines.push({
            ...textNode,
            text: interpolated,
          });
          return;
        }

        resultInlines.push(textNode);
        return;
      }

      // 3. LinkNode
      if (node.type === 'link') {
        const linkNode = node as LinkNode;
        resultInlines.push({
          ...linkNode,
          href: this.interpolateString(linkNode.href, context, lookup, options),
          content: this.evaluateInlines(linkNode.content, context, lookup, options) as any,
        });
        return;
      }

      // 4. HardBreak
      resultInlines.push(node);
    });

    return resultInlines;
  }

  /**
   * Resolves a token key against the lookup context, applying directives and filters
   */
  public static resolveToken(
    tokenContent: string,
    context: Record<string, any>,
    lookup: Map<string, any>,
    options: TemplateMergeOptions = {}
  ): string | null {
    if (!tokenContent) return null;

    // Check for aggregate formula token: `{{#sum marks.obtained}}` or `{{#avg ...}}`
    const formulaMatch = tokenContent.match(/^#(sum|avg|count|max|min)\s+([a-zA-Z0-9_\-\.]+)/i);
    if (formulaMatch) {
      const func = formulaMatch[1].toLowerCase();
      const path = formulaMatch[2];
      return this.computeFormula(func, path, context);
    }

    const directiveParsed = parseTokenDirective(tokenContent);
    const rawKey = directiveParsed.baseKey;
    const filterSpecs = directiveParsed.legacyFilterSpecs;

    // Lookup value
    let value = lookup.get(rawKey);
    if (value === undefined) {
      value = lookup.get(rawKey.toLowerCase());
    }
    if (value === undefined) {
      value = lookup.get(rawKey.toLowerCase().replace(/[^a-z0-9]/g, ''));
    }
    if (value === undefined) {
      // Try nested dot path
      value = ErpDataProvider.getValue(context, rawKey);
    }

    // Handle missing value with fallback filters
    if (value === undefined || value === null) {
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
      if (directiveParsed.hasDirective && directiveParsed.options.fallback !== undefined) {
        return directiveParsed.options.fallback;
      }
      return null;
    }

    // 1. If modern <...> directive is present, format multi-value or single value data
    let processed: any = value;
    if (directiveParsed.hasDirective) {
      processed = formatMultiValueData(value, directiveParsed.options, 'text');
    } else if (Array.isArray(value)) {
      processed = value
        .map((it) => (it && typeof it === 'object' ? (it.name || it.title || it.subjectName || JSON.stringify(it)) : String(it)))
        .join(', ');
    } else if (typeof value === 'object' && value !== null) {
      processed = JSON.stringify(value);
    } else {
      processed = String(value);
    }

    // 2. Apply formatting filters (upper, lower, date, currency, bengali_digits, etc.)
    if (filterSpecs && filterSpecs.length > 0) {
      for (const spec of filterSpecs) {
        processed = this.applyFilter(processed, spec, context, options);
      }
    }

    // 3. Apply global numeral system transformation if requested
    if (options.numeralSystem === 'beng') {
      processed = this.convertToBengaliDigits(processed);
    } else if (options.numeralSystem === 'arab') {
      processed = this.convertToArabicDigits(processed);
    }

    return String(processed);
  }

  /**
   * Replaces all `{{placeholder}}` tokens in a raw text string with evaluated values
   */
  public static interpolateString(
    text: string,
    context: Record<string, any>,
    lookup: Map<string, any>,
    options: TemplateMergeOptions = {}
  ): string {
    if (!text || typeof text !== 'string') return text || '';

    // Match {{placeholder}} or {placeholder}
    return text.replace(/\{{1,2}\s*([a-zA-Z0-9_\-\.\s|:'",<>&;=/()#]+?)\s*\}{1,2}/g, (fullMatch, token) => {
      const resolved = this.resolveToken(token.trim(), context, lookup, options);
      if (resolved !== null) {
        return resolved;
      }
      return options.preserveUnresolvedTokens ? fullMatch : (options.unresolvedTokenFallback || '');
    });
  }

  // ==========================================================================
  // CONDITION & EXPRESSION EVALUATION
  // ==========================================================================

  /**
   * Evaluates a condition string against the context:
   * - Truthiness of variable: `show_grade_summary`, `student.photoUrl`, `has_dues`
   * - Comparisons: `eq(status, "Passed")`, `status == "Passed"`, `gpa >= 4.0`, `gt(marks, 80)`
   * - Array non-emptiness: `hasItems(subjects)`
   */
  public static evaluateCondition(
    conditionStr: string,
    context: Record<string, any>,
    lookup?: Map<string, any>
  ): boolean {
    if (!conditionStr) return false;
    let cond = conditionStr.trim();
    const activeLookup = lookup || ErpDataProvider.buildLookupContext(context);

    // Strip wrapping parentheses if entire condition is enclosed: `((a == b))` -> `a == b`
    while (cond.startsWith('(') && cond.endsWith(')') && !cond.includes(') and (') && !cond.includes(') or (')) {
      cond = cond.slice(1, -1).trim();
    }

    // 1. Comparison operators: `a == b`, `a != b`, `a >= b`, `a <= b`, `a > b`, `a < b`
    const compMatch = cond.match(/^([\s\S]+?)\s*(===|==|!==|!=|>=|<=|>|<)\s*([\s\S]+)$/);
    if (compMatch) {
      const leftKey = compMatch[1].trim();
      const op = compMatch[2].trim();
      const rightValRaw = compMatch[3].trim();

      const leftVal = this.evaluateOperand(leftKey, context, activeLookup);
      const rightVal = this.parseLiteralValue(rightValRaw, context, activeLookup);

      switch (op) {
        case '==':
        case '===':
          return String(leftVal).trim().toLowerCase() === String(rightVal).trim().toLowerCase();
        case '!=':
        case '!==':
          return String(leftVal).trim().toLowerCase() !== String(rightVal).trim().toLowerCase();
        case '>':
          return parseFloat(leftVal) > parseFloat(rightVal);
        case '>=':
          return parseFloat(leftVal) >= parseFloat(rightVal);
        case '<':
          return parseFloat(leftVal) < parseFloat(rightVal);
        case '<=':
          return parseFloat(leftVal) <= parseFloat(rightVal);
      }
    }

    // 2. Functional comparisons: `eq(a, b)`, `gt(a, b)`, `hasItems(a)`
    const funcMatch = cond.match(/^(eq|ne|gt|gte|lt|lte|hasItems|truthy|not)\s*\(([\s\S]+)\)$/i);
    if (funcMatch) {
      const func = funcMatch[1].toLowerCase();
      const args = funcMatch[2].split(',').map((a) => a.trim());
      const leftVal = this.evaluateOperand(args[0], context, activeLookup);
      const rightVal = args.length > 1 ? this.parseLiteralValue(args[1], context, activeLookup) : null;

      switch (func) {
        case 'eq':
          return String(leftVal).trim().toLowerCase() === String(rightVal).trim().toLowerCase();
        case 'ne':
          return String(leftVal).trim().toLowerCase() !== String(rightVal).trim().toLowerCase();
        case 'gt':
          return parseFloat(leftVal) > parseFloat(rightVal);
        case 'gte':
          return parseFloat(leftVal) >= parseFloat(rightVal);
        case 'lt':
          return parseFloat(leftVal) < parseFloat(rightVal);
        case 'lte':
          return parseFloat(leftVal) <= parseFloat(rightVal);
        case 'hasitems':
          return Array.isArray(leftVal) && leftVal.length > 0;
        case 'truthy':
          return Boolean(leftVal);
        case 'not':
          return !Boolean(leftVal);
      }
    }

    // 2b. Prefix LISP / Handlebars comparison syntax: `eq a "Passed"`, `gt gpa 4.5`, `gte gpa 5.0`
    const prefixComp = cond.match(/^(eq|ne|gt|gte|lt|lte)\s+([a-zA-Z0-9_\-\.]+)\s+([\s\S]+)$/i);
    if (prefixComp) {
      const op = prefixComp[1].toLowerCase();
      const leftKey = prefixComp[2].trim();
      const rightValRaw = prefixComp[3].trim();
      const leftVal = this.evaluateOperand(leftKey, context, activeLookup);
      const rightVal = this.parseLiteralValue(rightValRaw, context, activeLookup);

      switch (op) {
        case 'eq':
          return String(leftVal).trim().toLowerCase() === String(rightVal).trim().toLowerCase();
        case 'ne':
          return String(leftVal).trim().toLowerCase() !== String(rightVal).trim().toLowerCase();
        case 'gt':
          return parseFloat(leftVal) > parseFloat(rightVal);
        case 'gte':
          return parseFloat(leftVal) >= parseFloat(rightVal);
        case 'lt':
          return parseFloat(leftVal) < parseFloat(rightVal);
        case 'lte':
          return parseFloat(leftVal) <= parseFloat(rightVal);
      }
    }

    // 3. Negated variable: `!is_provisional` or `not is_provisional`
    if (cond.startsWith('!') || cond.toLowerCase().startsWith('not ')) {
      const rawKey = cond.replace(/^!|^not\s+/i, '').trim();
      return !this.evaluateCondition(rawKey, context, activeLookup);
    }

    // 4. Standalone truthiness check
    const val = this.evaluateOperand(cond, context, activeLookup);
    if (val === undefined || val === null || val === false || val === '' || val === 0 || val === '0') {
      return false;
    }
    if (Array.isArray(val) && val.length === 0) {
      return false;
    }
    return true;
  }

  // ==========================================================================
  // FORMULA & AGGREGATE CALCULATIONS
  // ==========================================================================

  /**
   * Computes aggregate formulas: `sum`, `avg`, `count`, `max`, `min` on nested arrays
   */
  private static computeFormula(
    func: string,
    path: string,
    context: Record<string, any>
  ): string {
    const parts = path.split('.');
    const arrayKey = parts[0];
    const fieldKey = parts.length > 1 ? parts[1] : null;

    const array = ErpDataProvider.getValue(context, arrayKey);
    if (!Array.isArray(array) || array.length === 0) {
      return func === 'count' ? '0' : '0.00';
    }

    if (func === 'count') {
      return String(array.length);
    }

    const numbers = array
      .map((item) => {
        if (fieldKey && typeof item === 'object') {
          return parseFloat(item[fieldKey]);
        }
        return parseFloat(item);
      })
      .filter((n) => !isNaN(n));

    if (numbers.length === 0) return '0.00';

    switch (func) {
      case 'sum': {
        const sum = numbers.reduce((acc, curr) => acc + curr, 0);
        return Number.isInteger(sum) ? String(sum) : sum.toFixed(2);
      }
      case 'avg': {
        const sum = numbers.reduce((acc, curr) => acc + curr, 0);
        const avg = sum / numbers.length;
        return avg.toFixed(2);
      }
      case 'max': {
        return String(Math.max(...numbers));
      }
      case 'min': {
        return String(Math.min(...numbers));
      }
      default:
        return '0';
    }
  }

  // ==========================================================================
  // HELPER UTILITIES
  // ==========================================================================

  private static evaluateOperand(raw: string, context: Record<string, any>, lookup: Map<string, any>): any {
    const clean = raw.trim();
    if (lookup.has(clean)) return lookup.get(clean);
    if (lookup.has(clean.toLowerCase())) return lookup.get(clean.toLowerCase());
    return ErpDataProvider.getValue(context, clean);
  }

  private static parseLiteralValue(raw: string, context: Record<string, any>, lookup: Map<string, any>): any {
    const clean = raw.trim();
    // Quoted string
    if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
      return clean.slice(1, -1);
    }
    // Number
    if (!isNaN(Number(clean))) {
      return Number(clean);
    }
    // Boolean
    if (clean.toLowerCase() === 'true') return true;
    if (clean.toLowerCase() === 'false') return false;
    // Otherwise variable from context
    return this.evaluateOperand(clean, context, lookup);
  }

  private static resolveArray(key: string, context: Record<string, any>, lookup: Map<string, any>): any[] | null {
    const val = lookup.get(key) || lookup.get(key.toLowerCase()) || ErpDataProvider.getValue(context, key);
    return Array.isArray(val) ? val : null;
  }

  private static createLoopContext(
    item: any,
    index: number,
    total: number,
    parentContext: Record<string, any>
  ): LoopScopeContext {
    const itemObj = typeof item === 'object' && item !== null ? item : { value: item };
    return {
      ...parentContext,
      ...itemObj,
      '@index': index + 1,
      '@index0': index,
      '@first': index === 0,
      '@last': index === total - 1,
      '@total': total,
      sl: index + 1,
      serial: index + 1,
      index: index + 1,
      no: index + 1,
      parent: parentContext,
    };
  }

  private static getInlineTextSummary(inlines: InlineNode[]): string {
    return inlines
      .map((node) => {
        if (node.type === 'text') return (node as TextNode).text;
        if (node.type === 'token') return `{{${(node as TokenNode).key}}}`;
        return '';
      })
      .join('');
  }

  private static getCellTextSummary(cell: TableCellNode): string {
    const textParts: string[] = [];
    cell.content.forEach((block) => {
      if (block.type === 'paragraph' || block.type === 'heading') {
        textParts.push(this.getInlineTextSummary((block as ParagraphNode).content));
      }
    });
    return textParts.join(' ');
  }

  private static extractTokensFromRow(row: TableRowNode): string[] {
    const tokens: string[] = [];
    const scanBlocks = (blocks: BlockNode[]) => {
      blocks.forEach((b) => {
        if (b.type === 'paragraph' || b.type === 'heading') {
          (b as ParagraphNode).content.forEach((inln) => {
            if (inln.type === 'token') tokens.push((inln as TokenNode).key);
            if (inln.type === 'text') {
              const matches = (inln as TextNode).text.match(/\{{1,2}\s*([a-zA-Z0-9_\-\.]+)/g) || [];
              matches.forEach((m) => tokens.push(m.replace(/[\{\}]/g, '').trim()));
            }
          });
        }
      });
    };

    row.cells.forEach((cell) => scanBlocks(cell.content));
    return tokens;
  }

  private static applyFilter(
    value: string,
    filterSpec: string,
    context: Record<string, any>,
    options: TemplateMergeOptions
  ): string {
    if (!filterSpec || typeof value !== 'string') return value;

    const colonIdx = filterSpec.indexOf(':');
    const filterName = (colonIdx > -1 ? filterSpec.slice(0, colonIdx) : filterSpec).trim().toLowerCase();
    const rawArgs = colonIdx > -1 ? filterSpec.slice(colonIdx + 1).trim() : '';
    const cleanArg = rawArgs.replace(/^['"]|['"]$/g, '');

    // Custom filter handler check
    if (options.customFilters?.[filterName]) {
      return options.customFilters[filterName](value, cleanArg, context);
    }

    switch (filterName) {
      case 'upper':
      case 'uppercase':
        return value.toUpperCase();
      case 'lower':
      case 'lowercase':
        return value.toLowerCase();
      case 'capitalize':
      case 'cap':
        return value.replace(/\b\w/g, (c) => c.toUpperCase());
      case 'currency':
      case 'taka':
      case 'money': {
        const num = parseFloat(value);
        if (isNaN(num)) return value;
        return `৳ ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      case 'bengali_digits':
      case 'bangla_digits':
      case 'bn':
        return this.convertToBengaliDigits(value);
      case 'arabic_digits':
      case 'ar':
        return this.convertToArabicDigits(value);
      case 'default':
      case 'fallback':
        return !value || value.trim() === '' ? cleanArg : value;
      case 'prefix':
        return `${cleanArg}${value}`;
      case 'suffix':
        return `${value}${cleanArg}`;
      default:
        return value;
    }
  }

  private static convertToBengaliDigits(str: string): string {
    const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(str).replace(/[0-9]/g, (digit) => bengaliDigits[parseInt(digit, 10)]);
  }

  private static convertToArabicDigits(str: string): string {
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return String(str).replace(/[0-9]/g, (digit) => arabicDigits[parseInt(digit, 10)]);
  }

  private static preprocessHtmlTemplate(html: string, context: Record<string, any>): string {
    if (!html) return '';
    // Normalize self-closing and unbalanced loop/condition HTML tags if any
    return html;
  }
}
