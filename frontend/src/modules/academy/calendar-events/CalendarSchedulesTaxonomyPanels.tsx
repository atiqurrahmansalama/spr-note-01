import React from "react";
import CompactTaxonomyManager from "../../../components/common/CompactTaxonomyManager";
import {
  CalendarIcon,
  ChecklistIcon,
  ClockIcon,
} from "../../../components/ui/Icons";
import {
  calendarEventTypesStore,
  calendarImpactScopesStore,
  calendarWorkingSchedulesStore,
} from "../../../utils/localStore";

export interface CalendarTaxonomyProps {
  activeTenantId?: string | null;
  eventKinds?: any[];
}

export const workingSchedulesSectionConfig = {
  id: "working-schedules",
  group: "Calendar & Schedules",
  title: "Working Hours & Shifts",
  description: "Manage pre-configured operational shifts, duty hours, and faculty sessions",
  icon: ClockIcon,
};

export const eventTypesSectionConfig = {
  id: "event-types",
  group: "Calendar & Schedules",
  title: "Schedule & Event Types",
  description: "Manage pre-configured schedule titles, exam types, and calendar events",
  icon: CalendarIcon,
};

export const impactScopesSectionConfig = {
  id: "impact-scopes",
  group: "Calendar & Schedules",
  title: "System Impact Scopes",
  description: "Configure system modules affected by calendar events (Attendance, Notifications, etc.)",
  icon: ChecklistIcon,
};

/**
 * Working Hours & Operational Shifts Taxonomy Panel
 */
export const WorkingSchedulesPanel: React.FC<CalendarTaxonomyProps> = ({ activeTenantId }) => {
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

/**
 * Schedule & Event Types Taxonomy Panel
 */
export const EventTypesPanel: React.FC<CalendarTaxonomyProps> = ({ activeTenantId, eventKinds = [] }) => {
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

/**
 * System Impact Scopes Taxonomy Panel
 */
export const ImpactScopesPanel: React.FC<CalendarTaxonomyProps> = ({ activeTenantId }) => {
  return (
    <CompactTaxonomyManager
      title="System Impact Scopes"
      description="Manage integration modules and services affected by calendar schedules & events (e.g. Attendance, Push Notifications, Daily Routine, etc.)."
      fetchItems={async () => calendarImpactScopesStore.getScopes(activeTenantId)}
      createItem={async (payload: any) => calendarImpactScopesStore.addScope(activeTenantId, payload)}
      updateItem={async (id: any, payload: any) => calendarImpactScopesStore.updateScope(activeTenantId, id, payload)}
      deleteItem={async (id: any) => calendarImpactScopesStore.deleteScope(activeTenantId, id)}
      itemTypeName="Impact Scope"
      icon={ChecklistIcon}
    />
  );
};
