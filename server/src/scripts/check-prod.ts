import axios from 'axios';

async function checkProduction() {
    const urls = [
        'https://alinew.onrender.com/health',
        'https://alinew.onrender.com/',
        'https://alinew-chatbot-backend.onrender.com/health'
    ];

    for (const url of urls) {
        console.log(`Checking ${url}...`);
        try {
            const start = Date.now();
            const res = await axios.get(url, { timeout: 10000 });
            console.log(`[${res.status}] ${JSON.stringify(res.data).substring(0, 100)}... (${Date.now() - start}ms)`);
        } catch (err) {
            console.error(`FAILED ${url}: ${err.message}`);
            if (err.response) {
                console.error(`Status: ${err.response.status}`);
            }
        }
        console.log('---');
    }
}

checkProduction();
