import { auth as authStore } from "../utils/localStore";
import { fetchWithAuth } from "../utils/authService";
import { API_BASE_URL } from "../config/api";

const fetchApi = async (path, options = {}) => {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const token = (typeof authStore.getAccessToken === "function" ? authStore.getAccessToken() : typeof authStore.getToken === "function" ? authStore.getToken() : "") || "";

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const reqOptions = { ...options, headers };
  const targetUrl = API_BASE_URL ? `${API_BASE_URL}${cleanPath}` : cleanPath;

  try {
    const res = await fetch(targetUrl, reqOptions);
    return res;
  } catch (err) {
    console.warn(`[reportsApi] Fetch to ${targetUrl} failed:`, err);
    throw new Error("Network connection error.");
  }
};

/**
 * Format local report form state into nested Django REST API payload
 */
export const transformFormToApiPayload = (reportData) => {
  const studentId = reportData?.studentId || reportData?.student_id || (typeof reportData?.student === "number" || (typeof reportData?.student === "string" && !isNaN(Number(reportData.student))) ? Number(reportData.student) : null);
  let studentName = reportData?.studentName || reportData?.student_name || (typeof reportData?.student === 'string' && isNaN(Number(reportData.student)) ? reportData.student : "") || "N/A";
  if (/^\d+$/.test(String(studentName).trim()) && reportData?.student_details) {
    studentName = reportData.student_details.name_en || reportData.student_details.name || reportData.student_details.label || studentName;
  }
  const groupName = reportData?.groupName || reportData?.subject_course || "General Group";
  const selectedSession = reportData?.selectedSession || reportData?.session_name || reportData?.session || "Subah";
  const selectedDate = reportData?.selectedDate || reportData?.report_date || reportData?.date;
  const juzPageData = reportData?.juzPageData || reportData?.juz_and_pages || [];
  const mistakeData = reportData?.mistakeData || reportData?.mistakes || [];
  const stuckData = reportData?.stuckData || reportData?.stucks || [];
  const comment = reportData?.comment || "";
  let status = "Completed";
  const rawStatus = String(reportData?.status || reportData?.overall_status || "").trim().toLowerCase();
  if (rawStatus === "unprepared") {
    status = "Unprepared";
  } else if (rawStatus === "absent") {
    status = "Absent";
  } else {
    status = "Completed";
  }
  const score = reportData?.score !== undefined ? reportData.score : 100;

  const isBookMode = Boolean(
    reportData?.progress_mode === "BOOK" ||
    reportData?.mode === "BOOK" ||
    reportData?.book_title ||
    reportData?.curriculum_book_name ||
    reportData?.lesson_title
  );

  // 1. Transform Juz Page Data into `portions` array (or preserve pre-existing valid portions)
  const portions = [];
  if (Array.isArray(reportData?.portions) && reportData.portions.length > 0) {
    portions.push(...reportData.portions);
  } else if (Array.isArray(juzPageData) && juzPageData.length > 0) {
    juzPageData.forEach((row) => {
      const rawJuz = row.juz !== undefined && row.juz !== null ? String(row.juz).trim() : "";
      const juzNum = rawJuz && !isNaN(parseInt(rawJuz, 10)) ? parseInt(rawJuz, 10) : (isBookMode ? null : 1);

      (row.ranges || []).forEach((r) => {
        const sPage = parseInt(r.start || r.page_start, 10);
        const ePage = parseInt(r.end || r.page_end || r.start || r.page_start, 10);
        if (!isNaN(sPage) && sPage > 0) {
          portions.push({
            start_juz: juzNum,
            start_page: sPage,
            start_ayah: 1,
            end_juz: juzNum,
            end_page: isNaN(ePage) ? sPage : ePage,
            end_ayah: 30,
            juz: juzNum,
            ranges: [{ start: sPage, end: isNaN(ePage) ? sPage : ePage }],
          });
        }
      });
    });
  }

  // 2. Transform Mistake & Stuck data into `error_details` array (or preserve pre-existing valid errors)
  const error_details = [];
  if (Array.isArray(reportData?.error_details) && reportData.error_details.length > 0) {
    error_details.push(...reportData.error_details);
  } else {
    // Mistakes
    mistakeData.forEach((row) => {
      if (!row.page || String(row.page).trim() === "") return;
      const pNum = parseInt(row.page, 10);
      const rawJuz = row.juz !== undefined && row.juz !== null ? String(row.juz).trim() : "";
      const jNum = rawJuz && !isNaN(parseInt(rawJuz, 10)) ? parseInt(rawJuz, 10) : null;

      (row.ayahs || []).forEach((a) => {
        const aVal = typeof a === "object" ? parseInt(a.value || a.ayah, 10) : parseInt(a, 10);
        if (!isNaN(aVal)) {
          error_details.push({
            type: "Mistake",
            juz: jNum,
            page: pNum,
            ayah: aVal,
          });
        }
      });
    });

    // Stucks
    stuckData.forEach((row) => {
      if (!row.page || String(row.page).trim() === "") return;
      const pNum = parseInt(row.page, 10);
      const rawJuz = row.juz !== undefined && row.juz !== null ? String(row.juz).trim() : "";
      const jNum = rawJuz && !isNaN(parseInt(rawJuz, 10)) ? parseInt(rawJuz, 10) : null;

      (row.ayahs || []).forEach((a) => {
        const aVal = typeof a === "object" ? parseInt(a.value || a.ayah, 10) : parseInt(a, 10);
        if (!isNaN(aVal)) {
          error_details.push({
            type: "Stuck",
            juz: jNum,
            page: pNum,
            ayah: aVal,
          });
        }
      });
    });
  }

  // Calculate total pages recited
  const total_page = portions.reduce((sum, p) => sum + (p.end_page - p.start_page + 1), 0) || Number(reportData?.total_page) || 1;

  const payload = {
    student_name: studentName || "N/A",
    session_name: selectedSession || "Subah",
    total_page,
    score: typeof score === "number" ? score : 100,
    status: status || "Completed",
    comment: comment || "",
    report_date: selectedDate || new Date().toISOString(),
    portions,
    error_details,
    juz_and_pages: juzPageData,
    progress_mode: isBookMode ? "BOOK" : (reportData?.progress_mode || "QURAN"),
    mode: isBookMode ? "BOOK" : (reportData?.mode || "QURAN"),
    book_title: reportData?.book_title || reportData?.curriculum_book_name || reportData?.book_name || "",
    curriculum_book_name: reportData?.curriculum_book_name || reportData?.book_title || "",
    book_name: reportData?.book_name || reportData?.book_title || "",
    lesson_title: reportData?.lesson_title || reportData?.lesson_covered || "",
    lesson_covered: reportData?.lesson_covered || reportData?.lesson_title || "",
  };

  // Only pass numeric student foreign key ID; string IDs like 'stu_...' would cause DRF type validation error
  const isNumericStudentId =
    studentId !== null &&
    studentId !== undefined &&
    !isNaN(Number(studentId)) &&
    !String(studentId).startsWith("stu_") &&
    !String(studentId).startsWith("local_");

  if (isNumericStudentId) {
    payload.student = Number(studentId);
  }

  if (reportData.report_unique_id) {
    payload.report_unique_id = reportData.report_unique_id;
  }

  return payload;
};

