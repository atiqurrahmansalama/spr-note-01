/**
 * Unit Test Suite: Smart Token Chips & Floating Inspector Popover (Phase 19)
 *
 * Verifies:
 * 1. extractTokenSummary parsing of basic, layout, cell split, indent, and filter directives.
 * 2. buildTokenString bidirectional synthesis.
 * 3. Robust handling of edge cases, whitespace, nested brackets, and complex combinations.
 * 4. Preservation across HTML sanitization and Canonical Document AST serialization.
 */

import { extractTokenSummary, buildTokenString } from '../../../components/tokens/tokenChipRenderer';
import { parseTokenDirective } from '../../../docLabDirectiveEngine';
import { EditorSerializer } from '../../editor/EditorSerializer';
import { DocumentFactory } from '../../../model/documentFactory';
import { HtmlExporter } from '../../../model/serialization/htmlExporter';
import { HtmlImporter } from '../../../model/serialization/htmlImporter';
import { EditorDomAdapter } from '../../editor/EditorDomAdapter';

export async function runSmartTokenChipsPopoverUnitTests(): Promise<{
  passed: number;
  failed: number;
  suiteName: string;
}> {
  let passed = 0;
  let failed = 0;
  const suiteName = 'Smart Token Chips & Floating Popover (Phase 19)';

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

  // 1. Basic Token Parsing
  {
    const summary = extractTokenSummary('{{student-name}}');
    assert(summary.baseKey === 'student-name', 'extractTokenSummary extracts base key from simple token');
    assert(summary.directiveBadges.length === 0, 'Simple token has 0 directive badges');
  }

  // 2. Horizontal Direction & Table Cell Splitting
  {
    const summary = extractTokenSummary('{{exam-date | direction: horizontal, separator: cell}}');
    assert(summary.baseKey === 'exam-date', 'extractTokenSummary extracts base key from cell split token');
    assert(summary.direction === 'horizontal', 'Direction is horizontal');
    assert(summary.separator === 'cell', 'Separator is cell');
    assert(
      summary.directiveBadges.some((b) => b.text === 'Cell Split'),
      'Cell Split badge generated with icon ↔️'
    );
  }

  // 3. Vertical Direction & Custom Separator
  {
    const summary = extractTokenSummary('{{session-list | direction: vertical, separator: newline}}');
    assert(summary.baseKey === 'session-list', 'Extracts base key for vertical token');
    assert(summary.direction === 'vertical', 'Direction is vertical');
    assert(summary.separator === 'newline', 'Separator is newline');
    assert(
      summary.directiveBadges.some((b) => b.text === 'Vert'),
      'Vertical layout badge generated'
    );
    assert(
      summary.directiveBadges.some((b) => b.text === 'Line'),
      'Newline separator badge generated'
    );
  }

  // 4. Multi-Line Indentation Directive Parsing
  {
    const summaryStandard = extractTokenSummary('{{detail-mis | indent: 5}}');
    assert(summaryStandard.indent === 5, 'Extracts standard 5 space indent');
    assert(
      summaryStandard.directiveBadges.some((b) => b.text === 'Indent 5'),
      'Badge for Indent 5 created'
    );

    const summaryJuz = extractTokenSummary('{{juz-page | indent: 11, from: 2}}');
    assert(summaryJuz.indent === 11, 'Extracts 11 space indent for juz page');
    assert(summaryJuz.fromLine === 2, 'Extracts from: 2 start line');
    assert(
      summaryJuz.directiveBadges.some((b) => b.text.includes('Indent 11')),
      'Badge for Indent 11 L2+ created'
    );
  }

  // 5. Formatting Filters (Upper, Lower, Bengali Digits, Currency, Date)
  {
    const summaryUpper = extractTokenSummary('{{student-name | uppercase}}');
    assert(
      summaryUpper.directiveBadges.some((b) => b.text === 'UPPER'),
      'Uppercase filter badge generated'
    );

    const summaryBn = extractTokenSummary('{{roll | bengali_digits}}');
    assert(
      summaryBn.directiveBadges.some((b) => b.text === 'বাংলা'),
      'Bengali digits filter badge generated'
    );

    const summaryCurr = extractTokenSummary('{{fee_amount | currency}}');
    assert(
      summaryCurr.directiveBadges.some((b) => b.text === 'Currency'),
      'Currency filter badge generated'
    );
  }

  // 6. Two-Way Token String Construction (buildTokenString)
  {
    const synthesized = buildTokenString('exam-date', {
      direction: 'horizontal',
      separator: 'cell',
    });
    assert(
      synthesized === '{{exam-date | direction: horizontal, separator: cell}}',
      'buildTokenString synthesizes exact horizontal cell split syntax'
    );

    const synthesizedIndent = buildTokenString('detail-mis', {
      indent: 5,
    });
    assert(
      synthesizedIndent === '{{detail-mis | indent: 5}}',
      'buildTokenString synthesizes exact indent syntax'
    );

    const synthesizedJuz = buildTokenString('juz-page', {
      indent: 11,
      fromLine: 2,
    });
    assert(
      synthesizedJuz === '{{juz-page | indent: 11, from: 2}}',
      'buildTokenString synthesizes exact indent with fromLine'
    );
  }

  // 7. HTML Serialization & AST Roundtrip
  {
    const rawHtml = '<p>Date: <span class="doclab-token" data-token="exam-date | direction: horizontal, separator: cell" data-token-key="exam-date">{{exam-date | direction: horizontal, separator: cell}}</span></p>';
    const sanitized = EditorSerializer.sanitize(rawHtml);
    assert(
      sanitized.includes('doclab-token') && sanitized.includes('data-token="exam-date | direction: horizontal, separator: cell"'),
      'EditorSerializer preserves token spans and directive metadata'
    );

    const doc = HtmlImporter.importFromHtml(sanitized);
    assert(doc.body.length === 1, 'AST imported successfully');
    const exported = HtmlExporter.exportToHtml(doc, { tokenFormat: 'mustache' });
    assert(
      exported.includes('{{exam-date | direction: horizontal, separator: cell}}'),
      'Exported HTML accurately preserves Mustache directive syntax'
    );
  }

  // 8. Multi-Filter & Custom Delimiter Bidirectional Synthesis
  {
    const synthesizedMulti = buildTokenString('fee_total', {
      direction: 'vertical',
      separator: 'newline',
      filters: ['currency', 'bengali_digits'],
    });
    assert(
      synthesizedMulti === '{{fee_total | direction: vertical, separator: newline | currency | bengali_digits}}',
      'buildTokenString handles layout and multiple formatting filters simultaneously'
    );

    const parsedMulti = extractTokenSummary(synthesizedMulti);
    assert(parsedMulti.baseKey === 'fee_total', 'Multi-filter parses baseKey correctly');
    assert(parsedMulti.direction === 'vertical', 'Multi-filter direction is vertical');
    assert(parsedMulti.separator === 'newline', 'Multi-filter separator is newline');
    assert(parsedMulti.filters.includes('currency'), 'Parsed filters include currency');
    assert(parsedMulti.filters.includes('bengali_digits'), 'Parsed filters include bengali_digits');
  }

  // 9. Comma-separated Inline Layout Synthesis
  {
    const synthesizedComma = buildTokenString('subject_names', {
      direction: 'horizontal',
      separator: ', ',
    });
    assert(
      synthesizedComma === "{{subject_names | direction: horizontal, separator: ', '}}",
      'buildTokenString synthesizes comma-separated horizontal layout'
    );
  }

  // 10. Selection Parity: Token spans preserve pure inner text and exclude contenteditable="false"
  {
    const rawTokenHtml = '<p>Student: <span class="doclab-token" data-token="student_name" data-token-key="student_name">{{student_name}}</span></p>';
    const sanitized = EditorSerializer.sanitize(rawTokenHtml);
    assert(!sanitized.includes('contenteditable="false"'), 'Sanitized token span excludes contenteditable="false" for natural text selection');
    assert(sanitized.includes('{{student_name}}'), 'Sanitized token span retains canonical Mustache text');
  }

  // 11. Engine & Export Parity: Canonical export produces clean text representation
  {
    const rawTokenHtml = '<p>Name: <span class="doclab-token" data-token="student_name">{{student_name}}</span></p>';
    const doc = HtmlImporter.importFromHtml(rawTokenHtml);
    const exportedText = HtmlExporter.exportToHtml(doc, { tokenFormat: 'mustache' });
    assert(exportedText.includes('{{student_name}}'), 'Engine exports canonical Mustache token text');
    assert(!exportedText.includes('contenteditable="false"'), 'Engine export contains zero contenteditable locks');
  }

  // 12. Sequential Directive Composition & Merging (Zero Loss & Clean Options Overwrite)
  {
    // Step 1: Base token
    const initialToken = 'student_name';

    // Step 2: Apply Indent directive
    const indentDirective = 'indent: 5';
    const parsedIndent = parseTokenDirective(indentDirective);
    const tokenStep1 = buildTokenString(initialToken, parsedIndent.options);
    assert(tokenStep1 === '{{student_name | indent: 5}}', 'Step 1: Composes indent: 5 correctly');

    // Step 3: Sequentially apply SkipData & RemoveLine directive without losing indent
    const parsedStep1 = parseTokenDirective(tokenStep1.replace(/^\{+/, '').replace(/\}+$/, ''));
    const skipDirective = 'skipData: "MI Tawfiq", removeLine: b';
    const parsedSkip = parseTokenDirective(skipDirective);

    const mergedOptionsStep2 = {
      ...parsedStep1.options,
      ...parsedSkip.options,
    };
    const tokenStep2 = buildTokenString(parsedStep1.baseKey, mergedOptionsStep2);
    assert(
      tokenStep2 === '{{student_name | indent: 5, skipData: "MI Tawfiq", removeLine: b}}',
      'Step 2: Merges skipData and removeLine while strictly preserving indent: 5'
    );

    // Step 4: Update indent to 8 spaces (preserves skipData and removeLine)
    const parsedStep2 = parseTokenDirective(tokenStep2.replace(/^\{+/, '').replace(/\}+$/, ''));
    const updateIndentDirective = 'indent: 8';
    const parsedUpdateIndent = parseTokenDirective(updateIndentDirective);

    const mergedOptionsStep3 = {
      ...parsedStep2.options,
      ...parsedUpdateIndent.options,
    };
    const tokenStep3 = buildTokenString(parsedStep2.baseKey, mergedOptionsStep3);
    assert(
      tokenStep3 === '{{student_name | indent: 8, skipData: "MI Tawfiq", removeLine: b}}',
      'Step 3: Updates indent to 8 without stripping skipData or removeLine'
    );

    // Step 5: Duplicate click does not corrupt or duplicate options
    const parsedStep3 = parseTokenDirective(tokenStep3.replace(/^\{+/, '').replace(/\}+$/, ''));
    const mergedOptionsStep4 = {
      ...parsedStep3.options,
      ...parsedUpdateIndent.options,
    };
    const tokenStep4 = buildTokenString(parsedStep3.baseKey, mergedOptionsStep4);
    assert(
      tokenStep4 === '{{student_name | indent: 8, skipData: "MI Tawfiq", removeLine: b}}',
      'Step 4: Repeated click produces identical, pristine output without duplication'
    );
  }

  // 13. Popover Input Mustache Bracket Handling
  {
    function stripMustache(token: string): string {
      return (token || '').replace(/^\{+/, '').replace(/\}+$/, '').trim();
    }
    function formatMustache(token: string): string {
      const clean = (token || '').trim();
      if (clean.startsWith('{{') && clean.endsWith('}}')) return clean;
      const inner = clean.replace(/^\{+/, '').replace(/\}+$/, '').trim();
      return `{{${inner}}}`;
    }

    const raw = '{{student_name | indent: 5, skipData: "MI Tawfiq"}}';
    const insideCapsuleDisplay = stripMustache(raw);
    assert(
      insideCapsuleDisplay === 'student_name | indent: 5, skipData: "MI Tawfiq"',
      'Inside capsule displays clean key and directives without double brackets'
    );

    const onClipboardCopy = formatMustache(insideCapsuleDisplay);
    assert(
      onClipboardCopy === '{{student_name | indent: 5, skipData: "MI Tawfiq"}}',
      'Clipboard copy restores canonical {{...}} wrapper'
    );
  }

  // 14. Long Directive Auto-Wrapping & Multiline Normalization
  {
    const longDirectiveExpr = '{{hifz_daily_progress | direction: horizontal, separator: cell, indent: 5, skipData: "MI Tawfiq", removeLine: b1-5}}';
    const summary = extractTokenSummary(longDirectiveExpr);
    assert(summary.baseKey === 'hifz_daily_progress', 'Extracts base key for long expression');
    assert(summary.direction === 'horizontal', 'Extracts horizontal direction');
    assert(summary.indent === 5, 'Extracts indent 5');
    assert(summary.skipData === 'MI Tawfiq', 'Extracts skipData');
    assert(summary.removeLine === 'b1-5', 'Extracts removeLine rule');
    assert(summary.directiveBadges.length >= 3, 'Generates multiple directive badges for wrapped display');
  }

  // 15. Dynamic Caret Proximity Reveal for Token Chips
  {
    // A. Caret in text node immediately after token
    const mockTokenEl: any = {
      nodeType: 1,
      tagName: 'SPAN',
      className: 'doclab-token',
      nextSibling: null,
      previousSibling: null,
      contains: () => false,
    };
    const mockAfterTextNode: any = {
      nodeType: 3,
      nodeValue: ' world',
      previousSibling: mockTokenEl,
      nextSibling: null,
    };
    mockTokenEl.nextSibling = mockAfterTextNode;

    // Caret at offset 0 (touching token from after) -> true
    const rangeAfter0: any = {
      startContainer: mockAfterTextNode,
      startOffset: 0,
      collapsed: true,
    };
    assert(
      EditorDomAdapter.isCaretAdjacentToToken(mockTokenEl, rangeAfter0),
      'Proximity Reveal: Caret at offset 0 of following text node is adjacent'
    );

    // Caret at offset 1 with leading space -> true
    const rangeAfter1: any = {
      startContainer: mockAfterTextNode,
      startOffset: 1,
      collapsed: true,
    };
    assert(
      EditorDomAdapter.isCaretAdjacentToToken(mockTokenEl, rangeAfter1),
      'Proximity Reveal: Caret at offset 1 (trailing space) of following text node is adjacent'
    );

    // Caret at offset 4 (inside "world") -> false
    const rangeAfter4: any = {
      startContainer: mockAfterTextNode,
      startOffset: 4,
      collapsed: true,
    };
    assert(
      !EditorDomAdapter.isCaretAdjacentToToken(mockTokenEl, rangeAfter4),
      'Proximity Reveal: Caret inside word 4 chars away is NOT adjacent'
    );

    // B. Caret in text node immediately before token
    const mockBeforeTextNode: any = {
      nodeType: 3,
      nodeValue: 'Hello ',
      previousSibling: null,
      nextSibling: mockTokenEl,
    };
    mockTokenEl.previousSibling = mockBeforeTextNode;

    // Caret at offset 6 (at end of 'Hello ') -> true
    const rangeBefore6: any = {
      startContainer: mockBeforeTextNode,
      startOffset: 6,
      collapsed: true,
    };
    assert(
      EditorDomAdapter.isCaretAdjacentToToken(mockTokenEl, rangeBefore6),
      'Proximity Reveal: Caret at end of preceding text node is adjacent'
    );

    // Caret at offset 5 (before space in 'Hello ') -> true
    const rangeBefore5: any = {
      startContainer: mockBeforeTextNode,
      startOffset: 5,
      collapsed: true,
    };
    assert(
      EditorDomAdapter.isCaretAdjacentToToken(mockTokenEl, rangeBefore5),
      'Proximity Reveal: Caret immediately before boundary space is adjacent'
    );

    // Caret at offset 2 (inside 'Hello') -> false
    const rangeBefore2: any = {
      startContainer: mockBeforeTextNode,
      startOffset: 2,
      collapsed: true,
    };
    assert(
      !EditorDomAdapter.isCaretAdjacentToToken(mockTokenEl, rangeBefore2),
      'Proximity Reveal: Caret deep inside preceding word is NOT adjacent'
    );

    // C. Caret inside container element at child index
    const mockParent: any = {
      nodeType: 1,
      childNodes: [mockBeforeTextNode, mockTokenEl, mockAfterTextNode],
    };

    // Offset 1 (index of mockTokenEl, right before it) -> true
    const rangeParent1: any = {
      startContainer: mockParent,
      startOffset: 1,
      collapsed: true,
    };
    assert(
      EditorDomAdapter.isCaretAdjacentToToken(mockTokenEl, rangeParent1),
      'Proximity Reveal: Element child offset before token is adjacent'
    );

    // Offset 2 (index right after mockTokenEl) -> true
    const rangeParent2: any = {
      startContainer: mockParent,
      startOffset: 2,
      collapsed: true,
    };
    assert(
      EditorDomAdapter.isCaretAdjacentToToken(mockTokenEl, rangeParent2),
      'Proximity Reveal: Element child offset after token is adjacent'
    );

    // D. Caret directly inside token element
    const mockInsideToken: any = {
      nodeType: 1,
      contains: (n: any) => n === mockInsideToken,
    };
    const rangeInside: any = {
      startContainer: mockInsideToken,
      startOffset: 0,
      collapsed: true,
    };
    assert(
      EditorDomAdapter.isCaretAdjacentToToken(mockInsideToken, rangeInside),
      'Proximity Reveal: Caret inside token itself is adjacent'
    );
  }

  return { passed, failed, suiteName };
}
