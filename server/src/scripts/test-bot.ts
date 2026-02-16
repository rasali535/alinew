import axios from 'axios';

const BASE_URL = 'http://localhost:9090';

async function testBot() {
    console.log('--- Ziggy Test Suite ---');
    let sessionId = '';

    try {
        // 1. Create Session
        console.log('\n[1/4] Creating Session...');
        const sessionRes = await axios.post(`${BASE_URL}/api/sessions`, {
            userId: 'test-user-123',
            metadata: { source: 'test_script' }
        });
        sessionId = sessionRes.data.id;
        console.log('✓ Session Created:', sessionId);

        // 2. Initial Greet (checking if instructions work)
        console.log('\n[2/4] Testing Introduction...');
        const greetRes = await axios.post(`${BASE_URL}/api/chat`, {
            sessionId,
            message: 'Hello'
        });
        console.log('Ziggy:', greetRes.data.response);

        // 3. Ask about services (Triggering lead protocol)
        console.log('\n[3/4] Asking about services...');
        const serviceRes = await axios.post(`${BASE_URL}/api/chat`, {
            sessionId,
            message: 'I need a bass player for a recording.'
        });
        console.log('Ziggy:', serviceRes.data.response);

        // 4. Provide details (Triggering tool call save_lead)
        console.log('\n[4/4] Providing details for tool call...');
        const leadRes = await axios.post(`${BASE_URL}/api/chat`, {
            sessionId,
            message: 'My name is Test User and my email is test@example.com'
        });
        console.log('Ziggy Final Response:', leadRes.data.response);

        console.log('\n--- Test Completed Successfully ---');
    } catch (error) {
        console.error('Test Failed:', error.response?.data || error.message);
    }
}

testBot();
