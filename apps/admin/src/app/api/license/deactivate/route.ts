import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/license/deactivate — Remove device from license
export async function POST(req: NextRequest) {
  try {
    const { licenseKey, deviceId } = await req.json();
    if (!licenseKey || !deviceId) {
      return NextResponse.json({ success: false, error: 'Missing licenseKey or deviceId' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: license } = await supabase
      .from('licenses')
      .select('id')
      .eq('license_key', licenseKey)
      .single();

    if (!license) return NextResponse.json({ success: false, error: 'License not found' });

    const { error } = await supabase
      .from('registered_devices')
      .update({ is_active: false })
      .eq('license_id', license.id)
      .eq('device_identifier', deviceId);

    if (error) return NextResponse.json({ success: false, error: error.message });

    return NextResponse.json({ success: true, message: 'Device deactivated successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
