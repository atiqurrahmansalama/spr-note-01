/**
 * Version Control & Release Management Service
 * -----------------------------------------------------------------------------
 * Communicates with backend Version Registry and Handshake endpoints.
 */

import { fetchWithAuth } from '@/utils/authService';
import { CURRENT_APP_VERSION, CURRENT_BUILD_NUMBER, CURRENT_RELEASE_CHANNEL } from '../config';
import type { AppRelease, VersionCheckResponse, CreateReleasePayload } from '../types';

export const versionService = {
  /**
   * Performs real-time version handshake against backend registry.
   */
  async checkVersion(params?: {
    version?: string;
    build?: number;
    channel?: string;
    platform?: string;
  }): Promise<VersionCheckResponse> {
    const v = params?.version || CURRENT_APP_VERSION;
    const b = params?.build || CURRENT_BUILD_NUMBER;
    const c = params?.channel || CURRENT_RELEASE_CHANNEL;
    const p = params?.platform || 'WEB';

    const query = new URLSearchParams({
      version: String(v),
      build: String(b),
      channel: String(c),
      platform: String(p),
    });

    const res = await fetchWithAuth(`/api/v1/system/version/?${query.toString()}`);
    if (!res.ok) {
      throw new Error(`Version check failed with status ${res.status}`);
    }
    return res.json();
  },

  /**
   * Fetches all registered releases for the administrative console.
   */
  async getReleases(params?: { channel?: string }): Promise<AppRelease[]> {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    const res = await fetchWithAuth(`/api/v1/system/releases/${query}`);
    if (!res.ok) {
      throw new Error(`Failed to load releases with status ${res.status}`);
    }
    const data = await res.json();
    return Array.isArray(data) ? data : data.results || [];
  },

  async listReleases(params?: { channel?: string }): Promise<AppRelease[]> {
    return this.getReleases(params);
  },

  /**
   * Creates a new release draft or immediate published version.
   */
  async createRelease(payload: CreateReleasePayload): Promise<AppRelease> {
    const res = await fetchWithAuth('/api/v1/system/releases/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.error || 'Failed to create release');
    }
    return res.json();
  },

  /**
   * Updates an existing release metadata.
   */
  async updateRelease(id: string, payload: Partial<CreateReleasePayload>): Promise<AppRelease> {
    const res = await fetchWithAuth(`/api/v1/system/releases/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.error || 'Failed to update release');
    }
    return res.json();
  },

  /**
   * Publishes a release to make it active for all clients.
   */
  async publishRelease(id: string): Promise<AppRelease> {
    const res = await fetchWithAuth(`/api/v1/system/releases/${id}/publish/`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.error || 'Failed to publish release');
    }
    const data = await res.json();
    return data.release;
  },

  /**
   * Retracts a published release back to draft.
   */
  async unpublishRelease(id: string): Promise<AppRelease> {
    const res = await fetchWithAuth(`/api/v1/system/releases/${id}/unpublish/`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.error || 'Failed to unpublish release');
    }
    const data = await res.json();
    return data.release;
  },

  /**
   * Permanently deletes a release record.
   */
  async deleteRelease(id: string): Promise<void> {
    const res = await fetchWithAuth(`/api/v1/system/releases/${id}/`, {
      method: 'DELETE',
    });
    if (!res.ok && res.status !== 204) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.error || 'Failed to delete release');
    }
  },
};
