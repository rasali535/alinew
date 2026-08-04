import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  BusinessProfile, 
  SocialAccountToken, 
  CustomerRecord, 
  SalesDeal, 
  MarketingCampaign, 
  AiMemoryRecord, 
  AiJobRecord 
} from './schema';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ralion-cloud-backbone.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ralion-supabase-anon-key-2026';

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 20
    }
  }
});

/**
 * Storage Buckets Service for Ralion OS
 */
export class SupabaseStorageService {
  static BUCKETS = {
    LOGOS: 'logos',
    AVATARS: 'avatars',
    DOCUMENTS: 'documents',
    IMAGES: 'images',
    VIDEOS: 'videos',
    MARKETING: 'marketing',
    CONTRACTS: 'contracts',
    INVOICES: 'invoices',
    GENERATED_CONTENT: 'generated_content'
  };

  static async uploadAsset(bucket: string, path: string, file: File | Blob): Promise<{ publicUrl: string; error?: string }> {
    try {
      const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
      if (error) return { publicUrl: '', error: error.message };

      const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(data.path);
      return { publicUrl: publicData.publicUrl };
    } catch (e: any) {
      return { publicUrl: '', error: e.message };
    }
  }
}

/**
 * Supabase Realtime Channels for Multi-Device Collaboration
 */
export class SupabaseRealtimeService {
  static subscribeToWorkspace(workspaceId: string, onUpdate: (payload: any) => void) {
    const channel = supabase
      .channel(`workspace:${workspaceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', filter: `workspace_id=eq.${workspaceId}` }, (payload) => {
        onUpdate(payload);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}

/**
 * Offline-First Local Sync Queue
 * When network disconnects, queues database operations locally in localStorage
 * and automatically flushes to Supabase when network connection restores.
 */
export class OfflineSyncQueue {
  private static QUEUE_KEY = 'ralion_offline_sync_queue';

  static enqueue(table: string, action: 'INSERT' | 'UPDATE' | 'DELETE', payload: any) {
    if (typeof window === 'undefined') return;
    const existing = this.getQueue();
    existing.push({ id: Date.now(), table, action, payload, timestamp: new Date().toISOString() });
    localStorage.setItem(this.QUEUE_KEY, JSON.stringify(existing));
  }

  static getQueue(): Array<{ id: number; table: string; action: string; payload: any; timestamp: string }> {
    if (typeof window === 'undefined') return [];
    const item = localStorage.getItem(this.QUEUE_KEY);
    return item ? JSON.parse(item) : [];
  }

  static async flushQueue(): Promise<number> {
    const queue = this.getQueue();
    if (queue.length === 0) return 0;

    let flushedCount = 0;
    const remaining = [];

    for (const task of queue) {
      try {
        if (task.action === 'INSERT') {
          await supabase.from(task.table).insert(task.payload);
        } else if (task.action === 'UPDATE') {
          await supabase.from(task.table).update(task.payload).eq('id', task.payload.id);
        }
        flushedCount++;
      } catch (err) {
        console.warn(`[OfflineSyncQueue] Failed to sync item ${task.id}:`, err);
        remaining.push(task);
      }
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(this.QUEUE_KEY, JSON.stringify(remaining));
    }
    return flushedCount;
  }
}

// Auto-flush queue when browser comes online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[Ralion Sync] Network online. Flushing offline queue to Supabase Cloud...');
    OfflineSyncQueue.flushQueue();
  });
}
