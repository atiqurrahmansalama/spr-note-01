/**
 * SPR Note — Staff Store
 * =======================
 * Staff categories, ranks & designations, and recruitment requirements.
 */

import { readJSON, writeJSON } from "./coreStore";

// ─── Staff Categories Store ──────────────────────────────────────────────────

export const STAFF_CATEGORY_OPTIONS = [
  { value: "MANAGEMENT", label: "Executive / Management", badge: "MGMT", description: "Institutional leadership, Principal, Vice Principal & Executive Board" },
  { value: "TEACHING", label: "Teaching Faculty", badge: "TEACHING", description: "Islamic Scholars, Subject Teachers, Instructors & Qaris" },
  { value: "ADMIN", label: "Administrative Staff", badge: "ADMIN", description: "Office Secretaries, IT Executives & Admission Officers" },
  { value: "FINANCE", label: "Finance & Accounts", badge: "FINANCE", description: "Accountants, Bursars, Cashiers & Audit Officers" },
  { value: "SUPPORT", label: "Operations & Support", badge: "SUPPORT", description: "Hostel Wardens, Kitchen, Security, Maintenance & Logistics Staff" },
];

export const staffCategoriesStore = {
  getCategories: (tenantId) => {
    const key = `spr_staff_categories_${tenantId || 'default'}`;
    const raw = readJSON(key, null);
    if (!raw || !Array.isArray(raw) || raw.length === 0) {
      writeJSON(key, STAFF_CATEGORY_OPTIONS);
      return STAFF_CATEGORY_OPTIONS;
    }
    return raw;
  },
  saveCategories: (tenantId, categories) => {
    const key = `spr_staff_categories_${tenantId || 'default'}`;
    writeJSON(key, categories);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent("spr_staff_categories_updated", { detail: categories }));
    }
    return categories;
  },
  addCategory: (tenantId, categoryData) => {
    const list = staffCategoriesStore.getCategories(tenantId);
    const label = typeof categoryData === 'string' ? categoryData : categoryData.label || categoryData.name;
    const value = (typeof categoryData === 'object' && categoryData.value)
      ? categoryData.value
      : label.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    const newCat = {
      value,
      label,
      badge: (typeof categoryData === 'object' && categoryData.badge) ? categoryData.badge : value.slice(0, 5),
      description: (typeof categoryData === 'object' && categoryData.description) ? categoryData.description : `${label} Staff`,
    };
    const updated = [...list, newCat];
    staffCategoriesStore.saveCategories(tenantId, updated);
    return newCat;
  },
  updateCategory: (tenantId, value, newLabel) => {
    const list = staffCategoriesStore.getCategories(tenantId);
    const updated = list.map((c) =>
      c.value === value
        ? {
            ...c,
            label: newLabel,
          }
        : c
    );
    staffCategoriesStore.saveCategories(tenantId, updated);
    return updated;
  },
  deleteCategory: (tenantId, valueToDelete, replacementValue) => {
    const list = staffCategoriesStore.getCategories(tenantId);
    const updated = list.filter((c) => c.value !== valueToDelete);
    staffCategoriesStore.saveCategories(tenantId, updated);

    // Migrate all staff ranks from deleted category to replacement category
    const ranks = staffRanksStore.getRanks(tenantId);
    const updatedRanks = ranks.map((r) =>
      r.type === valueToDelete ? { ...r, type: replacementValue } : r
    );
    staffRanksStore.saveRanks(tenantId, updatedRanks);

    return updated;
  },
};

// ─── Staff Ranks & Designations Store ──────────────────────────────────────────

