import React, { useMemo } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import ActionMenu from '@/components/ui/ActionMenu';
import {
  DownloadIcon,
  PrinterIcon,
  DocumentIcon,
  AcademicCapIcon,
} from '@/components/ui/Icons';
import { MarkSheetHeaderProps } from '../types';

/**
 * MarkSheetHeader
 * Top control header utilizing standard PageHeader and ActionMenu with dedicated
 * distinct actions for Academic MarkSheet Ledger and Student MarkSheet Transcripts.
 */
export default function MarkSheetHeader({
  exam,
  activeSubTab = 'ledger',
  onExportCsv,
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

  // Header Title, Subtitle and Icon based on active tab
  const headerDetails = useMemo(() => {
    if (activeSubTab === 'transcripts') {
      return {
        icon: DocumentIcon,
        title: 'Student MarkSheet & Transcripts',
        subtitle:
          'Individual student academic mark sheets featuring official evaluation breakdown, GPA, verified letter grade, and merit positioning.',
      };
    }
    return {
      icon: AcademicCapIcon,
      title: 'Academic MarkSheet Ledger',
      subtitle:
        'Consolidated class examination ledger with dynamic subject matrix, total marks, GPA, academic division, and class rankings.',
    };
  }, [activeSubTab]);

  // Three-dot action menu items tailored distinctly for each tab
  const menuActionItems = useMemo(() => {
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
    onOpenPrintStudio,
    onBulkPrintAcademicMarkSheet,
    onExportCsv,
    onPrintCurrentMarkSheet,
    onBulkPrintStudentMarkSheet,
  ]);

  return (
    <div className="print:hidden">
      <PageHeader
        icon={headerDetails.icon}
        title={headerDetails.title}
        subtitle={headerDetails.subtitle}
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
