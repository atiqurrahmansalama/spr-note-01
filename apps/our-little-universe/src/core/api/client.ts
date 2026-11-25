/**
 * Shared Auth HTTP Client Instance for Our Little Universe.
 * Reuses createAuthHttpClient & ApiError from @repo/utils.
 */
import { ApiError, createAuthHttpClient } from '@repo/utils';

export { ApiError };

const envBase = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE_URL;
const baseUrl = envBase ? envBase.replace(/\/$/, '') : '';

const client = createAuthHttpClient({
  tokenStorageKey: 'olu_auth_tokens_v1',
  refreshEndpoint: '/api/v1/auth/token/refresh/',
  baseUrl,
});

export const universeRequest = client.request;
export const readStoredTokens = client.getTokens;
export const saveStoredTokens = client.setTokens;
