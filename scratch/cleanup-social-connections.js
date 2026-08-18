const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://yidsfihagwttlmhfynmf.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHNmaWhhZ3d0dGxtaGZ5bm1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjgyMzk0NSwiZXhwIjoyMDk4Mzk5OTQ1fQ.mpparRo7a5t5B7uOlWBxiRI7NDsVGfmxkPUEbxSYBfA';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  console.log('=== STEP 1: AUDIT ALL USERS & SOCIAL CONNECTIONS ===\n');

  const { data: usersData } = await supabase.auth.admin.listUsers();
  const users = usersData.users;

  console.log('Found Auth Users:');
  for (const u of users) {
    console.log(`- ${u.email} (ID: ${u.id})`);
  }

  const { data: conns } = await supabase.from('social_connections').select('*');
  console.log('\nExisting social_connections count:', conns.length);
  for (const c of conns) {
    console.log(`- Conn ID: ${c.id}, User ID: ${c.user_id}, Provider: ${c.provider}, Account: ${c.account_name}, Workspace: ${c.workspace_id}`);
  }

  // The true owner of Ras Ali Labs Facebook connection is chiwabby@gmail.com (e7c80a2e-f21f-49b8-a361-30bd3e704e46)
  const trueOwnerId = 'e7c80a2e-f21f-49b8-a361-30bd3e704e46';
  const trueWorkspaceId = 'e7c80a2e-f21f-49b8-a361-30bd3e704e46'; // 1-to-1 default workspace ID

  // Delete duplicate connection rows assigned to other users
  const duplicateConns = conns.filter(c => c.user_id !== trueOwnerId);
  console.log(`\nFound ${duplicateConns.length} duplicate/leaked connection rows from other users.`);

  for (const dup of duplicateConns) {
    console.log(`Deleting duplicate connection ${dup.id} for user ${dup.user_id}...`);
    const { error: delErr } = await supabase.from('social_connections').delete().eq('id', dup.id);
    if (delErr) console.error('Delete error:', delErr.message);
    else console.log('Successfully deleted duplicate connection.');
  }

  // Update the true owner's connection to include workspace_id
  const ownerConn = conns.find(c => c.user_id === trueOwnerId);
  if (ownerConn) {
    console.log(`Updating true owner connection ${ownerConn.id} with workspace_id: ${trueWorkspaceId}`);
    const { error: upErr } = await supabase
      .from('social_connections')
      .update({
        workspace_id: trueWorkspaceId,
        organization_id: trueWorkspaceId,
      })
      .eq('id', ownerConn.id);
    if (upErr) console.error('Update error:', upErr.message);
    else console.log('Successfully updated true owner connection with workspace_id.');
  }

  // Re-verify
  const { data: finalConns } = await supabase.from('social_connections').select('id, user_id, provider, account_name, workspace_id');
  console.log('\nFinal social_connections after cleanup:');
  console.log(finalConns);
})();
