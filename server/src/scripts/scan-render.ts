import axios from 'axios';

async function scan() {
    const targets = [
        'https://alinew.onrender.com',
        'https://alinew-chatbot-backend.onrender.com',
        'https://alinew-chatbot-frontend.onrender.com',
        'https://alinew-backend.onrender.com'
    ];

    console.log('--- Scanning Render Services ---');
    for (const url of targets) {
        console.log(`Checking ${url}...`);
        try {
            const res = await axios.get(url, { timeout: 5000 });
            console.log(`[${res.status}] Body: ${JSON.stringify(res.data).substring(0, 100)}`);
            if (JSON.stringify(res.data).includes('Chatbot')) {
                console.log('!!! FOUND BACKEND !!!');
                // Check version if available
                try {
                    const health = await axios.get(`${url}/health`, { timeout: 3000 });
                    console.log(`Health: ${JSON.stringify(health.data)}`);
                } catch (e) { }
            }
        } catch (err: any) {
            console.log(`Failed: ${err.message}`);
        }
    }
}

scan();
