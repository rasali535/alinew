import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function testKeys() {
  const { data: conn } = await supabase
    .from('social_connections')
    .select('metadata')
    .eq('id', '9196984f-a119-42ec-b23d-588e623a4415')
    .single();

  const enc = conn?.metadata?.encrypted_access_token;
  console.log('Envelope starts with:', enc?.slice(0, 30));

  const candidateSecrets = [
    process.env.OAUTH_ENCRYPTION_KEY || '',
    'ralion-os-aes256-key-change-in-production-32b',
    'ralion-enterprise-oauth-secret-key-32bytes-secure!',
    'ralion_super_secret_oauth_enc_key_32_bytes_min_2026',
    'ralion_secure_token_secret_key_32_bytes_min!',
    'ralion_secret_key_change_me_32bytes_min',
  ].filter(Boolean);

  const parts = enc.replace('enc_gcm_v2_', '').split('_');
  const [ivHex, tagHex, cipherHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const ciphertext = Buffer.from(cipherHex, 'hex');

  for (const sec of candidateSecrets) {
    try {
      const key = crypto.createHash('sha256').update(sec).digest();
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);
      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]).toString('utf8');
      console.log('SUCCESS with secret:', sec, '-> Token length:', decrypted.length, 'Prefix:', decrypted.slice(0, 10));
    } catch (e: any) {
      console.log('Failed with secret:', sec, '->', e.message);
    }
  }
}

testKeys();
