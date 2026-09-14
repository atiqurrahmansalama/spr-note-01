import React, { useMemo } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import ActionMenu from '@/components/ui/ActionMenu';
import {
  DownloadIcon,
  UploadIcon,
  PrinterIcon,
  ChartBarIcon,
  LockOpenIcon,
} from '@/components/ui/Icons';
import { MarkSheetHeaderProps } from './types';

/**
 * MarkSheetHeader
 * Master unified top control header for MarkSheetLedgerView using standard PageHeader and ActionMenu
 * with persistent module title and dynamic 3-dot action menu items for each active workspace.
 */
export default function MarkSheetHeader({
  exam,
  activeSubTab = 'ledger',
  onExportCsv,
  onOpenCsvImport,
  onPrintAwardList,
  onBulkPrintSubjectMarkSheet,
  onOpenSupervisorUnlock,
  isLocked = false,
  onOpenPrintStudio,
  onBulkPrintAcademicMarkSheet,
  onPrintCurrentMarkSheet,
  onBulkPrintStudentMarkSheet,
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

  // Three-dot action menu items tailored distinctly for each tab
  const menuActionItems = useMemo(() => {
    if (activeSubTab === 'entry') {
      return [
        {
          label: 'Print Subject MarkSheet',
          icon: PrinterIcon,
          onClick: onPrintAwardList || (() => window.print()),
        },
        {
          label: 'Bulk Print Subject MarkSheets',
          icon: PrinterIcon,
          onClick: onBulkPrintSubjectMarkSheet || onPrintAwardList || (() => window.print()),
        },
        { divider: true },
        {
          label: 'Export CSV',
          icon: DownloadIcon,
          onClick: onExportCsv,
        },
        ...(!isLocked && onOpenCsvImport
          ? [
              {
                label: 'Import CSV',
                icon: UploadIcon,
                onClick: onOpenCsvImport,
              },
            ]
          : []),
        ...(isLocked && onOpenSupervisorUnlock
          ? [
              { divider: true },
              {
                label: 'Supervisor Unlock',
                icon: LockOpenIcon,
                onClick: onOpenSupervisorUnlock,
              },
            ]
          : []),
      ];
    }

    if (activeSubTab === 'transcripts') {
      return [
        {
          label: 'Print Student MarkSheet',
          icon: PrinterIcon,
          onClick: onPrintCurrentMarkSheet || (() => window.print()),
        },
        {
          label: 'Bulk Print Student MarkSheets',
          icon: PrinterIcon,
          onClick: onBulkPrintStudentMarkSheet || onPrintCurrentMarkSheet || (() => window.print()),
        },
        { divider: true },
        {
          label: 'Export Transcripts (CSV)',
          icon: DownloadIcon,
          onClick: onExportCsv,
        },
      ];
    }

    return [
      {
        label: 'Print Academic MarkSheet',
        icon: PrinterIcon,
        onClick: onOpenPrintStudio,
      },
      {
        label: 'Bulk Print Academic MarkSheet',
        icon: PrinterIcon,
        onClick: onBulkPrintAcademicMarkSheet || onOpenPrintStudio,
      },
      { divider: true },
      {
        label: 'Export Ledger (CSV)',
        icon: DownloadIcon,
        onClick: onExportCsv,
      },
    ];
  }, [
    activeSubTab,
    onPrintAwardList,
    onBulkPrintSubjectMarkSheet,
    onOpenCsvImport,
    onOpenSupervisorUnlock,
    isLocked,
    onOpenPrintStudio,
    onBulkPrintAcademicMarkSheet,
    onExportCsv,
    onPrintCurrentMarkSheet,
    onBulkPrintStudentMarkSheet,
  ]);

  return (
    <div className="print:hidden">
      <PageHeader
        icon={ChartBarIcon}
        title="Mark Sheet & Tabulation"
        subtitle="Master console for teacher mark entry desk, consolidated class marksheet ledger, and individual student transcripts."
        badge={renderStatusBadge()}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <ActionMenu
              size="sm"
              variant="sub"
              align="right"
              ariaLabel="More Options"
              items={menuActionItems}
              menuClassName="w-56"
            />
          </div>
        }
      />
    </div>
  );
}
