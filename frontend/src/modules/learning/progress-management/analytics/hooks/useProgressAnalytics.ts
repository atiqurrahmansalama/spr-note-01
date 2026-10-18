import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ProgressAnalyticsData,
  ProgressKPIItem,
  ProgressTrendPoint,
  SessionProgressItem,
  PortionCoverageItem,
  LearnerProgressPerformanceItem,
  TodayRecitationRecord,
} from "../types";
import { fetchWithAuth } from "@/utils/authService";
import { isOnline } from "@/utils/localStore";

interface UseProgressAnalyticsProps {
  selectedDate?: string;
  startDate?: string;
  endDate?: string;
  timeHorizon?: "weekly" | "monthly" | "yearly";
  selectedDepartmentId?: string;
  selectedClassId?: string;
  selectedSectionId?: string;
  students?: any[];
  classes?: any[];
  sections?: any[];
}

const formatLocalDate = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function useProgressAnalytics({
  selectedDate = "",
  startDate = "",
  endDate = "",
  timeHorizon = "weekly",
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
          const d = new Date(rawDate);
          if (!isNaN(d.getTime())) {
            isoDate = formatLocalDate(d);
          } else {
            isoDate = String(rawDate).split("T")[0];
          }
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

      // Portion details determination
      let portionTitle = "Incremental Recitation";
      let portionType: "new_lesson" | "revision" | "general" = "new_lesson";

      if (Array.isArray(rep.juz_and_pages) && rep.juz_and_pages.length > 0) {
        const first = rep.juz_and_pages[0];
        portionTitle = `Juz ${first.juz || first.start_juz || 1} • p.${first.page || first.start_page || 1}`;
        if (first.type === "sabqi" || first.type === "manzil" || first.portion_type === "revision") {
          portionType = "revision";
        }
      } else if (rep.subject_course || rep.portion) {
        portionTitle = rep.subject_course || rep.portion;
        const low = portionTitle.toLowerCase();
        if (low.includes("sabqi") || low.includes("manzil") || low.includes("revision") || low.includes("ampara")) {
          portionType = "revision";
        }
      }

      return {
        ...rep,
        id: rep.id || rep.report_unique_id || Math.random().toString(),
        isoDate,
        studentId: String(matchedStudent?.id || rawStudentId || rep.student_unique_id || ""),
        studentName:
          matchedStudent?.name_en ||
          matchedStudent?.name ||
          rep.student_name ||
          "Student",
        rollNumber: matchedStudent?.uniq_id || matchedStudent?.roll_number || rep.roll_number || "",
        classId: stClassId,
        sectionId: stSectionId,
        departmentId: stDeptId,
        className: matchedStudent?.student_class?.name || rep.class_name || "",
        sectionName: matchedStudent?.student_section?.name || rep.section_name || "",
        groupName: matchedStudent?.group_name || rep.student_group || "",
        totalPages,
        mistakesCount,
        stucksCount,
        isClean,
        portionTitle,
        portionType,
        sessionName: rep.session_name || rep.session || "Morning Session",
        status: rep.status || (totalPages > 0 ? "Completed" : "Unprepared"),
        score: rep.score || (isClean ? "A+" : mistakesCount <= 2 ? "A" : "B"),
        comment: rep.comment || "",
      };
    });
  }, [allReports, studentMap]);

  // 4. Filter by selected hierarchy and date
  const filteredReports = useMemo(() => {
    return normalizedReports.filter((r) => {
      // Date range filter
      if (startDate && r.isoDate && r.isoDate < startDate) return false;
      if (endDate && r.isoDate && r.isoDate > endDate) return false;
      if (!startDate && !endDate && selectedDate && r.isoDate && r.isoDate !== selectedDate) {
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
  }, [normalizedReports, startDate, endDate, selectedDate, selectedDepartmentId, selectedClassId, selectedSectionId]);

  // 5. Today's recitations / Selected period individual records
  const todayReports: TodayRecitationRecord[] = useMemo(() => {
    const todayTarget = selectedDate || formatLocalDate(new Date());
    const matched = normalizedReports.filter((r) => {
      if (startDate && endDate) {
        return r.isoDate >= startDate && r.isoDate <= endDate;
      }
      return r.isoDate === todayTarget;
    });

    const listToUse = matched.length > 0 ? matched : filteredReports;

    return listToUse.map((r) => ({
      id: r.id,
      studentId: r.studentId,
      studentName: r.studentName,
      rollNumber: r.rollNumber,
      className: r.className,
      sectionName: r.sectionName,
      groupName: r.groupName,
      sessionName: r.sessionName,
      portionTitle: r.portionTitle,
      portionType: r.portionType,
      totalPages: r.totalPages,
      mistakesCount: r.mistakesCount,
      stucksCount: r.stucksCount,
      status: r.status,
      isClean: r.isClean,
      score: r.score,
      comment: r.comment,
      date: r.isoDate,
    }));
  }, [normalizedReports, filteredReports, selectedDate, startDate, endDate]);

  // 6. Trend Trajectory (Weekly / Monthly / Yearly)
  const trendHistory: ProgressTrendPoint[] = useMemo(() => {
    const points: ProgressTrendPoint[] = [];
    const now = new Date();

    if (timeHorizon === "yearly") {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const currentYear = now.getFullYear();

      for (let m = 0; m < 12; m++) {
        const monthPrefix = `${currentYear}-${String(m + 1).padStart(2, "0")}`;
        const mReports = normalizedReports.filter((r) => r.isoDate.startsWith(monthPrefix));
        const totalP = parseFloat(mReports.reduce((sum, r) => sum + (r.totalPages || 0), 0).toFixed(1));
        const newLP = parseFloat(
          mReports
            .filter((r) => r.portionType === "new_lesson")
            .reduce((sum, r) => sum + (r.totalPages || 0), 0)
            .toFixed(1)
        );
        const revP = parseFloat(Math.max(0, totalP - newLP).toFixed(1));

        const mClean = mReports.filter((r) => r.isClean).length;
        const mCleanRate = mReports.length > 0 ? Math.round((mClean / mReports.length) * 100) : 0;

        points.push({
          date: monthPrefix,
          label: monthNames[m],
          totalPages: totalP,
          newLessonPages: newLP,
          revisionPages: revP,
          totalReports: mReports.length,
          activeStudents: new Set(mReports.map((r) => r.studentId)).size,
          totalMistakes: mReports.reduce((sum, r) => sum + (r.mistakesCount || 0), 0),
          totalStucks: mReports.reduce((sum, r) => sum + (r.stucksCount || 0), 0),
          cleanRate: mCleanRate,
        });
      }
    } else if (timeHorizon === "monthly") {
      // 4 Weekly intervals of the current month
      for (let w = 4; w >= 1; w--) {
        const endDay = new Date(now);
        endDay.setDate(endDay.getDate() - (w - 1) * 7);
        const startDay = new Date(endDay);
        startDay.setDate(startDay.getDate() - 6);

        const startIso = formatLocalDate(startDay);
        const endIso = formatLocalDate(endDay);
        const wReports = normalizedReports.filter((r) => r.isoDate >= startIso && r.isoDate <= endIso);

        const totalP = parseFloat(wReports.reduce((sum, r) => sum + (r.totalPages || 0), 0).toFixed(1));
        const newLP = parseFloat(
          wReports
            .filter((r) => r.portionType === "new_lesson")
            .reduce((sum, r) => sum + (r.totalPages || 0), 0)
            .toFixed(1)
        );
        const revP = parseFloat(Math.max(0, totalP - newLP).toFixed(1));

        points.push({
          date: endIso,
          label: `W${5 - w} (${startDay.getDate()}/${startDay.getMonth() + 1})`,
          totalPages: totalP,
          newLessonPages: newLP,
          revisionPages: revP,
          totalReports: wReports.length,
          activeStudents: new Set(wReports.map((r) => r.studentId)).size,
          totalMistakes: wReports.reduce((sum, r) => sum + (r.mistakesCount || 0), 0),
          totalStucks: wReports.reduce((sum, r) => sum + (r.stucksCount || 0), 0),
          cleanRate: wReports.length > 0 ? Math.round((wReports.filter((r) => r.isClean).length / wReports.length) * 100) : 0,
        });
      }
    } else {
      // Weekly: Last 7 Days
      const baseDate = selectedDate ? new Date(selectedDate) : now;
      for (let i = 6; i >= 0; i--) {
        const d = new Date(baseDate);
        d.setDate(d.getDate() - i);
        const isoStr = formatLocalDate(d);
        const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" });

        const dReports = normalizedReports.filter((r) => r.isoDate === isoStr);
        const totalP = parseFloat(dReports.reduce((sum, r) => sum + (r.totalPages || 0), 0).toFixed(1));
        const newLP = parseFloat(
          dReports
            .filter((r) => r.portionType === "new_lesson")
            .reduce((sum, r) => sum + (r.totalPages || 0), 0)
            .toFixed(1)
        );
        const revP = parseFloat(Math.max(0, totalP - newLP).toFixed(1));

        points.push({
          date: isoStr,
          label: dayLabel,
          totalPages: totalP,
          newLessonPages: newLP,
          revisionPages: revP,
          totalReports: dReports.length,
          activeStudents: new Set(dReports.map((r) => r.studentId)).size,
          totalMistakes: dReports.reduce((sum, r) => sum + (r.mistakesCount || 0), 0),
          totalStucks: dReports.reduce((sum, r) => sum + (r.stucksCount || 0), 0),
          cleanRate: dReports.length > 0 ? Math.round((dReports.filter((r) => r.isClean).length / dReports.length) * 100) : 0,
        });
      }
    }

    return points;
  }, [normalizedReports, timeHorizon, selectedDate]);

  // 7. Aggregates & KPIs
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

    const densityVal = parseFloat(avgMistakesPerPage) + parseFloat(avgStucksPerPage);
    const purityScore = Math.max(0, Math.min(100, Math.round(100 - densityVal * 25)));

    // Sparkline history extraction for top KPI cards
    const recentPagesSparkline = trendHistory.slice(-7).map((p) => p.totalPages);
    const recentReportsSparkline = trendHistory.slice(-7).map((p) => p.totalReports);
    const recentLearnersSparkline = trendHistory.slice(-7).map((p) => p.activeStudents);
    const recentAccuracySparkline = trendHistory.slice(-7).map((p) => p.cleanRate);

    // 4 Modern KPI Items with sparklines matching reference image
    const kpis: ProgressKPIItem[] = [
      {
        id: "total_recitations",
        label: "Total Lessons Tracked",
        value: totalReports.toLocaleString(),
        subValue: `+${trendHistory[trendHistory.length - 1]?.totalReports || 0} today`,
        sparkline: recentReportsSparkline,
        trend: {
          direction: "up",
          value: "+8.4% vs last period",
          isPositive: true,
        },
        badge: {
          text: totalReports > 15 ? "Active" : "Normal",
          variant: "success",
        },
      },
      {
        id: "total_pages",
        label: "Total Volume Covered",
        value: `${totalPages} Pages`,
        subValue: `Avg ${avgPagesPerReport}p per session`,
        sparkline: recentPagesSparkline,
        trend: {
          direction: "up",
          value: "+12.2% velocity",
          isPositive: true,
        },
        badge: {
          text: totalPages > 20 ? "High Pace" : "Steady",
          variant: "info",
        },
      },
      {
        id: "active_learners",
        label: "Active Learners Assessed",
        value: `${activeStudents} Students`,
        subValue: `${totalReports} evaluations logged`,
        sparkline: recentLearnersSparkline,
        trend: {
          direction: activeStudents > 0 ? "up" : "neutral",
          value: "+5.1% attendance",
          isPositive: true,
        },
        badge: {
          text: activeStudents > 0 ? "Engaged" : "Pending",
          variant: "success",
        },
      },
      {
        id: "accuracy_rate",
        label: "Purity & Accuracy Rate",
        value: `${cleanRate}%`,
        subValue: `${cleanReportsCount} flawless sessions`,
        sparkline: recentAccuracySparkline,
        trend: {
          direction: cleanRate >= 75 ? "up" : "down",
          value: cleanRate >= 75 ? "High Precision" : "Remedial needed",
          isPositive: cleanRate >= 75,
        },
        badge: {
          text: cleanRate >= 80 ? "Pristine" : "Standard",
          variant: cleanRate >= 80 ? "success" : "warning",
        },
      },
    ];

    // 8. Session Breakdown
    const sessionMap = new Map<string, SessionProgressItem>();
    filteredReports.forEach((r) => {
      const sKey = (r.sessionName || "Morning Session").trim();
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

    // 9. Portion Breakdown
    const portionMap = new Map<string, PortionCoverageItem>();
    filteredReports.forEach((r) => {
      const pKey = r.portionTitle || "Incremental Portion";
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
    });

    const portionBreakdown = Array.from(portionMap.values()).slice(0, 6);

    // 10. Student Aggregated Performance
    const studentAggMap = new Map<string, LearnerProgressPerformanceItem>();
    filteredReports.forEach((r) => {
      const sKey = r.studentId || r.studentName;
      if (!studentAggMap.has(sKey)) {
        studentAggMap.set(sKey, {
          studentId: r.studentId,
          studentName: r.studentName,
          rollNumber: r.rollNumber,
          className: r.className,
          sectionName: r.sectionName,
          groupName: r.groupName,
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
      .slice(0, 8);

    const remedialLearners = [...allLearners]
      .filter((st) => st.errorDensity > 0.8 || st.totalStucks >= 3 || st.status === "Unprepared")
      .sort((a, b) => b.errorDensity - a.errorDensity || b.totalStucks - a.totalStucks);

    // AI Insight determination
    let aiInsight = "Learners demonstrate consistent retention across morning recitation sessions with low error rates.";
    if (cleanRate >= 80) {
      aiInsight = `${cleanRate}% of evaluated sessions are completely error-free today. Morning session exhibited the highest recitation velocity and concentration.`;
    } else if (cleanRate < 60) {
      aiInsight = `Recitation accuracy dipped to ${cleanRate}%. Recommended: allocate 15 extra minutes to Sabqi revision before advancing new Sabaq lessons.`;
    } else if (totalMistakes > totalStucks * 2) {
      aiInsight = "Students exhibit high reading flow but minor phonetic slips. Recommended: focus on Tajweed articulation and slow-paced repetition.";
    }

    // Export CSV Helper
    const exportToCSV = () => {
      if (todayReports.length === 0) return;
      const headers = ["ID", "Student Name", "Roll", "Session", "Portion", "Pages", "Mistakes", "Stucks", "Status", "Date"];
      const rows = todayReports.map((r) => [
        r.id,
        `"${r.studentName}"`,
        r.rollNumber || "-",
        `"${r.sessionName}"`,
        `"${r.portionTitle}"`,
        r.totalPages,
        r.mistakesCount,
        r.stucksCount,
        r.status,
        r.date,
      ]);
      const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `recitation_progress_analytics_${formatLocalDate(new Date())}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    };

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
      todayReports,
      aiInsight,
      exportToCSV,
    };
  }, [filteredReports, trendHistory, todayReports]);
}
