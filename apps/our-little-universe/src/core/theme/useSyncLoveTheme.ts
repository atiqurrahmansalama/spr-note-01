import { useCallback } from 'react';
import { useAppTheme } from '@repo/ui';
import { universeRequest } from '../api/client';
import { useAuth } from '../auth/AuthContext';

/**
 * Persists selected Love Theme locally (via AppThemeProvider) and, when signed in as OWNER,
 * asynchronously updates the Space's default active_theme_id on the backend as well.
 */
export function useSyncLoveTheme() {
  const { paletteId, palettes, setPaletteId } = useAppTheme();
  const { user, refreshSession } = useAuth();

  const selectLoveTheme = useCallback(
    (nextPaletteId: string) => {
      setPaletteId(nextPaletteId);
      if (user?.role === 'OWNER') {
        void universeRequest('/api/v1/universe/admin/space/', {
          method: 'PATCH',
          body: JSON.stringify({ active_theme_id: nextPaletteId }),
        })
          .then(() => refreshSession())
          .catch(() => {
            // Local preference remains persisted even if offline or request fails
          });
      }
    },
    [setPaletteId, user?.role, refreshSession]
  );

  return { paletteId, palettes, selectLoveTheme };
}
