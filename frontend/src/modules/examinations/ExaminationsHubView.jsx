import React from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import ExamSchedulesHubView from './exam-schedules/ExamSchedulesHubView';
import MarkSheetLedgerView from './mark-sheet/MarkSheetLedgerView';
import GradingRulesView from './grading-rules/GradingRulesView';
import ExamHallLogisticsHubView from './hall-logistics/ExamHallLogisticsHubView';

/**
 * ExaminationsHubView
 * Master Router / Delegate Hub for Examinations Module.
 * Delegates Exam Scheduling, Subject Matrix, Invigilation,
 * Mark Entry, Marksheets, and Admit Cards & Hall Logistics.
 */
export default function ExaminationsHubView({ defaultTab = 'SCHEDULES' }) {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const path = location.pathname.toLowerCase();
  const tabParam = searchParams.get('tab')?.toLowerCase();

  // 1. Check for Mark Sheet Hub sub-tabs (query param takes highest priority)
  if (
    tabParam === 'entry' ||
    tabParam === 'mark-entry' ||
    tabParam === 'mark_entry' ||
    path.includes('/examinations/mark-entry') ||
    path === '/mark-entry' ||
    defaultTab === 'MARK_ENTRY' ||
    defaultTab === 'MARK_ENTRY_DESK'
  ) {
    return <MarkSheetLedgerView defaultSubTab="entry" />;
  }

  if (
    tabParam === 'transcripts' ||
    tabParam === 'transcript' ||
    tabParam === 'studio' ||
    path.includes('/examinations/transcripts') ||
    path === '/transcripts' ||
    defaultTab === 'TRANSCRIPTS' ||
    defaultTab === 'STUDENT_MARKSHEET'
  ) {
    return <MarkSheetLedgerView defaultSubTab="transcripts" />;
  }

  if (
    tabParam === 'ledger' ||
    tabParam === 'tabulation' ||
    tabParam === 'marksheet' ||
    path.includes('/examinations/tabulation') ||
    path.includes('/examinations/marksheet') ||
    path.includes('/examinations/mark-sheet') ||
    path === '/tabulation-sheet' ||
    path === '/marksheet' ||
    path === '/mark-sheet' ||
    defaultTab === 'TABULATION' ||
    defaultTab === 'MARKSHEET' ||
    defaultTab === 'MARK_SHEET'
  ) {
    return <MarkSheetLedgerView defaultSubTab="ledger" />;
  }

  if (defaultTab === 'GRADING_RULES') {
    return <GradingRulesView />;
  }

  if (
    tabParam === 'admit-cards' ||
    tabParam === 'admit_cards' ||
    tabParam === 'admit' ||
    tabParam === 'seat-plan' ||
    tabParam === 'seat_plan' ||
    tabParam === 'desk-slips' ||
    tabParam === 'desk_slips' ||
    tabParam === 'attendance-sheets' ||
    tabParam === 'attendance_sheets' ||
    tabParam === 'hall-attendance' ||
    tabParam === 'hall-logistics' ||
    tabParam === 'hall_logistics' ||
    defaultTab === 'HALL_LOGISTICS' ||
    defaultTab === 'ADMIT_CARDS' ||
    defaultTab === 'SEAT_PLAN' ||
    defaultTab === 'DESK_SLIPS' ||
    defaultTab === 'ATTENDANCE_SHEETS' ||
    defaultTab === 'HALL_ATTENDANCE' ||
    path.includes('admit-cards') ||
    path.includes('seat-plan') ||
    path.includes('desk-slips') ||
    path.includes('attendance-sheets') ||
    path.includes('hall-attendance') ||
    path.includes('hall-logistics')
  ) {
    let resolvedInitialTab = 'ADMIT_CARDS';
    if (
      tabParam === 'seat-plan' ||
      tabParam === 'seat_plan' ||
      tabParam === 'desk-slips' ||
      tabParam === 'desk_slips' ||
      defaultTab === 'SEAT_PLAN' ||
      defaultTab === 'DESK_SLIPS' ||
      path.includes('seat-plan') ||
      path.includes('desk-slips')
    ) {
      resolvedInitialTab = 'SEAT_PLAN';
    } else if (
      tabParam === 'attendance-sheets' ||
      tabParam === 'attendance_sheets' ||
      tabParam === 'hall-attendance' ||
      defaultTab === 'ATTENDANCE_SHEETS' ||
      defaultTab === 'HALL_ATTENDANCE' ||
      path.includes('attendance-sheets') ||
      path.includes('hall-attendance')
    ) {
      resolvedInitialTab = 'ATTENDANCE_SHEETS';
    }
    return <ExamHallLogisticsHubView initialTab={resolvedInitialTab} />;
  }


  return (
    <ExamSchedulesHubView
      defaultTab={defaultTab}
    />
  );
}

