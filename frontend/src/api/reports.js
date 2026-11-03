import { auth as authStore } from "../utils/localStore";
import { fetchWithAuth } from "../utils/authService";
import { API_BASE_URL } from "../config/api";
import {
  getTotalPages,
  getMistakesCount,
  getStucksCount,
} from "../modules/learning/daily-classroom/progress-management/progress-reports/utils/studentMetaResolver";

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
  const groupName = reportData?.groupName || reportData?.subject_course || "";
  const selectedSession = reportData?.selectedSession || reportData?.session_name || reportData?.session || "Subah";
  const selectedDate = reportData?.selectedDate || reportData?.report_date || reportData?.date;
  const juzPageData = reportData?.juzPageData || reportData?.bookPageData || reportData?.juz_and_pages || [];
  const mistakeData = reportData?.mistakeData || reportData?.bookMistakeData || reportData?.mistakes || [];
  const stuckData = reportData?.stuckData || reportData?.bookStuckData || reportData?.stucks || [];
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

  // 1. Transform Juz Page Data into `portions` array
  const portions = [];
  if (Array.isArray(reportData?.portions) && reportData.portions.length > 0) {
    reportData.portions.forEach((p) => {
      const sJuz = p.start_juz !== null && p.start_juz !== undefined && !isNaN(parseInt(p.start_juz, 10))
        ? parseInt(p.start_juz, 10)
        : (p.juz !== null && p.juz !== undefined && !isNaN(parseInt(p.juz, 10)) ? parseInt(p.juz, 10) : null);
      const eJuz = p.end_juz !== null && p.end_juz !== undefined && !isNaN(parseInt(p.end_juz, 10))
        ? parseInt(p.end_juz, 10)
        : sJuz;
      const sPage = p.start_page !== null && p.start_page !== undefined && !isNaN(parseInt(p.start_page, 10))
        ? parseInt(p.start_page, 10)
        : 1;
      const ePage = p.end_page !== null && p.end_page !== undefined && !isNaN(parseInt(p.end_page, 10))
        ? parseInt(p.end_page, 10)
        : sPage;

      portions.push({
        start_juz: sJuz,
        end_juz: eJuz,
        start_page: sPage,
        end_page: ePage,
        start_ayah: p.start_ayah || 1,
        end_ayah: p.end_ayah || 30,
        start_surah_number: p.start_surah_number || undefined,
        end_surah_number: p.end_surah_number || undefined,
        ranges: p.ranges,
      });
    });
  } else if (Array.isArray(juzPageData) && juzPageData.length > 0) {
    juzPageData.forEach((row) => {
      const rawJuz = row.juz !== undefined && row.juz !== null ? String(row.juz).trim() : "";
      const juzNum = rawJuz && !isNaN(parseInt(rawJuz, 10)) ? parseInt(rawJuz, 10) : null;

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
            ranges: [{ start: sPage, end: isNaN(ePage) ? sPage : ePage }],
          });
        }
      });
    });
  }

  // 2. Transform Mistake & Stuck data into strictly normalized `error_details` array
  const error_details = [];
  const sessionJuz = portions[0]?.start_juz || null;

  const sanitizeAyahInt = (val) => {
    if (val === null || val === undefined) return 1;
    if (typeof val === "number" && !isNaN(val) && val > 0) return Math.floor(val);
    const cleaned = String(val).replace(/\D+/g, "");
    const parsed = parseInt(cleaned, 10);
    return !isNaN(parsed) && parsed > 0 ? parsed : 1;
  };

  const processErrorItem = (item, defaultType = "Mistake") => {
    if (!item) return;
    const type = item.type === "Stuck" ? "Stuck" : (item.type || defaultType);
    const rawJuz = item.juz !== undefined && item.juz !== null ? String(item.juz).trim() : "";
    const juz = rawJuz && !isNaN(parseInt(rawJuz, 10))
      ? parseInt(rawJuz, 10)
      : (isBookMode ? null : sessionJuz);
    const rawPage = item.page !== undefined && item.page !== null ? String(item.page).trim() : "";
    const page = rawPage && !isNaN(parseInt(rawPage, 10)) ? parseInt(rawPage, 10) : 1;
    const surah = item.surah_number && !isNaN(parseInt(item.surah_number, 10)) ? parseInt(item.surah_number, 10) : undefined;

    let foundAyah = false;
    if (Array.isArray(item.ayahs) && item.ayahs.length > 0) {
      item.ayahs.forEach((a) => {
        const rawVal = typeof a === "object" ? (a.value ?? a.ayah) : a;
        if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== "") {
          const aNum = sanitizeAyahInt(rawVal);
          if (aNum > 0) {
            foundAyah = true;
            error_details.push({
              type,
              juz,
              page,
              ayah: aNum,
              ...(surah ? { surah_number: surah } : {}),
            });
          }
        }
      });
    }

    if (!foundAyah) {
      const rawAyahStr = String(item.ayah ?? item.line ?? "").trim();
      const nums = rawAyahStr.match(/\d+/g);
      if (nums && nums.length > 0) {
        nums.forEach((n) => {
          const aNum = parseInt(n, 10);
          if (!isNaN(aNum) && aNum > 0) {
            error_details.push({
              type,
              juz,
              page,
              ayah: aNum,
              ...(surah ? { surah_number: surah } : {}),
            });
          }
        });
      } else {
        error_details.push({
          type,
          juz,
          page,
          ayah: 1,
          ...(surah ? { surah_number: surah } : {}),
        });
      }
    }
  };

  if (Array.isArray(reportData?.error_details) && reportData.error_details.length > 0) {
    reportData.error_details.forEach((err) => processErrorItem(err, err.type || "Mistake"));
  } else {
    // Mistakes
    mistakeData.forEach((row) => {
      if (!row.page || String(row.page).trim() === "") return;
      processErrorItem(row, "Mistake");
    });

    // Stucks
    stuckData.forEach((row) => {
      if (!row.page || String(row.page).trim() === "") return;
      processErrorItem(row, "Stuck");
    });
  }

  // Authoritative Single Source of Truth calculation (Rule 10 Compliance)
  const total_page = getTotalPages({ portions, juz_and_pages: juzPageData, total_page: reportData?.total_page }) || 1;
  const total_mistake = getMistakesCount({ error_details, mistakes: mistakeData });
  const total_stuck = getStucksCount({ error_details, stucks: stuckData });

  const payload = {
    student_name: studentName || "N/A",
    session_name: selectedSession || "Subah",
    total_page,
    score: typeof score === "number" ? score : 100,
    status: status || "Completed",
    comment: comment || "",
    date: selectedDate || new Date().toISOString(),
    report_date: selectedDate || new Date().toISOString(),
    portions,
    error_details,
    juz_and_pages: juzPageData,
    progress_mode: isBookMode ? "BOOK" : (reportData?.progress_mode || "QURAN"),
    mode: isBookMode ? "BOOK" : (reportData?.mode || "QURAN"),
    book_title: (reportData?.book_title || reportData?.curriculum_book_name || reportData?.book_name || reportData?.bookTitle || reportData?.book || "").trim(),
    curriculum_book_name: (reportData?.curriculum_book_name || reportData?.book_title || reportData?.book_name || reportData?.bookTitle || reportData?.book || "").trim(),
    book_name: (reportData?.book_name || reportData?.book_title || reportData?.curriculum_book_name || reportData?.bookTitle || reportData?.book || "").trim(),
    lesson_title: (reportData?.lesson_title || reportData?.lesson_covered || reportData?.lessonTitle || reportData?.lesson || "").trim(),
    lesson_covered: (reportData?.lesson_covered || reportData?.lesson_title || reportData?.lessonTitle || reportData?.lesson || "").trim(),
    mistakes: mistakeData,
    stucks: stuckData,
    mistake_details: error_details.filter((e) => e.type === "Mistake"),
    stuck_details: error_details.filter((e) => e.type === "Stuck"),
    total_mistake,
    total_stuck,
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
