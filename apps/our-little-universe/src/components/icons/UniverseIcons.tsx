/**
 * Centralized Icon Registry for Our Little Universe.
 * Re-exports @repo/ui project icons and defines domain-specific icons in the exact
 * same SVG format so zero raw inline SVGs or third-party icon packs appear inside views.
 */
import React from 'react';
import type { IconProps } from '@repo/ui';

export {
  AlertTriangleIcon,
  AppearanceIcon,
  ArrowLeftIcon as ArrowLeftNavIcon,
  ArrowRightIcon,
  AwardIcon,
  BookOpenIcon,
  CalendarIcon,
  CheckCircleIcon,
  CheckIcon,
  ClockIcon,
  CloseIcon,
  CompassIcon,
  EditIcon,
  EyeIcon,
  EyeOffIcon,
  FullScreenIcon,
  GlobeIcon,
  ImageIcon as ImageVaultIcon,
  InfoIcon,
  KeyIcon,
  LanguagesIcon,
  LocationIcon,
  LockClosedIcon,
  LockIcon,
  LockOpenIcon as UnlockIcon,
  LogOutIcon,
  MailIcon,
  MenuIcon,
  MoonIcon,
  PlusIcon,
  RefreshIcon,
  SettingsIcon,
  ShieldCheckIcon,
  ShieldIcon,
  SidebarRightIcon,
  SparklesIcon,
  StarIcon as StarsIcon,
  SunIcon,
  SystemModeIcon,
  TrashIcon,
  TrophyIcon,
  UploadIcon,
  UsersIcon,
  Volume2Icon as VolumeOnIcon,
  VolumeXIcon as VolumeOffIcon,
} from '@repo/ui';

export function HeartIcon({ className = 'w-4 h-4', ...props }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
      />
    </svg>
  );
}

export function MusicNoteIcon({ className = 'w-4 h-4', ...props }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zm12-2a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

export function FlowerIcon({ className = 'w-4 h-4', ...props }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} {...props}>
      <circle cx="12" cy="12" r="2.5" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9.5a3 3 0 10-3-3c0 1.2.7 2.2 1.7 2.7M14.5 12a3 3 0 103-3c-1.2 0-2.2.7-2.7 1.7M12 14.5a3 3 0 103 3c0-1.2-.7-2.2-1.7-2.7M9.5 12a3 3 0 10-3 3c1.2 0 2.2-.7 2.7-1.7"
      />
    </svg>
  );
}

export function GamepadIcon({ className = 'w-4 h-4', ...props }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} {...props}>
      <rect x="2" y="6" width="20" height="12" rx="4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h4M8 10v4M15.5 11h.01M17.5 13h.01" />
    </svg>
  );
}

export function GiftIcon({ className = 'w-4 h-4', ...props }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 12v8a2 2 0 01-2 2H6a2 2 0 01-2-2v-8m16 0H4m16 0v-3a1 1 0 00-1-1H5a1 1 0 00-1 1v3m8-4v14m0-14c-1.5-2.5-5-2.5-5 0s3.5 0 5 0zm0 0c1.5-2.5 5-2.5 5 0s-3.5 0-5 0z"
      />
    </svg>
  );
}

export function DropletsIcon({ className = 'w-4 h-4', ...props }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3.5c2.8 3.6 5.5 6.8 5.5 10a5.5 5.5 0 11-11 0c0-3.2 2.7-6.4 5.5-10z"
      />
    </svg>
  );
}

export function HelpCircleIcon({ className = 'w-4 h-4', ...props }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 9a2.5 2.5 0 014.8 1c0 1.5-2.3 2-2.3 3.5M12 17h.01" />
    </svg>
  );
}

export function ZoomInIcon({ className = 'w-4 h-4', ...props }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 8v6M8 11h6" />
    </svg>
  );
}

export function ZoomOutIcon({ className = 'w-4 h-4', ...props }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M8 11h6" />
    </svg>
  );
}

export function TargetFocusIcon({ className = 'w-4 h-4', ...props }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} {...props}>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="2.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  );
}

export function Cube3DIcon({ className = 'w-4 h-4', ...props }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"
      />
    </svg>
  );
}

export function GridCardsIcon({ className = 'w-4 h-4', ...props }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} {...props}>
      <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
    </svg>
  );
}

export function PlayIcon({ className = 'w-4 h-4', ...props }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 5.5l12 6.5-12 6.5V5.5z" />
    </svg>
  );
}

export function PauseIcon({ className = 'w-4 h-4', ...props }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 5v14M15.5 5v14" />
    </svg>
  );
}

export function ExpandScreenIcon({ className = 'w-4 h-4', ...props }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 9V5a1 1 0 011-1h4M20 9V5a1 1 0 00-1-1h-4M4 15v4a1 1 0 001 1h4M20 15v4a1 1 0 01-1 1h-4"
      />
    </svg>
  );
}

export function MinimizeScreenIcon({ className = 'w-4 h-4', ...props }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 4v4a1 1 0 01-1 1H4M15 4v4a1 1 0 001 1h4M9 20v-4a1 1 0 00-1-1H4M15 20v-4a1 1 0 011-1h4"
      />
    </svg>
  );
}

export function ArrowUpIcon({ className = 'w-4 h-4', ...props }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-6 6m6-6l6 6" />
    </svg>
  );
}

export function ArrowDownIcon({ className = 'w-4 h-4', ...props }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m0 0l-6-6m6 6l6-6" />
    </svg>
  );
}
