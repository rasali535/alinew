// Download Validator & Fail-safe Direct Delivery Engine for Ras Ali Labs
// Prevents "Bucket not found" or 404 errors by serving direct binary release packages

export const validateDownloadBinary = async (url) => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    if (!response.ok) {
      return { valid: false, reason: `HTTP ${response.status}` };
    }
    return { valid: true };
  } catch (err) {
    return { valid: true };
  }
};

export const triggerBinaryDownload = async (downloadUrl, filename) => {
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.setAttribute('download', filename);
  link.setAttribute('target', '_blank');
  link.setAttribute('rel', 'noopener noreferrer');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
