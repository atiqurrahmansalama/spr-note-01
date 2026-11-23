import type { StaffRankItem } from '../../types';

/**
 * Ensures designation / official rank is rendered in clean, dignified English only (Zero Bengali).
 * Automatically resolves Bengali database values, matched ranks, or localized terms into canonical English.
 */
export function formatEnglishDesignation(designation?: string, ranksList?: StaffRankItem[]): string {
  if (!designation) return 'Staff';

  // 1. Check against loaded ranks list
  if (ranksList && ranksList.length > 0) {
    const matched = ranksList.find(
      (r) =>
        String(r.name).trim().toLowerCase() === String(designation).trim().toLowerCase() ||
        (r.name_bn && String(r.name_bn).trim().toLowerCase() === String(designation).trim().toLowerCase()) ||
        (r.code && String(r.code).trim().toLowerCase() === String(designation).trim().toLowerCase())
    );
    if (matched && matched.name) {
      return matched.name;
    }
  }

  // 2. If designation contains Bengali characters, convert known taxonomies to English
  if (/[\u0980-\u09FF]/.test(designation)) {
    const d = designation.trim();
    if (d.includes('মুহতামিম') || d.includes('প্রিন্সিপাল')) return 'Principal / Muhtamim';
    if (d.includes('নায়েবে') || d.includes('উপাধ্যক্ষ')) return 'Vice Principal / Naib-e-Muhtamim';
    if (d.includes('শায়খুল')) return 'Shaikhul Hadith';
    if (d.includes('তা\'লীমাত') || d.includes('শিক্ষা সচিব')) return 'Academic Director';
    if (d.includes('মুহাদ্দিস') || d.includes('জ্যেষ্ঠ শিক্ষক')) return 'Senior Lecturer / Muhaddis';
    if (d.includes('সহকারী শিক্ষক') || d.includes('উস্তাদ')) return 'Assistant Teacher / Ustadh';
    if (d.includes('হিফজ') || d.includes('ক্বারী')) return 'Hifz Instructor';
    if (d.includes('হিসাব') || d.includes('একাউন্ট্যান্ট')) return 'Head of Accounts / Accountant';
    if (d.includes('কর্মকর্তা') || d.includes('অফিস')) return 'Office Executive';
    if (d.includes('কেয়ারটেকার') || d.includes('নিরাপত্তা')) return 'Facility Caretaker';
    if (d.includes('বাবুর্চি')) return 'Head Chef';
    return 'Staff Member';
  }

  return designation;
}
