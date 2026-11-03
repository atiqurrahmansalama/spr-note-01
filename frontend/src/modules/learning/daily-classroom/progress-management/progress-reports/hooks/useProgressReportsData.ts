import { useState, useEffect, useRef, useCallback } from "react";
import { fetchWithAuth } from "@/utils/authService";
import { isOnline } from "@/utils/localStore";
import { triggerCloudSync, isReportUnsynced, getLocalReports, deleteReportFromSync } from "@/utils/syncEngine";
import { formatDate } from "@/utils/reportGenerator";
import { dailyProgressRepository, offlineDB } from "@/offline";
import { auth as authStore } from "@/utils/localStore";
import { ReportItem, SyncErrorItem } from "../types";
import { getMistakesCount, getStucksCount, getTotalPages } from "../utils/studentMetaResolver";

export interface UseProgressReportsDataOptions {
  activeTenantId?: string | null;
  academicData: any;
  showToast: (msg: string, type?: "info" | "success" | "warning" | "error") => void;
}

/**
 * Canonical Deduplication Utility for Progress Reports
 * Guarantees zero duplicate entities across id, server_id, and report_unique_id aliases.
 */
export function deduplicateReports<T extends { id?: any; server_id?: any; report_unique_id?: any }>(reports: T[]): T[] {
  if (!Array.isArray(reports) || reports.length === 0) return [];
  const result: T[] = [];
  const seenKeys = new Set<string>();

  for (const r of reports) {
    if (!r) continue;
    const uniq = r.report_unique_id ? String(r.report_unique_id).trim().toLowerCase() : "";
    const srv = r.server_id !== undefined && r.server_id !== null ? String(r.server_id).trim().toLowerCase() : "";
    const idStr = r.id !== undefined && r.id !== null ? String(r.id).trim().toLowerCase() : "";

    const isSeen =
      (uniq && seenKeys.has(uniq)) ||
      (srv && (seenKeys.has(`srv_${srv}`) || seenKeys.has(srv))) ||
      (idStr && (seenKeys.has(`id_${idStr}`) || seenKeys.has(idStr)));

    if (!isSeen) {
      if (uniq) seenKeys.add(uniq);
      if (srv) {
        seenKeys.add(`srv_${srv}`);
        seenKeys.add(srv);
      }
      if (idStr) {
        seenKeys.add(`id_${idStr}`);
        seenKeys.add(idStr);
      }
      result.push(r);
    }
  }

  return result;
}

