import React, { useState, useMemo } from 'react';
import UniversalManagementView from '@/components/common/UniversalManagementView';
import CustomSelect from '@/components/ui/CustomSelect';
import BranchSelect from '@/components/selectors/BranchSelect';
import ResidentialBuildingSelect from '@/components/selectors/ResidentialBuildingSelect';
import ActionMenu from '@/components/ui/ActionMenu';
import {
  HomeIcon,
  UsersIcon,
  UserIcon,
  BuildingOfficeIcon,
  ChecklistIcon,
  EditIcon,
  TrashIcon,
} from '@/components/ui/Icons';
import { getBranchDisplayName } from '@/utils/localStore';
import type { DormitoryRoom, BedAllocation } from '@/types/residential';

export const ROOM_TYPE_FILTERS = [
  { value: 'ALL', label: 'All Categories' },
  { value: 'STUDENT_DORM', label: 'Student Dormitory' },
  { value: 'FACULTY_QUARTER', label: 'Faculty Quarter' },
  { value: 'GUEST_ROOM', label: 'Guest Room' },
  { value: 'STUDY_HALL', label: 'Study Hall' },
];

export const STATUS_FILTERS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'AVAILABLE', label: 'Available Vacancies' },
  { value: 'FULL', label: 'Fully Occupied' },
];

export interface DormitoryRoomsTabProps {
  rooms: DormitoryRoom[];
  beds: BedAllocation[];
  loading?: boolean;
  onOpenRoomDrawer: (room?: DormitoryRoom | null) => void;
  onOpenRoomDetails: (room: DormitoryRoom) => void;
  onDeleteRoom: (room: DormitoryRoom) => void;
}

