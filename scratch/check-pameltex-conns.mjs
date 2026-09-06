import * as dotenv from 'dotenv';
dotenv.config({ path: 'apps/ralion/.env.local' });
dotenv.config({ path: '.env' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function main() {
  const { data: conns } = await supabase
    .from('social_connections')
    .select('*')
    .or(`workspace_id.eq.b73a216c-e069-42b7-84a1-002f2324f9f7,user_id.eq.331c1ca7-bc09-450f-90e8-07cb74459997`);

  console.log('Pameltex Connections in DB:', JSON.stringify(conns, null, 2));
}

main();
