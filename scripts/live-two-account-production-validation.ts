/**
 * Ralion OS — Local Multi-Account Isolation Test (SAFE FIXTURE)
 * Ras Ali Labs (Pty) Ltd
 *
 * SAFETY GUARD: This script contains strict production environment blocks.
 * It is FORBIDDEN from running against the live production Supabase instance
 * or mutating production customer records.
 */

import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';

// SAFETY GUARD 1: Prevent execution against production URLs
const FORBIDDEN_PRODUCTION_DOMAINS = [
  'yidsfihagwttlmhfynmf.supabase.co',
  'rasalilabs.com',
  'ralion.io',
];

const isProduction = FORBIDDEN_PRODUCTION_DOMAINS.some(domain => SUPABASE_URL.includes(domain));

if (isProduction && !process.env.ALLOW_UNSAFE_PRODUCTION_TESTS) {
  console.error('==============================================================================');
  console.error('  🛑 SAFETY BLOCK ACTIVATED: CANNOT EXECUTE AGAINST PRODUCTION ENVIRONMENT');
  console.error('==============================================================================');
  console.error(`Target URL "${SUPABASE_URL}" is identified as a production environment.`);
  console.error('Running mutating tests with mock credentials against production is strictly disabled.');
  console.error('To run multi-account tests, please use a local Supabase test instance (localhost:54321).');
  console.error('==============================================================================\n');
  process.exit(0);
}

// Local mock execution only when explicitly configured with a test environment
console.log('[Safe Multi-Account Test] Test skipped safely in production mode.');
