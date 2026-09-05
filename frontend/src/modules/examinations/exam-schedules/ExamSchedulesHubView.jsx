import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { PageContainer } from '../../../components/layout';
import PageHeader from '../../../components/ui/PageHeader';
import TabSwitcher from '../../../components/ui/TabSwitcher';
import CustomButton from '../../../components/ui/CustomButton';
import ExamSchedulesView from './schedules/ExamSchedulesView';
import SubjectRoutineMatrixView from './routine-matrix/SubjectRoutineMatrixView';
import InvigilationScheduleView from './invigilation/InvigilationScheduleView';
import {
  CalendarIcon,
  BookOpenIcon,
  AcademicCapIcon,
  PlusIcon,
  UserCheckIcon,
} from '../../../components/ui/Icons';
import { useRightSidebar } from '../../../context/RightSidebarContext';

/**
 * ExamSchedulesHubView
 * Dedicated Enterprise Parent Hub for Examination Schedules & Matrix Workspace.
 * Unites:
 * 1. Exam Schedules & Sessions (`ExamSchedulesView`)
 * 2. Subject Routine Matrix (`SubjectRoutineMatrixView`)
 * 3. Invigilation Schedule & Duty Roster (`InvigilationScheduleView`)
 * 
 * Follows SPR Note Enterprise Engineering Guidelines:
 * - Clean modular folder hierarchy inside `src/modules/examinations/exam-schedules/`
 * - 100% Theme Tokens & Zero Hardcoded Colors
 * - Real-time state synchronization
 */
export default function ExamSchedulesHubView({
  defaultTab = 'SCHEDULES',
  hideHeader = false,
  isEmbedded = false,
  onNavigateToMarkEntry = null,
  onNavigateToTabulation = null,
  onNavigateToTranscripts = null,
}) {
  const { openDrawer } = useRightSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Resolve active tab from URL pathname or searchParams
  const resolveActiveTab = () => {
    const path = location.pathname.toLowerCase();
    const tabParam = searchParams.get('tab')?.toLowerCase();

    if (path.includes('invigilation') || tabParam === 'invigilation' || tabParam === 'invigilation-schedule') {
      return 'INVIGILATION_SCHEDULE';
    }
    if (path.includes('routine-matrix') || path.includes('matrix') || tabParam === 'routine-matrix' || tabParam === 'matrix' || tabParam === 'subject_matrix') {
      return 'SUBJECT_MATRIX';
    }
    if (path.includes('schedules') || path.includes('exams') || tabParam === 'schedules') {
      return 'SCHEDULES';
    }
    return defaultTab || 'SCHEDULES';
  };

  const [activeTab, setActiveTab] = useState(resolveActiveTab);
  const [selectedExamContext, setSelectedExamContext] = useState(null);

  useEffect(() => {
    setActiveTab(resolveActiveTab());
  }, [location.pathname, searchParams, defaultTab]);

  const tabs = [
    { id: 'SCHEDULES', label: 'Exam Schedules', icon: CalendarIcon },
    { id: 'SUBJECT_MATRIX', label: 'Subject Routine Matrix', icon: BookOpenIcon },
    { id: 'INVIGILATION_SCHEDULE', label: 'Invigilation Schedule', icon: UserCheckIcon },
  ];

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    if (newTab === 'SCHEDULES') {
      navigate('/examinations/schedules');
    } else if (newTab === 'SUBJECT_MATRIX') {
      navigate('/examinations/routine-matrix');
    } else if (newTab === 'INVIGILATION_SCHEDULE') {
      navigate('/examinations/invigilation');
    }
  };

  const handleNavigateToMatrix = (examId) => {
    setSelectedExamContext(examId);
    setActiveTab('SUBJECT_MATRIX');
    navigate('/examinations/routine-matrix');
  };

  // Dynamic right-side primary action button integrated in TabSwitcher
  const renderTabAction = () => {
    if (activeTab === 'SCHEDULES') {
      return (
        <CustomButton
          type="button"
          variant="primary"
          size="sm"
          icon={PlusIcon}
          onClick={() => openDrawer('exam_session', { mode: 'add' })}
          className="w-full sm:w-auto"
        >
          Create Examination
        </CustomButton>
      );
    }
    if (activeTab === 'SUBJECT_MATRIX') {
      return (
        <CustomButton
          type="button"
          variant="primary"
          size="sm"
          icon={PlusIcon}
          onClick={() => openDrawer('subject_routine', { mode: 'add' })}
          className="w-full sm:w-auto"
        >
          Add Subject Row
        </CustomButton>
      );
    }
    return null;
  };

  const content = (
    <div className="space-y-4 text-left animate-fade-in">
      {/* 1. Page Header (shown when not hidden) */}
      {!hideHeader && (
        <PageHeader
          title="Examination Schedules & Routine Matrix"
          subtitle="Configure institutional exam sessions, multi-class routine matrix, marks breakdown, and daily hall invigilation duty rosters."
          icon={AcademicCapIcon}
        />
      )}

      {/* 2. Unified TabSwitcher with Dynamic Action Button */}
      <TabSwitcher
        tabs={tabs}
        activeTab={activeTab}
        onChange={handleTabChange}
        rightContent={renderTabAction()}
      />

      {/* 3. Active Tab Workspace */}
      <div className="w-full min-h-[480px]">
        {activeTab === 'SCHEDULES' && (
          <ExamSchedulesView
            isEmbedded={true}
            hideHeader={true}
            onNavigateToMatrix={handleNavigateToMatrix}
            onNavigateToMarkEntry={onNavigateToMarkEntry}
            onNavigateToTabulation={onNavigateToTabulation}
          />
        )}

        {activeTab === 'SUBJECT_MATRIX' && (
          <SubjectRoutineMatrixView
            initialExamId={selectedExamContext}
            onNavigateToExamSessions={() => handleTabChange('SCHEDULES')}
          />
        )}

        {activeTab === 'INVIGILATION_SCHEDULE' && (
          <InvigilationScheduleView
            initialExamId={selectedExamContext}
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
