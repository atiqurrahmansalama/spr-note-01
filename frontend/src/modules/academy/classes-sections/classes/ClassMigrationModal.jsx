import React from "react";
import { ClassIcon } from "../../../../components/ui/Icons";
import DataMigrationModal from "../../../../components/common/DataMigrationModal";

export default function ClassMigrationModal({
  isOpen,
  onClose,
  deletingClass,
  availableClasses = [],
  onSuccess,
}) {
  return (
    <DataMigrationModal
      isOpen={isOpen}
      onClose={onClose}
      entityType="Class"
      entityName={deletingClass?.name}
      deletingItem={deletingClass}
      availableItems={availableClasses}
      entityIcon={ClassIcon}
      apiEndpoint={deletingClass ? `/api/v1/academy/classes/${deletingClass.id}/migrate_and_delete/` : undefined}
      payloadKey="target_class_id"
      onSuccess={onSuccess}
    />
  );
}
