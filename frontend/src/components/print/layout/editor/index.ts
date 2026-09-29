/**
 * Single-Host Paginated Editor Subsystem
 *
 * Provides authoritative Word-grade single-host document editing across
 * physical paper geometry, transactional commands, history, and pure canonical AST serialization.
 */

export * from './editorTypes';
export * from './EditorSerializer';
export * from './EditorHistory';
export * from './EditorDomAdapter';
export * from './EditorCommands';
export * from './EditorTransactionCoordinator';
export * from './EditorPositionMapper';
export * from './PaginatedEditorBridge';
export * from './PaginatedDocumentEditor';
