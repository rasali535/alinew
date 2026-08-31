import axios from 'axios';

async function checkTusPaths() {
  const authKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoxLCJsb2NhbGUiOiJlbl9VUyIsInZpZXdNb2RlIjoibGlzdCIsInNpbmdsZUNsaWNrIjpmYWxzZSwicmVkaXJlY3RBZnRlckNvcHlNb3ZlIjpmYWxzZSwicGVybSI6eyJhZG1pbiI6ZmFsc2UsImV4ZWN1dGUiOmZhbHNlLCJjcmVhdGUiOnRydWUsInJlbmFtZSI6dHJ1ZSwibW9kaWZ5Ijp0cnVlLCJkZWxldGUiOnRydWUsInNoYXJlIjpmYWxzZSwiZG93bmxvYWQiOnRydWV9LCJjb21tYW5kcyI6W10sImxvY2tQYXNzd29yZCI6dHJ1ZSwiaGlkZURvdGZpbGVzIjpmYWxzZSwiZGF0ZUZvcm1hdCI6ZmFsc2UsInVzZXJuYW1lIjoidTcyMzc3NDEwMCIsImFjZUVkaXRvclRoZW1lIjoiIn0sImlzcyI6IkZpbGUgQnJvd3NlciIsImV4cCI6MTc4ODIyMzI5NSwiaWF0IjoxNzg4MjAxNjk1fQ.2pq1Y_efMD6BOKnHeUt7wCoMytjf7Ffp_c8xVNxioyI';
  const restAuthKey = 'a033c36aeadbff39ace5cd23d68b7765ca11d567d09534b4c50470c05f18f37a-2c10b7925b8cf502';

  const baseUrl = 'https://srv1717-files.hstgr.io/rest/2c10b7925b8cf502/api/resources';

  const paths = [
    '',
    'public_html',
    'domains',
    'domains/rasalilabs.com',
    'domains/rasalilabs.com/public_html',
    'domains/rasalilabs.com/public_html/ralion',
  ];

  for (const p of paths) {
    try {
      const res = await axios.get(`${baseUrl}/${p}`, {
        headers: {
          'X-Auth': authKey,
          'X-Auth-Rest': restAuthKey,
        },
      });
      const data = res.data as any;
      console.log(`\n📂 Path: /${p}`);
      if (data && data.items) {
        console.log(`   Items (${data.items.length}):`, data.items.map((i: any) => `${i.name} (${i.isDir ? 'DIR' : 'FILE'})`));
      } else {
        console.log(`   Data:`, data);
      }
    } catch (e: any) {
      console.log(`\n❌ Path: /${p} -> ${e.response?.status} ${e.message}`);
    }
  }
}

checkTusPaths().catch(console.error);
