import React, { useMemo } from 'react';
import { useTranslation } from '../../../i18n';
import type { DashboardRole } from '../types';
import ActionMenu, { ActionMenuItem } from '../../../components/ui/ActionMenu';
import { useRoleManagement } from '../../admin/role-management/hooks/useRoleManagement';
import { 
  SparklesIcon, 
  CalendarIcon, 
  ChevronIcon, 
  AcademicCapIcon, 
  TeacherIcon, 
  GroupsIcon, 
  BuildingOfficeIcon,
  ShieldCheckIcon,
  AdjustmentsHorizontalIcon,
  CheckCircleIcon,
  UserIcon,
  Squares2X2Icon,
  MoreVerticalIcon,
  GripVerticalIcon,
} from '../../../components/ui/Icons';

export interface DashboardHeaderProps {
  userName: string;
  userRole: DashboardRole;
  effectiveRole: DashboardRole;
  onRoleChange?: (role: DashboardRole) => void;
  isSuperAdmin: boolean;
  academicYearName?: string;
  onQuickAction?: () => void;
  isEditMode?: boolean;
  onToggleEditMode?: () => void;
  onOpenCustomizerDrawer?: () => void;
  onOpenGovernanceDrawer?: () => void;
}

/**
 * Dynamically resolves the visual icon for a role based on its code or hierarchy level.
 */
export function getRoleIcon(code: string, hierarchyLevel?: number): React.ComponentType<{ className?: string }> {
  const c = String(code || '').toUpperCase();
  if (c.includes('SUPER')) return ShieldCheckIcon;
  if (c.includes('TEACHER') || c.includes('USTADH') || hierarchyLevel === 5) return TeacherIcon;
  if (c.includes('STAFF') || c.includes('OPERAT') || c.includes('HOSTEL') || hierarchyLevel === 6) return GroupsIcon;
  if (c.includes('STUDENT') || hierarchyLevel === 9) return AcademicCapIcon;
  if (c.includes('GUARDIAN') || c.includes('PARENT') || hierarchyLevel === 10) return UserIcon;
  return BuildingOfficeIcon;
}

