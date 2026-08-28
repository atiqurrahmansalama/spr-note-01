import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../../../components/ui/PageHeader';
import TabSwitcher from '../../../components/ui/TabSwitcher';
import { PageContainer } from '../../../components/layout';
import UniversalManagementView from '../../../components/common/UniversalManagementView';
import CustomSelect from '../../../components/ui/CustomSelect';
import BranchSelect from '../../../components/selectors/BranchSelect';
import ResidentialBuildingSelect from '../../../components/selectors/ResidentialBuildingSelect';
import DeleteImpactModal from '../../../components/common/DeleteImpactModal';
import {
  HomeIcon,
  BuildingOfficeIcon,
  UserIcon,
  UsersIcon,
  TeacherIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  ChecklistIcon,
} from '../../../components/ui/Icons';
import ActionMenu from '../../../components/ui/ActionMenu';
import { residentialStore } from '../../../utils/stores/residentialStore';
import { useTenant } from '../../../context/TenantContext';
import { useToast } from '../../../context/ToastContext';
import { useRightSidebar, useDrawerRegistration } from '../../../context/RightSidebarContext';
import ResidentialBuildingDrawer from './ResidentialBuildingDrawer';
import DormitoryRoomDrawer from './DormitoryRoomDrawer';
import RoomDetailsDrawer from './RoomDetailsDrawer';
import BedAllocationModal from './BedAllocationModal';

const TABS = [
  { id: 'BUILDINGS', label: 'Residential Buildings', icon: BuildingOfficeIcon },
  { id: 'ROOMS', label: 'Rooms & Quarters', icon: HomeIcon },
  { id: 'BEDS', label: 'Bed Allocations', icon: ChecklistIcon },
  { id: 'SUPERVISORS', label: 'Supervisors & Wardens', icon: TeacherIcon },
];

const ROOM_TYPE_FILTERS = [
  { value: 'ALL', label: 'All Categories' },
  { value: 'STUDENT_DORM', label: 'Student Dormitory' },
  { value: 'FACULTY_QUARTER', label: 'Faculty Quarter' },
  { value: 'GUEST_ROOM', label: 'Guest Room' },
  { value: 'STUDY_HALL', label: 'Study Hall' },
];

const STATUS_FILTERS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'AVAILABLE', label: 'Available Vacancies' },
  { value: 'FULL', label: 'Fully Occupied' },
];

const BED_STATUS_FILTERS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'OCCUPIED', label: 'Occupied' },
  { value: 'VACANT', label: 'Vacant' },
];

const SUPERVISOR_ROLE_FILTERS = [
  { value: 'ALL', label: 'All Roles' },
  { value: 'WARDEN', label: 'Floor Wardens' },
  { value: 'SUPERVISOR', label: 'Room Supervisors' },
  { value: 'PREFECT', label: 'Student Prefects' },
];

