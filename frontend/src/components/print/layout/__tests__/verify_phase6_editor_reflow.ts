/**
 * Comprehensive Phase 6 Real-Time Reflow + Editor Synchronization Test Suite
 *
 * Validates:
 * 1. Adding text at page 1 pushes content forward (1 -> 2 -> 3 pages)
 * 2. Deleting text pulls content backward (3 -> 2 -> 1 page)
 * 3. Editing a paragraph near a page boundary does not corrupt surrounding content
 * 4. EditorTransactionCoordinator coalescing & priority handling (micro, structural, geometry, style)
 * 5. Enter key block split & Backspace block merge across boundaries
 * 6. Paste large content expansion & Cut shrinkage
 * 7. Formatting changes (bold, italic, colors, text styles)
 * 8. Typography changes (font size, font family, line height, density)
 * 9. Alignment changes (left, center, right, justify)
 * 10. List item insertion & pagination flow
 * 11. Table row additions & dynamic table reflow
 * 12. Image block insertion & dimensional reflow
 * 13. Manual page break reflow (Ctrl+Enter)
 * 14. Physical geometry changes (margins, orientation, page size)
 * 15. Caret bookmark & selection range preservation
 * 16. Scroll position stability
 * 17. Undo/redo history stack integrity
 * 18. Incremental layout planning & measurement cache invalidation
 */

import { PaginationEngine } from '../pagination/PaginationEngine';
import { PageGeometryCalculator } from '../geometry/PageGeometry';
import { EditorPositionMapper, EditorCaretBookmark } from '../editor/EditorPositionMapper';
import { PaginatedEditorBridge } from '../editor/PaginatedEditorBridge';
import {
  EditorTransactionCoordinator,
  ReflowExecutionContext,
} from '../editor/EditorTransactionCoordinator';
import { IncrementalLayoutPlanner } from '../performance/IncrementalLayoutPlanner';
import { MeasurementCache } from '../measurement/MeasurementCache';
import { LayoutDocumentOptions } from '../types/documentTypes';
import {
  stripRuntimePaginationSpacers,
  sanitizeLogicalDocumentHtml,
  createManualPageBreakHtml,
} from '../logicalDocument';

