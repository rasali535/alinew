// =====================================================================
// Ralion OS — Read-Only Production Test-Object Storage Audit
// Ras Ali Labs (Pty) Ltd
//
// STRICT SAFETY BOUNDARIES:
// 1. READ-ONLY: Never mutates, deletes, or alters any storage object.
// 2. Requires explicit replacement credentials configured in environment.
// 3. Prohibits execution with revoked/compromised keys.
// 4. Scans suspected test organization prefixes for path, timestamp, MIME type, size.
// =====================================================================

import { createClient } from '@supabase/supabase-js';

const SUSPECTED_TEST_PREFIXES = [
  'organizations/org-alpha-111',
  'organizations/org-beta-222',
  'organizations/org-durability-corp',
  'organizations/org-test-hostinger',
];

interface AuditedObject {
  path: string;
  name: string;
  id?: string;
  updatedAt?: string;
  createdAt?: string;
  sizeBytes?: number;
  mimeType?: string;
}

async function listFolderRecursive(
  supabase: any,
  bucket: string,
  folderPath: string
): Promise<AuditedObject[]> {
  const objects: AuditedObject[] = [];

  try {
    const { data: items, error } = await supabase.storage.from(bucket).list(folderPath, {
      limit: 100,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error) {
      console.warn(`[Audit] Notice while listing ${folderPath}:`, error.message);
      return objects;
    }

    if (!items || items.length === 0) {
      return objects;
    }

    for (const item of items) {
      const itemPath = folderPath ? `${folderPath}/${item.name}` : item.name;

      // In Supabase Storage, folder items have id === null or no metadata/mimetype
      const isFolder = !item.id || item.id === null || (!item.metadata && !item.updated_at);

      if (isFolder) {
        const subItems = await listFolderRecursive(supabase, bucket, itemPath);
        objects.push(...subItems);
      } else {
        objects.push({
          path: itemPath,
          name: item.name,
          id: item.id,
          updatedAt: item.updated_at || item.created_at || 'Unknown',
          createdAt: item.created_at || item.updated_at || 'Unknown',
          sizeBytes: item.metadata?.size || 0,
          mimeType: item.metadata?.mimetype || (item.name.endsWith('.json') ? 'application/json' : 'application/octet-stream'),
        });
      }
    }
  } catch (err: any) {
    console.error(`[Audit] Exception listing ${folderPath}:`, err.message);
  }

  return objects;
}

async function main() {
  console.log('=====================================================================');
  console.log('RALION OS — READ-ONLY PRODUCTION STORAGE TEST-OBJECT AUDIT');
  console.log('=====================================================================');

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!process.argv.includes('--execute')) {
    console.log('\n[SAFETY MODE] Dry-run preview mode.');
    console.log('This script inspects suspected test objects in Supabase Storage.');
    console.log('It is STRICTLY READ-ONLY and will never delete or mutate any data.\n');
    console.log('Target prefixes configured for audit:');
    SUSPECTED_TEST_PREFIXES.forEach((p) => console.log(`  - ${p}/`));
    console.log('\nTo execute against Supabase after credential rotation:');
    console.log('  1. Configure replacement SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY in your secure shell.');
    console.log('  2. Run: npx tsx scripts/audit-test-storage-objects.ts --execute\n');
    process.exit(0);
  }

  if (!supabaseUrl) {
    console.error('FATAL: SUPABASE_URL environment variable is required.');
    process.exit(1);
  }

  if (!serviceKey) {
    console.error('FATAL: Replacement SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY is required.');
    console.error('Do not execute until the replacement credential has been configured.');
    process.exit(1);
  }

  console.log(`Target Supabase URL: ${supabaseUrl}`);
  console.log(`Bucket: creatives`);
  console.log('Connecting using configured server credential...\n');

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const allAuditedObjects: AuditedObject[] = [];

  for (const prefix of SUSPECTED_TEST_PREFIXES) {
    console.log(`[Scanning] ${prefix}/ ...`);
    const found = await listFolderRecursive(supabase, 'creatives', prefix);
    console.log(`  Found ${found.length} objects under ${prefix}/`);
    allAuditedObjects.push(...found);
  }

  console.log('\n=====================================================================');
  console.log(`AUDIT RESULTS: ${allAuditedObjects.length} suspected test objects identified`);
  console.log('=====================================================================\n');

  if (allAuditedObjects.length === 0) {
    console.log('No test objects found under suspected prefixes.');
    process.exit(0);
  }

  console.log(
    '| Path | Size (Bytes) | MIME Type | Updated At |'
  );
  console.log(
    '|---|---|---|---|'
  );

  let totalBytes = 0;
  for (const obj of allAuditedObjects) {
    totalBytes += obj.sizeBytes || 0;
    console.log(
      `| ${obj.path} | ${obj.sizeBytes ?? 0} | ${obj.mimeType ?? 'unknown'} | ${obj.updatedAt} |`
    );
  }

  console.log('\n---------------------------------------------------------------------');
  console.log(`TOTAL SUSPECTED TEST OBJECTS: ${allAuditedObjects.length}`);
  console.log(`TOTAL DISK USAGE: ${(totalBytes / (1024 * 1024)).toFixed(2)} MB (${totalBytes} bytes)`);
  console.log('---------------------------------------------------------------------');
  console.log('NOTE: This is a read-only audit report. No objects have been deleted.');
  console.log('Any future removal requires explicit manual confirmation.');
  console.log('=====================================================================\n');
}

main().catch((err) => {
  console.error('FATAL AUDIT ERROR:', err);
  process.exit(1);
});
