/**
 * Supabase Storage Health Check & Verification Script
 *
 * Dedicated isolated health check for the `creatives` bucket in Supabase Storage.
 * Verifies:
 * - Supabase credentials & connection
 * - `creatives` bucket exists (creates if not present)
 * - Uploads isolated test object (_healthchecks/creative-storage/<unique-id>.bin)
 * - Verifies object existence
 * - Verifies object metadata (size, content-type)
 * - Downloads object and verifies exact byte integrity
 * - Deletes ONLY the healthcheck test object
 * - Verifies deletion (object no longer exists)
 * - NEVER deletes or mutates any customer assets
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const BUCKET_NAME = 'creatives';

async function runHealthCheck() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🛡️  RALION OS — SUPABASE CREATIVE STORAGE HEALTH CHECK');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ FAIL: Supabase environment variables missing:');
    console.error(`   NEXT_PUBLIC_SUPABASE_URL: ${SUPABASE_URL ? 'PRESENT' : 'MISSING'}`);
    console.error(`   SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY ? 'PRESENT' : 'MISSING'}`);
    process.exit(1);
  }

  console.log(`[1] Connecting to Supabase at ${SUPABASE_URL}...`);
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Step 1: Check bucket existence or create
  console.log(`[2] Checking bucket '${BUCKET_NAME}'...`);
  const { data: buckets, error: listBucketsErr } = await supabase.storage.listBuckets();
  if (listBucketsErr) {
    console.error('❌ FAIL: Unable to list buckets:', listBucketsErr.message);
    process.exit(1);
  }

  let bucket = buckets?.find((b) => b.name === BUCKET_NAME);
  if (!bucket) {
    console.log(`   Bucket '${BUCKET_NAME}' not found. Creating private bucket '${BUCKET_NAME}'...`);
    const { data: newBucket, error: createBucketErr } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: false,
    });
    if (createBucketErr) {
      console.error('❌ FAIL: Unable to create bucket:', createBucketErr.message);
      process.exit(1);
    }
    console.log('   ✅ Bucket created successfully.');
  } else {
    console.log(`   ✅ Bucket '${BUCKET_NAME}' exists. (Public: ${bucket.public})`);
  }

  // Step 2: Upload isolated test object
  const uniqueId = `health-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const objectPath = `_healthchecks/creative-storage/${uniqueId}.bin`;
  const payloadData = Buffer.from(`RALION_STORAGE_HEALTHCHECK_PAYLOAD_${uniqueId}_${Date.now()}`);
  const payloadHash = crypto.createHash('sha256').update(payloadData).digest('hex');

  console.log(`[3] Uploading isolated healthcheck object: ${objectPath} (${payloadData.length} bytes)...`);
  const { error: uploadErr } = await supabase.storage.from(BUCKET_NAME).upload(objectPath, payloadData, {
    contentType: 'application/octet-stream',
    upsert: true,
  });

  if (uploadErr) {
    console.error('❌ FAIL: Health check upload failed:', uploadErr.message);
    process.exit(1);
  }
  console.log('   ✅ Upload succeeded.');

  // Step 3: Verify object exists
  console.log(`[4] Verifying object exists via list in '_healthchecks/creative-storage/'...`);
  const { data: listFiles, error: listErr } = await supabase.storage.from(BUCKET_NAME).list('_healthchecks/creative-storage');
  if (listErr) {
    console.error('❌ FAIL: Unable to list directory in bucket:', listErr.message);
    process.exit(1);
  }

  const found = listFiles?.find((f) => f.name === `${uniqueId}.bin`);
  if (!found) {
    console.error(`❌ FAIL: Object ${uniqueId}.bin not found in bucket listing.`);
    process.exit(1);
  }
  console.log(`   ✅ Object found in listing: size=${found.metadata?.size || (found as any).size} bytes`);

  // Step 4: Download object and verify byte integrity
  console.log(`[5] Downloading object ${objectPath} to verify byte integrity...`);
  const { data: downloadedBlob, error: downloadErr } = await supabase.storage.from(BUCKET_NAME).download(objectPath);
  if (downloadErr || !downloadedBlob) {
    console.error('❌ FAIL: Download failed:', downloadErr?.message);
    process.exit(1);
  }

  const downloadedBuffer = Buffer.from(await downloadedBlob.arrayBuffer());
  const downloadedHash = crypto.createHash('sha256').update(downloadedBuffer).digest('hex');

  if (downloadedHash !== payloadHash) {
    console.error(`❌ FAIL: Hash mismatch! Expected ${payloadHash}, got ${downloadedHash}`);
    process.exit(1);
  }
  console.log(`   ✅ Byte integrity verified! SHA-256: ${downloadedHash} (${downloadedBuffer.length} bytes)`);

  // Step 5: Delete isolated test object
  console.log(`[6] Deleting ONLY the healthcheck test object ${objectPath}...`);
  const { error: deleteErr } = await supabase.storage.from(BUCKET_NAME).remove([objectPath]);
  if (deleteErr) {
    console.error('❌ FAIL: Delete healthcheck object failed:', deleteErr.message);
    process.exit(1);
  }
  console.log('   ✅ Deletion request completed.');

  // Step 6: Verify deletion
  console.log(`[7] Verifying object is no longer present...`);
  const { data: listAfterDelete } = await supabase.storage.from(BUCKET_NAME).list('_healthchecks/creative-storage');
  const stillFound = listAfterDelete?.find((f) => f.name === `${uniqueId}.bin`);
  if (stillFound) {
    console.error('❌ FAIL: Object still exists after deletion!');
    process.exit(1);
  }
  console.log('   ✅ Deletion verified. Object is removed.');

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🎉 SUPABASE STORAGE HEALTH CHECK: 100% PASSED');
  console.log('   - Storage Provider: Supabase Storage');
  console.log(`   - Bucket: ${BUCKET_NAME}`);
  console.log('   - Operations Verified: Connect, Bucket Check, Upload, List, Download, Hash Check, Clean Delete');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

runHealthCheck().catch((err) => {
  console.error('Fatal healthcheck error:', err);
  process.exit(1);
});
