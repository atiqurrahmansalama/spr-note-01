import { useState, useEffect } from "react";
import { useToast } from "../../context/ToastContext";
import { fetchWithAuth, logoutUser } from "../../utils/authService";
import { auth as authStore, multiAccount } from "../../utils/localStore";
import { useFeatureControl } from "../../context/FeatureControlContext";

import ProfileHeroCard from "./components/ProfileHeroCard";
import ProfileOptionGroup from "./components/ProfileOptionGroup";
import ProfileOptionRow from "./components/ProfileOptionRow";

import EditProfileModal from "./modals/EditProfileModal";
import ChangePasswordModal from "./modals/ChangePasswordModal";
import ActiveSessionsModal from "./modals/ActiveSessionsModal";
import SecurityLogsModal from "./modals/SecurityLogsModal";
import AccountSwitcherModal from "./modals/AccountSwitcherModal";
import QRSyncModal from "./modals/QRSyncModal";
import Setup2FAModal from "./modals/Setup2FAModal";
import PasskeysModal from "./modals/PasskeysModal";

import {
  KeyRoundIcon,
  SmartphoneIcon,
  ShieldCheckIcon,
  DownloadIcon,
  LogOutIcon,
  LockIcon,
  UserCheckIcon,
} from "../../components/ui/Icons";

