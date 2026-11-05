import React from "react";
import { ClassIcon } from "../../../../components/ui/Icons";
import DataMigrationModal from "../../../../components/common/DataMigrationModal";
import { ClassMigrationModalProps } from "../types";

export default function ClassMigrationModal({
  isOpen,
  onClose,
  deletingClass,
  availableClasses = [],
  onSuccess,
}: ClassMigrationModalProps) {
  return (
    <DataMigrationModal
      isOpen={isOpen}
      onClose={onClose}
      entityType="Class"
      entityName={deletingClass?.name}
      deletingItem={deletingClass}
      availableItems={availableClasses}
      entityIcon={ClassIcon}
      apiEndpoint={deletingClass ? `/api/v1/classes/${deletingClass.id}/delete-with-migration/` : undefined}
      payloadKey="target_class_id"
      onSuccess={onSuccess}
    />
  );
}

