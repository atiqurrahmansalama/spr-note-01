import React from "react";
import CompactTaxonomyManager from "../../../../components/common/CompactTaxonomyManager";
import { CalendarIcon } from "../../../../components/ui/Icons";
import { calendarEventTypesStore } from "../../../../utils/localStore";

export interface EventTypesPanelProps {
  activeTenantId?: string | null;
  eventKinds?: any[];
}

export const eventTypesSectionConfig = {
  id: "event-types",
  group: "Calendar & Schedules",
  title: "Schedule & Event Types",
  description: "Manage pre-configured schedule titles, exam types, and calendar events",
  icon: CalendarIcon,
};

/**
 * Schedule & Event Types Taxonomy Panel
 */
export const EventTypesPanel: React.FC<EventTypesPanelProps> = ({ activeTenantId, eventKinds = [] }) => {
  return (
    <CompactTaxonomyManager
      title="Schedule & Event Types"
      description="Pre-configured event titles and schedule categories available in the Calendar & Events picker dropdown."
      fetchItems={async () => calendarEventTypesStore.getEventTypes(activeTenantId)}
      createItem={async (payload: any) => calendarEventTypesStore.addEventType(activeTenantId, payload)}
      updateItem={async (id: any, payload: any) => calendarEventTypesStore.updateEventType(activeTenantId, id, payload)}
      deleteItem={async (id: any) => calendarEventTypesStore.deleteEventType(activeTenantId, id)}
      itemTypeName="Event Type"
      typeOptions={eventKinds}
      typeLabel="Event Type"
      onManageTypes={true}
      hideStatus={true}
      icon={CalendarIcon}
    />
  );
};

export default EventTypesPanel;

