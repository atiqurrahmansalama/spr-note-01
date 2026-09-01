import { useState, useMemo, useCallback } from 'react';
import { examStore } from '../../../utils/stores/examStore';
import { useToast } from '../../../context/ToastContext';

/**
 * useTabulationData
 * Custom hook to calculate and aggregate master tabulation sheet and statistics.
 */
export default function useTabulationData({
  tenantId = 'default',
  examId = '',
  classId = '',
  sectionId = 'ALL',
  students = [],
}) {
  const { showToast } = useToast();

  const tabulationResult = useMemo(() => {
    if (!examId || !classId) {
      return {
        exam: null,
        subjects: [],
        studentsData: [],
        gradingSystem: null,
        totalStudents: 0,
        passedCount: 0,
        failedCount: 0,
        passPercentage: 0,
      };
    }

    return examStore.calculateTabulationMatrix(tenantId, {
      examId,
      classId,
      sectionId,
      students,
    });
  }, [tenantId, examId, classId, sectionId, students]);

  // Overall metrics
  const stats = useMemo(() => {
    const data = tabulationResult.studentsData || [];
    if (data.length === 0) return { highestMarks: 0, averageMarks: 0, averageGpa: 0 };

    let totalMarksSum = 0;
    let totalGpaSum = 0;
    let highest = 0;

    data.forEach((s) => {
      totalMarksSum += s.totalObtained || 0;
      totalGpaSum += s.overallGpa || 0;
      if (s.totalObtained > highest) highest = s.totalObtained;
    });

    return {
      highestMarks: highest,
      averageMarks: Math.round((totalMarksSum / data.length) * 10) / 10,
      averageGpa: Math.round((totalGpaSum / data.length) * 100) / 100,
    };
  }, [tabulationResult.studentsData]);

  // Export Tabulation to CSV
  const exportToCsv = useCallback(() => {
    const { exam, subjects, studentsData } = tabulationResult;
    if (!studentsData || studentsData.length === 0) {
      showToast('No student data available to export.', 'warning');
      return;
    }

    const headers = [
      'Rank',
      'Roll',
      'Student Name',
      'Section',
      ...subjects.map((s) => `${s.subjectName} (${s.fullMarks})`),
      'Total Marks',
      'Percentage (%)',
      'GPA',
      'Grade / Division',
      'Result Status',
    ];

    const rows = studentsData.map((st) => [
      st.classRank,
      `"${st.rollNumber}"`,
      `"${st.studentName}"`,
      `"${st.studentSection || 'General'}"`,
      ...st.subjectMarks.map((sm) => (sm.isAbsent ? 'ABS' : sm.obtained)),
      st.totalObtained,
      `${st.overallPercentage}%`,
      st.overallGpa,
      `"${st.grade}"`,
      st.isOverallPass ? 'PASSED' : 'FAILED',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Tabulation_${exam?.name || 'Exam'}_Class_${classId}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Tabulation sheet exported as CSV successfully.', 'success');
  }, [tabulationResult, classId, showToast]);

  return {
    ...tabulationResult,
    stats,
    exportToCsv,
  };
}
