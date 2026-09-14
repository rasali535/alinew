// =====================================================================
// Ralion OS — Safe Environment Variable Boolean Verification
// Ras Ali Labs (Pty) Ltd
//
// ZERO CREDENTIAL EXPOSURE:
// Emits strictly boolean status flags (true/false) indicating variable presence.
// Never prints, logs, or decodes any key value or prefix.
// =====================================================================

import dotenv from 'dotenv';
dotenv.config();

function checkPresence() {
  console.log('--- SAFE ENVIRONMENT PRESENCE AUDIT (BOOLEAN ONLY) ---');

  const status = {
    SUPABASE_URL_PRESENT: Boolean(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_ANON_KEY_PRESENT: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    SUPABASE_SERVER_KEY_PRESENT: Boolean(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY),
    SUPABASE_KEY_MAPPING_PRESENT: Boolean(process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    ZERNIO_API_KEY_PRESENT: Boolean(process.env.ZERNIO_API_KEY),
    GEMINI_API_KEY_PRESENT: Boolean(process.env.GEMINI_API_KEY),
  };

  console.log(JSON.stringify(status, null, 2));

  const allRequiredPresent =
    status.SUPABASE_URL_PRESENT &&
    status.NEXT_PUBLIC_SUPABASE_ANON_KEY_PRESENT &&
    status.SUPABASE_SERVER_KEY_PRESENT;

  if (allRequiredPresent) {
    console.log('✅ PASS: All required Supabase rotation variables are present.');
    process.exit(0);
  } else {
    console.error('❌ FAIL: Missing required Supabase environment variables.');
    process.exit(1);
  }
}

checkPresence();
