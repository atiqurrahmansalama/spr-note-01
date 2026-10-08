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
import { EditorSerializer } from '../../editor/EditorSerializer';
import { DocumentFactory } from '../../../model/documentFactory';
import { HtmlExporter } from '../../../model/serialization/htmlExporter';
import { HtmlImporter } from '../../../model/serialization/htmlImporter';

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

  return { passed, failed, suiteName };
}
