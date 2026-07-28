// Versioned Release Management Data Layer for Ralion Desktop
import releasesData from '../../public/ralion-releases.json';

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
  return releasesData.currentVersion || '2.4.1';
};

export const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};
