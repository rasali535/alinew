import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkTables() {
  const candidateTables = [
    'mari_messages',
    'mari_conversations',
    'ai_usage_logs',
    'token_usage',
    'mari_token_usage',
    'usage_logs',
  ];

  for (const t of candidateTables) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    if (error) {
      console.log(`Table ${t}: Error -> ${error.message}`);
    } else {
      console.log(`Table ${t}: EXISTS! Sample row keys:`, data?.[0] ? Object.keys(data[0]) : '(empty table)');
    }
  }
}

checkTables();
