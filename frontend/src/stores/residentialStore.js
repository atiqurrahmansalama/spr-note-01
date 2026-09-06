/**
 * SPR Note — Residential Quarters & Dormitory Store
 * =================================================
 * Manages residential buildings, dormitory rooms, bed/seat allocations,
 * room supervisors, and occupancy metrics across institutional campuses.
 */

import { readJSON, writeJSON } from "./coreStore";

const DEFAULT_BUILDINGS = [
  {
    id: "bld_main_hall",
    name: "Main Residential Hall",
    code: "MRH-01",
    branch: "MAIN_CAMPUS",
    branch_name: "Main Campus",
    total_floors: 3,
    warden: null,
    warden_name: "Ustadh Mahmudul Hasan",
    description: "Central residential complex for senior students and resident faculty.",
    is_active: true,
    is_deleted: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "bld_north_block",
    name: "North Campus Block",
    code: "NCB-02",
    branch: "RESIDENTIAL_CAMPUS",
    branch_name: "Residential Campus",
    total_floors: 2,
    warden: null,
    warden_name: "Ustadh Abdur Rahman",
    description: "North wing dormitory hall with modern study rooms and amenities.",
    is_active: true,
    is_deleted: false,
    created_at: new Date().toISOString(),
  },
];

const DEFAULT_ROOMS = [
  {
    id: "room_101",
    building: "bld_main_hall",
    building_name: "Main Residential Hall",
    building_code: "MRH-01",
    branch: "MAIN_CAMPUS",
    branch_name: "Main Campus",
    floor_number: 1,
    room_number: "101",
    room_name: "Junior Dormitory Hall",
    room_type: "STUDENT_DORM",
    max_capacity: 8,
    supervisor: null,
    supervisor_name: "Ustadh Mahmudul Hasan",
    prefect: null,
    prefect_name: "Ahmadullah Al-Mahdi",
    amenities: ["Ceiling Fans", "Study Tables", "Attached Washroom", "Bookcases", "Lockers"],
    is_active: true,
    is_deleted: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "room_102",
    building: "bld_main_hall",
    building_name: "Main Residential Hall",
    building_code: "MRH-01",
    branch: "MAIN_CAMPUS",
    branch_name: "Main Campus",
    floor_number: 1,
    room_number: "102",
    room_name: "Senior Tahfiz Quarters",
    room_type: "STUDENT_DORM",
    max_capacity: 6,
    supervisor: null,
    supervisor_name: "Ustadh Tariq Jamil",
    prefect: null,
    prefect_name: "Zubair Ahmad",
    amenities: ["Ceiling Fans", "Study Tables", "Attached Washroom", "Lockers"],
    is_active: true,
    is_deleted: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "room_201",
    building: "bld_main_hall",
    building_name: "Main Residential Hall",
    building_code: "MRH-01",
    branch: "MAIN_CAMPUS",
    branch_name: "Main Campus",
    floor_number: 2,
    room_number: "201",
    room_name: "Resident Faculty Suite A",
    room_type: "FACULTY_QUARTER",
    max_capacity: 2,
    supervisor: null,
    supervisor_name: "Ustadh Mahmudul Hasan",
    prefect: null,
    prefect_name: "",
    amenities: ["Air Conditioning", "Private Washroom", "Study Desks", "Wi-Fi", "Balcony"],
    is_active: true,
    is_deleted: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "room_n101",
    building: "bld_north_block",
    building_name: "North Campus Block",
    building_code: "NCB-02",
    branch: "RESIDENTIAL_CAMPUS",
    branch_name: "Residential Campus",
    floor_number: 1,
    room_number: "N-101",
    room_name: "Academic Mutala & Study Hall",
    room_type: "STUDY_HALL",
    max_capacity: 12,
    supervisor: null,
    supervisor_name: "Ustadh Abdur Rahman",
    prefect: null,
    prefect_name: "",
    amenities: ["Reading Desks", "Bookcases", "High Speed Internet", "Ceiling Fans"],
    is_active: true,
    is_deleted: false,
    created_at: new Date().toISOString(),
  },
];

