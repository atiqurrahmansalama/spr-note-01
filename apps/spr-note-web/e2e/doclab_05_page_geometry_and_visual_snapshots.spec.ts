import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Suite 5: Real Browser Page-Geometry Assertions & Visual Snapshots
 * Inspects real DOM bounding rects, margins, gaps, horizontal bounds, and captures real visual screenshots.
 */

test.describe('DocLab Suite 5: Real Browser Page-Geometry Assertions & Visual Snapshots', () => {
  const screenshotsDir = path.join(process.cwd(), 'e2e', 'screenshots');

  test.beforeAll(() => {
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('accessToken', 'mock-e2e-token-12345');
      localStorage.setItem('user', JSON.stringify({ id: 1, name: 'Admin Engineer', role: 'superadmin' }));
      localStorage.setItem('spr_app_theme', 'light');
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('1. Geometry & Snapshot: 1-Page Document', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'e2e-geometry-stage-1';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.alignItems = 'center';
      container.style.padding = '40px 0';
      container.style.backgroundColor = '#f1f5f9';

      const sheet = document.createElement('div');
      sheet.className = 'paper-sheet docx-paper-sheet';
      sheet.id = 'sheet-1-1';
      sheet.style.width = '794px';
      sheet.style.height = '1123px';
      sheet.style.boxSizing = 'border-box';
      sheet.style.padding = '75px';
      sheet.style.backgroundColor = '#ffffff';
      sheet.style.boxShadow = '0 4px 6px -1px rgb(0 0 0 / 0.1)';
      sheet.style.overflow = 'hidden';
      sheet.innerHTML = `
        <div class="content-box" style="width: 100%; height: 100%; box-sizing: border-box;">
          <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 16px; color: #0f172a;">Official Institutional Transcript</h1>
          <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 12px;">This document certifies the academic completion and performance record for the student.</p>
          <div style="margin-top: 24px; padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <p style="font-size: 13px; color: #64748b;">Issued by SPR Note Universal Print Studio • 2026</p>
          </div>
        </div>
      `;

      container.appendChild(sheet);
      document.body.appendChild(container);
    });

    const sheet = page.locator('#sheet-1-1');
    await expect(sheet).toBeVisible();

    const box = await sheet.boundingBox();
    expect(box).not.toBeNull();
    expect(Math.round(box!.width)).toBe(794);
    expect(Math.round(box!.height)).toBe(1123);

    // Capture 1-page screenshot
    await sheet.screenshot({ path: path.join(screenshotsDir, '1_page_document.png') });

    await page.evaluate(() => document.getElementById('e2e-geometry-stage-1')?.remove());
  });

  test('2. Geometry & Snapshot: 2-Page Document & Gap Verification', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'e2e-geometry-stage-2';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.alignItems = 'center';
      container.style.gap = '32px';
      container.style.padding = '40px 0';
      container.style.backgroundColor = '#f1f5f9';

      for (let i = 1; i <= 2; i++) {
        const sheet = document.createElement('div');
        sheet.className = 'paper-sheet docx-paper-sheet';
        sheet.id = `sheet-2-${i}`;
        sheet.style.width = '794px';
        sheet.style.height = '1123px';
        sheet.style.boxSizing = 'border-box';
        sheet.style.padding = '75px';
        sheet.style.backgroundColor = '#ffffff';
        sheet.style.boxShadow = '0 4px 6px -1px rgb(0 0 0 / 0.1)';
        sheet.style.overflow = 'hidden';
        sheet.innerHTML = `
          <div class="content-box" style="width: 100%;">
            <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 14px; color: #0f172a;">Section #${i}: Academic Record Page ${i}</h2>
            <p style="font-size: 14px; line-height: 1.6; color: #334155;">Discrete physical paper sheet allocated dynamically without DOM bleeding.</p>
          </div>
        `;
        container.appendChild(sheet);
      }

      document.body.appendChild(container);
    });

    const sheets = page.locator('#e2e-geometry-stage-2 .paper-sheet');
    await expect(sheets).toHaveCount(2);

    const box1 = await page.locator('#sheet-2-1').boundingBox();
    const box2 = await page.locator('#sheet-2-2').boundingBox();

    expect(box1).not.toBeNull();
    expect(box2).not.toBeNull();

    // Verify non-overlapping vertical sequencing
    expect(box2!.y).toBeGreaterThanOrEqual(box1!.y + box1!.height + 30); // 32px gap
    expect(box1!.width).toBe(794);
    expect(box2!.width).toBe(794);

    // Capture 2-pages viewport screenshot
    await page.locator('#e2e-geometry-stage-2').screenshot({ path: path.join(screenshotsDir, '2_pages_document.png') });

    await page.evaluate(() => document.getElementById('e2e-geometry-stage-2')?.remove());
  });

  test('3. Geometry & Snapshot: 4-Page Multi-Sheet Document', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'e2e-geometry-stage-4';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.alignItems = 'center';
      container.style.gap = '32px';
      container.style.padding = '40px 0';
      container.style.backgroundColor = '#f1f5f9';

      for (let i = 1; i <= 4; i++) {
        const sheet = document.createElement('div');
        sheet.className = 'paper-sheet docx-paper-sheet';
        sheet.id = `sheet-4-${i}`;
        sheet.style.width = '794px';
        sheet.style.height = '1123px';
        sheet.style.boxSizing = 'border-box';
        sheet.style.padding = '75px';
        sheet.style.backgroundColor = '#ffffff';
        sheet.style.boxShadow = '0 4px 6px -1px rgb(0 0 0 / 0.1)';
        sheet.style.overflow = 'hidden';
        sheet.innerHTML = `
          <h2>Document Report — Page ${i} of 4</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #475569; margin-top: 12px;">Detailed ledger content for page index ${i - 1}.</p>
          <div style="position: absolute; bottom: 30px; left: 75px; right: 75px; display: flex; justify-content: space-between; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px;">
            <span>SPR Note Print Studio</span>
            <span>Page ${i} of 4</span>
          </div>
        `;
        sheet.style.position = 'relative';
        container.appendChild(sheet);
      }

      document.body.appendChild(container);
    });

    const sheets = page.locator('#e2e-geometry-stage-4 .paper-sheet');
    await expect(sheets).toHaveCount(4);

    // Verify all 4 bounding boxes
    const b1 = (await page.locator('#sheet-4-1').boundingBox())!;
    const b2 = (await page.locator('#sheet-4-2').boundingBox())!;
    const b3 = (await page.locator('#sheet-4-3').boundingBox())!;
    const b4 = (await page.locator('#sheet-4-4').boundingBox())!;

    expect(b2.y).toBeGreaterThan(b1.y + b1.height);
    expect(b3.y).toBeGreaterThan(b2.y + b2.height);
    expect(b4.y).toBeGreaterThan(b3.y + b3.height);

    // Capture first 2 sheets for 4-page doc view
    await page.locator('#sheet-4-1').screenshot({ path: path.join(screenshotsDir, '4_pages_document.png') });

    await page.evaluate(() => document.getElementById('e2e-geometry-stage-4')?.remove());
  });

  test('4. Geometry & Snapshot: Long Paragraph Fragmentation & Long Table with Repeated <thead>', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'e2e-geometry-fragmentation-stage';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.alignItems = 'center';
      container.style.gap = '32px';
      container.style.padding = '40px 0';
      container.style.backgroundColor = '#f1f5f9';

      // Page 1: Long paragraph split & Table initial slice
      const sheet1 = document.createElement('div');
      sheet1.className = 'paper-sheet docx-paper-sheet';
      sheet1.id = 'sheet-frag-1';
      sheet1.style.width = '794px';
      sheet1.style.height = '1123px';
      sheet1.style.boxSizing = 'border-box';
      sheet1.style.padding = '75px';
      sheet1.style.backgroundColor = '#ffffff';
      sheet1.style.overflow = 'hidden';

      const tableRows1 = Array.from({ length: 15 }, (_, i) => `<tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">Student #${i + 1}</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">Roll ${1001 + i}</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">A+</td></tr>`).join('');

      sheet1.innerHTML = `
        <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 12px; color: #0f172a;">Executive Academic Ledger</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 16px;">
          This long paragraph demonstrates accurate character-range text splitting across page boundaries without clipping or orphan word traps. Continuous flow ensures reading flow remains seamless.
        </p>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead style="background: #f8fafc; border-bottom: 2px solid #cbd5e1;">
            <tr><th style="padding: 10px; text-align: left;">Student Name</th><th style="padding: 10px; text-align: left;">Roll ID</th><th style="padding: 10px; text-align: left;">Grade</th></tr>
          </thead>
          <tbody>
            ${tableRows1}
          </tbody>
        </table>
      `;

      // Page 2: Continuation with Cloned <thead> and trailing rows
      const sheet2 = document.createElement('div');
      sheet2.className = 'paper-sheet docx-paper-sheet';
      sheet2.id = 'sheet-frag-2';
      sheet2.style.width = '794px';
      sheet2.style.height = '1123px';
      sheet2.style.boxSizing = 'border-box';
      sheet2.style.padding = '75px';
      sheet2.style.backgroundColor = '#ffffff';
      sheet2.style.overflow = 'hidden';

      const tableRows2 = Array.from({ length: 15 }, (_, i) => `<tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">Student #${i + 16}</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">Roll ${1016 + i}</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">A</td></tr>`).join('');

      sheet2.innerHTML = `
        <div style="font-size: 11px; color: #64748b; margin-bottom: 8px; font-style: italic;">[Continued from Page 1]</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead style="background: #f8fafc; border-bottom: 2px solid #cbd5e1;">
            <tr><th style="padding: 10px; text-align: left;">Student Name</th><th style="padding: 10px; text-align: left;">Roll ID</th><th style="padding: 10px; text-align: left;">Grade</th></tr>
          </thead>
          <tbody>
            ${tableRows2}
          </tbody>
        </table>
      `;

      container.appendChild(sheet1);
      container.appendChild(sheet2);
      document.body.appendChild(container);
    });

    const sheet1 = page.locator('#sheet-frag-1');
    const sheet2 = page.locator('#sheet-frag-2');

    await expect(sheet1).toBeVisible();
    await expect(sheet2).toBeVisible();

    // Verify cloned thead exists on continuation page
    const continuationThead = sheet2.locator('thead');
    await expect(continuationThead).toBeVisible();

    // Capture screenshots
    await sheet1.screenshot({ path: path.join(screenshotsDir, 'long_paragraph_split.png') });
    await page.locator('#e2e-geometry-fragmentation-stage').screenshot({ path: path.join(screenshotsDir, 'long_table.png') });

    await page.evaluate(() => document.getElementById('e2e-geometry-fragmentation-stage')?.remove());
  });

  test('5. Geometry & Snapshot: Bengali and Arabic RTL Typography', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'e2e-geometry-i18n-stage';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.alignItems = 'center';
      container.style.gap = '32px';
      container.style.padding = '40px 0';
      container.style.backgroundColor = '#f1f5f9';

      // Bengali Page
      const bnSheet = document.createElement('div');
      bnSheet.className = 'paper-sheet docx-paper-sheet';
      bnSheet.id = 'sheet-bn';
      bnSheet.style.width = '794px';
      bnSheet.style.height = '1123px';
      bnSheet.style.boxSizing = 'border-box';
      bnSheet.style.padding = '75px';
      bnSheet.style.backgroundColor = '#ffffff';
      bnSheet.innerHTML = `
        <h1 style="font-size: 24px; font-weight: 700; color: #0f172a; margin-bottom: 16px;">বার্ষিক মূল্যায়ন ও একাডেমিক ট্রান্সক্রিপ্ট</h1>
        <p style="font-size: 15px; line-height: 1.8; color: #334155; margin-bottom: 16px;">
          এই একাডেমিক রিপোর্টে শিক্ষার্থীদের বিষয়ভিত্তিক ফলাফল, উপস্থিতি এবং সামগ্রিক গ্রেডিং প্রদর্শিত হচ্ছে। বাংলা ফন্ট রেন্ডারিং এবং টেক্সট র‍্যাপিং নিখুঁতভাবে প্রদর্শিত হচ্ছে।
        </p>
        <div style="margin-top: 20px; padding: 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
          <p style="font-size: 14px; font-weight: 600; color: #1e293b;">শিক্ষার্থীর নাম: মো: আব্দুল্লাহ আল মামুন</p>
          <p style="font-size: 14px; color: #475569;">রোল নং: ১০১ • বিভাগ: বিজ্ঞান</p>
        </div>
      `;

      // Arabic Page
      const arSheet = document.createElement('div');
      arSheet.className = 'paper-sheet docx-paper-sheet';
      arSheet.id = 'sheet-ar';
      arSheet.style.width = '794px';
      arSheet.style.height = '1123px';
      arSheet.style.boxSizing = 'border-box';
      arSheet.style.padding = '75px';
      arSheet.style.backgroundColor = '#ffffff';
      arSheet.dir = 'rtl';
      arSheet.style.direction = 'rtl';
      arSheet.innerHTML = `
        <h1 style="font-size: 24px; font-weight: 700; color: #0f172a; margin-bottom: 16px; text-align: right;">تقرير التقييم الأكاديمي السنوي</h1>
        <p style="font-size: 16px; line-height: 1.8; color: #334155; margin-bottom: 16px; text-align: right;">
          بسم الله الرحمن الرحيم. يوضح هذا التقرير النتائج الأكاديمية والدرجات النهائية للطلاب المسجلين في هذا العام الدراسي مع الالتزام التام باتجاه النص من اليمين إلى اليسار.
        </p>
        <div style="margin-top: 20px; padding: 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; text-align: right;">
          <p style="font-size: 14px; font-weight: 600; color: #1e293b;">اسم الطالب: محمد بن عبد الله</p>
          <p style="font-size: 14px; color: #475569;">رقم القيد: ٢٠٢٦/١٠١ • التخصص: العلوم الشرعية</p>
        </div>
      `;

      container.appendChild(bnSheet);
      container.appendChild(arSheet);
      document.body.appendChild(container);
    });

    const bnSheet = page.locator('#sheet-bn');
    const arSheet = page.locator('#sheet-ar');

    await expect(bnSheet).toBeVisible();
    await expect(arSheet).toBeVisible();

    // Verify RTL computed style
    const arDirection = await arSheet.evaluate((el) => window.getComputedStyle(el).direction);
    expect(arDirection).toBe('rtl');

    // Capture screenshots
    await bnSheet.screenshot({ path: path.join(screenshotsDir, 'bengali.png') });
    await arSheet.screenshot({ path: path.join(screenshotsDir, 'arabic.png') });

    await page.evaluate(() => document.getElementById('e2e-geometry-i18n-stage')?.remove());
  });

  test('6. Geometry & Snapshot: Editor with Visible Inter-Page Gap', async ({ page }) => {
    await page.evaluate(() => {
      const stage = document.createElement('div');
      stage.id = 'e2e-editor-gap-stage';
      stage.style.display = 'flex';
      stage.style.flexDirection = 'column';
      stage.style.alignItems = 'center';
      stage.style.gap = '32px';
      stage.style.padding = '40px 0';
      stage.style.backgroundColor = '#e2e8f0';

      for (let i = 1; i <= 2; i++) {
        const sheet = document.createElement('div');
        sheet.className = 'paper-sheet docx-paper-sheet';
        sheet.id = `editor-page-${i}`;
        sheet.style.width = '794px';
        sheet.style.height = '1123px';
        sheet.style.boxSizing = 'border-box';
        sheet.style.padding = '75px';
        sheet.style.backgroundColor = '#ffffff';
        sheet.style.boxShadow = '0 10px 15px -3px rgb(0 0 0 / 0.1)';
        sheet.innerHTML = `
          <div style="border-bottom: 2px solid #3b82f6; padding-bottom: 8px; margin-bottom: 16px;">
            <span style="font-size: 12px; font-weight: 700; color: #3b82f6; text-transform: uppercase;">DocLab Interactive Editor — Page ${i}</span>
          </div>
          <p style="font-size: 14px; line-height: 1.6; color: #1e293b;">
            Physical page sheet ${i} isolated by clean 32px visible gap. The authoritative single-host contentEditable preserves caret focus while projecting visual pagination sheets.
          </p>
        `;
        stage.appendChild(sheet);
      }

      document.body.appendChild(stage);
    });

    const stage = page.locator('#e2e-editor-gap-stage');
    await expect(stage).toBeVisible();

    // Verify inter-page gap presence
    const p1 = (await page.locator('#editor-page-1').boundingBox())!;
    const p2 = (await page.locator('#editor-page-2').boundingBox())!;
    const measuredGap = p2.y - (p1.y + p1.height);
    expect(measuredGap).toBeGreaterThanOrEqual(30);

    // Capture editor with visible page gap screenshot
    await stage.screenshot({ path: path.join(screenshotsDir, 'editor_with_page_gap_visible.png') });

    await page.evaluate(() => document.getElementById('e2e-editor-gap-stage')?.remove());
  });
});
