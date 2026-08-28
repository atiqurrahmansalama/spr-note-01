import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../../utils/authService';

const DEFAULT_CLASSES = [
  { id: 'cls_1', name: 'Standard Hifz Division', department_name: 'Hifz' },
  { id: 'cls_2', name: 'Kitab Division (Fazilat)', department_name: 'Kitab' },
  { id: 'cls_3', name: 'Primary Islamic Studies', department_name: 'Primary' },
];

const DEFAULT_SECTIONS = [
  { id: 'sec_1', student_class: 'cls_1', section_name: 'Section A (Boys)' },
  { id: 'sec_2', student_class: 'cls_2', section_name: 'Section 1' },
  { id: 'sec_3', student_class: 'cls_3', section_name: 'Section Alpha' },
];

const DEFAULT_STUDENTS = [
  {
    id: 'stu_1',
    name: 'Ahmadullah Al-Mahdi',
    name_en: 'Ahmadullah Al-Mahdi',
    uniq_id: 'STU-2026-001',
    roll_number: '101',
    student_class: 'cls_1',
    student_class_name: 'Standard Hifz Division',
    section: 'sec_1',
    section_name: 'Section A (Boys)',
  },
  {
    id: 'stu_2',
    name: 'Mahmudur Rahman',
    name_en: 'Mahmudur Rahman',
    uniq_id: 'STU-2026-002',
    roll_number: '102',
    student_class: 'cls_1',
    student_class_name: 'Standard Hifz Division',
    section: 'sec_1',
    section_name: 'Section A (Boys)',
  },
  {
    id: 'stu_3',
    name: 'Abdullah Tariq',
    name_en: 'Abdullah Tariq',
    uniq_id: 'STU-2026-003',
    roll_number: '103',
    student_class: 'cls_1',
    student_class_name: 'Standard Hifz Division',
    section: 'sec_1',
    section_name: 'Section A (Boys)',
  },
  {
    id: 'stu_4',
    name: 'Zubair Al-Hasan',
    name_en: 'Zubair Al-Hasan',
    uniq_id: 'STU-2026-004',
    roll_number: '104',
    student_class: 'cls_2',
    student_class_name: 'Kitab Division (Fazilat)',
    section: 'sec_2',
    section_name: 'Section 1',
  },
];

