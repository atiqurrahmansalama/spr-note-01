/**
 * TemplateDataEngine.ts
 *
 * Professional Integration Layer for DocLab Dynamic Templates & ERP Data.
 *
 * ARCHITECTURE PIPELINE:
 *   Template (Canonical AST / HTML)
 *       ↓
 *   Resolve Data (TemplateDataEngine / TemplateMergeEngine)
 *       ↓
 *   Canonical Document AST (Evaluated, Stable Logical Node IDs)
 *       ↓
 *   Layout Engine (PaginationEngine with Real Browser Measurement)
 *       ↓
 *   Render (PagedEditorSurface / PrintPreviewSurface)
 *
 * KEY GUARANTEES:
 * 1. Decoupled Architecture: Template logic is 100% independent of pagination, paper geometry, and page breaks.
 * 2. Variable-Length Resolved Content: Dynamic tokens can expand into text, inlines, paragraphs, tables, images, or multi-block arrays.
 * 3. Stable Logical Identities: Resolved blocks & inlines receive deterministic, stable IDs to preserve caret, selection, and layout caches.
 * 4. Zero Height Estimation: No token height guesses; actual physical height is measured authoritatively during pagination.
 * 5. Incremental Regional Invalidation: Changing data triggers incremental change scope diffing so unaffected pages and blocks reuse cached measurements.
 */

import {
  CanonicalDocument,
  BlockNode,
  ParagraphNode,
  HeadingNode,
  TableNode,
  TableRowNode,
  TableCellNode,
  ImageNode,
  InlineNode,
  TextNode,
  TokenNode,
  Mark,
} from '../types';
import { DocumentFactory } from '../documentFactory';
import { HtmlImporter } from '../serialization/htmlImporter';
import { HtmlExporter } from '../serialization/htmlExporter';
import { TemplateAdapter } from '../adapters/templateAdapter';
import { TemplateMergeEngine } from './TemplateMergeEngine';
import { ErpDataProvider } from './ErpDataProvider';
import { TemplateMergeOptions } from './types';
import { LayoutDocumentOptions } from '../../layout/types/documentTypes';
import { LayoutDocument, PaginationEngineResult } from '../../layout/types/paginationTypes';
import { LayoutChangeScope } from '../../layout/types/performanceTypes';
import { PaginationEngine } from '../../layout/pagination/PaginationEngine';
import { IncrementalLayoutPlanner } from '../../layout/performance/IncrementalLayoutPlanner';

export interface TemplatePipelineOptions extends LayoutDocumentOptions {
  mergeOptions?: TemplateMergeOptions;
}

export interface TemplatePipelineResult {
  canonicalDocument: CanonicalDocument;
  layoutResult: PaginationEngineResult;
  changeScope?: LayoutChangeScope;
  isIncremental: boolean;
  resolvedTokenCount: number;
}

export class TemplateDataEngine {
  /**
   * Primary entry point: Resolves template data into an evaluated CanonicalDocument AST
   * with full support for variable-length expansion (text, inlines, tables, images, multiple blocks)
   * and stable logical identities.
   */
  public static resolveTemplate(
    template: CanonicalDocument | string | any,
    data: Record<string, any>,
    options: TemplateMergeOptions = {}
  ): CanonicalDocument {
    // 1. Normalize template to CanonicalDocument AST
    const baseDoc = TemplateAdapter.toCanonicalDocument(template, {
      title: typeof template === 'object' && template?.title ? template.title : 'Document Template',
    });

    const lookup = ErpDataProvider.buildLookupContext(data);

    // 2. Deeply evaluate body blocks with block-level token expansion & stable IDs
    const evaluatedBody = this.evaluateBlocks(baseDoc.body, data, lookup, options, baseDoc.id || 'doc');

    return {
      ...baseDoc,
      title: this.interpolateString(baseDoc.title || 'Untitled Document', data, lookup, options) || baseDoc.title,
      updatedAt: new Date().toISOString(),
      body: evaluatedBody,
    };
  }

