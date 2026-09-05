import React from 'react';
import ExamSchedulesHubView from './exam-schedules/ExamSchedulesHubView';
import MarkEntryDeskView from './mark-entry/MarkEntryDeskView';
import TabulationLedgerView from './tabulation/TabulationLedgerView';
import TranscriptStudioView from './transcripts/TranscriptStudioView';
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
  if (defaultTab === 'TABULATION') {
    return <TabulationLedgerView />;
  }
  if (defaultTab === 'TRANSCRIPTS') {
    return <TranscriptStudioView />;
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
