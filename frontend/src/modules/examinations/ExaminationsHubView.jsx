import React, { useState, useEffect } from 'react';
import { PageContainer } from '../../components/layout';
import PageHeader from '../../components/ui/PageHeader';
import TabSwitcher from '../../components/ui/TabSwitcher';
import CustomButton from '../../components/ui/CustomButton';
import ExamSchedulesView from './schedules/ExamSchedulesView';
import SubjectRoutineMatrixView from './schedules/SubjectRoutineMatrixView';
import MarkEntryDeskView from './mark-entry/MarkEntryDeskView';
import TabulationLedgerView from './tabulation/TabulationLedgerView';
import TranscriptStudioView from './transcripts/TranscriptStudioView';
import GradingRulesView from './grading-rules/GradingRulesView';
import {
  CalendarIcon,
  BookOpenIcon,
  AcademicCapIcon,
  PlusIcon,
} from '../../components/ui/Icons';
import { useRightSidebar } from '../../context/RightSidebarContext';

/**
 * ExaminationsHubView
 * Enterprise Examination & Result Management Hub uniting Exam Schedules,
 * Subject Routine Matrix Table, Mark Entry, Tabulation Sheet, and Marksheet Transcripts.
 */
export default function ExaminationsHubView({ defaultTab = 'SCHEDULES' }) {
  const { openDrawer } = useRightSidebar();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [selectedExamContext, setSelectedExamContext] = useState(null);
  const [selectedStudentContext, setSelectedStudentContext] = useState(null);

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  const tabs = [
    { id: 'SCHEDULES', label: 'Exam Schedules', icon: CalendarIcon },
    { id: 'SUBJECT_MATRIX', label: 'Subject Routine Matrix', icon: BookOpenIcon },
  ];

  const handleNavigateToMatrix = (examId) => {
    setSelectedExamContext(examId);
    setActiveTab('SUBJECT_MATRIX');
  };

  const handleNavigateToMarkEntry = (examId) => {
    setSelectedExamContext(examId);
    setActiveTab('MARK_ENTRY');
  };

  const handleNavigateToTabulation = (examId) => {
    setSelectedExamContext(examId);
    setActiveTab('TABULATION');
  };

  const handleNavigateToTranscripts = (examId, studentId) => {
    setSelectedExamContext(examId);
    setSelectedStudentContext(studentId);
    setActiveTab('TRANSCRIPTS');
  };

  // Dynamic right-side primary action button integrated directly in the TabSwitcher toolbar
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
    return null;
  };

  return (
    <PageContainer maxWidth="7xl">
      {/* 1. Standard Project PageHeader */}
      <PageHeader
        title="Examination & Result Management"
        subtitle="Comprehensive enterprise suite for term schedules, table-driven subject routine matrix, spreadsheet mark entry, master tabulation ledger, and transcripts."
        icon={AcademicCapIcon}
      />

      {/* 2. Standard Project TabSwitcher with dynamic Action Button on far right */}
      <TabSwitcher
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        rightContent={renderTabAction()}
      />

      {/* 3. Active Tab Body */}
      <div className="w-full min-h-[480px]">
        {activeTab === 'SCHEDULES' && (
          <ExamSchedulesView
            isEmbedded={true}
            hideHeader={true}
            onNavigateToMatrix={handleNavigateToMatrix}
            onNavigateToMarkEntry={handleNavigateToMarkEntry}
            onNavigateToTabulation={handleNavigateToTabulation}
          />
        )}

        {activeTab === 'SUBJECT_MATRIX' && (
          <SubjectRoutineMatrixView
            initialExamId={selectedExamContext}
            onNavigateToExamSessions={() => setActiveTab('SCHEDULES')}
          />
        )}

        {activeTab === 'MARK_ENTRY' && (
          <MarkEntryDeskView
            initialExamId={selectedExamContext}
            onNavigateToTabulation={handleNavigateToTabulation}
          />
        )}

        {activeTab === 'TABULATION' && (
          <TabulationLedgerView
            initialExamId={selectedExamContext}
            onNavigateToTranscripts={handleNavigateToTranscripts}
          />
        )}

        {activeTab === 'TRANSCRIPTS' && (
          <TranscriptStudioView
            initialExamId={selectedExamContext}
            initialStudentId={selectedStudentContext}
          />
        )}

        {activeTab === 'GRADING_RULES' && (
          <GradingRulesView />
        )}
      </div>
    </PageContainer>
  );
}
