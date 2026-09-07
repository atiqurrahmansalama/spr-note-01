import React from 'react';
import PageHeader from '../../../../components/ui/PageHeader';
import CustomButton from '../../../../components/ui/CustomButton';
import ActionMenu from '../../../../components/ui/ActionMenu';
import {
  EditIcon,
  LockClosedIcon,
  LockOpenIcon,
  ShieldCheckIcon,
  DownloadIcon,
  UploadIcon,
  PrinterIcon,
  ChartBarIcon,
} from '../../../../components/ui/Icons';

/**
 * MarkEntryHeader
 * Top control header utilizing the standard PageHeader component.
 * Features dynamic status badge, desk title, and action controls.
 */
export default function MarkEntryHeader({
  selectedExam,
  selectedSubject,
  isLocked,
  isSupervisorUnlocked,
  autoSaveStatus = 'saved',
  lastSavedTime = null,
  onOpenSupervisorUnlock,
  onExportCsv,
  onOpenCsvImport,
  onPrintAwardList,
  onNavigateToTabulation,
  hasStudents,
}) {
  // Dynamic status badge (Only shows lock / supervisor status; auto-save is handled globally in top header)
  const renderStatusBadge = () => {
    if (!selectedSubject) return null;

    if (isLocked) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border theme-border theme-bg-sub theme-text-secondary">
          <LockClosedIcon className="w-3.5 h-3.5 theme-accent" />
          Locked for Controller Review
        </span>
      );
    }

    if (isSupervisorUnlocked) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border border-[var(--accent-main)]/30 theme-bg-accent-soft theme-accent">
          <ShieldCheckIcon className="w-3.5 h-3.5" />
          Supervisor Overridden
        </span>
      );
    }

    return null;
  };

  // Three-dot action menu items for data export/import & printing
  const menuActionItems = React.useMemo(
    () => [
      {
        label: 'Export CSV',
        icon: DownloadIcon,
        onClick: onExportCsv,
      },
      ...(!isLocked
        ? [
            {
              label: 'Import CSV',
              icon: UploadIcon,
              onClick: onOpenCsvImport,
            },
          ]
        : []),
      {
        label: 'Print Award List',
        icon: PrinterIcon,
        onClick: onPrintAwardList,
      },
    ],
    [onExportCsv, isLocked, onOpenCsvImport, onPrintAwardList]
  );

  // Right-side actions
  const renderActions = () => (
    <div className="flex items-center gap-2 flex-wrap">
      {isLocked && (
        <CustomButton
          variant="sub"
          size="sm"
          icon={LockOpenIcon}
          onClick={onOpenSupervisorUnlock}
        >
          Supervisor Unlock
        </CustomButton>
      )}

      {selectedSubject && hasStudents && (
        <ActionMenu
          size="sm"
          variant="sub"
          align="right"
          ariaLabel="More Options"
          items={menuActionItems}
          menuClassName="w-48"
        />
      )}

      {onNavigateToTabulation && selectedExam && (
        <CustomButton
          variant="primary"
          size="sm"
          icon={ChartBarIcon}
          onClick={() => onNavigateToTabulation(selectedExam.id)}
        >
          Tabulation Sheet
        </CustomButton>
      )}
    </div>
  );

  return (
    <div className="print:hidden">
      <PageHeader
        icon={EditIcon}
        title="Teacher Mark Entry Desk"
        subtitle="Spreadsheet-like keyboard console connected to exam schedules, routine matrix, and tabulation."
        badge={renderStatusBadge()}
        actions={renderActions()}
      />
    </div>
  );
}
