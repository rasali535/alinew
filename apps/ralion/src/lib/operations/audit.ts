import 'server-only';
import { getServiceSupabase } from '@/lib/auth/serverAuth';

export interface OperationalAuditContext {
  organizationId?: string | null;
  workspaceId?: string | null;
  userId?: string | null;
}

export async function writeOperationalAudit(
  context: OperationalAuditContext,
  action: string,
  module: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    const supabase = getServiceSupabase();
    const { error } = await supabase.from('audit_logs').insert({
      organization_id: context.organizationId || null,
      workspace_id: context.workspaceId || null,
      user_id: context.userId || null,
      action,
      module,
      metadata,
    });
    if (error) console.warn('[OperationalAudit] insert failed:', error.message);
  } catch (error: any) {
    console.warn('[OperationalAudit] unavailable:', error?.message || error);
  }
}
