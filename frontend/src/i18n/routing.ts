/**
 * SPR Note — Localized Route Path Utilities
 * =========================================
 * Utilities for URL-based language prefix parsing and path synthesis.
 */

import type { LanguageCode } from './types';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from './constants';

const VALID_CODES = new Set(SUPPORTED_LANGUAGES.map((l) => l.code));

/**
 * Extracts the language code from a URL pathname if present.
 * Example: "/bn/students" -> "bn", "/students" -> null
 */
export function getLanguageFromPath(pathname: string): LanguageCode | null {
  if (!pathname) return null;
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0) {
    const first = segments[0].toLowerCase();
    if (VALID_CODES.has(first as LanguageCode)) {
      return first as LanguageCode;
    }
  }
  return null;
}

/**
 * Strips the language prefix from a pathname.
 * Example: "/bn/students/123" -> "/students/123", "/ar" -> "/"
 */
export function stripLanguagePrefix(pathname: string): string {
  if (!pathname) return '/';
  const lang = getLanguageFromPath(pathname);
  if (!lang) return pathname.startsWith('/') ? pathname : `/${pathname}`;

  const clean = pathname.replace(new RegExp(`^/${lang}(/|$)`), '/');
  return clean.startsWith('/') ? clean : `/${clean}`;
}

/**
 * Constructs a localized URL pathname for a target language.
 * Example: buildLocalizedPath('/students', 'bn') -> '/bn/students'
 */
export function buildLocalizedPath(
  pathname: string,
  targetLang: LanguageCode,
  includeDefaultPrefix = false
): string {
  const cleanPath = stripLanguagePrefix(pathname);
  if (targetLang === DEFAULT_LANGUAGE && !includeDefaultPrefix) {
    return cleanPath;
  }
  const prefix = `/${targetLang}`;
  return cleanPath === '/' ? prefix : `${prefix}${cleanPath}`;
}