const DEFAULT_BEDS = [
  {
    id: "bed_101_01",
    room: "room_101",
    room_number: "101",
    room_name: "Junior Dormitory Hall",
    building_name: "Main Residential Hall",
    bed_number: "Bed-01",
    student: "stu_001",
    student_name: "Ahmadullah Al-Mahdi",
    student_uniq_id: "STU-2026-001",
    student_class_name: "Class 5 (Tahfiz)",
    staff: null,
    staff_name: "",
    status: "OCCUPIED",
    assigned_date: "2026-01-10",
    remarks: "Room Prefect",
    is_active: true,
  },
  {
    id: "bed_101_02",
    room: "room_101",
    room_number: "101",
    room_name: "Junior Dormitory Hall",
    building_name: "Main Residential Hall",
    bed_number: "Bed-02",
    student: "stu_002",
    student_name: "Abdullah Ibn Masood",
    student_uniq_id: "STU-2026-002",
    student_class_name: "Class 5 (Tahfiz)",
    staff: null,
    staff_name: "",
    status: "OCCUPIED",
    assigned_date: "2026-01-12",
    remarks: "",
    is_active: true,
  },
  {
    id: "bed_101_03",
    room: "room_101",
    room_number: "101",
    room_name: "Junior Dormitory Hall",
    building_name: "Main Residential Hall",
    bed_number: "Bed-03",
    student: null,
    student_name: "",
    student_uniq_id: "",
    student_class_name: "",
    staff: null,
    staff_name: "",
    status: "VACANT",
    assigned_date: null,
    remarks: "",
    is_active: true,
  },
  {
    id: "bed_101_04",
    room: "room_101",
    room_number: "101",
    room_name: "Junior Dormitory Hall",
    building_name: "Main Residential Hall",
    bed_number: "Bed-04",
    student: null,
    student_name: "",
    student_uniq_id: "",
    student_class_name: "",
    staff: null,
    staff_name: "",
    status: "VACANT",
    assigned_date: null,
    remarks: "",
    is_active: true,
  },
  {
    id: "bed_102_01",
    room: "room_102",
    room_number: "102",
    room_name: "Senior Tahfiz Quarters",
    building_name: "Main Residential Hall",
    bed_number: "Bed-01",
    student: "stu_003",
    student_name: "Zubair Ahmad",
    student_uniq_id: "STU-2026-003",
    student_class_name: "Dawra-e-Hadith",
    staff: null,
    staff_name: "",
    status: "OCCUPIED",
    assigned_date: "2026-01-05",
    remarks: "Senior Proctor",
    is_active: true,
  },
  {
    id: "bed_201_01",
    room: "room_201",
    room_number: "201",
    room_name: "Resident Faculty Suite A",
    building_name: "Main Residential Hall",
    bed_number: "Bed-01",
    student: null,
    student_name: "",
    student_uniq_id: "",
    student_class_name: "",
    staff: "staff_01",
    staff_name: "Ustadh Mahmudul Hasan",
    status: "OCCUPIED",
    assigned_date: "2026-01-01",
    remarks: "Hall Warden",
    is_active: true,
  },
];

