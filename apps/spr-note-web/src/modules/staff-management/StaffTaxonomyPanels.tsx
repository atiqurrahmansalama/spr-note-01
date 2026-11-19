import React, { useEffect, useState } from "react";
import CompactTaxonomyManager from "../../components/common/CompactTaxonomyManager";
import { ChecklistIcon, GroupsIcon, TeacherIcon } from "../../components/ui/Icons";
import {
  staffCategoriesStore,
  staffRanksStore,
  staffRecruitmentRequirementsStore,
} from "../../utils/localStore";

export interface StaffTaxonomyProps {
  activeTenantId?: string | null;
  availableDocTitles?: Array<{ value: string; label: string }>;
}

export const staffCategoriesSectionConfig = {
  id: "staff-categories",
  group: "Staff Management",
  title: "Staff Categories",
  description: "Configure institutional staff classification categories (Teaching Faculty, Management, Administration, Finance, Support)",
  icon: GroupsIcon,
};

export const staffRanksSectionConfig = {
  id: "staff-ranks",
  group: "Staff Management",
  title: "Staff Ranks & Designations",
  description: "Institutional hierarchy, designations, and faculty rank priorities (Principal, Professor, Senior Faculty, etc.)",
  icon: TeacherIcon,
};

export const staffRecruitmentRulesSectionConfig = {
  id: "staff-recruitment-rules",
  group: "Staff Management",
  title: "Onboarding Documents",
  description: "Configure mandatory verification and credential documents required for onboarding different staff categories",
  icon: ChecklistIcon,
};

function useReactiveStaffCategories(activeTenantId?: string | null) {
  const [categories, setCategories] = useState<any[]>(() =>
    staffCategoriesStore.getCategories(activeTenantId)
  );

  useEffect(() => {
    const sync = () => {
      setCategories(staffCategoriesStore.getCategories(activeTenantId));
    };
    sync();
    window.addEventListener("spr_staff_categories_updated", sync);
    window.addEventListener("spr_tenant_changed", sync);
    return () => {
      window.removeEventListener("spr_staff_categories_updated", sync);
      window.removeEventListener("spr_tenant_changed", sync);
    };
  }, [activeTenantId]);

  return categories.filter((c: any) => c.is_active !== false);
}

/**
 * Staff Categories Taxonomy Panel (Configurable inside Admin Tools)
 */
export const StaffCategoriesPanel: React.FC<StaffTaxonomyProps> = ({ activeTenantId }) => {
  return (
    <CompactTaxonomyManager
      title="Staff Categories"
      description="Create, rename, organize, and activate/deactivate staff classification categories used across Staff Roster, Onboarding, Ranks, and Recruitment Rules."
      fetchItems={async () => staffCategoriesStore.getCategories(activeTenantId)}
      createItem={async (payload: any) => staffCategoriesStore.addCategory(activeTenantId, payload)}
      updateItem={async (id: any, payload: any) => staffCategoriesStore.updateCategory(activeTenantId, id, payload)}
      deleteItem={async (id: any) => staffCategoriesStore.deleteCategory(activeTenantId, id)}
      itemTypeName="Staff Category"
      icon={GroupsIcon}
    />
  );
};

/**
 * Staff Ranks & Designations Taxonomy Panel
 */
export const StaffRanksPanel: React.FC<StaffTaxonomyProps> = ({ activeTenantId }) => {
  const categoryOptions = useReactiveStaffCategories(activeTenantId);

  return (
    <CompactTaxonomyManager
      title="Staff Ranks &amp; Designations"
      description="Manage institutional hierarchy, staff designations, and priority rank order (e.g. Principal / Muhtamim, Vice Principal, Shaikhul Hadith, etc.). Lower rank numbers indicate higher institutional authority."
      fetchItems={async () => staffRanksStore.getRanks(activeTenantId)}
      createItem={async (payload: any) => staffRanksStore.addRank(activeTenantId, payload)}
      updateItem={async (id: any, payload: any) => staffRanksStore.updateRank(activeTenantId, id, payload)}
      deleteItem={async (id: any) => staffRanksStore.deleteRank(activeTenantId, id)}
      itemTypeName="Staff Rank"
      typeOptions={categoryOptions}
      typeLabel="Staff Category"
      onManageTypes={true}
      icon={TeacherIcon}
    />
  );
};

/**
 * Staff Recruitment Document Rules Taxonomy Panel
 */
export const StaffRecruitmentRulesPanel: React.FC<StaffTaxonomyProps> = ({
  activeTenantId,
  availableDocTitles = [],
}) => {
  const categoryOptions = useReactiveStaffCategories(activeTenantId);

  return (
    <CompactTaxonomyManager
      title="Staff Onboarding Documents"
      description="Configure mandatory verification documents, academic sanads, and credential checklists required for onboarding different staff categories."
      fetchItems={async () => staffRecruitmentRequirementsStore.getRequirements(activeTenantId)}
      createItem={async (payload: any) => staffRecruitmentRequirementsStore.addRequirement(activeTenantId, payload)}
      updateItem={async (id: any, payload: any) => staffRecruitmentRequirementsStore.updateRequirement(activeTenantId, id, payload)}
      deleteItem={async (id: any) => staffRecruitmentRequirementsStore.deleteRequirement(activeTenantId, id)}
      itemTypeName="Staff Requirement Rule"
      extraFields={[
        {
          name: "staff_category",
          label: "Target Staff Category",
          type: "select",
          options: categoryOptions,
          allowAll: true,
          allLabel: "All Staff Categories",
          allValue: "ALL",
          defaultValue: "ALL",
          searchable: false,
          tableHeader: "Staff Category",
          renderBadge: (val: any) => {
            const opt = categoryOptions.find((o) => o.value === val);
            return (
              <span className="px-2.5 py-1 rounded-md text-xs font-bold theme-bg-elevated theme-text-primary border theme-border shadow-2xs">
                {opt ? opt.label : val || "All Categories"}
              </span>
            );
          },
        },
        {
          name: "required_docs",
          label: "Required Onboarding Documents",
          type: "multiselect",
          multiple: true,
          options: availableDocTitles,
          defaultValue: ["National ID (NID)", "Educational Sanad / Degree"],
          tableHeader: "Mandatory Document Checklists",
          renderBadge: (val: any) => {
            const docs = Array.isArray(val) ? val : [];
            if (docs.length === 0) return <span className="theme-text-secondary text-xs">—</span>;
            return (
              <div className="flex flex-wrap gap-1">
                {docs.map((doc: string, i: number) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20"
                  >
                    {doc}
                  </span>
                ))}
              </div>
            );
          },
        },
      ]}
      hideStatus={false}
      icon={ChecklistIcon}
    />
  );
};
