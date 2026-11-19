/**
 * SPR Note — Document Store
 * ===========================
 * Document types, allowed format resolvers, and certificate metadata.
 */

import { readJSON, writeJSON } from "./coreStore";

export const INDIVIDUAL_DOCUMENT_FORMAT_OPTIONS = [
  { value: "PDF", label: "PDF Document (.pdf)", ext: ".pdf", mime: "application/pdf", tag: "PDF" },
  { value: "JPG", label: "JPEG / JPG Image (.jpg, .jpeg)", ext: ".jpg,.jpeg", mime: "image/jpeg", tag: "JPG" },
  { value: "PNG", label: "PNG Image (.png)", ext: ".png", mime: "image/png", tag: "PNG" },
  { value: "WEBP", label: "WebP Image (.webp)", ext: ".webp", mime: "image/webp", tag: "WEBP" },
  { value: "DOC", label: "Word Document (.doc, .docx)", ext: ".doc,.docx", mime: "application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document", tag: "DOC" },
  { value: "EXCEL", label: "Excel Spreadsheet (.xls, .xlsx)", ext: ".xls,.xlsx", mime: "application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", tag: "EXCEL" },
  { value: "TXT", label: "Text File (.txt)", ext: ".txt", mime: "text/plain", tag: "TXT" },
];

export function resolveAllowedFormatsConfig(allowedFormats) {
  if (!allowedFormats || (Array.isArray(allowedFormats) && allowedFormats.length === 0)) {
    return {
      accept: ".pdf,.jpg,.jpeg,.png,.webp",
      subLabel: "PDF, JPG, PNG, WebP (Max 5MB)",
      tags: ["PDF", "JPG", "PNG", "WEBP"],
    };
  }

  // Handle legacy string values
  if (typeof allowedFormats === "string") {
    if (allowedFormats === "PDF_ONLY") {
      return { accept: ".pdf", subLabel: "PDF Only (Max 5MB)", tags: ["PDF"] };
    }
    if (allowedFormats === "IMAGE_ONLY") {
      return { accept: ".jpg,.jpeg,.png,.webp,image/*", subLabel: "JPG, PNG, WebP (Max 5MB)", tags: ["JPG", "PNG", "WEBP"] };
    }
    if (allowedFormats === "ALL_DOCS") {
      return { accept: ".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp", subLabel: "PDF, DOC, DOCX, Images (Max 5MB)", tags: ["PDF", "DOC", "JPG", "PNG"] };
    }
    return { accept: ".pdf,.jpg,.jpeg,.png,.webp,image/*", subLabel: "PDF, JPG, PNG (Max 5MB)", tags: ["PDF", "JPG", "PNG"] };
  }

  const selectedOptions = INDIVIDUAL_DOCUMENT_FORMAT_OPTIONS.filter((opt) =>
    allowedFormats.includes(opt.value)
  );

  if (selectedOptions.length === 0) {
    return {
      accept: ".pdf,.jpg,.jpeg,.png,.webp",
      subLabel: "PDF, JPG, PNG (Max 5MB)",
      tags: ["PDF", "JPG", "PNG"],
    };
  }

  const exts = selectedOptions.map((o) => o.ext).join(",");
  const tags = selectedOptions.map((o) => o.tag);
  return {
    accept: exts,
    subLabel: `${tags.join(", ")} (Max 5MB)`,
    tags,
  };
}

