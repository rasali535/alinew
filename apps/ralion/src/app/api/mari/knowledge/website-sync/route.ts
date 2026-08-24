import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../../lib/cors';
import { WebsiteIngestionService, BusinessContextService } from '@ralion/ai';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * POST /api/mari/knowledge/website-sync
 * Triggers authoritative ingestion / sync of an organization's public website.
 * Body: { organizationId?: string; websiteUrl?: string; customSections?: any[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const orgId = body.organizationId || 'ras-ali-labs';
    const websiteUrl = body.websiteUrl || (orgId === 'ras-ali-labs' ? 'https://www.rasalilabs.com' : 'https://example.com');

    const result = await WebsiteIngestionService.ingestWebsite(orgId, websiteUrl, {
      customSections: body.customSections,
    });

    // Invalidate cached business context so the next query uses updated knowledge
    BusinessContextService.invalidateContext(orgId);

    return corsJsonResponse({
      success: true,
      message: `Website knowledge for ${result.websiteUrl} successfully ingested and verified into Layer 1 Business Knowledge.`,
      websiteKnowledge: result,
    }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse({
      success: false,
      error: err.message || 'Failed to sync website knowledge',
    }, { status: 500 }, request);
  }
}
