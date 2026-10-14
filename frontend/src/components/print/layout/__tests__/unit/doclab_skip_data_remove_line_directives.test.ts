/**
 * Unit Test Suite: DocLab Conditional Skip & Line Removal Directives
 * 
 * Verifies:
 * 1. parseRemoveLineSpec specification parsing (b, a, b1, a1, b1-5, a1-5, b2, a3, etc.)
 * 2. applySkipDataAndRemoveLines array processing without index shifting bugs
 * 3. formatMultiValueData multiline and HTML-break handling with combined directives
 * 4. parseTokenDirective directive extraction for skipData and removeLine
 * 5. tokenChipRenderer extractTokenSummary and buildTokenString bidirectional parity
 */

import {
  parseRemoveLineSpec,
  applySkipDataAndRemoveLines,
  formatMultiValueData,
  parseTokenDirective,
} from '../../../docLabDirectiveEngine';
import {
  extractTokenSummary,
  buildTokenString,
} from '../../../components/tokens/tokenChipRenderer';
import { mergeTemplateWithData } from '../../../docxTemplateEngine';

export async function runSkipDataRemoveLineDirectivesUnitTests(): Promise<{
  passed: number;
  failed: number;
  suiteName: string;
}> {
  let passed = 0;
  let failed = 0;
  const suiteName = 'DocLab Conditional Skip & Line Removal Directives';

  function assert(condition: boolean, msg: string) {
    if (condition) {
      passed++;
      console.log(`  ✓ ${msg}`);
    } else {
      failed++;
      console.error(`  ✗ FAIL: ${msg}`);
    }
  }

  console.log(`\n--- UNIT TEST: ${suiteName.toUpperCase()} ---`);

  // 1. parseRemoveLineSpec
  {
    const r1 = parseRemoveLineSpec('b');
    assert(r1.beforeCount === 1 && r1.afterCount === 0, 'parseRemoveLineSpec handles "b"');

    const r2 = parseRemoveLineSpec('b1');
    assert(r2.beforeCount === 1 && r2.afterCount === 0, 'parseRemoveLineSpec handles "b1"');

    const r3 = parseRemoveLineSpec('a');
    assert(r3.afterCount === 1 && r3.beforeCount === 0, 'parseRemoveLineSpec handles "a"');

    const r4 = parseRemoveLineSpec('a1');
    assert(r4.afterCount === 1 && r4.beforeCount === 0, 'parseRemoveLineSpec handles "a1"');

    const r5 = parseRemoveLineSpec('b1-5');
    assert(r5.beforeCount === 5 && r5.afterCount === 0, 'parseRemoveLineSpec handles "b1-5" (before 1 to 5)');

    const r6 = parseRemoveLineSpec('a1-5');
    assert(r6.afterCount === 5 && r6.beforeCount === 0, 'parseRemoveLineSpec handles "a1-5" (after 1 to 5)');

    const r7 = parseRemoveLineSpec('b2');
    assert(r7.beforeCount === 2 && r7.afterCount === 0, 'parseRemoveLineSpec handles "b2"');

    const r8 = parseRemoveLineSpec('a3');
    assert(r8.afterCount === 3 && r8.beforeCount === 0, 'parseRemoveLineSpec handles "a3"');
  }

  // 2. applySkipDataAndRemoveLines
  {
    // Basic skip without removeLine
    const list1 = ['Item 1', 'MI Tawfiq', 'Item 3'];
    const res1 = applySkipDataAndRemoveLines(list1, 'MI Tawfiq');
    assert(res1.length === 2 && res1[0] === 'Item 1' && res1[1] === 'Item 3', 'Skips matching target data');

    // Skip with before 1 line (b)
    const list2 = ['Header', 'SubHeader', 'MI Tawfiq', 'Footer'];
    const res2 = applySkipDataAndRemoveLines(list2, 'MI Tawfiq', 'b');
    assert(
      res2.length === 2 && res2[0] === 'Header' && res2[1] === 'Footer',
      'Removes matching target and before 1 line (b)'
    );

    // Skip with after 1 line (a)
    const list3 = ['Header', 'MI Tawfiq', 'DeadNote', 'Footer'];
    const res3 = applySkipDataAndRemoveLines(list3, 'MI Tawfiq', 'a');
    assert(
      res3.length === 2 && res3[0] === 'Header' && res3[1] === 'Footer',
      'Removes matching target and after 1 line (a)'
    );

    // Skip with before 1 to 2 lines (b1-2)
    const list4 = ['L0', 'L1', 'L2', 'MI Tawfiq', 'L4'];
    const res4 = applySkipDataAndRemoveLines(list4, 'MI Tawfiq', 'b1-2');
    assert(
      res4.length === 2 && res4[0] === 'L0' && res4[1] === 'L4',
      'Removes matching target and range of before lines (b1-2)'
    );

    // Skip with after 1 to 2 lines (a1-2)
    const list5 = ['L0', 'MI Tawfiq', 'L2', 'L3', 'L4'];
    const res5 = applySkipDataAndRemoveLines(list5, 'MI Tawfiq', 'a1-2');
    assert(
      res5.length === 2 && res5[0] === 'L0' && res5[1] === 'L4',
      'Removes matching target and range of after lines (a1-2)'
    );

    // Out-of-bounds boundary safety (target is first element with 'b')
    const list6 = ['MI Tawfiq', 'NextLine'];
    const res6 = applySkipDataAndRemoveLines(list6, 'MI Tawfiq', 'b1-5');
    assert(res6.length === 1 && res6[0] === 'NextLine', 'Handles boundary at start of array without error');

    // Out-of-bounds boundary safety (target is last element with 'a')
    const list7 = ['PrevLine', 'MI Tawfiq'];
    const res7 = applySkipDataAndRemoveLines(list7, 'MI Tawfiq', 'a1-5');
    assert(res7.length === 1 && res7[0] === 'PrevLine', 'Handles boundary at end of array without error');
  }

  // 3. formatMultiValueData with multiple directives
  {
    const rawMultiLine = 'Line 1\nLine 2\nMI Tawfiq\nLine 4';
    const formattedText = formatMultiValueData(rawMultiLine, {
      skipData: 'MI Tawfiq',
      removeLine: 'b',
      indent: 4,
    }, 'text');
    // Line 2 and MI Tawfiq removed. Remaining: Line 1 and Line 4.
    assert(!formattedText.includes('Line 2'), 'Line 2 was removed by "removeLine: b"');
    assert(!formattedText.includes('MI Tawfiq'), 'Target MI Tawfiq was omitted');
    assert(formattedText.includes('Line 1'), 'Line 1 is preserved');
    assert(formattedText.includes('    Line 4'), 'Line 4 is indented by 4 spaces in text mode');

    const formattedHtml = formatMultiValueData(rawMultiLine, {
      skipData: 'MI Tawfiq',
      removeLine: 'b',
      indent: 4,
    }, 'html');
    assert(formattedHtml.includes('&nbsp;&nbsp;&nbsp;&nbsp;Line 4'), 'Line 4 is indented by 4 non-breaking spaces in HTML mode');
  }

  // 4. Directive parsing from token string
  {
    const tokenStr = 'detail-stuck | indent: 5, skipData: "MI Tawfiq", removeLine: b';
    const parsed = parseTokenDirective(tokenStr);
    assert(parsed.baseKey === 'detail-stuck', 'parseTokenDirective extracts baseKey');
    assert(parsed.options.indent === 5, 'parseTokenDirective extracts indent: 5');
    assert(parsed.options.skipData === 'MI Tawfiq', 'parseTokenDirective extracts skipData: "MI Tawfiq"');
    assert(parsed.options.removeLine === 'b', 'parseTokenDirective extracts removeLine: b');
  }

  // 5. tokenChipRenderer bidirectional extraction & synthesis
  {
    const token = '{{detail-stuck | indent: 5, skipData: "MI Tawfiq", removeLine: b}}';
    const summary = extractTokenSummary(token);
    assert(summary.baseKey === 'detail-stuck', 'extractTokenSummary extracts baseKey');
    assert(summary.indent === 5, 'extractTokenSummary extracts indent');
    assert(summary.skipData === 'MI Tawfiq', 'extractTokenSummary extracts skipData');
    assert(summary.removeLine === 'b', 'extractTokenSummary extracts removeLine');
    assert(
      summary.directiveBadges.some((b) => b.text.includes('Skip "MI Tawfiq" (b)')),
      'extractTokenSummary creates descriptive Skip badge'
    );

    const reconstructed = buildTokenString('detail-stuck', {
      indent: 5,
      skipData: 'MI Tawfiq',
      removeLine: 'b',
    });
    assert(
      reconstructed === '{{detail-stuck | indent: 5, skipData: "MI Tawfiq", removeLine: b}}',
      'buildTokenString synthesizes exact canonical token representation'
    );
  }

  // 6. Indentation starting from Line 2 (Multi-line continuation / hanging indent standard)
  {
    // Single-line token with indent: 5 remains unindented (flush with label)
    const singleLineFormatted = formatMultiValueData('1', { indent: 5 }, 'html');
    assert(singleLineFormatted === '1', 'Single line item is not indented by default');

    // Multi-line token with indent: 5 leaves line 1 unindented and indents line 2 onwards
    const multiLineInput = 'Line 1\nLine 2\nLine 3';
    const multiLineFormatted = formatMultiValueData(multiLineInput, { indent: 5 }, 'html');
    assert(
      multiLineFormatted === 'Line 1<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Line 2<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Line 3',
      'Multi-line item leaves line 1 unindented and indents line 2+ with 5 spaces'
    );

    // Multi-line token in text mode
    const multiLineText = formatMultiValueData(multiLineInput, { indent: 5 }, 'text');
    assert(
      multiLineText === 'Line 1\n     Line 2\n     Line 3',
      'Text mode leaves line 1 unindented and indents line 2+ with 5 spaces'
    );

    // Explicit from: 1 indents all lines including line 1
    const forcedAll = formatMultiValueData(multiLineInput, { indent: 5, from: 1 }, 'html');
    assert(
      forcedAll === '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Line 1<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Line 2<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Line 3',
      'Explicit from: 1 indents all lines including line 1'
    );

    // Template merge with total-stuck | indent: 5
    const merged = mergeTemplateWithData('Stuck: {{total-stuck | indent: 5}}', {
      'total-stuck': 'Page 15 Ayah 12\nPage 16 Ayah 3',
    });
    assert(
      merged.includes('Stuck: Page 15 Ayah 12<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Page 16 Ayah 3'),
      'Template merge leaves line 1 flush after "Stuck: " and indents line 2'
    );
  }

  // 7. Document-Level Skip Data & Line Removal (e.g. section | skipData: "MI Taufiq", removeLine: b3)
  {
    const templateParagraphs = `<p>Class: Six</p>
<p>Roll: 01</p>
<p>Group: General</p>
<p>Section: {{section | skipData: "MI Taufiq", removeLine: b3}}</p>
<p>Passed: Yes</p>`;

    // Case 1: When section is 'MI Taufiq', removes 3 lines before + the section line itself
    const mergedMatching = mergeTemplateWithData(templateParagraphs, {
      section: 'MI Taufiq',
    });

    assert(
      !mergedMatching.includes('Class: Six'),
      'Document skip: Removes 3rd line before (Class: Six)'
    );
    assert(
      !mergedMatching.includes('Roll: 01'),
      'Document skip: Removes 2nd line before (Roll: 01)'
    );
    assert(
      !mergedMatching.includes('Group: General'),
      'Document skip: Removes 1st line before (Group: General)'
    );
    assert(
      !mergedMatching.includes('Section:'),
      'Document skip: Removes the token line itself (Section:)'
    );
    assert(
      mergedMatching.includes('Passed: Yes'),
      'Document skip: Preserves subsequent lines (Passed: Yes)'
    );

    // Case 2: When section is 'Diamond' (not matching), nothing is removed and section value is rendered
    const mergedNonMatching = mergeTemplateWithData(templateParagraphs, {
      section: 'Diamond',
    });

    assert(
      mergedNonMatching.includes('Class: Six'),
      'Non-matching data preserves line 1 (Class: Six)'
    );
    assert(
      mergedNonMatching.includes('Roll: 01'),
      'Non-matching data preserves line 2 (Roll: 01)'
    );
    assert(
      mergedNonMatching.includes('Group: General'),
      'Non-matching data preserves line 3 (Group: General)'
    );
    assert(
      mergedNonMatching.includes('Section: Diamond'),
      'Non-matching data renders token value (Section: Diamond)'
    );
    assert(
      mergedNonMatching.includes('Passed: Yes'),
      'Non-matching data preserves line 5 (Passed: Yes)'
    );

    // Case 3: Inner <br> within a block
    const templateInnerBr = `<p>Class: Six<br>Roll: 01<br>Group: General<br>Section: {{section | skipData: "MI Taufiq", removeLine: b3}}<br>Passed: Yes</p>`;
    const mergedInnerBr = mergeTemplateWithData(templateInnerBr, {
      section: 'MI Taufiq',
    });
    assert(
      !mergedInnerBr.includes('Class: Six') &&
      !mergedInnerBr.includes('Roll: 01') &&
      !mergedInnerBr.includes('Group: General') &&
      !mergedInnerBr.includes('Section:') &&
      mergedInnerBr.includes('Passed: Yes'),
      'Document skip handles inner <br> lines correctly'
    );

    // Case 4: Table rows
    const templateTable = `<table>
<tr><td>Class: Six</td></tr>
<tr><td>Roll: 01</td></tr>
<tr><td>Group: General</td></tr>
<tr><td>Section: {{section | skipData: "MI Taufiq", removeLine: b3}}</td></tr>
<tr><td>Passed: Yes</td></tr>
</table>`;
    const mergedTable = mergeTemplateWithData(templateTable, {
      section: 'MI Taufiq',
    });
    assert(
      !mergedTable.includes('Class: Six') &&
      !mergedTable.includes('Roll: 01') &&
      !mergedTable.includes('Group: General') &&
      !mergedTable.includes('Section:') &&
      mergedTable.includes('Passed: Yes'),
      'Document skip handles table rows <tr> correctly'
    );

    // Case 5: removeLine: self (Removes ONLY the current line, preserves all preceding and succeeding lines)
    const templateSelf = `<p>Class: Six</p>
<p>Roll: 01</p>
<p>Group: General</p>
<p>Section: {{section | skipData: "MI Taufiq", removeLine: self}}</p>
<p>Passed: Yes</p>`;
    const mergedSelf = mergeTemplateWithData(templateSelf, {
      section: 'MI Taufiq',
    });
    assert(
      mergedSelf.includes('Class: Six') &&
      mergedSelf.includes('Roll: 01') &&
      mergedSelf.includes('Group: General') &&
      !mergedSelf.includes('Section:') &&
      mergedSelf.includes('Passed: Yes'),
      'removeLine: self removes only the current line, preserving all other lines'
    );

    // Case 6: skipData: "empty" removes line when field is empty or blank
    const templateEmpty = `<p>Name: John</p><p>Remarks: {{remarks | skipData: "empty", removeLine: self}}</p><p>Status: Active</p>`;
    const mergedEmpty = mergeTemplateWithData(templateEmpty, {
      remarks: '',
    });
    assert(
      mergedEmpty.includes('Name: John') &&
      !mergedEmpty.includes('Remarks:') &&
      mergedEmpty.includes('Status: Active'),
      'skipData: "empty" removes line when data is empty'
    );

    // Case 7: skipData: "*" removes line unconditionally
    const templateWildcard = `<p>A</p><p>Secret: {{secret | skipData: "*", removeLine: self}}</p><p>B</p>`;
    const mergedWildcard = mergeTemplateWithData(templateWildcard, {
      secret: 'hidden123',
    });
    assert(
      mergedWildcard.includes('A') &&
      !mergedWildcard.includes('Secret:') &&
      mergedWildcard.includes('B'),
      'skipData: "*" removes line unconditionally'
    );

    // Case 8: Standalone removeLine: self (e.g. Session | removeLine: self)
    // When session is missing/empty -> removes line
    const templateSessionEmpty = `<p>Class: Nine</p><p>Session: {{Session | removeLine: self}}</p><p>Group: Science</p>`;
    const mergedSessionEmpty = mergeTemplateWithData(templateSessionEmpty, {
      Class: 'Nine',
      Session: '',
      Group: 'Science',
    });
    assert(
      mergedSessionEmpty.includes('Class: Nine') &&
      !mergedSessionEmpty.includes('Session:') &&
      mergedSessionEmpty.includes('Group: Science'),
      'Session | removeLine: self removes line when Session is empty'
    );

    // When session is present -> retains line and renders value
    const mergedSessionPresent = mergeTemplateWithData(templateSessionEmpty, {
      Class: 'Nine',
      Session: '2024-2025',
      Group: 'Science',
    });
    assert(
      mergedSessionPresent.includes('Class: Nine') &&
      mergedSessionPresent.includes('Session: 2024-2025') &&
      mergedSessionPresent.includes('Group: Science'),
      'Session | removeLine: self preserves line and outputs value when Session is populated'
    );

    // Case 9: Tier 2 Inline Token Default / Fallback: default: "N/A"
    // Missing key -> outputs "N/A"
    const templateFallbackMissing = `<p>Blood Group: {{blood_group | default: "N/A"}}</p>`;
    const mergedFallbackMissing = mergeTemplateWithData(templateFallbackMissing, {});
    assert(
      mergedFallbackMissing.includes('Blood Group: N/A'),
      'default: "N/A" outputs "N/A" when key is missing'
    );

    // Empty string data -> outputs "N/A"
    const mergedFallbackEmpty = mergeTemplateWithData(templateFallbackMissing, {
      blood_group: '',
    });
    assert(
      mergedFallbackEmpty.includes('Blood Group: N/A'),
      'default: "N/A" outputs "N/A" when data is empty string'
    );

    // Populated data -> outputs actual data "O+"
    const mergedFallbackPresent = mergeTemplateWithData(templateFallbackMissing, {
      blood_group: 'O+',
    });
    assert(
      mergedFallbackPresent.includes('Blood Group: O+'),
      'default: "N/A" outputs actual data value when present'
    );

    // Case 10: default: "---" (Dash) and default: "" (Blank)
    const templateDash = `<p>Remarks: {{remarks | default: "---"}}</p><p>Note: {{note | default: ""}}</p>`;
    const mergedDash = mergeTemplateWithData(templateDash, {});
    assert(
      mergedDash.includes('Remarks: ---') && mergedDash.includes('Note: </p>'),
      'default: "---" and default: "" correctly output dash and clean empty string'
    );

    // Case 11: Directive parsing and summary badges for fallback
    const parsedDef = parseTokenDirective('blood_group | default: "N/A"');
    assert(parsedDef.options.fallback === 'N/A', 'parseTokenDirective extracts fallback: "N/A"');

    const summaryDef = extractTokenSummary('blood_group | default: "N/A"');
    assert(summaryDef.fallback === 'N/A', 'extractTokenSummary extracts fallback');
    assert(
      summaryDef.directiveBadges.some((b) => b.text === 'Def: "N/A"'),
      'extractTokenSummary renders Def: "N/A" badge'
    );

    // Case 12: Daily Progress detail-mis & detail-stuck clean empty behavior
    // Allows removeLine: self or default: "..." without hardcoded "No Mistake"
    const templateProgress = `<p>Student: Abdullah</p><p>Mistakes: {{detail-mis | removeLine: self}}</p><p>Stuck: {{detail-stuck | default: "None"}}</p>`;
    const mergedProgress = mergeTemplateWithData(templateProgress, {
      'detail-mis': '',
      'detail-stuck': '',
    });
    assert(
      mergedProgress.includes('Student: Abdullah') &&
      !mergedProgress.includes('Mistakes:') &&
      mergedProgress.includes('Stuck: None'),
      'Clean empty detail-mis allows removeLine: self to remove mistake line and default: "None" on detail-stuck'
    );
  }

  return { passed, failed, suiteName };
}