export default function ProfileSettingsView() {
  const { showToast } = useToast();
  const { isSectionEnabled } = useFeatureControl();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal open states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [showSecurityLogsModal, setShowSecurityLogsModal] = useState(false);
  const [showAccountSwitcherModal, setShowAccountSwitcherModal] = useState(false);
  const [showQRSyncModal, setShowQRSyncModal] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [showPasskeysModal, setShowPasskeysModal] = useState(false);

  // Security Status States
  const [savedAccountsCount, setSavedAccountsCount] = useState(1);
  const [passkeysCount, setPasskeysCount] = useState(0);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [googleLinked, setGoogleLinked] = useState(false);
  const [googleSubId, setGoogleSubId] = useState("");

  useEffect(() => {
    loadUserProfile();

    const handleAuthUpdate = () => {
      loadUserProfile();
    };
    window.addEventListener("spr_auth_updated", handleAuthUpdate);
    return () => window.removeEventListener("spr_auth_updated", handleAuthUpdate);
  }, []);

  const loadUserProfile = async () => {
    setLoading(true);
    try {
      let res = await fetchWithAuth("/api/v1/auth/profile/");
      if (!res.ok) {
        res = await fetchWithAuth("/api/v1/user/profile/");
      }

      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setIs2FAEnabled(!!data.is_2fa_enabled);
        setGoogleLinked(!!data.has_google_linked);
        setGoogleSubId(data.google_sub_id || "");
        setPasskeysCount(data.passkeys_count || 0);
      } else {
        const localUser = authStore.getUser() || {};
        setUser(localUser);
      }

      const saved = multiAccount.getAccounts() || [];
      setSavedAccountsCount(Math.max(1, saved.length));
    } catch {
      const localUser = authStore.getUser() || {};
      setUser(localUser);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleToggle = async () => {
    if (googleLinked) {
      if (!window.confirm("Are you sure you want to disconnect your Google Account?")) return;
      try {
        const res = await fetchWithAuth("/api/v1/auth/google/unlink/", { method: "POST" });
        if (res.ok) {
          showToast("Google account unlinked successfully.", "info");
          setGoogleLinked(false);
          setGoogleSubId("");
        } else {
          const data = await res.json();
          showToast(data.error || "Cannot disconnect Google account.", "error");
        }
      } catch {
        showToast("Failed unlinking Google account.", "error");
      }
    } else {
      try {
        const res = await fetchWithAuth("/api/v1/auth/google/link/", { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          showToast("Google account linked successfully!", "success");
          setGoogleLinked(true);
          setGoogleSubId(data.google_sub_id || "google_account");
        } else {
          showToast("Failed linking Google account.", "error");
        }
      } catch {
        showToast("Error linking Google account.", "error");
      }
    }
  };

  const handleExportData = () => {
    const archiveData = {
      export_date: new Date().toISOString(),
      user: user || {},
      settings_version: "1.0.0",
    };

    const blob = new Blob([JSON.stringify(archiveData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `profile_data_${new Date().toISOString().split("T")[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("Exported personal profile archive to JSON!", "success");
  };

  const handleSignOut = () => {
    if (window.confirm("Are you sure you want to sign out of your account?")) {
      logoutUser();
      window.location.reload();
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto py-8 px-4 sm:px-6 space-y-6 font-sans animate-pulse">
        <div className="h-44 theme-bg-surface border theme-border rounded-2xl" />
        <div className="h-48 theme-bg-surface border theme-border rounded-2xl" />
        <div className="h-48 theme-bg-surface border theme-border rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto py-8 px-4 sm:px-6 space-y-6 font-sans theme-text-primary animate-fade-in select-none">
      {/* 1. Profile Hero Card */}
      <ProfileHeroCard
        user={user}
        onEditProfile={() => setShowEditModal(true)}
        onChangeAvatar={() => setShowEditModal(true)}
      />

      {/* 2. Group 1: Identity & Connected Accounts */}
      <ProfileOptionGroup title="Identity &amp; Connected Accounts">
        <ProfileOptionRow
          icon={<UserCheckIcon />}
          title="Google Account Binding"
          subtitle={googleLinked ? `Connected (${user?.email || "Google Account"})` : "Bind Google profile for instant sign in"}
          badgeText={googleLinked ? "Connected" : "Not Connected"}
          badgeStyle={googleLinked ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-zinc-800 text-zinc-400 border border-zinc-700"}
          onClick={handleGoogleToggle}
        />

        {isSectionEnabled("settings_security") && (
          <ProfileOptionRow
            icon={<LockIcon />}
            title="Two-Factor Authentication (2FA)"
            subtitle="Protect account with Google Authenticator or Authy"
            badgeText={is2FAEnabled ? "Enabled" : "Disabled"}
            badgeStyle={is2FAEnabled ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-zinc-800 text-zinc-400 border border-zinc-700"}
            onClick={() => setShow2FAModal(true)}
          />
        )}
      </ProfileOptionGroup>

      {/* 3. Group 2: Multi-Account & Quick Access */}
      <ProfileOptionGroup title="Multi-Account &amp; Quick Access">
        <ProfileOptionRow
          icon={<UserCheckIcon />}
          title="Switch or Add Account"
          subtitle="Manage saved accounts and active user profiles"
          badgeText={`${savedAccountsCount} Account${savedAccountsCount > 1 ? "s" : ""} Saved`}
          badgeStyle="theme-bg-accent-soft theme-accent border theme-border"
          onClick={() => setShowAccountSwitcherModal(true)}
        />

        <ProfileOptionRow
          icon={<SmartphoneIcon />}
          title="Scan QR to Login Elsewhere"
          subtitle="Log into another device instantly without typing password"
          badgeText="Instant Sync"
          badgeStyle="bg-sky-500/10 text-sky-400 border border-sky-500/20"
          onClick={() => setShowQRSyncModal(true)}
        />

        {isSectionEnabled("settings_security") && (
          <ProfileOptionRow
            icon={<KeyRoundIcon />}
            title="Passkeys &amp; Biometrics"
            subtitle="Passwordless login using Windows Hello or Touch ID"
            badgeText={`${passkeysCount} Registered Key${passkeysCount !== 1 ? "s" : ""}`}
            badgeStyle="bg-purple-500/10 text-purple-400 border border-purple-500/20"
            onClick={() => setShowPasskeysModal(true)}
          />
        )}
      </ProfileOptionGroup>

      {/* 4. Group 3: Security & Device Management */}
      {isSectionEnabled("settings_security") && (
        <ProfileOptionGroup title="Security &amp; Device Management">
          <ProfileOptionRow
            icon={<KeyRoundIcon />}
            title="Change Password"
            subtitle="Update account security credentials"
            onClick={() => setShowPasswordModal(true)}
          />

          <ProfileOptionRow
            icon={<SmartphoneIcon />}
            title="Active Devices &amp; Sessions"
            subtitle="View and revoke logged in devices"
            badgeText="Active"
            badgeStyle="theme-bg-accent-soft theme-accent border theme-border"
            onClick={() => setShowSessionsModal(true)}
          />

          <ProfileOptionRow
            icon={<ShieldCheckIcon />}
            title="Security &amp; Activity Logs"
            subtitle="View recent account logins &amp; events"
            onClick={() => setShowSecurityLogsModal(true)}
          />
        </ProfileOptionGroup>
      )}

      {/* 5. Danger Zone / System Actions */}
      <ProfileOptionGroup title="Danger Zone / System Actions">
        {isSectionEnabled("settings_backup") && (
          <ProfileOptionRow
            icon={<DownloadIcon />}
            title="Export Account Data"
            subtitle="Download profile JSON archive"
            onClick={handleExportData}
          />
        )}

        <ProfileOptionRow
          icon={<LogOutIcon />}
          title="Sign Out of Account"
          subtitle="Safely terminate current session"
          isDanger={true}
          onClick={handleSignOut}
        />
      </ProfileOptionGroup>

      {/* Modals */}
      <EditProfileModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        user={user}
        onProfileUpdated={(updated) => setUser(updated)}
      />

      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />

      <ActiveSessionsModal
        isOpen={showSessionsModal}
        onClose={() => setShowSessionsModal(false)}
      />

      <SecurityLogsModal
        isOpen={showSecurityLogsModal}
        onClose={() => setShowSecurityLogsModal(false)}
      />

      <AccountSwitcherModal
        isOpen={showAccountSwitcherModal}
        onClose={() => setShowAccountSwitcherModal(false)}
      />

      <QRSyncModal
        isOpen={showQRSyncModal}
        onClose={() => setShowQRSyncModal(false)}
      />

      <Setup2FAModal
        isOpen={show2FAModal}
        onClose={() => setShow2FAModal(false)}
        is2FAEnabled={is2FAEnabled}
        onStatusChanged={(enabled) => setIs2FAEnabled(enabled)}
      />

      <PasskeysModal
        isOpen={showPasskeysModal}
        onClose={() => setShowPasskeysModal(false)}
        onPasskeysUpdated={(count) => setPasskeysCount(count)}
      />
    </div>
  );
}
