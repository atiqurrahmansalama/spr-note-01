import React from "react";
import { GroupIcon } from "../../../../components/ui/Icons";
import DataMigrationModal from "../../../../components/common/DataMigrationModal";

export default function GroupMigrationModal({
  isOpen,
  onClose,
  deletingGroup,
  availableGroups = [],
  onSuccess,
}) {
  return (
    <DataMigrationModal
      isOpen={isOpen}
      onClose={onClose}
      entityType="Group"
      entityName={deletingGroup?.name}
      deletingItem={deletingGroup}
      availableItems={availableGroups}
      entityIcon={GroupIcon}
      apiEndpoint={deletingGroup ? `/api/v1/academy/groups/${deletingGroup.id}/delete-with-migration/` : undefined}
      payloadKey="target_group_id"
      onSuccess={onSuccess}
    />
  );
}
