import React from 'react';
import MarkSheetLedgerView from '../MarkSheetLedgerView';

export interface TranscriptStudioViewProps {
  initialExamId?: string | number | null;
  initialStudentId?: string | number | null;
  isEmbedded?: boolean;
}

/**
 * TranscriptStudioView
 * Clean wrapper router delegating directly to MarkSheetLedgerView with 'transcripts' subtab active.
 */
export default function TranscriptStudioView({
  initialExamId = null,
  initialStudentId = null,
  isEmbedded = false,
}: TranscriptStudioViewProps) {
  return (
    <MarkSheetLedgerView
      initialExamId={initialExamId}
      initialStudentId={initialStudentId}
      defaultSubTab="transcripts"
      isEmbedded={isEmbedded}
    />
  );
}
