import React, { useMemo } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import ActionMenu from '@/components/ui/ActionMenu';
import {
  ChartBarIcon,
  DownloadIcon,
  PrinterIcon,
  DocumentIcon,
} from '@/components/ui/Icons';
import { MarkSheetHeaderProps } from '../types';

/**
 * MarkSheetHeader
 * Top control header utilizing standard PageHeader and ActionMenu (with Print Ledger, Transcripts & Export CSV).
 */
export default function MarkSheetHeader({
  exam,
  activeSubTab = 'ledger',
  onExportCsv,
  onOpenPrintStudio,
  onOpenTranscripts,
  onSwitchToLedger,
  onPrintCurrentMarkSheet,
}: MarkSheetHeaderProps) {
  const renderStatusBadge = () => {
    if (!exam) return null;
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border border-[var(--accent-main)]/30 theme-bg-accent-soft theme-accent">
        <span className="w-1.5 h-1.5 rounded-full theme-bg-accent inline-block" />
        {exam.academicYearName || 'Active Session'}
      </span>
    );
  };

  // Three-dot action menu items for printing, transcripts & CSV export
  const menuActionItems = useMemo(() => {
    if (activeSubTab === 'transcripts') {
      return [
        {
          label: 'Print MarkSheet',
          icon: PrinterIcon,
          onClick: onPrintCurrentMarkSheet || (() => window.print()),
        },
        {
          label: 'Print Tabulation Ledger',
          icon: PrinterIcon,
          onClick: onOpenPrintStudio,
        },
        { divider: true },
        {
          label: 'Export CSV',
          icon: DownloadIcon,
          onClick: onExportCsv,
        },
      ];
    }

    return [
      {
        label: 'Print Ledger',
        icon: PrinterIcon,
        onClick: onOpenPrintStudio,
      },
      {
        label: 'Student MarkSheet',
        icon: DocumentIcon,
        onClick: onOpenTranscripts,
      },
      { divider: true },
      {
        label: 'Export CSV',
        icon: DownloadIcon,
        onClick: onExportCsv,
      },
    ];
  }, [activeSubTab, onOpenPrintStudio, onOpenTranscripts, onExportCsv, onPrintCurrentMarkSheet]);

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
