import axios from 'axios';

async function verify() {
    const backendBase = 'https://alinew.onrender.com';
    const endpoints = ['/ping', '/health', '/'];

    console.log(`Backend Base: ${backendBase}`);

    for (const ep of endpoints) {
        const url = `${backendBase}${ep}`;
        console.log(`Testing ${url}...`);
        try {
            const res = await axios.get(url, { timeout: 10000 });
            console.log(`[${res.status}] ${JSON.stringify(res.data).substring(0, 100)}`);
        } catch (err: any) {
            console.log(`FAILED ${ep}: ${err.message}`);
            if (err.response) {
                console.log(`Status: ${err.response.status}`);
                console.log(`Data: ${JSON.stringify(err.response.data)}`);
            }
        }
    }
}

verify();
