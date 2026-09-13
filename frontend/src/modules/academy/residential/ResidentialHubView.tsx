import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '@/components/ui/PageHeader';
import TabSwitcher from '@/components/ui/TabSwitcher';
import CustomButton from '@/components/ui/CustomButton';
import { PageContainer } from '@/components/layout';
import DeleteImpactModal from '@/components/common/DeleteImpactModal';
import {
  HomeIcon,
  BuildingOfficeIcon,
  ChecklistIcon,
  TeacherIcon,
  PlusIcon,
} from '@/components/ui/Icons';
import { residentialStore } from '@/stores/residentialStore';
import { useTenant } from '@/context/TenantContext';
import { useToast } from '@/context/ToastContext';
import { useRightSidebar, useDrawerRegistration } from '@/context/RightSidebarContext';
import {
  ResidentialBuildingsTab,
  ResidentialBuildingDrawer,
} from './buildings';
import {
  DormitoryRoomsTab,
  DormitoryRoomDrawer,
  RoomDetailsDrawer,
} from './rooms';
import {
  BedAllocationsTab,
  BedAllocationModal,
} from './beds';
import {
  SupervisorsWardensTab,
} from './supervisors';
import type {
  ResidentialBuilding,
  DormitoryRoom,
  BedAllocation,
} from '@/types/residential';

const TABS = [
  { id: 'BUILDINGS', label: 'Residential Buildings', icon: BuildingOfficeIcon },
  { id: 'ROOMS', label: 'Rooms & Quarters', icon: HomeIcon },
  { id: 'BEDS', label: 'Bed Allocations', icon: ChecklistIcon },
  { id: 'SUPERVISORS', label: 'Supervisors & Wardens', icon: TeacherIcon },
];

interface DeletingItem {
  id: string;
  name: string;
  type: 'ROOM' | 'BUILDING';
}

/**
 * ResidentialHubView — Master Console Orchestrator
 * ==================================================
 * Encapsulates tabs, right sidebar drawer registrations, modals,
 * and delegates tab-specific workspaces to clean modular sub-folders.
 */