  /**
   * Executes the full decoupled pipeline:
   * Template -> Resolve Data -> Canonical AST -> Incremental Invalidation -> Layout (PaginationEngine)
   */
  public static executePipeline(
    template: CanonicalDocument | string | any,
    data: Record<string, any>,
    options: TemplatePipelineOptions = {},
    prevLayout?: LayoutDocument | null,
    prevDoc?: CanonicalDocument | null
  ): TemplatePipelineResult {
    // Step 1 & 2: Resolve Data to Canonical Document AST
    const canonicalDocument = this.resolveTemplate(template, data, options.mergeOptions);

    // Step 3: Compute Incremental Change Scope if previous layout & doc exist
    let changeScope: LayoutChangeScope | undefined;
    if (prevLayout && prevDoc && prevLayout.pages && prevLayout.pages.length > 0) {
      changeScope = IncrementalLayoutPlanner.computeChangeScope(
        prevLayout,
        prevDoc.body,
        canonicalDocument.body,
        options
      );
    }

    // Step 4: Layout & Paginate with authoritative browser measurement
    const layoutResult = PaginationEngine.paginate(canonicalDocument, options, changeScope);

    const isIncremental = changeScope?.type === 'incremental';

    return {
      canonicalDocument,
      layoutResult,
      changeScope,
      isIncremental,
      resolvedTokenCount: this.countTokens(template),
    };
  }

  /**
   * Deeply evaluates an array of BlockNodes, expanding block-level tokens and applying stable IDs
   */
  private static evaluateBlocks(
    blocks: BlockNode[],
    data: Record<string, any>,
    lookup: Map<string, any>,
    options: TemplateMergeOptions,
    parentId: string
  ): BlockNode[] {
    const resultBlocks: BlockNode[] = [];

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const stableBlockId = block.id || `${parentId}_blk_${i}`;

      // A. Section Break or Section Container
      if (block.type === 'section-break') {
        resultBlocks.push({
          ...block,
          id: stableBlockId,
        });
        continue;
      }

      if (block.type === 'section') {
        const sec = block as any;
        resultBlocks.push({
          ...sec,
          id: stableBlockId,
          content: this.evaluateBlocks(sec.content || [], data, lookup, options, stableBlockId),
        });
        continue;
      }

      // B. Table Block Evaluation
      if (block.type === 'table') {
        const tableNode = block as TableNode;
        const evaluatedTable = this.evaluateTable(tableNode, data, lookup, options, stableBlockId);
        resultBlocks.push(evaluatedTable);
        continue;
      }

      // C. Paragraph Block Evaluation (Check for token expansion into tables, images, or multi-blocks)
      if (block.type === 'paragraph') {
        const para = block as ParagraphNode;
        const expandedBlocks = this.evaluateParagraphOrExpand(para, data, lookup, options, stableBlockId, i);
        resultBlocks.push(...expandedBlocks);
        continue;
      }

      // D. Heading Block Evaluation
      if (block.type === 'heading') {
        const heading = block as HeadingNode;
        resultBlocks.push({
          ...heading,
          id: stableBlockId,
          content: this.evaluateInlines(heading.content, data, lookup, options, stableBlockId),
        });
        continue;
      }

      // E. Pass-through other blocks with stable ID
      resultBlocks.push({
        ...block,
        id: stableBlockId,
      });
    }

