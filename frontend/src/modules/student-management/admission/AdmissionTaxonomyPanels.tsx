import React from "react";
import CompactTaxonomyManager from "../../../components/common/CompactTaxonomyManager";
import { ChecklistIcon, SessionsIcon } from "../../../components/ui/Icons";
import {
  documentTypesStore,
  INDIVIDUAL_DOCUMENT_FORMAT_OPTIONS,
  resolveAllowedFormatsConfig,
  classAdmissionRequirementsStore,
} from "../../../utils/localStore";

export interface AdmissionTaxonomyProps {
  activeTenantId?: string | null;
  availableClassOptions?: Array<{ value: string; label: string }>;
  classesList?: any[];
  availableDocTitles?: Array<{ value: string; label: string }>;
}

export const documentTypesSectionConfig = {
  id: "document-types",
  group: "Admissions & Recruitment",
  title: "Document Titles",
  description: "Manage pre-configured document titles, sanads, certificates, and identity credentials for staff and students",
  icon: SessionsIcon,
};

export const admissionDocRequirementsSectionConfig = {
  id: "admission-doc-requirements",
  group: "Admissions & Recruitment",
  title: "Admission Requirements",
  description: "Configure mandatory admission document requirements by class level (e.g. Play-5th, Hifz, 6th-10th, Dawra-e Hadith)",
  icon: ChecklistIcon,
};

/**
 * Pre-configured Document Titles, Sanads, and Credentials Taxonomy Panel
 */
export const DocumentTypesPanel: React.FC<AdmissionTaxonomyProps> = ({ activeTenantId }) => {
  return (
    <CompactTaxonomyManager
      title="Document Titles &amp; Credentials"
      description="Manage pre-configured document titles, sanads, academic certificates, and identity credentials available across Staff Onboarding and Student Admissions (e.g. Dawra-e-Hadith, Kamil, Hifz, Birth Certificate, NID, etc.)."
      fetchItems={async () => documentTypesStore.getTypes(activeTenantId)}
      createItem={async (payload: any) => documentTypesStore.addType(activeTenantId, payload)}
      updateItem={async (id: any, payload: any) => documentTypesStore.updateType(activeTenantId, id, payload)}
      deleteItem={async (id: any) => documentTypesStore.deleteType(activeTenantId, id)}
      itemTypeName="Document Type"
      hideStatus={true}
      icon={SessionsIcon}
      extraFields={[
        {
          name: "allowed_formats",
          label: "Allowed File Formats",
          type: "multiselect",
          multiple: true,
          options: INDIVIDUAL_DOCUMENT_FORMAT_OPTIONS,
          defaultValue: ["PDF", "JPG", "PNG"],
          tableHeader: "Allowed Formats",
          renderBadge: (val: any) => {
            const resolved = resolveAllowedFormatsConfig(val);
            return (
              <div className="flex flex-wrap gap-1">
                {resolved.map((fmt: string) => (
                  <span
                    key={fmt}
                    className="px-1.5 py-0.5 rounded font-mono text-[10px] font-bold theme-bg-sub theme-text-secondary border theme-border"
                  >
                    {fmt}
                  </span>
                ))}
              </div>
            );
          },
        },
      ]}
    />
  );
};

/**
 * Class-Level Mandatory Admission Document Requirements Taxonomy Panel
 */
export const ClassAdmissionRequirementsPanel: React.FC<AdmissionTaxonomyProps> = ({
  activeTenantId,
  availableClassOptions = [{ value: "ALL", label: "All Classes (General / Default)" }],
  classesList = [],
  availableDocTitles = [],
}) => {
  return (
    <CompactTaxonomyManager
      title="Admission Requirements by Class Level"
      description="Configure mandatory and optional verification documents required from students during admission enrollment, filtered by specific class standards."
      fetchItems={async () => classAdmissionRequirementsStore.getRequirements(activeTenantId)}
      createItem={async (payload: any) => classAdmissionRequirementsStore.addRequirement(activeTenantId, payload)}
      updateItem={async (id: any, payload: any) => classAdmissionRequirementsStore.updateRequirement(activeTenantId, id, payload)}
      deleteItem={async (id: any) => classAdmissionRequirementsStore.deleteRequirement(activeTenantId, id)}
      itemTypeName="Class Requirement Rule"
      extraFields={[
        {
          name: "student_class_id",
          label: "Academic Class Standard",
          type: "select",
          options: availableClassOptions,
          allowAll: true,
          allLabel: "All Classes (General / Default)",
          allValue: "ALL",
          defaultValue: "ALL",
          searchable: false,
          tableHeader: "Target Class",
          renderBadge: (val: any) => {
            if (!val || val === "ALL" || (Array.isArray(val) && (val.length === 0 || val[0] === "ALL"))) {
              return (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold theme-bg-sub border theme-border theme-text-secondary">
                  All Classes (General)
                </span>
              );
            }
            const singleId = Array.isArray(val) ? val[0] : val;
            const matchedClass = classesList.find((c: any) => String(c.id) === String(singleId));
            const label = matchedClass ? (matchedClass.code ? `${matchedClass.name} (${matchedClass.code})` : matchedClass.name) : singleId;
            return (
              <span className="px-2.5 py-1 rounded-md text-xs font-bold theme-bg-elevated theme-text-primary border theme-border shadow-2xs">
                {label}
              </span>
            );
          },
        },
        {
          name: "required_docs",
          label: "Mandatory Required Documents",
          type: "multiselect",
          multiple: true,
          options: availableDocTitles,
          defaultValue: ["Birth Registration Certificate (BRN)", "Guardian National ID (NID)"],
          tableHeader: "Required Document Checklists",
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
      hideStatus={true}
      icon={ChecklistIcon}
    />
  );
};
