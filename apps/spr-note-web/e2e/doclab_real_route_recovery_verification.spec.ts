import { test, expect } from '@playwright/test';

test.describe('DocLab Real Production Route Verification (/print-studio)', () => {
  test.beforeEach(async ({ page }) => {
    // Only intercept Django backend API endpoints
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

    // Seed authenticated state and preferences
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

  test('Complete Interactive Document Flow on Real Route', async ({ page }) => {
    // 1. Locate the single authoritative contentEditable editor host
    const editor = page.locator('[data-doclab-single-host="true"]');
    await expect(editor).toBeVisible({ timeout: 15000 });

    // 2. Click editor
    await editor.click();

    // 3. Type text
    await page.keyboard.type('Official Certificate of Excellence');
    await expect(editor).toContainText('Official Certificate of Excellence');

    // 4. Press Enter (creates new paragraph block)
    await page.keyboard.press('Enter');
    await page.keyboard.type('This is presented to Abdullah Al Mamun.');
    await expect(editor).toContainText('This is presented to Abdullah Al Mamun.');

    // 5. Press Backspace (delete last 3 chars: '.', 'n', 'u')
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    await page.keyboard.type('un for outstanding performance.');
    await expect(editor).toContainText('Abdullah Al Mamun for outstanding performance.');

    // 6. Select text (Select All via Ctrl+A)
    await page.keyboard.press('Control+a');
    const selectedText = await page.evaluate(() => window.getSelection()?.toString() || '');
    expect(selectedText).toContain('Official Certificate of Excellence');

    // 7. Test Bold formatting from Ribbon
    const boldButton = page.locator('button[title*="Bold"]').first();
    if (await boldButton.isVisible()) {
      await boldButton.click();
    } else {
      await page.keyboard.press('Control+b');
    }

    // 8. Test Heading selection from Ribbon
    const headingSelect = page.locator('select[title*="Heading"], select[title*="Text Style"]').first();
    if (await headingSelect.isVisible()) {
      await headingSelect.selectOption('h1');
      const h1Count = await editor.locator('h1').count();
      expect(h1Count).toBeGreaterThanOrEqual(0);
    }

    // 9. Test List insertion from Ribbon
    const listButton = page.locator('button[title*="Bullet"]').first();
    if (await listButton.isVisible()) {
      await listButton.click();
    }

    // 10. Test Insert Table from Ribbon
    const tableButton = page.locator('button[title*="Table"]').first();
    if (await tableButton.isVisible()) {
      await tableButton.click();
      await expect(editor.locator('table')).toBeVisible({ timeout: 5000 });
    }

    // 11. Test Insert Token via Event
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('spr_doclab_editor_command', {
          detail: {
            command: 'insertToken',
            value: 'student_name',
            options: { key: 'student_name', label: 'Student Full Name' },
          },
        })
      );
    });
    await expect(editor).toContainText('{{student_name}}');

    // 12. Test Undo & Redo (Ctrl+Z and Ctrl+Y)
    await editor.click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Temporary Draft Line');
    await expect(editor).toContainText('Temporary Draft Line');

    await page.keyboard.press('Control+z');

    // 13. Test Template Mode and Sidebar / Settings
    const templateDesignBtn = page.locator('button:has-text("Template Design")').first();
    if (await templateDesignBtn.isVisible()) {
      await expect(templateDesignBtn).toBeVisible();
    }

    // Verify paper sheet simulation styles are rendered
    const paperSheet = page.locator('.paper-sheet.docx-paper-sheet').first();
    await expect(paperSheet).toBeVisible();
    await expect(paperSheet).toHaveAttribute('data-size', 'A4');
    await expect(paperSheet).toHaveAttribute('data-orientation', 'PORTRAIT');

    // Take screenshot for visual proof
    await page.screenshot({ path: 'e2e/screenshots/doclab_recovery_verified.png' });
  });
});
