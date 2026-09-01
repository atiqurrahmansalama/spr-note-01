import React, { useState, useMemo } from 'react';
import CustomSelect from '../../../components/ui/CustomSelect';
import CustomButton from '../../../components/ui/CustomButton';
import CustomInput from '../../../components/ui/CustomInput';
import TranscriptCard from './TranscriptCard';
import {
  DocumentIcon,
  PrinterIcon,
  SearchIcon,
  UserIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SparklesIcon,
} from '../../../components/ui/Icons';
import useExamData from '../hooks/useExamData';
import useTabulationData from '../hooks/useTabulationData';

/**
 * TranscriptStudioView
 * Marksheet Studio for browsing, reviewing, and batch-printing student transcripts.
 */
export default function TranscriptStudioView({ initialExamId = null, initialStudentId = null }) {
  const {
    tenantId,
    exams,
    students,
    classOptions,
    sectionOptions,
  } = useExamData();

  const [selectedExamId, setSelectedExamId] = useState(initialExamId || (exams[0]?.id ? String(exams[0].id) : ''));
  const [selectedClassId, setSelectedClassId] = useState(classOptions[0]?.value ? String(classOptions[0].value) : '');
  const [selectedSectionId, setSelectedSectionId] = useState('ALL');
  const [selectedStudentId, setSelectedStudentId] = useState(initialStudentId || '');
  const [studentSearch, setStudentSearch] = useState('');

  // Exam Options
  const examOptions = useMemo(() => {
    return exams.map((e) => ({
      value: String(e.id),
      label: `${e.name} (${e.academicYearName || 'Session'})`,
    }));
  }, [exams]);

  const {
    exam,
    studentsData,
    gradingSystem,
  } = useTabulationData({
    tenantId,
    examId: selectedExamId,
    classId: selectedClassId,
    sectionId: selectedSectionId,
    students,
  });

  // Filter students
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return studentsData;
    const q = studentSearch.toLowerCase();
    return studentsData.filter(
      (st) =>
        st.studentName.toLowerCase().includes(q) ||
        String(st.rollNumber).toLowerCase().includes(q)
    );
  }, [studentsData, studentSearch]);

  // Selected Student Result
  const currentStudentResult = useMemo(() => {
    if (selectedStudentId) {
      const found = studentsData.find((s) => String(s.studentId) === String(selectedStudentId));
      if (found) return found;
    }
    return filteredStudents[0] || null;
  }, [studentsData, filteredStudents, selectedStudentId]);

  // Auto-select first student
  React.useEffect(() => {
    if (!selectedStudentId && filteredStudents.length > 0) {
      setSelectedStudentId(String(filteredStudents[0].studentId));
    }
  }, [selectedStudentId, filteredStudents]);

  const handlePrint = () => {
    window.print();
  };

  const handleNextStudent = () => {
    if (!currentStudentResult) return;
    const currIdx = filteredStudents.findIndex((s) => s.studentId === currentStudentResult.studentId);
    if (currIdx >= 0 && currIdx + 1 < filteredStudents.length) {
      setSelectedStudentId(filteredStudents[currIdx + 1].studentId);
    }
  };

  const handlePrevStudent = () => {
    if (!currentStudentResult) return;
    const currIdx = filteredStudents.findIndex((s) => s.studentId === currentStudentResult.studentId);
    if (currIdx > 0) {
      setSelectedStudentId(filteredStudents[currIdx - 1].studentId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 rounded-2xl border theme-border theme-bg-surface shadow-xs print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-black theme-text-primary tracking-tight">
            Marksheet & Transcript Studio
          </h1>
          <p className="text-xs sm:text-sm theme-text-secondary mt-1">
            Print-ready academic transcripts with fraud-proof QR verification and institutional seals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <CustomButton
            variant="primary"
            size="sm"
            icon={PrinterIcon}
            onClick={handlePrint}
          >
            Print Marksheet
          </CustomButton>
        </div>
      </div>

      {/* Target Selector Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl border theme-border theme-bg-surface shadow-xs print:hidden">
        <CustomSelect
          label="Select Examination"
          options={examOptions}
          value={selectedExamId}
          onChange={(val) => {
            setSelectedExamId(val);
            setSelectedStudentId('');
          }}
          required
        />

        <CustomSelect
          label="Target Class"
          options={classOptions}
          value={selectedClassId}
          onChange={(val) => {
            setSelectedClassId(val);
            setSelectedStudentId('');
          }}
          required
        />

        <CustomSelect
          label="Target Section"
          options={sectionOptions}
          value={selectedSectionId}
          onChange={setSelectedSectionId}
        />
      </div>

      {/* Main Studio Grid: Student Roster Sidebar + Transcript Live Card */}
      {!selectedExamId || !selectedClassId ? (
        <div className="p-12 text-center border theme-border rounded-2xl theme-bg-surface/50 print:hidden">
          <DocumentIcon className="w-12 h-12 mx-auto theme-text-secondary/50 mb-3" />
          <h3 className="text-base font-bold theme-text-primary">Select Examination & Class</h3>
          <p className="text-xs theme-text-secondary mt-1">
            Choose an examination term and class from above to generate marksheets.
          </p>
        </div>
      ) : studentsData.length === 0 ? (
        <div className="p-12 text-center border theme-border rounded-2xl theme-bg-surface/50 print:hidden">
          <UserIcon className="w-12 h-12 mx-auto theme-text-secondary/50 mb-3" />
          <h3 className="text-base font-bold theme-text-primary">No Student Results Found</h3>
          <p className="text-xs theme-text-secondary mt-1">
            No marks have been recorded yet for this examination and class.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Student Browser List (Hidden on Print) */}
          <div className="lg:col-span-4 space-y-3 print:hidden">
            <div className="p-4 rounded-2xl border theme-border theme-bg-surface shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold theme-text-primary">
                  Class Roster ({filteredStudents.length} Students)
                </span>
              </div>

              <CustomInput
                placeholder="Search student or roll..."
                prefix={SearchIcon}
                value={studentSearch}
                onChange={setStudentSearch}
              />

              <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1 no-scrollbar">
                {filteredStudents.map((st) => {
                  const isSelected = currentStudentResult?.studentId === st.studentId;
                  return (
                    <div
                      key={st.studentId}
                      onClick={() => setSelectedStudentId(st.studentId)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'border-[var(--accent-main)] theme-bg-accent/10 shadow-xs'
                          : 'theme-border theme-bg-surface hover:theme-bg-sub/30'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-xs theme-text-primary block truncate">
                          {st.studentName}
                        </span>
                        <span className="text-[11px] theme-text-secondary block">
                          Roll: {st.rollNumber} • Rank: #{st.classRank}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-mono font-bold theme-text-primary block">
                          {st.totalObtained} M
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            st.isOverallPass
                              ? 'theme-bg-accent/10 theme-text-accent'
                              : 'bg-rose-500/10 text-rose-500'
                          }`}
                        >
                          {st.grade}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Live Transcript Preview */}
          <div className="lg:col-span-8 space-y-4">
            {/* Quick Student Pagination Bar (Hidden on Print) */}
            <div className="flex items-center justify-between p-3 rounded-xl border theme-border theme-bg-surface shadow-2xs print:hidden">
              <CustomButton
                variant="sub"
                size="xs"
                icon={ChevronLeftIcon}
                onClick={handlePrevStudent}
              >
                Previous Student
              </CustomButton>

              <span className="text-xs font-bold theme-text-primary">
                Viewing {currentStudentResult?.studentName} (Roll {currentStudentResult?.rollNumber})
              </span>

              <CustomButton
                variant="sub"
                size="xs"
                icon={ChevronRightIcon}
                onClick={handleNextStudent}
              >
                Next Student
              </CustomButton>
            </div>

            {/* Print-Ready Official Transcript */}
            <TranscriptCard
              studentResult={currentStudentResult}
              exam={exam}
              gradingSystem={gradingSystem}
            />
          </div>
        </div>
      )}
    </div>
  );
}
