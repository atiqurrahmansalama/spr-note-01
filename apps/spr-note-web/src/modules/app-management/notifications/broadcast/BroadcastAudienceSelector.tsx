import React from 'react';
import ClassSelect from '@/components/selectors/ClassSelect';
import { UsersIcon, UserIcon, TeacherIcon, BuildingOfficeIcon } from '@/components/ui/Icons';
import type { BroadcastAudience } from '@/types/notifications';

export interface BroadcastAudienceSelectorProps {
  selectedAudience: BroadcastAudience;
  selectedClassId: string;
  onAudienceChange: (audience: BroadcastAudience) => void;
  onClassChange: (classId: string) => void;
}

const AUDIENCES: { id: BroadcastAudience; label: string; sub: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'ALL', label: 'All Campus', sub: 'Guardians, Students & Staff', icon: UsersIcon },
  { id: 'STUDENTS', label: 'All Students', sub: 'All Registered Guardians', icon: UserIcon },
  { id: 'CLASS', label: 'Specific Class', sub: 'Filter by Academic Class', icon: BuildingOfficeIcon },
  { id: 'TEACHERS', label: 'Teaching Faculty', sub: 'All Academic Teachers', icon: TeacherIcon },
  { id: 'STAFF', label: 'Support Staff', sub: 'Non-teaching Support Team', icon: UsersIcon },
];

export default function BroadcastAudienceSelector({
  selectedAudience,
  selectedClassId,
  onAudienceChange,
  onClassChange,
}: BroadcastAudienceSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="block text-xs font-bold uppercase tracking-wider theme-text-secondary">
        1. Select Target Recipient Audience
      </label>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {AUDIENCES.map((item) => {
          const Icon = item.icon;
          const isSelected = selectedAudience === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onAudienceChange(item.id)}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 select-none ${
                isSelected
                  ? 'theme-bg-accent-soft border-[var(--accent-main)] shadow-xs ring-1 ring-[var(--accent-main)]'
                  : 'theme-bg-surface theme-border hover:theme-bg-sub/50'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isSelected
                    ? 'theme-bg-accent theme-accent-text'
                    : 'theme-bg-sub theme-text-secondary'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>

              <div>
                <span
                  className={`text-xs font-bold block leading-tight ${
                    isSelected ? 'theme-accent' : 'theme-text-primary'
                  }`}
                >
                  {item.label}
                </span>
                {typeof item.sub === 'string' && item.sub.trim() && (
                  <span className="text-[10px] theme-text-secondary block mt-0.5 leading-tight">
                    {item.sub}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {selectedAudience === 'CLASS' && (
        <div className="pt-2 max-w-sm animate-fade-in">
          <ClassSelect
            label="Target Academic Class"
            value={selectedClassId}
            onChange={(val: string) => onClassChange(val)}
            placeholder="Select target class..."
          />
        </div>
      )}
    </div>
  );
}
