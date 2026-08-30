import React, { useState, useEffect } from 'react';
import CustomInput from '../../../components/ui/CustomInput';
import CustomSelect from '../../../components/ui/CustomSelect';
import BranchSelect from '../../../components/selectors/BranchSelect';
import ResidentialBuildingSelect from '../../../components/selectors/ResidentialBuildingSelect';
import TeacherSelect from '../../../components/selectors/TeacherSelect';
import { HomeIcon, SparklesIcon, TeacherIcon } from '../../../components/ui/Icons';
import { DrawerContainer, DrawerSection, DrawerFooter } from '../../../components/layout';
import { residentialStore } from '../../../utils/stores/residentialStore';
import { useTenant } from '../../../context/TenantContext';
import { useToast } from '../../../context/ToastContext';

const ROOM_TYPE_OPTIONS = [
  { value: 'STUDENT_DORM', label: 'Student Dormitory' },
  { value: 'FACULTY_QUARTER', label: 'Faculty / Staff Quarter' },
  { value: 'GUEST_ROOM', label: 'Guest Accommodation' },
  { value: 'STUDY_HALL', label: 'Study / Mutala Hall' },
];

const AVAILABLE_AMENITIES = [
  'Ceiling Fans',
  'Air Conditioning',
  'Study Tables',
  'Attached Washroom',
  'Lockers',
  'Bookcases',
  'Wi-Fi',
  'Balcony',
  'Water Dispenser',
];

