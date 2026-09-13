/**
 * SPR Note — Enterprise Residential Quarters & Dormitory Store
 * =============================================================
 * Manages residential buildings, dormitory rooms, bed/seat allocations,
 * room supervisors, and occupancy metrics across institutional campuses.
 */

import { readJSON, writeJSON } from "./coreStore";
import type {
  ResidentialBuilding,
  DormitoryRoom,
  BedAllocation,
  OccupancyMetrics,
} from "../types/residential";

const DEFAULT_BUILDINGS: ResidentialBuilding[] = [
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

const DEFAULT_ROOMS: DormitoryRoom[] = [
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

const DEFAULT_BEDS: BedAllocation[] = [
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
  getBuildings: (tenantId?: string): ResidentialBuilding[] => {
    const key = `spr_residential_buildings_${tenantId || "default"}`;
    const data = readJSON(key, DEFAULT_BUILDINGS);
    return (Array.isArray(data) ? data : DEFAULT_BUILDINGS) as ResidentialBuilding[];
  },

  saveBuilding: (tenantId: string | undefined, buildingData: Partial<ResidentialBuilding>): ResidentialBuilding[] => {
    const key = `spr_residential_buildings_${tenantId || "default"}`;
    const list = residentialStore.getBuildings(tenantId);
    let updated: ResidentialBuilding[];

    if (buildingData.id) {
      updated = list.map((b) =>
        b.id === buildingData.id ? ({ ...b, ...buildingData, updated_at: new Date().toISOString() } as ResidentialBuilding) : b
      );
    } else {
      const newBuilding: ResidentialBuilding = {
        id: `bld_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        name: buildingData.name || "Residential Hall",
        code: buildingData.code || "BLD-01",
        branch: buildingData.branch || "MAIN_CAMPUS",
        branch_name: buildingData.branch_name || "Main Campus",
        total_floors: Number(buildingData.total_floors) || 1,
        warden: buildingData.warden || null,
        warden_name: buildingData.warden_name || "",
        description: buildingData.description || "",
        is_active: buildingData.is_active ?? true,
        is_deleted: false,
        created_at: new Date().toISOString(),
        ...buildingData,
      };
      updated = [newBuilding, ...list];
    }
    writeJSON(key, updated);
    window.dispatchEvent(new CustomEvent("spr_residential_updated"));
    return updated;
  },

  addBuilding: (tenantId: string | undefined, buildingData: Partial<ResidentialBuilding>): ResidentialBuilding[] => {
    return residentialStore.saveBuilding(tenantId, buildingData);
  },

  updateBuilding: (buildingId: string, buildingData: Partial<ResidentialBuilding>, tenantId?: string): ResidentialBuilding[] => {
    return residentialStore.saveBuilding(tenantId, { ...buildingData, id: buildingId });
  },

  deleteBuilding: (tenantId: string | undefined, buildingId: string): ResidentialBuilding[] => {
    const key = `spr_residential_buildings_${tenantId || "default"}`;
    const list = residentialStore.getBuildings(tenantId);
    const updated = list.filter((b) => b.id !== buildingId);
    writeJSON(key, updated);
    window.dispatchEvent(new CustomEvent("spr_residential_updated"));
    return updated;
  },

  // ─── Rooms ─────────────────────────────────────────────────────────────────
  getRooms: (tenantId?: string): DormitoryRoom[] => {
    const key = `spr_dormitory_rooms_${tenantId || "default"}`;
    const data = readJSON(key, DEFAULT_ROOMS);
    return (Array.isArray(data) ? data : DEFAULT_ROOMS) as DormitoryRoom[];
  },

  saveRoom: (tenantId: string | undefined, roomData: Partial<DormitoryRoom>): DormitoryRoom[] => {
    const key = `spr_dormitory_rooms_${tenantId || "default"}`;
    const list = residentialStore.getRooms(tenantId);
    let updated: DormitoryRoom[];
    const bedKey = `spr_bed_allocations_${tenantId || "default"}`;
    const currentBeds = residentialStore.getBeds(tenantId);

    if (roomData.id) {
      const targetRoomId = roomData.id;
      const targetCapacity = Number(roomData.max_capacity) || 4;

      updated = list.map((r) =>
        r.id === targetRoomId ? ({ ...r, ...roomData, updated_at: new Date().toISOString() } as DormitoryRoom) : r
      );

      // Sync existing beds (update room_number, room_name, building_name)
      const existingRoomBeds = currentBeds.filter((b) => b.room === targetRoomId);
      const otherBeds = currentBeds.filter((b) => b.room !== targetRoomId);

      const updatedExistingBeds = existingRoomBeds.map((b) => ({
        ...b,
        room_number: roomData.room_number || b.room_number,
        room_name: roomData.room_name || b.room_name,
        building_name: roomData.building_name || b.building_name,
      }));

      // If capacity expanded, append extra beds
      if (existingRoomBeds.length < targetCapacity) {
        const extraBeds: BedAllocation[] = [];
        for (let i = existingRoomBeds.length + 1; i <= targetCapacity; i++) {
          extraBeds.push({
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
        writeJSON(bedKey, [...otherBeds, ...updatedExistingBeds, ...extraBeds]);
      } else {
        writeJSON(bedKey, [...otherBeds, ...updatedExistingBeds]);
      }
    } else {
      const targetRoomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      const newRoom: DormitoryRoom = {
        id: targetRoomId,
        building: roomData.building || "",
        building_name: roomData.building_name || "",
        building_code: roomData.building_code || "",
        branch: roomData.branch || "MAIN_CAMPUS",
        branch_name: roomData.branch_name || "Main Campus",
        floor_number: Number(roomData.floor_number) || 1,
        room_number: roomData.room_number || "101",
        room_name: roomData.room_name || "",
        room_type: roomData.room_type || "STUDENT_DORM",
        max_capacity: Number(roomData.max_capacity) || 4,
        supervisor: roomData.supervisor || null,
        supervisor_name: roomData.supervisor_name || "",
        prefect: roomData.prefect || null,
        prefect_name: roomData.prefect_name || "",
        amenities: roomData.amenities || ["Ceiling Fans", "Study Tables", "Attached Washroom", "Lockers"],
        is_active: true,
        is_deleted: false,
        created_at: new Date().toISOString(),
        ...roomData,
      };
      updated = [newRoom, ...list];

      // Auto generate empty bed allocations for this room
      const capacity = Number(roomData.max_capacity) || 4;
      const newBeds: BedAllocation[] = [];
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
      writeJSON(bedKey, [...currentBeds, ...newBeds]);
    }

    writeJSON(key, updated);
    window.dispatchEvent(new CustomEvent("spr_residential_updated"));
    return updated;
  },

  addRoom: (tenantId: string | undefined, roomData: Partial<DormitoryRoom>): DormitoryRoom[] => {
    return residentialStore.saveRoom(tenantId, roomData);
  },

  updateRoom: (roomId: string, roomData: Partial<DormitoryRoom>, tenantId?: string): DormitoryRoom[] => {
    return residentialStore.saveRoom(tenantId, { ...roomData, id: roomId });
  },

  deleteRoom: (tenantId: string | undefined, roomId: string): DormitoryRoom[] => {
    const key = `spr_dormitory_rooms_${tenantId || "default"}`;
    const list = residentialStore.getRooms(tenantId);
    const updated = list.filter((r) => r.id !== roomId);
    writeJSON(key, updated);

    // Clean up associated beds
    const bedKey = `spr_bed_allocations_${tenantId || "default"}`;
    const currentBeds = residentialStore.getBeds(tenantId);
    const updatedBeds = currentBeds.filter((b) => b.room !== roomId);
    writeJSON(bedKey, updatedBeds);

    window.dispatchEvent(new CustomEvent("spr_residential_updated"));
    return updated;
  },

  // ─── Bed Allocations ───────────────────────────────────────────────────────
  getBeds: (tenantId?: string): BedAllocation[] => {
    const key = `spr_bed_allocations_${tenantId || "default"}`;
    const data = readJSON(key, DEFAULT_BEDS);
    return (Array.isArray(data) ? data : DEFAULT_BEDS) as BedAllocation[];
  },

  getBedsByRoom: (tenantId: string | undefined, roomId: string): BedAllocation[] => {
    const beds = residentialStore.getBeds(tenantId);
    return (Array.isArray(beds) ? beds : []).filter((b) => b && (b.room === roomId || b.room_number === roomId));
  },

  getBedsByBuilding: (tenantId: string | undefined, buildingNameOrId: string): BedAllocation[] => {
    const beds = residentialStore.getBeds(tenantId);
    return (Array.isArray(beds) ? beds : []).filter((b) => b && b.building_name === buildingNameOrId);
  },

  assignBed: (
    tenantId: string | undefined,
    bedId: string,
    studentData: any,
    staffData: any,
    remarks: string = ""
  ): BedAllocation[] => {
    const key = `spr_bed_allocations_${tenantId || "default"}`;
    const list = residentialStore.getBeds(tenantId);

    const updated = (Array.isArray(list) ? list : []).map((b) => {
      if (b && b.id === bedId) {
        return {
          ...b,
          student: studentData?.id || null,
          student_name: studentData?.name_en || studentData?.name || studentData?.label || "",
          student_uniq_id: studentData?.uniq_id || "",
          student_class_name: studentData?.student_class_name || studentData?.class_name || "",
          staff: staffData?.id || null,
          staff_name: staffData?.name || staffData?.username || staffData?.label || "",
          status: "OCCUPIED",
          assigned_date: new Date().toISOString().split("T")[0],
          remarks: remarks || b.remarks || "",
        };
      }
      return b;
    });

    writeJSON(key, updated);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("spr_residential_updated"));
    }
    return updated;
  },

  unassignBed: (tenantId: string | undefined, bedId: string, remarks: string = "") => {
    const key = `spr_bed_allocations_${tenantId || "default"}`;
    const list = residentialStore.getBeds(tenantId);

    const updated = (Array.isArray(list) ? list : []).map((b) => {
      if (b && b.id === bedId) {
        return {
          ...b,
          student: null,
          student_name: "",
          student_uniq_id: "",
          student_class_name: "",
          staff: null,
          staff_name: "",
          status: "VACANT",
          assigned_date: null,
          remarks: remarks || "",
        };
      }
      return b;
    });

    writeJSON(key, updated);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("spr_residential_updated"));
    }
    return updated;
  },

  // ─── Dynamic Occupancy Metrics ─────────────────────────────────────────────
  getOccupancyMetrics: (tenantId?: string): OccupancyMetrics => {
    const rooms = Array.isArray(residentialStore.getRooms(tenantId)) ? residentialStore.getRooms(tenantId) : [];
    const beds = Array.isArray(residentialStore.getBeds(tenantId)) ? residentialStore.getBeds(tenantId) : [];
    const buildings = Array.isArray(residentialStore.getBuildings(tenantId)) ? residentialStore.getBuildings(tenantId) : [];

    const totalRooms = rooms.length;
    const totalCapacity = rooms.reduce((acc, r) => acc + (Number(r?.max_capacity) || 0), 0);
    const occupiedBeds = beds.filter((b) => b && b.status === "OCCUPIED").length;
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

  resetToDefaultData: (tenantId?: string): void => {
    const bldKey = `spr_residential_buildings_${tenantId || "default"}`;
    const roomKey = `spr_dormitory_rooms_${tenantId || "default"}`;
    const bedKey = `spr_bed_allocations_${tenantId || "default"}`;

    writeJSON(bldKey, DEFAULT_BUILDINGS);
    writeJSON(roomKey, DEFAULT_ROOMS);
    writeJSON(bedKey, DEFAULT_BEDS);
    window.dispatchEvent(new CustomEvent("spr_residential_updated"));
  },
};
