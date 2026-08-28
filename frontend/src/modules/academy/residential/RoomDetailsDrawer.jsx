import React, { useState, useEffect } from 'react';
import { HomeIcon, UserIcon, EditIcon, PlusIcon, CloseIcon } from '../../../components/ui/Icons';
import { residentialStore } from '../../../utils/stores/residentialStore';
import { useTenant } from '../../../context/TenantContext';
import BedAllocationModal from './BedAllocationModal';

export default function RoomDetailsDrawer({
  room,
  onEditRoom,
  onClose,
}) {
  const { activeTenantId } = useTenant();
  const [beds, setBeds] = useState([]);
  const [selectedBedToAssign, setSelectedBedToAssign] = useState(null);

  const loadBeds = () => {
    if (!room) return;
    const allBeds = residentialStore.getBeds(activeTenantId);
    const roomBeds = allBeds.filter((b) => b.room === room.id || b.room_number === room.room_number);
    setBeds(roomBeds);
  };

  useEffect(() => {
    loadBeds();
    window.addEventListener('spr_residential_updated', loadBeds);
    return () => window.removeEventListener('spr_residential_updated', loadBeds);
  }, [room, activeTenantId]);

  if (!room) return null;

  const totalCapacity = Number(room.max_capacity) || beds.length || 1;
  const occupiedCount = beds.filter((b) => b.status === 'OCCUPIED').length;
  const vacantCount = Math.max(0, totalCapacity - occupiedCount);
  const occupancyPct = Math.round((occupiedCount / totalCapacity) * 100);

  return (
    <div className="p-4 sm:p-6 space-y-6 text-left">
      {/* 1. Header Overview Card */}
      <div className="p-4 rounded-2xl border theme-border theme-bg-sub/60 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold theme-text-primary">
                Room {room.room_number}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20">
                {room.room_type ? room.room_type.replace('_', ' ') : 'DORMITORY'}
              </span>
            </div>
            {room.room_name && (
              <p className="text-xs font-semibold theme-text-secondary">{room.room_name}</p>
            )}
            <p className="text-[11px] theme-text-secondary">
              {room.building_name || 'Main Hall'} • Floor {room.floor_number} • {room.branch_name || 'Main Campus'}
            </p>
          </div>

          {onEditRoom && (
            <button
              type="button"
              onClick={() => onEditRoom(room)}
              className="p-1.5 rounded-xl border theme-border theme-bg-surface hover:theme-bg-sub transition cursor-pointer shadow-2xs"
              title="Edit Room Details"
            >
              <EditIcon className="w-4 h-4 theme-text-secondary" />
            </button>
          )}
        </div>

        {/* Occupancy Progress */}
        <div className="space-y-1.5 pt-2 border-t theme-border">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="theme-text-secondary">Occupancy Status</span>
            <span className="theme-text-primary">
              {occupiedCount} / {totalCapacity} Beds ({occupancyPct}%)
            </span>
          </div>
          <div className="w-full h-2 rounded-full theme-bg-sub border theme-border overflow-hidden">
            <div
              className="h-full theme-bg-accent rounded-full transition-all duration-300"
              style={{ width: `${occupancyPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] theme-text-secondary">
            <span>{vacantCount} Vacant</span>
            <span>{occupiedCount} Occupied</span>
          </div>
        </div>
      </div>

      {/* 2. Key Personnel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3 rounded-xl border theme-border theme-bg-surface space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary block">
            Room Supervisor
          </span>
          <span className="text-xs font-bold theme-text-primary block">
            {room.supervisor_name || 'Not Assigned'}
          </span>
        </div>
        <div className="p-3 rounded-xl border theme-border theme-bg-surface space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary block">
            Student Prefect
          </span>
          <span className="text-xs font-bold theme-text-primary block">
            {room.prefect_name || 'Not Assigned'}
          </span>
        </div>
      </div>

      {/* 3. Bed Allocation Matrix */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
            Bed & Seat Allocations ({beds.length})
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {beds.map((bed) => {
            const isOccupied = bed.status === 'OCCUPIED';
            return (
              <div
                key={bed.id}
                onClick={() => setSelectedBedToAssign(bed)}
                className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2 select-none ${
                  isOccupied
                    ? 'theme-border theme-bg-surface hover:theme-bg-sub/60 shadow-2xs'
                    : 'theme-border border-dashed theme-bg-sub/40 hover:theme-bg-sub'
                }`}
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold theme-text-primary">{bed.bed_number}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                        isOccupied
                          ? 'theme-bg-accent-soft theme-accent'
                          : 'theme-bg-sub theme-text-secondary'
                      }`}
                    >
                      {bed.status}
                    </span>
                  </div>

                  <p className="text-[11px] font-medium theme-text-secondary truncate">
                    {isOccupied
                      ? bed.student_name
                        ? `${bed.student_name} (${bed.student_class_name || 'Student'})`
                        : bed.staff_name || 'Staff'
                      : 'Click to assign occupant'}
                  </p>
                </div>

                <button
                  type="button"
                  className="px-2 py-1 rounded-lg text-[10px] font-semibold border theme-border theme-bg-sub hover:theme-bg-elevated theme-text-primary transition shrink-0 cursor-pointer"
                >
                  {isOccupied ? 'Manage' : 'Assign'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Amenities */}
      {room.amenities && room.amenities.length > 0 && (
        <div className="space-y-2 pt-2 border-t theme-border">
          <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary block">
            Room Amenities
          </span>
          <div className="flex flex-wrap gap-1.5">
            {room.amenities.map((a) => (
              <span
                key={a}
                className="px-2.5 py-0.5 rounded-lg text-[11px] font-medium border theme-border theme-bg-sub theme-text-primary"
              >
                ✓ {a}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Bed Assignment Modal */}
      {selectedBedToAssign && (
        <BedAllocationModal
          isOpen={Boolean(selectedBedToAssign)}
          onClose={() => setSelectedBedToAssign(null)}
          bed={selectedBedToAssign}
          onSaveSuccess={loadBeds}
        />
      )}
    </div>
  );
}
