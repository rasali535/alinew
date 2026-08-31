import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PlatformAdminService } from '@ralion/auth';

export interface AdminAuthResult {
  authorized: boolean;
  user?: {
    id: string;
    email: string;
    role: string;
    organizationId: string;
  };
  error?: string;
  statusCode?: number;
}

export async function verifyPlatformAdminRequest(request: NextRequest): Promise<AdminAuthResult> {
  const authHeader = request.headers.get('authorization') || '';
  const adminKey = request.headers.get('x-admin-key') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  // Master platform secret key bypass for automated administrative cron/backend runners
  const platformSecret = process.env.RALION_PLATFORM_ADMIN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (adminKey && platformSecret && adminKey === platformSecret) {
    return {
      authorized: true,
      user: {
        id: 'platform-system-admin',
        email: 'ali@rasalilabs.com',
        role: 'PLATFORM_ADMIN',
        organizationId: 'ras-ali-labs',
      },
    };
  }

  if (!token) {
    return {
      authorized: false,
      statusCode: 401,
      error: 'Unauthorized: Authentication token is required for platform admin access.',
    };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';

  if (!supabaseUrl || !serviceKey) {
    return {
      authorized: false,
      statusCode: 500,
      error: 'Platform auth configuration unavailable.',
    };
  }

  try {
    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);

    if (userErr || !userData.user) {
      return {
        authorized: false,
        statusCode: 401,
        error: 'Invalid or expired session token.',
      };
    }

    const user = userData.user;
    const isAuthorized = PlatformAdminService.verifyAdminAuthorization(
      user.user_metadata,
      user.email
    );

    if (!isAuthorized) {
      PlatformAdminService.recordAuditLog({
        adminUserId: user.id,
        adminEmail: user.email,
        action: 'SECURITY_EVENT',
        targetType: 'SYSTEM',
        targetId: 'admin_portal_access',
        result: 'DENIED',
        reason: `Customer/unauthorized tenant '${user.id}' attempted to access Platform Admin endpoint.`,
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
      });

      return {
        authorized: false,
        statusCode: 403,
        error: 'Forbidden: Platform Administrator privileges required.',
      };
    }

    return {
      authorized: true,
      user: {
        id: user.id,
        email: user.email || 'ali@rasalilabs.com',
        role: 'PLATFORM_ADMIN',
        organizationId: 'ras-ali-labs',
      },
    };
  } catch (err: any) {
    return {
      authorized: false,
      statusCode: 500,
      error: `Admin authorization check failure: ${err?.message}`,
    };
  }
}