export const DEFAULT_DOCUMENT_TYPES = [
  {
    id: "doc_type_1",
    name: "Birth Registration Certificate (BRN)",
    name_bn: "অনলাইন জন্ম নিবন্ধন সনদ",
    code: "BIRTH_CERTIFICATE",
    type: "STUDENT",
    allowed_formats: ["PDF", "JPG", "PNG", "WEBP"],
    order: 1,
    description: "Official 17-digit digital birth registration certificate copy",
    is_active: true,
  },
  {
    id: "doc_type_2",
    name: "National ID Card (NID)",
    name_bn: "জাতীয় পরিচয়পত্র (এনআইডি)",
    code: "NID_CARD",
    type: "UNIVERSAL",
    allowed_formats: ["PDF", "JPG", "PNG", "WEBP"],
    order: 2,
    description: "National Identification Smart Card / Old NID document",
    is_active: true,
  },
  {
    id: "doc_type_3",
    name: "Guardian National ID (NID)",
    name_bn: "অভিভাবকের জাতীয় পরিচয়পত্র",
    code: "GUARDIAN_NID",
    type: "STUDENT",
    allowed_formats: ["PDF", "JPG", "PNG", "WEBP"],
    order: 3,
    description: "Father, Mother, or Legal Guardian NID Card copy",
    is_active: true,
  },
  {
    id: "doc_type_4",
    name: "Dawra-e-Hadith Sanad / Certificate",
    name_bn: "দাওরায়ে হাদিস (তাকমিল) সনদ",
    code: "DAWRA_HADITH_SANAD",
    type: "STAFF",
    allowed_formats: ["PDF", "JPG", "PNG", "WEBP"],
    order: 4,
    description: "Al-Haiatul Ulya / Qawmi Board Masters equivalent Sanad",
    is_active: true,
  },
  {
    id: "doc_type_5",
    name: "Kamil Certificate",
    name_bn: "কামিল সনদ",
    code: "KAMIL_CERTIFICATE",
    type: "STAFF",
    allowed_formats: ["PDF", "JPG", "PNG", "WEBP"],
    order: 5,
    description: "Islamic Arabic University / Madrasah Board Kamil Certificate",
    is_active: true,
  },
  {
    id: "doc_type_6",
    name: "Hifzul Quran Sanad",
    name_bn: "হিফজুল কুরআন সমাপন সনদ",
    code: "HIFZ_SANAD",
    type: "UNIVERSAL",
    allowed_formats: ["PDF", "JPG", "PNG", "WEBP"],
    order: 6,
    description: "30 Para complete Hifz completion certificate",
    is_active: true,
  },
  {
    id: "doc_type_7",
    name: "Fazil / Bachelor Degree Certificate",
    name_bn: "ফাজিল / স্নাতক ডিগ্রি সনদ",
    code: "FAZIL_DEGREE",
    type: "STAFF",
    allowed_formats: ["PDF", "JPG", "PNG", "WEBP"],
    order: 7,
    description: "Fazil / B.A. / B.Sc / Equivalent Degree Certificate",
    is_active: true,
  },
  {
    id: "doc_type_8",
    name: "Previous Academy Transfer Certificate (TC)",
    name_bn: "ছাড়পত্র / ট্রান্সফার সার্টিফিকেট (টিসি)",
    code: "TRANSFER_CERTIFICATE",
    type: "STUDENT",
    allowed_formats: ["PDF", "JPG", "PNG", "WEBP"],
    order: 8,
    description: "Official Transfer / Release Certificate from Previous Madrasah / School",
    is_active: true,
  },
  {
    id: "doc_type_9",
    name: "Previous Exam Marksheet / Academic Transcript",
    name_bn: "নম্বরপত্র / একাডেমিক মার্কশিট",
    code: "ACADEMIC_MARKSHEET",
    type: "UNIVERSAL",
    allowed_formats: ["PDF", "JPG", "PNG", "WEBP"],
    order: 9,
    description: "Official Marksheet or Grade Sheet from Previous Examination",
    is_active: true,
  },
  {
    id: "doc_type_10",
    name: "Curriculum Vitae (CV) / Resume",
    name_bn: "সিভি ও জীবনবৃত্তান্ত",
    code: "CV_RESUME",
    type: "STAFF",
    allowed_formats: ["PDF", "DOC", "JPG", "PNG"],
    order: 10,
    description: "Candidate Updated CV / Bio-data Document",
    is_active: true,
  },
  {
    id: "doc_type_11",
    name: "Teaching / Professional Experience Certificate",
    name_bn: "শিক্ষকতা ও কর্ম অভিজ্ঞতার সনদ",
    code: "EXPERIENCE_CERTIFICATE",
    type: "STAFF",
    allowed_formats: ["PDF", "JPG", "PNG", "WEBP"],
    order: 11,
    description: "Prior Teaching or Administrative Experience Letter",
    is_active: true,
  },
  {
    id: "doc_type_12",
    name: "Medical / Health Clearance Certificate",
    name_bn: "মেডিকেল ও স্বাস্থ্য সনদ",
    code: "MEDICAL_CERTIFICATE",
    type: "UNIVERSAL",
    allowed_formats: ["PDF", "JPG", "PNG", "WEBP"],
    order: 12,
    description: "Health Fitness and Blood Group Medical Certificate",
    is_active: true,
  },
];

