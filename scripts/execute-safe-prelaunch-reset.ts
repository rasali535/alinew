import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';

const supabase = createClient(supabaseUrl, serviceKey);

async function executeSafeReset() {
  console.log('════════════════════════════════════════════════════════════════════');
  console.log('🗑️ PHASE 2: EXECUTING SAFE DEPENDENCY-ORDERED DATA RESET');
  console.log('════════════════════════════════════════════════════════════════════\n');

  // STEP 1: Delete non-platform creative storage objects
  console.log('[STEP 1] Purging test creative storage objects in bucket "creatives"...');
  const { data: creativeFiles, error: listErr } = await supabase.storage
    .from('creatives')
    .list('', { limit: 1000 });

  if (listErr) {
    console.error('  ❌ Error listing creatives bucket:', listErr.message);
  } else if (creativeFiles) {
    const filesToDelete = creativeFiles
      .filter((f) => !f.name.startsWith('asset-1788200545566-ua2is') && f.name !== '.emptyFolderPlaceholder')
      .map((f) => f.name);

    if (filesToDelete.length > 0) {
      console.log(`  Deleting ${filesToDelete.length} test creative files...`);
      // Supabase storage delete accepts batches
      for (let i = 0; i < filesToDelete.length; i += 50) {
        const batch = filesToDelete.slice(i, i + 50);
        const { error: delErr } = await supabase.storage.from('creatives').remove(batch);
        if (delErr) console.error('  Batch delete error:', delErr.message);
      }
      console.log(`  ✅ Successfully purged ${filesToDelete.length} test creative files.`);
    } else {
      console.log('  No test creative files to delete.');
    }
  }

  // STEP 2: Clear test rows in public tables
  console.log('\n[STEP 2] Purging test rows from public tables...');
  try {
    await supabase.from('social_posts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('  ✅ Cleaned social_posts');
  } catch (e: any) {
    console.log('  Notice social_posts:', e.message);
  }

  try {
    await supabase.from('social_inbox_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('  ✅ Cleaned social_inbox_messages');
  } catch (e: any) {
    console.log('  Notice social_inbox_messages:', e.message);
  }

  // Delete test profiles
  console.log('\n[STEP 3] Purging test profiles...');
  const { data: testProfiles } = await supabase.from('profiles').select('id, email');
  if (testProfiles && testProfiles.length > 0) {
    for (const p of testProfiles) {
      if (p.email !== 'ali@rasalilabs.com') {
        const { error: pErr } = await supabase.from('profiles').delete().eq('id', p.id);
        if (pErr) console.error(`  Error deleting profile ${p.email}:`, pErr.message);
        else console.log(`  ✅ Deleted profile: ${p.email} (${p.id})`);
      }
    }
  }

  // STEP 4: Delete all test auth users
  console.log('\n[STEP 4] Purging test auth users from Supabase Auth...');
  const { data: authData } = await supabase.auth.admin.listUsers();
  if (authData && authData.users) {
    for (const user of authData.users) {
      if (user.email !== 'ali@rasalilabs.com') {
        const { error: delUserErr } = await supabase.auth.admin.deleteUser(user.id);
        if (delUserErr) {
          console.error(`  ❌ Error deleting auth user ${user.email}:`, delUserErr.message);
        } else {
          console.log(`  ✅ Deleted auth user: ${user.email} (${user.id})`);
        }
      }
    }
  }

  console.log('\n════════════════════════════════════════════════════════════════════');
  console.log('🎉 PHASE 2 DATA RESET COMPLETED');
  console.log('════════════════════════════════════════════════════════════════════\n');
}

executeSafeReset().catch(console.error);
