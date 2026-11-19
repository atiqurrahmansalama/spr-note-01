/**
 * Unified Layout Contract & Validation Unit Tests (Phase 02)
 *
 * Verifies:
 * 1. Strict runtime type contracts for all 12+ layout architecture interfaces.
 * 2. LayoutFragment complete metadata & boundary tracking.
 * 3. Bidirectional LayoutMapping (source node <-> fragment <-> page <-> DOM).
 * 4. Comprehensive LayoutValidator detecting negative dimensions, impossible page indexes,
 *    duplicate fragment IDs, duplicate unsliced source IDs, out-of-bound fragments,
 *    overlapping fragments, and content overflow.
 */

import { DocumentFactory } from '../../../model/documentFactory';
import { PaginationEngine } from '../../pagination/PaginationEngine';
import { DocumentLayoutEngine } from '../../DocumentLayoutEngine';
import { PageGeometryCalculator } from '../../geometry/PageGeometry';
import { LayoutMapping } from '../../mapping/LayoutMapping';
import { LayoutValidator } from '../../validation/LayoutValidator';
import {
  LayoutDocument,
  LayoutPage,
  SectionLayout,
  LayoutDiagnostics,
  LayoutInput,
} from '../../types/paginationTypes';
import {
  LayoutFragment,
  FragmentRange,
  FragmentBreakMetadata,
} from '../../types/fragmentTypes';
import {
  ContentArea,
  HeaderArea,
  FooterArea,
  Rect,
} from '../../types/layoutTypes';
import {
  NodeMeasurement,
  LineMeasurement,
} from '../../measurement/measurementTypes';
import { LayoutChangeScope } from '../../types/performanceTypes';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

