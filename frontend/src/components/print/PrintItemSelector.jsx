import React, { useState, useMemo } from 'react';
import CustomCheckbox from '../ui/CustomCheckbox';
import CustomInput from '../ui/CustomInput';
import CustomButton from '../ui/CustomButton';
import { ChevronIcon } from '../ui/Icons';

/**
 * PrintItemSelector
 * Reusable enterprise expandable item selector for Print Studio (Columns, Rows, etc.)
 * Streamlined expandable architecture without outer boxed card borders/backgrounds.
 */
export default function PrintItemSelector({
  icon: Icon,
  title = 'Data Items',
  items = [], // Array of { key: string, label: string, subLabel?: string, required?: boolean, mandatory?: boolean }
  selectedKeys = [], // Array of selected string keys
  requiredKeys = [], // Array of mandatory string keys that cannot be deselected
  isItemRequired, // Optional checker function (item) => boolean
  onSelectionChange,
  onSelectAll,
  onDeselectAll,
  minSelected = 1,
  showSearch = true,
  searchable,
  showSearchThreshold = 5,
  searchPlaceholder = 'Search items...',
  emptyMessage = 'No matching items found',
  maxHeight = 'max-h-56',
  defaultExpanded = true,
  expanded: controlledExpanded,
  onToggle,
  className = '',
}) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const [searchQuery, setSearchQuery] = useState('');

  const isControlled = controlledExpanded !== undefined;
  const isExpanded = isControlled ? controlledExpanded : internalExpanded;

  const isSearchEnabled = searchable !== undefined ? Boolean(searchable) : Boolean(showSearch);
  const shouldRenderSearch = isSearchEnabled && items.length > showSearchThreshold;

  const isItemMandatory = (item) => {
    if (!item) return false;
    if (typeof isItemRequired === 'function' && isItemRequired(item)) return true;
    if (requiredKeys && Array.isArray(requiredKeys) && requiredKeys.map(String).includes(String(item.key))) {
      return true;
    }
    return Boolean(item.required || item.mandatory || item.isMandatory || item.locked || item.isLocked);
  };

  const handleExpandToggle = () => {
    if (isControlled) {
      onToggle?.(!isExpanded);
    } else {
      setInternalExpanded((prev) => !prev);
      onToggle?.(!internalExpanded);
    }
  };

  const filteredItems = useMemo(() => {
    if (!isSearchEnabled || !searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        String(item.label || '').toLowerCase().includes(q) ||
        String(item.subLabel || '').toLowerCase().includes(q)
    );
  }, [items, searchQuery, isSearchEnabled]);

  const selectedCount = useMemo(() => {
    const set = new Set((selectedKeys || []).map(String));
    return items.filter((item) => isItemMandatory(item) || set.has(String(item.key))).length;
  }, [items, selectedKeys, requiredKeys, isItemRequired]);

  const handleToggle = (key) => {
    if (!onSelectionChange) return;
    const strKey = String(key);
    const targetItem = items.find((i) => String(i.key) === strKey);
    if (isItemMandatory(targetItem)) return; // Cannot toggle mandatory items

    const currentSelected = (selectedKeys || []).map(String);
    if (currentSelected.includes(strKey)) {
      if (minSelected > 0 && currentSelected.length <= minSelected) return;
      onSelectionChange(currentSelected.filter((k) => k !== strKey));
    } else {
      onSelectionChange([...currentSelected, strKey]);
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Expandable Header Row */}
      <div className="flex items-center justify-between gap-2 select-none">
        <div
          onClick={handleExpandToggle}
          className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer group"
        >
          {Icon && (
            <Icon className="w-3.5 h-3.5 theme-accent shrink-0 opacity-80 group-hover:opacity-100 transition-opacity" />
          )}
          <span className="text-xs font-semibold theme-text-primary group-hover:theme-accent transition-colors truncate">
            {title}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full theme-bg-sub theme-text-secondary font-mono font-medium shrink-0">
            {selectedCount}/{items.length}
          </span>
        </div>

        {/* Expand Chevron Toggle Button */}
        <CustomButton
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={handleExpandToggle}
          title={isExpanded ? `Hide ${title}` : `Customize ${title}`}
          aria-label={isExpanded ? `Hide ${title}` : `Customize ${title}`}
          className="h-5 w-5 p-0.5 rounded-md shrink-0 -my-0.5"
        >
          <ChevronIcon
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isExpanded ? 'rotate-180 theme-accent' : ''
            }`}
          />
        </CustomButton>
      </div>

      {/* Expandable Sub-options List (Zero outer card bg/border) */}
      {isExpanded && (
        <div className="space-y-2 pt-1 pl-3.5 pr-0.5 animate-fade-in">
          {/* Quick Search Filter */}
          {shouldRenderSearch && (
            <CustomInput
              value={searchQuery}
              onChange={(val, e) => {
                const next = typeof val === 'string' ? val : (e?.target?.value ?? val ?? '');
                setSearchQuery(next);
              }}
              placeholder={searchPlaceholder}
              size="sm"
            />
          )}

          {/* Scrollable Items List (Clean, borderless & background-free) */}
          <div className={`${maxHeight} overflow-y-auto space-y-0.5 pr-0.5`}>
            {filteredItems.length === 0 ? (
              <p className="text-xs theme-text-secondary text-center py-2.5">{emptyMessage}</p>
            ) : (
              filteredItems.map((item) => {
                const isMandatory = isItemMandatory(item);
                const isChecked = isMandatory || (selectedKeys || []).map(String).includes(String(item.key));
                return (
                  <div
                    key={item.key}
                    className={`py-1.5 px-2 rounded-lg flex items-center justify-between transition-colors select-none ${
                      isMandatory
                        ? 'opacity-85'
                        : isChecked
                        ? 'theme-text-primary hover:theme-bg-sub/50'
                        : 'opacity-60 hover:opacity-100 hover:theme-bg-sub/50'
                    }`}
                  >
                    <CustomCheckbox
                      checked={isChecked}
                      onChange={() => handleToggle(item.key)}
                      label={item.label}
                      disabled={isMandatory}
                      readOnly={isMandatory}
                      size="sm"
                      className="w-full flex-1"
                    />
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {item.subLabel && (
                        <span className="text-[10px] theme-text-secondary font-medium truncate max-w-[120px]">
                          {item.subLabel}
                        </span>
                      )}
                      {isMandatory && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded theme-bg-sub theme-text-secondary font-mono font-medium">
                          Required
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}


