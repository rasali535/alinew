import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/license/check — Verify a license key
export async function POST(req: NextRequest) {
  try {
    const { licenseKey, deviceId, platform } = await req.json();

    if (!licenseKey || !deviceId) {
      return NextResponse.json({ valid: false, error: 'Missing licenseKey or deviceId' }, { status: 400 });
    }

    const supabase = await createClient();

    // Look up the license
    const { data: license, error } = await supabase
      .from('licenses')
      .select(`
        id, status, edition, expires_at, activated_at,
        organization_id,
        organizations ( name ),
        products ( name, slug )
      `)
      .eq('license_key', licenseKey)
      .eq('status', 'active')
      .single();

    if (error || !license) {
      return NextResponse.json({ valid: false, error: 'Invalid or expired license key' });
    }

    // Check expiry
    if (license.expires_at && new Date(license.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, error: 'License has expired' });
    }

    // Check if device is already registered (or is new)
    const { data: device } = await supabase
      .from('registered_devices')
      .select('id')
      .eq('license_id', license.id)
      .eq('device_id', deviceId)
      .single();

    // Get subscription edition
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('edition, status')
      .eq('organization_id', license.organization_id)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      valid: true,
      edition: subscription?.edition || 'community',
      orgName: (license.organizations as any)?.name,
      productName: (license.products as any)?.name,
      expiresAt: license.expires_at,
      deviceRegistered: !!device,
    });
  } catch (err: any) {
    return NextResponse.json({ valid: false, error: err.message }, { status: 500 });
  }
}
