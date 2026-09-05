import dotenv from 'dotenv';
dotenv.config({ path: 'apps/ralion/.env.local' });
import { GET } from '../apps/ralion/src/app/api/admin/customers/route';
import { NextRequest } from 'next/server';

async function test() {
  const req = new NextRequest('http://localhost:3000/api/admin/customers', {
    headers: {
      'x-admin-key': 'platform-admin-master-key-verified',
    },
  });

  const res = await GET(req);
  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Total customers:', data.total);
  console.log('Customers list:');
  console.table(data.data.map((c: any) => ({
    id: c.id,
    name: c.name,
    email: c.ownerEmail,
    plan: c.plan,
    metaStatus: c.metaStatus,
    facebookStatus: c.facebookStatus,
    facebookPage: c.facebookPage,
    facebookFollowers: c.facebookFollowers,
  })));
}
test().catch(console.error);
