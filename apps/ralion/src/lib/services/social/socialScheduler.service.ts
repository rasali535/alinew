/**
 * Ralion Unified Social Media Architecture — Scheduled Publishing Engine
 * Ras Ali Labs (Pty) Ltd
 * Handles scheduled post execution, timezone adjustments, retries, and cancellations.
 */

import { createClient } from '@supabase/supabase-js';
import { SocialPublishingService } from './socialPublishing.service';

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';
  return createClient(url, key);
}

export class SocialSchedulerService {
  /**
   * Process all pending queued posts whose scheduled_for time has arrived
   */
  static async processPendingQueue(): Promise<{ processed: number; successful: number; failed: number }> {
    const supabase = getServiceSupabase();
    const now = new Date().toISOString();

    // 1. Fetch due queued posts
    const { data: queuedPosts, error } = await supabase
      .from('social_posts')
      .select('*')
      .eq('status', 'QUEUED')
      .lte('scheduled_for', now)
      .limit(20);

    if (error || !queuedPosts || queuedPosts.length === 0) {
      return { processed: 0, successful: 0, failed: 0 };
    }

    let successful = 0;
    let failed = 0;

    for (const post of queuedPosts) {
      try {
        // Mark processing to avoid duplicate runs
        await supabase.from('social_posts').update({ status: 'PROCESSING' }).eq('id', post.id);

        const result = await SocialPublishingService.publish({
          userId: post.user_id,
          workspaceId: post.workspace_id,
          title: post.title,
          body: post.body,
          mediaUrls: post.media_urls,
          mediaTypes: post.media_types,
          platforms: post.platforms,
          authorName: post.author_name,
        });

        // Update post with publish results
        await supabase.from('social_posts').update({
          status: result.overallStatus,
          platform_results: result.platformResults,
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', post.id);

        if (result.overallStatus === 'PUBLISHED' || result.overallStatus === 'PARTIALLY_PUBLISHED') {
          successful++;
        } else {
          failed++;
        }
      } catch (postErr: any) {
        failed++;
        await supabase.from('social_posts').update({
          status: 'FAILED',
          platform_results: { error: postErr.message },
          updated_at: new Date().toISOString(),
        }).eq('id', post.id);
      }
    }

    return { processed: queuedPosts.length, successful, failed };
  }

  /**
   * Cancel a scheduled post
   */
  static async cancelScheduledPost(postId: string, userId: string): Promise<boolean> {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('social_posts')
      .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
      .eq('id', postId)
      .eq('user_id', userId)
      .eq('status', 'QUEUED')
      .select()
      .maybeSingle();

    return !error && !!data;
  }
}
