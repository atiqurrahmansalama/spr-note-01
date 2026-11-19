/**
 * Unit Tests for Standalone Auth & Public Staff Onboarding Portal:
 * 1. Verifies 100% 4-language (en, bn, ar, ur) recursive key parity for auth & staffManagement locales.
 * 2. Verifies Google OAuth placeholder phone filtering & candidate identity normalization.
 * 3. Verifies shared auth validation & DRF error extraction helpers.
 */

import assert from "node:assert/strict";
import authEn from "../../../auth/locales/en";
import authBn from "../../../auth/locales/bn";
import authAr from "../../../auth/locales/ar";
import authUr from "../../../auth/locales/ur";
import { en as staffEn } from "../en";
import { bn as staffBn } from "../bn";
import { ar as staffAr } from "../ar";
import { ur as staffUr } from "../ur";
import {
  sanitizeOnboardingPhone,
  splitCandidateFullName,
  buildCandidateInitialData,
  buildInitialStaffPayload,
  normalizeStaffDate,
} from "../../onboarding/utils/candidateIdentity";
import {
  isValidEmailAddress,
  isValidPhoneNumber,
  isValidLoginIdentifier,
  extractAuthErrorMessage,
} from "../../../../components/auth/authValidation";

function collectLeafKeys(obj: Record<string, any>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      keys.push(...collectLeafKeys(value, path));
    } else {
      keys.push(path);
    }
  }
  return keys.sort();
}

function getNestedValue(obj: Record<string, any>, path: string): unknown {
  return path.split(".").reduce<any>((acc, part) => (acc ? acc[part] : undefined), obj);
}

// 1. Auth 4-language parity
const expectedAuthKeys = collectLeafKeys(authEn);
for (const [lang, dict] of Object.entries({ en: authEn, bn: authBn, ar: authAr, ur: authUr })) {
  const actualKeys = collectLeafKeys(dict);
  assert.deepStrictEqual(
    actualKeys,
    expectedAuthKeys,
    `auth locale '${lang}' key parity mismatch`
  );
  for (const key of expectedAuthKeys) {
    const val = getNestedValue(dict, key);
    assert.strictEqual(typeof val, "string", `auth.${lang}.${key} must be string`);
    assert.ok(String(val).trim().length > 0, `auth.${lang}.${key} must be non-empty`);
  }
}

// 2. Staff Management + publicPortal 4-language parity
const expectedStaffKeys = collectLeafKeys(staffEn);
const expectedPublicPortalKeys = collectLeafKeys(staffEn.publicPortal);
assert.ok(expectedPublicPortalKeys.length >= 35, "Expected full publicPortal dictionary");

for (const [lang, dict] of Object.entries({
  en: staffEn,
  bn: staffBn,
  ar: staffAr,
  ur: staffUr,
})) {
  const actualKeys = collectLeafKeys(dict);
  assert.deepStrictEqual(
    actualKeys,
    expectedStaffKeys,
    `staffManagement locale '${lang}' key parity mismatch`
  );
  for (const key of expectedStaffKeys) {
    const val = getNestedValue(dict, key);
    assert.strictEqual(typeof val, "string", `staffManagement.${lang}.${key} must be string`);
    assert.ok(
      String(val).trim().length > 0,
      `staffManagement.${lang}.${key} must be non-empty`
    );
  }
}

// 3. Google OAuth dummy phone filtering & candidate pre-fill
assert.strictEqual(sanitizeOnboardingPhone("g_108923456789"), "");
assert.strictEqual(sanitizeOnboardingPhone("G_998877"), "");
assert.strictEqual(sanitizeOnboardingPhone("user_123456"), "");
assert.strictEqual(sanitizeOnboardingPhone("  +880 1711-223344  "), "+880 1711-223344");
assert.strictEqual(sanitizeOnboardingPhone(null), "");

assert.deepStrictEqual(splitCandidateFullName("  Mufti   Muhammad Abdullah "), {
  firstName: "Mufti",
  lastName: "Muhammad Abdullah",
});
assert.deepStrictEqual(splitCandidateFullName("Abdullah"), {
  firstName: "Abdullah",
  lastName: "",
});
assert.deepStrictEqual(splitCandidateFullName(""), {
  firstName: "Faculty",
  lastName: "Candidate",
});

