import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getLanguageFromPath, stripLanguagePrefix, buildLocalizedPath } from '../routing';

console.log('Testing i18n URL & Routing Utilities...');

try {
  // Test 1: getLanguageFromPath
  assert.strictEqual(getLanguageFromPath('/bn/user-management'), 'bn');
  assert.strictEqual(getLanguageFromPath('/ar/dashboard'), 'ar');
  assert.strictEqual(getLanguageFromPath('/ur/students'), 'ur');
  assert.strictEqual(getLanguageFromPath('/en/settings'), 'en');
  assert.strictEqual(getLanguageFromPath('/user-management'), null);
  assert.strictEqual(getLanguageFromPath('/dashboard'), null);
  console.log('✓ [PASSED] 1. Language Path Detection');

  // Test 2: stripLanguagePrefix
  assert.strictEqual(stripLanguagePrefix('/bn/user-management'), '/user-management');
  assert.strictEqual(stripLanguagePrefix('/ar/dashboard'), '/dashboard');
  assert.strictEqual(stripLanguagePrefix('/ur'), '/');
  assert.strictEqual(stripLanguagePrefix('/user-management'), '/user-management');
  console.log('✓ [PASSED] 2. Language Prefix Stripping');

  // Test 3: buildLocalizedPath (pure SPA route invariant)
  assert.strictEqual(buildLocalizedPath('/user-management', 'bn'), '/user-management');
  assert.strictEqual(buildLocalizedPath('/bn/user-management', 'bn'), '/user-management');
  assert.strictEqual(buildLocalizedPath('/ar/dashboard', 'en'), '/dashboard');
  assert.strictEqual(buildLocalizedPath('/dashboard', 'ur'), '/dashboard');
  console.log('✓ [PASSED] 3. Canonical SPA Path Sanitization');

  console.log('\nAll i18n routing unit tests passed successfully!');
} catch (error) {
  console.error('Test Failed:', error);
  process.exit(1);
}
