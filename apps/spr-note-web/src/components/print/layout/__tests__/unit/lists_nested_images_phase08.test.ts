/**
 * Phase 08 — Lists, Nested Blocks, Images & Figures Torture Test Suite
 *
 * Requirements:
 * - Unordered lists (<ul>)
 * - Ordered lists (<ol>) with continuation numbering (`start="N"`)
 * - Nested lists preserving hierarchy
 * - List items intact, single oversized item splitting
 * - Blockquotes (<blockquote>) with border-left and styling continuity
 * - Generic containers & callouts (<section>, .callout)
 * - Figures, Images, and Captions (<figure> + <figcaption>)
 * - SVG vector shapes and viewBox preservation
 * - Semantic relationships: image + caption, figure + caption, keep-with-next
 * - Image dimensions, max-width, aspect ratio, resource loading observers
 */

import { ListFragmenter } from '../../fragmentation/ListFragmenter';
import { NestedBlockFragmenter } from '../../fragmentation/NestedBlockFragmenter';
import { ImageFragmenter } from '../../fragmentation/ImageFragmenter';
import { KeepTogetherResolver } from '../../pagination/KeepTogetherResolver';
import { DocumentFactory } from '../../../model/documentFactory';
import { HtmlExporter } from '../../../model/serialization/htmlExporter';
import { HtmlImporter } from '../../../model/serialization/htmlImporter';
import { ListNode, ImageNode, SvgNode, SectionNode } from '../../../model/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

