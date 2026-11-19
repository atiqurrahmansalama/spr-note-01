import React from "react";
import { SectionIcon } from "../../../../components/ui/Icons";
import DataMigrationModal from "../../../../components/common/DataMigrationModal";
import { SectionMigrationModalProps } from "../types";

export default function SectionMigrationModal({
  isOpen,
  onClose,
  deletingSection,
  availableSections = [],
  onSuccess,
}: SectionMigrationModalProps) {
  return (
    <DataMigrationModal
      isOpen={isOpen}
      onClose={onClose}
      entityType="Section"
      entityName={deletingSection?.section_name || deletingSection?.name}
      deletingItem={deletingSection}
      availableItems={availableSections}
      entityIcon={SectionIcon}
      apiEndpoint={deletingSection ? `/api/v1/sections/${deletingSection.id}/delete-with-migration/` : undefined}
      payloadKey="target_section_id"
      onSuccess={onSuccess}
    />
  );
}

