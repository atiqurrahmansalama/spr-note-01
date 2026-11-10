import { getClassId, getSectionId, getDepartmentId } from "@/modules/learning/daily-classroom/utils/dailyClassroomUtils";
import { students as studentStore } from "@/utils/localStore";
import { sortStudentsByUsage } from "@/utils/studentUsageTracker";

export interface NormalizedStudentProfile {
  id?: string;
  label: string;
  name: string;
  name_en: string;
  sub: string;
  section_name?: string;
  roll_number?: number | string;
  student_id_card_number?: string;
  uniq_id?: string;
  badge?: string;
  student_class?: string | number;
  student_class_name?: string;
  student_section?: string | number;
  department?: string | number;
  department_name?: string;
  originalData?: any;
}

/**
 * Enterprise Single Source of Truth for Student Ingestion, Deduplication, and Badging.
 * Harmonizes academic server records, local student database, and offline store drafts.
 */
export function resolveAllStudentDatabase(
  academicStudents: any[] = [],
  studentDatabase: any[] = []
): NormalizedStudentProfile[] {
  const fullList: NormalizedStudentProfile[] = [];
  const seenIds = new Set<string>();
  const seenUniqs = new Set<string>();
  const seenCards = new Set<string>();
  const idToIdxMap = new Map<string, number>();

  const appendStudent = (st: any) => {
    const stName = (typeof st === "object" ? st.name_en || st.name || st.label : String(st || "")).trim();
    if (!stName) return;

    const secSub =
      typeof st === "object"
        ? st.section_name ||
          st.student_section_name ||
          (st.section && typeof st.section === "object" ? st.section.section_name : null) ||
          st.sub ||
          st.group_name ||
          st.student_class_name ||
          ""
        : "";

    const roll = typeof st === "object" ? (st.roll_number ?? st.originalData?.roll_number) : undefined;
    const cardNo = typeof st === "object" ? (st.student_id_card_number ?? st.originalData?.student_id_card_number) : undefined;
    const uniq = typeof st === "object" ? (st.uniq_id ?? st.originalData?.uniq_id) : undefined;
    const rawId = typeof st === "object" && (st?.id != null ? String(st.id) : (st?.student_id != null ? String(st.student_id) : null));

    const stClsId = typeof st === "object" ? getClassId(st) || (st.student_class || st.class_id) : undefined;
    const stSecId = typeof st === "object" ? getSectionId(st) || (st.student_section || st.section_id) : undefined;
    const stDeptId = typeof st === "object" ? getDepartmentId(st) || (st.department || st.department_id) : undefined;

    const hasId = rawId != null && String(rawId).trim() !== "";
    const hasUniq = Boolean(uniq && String(uniq).trim() !== "");
    const hasCard = Boolean(cardNo && String(cardNo).trim() !== "");

    // Deduplicate strictly by unique identifiers to allow multiple students with the exact same name
    const isDuplicateId = hasId && seenIds.has(String(rawId));
    const isDuplicateUniq = hasUniq && seenUniqs.has(String(uniq));
    const isDuplicateCard = hasCard && seenCards.has(String(cardNo));

    if (isDuplicateId || isDuplicateUniq || isDuplicateCard) {
      const existingIdx = hasId
        ? idToIdxMap.get(`id_${rawId}`)
        : hasUniq
        ? idToIdxMap.get(`uniq_${uniq}`)
        : idToIdxMap.get(`card_${cardNo}`);

      if (existingIdx !== undefined && fullList[existingIdx]) {
        const target = fullList[existingIdx];
        if (!target.id && rawId) target.id = rawId;
        if (!target.roll_number && roll != null) target.roll_number = roll;
        if (!target.student_id_card_number && cardNo) target.student_id_card_number = cardNo;
        if (!target.uniq_id && uniq) target.uniq_id = uniq;
        if (!target.student_class && stClsId) target.student_class = stClsId;
        if (!target.student_section && stSecId) target.student_section = stSecId;
        if (!target.department && stDeptId) target.department = stDeptId;
        if (!target.sub && secSub) target.sub = secSub;
      }
      return;
    }

    // Fallback composite key for legacy records completely lacking unique identifiers
    if (!hasId && !hasUniq && !hasCard) {
      const normName = stName.toLowerCase();
      const fallbackKey = `noid_${normName}_cls_${stClsId || ""}_sec_${stSecId || ""}_roll_${roll != null ? roll : ""}`;
      if (idToIdxMap.has(fallbackKey)) return;
      idToIdxMap.set(fallbackKey, fullList.length);
      fullList.push({
        id: undefined,
        label: stName,
        name: stName,
        name_en: typeof st === "object" ? st.name_en || stName : stName,
        sub: secSub,
        section_name: (typeof st === "object" ? st.section_name || st.student_section_name : null) || secSub || undefined,
        roll_number: roll,
        student_id_card_number: cardNo,
        uniq_id: uniq,
        badge: undefined,
        student_class: stClsId,
        student_class_name: typeof st === "object" ? st.student_class_name || st.class_name : undefined,
        student_section: stSecId,
        department: stDeptId,
        department_name: typeof st === "object" ? st.department_name : undefined,
        originalData: st,
      });
      return;
    }

    const newIdx = fullList.length;
    if (hasId) {
      seenIds.add(String(rawId));
      idToIdxMap.set(`id_${rawId}`, newIdx);
    }
    if (hasUniq) {
      seenUniqs.add(String(uniq));
      idToIdxMap.set(`uniq_${uniq}`, newIdx);
    }
    if (hasCard) {
      seenCards.add(String(cardNo));
      idToIdxMap.set(`card_${cardNo}`, newIdx);
    }

    const badge =
      (typeof st === "object" && st.badge ? st.badge : null) ||
      (typeof uniq === "string" && uniq.trim() ? uniq.trim() : null) ||
      (typeof cardNo === "string" && cardNo.trim() ? cardNo.trim() : null) ||
      (roll != null ? `Roll: ${roll}` : undefined) ||
      (rawId != null ? `ID: ${rawId}` : undefined);

    fullList.push({
      id: rawId || undefined,
      label: stName,
      name: stName,
      name_en: typeof st === "object" ? st.name_en || stName : stName,
      sub: secSub,
      section_name: (typeof st === "object" ? st.section_name || st.student_section_name : null) || secSub || undefined,
      roll_number: roll,
      student_id_card_number: cardNo,
      uniq_id: uniq,
      badge,
      student_class: stClsId,
      student_class_name: typeof st === "object" ? st.student_class_name || st.class_name : undefined,
      student_section: stSecId,
      department: stDeptId,
      department_name: typeof st === "object" ? st.department_name : undefined,
      originalData: st,
    });
  };

  (academicStudents || []).forEach(appendStudent);
  (studentDatabase || []).forEach(appendStudent);

  // Fallback or reconcile with studentStore
  if (fullList.length === 0) {
    (studentStore.getAll() || []).forEach(appendStudent);
  } else {
    const canonicalKeys = new Set(
      fullList.map((s: any) => `${(s.name_en || s.name || s.label || '').trim().toLowerCase()}___${(s.section_name || s.sub || '').trim().toLowerCase()}`)
    );
    const staleLocalIdsToClean: string[] = [];

    (studentStore.getAll() || []).forEach((ls: any) => {
      if (!ls) return;
      const lsName = (ls.name_en || ls.name || ls.label || '').trim().toLowerCase();
      const lsGroup = (ls.section_name || ls.sub || '').trim().toLowerCase();
      const key = `${lsName}___${lsGroup}`;

      if (canonicalKeys.has(key)) {
        // If this was an uncleaned temporary local draft, queue it for eviction
        if (ls._local || (typeof ls.id === 'string' && ls.id.startsWith('stu_'))) {
          staleLocalIdsToClean.push(ls.id);
        }
      } else {
        // Genuinely distinct offline student
        appendStudent(ls);
      }
    });

    if (staleLocalIdsToClean.length > 0 && typeof studentStore.remove === 'function') {
      staleLocalIdsToClean.forEach((id) => studentStore.remove(id));
    }
  }

  return sortStudentsByUsage(fullList);
}

