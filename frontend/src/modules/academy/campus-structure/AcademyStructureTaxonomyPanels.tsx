import React from "react";
import CompactTaxonomyManager from "../../../components/common/CompactTaxonomyManager";
import { BuildingOfficeIcon } from "../../../components/ui/Icons";
import {
  getInstitutionCategories,
  createInstitutionCategory,
  updateInstitutionCategory,
  deleteInstitutionCategory,
} from "../../../api/institutions";
import { branchCategoriesStore } from "../../../utils/localStore";

export interface AcademyStructureTaxonomyProps {
  activeTenantId?: string | null;
}

export const academyCategoriesSectionConfig = {
  id: "categories",
  group: "Academic Structure",
  title: "Academy Categories",
  description: "Manage institution types, curriculum categories, and taxonomies",
  icon: BuildingOfficeIcon,
};

/**
 * Academy Categories and Branch Categories Taxonomy Panels
 */
export const AcademyCategoriesPanel: React.FC<AcademyStructureTaxonomyProps> = () => {
  return (
    <CompactTaxonomyManager
      title="Academy Categories"
      description="Manage institution types, curriculum models, and structural taxonomy divisions."
      fetchItems={getInstitutionCategories}
      createItem={createInstitutionCategory}
      updateItem={updateInstitutionCategory}
      deleteItem={deleteInstitutionCategory}
      itemTypeName="Category"
      icon={BuildingOfficeIcon}
    />
  );
};

export const BranchCategoriesPanel: React.FC<AcademyStructureTaxonomyProps> = ({ activeTenantId }) => {
  return (
    <CompactTaxonomyManager
      title="Branch &amp; Campus Categories"
      description="Configure campus classifications, branch types (Main Campus, Sub Branch, Female Branch, Residential Complex, etc.), and operational campus scopes."
      fetchItems={async () => branchCategoriesStore.getCategories(activeTenantId)}
      createItem={async (payload: any) => branchCategoriesStore.addCategory(activeTenantId, payload)}
      updateItem={async (id: any, payload: any) => branchCategoriesStore.updateCategory(activeTenantId, id, payload)}
      deleteItem={async (id: any) => branchCategoriesStore.deleteCategory(activeTenantId, id)}
      itemTypeName="Branch Category"
      icon={BuildingOfficeIcon}
    />
  );
};
