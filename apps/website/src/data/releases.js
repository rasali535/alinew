// Versioned Release Management & Supabase Integration Data Layer for Ralion
import releasesData from './ralion-releases.json';
import { supabase } from '../lib/supabase';

export const getLatestRelease = (platform = 'Windows') => {
  return (
    releasesData.releases.find(
      (r) => r.platform.toLowerCase() === platform.toLowerCase() && r.enabled
    ) || releasesData.releases[0]
  );
};

export const getAllReleases = () => {
  return releasesData.releases.filter((r) => r.enabled);
};

export const getCurrentVersion = () => {
  return releasesData.currentVersion || '2.4.2';
};

// Phase 2: Fetch release information dynamically from Supabase database
export const fetchLatestReleaseFromSupabase = async (productName = 'Ralion', platform = 'Windows') => {
  // Temporary: Use static Hostinger downloads instead of Supabase
  return getLatestRelease(platform);
};

export const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};
