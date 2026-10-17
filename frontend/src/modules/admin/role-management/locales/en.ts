export const en = {
  title: 'Role & Access Control',
  subtitle: 'Configure system authority levels, action permissions, and custom role definitions',
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
  allLevels: 'All Authority Levels',
  levelSuperAdmin: 'Level 1 (Super Admin)',
  levelAdmin: 'Level 2 (Admin)',
  levelStaff: 'Level 3-4 (Staff)',
  levelTeacher: 'Level 5 (Teacher)',
  levelGuardian: 'Level 10 (Guardian)',

  // Columns & Labels
  roleName: 'Role Name',
  roleCode: 'Role Code',
  hierarchyRank: 'Authority Level',
  levelBadge: 'Level {{level}}',
  assignedUsers: 'Users',
  protection: 'Status',
  protected: 'Protected',
  configurable: 'Configurable',
  googleDefault: 'Google Default',
  actions: 'Actions',
  permissionsSummary: '{{count}} Permissions',

  // Action Buttons
  createRole: 'Create Role',
  createRoleSubtitle: 'Define a new custom role with specific permissions',
  editRole: 'Edit Role',
  cloneRole: 'Clone Role',
  deleteRole: 'Delete Role',
  viewDetails: 'View Permissions',
  setGoogleDefault: 'Set as Google Default',
  exportCsv: 'Export CSV',

  // Drawers & Form
  drawers: {
    createTitle: 'Create Custom Role',
    editTitle: 'Edit Role: {{name}}',
    detailsTitle: 'Role Profile & Permissions: {{name}}',
    basicInfoSection: 'Basic Information',
    permissionsSection: 'Action Permissions Matrix',
  },

  // Form Fields
  fields: {
    name: 'Role Display Name',
    namePlaceholder: 'e.g. Senior Ustadh',
    code: 'Role Unique Code',
    codePlaceholder: 'e.g. SENIOR_USTADH',
    description: 'Role Description',
    descriptionPlaceholder: 'Briefly describe the operational scope for this role...',
    hierarchyLevel: 'Authority Hierarchy Rank (1 - 10)',
    hierarchyHelp: 'Lower number = Higher authority (1 = Super Admin, 2 = Admin, 5 = Teacher, 10 = Guardian).',
    levelHighest: 'Level 1 (Highest)',
    levelMedium: 'Level 5 (Medium)',
    levelLowest: 'Level 10 (Lowest)',
  },

  // Permissions
  permissions: {
    can_create_student: 'Create Students',
    can_create_student_desc: 'Allow creating new student records',
    can_edit_student: 'Edit Students',
    can_edit_student_desc: 'Allow editing student details',
    can_delete_report: 'Delete Reports',
    can_delete_report_desc: 'Allow deleting daily evaluation notes',
    can_export_reports: 'Export Data',
    can_export_reports_desc: 'Allow exporting reports to PDF/Excel',
    can_manage_users: 'Manage Users',
    can_manage_users_desc: 'Allow creating and provisioning users',
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
