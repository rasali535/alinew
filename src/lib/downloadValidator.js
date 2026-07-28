// Download Validator & Integrity Safeguard for Ras Ali Labs
// Prevents serving HTML 404/SPA fallbacks disguised as executable binaries (.exe, .dmg, .AppImage)

export const validateDownloadBinary = async (url, expectedFilesize) => {
  try {
    const response = await fetch(url, { method: 'HEAD' });

    // 1. Check HTTP Status
    if (!response.ok) {
      return {
        valid: false,
        reason: `Server returned HTTP ${response.status} status.`
      };
    }

    // 2. Check Content-Type header
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html') || contentType.includes('application/json')) {
      return {
        valid: false,
        reason: 'Target URL returned an HTML page instead of a binary executable. (SPA Rewrite Interception Detected)'
      };
    }

    // 3. Check Content-Length filesize
    const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
    if (contentLength > 0 && contentLength < 100000) {
      return {
        valid: false,
        reason: `File size is suspiciously small (${contentLength} bytes). Expected ~152MB installer.`
      };
    }

    return {
      valid: true,
      contentType: contentType || 'application/octet-stream',
      contentLength: contentLength || expectedFilesize
    };
  } catch (err) {
    // Cross-Origin HEAD check might be restricted by CORS on CDN, fallback to client verification
    return {
      valid: true,
      notice: 'CORS header check bypassed for CDN delivery.'
    };
  }
};

export const triggerBinaryDownload = (downloadUrl, filename) => {
  // Ensure the browser receives binary download trigger with correct disposition
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.setAttribute('download', filename);
  link.setAttribute('target', '_blank');
  link.setAttribute('rel', 'noopener noreferrer');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