export default function DormitoryRoomDrawer({
  room,
  onSaveSuccess,
  onCancel,
}) {
  const { activeTenantId } = useTenant();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    branch: 'MAIN_CAMPUS',
    branch_name: 'Main Campus',
    building: '',
    building_name: '',
    floor_number: 1,
    room_number: '',
    room_name: '',
    room_type: 'STUDENT_DORM',
    max_capacity: 6,
    supervisor: null,
    supervisor_name: '',
    prefect: null,
    prefect_name: '',
    amenities: ['Ceiling Fans', 'Study Tables', 'Attached Washroom', 'Lockers'],
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (room) {
      setFormData({
        branch: room.branch || 'MAIN_CAMPUS',
        branch_name: room.branch_name || 'Main Campus',
        building: room.building || '',
        building_name: room.building_name || '',
        floor_number: room.floor_number || 1,
        room_number: room.room_number || '',
        room_name: room.room_name || '',
        room_type: room.room_type || 'STUDENT_DORM',
        max_capacity: room.max_capacity || 6,
        supervisor: room.supervisor || null,
        supervisor_name: room.supervisor_name || '',
        prefect: room.prefect || null,
        prefect_name: room.prefect_name || '',
        amenities: Array.isArray(room.amenities) ? room.amenities : [],
      });
    }
  }, [room]);

  const toggleAmenity = (item) => {
    setFormData((prev) => {
      const exists = prev.amenities.includes(item);
      return {
        ...prev,
        amenities: exists
          ? prev.amenities.filter((a) => a !== item)
          : [...prev.amenities, item],
      };
    });
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.room_number.trim()) {
      showToast('Room number is required', 'error');
      return;
    }

    setSaving(true);
    try {
      residentialStore.saveRoom(activeTenantId, {
        ...(room?.id ? { id: room.id } : {}),
        ...formData,
        floor_number: Number(formData.floor_number) || 1,
        max_capacity: Number(formData.max_capacity) || 1,
      });

      showToast(room?.id ? 'Dormitory room updated' : 'Dormitory room created', 'success');
      if (onSaveSuccess) onSaveSuccess();
    } catch {
      showToast('Failed to save room', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DrawerContainer padding="none" spacing="normal">
      <form onSubmit={handleSubmit} className="space-y-5">
        <DrawerSection title="Location & Structure" icon={HomeIcon}>
          <div className="@container">
            <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4">
              <div>
                <BranchSelect
                  label="Campus / Branch"
                  value={formData.branch}
                  onChange={(val, obj) => {
                    setFormData((prev) => ({
                      ...prev,
                      branch: val,
                      branch_name: obj?.label || obj?.name || 'Main Campus',
                    }));
                  }}
                  required={true}
                />
              </div>

              <div>
                <ResidentialBuildingSelect
                  label="Residential Building"
                  branchId={formData.branch}
                  value={formData.building}
                  onChange={(val, obj) => {
                    setFormData((prev) => ({
                      ...prev,
                      building: val,
                      building_name: obj?.raw?.name || obj?.label || '',
                    }));
                  }}
                  required={true}
                />
              </div>

              <div>
                <CustomInput
                  label="Room Number"
                  placeholder="e.g. 101, 204-B"
                  value={formData.room_number}
                  onChange={(val) => setFormData((prev) => ({ ...prev, room_number: val }))}
                  required={true}
                  icon={HomeIcon}
                />
              </div>

              <div>
                <CustomInput
                  label="Floor Level"
                  type="number"
                  min={0}
                  max={30}
                  value={formData.floor_number}
                  onChange={(val) => setFormData((prev) => ({ ...prev, floor_number: val }))}
                  required={true}
                />
              </div>

              <div>
                <CustomInput
                  label="Max Bed Capacity"
                  type="number"
                  min={1}
                  max={50}
                  value={formData.max_capacity}
                  onChange={(val) => setFormData((prev) => ({ ...prev, max_capacity: val }))}
                  required={true}
                />
              </div>

              <div>
                <CustomSelect
                  label="Room Category"
                  options={ROOM_TYPE_OPTIONS}
                  value={formData.room_type}
                  onChange={(val) => setFormData((prev) => ({ ...prev, room_type: val }))}
                />
              </div>

              <div className="@[480px]:col-span-2">
                <CustomInput
                  label="Room Title / Label (Optional)"
                  placeholder="e.g. Junior Dormitory Hall"
                  value={formData.room_name}
                  onChange={(val) => setFormData((prev) => ({ ...prev, room_name: val }))}
                />
              </div>
            </div>
          </div>
        </DrawerSection>

        <DrawerSection title="Supervision & Discipline" icon={TeacherIcon}>
          <div className="@container">
            <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4">
              <div>
                <TeacherSelect
                  label="Room Supervisor (Staff / Ustadh)"
                  placeholder="Select Supervisor..."
                  value={formData.supervisor}
                  onChange={(val, teacherObj) => {
                    setFormData((prev) => ({
                      ...prev,
                      supervisor: val,
                      supervisor_name: teacherObj?.name || teacherObj?.label || '',
                    }));
                  }}
                  searchable={true}
                />
              </div>

              <div>
                <CustomInput
                  label="Student Prefect / Captain"
                  placeholder="e.g. Ahmadullah Al-Mahdi"
                  value={formData.prefect_name}
                  onChange={(val) => setFormData((prev) => ({ ...prev, prefect_name: val }))}
                />
              </div>
            </div>
          </div>
        </DrawerSection>

        <DrawerSection title="Amenities & Facilities" icon={SparklesIcon}>
          <div className="flex flex-wrap gap-1.5">
            {AVAILABLE_AMENITIES.map((amenity) => {
              const isSelected = formData.amenities.includes(amenity);
              return (
                <button
                  key={amenity}
                  type="button"
                  onClick={() => toggleAmenity(amenity)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer ${
                    isSelected
                      ? 'theme-bg-accent theme-accent-text border-transparent shadow-2xs font-semibold'
                      : 'theme-bg-sub theme-text-secondary theme-border hover:theme-bg-elevated'
                  }`}
                >
                  {isSelected ? `✓ ${amenity}` : `+ ${amenity}`}
                </button>
              );
            })}
          </div>
        </DrawerSection>

        <DrawerFooter
          onCancel={onCancel}
          isSubmitting={saving}
          isSaveDisabled={!formData.room_number.trim()}
          saveLabel={room?.id ? 'Update Room' : 'Create Room'}
          onSubmit={true}
        />
      </form>
    </DrawerContainer>
  );
}
