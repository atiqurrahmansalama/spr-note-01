/**
 * SPR Note — Enterprise Input Validators & Sanitizers
 * 
 * Provides pure validation functions, auto-sanitizers, and formatters
 * for all input fields across the application.
 */

// ============================================================================
// 1. PURE VALIDATORS
// ============================================================================

/**
 * Validates Bangladesh mobile phone numbers.
 * Supports standard local 11 digits (01XXXXXXXX) as well as +880 / 880 country codes
 * (+8801XXXXXXXX or 8801XXXXXXXX) and handles optional spaces/dashes.
 */
export function validateBDPhone(phone) {
  if (!phone) return false;
  const str = String(phone).trim();
  const cleaned = str.replace(/[\s\-()]/g, "");
  
  // 1) +8801[3-9]XXXXXXXX (14 chars)
  if (/^\+8801[3-9]\d{8}$/.test(cleaned)) return true;
  
  // 2) 8801[3-9]XXXXXXXX (13 digits)
  if (/^8801[3-9]\d{8}$/.test(cleaned)) return true;
  
  // 3) Standard local 01[3-9]XXXXXXXX (11 digits)
  if (/^01[3-9]\d{8}$/.test(cleaned)) return true;
  
  return false;
}

/**
 * Validates international phone numbers (+ followed by 7 to 20 digits).
 */
export function validateInternationalPhone(phone) {
  if (!phone) return false;
  const cleaned = String(phone).trim();
  return /^\+?[0-9\s\-()]{7,20}$/.test(cleaned);
}

/**
 * Validates National ID Number (NID).
 * Accepts 10 (Smart NID), 13 (Old NID), or 17 (13 digit prefixed with birth year) digits.
 */
export function validateNID(nid) {
  if (!nid) return false;
  const cleaned = String(nid).replace(/[^\d]/g, "");
  return [10, 13, 17].includes(cleaned.length);
}

/**
 * Validates 17-digit Birth Registration Certificate Number (BRN).
 */
export function validateBRN(brn) {
  if (!brn) return false;
  const cleaned = String(brn).replace(/[^\d]/g, "");
  return cleaned.length === 17;
}

/**
 * Validates standard email address format according to RFC 5322 specs.
 */
export function validateEmail(email) {
  if (!email) return false;
  const trimmed = String(email).trim();
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmed);
}

/**
 * Validates web URL format (http://, https://, or www.).
 */
export function validateURL(url) {
  if (!url) return false;
  const trimmed = String(url).trim();
  try {
    const parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    return Boolean(parsed.hostname && parsed.hostname.includes("."));
  } catch {
    return false;
  }
}

/**
 * Validates numeric value within optional min and max bounds.
 */
export function validateNumber(value, { min, max, allowDecimals = true, allowNegative = false } = {}) {
  if (value === "" || value === null || value === undefined) return false;
  const num = Number(value);
  if (isNaN(num)) return false;
  if (!allowNegative && num < 0) return false;
  if (!allowDecimals && !Number.isInteger(num)) return false;
  if (min !== undefined && num < min) return false;
  if (max !== undefined && num > max) return false;
  return true;
}

/**
 * Formats and calculates age from DOB string to "X Yrs Y Mos" format.
 */
export function calculateAge(dobString) {
  if (!dobString) return "";
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return "";

  const today = new Date();
  let years = today.getFullYear() - dob.getFullYear();
  let months = today.getMonth() - dob.getMonth();

  if (months < 0 || (months === 0 && today.getDate() < dob.getDate())) {
    years--;
    months += 12;
  }

  if (today.getDate() < dob.getDate()) {
    months--;
    if (months < 0) {
      months = 11;
      years--;
    }
  }

  if (years < 0) return "0 Yrs 0 Mos";
  return `${years} Yrs ${months} Mos`;
}

// ============================================================================
// 2. SANITIZERS (Pasting & Typing Cleaners)
// ============================================================================

/**
 * Strips all non-digit characters.
 */
export function sanitizeNumeric(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[^\d]/g, "");
}

/**
 * Strips non-decimal characters (keeps digits, single decimal dot, and optional leading minus).
 */
export function sanitizeDecimal(value, allowNegative = false) {
  if (value === null || value === undefined) return "";
  let str = String(value);
  let isNeg = false;
  if (allowNegative && str.startsWith("-")) {
    isNeg = true;
    str = str.slice(1);
  }
  str = str.replace(/[^\d.]/g, "");
  const parts = str.split(".");
  if (parts.length > 2) {
    str = parts[0] + "." + parts.slice(1).join("");
  }
  return isNeg ? `-${str}` : str;
}

