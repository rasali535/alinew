import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';

const supabase = createClient(supabaseUrl, serviceKey);

async function provisionPlatformAdmin() {
  console.log('════════════════════════════════════════════════════════════════════');
  console.log('👤 PHASE 3: PROVISION DEDICATED PLATFORM ADMIN');
  console.log('════════════════════════════════════════════════════════════════════\n');

  const adminEmail = 'ali@rasalilabs.com';
  const adminPassword = 'Ali@na12#';
  const platformOrgId = 'ras-ali-labs';

  // Check if admin user already exists
  const { data: listData } = await supabase.auth.admin.listUsers();
  const existing = listData?.users?.find(u => u.email === adminEmail);

  let adminUserId = '';

  if (existing) {
    console.log(`Found existing user ${adminEmail} (${existing.id}), updating password & metadata...`);
    const { data: updated, error: updateErr } = await supabase.auth.admin.updateUserById(existing.id, {
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        role: 'PLATFORM_ADMIN',
        organizationId: platformOrgId,
        isPlatformAdmin: true,
        full_name: 'Ras Ali Labs Platform Admin',
      },
      app_metadata: {
        role: 'PLATFORM_ADMIN',
        organizationId: platformOrgId,
        isPlatformAdmin: true,
      },
    });

    if (updateErr) throw updateErr;
    adminUserId = updated.user.id;
    console.log(`✅ Updated platform admin user: ${adminUserId}`);
  } else {
    console.log(`Creating new platform admin user ${adminEmail}...`);
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        role: 'PLATFORM_ADMIN',
        organizationId: platformOrgId,
        isPlatformAdmin: true,
        full_name: 'Ras Ali Labs Platform Admin',
      },
      app_metadata: {
        role: 'PLATFORM_ADMIN',
        organizationId: platformOrgId,
        isPlatformAdmin: true,
      },
    });

    if (createErr) throw createErr;
    adminUserId = created.user.id;
    console.log(`✅ Created platform admin user: ${adminUserId}`);
  }

  // Create / Update profile
  const { error: profErr } = await supabase.from('profiles').upsert({
    id: adminUserId,
    email: adminEmail,
    full_name: 'Ras Ali Labs Platform Admin',
    language: 'en',
    updated_at: new Date().toISOString(),
  });

  if (profErr) {
    console.warn('Profile upsert notice:', profErr.message);
  } else {
    console.log(`✅ Profile record verified for ${adminEmail}`);
  }

  // Verify login authentication
  const publicClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
  const { data: loginData, error: loginErr } = await publicClient.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  });

  if (loginErr) {
    throw new Error(`Platform Admin authentication failed: ${loginErr.message}`);
  }

  console.log(`✅ Verified Platform Admin Authentication:`);
  console.log(`   User ID: ${loginData.user.id}`);
  console.log(`   Email: ${loginData.user.email}`);
  console.log(`   Role: ${loginData.user.user_metadata.role}`);
  console.log(`   Organization: ${loginData.user.user_metadata.organizationId}`);
  console.log(`   Session Token Expiry: ${loginData.session.expires_at}`);

  console.log('\n════════════════════════════════════════════════════════════════════');
  console.log('🎉 PLATFORM ADMIN PROVISIONING COMPLETE');
  console.log('════════════════════════════════════════════════════════════════════\n');
}

provisionPlatformAdmin().catch(console.error);
