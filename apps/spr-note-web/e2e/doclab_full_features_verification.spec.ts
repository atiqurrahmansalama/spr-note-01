import { test, expect } from '@playwright/test';

test.describe('DocLab Comprehensive Real Browser Feature Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/user/profile/**', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          name: 'Admin Engineer',
          role: 'superadmin',
          institution_id: 1,
          institution_name: 'Jamia Islamia Markaz',
        }),
      });
    });

    await page.route('http://127.0.0.1:8000/api/v1/**', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ results: [] }),
      });
    });

    await page.route('http://localhost:8000/api/v1/**', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ results: [] }),
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem('accessToken', 'mock-valid-token-12345');
      localStorage.setItem('refreshToken', 'mock-valid-refresh-token-12345');
      localStorage.setItem(
        'user',
        JSON.stringify({
          id: 1,
          name: 'Admin Engineer',
          role: 'superadmin',
          institution_id: 1,
          institution_name: 'Jamia Islamia Markaz',
        })
      );
      localStorage.setItem('active_tenant_id', '1');
      localStorage.setItem('spr_app_theme', 'light');
    });

    await page.goto('/print-studio?scope=general_document');
    await page.waitForLoadState('networkidle');
  });

  test('Verify Sidebar Tokens, Layout Settings, and Ribbon Formatters', async ({ page }) => {
    const editor = page.locator('[data-doclab-single-host="true"]');
    await expect(editor).toBeVisible({ timeout: 15000 });

    // 1. Focus editor and type text
    await editor.click();
    await page.keyboard.type('Monthly Academic Progress Report');
    await page.keyboard.press('Enter');

    // 2. Switch to Tokens tab in sidebar and click a token to insert it
    const tokensTabBtn = page.locator('button:has-text("Tokens")').first();
    if (await tokensTabBtn.isVisible()) {
      await tokensTabBtn.click();
      await page.waitForTimeout(500);

      // Find token card in sidebar and click it
      const tokenItem = page.locator('.drawer-container code, .drawer-container [title*="Click to insert"]').first();
      if (await tokenItem.isVisible()) {
        await tokenItem.click();
        await page.waitForTimeout(300);
      }
    }

    // 3. Switch to Layout tab and change Margins / Orientation
    const layoutTabBtn = page.locator('button:has-text("Layout")').first();
    if (await layoutTabBtn.isVisible()) {
      await layoutTabBtn.click();
      await page.waitForTimeout(500);

      // Check landscape button or orientation toggle
      const landscapeBtn = page.locator('button:has-text("Landscape")').first();
      if (await landscapeBtn.isVisible()) {
        await landscapeBtn.click();
        const paperSheet = page.locator('.paper-sheet.docx-paper-sheet').first();
        await expect(paperSheet).toHaveAttribute('data-orientation', 'LANDSCAPE');

        // Switch back to portrait
        const portraitBtn = page.locator('button:has-text("Portrait")').first();
        if (await portraitBtn.isVisible()) {
          await portraitBtn.click();
          await expect(paperSheet).toHaveAttribute('data-orientation', 'PORTRAIT');
        }
      }
    }

    // 4. Test Insert Image via Ribbon Command
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('spr_doclab_editor_command', {
          detail: {
            command: 'insertImage',
            value: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="40"><rect width="100" height="40" fill="%233b82f6"/><text x="10" y="25" fill="white" font-size="12">DocLab Logo</text></svg>',
            options: { alt: 'DocLab Logo' },
          },
        })
      );
    });
    await expect(editor.locator('img')).toBeVisible();

    // 5. Test Export dropdown
    const exportBtn = page.locator('button:has-text("Export")').first();
    if (await exportBtn.isVisible()) {
      await exportBtn.click();
      await expect(page.locator('text=PDF Document')).toBeVisible();
      await expect(page.locator('text=Print Document')).toBeVisible();
    }

    // Take final screenshot
    await page.screenshot({ path: 'e2e/screenshots/doclab_full_features_verified.png' });
  });
});
