import React, { useMemo } from 'react';
import ActionMenu from '@/components/ui/ActionMenu';
import {
  FileIcon,
  StarIcon,
  DuplicateIcon,
  TrashIcon,
  EditIcon,
  SparklesIcon,
} from '@/components/ui/Icons';
import { DocxTemplate } from '@/components/print/types';
import { useAuth } from '@/context/AuthContext';
import { auth as authStore } from '@/utils/localStore';
import { DocLabItemCard } from '../DocLabItemCard';

export interface DocLabTemplateCardProps {
  template: DocxTemplate;
  isActive: boolean;
  isScopeDefault: boolean;
  isSuperAdmin?: boolean;
  onSelect: (template: DocxTemplate) => void;
  onEdit?: (template: DocxTemplate) => void;
  onRename?: (template: DocxTemplate) => void;
  onDuplicate?: (template: DocxTemplate) => void;
  onDelete?: (template: DocxTemplate) => void;
  onToggleScopeDefault?: (templateId: string) => void;
  onToggleGlobalSticky?: (template: DocxTemplate) => void;
}

/**
 * DocLabTemplateCard
 * Dedicated template item card built on top of the reusable 2-line DocLabItemCard.
 */
export const DocLabTemplateCard: React.FC<DocLabTemplateCardProps> = ({
  template,
  isActive,
  isScopeDefault,
  isSuperAdmin,
  onSelect,
  onEdit,
  onRename,
  onDuplicate,
  onDelete,
  onToggleScopeDefault,
  onToggleGlobalSticky,
}) => {
  const { user } = useAuth() as any;
  const isUserSuperAdmin = isSuperAdmin ?? Boolean(
    user?.user_type?.toUpperCase() === 'SUPER_ADMIN' ||
    user?.is_superuser ||
    authStore.getUser?.()?.user_type?.toUpperCase() === 'SUPER_ADMIN' ||
    authStore.getUser?.()?.is_superuser
  );

  const isSticky = Boolean((template as any).isGlobalSticky || (template as any).is_global_sticky);

  const menuItems = useMemo(() => {
    const items: any[] = [];

    // 1. Edit in DocLab (Loads template to canvas in Template Design mode)
    if (onEdit) {
      items.push({
        label: 'Edit in DocLab',
        icon: EditIcon,
        onClick: () => onEdit(template),
      });
    }

    // 2. Rename / Edit Details
    if (onRename) {
      items.push({
        label: 'Rename / Edit Details',
        icon: EditIcon,
        onClick: () => onRename(template),
      });
    }

    // 3. Duplicate Template
    if (onDuplicate) {
      items.push({
        label: 'Duplicate',
        icon: DuplicateIcon,
        onClick: () => onDuplicate(template),
      });
    }

    // 4. Global Sticky Toggle for Super Admin
    if (isUserSuperAdmin && onToggleGlobalSticky) {
      items.push({
        label: isSticky ? 'Remove Global Sticky' : 'Make Global Sticky',
        icon: SparklesIcon,
        iconClassName: isSticky ? 'theme-accent' : undefined,
        onClick: () => onToggleGlobalSticky(template),
      });
    }

    // 5. Scope Default Toggle
    if (onToggleScopeDefault) {
      items.push({
        label: isScopeDefault ? 'Remove Scope Default' : 'Set as Scope Default',
        icon: StarIcon,
        iconClassName: 'theme-accent',
        onClick: () => onToggleScopeDefault(template.id),
      });
    }

    // 6. Delete Template (Triggers ConfirmModal)
    if (onDelete && !(template as any).isBuiltin) {
      if (items.length > 0) {
        items.push({ divider: true });
      }
      items.push({
        label: 'Delete Template',
        icon: TrashIcon,
        danger: true,
        onClick: () => onDelete(template),
      });
    }

    return items;
  }, [
    template,
    isSticky,
    isUserSuperAdmin,
    isScopeDefault,
    onEdit,
    onRename,
    onDuplicate,
    onToggleGlobalSticky,
    onToggleScopeDefault,
    onDelete,
  ]);

  return (
    <DocLabItemCard
      icon={<FileIcon className="w-4 h-4" />}
      title={template.name}
      isActive={isActive}
      indicator={
        isSticky ? (
          <span
            title="Global Sticky Template (Active for all users)"
            className="theme-bg-accent-soft theme-accent text-[9px] px-1.5 py-0.5 rounded font-mono font-bold flex items-center gap-1 shadow-2xs border border-current/20 shrink-0"
          >
            <SparklesIcon className="w-2.5 h-2.5 shrink-0" />
            <span>Global Sticky</span>
          </span>
        ) : isScopeDefault ? (
          <span
            title="Default template for this scope"
            className="theme-accent inline-flex items-center shrink-0"
          >
            <StarIcon className="w-3.5 h-3.5" />
          </span>
        ) : null
      }
      description={
        template.description || 'Custom layout document'
      }
      actions={
        menuItems.length > 0 ? (
          <ActionMenu
            items={menuItems}
            align="right"
            size="xs"
            variant="ghost"
            showChevron={false}
            ariaLabel="Template actions"
            buttonClassName="p-1 rounded-lg theme-text-muted hover:theme-text-primary hover:theme-bg-sub transition-colors"
          />
        ) : null
      }
      onClick={() => onSelect(template)}
    />
  );
};

export default DocLabTemplateCard;
