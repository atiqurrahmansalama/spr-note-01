import React from 'react';
import type { AvailableTag } from '@/types/notifications';

export interface TagSelectorPillsProps {
  onInsertTag: (tag: string) => void;
  selectedTags?: string[];
}

export const SYSTEM_AVAILABLE_TAGS: AvailableTag[] = [
  { tag: '{student_name}', label: 'Student Name' },
  { tag: '{class_name}', label: 'Class / Track' },
  { tag: '{roll_number}', label: 'Roll Number' },
  { tag: '{guardian_name}', label: 'Guardian Name' },
  { tag: '{institution_name}', label: 'Institution' },
  { tag: '{date}', label: 'Date' },
  { tag: '{time}', label: 'Time' },
  { tag: '{action_url}', label: 'Action Link' },
  { tag: '{staff_name}', label: 'Staff Name' },
];

export default function TagSelectorPills({
  onInsertTag,
}: TagSelectorPillsProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold theme-text-secondary">
        Dynamic Merge Tags (Click to insert into message)
      </label>
      <div className="flex flex-wrap gap-1.5">
        {SYSTEM_AVAILABLE_TAGS.map((item) => (
          <button
            key={item.tag}
            type="button"
            onClick={() => onInsertTag(item.tag)}
            className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium border theme-border theme-bg-sub theme-text-primary hover:theme-bg-elevated hover:theme-accent transition-all cursor-pointer active:scale-95"
            title={`Click to insert ${item.tag}`}
          >
            + {item.tag}
          </button>
        ))}
      </div>
    </div>
  );
}
