/**
 * Utility to generate formatted plain text report
 */
export function generateReportText({
  studentName = "",
  groupName = "",
  selectedSession = "",
  selectedDate = "",
  juzPageData = [],
  mistakeData = [],
  stuckData = [],
  comment = "",
  includeGroup = true,
  includeTeacher = true,
}) {
  // 1. Date Formatting (DD/MM/YYYY or MM/DD/YYYY)
  let formattedDate = "";
  if (selectedDate) {
    const d = new Date(selectedDate);
    if (!isNaN(d.getTime())) {
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const year = d.getFullYear();
      formattedDate = `${month}/${day}/${year}`;
    } else {
      formattedDate = selectedDate;
    }
  } else {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const year = d.getFullYear();
    formattedDate = `${month}/${day}/${year}`;
  }

  // 2. Extract Juz & Page Ranges
  const juzMap = new Map();
  juzPageData.forEach((row) => {
    if (!row.juz || row.juz.toString().trim() === "") return;
    const juzNum = row.juz.toString().trim();
    if (!juzMap.has(juzNum)) {
      juzMap.set(juzNum, []);
    }
    if (row.ranges && Array.isArray(row.ranges)) {
      row.ranges.forEach((r) => {
        const s = (r.start || "").toString().trim();
        const e = (r.end || "").toString().trim();
        if (s) {
          if (e && e !== s) {
            juzMap.get(juzNum).push(`${s}–${e}`);
          } else {
            juzMap.get(juzNum).push(s);
          }
        }
      });
    }
  });

  const validJuzs = Array.from(juzMap.keys());
  const isSingleJuz = validJuzs.length <= 1;

  // 3. Header Block
  let lines = [];
  lines.push("Student Daily Progress Report");
  lines.push(`Date: ${formattedDate}`);
  lines.push(`Student Name: ${studentName || "N/A"}`);
  lines.push("");

  // 4. Juz & Page Block
  if (validJuzs.length > 0) {
    lines.push(`Juz Number: ${validJuzs.join(", ")}`);
    if (isSingleJuz) {
      const juzNum = validJuzs[0];
      const rangesStr = juzMap.get(juzNum).join(", ") || "N/A";
      lines.push(`Page: ${rangesStr}`);
    } else {
      validJuzs.forEach((juzNum, idx) => {
        const rangesStr = juzMap.get(juzNum).join(", ") || "N/A";
        if (idx === 0) {
          lines.push(`Page: ${juzNum.padStart(1)}: ${rangesStr}`);
        } else {
          // Align under "Page: " label
          const indent = " ".repeat(11);
          lines.push(`${indent}${juzNum}: ${rangesStr}`);
        }
      });
    }
  } else {
    lines.push("Juz Number: N/A");
    lines.push("Page: N/A");
  }
  lines.push("");

  // Helper for mistake/stuck items formatting
  const countValidItems = (data) => {
    return data.reduce((total, row) => {
      if (!row.page || row.page.toString().trim() === "") return total;
      const validAyahs = row.ayahs.filter(a => a.value && a.value.toString().trim() !== "").length;
      return total + (validAyahs > 0 ? validAyahs : 0);
    }, 0);
  };

  const totalMistakes = countValidItems(mistakeData);
  const totalStuck = countValidItems(stuckData);

  // 5. Session Summary Block
  lines.push("Session Summary");
  lines.push(`Session Name: ${selectedSession || "N/A"}`);
  lines.push(`Mistake: ${totalMistakes}`);
  lines.push(`Stuck: ${totalStuck}`);
  lines.push("");

  // Helper to extract detail list grouped by juz
  const formatDetailSection = (title, data) => {
    const detailByJuz = new Map();

    data.forEach((row) => {
      if (!row.page || row.page.toString().trim() === "") return;
      const juzNum = (row.juz || validJuzs[0] || "").toString().trim();
      const pageStr = row.page.toString().trim();

      const validAyahs = (row.ayahs || [])
        .map((a) => (a.value || "").toString().trim())
        .filter((v) => v !== "");

      if (validAyahs.length === 0) return;

      if (!detailByJuz.has(juzNum)) {
        detailByJuz.set(juzNum, []);
      }

      validAyahs.forEach((ayahVal) => {
        detailByJuz.get(juzNum).push(`Page ${pageStr} Ayah ${ayahVal}`);
      });
    });

    if (detailByJuz.size === 0) return null;

    let resLines = [title];

    if (isSingleJuz || detailByJuz.size === 1) {
      // Single Juz format
      const entries = Array.from(detailByJuz.values())[0];
      entries.forEach((item) => {
        resLines.push(item);
      });
    } else {
      // Multiple Juz format
      detailByJuz.forEach((entries, juzNum) => {
        entries.forEach((item, idx) => {
          if (idx === 0) {
            resLines.push(`${juzNum}: ${item}`);
          } else {
            // Indent subsequent items under the juz prefix
            const padLen = juzNum.length + 2; // "3: " -> length is 3
            resLines.push(`${" ".repeat(padLen)}${item}`);
          }
        });
      });
    }

    return resLines.join("\n");
  };

  // 6. Mistake Section
  const mistakeStr = formatDetailSection("Mistake", mistakeData);
  if (mistakeStr) {
    lines.push(mistakeStr);
    lines.push("");
  }

  // 7. Stuck Section
  const stuckStr = formatDetailSection("Stuck", stuckData);
  if (stuckStr) {
    lines.push(stuckStr);
    lines.push("");
  }

  // 8. Comment Section
  if (comment && comment.trim()) {
    lines.push("Comment");
    lines.push(comment.trim());
    lines.push("");
  }

  // 9. Footer Group & Teacher Line
  // Rule: If Group Name is NOT included, Teacher Mention is also omitted!
  if (includeGroup) {
    let footerParts = [];
    if (includeTeacher) {
      footerParts.push("@Mustafa");
    }
    let groupStr = groupName ? groupName.trim() : "Ml Saqib's Group";
    if (!groupStr.toLowerCase().endsWith("group") && !groupStr.toLowerCase().includes("'s")) {
      groupStr = `${groupStr}'s Group`;
    }
    footerParts.push(`He's Student of ${groupStr}.`);

    if (footerParts.length > 0) {
      lines.push(footerParts.join(" "));
    }
  }

  return lines.join("\n");
}
