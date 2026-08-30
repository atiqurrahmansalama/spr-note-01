/**
 * SPR Note — Academic Store
 * ==========================
 * Students, Sessions, Saved Comments, Academic Subjects, Academic Years & Terms,
 * Routine Period Sequences, Period Categories, Curriculum & Syllabus tracker.
 */

import { KEYS, readJSON, writeJSON } from "./coreStore";
import { weeklyHolidaysStore, WEEKDAY_OPTIONS } from "./calendarStore";

// ─── Students Store ─────────────────────────────────────────────────────────

export const students = {
  getAll: () => readJSON(KEYS.STUDENTS, []),

  saveAll: (list) => writeJSON(KEYS.STUDENTS, list),

  /** Add new student (with unique ID support). */
  add: (student) => {
    const list = students.getAll();
    const newId = student.id || `stu_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newStudentItem = {
      id: newId,
      label: student.label || student.name || "",
      sub: student.sub || student.group || student.group_name || "General Group",
      _local: true,
      ...student,
    };

    const isExactDuplicate = list.some(
      (s) => s.id && s.id === newId
    );

    if (!isExactDuplicate) {
      const updated = [...list, newStudentItem];
      writeJSON(KEYS.STUDENTS, updated);
      return updated;
    }
    return list;
  },

  /** Update student by label (replace mode). */
  replace: (oldLabel, newStudent) => {
    const list = students.getAll();
    const updated = list.map((s) =>
      s.label?.toLowerCase() === oldLabel?.toLowerCase() ? { ...s, ...newStudent } : s
    );
    writeJSON(KEYS.STUDENTS, updated);
    return updated;
  },

  /** Update group name across all associated students. */
  updateGroupName: (oldGroupName, newGroupName) => {
    const list = students.getAll();
    const updated = list.map((s) => {
      if ((s.sub || "General Group").toLowerCase() === oldGroupName.toLowerCase()) {
        return { ...s, sub: newGroupName, _local: true };
      }
      return s;
    });
    writeJSON(KEYS.STUDENTS, updated);
    return updated;
  },

  /** Remove all students in a specified group. */
  removeGroup: (groupName) => {
    const list = students.getAll();
    const updated = list.filter(
      (s) => (s.sub || "General Group").toLowerCase() !== groupName.toLowerCase()
    );
    writeJSON(KEYS.STUDENTS, updated);
    return updated;
  },

  /** Delete student by name or ID. */
  remove: (identifier) => {
    const updated = students.getAll().filter(
      (s) =>
        (s.id && String(s.id) !== String(identifier)) &&
        s.label?.toLowerCase() !== String(identifier)?.toLowerCase()
    );
    writeJSON(KEYS.STUDENTS, updated);
    return updated;
  },
};

/**
 * mergeStudents — Merges API data with LocalStorage data.
 */
export function mergeStudents(apiStudents, localStudents) {
  const apiList = (Array.isArray(apiStudents) ? apiStudents : []).map((s) => ({
    id: s.id ?? null,
    label: s.label || s.name || s.student_name || String(s),
    sub: s.sub || s.group_name || s.group || "General Group",
  }));

  const apiIds = new Set(apiList.map((s) => String(s.id)).filter((id) => id && id !== "null" && id !== "undefined"));
  const apiKeys = new Set(apiList.map((s) => `${(s.label || "").trim().toLowerCase()}_${(s.sub || "").trim().toLowerCase()}`));

  const localOnly = (Array.isArray(localStudents) ? localStudents : [])
    .filter((s) => {
      if (!s || (!s.label && !s.name)) return false;
      const sId = s.id ? String(s.id) : null;
      const sKey = `${(s.label || s.name || "").trim().toLowerCase()}_${(s.sub || s.group || s.group_name || "General Group").trim().toLowerCase()}`;
      
      if (sId && apiIds.has(sId)) return false;
      if (apiKeys.has(sKey)) return false;
      
      return Boolean(s._local);
    })
    .map((s) => ({ ...s, _local: true }));

  const seenKeys = new Set();
  const merged = [];

  for (const s of [...apiList, ...localOnly]) {
    const key = s.id
      ? `id_${s.id}`
      : `key_${(s.label || "").trim().toLowerCase()}_${(s.sub || "").trim().toLowerCase()}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      merged.push(s);
    }
  }

  writeJSON(KEYS.STUDENTS, merged);
  return merged;
}

// ─── Sessions Store ─────────────────────────────────────────────────────────

export const sessions = {
  getAll: () => {
    return readJSON(KEYS.SESSIONS, []);
  },

  saveAll: (list) => writeJSON(KEYS.SESSIONS, list),

  /** Add new session. */
  add: (sessionName) => {
    const list = sessions.getAll();
    const exists = list.some(
      (s) => s.name?.toLowerCase() === sessionName?.toLowerCase()
    );
    if (!exists) {
      const newSession = {
        id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()),
        name: sessionName,
        _local: true,
      };
      const updated = [...list, newSession];
      writeJSON(KEYS.SESSIONS, updated);
      return { updated, newSession };
    }
    return { updated: list, newSession: null };
  },

  /** Delete session by ID or name. */
  remove: (idOrName) => {
    const updated = sessions.getAll().filter(
      (s) => s.id !== idOrName && s.name !== idOrName
    );
    writeJSON(KEYS.SESSIONS, updated);
    return updated;
  },
};

export function mergeSessions(apiSessions, localSessions) {
  const apiNames = new Set(apiSessions.map((s) => s.name?.toLowerCase()));

  const localOnly = localSessions
    .filter((s) => !apiNames.has(s.name?.toLowerCase()))
    .map((s) => ({ ...s, _local: true }));

  const merged = [
    ...apiSessions.map((s) => {
      const copy = { ...s };
      delete copy._local;
      return copy;
    }),
    ...localOnly,
  ];

  writeJSON(KEYS.SESSIONS, merged);
  return merged;
}

// ─── Saved Comments (Templates) ─────────────────────────────────────────────

export const savedComments = {
  getAll: () => readJSON(KEYS.SAVED_COMMENTS, []),

  saveAll: (list) => writeJSON(KEYS.SAVED_COMMENTS, list),

  add: (text) => {
    const trimmed = typeof text === "string" ? text.trim() : (text?.text || "").trim();
    if (!trimmed) return savedComments.getAll();
    const list = savedComments.getAll();
    const exists = list.some((item) => {
      const itemText = typeof item === "object" && item !== null ? item.text : item;
      return (itemText || "").toLowerCase() === trimmed.toLowerCase();
    });
    if (!exists) {
      const newItem = {
        id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()),
        text: trimmed,
        _local: true,
      };
      const updated = [...list, newItem];
      writeJSON(KEYS.SAVED_COMMENTS, updated);
      return { updated, newItem };
    }
    return { updated: list, newItem: null };
  },

  remove: (idOrTextOrIndex) => {
    const list = savedComments.getAll();
    const updated = list.filter((item, idx) => {
      if (typeof idOrTextOrIndex === "number" && idx === idOrTextOrIndex) {
        return false;
      }
      if (typeof item === "string") {
        return item.toLowerCase() !== String(idOrTextOrIndex).toLowerCase();
      }
      if (typeof item === "object" && item !== null) {
        return (
          item.id !== idOrTextOrIndex &&
          (item.text || "").toLowerCase() !== String(idOrTextOrIndex).toLowerCase()
        );
      }
      return true;
    });
    writeJSON(KEYS.SAVED_COMMENTS, updated);
    return updated;
  },
};

export function mergeComments(apiComments, localComments) {
  const apiNormalized = (Array.isArray(apiComments) ? apiComments : [])
    .map((c) => {
      if (typeof c === "object" && c !== null) {
        return { id: c.id, text: c.text || c.comment || "" };
      }
      return {
        id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()),
        text: String(c),
      };
    })
    .filter((c) => Boolean(c.text && c.text.trim()));

  const apiTextsLower = new Set(apiNormalized.map((c) => c.text.toLowerCase()));

  const localOnly = (Array.isArray(localComments) ? localComments : []).filter((c) => {
    if (typeof c === "object" && c !== null) {
      return c._local && !apiTextsLower.has((c.text || "").toLowerCase());
    }
    return false;
  });

  const merged = [...apiNormalized, ...localOnly];
  writeJSON(KEYS.SAVED_COMMENTS, merged);
  return merged;
}

// ─── Academic Subjects & Curriculum Taxonomy Store ─────────────────────────

