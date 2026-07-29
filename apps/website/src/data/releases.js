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
  try {
    const { data, error } = await supabase
      .from('releases')
      .select('*')
      .eq('product_name', productName)
      .eq('is_latest', true)
      .ilike('platform', `%${platform}%`)
      .maybeSingle();

    if (error || !data) {
      return getLatestRelease(platform);
    }

    return {
      product_name: data.product_name || 'Ralion',
      version: data.version || '2.4.1',
      platform: data.platform || platform,
      architecture: data.architecture || 'x64',
      download_url: data.file_url || data.download_url,
      filesizeFormatted: data.file_size || '152 MB',
      checksum: data.checksum || '',
      release_notes: data.release_notes || ['Ralion v2.4.1 Release']
    };
  } catch (err) {
    return getLatestRelease(platform);
  }
};

export const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};
