import axios from 'axios';

async function diagnose() {
    const targets = [
        'https://alinew.onrender.com',
        'https://alinew-chatbot-backend.onrender.com',
        'https://alinew-chatbot-frontend.onrender.com'
    ];

    console.log('--- Production Diagnostics ---');
    for (const target of targets) {
        console.log(`\nTesting: ${target}`);
        try {
            const res = await axios.get(`${target}/health`, { timeout: 5000 });
            console.log(`[${res.status}] Health: OK`);
            console.log(`Server Header: ${res.headers.server || 'unknown'}`);
        } catch (err: any) {
            console.log(`Health Check Failed: ${err.message}`);
            if (err.response) {
                console.log(`Status: ${err.response.status}`);
                console.log(`Headers: ${JSON.stringify(err.response.headers).substring(0, 100)}`);
            }
        }

        try {
            const resRoot = await axios.get(target, { timeout: 5000 });
            console.log(`Root status: ${resRoot.status}`);
            const body = String(resRoot.data);
            console.log(`Body Snippet: ${body.substring(0, 50).replace(/\n/g, ' ')}...`);
            if (body.includes('<!DOCTYPE html>') || body.includes('<html')) {
                console.log('Type: Likely FRONTED (Static Site)');
            } else if (body.includes('Chatbot Backend') || body.includes('status":"running"')) {
                console.log('Type: Likely BACKEND (API)');
            }
        } catch (err: any) {
            console.log(`Root Check Failed: ${err.message}`);
        }
    }
}

diagnose();