const googleInitial = buildCandidateInitialData({
  id: 77,
  first_name: "Ustad",
  last_name: "Tariq",
  email: " tariq@example.com ",
  phone_number: "g_1234567890ab",
  avatar_url: "https://lh3.googleusercontent.com/a/avatar",
});
assert.deepStrictEqual(googleInitial, {
  user_id: 77,
  name: "Ustad Tariq",
  name_en: "Ustad Tariq",
  email: "tariq@example.com",
  phone_number: "",
  photo_url: "https://lh3.googleusercontent.com/a/avatar",
});

// 4. Shared portal validation & error formatting helpers
assert.strictEqual(isValidEmailAddress("candidate@example.com"), true);
assert.strictEqual(isValidEmailAddress("bad-email@"), false);
assert.strictEqual(isValidPhoneNumber("01712-345678"), true);
assert.strictEqual(isValidPhoneNumber("123"), false);
assert.strictEqual(isValidLoginIdentifier("admin"), true);
assert.strictEqual(isValidLoginIdentifier("user@domain.com"), true);
assert.strictEqual(isValidLoginIdentifier("user@"), false);
assert.strictEqual(
  extractAuthErrorMessage({ email: ["A user with this email already exists."] }, "Fallback"),
  "A user with this email already exists."
);
assert.strictEqual(
  extractAuthErrorMessage({ detail: "Invalid credentials" }, "Fallback"),
  "Invalid credentials"
);

// 5. Shared payload continuity between Quick Onboarding and Full Onboarding Wizard
const quickDraft = buildInitialStaffPayload({
  name: "Maulana Yusuf",
  phone_number: "01722334455",
  email: "yusuf@madrasa.edu",
  staff_type: "TEACHING",
  designation: "Senior Ustad",
  rank_order: 3,
  department: "dept-hifz",
  employment_status: "PROBATION",
  joining_date: "2026-11-15",
});
assert.strictEqual(quickDraft.name, "Maulana Yusuf");
assert.strictEqual(quickDraft.name_en, "Maulana Yusuf");
assert.strictEqual(quickDraft.phone_number, "01722334455");
assert.strictEqual(quickDraft.designation, "Senior Ustad");
assert.strictEqual(quickDraft.rank_order, 3);
assert.strictEqual(quickDraft.department, "dept-hifz");
assert.strictEqual(quickDraft.employment_status, "PROBATION");
assert.strictEqual(quickDraft.joining_date, "2026-11-15");

const withToken = buildInitialStaffPayload(
  { name: "Admin Draft", designation: "Junior Teacher" },
  { token: "stf_abc123", staff_type: "ADMIN", designation: "Office Manager", rank_order: 2 }
);
assert.strictEqual(withToken.token, "stf_abc123");
assert.strictEqual(withToken.staff_type, "ADMIN");
assert.strictEqual(withToken.designation, "Office Manager");
assert.strictEqual(withToken.rank_order, 2);

// 6. Date normalization & multilingual name_i18n payload tests (prevents DRF dob="" format error)
assert.strictEqual(normalizeStaffDate(""), null);
assert.strictEqual(normalizeStaffDate("   "), null);
assert.strictEqual(normalizeStaffDate(undefined), null);
assert.strictEqual(normalizeStaffDate(null), null);
assert.strictEqual(normalizeStaffDate("2026-11-12"), "2026-11-12");
assert.strictEqual(normalizeStaffDate("12/11/2026"), "2026-11-12");
assert.strictEqual(normalizeStaffDate("5-3-1995"), "1995-03-05");

const multiLangDraft = buildInitialStaffPayload({
  name: { en: "Ustad Bilal", bn: "উস্তাদ বিলাল", ar: "أستاذ بلال" },
  email: "bilal@madrasa.edu",
});
assert.strictEqual(multiLangDraft.name, "Ustad Bilal");
assert.strictEqual(multiLangDraft.bangla_name, "উস্তাদ বিলাল");
assert.deepStrictEqual(multiLangDraft.name_i18n, {
  en: "Ustad Bilal",
  bn: "উস্তাদ বিলাল",
  ar: "أستاذ بلال",
});

console.log("staffPortalLocales.test.ts passed!");