const DEFAULT_PERIODS = [
  // ── Class 1: Standard Hifz Division (cls_1) ──
  {
    id: 'period_1',
    period_name: '1st Period: Sabq (New Lesson Recitation)',
    period_order: 1,
    start_time: '08:00',
    end_time: '08:45',
    slot_type: 'TEACHING_PERIOD',
    student_class: 'cls_1',
  },
  {
    id: 'period_2',
    period_name: '2nd Period: Sabqi (Recent Lessons Revision)',
    period_order: 2,
    start_time: '09:00',
    end_time: '09:45',
    slot_type: 'TEACHING_PERIOD',
    student_class: 'cls_1',
  },
  {
    id: 'period_hifz_3',
    period_name: '3rd Period: Tajweed & Makharij Rules',
    period_order: 3,
    start_time: '10:00',
    end_time: '10:45',
    slot_type: 'TEACHING_PERIOD',
    student_class: 'cls_1',
  },
  {
    id: 'period_hifz_4',
    period_name: '4th Period: Islamic Manners & Daily Duas',
    period_order: 4,
    start_time: '11:00',
    end_time: '11:45',
    slot_type: 'TEACHING_PERIOD',
    student_class: 'cls_1',
  },
  {
    id: 'period_5',
    period_name: '5th Period: Daur & Afternoon Revision',
    period_order: 5,
    start_time: '14:00',
    end_time: '14:45',
    slot_type: 'TEACHING_PERIOD',
    student_class: 'cls_1',
  },

  // ── Class 2: Kitab Division - Fazilat (cls_2) ──
  {
    id: 'period_kitab_1',
    period_name: '1st Period: Tafsir al-Quran (Jalalayn)',
    period_order: 1,
    start_time: '08:00',
    end_time: '08:45',
    slot_type: 'TEACHING_PERIOD',
    student_class: 'cls_2',
  },
  {
    id: 'period_kitab_2',
    period_name: '2nd Period: Hadith Studies (Mishkat al-Masabih)',
    period_order: 2,
    start_time: '09:00',
    end_time: '09:45',
    slot_type: 'TEACHING_PERIOD',
    student_class: 'cls_2',
  },
  {
    id: 'period_3',
    period_name: '3rd Period: Arabic Grammar & Syntax',
    period_order: 3,
    start_time: '10:00',
    end_time: '10:45',
    slot_type: 'TEACHING_PERIOD',
    student_class: 'cls_2',
  },
  {
    id: 'period_4',
    period_name: '4th Period: Islamic Jurisprudence (Fiqh)',
    period_order: 4,
    start_time: '11:00',
    end_time: '11:45',
    slot_type: 'TEACHING_PERIOD',
    student_class: 'cls_2',
  },
  {
    id: 'period_kitab_5',
    period_name: '5th Period: Principles of Fiqh (Usul al-Shashi)',
    period_order: 5,
    start_time: '14:00',
    end_time: '14:45',
    slot_type: 'TEACHING_PERIOD',
    student_class: 'cls_2',
  },
  {
    id: 'period_6',
    period_name: '6th Period: Mutala & Study Session',
    period_order: 6,
    start_time: '15:00',
    end_time: '15:45',
    slot_type: 'MUTALA_SESSION',
    student_class: 'cls_2',
  },

  // ── Class 3: Primary Islamic Studies (cls_3) ──
  {
    id: 'period_7',
    period_name: '1st Period: Noorani Qaida & Basic Tajweed',
    period_order: 1,
    start_time: '08:00',
    end_time: '08:45',
    slot_type: 'TEACHING_PERIOD',
    student_class: 'cls_3',
  },
  {
    id: 'period_8',
    period_name: '2nd Period: Ampara Recitation & Masnoon Duas',
    period_order: 2,
    start_time: '09:00',
    end_time: '09:45',
    slot_type: 'TEACHING_PERIOD',
    student_class: 'cls_3',
  },
  {
    id: 'period_9',
    period_name: '3rd Period: Islamic Beliefs & Basic Akhlaq',
    period_order: 3,
    start_time: '10:00',
    end_time: '10:45',
    slot_type: 'TEACHING_PERIOD',
    student_class: 'cls_3',
  },
  {
    id: 'period_primary_4',
    period_name: '4th Period: Elementary Bengali & Islamic Etiquette',
    period_order: 4,
    start_time: '11:00',
    end_time: '11:45',
    slot_type: 'TEACHING_PERIOD',
    student_class: 'cls_3',
  },
  {
    id: 'period_primary_5',
    period_name: '5th Period: Basic English & Arithmetic',
    period_order: 5,
    start_time: '14:00',
    end_time: '14:45',
    slot_type: 'TEACHING_PERIOD',
    student_class: 'cls_3',
  },
];

export function useAcademicData() {
  const [classes, setClasses] = useState(DEFAULT_CLASSES);
  const [sections, setSections] = useState(DEFAULT_SECTIONS);
  const [students, setStudents] = useState(DEFAULT_STUDENTS);
  const [periodSlots, setPeriodSlots] = useState(DEFAULT_PERIODS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [clsRes, secRes, stuRes, perRes] = await Promise.allSettled([
          fetchWithAuth('/api/v1/classes/'),
          fetchWithAuth('/api/v1/academy/sections/'),
          fetchWithAuth('/api/v1/students/'),
          fetchWithAuth('/api/v1/academy/periods/'),
        ]);

        if (clsRes.status === 'fulfilled' && clsRes.value.ok) {
          const clsData = await clsRes.value.json();
          const list = Array.isArray(clsData) ? clsData : clsData.results || [];
          if (list.length > 0 && isMounted) setClasses(list);
        }

        if (secRes.status === 'fulfilled' && secRes.value.ok) {
          const secData = await secRes.value.json();
          const list = Array.isArray(secData) ? secData : secData.results || [];
          if (list.length > 0 && isMounted) setSections(list);
        }

        if (stuRes.status === 'fulfilled' && stuRes.value.ok) {
          const stuData = await stuRes.value.json();
          const list = Array.isArray(stuData) ? stuData : stuData.results || [];
          if (list.length > 0 && isMounted) setStudents(list);
        }

        if (perRes.status === 'fulfilled' && perRes.value.ok) {
          const perData = await perRes.value.json();
          const list = Array.isArray(perData) ? perData : perData.results || [];
          if (list.length > 0 && isMounted) setPeriodSlots(list);
        }
      } catch (err) {
        console.warn('Using default academic roster fallback:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  return { classes, sections, students, periodSlots, loading };
}