export const ACADEMIC_SUBJECT_CATEGORIES = [
  { value: "ISLAMIC_SCIENCES", label: "Islamic Sciences & Shariah (ইসলামি শাস্ত্র)" },
  { value: "ARABIC_LANGUAGE", label: "Arabic Language & Literature (আরবি ভাষা ও সাহিত্য)" },
  { value: "QURANIC_STUDIES", label: "Quranic & Hifz Studies (কুরআন ও হিফজ)" },
  { value: "PHILOSOPHY_LOGIC", label: "Logic & Philosophy (যুক্তিবিদ্যা ও দর্শন)" },
  { value: "GENERAL_ACADEMICS", label: "General Academics & Modern Disciplines (সাধারণ শিক্ষা)" },
];

export const DEFAULT_ACADEMIC_SUBJECTS = [
  {
    id: "subj_1",
    name: "Islamic Jurisprudence (Fiqh)",
    name_bn: "ইসলামি আইন ও ফিকহ",
    code: "FIQH",
    type: "ISLAMIC_SCIENCES",
    order: 1,
    is_active: true,
    description: "Classical and contemporary Islamic jurisprudence (ফিকহ শাস্ত্র ও মাসআলা-মাসায়েল)",
  },
  {
    id: "subj_2",
    name: "Principles of Jurisprudence (Usul al-Fiqh)",
    name_bn: "উসূলে ফিকহ",
    code: "USUL_FIQH",
    type: "ISLAMIC_SCIENCES",
    order: 2,
    is_active: true,
    description: "Legal methodology, epistemology, and principles of derivation (উসূলে ফিকহ)",
  },
  {
    id: "subj_3",
    name: "Prophetic Traditions (Hadith)",
    name_bn: "হাদিস শরিফ",
    code: "HADITH",
    type: "ISLAMIC_SCIENCES",
    order: 3,
    is_active: true,
    description: "Prophetic narrations, Sihah Sitta, and textual commentary (হাদিস শাস্ত্র)",
  },
  {
    id: "subj_4",
    name: "Hadith Sciences (Usul al-Hadith)",
    name_bn: "উসূলে হাদিস / মুসতালাহুল হাদিস",
    code: "USUL_HADITH",
    type: "ISLAMIC_SCIENCES",
    order: 4,
    is_active: true,
    description: "Isnad verification, terminology, and narrators evaluation (মুসতালাহুল হাদিস)",
  },
  {
    id: "subj_5",
    name: "Quranic Exegesis (Tafsir)",
    name_bn: "কুরআনের তাফসির",
    code: "TAFSIR",
    type: "ISLAMIC_SCIENCES",
    order: 5,
    is_active: true,
    description: "Verse-by-verse commentary, context of revelation, and legal rulings (তাফসির)",
  },
  {
    id: "subj_6",
    name: "Principles of Exegesis (Usul al-Tafsir)",
    name_bn: "উসূলে তাফসির",
    code: "USUL_TAFSIR",
    type: "ISLAMIC_SCIENCES",
    order: 6,
    is_active: true,
    description: "Principles, rules, and methodologies of Quranic interpretation (উসূলে তাফসির)",
  },
  {
    id: "subj_7",
    name: "Arabic Syntax & Grammar (Nahw)",
    name_bn: "নাহু / আরবি ব্যাকরণ",
    code: "NAHW",
    type: "ARABIC_LANGUAGE",
    order: 7,
    is_active: true,
    description: "Arabic grammar, grammatical rules, sentence structure, and I'rab (ইলমুন নাহু)",
  },
  {
    id: "subj_8",
    name: "Arabic Morphology (Sarf)",
    name_bn: "সরফ / শব্দরূপ",
    code: "SARF",
    type: "ARABIC_LANGUAGE",
    order: 8,
    is_active: true,
    description: "Word morphology, root conjugation, and structural paradigms (ইলমুস সরফ)",
  },
  {
    id: "subj_9",
    name: "Arabic Literature (Adab)",
    name_bn: "আরবি সাহিত্য ও আদব",
    code: "ADAB",
    type: "ARABIC_LANGUAGE",
    order: 9,
    is_active: true,
    description: "Classical and modern Arabic prose, poetry, and comprehension (আরবি সাহিত্য)",
  },
  {
    id: "subj_10",
    name: "Arabic Rhetoric (Balaghah)",
    name_bn: "বালাগাত / অলংকার শাস্ত্র",
    code: "BALAGHAH",
    type: "ARABIC_LANGUAGE",
    order: 10,
    is_active: true,
    description: "Ma'ani, Bayan, and Badi' literary eloquence (ইলমুল বালাগাত)",
  },
  {
    id: "subj_11",
    name: "Classical Logic (Mantiq)",
    name_bn: "মানতিক / যুক্তিবিদ্যা",
    code: "MANTIQ",
    type: "PHILOSOPHY_LOGIC",
    order: 11,
    is_active: true,
    description: "Formal logic, definitions, syllogisms, and argumentation (ইলমুল মানতিক)",
  },
  {
    id: "subj_12",
    name: "Islamic Creed & Theology (Aqaid)",
    name_bn: "আকাইদ ও কালাম",
    code: "AQAID",
    type: "ISLAMIC_SCIENCES",
    order: 12,
    is_active: true,
    description: "Pillars of faith, Islamic dogma, and scholastic theology (ইলমুল আকাইদ)",
  },
  {
    id: "subj_13",
    name: "Tajweed & Quran Recitation",
    name_bn: "তাজবিদ ও তিলাওয়াত",
    code: "TAJWEED",
    type: "QURANIC_STUDIES",
    order: 13,
    is_active: true,
    description: "Makharij, Sifat, and rules of accurate Quranic recitation (তাজবিদ শাস্ত্র)",
  },
  {
    id: "subj_14",
    name: "General Studies & Academics",
    name_bn: "সাধারণ পাঠ্য / জেনারেল",
    code: "GENERAL",
    type: "GENERAL_ACADEMICS",
    order: 14,
    is_active: true,
    description: "General academic subjects and foundational curriculum studies",
  },
  {
    id: "subj_15",
    name: "Bengali Language & Literature",
    name_bn: "বাংলা ভাষা ও সাহিত্য",
    code: "BANGLA",
    type: "GENERAL_ACADEMICS",
    order: 15,
    is_active: true,
    description: "Bangla reading, composition, grammar, and literary works (বাংলা পাঠ্য)",
  },
  {
    id: "subj_16",
    name: "English Language & Grammar",
    name_bn: "ইংরেজি ভাষা ও ব্যাকরণ",
    code: "ENGLISH",
    type: "GENERAL_ACADEMICS",
    order: 16,
    is_active: true,
    description: "English reading, grammar, vocabulary, and composition (ইংরেজি পাঠ্য)",
  },
  {
    id: "subj_17",
    name: "Mathematics",
    name_bn: "গণিত",
    code: "MATH",
    type: "GENERAL_ACADEMICS",
    order: 17,
    is_active: true,
    description: "Arithmetic, algebra, and geometry fundamentals (গণিত শাস্ত্র)",
  },
  {
    id: "subj_18",
    name: "General Science",
    name_bn: "বিজ্ঞান",
    code: "SCIENCE",
    type: "GENERAL_ACADEMICS",
    order: 18,
    is_active: true,
    description: "Natural sciences, environmental studies, and health hygiene (বিজ্ঞান পাঠ্য)",
  },
];

