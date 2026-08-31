import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

async function inspect() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('--- Inspecting asset-1788200545566-ua2is ---');
  const { data: blob, error: err } = await supabase.storage
    .from('creatives')
    .download('asset-1788200545566-ua2is.meta.json');

  if (err) {
    console.log('Direct download .meta.json error:', err.message);
    const { data: list } = await supabase.storage.from('creatives').list();
    console.log('All files:', list?.map(f => f.name));
  } else if (blob) {
    const text = await blob.text();
    console.log('Metadata JSON:\n', text);
    const parsed = JSON.parse(text);
    console.log('Prompt:', parsed.prompt);
    console.log('Organization ID:', parsed.organizationId);
  }
}

inspect().catch(console.error);
