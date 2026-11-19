import React from "react";
import CompactTaxonomyManager from "../../../../components/common/CompactTaxonomyManager";
import { ClockIcon } from "../../../../components/ui/Icons";
import { calendarWorkingSchedulesStore } from "../../../../utils/localStore";

export interface WorkingSchedulesPanelProps {
  activeTenantId?: string | null;
}

export const workingSchedulesSectionConfig = {
  id: "working-schedules",
  group: "Calendar & Schedules",
  title: "Working Hours & Shifts",
  description: "Manage pre-configured operational shifts, duty hours, and faculty sessions",
  icon: ClockIcon,
};

/**
 * Working Hours & Operational Shifts Taxonomy Panel
 */
export const WorkingSchedulesPanel: React.FC<WorkingSchedulesPanelProps> = ({ activeTenantId }) => {
  return (
    <CompactTaxonomyManager
      title="Working Hours & Operational Shifts"
      description="Manage pre-configured operational shifts, lecture sessions, and faculty duty hours available in the Working Hours entry picker."
      fetchItems={async () => calendarWorkingSchedulesStore.getSchedules(activeTenantId)}
      createItem={async (payload: any) => calendarWorkingSchedulesStore.addSchedule(activeTenantId, payload)}
      updateItem={async (id: any, payload: any) => calendarWorkingSchedulesStore.updateSchedule(activeTenantId, id, payload)}
      deleteItem={async (id: any) => calendarWorkingSchedulesStore.deleteSchedule(activeTenantId, id)}
      itemTypeName="Working Schedule"
      hideStatus={true}
      icon={ClockIcon}
    />
  );
};

export default WorkingSchedulesPanel;

