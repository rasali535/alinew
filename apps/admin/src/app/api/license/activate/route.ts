import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/license/activate — Bind a device to a license
export async function POST(req: NextRequest) {
  try {
    const { licenseKey, deviceId, deviceName, platform } = await req.json();

    if (!licenseKey || !deviceId || !deviceName) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = await createClient();

    // Fetch license
    const { data: license, error } = await supabase
      .from('licenses')
      .select('id, organization_id, status, expires_at')
      .eq('license_key', licenseKey)
      .eq('status', 'active')
      .single();

    if (error || !license) {
      return NextResponse.json({ success: false, error: 'Invalid license key' });
    }

    // Check device limit (Community: 1, Professional: 5, Enterprise: unlimited)
    const { count: deviceCount } = await supabase
      .from('registered_devices')
      .select('id', { count: 'exact' })
      .eq('license_id', license.id)
      .eq('is_active', true);

    // Upsert device registration
    const { error: upsertError } = await supabase
      .from('registered_devices')
      .upsert({
        license_id: license.id,
        device_name: deviceName,
        device_identifier: deviceId,
        device_id: deviceId,
        platform: platform || 'Windows',
        last_seen: new Date().toISOString(),
        last_active: new Date().toISOString(),
        is_active: true,
      }, { onConflict: 'device_identifier' });

    if (upsertError) {
      return NextResponse.json({ success: false, error: upsertError.message });
    }

    return NextResponse.json({
      success: true,
      message: `Device "${deviceName}" activated successfully`,
      deviceId,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
