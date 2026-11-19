import React from "react";
import CompactTaxonomyManager from "../../../../components/common/CompactTaxonomyManager";
import { ChecklistIcon } from "../../../../components/ui/Icons";
import { calendarImpactScopesStore } from "../../../../utils/localStore";

export interface ImpactScopesPanelProps {
  activeTenantId?: string | null;
}

export const impactScopesSectionConfig = {
  id: "impact-scopes",
  group: "Calendar & Schedules",
  title: "System Impact Scopes",
  description: "Configure system modules affected by calendar events (Attendance, Notifications, etc.)",
  icon: ChecklistIcon,
};

/**
 * System Impact Scopes Taxonomy Panel
 */
export const ImpactScopesPanel: React.FC<ImpactScopesPanelProps> = ({ activeTenantId }) => {
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

export default ImpactScopesPanel;

