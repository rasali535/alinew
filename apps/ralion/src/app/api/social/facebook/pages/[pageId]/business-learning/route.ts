import { NextRequest } from 'next/server';
import { MariBusinessLearningService } from '@/lib/services/social/mariBusinessLearning.service';
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

    if (pageId && pageId !== 'default') {
      const supabase = getServiceSupabase();
      const { data: conn } = await supabase
        .from('social_connections')
        .select('provider_account_id, zernio_account_id, metadata')
        .eq('provider', 'facebook')
        .or(`workspace_id.eq.${context.workspace.id},user_id.eq.${context.user.id}`)
        .maybeSingle();

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

    const knowledge = MariBusinessLearningService.getBusinessKnowledge({
      organizationId: context.workspace.id,
      pageId,
      pageName: 'Business Knowledge',
    });

    return corsJsonResponse({
      success: true,
      knowledge,
    }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse(
      { success: false, error: err.message || 'Failed to retrieve business knowledge' },
      { status: 500 },
      request
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const { pageId } = await params;
    const context = await getCurrentRalionContext(request, { requireAuth: true });
    if (!context) {
      return authRequiredResponse(request);
    }

    const body = await request.json();

    const updated = await MariBusinessLearningService.updateBrandVoice({
      organizationId: context.workspace.id,
      pageId,
      userId: context.user.id,
      customTone: body.customTone,
      customKeywords: body.customKeywords,
    });

    return corsJsonResponse({
      success: true,
      knowledge: updated,
    }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse(
      { success: false, error: err.message || 'Failed to update business knowledge' },
      { status: 500 },
      request
    );
  }
}
