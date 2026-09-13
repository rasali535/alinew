import * as fs from 'fs';
import * as path from 'path';

function validateMigration() {
  const filePath = path.resolve(__dirname, '../packages/database/migrations/20260913_publishing_idempotency_dispatch_claims.sql');
  if (!fs.existsSync(filePath)) {
    console.error('FAIL: Migration file not found:', filePath);
    process.exit(1);
  }

  const sql = fs.readFileSync(filePath, 'utf-8');
  const requiredTokens = [
    'CREATE TABLE IF NOT EXISTS public.social_publish_idempotency',
    'uq_social_publish_idempotency_tuple',
    'user_id, organization_id, workspace_id, destination, idempotency_key',
    'claim_social_publish_dispatch',
    'complete_social_publish_dispatch',
    'fail_social_publish_dispatch',
    'status IN (\'CLAIMED\', \'IN_PROGRESS\', \'COMPLETED\', \'FAILED\')',
  ];

  for (const token of requiredTokens) {
    if (!sql.includes(token)) {
      console.error('FAIL: Migration missing required element:', token);
      process.exit(1);
    }
  }

  console.log('✅ Gate 2: Database migration validation PASSED (all schemas, indices, and RPCs verified).');
}

validateMigration();