export const academicSubjectsStore = {
  getSubjects: (tenantId) => {
    const key = `spr_academic_subjects_${tenantId || 'default'}`;
    const raw = readJSON(key, null);
    if (!raw || !Array.isArray(raw) || raw.length === 0) {
      writeJSON(key, DEFAULT_ACADEMIC_SUBJECTS);
      return DEFAULT_ACADEMIC_SUBJECTS;
    }
    return raw.sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99));
  },
  saveSubjects: (tenantId, subjects) => {
    const key = `spr_academic_subjects_${tenantId || 'default'}`;
    const sorted = [...subjects].sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99));
    writeJSON(key, sorted);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent("spr_academic_subjects_updated", { detail: sorted }));
    }
    return sorted;
  },
  addSubject: (tenantId, subjectData) => {
    const list = academicSubjectsStore.getSubjects(tenantId);
    const code = (subjectData.code || subjectData.name || "").toUpperCase().replace(/[^A-Z0-9_]/g, "_").slice(0, 30);
    const newSubject = {
      ...subjectData,
      id: subjectData.id || `subj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      code: code || `SUBJ_${Date.now()}`,
      name: subjectData.name || code,
      name_bn: subjectData.name_bn || "",
      order: subjectData.order !== undefined ? Number(subjectData.order) : list.length + 1,
      type: subjectData.type || "ISLAMIC_SCIENCES",
      description: subjectData.description || "",
      is_active: subjectData.is_active !== undefined ? subjectData.is_active : true,
      createdAt: new Date().toISOString(),
    };
    const updated = [...list, newSubject];
    academicSubjectsStore.saveSubjects(tenantId, updated);
    return newSubject;
  },
  updateSubject: (tenantId, id, updatedData) => {
    const list = academicSubjectsStore.getSubjects(tenantId);
    const updated = list.map((s) =>
      s.id === id || s.code === id || s.name === id
        ? {
            ...s,
            ...updatedData,
            id: s.id,
            code: s.code,
            order: updatedData.order !== undefined ? Number(updatedData.order) : s.order,
            updatedAt: new Date().toISOString(),
          }
        : s
    );
    academicSubjectsStore.saveSubjects(tenantId, updated);
    return updated;
  },
  deleteSubject: (tenantId, id) => {
    const list = academicSubjectsStore.getSubjects(tenantId);
    const updated = list.filter((s) => s.id !== id && s.code !== id && s.name !== id);
    academicSubjectsStore.saveSubjects(tenantId, updated);
    return updated;
  },
  resetToDefaults: (tenantId) => {
    return academicSubjectsStore.saveSubjects(tenantId, DEFAULT_ACADEMIC_SUBJECTS);
  },
};

// ─── Academic Years & Terms Store ──────────────────────────────────────────

export const DEFAULT_ACADEMIC_YEARS = [
  {
    id: "ay_2026_2027",
    name: "2026-2027",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    termSystem: "SEMESTER",
    isCurrent: true,
    // Branch context: Main Campus is the default scope for this academic year
    branch_id: "branch_main",
    branch_name: "Main Campus",
    terms: [
      {
        id: "sem_2026_1",
        name: "1st Semester",
        startDate: "2026-01-01",
        endDate: "2026-06-30",
        isCurrent: false,
      },
      {
        id: "sem_2026_2",
        name: "2nd Semester",
        startDate: "2026-07-01",
        endDate: "2026-12-31",
        isCurrent: true,
      },
    ],
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

function shiftDateByYears(dateStr, years = 1) {
  if (!dateStr) return "";
  const parts = String(dateStr).split("-");
  if (parts.length < 3) return dateStr;
  const y = parseInt(parts[0], 10) + years;
  return `${y}-${parts[1]}-${parts[2]}`;
}

function suggestNextYearName(prevName) {
  if (!prevName) return `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
  const numbers = prevName.match(/\d{4}/g);
  if (numbers && numbers.length >= 2) {
    const y1 = parseInt(numbers[0], 10) + 1;
    const y2 = parseInt(numbers[1], 10) + 1;
    return prevName.replace(numbers[0], String(y1)).replace(numbers[1], String(y2));
  } else if (numbers && numbers.length === 1) {
    const y = parseInt(numbers[0], 10) + 1;
    return prevName.replace(numbers[0], String(y));
  }
  const currentY = new Date().getFullYear();
  return `${currentY}-${currentY + 1}`;
}

export function getAcademicYearStatus(startDate, endDate) {
  const today = new Date().toISOString().split("T")[0];
  if (!startDate || !endDate) return "UPCOMING";
  if (today >= startDate && today <= endDate) return "ACTIVE";
  if (today < startDate) return "UPCOMING";
  return "COMPLETED";
}

export const DEFAULT_BRANCH_CATEGORIES = [
  {
    id: "cat_main_campus",
    code: "MAIN_CAMPUS",
    name: "Main Campus",
    name_bn: "মূল ক্যাম্পাস",
    order: 1,
    description: "Central administrative headquarters and primary academic campus",
    is_active: true,
  },
  {
    id: "cat_sub_branch",
    code: "SUB_BRANCH",
    name: "Sub Branch",
    name_bn: "শাখা ক্যাম্পাস",
    order: 2,
    description: "Secondary academic branch or feeder campus under the central institution",
    is_active: true,
  },
  {
    id: "cat_female_branch",
    code: "FEMALE_BRANCH",
    name: "Female Branch / Mahila Branch",
    name_bn: "মহিলা শাখা",
    order: 3,
    description: "Dedicated campus for female students and faculty with separate facilities",
    is_active: true,
  },
  {
    id: "cat_residential_campus",
    code: "RESIDENTIAL_CAMPUS",
    name: "Residential Campus & Boarding",
    name_bn: "আবাসিক ক্যাম্পাস ও বোর্ডিং",
    order: 4,
    description: "Full residential boarding campus with dormitory and residential care facilities",
    is_active: true,
  },
];

export const branchCategoriesStore = {
  getCategories: (tenantId) => {
    const key = `spr_branch_categories_${tenantId || 'default'}`;
    const raw = readJSON(key, null);
    if (!raw || !Array.isArray(raw) || raw.length === 0) {
      writeJSON(key, DEFAULT_BRANCH_CATEGORIES);
      return DEFAULT_BRANCH_CATEGORIES;
    }
    return raw.sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99));
  },
  saveCategories: (tenantId, categories) => {
    const key = `spr_branch_categories_${tenantId || 'default'}`;
    const sorted = [...categories].sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99));
    writeJSON(key, sorted);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent("spr_branch_categories_updated", { detail: sorted }));
    }
    return sorted;
  },
  addCategory: (tenantId, catData) => {
    const list = branchCategoriesStore.getCategories(tenantId);
    const code = (catData.code || catData.name || "").toUpperCase().replace(/[^A-Z0-9_]/g, "_").slice(0, 40);
    const newCat = {
      ...catData,
      id: catData.id || `bcat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      code: code || `BCAT_${Date.now()}`,
      name: catData.name || code,
      name_bn: catData.name_bn || "",
      order: catData.order !== undefined ? Number(catData.order) : list.length + 1,
      description: catData.description || "",
      is_active: catData.is_active !== undefined ? catData.is_active : true,
      createdAt: new Date().toISOString(),
    };
    const updated = [...list, newCat];
    branchCategoriesStore.saveCategories(tenantId, updated);
    return newCat;
  },
  updateCategory: (tenantId, id, updatedData) => {
    const list = branchCategoriesStore.getCategories(tenantId);
    const updated = list.map((c) =>
      c.id === id || c.code === id
        ? {
            ...c,
            ...updatedData,
            id: c.id,
            code: c.code,
            order: updatedData.order !== undefined ? Number(updatedData.order) : c.order,
            updatedAt: new Date().toISOString(),
          }
        : c
    );
    branchCategoriesStore.saveCategories(tenantId, updated);
    return updated;
  },
  deleteCategory: (tenantId, id) => {
    const list = branchCategoriesStore.getCategories(tenantId);
    const updated = list.filter((c) => c.id !== id && c.code !== id);
    branchCategoriesStore.saveCategories(tenantId, updated);
    return updated;
  },
  resetToDefaults: (tenantId) => {
    return branchCategoriesStore.saveCategories(tenantId, DEFAULT_BRANCH_CATEGORIES);
  },
  getCategoryOptions: (tenantId) => {
    const list = branchCategoriesStore.getCategories(tenantId);
    return list
      .filter((c) => c.is_active !== false)
      .map((c) => ({
        label: c.name,
        value: c.code || c.id,
        badge: c.code,
      }));
  },
  getCategoryLabel: (type, tenantId) => {
    if (!type) return 'Main Campus';
    const list = branchCategoriesStore.getCategories(tenantId);
    const found = list.find((c) => c.code === type || c.id === type || c.name === type);
    if (found) return found.name;
    return BRANCH_TYPE_LABELS[type] || type;
  },
};

export const BRANCH_TYPE_LABELS = {
  MAIN_CAMPUS: 'Main Campus',
  FEMALE_BRANCH: 'Female Branch',
  SUB_BRANCH: 'Sub Branch',
  RESIDENTIAL_CAMPUS: 'Residential Campus',
};

/**
 * Returns clean, schema-driven display name for an academic branch
 * based on its branch_name, branch_code, or branch_type taxonomy.
 */
export function getBranchDisplayName(branch, tenantId) {
  if (!branch) return '';
  if (typeof branch === 'string') {
    let s = branch.trim();
    const dynamicLabel = branchCategoriesStore.getCategoryLabel(s, tenantId);
    if (dynamicLabel && dynamicLabel !== s) return dynamicLabel;
    if (BRANCH_TYPE_LABELS[s]) return BRANCH_TYPE_LABELS[s];
    if (s.includes(' - ')) {
      const parts = s.split(' - ');
      if (parts.length >= 2 && parts[parts.length - 1].trim()) {
        s = parts[parts.length - 1].trim();
      }
    }
    return branchCategoriesStore.getCategoryLabel(s, tenantId) || BRANCH_TYPE_LABELS[s] || s;
  }
  let name = '';
  // 1. Exact branch_name or name from schema
  if (branch.branch_name && typeof branch.branch_name === 'string' && branch.branch_name.trim()) {
    name = branch.branch_name.trim();
  } else if (branch.name && typeof branch.name === 'string' && branch.name.trim()) {
    name = branch.name.trim();
  }

  // If name has " - " with institution prefix (e.g. "Academy Name - Branch Name")
  if (name) {
    if (branch.institution_name && name.startsWith(branch.institution_name + ' - ')) {
      name = name.substring((branch.institution_name + ' - ').length).trim();
    } else if (branch.institution && typeof branch.institution === 'object' && branch.institution.name && name.startsWith(branch.institution.name + ' - ')) {
      name = name.substring((branch.institution.name + ' - ').length).trim();
    } else if (name.includes(' - ')) {
      const parts = name.split(' - ');
      if (parts.length >= 2 && parts[parts.length - 1].trim()) {
        name = parts[parts.length - 1].trim();
      }
    }
    if (name) return name;
  }

  // 2. Canonical branch_type or campus_type taxonomy label
  const type = branch.branch_type || branch.campus_type;
  if (type) {
    const label = branchCategoriesStore.getCategoryLabel(type, tenantId);
    if (label) return label;
  }
  // 3. Fallback to branch_code
  return branch.branch_code || 'Main Campus';
}

export const academicYearsStore = {
  getAcademicYears: (tenantId) => {
    const key = `spr_academic_years_${tenantId || 'default'}`;
    const raw = readJSON(key, null);
    if (!raw || !Array.isArray(raw) || raw.length === 0) {
      writeJSON(key, DEFAULT_ACADEMIC_YEARS);
      return DEFAULT_ACADEMIC_YEARS;
    }
    return raw;
  },

  getActiveYear: (tenantId) => {
    const list = academicYearsStore.getAcademicYears(tenantId);
    const active = list.find((y) => getAcademicYearStatus(y.startDate, y.endDate) === "ACTIVE");
    return active || list[0] || null;
  },

  getDateBounds: (tenantId) => {
    const activeYear = academicYearsStore.getActiveYear(tenantId);
    if (activeYear && activeYear.startDate && activeYear.endDate) {
      return {
        minDate: activeYear.startDate,
        maxDate: activeYear.endDate,
        activeYear,
      };
    }
    const all = academicYearsStore.getAcademicYears(tenantId);
    if (all.length > 0) {
      const validStarts = all.map((y) => y.startDate).filter(Boolean).sort();
      const validEnds = all.map((y) => y.endDate).filter(Boolean).sort();
      return {
        minDate: validStarts[0] || "",
        maxDate: validEnds[validEnds.length - 1] || "",
        activeYear: all[0],
      };
    }
    return { minDate: "", maxDate: "", activeYear: null };
  },

  saveAcademicYears: (tenantId, years) => {
    const key = `spr_academic_years_${tenantId || 'default'}`;
    const safeYears = Array.isArray(years) ? years : [];
    writeJSON(key, safeYears);

    // Synchronize session names with legacy sessions store
    try {
      const existingSessions = sessions.getAll() || [];
      const updatedSessions = [...existingSessions];
      safeYears.forEach((y) => {
        if (y.name && !updatedSessions.some((s) => (s.name || s).toLowerCase() === y.name.toLowerCase())) {
          updatedSessions.push({ id: `sess_${y.id}`, name: y.name, _local: true });
        }
      });
      sessions.saveAll(updatedSessions);
    } catch {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent("spr_academic_years_updated", { detail: safeYears }));
    }
    return safeYears;
  },

  addAcademicYear: (tenantId, yearData) => {
    const list = academicYearsStore.getAcademicYears(tenantId);
    const newId = yearData.id || `ay_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const newYear = {
      id: newId,
      name: yearData.name || "New Academic Year",
      startDate: yearData.startDate || new Date().toISOString().split("T")[0],
      endDate: yearData.endDate || new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0],
      termSystem: yearData.termSystem || "SEMESTER",
      terms: Array.isArray(yearData.terms) ? yearData.terms.map((t, idx) => ({
        id: t.id || `term_${Date.now()}_${idx}`,
        name: t.name || `Term ${idx + 1}`,
        startDate: t.startDate || "",
        endDate: t.endDate || "",
      })) : [],
      createdAt: new Date().toISOString(),
    };

    const updatedList = [newYear, ...list];
    academicYearsStore.saveAcademicYears(tenantId, updatedList);
    return newYear;
  },

  updateAcademicYear: (tenantId, id, updatedData) => {
    const list = academicYearsStore.getAcademicYears(tenantId);
    const updatedList = list.map((y) => {
      if (y.id === id) {
        return {
          ...y,
          ...updatedData,
          terms: Array.isArray(updatedData.terms) ? updatedData.terms : y.terms,
          updatedAt: new Date().toISOString(),
        };
      }
      return y;
    });

    academicYearsStore.saveAcademicYears(tenantId, updatedList);
    return updatedList.find((y) => y.id === id);
  },

  deleteAcademicYear: (tenantId, id) => {
    const list = academicYearsStore.getAcademicYears(tenantId);
    const updatedList = list.filter((y) => y.id !== id);
    academicYearsStore.saveAcademicYears(tenantId, updatedList);
    return updatedList;
  },

  getSuggestedNextYear: (tenantId) => {
    const list = academicYearsStore.getAcademicYears(tenantId);
    if (!list || list.length === 0) {
      const currentYear = new Date().getFullYear();
      return {
        name: `${currentYear}-${currentYear + 1}`,
        startDate: `${currentYear}-01-01`,
        endDate: `${currentYear}-12-31`,
        termSystem: "SEMESTER",
        terms: [
          { id: `term_new_1`, name: "1st Semester", startDate: `${currentYear}-01-01`, endDate: `${currentYear}-06-30` },
          { id: `term_new_2`, name: "2nd Semester", startDate: `${currentYear}-07-01`, endDate: `${currentYear}-12-31` },
        ],
      };
    }

    const sorted = [...list].sort((a, b) => (b.endDate || "").localeCompare(a.endDate || ""));
    const latest = sorted[0] || list[0];

    const nextName = suggestNextYearName(latest.name);
    const nextStartDate = shiftDateByYears(latest.startDate, 1);
    const nextEndDate = shiftDateByYears(latest.endDate, 1);

    const nextTerms = (latest.terms || []).map((t, idx) => ({
      id: `term_new_${idx + 1}`,
      name: t.name || `Term ${idx + 1}`,
      startDate: shiftDateByYears(t.startDate, 1),
      endDate: shiftDateByYears(t.endDate, 1),
    }));

    return {
      name: nextName,
      startDate: nextStartDate || `${new Date().getFullYear()}-01-01`,
      endDate: nextEndDate || `${new Date().getFullYear()}-12-31`,
      termSystem: latest.termSystem || "SEMESTER",
      isCurrent: false,
      terms: nextTerms.length > 0 ? nextTerms : [
        { id: `term_new_1`, name: "1st Semester", startDate: nextStartDate || `${new Date().getFullYear()}-01-01`, endDate: shiftDateByYears(nextStartDate, 0.5) || `${new Date().getFullYear()}-06-30` },
        { id: `term_new_2`, name: "2nd Semester", startDate: `${new Date().getFullYear()}-07-01`, endDate: nextEndDate || `${new Date().getFullYear()}-12-31` },
      ],
    };
  },

  getConfiguredTerms: (tenantId, academicYearId = null) => {
    const list = academicYearsStore.getAcademicYears(tenantId);
    if (!list || list.length === 0) {
      return [
        { id: "sem_1", name: "1st Semester" },
        { id: "sem_2", name: "2nd Semester" },
        { id: "sem_final", name: "Final Term" },
        { id: "sem_annual", name: "Annual Syllabus" },
      ];
    }

    if (academicYearId) {
      const found = list.find((y) => y.id === academicYearId || y.name === academicYearId);
      if (found && Array.isArray(found.terms) && found.terms.length > 0) {
        return found.terms;
      }
    }

    const activeYear = academicYearsStore.getActiveYear(tenantId);
    if (activeYear && Array.isArray(activeYear.terms) && activeYear.terms.length > 0) {
      return activeYear.terms;
    }

    const uniqueTermMap = new Map();
    list.forEach((y) => {
      if (Array.isArray(y.terms)) {
        y.terms.forEach((t) => {
          if (t && t.name && !uniqueTermMap.has(t.name.trim())) {
            uniqueTermMap.set(t.name.trim(), t);
          }
        });
      }
    });

    if (uniqueTermMap.size > 0) {
      return Array.from(uniqueTermMap.values());
    }

    return [
      { id: "sem_1", name: "1st Semester" },
      { id: "sem_2", name: "2nd Semester" },
      { id: "sem_final", name: "Final Term" },
      { id: "sem_annual", name: "Annual Syllabus" },
    ];
  },
};

