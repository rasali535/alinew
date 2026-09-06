import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = 'https://yidsfihagwttlmhfynmf.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHNmaWhhZ3d0dGxtaGZ5bm1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjgyMzk0NSwiZXhwIjoyMDk4Mzk5OTQ1fQ.mpparRo7a5t5B7uOlWBxiRI7NDsVGfmxkPUEbxSYBfA';
const supabase = createClient(url, key);

async function inspectProfiles() {
  const { data: profs } = await supabase.from('profiles').select('*');
  console.log('--- ALL SUPABASE PROFILES ---');
  for (const p of profs || []) {
    console.log(`User ID: ${p.id}, email: ${p.email}, full_name: ${p.full_name}, business_name: ${p.business_name}, company_name: ${p.company_name}, title: ${p.title}`);
    console.log('Raw row:', JSON.stringify(p, null, 2));
  }
}

inspectProfiles();
