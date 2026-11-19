import React, { useState, useMemo } from 'react';
import UniversalManagementView from '@/components/common/UniversalManagementView';
import BranchSelect from '@/components/selectors/BranchSelect';
import CustomSelect from '@/components/ui/CustomSelect';
import CustomButton from '@/components/ui/CustomButton';
import {
  TeacherIcon,
  BuildingOfficeIcon,
  UserIcon,
} from '@/components/ui/Icons';
import { getBranchDisplayName } from '@/utils/localStore';
import type {
  ResidentialBuilding,
  DormitoryRoom,
  SupervisorPersonnel,
} from '@/types/residential';

export const SUPERVISOR_ROLE_FILTERS = [
  { value: 'ALL', label: 'All Roles' },
  { value: 'WARDEN', label: 'Floor Wardens' },
  { value: 'SUPERVISOR', label: 'Room Supervisors' },
  { value: 'PREFECT', label: 'Student Prefects' },
];

export interface SupervisorsWardensTabProps {
  buildings: ResidentialBuilding[];
  rooms: DormitoryRoom[];
  loading?: boolean;
  onOpenRoomDetails: (room: DormitoryRoom) => void;
  onOpenBuildingDrawer: (building: ResidentialBuilding) => void;
}

export default function SupervisorsWardensTab({
  buildings,
  rooms,
  loading = false,
  onOpenRoomDetails,
  onOpenBuildingDrawer,
}: SupervisorsWardensTabProps) {
  const [supervisorSearch, setSupervisorSearch] = useState<string>('');
  const [supervisorBranchFilter, setSupervisorBranchFilter] = useState<string>('ALL');
  const [supervisorRoleFilter, setSupervisorRoleFilter] = useState<string>('ALL');

  // ─── Derive Supervisors List ───────────────────────────────────────────────
  const supervisorsList = useMemo<SupervisorPersonnel[]>(() => {
    const list: SupervisorPersonnel[] = [];
    const safeBuildings = Array.isArray(buildings) ? buildings : [];
    const safeRooms = Array.isArray(rooms) ? rooms : [];

    // 1. Floor Wardens from Buildings
    safeBuildings.forEach((b) => {
      if (b && (b.warden_name || b.warden)) {
        const roomCount = safeRooms.filter((r) => r && r.building === b.id).length;
        list.push({
          id: `warden_${b.id}`,
          name: b.warden_name || 'Floor Warden',
          role: 'Floor Warden',
          role_type: 'WARDEN',
          jurisdiction: b.name || 'Building',
          sub_title: `${b.total_floors || 1} Floors • ${roomCount} Rooms`,
          branch: b.branch || '',
          branch_name: b.branch_name || 'Main Campus',
          scope: `${roomCount} Rooms Managed`,
          raw_type: 'BUILDING',
          raw: b,
        });
      }
    });

    // 2. Room Supervisors & Prefects
    safeRooms.forEach((r) => {
      if (r && (r.supervisor_name || r.supervisor)) {
        list.push({
          id: `sup_${r.id}`,
          name: r.supervisor_name || 'Room Supervisor',
          role: 'Room Supervisor',
          role_type: 'SUPERVISOR',
          jurisdiction: `Room ${r.room_number || ''} (${r.room_name || 'Dormitory'})`,
          sub_title: `${r.building_name || 'Main Hall'} • Floor ${r.floor_number || 1}`,
          branch: r.branch || '',
          branch_name: r.branch_name || 'Main Campus',
          scope: `${r.max_capacity || 1} Bed Capacity`,
          raw_type: 'ROOM',
          raw: r,
        });
      }

      if (r && (r.prefect_name || r.prefect)) {
        list.push({
          id: `prefect_${r.id}`,
          name: r.prefect_name || 'Student Prefect',
          role: 'Student Prefect',
          role_type: 'PREFECT',
          jurisdiction: `Room ${r.room_number || ''} (${r.room_name || 'Dormitory'})`,
          sub_title: `${r.building_name || 'Main Hall'} • Floor ${r.floor_number || 1}`,
          branch: r.branch || '',
          branch_name: r.branch_name || 'Main Campus',
          scope: `Room Student Monitor`,
          raw_type: 'ROOM',
          raw: r,
        });
      }
    });

    return list;
  }, [buildings, rooms]);

  // ─── Filtered Supervisors ──────────────────────────────────────────────────
  const filteredSupervisors = useMemo(() => {
    return supervisorsList.filter((s) => {
      if (!s) return false;
      if (supervisorBranchFilter !== 'ALL' && s.branch !== supervisorBranchFilter) return false;
      if (supervisorRoleFilter !== 'ALL' && s.role_type !== supervisorRoleFilter) return false;
      if (supervisorSearch.trim()) {
        const q = supervisorSearch.toLowerCase();
        return (
          (s.name || '').toLowerCase().includes(q) ||
          (s.jurisdiction || '').toLowerCase().includes(q) ||
          (s.sub_title || '').toLowerCase().includes(q) ||
          (s.role || '').toLowerCase().includes(q) ||
          (s.branch_name || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [supervisorsList, supervisorBranchFilter, supervisorRoleFilter, supervisorSearch]);

  // ─── Columns for Table View ────────────────────────────────────────────────
  const supervisorColumns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Personnel Name',
        sortable: true,
        render: (row: SupervisorPersonnel) => (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl theme-bg-sub flex items-center justify-center font-bold text-xs theme-text-primary">
              {row.role_type === 'WARDEN' ? (
                <BuildingOfficeIcon className="w-4 h-4 theme-accent" />
              ) : row.role_type === 'SUPERVISOR' ? (
                <TeacherIcon className="w-4 h-4 theme-accent" />
              ) : (
                <UserIcon className="w-4 h-4 theme-accent" />
              )}
            </div>
            <div>
              <span className="font-bold text-xs theme-text-primary block">{row.name}</span>
              <span className="text-[11px] theme-text-secondary">
                {getBranchDisplayName(row.branch_name || row.branch)}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: 'role',
        header: 'Role / Designation',
        sortable: true,
        render: (row: SupervisorPersonnel) => (
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              row.role_type === 'WARDEN'
                ? 'theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20'
                : row.role_type === 'SUPERVISOR'
                ? 'theme-bg-sub theme-text-primary border theme-border'
                : 'theme-bg-sub theme-text-secondary border theme-border'
            }`}
          >
            {row.role}
          </span>
        ),
      },
      {
        key: 'jurisdiction',
        header: 'Assigned Jurisdiction',
        render: (row: SupervisorPersonnel) => (
          <div className="text-xs">
            <span className="font-semibold theme-text-primary block">{row.jurisdiction}</span>
            <span className="text-[11px] theme-text-secondary">{row.sub_title}</span>
          </div>
        ),
      },
      {
        key: 'scope',
        header: 'Scope / Oversight',
        render: (row: SupervisorPersonnel) => (
          <span className="text-xs font-semibold theme-text-secondary">{row.scope}</span>
        ),
      },
      {
        key: 'actions',
        header: '',
        render: (row: SupervisorPersonnel) => (
          <CustomButton
            type="button"
            variant="sub"
            size="xs"
            onClick={() => {
              if (row.raw_type === 'ROOM') {
                onOpenRoomDetails(row.raw as DormitoryRoom);
              } else if (row.raw_type === 'BUILDING') {
                onOpenBuildingDrawer(row.raw as ResidentialBuilding);
              }
            }}
          >
            View Details
          </CustomButton>
        ),
      },
    ],
    [onOpenRoomDetails, onOpenBuildingDrawer]
  );

  // ─── Render Card for Grid View ─────────────────────────────────────────────
  const renderSupervisorCard = (row: SupervisorPersonnel) => {
    return (
      <div
        key={row.id}
        onClick={() => {
          if (row.raw_type === 'ROOM') {
            onOpenRoomDetails(row.raw as DormitoryRoom);
          } else if (row.raw_type === 'BUILDING') {
            onOpenBuildingDrawer(row.raw as ResidentialBuilding);
          }
        }}
        className="p-4 rounded-2xl border theme-border theme-bg-surface hover:theme-bg-sub/30 transition-all shadow-xs flex flex-col justify-between space-y-3 cursor-pointer group select-none"
      >
        <div className="space-y-2">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl theme-bg-sub flex items-center justify-center">
                {row.role_type === 'WARDEN' ? (
                  <BuildingOfficeIcon className="w-5 h-5 theme-accent" />
                ) : row.role_type === 'SUPERVISOR' ? (
                  <TeacherIcon className="w-5 h-5 theme-accent" />
                ) : (
                  <UserIcon className="w-5 h-5 theme-accent" />
                )}
              </div>
              <div>
                <h4 className="text-sm font-bold theme-text-primary group-hover:theme-accent leading-tight">
                  {row.name}
                </h4>
                <p className="text-xs theme-text-secondary">
                  {getBranchDisplayName(row.branch_name || row.branch)}
                </p>
              </div>
            </div>

            <span
              className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                row.role_type === 'WARDEN'
                  ? 'theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20'
                  : row.role_type === 'SUPERVISOR'
                  ? 'theme-bg-sub theme-text-primary border theme-border'
                  : 'theme-bg-sub theme-text-secondary border theme-border'
              }`}
            >
              {row.role}
            </span>
          </div>

          {/* Jurisdiction */}
          <div className="space-y-1 pt-2 border-t theme-border">
            <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary block">
              Assigned Area
            </span>
            <span className="text-xs font-bold theme-text-primary block">{row.jurisdiction}</span>
            <span className="text-[11px] theme-text-secondary block">{row.sub_title}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t theme-border flex items-center justify-between text-[11px] theme-text-secondary">
          <span>{row.scope}</span>
          <span className="font-semibold theme-accent">View Area →</span>
        </div>
      </div>
    );
  };

  return (
    <UniversalManagementView
      title="Supervisors & Wardens"
      subtitle="Manage residential staff oversight"
      icon={TeacherIcon}
      hideHeader={true}
      isEmbedded={true}
      storageKey="spr_residential_supervisors_view"
      defaultViewMode="grid"
      searchLabel="Search Supervisors"
      searchQuery={supervisorSearch}
      onSearchChange={setSupervisorSearch}
      searchPlaceholder="Supervisor name, room, building, role..."
      filters={
        <>
          <div className="w-48 shrink-0">
            <BranchSelect
              label="Campus Branch"
              value={supervisorBranchFilter}
              onChange={(val: string) => setSupervisorBranchFilter(val)}
              allowAll={true}
              allLabel="All Branches"
              size="md"
            />
          </div>

          <div className="w-44 shrink-0">
            <CustomSelect
              label="Role"
              options={SUPERVISOR_ROLE_FILTERS}
              value={supervisorRoleFilter}
              onChange={(val: string) => setSupervisorRoleFilter(val)}
              size="md"
            />
          </div>
        </>
      }
      hasActiveFilters={
        supervisorSearch.trim() !== '' ||
        supervisorBranchFilter !== 'ALL' ||
        supervisorRoleFilter !== 'ALL'
      }
      activeFilterCount={
        [
          supervisorSearch.trim() !== '',
          supervisorBranchFilter !== 'ALL',
          supervisorRoleFilter !== 'ALL',
        ].filter(Boolean).length
      }
      onResetFilters={() => {
        setSupervisorSearch('');
        setSupervisorBranchFilter('ALL');
        setSupervisorRoleFilter('ALL');
      }}
      loading={loading}
      data={filteredSupervisors}
      totalCount={supervisorsList.length}
      itemLabel="Personnel"
      columns={supervisorColumns}
      renderCard={renderSupervisorCard}
      emptyIcon={TeacherIcon}
      emptyTitle="No Supervisors or Wardens Found"
      emptySubMessage="Assign wardens to residential buildings and supervisors to dormitory rooms to view the roster."
    />
  );
}
