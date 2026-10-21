/**
 * Retail POS Route Detection Utility
 *
 * Reliably detects whether the current path is the Retail Point of Sale (POS) screen.
 * Handles:
 * - Standard web routes: '/retail/pos', '/retail/pos/'
 * - Ralion desktop & nested routes: '/ralion/retail/pos', 'file:///.../retail/pos'
 * - Query strings and hashes: '/retail/pos?admin_inspect=true#checkout'
 * - Negative matches: '/retail', '/retail/inventory', '/retail/quotations', '/retail/reports', etc.
 */

export function isRetailPosRoute(pathname: string | null | undefined): boolean {
  if (!pathname || typeof pathname !== 'string') return false;

  // Strip query string and hash fragment
  const clean = pathname.split('?')[0].split('#')[0].trim();

  // Normalize slashes (convert backslashes if on windows desktop paths, trim trailing slashes)
  const normalized = clean.replace(/\\/g, '/').replace(/\/+$/, '');

  // Exact matching for web and app variations
  return (
    normalized === '/retail/pos' ||
    normalized === '/ralion/retail/pos' ||
    normalized.endsWith('/retail/pos')
  );
}
