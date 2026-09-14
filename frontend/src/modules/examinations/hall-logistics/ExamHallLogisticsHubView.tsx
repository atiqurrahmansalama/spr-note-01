import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { PageContainer } from '../../../components/layout';
import { TabSwitcher, PageHeader } from '../../../components/ui';
import {
  AcademicCapIcon,
  IdentificationIcon,
  BuildingIcon,
  DocumentTextIcon,
} from '../../../components/ui/Icons';
import { HallLogisticsTab } from './types';
import { useExamHallLogistics } from './hooks/useExamHallLogistics';
import AdmitCardGeneratorView from './admit-cards/AdmitCardGeneratorView';
import DeskSlipsGeneratorView from './seat-plan/DeskSlipsGeneratorView';
import HallAttendanceSheetView from './attendance-sheets/HallAttendanceSheetView';

export interface ExamHallLogisticsHubViewProps {
  initialTab?: HallLogisticsTab;
  hideHeader?: boolean;
  isEmbedded?: boolean;
}

/**
 * Examination Hall Logistics & Admit Card Command Center
 * 
 * Unifies Admit Card Generation, Bench Seat Planning / Desk Slips,
 * and Examination Hall Attendance & Script Distribution Record Sheets.
 * Follows SPR Note Enterprise Engineering Guidelines.
 */
