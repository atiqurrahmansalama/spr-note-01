import { useState, useEffect, useRef } from "react";
import { useToast } from "../../../../../context/ToastContext";
import { jsPDF } from "jspdf";
import { generateReportText, formatDate } from "../../../../../utils/reportGenerator";
import { useFeatureControl } from "../../../../../context/FeatureControlContext";
import { DailyProgressData, DetailRowData } from "../types";

export interface UseReportActionsProps {
  isOpen: boolean;
  onClose: () => void;
  reportData?: DailyProgressData;
}

export function useReportActions({ isOpen, onClose, reportData }: UseReportActionsProps) {
  const { showToast } = useToast();
  const shareDropdownRef = useRef<HTMLDivElement | null>(null);
  const { isFeatureEnabled } = useFeatureControl();

  const [viewMode, setViewMode] = useState<"TEXT" | "PDF">("TEXT");

  const [includeGroup, setIncludeGroup] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("spr_include_group");
      return saved !== null ? saved === "true" : true;
    }
    return true;
  });

  const [includeTeacher, setIncludeTeacher] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("spr_include_teacher");
      return saved !== null ? saved === "true" : true;
    }
    return true;
  });

  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const featureConfig = {
    headerDate: isFeatureEnabled("headerDate"),
    studentSelect: isFeatureEnabled("studentSelect"),
    sessionSelect: isFeatureEnabled("sessionSelect"),
    juzPageInput: isFeatureEnabled("juzPageInput"),
    mistakeTracker: isFeatureEnabled("mistakeTracker"),
    stuckTracker: isFeatureEnabled("stuckTracker"),
    commentSection: isFeatureEnabled("commentSection"),
  };

  const [currentText, setCurrentText] = useState(() => {
    let initGroup = true;
    let initTeacher = true;
    if (typeof window !== "undefined") {
      const g = localStorage.getItem("spr_include_group");
      if (g !== null) initGroup = g === "true";
      const t = localStorage.getItem("spr_include_teacher");
      if (t !== null) initTeacher = t === "true";
    }
    return generateReportText({
      ...reportData,
      includeGroup: initGroup,
      includeTeacher: initTeacher,
      featureConfig,
    });
  });

  const [isShareDropdownOpen, setIsShareDropdownOpen] = useState(false);
  const [showDiscardAlert, setShowDiscardAlert] = useState(false);

  // Sync checkboxes with LocalStorage
  useEffect(() => {
    localStorage.setItem("spr_include_group", String(includeGroup));
  }, [includeGroup]);

  useEffect(() => {
    localStorage.setItem("spr_include_teacher", String(includeTeacher));
  }, [includeTeacher]);

  // Synchronize generated text when settings/reportData/featureConfig change
  const prevDataKey = `${isOpen}-${includeGroup}-${includeTeacher}-${JSON.stringify(reportData)}-${JSON.stringify(featureConfig)}`;
  const [lastSyncKey, setLastSyncKey] = useState(prevDataKey);

  if (isOpen && !isEditing && lastSyncKey !== prevDataKey) {
    setLastSyncKey(prevDataKey);
    setCurrentText(
      generateReportText({
        ...reportData,
        includeGroup,
        includeTeacher,
        featureConfig,
      })
    );
  }

  // Click outside to close share dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (shareDropdownRef.current && !shareDropdownRef.current.contains(e.target as Node)) {
        setIsShareDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAttemptClose = () => {
    if (isEditing) {
      setShowDiscardAlert(true);
    } else {
      onClose();
    }
  };

  const handleConfirmDiscard = () => {
    setShowDiscardAlert(false);
    setIsEditing(false);
    onClose();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentText);
      setCopied(true);
      showToast("Report text copied to clipboard!", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("Failed to copy report text", "error");
    }
  };

  const handleShareText = async () => {
    setIsShareDropdownOpen(false);
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Student Daily Progress Report",
          text: currentText,
        });
        showToast("Report shared successfully!", "success");
      } catch (err: any) {
        if (err.name !== "AbortError") {
          handleCopy();
        }
      }
    } else {
      handleCopy();
    }
  };

  const handleDownloadPdfFile = () => {
    showToast("Generating PDF...", "info");
    try {
      const {
        studentName = "N/A",
        groupName = "",
        selectedSession = "N/A",
        selectedDate = "",
        juzPageData = [],
        mistakeData = [],
        stuckData = [],
        comment = "",
      } = reportData || {};

      const formattedDate = formatDate(selectedDate);

      const items: Array<{ text?: string; isTitle?: boolean; isHeader?: boolean; isBold?: boolean; boldPrefix?: string; value?: string }> = [];
      items.push({ text: "Student Daily Progress Report", isTitle: true });
      items.push({ text: "" });

      items.push({ text: "Date: ", boldPrefix: "Date:", value: formattedDate });
      items.push({ text: "Student Name: ", boldPrefix: "Student Name:", value: studentName });
      items.push({ text: "" });

      // Juz and Page
      const juzMap = new Map<string, string[]>();
      (juzPageData || []).forEach((row) => {
        if (!row.juz || String(row.juz).trim() === "") return;
        const juzNum = String(row.juz).trim();
        if (!juzMap.has(juzNum)) juzMap.set(juzNum, []);
        if (row.ranges && Array.isArray(row.ranges)) {
          row.ranges.forEach((r) => {
            const s = (r.start || "").toString().trim();
            const e = (r.end || "").toString().trim();
            if (s) juzMap.get(juzNum)?.push(e && e !== s ? `${s}-${e}` : s);
          });
        }
      });
      const validJuzs = Array.from(juzMap.keys());
      const isSingleJuz = validJuzs.length <= 1;

      if (validJuzs.length > 0) {
        items.push({ boldPrefix: "Juz Number:", value: validJuzs.join(", ") });
        if (isSingleJuz) {
          const rangesStr = juzMap.get(validJuzs[0])?.join(", ") || "N/A";
          items.push({ boldPrefix: "Page:", value: rangesStr });
        } else {
          items.push({ text: "Page:", isBold: true });
          validJuzs.forEach((j) => {
            items.push({ text: `  ${j}: ${juzMap.get(j)?.join(", ") || "N/A"}` });
          });
        }
      } else {
        items.push({ text: "Juz Number: N/A" });
        items.push({ text: "Page: N/A" });
      }
      items.push({ text: "" });

      const countValid = (data?: DetailRowData[]) =>
        (data || []).reduce((acc, r) => {
          if (!r.page || !String(r.page).trim()) return acc;
          const v = (r.ayahs || []).filter((a) => a.value && String(a.value).trim()).length;
          return acc + (v > 0 ? v : 0);
        }, 0);

      items.push({ text: "Session Summary", isHeader: true });
      items.push({ text: `Session Name: ${selectedSession}` });
      items.push({ text: `Mistake: ${countValid(mistakeData)}` });
      items.push({ text: `Stuck: ${countValid(stuckData)}` });
      items.push({ text: "" });

      const getDetails = (data?: DetailRowData[]) => {
        const map = new Map<string, string[]>();
        (data || []).forEach((r) => {
          if (!r.page || !String(r.page).trim()) return;
          const j = (r.juz || validJuzs[0] || "").toString().trim();
          const p = String(r.page).trim();
          const ay = (r.ayahs || []).map((a) => String(a.value || "").trim()).filter((v) => v !== "");
          if (ay.length === 0) return;
          if (!map.has(j)) map.set(j, []);
          ay.forEach((a) => map.get(j)?.push(`Page ${p} Ayah ${a}`));
        });
        return map;
      };

      const m = getDetails(mistakeData);
      if (m.size > 0) {
        items.push({ text: "Mistake", isHeader: true });
        if (isSingleJuz) {
          Array.from(m.values())[0]?.forEach((line) => items.push({ text: line }));
        } else {
          m.forEach((list, j) => {
            items.push({ text: `${j}:`, isBold: true });
            list.forEach((line) => items.push({ text: `      ${line}` }));
          });
        }
        items.push({ text: "" });
      }

      const s = getDetails(stuckData);
      if (s.size > 0) {
        items.push({ text: "Stuck", isHeader: true });
        if (isSingleJuz) {
          Array.from(s.values())[0]?.forEach((line) => items.push({ text: line }));
        } else {
          s.forEach((list, j) => {
            items.push({ text: `${j}:`, isBold: true });
            list.forEach((line) => items.push({ text: `      ${line}` }));
          });
        }
        items.push({ text: "" });
      }

      if (comment && comment.trim()) {
        items.push({ text: "Comment", isHeader: true });
        items.push({ text: comment.trim() });
        items.push({ text: "" });
      }

      if (includeGroup) {
        let gStr = groupName ? groupName.trim() : "Ml Saqib's Group";
        if (!gStr.toLowerCase().endsWith("group") && !gStr.toLowerCase().includes("'s")) {
          gStr = `${gStr}'s Group`;
        }
        items.push({ text: `He's Student of ${gStr}.` });
      }

      // Render items onto canvas
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const width = 595;
      const padding = 40;
      const scale = 2;

      let height = padding * 2;
      items.forEach((item) => {
        if (item.text === "") height += 8;
        else if (item.isTitle) height += 30;
        else if (item.isHeader) height += 24;
        else height += 20;
      });

      canvas.width = width * scale;
      canvas.height = height * scale;
      ctx.scale(scale, scale);

      ctx.fillStyle = "#fafafa";
      ctx.fillRect(0, 0, width, height);

      let currentY = padding;

      const getFontStr = (size: number, isBold = false) => {
        return `${isBold ? "bold " : ""}${size}px 'Outfit', sans-serif`;
      };

      items.forEach((item) => {
        if (item.text === "") {
          currentY += 8;
          return;
        }

        if (item.isTitle) {
          ctx.font = getFontStr(20, true);
          ctx.fillStyle = "#0f172a";
          ctx.fillText(item.text || "", padding, currentY + 16);
          currentY += 30;
        } else if (item.isHeader) {
          ctx.font = getFontStr(16, true);
          ctx.fillStyle = "#0f172a";
          ctx.fillText(item.text || "", padding, currentY + 13);
          currentY += 24;
        } else if (item.boldPrefix) {
          ctx.font = getFontStr(16, true);
          ctx.fillStyle = "#0f172a";
          const prefixWidth = ctx.measureText(item.boldPrefix).width;
          ctx.fillText(item.boldPrefix, padding, currentY + 13);
          ctx.font = getFontStr(16, false);
          ctx.fillStyle = "#1e293b";
          ctx.fillText(` ${item.value}`, padding + prefixWidth, currentY + 13);
          currentY += 20;
        } else if (item.isBold) {
          ctx.font = getFontStr(16, true);
          ctx.fillStyle = "#0f172a";
          ctx.fillText(item.text || "", padding, currentY + 13);
          currentY += 20;
        } else {
          ctx.font = getFontStr(16, false);
          ctx.fillStyle = "#1e293b";
          ctx.fillText(item.text || "", padding, currentY + 13);
          currentY += 20;
        }
      });

      const qrNoteY = currentY + 10;
      ctx.font = "11px 'Outfit', sans-serif";
      ctx.fillStyle = "#94a3b8";
      ctx.fillText("Scan QR code on PDF preview to verify authenticity.", padding, qrNoteY + 11);

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "pt", [width, height]);
      pdf.addImage(imgData, "PNG", 0, 0, width, height);

      const filename = `${(studentName || "Student").replace(/\s+/g, "_")}_Report.pdf`;
      pdf.save(filename);
      showToast("PDF downloaded successfully!", "success");
    } catch (err: any) {
      showToast("Failed to generate PDF: " + err.message, "error");
    }
  };

  const handleExportImage = () => {
    setIsShareDropdownOpen(false);
    showToast("Generating Image...", "info");
    try {
      const lines = currentText.split("\n");
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const fontSize = 15;
      const lineHeight = 22;
      const padding = 32;

      const getFontStr = (size: number, isBold = false) => {
        return `${isBold ? "bold " : ""}${size}px 'Outfit', sans-serif`;
      };

      ctx.font = getFontStr(fontSize, false);
      let maxLineWidth = 0;
      lines.forEach((l) => {
        const w = ctx.measureText(l).width;
        if (w > maxLineWidth) maxLineWidth = w;
      });

      const width = Math.max(480, maxLineWidth + padding * 2);
      const height = lines.length * lineHeight + padding * 2 + 10;

      const scale = 2;
      canvas.width = width * scale;
      canvas.height = height * scale;

      ctx.scale(scale, scale);

      ctx.fillStyle = "#fafafa";
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1;
      ctx.strokeRect(12, 12, width - 24, height - 24);

      lines.forEach((line, index) => {
        const y = padding + index * lineHeight + fontSize - 4;
        const trimmed = line.trim();

        if (index === 0 || trimmed === "Session Summary" || trimmed === "Mistake" || trimmed === "Stuck" || trimmed === "Comment") {
          ctx.font = getFontStr(index === 0 ? 19 : 15, true);
          ctx.fillStyle = "#0f172a";
        } else if (line.startsWith("Date:") || line.startsWith("Student Name:") || line.startsWith("Juz Number:") || line.startsWith("Page:")) {
          ctx.font = getFontStr(fontSize, true);
          ctx.fillStyle = "#0f172a";
        } else {
          ctx.font = getFontStr(fontSize, false);
          ctx.fillStyle = "#1e293b";
        }

        ctx.fillText(line, padding, y);
      });

      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${(reportData?.studentName || "Student").replace(/\s+/g, "_")}_Report.png`;
      link.click();

      showToast("Image downloaded successfully!", "success");
    } catch (err: any) {
      showToast("Failed to export Image: " + err.message, "error");
    }
  };

  return {
    viewMode,
    setViewMode,
    includeGroup,
    setIncludeGroup,
    includeTeacher,
    setIncludeTeacher,
    isEditing,
    setIsEditing,
    copied,
    currentText,
    setCurrentText,
    isShareDropdownOpen,
    setIsShareDropdownOpen,
    showDiscardAlert,
    setShowDiscardAlert,
    shareDropdownRef,
    handleAttemptClose,
    handleConfirmDiscard,
    handleCopy,
    handleShareText,
    handleDownloadPdfFile,
    handleExportImage,
  };
}
