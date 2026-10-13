import assert from 'assert';
import { mergeTemplateWithData, sanitizeDocxPlaceholders } from '../../../docxTemplateEngine';
import { convertDocumentToPlainText } from '../../../docLabTextConverter';
import '@/modules/learning/progress-management/daily-progress/dailyProgressDocLabKeys';

export async function runDocLabReportPipelineUnitTests(): Promise<{
  passed: number;
  failed: number;
  suiteName: string;
}> {
  let passed = 0;
  let failed = 0;
  const suiteName = 'DocLab Report Pipeline & PlainText Continuity (Phase 20)';

  function testAssert(condition: boolean, msg: string) {
    if (condition) {
      passed++;
      console.log(`  ✓ ${msg}`);
    } else {
      failed++;
      console.error(`  ✗ FAIL: ${msg}`);
    }
  }

  console.log(`\n--- UNIT TEST: ${suiteName.toUpperCase()} ---`);

  // 1. Test official pristine template
  const officialTemplate = [
    'Student Daily Progress Report',
    'Date: {{date}}',
    'Student Name: {{student-name}}',
    '',
    'Juz Number: {{juz-number}}',
    'Page: {{juz-page | indent: 11}}',
    '',
    'Session Summary',
    'Session Name: {{Session}}',
    '',
    'Mistake: {{total-mis}}',
    'Stuck: {{total-stuck}}',
    '',
    'Mistake',
    '{{detail-mis | indent: 5}}',
    '',
    'Stuck',
    '{{detail-stuck | indent: 5}}',
    '',
    'Comment',
    '{{remarks}}',
    '',
    '{{mention-teacher-name}}He\'s Student of {{section}}\'s Group.',
  ].join('\n');

  const liveDataRecord: Record<string, string> = {
    date: '13/10/2026',
    'student-name': 'Abdullah',
    'juz-number': '29',
    'juz-page': 'Page 8–23',
    Session: 'Morning',
    'total-mis': '3',
    'total-stuck': '1',
    'detail-mis': 'Page 8 Ayah 42\nPage 22 Ayah 19\nPage 23 Ayah 5',
    'detail-stuck': 'Page 15 Ayah 12',
    remarks: 'Masha Allah, Passed.',
    section: 'MI Taufiq',
    'mention-teacher-name': '',
  };

  const mergedHtml = mergeTemplateWithData(officialTemplate, liveDataRecord);

  // Assert official tokens resolved cleanly:
  testAssert(!mergedHtml.includes('{{date}}'), '{{date}} should be resolved to real date');
  testAssert(mergedHtml.includes('13/10/2026'), 'Date value must appear in output');
  testAssert(mergedHtml.includes('Abdullah'), 'Student name must appear in output');
  testAssert(!mergedHtml.includes('{{juz-page'), '{{juz-page}} must be resolved');
  testAssert(mergedHtml.includes('Page 8–23'), 'Page range must appear in output');
  testAssert(mergedHtml.includes('Morning'), 'Session must appear in output');
  testAssert(mergedHtml.includes('Mistake: 3'), 'Mistakes count must match');
  testAssert(mergedHtml.includes('Stuck: 1'), 'Stuck count must match');

  // 2. Test plain text conversion does not split words across new lines
  const plainText = convertDocumentToPlainText(mergedHtml);

  testAssert(plainText.includes('Student Daily Progress Report'), 'Header line must not break');
  testAssert(plainText.includes('Juz Number: 29'), 'Juz Number line must not break');
  testAssert(plainText.includes('Session Summary'), 'Session Summary must be unified');
  testAssert(plainText.includes("He's Student of MI Taufiq's Group."), "Sentence must not have orphaned leading space or split across lines");

  // 3. Test sanitizeDocxPlaceholders auto-heals unbalanced braces
  const singleBraceTest = 'Date: {{date} Juz: {{juz-number}} Page: {juz-page}}';
  const sanitized = sanitizeDocxPlaceholders(singleBraceTest);
  testAssert(sanitized.includes('{{date}}'), 'Single trailing brace must auto-close');
  testAssert(sanitized.includes('{{juz-page}}'), 'Single leading brace must auto-open');

  return { passed, failed, suiteName };
}

if (process.argv[1] && process.argv[1].endsWith('doclab_report_pipeline.test.ts')) {
  runDocLabReportPipelineUnitTests().then((res) => {
    console.log(`✔ Finished with ${res.passed} passed, ${res.failed} failed.`);
  });
}