export default function ExamHallLogisticsHubView({
  initialTab = 'ADMIT_CARDS',
  hideHeader = false,
  isEmbedded = false,
}: ExamHallLogisticsHubViewProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Resolve active tab from URL pathname or searchParams
  const resolveActiveTab = (): HallLogisticsTab => {
    const path = location.pathname.toLowerCase();
    const tabParam = searchParams.get('tab')?.toLowerCase();

    if (
      path.includes('seat-plan') ||
      path.includes('desk-slips') ||
      tabParam === 'seat-plan' ||
      tabParam === 'seat_plan' ||
      tabParam === 'desk-slips' ||
      tabParam === 'desk_slips' ||
      tabParam === 'seatplan'
    ) {
      return 'SEAT_PLAN';
    }

    if (
      path.includes('attendance-sheets') ||
      path.includes('hall-attendance') ||
      tabParam === 'attendance-sheets' ||
      tabParam === 'attendance_sheets' ||
      tabParam === 'hall-attendance' ||
      tabParam === 'attendance'
    ) {
      return 'ATTENDANCE_SHEETS';
    }

    if (
      path.includes('admit-cards') ||
      path.includes('admit') ||
      tabParam === 'admit-cards' ||
      tabParam === 'admit_cards' ||
      tabParam === 'admit'
    ) {
      return 'ADMIT_CARDS';
    }

    return initialTab || 'ADMIT_CARDS';
  };

  const [activeTab, setActiveTab] = useState<HallLogisticsTab>(resolveActiveTab);

  useEffect(() => {
    setActiveTab(resolveActiveTab());
  }, [location.pathname, searchParams, initialTab]);

  const logistics = useExamHallLogistics();
  const {
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
  } = logistics;

  const handleTabChange = (newTabId: string) => {
    const nextTab = newTabId as HallLogisticsTab;
    setActiveTab(nextTab);

    if (nextTab === 'ADMIT_CARDS') {
      navigate('/examinations/admit-cards');
    } else if (nextTab === 'SEAT_PLAN') {
      navigate('/examinations/seat-plan');
    } else if (nextTab === 'ATTENDANCE_SHEETS') {
      navigate('/examinations/attendance-sheets');
    }
  };

  const tabs = [
    {
      id: 'ADMIT_CARDS',
      label: 'Admit Cards Generator',
      icon: IdentificationIcon,
      badge: admitCardList.length > 0 ? String(admitCardList.length) : undefined,
    },
    {
      id: 'SEAT_PLAN',
      label: 'Seat Plan & Desk Slips',
      icon: BuildingIcon,
      badge: deskSlipsList.length > 0 ? String(deskSlipsList.length) : undefined,
    },
    {
      id: 'ATTENDANCE_SHEETS',
      label: 'Hall Attendance Sheets',
      icon: DocumentTextIcon,
    },
  ];

  const content = (
    <div className="space-y-4 sm:space-y-6 text-left animate-fade-in">
      {/* 1. Page Header */}
      {!hideHeader && (
        <PageHeader
          title="Admit Cards & Hall Planning"
          subtitle="Generate and bulk-print student admit cards, bench seating stickers, and official exam hall attendance sheets."
          icon={AcademicCapIcon}
          badge={
            activeExam ? (
              <div className="flex items-center gap-2 px-2.5 py-1 theme-bg-surface border theme-border rounded-lg shadow-2xs">
                <div className="w-2 h-2 rounded-full theme-bg-accent animate-pulse" />
                <span className="text-[11px] theme-text-secondary font-medium">
                  Active Exam: <strong className="theme-text-primary">{activeExam.title || activeExam.name}</strong>
                </span>
              </div>
            ) : null
          }
        />
      )}

      {/* 2. Overview Statistics Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 theme-bg-surface border theme-border rounded-xl shadow-2xs">
          <span className="text-[11px] theme-text-secondary block font-medium">Total Examinees</span>
          <span className="text-xl font-bold font-mono theme-text-primary mt-0.5 block">
            {filteredStudents.length}
          </span>
        </div>

        <div className="p-3.5 theme-bg-surface border theme-border rounded-xl shadow-2xs">
          <span className="text-[11px] theme-text-secondary block font-medium">Examination Rooms</span>
          <span className="text-xl font-bold font-mono theme-text-primary mt-0.5 block">
            {availableRooms.length} Halls
          </span>
        </div>

        <div className="p-3.5 theme-bg-surface border theme-border rounded-xl shadow-2xs">
          <span className="text-[11px] theme-text-secondary block font-medium">Admit Cards Ready</span>
          <span className="text-xl font-bold font-mono theme-accent mt-0.5 block">
            {admitCardList.length} Cards
          </span>
        </div>

        <div className="p-3.5 theme-bg-surface border theme-border rounded-xl shadow-2xs">
          <span className="text-[11px] theme-text-secondary block font-medium">Desk Slips / Seats</span>
          <span className="text-xl font-bold font-mono theme-accent mt-0.5 block">
            {deskSlipsList.length} Desks
          </span>
        </div>
      </div>

      {/* 3. Main Tab Navigation */}
      <TabSwitcher
        tabs={tabs}
        activeTab={activeTab}
        onChange={handleTabChange}
      />

      {/* 4. Active Tab Workspace */}
      <div className="w-full min-h-[480px]">
        {activeTab === 'ADMIT_CARDS' && (
          <AdmitCardGeneratorView
            exams={exams}
            classes={classes}
            sections={sections}
            selectedExamId={selectedExamId}
            setSelectedExamId={setSelectedExamId}
            selectedClassId={selectedClassId}
            setSelectedClassId={setSelectedClassId}
            selectedSectionId={selectedSectionId}
            setSelectedSectionId={setSelectedSectionId}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            admitCardList={admitCardList}
            selectedStudentIds={selectedStudentIds}
            handleToggleSelectStudent={handleToggleSelectStudent}
            handleSelectAll={handleSelectAll}
            institutionDetails={institutionDetails}
          />
        )}

        {activeTab === 'SEAT_PLAN' && (
          <DeskSlipsGeneratorView
            exams={exams}
            classes={classes}
            sections={sections}
            availableRooms={availableRooms}
            selectedExamId={selectedExamId}
            setSelectedExamId={setSelectedExamId}
            selectedClassId={selectedClassId}
            setSelectedClassId={setSelectedClassId}
            selectedSectionId={selectedSectionId}
            setSelectedSectionId={setSelectedSectionId}
            selectedRoomName={selectedRoomName}
            setSelectedRoomName={setSelectedRoomName}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            deskSlipsList={deskSlipsList}
            selectedStudentIds={selectedStudentIds}
            handleToggleSelectStudent={handleToggleSelectStudent}
            handleSelectAll={handleSelectAll}
            institutionDetails={institutionDetails}
          />
        )}

        {activeTab === 'ATTENDANCE_SHEETS' && (
          <HallAttendanceSheetView
            exams={exams}
            classes={classes}
            sections={sections}
            examSubjects={examSubjects}
            availableRooms={availableRooms}
            selectedExamId={selectedExamId}
            setSelectedExamId={setSelectedExamId}
            selectedClassId={selectedClassId}
            setSelectedClassId={setSelectedClassId}
            selectedSectionId={selectedSectionId}
            setSelectedSectionId={setSelectedSectionId}
            selectedRoomName={selectedRoomName}
            setSelectedRoomName={setSelectedRoomName}
            selectedSubjectId={selectedSubjectId}
            setSelectedSubjectId={setSelectedSubjectId}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            hallAttendanceData={hallAttendanceData}
          />
        )}
      </div>
    </div>
  );

  if (isEmbedded) {
    return content;
  }

  return (
    <PageContainer maxWidth="7xl">
      {content}
    </PageContainer>
  );
}

