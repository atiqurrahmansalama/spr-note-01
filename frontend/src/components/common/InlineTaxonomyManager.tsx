import React, { useState, useMemo } from 'react';
import CustomInput from '@/components/ui/CustomInput';
import CustomSelect from '@/components/ui/CustomSelect';
import CustomButton from '@/components/ui/CustomButton';
import {
  PlusIcon,
  EditIcon,
  TrashIcon,
  CloseIcon,
  CheckIcon,
} from '@/components/ui/Icons';
import { useToast } from '@/context/ToastContext';

export interface TaxonomyItem {
  id?: string;
  value: string;
  label: string;
  [key: string]: any;
}

export interface InlineTaxonomyManagerProps {
  /** Title of the manager panel (e.g. "Manage Evaluation Meanings") */
  title?: string;
  /** Display noun for an individual item (e.g. "Meaning", "Event Type") */
  itemTypeName?: string;
  /** List of current items (either object with value/label or raw string) */
  items: (TaxonomyItem | string)[];
  /** Controlled open state */
  isOpen?: boolean;
  /** Callback to close the panel */
  onClose?: () => void;
  /** Callback to add a new item by label */
  onAdd: (label: string) => Promise<void> | void;
  /** Callback to update an existing item */
  onUpdate: (oldValue: string, newLabel: string) => Promise<void> | void;
  /** Callback to delete an item (with optional replacement value) */
  onDelete: (valToDelete: string, replacementVal?: string) => Promise<void> | void;
  /** Custom input placeholder */
  placeholder?: string;
  /** Whether to prompt for a replacement item when deleting */
  allowReplacementOnDelete?: boolean;
  /** Minimum items required before deletion is blocked (default: 1) */
  minItems?: number;
  /** Additional custom class names */
  className?: string;
}

/**
 * Reusable inline expandable taxonomy and preset management panel
 * Built entirely with project CustomInput, CustomSelect, and CustomButton components
 */
