/**
 * SPR Note — Academic Subjects & Curriculum Taxonomy Store
 * ========================================================
 * Standard curriculum subjects, categories, and tenant-scoped customizations.
 */

import { readJSON, writeJSON } from '../coreStore';
import type { AcademicSubject, AcademicSubjectCategory } from './types';

export const ACADEMIC_SUBJECT_CATEGORIES: AcademicSubjectCategory[] = [
  { value: 'ISLAMIC_SCIENCES', label: 'Islamic Sciences & Shariah (ইসলামি শাস্ত্র)' },
  { value: 'ARABIC_LANGUAGE', label: 'Arabic Language & Literature (আরবি ভাষা ও সাহিত্য)' },
  { value: 'QURANIC_STUDIES', label: 'Quranic & Hifz Studies (কুরআন ও হিফজ)' },
  { value: 'PHILOSOPHY_LOGIC', label: 'Logic & Philosophy (যুক্তিবিদ্যা ও দর্শন)' },
  { value: 'GENERAL_ACADEMICS', label: 'General Academics & Modern Disciplines (সাধারণ শিক্ষা)' },
];

export const DEFAULT_ACADEMIC_SUBJECTS: AcademicSubject[] = [
  {
    id: 'subj_1',
    name: 'Islamic Jurisprudence (Fiqh)',
    name_bn: 'ইসলামি আইন ও ফিকহ',
    code: 'FIQH',
    type: 'ISLAMIC_SCIENCES',
    order: 1,
    is_active: true,
    description: 'Classical and contemporary Islamic jurisprudence (ফিকহ শাস্ত্র ও মাসআলা-মাসায়েল)',
  },
  {
    id: 'subj_2',
    name: 'Principles of Jurisprudence (Usul al-Fiqh)',
    name_bn: 'উসূলে ফিকহ',
    code: 'USUL_FIQH',
    type: 'ISLAMIC_SCIENCES',
    order: 2,
    is_active: true,
    description: 'Legal methodology, epistemology, and principles of derivation (উসূলে ফিকহ)',
  },
  {
    id: 'subj_3',
    name: 'Prophetic Traditions (Hadith)',
    name_bn: 'হাদিস শরিফ',
    code: 'HADITH',
    type: 'ISLAMIC_SCIENCES',
    order: 3,
    is_active: true,
    description: 'Prophetic narrations, Sihah Sitta, and textual commentary (হাদিস শাস্ত্র)',
  },
  {
    id: 'subj_4',
    name: 'Hadith Sciences (Usul al-Hadith)',
    name_bn: 'উসূলে হাদিস / মুসতালাহুল হাদিস',
    code: 'USUL_HADITH',
    type: 'ISLAMIC_SCIENCES',
    order: 4,
    is_active: true,
    description: 'Isnad verification, terminology, and narrators evaluation (মুসতালাহুল হাদিস)',
  },
  {
    id: 'subj_5',
    name: 'Quranic Exegesis (Tafsir)',
    name_bn: 'কুরআনের তাফসির',
    code: 'TAFSIR',
    type: 'ISLAMIC_SCIENCES',
    order: 5,
    is_active: true,
    description: 'Verse-by-verse commentary, context of revelation, and legal rulings (তাফসির)',
  },
  {
    id: 'subj_6',
    name: 'Principles of Exegesis (Usul al-Tafsir)',
    name_bn: 'উসূলে তাফসির',
    code: 'USUL_TAFSIR',
    type: 'ISLAMIC_SCIENCES',
    order: 6,
    is_active: true,
    description: 'Principles, rules, and methodologies of Quranic interpretation (উসূলে তাফসির)',
  },
  {
    id: 'subj_7',
    name: 'Arabic Syntax & Grammar (Nahw)',
    name_bn: 'নাহু / আরবি ব্যাকরণ',
    code: 'NAHW',
    type: 'ARABIC_LANGUAGE',
    order: 7,
    is_active: true,
    description: "Arabic grammar, grammatical rules, sentence structure, and I'rab (ইলমুন নাহু)",
  },
  {
    id: 'subj_8',
    name: 'Arabic Morphology (Sarf)',
    name_bn: 'সরফ / শব্দরূপ',
    code: 'SARF',
    type: 'ARABIC_LANGUAGE',
    order: 8,
    is_active: true,
    description: 'Word morphology, root conjugation, and structural paradigms (ইলমুস সরফ)',
  },
  {
    id: 'subj_9',
    name: 'Arabic Literature (Adab)',
    name_bn: 'আরবি সাহিত্য ও আদব',
    code: 'ADAB',
    type: 'ARABIC_LANGUAGE',
    order: 9,
    is_active: true,
    description: 'Classical and modern Arabic prose, poetry, and comprehension (আরবি সাহিত্য)',
  },
  {
    id: 'subj_10',
    name: 'Arabic Rhetoric (Balaghah)',
    name_bn: 'বালাগাত / অলংকার শাস্ত্র',
    code: 'BALAGHAH',
    type: 'ARABIC_LANGUAGE',
    order: 10,
    is_active: true,
    description: "Ma'ani, Bayan, and Badi' literary eloquence (ইলমুল বালাগাত)",
  },
  {
    id: 'subj_11',
    name: 'Classical Logic (Mantiq)',
    name_bn: 'মানতিক / যুক্তিবিদ্যা',
    code: 'MANTIQ',
    type: 'PHILOSOPHY_LOGIC',
    order: 11,
    is_active: true,
    description: 'Formal logic, definitions, syllogisms, and argumentation (ইলমুল মানতিক)',
  },
  {
    id: 'subj_12',
    name: 'Islamic Creed & Theology (Aqaid)',
    name_bn: 'আকাইদ ও কালাম',
    code: 'AQAID',
    type: 'ISLAMIC_SCIENCES',
    order: 12,
    is_active: true,
    description: 'Pillars of faith, Islamic dogma, and scholastic theology (ইলমুল আকাইদ)',
  },
  {
    id: 'subj_13',
    name: 'Tajweed & Quran Recitation',
    name_bn: 'তাজবিদ ও তিলাওয়াত',
    code: 'TAJWEED',
    type: 'QURANIC_STUDIES',
    order: 13,
    is_active: true,
    description: 'Makharij, Sifat, and rules of accurate Quranic recitation (তাজবিদ শাস্ত্র)',
  },
  {
    id: 'subj_14',
    name: 'General Studies & Academics',
    name_bn: 'সাধারণ পাঠ্য / জেনারেল',
    code: 'GENERAL',
    type: 'GENERAL_ACADEMICS',
    order: 14,
    is_active: true,
    description: 'General academic subjects and foundational curriculum studies',
  },
  {
    id: 'subj_15',
    name: 'Bengali Language & Literature',
    name_bn: 'বাংলা ভাষা ও সাহিত্য',
    code: 'BANGLA',
    type: 'GENERAL_ACADEMICS',
    order: 15,
    is_active: true,
    description: 'Bangla reading, composition, grammar, and literary works (বাংলা পাঠ্য)',
  },
  {
    id: 'subj_16',
    name: 'English Language & Grammar',
    name_bn: 'ইংরেজি ভাষা ও ব্যাকরণ',
    code: 'ENGLISH',
    type: 'GENERAL_ACADEMICS',
    order: 16,
    is_active: true,
    description: 'English reading, grammar, vocabulary, and composition (ইংরেজি পাঠ্য)',
  },
  {
    id: 'subj_17',
    name: 'Mathematics',
    name_bn: 'গণিত',
    code: 'MATH',
    type: 'GENERAL_ACADEMICS',
    order: 17,
    is_active: true,
    description: 'Arithmetic, algebra, and geometry fundamentals (গণিত শাস্ত্র)',
  },
  {
    id: 'subj_18',
    name: 'General Science',
    name_bn: 'বিজ্ঞান',
    code: 'SCIENCE',
    type: 'GENERAL_ACADEMICS',
    order: 18,
    is_active: true,
    description: 'Natural sciences, environmental studies, and health hygiene (বিজ্ঞান পাঠ্য)',
  },
];