export default function ResidentialHubView() {
  const { activeTenantId } = useTenant();
  const { showToast } = useToast();
  const { openDrawer, closeDrawer } = useRightSidebar();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get('tab') || 'BUILDINGS';

  const setActiveTab = (tabId) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', tabId);
        return next;
      },
      { replace: true }
    );
  };

  // ─── Data States ─────────────────────────────────────────────────────────────
  const [rooms, setRooms] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [beds, setBeds] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters for Rooms Tab
  const [roomSearch, setRoomSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [buildingFilter, setBuildingFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Filters for Buildings Tab
  const [buildingSearch, setBuildingSearch] = useState('');

  // Filters for Beds Tab
  const [bedSearch, setBedSearch] = useState('');
  const [bedStatusFilter, setBedStatusFilter] = useState('ALL');

  // Filters for Supervisors Tab
  const [supervisorSearch, setSupervisorSearch] = useState('');
  const [supervisorBranchFilter, setSupervisorBranchFilter] = useState('ALL');
  const [supervisorRoleFilter, setSupervisorRoleFilter] = useState('ALL');

  // Modals
  const [deletingItem, setDeletingItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingBed, setEditingBed] = useState(null);

  const loadData = useCallback(() => {
    setLoading(true);
    try {
      const roomList = residentialStore.getRooms(activeTenantId);
      const bldList = residentialStore.getBuildings(activeTenantId);
      const bedList = residentialStore.getBeds(activeTenantId);

      setRooms(roomList || []);
      setBuildings(bldList || []);
      setBeds(bedList || []);
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

  // ─── Metrics Calculation ───────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const totalRooms = rooms.length;
    const totalCapacity = rooms.reduce((acc, r) => acc + (Number(r.max_capacity) || 0), 0);
    const occupiedCount = beds.filter((b) => b.status === 'OCCUPIED').length;
    const vacantCount = Math.max(0, totalCapacity - occupiedCount);
    const occupancyRate = totalCapacity > 0 ? Math.round((occupiedCount / totalCapacity) * 100) : 0;

    return [
      {
        id: 'total_rooms',
        label: 'Total Rooms',
        value: totalRooms,
        icon: HomeIcon,
        variant: 'primary',
      },
      {
        id: 'total_capacity',
        label: 'Total Bed Capacity',
        value: totalCapacity,
        icon: UsersIcon,
        variant: 'neutral',
      },
      {
        id: 'occupied_beds',
        label: 'Occupied Beds',
        value: occupiedCount,
        icon: UserIcon,
        variant: 'success',
      },
      {
        id: 'vacant_beds',
        label: 'Vacant Vacancies',
        value: vacantCount,
        icon: BuildingOfficeIcon,
        variant: 'accent',
      },
      {
        id: 'occupancy_rate',
        label: 'Occupancy Rate',
        value: `${occupancyRate}%`,
        icon: ChecklistIcon,
        variant: occupancyRate > 90 ? 'warning' : 'info',
      },
    ];
  }, [rooms, beds]);

  // ─── Drawer Handlers ───────────────────────────────────────────────────────
  const handleOpenRoomDrawer = (roomObj = null) => {
    openDrawer('dormitory_room', {
      mode: roomObj ? 'edit' : 'add',
      id: roomObj?.id || '',
    });
  };

  const handleOpenBuildingDrawer = (bldObj = null) => {
    openDrawer('residential_building', {
      mode: bldObj ? 'edit' : 'add',
      id: bldObj?.id || '',
    });
  };

  const handleOpenRoomDetails = (roomObj) => {
    openDrawer('room_details', {
      id: roomObj.id,
    });
  };

  useDrawerRegistration('dormitory_room', (params) => {
    const mode = params.get('mode') || 'add';
    const roomId = params.get('id');
    const found = roomId ? rooms.find((r) => String(r.id) === String(roomId)) : null;

    return {
      title: mode === 'add' ? 'Create Dormitory Room' : `Edit: Room ${found?.room_number || ''}`,
      category: 'Residential Management',
      size: 'lg',
      content: (
        <DormitoryRoomDrawer
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

  useDrawerRegistration('residential_building', (params) => {
    const mode = params.get('mode') || 'add';
    const bldId = params.get('id');
    const found = bldId ? buildings.find((b) => String(b.id) === String(bldId)) : null;

    return {
      title: mode === 'add' ? 'Create Residential Building' : `Edit: ${found?.name || 'Building'}`,
      category: 'Residential Management',
      size: 'md',
      content: (
        <ResidentialBuildingDrawer
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

  useDrawerRegistration('room_details', (params) => {
    const roomId = params.get('id');
    const found = roomId ? rooms.find((r) => String(r.id) === String(roomId)) : null;

    return {
      title: `Room ${found?.room_number || ''} Details & Bed Matrix`,
      category: 'Residential Management',
      size: 'lg',
      content: (
        <RoomDetailsDrawer
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

  // ─── Filtered Data ─────────────────────────────────────────────────────────
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (branchFilter !== 'ALL' && r.branch !== branchFilter) return false;
      if (buildingFilter !== 'ALL' && r.building !== buildingFilter) return false;
      if (typeFilter !== 'ALL' && r.room_type !== typeFilter) return false;

      // Occupancy calculation
      const roomBeds = beds.filter((b) => b.room === r.id || b.room_number === r.room_number);
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

  const filteredBuildings = useMemo(() => {
    return buildings.filter((b) => {
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
  }, [buildings, buildingSearch]);

  const filteredBeds = useMemo(() => {
    return beds.filter((b) => {
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

  const supervisorsList = useMemo(() => {
    const list = [];

    // 1. Floor Wardens from Buildings
    buildings.forEach((b) => {
      if (b.warden_name || b.warden) {
        const roomCount = rooms.filter((r) => r.building === b.id).length;
        list.push({
          id: `warden_${b.id}`,
          name: b.warden_name || 'Floor Warden',
          role: 'Floor Warden',
          role_type: 'WARDEN',
          jurisdiction: b.name,
          sub_title: `${b.total_floors || 1} Floors • ${roomCount} Rooms`,
          branch: b.branch,
          branch_name: b.branch_name || 'Main Campus',
          scope: `${roomCount} Rooms Managed`,
          raw_type: 'BUILDING',
          raw: b,
        });
      }
    });

    // 2. Room Supervisors & Prefects
    rooms.forEach((r) => {
      if (r.supervisor_name || r.supervisor) {
        list.push({
          id: `sup_${r.id}`,
          name: r.supervisor_name,
          role: 'Room Supervisor',
          role_type: 'SUPERVISOR',
          jurisdiction: `Room ${r.room_number} (${r.room_name || 'Dormitory'})`,
          sub_title: `${r.building_name || 'Main Hall'} • Floor ${r.floor_number}`,
          branch: r.branch,
          branch_name: r.branch_name || 'Main Campus',
          scope: `${r.max_capacity} Bed Capacity`,
          raw_type: 'ROOM',
          raw: r,
        });
      }

      if (r.prefect_name || r.prefect) {
        list.push({
          id: `prefect_${r.id}`,
          name: r.prefect_name,
          role: 'Student Prefect',
          role_type: 'PREFECT',
          jurisdiction: `Room ${r.room_number} (${r.room_name || 'Dormitory'})`,
          sub_title: `${r.building_name || 'Main Hall'} • Floor ${r.floor_number}`,
          branch: r.branch,
          branch_name: r.branch_name || 'Main Campus',
          scope: `Room Student Monitor`,
          raw_type: 'ROOM',
          raw: r,
        });
      }
    });

    return list;
  }, [buildings, rooms]);

  const filteredSupervisors = useMemo(() => {
    return supervisorsList.filter((s) => {
      if (supervisorBranchFilter !== 'ALL' && s.branch !== supervisorBranchFilter) return false;
      if (supervisorRoleFilter !== 'ALL' && s.role_type !== supervisorRoleFilter) return false;
      if (supervisorSearch.trim()) {
        const q = supervisorSearch.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.jurisdiction.toLowerCase().includes(q) ||
          s.sub_title.toLowerCase().includes(q) ||
          s.role.toLowerCase().includes(q) ||
          s.branch_name.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [supervisorsList, supervisorBranchFilter, supervisorRoleFilter, supervisorSearch]);

  // ─── Renderers for ROOMS Tab ───────────────────────────────────────────────
  const roomColumns = [
    {
      key: 'room_number',
      header: 'Room',
      sortable: true,
      render: (row) => (
        <div
          onClick={() => handleOpenRoomDetails(row)}
          className="cursor-pointer group flex items-center gap-2"
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
      render: (row) => (
        <div className="text-xs">
          <span className="font-semibold theme-text-primary block">{row.building_name || 'Main Hall'}</span>
          <span className="text-[11px] theme-text-secondary">
            Floor {row.floor_number} • {row.branch_name || 'Main Campus'}
          </span>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (row) => (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider theme-bg-sub theme-text-secondary border theme-border">
          {row.room_type ? row.room_type.replace('_', ' ') : 'STUDENT DORM'}
        </span>
      ),
    },
    {
      key: 'capacity',
      header: 'Occupancy Status',
      render: (row) => {
        const roomBeds = beds.filter((b) => b.room === row.id || b.room_number === row.room_number);
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
      render: (row) => (
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
      render: (row) => {
        const items = [
          {
            label: 'View Bed Matrix',
            icon: ChecklistIcon,
            onClick: () => handleOpenRoomDetails(row),
          },
          {
            label: 'Edit Room',
            icon: EditIcon,
            onClick: () => handleOpenRoomDrawer(row),
          },
          {
            label: 'Remove Room',
            icon: TrashIcon,
            isDanger: true,
            onClick: () =>
              setDeletingItem({
                id: row.id,
                name: `Room ${row.room_number}`,
                type: 'ROOM',
              }),
          },
        ];
        return <ActionMenu items={items} />;
      },
    },
  ];

  const renderRoomCard = (row) => {
    const roomBeds = beds.filter((b) => b.room === row.id || b.room_number === row.room_number);
    const occ = roomBeds.filter((b) => b.status === 'OCCUPIED').length;
    const cap = Number(row.max_capacity) || 1;
    const pct = Math.round((occ / cap) * 100);

    const actionItems = [
      {
        label: 'View Bed Matrix',
        icon: ChecklistIcon,
        onClick: () => handleOpenRoomDetails(row),
      },
      {
        label: 'Edit Room',
        icon: EditIcon,
        onClick: () => handleOpenRoomDrawer(row),
      },
      {
        label: 'Remove Room',
        icon: TrashIcon,
        isDanger: true,
        onClick: () =>
          setDeletingItem({
            id: row.id,
            name: `Room ${row.room_number}`,
            type: 'ROOM',
          }),
      },
    ];

    return (
      <div
        key={row.id}
        onClick={() => handleOpenRoomDetails(row)}
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
              {row.room_type ? row.room_type.replace('_', ' ') : 'STUDENT DORM'}
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

  // ─── Renderers for BUILDINGS Tab ───────────────────────────────────────────
  const buildingColumns = [
    {
      key: 'name',
      header: 'Building Name',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
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
      render: (row) => (
        <span className="text-xs font-semibold theme-text-primary">{row.branch_name || 'Main Campus'}</span>
      ),
    },
    {
      key: 'floors',
      header: 'Total Floors',
      render: (row) => (
        <span className="text-xs font-semibold theme-text-secondary">{row.total_floors} Floors</span>
      ),
    },
    {
      key: 'warden',
      header: 'Floor Warden',
      render: (row) => (
        <span className="text-xs font-medium theme-text-primary">{row.warden_name || 'Unassigned'}</span>
      ),
    },
    {
      key: 'rooms_count',
      header: 'Room Count',
      render: (row) => {
        const count = rooms.filter((r) => r.building === row.id).length;
        return <span className="text-xs font-bold theme-text-primary">{count} Rooms</span>;
      },
    },
    {
      key: 'actions',
      header: '',
      render: (row) => {
        const items = [
          {
            label: 'Edit Building',
            icon: EditIcon,
            onClick: () => handleOpenBuildingDrawer(row),
          },
          {
            label: 'Remove Building',
            icon: TrashIcon,
            isDanger: true,
            onClick: () =>
              setDeletingItem({
                id: row.id,
                name: row.name,
                type: 'BUILDING',
              }),
          },
        ];
        return <ActionMenu items={items} />;
      },
    },
  ];

  const renderBuildingCard = (row) => {
    const roomCount = rooms.filter((r) => r.building === row.id).length;
    const bldBeds = beds.filter((b) => b.building_name === row.name);
    const occ = bldBeds.filter((b) => b.status === 'OCCUPIED').length;

    const actionItems = [
      {
        label: 'Edit Building',
        icon: EditIcon,
        onClick: () => handleOpenBuildingDrawer(row),
      },
      {
        label: 'Remove Building',
        icon: TrashIcon,
        isDanger: true,
        onClick: () =>
          setDeletingItem({
            id: row.id,
            name: row.name,
            type: 'BUILDING',
          }),
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
                <p className="text-xs theme-text-secondary">{row.branch_name || 'Main Campus'}</p>
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

  // ─── Renderers for BEDS Tab ───────────────────────────────────────────────
  const bedColumns = [
    {
      key: 'bed_number',
      header: 'Seat / Bed',
      sortable: true,
      render: (row) => (
        <span className="font-bold text-xs theme-text-primary">{row.bed_number}</span>
      ),
    },
    {
      key: 'room',
      header: 'Room & Building',
      render: (row) => (
        <div className="text-xs">
          <span className="font-semibold theme-text-primary block">Room {row.room_number}</span>
          <span className="text-[11px] theme-text-secondary">{row.building_name || 'Main Hall'}</span>
        </div>
      ),
    },
    {
      key: 'occupant',
      header: 'Assigned Occupant',
      render: (row) => (
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
            <span className="text-xs text-neutral-400 italic">Vacant Seat</span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
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
      render: (row) => (
        <button
          type="button"
          onClick={() => setEditingBed(row)}
          className="px-2.5 py-1 text-xs font-bold rounded-lg border theme-border theme-bg-sub hover:theme-bg-elevated theme-text-primary transition cursor-pointer"
        >
          {row.status === 'OCCUPIED' ? 'Manage' : 'Assign'}
        </button>
      ),
    },
  ];

  // ─── Renderers for SUPERVISORS Tab ────────────────────────────────────────
  const supervisorColumns = [
    {
      key: 'name',
      header: 'Personnel Name',
      sortable: true,
      render: (row) => (
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
            <span className="text-[11px] theme-text-secondary">{row.branch_name}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role / Designation',
      sortable: true,
      render: (row) => (
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
      render: (row) => (
        <div className="text-xs">
          <span className="font-semibold theme-text-primary block">{row.jurisdiction}</span>
          <span className="text-[11px] theme-text-secondary">{row.sub_title}</span>
        </div>
      ),
    },
    {
      key: 'scope',
      header: 'Scope / Oversight',
      render: (row) => (
        <span className="text-xs font-semibold theme-text-secondary">{row.scope}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <button
          type="button"
          onClick={() => {
            if (row.raw_type === 'ROOM') {
              handleOpenRoomDetails(row.raw);
            } else if (row.raw_type === 'BUILDING') {
              handleOpenBuildingDrawer(row.raw);
            }
          }}
          className="px-2.5 py-1 text-xs font-bold rounded-lg border theme-border theme-bg-sub hover:theme-bg-elevated theme-text-primary transition cursor-pointer"
        >
          View Details
        </button>
      ),
    },
  ];

  const renderSupervisorCard = (row) => {
    return (
      <div
        key={row.id}
        onClick={() => {
          if (row.raw_type === 'ROOM') {
            handleOpenRoomDetails(row.raw);
          } else if (row.raw_type === 'BUILDING') {
            handleOpenBuildingDrawer(row.raw);
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
                <p className="text-xs theme-text-secondary">{row.branch_name}</p>
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
    <PageContainer>
      {/* ─── 1. Header Overview ────────────────────────────────────────────── */}
      <div className="print:hidden">
        <PageHeader
          icon={HomeIcon}
          title="Residential Quarters & Dormitory"
          subtitle="Master console for managing campus buildings, dormitory rooms, bed capacity, student room allocations, and faculty quarters."
        />
      </div>

      {/* ─── 2. Top Tab Switcher with Add Action ───────────────────────────── */}
      <div className="print:hidden">
        <TabSwitcher
          tabs={TABS}
          activeTab={activeTab}
          onChange={setActiveTab}
          rightContent={
            activeTab === 'ROOMS' ? (
              <button
                type="button"
                onClick={() => handleOpenRoomDrawer()}
                className="px-3 sm:px-4 py-2 rounded-xl text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Add Room</span>
              </button>
            ) : activeTab === 'BUILDINGS' ? (
              <button
                type="button"
                onClick={() => handleOpenBuildingDrawer()}
                className="px-3 sm:px-4 py-2 rounded-xl text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Add Building</span>
              </button>
            ) : null
          }
        />
      </div>

      {/* ─── 3. Dynamic Tab Content ───────────────────────────────────────── */}
      {activeTab === 'ROOMS' && (
        <UniversalManagementView
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
                <ResidentialBuildingSelect
                  label="Building"
                  value={buildingFilter}
                  onChange={setBuildingFilter}
                  allowAll={true}
                  allLabel="All Buildings"
                  size="md"
                />
              </div>

              <div>
                <CustomSelect
                  label="Category"
                  options={ROOM_TYPE_FILTERS}
                  value={typeFilter}
                  onChange={setTypeFilter}
                  size="md"
                />
              </div>

              <div>
                <CustomSelect
                  label="Occupancy"
                  options={STATUS_FILTERS}
                  value={statusFilter}
                  onChange={setStatusFilter}
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
      )}

      {activeTab === 'BUILDINGS' && (
        <UniversalManagementView
          hideHeader={true}
          isEmbedded={true}
          storageKey="spr_residential_buildings_view"
          defaultViewMode="grid"
          searchLabel="Search Buildings"
          searchQuery={buildingSearch}
          onSearchChange={setBuildingSearch}
          searchPlaceholder="Building name, code, warden..."
          hasActiveFilters={buildingSearch.trim() !== ''}
          activeFilterCount={buildingSearch.trim() !== '' ? 1 : 0}
          onResetFilters={() => setBuildingSearch('')}
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
      )}

      {activeTab === 'BEDS' && (
        <UniversalManagementView
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
                onChange={setBedStatusFilter}
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
      )}

      {activeTab === 'SUPERVISORS' && (
        <UniversalManagementView
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
              <div className="w-44 shrink-0">
                <CustomSelect
                  label="Role"
                  options={SUPERVISOR_ROLE_FILTERS}
                  value={supervisorRoleFilter}
                  onChange={setSupervisorRoleFilter}
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
      )}

      {/* ─── Delete Impact Modal ──────────────────────────────────────────── */}
      <DeleteImpactModal
        isOpen={Boolean(deletingItem)}
        onClose={() => !isDeleting && setDeletingItem(null)}
        onConfirm={handleConfirmDelete}
        title={`Remove ${deletingItem?.type === 'ROOM' ? 'Room' : 'Building'}`}
        subtitle={`You are about to remove "${deletingItem?.name}".`}
        entityName={deletingItem?.name || ''}
        entityType={deletingItem?.type === 'ROOM' ? 'Dormitory Room' : 'Residential Building'}
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
