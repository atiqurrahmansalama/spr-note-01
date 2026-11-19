export const en = {
  title: 'Role & Access Control',
  subtitle: 'Create and organize institutional roles; configure permissions in Feature & Module Control',
  totalRolesBadge: '{{count}} Total Roles',

  // Metrics
  metrics: {
    totalRoles: 'Total Roles',
    systemRoles: 'System Roles',
    customRoles: 'Custom Roles',
    assignedUsers: 'Assigned Users',
  },

  // Search & Filter
  searchPlaceholder: 'Search roles by name, code or description...',
  allTypes: 'All Role Types',
  typeSystem: 'System Protected',
  typeCustom: 'Custom Roles',

  // Columns & Labels
  roleName: 'Role Name',
  roleCode: 'Role Code',
  assignedUsers: 'Users',
  protection: 'Status',
  protected: 'Protected',
  configurable: 'Configurable',
  googleDefault: 'Google Default',
  actions: 'Actions',
  featureControlNotice:
    'All module, page, and dashboard widget permissions for this role are governed centrally inside App Management -> Feature & Module Control.',
  manageInFeatureControl: 'Manage Access in Feature Control',

  // Action Buttons
  createRole: 'Create Role',
  createRoleSubtitle: 'Define a new custom role for institutional access control',
  editRole: 'Edit Role',
  cloneRole: 'Clone Role',
  deleteRole: 'Delete Role',
  viewDetails: 'View Details',
  setGoogleDefault: 'Set as Google Default',
  exportCsv: 'Export CSV',

  // Drawers & Form
  drawers: {
    createTitle: 'Create Custom Role',
    editTitle: 'Edit Role: {{name}}',
    detailsTitle: 'Role Profile: {{name}}',
    basicInfoSection: 'Basic Information',
    featureControlSection: 'Feature & Module Control',
  },

  // Form Fields
  fields: {
    name: 'Role Display Name',
    namePlaceholder: 'e.g. Senior Ustadh',
    code: 'Role Unique Code',
    codePlaceholder: 'e.g. SENIOR_USTADH',
    description: 'Role Description',
    descriptionPlaceholder: 'Briefly describe the operational scope for this role...',
  },

  // Modals
  deleteModal: {
    title: 'Delete Role',
    warningTitle: 'Warning: Role Deletion',
    warningMessage: 'Are you sure you want to delete role "{{name}}"? This action cannot be undone.',
    assignedWarning: 'This role is currently assigned to {{count}} active user(s) and cannot be deleted.',
    confirmButton: 'Confirm Delete',
    deleting: 'Deleting...',
    cancel: 'Cancel',
  },

  // Empty State & Fallbacks
  empty: {
    title: 'No Roles Found',
    filteredMessage: 'No roles match your search or filter criteria. Try adjusting your filters.',
    defaultMessage: 'No custom roles defined. Create custom authority roles to manage permissions across your academy.',
  },

  // Toasts
  toasts: {
    roleCreated: 'Role "{{name}}" created successfully!',
    roleUpdated: 'Role "{{name}}" updated successfully!',
    roleCloned: 'Role cloned as "{{name}}" successfully!',
    roleDeleted: 'Role "{{name}}" deleted successfully!',
    cannotDeleteSystem: 'System protected roles cannot be deleted.',
    cannotDeleteAssigned: 'Cannot delete role assigned to active users.',
    googleDefaultUpdated: 'Default Google role updated to "{{name}}".',
    loadError: 'Failed to load roles from server.',
    validationError: 'Please fill in all required fields.',
    codeExists: 'Role code "{{code}}" already exists. Please choose a unique code.',
    exportSuccess: 'Roles exported successfully.',
  },
};

export default en;
