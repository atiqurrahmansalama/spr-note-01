/**
 * SPR Note — Admission Store
 * ============================
 * Admission policies, branch & gender rules, previous classes taxonomy,
 * and class-wise document requirements.
 */

import { readJSON, writeJSON } from "./coreStore";
import { academicYearsStore } from "./academicStore";

// ─── Class Admission Document Requirements Store ─────────────────────────────

export const DEFAULT_ADMISSION_REQUIREMENTS = [
  {
    id: "req_primary_general",
    name: "Primary & Hifz Admission (Class 1-5, Nazera, Hifz)",
    name_bn: "প্রাথমিক ও হিফজ ভর্তি (১ম-৫ম শ্রেণি, নাজেরা ও হিফজুল কুরআন)",
    code: "PRIMARY_HIFZ_REQ",
    target_class_pattern: "ALL_PRIMARY_HIFZ",
    applicable_class_id: "ALL",
    required_docs: [
      "Birth Registration Certificate (BRN)",
      "Guardian National ID (NID)",
    ],
    order: 1,
    description: "Standard identification documentation for foundational and Quran memorization admissions",
    is_active: true,
  },
  {
    id: "req_secondary_higher",
    name: "Secondary & Higher Kitab Admission (Class 6-10, Alim, Fazil, Dawra)",
    name_bn: "মাধ্যমিক ও উচ্চতর কিতাব বিভাগ (৬ষ্ঠ-১০ম শ্রেণি, আলিম, ফাজিল ও দাওরা)",
    code: "SECONDARY_HIGHER_REQ",
    target_class_pattern: "SECONDARY_HIGHER",
    applicable_class_id: "ALL",
    required_docs: [
      "Birth Registration Certificate (BRN)",
      "Guardian National ID (NID)",
      "Previous Academy Transfer Certificate (TC)",
      "Previous Exam Marksheet / Academic Transcript",
    ],
    order: 2,
    description: "Requires previous academy release certificate (TC) and previous exam marksheets in addition to standard identity credentials",
    is_active: true,
  },
];

