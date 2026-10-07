'use client';

const DASHBOARD_CACHE_TTL_MS = 5 * 60 * 1000;
const DASHBOARD_CACHE_PREFIX = 'ralion_dashboard_overview_v1:';

export type DashboardOverviewCache<T> = {
  savedAt: number;
  overview: T;
};

export function readDashboardOverviewCache<T>(workspaceId: string): T | null {
  if (typeof window === 'undefined' || !workspaceId) return null;
  try {
    const raw = window.localStorage.getItem(`${DASHBOARD_CACHE_PREFIX}${workspaceId}`);
    if (!raw) return null;
    const cached = JSON.parse(raw) as DashboardOverviewCache<T>;
    if (!cached?.overview || !cached?.savedAt) return null;
    if (Date.now() - Number(cached.savedAt) > DASHBOARD_CACHE_TTL_MS) {
      window.localStorage.removeItem(`${DASHBOARD_CACHE_PREFIX}${workspaceId}`);
      return null;
    }
    return cached.overview;
  } catch {
    return null;
  }
}

export function writeDashboardOverviewCache<T>(workspaceId: string, overview: T): void {
  if (typeof window === 'undefined' || !workspaceId || !overview) return;
  try {
    window.localStorage.setItem(
      `${DASHBOARD_CACHE_PREFIX}${workspaceId}`,
      JSON.stringify({ savedAt: Date.now(), overview })
    );
  } catch {}
}