export const academicSubjectsStore = {
  getSubjects: (tenantId?: string | null): AcademicSubject[] => {
    const key = `spr_academic_subjects_${tenantId || 'default'}`;
    const raw = readJSON(key, null);
    if (!raw || !Array.isArray(raw) || raw.length === 0) {
      writeJSON(key, DEFAULT_ACADEMIC_SUBJECTS);
      return DEFAULT_ACADEMIC_SUBJECTS;
    }
    return raw.sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99));
  },

  saveSubjects: (tenantId: string | null | undefined, subjects: AcademicSubject[]): AcademicSubject[] => {
    const key = `spr_academic_subjects_${tenantId || 'default'}`;
    const sorted = [...subjects].sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99));
    writeJSON(key, sorted);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('spr_academic_subjects_updated', { detail: sorted }));
    }
    return sorted;
  },

  addSubject: (tenantId: string | null | undefined, subjectData: Partial<AcademicSubject>): AcademicSubject => {
    const list = academicSubjectsStore.getSubjects(tenantId);
    const code = (subjectData.code || subjectData.name || '')
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, '_')
      .slice(0, 30);
    const newSubject: AcademicSubject = {
      ...subjectData,
      id: subjectData.id || `subj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      code: code || `SUBJ_${Date.now()}`,
      name: subjectData.name || code,
      name_bn: subjectData.name_bn || '',
      order: subjectData.order !== undefined ? Number(subjectData.order) : list.length + 1,
      type: subjectData.type || 'ISLAMIC_SCIENCES',
      description: subjectData.description || '',
      is_active: subjectData.is_active !== undefined ? subjectData.is_active : true,
      createdAt: new Date().toISOString(),
    };
    const updated = [...list, newSubject];
    academicSubjectsStore.saveSubjects(tenantId, updated);
    return newSubject;
  },

  updateSubject: (
    tenantId: string | null | undefined,
    id: string,
    updatedData: Partial<AcademicSubject>
  ): AcademicSubject[] => {
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

  deleteSubject: (tenantId: string | null | undefined, id: string): AcademicSubject[] => {
    const list = academicSubjectsStore.getSubjects(tenantId);
    const updated = list.filter((s) => s.id !== id && s.code !== id && s.name !== id);
    academicSubjectsStore.saveSubjects(tenantId, updated);
    return updated;
  },

  resetToDefaults: (tenantId?: string | null): AcademicSubject[] => {
    return academicSubjectsStore.saveSubjects(tenantId, DEFAULT_ACADEMIC_SUBJECTS);
  },
};
