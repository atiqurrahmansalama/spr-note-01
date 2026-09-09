import React, { useMemo } from 'react';
import PageHeader from '../../../../components/ui/PageHeader';
import ActionMenu from '../../../../components/ui/ActionMenu';
import {
  ChartBarIcon,
  DownloadIcon,
  PrinterIcon,
  DocumentIcon,
} from '../../../../components/ui/Icons';

/**
 * MarkSheetHeader
 * Top control header utilizing standard PageHeader and ActionMenu (with Print, Result Gazette & Export CSV).
 */
export default function MarkSheetHeader({
  exam,
  onExportCsv,
  onOpenPrintStudio,
  onOpenGazette,
  onOpenTranscripts,
}) {
  const renderStatusBadge = () => {
    if (!exam) return null;
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border border-[var(--accent-main)]/30 theme-bg-accent-soft theme-accent">
        <span className="w-1.5 h-1.5 rounded-full theme-bg-accent inline-block" />
        {exam.academicYearName || 'Active Session'}
      </span>
    );
  };

  // Three-dot action menu items for printing, gazette, transcripts & CSV export
  const menuActionItems = useMemo(
    () => [
      {
        label: 'Print Ledger',
        icon: PrinterIcon,
        onClick: onOpenPrintStudio,
      },
      {
        label: 'Result Gazette',
        icon: DocumentIcon,
        onClick: onOpenGazette,
      },
      {
        label: 'Transcript Studio',
        icon: DocumentIcon,
        onClick: onOpenTranscripts,
      },
      { divider: true },
      {
        label: 'Export CSV',
        icon: DownloadIcon,
        onClick: onExportCsv,
      },
    ],
    [onOpenPrintStudio, onOpenGazette, onOpenTranscripts, onExportCsv]
  );

  return (
    <div className="print:hidden">
      <PageHeader
        icon={ChartBarIcon}
        title="Examination Mark Sheet Ledger"
        subtitle="Integrated class marksheet ledger displaying subject scores, total marks, GPA, academic division, and class rankings."
        badge={renderStatusBadge()}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <ActionMenu
              size="sm"
              variant="sub"
              align="right"
              ariaLabel="More Options"
              items={menuActionItems}
              menuClassName="w-52"
            />
          </div>
        }
      />
    </div>
  );
}
