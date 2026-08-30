import React, { useState, useMemo } from "react";
import CustomInput from "../../../../components/ui/CustomInput";
import CustomSelect from "../../../../components/ui/CustomSelect";
import CustomButton from "../../../../components/ui/CustomButton";
import ReusableCalendar from "../../../../components/common/ReusableCalendar";
import {
  SessionsIcon,
  CalendarIcon,
  PlusIcon,
  TrashIcon,
  SaveIcon,
  AlertCircleIcon,
} from "../../../../components/ui/Icons";
import { DrawerContainer, DrawerSection, DrawerFooter } from "../../../../components/layout";
import { academicYearsStore } from "../../../../utils/localStore";
import { getHijriDetails } from "../../../../utils/hijriUtils";
import { useTenant } from "../../../../context/TenantContext";

const TERM_SYSTEM_OPTIONS = [
  { value: "SEMESTER", label: "Semester System (2 Terms)" },
  { value: "TRIMESTER", label: "Trimester System (3 Terms)" },
  { value: "QUARTER", label: "Quarter System (4 Terms)" },
  { value: "ANNUAL", label: "Annual Session (1 Term)" },
  { value: "CUSTOM", label: "Custom Term System" },
];

/**
 * Helper to compute academic year label & Hijri year dynamically from dates
 */
function computeAcademicYearNames(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) {
    const cy = new Date().getFullYear();
    return { name: `${cy}-${cy + 1}`, hijri: "" };
  }

  try {
    const sYear = new Date(startDateStr).getFullYear();
    const eYear = new Date(endDateStr).getFullYear();
    const gregorianName = sYear === eYear ? String(sYear) : `${sYear}-${eYear}`;

    const sHijri = getHijriDetails(new Date(startDateStr));
    const eHijri = getHijriDetails(new Date(endDateStr));
    let hijriName = "";
    if (sHijri?.year && eHijri?.year) {
      hijriName =
        sHijri.year === eHijri.year
          ? `${sHijri.year} AH`
          : `${sHijri.year}-${eHijri.year} AH`;
    }

    return { name: gregorianName, hijri: hijriName };
  } catch {
    return { name: "", hijri: "" };
  }
}

function getNextDay(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  } catch {
    return "";
  }
}

function getPrevDay(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  } catch {
    return "";
  }
}

function checkRangeOverlap(start1, end1, start2, end2) {
  if (!start1 || !end1 || !start2 || !end2) return false;
  return start1 <= end2 && end1 >= start2;
}

/**
 * Enterprise Academic Year & Terms Drawer Form with Strict Date Guards
 * - Cross-Academic-Year Guard: prevents overlapping with other academic years
 * - Intra-Session Guard: terms cannot overlap each other and must stay within the academic year
 * - ReusableCalendar disabled ranges: disables unavailable days in the calendar UI
 */
