import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ProgressAnalyticsData,
  ProgressKPIItem,
  ProgressTrendPoint,
  SessionProgressItem,
  PortionCoverageItem,
  LearnerProgressPerformanceItem,
} from "../types";
import { fetchWithAuth } from "@/utils/authService";
import { isOnline } from "@/utils/localStore";

interface UseProgressAnalyticsProps {
  selectedDate?: string;
  selectedDepartmentId?: string;
  selectedClassId?: string;
  selectedSectionId?: string;
  students?: any[];
  classes?: any[];
  sections?: any[];
}

export function useProgressAnalytics({
  selectedDate = "",
  selectedDepartmentId = "",
  selectedClassId = "",
  selectedSectionId = "",
  students = [],
  classes = [],
  sections = [],
}: UseProgressAnalyticsProps): ProgressAnalyticsData {
  const [allReports, setAllReports] = useState<any[]>([]);

  // 1. Load Reports from LocalStorage + Live API
  const loadReports = useCallback(async () => {
    let localReps: any[] = [];
    try {
      localReps = JSON.parse(localStorage.getItem("spr_reports_local_v1") || "[]");
      if (localReps.length > 0) {
        setAllReports(localReps);
      }
    } catch {
      // Fallback
    }

    if (!isOnline()) return;

    try {
      const res = await fetchWithAuth("/reports/");
      if (res.ok) {
        const raw = await res.json();
        const apiReports = Array.isArray(raw) ? raw : raw?.results || [];
        if (apiReports.length > 0) {
          const map = new Map<string, any>();
          apiReports.forEach((r: any) => {
            const key = String(r.id || r.report_unique_id || "");
            if (key) map.set(key, r);
          });
          localReps.forEach((r: any) => {
            const key = String(r.id || r.report_unique_id || "");
            if (!map.has(key)) map.set(key, r);
          });
          setAllReports(Array.from(map.values()));
        }
      }
    } catch {
      // Offline fallback
    }
  }, []);

  useEffect(() => {
    loadReports();
    const handleUpdate = () => loadReports();
    window.addEventListener("spr_report_saved", handleUpdate);
    window.addEventListener("spr_report_deleted", handleUpdate);
    return () => {
      window.removeEventListener("spr_report_saved", handleUpdate);
      window.removeEventListener("spr_report_deleted", handleUpdate);
    };
  }, [loadReports]);

  // 2. Helper to extract student metadata
  const studentMap = useMemo(() => {
    const map = new Map<string, any>();
    students.forEach((s) => {
      if (s.id) map.set(String(s.id), s);
      if (s.uniq_id) map.set(String(s.uniq_id), s);
      if (s.roll_number) map.set(String(s.roll_number), s);
      if (s.name_en) map.set(String(s.name_en).toLowerCase(), s);
      if (s.name) map.set(String(s.name).toLowerCase(), s);
    });
    return map;
  }, [students]);

  // 3. Normalizer for a single report
  const normalizedReports = useMemo(() => {
    return allReports.map((rep) => {
      const rawDate = rep.report_date || rep.date || rep.selectedDate || "";
      let isoDate = "";
      if (rawDate) {
        try {
          isoDate = new Date(rawDate).toISOString().split("T")[0];
        } catch {
          isoDate = String(rawDate).split("T")[0];
        }
      }

      // Find matching student
      const rawStudentId =
        typeof rep.student === "object" ? rep.student?.id : rep.student || rep.student_id;
      const matchedStudent =
        (rawStudentId ? studentMap.get(String(rawStudentId)) : null) ||
        (rep.student_name ? studentMap.get(String(rep.student_name).toLowerCase()) : null);

      const stClassId = String(
        matchedStudent?.student_class?.id ||
          matchedStudent?.student_class ||
          matchedStudent?.class_id ||
          matchedStudent?.class ||
          rep.class_id ||
          ""
      );

      const stSectionId = String(
        matchedStudent?.student_section?.id ||
          matchedStudent?.student_section ||
          matchedStudent?.section_id ||
          matchedStudent?.section ||
          rep.section_id ||
          ""
      );

      const stDeptId = String(
        matchedStudent?.department?.id ||
          matchedStudent?.department ||
          matchedStudent?.department_id ||
          rep.department_id ||
          ""
      );

      // Total pages/volume
      let totalPages = 0;
      if (rep.total_page !== undefined && rep.total_page !== null) {
        totalPages = parseFloat(rep.total_page) || 0;
      } else if (rep.total_pages !== undefined) {
        totalPages = parseFloat(rep.total_pages) || 0;
      } else if (rep.pages !== undefined) {
        totalPages = parseFloat(rep.pages) || 0;
      }

      // Total mistakes
      let mistakesCount = 0;
      if (rep.total_mistake !== undefined && rep.total_mistake !== null) {
        mistakesCount = Number(rep.total_mistake) || 0;
      } else if (Array.isArray(rep.mistake_details)) {
        mistakesCount = rep.mistake_details.length;
      }

      // Total stucks
      let stucksCount = 0;
      if (rep.total_stuck !== undefined && rep.total_stuck !== null) {
        stucksCount = Number(rep.total_stuck) || 0;
      } else if (Array.isArray(rep.stuck_details)) {
        stucksCount = rep.stuck_details.length;
      }

      const isClean = mistakesCount === 0 && stucksCount === 0;

      return {
        ...rep,
        isoDate,
        studentId: String(matchedStudent?.id || rawStudentId || rep.student_unique_id || ""),
        studentName:
          matchedStudent?.name_en ||
          matchedStudent?.name ||
          rep.student_name ||
          "Student",
        rollNumber: matchedStudent?.uniq_id || matchedStudent?.roll_number || "",
        classId: stClassId,
        sectionId: stSectionId,
        departmentId: stDeptId,
        totalPages,
        mistakesCount,
        stucksCount,
        isClean,
        sessionName: rep.session_name || rep.session || "General Session",
        status: rep.status || (totalPages > 0 ? "Completed" : "Unprepared"),
      };
    });
  }, [allReports, studentMap]);

  // 4. Filter by selected hierarchy and date
  const filteredReports = useMemo(() => {
    return normalizedReports.filter((r) => {
      // Date filter
      if (selectedDate && r.isoDate && r.isoDate !== selectedDate) {
        return false;
      }
      // Department filter
      if (selectedDepartmentId && r.departmentId && r.departmentId !== selectedDepartmentId) {
        return false;
      }
      // Class filter
      if (selectedClassId && r.classId && r.classId !== selectedClassId) {
        return false;
      }
      // Section filter
      if (selectedSectionId && r.sectionId && r.sectionId !== selectedSectionId) {
        return false;
      }
      return true;
    });
  }, [normalizedReports, selectedDate, selectedDepartmentId, selectedClassId, selectedSectionId]);

  // 5. Calculations
  return useMemo(() => {
    const totalReports = filteredReports.length;
    const totalPages = parseFloat(
      filteredReports.reduce((sum, r) => sum + (r.totalPages || 0), 0).toFixed(1)
    );
    const totalMistakes = filteredReports.reduce((sum, r) => sum + (r.mistakesCount || 0), 0);
    const totalStucks = filteredReports.reduce((sum, r) => sum + (r.stucksCount || 0), 0);
    const totalErrors = totalMistakes + totalStucks;

    const uniqueStudentsSet = new Set(filteredReports.map((r) => r.studentId || r.studentName));
    const activeStudents = uniqueStudentsSet.size;

    const cleanReportsCount = filteredReports.filter((r) => r.isClean).length;
    const cleanRate = totalReports > 0 ? Math.round((cleanReportsCount / totalReports) * 100) : 0;

    const avgPagesPerReport = totalReports > 0 ? (totalPages / totalReports).toFixed(1) : "0";
    const avgMistakesPerPage = totalPages > 0 ? (totalMistakes / totalPages).toFixed(2) : "0.00";
    const avgStucksPerPage = totalPages > 0 ? (totalStucks / totalPages).toFixed(2) : "0.00";

    const pagesPerMistake = totalMistakes > 0 ? (totalPages / totalMistakes).toFixed(1) : totalPages.toFixed(1);
    const pagesPerStuck = totalStucks > 0 ? (totalPages / totalStucks).toFixed(1) : totalPages.toFixed(1);

    // Recitation purity score (0-100)
    // 100 minus penalty based on error density
    const densityVal = parseFloat(avgMistakesPerPage) + parseFloat(avgStucksPerPage);
    const purityScore = Math.max(0, Math.min(100, Math.round(100 - densityVal * 25)));

    // 6. KPIs
    const kpis: ProgressKPIItem[] = [
      {
        id: "total_pages",
        label: "Total Units / Pages Covered",
        value: `${totalPages}`,
        subValue: `Avg ${avgPagesPerReport} pages per logged session`,
        trend: {
          direction: totalPages > 10 ? "up" : "neutral",
          value: `${totalReports} sessions recorded`,
          isPositive: true,
        },
        badge: {
          text: totalPages > 20 ? "High Velocity" : "Steady",
          variant: totalPages > 20 ? "success" : "info",
        },
      },
      {
        id: "active_learners",
        label: "Active Learners Reciting",
        value: `${activeStudents}`,
        subValue: "Unique learners in cohort",
        trend: {
          direction: activeStudents > 5 ? "up" : "neutral",
          value: `${totalReports} total submissions`,
          isPositive: activeStudents > 0,
        },
        badge: {
          text: activeStudents > 0 ? "Engaged" : "Pending",
          variant: activeStudents > 0 ? "success" : "warning",
        },
      },
      {
        id: "clean_rate",
        label: "Clean Progress Rate",
        value: `${cleanRate}%`,
        subValue: `${cleanReportsCount} flawless sessions (0 errors)`,
        trend: {
          direction: cleanRate >= 70 ? "up" : "down",
          value: cleanRate >= 70 ? "High accuracy" : "Remedial needed",
          isPositive: cleanRate >= 70,
        },
        badge: {
          text: cleanRate >= 80 ? "Pristine" : cleanRate >= 60 ? "Standard" : "Needs Review",
          variant: cleanRate >= 80 ? "success" : cleanRate >= 60 ? "info" : "danger",
        },
      },
      {
        id: "total_errors",
        label: "Total Errors Logged",
        value: `${totalErrors}`,
        subValue: `${totalMistakes} mistakes + ${totalStucks} stucks`,
        trend: {
          direction: densityVal <= 0.5 ? "up" : "down",
          value: `${avgMistakesPerPage} err / page`,
          isPositive: densityVal <= 0.5,
        },
        badge: {
          text: densityVal <= 0.4 ? "Low Density" : densityVal <= 1.0 ? "Moderate" : "High Errors",
          variant: densityVal <= 0.4 ? "success" : densityVal <= 1.0 ? "warning" : "danger",
        },
      },
    ];

    // 7. 7-Day Trend Trajectory
    const trendHistory: ProgressTrendPoint[] = [];
    const baseDate = selectedDate ? new Date(selectedDate) : new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() - i);
      const isoStr = d.toISOString().split("T")[0];
      const dayLabel = d.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" });

      const dayReports = normalizedReports.filter((r) => r.isoDate === isoStr);
      const dayPages = parseFloat(
        dayReports.reduce((sum, r) => sum + (r.totalPages || 0), 0).toFixed(1)
      );
      const dayMistakes = dayReports.reduce((sum, r) => sum + (r.mistakesCount || 0), 0);
      const dayStucks = dayReports.reduce((sum, r) => sum + (r.stucksCount || 0), 0);
      const dayCleanCount = dayReports.filter((r) => r.isClean).length;
      const dayCleanRate = dayReports.length > 0 ? Math.round((dayCleanCount / dayReports.length) * 100) : 0;
      const dayUniqueStudents = new Set(dayReports.map((r) => r.studentId || r.studentName)).size;

      trendHistory.push({
        date: isoStr,
        label: dayLabel,
        totalPages: i === 0 && totalPages > 0 ? totalPages : dayPages,
        totalReports: i === 0 && totalReports > 0 ? totalReports : dayReports.length,
        activeStudents: i === 0 && activeStudents > 0 ? activeStudents : dayUniqueStudents,
        totalMistakes: i === 0 && totalMistakes > 0 ? totalMistakes : dayMistakes,
        totalStucks: i === 0 && totalStucks > 0 ? totalStucks : dayStucks,
        cleanRate: i === 0 && cleanRate > 0 ? cleanRate : dayCleanRate,
      });
    }

    // 8. Session Breakdown (Morning/Sabaq, Noon, Afternoon, Evening/Sabqi, Night/Manzil)
    const sessionMap = new Map<string, SessionProgressItem>();
    filteredReports.forEach((r) => {
      const sKey = (r.sessionName || "General Session").trim();
      if (!sessionMap.has(sKey)) {
        sessionMap.set(sKey, {
          sessionKey: sKey,
          sessionName: sKey,
          reportsCount: 0,
          totalPages: 0,
          mistakesCount: 0,
          stucksCount: 0,
          cleanCount: 0,
          cleanRate: 0,
          activeStudents: 0,
        });
      }
      const sObj = sessionMap.get(sKey)!;
      sObj.reportsCount += 1;
      sObj.totalPages = parseFloat((sObj.totalPages + (r.totalPages || 0)).toFixed(1));
      sObj.mistakesCount += r.mistakesCount || 0;
      sObj.stucksCount += r.stucksCount || 0;
      if (r.isClean) sObj.cleanCount += 1;
    });

    const sessionBreakdown: SessionProgressItem[] = Array.from(sessionMap.values()).map((s) => ({
      ...s,
      cleanRate: s.reportsCount > 0 ? Math.round((s.cleanCount / s.reportsCount) * 100) : 0,
    }));

    // 9. Portion / Juz Spectrum Breakdown
    const portionMap = new Map<string, PortionCoverageItem>();
    filteredReports.forEach((r) => {
      if (Array.isArray(r.juz_and_pages) && r.juz_and_pages.length > 0) {
        r.juz_and_pages.forEach((jp: any) => {
          const jNum = jp.juz || jp.start_juz || "1";
          const pKey = `Juz ${jNum}`;
          if (!portionMap.has(pKey)) {
            portionMap.set(pKey, {
              portionKey: pKey,
              portionTitle: pKey,
              totalVolume: 0,
              unitType: "Pages",
              mistakesCount: 0,
              stucksCount: 0,
              activeLearners: 0,
            });
          }
          const item = portionMap.get(pKey)!;
          item.totalVolume += 1;
          item.activeLearners += 1;
        });
      } else {
        const pKey = r.subject_course || "Incremental Portion";
        if (!portionMap.has(pKey)) {
          portionMap.set(pKey, {
            portionKey: pKey,
            portionTitle: pKey,
            totalVolume: 0,
            unitType: "Pages",
            mistakesCount: 0,
            stucksCount: 0,
            activeLearners: 0,
          });
        }
        const item = portionMap.get(pKey)!;
        item.totalVolume = parseFloat((item.totalVolume + (r.totalPages || 0)).toFixed(1));
        item.mistakesCount += r.mistakesCount || 0;
        item.stucksCount += r.stucksCount || 0;
        item.activeLearners += 1;
      }
    });

    const portionBreakdown = Array.from(portionMap.values());

    // 10. Student Aggregated Performance (Top Pacesetters vs Remedial)
    const studentAggMap = new Map<string, LearnerProgressPerformanceItem>();
    filteredReports.forEach((r) => {
      const sKey = r.studentId || r.studentName;
      if (!studentAggMap.has(sKey)) {
        studentAggMap.set(sKey, {
          studentId: r.studentId,
          studentName: r.studentName,
          rollNumber: r.rollNumber,
          className: r.class_name,
          sectionName: r.section_name,
          groupName: r.group_name || r.student_group,
          totalPages: 0,
          totalMistakes: 0,
          totalStucks: 0,
          errorDensity: 0,
          sessionsLogged: 0,
          status: r.status,
          isClean: true,
          remarks: r.comment,
        });
      }
      const st = studentAggMap.get(sKey)!;
      st.totalPages = parseFloat((st.totalPages + (r.totalPages || 0)).toFixed(1));
      st.totalMistakes += r.mistakesCount || 0;
      st.totalStucks += r.stucksCount || 0;
      st.sessionsLogged += 1;
      if (!r.isClean) st.isClean = false;
      if (r.comment) st.remarks = r.comment;
    });

    const allLearners = Array.from(studentAggMap.values()).map((st) => ({
      ...st,
      errorDensity: st.totalPages > 0 ? parseFloat(((st.totalMistakes + st.totalStucks) / st.totalPages).toFixed(2)) : 0,
    }));

    const topPacesetters = [...allLearners]
      .sort((a, b) => b.totalPages - a.totalPages || a.errorDensity - b.errorDensity)
      .slice(0, 10);

    const remedialLearners = [...allLearners]
      .filter((st) => st.errorDensity > 0.8 || st.totalStucks >= 3 || st.status === "Unprepared")
      .sort((a, b) => b.errorDensity - a.errorDensity || b.totalStucks - a.totalStucks);

    return {
      kpis,
      totalPages,
      totalReports,
      activeStudents,
      cleanRate,
      totalMistakes,
      totalStucks,
      avgMistakesPerPage,
      avgStucksPerPage,
      pagesPerMistake,
      pagesPerStuck,
      purityScore,
      trendHistory,
      sessionBreakdown,
      portionBreakdown,
      topPacesetters,
      remedialLearners,
    };
  }, [filteredReports, normalizedReports, selectedDate]);
}
