import { NextRequest } from 'next/server';
import { MariCompetitiveIntelligenceService } from '@/lib/services/social/mariCompetitiveIntelligence.service';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { getCurrentRalionContext, authRequiredResponse, forbiddenResponse, getServiceSupabase } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function generateStaticParams() {
  return [{ pageId: '477334159265235' }, { pageId: 'default' }];
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const { pageId } = await params;
    const context = await getCurrentRalionContext(request, { requireAuth: true });
    if (!context) {
      return authRequiredResponse(request);
    }

    const supabase = getServiceSupabase();
    const { data: conn } = await supabase
      .from('social_connections')
      .select('provider_account_id, zernio_account_id, account_name, metadata')
      .eq('provider', 'facebook')
      .eq('connection_status', 'CONNECTED')
      .or(`workspace_id.eq.${context.workspace.id},user_id.eq.${context.user.id}`)
      .maybeSingle();

    if (pageId && pageId !== 'default') {
      const pageMatched =
        conn &&
        (conn.provider_account_id === pageId ||
          conn.zernio_account_id === pageId ||
          conn.metadata?.pageId === pageId ||
          conn.metadata?.zernioAccountId === pageId);

      if (!pageMatched) {
        return forbiddenResponse(request, 'You do not have access to this Facebook Page');
      }
    }

    if (!conn) {
      return corsJsonResponse({
        success: true,
        report: null,
      }, undefined, request);
    }

    const report = MariCompetitiveIntelligenceService.getMarketResearchReport({
      pageId: conn.provider_account_id || pageId,
      organizationId: context.workspace.id,
    });

    await MariCompetitiveIntelligenceService.auditMarketResearchAccess({
      userId: context.user.id,
      pageId: conn.provider_account_id || pageId,
    });

    return corsJsonResponse({
      success: true,
      report,
    }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse(
      { success: false, error: err.message || 'Failed to generate market research report' },
      { status: 500 },
      request
    );
  }
}