export default function InlineTaxonomyManager({
  title,
  itemTypeName = 'Preset',
  items = [],
  isOpen = true,
  onClose,
  onAdd,
  onUpdate,
  onDelete,
  placeholder,
  allowReplacementOnDelete = false,
  minItems = 1,
  className = '',
}: InlineTaxonomyManagerProps) {
  const { showToast } = useToast();

  const [newItemLabel, setNewItemLabel] = useState('');
  const [editingVal, setEditingVal] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [deletingItem, setDeletingItem] = useState<TaxonomyItem | null>(null);
  const [replacementVal, setReplacementVal] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Normalize items to standard { value, label } structure
  const normalizedItems: TaxonomyItem[] = useMemo(() => {
    if (!Array.isArray(items)) return [];
    return items.map((item, idx) => {
      if (typeof item === 'string') {
        return { value: item, label: item };
      }
      const val = item?.value || item?.label || `item_${idx}`;
      const lbl = item?.label || item?.value || `${itemTypeName} ${idx + 1}`;
      return { ...item, value: val, label: lbl };
    });
  }, [items, itemTypeName]);

  if (!isOpen) return null;

  const resolvedTitle = title || `Manage ${itemTypeName}s`;
  const resolvedPlaceholder = placeholder || `New ${itemTypeName.toLowerCase()} name...`;

  // Handle Add Item
  const handleAdd = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newItemLabel.trim();
    if (!trimmed) return;

    // Duplicate check
    const isDuplicate = normalizedItems.some(
      (item) => item.label.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      showToast(`"${trimmed}" already exists in the list.`, 'warning');
      return;
    }

    try {
      setIsProcessing(true);
      await onAdd(trimmed);
      setNewItemLabel('');
    } catch {
      showToast(`Failed to add ${itemTypeName.toLowerCase()}.`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Start Inline Edit
  const handleStartEdit = (item: TaxonomyItem) => {
    setEditingVal(item.value);
    setEditLabel(item.label);
    setDeletingItem(null);
  };

  // Save Inline Edit
  const handleSaveEdit = async (oldVal: string) => {
    const trimmed = editLabel.trim();
    if (!trimmed) return;

    try {
      setIsProcessing(true);
      await onUpdate(oldVal, trimmed);
      setEditingVal(null);
      setEditLabel('');
    } catch {
      showToast(`Failed to update ${itemTypeName.toLowerCase()}.`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Cancel Inline Edit
  const handleCancelEdit = () => {
    setEditingVal(null);
    setEditLabel('');
  };

  // Handle Delete Request
  const handleDeleteClick = (item: TaxonomyItem) => {
    if (normalizedItems.length <= minItems) {
      showToast(`Cannot delete the last remaining ${itemTypeName.toLowerCase()} preset.`, 'warning');
      return;
    }

    if (allowReplacementOnDelete) {
      const remaining = normalizedItems.filter((i) => i.value !== item.value);
      setEditingVal(null);
      setDeletingItem(item);
      setReplacementVal(remaining[0]?.value || '');
    } else {
      handleConfirmDelete(item.value);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async (valToDelete: string, repVal?: string) => {
    try {
      setIsProcessing(true);
      await onDelete(valToDelete, repVal);
      setDeletingItem(null);
      setReplacementVal('');
    } catch {
      showToast(`Failed to delete ${itemTypeName.toLowerCase()}.`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className={`p-4 rounded-2xl border theme-border theme-bg-sub/80 space-y-3.5 animate-fade-in text-left shadow-xs ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b theme-border pb-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full theme-bg-accent" />
          <span className="text-xs font-bold theme-text-primary">{resolvedTitle}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono theme-text-secondary">
            {normalizedItems.length} {normalizedItems.length === 1 ? 'preset' : 'presets'}
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition cursor-pointer"
              title="Close Manager"
            >
              <CloseIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Add Input with CustomButton */}
      <form onSubmit={handleAdd} className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <CustomInput
            placeholder={resolvedPlaceholder}
            value={newItemLabel}
            onChange={(val: string) => setNewItemLabel(val)}
            size="sm"
            compact={true}
          />
        </div>
        <CustomButton
          type="submit"
          variant="primary"
          size="sm"
          icon={PlusIcon}
          loading={isProcessing}
          disabled={!newItemLabel.trim()}
        >
          Add {itemTypeName}
        </CustomButton>
      </form>

      {/* Optional Delete Replacement Box with CustomSelect & CustomButton */}
      {deletingItem && (
        <div className="p-3.5 rounded-xl border theme-border theme-bg-surface space-y-2.5 animate-fade-in text-xs">
          <div className="theme-text-primary font-bold">
            Delete "{deletingItem.label}"?
          </div>
          <p className="text-[11px] theme-text-secondary">
            Select replacement {itemTypeName.toLowerCase()} for currently assigned records:
          </p>

          <CustomSelect
            value={replacementVal}
            onChange={(val: any) => {
              const strVal = typeof val === 'object' ? val?.value || val?.label || '' : val || '';
              setReplacementVal(strVal);
            }}
            options={normalizedItems.filter((i) => i.value !== deletingItem.value)}
            placeholder="Select replacement..."
            size="sm"
          />

          <div className="flex items-center justify-end gap-2 pt-1">
            <CustomButton
              type="button"
              variant="sub"
              size="xs"
              onClick={() => setDeletingItem(null)}
            >
              Cancel
            </CustomButton>
            <CustomButton
              type="button"
              variant="primary"
              size="xs"
              loading={isProcessing}
              disabled={!replacementVal}
              onClick={() => handleConfirmDelete(deletingItem.value, replacementVal)}
            >
              Confirm & Replace
            </CustomButton>
          </div>
        </div>
      )}

      {/* List of Items with Inline Edit & Delete */}
      <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
        {normalizedItems.length === 0 ? (
          <div className="p-4 text-center text-xs theme-text-secondary">
            No {itemTypeName.toLowerCase()} presets found. Add one above.
          </div>
        ) : (
          normalizedItems.map((item, idx) => {
            const isEditing = editingVal === item.value;

            if (isEditing) {
              return (
                <div
                  key={item.value || idx}
                  className="flex items-center gap-2 p-2 rounded-xl border theme-border theme-bg-surface animate-fade-in"
                >
                  <div className="flex-1 min-w-0">
                    <CustomInput
                      value={editLabel}
                      onChange={(val: string) => setEditLabel(val)}
                      autoFocus={true}
                      size="sm"
                      compact={true}
                      onKeyDown={(e: React.KeyboardEvent) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveEdit(item.value);
                        } else if (e.key === 'Escape') {
                          e.preventDefault();
                          handleCancelEdit();
                        }
                      }}
                    />
                  </div>
                  <CustomButton
                    type="button"
                    variant="primary"
                    size="xs"
                    icon={CheckIcon}
                    loading={isProcessing}
                    disabled={!editLabel.trim()}
                    onClick={() => handleSaveEdit(item.value)}
                  >
                    Save
                  </CustomButton>
                  <CustomButton
                    type="button"
                    variant="sub"
                    size="xs"
                    onClick={handleCancelEdit}
                  >
                    Cancel
                  </CustomButton>
                </div>
              );
            }

            return (
              <div
                key={item.value || idx}
                className="flex items-center justify-between p-2.5 rounded-xl border theme-border theme-bg-surface hover:theme-bg-elevated transition text-xs shadow-2xs group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full theme-bg-accent shrink-0" />
                  <span className="font-semibold theme-text-primary truncate">{item.label}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(item)}
                    className="p-1.5 rounded-lg border theme-border hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary transition cursor-pointer"
                    title={`Edit ${itemTypeName}`}
                  >
                    <EditIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteClick(item)}
                    className="p-1.5 rounded-lg border theme-border hover:theme-bg-elevated theme-text-secondary hover:theme-danger transition cursor-pointer"
                    title={`Delete ${itemTypeName}`}
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
