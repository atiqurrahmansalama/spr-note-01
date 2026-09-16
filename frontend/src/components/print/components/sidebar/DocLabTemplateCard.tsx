import React from 'react';
import {
  FileIcon,
  StarIcon,
  DuplicateIcon,
  TrashIcon,
  EditIcon,
} from '../../../../components/ui/Icons';
import { DocxTemplate } from '../../types';

interface DocLabTemplateCardProps {
  template: DocxTemplate;
  isActive: boolean;
  isScopeDefault: boolean;
  onSelect: (template: DocxTemplate) => void;
  onEdit?: (template: DocxTemplate) => void;
  onDuplicate?: (template: DocxTemplate) => void;
  onDelete?: (template: DocxTemplate) => void;
  onToggleScopeDefault?: (templateId: string) => void;
}

/**
 * DocLabTemplateCard
 * Dedicated template item card with scope badge, default toggle, and action buttons.
 */
export const DocLabTemplateCard: React.FC<DocLabTemplateCardProps> = ({
  template,
  isActive,
  isScopeDefault,
  onSelect,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleScopeDefault,
}) => {
  const isGenerated = template.templateType === 'generated' || template.id?.startsWith('gen_');

  return (
    <div
      onClick={() => onSelect(template)}
      className={`group relative p-3 rounded-xl border transition-all cursor-pointer select-none ${
        isActive
          ? 'theme-bg-accent-soft theme-border-accent shadow-xs'
          : 'theme-bg-surface theme-border hover:theme-border-accent/40'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
              isActive
                ? 'theme-bg-accent text-white shadow-xs'
                : 'theme-bg-sub theme-text-secondary group-hover:theme-accent'
            }`}
          >
            <FileIcon className="w-4 h-4" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`text-xs font-semibold truncate ${
                  isActive ? 'theme-accent font-bold' : 'theme-text-primary'
                }`}
                title={template.name}
              >
                {template.name}
              </span>

              {isGenerated && (
                <span className="px-1.5 py-0.2 rounded text-[9.5px] font-medium theme-success-badge">
                  Filled
                </span>
              )}
            </div>

            <p className="text-[11px] theme-text-secondary truncate mt-0.5">
              {template.description || (isGenerated ? 'Generated filled document' : 'Custom layout document')}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Scope Default Star */}
          {onToggleScopeDefault && !isGenerated && (
            <button
              type="button"
              onClick={() => onToggleScopeDefault(template.id)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isScopeDefault
                  ? 'theme-warning'
                  : 'theme-text-muted hover:theme-text-primary'
              }`}
              title={isScopeDefault ? 'Current default for this scope' : 'Set as default template for this scope'}
            >
              <StarIcon className={`w-3.5 h-3.5 ${isScopeDefault ? 'theme-warning' : ''}`} />
            </button>
          )}

          {/* Edit Template */}
          {onEdit && !isGenerated && (
            <button
              type="button"
              onClick={() => onEdit(template)}
              className="p-1.5 rounded-lg theme-text-muted hover:theme-text-primary hover:theme-bg-sub transition-colors cursor-pointer"
              title="Edit in Document Designer"
            >
              <EditIcon className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Duplicate Template */}
          {onDuplicate && (
            <button
              type="button"
              onClick={() => onDuplicate(template)}
              className="p-1.5 rounded-lg theme-text-muted hover:theme-text-primary hover:theme-bg-sub transition-colors cursor-pointer"
              title="Duplicate"
            >
              <DuplicateIcon className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Delete Template */}
          {onDelete && !(template as any).isBuiltin && (
            <button
              type="button"
              onClick={() => onDelete(template)}
              className="p-1.5 rounded-lg theme-text-muted hover:theme-danger hover:theme-bg-sub transition-colors cursor-pointer"
              title="Delete"
            >
              <TrashIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
