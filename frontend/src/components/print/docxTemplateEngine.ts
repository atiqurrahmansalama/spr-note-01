/**
 * DocLab Central Template Engine & Orchestration Facade
 *
 * Enterprise Architectural Decomposition:
 * - docxGeometry: Physical paper dimensions, page properties, padding & margin calculation
 * - docxParserEngine: OpenXML extraction, Mammoth HTML conversion, SVG vector anchor placement
 * - docxTokenFilters: Directive parsing, indent processing, token sanitization & filter resolution
 * - docxTemplateMerge: Tabular repetition, nested array expansions, token substitution
 * - docxStorage: LocalStorage & Cloud persistence, global sticky management, drafts
 * - keyLibrary/tokenSynonyms: Dynamic taxonomy alias resolution and pure metadata grouping
 */

// 1. Shared Types
export type {
  DocxTemplateType,
  DocxPageProperties,
  CustomDocxTemplate,
  DocLabCanvasDraft,
} from './types';

// 2. Style Utilities
export {
  separateDocxStylesAndBody,
  sanitizeDocxStyles,
} from './docxStyleUtils';

// 3. Synonym Taxonomy
export {
  UNIVERSAL_SYNONYM_GROUPS,
  PURE_METADATA_KEYS,
  getSynonymsForKey,
  areKeysSynonyms,
} from './keyLibrary/tokenSynonyms';

// 4. Physical Geometry & Margins
export {
  type DocxPaperDimensions,
  getDocxPaperDimensions,
  getDocxPaperPadding,
  convertCssLengthToMm,
  extractDocxPageProperties,
} from './docxGeometry';

// 5. Token Filters & Directive Resolution
export {
  type TemplatePlaceholderKey,
  type TokenFilterInterceptor,
  parseIndentDirectiveArgs,
  normalizeIndentDirectives,
  sanitizeDocxPlaceholders,
  detectPlaceholders,
  applyIndentFilter,
  registerTokenFilterInterceptor,
  applyFilter,
  resolveTokenValue,
} from './docxTokenFilters';

// 6. OpenXML Parser & Ingestion Engine
export {
  type DocxParseResult,
  normalizeSandboxSvgElements,
  enrichDocxHtmlFromOpenXml,
  parseDocxDocument,
  extractTableDataFromHtml,
} from './docxParserEngine';

// 7. Template Data Merging & Tabular Cloning
export {
  isTabularTemplate,
  mergeTabularTemplateWithData,
  mergeTemplateWithData,
  bulkMergeTemplate,
} from './docxTemplateMerge';

// 8. Template Storage & Cloud Synchronization
export {
  TEMPLATES_STORAGE_KEY,
  DOCLAB_CANVAS_DRAFT_PREFIX,
  getSavedDocxTemplates,
  fetchCloudDocxTemplates,
  toggleGlobalStickyDocxTemplate,
  saveDocxTemplate,
  deleteDocxTemplate,
  getDocLabCanvasDraft,
  saveDocLabCanvasDraft,
  clearDocLabCanvasDraft,
} from './docxStorage';
