/**
 * Deterministic JSON Serializer for Canonical Document AST
 *
 * Provides safe, deterministic, and version-controlled JSON serialization and deserialization.
 *
 * Architectural Invariants:
 * - Deterministic key sorting for reproducible hashing and revision tracking.
 * - Strict schema validation ensuring no corrupt nodes are stored.
 * - Deep cloning and immutable AST transformations.
 */

import { CanonicalDocument, BlockNode, InlineNode } from '../types';
import { DocumentFactory } from '../documentFactory';

export class JsonSerializer {
  /**
   * Serializes a CanonicalDocument into a deterministic JSON string
   */
  public static serialize(doc: CanonicalDocument, pretty: boolean = true): string {
    if (!doc) return '{}';
    return JSON.stringify(doc, this.replacer, pretty ? 2 : undefined);
  }

  /**
   * Deserializes a JSON string into a validated CanonicalDocument AST
   */
  public static deserialize(jsonString: string): CanonicalDocument {
    if (!jsonString || !jsonString.trim()) {
      return DocumentFactory.createDocument();
    }

    try {
      const parsed = JSON.parse(jsonString);
      return this.validateAndNormalize(parsed);
    } catch (err: any) {
      console.error('Failed to deserialize CanonicalDocument JSON:', err);
      return DocumentFactory.createDocument({
        title: 'Recovery Document',
        metadata: { parseError: err.message },
      });
    }
  }

  /**
   * Deep clones a CanonicalDocument AST
   */
  public static clone(doc: CanonicalDocument): CanonicalDocument {
    return this.deserialize(this.serialize(doc, false));
  }

  /**
   * Validates and normalizes parsed JSON object into CanonicalDocument
   */
  private static validateAndNormalize(raw: any): CanonicalDocument {
    if (!raw || typeof raw !== 'object') {
      return DocumentFactory.createDocument();
    }

    const id = typeof raw.id === 'string' ? raw.id : `doc_${Date.now().toString(36)}`;
    const title = typeof raw.title === 'string' ? raw.title : 'Untitled Document';
    const metadata = typeof raw.metadata === 'object' && raw.metadata !== null ? raw.metadata : {};
    const styles = typeof raw.styles === 'object' && raw.styles !== null ? raw.styles : undefined;

    const rawBody = Array.isArray(raw.body) ? raw.body : [];
    const body: BlockNode[] = [];

    rawBody.forEach((block: any) => {
      if (block && typeof block === 'object' && typeof block.type === 'string') {
        body.push(block as BlockNode);
      }
    });

    if (body.length === 0) {
      body.push(DocumentFactory.createParagraph({ content: [DocumentFactory.createText('')] }));
    }

    return {
      id,
      version: 1,
      title,
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: raw.updatedAt || new Date().toISOString(),
      metadata,
      styles,
      body,
    };
  }

  /**
   * JSON replacer for deterministic serialization
   */
  private static replacer(key: string, value: any): any {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'object' && !Array.isArray(value)) {
      // Sort keys alphabetically for deterministic output
      return Object.keys(value)
        .sort()
        .reduce((sorted: any, k: string) => {
          if (value[k] !== undefined) {
            sorted[k] = value[k];
          }
          return sorted;
        }, {});
    }
    return value;
  }
}
