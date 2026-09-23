import React, { useMemo } from 'react';
import ActionMenu from '../../../../components/ui/ActionMenu';
import {
  FileIcon,
  StarIcon,
  DuplicateIcon,
  TrashIcon,
  EditIcon,
} from '../../../../components/ui/Icons';
import { DocxTemplate } from '../../types';

import { DocLabItemCard } from './DocLabItemCard';

interface DocLabTemplateCardProps {
  template: DocxTemplate;
  isActive: boolean;
  isScopeDefault: boolean;
  onSelect: (template: DocxTemplate) => void;
  onEdit?: (template: DocxTemplate) => void;
  onRename?: (template: DocxTemplate) => void;
  onDuplicate?: (template: DocxTemplate) => void;
  onDelete?: (template: DocxTemplate) => void;
  onToggleScopeDefault?: (templateId: string) => void;
}

/**
 * DocLabTemplateCard
 * Dedicated template item card built on top of the reusable 2-line DocLabItemCard.
 */
export const DocLabTemplateCard: React.FC<DocLabTemplateCardProps> = ({
  template,
  isActive,
  isScopeDefault,
  onSelect,
  onEdit,
  onRename,
  onDuplicate,
  onDelete,
  onToggleScopeDefault,
}) => {
  const isGenerated = template.templateType === 'generated' || template.id?.startsWith('gen_');

  const menuItems = useMemo(() => {
    const items: any[] = [];

    // 1. Edit in DocLab (Loads template to canvas in Template Design mode)
    if (onEdit && !isGenerated) {
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

    // 4. Scope Default Toggle
    if (onToggleScopeDefault && !isGenerated) {
      items.push({
        label: isScopeDefault ? 'Remove Scope Default' : 'Set as Scope Default',
        icon: StarIcon,
        iconClassName: 'theme-accent',
        onClick: () => onToggleScopeDefault(template.id),
      });
    }

    // 5. Delete Template (Triggers ConfirmModal)
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
  }, [template, isGenerated, isScopeDefault, onEdit, onRename, onDuplicate, onToggleScopeDefault, onDelete]);

  return (
    <DocLabItemCard
      icon={<FileIcon className="w-4 h-4" />}
      title={template.name}
      isActive={isActive}
      indicator={
        isScopeDefault && !isGenerated ? (
          <span
            title="Default template for this scope"
            className="theme-accent inline-flex items-center shrink-0"
          >
            <StarIcon className="w-3.5 h-3.5" />
          </span>
        ) : null
      }
      badge={
        isGenerated ? (
          <span className="px-1.5 py-0.2 rounded text-[9.5px] font-medium theme-success-badge">
            Filled
          </span>
        ) : null
      }
      description={
        template.description || (isGenerated ? 'Generated filled document' : 'Custom layout document')
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