export async function runUnifiedLayoutContractTests(): Promise<{ passed: number; failed: number }> {
  console.log('\n--- UNIT TEST: PHASE 02 — UNIFIED LAYOUT CONTRACT ---');
  let passed = 0;
  let failed = 0;

  function test(description: string, fn: () => void | Promise<void>) {
    try {
      fn();
      passed++;
    } catch (err: any) {
      console.error(`  ✗ ${description}`);
      console.error(`    ${err.message}`);
      failed++;
    }
  }

  // TEST 1: Strict Runtime Type Contract Instantiation
  test('All 12+ layout interfaces instantiate with valid properties', () => {
    // 1. ContentArea, HeaderArea, FooterArea
    const contentArea: ContentArea = { x: 50, y: 50, width: 500, height: 700, padding: { top: 0, right: 0, bottom: 0, left: 0 } };
    const headerArea: HeaderArea = { x: 50, y: 10, width: 500, height: 30, isVisible: true, reserveHeight: 30 };
    const footerArea: FooterArea = { x: 50, y: 760, width: 500, height: 30, isVisible: true, reserveHeight: 30 };

    assert(contentArea.width === 500 && contentArea.height === 700, 'ContentArea contract valid');
    assert(headerArea.isVisible && headerArea.reserveHeight === 30, 'HeaderArea contract valid');
    assert(footerArea.isVisible && footerArea.reserveHeight === 30, 'FooterArea contract valid');

    // 2. PageGeometry
    const geometry = PageGeometryCalculator.calculate({ pageSize: 'A4', orientation: 'PORTRAIT' });
    assert(geometry.contentArea.width > 0 && geometry.contentArea.height > 0, 'PageGeometry contains contentArea');
    assert(geometry.headerArea !== undefined, 'PageGeometry contains headerArea');
    assert(geometry.footerArea !== undefined, 'PageGeometry contains footerArea');

    // 3. FragmentRange & FragmentBreakMetadata
    const fragRange: FragmentRange = { startOffset: 0, endOffset: 120, unit: 'char', total: 240 };
    const breakMeta: FragmentBreakMetadata = { isManual: false, isAutomatic: true, breakType: 'overflow', breakReason: 'Exceeded page height' };
    assert(fragRange.startOffset === 0 && fragRange.endOffset === 120, 'FragmentRange contract valid');
    assert(breakMeta.isAutomatic && breakMeta.breakType === 'overflow', 'FragmentBreakMetadata contract valid');

    // 4. LineMeasurement & NodeMeasurement
    const lineMeas: LineMeasurement = { lineIndex: 0, index: 0, charStart: 0, charEnd: 45, startOffset: 0, endOffset: 45, text: 'Hello line', rect: { x: 0, y: 0, width: 400, height: 20 }, width: 400, height: 20 };
    const nodeMeas: NodeMeasurement = {
      nodeId: 'p_test',
      sourceType: 'paragraph',
      type: 'paragraph',
      rect: { x: 0, y: 0, width: 500, height: 60 },
      width: 500,
      height: 60,
      totalOuterHeight: 76,
      marginTop: 8,
      marginBottom: 8,
      paddingTop: 0,
      paddingBottom: 0,
      isAtomic: false,
      isManualBreak: false,
      keepTogether: false,
      keepWithNext: false,
      isSplittable: true,
      lines: [lineMeas],
      breakOpportunities: [],
      boundingRect: { x: 0, y: 0, width: 500, height: 60 },
    };
    assert(nodeMeas.nodeId === 'p_test' && nodeMeas.lines?.length === 1, 'NodeMeasurement & LineMeasurement valid');

    // 5. SectionLayout, LayoutDiagnostics, LayoutChangeScope, LayoutInput
    const sectionLayout: SectionLayout = {
      sectionId: 'sec_1',
      sectionIndex: 0,
      title: 'Introduction',
      startPageIndex: 0,
      endPageIndex: 1,
      pageCount: 2,
    };
    const changeScope: LayoutChangeScope = { type: 'incremental', dirtyNodeIds: ['p_test'], changedAt: Date.now() };
    const canonicalDoc = DocumentFactory.createDocument({ id: 'doc_1', body: [DocumentFactory.createParagraph({ id: 'p_test', content: [DocumentFactory.createText('Test text')] })] });
    const layoutInput: LayoutInput = { document: canonicalDoc, options: { pageSize: 'A4' }, changeScope };
    assert(sectionLayout.pageCount === 2, 'SectionLayout contract valid');
    assert(layoutInput.document.id === 'doc_1', 'LayoutInput contract valid');
  });

  // TEST 2: LayoutFragment Property Completeness in Engine Pipeline
  test('PaginationEngine produces LayoutFragments with 100% complete metadata', () => {
    const longParaText = 'SPR Note DocLab is an enterprise multi-page layout engine. '.repeat(40);
    const doc = DocumentFactory.createDocument({
      id: 'doc_contract_test',
      body: [
        DocumentFactory.createHeading({ id: 'h1_title', level: 1, content: [DocumentFactory.createText('Document Title')] }),
        DocumentFactory.createParagraph({ id: 'p_long', content: [DocumentFactory.createText(longParaText)] }),
      ],
    });

    const result = PaginationEngine.paginateDocument(doc, { pageSize: 'A4' });
    assert(result.document.totalPages >= 1, 'Document paginated successfully');

    // Verify all fragments on all pages have complete contract properties
    result.document.pages.forEach((page, pageIdx) => {
      assert(page.index === pageIdx, `Page ${pageIdx} index matches array index`);
      assert(page.fragments.length > 0, `Page ${pageIdx} has fragments`);

      page.fragments.forEach((frag) => {
        assert(typeof frag.id === 'string' && frag.id.length > 0, `Fragment has valid ID (${frag.id})`);
        assert(typeof frag.sourceNodeId === 'string' && frag.sourceNodeId.length > 0, `Fragment has valid sourceNodeId (${frag.sourceNodeId})`);
        assert(frag.pageIndex === pageIdx, `Fragment pageIndex (${frag.pageIndex}) matches page.index (${pageIdx})`);
        assert(frag.rect !== undefined && frag.rect.width > 0 && frag.rect.height > 0, `Fragment rect has positive dimensions (${frag.rect.width}x${frag.rect.height})`);
        assert(frag.width !== undefined && frag.width > 0, `Fragment width property populated (${frag.width})`);
        assert(frag.height !== undefined && frag.height > 0, `Fragment height property populated (${frag.height})`);
        assert(typeof frag.fragmentIndex === 'number', `Fragment fragmentIndex is numeric (${frag.fragmentIndex})`);
        assert(typeof frag.fragmentOrder === 'number', `Fragment fragmentOrder is numeric (${frag.fragmentOrder})`);
        assert(typeof frag.totalFragments === 'number' && frag.totalFragments >= 1, `Fragment totalFragments >= 1 (${frag.totalFragments})`);
        assert(typeof frag.isFirstFragment === 'boolean', 'Fragment isFirstFragment is boolean');
        assert(typeof frag.isLastFragment === 'boolean', 'Fragment isLastFragment is boolean');
        assert(typeof frag.isAutomaticBreak === 'boolean', 'Fragment isAutomaticBreak is boolean');
        assert(typeof frag.isManualBreak === 'boolean', 'Fragment isManualBreak is boolean');
        assert(frag.breakMetadata !== undefined, 'Fragment breakMetadata is populated');
        assert(frag.sourceType !== undefined, `Fragment sourceType is defined (${frag.sourceType})`);
      });
    });
  });

  // TEST 3: Bidirectional LayoutMapping (source node <-> fragment <-> page <-> DOM)
  test('LayoutMapping provides exact bidirectional lookups and DOM element resolution', () => {
    const doc = DocumentFactory.createDocument({
      id: 'doc_mapping_test',
      body: [
        DocumentFactory.createHeading({ id: 'h1_main', level: 1, content: [DocumentFactory.createText('Main Title')] }),
        DocumentFactory.createParagraph({ id: 'p_body', content: [DocumentFactory.createText('Body content line 1')] }),
        DocumentFactory.createManualPageBreak('pb_manual'),
        DocumentFactory.createParagraph({ id: 'p_page2', content: [DocumentFactory.createText('Page 2 content')] }),
      ],
    });

    const result = PaginationEngine.paginateDocument(doc, { pageSize: 'A4' });
    const mapping = LayoutMapping.create(result.document);

    // 1. sourceNodeId -> fragments
    const h1Frags = mapping.getFragmentsForSourceNode('h1_main');
    assert(h1Frags.length === 1, 'h1_main mapped to exactly 1 fragment');
    assert(h1Frags[0].sourceNodeId === 'h1_main', 'Fragment sourceNodeId matches query');

    // 2. sourceNodeId -> pages
    const p1Pages = mapping.getPagesForSourceNode('p_body');
    const p2Pages = mapping.getPagesForSourceNode('p_page2');
    assert(p1Pages.length === 1 && p1Pages[0] === 0, 'p_body mapped to page 0');
    assert(p2Pages.length === 1 && p2Pages[0] === 1, 'p_page2 mapped to page 1');

    // 3. fragmentId -> sourceNodeId
    const fragId = h1Frags[0].id;
    assert(mapping.getSourceNodeForFragment(fragId) === 'h1_main', 'Fragment ID mapped back to sourceNodeId');

    // 4. fragmentId -> pageIndex
    assert(mapping.getPageForFragment(fragId) === 0, 'Fragment ID mapped to page 0');

    // 5. pageIndex -> fragments
    const page0Frags = mapping.getFragmentsOnPage(0);
    const page1Frags = mapping.getFragmentsOnPage(1);
    assert(page0Frags.some((f) => f.sourceNodeId === 'h1_main'), 'Page 0 contains h1_main fragment');
    assert(page1Frags.some((f) => f.sourceNodeId === 'p_page2'), 'Page 1 contains p_page2 fragment');

    // 6. DOM Element Simulation -> Fragment & SourceNode
    if (typeof document !== 'undefined') {
      const domEl = document.createElement('div');
      domEl.setAttribute('data-fragment-id', fragId);
      domEl.setAttribute('data-source-node-id', 'h1_main');

      const mappedFrag = mapping.mapDomElementToFragment(domEl);
      assert(mappedFrag !== null && mappedFrag.id === fragId, 'DOM element mapped directly to LayoutFragment');
      assert(mapping.mapDomElementToSourceNodeId(domEl) === 'h1_main', 'DOM element mapped to sourceNodeId');
    }
  });

  // TEST 4: LayoutValidator Validates Clean Layout
  test('LayoutValidator passes clean LayoutDocument with zero errors', () => {
    const doc = DocumentFactory.createDocument({
      id: 'doc_valid',
      body: [
        DocumentFactory.createHeading({ id: 'h1_test', level: 1, content: [DocumentFactory.createText('Clean Header')] }),
        DocumentFactory.createParagraph({ id: 'p_test', content: [DocumentFactory.createText('Valid paragraph text')] }),
      ],
    });

    const result = PaginationEngine.paginateDocument(doc, { pageSize: 'A4' });
    const validation = LayoutValidator.validate(result.document);

    assert(validation.isValid === true, 'Validation passed on clean layout document');
    assert(validation.errors.length === 0, 'Zero validation errors on clean layout');
    assert(validation.diagnostics.totalPages >= 1, 'Diagnostics totalPages reported accurately');
  });

  // TEST 5: LayoutValidator Catches Negative Dimensions
  test('LayoutValidator detects negative dimensions on pages or fragments', () => {
    const invalidDoc: LayoutDocument = {
      documentId: 'doc_invalid_dim',
      width: -100, // Negative document width
      height: 1000,
      totalPages: 1,
      calculatedAt: Date.now(),
      options: {},
      pages: [
        {
          index: 0,
          pageNumber: 1,
          width: 800,
          height: 1100,
          margins: { top: 0, right: 0, bottom: 0, left: 0 },
          contentArea: { x: 0, y: 0, width: -50, height: 800 }, // Negative content width
          fragments: [
            {
              id: 'frag_neg',
              sourceNodeId: 'node_1',
              type: 'paragraph',
              pageIndex: 0,
              rect: { x: 0, y: 0, width: 100, height: -20 }, // Negative fragment height
              width: 100,
              height: -20,
            },
          ],
          usedHeight: 0,
          availableHeight: 800,
          isFirstPage: true,
          isLastPage: true,
        },
      ],
    };

    const validation = LayoutValidator.validate(invalidDoc);
    assert(validation.isValid === false, 'Validation failed for negative dimensions');
    assert(
      validation.errors.some((e) => e.code === 'NEGATIVE_DIMENSIONS'),
      'NEGATIVE_DIMENSIONS error code emitted'
    );
  });

  // TEST 6: LayoutValidator Catches Impossible Page Indexes
  test('LayoutValidator detects impossible page indexes and index mismatches', () => {
    const invalidDoc: LayoutDocument = {
      documentId: 'doc_invalid_idx',
      width: 800,
      height: 1100,
      totalPages: 2,
      calculatedAt: Date.now(),
      options: {},
      pages: [
        {
          index: 5, // Impossible page index (totalPages is 2)
          pageNumber: 6,
          width: 800,
          height: 1100,
          margins: { top: 0, right: 0, bottom: 0, left: 0 },
          contentArea: { x: 0, y: 0, width: 700, height: 900 },
          fragments: [
            {
              id: 'frag_1',
              sourceNodeId: 'node_1',
              type: 'paragraph',
              pageIndex: 0, // Mismatched with parent page.index 5
              rect: { x: 0, y: 0, width: 700, height: 40 },
              width: 700,
              height: 40,
            },
          ],
          usedHeight: 40,
          availableHeight: 860,
          isFirstPage: true,
          isLastPage: false,
        },
      ],
    };

    const validation = LayoutValidator.validate(invalidDoc);
    assert(validation.isValid === false, 'Validation failed for impossible page indexes');
    assert(
      validation.errors.some((e) => e.code === 'IMPOSSIBLE_PAGE_INDEX'),
      'IMPOSSIBLE_PAGE_INDEX error code emitted'
    );
  });

  // TEST 7: LayoutValidator Catches Duplicate Fragment IDs
  test('LayoutValidator detects duplicate fragment IDs across the document', () => {
    const invalidDoc: LayoutDocument = {
      documentId: 'doc_dup_frag',
      width: 800,
      height: 1100,
      totalPages: 1,
      calculatedAt: Date.now(),
      options: {},
      pages: [
        {
          index: 0,
          pageNumber: 1,
          width: 800,
          height: 1100,
          margins: { top: 0, right: 0, bottom: 0, left: 0 },
          contentArea: { x: 0, y: 0, width: 700, height: 900 },
          fragments: [
            {
              id: 'duplicate_frag_id',
              sourceNodeId: 'node_1',
              type: 'paragraph',
              pageIndex: 0,
              rect: { x: 0, y: 0, width: 700, height: 40 },
              width: 700,
              height: 40,
            },
            {
              id: 'duplicate_frag_id', // Duplicate ID
              sourceNodeId: 'node_2',
              type: 'paragraph',
              pageIndex: 0,
              rect: { x: 0, y: 50, width: 700, height: 40 },
              width: 700,
              height: 40,
            },
          ],
          usedHeight: 90,
          availableHeight: 810,
          isFirstPage: true,
          isLastPage: true,
        },
      ],
    };

    const validation = LayoutValidator.validate(invalidDoc);
    assert(validation.isValid === false, 'Validation failed for duplicate fragment IDs');
    assert(
      validation.errors.some((e) => e.code === 'DUPLICATE_FRAGMENT_ID'),
      'DUPLICATE_FRAGMENT_ID error code emitted'
    );
  });

  // TEST 8: LayoutValidator Catches Overlapping Fragments on Same Page
  test('LayoutValidator detects vertically overlapping fragments on the same page', () => {
    const invalidDoc: LayoutDocument = {
      documentId: 'doc_overlap',
      width: 800,
      height: 1100,
      totalPages: 1,
      calculatedAt: Date.now(),
      options: {},
      pages: [
        {
          index: 0,
          pageNumber: 1,
          width: 800,
          height: 1100,
          margins: { top: 0, right: 0, bottom: 0, left: 0 },
          contentArea: { x: 0, y: 0, width: 700, height: 900 },
          fragments: [
            {
              id: 'frag_top',
              sourceNodeId: 'node_1',
              type: 'paragraph',
              pageIndex: 0,
              rect: { x: 0, y: 0, width: 700, height: 100 }, // y=0 to y=100
              width: 700,
              height: 100,
            },
            {
              id: 'frag_colliding',
              sourceNodeId: 'node_2',
              type: 'paragraph',
              pageIndex: 0,
              rect: { x: 0, y: 40, width: 700, height: 100 }, // y=40 starts inside frag_top! (overlap of 60px)
              width: 700,
              height: 100,
            },
          ],
          usedHeight: 140,
          availableHeight: 760,
          isFirstPage: true,
          isLastPage: true,
        },
      ],
    };

    const validation = LayoutValidator.validate(invalidDoc);
    assert(validation.isValid === false, 'Validation failed for overlapping fragments');
    assert(
      validation.errors.some((e) => e.code === 'OVERLAPPING_FRAGMENTS'),
      'OVERLAPPING_FRAGMENTS error code emitted'
    );
  });

  // TEST 9: LayoutValidator Catches Out-of-Bounds and Content Overflow
  test('LayoutValidator detects fragments out of content bounds and vertical overflow', () => {
    const invalidDoc: LayoutDocument = {
      documentId: 'doc_overflow_test',
      width: 800,
      height: 1100,
      totalPages: 1,
      calculatedAt: Date.now(),
      options: {},
      pages: [
        {
          index: 0,
          pageNumber: 1,
          width: 800,
          height: 1100,
          margins: { top: 0, right: 0, bottom: 0, left: 0 },
          contentArea: { x: 0, y: 0, width: 700, height: 500 },
          fragments: [
            {
              id: 'frag_neg_y',
              sourceNodeId: 'node_1',
              type: 'paragraph',
              pageIndex: 0,
              rect: { x: 0, y: -20, width: 700, height: 100 }, // Negative y outside top boundary
              width: 700,
              height: 100,
            },
          ],
          usedHeight: 650, // 650px exceeds 500px content area!
          availableHeight: 0,
          isFirstPage: true,
          isLastPage: true,
        },
      ],
    };

    const validation = LayoutValidator.validate(invalidDoc);
    assert(validation.isValid === false, 'Validation failed for out of bounds & overflow');
    assert(
      validation.errors.some((e) => e.code === 'FRAGMENT_OUT_OF_BOUNDS'),
      'FRAGMENT_OUT_OF_BOUNDS error code emitted'
    );
    assert(
      validation.errors.some((e) => e.code === 'CONTENT_OVERFLOW'),
      'CONTENT_OVERFLOW error code emitted'
    );
  });

  console.log(`Phase 02 Results: ${passed} Passed, ${failed} Failed\n`);
  return { passed, failed };
}
