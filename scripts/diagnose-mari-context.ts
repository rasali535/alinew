import { createClient } from '@supabase/supabase-js';
import { MariUniversalCore, BusinessIdentityResolver, BusinessKnowledgeProfileService } from '@ralion/ai';
import { FacebookConnectionStateService } from '../apps/ralion/src/lib/services/social/facebookConnectionState.service';
import { FacebookPageManagementService } from '../apps/ralion/src/lib/services/social/facebookPageManagement.service';
import * as dotenv from 'dotenv';
dotenv.config();

const url = 'https://yidsfihagwttlmhfynmf.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHNmaWhhZ3d0dGxtaGZ5bm1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjgyMzk0NSwiZXhwIjoyMDk4Mzk5OTQ1fQ.mpparRo7a5t5B7uOlWBxiRI7NDsVGfmxkPUEbxSYBfA';
const supabase = createClient(url, key);

async function diagnose() {
  console.log('====================================================');
  console.log('MARI RUNTIME CONTEXT & FACEBOOK INTEGRATION DIAGNOSIS');
  console.log('====================================================');

  // 1. Fetch Supabase profiles
  const { data: profs } = await supabase.from('profiles').select('*');
  console.log('\n--- SUPABASE PROFILES ---');
  console.log(JSON.stringify(profs, null, 2));

  // 2. Fetch Supabase social_connections
  const { data: socs } = await supabase.from('social_connections').select('*');
  console.log('\n--- SUPABASE SOCIAL CONNECTIONS ---');
  console.log(JSON.stringify(socs, null, 2));

  // 3. Check FacebookConnectionStateService (The authoritative Growth Studio service)
  const growthStudioState = await FacebookConnectionStateService.getConnectionState({
    organizationId: 'ras-ali-labs',
    workspaceId: '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf',
    userId: '8872b380-6072-466d-8ff1-7607a7e8fce4'
  });
  console.log('\n--- GROWTH STUDIO FACEBOOK CONNECTION STATE ---');
  console.log(JSON.stringify(growthStudioState, null, 2));

  // 4. Check FacebookPageManagementService active page
  const activePage = await FacebookPageManagementService.getActivePage({
    organizationId: 'ras-ali-labs',
    workspaceId: '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf',
    userId: '8872b380-6072-466d-8ff1-7607a7e8fce4'
  });
  console.log('\n--- FACEBOOK PAGE MANAGEMENT ACTIVE PAGE ---');
  console.log(JSON.stringify(activePage, null, 2));

  // 5. Test Mari Universal Core query directly
  console.log('\n--- TESTING MARI UNIVERSAL CORE ---');
  const mariResponse = await MariUniversalCore.processQuery({
    prompt: 'What does my Facebook say about us?',
    organizationId: 'ras-ali-labs',
    workspaceId: '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf',
    userId: '8872b380-6072-466d-8ff1-7607a7e8fce4',
    companyName: 'Ras Ali Labs',
  });

  console.log('\n--- MARI RESPONSE ---');
  console.log('Answer:\n', mariResponse.answer);
  console.log('Detected Intent:', mariResponse.detectedIntent);
  console.log('Capability Mode:', mariResponse.capabilityMode);
  console.log('Tenant ID:', mariResponse.tenantId);
  console.log('Company Name:', mariResponse.companyName);
}

diagnose().catch(console.error);
