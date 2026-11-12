import assert from 'node:assert/strict';
import {
  EVENT_COLORS,
  EVENT_COLOR_MAP,
  LEGACY_COLOR_ALIAS_MAP,
  resolveCanonicalEventColor,
} from '../constants/eventColors';
import { DEFAULT_EVENT_KINDS } from '../../../../stores/calendarStore';
import { en } from '../locales/en';
import { bn } from '../locales/bn';
import { ar } from '../locales/ar';
import { ur } from '../locales/ur';

const EXPECTED_IDS = [
  'eucalyptus',
  'sage',
  'seafoam',
  'spruce',
  'mint',
  'teal',
  'peacock',
  'cerulean',
  'cobalt',
  'glacier',
  'sapphire',
  'blueberry',
  'lavender',
  'wisteria',
  'amethyst',
  'grape',
  'plum',
  'radicchio',
  'cherry_blossom',
  'flamingo',
  'coral',
  'terracotta',
  'marigold',
  'peach',
  'cocoa',
  'sand',
];

// 1. Verify curated expanded 26-color palette
assert.equal(EVENT_COLORS.length, 26, 'EVENT_COLORS must contain all 26 curated colors');
assert.deepEqual(
  EVENT_COLORS.map((c) => c.id),
  EXPECTED_IDS,
  'EVENT_COLORS IDs must match canonical curated order'
);

EVENT_COLORS.forEach((col) => {
  assert.match(col.hex, /^#[0-9A-F]{6}$/i, `Invalid hex code on "${col.id}"`);
  assert.equal(col.hex.toUpperCase(), col.style.hex.toUpperCase(), `style.hex mismatch on "${col.id}"`);
});

// 2. Verify removed legacy deep hex colors are not in selectable palette
const removedHexes = new Set(['#6366F1', '#10B981', '#3B82F6', '#F43F5E', '#EF4444', '#F59E0B', '#A855F7']);
EVENT_COLORS.forEach((c) => {
  assert.ok(!removedHexes.has(c.hex.toUpperCase()), `Removed deep hex ${c.hex} should not exist in EVENT_COLORS`);
});

// 3. Verify legacy alias resolution and EVENT_COLOR_MAP completeness
const canonicalHexSet = new Set(EVENT_COLORS.map((c) => c.hex.toUpperCase()));
for (const [legacyKey, canonicalId] of Object.entries(LEGACY_COLOR_ALIAS_MAP)) {
  assert.equal(resolveCanonicalEventColor(legacyKey), canonicalId, `Legacy alias ${legacyKey} should map to ${canonicalId}`);
  const style = EVENT_COLOR_MAP[legacyKey];
  assert.ok(style, `EVENT_COLOR_MAP must include backward-compatible entry for ${legacyKey}`);
  assert.ok(canonicalHexSet.has(style.hex.toUpperCase()), `Mapped hex for ${legacyKey} must belong to canonical palette`);
}

// 4. Verify DEFAULT_EVENT_KINDS in calendarStore uses only canonical colors
const canonicalIdSet = new Set(EXPECTED_IDS);
DEFAULT_EVENT_KINDS.forEach((kind: { id: string; color: string }) => {
  assert.ok(
    canonicalIdSet.has(kind.color),
    `DEFAULT_EVENT_KINDS entry "${kind.id}" has non-canonical color "${kind.color}"`
  );
});

// 5. Verify 4-language calendarEvents locale parity
const enKeys = Object.keys(en).sort();
for (const [lang, dict] of Object.entries({ bn, ar, ur })) {
  const keys = Object.keys(dict).sort();
  assert.deepEqual(keys, enKeys, `Locale "${lang}" keys diverge from English dictionary`);
  for (const key of enKeys) {
    const val = (dict as Record<string, string>)[key];
    assert.ok(typeof val === 'string' && val.trim().length > 0, `Missing translation for "${lang}.${key}"`);
  }
}

console.log('ALL_CALENDAR_EVENT_PALETTE_AND_LOCALE_CHECKS_PASSED');
