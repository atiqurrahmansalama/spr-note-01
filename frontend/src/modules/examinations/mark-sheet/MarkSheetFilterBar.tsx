import React from 'react';
import CustomSelect from '@/components/ui/CustomSelect';
import { DepartmentSelect, ClassSelect, SectionSelect } from '@/components/selectors';
import {
  CalendarIcon,
  BookOpenIcon,
  AcademicCapIcon,
} from '@/components/ui/Icons';
import { formatDateLabel } from '../exam-schedules/utils/examScheduleUtils';
import { GradingSystem, Subject } from './types';

export interface SelectOption {
  value: string;
  label: string;
  [key: string]: any;
}

export interface MarkSheetFilterBarProps {
  examOptions?: SelectOption[];
  selectedExamId?: string | number;
  onExamChange?: (val: string) => void;
  departmentOptions?: any[];
  selectedDepartmentId?: string;
  onDepartmentChange?: (val: string) => void;
  classOptions?: any[];
  selectedClassId?: string;
  onClassChange?: (val: string) => void;
  sectionOptions?: any[];
  selectedSectionId?: string;
  onSectionChange?: (val: string) => void;
  subjectOptions?: SelectOption[];
  selectedSubjectId?: string | number;
  onSubjectChange?: (val: string) => void;
  selectedSubject?: Subject | null;
  availableSubjects?: Subject[];
  gradingSystem?: GradingSystem | null;
  showSubject?: boolean;
  selectedClassName?: string;
  selectedSectionName?: string;
}

/**
 * MarkSheetFilterBar
 * Universal academic filter console for Mark Entry Desk, Academic MarkSheet (Tabulation), and Student MarkSheet.
 * Reuses standard project selectors for Department, Class, and Section.
 */
export default function MarkSheetFilterBar({
  examOptions = [],
  selectedExamId = '',
  onExamChange = () => {},
  departmentOptions = [],
  selectedDepartmentId = 'ALL',
  onDepartmentChange = () => {},
  classOptions = [],
  selectedClassId = '',
  onClassChange = () => {},
  sectionOptions = [],
  selectedSectionId = 'ALL',
  onSectionChange = () => {},
  subjectOptions = [],
  selectedSubjectId = '',
  onSubjectChange = () => {},
  selectedSubject = null,
  availableSubjects = [],
  gradingSystem = null,
  showSubject = true,
  selectedClassName = '',
  selectedSectionName = '',
}: MarkSheetFilterBarProps) {
  const currentExamId = selectedExamId !== undefined && selectedExamId !== null ? String(selectedExamId) : '';
  const currentDeptId = selectedDepartmentId || 'ALL';
  const currentClassId = selectedClassId !== undefined && selectedClassId !== null ? String(selectedClassId) : '';
  const currentSectionId = selectedSectionId || 'ALL';
  const currentSubjectId = selectedSubjectId !== undefined && selectedSubjectId !== null ? String(selectedSubjectId) : '';

  return (
    <div className="p-4 sm:p-5 rounded-2xl border theme-border theme-bg-surface shadow-xs print:hidden space-y-3">
      {/* ── 1. Reusable Academic Selectors Grid ── */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${
          showSubject ? 'lg:grid-cols-5' : 'lg:grid-cols-4'
        } gap-3`}
      >
        {/* 1. Examination Session */}
        <CustomSelect
          label="Examination"
          icon={CalendarIcon}
          options={examOptions}
          value={currentExamId}
          onChange={(val: any) => {
            onExamChange(String(val || ''));
            onDepartmentChange('ALL');
            onClassChange('');
            onSectionChange('ALL');
            onSubjectChange('');
          }}
          placeholder="Choose Session..."
        />

        {/* 2. Reusable Department Selector */}
        <DepartmentSelect
          label="Department"
          departments={departmentOptions}
          value={currentDeptId}
          allowAll
          allLabel="All Departments"
          allValue="ALL"
          onChange={(val: any) => {
            onDepartmentChange(String(val || 'ALL'));
            onClassChange('');
            onSectionChange('ALL');
            onSubjectChange('');
          }}
          placeholder="All Departments"
          searchable={false}
        />

        {/* 3. Reusable Class Selector (Auto-cascaded by department) */}
        <ClassSelect
          label="Class"
          classes={classOptions}
          departmentId={currentDeptId}
          value={currentClassId}
          allowAll
          allLabel="All Classes"
          allValue=""
          onChange={(val: any) => {
            onClassChange(String(val || ''));
            onSectionChange('ALL');
            onSubjectChange('');
          }}
          placeholder="All Classes"
        />

        {/* 4. Reusable Section Selector (Auto-cascaded by class) */}
        <SectionSelect
          label="Section"
          sections={sectionOptions}
          classId={currentClassId}
          value={currentSectionId}
          allowAll
          allLabel="All Sections"
          allValue="ALL"
          onChange={(val: any) => {
            onSectionChange(String(val || 'ALL'));
            onSubjectChange('');
          }}
          placeholder="All Sections"
        />

        {/* 5. Scheduled Subject (Visible in Mark Entry Desk mode) */}
        {showSubject && (
          <CustomSelect
            label={`Subject (${availableSubjects.length})`}
            icon={BookOpenIcon}
            options={subjectOptions}
            value={currentSubjectId || (selectedSubject?.id ? String(selectedSubject.id) : '')}
            onChange={(val: any) => onSubjectChange(String(val || ''))}
            placeholder={
              !currentExamId
                ? 'Select exam term...'
                : availableSubjects.length === 0
                ? 'No subjects scheduled'
                : 'Choose Subject...'
            }
          />
        )}
      </div>

      {/* ── 2. Streamlined Context Ribbon ── */}
      {(selectedSubject || (!showSubject && currentExamId && currentClassId)) && (
        <div className="pt-2 border-t theme-border flex flex-wrap items-center justify-between gap-2 text-xs theme-text-secondary">
          {/* Left: Active Selection Summary */}
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="w-2 h-2 rounded-full theme-bg-accent shrink-0 inline-block" />
            {selectedSubject ? (
              <>
                <span className="font-bold theme-text-primary">
                  {selectedSubject.subjectName}
                </span>
                {selectedSubject.subjectCode && (
                  <span className="text-[10px] font-mono theme-text-secondary">
                    ({selectedSubject.subjectCode})
                  </span>
                )}
                <span className="opacity-40">•</span>
                <span>{selectedSubject.fullMarks || 100} Marks</span>
                {selectedSubject.examDate && (
                  <>
                    <span className="opacity-40">•</span>
                    <span>{formatDateLabel(selectedSubject.examDate)}</span>
                  </>
                )}
                {selectedSubject.roomNo && (
                  <>
                    <span className="opacity-40">•</span>
                    <span>Room {selectedSubject.roomNo}</span>
                  </>
                )}
              </>
            ) : (
              <>
                <span className="font-bold theme-text-primary">
                  {selectedClassName || 'Selected Class'}
                </span>
                <span className="opacity-40">•</span>
                <span>{selectedSectionName || 'All Sections'}</span>
              </>
            )}
          </div>

          {/* Right: Active Grading Scale Pill */}
          {gradingSystem?.name && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border theme-border theme-bg-sub/50 theme-text-secondary">
              <AcademicCapIcon className="w-3 h-3 theme-accent" />
              <span>Scale: {gradingSystem.name}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
