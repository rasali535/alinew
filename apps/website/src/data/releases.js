// Versioned Release Management data layer for Ralion OS
import releasesData from './ralion-releases.json';

export const getLatestRelease = (platform = 'Windows') => {
  return (
    releasesData.releases.find(
      (r) => r.platform.toLowerCase() === platform.toLowerCase() && r.enabled
    ) || releasesData.releases.find((r) => r.enabled) || null
  );
};

export const getAllReleases = () => {
  return releasesData.releases.filter((r) => r.enabled);
};

export const getCurrentVersion = () => {
  return releasesData.currentVersion || '2.4.4';
};

// Kept as the public release lookup seam so the website can move to a remote
// release registry later without changing the download UI.
export const fetchLatestReleaseFromSupabase = async (productName = 'Ralion OS', platform = 'Windows') => {
  void productName;
  return getLatestRelease(platform);
};

export const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};
