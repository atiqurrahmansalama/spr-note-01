import React, { useState } from 'react';
import { PlusIcon, TrashIcon } from '../../../components/ui/Icons';
import { useTranslation } from '../../../i18n';

export interface ChangelogItemInputProps {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  badgeColorClass?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export const ChangelogItemInput: React.FC<ChangelogItemInputProps> = ({
  label,
  items,
  onChange,
  placeholder,
  badgeColorClass = 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
  icon: Icon,
}) => {
  const { t } = useTranslation('version_control');
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    onChange([...items, trimmed]);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleRemove = (index: number) => {
    const updated = items.filter((_, idx) => idx !== index);
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between pb-1 border-b theme-border">
        <div className="flex items-center gap-1.5">
          {Icon && <Icon className="w-4 h-4 theme-text-secondary" />}
          <label className="text-xs font-semibold theme-text-primary">{label}</label>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColorClass}`}>
          {items.length}
        </span>
      </div>

      {/* Input row */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || t('add_item', 'Add Item')}
          className="flex-1 px-3 py-2 text-xs rounded-xl border theme-border theme-bg-elevated theme-text-primary focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!inputValue.trim()}
          className="px-3 py-2 rounded-xl text-xs font-medium theme-bg-elevated border theme-border hover:theme-bg-sub disabled:opacity-40 disabled:cursor-not-allowed theme-text-primary flex items-center gap-1 cursor-pointer transition shrink-0"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          <span>{t('add_item', 'Add Item')}</span>
        </button>
      </div>

      {/* Items list */}
      {items.length > 0 && (
        <ul className="space-y-1.5 pt-1">
          {items.map((item, idx) => (
            <li
              key={idx}
              className="flex items-center justify-between gap-2 p-2 rounded-xl border theme-border theme-bg-sub/40 text-xs theme-text-primary"
            >
              <div className="flex items-start gap-2 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0 mt-1.5" />
                <span className="break-words leading-relaxed">{item}</span>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="p-1 rounded-lg hover:bg-rose-500/10 text-rose-500 transition shrink-0 cursor-pointer"
                title={t('remove_item', 'Remove')}
              >
                <TrashIcon className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ChangelogItemInput;
