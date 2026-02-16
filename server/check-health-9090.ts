import http from 'http';

const req = http.get('http://localhost:9090/health', (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log('Gemini:', json.services.gemini);
            console.log('Database:', json.services.database);
        } catch (e) {
            console.log('Body:', data);
        }
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});