export const classAdmissionRequirementsStore = {
  getRequirements: (tenantId) => {
    const key = `spr_admission_doc_reqs_${tenantId || 'default'}`;
    const raw = readJSON(key, null);
    if (!raw || !Array.isArray(raw) || raw.length === 0) {
      writeJSON(key, DEFAULT_ADMISSION_REQUIREMENTS);
      return DEFAULT_ADMISSION_REQUIREMENTS;
    }
    return raw.sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99));
  },
  saveRequirements: (tenantId, reqs) => {
    const key = `spr_admission_doc_reqs_${tenantId || 'default'}`;
    const sorted = [...reqs].sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99));
    writeJSON(key, sorted);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent("spr_admission_doc_reqs_updated", { detail: sorted }));
    }
    return sorted;
  },
  addRequirement: (tenantId, reqData) => {
    const list = classAdmissionRequirementsStore.getRequirements(tenantId);
    const code = (reqData.code || reqData.name || "").toUpperCase().replace(/[^A-Z0-9_]/g, "_").slice(0, 30);
    const docs = Array.isArray(reqData.required_docs)
      ? reqData.required_docs
      : (typeof reqData.required_docs === 'string'
          ? reqData.required_docs.split(',').map((s) => s.trim()).filter(Boolean)
          : []);
    const singleClassId = reqData.applicable_class_id || (Array.isArray(reqData.applicable_class_ids) ? reqData.applicable_class_ids[0] : "ALL");

    const newReq = {
      ...reqData,
      id: reqData.id || `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      code: code || `REQ_${Date.now()}`,
      name: reqData.name || code,
      name_bn: reqData.name_bn || "",
      applicable_class_id: singleClassId || "ALL",
      required_docs: docs.length > 0 ? docs : ["Birth Registration Certificate (BRN)", "Guardian National ID (NID)"],
      order: reqData.order !== undefined ? Number(reqData.order) : list.length + 1,
      description: reqData.description || "",
      is_active: reqData.is_active !== undefined ? reqData.is_active : true,
      createdAt: new Date().toISOString(),
    };
    const updated = [...list, newReq];
    classAdmissionRequirementsStore.saveRequirements(tenantId, updated);
    return newReq;
  },
  updateRequirement: (tenantId, id, updatedData) => {
    const list = classAdmissionRequirementsStore.getRequirements(tenantId);
    const updated = list.map((r) =>
      r.id === id || r.code === id
        ? {
            ...r,
            ...updatedData,
            id: r.id,
            code: r.code,
            applicable_class_id: updatedData.applicable_class_id !== undefined
              ? (updatedData.applicable_class_id || "ALL")
              : (r.applicable_class_id || (Array.isArray(r.applicable_class_ids) ? r.applicable_class_ids[0] : "ALL")),
            required_docs: Array.isArray(updatedData.required_docs)
              ? updatedData.required_docs
              : (typeof updatedData.required_docs === 'string'
                  ? updatedData.required_docs.split(',').map((s) => s.trim()).filter(Boolean)
                  : r.required_docs),
            order: updatedData.order !== undefined ? Number(updatedData.order) : r.order,
            updatedAt: new Date().toISOString(),
          }
        : r
    );
    classAdmissionRequirementsStore.saveRequirements(tenantId, updated);
    return updated;
  },
  deleteRequirement: (tenantId, id) => {
    const list = classAdmissionRequirementsStore.getRequirements(tenantId);
    const updated = list.filter((r) => r.id !== id && r.code !== id);
    classAdmissionRequirementsStore.saveRequirements(tenantId, updated);
    return updated;
  },
  resetToDefaults: (tenantId) => {
    return classAdmissionRequirementsStore.saveRequirements(tenantId, DEFAULT_ADMISSION_REQUIREMENTS);
  },
  getRequiredDocsForClass: (tenantId, classId, className = "") => {
    const reqs = classAdmissionRequirementsStore.getRequirements(tenantId);
    const activeReqs = reqs.filter((r) => r.is_active !== false);
    if (activeReqs.length === 0) {
      return ["Birth Registration Certificate (BRN)", "Guardian National ID (NID)"];
    }

    if (classId) {
      const directMatch = activeReqs.find((r) => {
        const targetId = r.applicable_class_id || (Array.isArray(r.applicable_class_ids) ? r.applicable_class_ids[0] : null);
        return targetId && String(targetId) === String(classId);
      });
      if (directMatch && Array.isArray(directMatch.required_docs) && directMatch.required_docs.length > 0) {
        return directMatch.required_docs;
      }
    }

    const cNameLower = (className || "").toLowerCase();
    const isHigher = /6|7|8|9|10|alim|fazil|kamil|dawra|hsc|ssc|ten|nine|eight|seven|six|উচ্চ|মাস্টার্স|স্নাতক|ফাজিল|দাওরা/.test(cNameLower);

    if (isHigher) {
      const secondaryRule = activeReqs.find(
        (r) =>
          r.code?.includes("SECONDARY") ||
          r.name?.toLowerCase().includes("secondary") ||
          r.target_class_pattern === "SECONDARY_HIGHER"
      );
      if (secondaryRule && Array.isArray(secondaryRule.required_docs) && secondaryRule.required_docs.length > 0) {
        return secondaryRule.required_docs;
      }
    }

    const primaryRule = activeReqs.find(
      (r) =>
        r.code?.includes("PRIMARY") ||
        r.name?.toLowerCase().includes("primary") ||
        r.target_class_pattern === "ALL_PRIMARY_HIFZ"
    );
    if (primaryRule && Array.isArray(primaryRule.required_docs) && primaryRule.required_docs.length > 0) {
      return primaryRule.required_docs;
    }

    const generalRule = activeReqs.find((r) => !r.applicable_class_id || r.applicable_class_id === "ALL");
    if (generalRule && Array.isArray(generalRule.required_docs) && generalRule.required_docs.length > 0) {
      return generalRule.required_docs;
    }

    return activeReqs[0]?.required_docs || ["Birth Registration Certificate (BRN)", "Guardian National ID (NID)"];
  },
};

// ─── Admission Settings & Policies Store ─────────────────────────────────────

export const DEFAULT_PREVIOUS_CLASSES = [
  "Play / Nursery",
  "KG (Kindergarten)",
  "Class 1",
  "Class 2",
  "Class 3",
  "Class 4",
  "Class 5",
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9",
  "Class 10",
  "Nazera",
  "Hifz (1-5 Para)",
  "Hifz (6-15 Para)",
  "Hifz (16-25 Para)",
  "Hifz (26-30 Para / Completed)",
  "Qirat",
  "Kitab (Ibtidaiyah)",
  "Kitab (Mutawassitah)",
  "Kitab (Sanawiyyah)",
  "Fazilat / Dawrah Hadith",
  "None / First Admission",
];

const DEFAULT_ADMISSION_SETTINGS = {
  ongoing_academic_year_mode: "AUTO",
  ongoing_academic_year_id: "AUTO",
  ongoing_academic_year_name: "",
  allowed_admission_years: [],
  branch_admission_mode: "ALL",
  allowed_admission_branches: [],
  gender_policy: "BRANCH_SPECIFIC",
  branch_gender_rules: {},
  mother_info_visibility: "VISIBLE",
  branch_mother_info_rules: {},
  department_admission_mode: "ALL",
  allowed_admission_departments: [],
  branch_department_rules: {},
  class_admission_mode: "ALL",
  allowed_admission_classes: [],
  branch_class_rules: {},
  previous_classes_list: DEFAULT_PREVIOUS_CLASSES,
};

export const admissionSettingsStore = {
  getSettings: (tenantId) => {
    const key = `spr_admission_settings_${tenantId || 'default'}`;
    const raw = readJSON(key, null);
    if (!raw || typeof raw !== 'object') {
      return { ...DEFAULT_ADMISSION_SETTINGS };
    }
    return {
      ...DEFAULT_ADMISSION_SETTINGS,
      ...raw,
      allowed_admission_years: Array.isArray(raw.allowed_admission_years) ? raw.allowed_admission_years : [],
      branch_admission_mode: raw.branch_admission_mode || 'ALL',
      allowed_admission_branches: Array.isArray(raw.allowed_admission_branches) ? raw.allowed_admission_branches : [],
      branch_gender_rules: { ...DEFAULT_ADMISSION_SETTINGS.branch_gender_rules, ...(raw.branch_gender_rules || {}) },
      branch_mother_info_rules: { ...DEFAULT_ADMISSION_SETTINGS.branch_mother_info_rules, ...(raw.branch_mother_info_rules || {}) },
      allowed_admission_departments: Array.isArray(raw.allowed_admission_departments) ? raw.allowed_admission_departments : [],
      branch_department_rules: { ...DEFAULT_ADMISSION_SETTINGS.branch_department_rules, ...(raw.branch_department_rules || {}) },
      allowed_admission_classes: Array.isArray(raw.allowed_admission_classes) ? raw.allowed_admission_classes : [],
      branch_class_rules: { ...DEFAULT_ADMISSION_SETTINGS.branch_class_rules, ...(raw.branch_class_rules || {}) },
      previous_classes_list: Array.isArray(raw.previous_classes_list) && raw.previous_classes_list.length > 0 ? raw.previous_classes_list : DEFAULT_PREVIOUS_CLASSES,
    };
  },

  getPreviousClasses: (tenantId) => {
    const settings = admissionSettingsStore.getSettings(tenantId);
    return Array.isArray(settings.previous_classes_list) && settings.previous_classes_list.length > 0
      ? settings.previous_classes_list
      : DEFAULT_PREVIOUS_CLASSES;
  },

  savePreviousClasses: (tenantId, classesList) => {
    const settings = admissionSettingsStore.getSettings(tenantId);
    const updated = {
      ...settings,
      previous_classes_list: Array.isArray(classesList) ? classesList : DEFAULT_PREVIOUS_CLASSES,
    };
    return admissionSettingsStore.saveSettings(tenantId, updated);
  },

  saveSettings: (tenantId, settings) => {
    const key = `spr_admission_settings_${tenantId || 'default'}`;
    const safeSettings = {
      ...DEFAULT_ADMISSION_SETTINGS,
      ...(settings || {}),
      updatedAt: new Date().toISOString(),
    };
    writeJSON(key, safeSettings);

    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('spr_admission_settings_updated', { detail: safeSettings }));
      }
    } catch {}

    return safeSettings;
  },

  getAllowedAdmissionBranches: (tenantId, allBranches = []) => {
    const settings = admissionSettingsStore.getSettings(tenantId);
    const mode = settings.branch_admission_mode || 'ALL';
    if (mode === 'ALL') {
      return allBranches;
    }
    const allowed = Array.isArray(settings.allowed_admission_branches) ? settings.allowed_admission_branches : [];
    if (allowed.length === 0) return allBranches;
    return allBranches.filter((b) => allowed.map(String).includes(String(b.id)));
  },

  getAllowedAdmissionYears: (tenantId) => {
    const settings = admissionSettingsStore.getSettings(tenantId);
    const academicYears = academicYearsStore.getAcademicYears(tenantId);
    const activeYear = academicYearsStore.getActiveYear(tenantId);
    const allowed = Array.isArray(settings.allowed_admission_years) ? settings.allowed_admission_years : [];

    if (allowed.length === 0) {
      return activeYear ? [activeYear] : academicYears;
    }

    const matchedMap = new Map();

    if (allowed.includes("ACTIVE_YEAR") || allowed.includes("AUTO")) {
      if (activeYear) {
        matchedMap.set(String(activeYear.id), activeYear);
      }
    }

    academicYears.forEach((ay) => {
      if (allowed.includes(ay.id) || allowed.includes(ay.name)) {
        matchedMap.set(String(ay.id), ay);
      }
    });

    const result = Array.from(matchedMap.values());
    return result.length > 0 ? result : (activeYear ? [activeYear] : academicYears);
  },

  getActiveAdmissionYear: (tenantId) => {
    const academicYears = academicYearsStore.getAcademicYears(tenantId);
    const activeYear = academicYearsStore.getActiveYear(tenantId);
    const allowedYears = admissionSettingsStore.getAllowedAdmissionYears(tenantId);

    if (activeYear && allowedYears.some((ay) => String(ay.id) === String(activeYear.id) || String(ay.name) === String(activeYear.name))) {
      return activeYear;
    }

    return allowedYears[0] || activeYear || academicYears[0] || null;
  },

  getAllowedAdmissionDepartments: (tenantId, branchId = null, allDepartments = []) => {
    const settings = admissionSettingsStore.getSettings(tenantId);
    const mode = settings.department_admission_mode || 'ALL';

    let candidateDepts = allDepartments;
    if (branchId) {
      candidateDepts = allDepartments.filter((d) => {
        const bVal = d.branch !== undefined && d.branch !== null ? d.branch : d.branch_id;
        const bId = bVal && typeof bVal === 'object' ? bVal.id : bVal;
        return !bId || String(bId) === String(branchId);
      });
    }

    if (mode === 'ALL') {
      return candidateDepts;
    }

    if (mode === 'SPECIFIC') {
      const allowed = Array.isArray(settings.allowed_admission_departments) ? settings.allowed_admission_departments : [];
      if (allowed.length === 0) return candidateDepts;
      return candidateDepts.filter((d) => allowed.map(String).includes(String(d.id)));
    }

    if (mode === 'BRANCH_SPECIFIC' && branchId) {
      const branchRules = settings.branch_department_rules || {};
      const allowed = Array.isArray(branchRules[branchId]) ? branchRules[branchId] : [];
      if (allowed.length === 0) return candidateDepts;
      return candidateDepts.filter((d) => allowed.map(String).includes(String(d.id)));
    }

    return candidateDepts;
  },

  getAllowedAdmissionClasses: (tenantId, branchId = null, allClasses = [], _allDepartments = []) => {
    const settings = admissionSettingsStore.getSettings(tenantId);

    let filteredClasses = [...allClasses];
    const deptMode = settings.department_admission_mode || 'ALL';

    let allowedDeptIds = null;
    if (deptMode === 'SPECIFIC') {
      const allowed = Array.isArray(settings.allowed_admission_departments) ? settings.allowed_admission_departments : [];
      if (allowed.length > 0) {
        allowedDeptIds = allowed.map(String);
      }
    } else if (deptMode === 'BRANCH_SPECIFIC' && branchId) {
      const branchRules = settings.branch_department_rules || {};
      const allowed = Array.isArray(branchRules[branchId]) ? branchRules[branchId] : [];
      if (allowed.length > 0) {
        allowedDeptIds = allowed.map(String);
      }
    }

    if (allowedDeptIds && allowedDeptIds.length > 0) {
      filteredClasses = filteredClasses.filter((c) => {
        const deptVal = c.department !== undefined && c.department !== null ? c.department : c.department_id;
        const cDeptId = deptVal && typeof deptVal === 'object' ? deptVal.id : deptVal;
        if (cDeptId !== null && cDeptId !== undefined && cDeptId !== '') {
          return allowedDeptIds.includes(String(cDeptId));
        }
        return true;
      });
    }

    const classMode = settings.class_admission_mode || 'ALL';
    if (classMode === 'ALL') {
      return filteredClasses;
    }

    if (classMode === 'SPECIFIC') {
      const allowed = Array.isArray(settings.allowed_admission_classes) ? settings.allowed_admission_classes : [];
      if (allowed.length === 0) return filteredClasses;
      return filteredClasses.filter((c) => allowed.map(String).includes(String(c.id)));
    }

    if (classMode === 'BRANCH_SPECIFIC' && branchId) {
      const branchRules = settings.branch_class_rules || {};
      const allowed = Array.isArray(branchRules[branchId]) ? branchRules[branchId] : [];
      if (allowed.length === 0) return filteredClasses;
      return filteredClasses.filter((c) => allowed.map(String).includes(String(c.id)));
    }

    return filteredClasses;
  },

  getEffectivePolicyForBranch: (tenantId, branchId) => {
    const settings = admissionSettingsStore.getSettings(tenantId);

    let effectiveGender = settings.gender_policy || 'MALE_ONLY';
    if (settings.gender_policy === 'BRANCH_SPECIFIC' && branchId) {
      effectiveGender = settings.branch_gender_rules?.[branchId] || 'MALE_ONLY';
    }

    let effectiveMotherInfo = settings.mother_info_visibility || 'VISIBLE';
    if (settings.mother_info_visibility === 'BRANCH_SPECIFIC' && branchId) {
      effectiveMotherInfo = settings.branch_mother_info_rules?.[branchId] || 'VISIBLE';
    }

    const isVisible = effectiveMotherInfo !== 'HIDDEN';

    return {
      genderPolicy: effectiveGender,
      isMaleOnly: effectiveGender === 'MALE_ONLY',
      isFemaleOnly: effectiveGender === 'FEMALE_ONLY',
      motherInfoVisible: isVisible,
      motherNameVisible: isVisible,
      motherPhoneVisible: isVisible,
      emergencyPhoneVisible: isVisible,
    };
  },
};