export default function DormitoryRoomsTab({
  rooms,
  beds,
  loading = false,
  onOpenRoomDrawer,
  onOpenRoomDetails,
  onDeleteRoom,
}: DormitoryRoomsTabProps) {
  const [roomSearch, setRoomSearch] = useState<string>('');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [buildingFilter, setBuildingFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // ─── Occupancy Metrics ───────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const safeRooms = Array.isArray(rooms) ? rooms : [];
    const safeBeds = Array.isArray(beds) ? beds : [];
    const totalRooms = safeRooms.length;
    const totalCapacity = safeRooms.reduce((acc, r) => acc + (Number(r?.max_capacity) || 0), 0);
    const occupiedCount = safeBeds.filter((b) => b?.status === 'OCCUPIED').length;
    const vacantCount = Math.max(0, totalCapacity - occupiedCount);
    const occupancyRate = totalCapacity > 0 ? Math.round((occupiedCount / totalCapacity) * 100) : 0;

    return [
      {
        id: 'total_rooms',
        label: 'Total Rooms',
        value: totalRooms,
        icon: HomeIcon,
        variant: 'primary' as const,
      },
      {
        id: 'total_capacity',
        label: 'Total Bed Capacity',
        value: totalCapacity,
        icon: UsersIcon,
        variant: 'neutral' as const,
      },
      {
        id: 'occupied_beds',
        label: 'Occupied Beds',
        value: occupiedCount,
        icon: UserIcon,
        variant: 'success' as const,
      },
      {
        id: 'vacant_beds',
        label: 'Vacant Vacancies',
        value: vacantCount,
        icon: BuildingOfficeIcon,
        variant: 'accent' as const,
      },
      {
        id: 'occupancy_rate',
        label: 'Occupancy Rate',
        value: `${occupancyRate}%`,
        icon: ChecklistIcon,
        variant: (occupancyRate > 90 ? 'warning' : 'info') as 'warning' | 'info',
      },
    ];
  }, [rooms, beds]);

  // ─── Filtered Rooms ────────────────────────────────────────────────────────
  const filteredRooms = useMemo(() => {
    const safeRooms = Array.isArray(rooms) ? rooms : [];
    const safeBeds = Array.isArray(beds) ? beds : [];
    return safeRooms.filter((r) => {
      if (!r) return false;
      if (branchFilter !== 'ALL' && r.branch !== branchFilter) return false;
      if (buildingFilter !== 'ALL' && r.building !== buildingFilter) return false;
      if (typeFilter !== 'ALL' && r.room_type !== typeFilter) return false;

      // Occupancy calculation
      const roomBeds = safeBeds.filter((b) => b && (b.room === r.id || b.room_number === r.room_number));
      const occ = roomBeds.filter((b) => b.status === 'OCCUPIED').length;
      const cap = Number(r.max_capacity) || 1;

      if (statusFilter === 'AVAILABLE' && occ >= cap) return false;
      if (statusFilter === 'FULL' && occ < cap) return false;

      if (roomSearch.trim()) {
        const q = roomSearch.toLowerCase();
        const numMatch = (r.room_number || '').toLowerCase().includes(q);
        const nameMatch = (r.room_name || '').toLowerCase().includes(q);
        const bldMatch = (r.building_name || '').toLowerCase().includes(q);
        const supMatch = (r.supervisor_name || '').toLowerCase().includes(q);
        return numMatch || nameMatch || bldMatch || supMatch;
      }
      return true;
    });
  }, [rooms, beds, branchFilter, buildingFilter, typeFilter, statusFilter, roomSearch]);

  // ─── Columns for Table View ────────────────────────────────────────────────
  const roomColumns = useMemo(
    () => [
      {
        key: 'room_number',
        header: 'Room',
        sortable: true,
        render: (row: DormitoryRoom) => (
          <div
            onClick={() => onOpenRoomDetails(row)}
            className="cursor-pointer group flex items-center gap-2.5"
          >
            <div className="w-8 h-8 rounded-xl theme-bg-sub flex items-center justify-center font-bold text-xs theme-text-primary group-hover:theme-accent">
              {row.room_number}
            </div>
            <div>
              <span className="font-bold text-xs theme-text-primary group-hover:theme-accent block">
                Room {row.room_number}
              </span>
              {row.room_name && (
                <span className="text-[11px] theme-text-secondary block">{row.room_name}</span>
              )}
            </div>
          </div>
        ),
      },
      {
        key: 'building',
        header: 'Building & Floor',
        sortable: true,
        render: (row: DormitoryRoom) => (
          <div className="text-xs">
            <span className="font-semibold theme-text-primary block">{row.building_name || 'Main Hall'}</span>
            <span className="text-[11px] theme-text-secondary">
              Floor {row.floor_number} • {getBranchDisplayName(row.branch_name || row.branch) || 'Main Campus'}
            </span>
          </div>
        ),
      },
      {
        key: 'category',
        header: 'Category',
        render: (row: DormitoryRoom) => (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider theme-bg-sub theme-text-secondary border theme-border">
            {row.room_type ? row.room_type.replace(/_/g, ' ') : 'STUDENT DORM'}
          </span>
        ),
      },
      {
        key: 'capacity',
        header: 'Occupancy Status',
        render: (row: DormitoryRoom) => {
          const roomBeds = beds.filter((b) => b && (b.room === row.id || b.room_number === row.room_number));
          const occ = roomBeds.filter((b) => b.status === 'OCCUPIED').length;
          const cap = Number(row.max_capacity) || 1;
          const pct = Math.round((occ / cap) * 100);

          return (
            <div className="w-36 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-semibold">
                <span className="theme-text-secondary">{occ}/{cap} Beds</span>
                <span className="theme-text-primary">{pct}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full theme-bg-sub border theme-border overflow-hidden">
                <div
                  className="h-full theme-bg-accent rounded-full"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        },
      },
      {
        key: 'supervisor',
        header: 'Supervisor',
        render: (row: DormitoryRoom) => (
          <div className="text-xs">
            <span className="font-medium theme-text-primary block">{row.supervisor_name || 'Unassigned'}</span>
            {row.prefect_name && (
              <span className="text-[10px] theme-text-secondary">Prefect: {row.prefect_name}</span>
            )}
          </div>
        ),
      },
      {
        key: 'actions',
        header: '',
        render: (row: DormitoryRoom) => {
          const items = [
            {
              label: 'View Bed Matrix',
              icon: ChecklistIcon,
              onClick: () => onOpenRoomDetails(row),
            },
            {
              label: 'Edit Room',
              icon: EditIcon,
              onClick: () => onOpenRoomDrawer(row),
            },
            {
              label: 'Remove Room',
              icon: TrashIcon,
              isDanger: true,
              onClick: () => onDeleteRoom(row),
            },
          ];
          return <ActionMenu items={items} />;
        },
      },
    ],
    [beds, onOpenRoomDetails, onOpenRoomDrawer, onDeleteRoom]
  );

  // ─── Render Card for Grid View ─────────────────────────────────────────────
  const renderRoomCard = (row: DormitoryRoom) => {
    const roomBeds = beds.filter((b) => b && (b.room === row.id || b.room_number === row.room_number));
    const occ = roomBeds.filter((b) => b.status === 'OCCUPIED').length;
    const cap = Number(row.max_capacity) || 1;
    const pct = Math.round((occ / cap) * 100);

    const actionItems = [
      {
        label: 'View Bed Matrix',
        icon: ChecklistIcon,
        onClick: () => onOpenRoomDetails(row),
      },
      {
        label: 'Edit Room',
        icon: EditIcon,
        onClick: () => onOpenRoomDrawer(row),
      },
      {
        label: 'Remove Room',
        icon: TrashIcon,
        isDanger: true,
        onClick: () => onDeleteRoom(row),
      },
    ];

    return (
      <div
        key={row.id}
        onClick={() => onOpenRoomDetails(row)}
        className="p-4 rounded-2xl border theme-border theme-bg-surface hover:theme-bg-sub/30 transition-all shadow-xs flex flex-col justify-between space-y-3 cursor-pointer group select-none"
      >
        <div className="space-y-2">
          {/* Top Bar: Room Number Badge & Actions */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl theme-bg-sub flex items-center justify-center font-bold text-sm theme-text-primary group-hover:theme-accent">
                {row.room_number}
              </div>
              <div>
                <h4 className="text-sm font-bold theme-text-primary group-hover:theme-accent leading-tight">
                  Room {row.room_number}
                </h4>
                <p className="text-xs theme-text-secondary">{row.room_name || row.building_name || 'Main Hall'}</p>
              </div>
            </div>

            <div onClick={(e) => e.stopPropagation()}>
              <ActionMenu items={actionItems} />
            </div>
          </div>

          {/* Building & Category Meta */}
          <div className="flex items-center justify-between text-xs pt-1 border-t theme-border">
            <span className="theme-text-secondary">
              {row.building_name || 'Main Hall'} • Fl {row.floor_number}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider theme-bg-sub theme-text-secondary border theme-border">
              {row.room_type ? row.room_type.replace(/_/g, ' ') : 'STUDENT DORM'}
            </span>
          </div>

          {/* Mini Bed Matrix Preview */}
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-1 pt-1">
            {roomBeds.slice(0, 8).map((bed) => (
              <div
                key={bed.id}
                className={`py-1 rounded text-center text-[9px] font-mono font-bold ${
                  bed.status === 'OCCUPIED'
                    ? 'theme-bg-accent theme-accent-text'
                    : 'theme-bg-sub theme-text-secondary'
                }`}
                title={`${bed.bed_number}: ${bed.status === 'OCCUPIED' ? bed.student_name || 'Occupied' : 'Vacant'}`}
              >
                {bed.bed_number.replace('Bed-', '')}
              </div>
            ))}
          </div>

          {/* Occupancy Progress */}
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-[11px] font-semibold">
              <span className="theme-text-secondary">{occ} / {cap} Occupied</span>
              <span className="theme-text-primary">{pct}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full theme-bg-sub border theme-border overflow-hidden">
              <div
                className="h-full theme-bg-accent rounded-full"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Footer: Supervisor */}
        <div className="pt-2 border-t theme-border flex items-center justify-between text-[11px] theme-text-secondary">
          <span className="truncate">Supervisor: {row.supervisor_name || 'Unassigned'}</span>
          <span className="font-semibold theme-accent shrink-0">Details →</span>
        </div>
      </div>
    );
  };

  return (
    <UniversalManagementView
      title="Rooms & Quarters"
      subtitle="Manage student and faculty rooms"
      icon={HomeIcon}
      hideHeader={true}
      isEmbedded={true}
      storageKey="spr_residential_rooms_view"
      defaultViewMode="grid"
      stackedSwitcher={true}
      metrics={metrics}
      searchLabel="Search Rooms"
      searchQuery={roomSearch}
      onSearchChange={setRoomSearch}
      searchPlaceholder="Room number, title, building, supervisor..."
      filters={
        <>
          <div>
            <BranchSelect
              label="Campus Branch"
              value={branchFilter}
              onChange={(val: string) => setBranchFilter(val)}
              allowAll={true}
              allLabel="All Branches"
              size="md"
            />
          </div>

          <div>
            <ResidentialBuildingSelect
              label="Building"
              value={buildingFilter}
              onChange={(val: string) => setBuildingFilter(val)}
              allowAll={true}
              allLabel="All Buildings"
              branchId={branchFilter}
              size="md"
            />
          </div>

          <div>
            <CustomSelect
              label="Category"
              options={ROOM_TYPE_FILTERS}
              value={typeFilter}
              onChange={(val: string) => setTypeFilter(val)}
              size="md"
            />
          </div>

          <div>
            <CustomSelect
              label="Occupancy"
              options={STATUS_FILTERS}
              value={statusFilter}
              onChange={(val: string) => setStatusFilter(val)}
              size="md"
            />
          </div>
        </>
      }
      hasActiveFilters={
        roomSearch.trim() !== '' ||
        branchFilter !== 'ALL' ||
        buildingFilter !== 'ALL' ||
        typeFilter !== 'ALL' ||
        statusFilter !== 'ALL'
      }
      activeFilterCount={
        [
          roomSearch.trim() !== '',
          branchFilter !== 'ALL',
          buildingFilter !== 'ALL',
          typeFilter !== 'ALL',
          statusFilter !== 'ALL',
        ].filter(Boolean).length
      }
      onResetFilters={() => {
        setRoomSearch('');
        setBranchFilter('ALL');
        setBuildingFilter('ALL');
        setTypeFilter('ALL');
        setStatusFilter('ALL');
      }}
      loading={loading}
      loadingMessage="Loading residential room records..."
      data={filteredRooms}
      totalCount={rooms.length}
      itemLabel="Rooms"
      columns={roomColumns}
      renderCard={renderRoomCard}
      emptyIcon={HomeIcon}
      emptyTitle="No Dormitory Rooms Found"
      emptySubMessage="Start by adding residential rooms and allocating student beds to track campus occupancy."
    />
  );
}
