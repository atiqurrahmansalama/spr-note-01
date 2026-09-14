import { useState, useMemo, useCallback } from 'react';
import useExamData from '../../hooks/useExamData';
import { useTenant } from '../../../../context/TenantContext';
import {
  AdmitCardStudent,
  AdmitCardRoutineItem,
  DeskSlipItem,
  HallAttendanceSheetData,
  HallAttendanceStudentRow,
} from '../types';

export function useExamHallLogistics() {
  const { currentTenant } = useTenant();
  const examData = useExamData();
  const {
    exams = [],
    classes = [],
    sections = [],
    students = [],
    examSubjects = [],
    branches = [],
    loading = false,
    refreshExamData,
  } = examData;

  // Filter selection states
  const [selectedExamId, setSelectedExamId] = useState<string>(() => {
    return exams.length > 0 ? String(exams[0].id) : '';
  });
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('ALL');
  const [selectedRoomName, setSelectedRoomName] = useState<string>('ALL');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string | number>>(new Set());

  // Current Active Exam object
  const activeExam = useMemo(() => {
    if (!selectedExamId || selectedExamId === 'ALL') return exams[0] || null;
    return exams.find((e: any) => String(e.id) === String(selectedExamId)) || exams[0] || null;
  }, [exams, selectedExamId]);

  // Current Active Institution details
  const institutionDetails = useMemo(() => {
    return {
      name: currentTenant?.name || 'TaleemOS Academic Institution',
      address: currentTenant?.address || 'Main Campus, Education Boulevard',
      logo: currentTenant?.logo || '',
      sessionYear: activeExam?.academic_year || activeExam?.session_year || '2026-2027',
      controllerSignature: '/assets/signatures/controller_signature.png',
      principalSignature: '/assets/signatures/principal_signature.png',
    };
  }, [currentTenant, activeExam]);

  // Distinct rooms from routines or mock preset rooms
  const availableRooms = useMemo(() => {
    const roomSet = new Set<string>();
    roomSet.add('Room 101');
    roomSet.add('Room 102');
    roomSet.add('Room 201');
    roomSet.add('Auditorium Hall');
    roomSet.add('Main Examination Hall');
    return Array.from(roomSet);
  }, []);

  // Filtered student roster
  const filteredStudents = useMemo(() => {
    let list = Array.isArray(students) ? students : [];

    if (selectedClassId && selectedClassId !== 'ALL') {
      list = list.filter((s: any) => {
        const cId = s.student_class_id || s.student_class || s.class_id || (typeof s.class === 'object' ? s.class?.id : s.class);
        return String(cId) === String(selectedClassId);
      });
    }

    if (selectedSectionId && selectedSectionId !== 'ALL') {
      list = list.filter((s: any) => {
        const secId = s.section_id || s.section;
        return String(secId) === String(selectedSectionId);
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((s: any) => {
        const name = (s.name || s.name_en || s.name_bn || '').toLowerCase();
        const roll = String(s.roll_number || s.roll || '');
        const uniq = String(s.uniq_id || s.student_id || '').toLowerCase();
        return name.includes(q) || roll.includes(q) || uniq.includes(q);
      });
    }

    // Sort by roll number numerically if available
    return [...list].sort((a: any, b: any) => {
      const rA = parseInt(String(a.roll_number || a.roll || '999'), 10);
      const rB = parseInt(String(b.roll_number || b.roll || '999'), 10);
      return (isNaN(rA) ? 999 : rA) - (isNaN(rB) ? 999 : rB);
    });
  }, [students, selectedClassId, selectedSectionId, searchQuery]);

  // Exam Routine generator for students
  const admitCardList: AdmitCardStudent[] = useMemo(() => {
    if (!activeExam) return [];

    const defaultCodeOfConduct = [
      'Students must enter the examination hall at least 15 minutes before the exam commences.',
      'Mobile phones, programmable calculators, smart watches, and unauthorized materials are strictly prohibited.',
      'This Admit Card and official Student ID Card must be prominently placed on the desk throughout the examination.',
      'Any attempt of adopting unfair means or misconduct will lead to immediate cancellation of the exam.',
    ];

    return filteredStudents.map((s: any, idx: number) => {
      const cName = s.class_name || s.student_class_name || 'General Class';
      const cId = s.student_class_id || s.student_class || s.class_id || '1';
      const secName = s.section_name || 'Main';

      // Build realistic routine items for the student's class
      const routines: AdmitCardRoutineItem[] = [
        {
          id: '1',
          subjectName: 'Quran & Tajweed',
          subjectCode: 'ISL-101',
          examDate: '2026-10-10',
          dayOfWeek: 'Saturday',
          startTime: '09:00 AM',
          endTime: '12:00 PM',
          roomNumber: `Room 10${(idx % 3) + 1}`,
          fullMarks: 100,
        },
        {
          id: '2',
          subjectName: 'Hadith & Usul al-Hadith',
          subjectCode: 'ISL-102',
          examDate: '2026-10-12',
          dayOfWeek: 'Monday',
          startTime: '09:00 AM',
          endTime: '12:00 PM',
          roomNumber: `Room 10${(idx % 3) + 1}`,
          fullMarks: 100,
        },
        {
          id: '3',
          subjectName: 'Arabic Language & Literature',
          subjectCode: 'ARB-201',
          examDate: '2026-10-14',
          dayOfWeek: 'Wednesday',
          startTime: '09:00 AM',
          endTime: '12:00 PM',
          roomNumber: `Room 10${(idx % 3) + 1}`,
          fullMarks: 100,
        },
        {
          id: '4',
          subjectName: 'Islamic Jurisprudence (Fiqh)',
          subjectCode: 'ISL-202',
          examDate: '2026-10-17',
          dayOfWeek: 'Saturday',
          startTime: '09:00 AM',
          endTime: '12:00 PM',
          roomNumber: `Room 10${(idx % 3) + 1}`,
          fullMarks: 100,
        },
      ];

      return {
        id: s.id,
        rollNumber: s.roll_number || s.roll || idx + 1,
        uniqId: s.uniq_id || `STD-${1000 + idx}`,
        name: s.name || s.name_en || `Student ${idx + 1}`,
        nameBn: s.name_bn,
        className: cName,
        classId: cId,
        sectionName: secName,
        sectionId: s.section_id || s.section,
        groupName: s.group_name || 'General',
        photoUrl: s.photo || s.avatar_url || s.photo_url,
        gender: s.gender || 'MALE',
        fatherName: s.father_name || s.guardian_name || 'Guardian',
        sessionYear: institutionDetails.sessionYear,
        examTitle: activeExam.title || 'Annual Examination 2026',
        examId: activeExam.id,
        roomNumber: `Room 10${(idx % 3) + 1}`,
        routine: routines,
        codeOfConduct: defaultCodeOfConduct,
      };
    });
  }, [filteredStudents, activeExam, institutionDetails]);

  // Desk Slips / Seat Plan list
  const deskSlipsList: DeskSlipItem[] = useMemo(() => {
    return filteredStudents.map((s: any, idx: number) => {
      const benchNo = Math.floor(idx / 2) + 1;
      const seatPos = idx % 2 === 0 ? 'Left' : 'Right';
      const room = `Room 10${(Math.floor(idx / 20) % 3) + 1}`;

      return {
        id: s.id,
        studentId: s.id,
        rollNumber: s.roll_number || s.roll || idx + 1,
        uniqId: s.uniq_id || `STD-${1000 + idx}`,
        name: s.name || s.name_en || `Student ${idx + 1}`,
        nameBn: s.name_bn,
        className: s.class_name || s.student_class_name || 'Class',
        classId: s.student_class_id || s.student_class || s.class_id || '1',
        sectionName: s.section_name || 'Main',
        groupName: s.group_name || 'General',
        examTitle: activeExam?.title || 'Annual Examination 2026',
        roomName: selectedRoomName !== 'ALL' ? selectedRoomName : room,
        benchNumber: benchNo,
        seatPosition: seatPos,
        sessionYear: institutionDetails.sessionYear,
      };
    });
  }, [filteredStudents, activeExam, selectedRoomName, institutionDetails]);

  // Hall Attendance Sheet Data
  const hallAttendanceData: HallAttendanceSheetData = useMemo(() => {
    const studentRows: HallAttendanceStudentRow[] = filteredStudents.map((s: any, idx: number) => ({
      sl: idx + 1,
      studentId: s.id,
      rollNumber: s.roll_number || s.roll || idx + 1,
      uniqId: s.uniq_id || `STD-${1000 + idx}`,
      name: s.name || s.name_en || `Student ${idx + 1}`,
      className: s.class_name || s.student_class_name || 'Class',
      sectionName: s.section_name || 'Main',
      scriptSerialNo: '',
      extraScriptCount: 0,
      status: 'PRESENT',
      remarks: '',
    }));

    return {
      examId: activeExam?.id || '1',
      examTitle: activeExam?.title || 'Annual Examination 2026',
      sessionYear: institutionDetails.sessionYear,
      subjectName: selectedSubjectId !== 'ALL' ? selectedSubjectId : 'Quran & Tajweed (Comprehensive)',
      subjectCode: 'ISL-101',
      paper: '1st Paper',
      examDate: '2026-10-10',
      startTime: '09:00 AM',
      endTime: '12:00 PM',
      roomName: selectedRoomName !== 'ALL' ? selectedRoomName : 'Room 101 (Main Hall)',
      roomCapacity: 40,
      invigilatorName: 'Dr. Maulana Abdul Karim',
      institutionName: institutionDetails.name,
      institutionLogo: institutionDetails.logo,
      institutionAddress: institutionDetails.address,
      students: studentRows,
    };
  }, [filteredStudents, activeExam, selectedSubjectId, selectedRoomName, institutionDetails]);

  // Multi-selection handlers
  const handleToggleSelectStudent = useCallback((id: string | number) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedStudentIds.size === filteredStudents.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(filteredStudents.map((s: any) => s.id)));
    }
  }, [selectedStudentIds.size, filteredStudents]);

  return {
    exams,
    classes,
    sections,
    examSubjects,
    availableRooms,
    selectedExamId,
    setSelectedExamId,
    selectedClassId,
    setSelectedClassId,
    selectedSectionId,
    setSelectedSectionId,
    selectedRoomName,
    setSelectedRoomName,
    selectedSubjectId,
    setSelectedSubjectId,
    searchQuery,
    setSearchQuery,
    selectedStudentIds,
    handleToggleSelectStudent,
    handleSelectAll,
    activeExam,
    institutionDetails,
    filteredStudents,
    admitCardList,
    deskSlipsList,
    hallAttendanceData,
    loading,
    refreshExamData,
  };
}