export const DEFAULT_STAFF_RANKS = [
  {
    id: "rank_1",
    name: "Principal / Muhtamim",
    name_bn: "মুহতামিম / প্রিন্সিপাল",
    code: "PRINCIPAL",
    order: 1,
    type: "MANAGEMENT",
    description: "Chief Executive & Institutional Head (প্রধান নির্বাহী ও প্রতিষ্ঠান প্রধান)",
    is_active: true,
  },
  {
    id: "rank_2",
    name: "Vice Principal / Naib-e-Muhtamim",
    name_bn: "নায়েবে মুহতামিম / উপাধ্যক্ষ",
    code: "VICE_PRINCIPAL",
    order: 2,
    type: "MANAGEMENT",
    description: "Deputy Head & Administration Lead (সহ-প্রধান ও প্রশাসনিক সমন্বয়কারী)",
    is_active: true,
  },
  {
    id: "rank_3",
    name: "Shaikhul Hadith",
    name_bn: "শায়খুল হাদিস",
    code: "SHAIKHUL_HADITH",
    order: 3,
    type: "TEACHING",
    description: "Head of Hadith Studies & Senior Islamic Faculty (হাদিস বিভাগীয় প্রধান ও শীর্ষ শিক্ষক)",
    is_active: true,
  },
  {
    id: "rank_4",
    name: "Academic Director / Nazem-e-Ta'limat",
    name_bn: "নাজেমে তা'লীমাত / শিক্ষা সচিব",
    code: "ACADEMIC_DIRECTOR",
    order: 4,
    type: "TEACHING",
    description: "Academic Controller, Curriculum & Examination In-Charge (শিক্ষা পরিচালনা ও পরীক্ষা নিয়ন্ত্রক)",
    is_active: true,
  },
  {
    id: "rank_5",
    name: "Senior Lecturer / Muhaddis",
    name_bn: "মুহাদ্দিস / জ্যেষ্ঠ শিক্ষক",
    code: "SENIOR_TEACHER",
    order: 5,
    type: "TEACHING",
    description: "Senior Faculty Member (দাওরায়ে হাদিস / উচ্চতর স্তরের শিক্ষক)",
    is_active: true,
  },
  {
    id: "rank_6",
    name: "Assistant Teacher / Ustadh",
    name_bn: "সহকারী শিক্ষক / উস্তাদ",
    code: "ASSISTANT_TEACHER",
    order: 6,
    type: "TEACHING",
    description: "Kitab, Arabic & General Education Faculty (কিতাব ও সাধারণ পাঠদানকারী শিক্ষক)",
    is_active: true,
  },
  {
    id: "rank_7",
    name: "Hifz Instructor",
    name_bn: "হিফজ শিক্ষক / ক্বারী",
    code: "HIFZ_TEACHER",
    order: 7,
    type: "TEACHING",
    description: "Quran Memorization & Tajweed Teacher (হিফজুল কুরআন ও তাজবীদ শিক্ষক)",
    is_active: true,
  },
  {
    id: "rank_8",
    name: "Head of Accounts / Accountant",
    name_bn: "হিসাবরক্ষক / একাউন্ট্যান্ট",
    code: "HEAD_ACCOUNTS",
    order: 8,
    type: "FINANCE",
    description: "Financial Accounting, Payroll & Audit Executive (হিসাবরক্ষণ ও অর্থ পরিচালনা)",
    is_active: true,
  },
  {
    id: "rank_9",
    name: "Office Secretary / Admin Officer",
    name_bn: "দপ্তর সম্পাদক / অফিস কর্মকর্তা",
    code: "ADMIN_OFFICER",
    order: 9,
    type: "ADMIN",
    description: "Institutional Office Management & Official Communications (দাপ্তরিক ও প্রাতিষ্ঠানিক কাজ)",
    is_active: true,
  },
  {
    id: "rank_10",
    name: "Hostel Superintendent / Warden",
    name_bn: "হোস্টেল সুপার / তত্ত্বাবধায়ক",
    code: "WARDEN",
    order: 10,
    type: "SUPPORT",
    description: "Student Accommodation, Dining & Discipline Supervisor (আবাসিক হোস্টেল তত্ত্বাবধায়ক)",
    is_active: true,
  },
  {
    id: "rank_11",
    name: "General Support Staff / Khadem",
    name_bn: "সহায়ক কর্মী / খাদেম",
    code: "SUPPORT_STAFF",
    order: 11,
    type: "SUPPORT",
    description: "Institutional Logistics, Security & Support Personnel (সহায়ক কর্মী ও সাপোর্ট টিম)",
    is_active: true,
  },
];