export default function ResidentialHubView() {
  const { activeTenantId } = useTenant();
  const { showToast } = useToast();
  const { openDrawer, closeDrawer } = useRightSidebar();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get('tab') || 'BUILDINGS';

  const setActiveTab = (tabId: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', tabId);
        return next;
      },
      { replace: true }
    );
  };

  // ─── Shared Store State ───────────────────────────────────────────────────
  const [rooms, setRooms] = useState<DormitoryRoom[]>([]);
  const [buildings, setBuildings] = useState<ResidentialBuilding[]>([]);
  const [beds, setBeds] = useState<BedAllocation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // ─── Modal States ─────────────────────────────────────────────────────────
  const [deletingItem, setDeletingItem] = useState<DeletingItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [editingBed, setEditingBed] = useState<BedAllocation | null>(null);

  const loadData = useCallback(() => {
    setLoading(true);
    try {
      const roomList = residentialStore.getRooms(activeTenantId);
      const bldList = residentialStore.getBuildings(activeTenantId);
      const bedList = residentialStore.getBeds(activeTenantId);

      setRooms(Array.isArray(roomList) ? roomList : []);
      setBuildings(Array.isArray(bldList) ? bldList : []);
      setBeds(Array.isArray(bedList) ? bedList : []);
    } catch {
      showToast('Failed to load residential records', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTenantId, showToast]);

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener('spr_tenant_changed', handleUpdate);
    window.addEventListener('spr_residential_updated', handleUpdate);
    return () => {
      window.removeEventListener('spr_tenant_changed', handleUpdate);
      window.removeEventListener('spr_residential_updated', handleUpdate);
    };
  }, [loadData]);

  // ─── Drawer Handlers ───────────────────────────────────────────────────────
  const handleOpenRoomDrawer = (roomObj: DormitoryRoom | null = null) => {
    openDrawer('dormitory_room', {
      mode: roomObj ? 'edit' : 'add',
      id: roomObj?.id || '',
    });
  };

  const handleOpenBuildingDrawer = (bldObj: ResidentialBuilding | null = null) => {
    openDrawer('residential_building', {
      mode: bldObj ? 'edit' : 'add',
      id: bldObj?.id || '',
    });
  };

  const handleOpenRoomDetails = (roomObj: DormitoryRoom) => {
    openDrawer('room_details', {
      id: roomObj.id,
    });
  };

  // ─── Drawer Registrations ──────────────────────────────────────────────────
  useDrawerRegistration('dormitory_room', (params: URLSearchParams) => {
    const mode = params.get('mode') || 'add';
    const roomId = params.get('id');
    const found = roomId ? rooms.find((r) => String(r.id) === String(roomId)) : null;

    return {
      title: mode === 'add' ? 'Create Dormitory Room' : `Edit: Room ${found?.room_number || ''}`,
      category: 'Residential Management',
      size: 'lg',
      content: (
        <DormitoryRoomDrawer
          key={`dorm_room_${mode}_${roomId || 'new'}`}
          room={found}
          onSaveSuccess={() => {
            closeDrawer();
            loadData();
          }}
          onCancel={closeDrawer}
        />
      ),
    };
  });

  useDrawerRegistration('residential_building', (params: URLSearchParams) => {
    const mode = params.get('mode') || 'add';
    const bldId = params.get('id');
    const found = bldId ? buildings.find((b) => String(b.id) === String(bldId)) : null;

    return {
      title: mode === 'add' ? 'Create Residential Building' : `Edit: ${found?.name || 'Building'}`,
      category: 'Residential Management',
      size: 'md',
      content: (
        <ResidentialBuildingDrawer
          key={`res_building_${mode}_${bldId || 'new'}`}
          building={found}
          onSaveSuccess={() => {
            closeDrawer();
            loadData();
          }}
          onCancel={closeDrawer}
        />
      ),
    };
  });

  useDrawerRegistration('room_details', (params: URLSearchParams) => {
    const roomId = params.get('id');
    const found = roomId ? rooms.find((r) => String(r.id) === String(roomId)) : null;

    return {
      title: `Room ${found?.room_number || ''} Details & Bed Matrix`,
      category: 'Residential Management',
      size: 'lg',
      content: (
        <RoomDetailsDrawer
          key={`room_details_${roomId || 'new'}`}
          room={found}
          onEditRoom={(r) => {
            closeDrawer();
            handleOpenRoomDrawer(r);
          }}
          onClose={closeDrawer}
        />
      ),
    };
  });

  // ─── Delete Handlers ───────────────────────────────────────────────────────
  const handleConfirmDelete = () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    try {
      if (deletingItem.type === 'ROOM') {
        residentialStore.deleteRoom(activeTenantId, deletingItem.id);
        showToast(`Room ${deletingItem.name} removed`, 'success');
      } else if (deletingItem.type === 'BUILDING') {
        residentialStore.deleteBuilding(activeTenantId, deletingItem.id);
        showToast(`Building ${deletingItem.name} removed`, 'success');
      }
      setDeletingItem(null);
      loadData();
    } catch {
      showToast('Failed to delete item', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <PageContainer>
      {/* ─── 1. Header Overview ────────────────────────────────────────────── */}
      <div className="print:hidden">
        <PageHeader
          icon={HomeIcon}
          title="Residential Quarters & Dormitory"
          subtitle="Master console for managing campus buildings, dormitory rooms, bed capacity, student room allocations, and faculty quarters."
        />
      </div>

      {/* ─── 2. Top Tab Switcher with Quick Add Action ─────────────────────── */}
      <div className="print:hidden">
        <TabSwitcher
          tabs={TABS}
          activeTab={activeTab}
          onChange={setActiveTab}
          rightContent={
            activeTab === 'ROOMS' ? (
              <CustomButton
                type="button"
                variant="primary"
                size="sm"
                icon={PlusIcon}
                onClick={() => handleOpenRoomDrawer()}
              >
                <span className="hidden sm:inline">Add Room</span>
              </CustomButton>
            ) : activeTab === 'BUILDINGS' ? (
              <CustomButton
                type="button"
                variant="primary"
                size="sm"
                icon={PlusIcon}
                onClick={() => handleOpenBuildingDrawer()}
              >
                <span className="hidden sm:inline">Add Building</span>
              </CustomButton>
            ) : null
          }
        />
      </div>

      {/* ─── 3. Dynamic Tab Workspaces ─────────────────────────────────────── */}
      {activeTab === 'BUILDINGS' && (
        <ResidentialBuildingsTab
          buildings={buildings}
          rooms={rooms}
          beds={beds}
          loading={loading}
          onOpenBuildingDrawer={handleOpenBuildingDrawer}
          onDeleteBuilding={(b) =>
            setDeletingItem({
              id: b.id,
              name: b.name,
              type: 'BUILDING',
            })
          }
        />
      )}

      {activeTab === 'ROOMS' && (
        <DormitoryRoomsTab
          rooms={rooms}
          beds={beds}
          loading={loading}
          onOpenRoomDrawer={handleOpenRoomDrawer}
          onOpenRoomDetails={handleOpenRoomDetails}
          onDeleteRoom={(r) =>
            setDeletingItem({
              id: r.id,
              name: `Room ${r.room_number}`,
              type: 'ROOM',
            })
          }
        />
      )}

      {activeTab === 'BEDS' && (
        <BedAllocationsTab
          beds={beds}
          loading={loading}
          onEditBed={(b) => setEditingBed(b)}
        />
      )}

      {activeTab === 'SUPERVISORS' && (
        <SupervisorsWardensTab
          buildings={buildings}
          rooms={rooms}
          loading={loading}
          onOpenRoomDetails={handleOpenRoomDetails}
          onOpenBuildingDrawer={handleOpenBuildingDrawer}
        />
      )}

      {/* ─── Delete Impact Modal ──────────────────────────────────────────── */}
      <DeleteImpactModal
        isOpen={Boolean(deletingItem)}
        onClose={() => !isDeleting && setDeletingItem(null)}
        onConfirm={handleConfirmDelete}
        onDirectDelete={handleConfirmDelete}
        title={`Remove ${deletingItem?.type === 'ROOM' ? 'Room' : 'Building'}`}
        subtitle={`You are about to remove "${deletingItem?.name}".`}
        entityName={deletingItem?.name || ''}
        itemName={deletingItem?.name || ''}
        entityType={deletingItem?.type === 'ROOM' ? 'Dormitory Room' : 'Residential Building'}
        itemType={deletingItem?.type === 'ROOM' ? 'Dormitory Room' : 'Residential Building'}
        impactData={null}
        onMigrate={undefined}
        onMigrateOpen={undefined}
        requireAck={false}
        requireNameMatch={false}
        isDeleting={isDeleting}
        confirmButtonText="Confirm Removal"
        warningMessage="Removing this record will unassign all associated bed slots and student room placements."
      />

      {/* ─── Bed Allocation Modal ─────────────────────────────────────────── */}
      {editingBed && (
        <BedAllocationModal
          isOpen={Boolean(editingBed)}
          onClose={() => setEditingBed(null)}
          bed={editingBed}
          onSaveSuccess={loadData}
        />
      )}
    </PageContainer>
  );
}