    return resultBlocks;
  }

  /**
   * Evaluates a paragraph: if it contains a token that resolves to a table, image, multi-paragraph,
   * or block array, it expands cleanly into those blocks with stable IDs.
   */
  private static evaluateParagraphOrExpand(
    para: ParagraphNode,
    data: Record<string, any>,
    lookup: Map<string, any>,
    options: TemplateMergeOptions,
    blockId: string,
    index: number
  ): BlockNode[] {
    // 1. Check if paragraph is composed of a single token: e.g. `{{results}}` or `{{attendance_table}}`
    const soleTokenKey = this.extractSoleTokenKey(para);
    if (soleTokenKey) {
      const rawVal = this.getRawDataValue(soleTokenKey, data, lookup);

      if (rawVal !== undefined && rawVal !== null) {
        // (i) Array of objects -> Expand into a TableNode
        if (Array.isArray(rawVal) && rawVal.length > 0 && typeof rawVal[0] === 'object' && !('type' in rawVal[0])) {
          return [this.createTableFromArray(rawVal, `${blockId}_tbl`, soleTokenKey)];
        }

        // (ii) Raw HTML containing table or multi-block
        if (typeof rawVal === 'string' && (/<table\b/i.test(rawVal) || /<div\b/i.test(rawVal) || /<img\b/i.test(rawVal) || /<p\b/i.test(rawVal))) {
          const imported = HtmlImporter.importFromHtml(rawVal, { id: `${blockId}_imp` });
          if (imported.body.length > 0) {
            return imported.body.map((b, idx) => ({
              ...b,
              id: `${blockId}_exp_${idx}`,
            }));
          }
        }

        // (iii) Image object -> Expand into ImageNode
        if (typeof rawVal === 'object' && (rawVal.type === 'image' || rawVal.url || rawVal.src)) {
          return [
            DocumentFactory.createImage({
              id: `${blockId}_img`,
              src: rawVal.src || rawVal.url,
              alt: rawVal.alt || soleTokenKey,
              width: rawVal.width || 180,
              height: rawVal.height || 180,
            }),
          ];
        }

        // (iv) Multi-line text string with double line breaks -> Expand into multiple paragraphs
        if (typeof rawVal === 'string' && rawVal.includes('\n\n')) {
          const firstMarks = para.content[0] && 'marks' in para.content[0] ? (para.content[0] as any).marks : undefined;
          const paras = rawVal.split(/\n{2,}/).map((pText, pIdx) =>
            DocumentFactory.createParagraph({
              id: `${blockId}_p_${pIdx}`,
              content: [DocumentFactory.createText(pText.trim(), firstMarks)],
            })
          );
          return paras;
        }

        // (v) Array of canonical BlockNodes
        if (Array.isArray(rawVal) && rawVal.length > 0 && typeof rawVal[0] === 'object' && 'type' in rawVal[0]) {
          return rawVal.map((b: BlockNode, bIdx: number) => ({
            ...b,
            id: `${blockId}_blk_${bIdx}`,
          }));
        }
      }
    }

    // 2. Standard in-line evaluated paragraph
    const evaluatedInlines = this.evaluateInlines(para.content, data, lookup, options, blockId);
    return [
      {
        ...para,
        id: blockId,
        content: evaluatedInlines,
      },
    ];
  }

  /**
   * Checks if a paragraph consists solely of a single dynamic token
   */
  private static extractSoleTokenKey(para: ParagraphNode): string | null {
    if (para.content.length === 1) {
      const node = para.content[0];
      if (node.type === 'token') {
        return (node as TokenNode).key;
      }
      if (node.type === 'text') {
        const text = (node as TextNode).text.trim();
        const match = text.match(/^\{\{\s*([a-zA-Z0-9_\-\.]+)\s*\}\}$/);
        if (match) return match[1];
      }
    }
    return null;
  }

  /**
   * Retrieves raw data value from context by key or normalized key
   */
  public static getRawDataValue(key: string, data: Record<string, any>, lookup: Map<string, any>): any {
    if (lookup.has(key)) return lookup.get(key);
    if (lookup.has(key.toLowerCase())) return lookup.get(key.toLowerCase());
    const stripped = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (lookup.has(stripped)) return lookup.get(stripped);
    return ErpDataProvider.getValue(data, key);
  }

  /**
   * Evaluates TableNode, expanding repeating rows across array data and evaluating cell contents
   */
  private static evaluateTable(
    table: TableNode,
    data: Record<string, any>,
    lookup: Map<string, any>,
    options: TemplateMergeOptions,
    tableId: string
  ): TableNode {
    const evaluatedRows: TableRowNode[] = [];

    // Find array in data matching table
    const arrayEntries = Object.entries(data).filter(
      ([_, val]) => Array.isArray(val) && val.length > 0 && typeof val[0] === 'object'
    );

    const explicitLoopArray = table.attributes?.loopArray;

    table.rows.forEach((row, rowIdx) => {
      const stableRowId = row.id || `${tableId}_r_${rowIdx}`;

      if (row.isHeader) {
        evaluatedRows.push({
          ...row,
          id: stableRowId,
          cells: row.cells.map((cell, cellIdx) => ({
            ...cell,
            id: cell.id || `${stableRowId}_c_${cellIdx}`,
            content: this.evaluateBlocks(cell.content, data, lookup, options, `${stableRowId}_c_${cellIdx}`),
          })),
        });
        return;
      }

      // Check if row has tokens that match an array
      const rowTokens = this.extractTokensFromRow(row);
      let matchedArray: { key: string; items: any[] } | null = null;

      if (explicitLoopArray && (data[explicitLoopArray] || lookup.get(explicitLoopArray))) {
        const arr = data[explicitLoopArray] || lookup.get(explicitLoopArray);
        if (Array.isArray(arr)) {
          matchedArray = { key: explicitLoopArray, items: arr };
        }
      }

      if (!matchedArray) {
        for (const [arrKey, items] of arrayEntries) {
          const sample = items[0] || {};
          const sampleKeys = Object.keys(sample);
          const hasMatchingToken = rowTokens.some((tok) => {
            const cleanTok = tok.replace(/^(item|this|row)\./, '');
            return (
              tok.startsWith(arrKey + '.') ||
              tok.startsWith('item.') ||
              tok.startsWith('this.') ||
              tok.startsWith('row.') ||
              cleanTok in sample ||
              sampleKeys.includes(cleanTok)
            );
          });
          if (hasMatchingToken) {
            matchedArray = { key: arrKey, items };
            break;
          }
        }
      }

      if (matchedArray && matchedArray.items.length > 0) {
        matchedArray.items.forEach((item, itemIdx) => {
          const loopContext = {
            ...data,
            ...item,
            item,
            this: item,
            row: item,
            '@index': itemIdx,
            '@number': itemIdx + 1,
            '@first': itemIdx === 0,
            '@last': itemIdx === matchedArray!.items.length - 1,
            '@total': matchedArray!.items.length,
          };
          const loopLookup = ErpDataProvider.buildLookupContext(loopContext);
          const clonedRowId = `${stableRowId}_${itemIdx + 1}`;

          const clonedCells = row.cells.map((cell, cellIdx) => ({
            ...cell,
            id: `${clonedRowId}_c_${cellIdx}`,
            content: this.evaluateBlocks(cell.content, loopContext, loopLookup, options, `${clonedRowId}_c_${cellIdx}`),
          }));

          evaluatedRows.push({
            ...row,
            id: clonedRowId,
            cells: clonedCells,
          });
        });
        return;
      }

      // Normal row
      evaluatedRows.push({
        ...row,
        id: stableRowId,
        cells: row.cells.map((cell, cellIdx) => ({
          ...cell,
          id: cell.id || `${stableRowId}_c_${cellIdx}`,
          content: this.evaluateBlocks(cell.content, data, lookup, options, `${stableRowId}_c_${cellIdx}`),
        })),
      });
    });

    return {
      ...table,
      id: tableId,
      rows: evaluatedRows,
    };
  }

  /**
   * Automatically builds a canonical TableNode from a raw JavaScript array of objects
   */
  public static createTableFromArray(
    arrayData: Array<Record<string, any>>,
    tableId: string,
    title?: string
  ): TableNode {
    if (!arrayData || arrayData.length === 0) {
      return DocumentFactory.createTable({ id: tableId, rows: [] });
    }

    const firstItem = arrayData[0];
    const rawKeys = Object.keys(firstItem);
    const headers = rawKeys.map((k) =>
      k
        .replace(/([A-Z])/g, ' $1')
        .replace(/[_\-]/g, ' ')
        .trim()
        .replace(/^./, (s) => s.toUpperCase())
    );

    // 1. Header Row
    const headerCells: TableCellNode[] = headers.map((h, colIdx) =>
      DocumentFactory.createTableCell({
        id: `${tableId}_h_c_${colIdx}`,
        content: [
          DocumentFactory.createParagraph({
            id: `${tableId}_h_p_${colIdx}`,
            content: [DocumentFactory.createText(h, { bold: true })],
          }),
        ],
      })
    );

    const headerRow: TableRowNode = DocumentFactory.createTableRow({
      id: `${tableId}_r_header`,
      isHeader: true,
      cells: headerCells,
    });

    // 2. Data Rows
    const dataRows: TableRowNode[] = arrayData.map((item, rowIdx) => {
      const rowId = `${tableId}_r_${rowIdx + 1}`;
      const cells: TableCellNode[] = rawKeys.map((key, colIdx) => {
        const val = item[key];
        const displayVal = val === null || val === undefined ? '' : String(val);

        return DocumentFactory.createTableCell({
          id: `${rowId}_c_${colIdx}`,
          content: [
            DocumentFactory.createParagraph({
              id: `${rowId}_p_${colIdx}`,
              content: [DocumentFactory.createText(displayVal)],
            }),
          ],
        });
      });

      return DocumentFactory.createTableRow({
        id: rowId,
        isHeader: false,
        cells,
      });
    });

    return DocumentFactory.createTable({
      id: tableId,
      rows: [headerRow, ...dataRows],
      attributes: {
        title: title || 'Data Table',
        border: true,
      },
    });
  }

  /**
   * Evaluates an array of InlineNodes, replacing TokenNodes with evaluated text/inlines
   */
  private static evaluateInlines(
    inlines: InlineNode[],
    data: Record<string, any>,
    lookup: Map<string, any>,
    options: TemplateMergeOptions,
    parentId: string
  ): InlineNode[] {
    const resultInlines: InlineNode[] = [];

    inlines.forEach((node, nodeIdx) => {
      const stableInlineId = node.id || `${parentId}_in_${nodeIdx}`;

      if (node.type === 'token') {
        const tokenNode = node as TokenNode;
        const resolved = TemplateMergeEngine.resolveToken(tokenNode.key, data, lookup, options);

        if (resolved !== null) {
          resultInlines.push(
            DocumentFactory.createText(resolved, tokenNode.marks, stableInlineId)
          );
        } else if (options.preserveUnresolvedTokens) {
          resultInlines.push({
            ...tokenNode,
            id: stableInlineId,
          });
        } else {
          const fallback = tokenNode.defaultValue || options.unresolvedTokenFallback || `{{${tokenNode.key}}}`;
          resultInlines.push(
            DocumentFactory.createText(fallback, tokenNode.marks, stableInlineId)
          );
        }
        return;
      }

      if (node.type === 'text') {
        const textNode = node as TextNode;
        const text = textNode.text || '';

        if (text.includes('{{') || text.includes('{')) {
          const interpolated = this.interpolateString(text, data, lookup, options);
          resultInlines.push({
            ...textNode,
            id: stableInlineId,
            text: interpolated,
          });
          return;
        }

        resultInlines.push({
          ...textNode,
          id: stableInlineId,
        });
        return;
      }

      resultInlines.push({
        ...node,
        id: stableInlineId,
      });
    });

    return resultInlines;
  }

  /**
   * Interpolates dynamic tokens in a string
   */
  private static interpolateString(
    templateStr: string,
    data: Record<string, any>,
    lookup: Map<string, any>,
    options: TemplateMergeOptions
  ): string {
    if (!templateStr || (!templateStr.includes('{{') && !templateStr.includes('{'))) {
      return templateStr;
    }

    return templateStr.replace(/\{\{([\s\S]+?)\}\}/g, (_, tokenExpr) => {
      const trimmed = tokenExpr.trim();
      const resolved = TemplateMergeEngine.resolveToken(trimmed, data, lookup, options);
      if (resolved !== null) return resolved;
      if (options.preserveUnresolvedTokens) return `{{${trimmed}}}`;
      return options.unresolvedTokenFallback !== undefined ? options.unresolvedTokenFallback : `{{${trimmed}}}`;
    });
  }

  /**
   * Extracts token keys from a table row
   */
  private static extractTokensFromRow(row: TableRowNode): string[] {
    const tokens: string[] = [];
    row.cells.forEach((cell) => {
      cell.content.forEach((block) => {
        if ('content' in block && Array.isArray((block as any).content)) {
          (block as any).content.forEach((inline: InlineNode) => {
            if (inline.type === 'token') {
              tokens.push((inline as TokenNode).key);
            } else if (inline.type === 'text') {
              const matches = (inline as TextNode).text.matchAll(/\{\{([\s\S]+?)\}\}/g);
              for (const m of matches) {
                tokens.push(m[1].trim());
              }
            }
          });
        }
      });
    });
    return tokens;
  }

  /**
   * Counts the number of tokens in a document or template string
   */
  private static countTokens(template: any): number {
    if (typeof template === 'string') {
      const matches = template.match(/\{\{([\s\S]+?)\}\}/g);
      return matches ? matches.length : 0;
    }
    if (typeof template === 'object' && template !== null && 'body' in template) {
      return (template as CanonicalDocument).body.reduce((count, b) => {
        if ('content' in b && Array.isArray((b as any).content)) {
          return count + (b as any).content.filter((c: any) => c.type === 'token').length;
        }
        return count;
      }, 0);
    }
    return 0;
  }
}
