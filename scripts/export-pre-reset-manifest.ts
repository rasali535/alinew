import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';

const supabase = createClient(supabaseUrl, serviceKey);

interface InventoryRecord {
  category: string;
  id: string;
  classification: 'PLATFORM' | 'TEST' | 'CUSTOMER';
  details: any;
}

async function runInventoryAndExport() {
  console.log('════════════════════════════════════════════════════════════════════');
  console.log('📊 PHASE 1: PRE-RESET INVENTORY & MANIFEST EXPORT');
  console.log('════════════════════════════════════════════════════════════════════\n');

  const manifest: InventoryRecord[] = [];
  const counts: Record<string, { total: number; platform: number; test_or_customer: number }> = {};

  function tally(category: string, id: string, classification: 'PLATFORM' | 'TEST' | 'CUSTOMER', details: any) {
    manifest.push({ category, id, classification, details });
    if (!counts[category]) {
      counts[category] = { total: 0, platform: 0, test_or_customer: 0 };
    }
    counts[category].total++;
    if (classification === 'PLATFORM') {
      counts[category].platform++;
    } else {
      counts[category].test_or_customer++;
    }
  }

  // 1. Auth Users
  const { data: authData, error: authErr } = await supabase.auth.admin.listUsers();
  if (authErr) console.error('Auth users error:', authErr.message);
  else {
    for (const u of authData.users) {
      const isPlatform = u.email === 'ali@rasalilabs.com' || u.email?.endsWith('@rasalilabs.com') && !u.email?.includes('test');
      tally(
        'AUTH_USERS',
        u.id,
        isPlatform ? 'PLATFORM' : 'TEST',
        { email: u.email, createdAt: u.created_at, userMetadata: u.user_metadata }
      );
    }
  }

  // 2. Profiles Table
  const { data: profiles } = await supabase.from('profiles').select('*');
  if (profiles) {
    for (const p of profiles) {
      const isPlatform = p.email === 'ali@rasalilabs.com' || (p.email?.endsWith('@rasalilabs.com') && !p.email?.includes('test'));
      tally('PROFILES', p.id, isPlatform ? 'PLATFORM' : 'TEST', p);
    }
  }

  // 3. Social Connections Table
  const { data: socConns } = await supabase.from('social_connections').select('*');
  if (socConns) {
    for (const sc of socConns) {
      // Platform Master Facebook connection (Ras Ali Labs Page ID: 477334159265235)
      const isMasterFB = sc.metadata?.pageId === '477334159265235' || sc.account_name === 'Ras Ali Labs';
      tally('SOCIAL_CONNECTIONS', sc.id, isMasterFB ? 'PLATFORM' : 'TEST', sc);
    }
  }

  // 4. Social Provider Profiles Table
  const { data: socProfs } = await supabase.from('social_provider_profiles').select('*');
  if (socProfs) {
    for (const sp of socProfs) {
      const isMasterZernio = sp.provider_profile_id === '6a82deac1a69158ef81cb2cd';
      tally('SOCIAL_PROVIDER_PROFILES', sp.id, isMasterZernio ? 'PLATFORM' : 'TEST', sp);
    }
  }

  // 5. Social Posts Table
  const { data: posts } = await supabase.from('social_posts').select('*');
  if (posts) {
    for (const post of posts) {
      tally('SOCIAL_POSTS', post.id, 'TEST', post);
    }
  }

  // 6. Social Inbox Messages Table
  const { data: msgs } = await supabase.from('social_inbox_messages').select('*');
  if (msgs) {
    for (const msg of msgs) {
      tally('SOCIAL_INBOX_MESSAGES', msg.id, 'TEST', msg);
    }
  }

  // 7. Security Audit Logs Table
  const { data: secLogs } = await supabase.from('security_audit_logs').select('*');
  if (secLogs) {
    for (const log of secLogs) {
      tally('SECURITY_AUDIT_LOGS', log.id, 'PLATFORM', log);
    }
  }

  // 8. Storage Objects in "creatives" Bucket
  const { data: creativeFiles } = await supabase.storage.from('creatives').list('', { limit: 1000 });
  if (creativeFiles) {
    for (const file of creativeFiles) {
      // Platform launch assets
      const isPlatformAsset = file.name.startsWith('asset-1788200545566-ua2is');
      tally('CREATIVE_STORAGE_OBJECTS', file.name, isPlatformAsset ? 'PLATFORM' : 'TEST', file);
    }
  }

  // 9. Storage Objects in "releases" & "social-media-assets" Buckets
  const { data: releaseFiles } = await supabase.storage.from('releases').list('', { limit: 1000 });
  if (releaseFiles) {
    for (const f of releaseFiles) {
      tally('RELEASES_STORAGE_OBJECTS', f.name, 'PLATFORM', f);
    }
  }

  const { data: socialMediaFiles } = await supabase.storage.from('social-media-assets').list('', { limit: 1000 });
  if (socialMediaFiles) {
    for (const f of socialMediaFiles) {
      tally('SOCIAL_MEDIA_ASSETS_OBJECTS', f.name, 'PLATFORM', f);
    }
  }

  // Write Manifest to File
  const manifestPath = path.resolve(__dirname, '..', 'data-manifest-pre-reset.json');
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        manifestCount: manifest.length,
        summary: counts,
        records: manifest,
      },
      null,
      2
    ),
    'utf-8'
  );

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 PRE-RESET INVENTORY SUMMARY TABLE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(
    'Category'.padEnd(30) +
    'Total'.padEnd(10) +
    'Platform'.padEnd(12) +
    'Test/Customer'
  );
  console.log('-'.repeat(65));

  for (const [cat, c] of Object.entries(counts)) {
    console.log(
      cat.padEnd(30) +
      c.total.toString().padEnd(10) +
      c.platform.toString().padEnd(12) +
      c.test_or_customer.toString()
    );
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Manifest exported successfully to: ${manifestPath}\n`);
}

runInventoryAndExport().catch(console.error);
