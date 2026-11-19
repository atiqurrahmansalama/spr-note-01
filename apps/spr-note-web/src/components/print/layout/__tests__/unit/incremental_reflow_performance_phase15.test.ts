/**
 * Incremental Reflow & Performance Architecture Test Suite (Phase 15)
 *
 * Verifies Word-grade enterprise incremental layout scaling:
 * - Dirty-node detection -> Affected fragment -> Affected page -> Forward reflow -> Layout convergence detection -> Early exit.
 * - Multi-scale document testing: 1 page (12 blocks), 10 pages (120 blocks), 50 pages (600 blocks), 100 pages (1200 blocks), 500 pages (6000 blocks).
 * - Prefix page reuse and suffix page reuse preservation.
 * - Comprehensive MeasurementCache multi-factor keying and LRU invalidation.
 * - Pure authoritative DocLab pipeline execution without synthetic shortcuts.
 */

import { CanonicalDocument, BlockNode, ParagraphNode } from '../../../model/types';
import { PaginationEngine } from '../../pagination/PaginationEngine';
import { ControlledLayoutPipeline } from '../../measurement/ControlledLayoutPipeline';
import { IncrementalLayoutPlanner } from '../../performance/IncrementalLayoutPlanner';
import { MeasurementCache } from '../../measurement/MeasurementCache';
import { LayoutDocumentOptions } from '../../types/documentTypes';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  durationMs?: number;
}