export default function AcademicYearDrawerForm({
  year = null,
  onSave,
  onCancel,
}) {
  const { activeTenantId } = useTenant();

  // Load existing academic years for cross-session date guards
  const otherAcademicYears = useMemo(() => {
    const all = academicYearsStore.getAcademicYears(activeTenantId) || [];
    return all.filter((y) => !year || y.id !== year.id);
  }, [activeTenantId, year]);

  const disabledYearRanges = useMemo(() => {
    return otherAcademicYears.map((y) => ({
      startDate: y.startDate,
      endDate: y.endDate,
    }));
  }, [otherAcademicYears]);

  // Initialize form state
  const [formData, setFormData] = useState(() => {
    if (year) {
      return {
        id: year.id,
        startDate: year.startDate || "",
        endDate: year.endDate || "",
        termSystem: year.termSystem || "SEMESTER",
        terms: Array.isArray(year.terms)
          ? year.terms.map((t, idx) => ({
              id: t.id || `term_${Date.now()}_${idx}`,
              name: t.name || `Term ${idx + 1}`,
              startDate: t.startDate || "",
              endDate: t.endDate || "",
            }))
          : [],
      };
    }

    // New Academic Year suggestion
    const suggested = academicYearsStore.getSuggestedNextYear(activeTenantId);

    return {
      startDate: suggested.startDate,
      endDate: suggested.endDate,
      termSystem: suggested.termSystem,
      terms: suggested.terms,
    };
  });

  const [errors, setErrors] = useState({});

  // Dynamic Hijri & Gregorian representation calculated live from dates
  const computedMeta = useMemo(() => {
    return computeAcademicYearNames(formData.startDate, formData.endDate);
  }, [formData.startDate, formData.endDate]);

  // Handle date change
  const handleDateChange = (field, dateStr) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: dateStr };

      // If academic year start/end dates change, validate terms stay inside bounds
      if (field === "startDate" && next.terms.length > 0) {
        // Adjust 1st term start date if needed
        if (next.terms[0].startDate < dateStr) {
          next.terms[0].startDate = dateStr;
        }
      }
      if (field === "endDate" && next.terms.length > 0) {
        // Adjust last term end date if needed
        const lastIdx = next.terms.length - 1;
        if (next.terms[lastIdx].endDate > dateStr) {
          next.terms[lastIdx].endDate = dateStr;
        }
      }

      return next;
    });

    if (errors[field] || errors.general) {
      setErrors((prev) => ({ ...prev, [field]: null, general: null }));
    }
  };

  // Helper to generate term slots when term system is switched
  const handleTermSystemChange = (newSystem) => {
    const sDate = formData.startDate || `${new Date().getFullYear()}-01-01`;
    const eDate = formData.endDate || `${new Date().getFullYear()}-12-31`;
    const startY = sDate.slice(0, 4);

    let generatedTerms = [];
    if (newSystem === "SEMESTER") {
      generatedTerms = [
        { id: `term_${Date.now()}_1`, name: "1st Semester", startDate: sDate, endDate: `${startY}-06-30` },
        { id: `term_${Date.now()}_2`, name: "2nd Semester", startDate: `${startY}-07-01`, endDate: eDate },
      ];
    } else if (newSystem === "TRIMESTER") {
      generatedTerms = [
        { id: `term_${Date.now()}_1`, name: "1st Term", startDate: sDate, endDate: `${startY}-04-30` },
        { id: `term_${Date.now()}_2`, name: "2nd Term / Mid-Term", startDate: `${startY}-05-01`, endDate: `${startY}-08-31` },
        { id: `term_${Date.now()}_3`, name: "3rd Term / Final", startDate: `${startY}-09-01`, endDate: eDate },
      ];
    } else if (newSystem === "QUARTER") {
      generatedTerms = [
        { id: `term_${Date.now()}_1`, name: "1st Quarter (Q1)", startDate: sDate, endDate: `${startY}-03-31` },
        { id: `term_${Date.now()}_2`, name: "2nd Quarter (Q2)", startDate: `${startY}-04-01`, endDate: `${startY}-06-30` },
        { id: `term_${Date.now()}_3`, name: "3rd Quarter (Q3)", startDate: `${startY}-07-01`, endDate: `${startY}-09-30` },
        { id: `term_${Date.now()}_4`, name: "4th Quarter (Q4)", startDate: `${startY}-10-01`, endDate: eDate },
      ];
    } else if (newSystem === "ANNUAL") {
      generatedTerms = [
        { id: `term_${Date.now()}_1`, name: "Full Academic Year", startDate: sDate, endDate: eDate },
      ];
    } else {
      // CUSTOM
      generatedTerms = formData.terms.length > 0 ? formData.terms : [
        { id: `term_${Date.now()}_1`, name: "Term 1", startDate: sDate, endDate: `${startY}-06-30` },
        { id: `term_${Date.now()}_2`, name: "Term 2", startDate: `${startY}-07-01`, endDate: eDate },
      ];
    }

    setFormData((prev) => ({
      ...prev,
      termSystem: newSystem,
      terms: generatedTerms,
    }));
  };

  // Add individual custom term with automatic non-overlapping start date
  const handleAddTerm = () => {
    const idx = formData.terms.length + 1;
    const lastTerm = formData.terms[formData.terms.length - 1];
    const newStartDate = lastTerm?.endDate ? getNextDay(lastTerm.endDate) : formData.startDate || "";
    const newEndDate = formData.endDate || "";

    const newTerm = {
      id: `term_${Date.now()}_${idx}`,
      name: `Term ${idx}`,
      startDate: newStartDate <= newEndDate ? newStartDate : "",
      endDate: newEndDate,
    };
    setFormData((prev) => ({
      ...prev,
      terms: [...prev.terms, newTerm],
    }));
  };

  // Update specific term field
  const handleTermChange = (index, field, value) => {
    setFormData((prev) => {
      const nextTerms = [...prev.terms];
      nextTerms[index] = {
        ...nextTerms[index],
        [field]: value,
      };
      return { ...prev, terms: nextTerms };
    });

    if (errors[`term_${index}`] || errors[`term_${index}_overlap`]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[`term_${index}`];
        delete copy[`term_${index}_overlap`];
        return copy;
      });
    }
  };

  // Remove specific term
  const handleRemoveTerm = (index) => {
    if (formData.terms.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      terms: prev.terms.filter((_, i) => i !== index),
    }));
  };

  // Form submission with strict date guard validations
  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const newErrors = {};

    if (!formData.startDate) {
      newErrors.startDate = "Start date is required.";
    }
    if (!formData.endDate) {
      newErrors.endDate = "End date is required.";
    }
    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      newErrors.endDate = "End date cannot be before start date.";
    }

    // 1. Cross-Session Guard: Check if academic year overlaps with existing academic years
    if (formData.startDate && formData.endDate) {
      const overlapYear = otherAcademicYears.find((y) =>
        checkRangeOverlap(formData.startDate, formData.endDate, y.startDate, y.endDate)
      );
      if (overlapYear) {
        newErrors.general = `The selected date range (${formData.startDate} to ${formData.endDate}) overlaps with an existing academic year "${overlapYear.name}" (${overlapYear.startDate} to ${overlapYear.endDate}).`;
      }
    }

    // 2. Intra-Session Guard: Check term boundary validity & overlaps
    formData.terms.forEach((t, i) => {
      if (!t.name?.trim()) {
        newErrors[`term_${i}`] = `Term #${i + 1} name is required.`;
      }
      if (!t.startDate || !t.endDate) {
        newErrors[`term_${i}`] = `Start and End dates are required for ${t.name || `Term #${i + 1}`}.`;
      } else if (t.startDate > t.endDate) {
        newErrors[`term_${i}`] = `End date cannot be before start date in ${t.name}.`;
      } else if (formData.startDate && formData.endDate) {
        if (t.startDate < formData.startDate || t.endDate > formData.endDate) {
          newErrors[`term_${i}`] = `${t.name} dates must be within the academic year range (${formData.startDate} to ${formData.endDate}).`;
        }
      }
    });

    // 3. Check term vs term overlaps
    for (let i = 0; i < formData.terms.length; i++) {
      for (let j = i + 1; j < formData.terms.length; j++) {
        const t1 = formData.terms[i];
        const t2 = formData.terms[j];
        if (t1.startDate && t1.endDate && t2.startDate && t2.endDate) {
          if (checkRangeOverlap(t1.startDate, t1.endDate, t2.startDate, t2.endDate)) {
            newErrors[`term_${j}_overlap`] = `Term "${t2.name}" overlaps with "${t1.name}". Each semester/term must have unique, non-overlapping dates.`;
          }
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payload = {
      ...formData,
      name: computedMeta.name || "Academic Year",
    };

    if (onSave) {
      onSave(payload);
    }
  };

  return (
    <DrawerContainer padding="none" spacing="normal">
      <form onSubmit={handleSubmit} className="space-y-8 pt-3">
        {/* ─── 0. General Date Guard Error Alert ────────────────────── */}
        {errors.general && (
          <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-500 text-xs flex items-start gap-2 animate-fade-in shadow-2xs">
            <AlertCircleIcon className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 font-semibold leading-relaxed">{errors.general}</div>
          </div>
        )}

        {/* ─── 1. Auto-Generated Academic Year & Hijri Summary Banner ─── */}
        <div className="p-3.5 sm:p-4 rounded-2xl border theme-border theme-bg-sub/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl theme-bg-surface border theme-border flex items-center justify-center theme-accent shrink-0 shadow-xs">
              <SessionsIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
                Academic Year (Auto-Generated)
              </div>
              <div className="text-base sm:text-lg font-bold theme-text-primary truncate">
                {computedMeta.name || "Academic Session"}
              </div>
            </div>
          </div>

          {computedMeta.hijri && (
            <div className="self-start sm:self-center shrink-0">
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-xl theme-bg-surface border theme-border theme-accent shadow-2xs">
                Hijri: {computedMeta.hijri}
              </span>
            </div>
          )}
        </div>

        {/* ─── 2. Date Pickers with Date Guards & Term System Model ──── */}
        <DrawerSection
          title="Session Dates & Term System"
          icon={SessionsIcon}
          className="pt-1"
        >
          <div className="space-y-4">
            <div className="@container">
              <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4">
                <div>
                  <ReusableCalendar
                    label="Start Date"
                    selectedDate={formData.startDate}
                    onSelectDate={(d) => handleDateChange("startDate", d)}
                    disabledRanges={disabledYearRanges}
                    placeholder="Select Start Date..."
                  />
                  {errors.startDate && (
                    <p className="text-xs text-rose-500 font-medium mt-1">{errors.startDate}</p>
                  )}
                </div>

                <div>
                  <ReusableCalendar
                    label="End Date"
                    selectedDate={formData.endDate}
                    minDate={formData.startDate}
                    disabledRanges={disabledYearRanges}
                    onSelectDate={(d) => handleDateChange("endDate", d)}
                    placeholder="Select End Date..."
                    alignRight
                  />
                  {errors.endDate && (
                    <p className="text-xs text-rose-500 font-medium mt-1">{errors.endDate}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="w-full">
              <CustomSelect
                label="Term System Model"
                name="termSystem"
                value={formData.termSystem}
                onChange={(val) => handleTermSystemChange(val)}
                options={TERM_SYSTEM_OPTIONS}
              />
            </div>
          </div>
        </DrawerSection>

        {/* ─── 3. Terms / Semesters Breakdown List with Guards ──────── */}
        <DrawerSection
          title={`Terms & Semesters (${formData.terms.length})`}
          icon={CalendarIcon}
          headerRight={
            <CustomButton
              type="button"
              variant="soft"
              size="xs"
              icon={PlusIcon}
              onClick={handleAddTerm}
            >
              Add Term
            </CustomButton>
          }
        >
          {/* Multi-row term cards with individual Date Guards */}
          <div className="space-y-3 pt-1">
            {formData.terms.map((term, index) => {
              // Calculate date guards for this specific term
              const prevTerm = index > 0 ? formData.terms[index - 1] : null;
              const nextTerm = index < formData.terms.length - 1 ? formData.terms[index + 1] : null;

              const termMinStart = prevTerm?.endDate ? getNextDay(prevTerm.endDate) : formData.startDate;
              const termMaxStart = nextTerm?.startDate ? getPrevDay(nextTerm.startDate) : formData.endDate;

              const termMinEnd = term.startDate || formData.startDate;
              const termMaxEnd = nextTerm?.startDate ? getPrevDay(nextTerm.startDate) : formData.endDate;

              // Other terms ranges disabled for this term
              const otherTermRanges = formData.terms
                .filter((_, idx) => idx !== index)
                .map((t) => ({ startDate: t.startDate, endDate: t.endDate }));

              const termError = errors[`term_${index}`] || errors[`term_${index}_overlap`];

              return (
                <div
                  key={term.id || index}
                  className={`p-3.5 sm:p-4 rounded-xl border ${
                    termError ? "border-rose-500/50 bg-rose-500/[0.02]" : "theme-border theme-bg-surface"
                  } space-y-3 relative group shadow-2xs`}
                >
                  {/* Header: Term Index & Delete Button */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono font-bold theme-accent px-2.5 py-0.5 rounded-lg theme-bg-sub border theme-border">
                      Term #{index + 1}
                    </span>

                    {formData.terms.length > 1 && (
                      <CustomButton
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        icon={TrashIcon}
                        onClick={() => handleRemoveTerm(index)}
                        title="Remove Term"
                      />
                    )}
                  </div>

                  {/* Line 1: Term Name (Full Width) */}
                  <div className="w-full">
                    <CustomInput
                      label="Term Name"
                      value={term.name}
                      onChange={(val) => handleTermChange(index, "name", val)}
                      placeholder="e.g. 1st Semester"
                      required
                    />
                  </div>

                  {/* Line 2: Start Date & End Date (Guarded Container Grid) */}
                  <div className="@container">
                    <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3 items-start">
                      <div className="w-full">
                        <ReusableCalendar
                          label="Start Date"
                          selectedDate={term.startDate}
                          minDate={termMinStart}
                          maxDate={termMaxStart}
                          disabledRanges={otherTermRanges}
                          onSelectDate={(d) => handleTermChange(index, "startDate", d)}
                          placeholder="Start Date..."
                        />
                      </div>

                      <div className="w-full">
                        <ReusableCalendar
                          label="End Date"
                          selectedDate={term.endDate}
                          minDate={termMinEnd}
                          maxDate={termMaxEnd}
                          disabledRanges={otherTermRanges}
                          onSelectDate={(d) => handleTermChange(index, "endDate", d)}
                          placeholder="End Date..."
                          alignRight
                        />
                      </div>
                    </div>
                  </div>

                  {/* Term Error Message */}
                  {termError && (
                    <p className="text-xs text-rose-500 font-medium pt-1 flex items-center gap-1">
                      <AlertCircleIcon className="w-3 h-3 shrink-0" />
                      <span>{termError}</span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </DrawerSection>

        {/* ─── 4. Action Buttons ────────────────────────────────────── */}
        <DrawerFooter
          onCancel={onCancel}
          saveLabel={year ? "Update Academic Year" : "Save Academic Year"}
          saveIcon={SaveIcon}
        />
      </form>
    </DrawerContainer>
  );
}

