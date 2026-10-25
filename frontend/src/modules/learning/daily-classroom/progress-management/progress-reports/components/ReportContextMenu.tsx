import React from "react";
import ActionMenu, { ActionMenuItem } from "@/components/ui/ActionMenu";
import { CopyIcon, TrashIcon, EditIcon, PrinterIcon, CloudIcon } from "@/components/ui/Icons";
import { isReportUnsynced } from "@/utils/syncEngine";
import { ReportContextMenuProps, ReportItem } from "../types";

export interface GetReportMenuItemsOptions {
  report: ReportItem;
  targetList?: ReportItem[];
  extraItems?: ActionMenuItem[];
  onSync?: (report: ReportItem) => void;
  onCopyText?: (payload: any) => void;
  onExportCSV?: (payload: any) => void;
  onExportJSON?: (payload: any) => void;
  onPrintPDF?: (payload: any) => void;
  onEdit?: (report: ReportItem) => void;
  onDelete?: (report: ReportItem) => void;
}

/**
 * Enterprise Single Source of Truth for Report Action Menu Items
 * Guarantees 100% parity between right-click context menu and 3-dots action menu.
 */
export function getReportMenuItems({
  report,
  targetList,
  extraItems,
  onSync,
  onCopyText,
  onExportCSV,
  onExportJSON,
  onPrintPDF,
  onEdit,
  onDelete,
}: GetReportMenuItemsOptions): ActionMenuItem[] {
  const targetPayload = targetList && targetList.length > 0 ? targetList : report;
  const menuItems: ActionMenuItem[] = [];

  if (extraItems && extraItems.length > 0) {
    menuItems.push(...extraItems);
    menuItems.push({ label: "divider", divider: true });
  }

  const isTargetUnsynced = Array.isArray(targetPayload)
    ? targetPayload.some(isReportUnsynced)
    : isReportUnsynced(report);

  if (onSync && isTargetUnsynced) {
    menuItems.push({
      label: "Sync to Database",
      icon: CloudIcon,
      iconClassName: "theme-accent",
      onClick: () => onSync(report),
    });
  }

  if (onCopyText) {
    menuItems.push({
      label: "Copy Summary Text",
      icon: CopyIcon,
      onClick: () => onCopyText(targetPayload),
    });
  }

  if (onExportCSV) {
    menuItems.push({
      label: "Export as CSV / Excel",
      icon: CloudIcon,
      iconClassName: "text-emerald-400",
      onClick: () => onExportCSV(targetPayload),
    });
  }

  if (onExportJSON) {
    menuItems.push({
      label: "Export as JSON",
      icon: CloudIcon,
      iconClassName: "text-amber-400",
      onClick: () => onExportJSON(targetPayload),
    });
  }

  if (onPrintPDF) {
    menuItems.push({
      label: "Print / Save as PDF",
      icon: PrinterIcon,
      iconClassName: "text-sky-400",
      onClick: () => onPrintPDF(targetPayload),
    });
  }

  if (onEdit || onDelete) {
    menuItems.push({ label: "divider", divider: true });
  }

  if (onEdit) {
    menuItems.push({
      label: "Edit Report",
      icon: EditIcon,
      iconClassName: "theme-text-secondary",
      onClick: () => onEdit(report),
    });
  }

  if (onDelete) {
    menuItems.push({
      label: "Delete Report",
      icon: TrashIcon,
      variant: "danger",
      onClick: () => onDelete(report),
    });
  }

  return menuItems;
}

/**
 * Enterprise Report Context Menu
 * Powered by the universal ActionMenu component in coordinate mode for row right-clicks.
 */
export default function ReportContextMenu({
  x,
  y,
  report,
  targetList,
  onClose,
  onSync,
  onCopyText,
  onExportCSV,
  onExportJSON,
  onPrintPDF,
  onEdit,
  onDelete,
}: ReportContextMenuProps) {
  if (!report) return null;

  const menuItems = getReportMenuItems({
    report,
    targetList,
    onSync,
    onCopyText,
    onExportCSV,
    onExportJSON,
    onPrintPDF,
    onEdit,
    onDelete,
  });

  return (
    <ActionMenu
      headless={true}
      isOpen={!!report}
      x={x}
      y={y}
      onClose={onClose}
      title={report.student_name || "Student Report"}
      subtitle={`${report.formattedDate || "Date"} · ${report.session_name || "Session"}`}
      items={menuItems}
    />
  );
}
