'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { fetchRalionApi } from '@/lib/api-config';
import { AlertCircle, RefreshCw, Loader2, Image as ImageIcon } from 'lucide-react';

interface SignedUrlCacheEntry {
  signedUrl: string;
  expiresAt: number; // Unix timestamp ms
}

const signedUrlCache = new Map<string, SignedUrlCacheEntry>();

/**
 * Resolves a secure short-lived signed delivery URL for a creative asset.
 */
export async function resolveSecureAssetUrl(assetIdOrPath: string): Promise<string | null> {
  if (!assetIdOrPath) return null;

  // Direct base64, blob, or already fully-qualified signed URLs
  if (
    assetIdOrPath.startsWith('data:') ||
    assetIdOrPath.startsWith('blob:') ||
    (assetIdOrPath.startsWith('http') && assetIdOrPath.includes('token='))
  ) {
    return assetIdOrPath;
  }

  // Extract canonical asset ID or filename
  let cleanId = assetIdOrPath;
  if (cleanId.includes('/api/creatives/file/')) {
    cleanId = cleanId.split('/api/creatives/file/')[1] || cleanId;
  } else if (cleanId.includes('/api/creatives/')) {
    cleanId = cleanId.split('/api/creatives/')[1]?.split('/')[0] || cleanId;
  }
  cleanId = cleanId.split('?')[0];

  // Check in-memory cache (with 60-second safety buffer before expiration)
  const cached = signedUrlCache.get(cleanId);
  if (cached && cached.expiresAt > Date.now() + 60000) {
    return cached.signedUrl;
  }

  try {
    const deliveryEndpoint = `/api/creatives/${encodeURIComponent(cleanId)}/delivery`;
    const res = await fetchRalionApi<{ success: boolean; signedUrl: string; expiresAt?: string }>(deliveryEndpoint);
    if (!res.ok || !res.data) return null;

    const data = res.data;
    if (data.success && data.signedUrl) {
      const expiresAt = data.expiresAt ? new Date(data.expiresAt).getTime() : Date.now() + 14 * 60 * 1000;
      signedUrlCache.set(cleanId, {
        signedUrl: data.signedUrl,
        expiresAt,
      });
      return data.signedUrl;
    }
  } catch (err) {
    console.warn('[SecureMedia] Delivery resolution notice:', err);
  }

  return null;
}

/**
 * React hook to retrieve and automatically refresh a secure delivery URL.
 */
export function useSecureMediaUrl(assetIdOrPath?: string) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(assetIdOrPath));
  const [error, setError] = useState<string | null>(null);
  const [retryAttempts, setRetryAttempts] = useState<number>(0);

  // Clear stale URLs and reset state immediately when the target asset changes
  useEffect(() => {
    setUrl(null);
    setError(null);
    setRetryAttempts(0);
    setLoading(Boolean(assetIdOrPath));
  }, [assetIdOrPath]);

  const fetchUrl = useCallback(async (isRetry = false) => {
    if (!assetIdOrPath) {
      setUrl(null);
      setLoading(false);
      setError(null);
      return;
    }

    // Guard against infinite retry loops (maximum 2 retries per asset)
    if (isRetry && retryAttempts >= 2) {
      setError('Unable to load secure creative media after retries.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const resolved = await resolveSecureAssetUrl(assetIdOrPath);
    if (resolved) {
      setUrl(resolved);
      setError(null);
    } else {
      setError('Unable to load secure creative media.');
    }
    setLoading(false);
    if (isRetry) {
      setRetryAttempts((prev) => prev + 1);
    }
  }, [assetIdOrPath, retryAttempts]);

  useEffect(() => {
    fetchUrl(false);
  }, [assetIdOrPath]); // Only re-fetch when target asset changes

  return {
    url,
    loading,
    error,
    refresh: () => fetchUrl(true),
    canRetry: retryAttempts < 2,
  };
}

export interface SecureImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  assetId?: string;
  fallbackPrompt?: string;
  onRefresh?: () => void;
}

/**
 * SecureImage: Authenticated image component that fetches and renders signed Supabase URLs.
 */
export function SecureImage({
  assetId,
  src,
  alt = 'Creative Asset',
  className = '',
  fallbackPrompt,
  ...props
}: SecureImageProps) {
  const target = assetId || (typeof src === 'string' ? src : '');
  const { url, loading, error, refresh, canRetry } = useSecureMediaUrl(target);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-zinc-950 text-zinc-500 rounded-xl ${className}`}>
        <div className="flex flex-col items-center gap-2 p-4">
          <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
          <span className="text-[10px] font-semibold text-zinc-400">Authenticating media...</span>
        </div>
      </div>
    );
  }

  if (error || !url) {
    return (
      <div className={`flex flex-col items-center justify-center bg-zinc-950/80 border border-zinc-800 text-zinc-400 p-4 rounded-xl text-center gap-2 ${className}`}>
        <AlertCircle className="w-5 h-5 text-amber-400" />
        <span className="text-xs font-bold text-zinc-300">Media unavailable</span>
        {canRetry && (
          <button
            type="button"
            onClick={refresh}
            className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[11px] font-semibold text-zinc-200 flex items-center gap-1.5 transition-all"
          >
            <RefreshCw className="w-3 h-3 text-purple-400" /> Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      className={className}
      onError={() => {
        // If expired or failed, purge cache and attempt single refresh if retries remain
        if (target) signedUrlCache.delete(target);
        if (canRetry) {
          refresh();
        }
      }}
      {...props}
    />
  );
}

export interface SecureVideoProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  assetId?: string;
  posterSrc?: string;
}

/**
 * SecureVideo: Authenticated video player component that loads signed Supabase video URLs.
 */
export function SecureVideo({
  assetId,
  src,
  posterSrc,
  className = '',
  controls = true,
  ...props
}: SecureVideoProps) {
  const target = assetId || (typeof src === 'string' ? src : '');
  const { url, loading, error, refresh, canRetry } = useSecureMediaUrl(target);
  const { url: signedPoster } = useSecureMediaUrl(posterSrc);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-zinc-950 text-zinc-500 rounded-xl ${className}`}>
        <div className="flex flex-col items-center gap-2 p-4">
          <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
          <span className="text-[10px] font-semibold text-zinc-400">Authenticating video stream...</span>
        </div>
      </div>
    );
  }

  if (error || !url) {
    return (
      <div className={`flex flex-col items-center justify-center bg-zinc-950/80 border border-zinc-800 text-zinc-400 p-4 rounded-xl text-center gap-2 ${className}`}>
        <AlertCircle className="w-5 h-5 text-amber-400" />
        <span className="text-xs font-bold text-zinc-300">Video stream unavailable</span>
        {canRetry && (
          <button
            type="button"
            onClick={refresh}
            className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[11px] font-semibold text-zinc-200 flex items-center gap-1.5 transition-all"
          >
            <RefreshCw className="w-3 h-3 text-blue-400" /> Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <video
      src={url}
      poster={signedPoster || undefined}
      controls={controls}
      className={className}
      onError={() => {
        if (target) signedUrlCache.delete(target);
        if (canRetry) {
          refresh();
        }
      }}
      {...props}
    />
  );
}
