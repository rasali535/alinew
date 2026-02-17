import axios from 'axios';

async function testChat() {
    const backendBase = 'https://alinew.onrender.com';

    console.log('--- Production Chat Test ---');

    try {
        // 1. Create session
        console.log('Creating session...');
        const sessionRes = await axios.post(`${backendBase}/api/sessions`, {
            userId: 'test-user',
            metadata: { source: 'test-script' }
        });
        const sessionId = sessionRes.data.id;
        console.log('Session created:', sessionId);

        // 2. Send message
        console.log('Sending message...');
        const chatRes = await axios.post(`${backendBase}/api/chat`, {
            sessionId: sessionId,
            message: 'Hello Ziggy, testing production connection.'
        });
        console.log('Response:', JSON.stringify(chatRes.data).substring(0, 200));

    } catch (err: any) {
        console.error('PROD TEST FAILED:', err.message);
        if (err.response) {
            console.error('Status:', err.response.status);
            console.error('Data:', JSON.stringify(err.response.data));
        }
    }
}

testChat();