export function runListsNestedImagesPhase08UnitTests(): { passed: number; failed: number } {
  console.log('--- Running Phase 08: Lists, Nested Blocks, Images & Figures Unit Tests ---');
  let passed = 0;
  let failed = 0;

  // =========================================================================
  // TEST 1: Unordered list fragmentation across page boundary (50 items)
  // =========================================================================
  try {
    const listItems = Array.from({ length: 50 }, (_, i) => `<li>Academic Requirement Item #${i + 1}</li>`).join('\n');
    const listHtml = `<ul class="requirements-list">\n${listItems}\n</ul>`;

    const split = ListFragmenter.splitList(listHtml, 200); // 200px fits ~7 items

    assert(split.isSplit === true, '50-item list split across page boundary');
    assert(split.itemsOnFirstPage > 0, 'First page contains non-zero items');
    assert(split.remainingItemsCount > 0, 'Continuation page contains non-zero items');
    assert(split.itemsOnFirstPage + split.remainingItemsCount === 50, 'Exact item conservation (50 / 50 items)');

    assert(split.firstFragmentHtml.startsWith('<ul'), 'First fragment starts with <ul>');
    assert(split.firstFragmentHtml.includes('Academic Requirement Item #1'), 'First fragment contains Item #1');
    assert(split.remainingFragmentHtml !== null, 'Remaining fragment exists');
    assert(split.remainingFragmentHtml!.includes('data-list-continuation="true"'), 'Continuation fragment marked data-list-continuation="true"');
    assert(split.remainingFragmentHtml!.includes('Academic Requirement Item #50'), 'Continuation fragment contains Item #50');
    passed++;
  } catch (err: any) {
    console.error('  ✗ Unordered list fragmentation failed:', err.message);
    failed++;
  }

  // =========================================================================
  // TEST 2: Ordered list (<ol>) numbering continuity across multi-page split
  // =========================================================================
  try {
    const olItems = Array.from({ length: 25 }, (_, i) => `<li>Standard Operating Procedure Step ${i + 1}</li>`).join('\n');
    const olHtml = `<ol class="sop-steps" start="1">\n${olItems}\n</ol>`;

    // Split with available height fitting ~5 items per page
    const fragments = ListFragmenter.fragmentListAcrossPages(olHtml, [140, 140, 140, 140, 140, 140]);

    assert(fragments.length >= 4, `Ordered list sliced into ${fragments.length} sequential pages`);
    assert(fragments[0].isFirstFragment === true, 'First fragment flagged isFirstFragment === true');
    assert(fragments[fragments.length - 1].isLastFragment === true, 'Last fragment flagged isLastFragment === true');

    // Verify start attributes on continuation pages
    assert(fragments[0].html.includes('<ol'), 'Page 1 has <ol>');
    assert(fragments[1].html.includes('start="'), 'Page 2 has continuation start attribute');
    assert(fragments[2].html.includes('start="'), 'Page 3 has continuation start attribute');

    // Extract start numbers and verify monotonicity
    const start2Match = fragments[1].html.match(/start="(\d+)"/i);
    const start2 = start2Match ? parseInt(start2Match[1], 10) : 0;
    assert(start2 > 1, `Page 2 starts at correct offset (got ${start2})`);

    const start3Match = fragments[2].html.match(/start="(\d+)"/i);
    const start3 = start3Match ? parseInt(start3Match[1], 10) : 0;
    assert(start3 > start2, `Page 3 starts at higher offset than Page 2 (${start3} > ${start2})`);

    // Verify total item conservation
    const totalItems = fragments.reduce((sum, f) => sum + f.itemCount, 0);
    assert(totalItems === 25, `Exact item conservation across all pages (${totalItems} === 25)`);
    passed++;
  } catch (err: any) {
    console.error('  ✗ Ordered list numbering continuity failed:', err.message);
    failed++;
  }

  // =========================================================================
  // TEST 3: Custom start offset on Ordered List (<ol start="100">)
  // =========================================================================
  try {
    const olCustomHtml = `
      <ol start="100">
        <li>Exam Section A</li>
        <li>Exam Section B</li>
        <li>Exam Section C</li>
        <li>Exam Section D</li>
        <li>Exam Section E</li>
        <li>Exam Section F</li>
        <li>Exam Section G</li>
        <li>Exam Section H</li>
      </ol>
    `;

    const split = ListFragmenter.splitList(olCustomHtml, 90); // ~3 items on first page

    assert(split.isSplit === true, 'Custom start list split');
    assert(split.firstFragmentHtml.includes('Exam Section A'), 'First page has Exam Section A');
    assert(split.remainingFragmentHtml !== null, 'Continuation exists');
    assert(split.remainingFragmentHtml!.includes(`start="${100 + split.itemsOnFirstPage}"`), `Continuation starts at 100 + ${split.itemsOnFirstPage}`);
    passed++;
  } catch (err: any) {
    console.error('  ✗ Custom start offset list failed:', err.message);
    failed++;
  }

  // =========================================================================
  // TEST 4: Nested list hierarchy preservation across page splits
  // =========================================================================
  try {
    const nestedHtml = `
      <ul class="nested-tree">
        <li>Module 1: Introduction</li>
        <li>Module 2: Core Engineering
          <ul>
            <li>Topic 2.1: Data Structures</li>
            <li>Topic 2.2: Algorithms</li>
            <li>Topic 2.3: System Design</li>
          </ul>
        </li>
        <li>Module 3: Advanced Topics
          <ul>
            <li>Topic 3.1: Distributed Systems</li>
            <li>Topic 3.2: Cloud Infrastructure</li>
          </ul>
        </li>
        <li>Module 4: Conclusion</li>
      </ul>
    `;

    const split = ListFragmenter.splitList(nestedHtml, 120);

    assert(split.isSplit === true, 'Nested list split across pages');
    assert(split.firstFragmentHtml.includes('Module 1: Introduction'), 'First page has Module 1');
    assert(split.remainingFragmentHtml !== null, 'Continuation fragment exists');
    assert(split.remainingFragmentHtml!.includes('Module 4: Conclusion'), 'Continuation page has Module 4');
    passed++;
  } catch (err: any) {
    console.error('  ✗ Nested list hierarchy preservation failed:', err.message);
    failed++;
  }

  // =========================================================================
  // TEST 5: Checklist / Task list state preservation (checked, disabled)
  // =========================================================================
  try {
    const checklistHtml = `
      <ul class="checklist">
        <li class="checklist-item"><input type="checkbox" checked disabled /> Complete requirement audit</li>
        <li class="checklist-item"><input type="checkbox" checked disabled /> Implement line model</li>
        <li class="checklist-item"><input type="checkbox" checked disabled /> Implement table fragmentation</li>
        <li class="checklist-item"><input type="checkbox" disabled /> Implement list fragmentation</li>
        <li class="checklist-item"><input type="checkbox" disabled /> Run comprehensive tests</li>
      </ul>
    `;

    const split = ListFragmenter.splitList(checklistHtml, 70);

    assert(split.isSplit === true, 'Checklist split across page boundary');
    assert(split.firstFragmentHtml.includes('type="checkbox"'), 'First page retains checkbox input');
    assert(split.firstFragmentHtml.includes('checked'), 'First page retains checked state');
    assert(split.remainingFragmentHtml!.includes('type="checkbox"'), 'Continuation page retains checkbox input');
    passed++;
  } catch (err: any) {
    console.error('  ✗ Checklist state preservation failed:', err.message);
    failed++;
  }

  // =========================================================================
  // TEST 6: AST ListNode splitting and merging
  // =========================================================================
  try {
    const listAST: ListNode = DocumentFactory.createList({
      id: 'list_ast_1',
      listType: 'ordered',
      start: 1,
      items: Array.from({ length: 12 }, (_, idx) =>
        DocumentFactory.createListItem({
          id: `li_${idx + 1}`,
          content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText(`Item ${idx + 1}`)] })],
        })
      ),
    });

    const split = ListFragmenter.splitListNode(listAST, 100);

    assert(split.isSplit === true, 'AST ListNode split');
    assert(split.firstFragmentNode !== undefined, 'First fragment AST exists');
    assert(split.firstFragmentNode!.items.length > 0, 'First fragment AST has items');
    assert(split.remainingFragmentNode !== null, 'Continuation fragment AST exists');
    assert(split.remainingFragmentNode!.start === 1 + split.firstFragmentNode!.items.length, 'Continuation AST start offset updated accurately');
    assert(split.firstFragmentNode!.items.length + split.remainingFragmentNode!.items.length === 12, 'Exact 12/12 items preserved in AST');
    passed++;
  } catch (err: any) {
    console.error('  ✗ AST ListNode splitting failed:', err.message);
    failed++;
  }

  // =========================================================================
  // TEST 7: Blockquote (<blockquote>) fragmentation with styling continuity
  // =========================================================================
  try {
    const bqHtml = `
      <blockquote style="border-left: 4px solid #3b82f6; padding-left: 16px; font-style: italic; color: #334155;">
        <p>First paragraph of important presidential directive and compliance instructions.</p>
        <p>Second paragraph outlining operational security guidelines, multi-factor verification, and audit protocol.</p>
        <p>Third paragraph describing mandatory institutional review timelines and governance standards.</p>
        <p>Fourth paragraph with final closing remarks and official authorization sign-off.</p>
      </blockquote>
    `;

    const split = NestedBlockFragmenter.splitBlockquote(bqHtml, 100);

    assert(split.isSplit === true, 'Blockquote split across pages');
    assert(split.firstFragmentHtml.startsWith('<blockquote'), 'First fragment starts with <blockquote>');
    assert(split.firstFragmentHtml.includes('border-left: 4px solid #3b82f6'), 'First fragment preserves border-left style');
    assert(split.firstFragmentHtml.includes('First paragraph'), 'First fragment contains Paragraph 1');

    assert(split.remainingFragmentHtml !== null, 'Remaining blockquote fragment exists');
    assert(split.remainingFragmentHtml!.startsWith('<blockquote'), 'Continuation starts with <blockquote>');
    assert(split.remainingFragmentHtml!.includes('data-blockquote-continuation="true"'), 'Continuation has continuation marker');
    assert(split.remainingFragmentHtml!.includes('border-left: 4px solid #3b82f6'), 'Continuation preserves border-left style');
    assert(split.remainingFragmentHtml!.includes('Fourth paragraph'), 'Continuation contains Paragraph 4');
    passed++;
  } catch (err: any) {
    console.error('  ✗ Blockquote fragmentation failed:', err.message);
    failed++;
  }

  // =========================================================================
  // TEST 8: Generic container / section fragmentation
  // =========================================================================
  try {
    const sectionAST: SectionNode = DocumentFactory.createSection({
      id: 'sec_container_1',
      sectionTitle: 'Administrative Section',
      content: [
        DocumentFactory.createHeading({ id: 'h_sec', level: 2, content: [DocumentFactory.createText('Section Header')] }),
        DocumentFactory.createParagraph({ id: 'p_sec_1', content: [DocumentFactory.createText('Paragraph in Section 1')] }),
        DocumentFactory.createParagraph({ id: 'p_sec_2', content: [DocumentFactory.createText('Paragraph in Section 2')] }),
        DocumentFactory.createParagraph({ id: 'p_sec_3', content: [DocumentFactory.createText('Paragraph in Section 3')] }),
      ],
    });

    const split = NestedBlockFragmenter.splitSectionNode(sectionAST, 100);

    assert(split.isSplit === true, 'SectionNode split across pages');
    assert(split.firstFragmentNode !== undefined, 'First fragment SectionNode exists');
    assert(split.remainingFragmentNode !== null, 'Continuation SectionNode exists');
    assert(split.firstFragmentNode!.content.length + split.remainingFragmentNode!.content.length === 4, 'All 4 child blocks preserved');
    passed++;
  } catch (err: any) {
    console.error('  ✗ Section container fragmentation failed:', err.message);
    failed++;
  }

  // =========================================================================
  // TEST 9: Image dimension calculations, max-width & aspect ratio
  // =========================================================================
  try {
    // 16:9 Image constrained by container width
    const dims1 = ImageFragmenter.calculateImageDimensions(800, undefined, 600, 900, 16 / 9);
    assert(dims1.width === 600, 'Width constrained to container width 600px');
    assert(dims1.height === Math.round(600 / (16 / 9)), 'Height scaled proportionally to 16:9 (338px)');
    assert(dims1.isConstrained === true, 'Marked as constrained');

    // Image with explicit width and height
    const dims2 = ImageFragmenter.calculateImageDimensions(300, 200, 600, 900);
    assert(dims2.width === 300, 'Explicit width 300px preserved');
    assert(dims2.height === 200, 'Explicit height 200px preserved');
    assert(dims2.aspectRatio === 1.5, 'Aspect ratio is 1.5');

    // Image constrained by max page height
    const dims3 = ImageFragmenter.calculateImageDimensions(400, 1200, 600, 800);
    assert(dims3.height === 800, 'Height constrained to max page height 800px');
    assert(dims3.width < 400, 'Width scaled down proportionally');
    passed++;
  } catch (err: any) {
    console.error('  ✗ Image dimension calculations failed:', err.message);
    failed++;
  }

  // =========================================================================
  // TEST 10: Figure + Figcaption atomic binding (never broken across pages)
  // =========================================================================
  try {
    const imgNode: ImageNode = DocumentFactory.createImage({
      id: 'img_diagram_1',
      src: 'https://example.com/system-architecture.png',
      alt: 'System Architecture Diagram',
      caption: 'Figure 1.1: Distributed Microservices Architecture Overview',
      width: 500,
      height: 300,
      alignment: 'center',
    });

    const evalRes = ImageFragmenter.evaluateImageNode(imgNode, 500);

    assert(evalRes.fitsCurrentPage === true, 'Figure fits within 500px available height');
    assert(evalRes.isAtomic === true, 'Figure evaluated as atomic block');
    assert(evalRes.keepTogether === true, 'Figure evaluated with keepTogether: true');
    assert(evalRes.htmlContent.includes('<figure'), 'Rendered as semantic <figure>');
    assert(evalRes.htmlContent.includes('<figcaption'), 'Rendered with semantic <figcaption>');
    assert(evalRes.htmlContent.includes('Figure 1.1: Distributed Microservices Architecture Overview'), 'Caption text preserved');

    // When space is cramped (e.g. only 100px available for 340px figure)
    const evalOverflow = ImageFragmenter.evaluateImageNode(imgNode, 100);
    assert(evalOverflow.fitsCurrentPage === false, 'Figure does not fit in 100px');
    assert(evalOverflow.requiresNewPage === true, 'Figure cleanly requires new page (atomic keep-together)');
    passed++;
  } catch (err: any) {
    console.error('  ✗ Figure and caption atomic binding failed:', err.message);
    failed++;
  }

  // =========================================================================
  // TEST 11: Semantic keep-with-next for Image and following caption/text
  // =========================================================================
  try {
    const imgEl = {
      tagName: 'figure',
      classList: { contains: (cls: string) => cls === 'keep-with-next' || cls === 'doclab-figure' },
      getAttribute: (attr: string) => attr === 'style' ? 'break-after: avoid;' : null,
    };

    const nextCaption = {
      tagName: 'figcaption',
      classList: { contains: (cls: string) => cls === 'doclab-image-caption' },
      className: 'doclab-image-caption',
    };

    // When remaining space cannot accommodate caption
    const shouldPush = KeepTogetherResolver.shouldPushWithNext(imgEl, nextCaption, 300, 310);
    assert(shouldPush === true, 'Image pushed with following caption when remaining space is insufficient');
    passed++;
  } catch (err: any) {
    console.error('  ✗ Semantic keep-with-next failed:', err.message);
    failed++;
  }

  // =========================================================================
  // TEST 12: SVG vector graphic dimensions and viewBox preservation
  // =========================================================================
  try {
    const rawSvg = '<svg viewBox="0 0 200 200" width="100" height="100"><circle cx="100" cy="100" r="80" fill="#2563eb"/></svg>';
    const svgNode: SvgNode = DocumentFactory.createSvg({
      id: 'svg_seal_1',
      svgContent: rawSvg,
      viewBox: '0 0 200 200',
      width: 100,
      height: 100,
      alignment: 'center',
    });

    const evalSvg = ImageFragmenter.evaluateImageNode(svgNode, 400);

    assert(evalSvg.fitsCurrentPage === true, 'SVG fits within available space');
    assert(evalSvg.htmlContent.includes('<svg'), 'Rendered with valid <svg> markup');
    assert(evalSvg.htmlContent.includes('viewBox="0 0 200 200"'), 'Preserved viewBox attribute');
    assert(evalSvg.htmlContent.includes('fill="#2563eb"'), 'Preserved vector path/circle attributes');
    assert(evalSvg.isAtomic === true, 'SVG marked as atomic block');
    passed++;
  } catch (err: any) {
    console.error('  ✗ SVG vector graphics failed:', err.message);
    failed++;
  }

  // =========================================================================
  // TEST 13: Image load re-layout observer creation
  // =========================================================================
  try {
    let relayoutCalled = false;
    const cleanup = ImageFragmenter.createImageLoadRelayoutObserver(
      typeof document !== 'undefined' ? document.body : ({} as any),
      () => {
        relayoutCalled = true;
      }
    );

    assert(typeof cleanup === 'function', 'createImageLoadRelayoutObserver returns cleanup function');
    cleanup();
    passed++;
  } catch (err: any) {
    console.error('  ✗ Image load observer failed:', err.message);
    failed++;
  }

  // =========================================================================
  // TEST 14: Serialization and Importer round-trip for Figure, Blockquote, List
  // =========================================================================
  try {
    const sampleHtml = `
      <figure class="doclab-figure">
        <img src="https://example.com/photo.jpg" alt="Campus Photo" width="400" height="300" />
        <figcaption>Main University Campus</figcaption>
      </figure>
      <blockquote>
        <p>Institutional integrity is the cornerstone of academic excellence.</p>
      </blockquote>
      <ol start="5">
        <li>Step Five</li>
        <li>Step Six</li>
      </ol>
    `;

    const importedDoc = HtmlImporter.parseHtml(sampleHtml);
    assert(importedDoc.body.length >= 3, `Imported ${importedDoc.body.length} blocks from rich HTML`);

    const imgBlock = importedDoc.body.find((b) => b.type === 'image') as ImageNode | undefined;
    assert(imgBlock !== undefined, 'Figure parsed into ImageNode');
    assert(imgBlock?.caption === 'Main University Campus', 'ImageNode has caption "Main University Campus"');

    const bqBlock = importedDoc.body.find((b) => b.type === 'section') as SectionNode | undefined;
    assert(bqBlock !== undefined, 'Blockquote parsed into SectionNode');

    const listBlock = importedDoc.body.find((b) => b.type === 'list') as ListNode | undefined;
    assert(listBlock !== undefined, 'List parsed into ListNode');
    assert(listBlock?.listType === 'ordered', 'List recognized as ordered');

    passed++;
  } catch (err: any) {
    console.error('  ✗ Importer round-trip failed:', err.message);
    failed++;
  }

  console.log(`Phase 08 Results: ${passed} Passed, ${failed} Failed`);
  return { passed, failed };
}