/**
 * Cleans phone input allowing optional leading + and digits only.
 * Preserves + prefix for +880 numbers and limits to max 14 characters.
 */
export function sanitizePhone(value) {
  if (value === null || value === undefined) return "";
  const str = String(value).trim();
  const hasPlus = str.startsWith("+");
  const digits = str.replace(/[^\d]/g, "");
  const result = hasPlus ? `+${digits}` : digits;
  return result.slice(0, 14);
}

// ============================================================================
// 3. FORMATTERS
// ============================================================================

/**
 * Formats currency number with commas and standard decimal representation.
 */
export function formatCurrency(value, currencySymbol = "৳") {
  if (value === "" || value === null || value === undefined) return "";
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  const parts = num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${currencySymbol} ${parts}`;
}

// ============================================================================
// 4. TYPE CHECKER PRESETS & CONFIGURATIONS
// ============================================================================

export const INPUT_TYPE_CONFIGS = {
  text: {
    inputMode: "text",
    autoSanitize: null,
    maxLength: undefined,
  },
  number: {
    inputMode: "numeric",
    autoSanitize: (val, { allowDecimals, allowNegative } = {}) =>
      allowDecimals ? sanitizeDecimal(val, allowNegative) : sanitizeNumeric(val),
    defaultPlaceholder: "Enter number...",
  },
  phone: {
    inputMode: "tel",
    maxLength: 14,
    autoSanitize: sanitizePhone,
    validate: validateBDPhone,
    defaultPlaceholder: "e.g. 01712345678 or +88017...",
    errorMessage: "Must be a valid mobile number (e.g. 017XXXXXXXX or +88017XXXXXXXX).",
    showDigitCounter: true,
  },
  "bd-phone": {
    inputMode: "tel",
    maxLength: 14,
    autoSanitize: sanitizePhone,
    validate: validateBDPhone,
    defaultPlaceholder: "e.g. 01712345678 or +88017...",
    errorMessage: "Must be a valid mobile number (e.g. 017XXXXXXXX or +88017XXXXXXXX).",
    showDigitCounter: true,
  },
  nid: {
    inputMode: "numeric",
    maxLength: 17,
    autoSanitize: sanitizeNumeric,
    validate: validateNID,
    defaultPlaceholder: "10, 13, or 17 Digit National ID",
    errorMessage: "Must be 10, 13, or 17 digits.",
    showDigitCounter: true,
    targetLengths: [10, 13, 17],
  },
  "national-id": {
    inputMode: "numeric",
    maxLength: 17,
    autoSanitize: sanitizeNumeric,
    validate: validateNID,
    defaultPlaceholder: "10, 13, or 17 Digit National ID",
    errorMessage: "Must be 10, 13, or 17 digits.",
    showDigitCounter: true,
    targetLengths: [10, 13, 17],
  },
  brn: {
    inputMode: "numeric",
    maxLength: 17,
    autoSanitize: sanitizeNumeric,
    validate: validateBRN,
    defaultPlaceholder: "17 Digit Birth Certificate Number",
    errorMessage: "Must be exactly 17 digits.",
    showDigitCounter: true,
    targetLength: 17,
  },
  "birth-certificate": {
    inputMode: "numeric",
    maxLength: 17,
    autoSanitize: sanitizeNumeric,
    validate: validateBRN,
    defaultPlaceholder: "17 Digit Birth Certificate Number",
    errorMessage: "Must be exactly 17 digits.",
    showDigitCounter: true,
    targetLength: 17,
  },
  email: {
    inputMode: "email",
    autoSanitize: (val) => String(val || "").trim(),
    validate: validateEmail,
    defaultPlaceholder: "name@example.com",
    errorMessage: "Please enter a valid email address.",
  },
  url: {
    inputMode: "url",
    autoSanitize: (val) => String(val || "").trim(),
    validate: validateURL,
    defaultPlaceholder: "https://example.com",
    errorMessage: "Please enter a valid web URL.",
  },
  currency: {
    inputMode: "decimal",
    autoSanitize: (val) => sanitizeDecimal(val, false),
    defaultPlaceholder: "0.00",
  },
  password: {
    inputMode: "text",
    defaultPlaceholder: "Enter password...",
  },
  search: {
    inputMode: "search",
    defaultPlaceholder: "Search...",
  },
};
