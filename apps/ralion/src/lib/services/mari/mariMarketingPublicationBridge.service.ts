import 'server-only';

import { getPrivilegedSupabase } from '../../supabase/server';

interface PublicationBridgeParams {
  organizationId: string;
  workspaceId: string;
  userId: string;
  socialPostId: string;
  idempotencyKey?: string | null;
  contentId?: string | null;
  growthSourceId?: string | null;
}

function canonicalUuid(value?: string | null): string | null {
  const clean = String(value || '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean) ? clean : null;
}

function safeReference(value?: string | null): string | null {
  const clean = String(value || '').trim();
  if (!clean) return null;
  return clean.replace(/[^a-zA-Z0-9._:-]/g, '').slice(0, 160) || null;
}

function inferGrowthSource(idempotencyKey?: string | null): string | null {
  const key = String(idempotencyKey || '').trim();
  if (!key.startsWith('pub_post_')) return null;
  return safeReference(key.slice('pub_post_'.length));
}

function contentTypeFromMedia(mediaTypes: unknown): 'image' | 'video' | 'text' {
  const first = Array.isArray(mediaTypes) ? String(mediaTypes[0] || '').toLowerCase() : '';
  if (first.includes('video')) return 'video';
  if (first.includes('image')) return 'image';
  return 'text';
}

/**
 * Records provenance at publish time. It never invents a causal hypothesis: published
 * content is initially an observational experiment and only receives an outcome after
 * live platform evidence is collected by MariMarketingLearningService.
 */
export class MariMarketingPublicationBridgeService {
  static async registerSuccessfulPublication(params: PublicationBridgeParams): Promise<{ registered: boolean; experimentId?: string; reason?: string }> {
    const organizationId = canonicalUuid(params.organizationId);
    const workspaceId = canonicalUuid(params.workspaceId);
    const userId = canonicalUuid(params.userId);
    const socialPostId = canonicalUuid(params.socialPostId);
    if (!organizationId || !workspaceId || !userId || !socialPostId) {
      return { registered: false, reason: 'NON_CANONICAL_CONTEXT' };
    }

    const db = getPrivilegedSupabase();
    const { data: publication, error: publicationError } = await db.from('social_posts')
      .select('id,title,body,media_types,platforms,status,published_at,created_at,content_id,platform_post_ids')
      .eq('id', socialPostId)
      .eq('organization_id', organizationId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    if (publicationError) throw new Error(`[MariMarketingPublicationBridge] publication read failed: ${publicationError.code}`);
    if (!publication) return { registered: false, reason: 'PUBLICATION_HISTORY_NOT_FOUND' };

    const requestedContentId = canonicalUuid(params.contentId);
    if (requestedContentId && publication.content_id !== requestedContentId) {
      const { error: linkError } = await db.from('social_posts').update({ content_id: requestedContentId, updated_at: new Date().toISOString() })
        .eq('id', socialPostId).eq('organization_id', organizationId).eq('workspace_id', workspaceId);
      if (linkError) throw new Error(`[MariMarketingPublicationBridge] content link failed: ${linkError.code}`);
      publication.content_id = requestedContentId;
    }

    const contentType = contentTypeFromMedia(publication.media_types);
    const growthSourceId = safeReference(params.growthSourceId) || inferGrowthSource(params.idempotencyKey);
    const platformPostId = String(publication.platform_post_ids?.facebook || '').trim() || null;
    const variables = {
      platform: Array.isArray(publication.platforms) && publication.platforms.includes('facebook') ? 'facebook' : publication.platforms?.[0] || null,
      socialPostId,
      platformPostId,
      growthSourceId,
      growthContentId: publication.content_id || null,
      title: publication.title || null,
      provenanceCapturedAt: new Date().toISOString(),
    };

    const { data: existing, error: lookupError } = await db.from('mari_marketing_experiments')
      .select('id')
      .eq('organization_id', organizationId).eq('workspace_id', workspaceId)
      .eq('source_type', 'SOCIAL_POST').eq('source_id', socialPostId).maybeSingle();
    if (lookupError) throw new Error(`[MariMarketingPublicationBridge] experiment lookup failed: ${lookupError.code}`);

    if (existing?.id) {
      const { error: updateError } = await db.from('mari_marketing_experiments').update({
        content_type: contentType,
        variables,
        status: publication.status === 'PUBLISHED' || publication.status === 'PARTIALLY_PUBLISHED' ? 'COMPLETED' : 'OBSERVED',
        started_at: publication.published_at || publication.created_at,
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id).eq('organization_id', organizationId).eq('workspace_id', workspaceId);
      if (updateError) throw new Error(`[MariMarketingPublicationBridge] experiment update failed: ${updateError.code}`);
      return { registered: true, experimentId: existing.id };
    }

    const { data: inserted, error: insertError } = await db.from('mari_marketing_experiments').insert({
      organization_id: organizationId,
      workspace_id: workspaceId,
      created_by: userId,
      source_type: 'SOCIAL_POST',
      source_id: socialPostId,
      hypothesis: `Observational record for published ${contentType} content; no pre-registered causal hypothesis.`,
      content_type: contentType,
      variables,
      status: publication.status === 'PUBLISHED' || publication.status === 'PARTIALLY_PUBLISHED' ? 'COMPLETED' : 'OBSERVED',
      started_at: publication.published_at || publication.created_at,
      ended_at: publication.published_at || null,
    }).select('id').single();

    if (insertError) {
      if (insertError.code === '23505') {
        const { data: raced } = await db.from('mari_marketing_experiments').select('id')
          .eq('organization_id', organizationId).eq('workspace_id', workspaceId)
          .eq('source_type', 'SOCIAL_POST').eq('source_id', socialPostId).maybeSingle();
        if (raced?.id) return { registered: true, experimentId: raced.id };
      }
      throw new Error(`[MariMarketingPublicationBridge] experiment insert failed: ${insertError.code}`);
    }

    return { registered: true, experimentId: inserted.id };
  }
}