export default function DashboardHeader({
  userName,
  userRole,
  effectiveRole,
  onRoleChange,
  isSuperAdmin,
  academicYearName = '2026-2027',
  onQuickAction,
  isEditMode = false,
  onToggleEditMode,
  onOpenCustomizerDrawer,
  onOpenGovernanceDrawer,
}: DashboardHeaderProps) {
  const { t, formatDate } = useTranslation('dashboard');
  // Dynamic roles from /role-management
  const { roles = [] } = useRoleManagement();

  // Determine time-based greeting
  const hour = new Date().getHours();
  let greetingKey = 'greetingMorning';
  let defaultGreeting = 'Good morning, {name}';
  if (hour >= 12 && hour < 17) {
    greetingKey = 'greetingAfternoon';
    defaultGreeting = 'Good afternoon, {name}';
  } else if (hour >= 17) {
    greetingKey = 'greetingEvening';
    defaultGreeting = 'Good evening, {name}';
  }

  // Active role details derived dynamically from role-management
  const activeRoleRecord = useMemo(
    () => roles.find((r) => r.code?.toUpperCase() === String(effectiveRole).toUpperCase()),
    [roles, effectiveRole]
  );
  const currentRoleName = activeRoleRecord?.name || String(effectiveRole).replace(/_/g, ' ');
  const ActiveRoleIcon = getRoleIcon(effectiveRole, activeRoleRecord?.hierarchy_level);

  // Role switch menu items generated dynamically from role-management
  const roleMenuItems = useMemo<ActionMenuItem[]>(() => {
    return roles.map((r) => {
      const isCurrent = r.code?.toUpperCase() === String(effectiveRole).toUpperCase();
      const OptIcon = getRoleIcon(r.code, r.hierarchy_level);

      return {
        label: r.name,
        icon: OptIcon,
        onClick: () => onRoleChange?.(r.code as DashboardRole),
        badge: isCurrent ? 'Active' : undefined,
      };
    });
  }, [roles, effectiveRole, onRoleChange]);

  const managementMenuItems = useMemo<ActionMenuItem[]>(() => {
    const list: ActionMenuItem[] = [];
    if (onToggleEditMode) {
      list.push({
        label: isEditMode
          ? t('exitGridLayout', 'Exit Grid Customization')
          : t('configureGridLayout', 'Configure Grid Layout'),
        icon: isEditMode ? CheckCircleIcon : GripVerticalIcon,
        onClick: onToggleEditMode,
      });
    }
    if (onOpenCustomizerDrawer) {
      list.push({
        label: isSuperAdmin
          ? t('workspaceRoleBuilder', 'Workspace Customizer (Role Builder)')
          : t('workspaceCustomizer', 'Workspace Customizer'),
        icon: AdjustmentsHorizontalIcon,
        onClick: onOpenCustomizerDrawer,
      });
    }
    if (onOpenGovernanceDrawer && isSuperAdmin) {
      list.push({
        label: t('widgetGovernance', 'Widget Role & Academy Scopes'),
        icon: ShieldCheckIcon,
        onClick: onOpenGovernanceDrawer,
      });
    }
    return list;
  }, [isEditMode, onToggleEditMode, onOpenCustomizerDrawer, onOpenGovernanceDrawer, isSuperAdmin, t]);

  return (
    <div className="w-full flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-1 select-none">
      {/* Welcome Title and Subtitle */}
      <div className="space-y-1 min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight theme-text-primary truncate">
          {t(greetingKey, defaultGreeting, { name: userName || 'Administrator' })}
        </h1>

        <p className="text-xs sm:text-sm theme-text-secondary leading-relaxed max-w-2xl">
          {t('welcomeSubtitle', 'Here is what is happening across your institutional workspace today.')}
        </p>
      </div>

      {/* Right Controls: Date Badge, Super Admin Role Switcher & Far-Right Three-Dot Menu (Borderless & Clean) */}
      <div className="flex flex-wrap items-center gap-2.5 shrink-0">
        {/* Today's Date Badge (Borderless) */}
        <div className="px-3 py-1.5 rounded-xl theme-bg-surface shadow-xs flex items-center gap-2 theme-text-secondary text-xs font-medium select-none">
          <CalendarIcon className="w-3.5 h-3.5 opacity-70" />
          <span>{formatDate(new Date().toISOString(), { dateStyle: 'medium' })}</span>
        </div>

        {/* Super Admin Dynamic Role Switcher (Project ActionMenu, Only Role Name, No Hardcoded Text) */}
        {isSuperAdmin && (
          <ActionMenu
            label={currentRoleName}
            icon={ActiveRoleIcon}
            items={roleMenuItems}
            variant="surface"
            align="right"
            header="Switch Role View (Super Admin)"
            showChevron={true}
            buttonClassName="px-3 py-1.5 rounded-xl theme-bg-surface hover:theme-bg-sub shadow-xs text-xs font-semibold cursor-pointer border-0"
          />
        )}

        {/* High-Visibility Exit Customization Mode Button */}
        {isEditMode && onToggleEditMode && (
          <button
            type="button"
            onClick={onToggleEditMode}
            className="px-3 py-1.5 rounded-xl theme-bg-accent text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm animate-pulse"
            title="Done Customizing Grid"
          >
            <CheckCircleIcon className="w-3.5 h-3.5" />
            <span>{t('doneCustomizing', 'Done Customizing')}</span>
          </button>
        )}

        {/* Far-Right Three-Dot Menu: Project ActionMenu */}
        <ActionMenu
          icon={MoreVerticalIcon}
          variant="ghost"
          align="right"
          header="Dashboard Management"
          items={managementMenuItems}
        />
      </div>
    </div>
  );
}
