import { auth as authStore } from '../../../../utils/localStore';
import { UserRecord } from '../types';

/**
 * Enterprise Presence Engine
 * Evaluates whether a user is currently online and active in the application.
 *
 * Rules:
 * 1. Deactivated/disabled accounts are always marked inactive/offline.
 * 2. The active logged-in user on this client is evaluated as online.
 * 3. Server-side session heartbeat or is_online flag confirms live presence.
 * 4. Fallback: recent last_activity within the last 5 minutes.
 */
export function isUserOnline(user: UserRecord): boolean {
  if (user.is_active === false || user.is_deactivated) {
    return false;
  }

  // 1. Current user on this client is active right now
  try {
    const current = authStore.getUser();
    if (current) {
      if (current.id && String(current.id) === String(user.id)) return true;
      if (current.phone_number && user.phone_number && current.phone_number === user.phone_number) return true;
      if (current.email && user.email && current.email.toLowerCase() === user.email.toLowerCase()) return true;
    }
  } catch {
    // Ignore storage read errors
  }

  // 2. Direct server-provided real-time presence flag
  if (user.is_online === true) {
    return true;
  }

  // 3. Fallback: recent activity timestamp within 5 minutes
  if (user.last_activity) {
    try {
      const diffMs = Date.now() - new Date(user.last_activity).getTime();
      return diffMs >= 0 && diffMs <= 5 * 60 * 1000;
    } catch {
      // Ignore date parsing errors
    }
  }

  return false;
}
