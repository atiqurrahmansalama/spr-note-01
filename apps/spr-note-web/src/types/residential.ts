/**
 * SPR Note — Enterprise Residential & Dormitory Type Definitions
 * ===============================================================
 * Defines strict TypeScript interfaces and data models for Residential Buildings,
 * Dormitory Rooms, Bed Allocations, Supervisors & Occupancy Statistics.
 */

export type RoomType =
  | 'STUDENT_DORM'
  | 'FACULTY_QUARTER'
  | 'GUEST_ROOM'
  | 'STUDY_HALL'
  | string;

export type BedStatus = 'OCCUPIED' | 'VACANT' | string;

export type SupervisorRoleType = 'WARDEN' | 'SUPERVISOR' | 'PREFECT';

export interface ResidentialBuilding {
  id: string;
  name: string;
  code: string;
  branch: string;
  branch_name?: string;
  total_floors: number;
  warden?: string | null;
  warden_name?: string;
  description?: string;
  is_active?: boolean;
  is_deleted?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DormitoryRoom {
  id: string;
  building: string;
  building_name?: string;
  building_code?: string;
  branch: string;
  branch_name?: string;
  floor_number: number;
  room_number: string;
  room_name?: string;
  room_type: RoomType;
  max_capacity: number;
  supervisor?: string | null;
  supervisor_name?: string;
  prefect?: string | null;
  prefect_name?: string;
  amenities?: string[];
  is_active?: boolean;
  is_deleted?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BedAllocation {
  id: string;
  room: string;
  room_number?: string;
  room_name?: string;
  building_name?: string;
  bed_number: string;
  student?: string | null;
  student_name?: string;
  student_uniq_id?: string;
  student_class_name?: string;
  staff?: string | null;
  staff_name?: string;
  status: BedStatus;
  assigned_date?: string | null;
  remarks?: string;
  is_active?: boolean;
}

export interface SupervisorPersonnel {
  id: string;
  name: string;
  role: string;
  role_type: SupervisorRoleType;
  jurisdiction: string;
  sub_title: string;
  branch: string;
  branch_name: string;
  scope: string;
  raw_type: 'BUILDING' | 'ROOM';
  raw: ResidentialBuilding | DormitoryRoom;
}

export interface OccupancyMetrics {
  totalBuildings: number;
  totalRooms: number;
  totalCapacity: number;
  occupiedBeds: number;
  vacantBeds: number;
  occupancyRate: number;
}
