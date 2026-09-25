// ─── Universal Print Studio Master Barrel Export ───
import UniversalPrintStudio from './UniversalPrintStudio';
import DocLabSidebar from './DocLabSidebar';
import DocLabCanvasViewer from './DocLabCanvasViewer';
import DocLabDocumentWrapper from './DocLabDocumentWrapper';
import DocLabTableRenderer from './DocLabTableRenderer';
import DocLabExportMenu from './DocLabExportMenu';

export {
  UniversalPrintStudio,
  UniversalPrintStudio as DocLabStudio,
  UniversalPrintStudio as UniversalPrintModal,
  UniversalPrintStudio as DocLabModal,
  DocLabSidebar,
  DocLabSidebar as PrintConfigSidebar,
  DocLabCanvasViewer,
  DocLabCanvasViewer as PrintCanvasViewer,
  DocLabDocumentWrapper,
  DocLabDocumentWrapper as PrintDocumentWrapper,
  DocLabTableRenderer,
  DocLabTableRenderer as PrintTableRenderer,
  DocLabExportMenu,
  DocLabExportMenu as PrintExportMenu,
};

export default UniversalPrintStudio;

// Document & Word Engine Modals
export { default as DocxLiveRenderer } from './DocxLiveRenderer';
export { default as DocxFormattingRibbon } from './DocxFormattingRibbon';
export { default as DocxTemplateModal } from './DocxTemplateModal';
export { default as TemplateLibraryModal } from './TemplateLibraryModal';
export { default as KeyPaletteExplorer } from './KeyPaletteExplorer';
export { default as DocLabQuickReportModal } from './DocLabQuickReportModal';
export { default as DocLabQuickDocumentModal } from './DocLabQuickDocumentModal';


// Custom Hooks & Subcomponents
export * from './hooks';
export * from './components';
export * from './types';
export * from './docxTemplateEngine';
export * from './caretInsertManager';
export * from './keyLibrary';
export * from './scopeTemplateStore';
export * from './docLabExportUtils';
export { compileVectorPDFDocument } from './vectorPDFCompiler';
export * from './vectorDocxCompiler';
export * from './docLabTextConverter';
export * from './svgShapeTemplates';
