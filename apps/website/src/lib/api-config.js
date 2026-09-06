/**
 * Ras Ali Labs — Website Central API Configuration & Routing Helper
 * 
 * Establishes one authoritative production dynamic backend URL.
 * Guarantees NO fallback to legacy dead backends (alinew.onrender.com).
 */

export const AUTHORITATIVE_PROD_API = 'https://ralion-dynamic-backend.onrender.com';

/**
 * Returns the resolved dynamic API base URL.
 */
export function getApiBase() {
  // 1. Check explicit build-time or runtime environment variables
  let configuredUrl =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.NEXT_PUBLIC_RALION_API_URL ||
    import.meta.env.NEXT_PUBLIC_API_URL;

  // Reject undefined string or legacy dead endpoints
  if (configuredUrl) {
    configuredUrl = configuredUrl.trim();
    if (
      configuredUrl === 'undefined' ||
      configuredUrl === 'null' ||
      configuredUrl === '' ||
      configuredUrl.includes('alinew.onrender.com')
    ) {
      configuredUrl = null;
    }
  }

  if (configuredUrl) {
    if (!configuredUrl.startsWith('http')) {
      configuredUrl = `https://${configuredUrl}`;
    }
    return configuredUrl.replace(/\/+$/, '');
  }

  // 2. Local development fallback
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.');
    if (isLocal) {
      const port = window.location.port;
      if (port === '6509' || port === '3000') {
        return window.location.origin;
      }
      return 'http://localhost:6509';
    }
  }

  // 3. Authoritative production dynamic backend
  return AUTHORITATIVE_PROD_API;
}

/**
 * Resolves a full canonical endpoint URL.
 * Example: getApiUrl('/api/mari/chat') -> 'https://ralion-dynamic-backend.onrender.com/api/mari/chat'
 */
export function getApiUrl(path = '') {
  const base = getApiBase();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}