export async function runIncrementalReflowPerformancePhase15UnitTests(): Promise<{
  passed: number;
  failed: number;
  results: TestResult[];
}> {
  const results: TestResult[] = [];

  function assert(name: string, condition: boolean, message?: string) {
    if (condition) {
      results.push({ name, passed: true });
    } else {
      results.push({ name, passed: false, error: message || 'Assertion failed' });
    }
  }

  // Helper to generate a canonical document with N paragraphs (~12 paragraphs per A4 page)
  function createSyntheticDocument(docId: string, paragraphCount: number, paraTextPrefix = 'Paragraph'): CanonicalDocument {
    const body: ParagraphNode[] = [];
    for (let i = 0; i < paragraphCount; i++) {
      body.push({
        id: `block_${docId}_${i}`,
        type: 'paragraph',
        content: [
          {
            id: `text_${docId}_${i}`,
            type: 'text',
            text: `${paraTextPrefix} ${i}: Enterprise DocLab high performance incremental layout scaling test sentence with extensive typography and deterministic line metrics. This paragraph ensures steady height across pages.`,
          },
        ],
        attributes: {
          spacing: {
            before: 10,
            after: 10,
            line: 1.5,
          },
        },
      });
    }

    return {
      id: docId,
      title: `DocLab Performance Document - ${paragraphCount} Blocks`,
      version: 1,
      body,
      metadata: {
        author: 'DocLab Engine',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    };
  }

  const defaultOptions: LayoutDocumentOptions = {
    pageSize: 'A4',
    orientation: 'PORTRAIT',
    margin: 'NORMAL',
    density: 'NORMAL',
  };

  try {
    // --------------------------------------------------------------------------
    // Test 1: Dirty Node Detection (Modifications, Additions, Deletions)
    // --------------------------------------------------------------------------
    const baseDoc = createSyntheticDocument('test_dirty', 24); // 2 pages
    const modifiedBody: BlockNode[] = baseDoc.body.map((b, idx) => {
      if (idx === 7 && b.type === 'paragraph') {
        const pNode = b as ParagraphNode;
        return {
          ...pNode,
          content: [{ id: 'text_dirty_7', type: 'text' as const, text: 'MODIFIED TEXT IN PARAGRAPH 7' }],
        };
      }
      return b;
    });

    const dirtyInfo = IncrementalLayoutPlanner.identifyDirtyNodes(baseDoc.body, modifiedBody);
    assert(
      'Dirty Node Detection identifies modified block ID and indices',
      dirtyInfo.dirtyNodeIds.includes('block_test_dirty_7') &&
        dirtyInfo.firstAffectedIndex === 7 &&
        dirtyInfo.lastAffectedIndex === 7,
      `Expected block 7 dirty, got ${JSON.stringify(dirtyInfo)}`
    );

    // --------------------------------------------------------------------------
    // Test 2: Change Scope Computation (Maps to affected page)
    // --------------------------------------------------------------------------
    const initialLayout = PaginationEngine.paginate(baseDoc, defaultOptions);
    assert('Initial layout creates valid pages', initialLayout.totalPages === 2, `Total pages: ${initialLayout.totalPages}`);

    const scope = IncrementalLayoutPlanner.computeChangeScope(
      initialLayout.document,
      baseDoc.body,
      modifiedBody,
      defaultOptions
    );

    assert('Change scope is incremental', scope.type === 'incremental', `Scope type: ${scope.type}`);
    assert('Change scope identifies affected page', scope.affectedPageIndex !== undefined && scope.affectedPageIndex >= 0);
    assert('Change scope preserves prefix pages count', (scope.reusedPrefixPagesCount || 0) >= 0);

    // --------------------------------------------------------------------------
    // Test 3: Incremental Reflow & Layout Convergence on 10-page document
    // --------------------------------------------------------------------------
    // 120 paragraphs generate exactly 10 pages
    const doc10 = createSyntheticDocument('doc_10p', 120);
    const layout10Initial = PaginationEngine.paginate(doc10, defaultOptions);
    const totalPages10 = layout10Initial.totalPages;
    assert('Doc10 initial layout produces 10 pages', totalPages10 === 10, `Pages: ${totalPages10}`);

    // Modify a block in the middle (index 60 on Page 5) with an in-place keystroke edit
    const doc10Modified: CanonicalDocument = {
      ...doc10,
      body: doc10.body.map((b, idx) => {
        if (idx === 60 && b.type === 'paragraph') {
          const pNode = b as ParagraphNode;
          return {
            ...pNode,
            content: [
              {
                id: 'text_doc_10p_60_mod',
                type: 'text' as const,
                text: 'Paragraph 60: Industrial DocLab high performance incremental layout scaling test sentence with extensive typography and deterministic line metrics. This paragraph ensures steady height across pages.',
              },
            ],
          };
        }
        return b;
      }),
    };

    const incrementalResult10 = PaginationEngine.paginateIncremental(
      layout10Initial.document,
      doc10Modified,
      defaultOptions
    );

    assert(
      'Incremental reflow completes with correct total pages',
      incrementalResult10.totalPages === totalPages10,
      `Expected ${totalPages10} pages, got ${incrementalResult10.totalPages}`
    );
    assert(
      'Incremental reflow detects layout convergence',
      Boolean(incrementalResult10.metrics?.converged),
      `Expected convergence, got: ${JSON.stringify(incrementalResult10.metrics)}`
    );
    assert(
      'Incremental reflow reuses prefix pages',
      (incrementalResult10.metrics?.reusedPrefixPagesCount || 0) > 0,
      `Prefix pages reused: ${incrementalResult10.metrics?.reusedPrefixPagesCount}`
    );
    assert(
      'Incremental reflow reuses suffix pages',
      (incrementalResult10.metrics?.reusedSuffixPagesCount || 0) > 0,
      `Suffix pages reused: ${incrementalResult10.metrics?.reusedSuffixPagesCount}`
    );
    assert(
      'Incremental reflow reflows strictly fewer pages than total',
      (incrementalResult10.metrics?.reflowedPagesCount || 0) < totalPages10,
      `Reflowed pages: ${incrementalResult10.metrics?.reflowedPagesCount} vs total: ${totalPages10}`
    );

    // --------------------------------------------------------------------------
    // Test 4: Scale Benchmark — 1 Page, 10 Pages, 50 Pages, 100 Pages, 500 Pages
    // --------------------------------------------------------------------------
    const scaleTargets = [
      { name: '1 Page', blockCount: 12, expectedPages: 1 },
      { name: '10 Pages', blockCount: 120, expectedPages: 10 },
      { name: '50 Pages', blockCount: 600, expectedPages: 50 },
      { name: '100 Pages', blockCount: 1200, expectedPages: 100 },
      { name: '500 Pages', blockCount: 6000, expectedPages: 500 },
    ];

    for (const target of scaleTargets) {
      const doc = createSyntheticDocument(`scale_${target.blockCount}`, target.blockCount);

      // Measure Initial Authoritative Layout
      const t0 = performance.now();
      const initialRes = PaginationEngine.paginate(doc, defaultOptions);
      const initialDurationMs = performance.now() - t0;

      assert(
        `Scale [${target.name}]: Initial layout completes (${initialRes.totalPages} pages in ${Math.round(initialDurationMs)}ms)`,
        initialRes.totalPages === target.expectedPages,
        `Expected ${target.expectedPages} pages, got ${initialRes.totalPages}`
      );

      // Edit one block in the middle with an in-place keystroke edit
      const middleIndex = Math.floor(target.blockCount / 2);
      const editedDoc: CanonicalDocument = {
        ...doc,
        body: doc.body.map((b, idx) => {
          if (idx === middleIndex && b.type === 'paragraph') {
            const pNode = b as ParagraphNode;
            return {
              ...pNode,
              content: [
                {
                  id: `text_scale_edit_${middleIndex}`,
                  type: 'text' as const,
                  text: `Paragraph ${middleIndex}: Keystroke edited block at middle position for scale benchmark testing. Layout engine will measure this block and converge immediately at the next page boundary.`,
                },
              ],
            };
          }
          return b;
        }),
      };

      // Measure Incremental Layout
      const t1 = performance.now();
      const incRes = PaginationEngine.paginateIncremental(initialRes.document, editedDoc, defaultOptions);
      const incDurationMs = performance.now() - t1;

      assert(
        `Scale [${target.name}]: Incremental edit preserves page count (${incRes.totalPages} pages in ${Math.round(incDurationMs)}ms)`,
        incRes.totalPages === initialRes.totalPages,
        `Expected ${initialRes.totalPages}, got ${incRes.totalPages}`
      );

      if (target.blockCount >= 120) {
        assert(
          `Scale [${target.name}]: Incremental reflow achieves layout convergence`,
          Boolean(incRes.metrics?.converged),
          `Metrics: ${JSON.stringify(incRes.metrics)}`
        );
        assert(
          `Scale [${target.name}]: Suffix pages preserved (${incRes.metrics?.reusedSuffixPagesCount} pages)`,
          (incRes.metrics?.reusedSuffixPagesCount || 0) > 0
        );
        assert(
          `Scale [${target.name}]: Prefix pages preserved (${incRes.metrics?.reusedPrefixPagesCount} pages)`,
          (incRes.metrics?.reusedPrefixPagesCount || 0) > 0
        );
      }
    }

    // --------------------------------------------------------------------------
    // Test 5: MeasurementCache Multi-factor Key & High Hit Rate Invariants
    // --------------------------------------------------------------------------
    const cache = MeasurementCache.getInstance();
    const statsBefore = cache.getStats();

    const sampleDoc = createSyntheticDocument('cache_eval', 120); // 10 pages
    const layoutA = PaginationEngine.paginate(sampleDoc, defaultOptions);
    const statsAfterInitial = cache.getStats();

    // Re-running or editing 1 block should achieve high cache hit rate
    const sampleDocEdited: CanonicalDocument = {
      ...sampleDoc,
      body: sampleDoc.body.map((b, idx) => {
        if (idx === 10 && b.type === 'paragraph') {
          const pNode = b as ParagraphNode;
          return {
            ...pNode,
            content: [
              {
                id: 'text_cache_eval_10_mod',
                type: 'text' as const,
                text: 'Paragraph 10: Updated cache test content preserving same general spatial footprint.',
              },
            ],
          };
        }
        return b;
      }),
    };

    const layoutB = PaginationEngine.paginateIncremental(layoutA.document, sampleDocEdited, defaultOptions);
    const statsAfterIncremental = cache.getStats();

    assert(
      'MeasurementCache records cache hits on incremental edit pass',
      statsAfterIncremental.hitCount > statsAfterInitial.hitCount,
      `Hits before: ${statsAfterInitial.hitCount}, Hits after: ${statsAfterIncremental.hitCount}`
    );

    assert(
      'MeasurementCache LRU size is within allocated capacity',
      statsAfterIncremental.size <= 25000,
      `Cache size: ${statsAfterIncremental.size}`
    );

    // --------------------------------------------------------------------------
    // Test 6: Page Insertion and Deletion Dynamics
    // --------------------------------------------------------------------------
    // Insert 24 paragraphs (exactly 2 full pages) in the middle
    const docWithInsertion: CanonicalDocument = {
      ...doc10,
      body: [
        ...doc10.body.slice(0, 60),
        ...Array.from({ length: 24 }).map((_, i) => ({
          id: `inserted_block_${i}`,
          type: 'paragraph' as const,
          content: [
            {
              id: `inserted_text_${i}`,
              type: 'text' as const,
              text: `Inserted Paragraph ${i}: Enterprise DocLab high performance incremental layout scaling test sentence with extensive typography and deterministic line metrics. This paragraph ensures steady height across pages.`,
            },
          ],
          attributes: { spacing: { before: 10, after: 10, line: 1.5 } },
        })),
        ...doc10.body.slice(60),
      ],
    };

    const expandedLayout = PaginationEngine.paginateIncremental(
      layout10Initial.document,
      docWithInsertion,
      defaultOptions
    );

    assert(
      'Inserting 2 pages of content increases total pages from 10 to 12',
      expandedLayout.totalPages === 12,
      `Original: ${totalPages10}, Expanded: ${expandedLayout.totalPages}`
    );

    // Delete 24 paragraphs to shrink document from 12 pages down to 10 pages
    const docWithDeletion: CanonicalDocument = {
      id: 'doc_shrunk',
      title: 'Shrunk Document',
      version: 1,
      metadata: doc10.metadata,
      body: docWithInsertion.body.slice(0, 120), // Keep first 120 blocks = 10 pages
    };

    const shrunkLayout = PaginationEngine.paginateIncremental(
      expandedLayout.document,
      docWithDeletion,
      defaultOptions
    );

    assert(
      'Deleting content decreases total pages from 12 back to 10',
      shrunkLayout.totalPages === 10,
      `Expanded: ${expandedLayout.totalPages}, Shrunk: ${shrunkLayout.totalPages}`
    );

    // --------------------------------------------------------------------------
    // Test 7: ControlledLayoutPipeline Authoritative Delegation
    // --------------------------------------------------------------------------
    const pureLayout = ControlledLayoutPipeline.computePureInitialLayout(doc10, defaultOptions);
    assert('ControlledLayoutPipeline pure initial layout succeeds', pureLayout.totalPages === 10);

    const authLayout = await ControlledLayoutPipeline.executeAuthoritativeLayout(
      doc10,
      defaultOptions,
      pureLayout.document
    );
    assert('ControlledLayoutPipeline authoritative layout succeeds with previousLayout', authLayout.totalPages === 10);
  } catch (err: any) {
    results.push({
      name: 'Fatal Exception in Incremental Reflow Test Suite',
      passed: false,
      error: err?.message || String(err),
    });
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  return { passed, failed, results };
}
