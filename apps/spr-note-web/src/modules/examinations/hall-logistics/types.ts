import React from 'react';

export type HallLogisticsTab = 'ADMIT_CARDS' | 'SEAT_PLAN' | 'ATTENDANCE_SHEETS';

export interface AdmitCardRoutineItem {
  id: string;
  subjectName: string;
  subjectCode?: string;
  examDate: string;
  dayOfWeek?: string;
  startTime: string;
  endTime: string;
  roomNumber?: string;
  fullMarks?: number;
}

export interface AdmitCardStudent {
  id: string | number;
  rollNumber: string | number;
  uniqId: string;
  name: string;
  nameBn?: string;
  className: string;
  classId: string | number;
  sectionName?: string;
  sectionId?: string | number;
  groupName?: string;
  photoUrl?: string;
  gender?: string;
  fatherName?: string;
  sessionYear: string;
  examTitle: string;
  examId: string | number;
  roomNumber?: string;
  routine: AdmitCardRoutineItem[];
  codeOfConduct?: string[];
}

export interface DeskSlipItem {
  id: string | number;
  studentId: string | number;
  rollNumber: string | number;
  uniqId: string;
  name: string;
  nameBn?: string;
  className: string;
  classId: string | number;
  sectionName?: string;
  groupName?: string;
  examTitle: string;
  roomName: string;
  benchNumber: string | number;
  seatPosition?: 'Left' | 'Right' | 'Center' | 'Seat 1' | 'Seat 2' | 'Seat 3' | string;
  sessionYear: string;
}

export interface HallAttendanceStudentRow {
  sl: number;
  studentId: string | number;
  rollNumber: string | number;
  uniqId: string;
  name: string;
  className: string;
  sectionName?: string;
  scriptSerialNo?: string;
  extraScriptCount?: number | string;
  status?: 'PRESENT' | 'ABSENT' | 'EXPELLED';
  remarks?: string;
}

export interface HallAttendanceSheetData {
  examId: string | number;
  examTitle: string;
  sessionYear: string;
  subjectName: string;
  subjectCode?: string;
  paper?: string;
  examDate: string;
  startTime: string;
  endTime: string;
  roomName: string;
  roomCapacity?: number;
  invigilatorName?: string;
  institutionName: string;
  institutionLogo?: string;
  institutionAddress?: string;
  students: HallAttendanceStudentRow[];
}

export type AdmitCardPrintLayout = '1_PER_PAGE' | '2_PER_PAGE' | '4_PER_PAGE';
export type DeskSlipPrintLayout = '6_PER_PAGE' | '8_PER_PAGE' | '10_PER_PAGE';