export const createReport = async (reportData) => {
  const payload = transformFormToApiPayload(reportData);

  try {
    let res = await fetchWithAuth("/reports/", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (res && !res.ok && res.status === 404) {
      res = await fetchWithAuth("/api/v1/reports/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }

    if (res && !res.ok && res.status === 404) {
      res = await fetchWithAuth("/api/reports/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }

    let data;
    try {
      data = await res.json();
    } catch {
      data = { detail: `Server returned HTTP status ${res?.status}` };
    }

    if (res && (res.ok || res.status === 201)) {
      return { success: true, data };
    }
    return {
      success: false,
      status: res?.status,
      errors: data && Object.keys(data).length > 0 ? data : { detail: `Server error (${res?.status})` },
    };
  } catch (error) {
    console.warn("[reportsApi] Backend server unreachable:", error.message);
    return {
      success: false,
      isOffline: true,
      errors: { detail: "Backend server connection unavailable. Saved locally." },
    };
  }
};

/**
 * Update an existing report on Django Backend via PATCH
 */
export const updateReport = async (reportId, reportData) => {
  const payload = transformFormToApiPayload(reportData);
  const cleanId = String(reportId).trim();

  try {
    let res = await fetchWithAuth(`/reports/${cleanId}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });

    if (res && !res.ok && res.status === 404) {
      res = await fetchWithAuth(`/api/v1/reports/${cleanId}/`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    }

    if (res && !res.ok && res.status === 404) {
      res = await fetchWithAuth(`/api/reports/${cleanId}/`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    }

    let data;
    try {
      data = await res.json();
    } catch {
      data = { detail: `Server returned HTTP status ${res?.status}` };
    }

    if (res && (res.ok || res.status === 200)) {
      return { success: true, data };
    }
    return {
      success: false,
      status: res?.status,
      errors: data && Object.keys(data).length > 0 ? data : { detail: `Server error (${res?.status})` },
    };
  } catch (error) {
    console.warn(`[reportsApi] Failed to update report ${cleanId}:`, error.message);
    return {
      success: false,
      isOffline: true,
      errors: { detail: "Backend server connection unavailable. Saved locally." },
    };
  }
};

/**
 * 2. Fetch Reports History List (GET /api/reports/)
 */
export const fetchReports = async () => {
  try {
    let res = await fetchApi("/reports/");
    if (!res.ok) {
      res = await fetchApi("/api/v1/reports/");
    }
    if (!res.ok) {
      res = await fetchApi("/api/reports/");
    }
    if (!res.ok) {
      res = await fetchApi("/api/v1/hifz/reports/");
    }
    const data = await res.json();
    return res.ok ? { success: true, data } : { success: false, data: [] };
  } catch (error) {
    console.error("[reportsApi] Failed to fetch reports:", error);
    return { success: false, data: [] };
  }
};

/**
 * 3. Public Verification Endpoint (GET /api/v1/hifz/verify-report/:reportId/)
 * No JWT required.
 */
export const verifyReport = async (reportId) => {
  const cleanId = String(reportId).trim();
  const options = {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  };

  try {
    let res = await fetchApi(`/hifz/verify-report/${cleanId}/`, options);
    if (!res.ok && res.status === 404) {
      res = await fetchApi(`/api/v1/hifz/verify-report/${cleanId}/`, options);
    }

    const data = await res.json();
    return {
      statusCode: res.status,
      ok: res.ok,
      data,
    };
  } catch (error) {
    console.error("[reportsApi] Report verification failed:", error);
    return {
      statusCode: 500,
      ok: false,
      data: {
        status: "error",
        verification_status: "UNVERIFIED",
        is_valid: false,
        message: "Server connection failed while verifying report.",
      },
    };
  }
};
