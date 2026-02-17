import axios from 'axios';

async function scan() {
    const prefixes = ['alinew', 'rasali', 'chatbot', 'alinew-chatbot-backend', 'rasali-chatbot'];
    const suffixes = ['', '-backend', '-api', '-server', '-prod'];

    const targets: string[] = [];
    prefixes.forEach(p => {
        suffixes.forEach(s => {
            targets.push(`https://${p}${s}.onrender.com`);
        });
    });

    console.log(`--- Scanning ${targets.length} possible Render URLs ---`);
    for (const url of targets) {
        try {
            const res = await axios.get(url, { timeout: 3000 });
            console.log(`[${res.status}] ${url} -> ${JSON.stringify(res.data).substring(0, 50)}`);
        } catch (err: any) {
            // Only log if it's not a 404 (means something is there)
            if (err.response && err.response.status !== 404) {
                console.log(`[${err.response.status}] ${url}`);
            }
        }
    }
}

scan();