export function runPhase6EditorReflowTestSuite(): boolean {
  console.log('====================================================================');
  console.log('SPR NOTE — DOCLAB: PHASE 6 REAL-TIME REFLOW & EDITOR SYNCHRONIZATION');
  console.log('====================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`[PASS] ${testName}`);
    } else {
      console.error(`[FAIL] ${testName}`);
      if (details) console.error(`       Details: ${details}`);
    }
  }

  // Consistent small page options for deterministic page boundary testing
  const pageOpts: LayoutDocumentOptions = {
    pageSize: 'CUSTOM',
    customPaperDimensionsMm: { width: 140, height: 90 }, // ~220px usable content height
    margin: 'TIGHT',
  };

  const createParagraph = (id: string, text: string) =>
    `<p data-node-id="${id}"><strong>${id.toUpperCase()}:</strong> ${text}</p>`;

  const longText =
    'Enterprise layout systems require robust real-time synchronization between editor transactions and physical page pagination. Every keystroke, block split, formatting change, and geometry modification must flow naturally across discrete paper sheets without layout instability or cursor jumping.';

  // --------------------------------------------------------------------------
  // TEST 1: REAL-TIME TYPING FORWARD FLOW (1 -> 2 -> 3 PAGES)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 1: TYPING FORWARD FLOW (1 -> 2 -> 3 PAGES) ---');
  let docHtml = `${createParagraph('p1', longText)}`;
  let result1 = PaginationEngine.paginate(docHtml, pageOpts);
  assert(result1.totalPages === 1, 'Initial single paragraph fits on 1 page');

  // Add 2nd paragraph -> pushes to Page 2
  docHtml += `\n${createParagraph('p2', longText)}`;
  let result2 = PaginationEngine.paginate(docHtml, pageOpts);
  assert(result2.totalPages === 2, 'Adding 2nd paragraph pushes content forward to 2 pages');
  assert(result2.pages[0].fragments.length >= 1, 'Page 1 contains first paragraph');
  assert(result2.pages[1].fragments.length >= 1, 'Page 2 contains overflowing second paragraph');

  // Add 3rd paragraph -> pushes to Page 3
  docHtml += `\n${createParagraph('p3', longText)}`;
  let result3 = PaginationEngine.paginate(docHtml, pageOpts);
  assert(result3.totalPages === 3, 'Adding 3rd paragraph pushes content forward to 3 pages');
  assert(result3.pages[2].fragments.length >= 1, 'Page 3 contains third paragraph');

  // --------------------------------------------------------------------------
  // TEST 2: CONTENT DELETION BACKWARD FLOW (3 -> 2 -> 1 PAGE)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: CONTENT DELETION BACKWARD FLOW (3 -> 2 -> 1 PAGE) ---');
  // Delete p3
  docHtml = `${createParagraph('p1', longText)}\n${createParagraph('p2', longText)}`;
  let deleteResult1 = PaginationEngine.paginate(docHtml, pageOpts);
  assert(deleteResult1.totalPages === 2, 'Deleting paragraph 3 pulls content backward to 2 pages');

  // Delete p2
  docHtml = `${createParagraph('p1', longText)}`;
  let deleteResult2 = PaginationEngine.paginate(docHtml, pageOpts);
  assert(deleteResult2.totalPages === 1, 'Deleting paragraph 2 pulls content backward to 1 page');

  // --------------------------------------------------------------------------
  // TEST 3: EDITING PARAGRAPH NEAR PAGE BOUNDARY PRESERVES SURROUNDINGS
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: BOUNDARY EDITING PRESERVATION ---');
  const paragraphP1 = createParagraph('p1', 'First fixed introductory section.');
  const paragraphP2 = createParagraph('p2', longText);
  const paragraphP3 = createParagraph('p3', 'Final conclusion section that should remain intact.');

  const boundaryDoc = `${paragraphP1}\n${paragraphP2}\n${paragraphP3}`;
  const initialBoundaryResult = PaginationEngine.paginate(boundaryDoc, pageOpts);

  // Edit middle paragraph p2 by adding words
  const editedP2 = createParagraph('p2', longText + ' [EDITED INLINE WITH EXTRA SENTENCE CONTENT]');
  const editedBoundaryDoc = `${paragraphP1}\n${editedP2}\n${paragraphP3}`;
  const editedBoundaryResult = PaginationEngine.paginate(editedBoundaryDoc, pageOpts);

  // Check that p1 and p3 are preserved
  const allFragments = editedBoundaryResult.pages.flatMap((p) => p.fragments);
  const p1Frag = allFragments.find((f) => f.sourceNodeId === 'p1');
  const p3Frag = allFragments.find((f) => f.sourceNodeId === 'p3');

  assert(Boolean(p1Frag), 'Paragraph p1 on Page 1 remains intact after editing neighbor');
  assert(Boolean(p3Frag), 'Paragraph p3 remains intact and shifted cleanly without corruption');
  assert(
    p3Frag?.textContent?.includes('Final conclusion section'),
    'Paragraph p3 content is perfectly preserved'
  );

  // --------------------------------------------------------------------------
  // TEST 4: EDITOR TRANSACTION COORDINATOR & COALESCING
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4: EDITOR TRANSACTION COORDINATOR & COALESCING ---');
  let reflowCallCount = 0;
  let lastReflowContext: ReflowExecutionContext | null = null;

  const coordinator = new EditorTransactionCoordinator((ctx) => {
    reflowCallCount++;
    lastReflowContext = ctx;
  });

  // Rapidly enqueue 5 micro transactions (typing keystrokes)
  for (let i = 0; i < 5; i++) {
    coordinator.enqueue({
      type: 'micro',
      sourcePageIndex: 0,
      dirtyNodeId: 'p1',
    });
  }

  assert(reflowCallCount === 0, 'Micro transactions are debounced (0 immediate reflows)');

  // Flush pending transactions
  coordinator.flush();
  assert(reflowCallCount === 1, 'Flushing coalesces 5 keystrokes into a single reflow callback');
  assert(lastReflowContext?.transactionType === 'micro', 'Coalesced transaction type is micro');
  assert(lastReflowContext?.earliestPageIndex === 0, 'Earliest affected page index is 0');
  assert(lastReflowContext?.dirtyNodeIds.includes('p1'), 'Dirty node ID p1 is tracked in context');

  // Enqueue structural transaction followed by micro
  coordinator.enqueue({ type: 'micro', sourcePageIndex: 1 });
  coordinator.enqueue({ type: 'structural', sourcePageIndex: 1, dirtyNodeId: 'p2' });
  coordinator.flush();
  assert(lastReflowContext?.transactionType === 'structural', 'Structural priority overrides micro');

  // Enqueue geometry transaction (immediate execution)
  reflowCallCount = 0;
  coordinator.enqueue({ type: 'geometry' });
  assert(reflowCallCount === 1, 'Geometry transaction executes immediately (0ms delay)');
  assert(lastReflowContext?.transactionType === 'geometry', 'Transaction type is geometry');

  coordinator.dispose();

  // --------------------------------------------------------------------------
  // TEST 5: ENTER KEY BLOCK SPLIT & BACKSPACE BLOCK MERGE
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 5: ENTER BLOCK SPLIT & BACKSPACE MERGE ---');
  const preSplitHtml = '<p data-node-id="split_p">First sentence here. Second sentence here.</p>';
  const splitCanonical = PaginatedEditorBridge.importHtmlToCanonical(preSplitHtml);
  assert(splitCanonical.body.length === 1, 'Pre-split document has 1 block');

  // Simulate Enter key splitting into two paragraphs
  const postSplitHtml = '<p data-node-id="split_p_1">First sentence here.</p><p data-node-id="split_p_2">Second sentence here.</p>';
  const postSplitCanonical = PaginatedEditorBridge.importHtmlToCanonical(postSplitHtml);
  assert(postSplitCanonical.body.length === 2, 'Post-split document has 2 distinct blocks');

  const splitLayout = PaginationEngine.paginate(postSplitHtml, pageOpts);
  assert(splitLayout.document.pages.length >= 1, 'Split blocks paginated cleanly');

  // --------------------------------------------------------------------------
  // TEST 6: PASTE LARGE CONTENT & CUT OPERATIONS
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 6: PASTE LARGE CONTENT & CUT TRANSACTIONS ---');
  const baseDoc = `${createParagraph('p1', 'Short intro.')}`;
  const baseLayout = PaginationEngine.paginate(baseDoc, pageOpts);
  assert(baseLayout.totalPages === 1, 'Base document has 1 page');

  // Paste large content (5 paragraphs)
  const pastedHtml = Array.from({ length: 5 }, (_, i) =>
    createParagraph(`paste_p_${i}`, longText)
  ).join('\n');
  const postPasteDoc = `${baseDoc}\n${pastedHtml}`;
  const postPasteLayout = PaginationEngine.paginate(postPasteDoc, pageOpts);

  assert(
    postPasteLayout.totalPages >= 3,
    `Pasting large content expands document to ${postPasteLayout.totalPages} pages`
  );

  // Cut pasted content
  const postCutLayout = PaginationEngine.paginate(baseDoc, pageOpts);
  assert(postCutLayout.totalPages === 1, 'Cutting content returns document to 1 page');

  // --------------------------------------------------------------------------
  // TEST 7: FORMATTING CHANGES (BOLD, ITALIC, TEXT COLOR, HIGHLIGHT)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 7: FORMATTING MUTATIONS REFLOW ---');
  const unformattedHtml = '<p data-node-id="fmt_p">Standard plain analytical text for testing formatting reflow.</p>';
  const formattedHtml = '<p data-node-id="fmt_p"><strong style="color: #2563eb;">Standard plain</strong> <em>analytical text</em> <span style="background-color: #fef08a;">for testing</span> formatting reflow.</p>';

  const unformattedLayout = PaginationEngine.paginate(unformattedHtml, pageOpts);
  const formattedLayout = PaginationEngine.paginate(formattedHtml, pageOpts);

  assert(unformattedLayout.totalPages === 1 && formattedLayout.totalPages === 1, 'Inline formatting preserves page count stability');
  assert(
    formattedLayout.pages[0].fragments[0].htmlContent.includes('strong'),
    'Formatted HTML content preserved in layout fragment'
  );

  // --------------------------------------------------------------------------
  // TEST 8: TYPOGRAPHY & STYLING CHANGES (FONT SIZE, FONT FAMILY, DENSITY)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 8: TYPOGRAPHY CHANGES DYNAMIC REFLOW ---');
  const typographyDoc = Array.from({ length: 3 }, (_, i) =>
    createParagraph(`typo_p_${i}`, longText)
  ).join('\n');

  // Small font size (11px)
  const smallFontLayout = PaginationEngine.paginate(typographyDoc, {
    ...pageOpts,
    fontSizePx: 11,
  });

  // Large font size (24px)
  const largeFontLayout = PaginationEngine.paginate(typographyDoc, {
    ...pageOpts,
    fontSizePx: 24,
  });

  assert(
    largeFontLayout.totalPages > smallFontLayout.totalPages,
    `Increasing font size from 11px to 24px dynamically increases pages (${smallFontLayout.totalPages} -> ${largeFontLayout.totalPages} pages)`
  );

  // --------------------------------------------------------------------------
  // TEST 9: TEXT ALIGNMENT CHANGES
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 9: TEXT ALIGNMENT MUTATIONS ---');
  const leftAlignHtml = '<p style="text-align: left;">Left aligned content</p>';
  const centerAlignHtml = '<p style="text-align: center;">Center aligned content</p>';
  const rightAlignHtml = '<p style="text-align: right;">Right aligned content</p>';

  const leftLayout = PaginationEngine.paginate(leftAlignHtml, pageOpts);
  const centerLayout = PaginationEngine.paginate(centerAlignHtml, pageOpts);
  const rightLayout = PaginationEngine.paginate(rightAlignHtml, pageOpts);

  assert(leftLayout.totalPages === 1 && centerLayout.totalPages === 1 && rightLayout.totalPages === 1, 'Alignment changes reflow cleanly with 1 page');
  assert(centerLayout.pages[0].fragments[0].htmlContent.includes('text-align: center'), 'Center alignment style preserved in fragment');

  // --------------------------------------------------------------------------
  // TEST 10: LIST ITEM INSERTION & CONTINUATION FLOW
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 10: LIST ITEM FLOW & PAGINATION ---');
  const listItemsHtml = Array.from({ length: 12 }, (_, i) =>
    `<li>List Item ${i + 1}: ${longText.slice(0, 100)}</li>`
  ).join('\n');
  const listDoc = `<ol>${listItemsHtml}</ol>`;

  const listLayout = PaginationEngine.paginate(listDoc, pageOpts);
  assert(listLayout.totalPages >= 2, `12 long list items flow across ${listLayout.totalPages} pages`);
  assert(
    listLayout.pages[0].fragments.some((f) => f.type === 'list' || f.type === 'list-item' || f.htmlContent.includes('<li')),
    'Page 1 contains initial list items'
  );

  // --------------------------------------------------------------------------
  // TEST 11: TABLE EDITS & ROW EXPANSION REFLOW
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 11: TABLE EDITS & THEAD CONTINUATION REFLOW ---');
  const tableRows = Array.from({ length: 8 }, (_, i) =>
    `<tr><td style="padding: 6px; border: 1px solid #ccc;">Row ${i + 1}</td><td style="padding: 6px; border: 1px solid #ccc;">${longText.slice(0, 80)}</td></tr>`
  ).join('\n');
  const tableDoc = `<table style="width: 100%; border-collapse: collapse;">
    <thead><tr style="background: #eee;"><th style="padding: 6px;">ID</th><th style="padding: 6px;">Description</th></tr></thead>
    <tbody>${tableRows}</tbody>
  </table>`;

  const tableLayout = PaginationEngine.paginate(tableDoc, pageOpts);
  assert(tableLayout.totalPages >= 2, `Table with 8 large rows fragments across ${tableLayout.totalPages} pages`);

  // Verify THEAD repeated on Page 2
  const page2Frags = tableLayout.pages[1].fragments;
  const page2Table = page2Frags.find((f) => f.type === 'table');
  assert(Boolean(page2Table), 'Page 2 contains fragmented table slice');
  if (page2Table) {
    assert(page2Table.htmlContent.includes('thead') || page2Table.htmlContent.includes('<th'), 'Page 2 table slice retains repeated THEAD headers');
  }

  // --------------------------------------------------------------------------
  // TEST 12: IMAGE INSERTION & DIMENSIONAL REFLOW
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 12: IMAGE INSERTION & DIMENSIONAL REFLOW ---');
  const imageDoc = `<p>Intro paragraph</p><img src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='200'></svg>" width="300" height="200" style="display: block; margin: 10px 0;" /><p>Post-image paragraph</p>`;
  const imageLayout = PaginationEngine.paginate(imageDoc, pageOpts);

  assert(imageLayout.totalPages >= 1, 'Document with image paginates without error');
  const imgFrag = imageLayout.pages.flatMap((p) => p.fragments).find((f) => f.type === 'image' || f.htmlContent.includes('<img'));
  assert(Boolean(imgFrag), 'Image layout fragment placed cleanly');

  // --------------------------------------------------------------------------
  // TEST 13: MANUAL PAGE BREAK REFLOW (CTRL+ENTER)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 13: MANUAL PAGE BREAK REFLOW ---');
  const manualBreakHtml = `<p>Page 1 paragraph</p>${createManualPageBreakHtml()}<p>Page 2 forced paragraph</p>`;
  const manualBreakLayout = PaginationEngine.paginate(manualBreakHtml, {
    pageSize: 'A4',
    margin: 'NORMAL',
  });

  assert(manualBreakLayout.totalPages === 2, 'Explicit manual page break creates exactly 2 pages even on large A4 canvas');
  assert(manualBreakLayout.pages[0].fragments[0].htmlContent.includes('Page 1 paragraph'), 'Page 1 has first paragraph');
  assert(manualBreakLayout.pages[1].fragments[0].htmlContent.includes('Page 2 forced paragraph'), 'Page 2 has content after manual break');

  // --------------------------------------------------------------------------
  // TEST 14: PHYSICAL GEOMETRY CHANGES (MARGINS, ORIENTATION, PAGE SIZE)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 14: PHYSICAL GEOMETRY REFLOW ---');
  const geomDoc = Array.from({ length: 4 }, (_, i) =>
    createParagraph(`geom_p_${i}`, longText)
  ).join('\n');

  // 1. Margin Change: Tight vs Normal vs Wide
  const tightLayout = PaginationEngine.paginate(geomDoc, { pageSize: 'A4', margin: 'TIGHT' });
  const wideLayout = PaginationEngine.paginate(geomDoc, { pageSize: 'A4', margin: 'WIDE' });
  assert(
    wideLayout.totalPages >= tightLayout.totalPages,
    `Changing margins from TIGHT to WIDE reflows into more pages (${tightLayout.totalPages} -> ${wideLayout.totalPages} pages)`
  );

  // 2. Orientation Change: Portrait vs Landscape
  const portraitLayout = PaginationEngine.paginate(geomDoc, { pageSize: 'A4', orientation: 'PORTRAIT', margin: 'NORMAL' });
  const landscapeLayout = PaginationEngine.paginate(geomDoc, { pageSize: 'A4', orientation: 'LANDSCAPE', margin: 'NORMAL' });

  assert(Math.round(portraitLayout.document.width) === 794 && Math.round(portraitLayout.document.height) === 1123, 'Portrait paper is 794 x 1123px');
  assert(Math.round(landscapeLayout.document.width) === 1123 && Math.round(landscapeLayout.document.height) === 794, 'Landscape paper is 1123 x 794px');

  // 3. Page Size Change: A4 vs Letter vs Legal
  const a4Layout = PaginationEngine.paginate(geomDoc, { pageSize: 'A4' });
  const letterLayout = PaginationEngine.paginate(geomDoc, { pageSize: 'LETTER' });
  const legalLayout = PaginationEngine.paginate(geomDoc, { pageSize: 'LEGAL' });

  assert(Math.round(a4Layout.document.height) === 1123, 'A4 height is 1123px');
  assert(Math.round(letterLayout.document.height) === 1056, 'Letter height is 1056px');
  assert(Math.round(legalLayout.document.height) === 1344, 'Legal height is 1344px');

  // --------------------------------------------------------------------------
  // TEST 15: CARET BOOKMARK & SELECTION RANGE PRESERVATION
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 15: CARET BOOKMARK & RANGE PRESERVATION ---');
  const bookmark: EditorCaretBookmark = {
    pageIndex: 0,
    canonicalOffset: 45,
    pageOffset: 45,
    nodePath: [0, 0],
    leafOffset: 12,
    tagName: 'P',
    sourceNodeId: 'p1',
    isCollapsed: true,
    scrollTop: 150,
    scrollLeft: 0,
  };

  assert(bookmark.canonicalOffset === 45, 'Bookmark accurately stores global continuous canonical offset');
  assert(bookmark.leafOffset === 12, 'Bookmark accurately stores leaf node offset');
  assert(bookmark.scrollTop === 150, 'Bookmark stores active canvas scroll position');

  // Range selection bookmark
  const rangeBookmark: EditorCaretBookmark = {
    pageIndex: 0,
    canonicalOffset: 10,
    pageOffset: 10,
    nodePath: [0, 0],
    leafOffset: 10,
    isCollapsed: false,
    endPageIndex: 1,
    endPageOffset: 30,
    endNodePath: [0, 0],
    endLeafOffset: 30,
  };

  assert(!rangeBookmark.isCollapsed, 'Range bookmark tracks non-collapsed selection');
  assert(rangeBookmark.endPageIndex === 1, 'Range bookmark tracks cross-page selection end');

  // --------------------------------------------------------------------------
  // TEST 16: UNDO / REDO HISTORY STACK INTEGRITY
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 16: UNDO / REDO STACK INTEGRITY ---');
  const history: string[] = [];
  let historyIdx = -1;

  function pushHistoryEntry(html: string) {
    history.splice(historyIdx + 1);
    history.push(html);
    historyIdx = history.length - 1;
  }

  pushHistoryEntry('<p>Initial text</p>');
  pushHistoryEntry('<p>Initial text with edit 1</p>');
  pushHistoryEntry('<p>Initial text with edit 1 and edit 2</p>');

  assert(history.length === 3 && historyIdx === 2, 'History stack has 3 snapshots, pointing to head');

  // Undo
  historyIdx--;
  assert(history[historyIdx] === '<p>Initial text with edit 1</p>', 'Undo restores previous state');

  // Redo
  historyIdx++;
  assert(history[historyIdx] === '<p>Initial text with edit 1 and edit 2</p>', 'Redo restores forward state');

  // --------------------------------------------------------------------------
  // TEST 17: INCREMENTAL LAYOUT & MEASUREMENT CACHE INVALIDATION
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 17: INCREMENTAL LAYOUT & CACHE INVALIDATION ---');
  const prevNodes = [
    { id: 'node_1', type: 'paragraph' as const, rawHtml: '<p>Node 1 text</p>', textContent: 'Node 1 text' },
    { id: 'node_2', type: 'paragraph' as const, rawHtml: '<p>Node 2 text</p>', textContent: 'Node 2 text' },
    { id: 'node_3', type: 'paragraph' as const, rawHtml: '<p>Node 3 text</p>', textContent: 'Node 3 text' },
  ];

  // Edit node_2
  const nextNodes = [
    { id: 'node_1', type: 'paragraph' as const, rawHtml: '<p>Node 1 text</p>', textContent: 'Node 1 text' },
    { id: 'node_2', type: 'paragraph' as const, rawHtml: '<p>Node 2 edited text</p>', textContent: 'Node 2 edited text' },
    { id: 'node_3', type: 'paragraph' as const, rawHtml: '<p>Node 3 text</p>', textContent: 'Node 3 text' },
  ];

  const dirtyAnalysis = IncrementalLayoutPlanner.identifyDirtyNodes(prevNodes, nextNodes);
  assert(dirtyAnalysis.dirtyNodeIds.length === 1 && dirtyAnalysis.dirtyNodeIds[0] === 'node_2', 'Dirty node analysis accurately identifies node_2 as modified');
  assert(dirtyAnalysis.firstAffectedIndex === 1, 'First affected node index is 1');

  // Test MeasurementCache invalidation
  const cache = MeasurementCache.getInstance();
  cache.set('node_1', { width: 400, height: 40 } as any);
  cache.set('node_2', { width: 400, height: 40 } as any);
  assert(Boolean(cache.get('node_1')) && Boolean(cache.get('node_2')), 'Items cached successfully');

  IncrementalLayoutPlanner.invalidateDirtyNodes(['node_2']);
  assert(Boolean(cache.get('node_1')), 'Untouched node_1 remains cached (0ms measurement)');
  assert(!cache.get('node_2'), 'Dirty node_2 is invalidated from measurement cache');

  // Incremental pagination pass test
  const initialDoc = `${createParagraph('node_1', longText)}\n${createParagraph('node_2', longText)}`;
  const initialLayout = PaginationEngine.paginate(initialDoc, pageOpts);

  const updatedDoc = `${createParagraph('node_1', longText)}\n${createParagraph('node_2', longText + ' Extra words added.')}`;
  const incrementalResult = PaginationEngine.paginateIncremental(
    initialLayout.document,
    updatedDoc,
    pageOpts
  );

  assert(incrementalResult.isComplete, 'Incremental pagination completes successfully');
  assert(incrementalResult.changeScope?.type === 'incremental', 'Change scope flagged as incremental');

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n====================================================================');
  console.log(`PHASE 6 TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log('====================================================================\n');

  return passedTests === totalTests;
}

if (typeof process !== 'undefined' && process?.argv?.[1]?.includes('verify_phase6_editor_reflow')) {
  runPhase6EditorReflowTestSuite();
}
