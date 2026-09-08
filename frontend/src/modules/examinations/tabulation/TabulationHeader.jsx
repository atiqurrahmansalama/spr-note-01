import React, { useMemo } from 'react';
import PageHeader from '../../../components/ui/PageHeader';
import ActionMenu from '../../../components/ui/ActionMenu';
import {
  ChartBarIcon,
  DownloadIcon,
  PrinterIcon,
  DocumentIcon,
} from '../../../components/ui/Icons';

/**
 * TabulationHeader
 * Top control header utilizing the standard PageHeader and ActionMenu components,
 * matching the exact enterprise pattern of MarkEntryHeader.
 */
export default function TabulationHeader({
  exam,
  onExportCsv,
  onOpenPrintStudio,
  onOpenGazette,
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

  // Three-dot action menu items for data export/import & printing
  const menuActionItems = useMemo(
    () => [
      {
        label: 'Print & Export Studio',
        icon: PrinterIcon,
        onClick: onOpenPrintStudio,
      },
      {
        label: 'Result Gazette',
        icon: DocumentIcon,
        onClick: onOpenGazette,
      },
      { divider: true },
      {
        label: 'Export CSV',
        icon: DownloadIcon,
        onClick: onExportCsv,
      },
    ],
    [onOpenPrintStudio, onOpenGazette, onExportCsv]
  );

  return (
    <div className="print:hidden">
      <PageHeader
        icon={ChartBarIcon}
        title="Master Mark Sheet & Academic Ledger"
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
