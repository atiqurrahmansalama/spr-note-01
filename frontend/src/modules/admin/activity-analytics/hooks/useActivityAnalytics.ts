import { useState, useEffect, useMemo, useCallback } from 'react';
import { useToast } from '../../../../context/ToastContext';
import { fetchWithAuth } from '../../../../utils/authService';
import {
  UserActivityRecord,
  ActivityAnalyticsSummary,
  ActivityFilterState,
  ActivityMetrics,
  DatePreset,
} from '../types';
import { useActivityTranslation } from './useActivityTranslation';

const STORAGE_KEY_ACTIVITY_VIEW_MODE = 'spr_activity_analytics_view_mode';

const formatLocalDate = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const computePresetDates = (preset: DatePreset): { from_date: string; to_date: string } => {
  const now = new Date();
  const todayStr = formatLocalDate(now);

  if (preset === 'today') {
    return { from_date: todayStr, to_date: todayStr };
  }
  if (preset === '7d') {
    const past = new Date();
    past.setDate(past.getDate() - 7);
    return { from_date: formatLocalDate(past), to_date: todayStr };
  }
  if (preset === '30d') {
    const past = new Date();
    past.setDate(past.getDate() - 30);
    return { from_date: formatLocalDate(past), to_date: todayStr };
  }
  if (preset === 'all') {
    return { from_date: '', to_date: '' };
  }
  return { from_date: '', to_date: '' };
};

export const useActivityAnalytics = () => {
  const { showToast } = useToast();
  const { t } = useActivityTranslation();

  const [analyticsData, setAnalyticsData] = useState<UserActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ActivityAnalyticsSummary>({
    total_users_tracked: 0,
    total_active_minutes_all_users: 0,
  });

  const [viewMode, setViewMode] = useState<'table' | 'grid'>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACTIVITY_VIEW_MODE);
      if (saved === 'grid' || saved === 'table') return saved;
    } catch {
      // Ignore
    }
    return 'table';
  });

  const [filters, setFilters] = useState<ActivityFilterState>(() => {
    const dates = computePresetDates('30d');
    return {
      search: '',
      user_type: 'ALL',
      device_type: 'ALL',
      datePreset: '30d',
      from_date: dates.from_date,
      to_date: dates.to_date,
    };
  });

  // 1. Fetch Analytics Data
  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.from_date) params.append('from_date', filters.from_date);
      if (filters.to_date) params.append('to_date', filters.to_date);
      if (filters.user_type && filters.user_type !== 'ALL') {
        params.append('user_type', filters.user_type);
      }
      if (filters.device_type && filters.device_type !== 'ALL') {
        params.append('device_type', filters.device_type);
      }

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const res = await fetchWithAuth(`/api/v1/analytics/user-activity/${queryString}`);

      if (res.ok) {
        const json = await res.json();
        const records: UserActivityRecord[] = json.data || [];
        setAnalyticsData(records);
        setSummary({
          total_users_tracked: json.summary?.total_users_tracked || records.length || 0,
          total_active_minutes_all_users: json.summary?.total_active_minutes_all_users || 0,
        });
      } else {
        showToast(t('toasts.loadError', 'Failed to load activity analytics data.'), 'error');
      }
    } catch {
      showToast(t('toasts.loadError', 'Failed to load activity analytics data.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [filters.from_date, filters.to_date, filters.user_type, filters.device_type, showToast, t]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // 2. View Mode Toggle
  const handleToggleViewMode = useCallback((mode: 'table' | 'grid') => {
    setViewMode(mode);
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVITY_VIEW_MODE, mode);
    } catch {
      // Ignore
    }
  }, []);

  // 3. Filter Controls
  const updateFilters = useCallback((updates: Partial<ActivityFilterState>) => {
    setFilters((prev) => {
      const next = { ...prev, ...updates };

      // If date preset changed to a standard option, auto-fill from_date and to_date
      if (updates.datePreset && updates.datePreset !== 'custom') {
        const computed = computePresetDates(updates.datePreset);
        next.from_date = computed.from_date;
        next.to_date = computed.to_date;
      }
      return next;
    });
  }, []);

  const resetFilters = useCallback(() => {
    const dates = computePresetDates('30d');
    setFilters({
      search: '',
      user_type: 'ALL',
      device_type: 'ALL',
      datePreset: '30d',
      from_date: dates.from_date,
      to_date: dates.to_date,
    });
  }, []);

  const hasActiveFilters = useMemo(
    () =>
      Boolean(
        filters.search.trim() ||
          filters.user_type !== 'ALL' ||
          filters.device_type !== 'ALL' ||
          filters.datePreset !== '30d'
      ),
    [filters]
  );

  // 4. In-Memory Filtered Records
  const filteredData = useMemo(() => {
    if (!filters.search.trim()) return analyticsData;
    const query = filters.search.toLowerCase().trim();

    return analyticsData.filter((item) => {
      const matchesName = (item.name || '').toLowerCase().includes(query);
      const matchesPhone = (item.phone_number || '').includes(query);
      const matchesRole = (item.user_type || '').toLowerCase().includes(query);
      return matchesName || matchesPhone || matchesRole;
    });
  }, [analyticsData, filters.search]);

  // 5. Aggregate Metrics
  const metrics: ActivityMetrics = useMemo(() => {
    let activeSessionsCount = 0;
    let totalSessionsAll = 0;
    let calculatedMinutes = 0;

    analyticsData.forEach((item) => {
      calculatedMinutes += item.total_active_duration_minutes || 0;
      totalSessionsAll += item.sessions_count || 0;
      if (Array.isArray(item.time_windows)) {
        item.time_windows.forEach((win) => {
          if (win.is_active) activeSessionsCount += 1;
        });
      }
    });

    const totalMinutes = summary.total_active_minutes_all_users || calculatedMinutes;
    const avgDuration = totalSessionsAll > 0 ? Math.round(totalMinutes / totalSessionsAll) : 0;

    return {
      totalUsersTracked: summary.total_users_tracked || analyticsData.length,
      totalActiveMinutes: totalMinutes,
      avgSessionDuration: avgDuration,
      activeSessionsCount,
    };
  }, [analyticsData, summary]);

  // 6. CSV Export
  const exportCsv = useCallback(() => {
    try {
      const headers = [
        'User ID',
        'Name',
        'Phone Number',
        'Role / Type',
        'Total Active Minutes',
        'Formatted Duration',
        'Sessions Count',
        'Last Active',
      ];

      const rows = filteredData.map((item) => [
        item.user_id,
        `"${(item.name || '').replace(/"/g, '""')}"`,
        `"${(item.phone_number || '').replace(/"/g, '""')}"`,
        `"${(item.user_type || '').replace(/"/g, '""')}"`,
        item.total_active_duration_minutes || 0,
        `"${item.formatted_active_duration || ''}"`,
        item.sessions_count || 0,
        item.last_active || '—',
      ]);

      const csvContent =
        'data:text/csv;charset=utf-8,' +
        [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute(
        'download',
        `user_activity_report_${new Date().toISOString().split('T')[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast(t('export.exportSuccess', 'Activity report exported successfully.'), 'success');
    } catch {
      // Ignore
    }
  }, [filteredData, showToast, t]);

  return {
    analyticsData,
    filteredData,
    loading,
    summary,
    metrics,
    viewMode,
    filters,
    hasActiveFilters,
    updateFilters,
    resetFilters,
    handleToggleViewMode,
    loadAnalytics,
    exportCsv,
  };
};

export default useActivityAnalytics;
