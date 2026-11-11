/**
 * Shared client-side form validation helpers for Standalone Auth and Public Portals.
 * Kept pure so rules can be unit tested and shared across LoginView and PublicStaffOnboardingView.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_STRIP_PATTERN = /[\s\-().]/g;
const PHONE_DIGIT_PATTERN = /^\+?\d{7,16}$/;

/** Validates standard email format (user@domain.tld). */
export function isValidEmailAddress(value: string): boolean {
  const trimmed = value.trim();
  return EMAIL_PATTERN.test(trimmed);
}

/** Validates mobile/telephone numbers allowing country codes, spaces, dashes, and parentheses. */
export function isValidPhoneNumber(value: string): boolean {
  const normalized = value.trim().replace(PHONE_STRIP_PATTERN, "");
  return PHONE_DIGIT_PATTERN.test(normalized);
}

/**
 * Validates institutional sign-in identifier (email, phone number, or username).
 * Rejects malformed email strings when '@' is present while permitting phone/username login.
 */
export function isValidLoginIdentifier(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.includes("@")) {
    return EMAIL_PATTERN.test(trimmed);
  }
  return trimmed.length >= 2;
}

/**
 * Extracts a concise human-readable error message from Django REST Framework validation payloads.
 */
export function extractAuthErrorMessage(errors: unknown, fallback: string): string {
  if (!errors) return fallback;
  if (typeof errors === "string") return errors;
  if (typeof errors === "object") {
    const record = errors as Record<string, unknown>;
    if (typeof record.detail === "string" && record.detail) return record.detail;
    if (typeof record.error === "string" && record.error) return record.error;
    for (const val of Object.values(record)) {
      if (Array.isArray(val) && typeof val[0] === "string" && val[0]) {
        return val[0];
      }
      if (typeof val === "string" && val) {
        return val;
      }
    }
  }
  return fallback;
}
