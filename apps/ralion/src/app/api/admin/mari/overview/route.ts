import { NextRequest, NextResponse } from 'next/server';
import { verifyPlatformAdminRequest } from '../../../../../lib/auth/adminAuth';
import { getPrivilegedSupabase } from '@/lib/supabase/server';

const DAY_MS = 86400000;

function toMs(value?: string | null): number {
  const parsed = value ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function maxIso(values: Array<string | null | undefined>): string | null {
  const best = values.reduce((max, value) => Math.max(max, toMs(value)), 0);
  return best ? new Date(best).toISOString() : null;
}

function planName(subscription: any): string {
  const plan = Array.isArray(subscription?.subscription_plans) ? subscription.subscription_plans[0] : subscription?.subscription_plans;
  return plan?.name || plan?.slug || subscription?.edition || 'Community';
}

export async function GET(request: NextRequest) {
  const auth = await verifyPlatformAdminRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: auth.statusCode || 403 });
  }

  try {
    const supabase = getPrivilegedSupabase();
    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date(now - 30 * DAY_MS).toISOString();

    const [widgetsRes, sessionsRes, widgetUsageRes, orgsRes, workspacesRes, walletsRes, subscriptionsRes, apiKeysRes, apiUsageRes] = await Promise.all([
      supabase.from('mari_embed_widgets').select('id,organization_id,workspace_id,name,allowed_domains,assistant_name,status,monthly_request_limit,request_count,last_used_at,created_at,updated_at').order('created_at', { ascending: false }),
      supabase.from('mari_widget_sessions').select('id,widget_id,organization_id,workspace_id,origin,request_count,last_used_at,created_at,expires_at').gte('created_at', thirtyDaysAgo).order('created_at', { ascending: false }).limit(10000),
      supabase.from('mari_widget_usage').select('id,widget_id,organization_id,workspace_id,request_id,session_fingerprint,status_code,prompt_tokens,completion_tokens,total_tokens,credits_used,model,latency_ms,created_at').gte('created_at', thirtyDaysAgo).order('created_at', { ascending: false }).limit(10000),
      supabase.from('organizations').select('id,name'),
      supabase.from('workspaces').select('id,name,organization_id'),
      supabase.from('tenant_credit_wallets').select('organization_id,monthly_quota,remaining_plan_credits,remaining_bonus_credits,reserved_credits,lifetime_credits_consumed'),
      supabase.from('subscriptions').select('organization_id,status,edition,created_at,subscription_plans(name,slug)').order('created_at', { ascending: false }),
      supabase.from('mari_api_keys').select('id,organization_id,workspace_id,name,key_prefix,status,scopes,request_count,last_used_at,expires_at,created_at').order('created_at', { ascending: false }),
      supabase.from('mari_api_usage').select('api_key_id,organization_id,workspace_id,status_code,total_tokens,credits_used,latency_ms,created_at').gte('created_at', thirtyDaysAgo).order('created_at', { ascending: false }).limit(10000),
    ]);

    for (const [name, result] of Object.entries({
      widgets: widgetsRes,
      sessions: sessionsRes,
      widgetUsage: widgetUsageRes,
      organizations: orgsRes,
      workspaces: workspacesRes,
      wallets: walletsRes,
      subscriptions: subscriptionsRes,
      apiKeys: apiKeysRes,
      apiUsage: apiUsageRes,
    })) {
      if ((result as any).error) throw new Error(`${name}: ${(result as any).error.message}`);
    }

    const organizations = orgsRes.data || [];
    const workspaces = workspacesRes.data || [];
    const wallets = walletsRes.data || [];
    const subscriptions = subscriptionsRes.data || [];
    const sessions = sessionsRes.data || [];
    const usage = widgetUsageRes.data || [];
    const apiKeys = apiKeysRes.data || [];
    const apiUsage = apiUsageRes.data || [];

    const orgById = new Map(organizations.map((row: any) => [row.id, row]));
    const workspaceById = new Map(workspaces.map((row: any) => [row.id, row]));
    const walletByOrg = new Map(wallets.map((row: any) => [row.organization_id, row]));
    const subscriptionByOrg = new Map<string, any>();
    for (const row of subscriptions as any[]) {
      if (!subscriptionByOrg.has(row.organization_id)) subscriptionByOrg.set(row.organization_id, row);
    }

    const widgetRows = (widgetsRes.data || []).map((widget: any) => {
      const widgetSessions = sessions.filter((row: any) => row.widget_id === widget.id);
      const widgetUsage = usage.filter((row: any) => row.widget_id === widget.id);
      const successful = widgetUsage.filter((row: any) => Number(row.status_code) >= 200 && Number(row.status_code) < 300);
      const failed = widgetUsage.filter((row: any) => Number(row.status_code) >= 400);
      const last24h = widgetUsage.filter((row: any) => toMs(row.created_at) >= now - DAY_MS);
      const recentSuccess = last24h.some((row: any) => Number(row.status_code) >= 200 && Number(row.status_code) < 300);
      const recentFailures = last24h.filter((row: any) => Number(row.status_code) >= 400);
      const recentSessions = widgetSessions.filter((row: any) => Math.max(toMs(row.last_used_at), toMs(row.created_at)) >= now - DAY_MS);
      const requestsToday = widgetUsage.filter((row: any) => toMs(row.created_at) >= todayStart.getTime()).length;
      const uniqueSessions = new Set(widgetUsage.map((row: any) => row.session_fingerprint).filter(Boolean)).size;
      const creditsUsed30d = widgetUsage.reduce((sum: number, row: any) => sum + Number(row.credits_used || 0), 0);
      const totalTokens30d = widgetUsage.reduce((sum: number, row: any) => sum + Number(row.total_tokens || 0), 0);
      const avgLatencyMs = widgetUsage.length
        ? Math.round(widgetUsage.reduce((sum: number, row: any) => sum + Number(row.latency_ms || 0), 0) / widgetUsage.length)
        : 0;
      const wallet: any = walletByOrg.get(widget.organization_id);
      const remainingCredits = Number(wallet?.remaining_plan_credits || 0) + Number(wallet?.remaining_bonus_credits || 0);
      const allocatedCredits = Number(wallet?.monthly_quota || 0);
      const errorRatePct = widgetUsage.length ? Math.round((failed.length / widgetUsage.length) * 1000) / 10 : 0;
      const lastSuccessfulAt = maxIso(successful.map((row: any) => row.created_at));
      const lastSessionAt = maxIso(widgetSessions.flatMap((row: any) => [row.last_used_at, row.created_at]));
      const lastSeenAt = maxIso([widget.last_used_at, lastSuccessfulAt, lastSessionAt]);

      let health = 'CONFIGURED';
      if (widget.status === 'PAUSED' || widget.status === 'REVOKED') health = widget.status;
      else if (recentFailures.length >= 3 && !recentSuccess) health = 'ERROR';
      else if (recentSuccess) health = 'LIVE';
      else if (recentSessions.length > 0) health = 'CONNECTED';
      else if (widgetSessions.length > 0) health = 'IDLE';

      const origins = Array.from(new Set(widgetSessions.map((row: any) => row.origin).filter(Boolean)));
      const statusCounts = widgetUsage.reduce((acc: Record<string, number>, row: any) => {
        const key = String(row.status_code || 0);
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      const alerts: Array<{ severity: 'info' | 'warning' | 'critical'; code: string; message: string }> = [];
      if (health === 'CONFIGURED' && now - toMs(widget.created_at) > 60 * 60 * 1000) {
        alerts.push({ severity: 'warning', code: 'NO_CONNECTION', message: 'Widget was configured but no website session has been observed.' });
      }
      if (health === 'ERROR') {
        alerts.push({ severity: 'critical', code: 'RECENT_ERRORS', message: 'Repeated visitor requests are failing without a recent successful response.' });
      }
      if ((statusCounts['429'] || 0) > 0) {
        alerts.push({ severity: 'warning', code: 'RATE_LIMITED', message: 'Rate-limited requests were recorded in the last 30 days.' });
      }
      if ((statusCounts['402'] || 0) > 0) {
        alerts.push({ severity: 'critical', code: 'CREDITS_EXHAUSTED', message: 'Visitors encountered exhausted Mari credits in the last 30 days.' });
      }
      if (allocatedCredits > 0 && remainingCredits / allocatedCredits <= 0.1) {
        alerts.push({ severity: 'warning', code: 'LOW_CREDITS', message: 'Tenant has 10% or less of its monthly Mari credit allocation remaining.' });
      }

      return {
        id: widget.id,
        organizationId: widget.organization_id,
        organizationName: (orgById.get(widget.organization_id) as any)?.name || 'Unknown tenant',
        workspaceId: widget.workspace_id,
        workspaceName: (workspaceById.get(widget.workspace_id) as any)?.name || 'Workspace',
        name: widget.name,
        assistantName: widget.assistant_name,
        allowedDomains: widget.allowed_domains || [],
        observedOrigins: origins,
        status: widget.status,
        health,
        createdAt: widget.created_at,
        lastSeenAt,
        lastSuccessfulAt,
        lastSessionAt,
        monthlyRequestLimit: Number(widget.monthly_request_limit || 0),
        lifetimeRequestCount: Number(widget.request_count || 0),
        requestsToday,
        requests30d: widgetUsage.length,
        successful30d: successful.length,
        failed30d: failed.length,
        errorRatePct,
        uniqueSessions30d: uniqueSessions,
        creditsUsed30d,
        totalTokens30d,
        avgLatencyMs,
        models: Array.from(new Set(widgetUsage.map((row: any) => row.model).filter(Boolean))),
        remainingCredits,
        monthlyCreditQuota: allocatedCredits,
        plan: planName(subscriptionByOrg.get(widget.organization_id)),
        statusCounts,
        alerts,
      };
    });

    const totalWidgetRequests30d = widgetRows.reduce((sum: number, row: any) => sum + row.requests30d, 0);
    const totalWidgetCredits30d = widgetRows.reduce((sum: number, row: any) => sum + row.creditsUsed30d, 0);
    const totalWidgetFailures30d = widgetRows.reduce((sum: number, row: any) => sum + row.failed30d, 0);
    const totalWidgetSessions30d = widgetRows.reduce((sum: number, row: any) => sum + row.uniqueSessions30d, 0);
    const weightedLatencyTotal = widgetRows.reduce((sum: number, row: any) => sum + (row.avgLatencyMs * row.requests30d), 0);

    const activeApiKeys = apiKeys.filter((row: any) => row.status === 'ACTIVE' && (!row.expires_at || toMs(row.expires_at) > now));
    const apiCredits30d = apiUsage.reduce((sum: number, row: any) => sum + Number(row.credits_used || 0), 0);
    const apiFailures30d = apiUsage.filter((row: any) => Number(row.status_code) >= 400).length;

    const alerts = widgetRows
      .flatMap((row: any) => row.alerts.map((alert: any) => ({ ...alert, widgetId: row.id, widgetName: row.name, organizationId: row.organizationId, organizationName: row.organizationName, domains: row.allowedDomains })))
      .sort((a: any, b: any) => ({ critical: 0, warning: 1, info: 2 }[a.severity as 'critical' | 'warning' | 'info'] - ({ critical: 0, warning: 1, info: 2 }[b.severity as 'critical' | 'warning' | 'info']));

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalWidgets: widgetRows.length,
          activeWidgets: widgetRows.filter((row: any) => row.status === 'ACTIVE').length,
          liveWidgets: widgetRows.filter((row: any) => row.health === 'LIVE').length,
          connectedWidgets: widgetRows.filter((row: any) => ['LIVE', 'CONNECTED', 'IDLE'].includes(row.health)).length,
          configuredNoTraffic: widgetRows.filter((row: any) => row.health === 'CONFIGURED').length,
          errorWidgets: widgetRows.filter((row: any) => row.health === 'ERROR').length,
          widgetRequests30d: totalWidgetRequests30d,
          widgetFailures30d: totalWidgetFailures30d,
          widgetCredits30d: totalWidgetCredits30d,
          uniqueWidgetSessions30d: totalWidgetSessions30d,
          averageWidgetLatencyMs: totalWidgetRequests30d ? Math.round(weightedLatencyTotal / totalWidgetRequests30d) : 0,
          activeApiKeys: activeApiKeys.length,
          apiRequests30d: apiUsage.length,
          apiFailures30d,
          apiCredits30d,
        },
        widgets: widgetRows,
        api: {
          keys: apiKeys.map((row: any) => ({
            id: row.id,
            organizationId: row.organization_id,
            organizationName: (orgById.get(row.organization_id) as any)?.name || 'Unknown tenant',
            workspaceId: row.workspace_id,
            workspaceName: (workspaceById.get(row.workspace_id) as any)?.name || 'Workspace',
            name: row.name,
            keyPrefix: row.key_prefix,
            status: row.status,
            scopes: row.scopes || [],
            lifetimeRequestCount: Number(row.request_count || 0),
            lastUsedAt: row.last_used_at,
            expiresAt: row.expires_at,
            createdAt: row.created_at,
          })),
          requests30d: apiUsage.length,
          failures30d: apiFailures30d,
          credits30d: apiCredits30d,
        },
        alerts,
        generatedAt: new Date().toISOString(),
      },
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    console.error('[Admin Mari Overview] failed:', error?.message || error);
    return NextResponse.json({ success: false, error: `Failed to load Mari observability: ${error?.message || 'unknown error'}` }, { status: 500 });
  }
}
