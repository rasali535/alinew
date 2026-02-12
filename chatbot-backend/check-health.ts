import http from 'http';

const req = http.get('http://localhost:8082/health', (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log('Gemini Status:', json.services?.gemini);
            console.log('Database Status:', json.services?.database);
        } catch (e) {
            console.log('Raw Body:', data);
        }
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});
