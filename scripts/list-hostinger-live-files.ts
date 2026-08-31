import axios from 'axios';

async function listCurrentHostingerFiles() {
  const authKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoxLCJsb2NhbGUiOiJlbl9VUyIsInZpZXdNb2RlIjoibGlzdCIsInNpbmdsZUNsaWNrIjpmYWxzZSwicmVkaXJlY3RBZnRlckNvcHlNb3ZlIjpmYWxzZSwicGVybSI6eyJhZG1pbiI6ZmFsc2UsImV4ZWN1dGUiOmZhbHNlLCJjcmVhdGUiOnRydWUsInJlbmFtZSI6dHJ1ZSwibW9kaWZ5Ijp0cnVlLCJkZWxldGUiOnRydWUsInNoYXJlIjpmYWxzZSwiZG93bmxvYWQiOnRydWV9LCJjb21tYW5kcyI6W10sImxvY2tQYXNzd29yZCI6dHJ1ZSwiaGlkZURvdGZpbGVzIjpmYWxzZSwiZGF0ZUZvcm1hdCI6ZmFsc2UsInVzZXJuYW1lIjoidTcyMzc3NDEwMCIsImFjZUVkaXRvclRoZW1lIjoiIn0sImlzcyI6IkZpbGUgQnJvd3NlciIsImV4cCI6MTc4ODIyNzQ5NiwiaWF0IjoxNzg4MjA1ODk2fQ.ffwfgB72O8jdatQnC8qVapKaeS5MWcDrRYvYV8LQhCc';
  const restAuthKey = '5c0113c37d2774d9c6b50976370f782b45327e365085d4a9842e3b4857ef19ba-f62ed278c3fe0ad5';

  const baseUrl = 'https://srv1717-files.hstgr.io/rest/f62ed278c3fe0ad5/api/resources/public_html';

  const paths = ['', 'ralion'];

  for (const p of paths) {
    try {
      const url = p ? `${baseUrl}/${p}` : baseUrl;
      const res = await axios.get(url, {
        headers: {
          'X-Auth': authKey,
          'X-Auth-Rest': restAuthKey,
        },
      });
      const data = res.data as any;
      console.log(`\n📂 Listing public_html/${p}`);
      if (data && data.items) {
        console.log(`Items (${data.items.length}):`, data.items.map((i: any) => `${i.name} (${i.isDir ? 'DIR' : 'FILE'})`));
      }
    } catch (e: any) {
      console.log(`❌ Error on public_html/${p}:`, e.response?.status, e.message);
    }
  }
}

listCurrentHostingerFiles().catch(console.error);