export const residentialStore = {
  // ─── Buildings ─────────────────────────────────────────────────────────────
  getBuildings: (tenantId) => {
    const key = `spr_residential_buildings_${tenantId || "default"}`;
    return readJSON(key, DEFAULT_BUILDINGS);
  },

  saveBuilding: (tenantId, buildingData) => {
    const key = `spr_residential_buildings_${tenantId || "default"}`;
    const list = residentialStore.getBuildings(tenantId);
    let updated;

    if (buildingData.id) {
      updated = list.map((b) => (b.id === buildingData.id ? { ...b, ...buildingData, updated_at: new Date().toISOString() } : b));
    } else {
      const newBuilding = {
        id: `bld_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        created_at: new Date().toISOString(),
        is_active: true,
        is_deleted: false,
        ...buildingData,
      };
      updated = [newBuilding, ...list];
    }
    writeJSON(key, updated);
    window.dispatchEvent(new CustomEvent("spr_residential_updated"));
    return updated;
  },

  deleteBuilding: (tenantId, buildingId) => {
    const key = `spr_residential_buildings_${tenantId || "default"}`;
    const list = residentialStore.getBuildings(tenantId);
    const updated = list.filter((b) => b.id !== buildingId);
    writeJSON(key, updated);
    window.dispatchEvent(new CustomEvent("spr_residential_updated"));
    return updated;
  },

  // ─── Rooms ─────────────────────────────────────────────────────────────────
  getRooms: (tenantId) => {
    const key = `spr_dormitory_rooms_${tenantId || "default"}`;
    return readJSON(key, DEFAULT_ROOMS);
  },

  saveRoom: (tenantId, roomData) => {
    const key = `spr_dormitory_rooms_${tenantId || "default"}`;
    const list = residentialStore.getRooms(tenantId);
    let updated;
    if (roomData.id) {
      updated = list.map((r) => (r.id === roomData.id ? { ...r, ...roomData, updated_at: new Date().toISOString() } : r));
    } else {
      const targetRoomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      const newRoom = {
        id: targetRoomId,
        created_at: new Date().toISOString(),
        is_active: true,
        is_deleted: false,
        ...roomData,
      };
      updated = [newRoom, ...list];

      // Auto generate empty bed allocations for this room
      const capacity = Number(roomData.max_capacity) || 4;
      const currentBeds = residentialStore.getBeds(tenantId);
      const newBeds = [];
      for (let i = 1; i <= capacity; i++) {
        newBeds.push({
          id: `bed_${targetRoomId}_${i}`,
          room: targetRoomId,
          room_number: roomData.room_number || "",
          room_name: roomData.room_name || "",
          building_name: roomData.building_name || "",
          bed_number: `Bed-${String(i).padStart(2, "0")}`,
          student: null,
          student_name: "",
          student_uniq_id: "",
          student_class_name: "",
          staff: null,
          staff_name: "",
          status: "VACANT",
          assigned_date: null,
          remarks: "",
          is_active: true,
        });
      }
      writeJSON(`spr_bed_allocations_${tenantId || "default"}`, [...currentBeds, ...newBeds]);
    }

    writeJSON(key, updated);
    window.dispatchEvent(new CustomEvent("spr_residential_updated"));
    return updated;
  },

  deleteRoom: (tenantId, roomId) => {
    const key = `spr_dormitory_rooms_${tenantId || "default"}`;
    const list = residentialStore.getRooms(tenantId);
    const updated = list.filter((r) => r.id !== roomId);
    writeJSON(key, updated);
    window.dispatchEvent(new CustomEvent("spr_residential_updated"));
    return updated;
  },

  // ─── Bed Allocations ───────────────────────────────────────────────────────
  getBeds: (tenantId) => {
    const key = `spr_bed_allocations_${tenantId || "default"}`;
    return readJSON(key, DEFAULT_BEDS);
  },

  assignBed: (tenantId, bedId, studentData, staffData, remarks = "") => {
    const key = `spr_bed_allocations_${tenantId || "default"}`;
    const list = residentialStore.getBeds(tenantId);

    const updated = list.map((b) => {
      if (b.id === bedId) {
        return {
          ...b,
          student: studentData?.id || null,
          student_name: studentData?.name_en || studentData?.name || "",
          student_uniq_id: studentData?.uniq_id || "",
          student_class_name: studentData?.student_class_name || studentData?.class_name || "",
          staff: staffData?.id || null,
          staff_name: staffData?.name || staffData?.username || "",
          status: "OCCUPIED",
          assigned_date: new Date().toISOString().split("T")[0],
          remarks: remarks || b.remarks || "",
        };
      }
      return b;
    });

    writeJSON(key, updated);
    window.dispatchEvent(new CustomEvent("spr_residential_updated"));
    return updated;
  },

  unassignBed: (tenantId, bedId, remarks = "") => {
    const key = `spr_bed_allocations_${tenantId || "default"}`;
    const list = residentialStore.getBeds(tenantId);

    const updated = list.map((b) => {
      if (b.id === bedId) {
        return {
          ...b,
          student: null,
          student_name: "",
          student_uniq_id: "",
          student_class_name: "",
          staff: null,
          staff_name: "",
          status: "VACANT",
          remarks: remarks || "",
        };
      }
      return b;
    });

    writeJSON(key, updated);
    window.dispatchEvent(new CustomEvent("spr_residential_updated"));
    return updated;
  },

  // ─── Dynamic Occupancy Metrics ─────────────────────────────────────────────
  getOccupancyMetrics: (tenantId) => {
    const rooms = residentialStore.getRooms(tenantId);
    const beds = residentialStore.getBeds(tenantId);
    const buildings = residentialStore.getBuildings(tenantId);

    const totalRooms = rooms.length;
    const totalCapacity = rooms.reduce((acc, r) => acc + (Number(r.max_capacity) || 0), 0);
    const occupiedBeds = beds.filter((b) => b.status === "OCCUPIED").length;
    const vacantBeds = Math.max(0, totalCapacity - occupiedBeds);
    const occupancyRate = totalCapacity > 0 ? Math.round((occupiedBeds / totalCapacity) * 100) : 0;

    return {
      totalBuildings: buildings.length,
      totalRooms,
      totalCapacity,
      occupiedBeds,
      vacantBeds,
      occupancyRate,
    };
  },
};
