import { getServiceSupabase } from '../apps/ralion/src/lib/auth/serverAuth';

async function testToken() {
  const supabase = getServiceSupabase();
  const { data: users, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('Failed to list users:', error);
    return;
  }
  console.log(`Total users found: ${users.users.length}`);
  for (const u of users.users) {
    console.log(`- ${u.id}: ${u.email}`);
  }
}

testToken();
