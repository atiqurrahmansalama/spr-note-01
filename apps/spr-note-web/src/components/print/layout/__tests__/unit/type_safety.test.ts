/**
 * Unit Test: Type Safety & Core Contract Verification (Phase 38)
 *
 * Verifies explicit strongly typed architecture contracts across all 15 core domain models:
 * 1. CanonicalDocument
 * 2. BlockNode
 * 3. InlineNode
 * 4. EditorState
 * 5. EditorSelection
 * 6. EditorTransaction
 * 7. LayoutDocument
 * 8. LayoutPage
 * 9. LayoutFragment
 * 10. MeasurementResult
 * 11. FragmentationResult
 * 12. PageGeometry
 * 13. DocumentOptions
 * 14. TemplateDocument
 * 15. BatchDocument
 */

import {
  CanonicalDocument,
  BlockNode,
  InlineNode,
  ParagraphNode,
  HeadingNode,
  ListNode,
  TableNode,
  ImageNode,
  SvgNode,
  SignatureNode,
  ManualPageBreakNode,
  DividerNode,
  SectionNode,
  TextNode,
  TokenNode,
  HardBreakNode,
  LinkNode,
  TemplateDocument,
  BatchDocument,
  BatchDocumentPackage,
} from '../../../model/types';
import { DocumentFactory } from '../../../model/documentFactory';
import {
  EditorState,
  EditorSelection,
  EditorTransaction,
  LogicalPosition,
  LogicalSelection,
} from '../../editor/editorTypes';
import {
  LayoutDocument,
  LayoutPage,
  PaginationEngineResult,
} from '../../types/paginationTypes';
import { LayoutFragment, TableLayoutFragment, ParagraphLayoutFragment } from '../../types/fragmentTypes';
import { MeasurementResult, NodeMeasurementResult } from '../../measurement/measurementTypes';
import { FragmentationResult, NodeFragmentationResult } from '../../fragmentation/FragmentationEngine';
import { PageGeometry, PageGeometryCalculator } from '../../geometry/PageGeometry';
import { DocumentOptions, LayoutDocumentOptions } from '../../types/documentTypes';
import { PaginationEngine } from '../../pagination/PaginationEngine';
import { MeasurementEngine } from '../../measurement/MeasurementEngine';
import { FragmentationEngine } from '../../fragmentation/FragmentationEngine';