export function useProgressReportsData({
  activeTenantId,
  academicData,
  showToast,
}: UseProgressReportsDataOptions) {
  const [reportsList, setReportsList] = useState<ReportItem[]>([]);
  const [reportToDelete, setReportToDelete] = useState<ReportItem | ReportItem[] | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [offline, setOffline] = useState(!isOnline());
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncErrors, setSyncErrors] = useState<SyncErrorItem[] | null>(null);

  const recentlyDeletedIdsRef = useRef<Set<string>>(new Set());
  const reportsListRef = useRef<ReportItem[]>([]);

  useEffect(() => {
    reportsListRef.current = reportsList;
  }, [reportsList]);

  // Normalize a single raw report object into strict typed contract
  const normalizeReport = useCallback(
    (rep: any): ReportItem => {
      // 1. Report Date (Recitation Date)
      const rawReportDate = rep.report_date || rep.date || rep.selectedDate || "";
      let formattedReportDate = "—";
      let isoDateOnly = "";

      if (rawReportDate) {
        if (typeof rawReportDate === "string") {
          const cleanStr = rawReportDate.replace(" ", "T");
          isoDateOnly = cleanStr.split("T")[0];
        }
        try {
          const dateToParse =
            typeof rawReportDate === "string" && rawReportDate.includes(" ")
              ? rawReportDate.replace(" ", "T")
              : rawReportDate;
          const d = new Date(dateToParse);
          if (!isNaN(d.getTime())) {
            formattedReportDate = formatDate(d);
            if (!isoDateOnly) {
              isoDateOnly = d.toISOString().split("T")[0];
            }
          } else {
            formattedReportDate = formatDate(rawReportDate);
          }
        } catch {
          formattedReportDate = String(rawReportDate);
        }
      }

      // 2. Generated Date / Created At
      const rawGenerateDate =
        rep.generate_date ||
        rep.created_at ||
        rep.client_created_at ||
        rep.client_updated_at ||
        rep.date_time ||
        rawReportDate;
      let formattedGenerateDate = "—";
      let formattedGenerateTime =
        (typeof rep.formattedTime === "string" && rep.formattedTime.trim()
          ? rep.formattedTime.trim()
          : "") ||
        (typeof rep.time === "string" && rep.time.trim() ? rep.time.trim() : "");

      if (rawGenerateDate) {
        try {
          let gd = new Date(rawGenerateDate);
          if (isNaN(gd.getTime()) && typeof rawGenerateDate === "string") {
            gd = new Date(rawGenerateDate.replace(" ", "T"));
          }
          if (!isNaN(gd.getTime())) {
            formattedGenerateDate = formatDate(gd);
            if (!formattedGenerateTime) {
              formattedGenerateTime = gd.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              });
            }
          } else {
            formattedGenerateDate = String(rawGenerateDate).split(" ")[0];
          }
        } catch {
          formattedGenerateDate = String(rawGenerateDate);
        }
      }

      if (!formattedGenerateTime) {
        const sourceStr = String(rawGenerateDate || rawReportDate || rep.date || "");
        const timeMatch = sourceStr.match(/(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)/i);
        if (timeMatch) {
          formattedGenerateTime = timeMatch[1];
        }
      }

      // 3. Calculated Total Pages (Authoritative Single Source of Truth)
      const totalPagesValue = getTotalPages(rep);

      const hasEditedFlag = Boolean(rep.is_edited);
      const editedAtTime = hasEditedFlag ? (rep.edited_at || rep.edit_time || null) : null;

      // Mistakes & Stucks Count (Authoritative Single Source of Truth)
      const mistakesCount = getMistakesCount(rep);
      const stucksCount = getStucksCount(rep);

      // 4. Academic Metadata & Hierarchy extraction
      const rawStudentId =
        typeof rep.student === "object"
          ? rep.student?.id || rep.student?.uniq_id
          : rep.student || rep.student_id || rep.studentId;
      const rawStudentName = (
        rep.student_name ||
        rep.studentName ||
        rep.student_details?.name_en ||
        rep.student_details?.name ||
        (typeof rep.student === "object" ? rep.student?.name || rep.student?.name_en : null) ||
        (typeof rep.student === "string" && isNaN(Number(rep.student)) ? rep.student : null) ||
        ""
      ).trim();

      const matchedStudent = (academicData?.students || []).find((s: any) => {
        if (rawStudentId && !isNaN(Number(rawStudentId)) && Number(s.id) === Number(rawStudentId)) {
          return true;
        }
        if (
          rawStudentId &&
          (String(s.id) === String(rawStudentId) ||
            String(s.uniq_id) === String(rawStudentId) ||
            String(s.unique_id) === String(rawStudentId))
        ) {
          return true;
        }
        if (rawStudentName) {
          const sNameEn = (s.name_en || "").trim().toLowerCase();
          const sName = (s.name || "").trim().toLowerCase();
          const sBn = (s.bangla_name || "").trim().toLowerCase();
          const sLabel = (s.label || "").trim().toLowerCase();
          const target = rawStudentName.toLowerCase();
          return sNameEn === target || sName === target || sBn === target || sLabel === target;
        }
        return false;
      });

      const studentDetails =
        rep.student_details ||
        matchedStudent ||
        (typeof rep.student === "object" ? rep.student : null);

      const isNumericName = Boolean(rawStudentName && /^\d+$/.test(rawStudentName.trim()));
      const realStudentName =
        studentDetails?.name_en ||
        studentDetails?.name ||
        matchedStudent?.name_en ||
        matchedStudent?.name;

      const resolvedStudentName =
        isNumericName && realStudentName
          ? realStudentName
          : rawStudentName || realStudentName || "Unnamed Student";

      const studentRollNumber = String(
        studentDetails?.roll_number ??
          studentDetails?.roll ??
          rep.rollNumber ??
          rep.roll_number ??
          rep.roll ??
          matchedStudent?.roll_number ??
          matchedStudent?.roll ??
          ""
      ).trim();

      const studentUniqId = String(
        studentDetails?.uniq_id ||
          studentDetails?.unique_id ||
          studentDetails?.student_id_card_number ||
          rep.uniqId ||
          rep.unique_id ||
          rep.student_uniq_id ||
          matchedStudent?.uniq_id ||
          matchedStudent?.unique_id ||
          matchedStudent?.student_id_card_number ||
          (rep.studentId && !String(rep.studentId).startsWith("stu_") ? String(rep.studentId) : "") ||
          ""
      ).trim();

      let studentClassId = String(
        studentDetails?.student_class?.id ||
          studentDetails?.student_class ||
          studentDetails?.class_id ||
          rep.student_class_id ||
          rep.class_id ||
          rep.classId ||
          matchedStudent?.student_class?.id ||
          matchedStudent?.student_class ||
          matchedStudent?.class_id ||
          ""
      );
      let studentClassName = String(
        studentDetails?.student_class_name ||
          studentDetails?.class_name ||
          rep.student_class_name ||
          rep.className ||
          matchedStudent?.student_class_name ||
          matchedStudent?.class_name ||
          ""
      );

      const foundClass = (academicData?.classes || []).find(
        (c: any) =>
          (studentClassId && String(c.id) === String(studentClassId)) ||
          (studentClassName && c.name && c.name.toLowerCase() === studentClassName.toLowerCase())
      );
      if (foundClass) {
        if (!studentClassName && foundClass.name) studentClassName = foundClass.name;
        if (!studentClassId && foundClass.id) studentClassId = String(foundClass.id);
      }

      let studentSectionId = String(
        studentDetails?.section?.id ||
          studentDetails?.section ||
          studentDetails?.student_section_id ||
          studentDetails?.section_id ||
          rep.student_section_id ||
          rep.section_id ||
          rep.sectionId ||
          matchedStudent?.section?.id ||
          matchedStudent?.section ||
          matchedStudent?.student_section ||
          ""
      );
      let studentSectionName = String(
        studentDetails?.student_section_name ||
          studentDetails?.section_name ||
          rep.student_section_name ||
          rep.sectionName ||
          matchedStudent?.student_section_name ||
          matchedStudent?.section_name ||
          ""
      );

      const foundSection = (academicData?.sections || []).find(
        (s: any) =>
          (studentSectionId && String(s.id) === String(studentSectionId)) ||
          (studentSectionName &&
            (s.section_name || s.name) &&
            (s.section_name || s.name).toLowerCase() === studentSectionName.toLowerCase())
      );
      if (foundSection) {
        if (!studentSectionName)
          studentSectionName = foundSection.section_name || foundSection.name || "";
        if (!studentSectionId && foundSection.id) studentSectionId = String(foundSection.id);
      }

      let studentDepartmentId = String(
        studentDetails?.department?.id ||
          studentDetails?.department ||
          studentDetails?.department_id ||
          rep.department_id ||
          rep.departmentId ||
          matchedStudent?.department?.id ||
          matchedStudent?.department ||
          foundClass?.department?.id ||
          foundClass?.department_id ||
          (typeof foundClass?.department === "string" || typeof foundClass?.department === "number"
            ? foundClass.department
            : "") ||
          ""
      );

      let studentDepartmentCode = String(
        studentDetails?.department?.code ||
          studentDetails?.department_code ||
          studentDetails?.dept_code ||
          rep.department_code ||
          rep.departmentCode ||
          rep.dept_code ||
          matchedStudent?.department?.code ||
          matchedStudent?.department_code ||
          foundClass?.department?.code ||
          foundClass?.department_code ||
          ""
      );

      let studentDepartmentName = String(
        studentDetails?.department_name ||
          studentDetails?.department?.name ||
          rep.department_name ||
          rep.departmentName ||
          matchedStudent?.department_name ||
          matchedStudent?.department?.name ||
          foundClass?.department?.name ||
          foundClass?.department_name ||
          ""
      );

      let resolvedDeptCode = studentDepartmentCode;
      const foundDept = (academicData?.departments || []).find(
        (d: any) =>
          (studentDepartmentId && String(d.id) === String(studentDepartmentId)) ||
          (studentDepartmentName &&
            d.name &&
            d.name.toLowerCase() === studentDepartmentName.toLowerCase()) ||
          (studentDepartmentCode && d.code && d.code.toLowerCase() === studentDepartmentCode.toLowerCase())
      );
      if (foundDept) {
        if (!resolvedDeptCode && foundDept.code) resolvedDeptCode = foundDept.code;
        if (!studentDepartmentName && foundDept.name) studentDepartmentName = foundDept.name;
        if (!studentDepartmentId && foundDept.id) studentDepartmentId = String(foundDept.id);
      }

      if (!resolvedDeptCode && studentDepartmentName) {
        const words = studentDepartmentName.trim().split(/\s+/);
        resolvedDeptCode =
          words.length === 1
            ? words[0].slice(0, 4).toUpperCase()
            : words.map((w: string) => w.charAt(0)).join("").toUpperCase();
      }

      const groupName =
        rep.student_group ||
        rep.subject_course ||
        studentDetails?.group_name ||
        (typeof rep.student === "object" ? rep.student?.group_name || rep.student?.group : null) ||
        studentSectionName ||
        studentClassName ||
        "";

      const hasNumericId =
        (typeof rep.id === "number" && !isNaN(rep.id)) ||
        (typeof rep.id === "string" && /^\d+$/.test(rep.id.trim()) && !rep.id.includes("-"));
      const serverId = rep.server_id || (hasNumericId ? Number(rep.id) : undefined);
      const syncStatus = rep.sync_status || (hasNumericId ? "SYNCED" : "PENDING");

      // 5. Authoritative Teacher Resolution (Guaranteed to NEVER be empty or "—")
      let resolvedTeacherName = "";

      // 5a. Direct teacher_name string
      if (typeof rep.teacher_name === "string" && rep.teacher_name.trim() && rep.teacher_name.trim() !== "—") {
        resolvedTeacherName = rep.teacher_name.trim();
      }

      // 5b. Direct teacher string (if not numeric ID)
      if (!resolvedTeacherName && typeof rep.teacher === "string" && isNaN(Number(rep.teacher)) && rep.teacher.trim() && rep.teacher.trim() !== "—") {
        resolvedTeacherName = rep.teacher.trim();
      }

      // 5c. Object rep.teacher
      if (!resolvedTeacherName && typeof rep.teacher === "object" && rep.teacher) {
        resolvedTeacherName = rep.teacher.name || rep.teacher.name_en || rep.teacher.full_name || rep.teacher.user_name || "";
      }

      // 5d. Match by teacher_id / numeric teacher / created_by from academicData staff or teachers list
      const rawTeacherId =
        rep.teacher_id ||
        (typeof rep.teacher === "number" || (typeof rep.teacher === "string" && /^\d+$/.test(rep.teacher.trim()))
          ? Number(rep.teacher)
          : null);
      const rawCreatorId =
        typeof rep.created_by === "object"
          ? rep.created_by?.id || rep.created_by?.pk
          : (rep.created_by && !isNaN(Number(rep.created_by)) ? Number(rep.created_by) : null);

      const staffList = (academicData?.staff || academicData?.teachers || []) as any[];
      let matchedStaff = null;
      if (rawTeacherId) {
        matchedStaff = staffList.find(
          (s: any) =>
            String(s.id) === String(rawTeacherId) ||
            String(s.user) === String(rawTeacherId) ||
            String(s.user_id) === String(rawTeacherId) ||
            String(s.employee_id) === String(rawTeacherId)
        );
      }
      if (!matchedStaff && rawCreatorId) {
        matchedStaff = staffList.find(
          (s: any) =>
            String(s.id) === String(rawCreatorId) ||
            String(s.user) === String(rawCreatorId) ||
            String(s.user_id) === String(rawCreatorId)
        );
      }
      if (!matchedStaff && resolvedTeacherName && resolvedTeacherName !== "Staff Teacher") {
        const lowerName = resolvedTeacherName.toLowerCase().trim();
        matchedStaff = staffList.find((s: any) => {
          const sName = (s.name || s.name_en || s.user_name || s.full_name || "").toLowerCase().trim();
          return sName && (sName === lowerName || sName.includes(lowerName) || lowerName.includes(sName));
        });
      }

      if (matchedStaff) {
        if (!resolvedTeacherName || resolvedTeacherName === "Staff Teacher") {
          resolvedTeacherName =
            matchedStaff.name ||
            matchedStaff.name_en ||
            matchedStaff.user_name ||
            matchedStaff.full_name ||
            "";
        }
      }

      // 5e. Match by report creator (created_by)
      if (!resolvedTeacherName && rep.created_by) {
        if (typeof rep.created_by === "object") {
          resolvedTeacherName =
            rep.created_by.name ||
            rep.created_by.full_name ||
            rep.created_by.first_name ||
            rep.created_by.username ||
            "";
        }
      }

      // 5f. Match by student's class / section teacher if assigned
      if (!resolvedTeacherName && matchedStudent) {
        if (matchedStudent.class_teacher_name) {
          resolvedTeacherName = matchedStudent.class_teacher_name;
        }
      }

      // 5g. Automatically pick the currently logged-in user / teacher
      if (!resolvedTeacherName) {
        try {
          const currentUser = authStore.getUser?.() || authStore.getUserProfile?.() || null;
          if (currentUser) {
            resolvedTeacherName =
              currentUser.name ||
              currentUser.full_name ||
              (currentUser.first_name || currentUser.last_name ? [currentUser.first_name, currentUser.last_name].filter(Boolean).join(" ") : "") ||
              currentUser.user_name ||
              currentUser.username ||
              "";
          }
        } catch {
          // fallback gracefully
        }
      }

      // 5h. Guaranteed fallback
      if (!resolvedTeacherName || resolvedTeacherName === "—") {
        resolvedTeacherName = "Staff Teacher";
      }

      const canonicalTeacherId = String(
        matchedStaff?.user ||
        matchedStaff?.user_id ||
        matchedStaff?.id ||
        rawTeacherId ||
        rawCreatorId ||
        ""
      );
      const canonicalStaffId = String(matchedStaff?.id || "");
      const canonicalUserId = String(matchedStaff?.user || matchedStaff?.user_id || rawCreatorId || "");
      const canonicalCreatedById = String(rawCreatorId || (typeof rep.created_by === "object" ? rep.created_by?.id : rep.created_by || "") || "");

      return {
        ...rep,
        server_id: serverId,
        sync_status: syncStatus,
        student_name: resolvedStudentName,
        student_group: groupName,
        session_name: rep.session_name || rep.session || "General Session",
        comment: rep.comment || "",
        formattedDate: formattedReportDate,
        formattedTime: formattedGenerateTime,
        formattedReportDate,
        formattedGenerateDate,
        formattedGenerateTime,
        isoDateOnly,
        is_edited: hasEditedFlag,
        edited_at: editedAtTime,
        totalPages: totalPagesValue,
        mistakesCount,
        stucksCount,
        total_mistake: mistakesCount,
        total_stuck: stucksCount,
        total_mistakes: mistakesCount,
        total_stucks: stucksCount,
        classId: studentClassId,
        className: studentClassName,
        sectionId: studentSectionId,
        sectionName: studentSectionName,
        departmentId: studentDepartmentId,
        departmentName: studentDepartmentName,
        departmentCode: resolvedDeptCode,
        rollNumber: studentRollNumber,
        uniqId: studentUniqId,
        progress_mode: rep.progress_mode || rep.mode || (rep.book_title || rep.lesson_title ? "BOOK" : "QURAN"),
        mode: rep.progress_mode || rep.mode || (rep.book_title || rep.lesson_title ? "BOOK" : "QURAN"),
        book_title: rep.book_title || rep.curriculum_book_name || rep.book_name || "",
        curriculum_book_name: rep.curriculum_book_name || rep.book_title || rep.book_name || "",
        book_name: rep.book_name || rep.book_title || rep.curriculum_book_name || "",
        lesson_title: rep.lesson_title || rep.lesson_covered || "",
        lesson_covered: rep.lesson_covered || rep.lesson_title || "",
        mistakes: rep.mistakes || rep.mistake_details || (Array.isArray(rep.error_details) ? rep.error_details.filter((e: any) => e.type === "Mistake") : []),
        stucks: rep.stucks || rep.stuck_details || (Array.isArray(rep.error_details) ? rep.error_details.filter((e: any) => e.type === "Stuck") : []),
        mistake_details: rep.mistake_details || rep.mistakes || (Array.isArray(rep.error_details) ? rep.error_details.filter((e: any) => e.type === "Mistake") : []),
        stuck_details: rep.stuck_details || rep.stucks || (Array.isArray(rep.error_details) ? rep.error_details.filter((e: any) => e.type === "Stuck") : []),
        error_details: rep.error_details || [],
        teacher: resolvedTeacherName,
        teacher_id: canonicalTeacherId,
        teacher_name: resolvedTeacherName,
        teacher_user_id: canonicalUserId,
        teacher_staff_id: canonicalStaffId,
        created_by_id: canonicalCreatedById,
      };
    },
    [academicData?.students, academicData?.classes, academicData?.sections, academicData?.departments, academicData?.staff, academicData?.teachers]
  );

  // Load Reports from IndexedDB / LocalStorage & API with multi-endpoint fallback
  const loadReports = useCallback(
    async (isSilent = false) => {
      let localReps: any[] = [];
      const tenantScopedStorageKey = `spr_reports_local_${activeTenantId || "default"}_v1`;
      const canonicalLocalReports = new Map<string, any>();
      const localLookupIndex = new Map<string, any>();

      const ingestLocal = (list: any[]) => {
        if (!Array.isArray(list)) return;
        list.forEach((r) => {
          if (!r) return;
          const uniqKey = r.report_unique_id ? String(r.report_unique_id).trim() : "";
          const idKey = r.id !== undefined && r.id !== null ? String(r.id).trim() : "";
          const serverKey = r.server_id ? String(r.server_id).trim() : "";

          const canonicalKey = uniqKey || (serverKey ? `srv_${serverKey}` : (idKey ? `id_${idKey}` : ""));
          if (!canonicalKey) return;

          const lowerKeys = [uniqKey.toLowerCase(), idKey.toLowerCase(), serverKey.toLowerCase()].filter(Boolean);
          if (lowerKeys.some((k) => recentlyDeletedIdsRef.current.has(k))) {
            return;
          }

          const existing =
            canonicalLocalReports.get(canonicalKey) ||
            (uniqKey ? localLookupIndex.get(uniqKey.toLowerCase()) : null) ||
            (serverKey ? localLookupIndex.get(`srv_${serverKey.toLowerCase()}`) : null) ||
            (idKey ? localLookupIndex.get(`id_${idKey.toLowerCase()}`) : null);

          let itemToStore = r;
          if (!existing) {
            itemToStore = r;
          } else {
            const existingHasServer = !isNaN(Number(existing.id)) || Boolean(existing.server_id);
            const currentHasServer = !isNaN(Number(r.id)) || Boolean(r.server_id);
            const existingTime = new Date(existing.updated_at || existing.client_updated_at || 0).getTime();
            const currentTime = new Date(r.updated_at || r.client_updated_at || 0).getTime();

            // If existing has uncommitted local edits, protect them from being overwritten by stale cache
            if (existing.is_local_edited && !r.is_local_edited && currentTime <= existingTime) {
              itemToStore = { ...r, ...existing };
            } else if ((!existingHasServer && currentHasServer) || currentTime > existingTime) {
              itemToStore = { ...existing, ...r };
            } else {
              itemToStore = { ...r, ...existing };
            }
          }

          // Canonical entity stored once
          canonicalLocalReports.set(canonicalKey, itemToStore);

          // Fast multi-key lookup index without duplicating entity values
          if (uniqKey) {
            localLookupIndex.set(uniqKey, itemToStore);
            localLookupIndex.set(uniqKey.toLowerCase(), itemToStore);
            localLookupIndex.set(uniqKey.toUpperCase(), itemToStore);
          }
          if (idKey) {
            localLookupIndex.set(idKey, itemToStore);
            localLookupIndex.set(idKey.toLowerCase(), itemToStore);
            localLookupIndex.set(`id_${idKey.toLowerCase()}`, itemToStore);
            localLookupIndex.set(`srv_${idKey}`, itemToStore);
          }
          if (serverKey) {
            localLookupIndex.set(serverKey, itemToStore);
            localLookupIndex.set(serverKey.toLowerCase(), itemToStore);
            localLookupIndex.set(`srv_${serverKey.toLowerCase()}`, itemToStore);
            localLookupIndex.set(`srv_${serverKey}`, itemToStore);
          }
        });
      };

      // 1. Immediate synchronous local cache ingestion (0ms perceived latency)
      try {
        ingestLocal(getLocalReports());
      } catch {}
      try {
        ingestLocal(JSON.parse(localStorage.getItem(tenantScopedStorageKey) || "[]"));
      } catch {}
      try {
        ingestLocal(JSON.parse(localStorage.getItem("spr_reports_local_v1") || "[]"));
      } catch {}

      localReps = deduplicateReports(Array.from(canonicalLocalReports.values()));
      if (localReps.length > 0) {
        setReportsList(localReps.map(normalizeReport));
        setLoading(false); // Cache hit! Zero loading delay
      }

      // 2. Asynchronous IndexedDB storage layer
      try {
        const idbReps = await dailyProgressRepository.list(undefined, { tenantId: activeTenantId });
        ingestLocal(idbReps);

        if (activeTenantId && activeTenantId !== "default") {
          const defaultIdbReps = await dailyProgressRepository.list(undefined, { tenantId: "default" });
          ingestLocal(defaultIdbReps);
        }

        localReps = deduplicateReports(Array.from(canonicalLocalReports.values()));
        if (localReps.length > 0) {
          setReportsList(localReps.map(normalizeReport));
          setLoading(false);
        }
      } catch (err) {
        console.warn("[useProgressReportsData] IndexedDB cache read warning:", err);
      }

      // 3. Only show loading if cache is completely empty and no reports on screen
      if (!isSilent && localReps.length === 0 && reportsListRef.current.length === 0) {
        setLoading(true);
      }

      if (!isOnline()) {
        setLoading(false);
        return;
      }

      try {
        const endpoints = [
          "/api/v1/reports/?page_size=500",
          "/api/reports/?page_size=500",
          "/reports/?page_size=500",
        ];
        let res: Response | null = null;
        for (const ep of endpoints) {
          try {
            const attempt = await fetchWithAuth(ep);
            if (attempt && attempt.ok) {
              res = attempt;
              break;
            }
          } catch {}
        }

        if (res && res.ok) {
          const raw = await res.json();
          const rawData = Array.isArray(raw) ? raw : raw.results || raw.data || [];
          const apiReports = rawData
            .filter((r: any) => {
              const k1 = String(r.id || "").toLowerCase();
              const k2 = String(r.server_id || "").toLowerCase();
              const k3 = String(r.report_unique_id || "").toLowerCase();
              return (
                !recentlyDeletedIdsRef.current.has(k1) &&
                (!k2 || !recentlyDeletedIdsRef.current.has(k2)) &&
                (!k3 || !recentlyDeletedIdsRef.current.has(k3))
              );
            })
            .map(normalizeReport);

          const apiDbIds = new Set<string>();
          const apiUniqueIds = new Set<string>();
          apiReports.forEach((r: ReportItem) => {
            if (r.id !== undefined && r.id !== null) apiDbIds.add(String(r.id));
            if (r.server_id !== undefined && r.server_id !== null) apiDbIds.add(String(r.server_id));
            if (r.report_unique_id) apiUniqueIds.add(String(r.report_unique_id));
          });

          const getLocalMatch = (apiRep: ReportItem) => {
            const uniq = apiRep.report_unique_id ? String(apiRep.report_unique_id).trim() : "";
            const srv = apiRep.server_id ? String(apiRep.server_id).trim() : "";
            const idStr = apiRep.id !== undefined && apiRep.id !== null ? String(apiRep.id).trim() : "";
            return (
              (uniq && (localLookupIndex.get(uniq) || localLookupIndex.get(uniq.toLowerCase()))) ||
              (srv && (localLookupIndex.get(`srv_${srv}`) || localLookupIndex.get(srv) || localLookupIndex.get(`srv_${srv.toLowerCase()}`))) ||
              (idStr && (localLookupIndex.get(`srv_${idStr}`) || localLookupIndex.get(idStr) || localLookupIndex.get(`id_${idStr.toLowerCase()}`))) ||
              null
            );
          };

          const merged = apiReports.map((apiRep: ReportItem) => {
            const localMatch = getLocalMatch(apiRep);

            if (localMatch) {
              const isLocalUnsynced = isReportUnsynced(localMatch);
              const localUpdated = localMatch.client_updated_at ? new Date(localMatch.client_updated_at).getTime() : 0;
              const serverUpdated = apiRep.updated_at || apiRep.created_at ? new Date(apiRep.updated_at || apiRep.created_at).getTime() : 0;

              // Only true uncommitted client edits override server state
              const isEditedLocal = Boolean(
                localMatch.is_local_edited ||
                (localMatch.client_updated_at && localUpdated > serverUpdated + 2000)
              );

              if (isLocalUnsynced || isEditedLocal || localUpdated >= serverUpdated) {
                return {
                  ...apiRep,
                  ...localMatch,
                  id: apiRep.id || localMatch.id,
                  server_id: apiRep.id || localMatch.server_id,
                  report_unique_id: apiRep.report_unique_id || localMatch.report_unique_id,
                  totalPages: localMatch.totalPages !== undefined ? localMatch.totalPages : apiRep.totalPages,
                  total_page: localMatch.total_page !== undefined ? localMatch.total_page : apiRep.total_page,
                  juz_and_pages: localMatch.juz_and_pages || apiRep.juz_and_pages,
                  portions: (localMatch.portions && localMatch.portions.length > 0) ? localMatch.portions : apiRep.portions,
                  mistakes: localMatch.mistakes !== undefined ? localMatch.mistakes : apiRep.mistakes,
                  stucks: localMatch.stucks !== undefined ? localMatch.stucks : apiRep.stucks,
                  mistake_details: localMatch.mistake_details !== undefined ? localMatch.mistake_details : apiRep.mistake_details,
                  stuck_details: localMatch.stuck_details !== undefined ? localMatch.stuck_details : apiRep.stuck_details,
                  error_details: localMatch.error_details !== undefined ? localMatch.error_details : apiRep.error_details,
                  is_edited: isEditedLocal || Boolean(apiRep.is_edited),
                  edited_at: isEditedLocal ? localMatch.edited_at || null : apiRep.is_edited ? apiRep.edited_at || null : null,
                  sync_status: isLocalUnsynced ? "PENDING" : "SYNCED",
                };
              }
              return {
                ...apiRep,
                sync_status: "SYNCED",
                sync_error: null,
                is_edited: Boolean(apiRep.is_edited || localMatch.is_edited),
                edited_at: (apiRep.is_edited ? apiRep.edited_at : localMatch.edited_at) || null,
              };
            }
            return {
              ...apiRep,
              sync_status: "SYNCED",
              sync_error: null,
            };
          });

          let pendingQueue = new Set<string>();
          try {
            pendingQueue = new Set(
              JSON.parse(localStorage.getItem("spr_reports_pending_queue") || "[]").map(String)
            );
          } catch {}

          const localOnly = localReps
            .filter((r) => {
              const rId = String(r.id || "");
              const rUniqId = String(r.report_unique_id || "");
              const rServerId = r.server_id ? String(r.server_id) : "";

              const existsOnServer =
                (rId && apiDbIds.has(rId)) ||
                (rUniqId && apiUniqueIds.has(rUniqId)) ||
                (rServerId && apiDbIds.has(rServerId));

              if (existsOnServer) return false;

              const isUnsynced =
                isReportUnsynced(r) ||
                pendingQueue.has(rId) ||
                pendingQueue.has(rUniqId) ||
                r.sync_status === "PENDING" ||
                r.sync_status === "GRACE_PERIOD";

              if (isUnsynced) return true;

              const hasNumericDbId = r.id && !isNaN(Number(r.id)) && !String(r.id).includes("-");
              if (hasNumericDbId) return false;

              return true;
            })
            .map((r) =>
              normalizeReport({
                ...r,
                sync_status: r.sync_status || "PENDING",
              })
            );

          const finalMerged = deduplicateReports([...merged, ...localOnly]).sort((a: any, b: any) => {
            const tA = new Date(a.date || a.client_updated_at || a.created_at || 0).getTime();
            const tB = new Date(b.date || b.client_updated_at || b.created_at || 0).getTime();
            if (!isNaN(tA) && !isNaN(tB) && tA !== tB) return tB - tA;
            const idA = Number(a.server_id || a.id);
            const idB = Number(b.server_id || b.id);
            if (!isNaN(idA) && !isNaN(idB) && idA !== idB) return idB - idA;
            return 0;
          });
          setReportsList(finalMerged);
          localStorage.setItem(tenantScopedStorageKey, JSON.stringify(finalMerged));
          localStorage.setItem("spr_reports_local_v1", JSON.stringify(finalMerged));

          dailyProgressRepository.bulkHydrate(finalMerged, { tenantId: activeTenantId }).catch(() => {});
        }
      } catch (err: any) {
        console.warn("[useProgressReportsData] Reports fetch failed:", err?.message);
      } finally {
        setLoading(false);
      }
    },
    [normalizeReport, activeTenantId]
  );

  // Online / Offline & auto-refresh
  useEffect(() => {
    const handleOnline = () => {
      setOffline(false);
      loadReports();
    };
    const handleOffline = () => setOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [loadReports]);

  // Window event listeners
  useEffect(() => {
    const handleReportSaved = (e: any) => {
      if (e?.detail?.source === "sync") return;
      const savedData = e?.detail?.data;
      if (savedData) {
        const normalized = normalizeReport(savedData);
        setReportsList((prev) => {
          const uniq = normalized.report_unique_id ? String(normalized.report_unique_id).toLowerCase() : "";
          const idStr = normalized.id !== undefined && normalized.id !== null ? String(normalized.id).toLowerCase() : "";
          const serverStr = normalized.server_id ? String(normalized.server_id).toLowerCase() : "";

          const existingIdx = prev.findIndex((r) => {
            const rUniq = r.report_unique_id ? String(r.report_unique_id).toLowerCase() : "";
            const rId = r.id !== undefined && r.id !== null ? String(r.id).toLowerCase() : "";
            const rServer = r.server_id ? String(r.server_id).toLowerCase() : "";
            return (uniq && rUniq === uniq) || (idStr && rId === idStr) || (serverStr && rServer === serverStr);
          });

          let nextList: ReportItem[];
          if (existingIdx > -1) {
            nextList = [...prev];
            nextList[existingIdx] = { ...nextList[existingIdx], ...normalized };
          } else {
            nextList = [normalized, ...prev];
          }

          // Stable chronological sort so newly added rows never bounce or shift up/down
          return nextList.sort((a, b) => {
            const tA = new Date(a.date || a.client_updated_at || a.created_at || 0).getTime();
            const tB = new Date(b.date || b.client_updated_at || b.created_at || 0).getTime();
            if (!isNaN(tA) && !isNaN(tB) && tA !== tB) return tB - tA;
            const idA = Number(a.server_id || a.id);
            const idB = Number(b.server_id || b.id);
            if (!isNaN(idA) && !isNaN(idB) && idA !== idB) return idB - idA;
            return 0;
          });
        });
      }
      if (e?.detail?.source !== "local") {
        loadReports(true);
      }
    };
    const handleReportDeleted = (e: any) => {
      if (e?.detail?.source === "progress_reports_view") return;
      const deletedKeys: string[] = e?.detail?.deletedKeys || [];
      if (deletedKeys.length > 0) {
        const delSet = new Set(deletedKeys.map((k) => String(k).toLowerCase()));
        setReportsList((prev) =>
          prev.filter((r) => {
            const k1 = String(r.id || "").toLowerCase();
            const k2 = String(r.server_id || "").toLowerCase();
            const k3 = String(r.report_unique_id || "").toLowerCase();
            return !delSet.has(k1) && (!k2 || !delSet.has(k2)) && (!k3 || !delSet.has(k3));
          })
        );
      } else {
        loadReports(true);
      }
    };
    const handleTenantChanged = () => {
      loadReports(true);
    };
    const handleOfflinePurged = () => {
      setReportsList([]);
    };
    window.addEventListener("spr_report_saved", handleReportSaved);
    window.addEventListener("spr_report_deleted", handleReportDeleted);
    window.addEventListener("spr_tenant_changed", handleTenantChanged);
    window.addEventListener("spr_offline_purged", handleOfflinePurged);
    return () => {
      window.removeEventListener("spr_report_saved", handleReportSaved);
      window.removeEventListener("spr_report_deleted", handleReportDeleted);
      window.removeEventListener("spr_tenant_changed", handleTenantChanged);
      window.removeEventListener("spr_offline_purged", handleOfflinePurged);
    };
  }, [loadReports]);

  useEffect(() => {
    loadReports(false);
  }, [loadReports]);

  // Refresh with DB push
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (isOnline()) {
        try {
          const syncResult = await triggerCloudSync({ force: true });
          if (syncResult && syncResult.syncedCount && syncResult.syncedCount > 0) {
            showToast(`Synced ${syncResult.syncedCount} report(s) directly to Database!`, "success");
          }
        } catch {}
      }
      await loadReports(false);
      showToast("Reports refreshed successfully!", "success");
    } catch (err: any) {
      showToast("Failed to refresh reports: " + (err?.message || "Network error"), "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  const pendingSyncCount = reportsList.filter(isReportUnsynced).length;

  const handleSyncOfflineReports = async () => {
    const unsyncedList = reportsList.filter(isReportUnsynced);
    if (unsyncedList.length === 0) {
      showToast("All local reports are already in sync with Database", "info");
      return;
    }

    setIsSyncing(true);
    setSyncErrors(null);
    try {
      const res = await triggerCloudSync({ force: true, reports: unsyncedList });
      if (res && res.errors && res.errors.length > 0) {
        setSyncErrors(res.errors);
        if (res.syncedCount && res.syncedCount > 0) {
          showToast(`Synced ${res.syncedCount} report(s), but ${res.errors.length} failed to sync.`, "warning");
        } else {
          showToast(`Failed to sync ${res.errors.length} report(s) to Database. Check details above.`, "error");
        }
      } else if (res && res.syncedCount && res.syncedCount > 0) {
        showToast(`Successfully synced ${res.syncedCount} report(s) to Database!`, "success");
      } else if (pendingSyncCount > 0) {
        showToast(`Sync attempted, but ${pendingSyncCount} report(s) still require review.`, "warning");
      } else {
        showToast("All local reports are already in sync with Database", "info");
      }
    } catch (err: any) {
      showToast("Sync failed: " + (err?.message || "Server error"), "error");
      setSyncErrors([
        {
          id: "err-all",
          student_name: "All Pending Records",
          reason: err?.message || "Server communication error",
        },
      ]);
    } finally {
      setIsSyncing(false);
      await loadReports(false);
    }
  };

  const handleSyncSingleReport = async (report: ReportItem) => {
    setIsSyncing(true);
    setSyncErrors(null);
    try {
      const res = await triggerCloudSync({ force: true, reports: [report] });
      if (res && res.errors && res.errors.length > 0) {
        setSyncErrors(res.errors);
        showToast(`Failed to sync report: ${res.errors[0]?.reason || "Cloud error"}`, "error");
      } else if (res && res.syncedCount && res.syncedCount > 0) {
        showToast(`Report for "${report.student_name}" synced to Database!`, "success");
      } else {
        showToast(`Report is already in sync with Database`, "info");
      }
    } catch (err: any) {
      showToast("Sync failed: " + (err?.message || "Server error"), "error");
    } finally {
      setIsSyncing(false);
      await loadReports(false);
    }
  };

  const handleSyncSelectedReports = async (selectedReports: ReportItem[]) => {
    const unsyncedTargets = selectedReports.filter(isReportUnsynced);
    if (unsyncedTargets.length === 0) {
      showToast("Selected report(s) are already in sync with Database", "info");
      return;
    }
    setIsSyncing(true);
    setSyncErrors(null);
    try {
      const res = await triggerCloudSync({ force: true, reports: unsyncedTargets });
      if (res && res.errors && res.errors.length > 0) {
        setSyncErrors(res.errors);
        if (res.syncedCount && res.syncedCount > 0) {
          showToast(`Synced ${res.syncedCount} report(s), ${res.errors.length} failed.`, "warning");
        } else {
          showToast(`Failed to sync ${res.errors.length} selected report(s): ${res.errors[0]?.reason || "Cloud error"}`, "error");
        }
      } else if (res && res.syncedCount && res.syncedCount > 0) {
        showToast(`Successfully synced ${res.syncedCount} selected report(s) to Database!`, "success");
      } else {
        showToast("Selected report(s) are already in sync with Database", "info");
      }
    } catch (err: any) {
      showToast("Sync failed: " + (err?.message || "Server error"), "error");
    } finally {
      setIsSyncing(false);
      await loadReports(false);
    }
  };

  const handleDeleteReport = (rep: ReportItem | ReportItem[]) => {
    setReportToDelete(rep);
  };

  const handleConfirmDelete = async () => {
    if (!reportToDelete) return;
    const targetItems = Array.isArray(reportToDelete) ? reportToDelete : [reportToDelete];
    if (targetItems.length === 0) return;
    setIsDeleting(true);

    try {
      const allTargetKeys: string[] = [];
      const serverLookupIds: string[] = [];

      targetItems.forEach((r) => {
        if (r.id !== undefined && r.id !== null && String(r.id).trim()) {
          const sId = String(r.id).trim();
          allTargetKeys.push(sId);
          serverLookupIds.push(sId);
        }
        if (r.server_id !== undefined && r.server_id !== null && String(r.server_id).trim()) {
          const sId = String(r.server_id).trim();
          allTargetKeys.push(sId);
          serverLookupIds.push(sId);
        }
        if (r.report_unique_id && String(r.report_unique_id).trim()) {
          const uniq = String(r.report_unique_id).trim();
          allTargetKeys.push(uniq);
          serverLookupIds.push(uniq);
        }
      });

      allTargetKeys.forEach((k) => recentlyDeletedIdsRef.current.add(k.toLowerCase()));
      const deleteKeySet = new Set(allTargetKeys.map((k) => k.toLowerCase()));

      deleteReportFromSync(allTargetKeys, activeTenantId);

      try {
        await offlineDB.entities
          .where("module")
          .equals("daily-progress")
          .filter((e) => {
            const eid = String(e.id || "").toLowerCase();
            const dataId = String(e.data?.id || "").toLowerCase();
            const dataServerId = String(e.data?.server_id || "").toLowerCase();
            const dataUniq = String(e.data?.report_unique_id || "").toLowerCase();
            return (
              deleteKeySet.has(eid) ||
              deleteKeySet.has(dataId) ||
              deleteKeySet.has(dataServerId) ||
              deleteKeySet.has(dataUniq)
            );
          })
          .delete();
      } catch (err) {
        console.warn("[useProgressReportsData] IndexedDB purge error:", err);
      }

      for (const key of allTargetKeys) {
        dailyProgressRepository.deleteOptimistic(key, "/reports/", { skipOutbox: true, tenantId: activeTenantId }).catch(() => {});
        if (!isNaN(Number(key))) {
          dailyProgressRepository.deleteOptimistic(Number(key), "/reports/", { skipOutbox: true, tenantId: activeTenantId }).catch(() => {});
        }
      }

      setReportsList((prev) =>
        prev.filter((r) => {
          const id1 = String(r.id || "").toLowerCase();
          const id2 = String(r.server_id || "").toLowerCase();
          const id3 = String(r.report_unique_id || "").toLowerCase();
          return (
            (!id1 || !deleteKeySet.has(id1)) &&
            (!id2 || !deleteKeySet.has(id2)) &&
            (!id3 || !deleteKeySet.has(id3))
          );
        })
      );

      window.dispatchEvent(
        new CustomEvent("spr_report_deleted", {
          detail: { source: "progress_reports_view", deletedKeys: allTargetKeys },
        })
      );
      window.dispatchEvent(new CustomEvent("spr_project_changed"));

      if (targetItems.length === 1) {
        const rep = targetItems[0];
        const reportIdStr = rep.report_unique_id || `REP-#${rep.id}`;
        showToast(`Report ${reportIdStr} deleted permanently!`, "success");
      } else {
        showToast(`${targetItems.length} reports deleted permanently!`, "success");
      }

      // Close modal and unblock UI immediately (< 5ms)
      setIsDeleting(false);
      setReportToDelete(null);

      // Asynchronous Background Cloud Delete ("পরে ডাটাবেজে যাবে")
      if (isOnline() && serverLookupIds.length > 0) {
        const uniqueLookupIds = Array.from(new Set(serverLookupIds));
        (async () => {
          let bulkSuccess = false;
          try {
            const bulkRes = await fetchWithAuth("/api/v1/reports/bulk-delete/", {
              method: "POST",
              body: JSON.stringify({ ids: uniqueLookupIds }),
            });
            if (bulkRes && (bulkRes.ok || bulkRes.status === 200 || bulkRes.status === 204)) {
              bulkSuccess = true;
            }
          } catch {
            bulkSuccess = false;
          }

          if (!bulkSuccess) {
            for (const lookupId of uniqueLookupIds) {
              const endpoints = [
                `/api/v1/reports/${lookupId}/`,
                `/api/reports/${lookupId}/`,
                `/reports/${lookupId}/`,
              ];
              for (const ep of endpoints) {
                try {
                  const res = await fetchWithAuth(ep, { method: "DELETE" });
                  if (res && (res.ok || res.status === 200 || res.status === 204 || res.status === 404)) {
                    break;
                  }
                } catch {}
              }
            }
          }
        })().catch((err) => {
          console.warn("[useProgressReportsData] Background delete sync notice:", err);
        });
      }
    } finally {
      setIsDeleting(false);
      setReportToDelete(null);
    }
  };

  return {
    reportsList,
    setReportsList,
    loading,
    offline,
    isSyncing,
    isRefreshing,
    syncErrors,
    setSyncErrors,
    pendingSyncCount,
    handleRefresh,
    handleSyncOfflineReports,
    handleSyncSingleReport,
    handleSyncSelectedReports,
    reportToDelete,
    setReportToDelete,
    isDeleting,
    handleDeleteReport,
    handleConfirmDelete,
    normalizeReport,
  };
}
