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

  // Adjust day differences
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

/**
 * Validates Bangladesh mobile phone numbers.
 * Expects exactly 11 digits starting with 01 and a valid operator (3, 4, 5, 6, 7, 8, 9).
 */
export function validateBDPhone(phone) {
  if (!phone) return false;
  const cleaned = phone.replace(/[^\d]/g, "");
  return /^01[3-9]\d{8}$/.test(cleaned);
}

/**
 * Validates 17-digit Birth Registration Number.
 */
export function validateBRN(brn) {
  if (!brn) return false;
  const cleaned = brn.replace(/[^\d]/g, "");
  return cleaned.length === 17;
}

/**
 * Validates National ID Number (NID).
 * Accepts 10, 13, or 17 digits.
 */
export function validateNID(nid) {
  if (!nid) return false;
  const cleaned = nid.replace(/[^\d]/g, "");
  return [10, 13, 17].includes(cleaned.length);
}
