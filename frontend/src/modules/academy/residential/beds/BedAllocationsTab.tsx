import React, { useState, useMemo } from 'react';
import UniversalManagementView from '@/components/common/UniversalManagementView';
import CustomSelect from '@/components/ui/CustomSelect';
import CustomButton from '@/components/ui/CustomButton';
import { ChecklistIcon } from '@/components/ui/Icons';
import type { BedAllocation } from '@/types/residential';

export const BED_STATUS_FILTERS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'OCCUPIED', label: 'Occupied' },
  { value: 'VACANT', label: 'Vacant' },
];

export interface BedAllocationsTabProps {
  beds: BedAllocation[];
  loading?: boolean;
  onEditBed: (bed: BedAllocation) => void;
}

export default function BedAllocationsTab({
  beds,
  loading = false,
  onEditBed,
}: BedAllocationsTabProps) {
  const [bedSearch, setBedSearch] = useState<string>('');
  const [bedStatusFilter, setBedStatusFilter] = useState<string>('ALL');

  // ─── Filtered Beds ─────────────────────────────────────────────────────────
  const filteredBeds = useMemo(() => {
    const safeBeds = Array.isArray(beds) ? beds : [];
    return safeBeds.filter((b) => {
      if (!b) return false;
      if (bedStatusFilter !== 'ALL' && b.status !== bedStatusFilter) return false;
      if (bedSearch.trim()) {
        const q = bedSearch.toLowerCase();
        return (
          (b.bed_number || '').toLowerCase().includes(q) ||
          (b.room_number || '').toLowerCase().includes(q) ||
          (b.student_name || '').toLowerCase().includes(q) ||
          (b.student_uniq_id || '').toLowerCase().includes(q) ||
          (b.staff_name || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [beds, bedStatusFilter, bedSearch]);

  // ─── Columns for Table View ────────────────────────────────────────────────
  const bedColumns = useMemo(
    () => [
      {
        key: 'bed_number',
        header: 'Seat / Bed',
        sortable: true,
        render: (row: BedAllocation) => (
          <span className="font-bold text-xs theme-text-primary">{row.bed_number}</span>
        ),
      },
      {
        key: 'room',
        header: 'Room & Building',
        render: (row: BedAllocation) => (
          <div className="text-xs">
            <span className="font-semibold theme-text-primary block">Room {row.room_number}</span>
            <span className="text-[11px] theme-text-secondary">{row.building_name || 'Main Hall'}</span>
          </div>
        ),
      },
      {
        key: 'occupant',
        header: 'Assigned Occupant',
        render: (row: BedAllocation) => (
          <div className="text-xs">
            {row.status === 'OCCUPIED' ? (
              <>
                <span className="font-bold theme-text-primary block">
                  {row.student_name || row.staff_name || 'Occupant'}
                </span>
                <span className="text-[11px] theme-text-secondary">
                  {row.student_uniq_id ? `${row.student_uniq_id} • ` : ''}
                  {row.student_class_name || ''}
                </span>
              </>
            ) : (
              <span className="text-xs theme-text-secondary italic">Vacant Seat</span>
            )}
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (row: BedAllocation) => (
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              row.status === 'OCCUPIED'
                ? 'theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20'
                : 'theme-bg-sub theme-text-secondary border theme-border'
            }`}
          >
            {row.status}
          </span>
        ),
      },
      {
        key: 'actions',
        header: '',
        render: (row: BedAllocation) => (
          <CustomButton
            type="button"
            variant="sub"
            size="xs"
            onClick={() => onEditBed(row)}
          >
            {row.status === 'OCCUPIED' ? 'Manage' : 'Assign'}
          </CustomButton>
        ),
      },
    ],
    [onEditBed]
  );

  return (
    <UniversalManagementView
      title="Bed Allocations"
      subtitle="Manage bed slot assignments"
      icon={ChecklistIcon}
      hideHeader={true}
      isEmbedded={true}
      storageKey="spr_residential_beds_view"
      defaultViewMode="table"
      searchLabel="Search Beds"
      searchQuery={bedSearch}
      onSearchChange={setBedSearch}
      searchPlaceholder="Bed number, occupant name, ID..."
      filters={
        <div className="w-44 shrink-0">
          <CustomSelect
            label="Seat Status"
            options={BED_STATUS_FILTERS}
            value={bedStatusFilter}
            onChange={(val: string) => setBedStatusFilter(val)}
            size="md"
          />
        </div>
      }
      hasActiveFilters={bedSearch.trim() !== '' || bedStatusFilter !== 'ALL'}
      activeFilterCount={[bedSearch.trim() !== '', bedStatusFilter !== 'ALL'].filter(Boolean).length}
      onResetFilters={() => {
        setBedSearch('');
        setBedStatusFilter('ALL');
      }}
      loading={loading}
      data={filteredBeds}
      totalCount={beds.length}
      itemLabel="Beds"
      columns={bedColumns}
      emptyIcon={ChecklistIcon}
      emptyTitle="No Bed Allocations Found"
      emptySubMessage="All registered bed slots will appear here."
    />
  );
}
