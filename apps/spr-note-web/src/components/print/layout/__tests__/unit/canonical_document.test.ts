/**
 * Unit Test: Canonical Document Model & Logical AST
 * Covers: Canonical AST parsing, semantic tagging, manual break markers,
 * sanitization, and migration normalization.
 */

import {
  parseContinuousHtmlToLogicalNodes,
  isExplicitManualBreak,
  createManualPageBreakHtml,
  stripRuntimePaginationSpacers,
  sanitizeLogicalDocumentHtml,
  normalizeLogicalDocumentHtml,
  serializeLogicalNodesToContinuousHtml,
} from '../../logicalDocument';

export function runCanonicalDocumentUnitTests(): { passed: number; failed: number } {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      passed++;
      console.log(`  ✓ ${desc}`);
    } else {
      failed++;
      console.error(`  ✗ FAIL: ${desc}`);
    }
  }

  console.log('--- UNIT TEST: CANONICAL DOCUMENT & LOGICAL AST ---');

  // 1. Manual Page Break Semantics
  const manualBreakHtml = createManualPageBreakHtml();
  assert(
    manualBreakHtml.includes('data-manual-break="true"'),
    'createManualPageBreakHtml sets data-manual-break attribute'
  );
  assert(
    manualBreakHtml.includes('class="spr-page-break"'),
    'createManualPageBreakHtml includes spr-page-break class'
  );
  assert(
    !manualBreakHtml.includes('spr-runtime-page-spacer'),
    'createManualPageBreakHtml contains zero runtime spacer tags'
  );
  assert(
    isExplicitManualBreak(manualBreakHtml),
    'isExplicitManualBreak recognizes semantic manual break tag'
  );
  assert(
    isExplicitManualBreak('<!-- spr-page-break:manual -->'),
    'isExplicitManualBreak recognizes manual break comment marker'
  );
  assert(
    !isExplicitManualBreak('<div class="spr-runtime-page-spacer"></div>'),
    'isExplicitManualBreak rejects runtime spacer tags'
  );

  // 2. Canonical Sanitization
  const dirtyHtml = `
    <h1>Title</h1>
    <div class="spr-runtime-page-spacer" data-spr-runtime-pagination="true" style="height:100px;"></div>
    <p>Content block 1</p>
    <!-- spr-runtime-page-spacer -->
    <div class="doclab-runtime-overlay"></div>
    <p>Content block 2</p>
    <div class="spr-page-break" data-manual-break="true"></div>
    <p>Content block 3</p>
  `;
  const sanitized = sanitizeLogicalDocumentHtml(dirtyHtml);
  assert(!sanitized.includes('spr-runtime-page-spacer'), 'Sanitization purges .spr-runtime-page-spacer');
  assert(!sanitized.includes('doclab-runtime-overlay'), 'Sanitization purges .doclab-runtime-overlay');
  assert(!sanitized.includes('data-spr-runtime-pagination'), 'Sanitization purges data-spr-runtime-pagination');
  assert(sanitized.includes('Title'), 'Sanitization preserves heading');
  assert(sanitized.includes('Content block 1'), 'Sanitization preserves content block 1');
  assert(sanitized.includes('Content block 2'), 'Sanitization preserves content block 2');
  assert(sanitized.includes('Content block 3'), 'Sanitization preserves content block 3');
  assert(sanitized.includes('data-manual-break="true"'), 'Sanitization preserves explicit manual page breaks');

  // 3. Logical AST Parsing & Semantic Constraint Tagging
  const testMarkup = `
    <h2>Institutional Summary</h2>
    <p>Detailed performance narrative.</p>
    <table><thead><tr><th>Subject</th><th>Score</th></tr></thead><tbody><tr><td>Math</td><td>95</td></tr></tbody></table>
    <div class="spr-page-break" data-manual-break="true"></div>
    <img src="data:image/png;base64,sample" alt="Seal" />
  `;
  const nodes = parseContinuousHtmlToLogicalNodes(testMarkup);
  assert(nodes.length === 5, `Parses exactly 5 logical AST nodes (got ${nodes.length})`);
  assert(nodes[0].type === 'heading' && nodes[0].constraints?.keepWithNext === true, 'Heading node tagged with keepWithNext: true');
  assert(nodes[1].type === 'paragraph', 'Paragraph node identified correctly');
  assert(nodes[2].type === 'table' && nodes[2].constraints?.repeatTableHeader === true, 'Table node tagged with repeatTableHeader: true');
  assert(nodes[3].isManualBreak === true, 'Manual break node tagged with isManualBreak: true');
  assert(nodes[4].type === 'image' && nodes[4].constraints?.keepTogether === true, 'Image node tagged with keepTogether: true');

  // 4. Migration Normalization of Legacy DOCX Wrappers
  const legacyWrapped = `
    <div class="docx-parsed-body">
      <section class="docx">
        <h1>Legacy Header</h1>
        <p>Legacy body paragraph</p>
      </section>
    </div>
  `;
  const unpacked = parseContinuousHtmlToLogicalNodes(legacyWrapped);
  assert(unpacked.length === 2, `Unpacks legacy wrappers to direct nodes (got ${unpacked.length})`);
  assert(unpacked[0].type === 'heading', 'First unpacked node is heading');
  assert(unpacked[1].type === 'paragraph', 'Second unpacked node is paragraph');

  // 5. Logical Serialization
  const serialized = serializeLogicalNodesToContinuousHtml(nodes);
  assert(serialized.includes('<h2>Institutional Summary</h2>'), 'Serialization preserves headings');
  assert(serialized.includes('Detailed performance narrative.'), 'Serialization preserves paragraphs');
  assert(serialized.includes('repeatTableHeader') === false, 'Serialization outputs standard clean HTML without metadata keys');
  assert(!serialized.includes('spr-runtime-page-spacer'), 'Serialization contains zero runtime spacers');

  return { passed, failed };
}

if (process.argv[1]?.endsWith('canonical_document.test.ts')) {
  const { passed, failed } = runCanonicalDocumentUnitTests();
  console.log(`\nCanonical Document Unit Tests: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}
