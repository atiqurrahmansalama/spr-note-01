import { useState, useEffect, useRef } from "react";
import { useToast } from "../../../context/ToastContext";
import { jsPDF } from "jspdf";
import { generateReportText, formatDate } from "../../../utils/reportGenerator";

export function useReportActions({ isOpen, onClose, reportData }) {
  const { showToast } = useToast();
  const shareDropdownRef = useRef(null);

  const [viewMode, setViewMode] = useState("TEXT"); // "TEXT" | "PDF"
  
  const [includeGroup, setIncludeGroup] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("spr_include_group");
      return saved !== null ? saved === "true" : true;
    }
    return true;
  });

  const [includeTeacher, setIncludeTeacher] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("spr_include_teacher");
      return saved !== null ? saved === "true" : true;
    }
    return true;
  });

  const [pdfFont, setPdfFont] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("spr_pdf_font");
      return saved || "Outfit";
    }
    return "Outfit";
  });

  const [isPdfBold, setIsPdfBold] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("spr_pdf_bold");
      return saved !== null ? saved === "true" : false;
    }
    return false;
  });

  const [isPdfItalic, setIsPdfItalic] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("spr_pdf_italic");
      return saved !== null ? saved === "true" : false;
    }
    return false;
  });

  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);

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
    });
  });

  const [isShareDropdownOpen, setIsShareDropdownOpen] = useState(false);
  const [showDiscardAlert, setShowDiscardAlert] = useState(false);

  // Sync checkboxes and style properties with LocalStorage
  useEffect(() => {
    localStorage.setItem("spr_include_group", includeGroup);
  }, [includeGroup]);

  useEffect(() => {
    localStorage.setItem("spr_include_teacher", includeTeacher);
  }, [includeTeacher]);

  useEffect(() => {
    localStorage.setItem("spr_pdf_font", pdfFont);
  }, [pdfFont]);

  useEffect(() => {
    localStorage.setItem("spr_pdf_bold", isPdfBold);
  }, [isPdfBold]);

  useEffect(() => {
    localStorage.setItem("spr_pdf_italic", isPdfItalic);
  }, [isPdfItalic]);

  // Synchronize generated text when settings/reportData change, if user is not manually editing
  const prevDataKey = `${isOpen}-${includeGroup}-${includeTeacher}-${JSON.stringify(reportData)}`;
  const [lastSyncKey, setLastSyncKey] = useState(prevDataKey);

  if (isOpen && !isEditing && lastSyncKey !== prevDataKey) {
    setLastSyncKey(prevDataKey);
    setCurrentText(
      generateReportText({
        ...reportData,
        includeGroup,
        includeTeacher,
      })
    );
  }

  // Click outside to close share dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (shareDropdownRef.current && !shareDropdownRef.current.contains(e.target)) {
        setIsShareDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handles closing modal safely with confirmation if user is editing
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
      } catch (err) {
        if (err.name !== "AbortError") {
          handleCopy();
        }
      }
    } else {
      handleCopy();
    }
  };

  // Canvas PDF Exporter matching PDF Preview typography & minimal white layout
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

      // Build structured lines & bold flags
      const items = [];
      items.push({ text: "Student Daily Progress Report", isTitle: true });
      items.push({ text: "" });

      items.push({ text: "Date: ", boldPrefix: "Date:", value: formattedDate });
      items.push({ text: "Student Name: ", boldPrefix: "Student Name:", value: studentName });
      items.push({ text: "" });

      // Juz and Page
      const juzMap = new Map();
      (juzPageData || []).forEach((row) => {
        if (!row.juz || row.juz.toString().trim() === "") return;
        const juzNum = row.juz.toString().trim();
        if (!juzMap.has(juzNum)) juzMap.set(juzNum, []);
        if (row.ranges && Array.isArray(row.ranges)) {
          row.ranges.forEach((r) => {
            const s = (r.start || "").toString().trim();
            const e = (r.end || "").toString().trim();
            if (s) juzMap.get(juzNum).push(e && e !== s ? `${s}-${e}` : s);
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

      // Session Summary
      const countValid = (data) =>
        (data || []).reduce((acc, r) => {
          if (!r.page || !r.page.toString().trim()) return acc;
          const v = (r.ayahs || []).filter((a) => a.value && a.value.toString().trim()).length;
          return acc + (v > 0 ? v : 0);
        }, 0);

      items.push({ text: "Session Summary", isHeader: true });
      items.push({ text: `Session Name: ${selectedSession}` });
      items.push({ text: `Mistake: ${countValid(mistakeData)}` });
      items.push({ text: `Stuck: ${countValid(stuckData)}` });
      items.push({ text: "" });

      // Mistake detail
      const getDetails = (data) => {
        const map = new Map();
        (data || []).forEach((r) => {
          if (!r.page || !r.page.toString().trim()) return;
          const j = (r.juz || validJuzs[0] || "").toString().trim();
          const p = r.page.toString().trim();
          const ay = (r.ayahs || []).map((a) => (a.value || "").toString().trim()).filter((v) => v !== "");
          if (ay.length === 0) return;
          if (!map.has(j)) map.set(j, []);
          ay.forEach((a) => map.get(j).push(`Page ${p} Ayah ${a}`));
        });
        return map;
      };

      const m = getDetails(mistakeData);
      if (m.size > 0) {
        items.push({ text: "Mistake", isHeader: true });
        if (isSingleJuz) {
          Array.from(m.values())[0].forEach((line) => items.push({ text: line }));
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
          Array.from(s.values())[0].forEach((line) => items.push({ text: line }));
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

      // Render items onto canvas with clean modern sans font
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
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

      const getFontStr = (size, isHeaderOrBold = false) => {
        let weight = "";
        if (isHeaderOrBold) {
          weight = "bold";
        } else if (isPdfBold) {
          weight = "bold";
        }
        let style = isPdfItalic ? "italic" : "";
        const parts = [style, weight, `${size}px`, `'${pdfFont}', sans-serif`].filter(Boolean);
        return parts.join(" ");
      };

      items.forEach((item) => {
        if (item.text === "") {
          currentY += 8;
          return;
        }

        if (item.isTitle) {
          ctx.font = getFontStr(20, true);
          ctx.fillStyle = "#0f172a";
          ctx.fillText(item.text, padding, currentY + 16);
          currentY += 30;
        } else if (item.isHeader) {
          ctx.font = getFontStr(16, true);
          ctx.fillStyle = "#0f172a";
          ctx.fillText(item.text, padding, currentY + 13);
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
          ctx.fillText(item.text, padding, currentY + 13);
          currentY += 20;
        } else {
          ctx.font = getFontStr(16, false);
          ctx.fillStyle = "#1e293b";
          ctx.fillText(item.text, padding, currentY + 13);
          currentY += 20;
        }
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "pt", [width, height]);
      pdf.addImage(imgData, "PNG", 0, 0, width, height);

      const filename = `${(studentName || "Student").replace(/\s+/g, "_")}_Report.pdf`;
      pdf.save(filename);
      showToast("PDF downloaded successfully!", "success");
    } catch (err) {
      showToast("Failed to generate PDF: " + err.message, "error");
    }
  };

  // Image Exporter in minimal white PDF document style
  const handleExportImage = () => {
    setIsShareDropdownOpen(false);
    showToast("Generating Image...", "info");
    try {
      const lines = currentText.split("\n");
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      const fontSize = 15;
      const lineHeight = 22;
      const padding = 32;

      const getFontStr = (size, isHeaderOrBold = false) => {
        let weight = "";
        if (isHeaderOrBold) {
          weight = "bold";
        } else if (isPdfBold) {
          weight = "bold";
        }
        let style = isPdfItalic ? "italic" : "";
        const parts = [style, weight, `${size}px`, `'${pdfFont}', sans-serif`].filter(Boolean);
        return parts.join(" ");
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

      // Clean Minimal White Background
      ctx.fillStyle = "#fafafa";
      ctx.fillRect(0, 0, width, height);

      // Frame Border
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1;
      ctx.strokeRect(12, 12, width - 24, height - 24);

      // Text Lines
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
      link.download = `${(reportData.studentName || "Student").replace(/\s+/g, "_")}_Report.png`;
      link.click();

      showToast("Image downloaded successfully!", "success");
    } catch (err) {
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
    pdfFont,
    setPdfFont,
    isPdfBold,
    setIsPdfBold,
    isPdfItalic,
    setIsPdfItalic,
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