// ─── Curriculum & Syllabus Store ──────────────────────────────────────────

export const DEFAULT_CURRICULUM_ITEMS = [
  // ── Class 1: Standard Hifz Division (cls_1) ─────────────────────────
  {
    id: "syllabus_hifz_1",
    name: "Quran Daily Sabaq (Para 1-10)",
    subject: "Quran Memorization (Hifz)",
    className: "Standard Hifz Division",
    classId: "cls_1",
    periodSlotId: "period_1",
    period_order: 1,
    periodName: "1st Period: Sabq (New Lesson Recitation)",
    semester: "1st Semester",
    teacherName: "Hafiz Qari Osman",
    teacherId: "teacher_4",
    startPage: 1,
    endPage: 200,
    currentPage: 85,
    totalPages: 200,
    targetDate: "2026-06-30",
    status: "IN_PROGRESS",
    notes: "Daily memorization quota: 1 to 2 pages with Tajweed precision.",
    updatedAt: "2026-08-25T10:00:00.000Z",
  },
  {
    id: "syllabus_hifz_2",
    name: "Quran Sabqi (Para 1-5 Recent Revision)",
    subject: "Sabqi Revision",
    className: "Standard Hifz Division",
    classId: "cls_1",
    periodSlotId: "period_2",
    period_order: 2,
    periodName: "2nd Period: Sabqi (Recent Lessons Revision)",
    semester: "1st Semester",
    teacherName: "Hafiz Qari Osman",
    teacherId: "teacher_4",
    startPage: 1,
    endPage: 100,
    currentPage: 60,
    totalPages: 100,
    targetDate: "2026-06-30",
    status: "IN_PROGRESS",
    notes: "Quarter Juz revision daily from the last 10 lessons memorized.",
    updatedAt: "2026-08-26T08:30:00.000Z",
  },
  {
    id: "syllabus_hifz_3",
    name: "Tuhfatul Atfal (Tajweed Rules)",
    subject: "Tajweed & Makharij",
    className: "Standard Hifz Division",
    classId: "cls_1",
    periodSlotId: "period_hifz_3",
    period_order: 3,
    periodName: "3rd Period: Tajweed & Makharij Rules",
    semester: "1st Semester",
    teacherName: "Hafiz Qari Osman",
    teacherId: "teacher_4",
    startPage: 1,
    endPage: 40,
    currentPage: 28,
    totalPages: 40,
    targetDate: "2026-05-30",
    status: "IN_PROGRESS",
    notes: "Noon Sakinah, Meem Sakinah, and Madd rules.",
    updatedAt: "2026-08-24T12:00:00.000Z",
  },
  {
    id: "syllabus_hifz_4",
    name: "Al-Adab al-Mufrad (Selected Duas & Akhlaq)",
    subject: "Islamic Manners & Duas",
    className: "Standard Hifz Division",
    classId: "cls_1",
    periodSlotId: "period_hifz_4",
    period_order: 4,
    periodName: "4th Period: Islamic Manners & Daily Duas",
    semester: "1st Semester",
    teacherName: "Maulana Mahmudul Hasan",
    teacherId: "teacher_3",
    startPage: 1,
    endPage: 60,
    currentPage: 30,
    totalPages: 60,
    targetDate: "2026-06-30",
    status: "IN_PROGRESS",
    notes: "Essential daily Sunnahs and etiquette.",
    updatedAt: "2026-08-24T12:00:00.000Z",
  },
  {
    id: "syllabus_hifz_5",
    name: "Quran Daur (Para 1-30 Complete Revision)",
    subject: "Daur Revision",
    className: "Standard Hifz Division",
    classId: "cls_1",
    periodSlotId: "period_5",
    period_order: 5,
    periodName: "5th Period: Daur & Afternoon Revision",
    semester: "1st Semester",
    teacherName: "Hafiz Qari Osman",
    teacherId: "teacher_4",
    startPage: 1,
    endPage: 604,
    currentPage: 320,
    totalPages: 604,
    targetDate: "2026-07-31",
    status: "IN_PROGRESS",
    notes: "Full revision cycle: half to one Para per session.",
    updatedAt: "2026-08-27T14:00:00.000Z",
  },

  // ── Class 2: Kitab Division - Fazilat (cls_2) ────────────────────────
  {
    id: "syllabus_kitab_1",
    name: "Tafsir al-Jalalayn",
    subject: "Quranic Exegesis (Tafsir)",
    className: "Kitab Division (Fazilat)",
    classId: "cls_2",
    periodSlotId: "period_kitab_1",
    period_order: 1,
    periodName: "1st Period: Tafsir al-Quran (Jalalayn)",
    semester: "1st Semester",
    teacherName: "Shaykhul Hadith Maulana Zakariya",
    teacherId: "teacher_2",
    startPage: 1,
    endPage: 300,
    currentPage: 90,
    totalPages: 300,
    targetDate: "2026-06-30",
    status: "IN_PROGRESS",
    notes: "Surah Al-Baqarah and Surah Ali Imran Tafsir.",
    updatedAt: "2026-08-20T10:00:00.000Z",
  },
  {
    id: "syllabus_kitab_2",
    name: "Mishkat al-Masabih",
    subject: "Hadith Studies",
    className: "Kitab Division (Fazilat)",
    classId: "cls_2",
    periodSlotId: "period_kitab_2",
    period_order: 2,
    periodName: "2nd Period: Hadith Studies (Mishkat al-Masabih)",
    semester: "1st Semester",
    teacherName: "Shaykhul Hadith Maulana Zakariya",
    teacherId: "teacher_2",
    startPage: 50,
    endPage: 280,
    currentPage: 140,
    totalPages: 231,
    targetDate: "2026-06-30",
    status: "IN_PROGRESS",
    notes: "Kitab al-Iman, Kitab al-Ilm, and Kitab al-Salah.",
    updatedAt: "2026-08-24T09:15:00.000Z",
  },
  {
    id: "syllabus_kitab_3",
    name: "Sharh Mi'ata Amil",
    subject: "Arabic Syntax (Nahw)",
    className: "Kitab Division (Fazilat)",
    classId: "cls_2",
    periodSlotId: "period_3",
    period_order: 3,
    periodName: "3rd Period: Arabic Grammar & Syntax",
    semester: "1st Semester",
    teacherName: "Maulana Mahmudul Hasan",
    teacherId: "teacher_3",
    startPage: 1,
    endPage: 90,
    currentPage: 65,
    totalPages: 90,
    targetDate: "2026-05-30",
    status: "IN_PROGRESS",
    notes: "100 governing agents in classical Arabic grammar.",
    updatedAt: "2026-08-25T11:20:00.000Z",
  },
  {
    id: "syllabus_kitab_4",
    name: "Mukhtasar al-Quduri",
    subject: "Islamic Jurisprudence (Fiqh)",
    className: "Kitab Division (Fazilat)",
    classId: "cls_2",
    periodSlotId: "period_4",
    period_order: 4,
    periodName: "4th Period: Islamic Jurisprudence (Fiqh)",
    semester: "1st Semester",
    teacherName: "Maulana Mufti Abdullah",
    teacherId: "teacher_1",
    startPage: 1,
    endPage: 220,
    currentPage: 165,
    totalPages: 220,
    targetDate: "2026-06-30",
    status: "IN_PROGRESS",
    notes: "Kitab al-Taharah, Kitab al-Salah, and Kitab al-Nikah.",
    updatedAt: "2026-08-20T10:00:00.000Z",
  },
  {
    id: "syllabus_kitab_5",
    name: "Usul al-Shashi",
    subject: "Principles of Jurisprudence (Usul al-Fiqh)",
    className: "Kitab Division (Fazilat)",
    classId: "cls_2",
    periodSlotId: "period_kitab_5",
    period_order: 5,
    periodName: "5th Period: Principles of Fiqh (Usul al-Shashi)",
    semester: "1st Semester",
    teacherName: "Maulana Mufti Abdullah",
    teacherId: "teacher_1",
    startPage: 1,
    endPage: 120,
    currentPage: 45,
    totalPages: 120,
    targetDate: "2026-07-31",
    status: "IN_PROGRESS",
    notes: "Classical foundation of Hanafi legal reasoning.",
    updatedAt: "2026-08-22T14:30:00.000Z",
  },
  {
    id: "syllabus_kitab_6",
    name: "Riyadus Saliheen",
    subject: "Hadith & Moral Conduct",
    className: "Kitab Division (Fazilat)",
    classId: "cls_2",
    periodSlotId: "period_6",
    period_order: 6,
    periodName: "6th Period: Mutala & Study Session",
    semester: "1st Semester",
    teacherName: "Shaykhul Hadith Maulana Zakariya",
    teacherId: "teacher_2",
    startPage: 1,
    endPage: 250,
    currentPage: 110,
    totalPages: 250,
    targetDate: "2026-08-31",
    status: "IN_PROGRESS",
    notes: "Chapters on Sincerity, Repentance, and Patience.",
    updatedAt: "2026-08-26T16:00:00.000Z",
  },

  // ── Class 3: Primary Islamic Studies (cls_3) ────────────────────────
  {
    id: "syllabus_primary_1",
    name: "Noorani Qaida with Tajweed Rules",
    subject: "Basic Quranic Phonetics & Makharij",
    className: "Primary Islamic Studies",
    classId: "cls_3",
    periodSlotId: "period_7",
    period_order: 1,
    periodName: "1st Period: Noorani Qaida & Basic Tajweed",
    semester: "1st Semester",
    teacherName: "Hafiz Qari Osman",
    teacherId: "teacher_4",
    startPage: 1,
    endPage: 32,
    currentPage: 24,
    totalPages: 32,
    targetDate: "2026-06-30",
    status: "IN_PROGRESS",
    notes: "Huruf Murakkabat, Harkat, Tanween, and Sukoon lessons.",
    updatedAt: "2026-08-25T09:00:00.000Z",
  },
  {
    id: "syllabus_primary_2",
    name: "Ampara (Juz Amma Recitation & Hifz)",
    subject: "Quran Recitation (Nazera & Short Surahs)",
    className: "Primary Islamic Studies",
    classId: "cls_3",
    periodSlotId: "period_8",
    period_order: 2,
    periodName: "2nd Period: Ampara Recitation & Masnoon Duas",
    semester: "1st Semester",
    teacherName: "Hafiz Qari Osman",
    teacherId: "teacher_4",
    startPage: 1,
    endPage: 30,
    currentPage: 18,
    totalPages: 30,
    targetDate: "2026-06-30",
    status: "IN_PROGRESS",
    notes: "Surah An-Nas to Surah Ad-Duha memorization and recitation.",
    updatedAt: "2026-08-26T10:30:00.000Z",
  },
  {
    id: "syllabus_primary_3",
    name: "Talimul Islam (Part 1 & 2)",
    subject: "Basic Islamic Beliefs & Fiqh (Aqeedah)",
    className: "Primary Islamic Studies",
    classId: "cls_3",
    periodSlotId: "period_9",
    period_order: 3,
    periodName: "3rd Period: Islamic Beliefs & Basic Akhlaq",
    semester: "1st Semester",
    teacherName: "Maulana Mufti Abdullah",
    teacherId: "teacher_1",
    startPage: 1,
    endPage: 64,
    currentPage: 40,
    totalPages: 64,
    targetDate: "2026-06-30",
    status: "IN_PROGRESS",
    notes: "Basic Aqeedah, Kalimahs, Wudu rules, and 5 Pillars of Islam.",
    updatedAt: "2026-08-26T15:00:00.000Z",
  },
  {
    id: "syllabus_primary_4",
    name: "Amar Bangla Boi (Primary Reading)",
    subject: "Primary Bengali & Alphabets",
    className: "Primary Islamic Studies",
    classId: "cls_3",
    periodSlotId: "period_primary_4",
    period_order: 4,
    periodName: "4th Period: Elementary Bengali & Islamic Etiquette",
    semester: "1st Semester",
    teacherName: "Maulana Mahmudul Hasan",
    teacherId: "teacher_3",
    startPage: 1,
    endPage: 50,
    currentPage: 35,
    totalPages: 50,
    targetDate: "2026-06-30",
    status: "IN_PROGRESS",
    notes: "Bengali reading, writing, and moral stories.",
    updatedAt: "2026-08-25T11:00:00.000Z",
  },
  {
    id: "syllabus_primary_5",
    name: "Primary English & Math Fundamentals",
    subject: "Basic English & Numbers",
    className: "Primary Islamic Studies",
    classId: "cls_3",
    periodSlotId: "period_primary_5",
    period_order: 5,
    periodName: "5th Period: Basic English & Arithmetic",
    semester: "1st Semester",
    teacherName: "Maulana Mahmudul Hasan",
    teacherId: "teacher_3",
    startPage: 1,
    endPage: 45,
    currentPage: 20,
    totalPages: 45,
    targetDate: "2026-06-30",
    status: "IN_PROGRESS",
    notes: "Alphabet recognition, numbers, and basic additions.",
    updatedAt: "2026-08-25T11:00:00.000Z",
  },
];

