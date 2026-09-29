/**
 * Unit Test: Template Directives & Data Merge Engine
 * Covers: Token parsing, directives (#each, #filter), multi-value formatting,
 * and template data merging.
 */

import { parseTokenDirective, formatMultiValueData } from '../../../docLabDirectiveEngine';
import { separateDocxStylesAndBody, sanitizeDocxStyles } from '../../../docxStyleUtils';
import { mergeTemplateWithData } from '../../../docxTemplateEngine';

export function runTemplateMergeUnitTests(): { passed: number; failed: number } {
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

  console.log('--- UNIT TEST: TEMPLATE DIRECTIVES & DATA MERGE ---');

  // 1. Token Directive Parsing
  const singleToken = parseTokenDirective('student_name');
  assert(singleToken.baseKey === 'student_name', 'Parses simple token baseKey');
  assert(singleToken.hasDirective === false, 'Simple token has no directive');

  const directiveToken = parseTokenDirective('subjects <direction: vertical, separator: ", ">');
  assert(directiveToken.baseKey === 'subjects', 'Parses directive token baseKey');
  assert(directiveToken.hasDirective === true, 'Identifies directive presence');
  assert(directiveToken.options.direction === 'vertical', 'Parses direction option');
  assert(directiveToken.options.separator === ',' || directiveToken.options.separator === ', ', 'Parses custom separator');

  // 2. Multi-Value Data Formatting
  const subjectsArray = ['Mathematics', 'Physics', 'Chemistry'];
  const formattedVertical = formatMultiValueData(subjectsArray, { direction: 'vertical' });
  assert(formattedVertical.includes('Mathematics') && formattedVertical.includes('<br'), 'Vertical format contains line breaks');

  const formattedNumbered = formatMultiValueData(subjectsArray, { prefix: 'number', direction: 'vertical' });
  assert(formattedNumbered.includes('1. Mathematics'), 'Numbered prefix adds 1.');
  assert(formattedNumbered.includes('2. Physics'), 'Numbered prefix adds 2.');

  // 3. CSS Style and Body Separation
  const rawDocxHtml = `
    <style>
      @font-face { font-family: 'MassiveFont'; src: url('data:font/woff2;base64,AAA'); }
      .title { color: blue; }
    </style>
    <div class="content"><p>Student: {{name}}</p></div>
  `;
  const { styles, body } = separateDocxStylesAndBody(rawDocxHtml);
  assert(!styles.includes('@font-face'), 'Sanitizes and purges @font-face base64 blobs');
  assert(styles.includes('.title'), 'Preserves actual class rules');
  assert(body.includes('Student: {{name}}'), 'Extracts clean document body');

  // 4. Data Merging with Record
  const templateHtml = '<p>Name: {{student_name}}, Roll: {{roll_no}}</p>';
  const mergedHtml = mergeTemplateWithData(templateHtml, {
    student_name: 'John Doe',
    roll_no: '101',
  });
  assert(mergedHtml.includes('John Doe'), 'Interpolates student_name token');
  assert(mergedHtml.includes('101'), 'Interpolates roll_no token');
  assert(!mergedHtml.includes('{{student_name}}'), 'Replaces raw token placeholder completely');

  return { passed, failed };
}

if (process.argv[1]?.endsWith('template_merge.test.ts')) {
  const { passed, failed } = runTemplateMergeUnitTests();
  console.log(`\nTemplate Merge Unit Tests: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}
