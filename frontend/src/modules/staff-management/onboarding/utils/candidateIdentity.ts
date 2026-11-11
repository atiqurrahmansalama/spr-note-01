/**
 * Candidate & Staff onboarding identity helpers.
 * Single pure module used by PublicStaffOnboardingView, useStaffOnboardingForm (Quick & Full Wizard),
 * and unit tests — zero DOM or framework runtime dependencies.
 */

export interface CandidateInitialData {
  user_id?: string | number;
  name: string;
  name_en: string;
  email: string;
  phone_number: string;
  photo_url: string;
}

/**
 * Strips auto-generated placeholder phone prefixes (e.g. Google OAuth `g_...` or `user_...`)
 * so onboarding candidates are prompted to provide their authentic mobile number.
 */
export function sanitizeOnboardingPhone(rawPhone?: string | null): string {
  if (!rawPhone || typeof rawPhone !== "string") return "";
  const trimmed = rawPhone.trim();
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("g_") || lower.startsWith("user_")) {
    return "";
  }
  return trimmed;
}

/**
 * Splits a full display name into first_name and last_name expected by Django RegisterSerializer.
 */
export function splitCandidateFullName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const normalized = (fullName || "").trim().replace(/\s+/g, " ");
  if (!normalized) {
    return { firstName: "Faculty", lastName: "Candidate" };
  }
  const parts = normalized.split(" ");
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

/**
 * Maps an authenticated user object (from AuthContext or localStore) into
 * clean initialData props for StaffOnboardingWizard.
 */
export function buildCandidateInitialData(user: any): CandidateInitialData | undefined {
  if (!user || typeof user !== "object") return undefined;

  const composedName = (
    user.name ||
    [user.first_name, user.last_name].filter(Boolean).join(" ") ||
    ""
  ).trim();

  return {
    user_id: user.id ?? user.user_id,
    name: composedName,
    name_en: composedName,
    email: typeof user.email === "string" ? user.email.trim() : "",
    phone_number: sanitizeOnboardingPhone(user.phone_number),
    photo_url:
      typeof user.avatar_url === "string"
        ? user.avatar_url
        : typeof user.photo_url === "string"
          ? user.photo_url
          : "",
  };
}

/**
 * Builds canonical onboarding form payload merging optional draft values and token metadata.
 * Reused by both Quick Staff Onboarding and Full Onboarding Wizard to guarantee draft continuity.
 */
export function buildInitialStaffPayload(
  initialData: Record<string, any> = {},
  tokenMeta: any = null
) {
  return {
    token: tokenMeta?.token || initialData.token || "",
    user_id: initialData.user_id || "",
    name: initialData.name || "",
    name_en: initialData.name_en || initialData.name || "",
    bangla_name: initialData.bangla_name || "",
    email: initialData.email || "",
    phone_number: initialData.phone_number || "",
    gender: initialData.gender || "MALE",
    dob: initialData.dob || "",
    nid_no: initialData.nid_no || "",
    blood_group: initialData.blood_group || "",
    emergency_contact: initialData.emergency_contact || "",
    photo_url: initialData.photo_url || "",

    // Role & Hierarchy
    staff_type: tokenMeta?.staff_type || initialData.staff_type || "TEACHING",
    designation: tokenMeta?.designation || initialData.designation || "",
    rank_order: tokenMeta?.rank_order || initialData.rank_order || 99,
    department: initialData.department || "",
    employment_status: initialData.employment_status || "PERMANENT",
    joining_date: initialData.joining_date || new Date().toISOString().split("T")[0],

    // Academic & Qualifications
    highest_degree: initialData.highest_degree || "",
    specialization: initialData.specialization || "",
    experience_details: initialData.experience_details || "",
    max_daily_periods: initialData.max_daily_periods || 4,

    // Documents
    cv_url: initialData.cv_url || "",
    cv_name: initialData.cv_name || "",
    cv_size: initialData.cv_size || "",
    documents: initialData.documents || initialData.certificates || [],

    // Address
    address: initialData.address || "",
    division: initialData.division || "",
    district: initialData.district || "",
    upazila_thana: initialData.upazila_thana || "",
    postal_code: initialData.postal_code || "",
    permanent_address: initialData.permanent_address || "",
    permanent_division: initialData.permanent_division || "",
    permanent_district: initialData.permanent_district || "",
    permanent_upazila_thana: initialData.permanent_upazila_thana || "",

    // Payroll & Banking
    salary_type: initialData.salary_type || "MONTHLY_FIXED",
    base_salary: initialData.base_salary || 0,
    medical_allowance: initialData.medical_allowance || 0,
    house_rent: initialData.house_rent || 0,
    bank_name: initialData.bank_name || "",
    bank_account_no: initialData.bank_account_no || "",
    mobile_banking_no: initialData.mobile_banking_no || "",
    shift_type: initialData.shift_type || "MORNING",
  };
}
