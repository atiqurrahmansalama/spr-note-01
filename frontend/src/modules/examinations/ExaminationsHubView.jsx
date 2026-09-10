import React from 'react';
import ExamSchedulesHubView from './exam-schedules/ExamSchedulesHubView';
import MarkEntryDeskView from './mark-entry/MarkEntryDeskView';
import MarkSheetLedgerView from './mark-sheet/MarkSheetLedgerView';
import GradingRulesView from './grading-rules/GradingRulesView';

/**
 * ExaminationsHubView
 * Master Router / Delegate Hub for Examinations Module.
 * Delegates Exam Scheduling, Subject Matrix, and Invigilation Duties
 * directly to the dedicated parent `ExamSchedulesHubView`.
 */
export default function ExaminationsHubView({ defaultTab = 'SCHEDULES' }) {
  if (defaultTab === 'MARK_ENTRY') {
    return <MarkEntryDeskView />;
  }
  if (defaultTab === 'TABULATION' || defaultTab === 'MARKSHEET' || defaultTab === 'MARK_SHEET') {
    return <MarkSheetLedgerView defaultSubTab="ledger" />;
  }
  if (defaultTab === 'TRANSCRIPTS' || defaultTab === 'STUDENT_MARKSHEET') {
    return <MarkSheetLedgerView defaultSubTab="transcripts" />;
  }
  if (defaultTab === 'GRADING_RULES') {
    return <GradingRulesView />;
  }

  return (
    <ExamSchedulesHubView
      defaultTab={defaultTab}
    />
  );
}