export const documentTypesStore = {
  getTypes: (tenantId, targetCategory = null) => {
    const key = `spr_document_types_${tenantId || 'default'}`;
    const raw = readJSON(key, null);
    let list = raw;
    if (!raw || !Array.isArray(raw) || raw.length === 0) {
      writeJSON(key, DEFAULT_DOCUMENT_TYPES);
      list = DEFAULT_DOCUMENT_TYPES;
    }
    const sorted = [...list].sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99));
    if (targetCategory) {
      return sorted.filter((d) => d.type === "UNIVERSAL" || d.type === targetCategory);
    }
    return sorted;
  },
  getDocumentTypes: (tenantId, targetCategory = null) => {
    return documentTypesStore.getTypes(tenantId, targetCategory);
  },
  saveTypes: (tenantId, types) => {
    const key = `spr_document_types_${tenantId || 'default'}`;
    const sorted = [...types].sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99));
    writeJSON(key, sorted);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent("spr_document_types_updated", { detail: sorted }));
    }
    return sorted;
  },
  addType: (tenantId, docData) => {
    const list = documentTypesStore.getTypes(tenantId);
    const code = (docData.code || docData.name || "").toUpperCase().replace(/[^A-Z0-9_]/g, "_").slice(0, 30);
    const newDoc = {
      ...docData,
      id: docData.id || `doc_type_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      code: code || `DOC_${Date.now()}`,
      name: docData.name || code,
      name_bn: docData.name_bn || "",
      allowed_formats: Array.isArray(docData.allowed_formats)
        ? docData.allowed_formats
        : (docData.allowed_format ? [docData.allowed_format] : ["PDF", "JPG", "PNG", "WEBP"]),
      order: docData.order !== undefined ? Number(docData.order) : list.length + 1,
      type: docData.type || "UNIVERSAL",
      description: docData.description || "",
      is_active: docData.is_active !== undefined ? docData.is_active : true,
      createdAt: new Date().toISOString(),
    };
    const updated = [...list, newDoc];
    documentTypesStore.saveTypes(tenantId, updated);
    return newDoc;
  },
  updateType: (tenantId, id, updatedData) => {
    const list = documentTypesStore.getTypes(tenantId);
    const updated = list.map((d) =>
      d.id === id || d.code === id
        ? {
            ...d,
            ...updatedData,
            id: d.id,
            code: d.code,
            allowed_formats: Array.isArray(updatedData.allowed_formats)
              ? updatedData.allowed_formats
              : (updatedData.allowed_format ? [updatedData.allowed_format] : (d.allowed_formats || ["PDF", "JPG", "PNG", "WEBP"])),
            order: updatedData.order !== undefined ? Number(updatedData.order) : d.order,
            updatedAt: new Date().toISOString(),
          }
        : d
    );
    documentTypesStore.saveTypes(tenantId, updated);
    return updated;
  },
  deleteType: (tenantId, id) => {
    const list = documentTypesStore.getTypes(tenantId);
    const updated = list.filter((d) => d.id !== id && d.code !== id);
    documentTypesStore.saveTypes(tenantId, updated);
    return updated;
  },
  resetToDefaults: (tenantId) => {
    return documentTypesStore.saveTypes(tenantId, DEFAULT_DOCUMENT_TYPES);
  },
};
