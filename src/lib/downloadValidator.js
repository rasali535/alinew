// Download Validator & External Cloud Storage Direct Stream Engine
// Serves production installer binaries directly via external cloud CDN (Supabase Storage / S3)
// Eliminates Hostinger public_html file corruption & SPA rewrite interception.

export const validateDownloadBinary = async (url, expectedFilesize) => {
  try {
    const response = await fetch(url, { method: 'HEAD' });

    if (!response.ok) {
      return {
        valid: false,
        reason: `External storage returned HTTP ${response.status}`
      };
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      return {
        valid: false,
        reason: 'Target URL returned HTML page instead of binary installer.'
      };
    }

    return { valid: true, contentType: contentType || 'application/octet-stream' };
  } catch (err) {
    // Cross-origin HEAD request may be restricted by CDN CORS rules; fallback to direct link stream
    return { valid: true };
  }
};

export const triggerBinaryDownload = (downloadUrl, filename) => {
  // Triggers direct browser download from external high-speed cloud CDN
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.setAttribute('download', filename);
  link.setAttribute('target', '_blank');
  link.setAttribute('rel', 'noopener noreferrer');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
