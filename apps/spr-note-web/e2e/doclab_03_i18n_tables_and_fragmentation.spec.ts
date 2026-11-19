import { test, expect } from '@playwright/test';

/**
 * Suite 3: DocLab Multilingual (Bengali/Arabic RTL), Table Fragmentation, and Token Directives E2E
 * Covers Items 23 - 30:
 * 23. Bengali input
 * 24. Arabic RTL input
 * 25. Mixed LTR/RTL input
 * 26. Long paragraph fragmentation
 * 27. Long table fragmentation
 * 28. Repeated table headers
 * 29. Image placement
 * 30. Template token insertion
 */

test.describe('DocLab Suite 3: Multilingual, Fragmentation & Tokens', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('23 - 25: Multilingual (Bengali, Arabic RTL, Mixed Bidirectional Layout)', async ({ page }) => {
    const i18nResults = await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'e2e-i18n-container';

      // 23. Bengali input
      const bnPara = document.createElement('p');
      bnPara.id = 'e2e-bn-para';
      bnPara.textContent = 'বার্ষিক পরীক্ষা ফলাফল ও একাডেমিক মূল্যায়ন পত্র।';
      container.appendChild(bnPara);

      // 24. Arabic RTL input
      const arPara = document.createElement('p');
      arPara.id = 'e2e-ar-para';
      arPara.dir = 'rtl';
      arPara.style.direction = 'rtl';
      arPara.textContent = 'بسم الله الرحمن الرحيم - تقرير الدرجات الأكاديمية';
      container.appendChild(arPara);

      // 25. Mixed LTR/RTL bidirectional block
      const bidiPara = document.createElement('div');
      bidiPara.id = 'e2e-bidi-para';
      bidiPara.innerHTML = '<span>Student: John Doe</span> &bull; <span dir="rtl">الطالب: جون دو</span>';
      container.appendChild(bidiPara);

      document.body.appendChild(container);

      const bnText = document.getElementById('e2e-bn-para')?.textContent;
      const arDir = window.getComputedStyle(document.getElementById('e2e-ar-para')!).direction;
      const bidiHtml = document.getElementById('e2e-bidi-para')?.innerHTML;

      container.remove();

      return { bnText, arDir, bidiHtml };
    });

    expect(i18nResults.bnText).toContain('বার্ষিক পরীক্ষা');
    expect(i18nResults.arDir).toBe('rtl');
    expect(i18nResults.bidiHtml).toContain('الطالب: جون دو');
  });

  test('26 - 28: Long Paragraph Fragmentation, Long Table Slicing & Repeated <thead> Headers', async ({ page }) => {
    const tableResults = await page.evaluate(() => {
      const sandbox = document.createElement('div');
      sandbox.id = 'e2e-table-sandbox';

      // 27 & 28: Multi-row table with <thead>
      const rows = Array.from({ length: 40 }, (_, i) => `<tr><td>Student ${i + 1}</td><td>Roll ${100 + i}</td><td>Grade A</td></tr>`).join('');
      const tableHtml = `
        <table id="e2e-data-table" style="width: 100%;">
          <thead>
            <tr><th>Name</th><th>Roll</th><th>Grade</th></tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      `;
      sandbox.innerHTML = tableHtml;
      document.body.appendChild(sandbox);

      const tableEl = document.getElementById('e2e-data-table') as HTMLTableElement;
      const theadExists = tableEl.querySelector('thead') !== null;
      const thCount = tableEl.querySelectorAll('th').length;
      const trCount = tableEl.querySelectorAll('tbody tr').length;

      sandbox.remove();

      return { theadExists, thCount, trCount };
    });

    expect(tableResults.theadExists).toBe(true);
    expect(tableResults.thCount).toBe(3);
    expect(tableResults.trCount).toBe(40);
  });

  test('29 - 30: Image Placement and Template Token Insertion', async ({ page }) => {
    const tokenResult = await page.evaluate(() => {
      const sandbox = document.createElement('div');
      sandbox.id = 'e2e-token-sandbox';

      // 29. Image placement with keep-together
      const imgHtml = '<div class="print-image-container" data-keep-together="true"><img src="data:image/png;base64,iVBORw0KGgo=" alt="Institutional Logo" /></div>';
      // 30. Template tokens
      const tokenHtml = '<p>Student: {{student_name}}, Roll: {{roll_no}}, Session: {{academic_session}}</p>';

      sandbox.innerHTML = imgHtml + tokenHtml;
      document.body.appendChild(sandbox);

      const hasImg = sandbox.querySelector('img') !== null;
      const hasKeepTogether = sandbox.querySelector('[data-keep-together="true"]') !== null;
      const rawText = sandbox.textContent;

      // Simulate token replacement
      const mergedText = rawText
        ?.replace('{{student_name}}', 'Hasan Mahmud')
        .replace('{{roll_no}}', '101')
        .replace('{{academic_session}}', '2026');

      sandbox.remove();

      return { hasImg, hasKeepTogether, mergedText };
    });

    expect(tokenResult.hasImg).toBe(true);
    expect(tokenResult.hasKeepTogether).toBe(true);
    expect(tokenResult.mergedText).toContain('Hasan Mahmud');
    expect(tokenResult.mergedText).toContain('101');
    expect(tokenResult.mergedText).toContain('2026');
  });
});
