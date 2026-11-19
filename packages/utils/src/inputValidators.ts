export function validateBDPhone(phone: any): boolean {
  if (!phone) return false;
  const str = String(phone).trim();
  const cleaned = str.replace(/[\s\-()]/g, "");
  
  if (/^\+8801[3-9]\d{8}$/.test(cleaned)) return true;
  if (/^8801[3-9]\d{8}$/.test(cleaned)) return true;
  if (/^01[3-9]\d{8}$/.test(cleaned)) return true;
  
  return false;
}

export function validateInternationalPhone(phone: any): boolean {
  if (!phone) return false;
  const cleaned = String(phone).trim();
  return /^\+?[0-9\s\-()]{7,20}$/.test(cleaned);
}

export function validateNID(nid: any): boolean {
  if (!nid) return false;
  const cleaned = String(nid).replace(/[^\d]/g, "");
  return [10, 13, 17].includes(cleaned.length);
}

export function validateBRN(brn: any): boolean {
  if (!brn) return false;
  const cleaned = String(brn).replace(/[^\d]/g, "");
  return cleaned.length === 17;
}

export function validateEmail(email: any): boolean {
  if (!email) return false;
  const trimmed = String(email).trim();
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmed);
}

export function validateURL(url: any): boolean {
  if (!url) return false;
  const trimmed = String(url).trim();
  try {
    const parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    return Boolean(parsed.hostname && parsed.hostname.includes("."));
  } catch {
    return false;
  }
}

export function validateNumber(
  value: any,
  { min, max, allowDecimals = true, allowNegative = false }: { min?: number; max?: number; allowDecimals?: boolean; allowNegative?: boolean } = {}
): boolean {
  if (value === "" || value === null || value === undefined) return false;
  const num = Number(value);
  if (isNaN(num)) return false;
  if (!allowNegative && num < 0) return false;
  if (!allowDecimals && !Number.isInteger(num)) return false;
  if (min !== undefined && num < min) return false;
  if (max !== undefined && num > max) return false;
  return true;
}

export function calculateAge(dobString: string): string {
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

export function sanitizeNumeric(value: any): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[^\d]/g, "");
}

export function sanitizeDecimal(value: any, allowNegative = false): string {
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

export function sanitizePhone(value: any): string {
  if (value === null || value === undefined) return "";
  const str = String(value).trim();
  const hasPlus = str.startsWith("+");
  const digits = str.replace(/[^\d]/g, "");
  const result = hasPlus ? `+${digits}` : digits;
  return result.slice(0, 14);
}

export function formatCurrency(value: any, currencySymbol = "৳"): string {
  if (value === "" || value === null || value === undefined) return "";
  const num = parseFloat(value);
  if (isNaN(num)) return String(value);
  const parts = num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${currencySymbol} ${parts}`;
}

export const INPUT_TYPE_CONFIGS: Record<string, any> = {
  text: {
    inputMode: "text",
    autoSanitize: null,
    maxLength: undefined,
  },
  number: {
    inputMode: "numeric",
    autoSanitize: (val: any, { allowDecimals, allowNegative }: any = {}) =>
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
    autoSanitize: (val: any) => String(val || "").trim(),
    validate: validateEmail,
    defaultPlaceholder: "name@example.com",
    errorMessage: "Please enter a valid email address.",
  },
  url: {
    inputMode: "url",
    autoSanitize: (val: any) => String(val || "").trim(),
    validate: validateURL,
    defaultPlaceholder: "https://example.com",
    errorMessage: "Please enter a valid web URL.",
  },
  currency: {
    inputMode: "decimal",
    autoSanitize: (val: any) => sanitizeDecimal(val, false),
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
