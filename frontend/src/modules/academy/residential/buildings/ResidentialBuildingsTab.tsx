import React, { useState, useMemo } from 'react';
import UniversalManagementView from '@/components/common/UniversalManagementView';
import BranchSelect from '@/components/selectors/BranchSelect';
import ActionMenu from '@/components/ui/ActionMenu';
import {
  BuildingOfficeIcon,
  EditIcon,
  TrashIcon,
} from '@/components/ui/Icons';
import { getBranchDisplayName } from '@/utils/localStore';
import type { ResidentialBuilding, DormitoryRoom, BedAllocation } from '@/types/residential';

export interface ResidentialBuildingsTabProps {
  buildings: ResidentialBuilding[];
  rooms: DormitoryRoom[];
  beds: BedAllocation[];
  loading?: boolean;
  onOpenBuildingDrawer: (building?: ResidentialBuilding | null) => void;
  onDeleteBuilding: (building: ResidentialBuilding) => void;
}

export default function ResidentialBuildingsTab({
  buildings,
  rooms,
  beds,
  loading = false,
  onOpenBuildingDrawer,
  onDeleteBuilding,
}: ResidentialBuildingsTabProps) {
  const [buildingSearch, setBuildingSearch] = useState<string>('');
  const [buildingBranchFilter, setBuildingBranchFilter] = useState<string>('ALL');

  // ─── Filtered Buildings ───────────────────────────────────────────────────
  const filteredBuildings = useMemo(() => {
    const safeBuildings = Array.isArray(buildings) ? buildings : [];
    return safeBuildings.filter((b) => {
      if (!b) return false;
      if (buildingBranchFilter !== 'ALL' && b.branch !== buildingBranchFilter) return false;
      if (buildingSearch.trim()) {
        const q = buildingSearch.toLowerCase();
        return (
          (b.name || '').toLowerCase().includes(q) ||
          (b.code || '').toLowerCase().includes(q) ||
          (b.warden_name || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [buildings, buildingBranchFilter, buildingSearch]);

  // ─── Columns for Table View ────────────────────────────────────────────────
  const buildingColumns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Building Name',
        sortable: true,
        render: (row: ResidentialBuilding) => (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl theme-bg-sub flex items-center justify-center">
              <BuildingOfficeIcon className="w-4 h-4 theme-accent" />
            </div>
            <div>
              <span className="font-bold text-xs theme-text-primary block">{row.name}</span>
              {row.code && <span className="text-[10px] font-mono theme-text-secondary">{row.code}</span>}
            </div>
          </div>
        ),
      },
      {
        key: 'branch',
        header: 'Campus / Branch',
        render: (row: ResidentialBuilding) => (
          <span className="text-xs font-semibold theme-text-primary">
            {getBranchDisplayName(row.branch_name || row.branch) || 'Main Campus'}
          </span>
        ),
      },
      {
        key: 'floors',
        header: 'Total Floors',
        render: (row: ResidentialBuilding) => (
          <span className="text-xs font-semibold theme-text-secondary">{row.total_floors} Floors</span>
        ),
      },
      {
        key: 'warden',
        header: 'Warden',
        render: (row: ResidentialBuilding) => (
          <span className="text-xs font-medium theme-text-primary">{row.warden_name || 'Unassigned'}</span>
        ),
      },
      {
        key: 'rooms_count',
        header: 'Total Rooms',
        render: (row: ResidentialBuilding) => {
          const count = (Array.isArray(rooms) ? rooms : []).filter((r) => r.building === row.id).length;
          return <span className="text-xs font-bold theme-text-primary">{count} Rooms</span>;
        },
      },
      {
        key: 'actions',
        header: '',
        render: (row: ResidentialBuilding) => {
          const items = [
            {
              label: 'Edit Building',
              icon: EditIcon,
              onClick: () => onOpenBuildingDrawer(row),
            },
            {
              label: 'Remove Building',
              icon: TrashIcon,
              isDanger: true,
              onClick: () => onDeleteBuilding(row),
            },
          ];
          return <ActionMenu items={items} />;
        },
      },
    ],
    [rooms, onOpenBuildingDrawer, onDeleteBuilding]
  );

  // ─── Render Card for Grid View ─────────────────────────────────────────────
  const renderBuildingCard = (row: ResidentialBuilding) => {
    const roomCount = (Array.isArray(rooms) ? rooms : []).filter((r) => r.building === row.id).length;
    const bldBeds = (Array.isArray(beds) ? beds : []).filter((b) => b && b.building_name === row.name);
    const occ = bldBeds.filter((b) => b && b.status === 'OCCUPIED').length;

    const actionItems = [
      {
        label: 'Edit Building',
        icon: EditIcon,
        onClick: () => onOpenBuildingDrawer(row),
      },
      {
        label: 'Remove Building',
        icon: TrashIcon,
        isDanger: true,
        onClick: () => onDeleteBuilding(row),
      },
    ];

    return (
      <div
        key={row.id}
        className="p-4 rounded-2xl border theme-border theme-bg-surface hover:theme-bg-sub/30 transition-all shadow-xs flex flex-col justify-between space-y-3 select-none"
      >
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl theme-bg-sub flex items-center justify-center">
                <BuildingOfficeIcon className="w-5 h-5 theme-accent" />
              </div>
              <div>
                <h4 className="text-sm font-bold theme-text-primary leading-tight">{row.name}</h4>
                <p className="text-xs theme-text-secondary">
                  {getBranchDisplayName(row.branch_name || row.branch) || 'Main Campus'}
                </p>
              </div>
            </div>
            <ActionMenu items={actionItems} />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t theme-border">
            <div className="p-2 rounded-xl theme-bg-sub">
              <span className="text-[10px] theme-text-secondary block">Total Capacity</span>
              <span className="font-bold theme-text-primary">{roomCount} Rooms</span>
            </div>
            <div className="p-2 rounded-xl theme-bg-sub">
              <span className="text-[10px] theme-text-secondary block">Active Occupants</span>
              <span className="font-bold theme-text-primary">{occ} Students</span>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t theme-border flex items-center justify-between text-[11px] theme-text-secondary">
          <span>Warden: {row.warden_name || 'Unassigned'}</span>
          <span className="font-semibold">{row.total_floors} Floors</span>
        </div>
      </div>
    );
  };

  return (
    <UniversalManagementView
      title="Residential Buildings"
      subtitle="Manage campus residential blocks"
      icon={BuildingOfficeIcon}
      hideHeader={true}
      isEmbedded={true}
      storageKey="spr_residential_buildings_view"
      defaultViewMode="grid"
      searchLabel="Search Buildings"
      searchQuery={buildingSearch}
      onSearchChange={setBuildingSearch}
      searchPlaceholder="Building name, code, warden..."
      filters={
        <div className="w-48 shrink-0">
          <BranchSelect
            label="Campus Branch"
            value={buildingBranchFilter}
            onChange={(val: string) => setBuildingBranchFilter(val)}
            allowAll={true}
            allLabel="All Branches"
            size="md"
          />
        </div>
      }
      hasActiveFilters={buildingSearch.trim() !== '' || buildingBranchFilter !== 'ALL'}
      activeFilterCount={[buildingSearch.trim() !== '', buildingBranchFilter !== 'ALL'].filter(Boolean).length}
      onResetFilters={() => {
        setBuildingSearch('');
        setBuildingBranchFilter('ALL');
      }}
      loading={loading}
      data={filteredBuildings}
      totalCount={buildings.length}
      itemLabel="Buildings"
      columns={buildingColumns}
      renderCard={renderBuildingCard}
      emptyIcon={BuildingOfficeIcon}
      emptyTitle="No Residential Buildings Found"
      emptySubMessage="Create your campus residential blocks to organize dormitory halls."
    />
  );
}
