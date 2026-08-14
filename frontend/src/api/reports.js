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
    if (res.ok || res.status < 500) return res;
  } catch (err) {
    console.warn(`[reportsApi] Fetch to ${targetUrl} failed:`, err);
  }

  throw new Error("Server is offline or unreachable.");
};

/**
 * Format local report form state into nested Django REST API payload
 */
export const transformFormToApiPayload = (reportData) => {
  const {
    studentId,
    studentName,
    selectedSession,
    selectedDate,
    juzPageData = [],
    mistakeData = [],
    stuckData = [],
    comment = "",
    status = "Completed",
    score = 100,
  } = reportData || {};

  // 1. Transform Juz Page Data into `portions` array
  const portions = [];
  juzPageData.forEach((row) => {
    if (!row.juz || String(row.juz).trim() === "") return;
    const juzNum = parseInt(row.juz, 10) || 1;

    (row.ranges || []).forEach((r) => {
      const sPage = parseInt(r.start, 10);
      const ePage = parseInt(r.end || r.start, 10);
      if (!isNaN(sPage)) {
        portions.push({
          start_juz: juzNum,
          start_page: sPage,
          start_ayah: 1,
          end_juz: juzNum,
          end_page: isNaN(ePage) ? sPage : ePage,
          end_ayah: 30,
        });
      }
    });
  });

  // 2. Transform Mistake & Stuck data into `error_details` array
  const error_details = [];

  // Mistakes
  mistakeData.forEach((row) => {
    if (!row.page || String(row.page).trim() === "") return;
    const pNum = parseInt(row.page, 10);
    const jNum = parseInt(row.juz, 10) || 1;

    (row.ayahs || []).forEach((a) => {
      const aVal = parseInt(a.value, 10);
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
    const jNum = parseInt(row.juz, 10) || 1;

    (row.ayahs || []).forEach((a) => {
      const aVal = parseInt(a.value, 10);
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

  // Calculate total pages recited
  const total_page = portions.reduce((sum, p) => sum + (p.end_page - p.start_page + 1), 0) || 1;

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
  };

  if (studentId) {
    payload.student = studentId;
  }

  return payload;
};

/**
 * 1. Create Report API Integration (POST /api/reports/)
 */
export const createReport = async (reportData) => {
  const payload = transformFormToApiPayload(reportData);

  try {
    let res = await fetchWithAuth("/api/v1/reports/", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (res && !res.ok && res.status === 404) {
      res = await fetchWithAuth("/api/reports/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }

    if (res && !res.ok && res.status === 404) {
      res = await fetchWithAuth("/reports/", {
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
 * 2. Fetch Reports History List (GET /api/reports/)
 */
export const fetchReports = async () => {
  try {
    let res = await fetchApi("/api/v1/reports/");
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
    let res = await fetchApi(`/api/v1/hifz/verify-report/${cleanId}/`, options);
    if (!res.ok && res.status === 404) {
      res = await fetchApi(`/hifz/verify-report/${cleanId}/`, options);
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
