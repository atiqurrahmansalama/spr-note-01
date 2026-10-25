export default {
  title: "Profile & Account Settings",
  subtitle: "",
  editProfile: "Edit Profile",
  changeAvatar: "Change Avatar Photo",
  userFallback: "User Profile",
  roleTeacher: "Teacher",
  securityHealth: "Security & Account Health",
  securityOptimal: "Optimal Security",
  securityStrong: "Strong Security",
  securityModerate: "Moderate Security",
  securityCritical: "Action Recommended",
  securityHealthTip: "Protect your account by enabling two-factor authentication and registering biometric passkeys.",

  // Unified Groups
  groupAccessSecurity: "Account Access & Security",
  groupSecurityManagement: "Security & Device Management",
  groupDangerZone: "Danger Zone & System Actions",

  // Items
  twoFactorTitle: "Two-Factor Authentication (2FA)",
  twoFactorSubtitle: "Safeguard sign-ins with TOTP Authenticator apps (Google / Microsoft Authenticator)",
  badgeEnabled: "Enabled",
  badgeDisabled: "Disabled",

  passkeysTitle: "Passkeys & Biometrics",
  passkeysSubtitle: "Passwordless authentication using Touch ID, Face ID, or Windows Hello",
  badgePasskeys: "{{count}} Passkey",
  badgePasskeys_plural: "{{count}} Passkeys",

  accountSwitcherTitle: "Switch or Add Account",
  accountSwitcherSubtitle: "Manage saved accounts and active session switches",
  badgeSavedAccounts: "{{count}} Account Saved",
  badgeSavedAccounts_plural: "{{count}} Accounts Saved",

  qrSyncTitle: "Scan QR to Login Elsewhere",
  qrSyncSubtitle: "Instantly authorize login on another workstation or mobile device",
  badgeInstantSync: "Instant Sync",

  changePasswordTitle: "Change Password",
  changePasswordSubtitle: "Update your account login password credentials",

  activeSessionsTitle: "Active Devices & Sessions",
  activeSessionsSubtitle: "Review currently active sessions and revoke unauthorized devices",
  badgeActiveNow: "Active",

  securityLogsTitle: "Security & Activity Logs",
  securityLogsSubtitle: "Inspect recent authentication events and security activity audits",

  exportDataTitle: "Export Personal Account Data",
  exportDataSubtitle: "Download a full JSON archive of your personal profile and preferences",

  signOutTitle: "Sign Out of Account",
  signOutSubtitle: "Safely terminate current session on this device",

  // Confirmation Modals
  confirmSignOutTitle: "Sign Out Confirmation",
  confirmSignOutDesc: "Are you sure you want to sign out? Any unsaved local changes will be discarded.",
  confirmSignOutAction: "Sign Out",

  confirmLogoutAllSessionsTitle: "Revoke All Other Sessions?",
  confirmLogoutAllSessionsDesc: "This will immediately terminate all active sessions on other browsers and devices. You will remain logged in on this workstation.",
  confirmLogoutAllSessionsAction: "Revoke All Others",

  confirmDisable2faTitle: "Disable Two-Factor Authentication?",
  confirmDisable2faDesc: "Your account will no longer be protected by two-factor authentication. Are you sure you want to proceed?",
  confirmDisable2faAction: "Disable 2FA",

  // Drawers
  drawerEditProfileTitle: "Edit Profile Information",
  drawerEditProfileSubtitle: "Update display name, avatar photo, and contact credentials.",
  drawerPasswordTitle: "Update Account Password",
  drawerPasswordSubtitle: "Choose a strong password to safeguard account access.",
  drawerSessionsTitle: "Active Sessions & Devices",
  drawerSessionsSubtitle: "Manage devices currently authorized to access this account.",
  drawerLogsTitle: "Security & Authentication Logs",
  drawerLogsSubtitle: "Detailed historical records of sign-ins and security events.",
  drawerAccountsTitle: "Account Switcher",
  drawerAccountsSubtitle: "Switch between multiple saved institutional profiles.",
  drawerQrTitle: "Cross-Device QR Sign-In",
  drawerQrSubtitle: "Scan with a logged-in mobile device to sign in instantly.",
  generatingQR: "Generating secure ticket...",
  qrGeneratingDesc: "Establishing a cryptographic session handshake...",
  drawer2FaTitle: "Two-Factor Authentication (2FA)",
  drawer2FaSubtitle: "Add an extra layer of enterprise protection using TOTP authenticator apps.",
  drawerPasskeysTitle: "Manage Passkeys & Biometrics",
  drawerPasskeysSubtitle: "Hardware-bound credentials using Touch ID, Face ID, or Windows Hello.",

  // Enterprise 2FA Strings
  twoFactorActiveHeader: "Two-Factor Authentication is Active",
  twoFactorActiveDesc: "Your account is protected with TOTP-based two-factor authentication. An authenticator app code is required at sign-in.",
  backupCodesHeader: "Emergency Backup Recovery Codes",
  backupCodesDesc: "Store these 8 emergency recovery codes safely. Each code can be used once if you lose your authenticator device.",
  generateNewCodes: "Regenerate Backup Codes",
  downloadCodes: "Download TXT",
  copyCodes: "Copy Codes",
  printCodes: "Print Codes",
  disable2FA: "Disable 2FA",
  confirmDisable2FAPrompt: "Enter your 6-digit code or account password to disable 2FA protection:",
  step1Header: "Step 1: Scan QR Code with Authenticator App",
  step1Desc: "Open your preferred authenticator app (Google Authenticator, Microsoft Authenticator, or 1Password) and scan the QR code below:",
  step2Header: "Step 2: Verify 6-Digit Authenticator Code",
  step2Desc: "Enter the temporary 6-digit verification code generated by your app to verify synchronization:",
  step3Header: "Step 3: Save Emergency Recovery Codes",
  step3Desc: "Keep these single-use recovery codes in a secure location. You cannot view them again after leaving this screen.",
  ackBackupSaved: "I have securely copied or downloaded my emergency recovery codes.",

  // Toast notifications
  toastExportSuccess: "Personal profile data exported successfully!",
  toastProfileUpdatedSuccess: "Profile updated and synchronized successfully!",
  toastSignOutSuccess: "Signed out successfully.",

  // Common Controls
  saveChanges: "Save Changes",
  cancel: "Cancel",
  close: "Close",
  loading: "Loading...",
  saving: "Saving...",
};