export const curriculumStore = {
  getItems: (tenantId) => {
    const key = `spr_curriculum_syllabus_${tenantId || "default"}`;
    const legacyKey = `spr_curriculum_kitabs_${tenantId || "default"}`;
    let raw = readJSON(key, null);
    if (!raw) {
      raw = readJSON(legacyKey, null);
    }
    if (!raw || !Array.isArray(raw) || raw.length === 0) {
      writeJSON(key, DEFAULT_CURRICULUM_ITEMS);
      return DEFAULT_CURRICULUM_ITEMS;
    }

    // Merge missing defaults and sync periodSlotId
    let hasChanges = false;
    const existingIds = new Set(raw.map((it) => it.id));
    const missingDefaults = DEFAULT_CURRICULUM_ITEMS.filter((it) => !existingIds.has(it.id));

    let combined = raw.map((item) => {
      const def = DEFAULT_CURRICULUM_ITEMS.find((d) => d.id === item.id);
      if (def && (!item.periodSlotId || !item.period_order)) {
        hasChanges = true;
        return {
          ...item,
          periodSlotId: item.periodSlotId || def.periodSlotId,
          period_order: item.period_order || def.period_order,
          periodName: item.periodName || def.periodName,
        };
      }
      return item;
    });

    if (missingDefaults.length > 0) {
      combined = [...combined, ...missingDefaults];
      hasChanges = true;
    }

    if (hasChanges) {
      writeJSON(key, combined);
    }

    return combined;
  },

  saveItems: (tenantId, items) => {
    const key = `spr_curriculum_syllabus_${tenantId || "default"}`;
    const safe = Array.isArray(items) ? items : [];
    writeJSON(key, safe);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent("spr_curriculum_updated", { detail: safe }));
      window.dispatchEvent(new CustomEvent("spr_curriculum_kitabs_updated", { detail: safe }));
    }
    return safe;
  },

  addItem: (tenantId, data) => {
    const list = curriculumStore.getItems(tenantId);
    const start = Number(data.startPage) || 1;
    const end = Number(data.endPage) || start;
    const cur = Number(data.currentPage) || 0;
    const total = Number(data.totalPages) || (end >= start ? end - start + 1 : 1);
    let status = "NOT_STARTED";
    if (cur >= end && end > 0) status = "COMPLETED";
    else if (cur > start || cur > 0) status = "IN_PROGRESS";

    const newItem = {
      id: `syllabus_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      ...data,
      startPage: start,
      endPage: end,
      currentPage: cur,
      totalPages: total,
      status: data.status || status,
      updatedAt: new Date().toISOString(),
    };
    const updated = [newItem, ...list];
    curriculumStore.saveItems(tenantId, updated);
    return newItem;
  },

  updateItem: (tenantId, id, data) => {
    const list = curriculumStore.getItems(tenantId);
    const updated = list.map((item) => {
      if (item.id === id) {
        const start = data.startPage !== undefined ? Number(data.startPage) : item.startPage;
        const end = data.endPage !== undefined ? Number(data.endPage) : item.endPage;
        const cur = data.currentPage !== undefined ? Number(data.currentPage) : item.currentPage;
        const total = data.totalPages !== undefined ? Number(data.totalPages) : (end >= start ? end - start + 1 : item.totalPages || 1);
        let status = "NOT_STARTED";
        if (cur >= end && end > 0) status = "COMPLETED";
        else if (cur > start || cur > 0) status = "IN_PROGRESS";

        return {
          ...item,
          ...data,
          startPage: start,
          endPage: end,
          currentPage: cur,
          totalPages: total,
          status: data.status || status,
          updatedAt: new Date().toISOString(),
        };
      }
      return item;
    });
    curriculumStore.saveItems(tenantId, updated);
  },

  updateProgress: (tenantId, id, newPage, note) => {
    const list = curriculumStore.getItems(tenantId);
    const updated = list.map((item) => {
      if (item.id === id) {
        const cur = Number(newPage);
        let status = item.status;
        if (cur >= item.endPage && item.endPage > 0) status = "COMPLETED";
        else if (cur >= item.startPage || cur > 0) status = "IN_PROGRESS";
        else status = "NOT_STARTED";

        return {
          ...item,
          currentPage: cur,
          status,
          notes: note !== undefined && note !== null && note.trim() !== "" ? note : item.notes,
          updatedAt: new Date().toISOString(),
        };
      }
      return item;
    });
    curriculumStore.saveItems(tenantId, updated);
  },

  deleteItem: (tenantId, id) => {
    const list = curriculumStore.getItems(tenantId);
    const updated = list.filter((item) => item.id !== id);
    curriculumStore.saveItems(tenantId, updated);
  },

  getMetrics: (tenantId) => {
    const list = curriculumStore.getItems(tenantId);
    const total = list.length;
    const completed = list.filter((k) => k.status === "COMPLETED" || (k.currentPage >= k.endPage && k.endPage > 0)).length;
    const inProgress = list.filter((k) => k.status === "IN_PROGRESS" && k.currentPage < k.endPage).length;
    const notStarted = list.filter((k) => k.status === "NOT_STARTED" || !k.currentPage || k.currentPage === 0).length;

    let sumPct = 0;
    list.forEach((k) => {
      const start = Number(k.startPage) || 1;
      const end = Number(k.endPage) || start;
      const cur = Number(k.currentPage) || 0;
      const span = Math.max(1, end - start + 1);
      const covered = Math.max(0, cur - start + 1);
      const pct = Math.min(100, Math.round((covered / span) * 100));
      sumPct += isNaN(pct) ? 0 : pct;
    });
    const avgProgress = total > 0 ? Math.round(sumPct / total) : 0;

    return {
      totalItems: total,
      completedItems: completed,
      inProgressItems: inProgress,
      notStartedItems: notStarted,
      overallProgressPct: avgProgress,
    };
  },

  /**
   * Detects routine schedule conflicts for a book / syllabus item.
   * Checks if another book in the same Class & Section is already scheduled during the same Period Slot on overlapping days.
   */
  detectScheduleConflicts: (tenantId, {
    itemId = null,
    classId = '',
    sectionId = '',
    sectionScope = 'ALL',
    periodSlotId = '',
    scheduleType = 'FULL_WEEK',
    scheduleDays = [],
  } = {}) => {
    if (!classId || !periodSlotId) return [];

    const allItems = curriculumStore.getItems(tenantId);
    const workingDayCodes = weeklyHolidaysStore.getWorkingDayCodes(tenantId, true);

    // Normalize target days
    const targetDays = scheduleType === 'FULL_WEEK' || !Array.isArray(scheduleDays) || scheduleDays.length === 0
      ? workingDayCodes
      : scheduleDays.map((d) => weeklyHolidaysStore.normalizeDayCode(d)).filter(Boolean);

    const conflicts = [];

    allItems.forEach((other) => {
      // 1. Skip self
      if (itemId && String(other.id) === String(itemId)) return;

      // 2. Must match the same Class ID
      if (!other.classId || String(other.classId) !== String(classId)) return;

      // 3. Must match the same Period Slot ID
      if (!other.periodSlotId || String(other.periodSlotId) !== String(periodSlotId)) return;

      // 4. Section overlap check:
      const isTargetSpecific = sectionScope === 'SPECIFIC' && Boolean(sectionId);
      const isOtherSpecific = Boolean(other.sectionId);

      if (isTargetSpecific && isOtherSpecific && String(other.sectionId) !== String(sectionId)) {
        // Both are specific sections and they are different -> no conflict
        return;
      }

      // 5. Day overlap check:
      const otherDays = other.scheduleType === 'SPLIT_DAYS' && Array.isArray(other.scheduleDays) && other.scheduleDays.length > 0
        ? other.scheduleDays.map((d) => weeklyHolidaysStore.normalizeDayCode(d)).filter(Boolean)
        : workingDayCodes;

      const overlappingDayCodes = targetDays.filter((tDay) =>
        otherDays.some((oDay) => oDay === tDay || oDay.startsWith(tDay) || tDay.startsWith(oDay))
      );

      if (overlappingDayCodes.length > 0) {
        const dayNames = overlappingDayCodes.map((code) => {
          const found = WEEKDAY_OPTIONS.find((w) => w.short.toUpperCase() === code || w.code === code);
          return found ? found.short : code;
        });

        conflicts.push({
          id: other.id,
          bookName: other.name,
          subject: other.subject || '',
          periodSlotId: other.periodSlotId,
          periodName: other.periodName || 'Selected Period',
          className: other.className || '',
          classId: other.classId,
          sectionName: other.sectionName || (other.sectionId ? 'Specific Section' : 'All Sections'),
          sectionId: other.sectionId || '',
          teacherName: other.teacherName || '',
          conflictingDays: overlappingDayCodes,
          conflictingDaysLabel: dayNames.join(', '),
          isFullWeekOverlap: overlappingDayCodes.length === workingDayCodes.length,
        });
      }
    });

    return conflicts;
  },
};

// Aliases for backward compatibility
export const curriculumKitabsStore = {
  getKitabs: (tenantId) => curriculumStore.getItems(tenantId),
  saveKitabs: (tenantId, list) => curriculumStore.saveItems(tenantId, list),
  addKitab: (tenantId, data) => curriculumStore.addItem(tenantId, data),
  updateKitab: (tenantId, id, data) => curriculumStore.updateItem(tenantId, id, data),
  updateProgress: (tenantId, id, p, n) => curriculumStore.updateProgress(tenantId, id, p, n),
  deleteKitab: (tenantId, id) => curriculumStore.deleteItem(tenantId, id),
  getMetrics: (tenantId) => {
    const m = curriculumStore.getMetrics(tenantId);
    return {
      totalKitabs: m.totalItems,
      completedKitabs: m.completedItems,
      inProgressKitabs: m.inProgressItems,
      notStartedKitabs: m.notStartedItems,
      overallProgressPct: m.overallProgressPct,
    };
  },
};

// ─── Academic Period Categories Store ────────────────────────────────────────

export const DEFAULT_PERIOD_CATEGORIES = [
  {
    id: "TEACHING_PERIOD",
    code: "TEACHING_PERIOD",
    name: "Academic Teaching Period",
    badge: "Teaching Period",
    description: "Standard classroom lecture and syllabus teaching period",
    affects_class_attendance: true,
    is_active: true,
    order: 1,
  },
  {
    id: "BREAK_TIFFIN",
    code: "BREAK_TIFFIN",
    name: "Break / Tiffin Interval",
    badge: "Break / Tiffin",
    description: "Food, meal, snacks, and tiffin recess interval",
    affects_class_attendance: false,
    is_active: true,
    order: 2,
  },
  {
    id: "PRAYER_BREAK",
    code: "PRAYER_BREAK",
    name: "Salah / Prayer Break",
    badge: "Prayer Break",
    description: "Congregational prayer break for Zuhr, Asr, or Maghrib",
    affects_class_attendance: false,
    is_active: true,
    order: 3,
  },
  {
    id: "MUTALA_SESSION",
    code: "MUTALA_SESSION",
    name: "Mutala / Self Study Session",
    badge: "Mutala Session",
    description: "Dedicated revision, memorization, and self-study session",
    affects_class_attendance: true,
    is_active: true,
    order: 4,
  },
];

export const periodCategoriesStore = {
  getCategories: (tenantId) => {
    const key = `spr_period_categories_${tenantId || 'default'}`;
    const stored = readJSON(key, null);
    if (!stored || !Array.isArray(stored) || stored.length === 0) {
      return DEFAULT_PERIOD_CATEGORIES;
    }
    let hasChanges = false;
    const merged = stored.map((item) => {
      const def = DEFAULT_PERIOD_CATEGORIES.find((d) => d.id === item.id || d.code === item.code);
      if (def && item.affects_class_attendance === undefined) {
        hasChanges = true;
        return { ...item, affects_class_attendance: def.affects_class_attendance };
      }
      return item;
    });

    DEFAULT_PERIOD_CATEGORIES.forEach((def) => {
      const exists = merged.some((c) => c.id === def.id || c.code === def.code);
      if (!exists) {
        merged.push(def);
        hasChanges = true;
      }
    });
    if (hasChanges) {
      writeJSON(key, merged);
    }
    return merged;
  },
  saveCategories: (tenantId, categories) => {
    const key = `spr_period_categories_${tenantId || 'default'}`;
    writeJSON(key, categories);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent("spr_period_categories_updated", { detail: categories }));
    }
    return categories;
  },
  addCategory: (tenantId, catData) => {
    const list = periodCategoriesStore.getCategories(tenantId);
    const code = (catData.code || catData.name || "").toUpperCase().replace(/[^A-Z0-9_]/g, "_").slice(0, 30);
    const newCategory = {
      ...catData,
      id: catData.id || code || `cat_${Date.now()}`,
      code: code || `CAT_${Date.now()}`,
      name: catData.name || code,
      badge: catData.badge || catData.name || code,
      description: catData.description || "",
      affects_class_attendance: catData.affects_class_attendance !== undefined ? Boolean(catData.affects_class_attendance) : true,
      order: catData.order || list.length + 1,
      is_active: catData.is_active !== undefined ? catData.is_active : true,
      createdAt: new Date().toISOString(),
    };
    const updated = [...list, newCategory];
    periodCategoriesStore.saveCategories(tenantId, updated);
    return newCategory;
  },
  updateCategory: (tenantId, id, updatedData) => {
    const list = periodCategoriesStore.getCategories(tenantId);
    const updated = list.map((c) =>
      c.id === id || c.code === id
        ? {
            ...c,
            ...updatedData,
            id: c.id,
            code: c.code,
            updatedAt: new Date().toISOString(),
          }
        : c
    );
    periodCategoriesStore.saveCategories(tenantId, updated);
    return updated;
  },
  deleteCategory: (tenantId, id) => {
    const list = periodCategoriesStore.getCategories(tenantId);
    const updated = list.filter((c) => c.id !== id && c.code !== id);
    periodCategoriesStore.saveCategories(tenantId, updated);
    return updated;
  },
  isAttendanceTrackedForSlot: (tenantId, slotOrTypeCode) => {
    if (!slotOrTypeCode) return true;
    const typeCode = typeof slotOrTypeCode === 'string'
      ? slotOrTypeCode
      : (slotOrTypeCode.slot_type || slotOrTypeCode.code || slotOrTypeCode.id);
    const categories = periodCategoriesStore.getCategories(tenantId);
    const found = categories.find((c) => c.code === typeCode || c.id === typeCode);
    if (found) {
      return found.affects_class_attendance !== false;
    }
    if (typeCode === 'BREAK_TIFFIN' || typeCode === 'PRAYER_BREAK') {
      return false;
    }
    return true;
  },
  getAttendanceTrackedCategoryCodes: (tenantId) => {
    const categories = periodCategoriesStore.getCategories(tenantId);
    return categories
      .filter((c) => c.affects_class_attendance !== false)
      .map((c) => c.code || c.id);
  },
};

// ─── Configurable Period Sequences Store ─────────────────────────────────────

export function getOrdinalPeriodLabel(num) {
  const n = parseInt(num, 10) || 1;
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  const suffix = s[(v - 20) % 10] || s[v] || s[0];
  return `${n}${suffix} Period`;
}

export const DEFAULT_PERIOD_SEQUENCES = [
  { id: "period_seq_1", name: "1st Period", code: "PERIOD_1", badge: "1st Period", order: 1, description: "First morning academic period", is_active: true },
  { id: "period_seq_2", name: "2nd Period", code: "PERIOD_2", badge: "2nd Period", order: 2, description: "Second morning academic period", is_active: true },
  { id: "period_seq_3", name: "3rd Period", code: "PERIOD_3", badge: "3rd Period", order: 3, description: "Third morning academic period", is_active: true },
  { id: "period_seq_4", name: "4th Period", code: "PERIOD_4", badge: "4th Period", order: 4, description: "Fourth academic period / noon slot", is_active: true },
  { id: "period_seq_5", name: "5th Period", code: "PERIOD_5", badge: "5th Period", order: 5, description: "Fifth academic period / post-noon slot", is_active: true },
  { id: "period_seq_6", name: "6th Period", code: "PERIOD_6", badge: "6th Period", order: 6, description: "Sixth academic period / evening study slot", is_active: true },
  { id: "period_seq_7", name: "7th Period", code: "PERIOD_7", badge: "7th Period", order: 7, description: "Seventh academic period", is_active: true },
  { id: "period_seq_8", name: "8th Period", code: "PERIOD_8", badge: "8th Period", order: 8, description: "Eighth academic period", is_active: true },
  { id: "period_seq_9", name: "9th Period", code: "PERIOD_9", badge: "9th Period", order: 9, description: "Ninth academic period", is_active: true },
  { id: "period_seq_10", name: "10th Period", code: "PERIOD_10", badge: "10th Period", order: 10, description: "Tenth academic period", is_active: true },
  { id: "period_seq_11", name: "11th Period", code: "PERIOD_11", badge: "11th Period", order: 11, description: "Eleventh academic period", is_active: true },
  { id: "period_seq_12", name: "12th Period", code: "PERIOD_12", badge: "12th Period", order: 12, description: "Twelfth academic period", is_active: true },
];

export const periodSequencesStore = {
  getSequences: (tenantId) => {
    const key = `spr_period_sequences_${tenantId || 'default'}`;
    const stored = readJSON(key, null);
    if (!stored || !Array.isArray(stored) || stored.length === 0) {
      writeJSON(key, DEFAULT_PERIOD_SEQUENCES);
      return DEFAULT_PERIOD_SEQUENCES;
    }
    return stored.sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99));
  },
  saveSequences: (tenantId, sequences) => {
    const key = `spr_period_sequences_${tenantId || 'default'}`;
    const safe = Array.isArray(sequences) ? sequences : [];
    writeJSON(key, safe);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent("spr_period_sequences_updated", { detail: safe }));
    }
    return safe;
  },
  addSequence: (tenantId, seqData) => {
    const list = periodSequencesStore.getSequences(tenantId);
    const orderNum = parseInt(seqData.order, 10) || (list.length + 1);
    const ordinal = getOrdinalPeriodLabel(orderNum);
    const label = seqData.name || seqData.label || seqData.badge || ordinal;
    const newSeq = {
      ...seqData,
      id: seqData.id || `period_seq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      order: orderNum,
      name: label,
      badge: seqData.badge || label,
      code: (seqData.code || `PERIOD_${orderNum}`).toUpperCase().replace(/[^A-Z0-9_]/g, '_').slice(0, 30),
      description: seqData.description || "",
      is_active: seqData.is_active !== undefined ? Boolean(seqData.is_active) : true,
      createdAt: new Date().toISOString(),
    };
    const updated = [...list, newSeq].sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99));
    periodSequencesStore.saveSequences(tenantId, updated);
    return newSeq;
  },
  updateSequence: (tenantId, id, updatedData) => {
    const list = periodSequencesStore.getSequences(tenantId);
    const updated = list.map((s) =>
      s.id === id || s.code === id || String(s.order) === String(id)
        ? {
            ...s,
            ...updatedData,
            order: updatedData.order !== undefined ? parseInt(updatedData.order, 10) || s.order : s.order,
            name: updatedData.name || updatedData.label || s.name,
            badge: updatedData.badge || updatedData.name || s.badge,
            updatedAt: new Date().toISOString(),
          }
        : s
    ).sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99));
    periodSequencesStore.saveSequences(tenantId, updated);
    return updated;
  },
  deleteSequence: (tenantId, id) => {
    const list = periodSequencesStore.getSequences(tenantId);
    const updated = list.filter((s) => s.id !== id && s.code !== id && String(s.order) !== String(id));
    periodSequencesStore.saveSequences(tenantId, updated);
    return updated;
  },
  getOptions: (tenantId) => {
    const list = periodSequencesStore.getSequences(tenantId);
    return list
      .filter((s) => s.is_active !== false)
      .map((s) => ({
        value: String(s.order),
        label: s.name || s.badge || s.label || getOrdinalPeriodLabel(s.order),
        description: s.description || '',
        order: s.order,
      }));
  },
  getLabelForOrder: (tenantId, orderNum) => {
    const list = periodSequencesStore.getSequences(tenantId);
    const found = list.find((s) => String(s.order) === String(orderNum) || s.id === orderNum || s.code === orderNum);
    return found ? (found.name || found.badge || found.label) : getOrdinalPeriodLabel(orderNum);
  },
};
