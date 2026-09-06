import React from 'react';
import {
  BookOpenIcon,
  UserCheckIcon,
  BuildingIcon,
  LayersIcon,
} from '../../ui/Icons';

export const LENS_MODES = {
  SUBJECT: 'SUBJECT',
  TEACHER: 'TEACHER',
  ROOM: 'ROOM',
  ALL: 'ALL',
};

export const LENS_OPTIONS = [
  {
    id: LENS_MODES.SUBJECT,
    label: 'Book / Subject Focus',
    shortLabel: 'Subjects',
    icon: BookOpenIcon,
    description: 'Subject & Book Scope — Drag & drop swaps or moves subject syllabus and books only (Ctrl+Drag to duplicate subject)',
  },
  {
    id: LENS_MODES.TEACHER,
    label: 'Teacher / Examiner Focus',
    shortLabel: 'Examiners',
    icon: UserCheckIcon,
    description: 'Examiner Scope — Drag & drop swaps paper setter and invigilator duties only without changing subjects (Ctrl+Drag to copy examiner)',
  },
  {
    id: LENS_MODES.ROOM,
    label: 'Hall / Room Focus',
    shortLabel: 'Rooms & Halls',
    icon: BuildingIcon,
    description: 'Room & Hall Scope — Drag & drop swaps exam hall and room allocations only (Ctrl+Drag to copy room)',
  },
  {
    id: LENS_MODES.ALL,
    label: 'Comprehensive (All Details)',
    shortLabel: 'Full View',
    icon: LayersIcon,
    description: 'Full Scope — Drag & drop moves or swaps the complete routine card across dates and classes (Ctrl+Drag to duplicate slot)',
  },
];

/**
 * TimetableLensSelector
 * Modern segmented lens switcher allowing users to switch the active work layer
 * on the 2D routine grid without changing the data structure.
 */
export default function TimetableLensSelector({
  activeLens = LENS_MODES.ALL,
  onChange,
  className = '',
}) {
  return (
    <div className={`inline-flex items-center p-1 rounded-xl border theme-border theme-bg-sub/70 shadow-2xs gap-1 ${className}`}>
      {LENS_OPTIONS.map((opt) => {
        const IconComponent = opt.icon;
        const isActive = activeLens === opt.id;

        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            title={opt.description}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer select-none ${
              isActive
                ? 'theme-bg-surface theme-text-primary shadow-xs border theme-border ring-1 ring-[var(--accent-main)]/20'
                : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-surface/50'
            }`}
          >
            <IconComponent
              className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                isActive ? 'theme-accent scale-110' : 'opacity-70'
              }`}
            />
            <span className="hidden sm:inline">{opt.shortLabel}</span>
            <span className="sm:hidden">{opt.shortLabel.split(' ')[0]}</span>
          </button>
        );
      })}
    </div>
  );
}
