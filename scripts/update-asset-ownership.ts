import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

async function updateAssetOwnership() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('--- Updating asset-1788200545566-ua2is ownership to ras-ali-labs ---');
  const { data: blob, error: dlErr } = await supabase.storage
    .from('creatives')
    .download('asset-1788200545566-ua2is.meta.json');

  if (dlErr || !blob) {
    throw new Error(`Failed to download meta: ${dlErr?.message}`);
  }

  const meta = JSON.parse(await blob.text());
  console.log('Previous organizationId:', meta.organizationId);

  // Correct ownership to platform organization 'ras-ali-labs'
  meta.organizationId = 'ras-ali-labs';
  if (meta.metadata) {
    meta.metadata.organizationId = 'ras-ali-labs';
  }

  const updatedBuffer = Buffer.from(JSON.stringify(meta, null, 2), 'utf-8');

  const { error: upErr1 } = await supabase.storage
    .from('creatives')
    .upload('asset-1788200545566-ua2is.meta.json', updatedBuffer, {
      upsert: true,
      contentType: 'application/json',
    });

  const { error: upErr2 } = await supabase.storage
    .from('creatives')
    .upload('asset-1788200545566-ua2is.jpg.meta.json', updatedBuffer, {
      upsert: true,
      contentType: 'application/json',
    });

  if (upErr1 || upErr2) {
    throw new Error(`Upload error: ${upErr1?.message || upErr2?.message}`);
  }

  console.log('✅ Successfully updated asset-1788200545566-ua2is ownership to ras-ali-labs');
}

updateAssetOwnership().catch(console.error);