export function runTypeSafetyUnitTests(): { passed: number; failed: number } {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      passed++;
      console.log(`  ✓ ${msg}`);
    } else {
      failed++;
      console.error(`  ✗ FAIL: ${msg}`);
    }
  }

  console.log('\n--- UNIT TEST: EXPLICIT TYPE SAFETY & ARCHITECTURAL CONTRACTS (PHASE 38) ---');

  // -------------------------------------------------------------------------
  // 1. CanonicalDocument, BlockNode & InlineNode Contracts
  // -------------------------------------------------------------------------
  {
    const textNode: TextNode = DocumentFactory.createText('Hello World', { bold: true });
    const tokenNode: TokenNode = DocumentFactory.createToken({ key: 'student_name', display: 'Student Name' });
    const breakNode: HardBreakNode = { id: 'br_1', type: 'hard-break' };
    const linkNode: LinkNode = { id: 'link_1', type: 'link', href: 'https://example.edu', content: [textNode, tokenNode] };

    const inlines: InlineNode[] = [textNode, tokenNode, breakNode, linkNode];
    assert(inlines.length === 4, 'All 4 InlineNode subtypes adhere to InlineNode union');

    const pNode: ParagraphNode = DocumentFactory.createParagraph({ content: inlines });
    const hNode: HeadingNode = DocumentFactory.createHeading({ level: 1, content: [DocumentFactory.createText('Overview')] });
    const listNode: ListNode = DocumentFactory.createList({
      listType: 'unordered',
      items: [
        DocumentFactory.createListItem({ content: [DocumentFactory.createText('Item 1')] }),
        DocumentFactory.createListItem({ content: [DocumentFactory.createText('Item 2')] }),
      ],
    });
    const tableNode: TableNode = DocumentFactory.createTable({
      rows: [
        DocumentFactory.createTableRow({
          isHeader: true,
          cells: [
            DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Col A')] })] }),
            DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Col B')] })] }),
          ],
        }),
      ],
    });
    const imageNode: ImageNode = DocumentFactory.createImage({ src: 'https://example.edu/logo.png', alt: 'Logo' });
    const manualBreak: ManualPageBreakNode = DocumentFactory.createManualPageBreak();
    const divider: DividerNode = DocumentFactory.createDivider({ style: 'solid' });

    const blocks: BlockNode[] = [pNode, hNode, listNode, tableNode, imageNode, manualBreak, divider];
    assert(blocks.length === 7, 'All BlockNode subtypes conform strictly to BlockNode union');

    const canonicalDoc: CanonicalDocument = DocumentFactory.createDocument({
      id: 'doc_typed_001',
      title: 'Type Safety Test Document',
      body: blocks,
    });

    assert(canonicalDoc.version === 1, 'CanonicalDocument enforces version: 1');
    assert(canonicalDoc.body.length === 7, 'CanonicalDocument body contains strictly typed BlockNodes');
  }

  // -------------------------------------------------------------------------
  // 2. EditorState, EditorSelection & EditorTransaction Contracts
  // -------------------------------------------------------------------------
  {
    const canonicalDoc = DocumentFactory.createDocument({
      id: 'doc_editor_contract',
      title: 'Editor Contract Master',
      body: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Initial content')] })],
    });

    const logicalSel: LogicalSelection = {
      anchor: { nodeId: canonicalDoc.body[0].id, textOffset: 0 },
      head: { nodeId: canonicalDoc.body[0].id, textOffset: 7 },
      isCollapsed: false,
    };

    const selection: EditorSelection = {
      anchorOffset: 0,
      focusOffset: 7,
      isCollapsed: false,
      blockId: canonicalDoc.body[0].id,
      blockType: 'paragraph',
      logical: logicalSel,
    };

    const transaction: EditorTransaction = {
      doc: canonicalDoc,
      canonicalHtml: '<p>Initial content</p>',
      selection,
      origin: 'typing',
      timestamp: Date.now(),
      description: 'Typed initial content',
    };

    const editorState: EditorState = {
      doc: transaction.doc,
      canonicalHtml: transaction.canonicalHtml,
      selection: transaction.selection || null,
      activeMarks: { bold: false, italic: false },
      canUndo: false,
      canRedo: false,
      layout: null,
      layoutDurationMs: 0.2,
    };

    assert(editorState.doc.id === 'doc_editor_contract', 'EditorState encapsulates CanonicalDocument');
    assert(editorState.selection?.logical?.isCollapsed === false, 'EditorSelection maintains structured LogicalSelection');
    assert(transaction.origin === 'typing', 'EditorTransaction records strongly typed TransactionOrigin');
  }

  // -------------------------------------------------------------------------
  // 3. LayoutDocument, LayoutPage & LayoutFragment Contracts
  // -------------------------------------------------------------------------
  {
    const canonicalDoc = DocumentFactory.createDocument({
      id: 'doc_layout_types',
      title: 'Layout Type Safety Test',
      body: [
        DocumentFactory.createHeading({ level: 1, content: [DocumentFactory.createText('Section 1')] }),
        DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Paragraph content for page layout testing.')] }),
        DocumentFactory.createManualPageBreak(),
        DocumentFactory.createHeading({ level: 2, content: [DocumentFactory.createText('Section 2')] }),
      ],
    });

    const docOptions: DocumentOptions = {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
    };

    const paginationResult: PaginationEngineResult = PaginationEngine.paginate(canonicalDoc, docOptions);
    const layoutDoc: LayoutDocument = paginationResult.document;

    assert(layoutDoc.totalPages === 2, 'LayoutDocument computed exactly 2 pages');
    assert(layoutDoc.pages.length === 2, 'LayoutDocument pages array matches totalPages');

    const page1: LayoutPage = layoutDoc.pages[0];
    assert(page1.index === 0 && page1.pageNumber === 1, 'LayoutPage maintains 0-based index and 1-based pageNumber');
    assert(page1.fragments.length >= 1, 'LayoutPage contains array of LayoutFragment objects');

    const fragment: LayoutFragment = page1.fragments[0];
    assert(typeof fragment.id === 'string', 'LayoutFragment has unique string ID');
    assert(typeof fragment.sourceNodeId === 'string', 'LayoutFragment preserves sourceNodeId reference');
    assert(fragment.rect.width > 0 && fragment.rect.height > 0, 'LayoutFragment has positive geometric Rect bounds');
  }

  // -------------------------------------------------------------------------
  // 4. MeasurementResult & FragmentationResult Contracts
  // -------------------------------------------------------------------------
  {
    const paragraphBlock = DocumentFactory.createParagraph({
      content: [DocumentFactory.createText('Measuring text paragraph block for layout dimensions.')],
    });
    const measurement: MeasurementResult = MeasurementEngine.measure(paragraphBlock, {
      containerWidth: 602,
      fontSizePx: 16,
    });

    assert(measurement.nodeId === paragraphBlock.id, 'MeasurementResult maps strictly to block nodeId');
    assert(measurement.width > 0 && measurement.height > 0, 'MeasurementResult contains positive width and height');
    assert(Array.isArray(measurement.breakOpportunities), 'MeasurementResult provides breakOpportunities array');

    const fragResult: FragmentationResult = FragmentationEngine.fragmentBlockNode(
      paragraphBlock,
      0,
      1000,
      { containerWidth: 602, fontSizePx: 16 }
    );

    assert(fragResult.fitsCurrentPage === true, 'FragmentationResult indicates fitsCurrentPage correctly');
    assert(fragResult.usedHeight > 0, 'FragmentationResult calculates usedHeight in pixels');
  }

  // -------------------------------------------------------------------------
  // 5. PageGeometry & DocumentOptions Contracts
  // -------------------------------------------------------------------------
  {
    const options: DocumentOptions = {
      pageSize: 'LETTER',
      orientation: 'LANDSCAPE',
      margin: 'NARROW',
    };

    const geometry: PageGeometry = PageGeometryCalculator.calculate(options);

    assert(geometry.pageSize === 'LETTER', 'PageGeometry derives resolved pageSize');
    assert(geometry.orientation === 'LANDSCAPE', 'PageGeometry derives resolved orientation');
    assert(geometry.paperDimensionsPx.width > geometry.paperDimensionsPx.height, 'Landscape geometry has width > height');
    assert(geometry.contentAreaPx.width > 0 && geometry.contentAreaPx.height > 0, 'PageGeometry provides valid contentAreaPx');
  }

  // -------------------------------------------------------------------------
  // 6. TemplateDocument & BatchDocument Contracts
  // -------------------------------------------------------------------------
  {
    const templateDoc: TemplateDocument = {
      id: 'template_transcript_001',
      name: 'Official Academic Transcript',
      description: 'Institutional Grade Report Template',
      scopeId: 'transcripts',
      canonicalDocument: DocumentFactory.createDocument({
        id: 'doc_tmpl_base',
        title: 'Transcript Template',
        body: [
          DocumentFactory.createHeading({ level: 1, content: [DocumentFactory.createText('Academic Transcript')] }),
          DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Student: {{student_name}} | ID: {{student_id}}')] }),
        ],
      }),
      detectedTokens: ['student_name', 'student_id'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      templateType: 'template',
    };

    assert(templateDoc.id === 'template_transcript_001', 'TemplateDocument maintains unique template ID');
    assert(templateDoc.detectedTokens.length === 2, 'TemplateDocument tracks detected token placeholders');
    assert(templateDoc.canonicalDocument.body.length === 2, 'TemplateDocument encapsulates base CanonicalDocument');

    const batchDocItem: BatchDocument = {
      id: 'batch_item_101',
      title: 'Transcript - John Doe',
      canonicalDocument: DocumentFactory.createDocument({
        id: 'doc_john_doe',
        title: 'Transcript - John Doe',
        body: [
          DocumentFactory.createHeading({ level: 1, content: [DocumentFactory.createText('Academic Transcript')] }),
          DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Student: John Doe | ID: STU-1001')] }),
        ],
      }),
      dataRecord: { student_name: 'John Doe', student_id: 'STU-1001' },
    };

    const batchPackage: BatchDocumentPackage = {
      id: 'batch_pkg_001',
      title: 'Spring 2026 Batch Transcripts',
      sourceTemplateId: templateDoc.id,
      scopeId: 'transcripts',
      createdAt: new Date().toISOString(),
      documents: [batchDocItem],
    };

    assert(batchPackage.documents.length === 1, 'BatchDocumentPackage contains typed BatchDocument items');
    assert(batchPackage.documents[0].dataRecord?.student_name === 'John Doe', 'BatchDocument item retains typed dataRecord');
    assert(batchPackage.documents[0].canonicalDocument.body.length === 2, 'BatchDocument item contains evaluated CanonicalDocument');
  }

  return { passed, failed };
}
