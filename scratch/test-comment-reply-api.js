const fetch = (...args) => import('node-fetch').then(m => m.default(...args));

const SUPABASE_URL = 'https://yidsfihagwttlmhfynmf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHNmaWhhZ3d0dGxtaGZ5bm1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MjM5NDUsImV4cCI6MjA5ODM5OTk0NX0.r-hhC-BT3WCf9JLq-HeTHXIFkulM5XkorUEfkqMhc-g';

async function req(ep, method = 'GET', body = null) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/zernio-bridge/${ep}`, {
    method,
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  try {
    return { status: res.status, data: JSON.parse(text) };
  } catch {
    return { status: res.status, text: text.slice(0, 150) };
  }
}

(async () => {
  const accId = '6a82df7277555aae018b92b4';
  const profId = '6a82deac1a69158ef81cb2cd';
  
  // 1. Get real comments to find an active post and comment
  console.log('=== 1. FETCHING CURRENT COMMENTS ===');
  const feed = await req(`inbox/comments?profileId=${profId}`);
  const postsWithComments = (feed.data?.data || []).filter(p => p.commentCount > 0);
  console.log('Posts with comments:', postsWithComments.map(p => ({ id: p.id, commentCount: p.commentCount, content: p.content?.slice(0, 40) })));

  if (postsWithComments.length > 0) {
    const targetPost = postsWithComments[0];
    const postId = targetPost.id;
    console.log(`\nInspecting comments on post: ${postId}`);
    const postComments = await req(`inbox/comments/${postId}?accountId=${accId}`);
    console.log('Comments result:', JSON.stringify(postComments, null, 2));

    const targetComment = postComments.data?.comments?.[0];
    if (targetComment) {
      console.log('\nTarget Comment:', {
        id: targetComment.id,
        from: targetComment.from,
        message: targetComment.message,
        canReply: targetComment.canReply,
      });

      // 2. Test Zernio comment reply endpoint options (OPTIONS or dry probe or test payload)
      // Check endpoint options:
      // A: POST /inbox/comments/{postId} with { accountId, commentId, message }
      // B: POST /inbox/comments/{commentId}/reply with { accountId, message }
      // C: POST /inbox/comments/reply with { accountId, postId, commentId, message }
      // D: POST /social/comments/reply ...

      console.log('\n=== 2. PROBING COMMENT REPLY ENDPOINTS ===');
      
      const payloadA = {
        accountId: accId,
        commentId: targetComment.id,
        message: 'Thank you for reaching out to Ras Ali Labs! [Automated Diagnostic Reply ' + Date.now() + ']'
      };

      console.log('Testing Endpoint A: POST /inbox/comments/' + postId);
      const resA = await req(`inbox/comments/${postId}`, 'POST', payloadA);
      console.log('Response A:', JSON.stringify(resA, null, 2));

      if (resA.status !== 200 && resA.status !== 201) {
        console.log('Testing Endpoint B: POST /inbox/comments/reply');
        const resB = await req(`inbox/comments/reply`, 'POST', { ...payloadA, postId });
        console.log('Response B:', JSON.stringify(resB, null, 2));
      }
    }
  }
})();
