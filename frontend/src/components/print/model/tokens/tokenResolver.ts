/**
 * Canonical AST Token Resolver & Interpolator
 *
 * Provides high-speed AST-level placeholder extraction, validation, and value interpolation.
 *
 * Architectural Invariants:
 * - Operates directly on the strongly typed AST without regex HTML slicing.
 * - Preserves surrounding marks (bold, italic, color) during token value replacement.
 * - Supports token formatters & filters (e.g. {{issue_date | date}}, {{student_name | upper}}).
 */

import { CanonicalDocument, BlockNode, ParagraphNode, HeadingNode, ListNode, TableNode, SectionNode, InlineNode, TextNode, TokenNode } from '../types';
import { DocumentFactory } from '../documentFactory';
import { TemplateMergeEngine } from '../templates/TemplateMergeEngine';
import { CustomFilterHandler } from '../templates/types';

export interface TokenExtractionResult {
  key: string;
  count: number;
  locations: Array<{ nodeId: string; blockType: string }>;
}

export class TokenResolver {
  /**
   * Scans a CanonicalDocument AST and extracts all dynamic token keys
   */
  public static extractTokens(doc: CanonicalDocument): TokenExtractionResult[] {
    const tokenMap = new Map<string, TokenExtractionResult>();

    const scanInlines = (inlines: InlineNode[], blockId: string, blockType: string) => {
      inlines.forEach((node) => {
        if (node.type === 'token') {
          const tokenNode = node as TokenNode;
          const key = tokenNode.key;
          const existing = tokenMap.get(key) || { key, count: 0, locations: [] };
          existing.count++;
          existing.locations.push({ nodeId: blockId, blockType });
          tokenMap.set(key, existing);
        } else if (node.type === 'link') {
          scanInlines(node.content, blockId, blockType);
        }
      });
    };

    const scanBlock = (block: BlockNode) => {
      switch (block.type) {
        case 'paragraph':
        case 'heading':
          scanInlines(block.content, block.id, block.type);
          break;
        case 'list':
          (block as ListNode).items.forEach((item) => {
            item.content.forEach((c) => {
              if ('type' in c && c.type === 'paragraph') {
                scanInlines((c as ParagraphNode).content, item.id, 'list-item');
              } else {
                scanInlines([c as InlineNode], item.id, 'list-item');
              }
            });
          });
          break;
        case 'table':
          (block as TableNode).rows.forEach((row) => {
            row.cells.forEach((cell) => {
              cell.content.forEach(scanBlock);
            });
          });
          break;
        case 'section':
          (block as SectionNode).content.forEach(scanBlock);
          break;
      }
    };

    doc.body.forEach(scanBlock);
    return Array.from(tokenMap.values());
  }

  /**
   * Interpolates data record values into dynamic TokenNodes across the AST, producing an evaluated AST
   */
  public static evaluateDocument(
    doc: CanonicalDocument,
    data: Record<string, any>,
    options: {
      preserveUnresolvedTokens?: boolean;
      customFormatters?: Record<string, CustomFilterHandler>;
    } = {}
  ): CanonicalDocument {
    return TemplateMergeEngine.mergeDocument(doc, data, {
      preserveUnresolvedTokens: options.preserveUnresolvedTokens,
      customFilters: options.customFormatters,
    });
  }
}
