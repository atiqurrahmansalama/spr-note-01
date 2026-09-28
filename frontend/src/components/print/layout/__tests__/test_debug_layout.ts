import { parseContinuousHtmlToLogicalNodes, projectCanonicalDocumentWithRuntimeSpacers } from '../logicalDocument';
import { PaginationEngine } from '../pagination/PaginationEngine';
import { PageGeometryCalculator } from '../geometry/PageGeometry';

const sampleText = `[ physical non-editable gap ]
|
[ Page 3 paper ]

NOT:

[ one continuous paper ]
----- dashed line ----
text continues through the boundary
----- dashed line ----
text continues

Inspect the current DocLabWorkbench, DocxLiveRenderer, page geometry/layout calculation and print CSS before modifying anything.

First identify exactly why the continuous editor's vertical flow currently enters the page-break gap.

Then implement the smallest architectural fix.

After implementation verify with a 4-page document:
- no text in gaps
- no text clipped at page boundaries
- Page 1 content stays within Page 1
- Page 2 content starts within Page 2
- margins remain correct
- Ctrl+A still selects all content
- editing across pages still works
- saved HTML contains no runtime spacer/page-break artifacts

Do NOT refactor unrelated pagination code.
Do NOT start a new pagination engine.
STOP after this fix and report the root cause, changed files, and browser verification result.Phase 1.5 — Fix content appearing in the page-break/gap area.

Current problem:
The physical page sheets are now visually separated, but document content can still flow into the vertical gap/page-break area between Page 1 and Page 2.

This must be fixed WITHOUT creating separate contentEditable roots.

Requirements:`;

console.log('=== TEST WITH RAW TEXT (NO HTML TAGS) ===');
const nodes1 = parseContinuousHtmlToLogicalNodes(sampleText);
console.log('nodes1 count:', nodes1.length);
nodes1.forEach((n, idx) => console.log('node', idx, n.type, 'id:', n.id, n.rawHtml?.substring(0, 30)));

const pag1 = PaginationEngine.paginate(sampleText, { pageSize: 'A4', orientation: 'PORTRAIT', margin: 'NORMAL' });
console.log('pag1 totalPages:', pag1.totalPages);
pag1.pages.forEach((p, idx) => {
  console.log(`Page ${idx + 1}: frags count: ${p.fragments.length}, usedHeight: ${p.usedHeight}, avail: ${p.availableHeight}`);
  p.fragments.forEach((f) => console.log(`   frag: ${f.id}, sourceNodeId: ${f.sourceNodeId}, height: ${f.rect.height}`));
});

const geom = PageGeometryCalculator.calculate({ pageSize: 'A4', orientation: 'PORTRAIT', margin: 'NORMAL' });
const projected1 = projectCanonicalDocumentWithRuntimeSpacers(sampleText, pag1, {
  paperDimensionsPx: geom.paperDimensionsPx,
  marginsPx: geom.marginsPx,
  pageSize: 'A4',
  orientation: 'PORTRAIT',
});

const spacers1 = projected1.match(/<div[^>]*spr-runtime-page-spacer[^>]*>/g) || [];
console.log('Projected1 spacers count:', spacers1.length);
spacers1.forEach((s, idx) => console.log('Spacer', idx, s));

console.log('\n=== TEST WITH HTML PARAGRAPHS ===');
const htmlWrapped = sampleText
  .split('\n\n')
  .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
  .join('\n');

const nodes2 = parseContinuousHtmlToLogicalNodes(htmlWrapped);
console.log('nodes2 count:', nodes2.length);

const pag2 = PaginationEngine.paginate(htmlWrapped, { pageSize: 'A4', orientation: 'PORTRAIT', margin: 'NORMAL' });
console.log('pag2 totalPages:', pag2.totalPages);
pag2.pages.forEach((p, idx) => {
  console.log(`Page ${idx + 1}: frags count: ${p.fragments.length}, usedHeight: ${p.usedHeight}, avail: ${p.availableHeight}`);
  p.fragments.forEach((f) => console.log(`   frag: ${f.id}, sourceNodeId: ${f.sourceNodeId}, height: ${f.rect.height}`));
});

const projected2 = projectCanonicalDocumentWithRuntimeSpacers(htmlWrapped, pag2, {
  paperDimensionsPx: geom.paperDimensionsPx,
  marginsPx: geom.marginsPx,
  pageSize: 'A4',
  orientation: 'PORTRAIT',
});

const spacers2 = projected2.match(/<div[^>]*spr-runtime-page-spacer[^>]*>/g) || [];
console.log('Projected2 spacers count:', spacers2.length);
spacers2.forEach((s, idx) => console.log('Spacer', idx, s));