export const staffRanksStore = {
  getRanks: (tenantId) => {
    const key = `spr_staff_ranks_${tenantId || 'default'}`;
    const raw = readJSON(key, null);
    if (!raw || !Array.isArray(raw) || raw.length === 0) {
      writeJSON(key, DEFAULT_STAFF_RANKS);
      return DEFAULT_STAFF_RANKS;
    }
    return raw.sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99));
  },
  saveRanks: (tenantId, ranks) => {
    const key = `spr_staff_ranks_${tenantId || 'default'}`;
    const sorted = [...ranks].sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99));
    writeJSON(key, sorted);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent("spr_staff_ranks_updated", { detail: sorted }));
    }
    return sorted;
  },
  addRank: (tenantId, rankData) => {
    const list = staffRanksStore.getRanks(tenantId);
    const code = (rankData.code || rankData.name || "").toUpperCase().replace(/[^A-Z0-9_]/g, "_").slice(0, 30);
    const newRank = {
      ...rankData,
      id: rankData.id || `rank_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      code: code || `RANK_${Date.now()}`,
      name: rankData.name || code,
      name_bn: rankData.name_bn || "",
      order: rankData.order !== undefined ? Number(rankData.order) : list.length + 1,
      type: rankData.type || "TEACHING",
      description: rankData.description || "",
      is_active: rankData.is_active !== undefined ? rankData.is_active : true,
      createdAt: new Date().toISOString(),
    };
    const updated = [...list, newRank];
    staffRanksStore.saveRanks(tenantId, updated);
    return newRank;
  },
  updateRank: (tenantId, id, updatedData) => {
    const list = staffRanksStore.getRanks(tenantId);
    const updated = list.map((r) =>
      r.id === id || r.code === id
        ? {
            ...r,
            ...updatedData,
            id: r.id,
            code: r.code,
            order: updatedData.order !== undefined ? Number(updatedData.order) : r.order,
            updatedAt: new Date().toISOString(),
          }
        : r
    );
    staffRanksStore.saveRanks(tenantId, updated);
    return updated;
  },
  deleteRank: (tenantId, id) => {
    const list = staffRanksStore.getRanks(tenantId);
    const updated = list.filter((r) => r.id !== id);
    staffRanksStore.saveRanks(tenantId, updated);
    return updated;
  },
  resetToDefaults: (tenantId) => {
    return staffRanksStore.saveRanks(tenantId, DEFAULT_STAFF_RANKS);
  },
};

// ─── Staff Recruitment Document Requirements Store ───────────────────────────

export const DEFAULT_STAFF_RECRUITMENT_REQUIREMENTS = [
  {
    id: "req_teaching_faculty",
    name: "Teaching Faculty Recruitment (Teachers, Qaris, Ustadhs)",
    name_bn: "শিক্ষক ও পাঠদানকারী অনবোর্ডিং (উস্তাদ, ক্বারী, মুহাদ্দিস)",
    code: "TEACHING_FACULTY_REQ",
    target_staff_type: "TEACHING",
    required_docs: [
      "National ID Card (NID)",
      "Dawra-e-Hadith Sanad / Certificate",
      "Teaching / Professional Experience Certificate",
      "Curriculum Vitae (CV) / Resume",
    ],
    order: 1,
    description: "Mandatory verification documents for all teaching faculty, senior lecturers, and Quran instructors.",
    is_active: true,
  },
  {
    id: "req_executive_management",
    name: "Executive & Management Appointments",
    name_bn: "নির্বাহী ও প্রাতিষ্ঠানিক প্রধান নিয়োগ (মুহতামিম/প্রিন্সিপাল, উপাধ্যক্ষ)",
    code: "EXECUTIVE_MGMT_REQ",
    target_staff_type: "MANAGEMENT",
    required_docs: [
      "National ID Card (NID)",
      "Dawra-e-Hadith Sanad / Certificate",
      "Teaching / Professional Experience Certificate",
      "Curriculum Vitae (CV) / Resume",
    ],
    order: 2,
    description: "Key institutional credentials for leadership, Principal, Vice Principal, and Administration heads.",
    is_active: true,
  },
  {
    id: "req_admin_finance",
    name: "Administrative & Finance Officers",
    name_bn: "প্রশাসনিক ও হিসাবরক্ষণ কর্মকর্তা",
    code: "ADMIN_FINANCE_REQ",
    target_staff_type: "FINANCE",
    required_docs: [
      "National ID Card (NID)",
      "Fazil / Bachelor Degree Certificate",
      "Teaching / Professional Experience Certificate",
      "Curriculum Vitae (CV) / Resume",
    ],
    order: 3,
    description: "Financial, audit, accounting, and institutional office management credentials.",
    is_active: true,
  },
  {
    id: "req_support_operations",
    name: "Operations, Hostel & Support Personnel",
    name_bn: "সহায়ক ও হোস্টেল তত্ত্বাবধায়ক কর্মী (খাদেম, হোস্টেল সুপার)",
    code: "SUPPORT_STAFF_REQ",
    target_staff_type: "SUPPORT",
    required_docs: [
      "National ID Card (NID)",
      "Medical / Health Clearance Certificate",
    ],
    order: 4,
    description: "Basic identity and security verification credentials for hostel wardens, kitchen, and maintenance team.",
    is_active: true,
  },
];

export const staffRecruitmentRequirementsStore = {
  getRequirements: (tenantId) => {
    const key = `spr_staff_recruitment_reqs_${tenantId || 'default'}`;
    const raw = readJSON(key, null);
    if (!raw || !Array.isArray(raw) || raw.length === 0) {
      writeJSON(key, DEFAULT_STAFF_RECRUITMENT_REQUIREMENTS);
      return DEFAULT_STAFF_RECRUITMENT_REQUIREMENTS;
    }
    return raw.sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99));
  },
  saveRequirements: (tenantId, reqs) => {
    const key = `spr_staff_recruitment_reqs_${tenantId || 'default'}`;
    const sorted = [...reqs].sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99));
    writeJSON(key, sorted);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent("spr_staff_recruitment_reqs_updated", { detail: sorted }));
    }
    return sorted;
  },
  addRequirement: (tenantId, reqData) => {
    const list = staffRecruitmentRequirementsStore.getRequirements(tenantId);
    const code = (reqData.code || reqData.name || "").toUpperCase().replace(/[^A-Z0-9_]/g, "_").slice(0, 30);
    const docs = Array.isArray(reqData.required_docs)
      ? reqData.required_docs
      : (typeof reqData.required_docs === 'string'
          ? reqData.required_docs.split(',').map((s) => s.trim()).filter(Boolean)
          : []);
    const newReq = {
      ...reqData,
      id: reqData.id || `req_staff_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      code: code || `REQ_STAFF_${Date.now()}`,
      name: reqData.name || code,
      name_bn: reqData.name_bn || "",
      target_staff_type: reqData.target_staff_type || "ALL_STAFF",
      required_docs: docs.length > 0 ? docs : ["National ID Card (NID)", "Curriculum Vitae (CV) / Resume"],
      order: reqData.order !== undefined ? Number(reqData.order) : list.length + 1,
      description: reqData.description || "",
      is_active: reqData.is_active !== undefined ? reqData.is_active : true,
      createdAt: new Date().toISOString(),
    };
    const updated = [...list, newReq];
    staffRecruitmentRequirementsStore.saveRequirements(tenantId, updated);
    return newReq;
  },
  updateRequirement: (tenantId, id, updatedData) => {
    const list = staffRecruitmentRequirementsStore.getRequirements(tenantId);
    const updated = list.map((r) =>
      r.id === id || r.code === id
        ? {
            ...r,
            ...updatedData,
            id: r.id,
            code: r.code,
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
    staffRecruitmentRequirementsStore.saveRequirements(tenantId, updated);
    return updated;
  },
  deleteRequirement: (tenantId, id) => {
    const list = staffRecruitmentRequirementsStore.getRequirements(tenantId);
    const updated = list.filter((r) => r.id !== id && r.code !== id);
    staffRecruitmentRequirementsStore.saveRequirements(tenantId, updated);
    return updated;
  },
  resetToDefaults: (tenantId) => {
    return staffRecruitmentRequirementsStore.saveRequirements(tenantId, DEFAULT_STAFF_RECRUITMENT_REQUIREMENTS);
  },
  getRequiredDocsForStaff: (tenantId, staffType = "TEACHING") => {
    const reqs = staffRecruitmentRequirementsStore.getRequirements(tenantId);
    const activeReqs = reqs.filter((r) => r.is_active !== false);
    if (activeReqs.length === 0) {
      return ["National ID Card (NID)", "Dawra-e-Hadith Sanad / Certificate", "Curriculum Vitae (CV) / Resume"];
    }

    const exactMatch = activeReqs.find((r) => r.target_staff_type === staffType);
    if (exactMatch && Array.isArray(exactMatch.required_docs) && exactMatch.required_docs.length > 0) {
      return exactMatch.required_docs;
    }

    const genericMatch = activeReqs.find((r) => r.target_staff_type === "ALL_STAFF" || !r.target_staff_type);
    if (genericMatch && Array.isArray(genericMatch.required_docs) && genericMatch.required_docs.length > 0) {
      return genericMatch.required_docs;
    }

    return activeReqs[0]?.required_docs || ["National ID Card (NID)", "Curriculum Vitae (CV) / Resume"];
  },
};
