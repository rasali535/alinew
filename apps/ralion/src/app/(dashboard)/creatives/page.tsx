'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CreativesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/growth?tab=creatives');
  }, [router]);

  return (
    <div className="flex h-full w-full items-center justify-center bg-zinc-950 text-zinc-400">
      <div className="flex flex-col items-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
        <span className="text-xs font-semibold">Opening Creative Studio...</span>
      </div>
    </div>
  );
}
