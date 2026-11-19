/**
 * Two-Way Adapter between Legacy DocxTemplate / HTML Strings and CanonicalDocument AST
 *
 * Ensures 100% backward-compatibility for all existing consumers and stored database templates.
 */

import { CanonicalDocument } from '../types';
import { HtmlImporter } from '../serialization/htmlImporter';
import { HtmlExporter, HtmlExportOptions } from '../serialization/htmlExporter';
import { JsonSerializer } from '../serialization/jsonSerializer';
import { TokenResolver } from '../tokens/tokenResolver';
import { CustomDocxTemplate } from '../../docxTemplateEngine';
import { DocxTemplate } from '../../types';

export class TemplateAdapter {
  /**
   * Converts a legacy CustomDocxTemplate or raw HTML body into a CanonicalDocument AST
   */
  public static toCanonicalDocument(
    source: CustomDocxTemplate | string | any,
    options: {
      id?: string;
      title?: string;
      metadata?: Record<string, any>;
    } = {}
  ): CanonicalDocument {
    if (typeof source === 'string') {
      return HtmlImporter.importFromHtml(source, options);
    }

    if (source && typeof source === 'object') {
      if ('version' in source && 'body' in source && Array.isArray(source.body)) {
        return source as CanonicalDocument;
      }
      const htmlBody = source.rawHtml || source.templateBody || '';
      return HtmlImporter.importFromHtml(htmlBody, {
        id: source.id || options.id,
        title: source.name || options.title,
        metadata: {
          ...options.metadata,
          description: source.description,
          scopeId: source.scopeId,
          templateType: source.templateType,
          pageSize: source.pageSize,
          orientation: source.orientation,
          margin: source.margin,
        },
      });
    }

    return HtmlImporter.importFromHtml('', options);
  }

  /**
   * Converts a CanonicalDocument AST into a legacy CustomDocxTemplate object
   */
  public static toLegacyTemplate(
    doc: CanonicalDocument,
    baseTemplate: Partial<CustomDocxTemplate> = {},
    options: HtmlExportOptions = { tokenFormat: 'mustache', prettyPrint: true }
  ): CustomDocxTemplate {
    const htmlBody = HtmlExporter.exportToHtml(doc, options);
    const tokens = TokenResolver.extractTokens(doc).map((t) => t.key);

    return {
      id: doc.id || baseTemplate.id || `tpl_${Date.now()}`,
      name: doc.title || baseTemplate.name || 'Custom Document',
      description: baseTemplate.description || 'Enterprise DocLab Document',
      rawHtml: htmlBody,
      detectedPlaceholders: tokens,
      createdAt: doc.createdAt || baseTemplate.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pageSize: baseTemplate.pageSize || 'A4',
      orientation: baseTemplate.orientation || 'PORTRAIT',
      margin: baseTemplate.margin || 'NORMAL',
      ...baseTemplate,
    };
  }

  /**
   * Converts HTML string to CanonicalDocument
   */
  public static htmlToDocument(html: string, options?: { id?: string; title?: string }): CanonicalDocument {
    return HtmlImporter.importFromHtml(html, options);
  }

  /**
   * Converts CanonicalDocument to clean HTML string
   */
  public static documentToHtml(doc: CanonicalDocument, options?: HtmlExportOptions): string {
    return HtmlExporter.exportToHtml(doc, options);
  }

  /**
   * Serializes CanonicalDocument to deterministic JSON
   */
  public static documentToJson(doc: CanonicalDocument, pretty: boolean = true): string {
    return JsonSerializer.serialize(doc, pretty);
  }

  /**
   * Deserializes JSON string to CanonicalDocument
   */
  public static jsonToDocument(json: string): CanonicalDocument {
    return JsonSerializer.deserialize(json);
  }
}
